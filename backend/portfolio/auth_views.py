from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .google_auth import get_or_create_user_from_google, google_client_id, verify_google_credential
from .models import SubscriptionPack, UserSubscription
from .payment_routing import payment_provider_for_request, start_pack_checkout
from .payments import (
    payment_instructions,
    payments_auto_confirm,
    site_base_url,
)
from .permissions import IsCustomerUser
from .serializers import (
    CustomerChangePasswordSerializer,
    CustomerMeSerializer,
    CustomerRegisterSerializer,
    SubscriptionPackPublicSerializer,
)
from .subscriptions import activate_subscription, quote_subscribe

User = get_user_model()


def issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


class CustomerRegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = CustomerRegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            **issue_tokens(user),
            'user': CustomerMeSerializer(user).data,
        }, status=status.HTTP_201_CREATED)


class CustomerLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = (request.data.get('username') or '').strip()
        password = request.data.get('password') or ''
        if not username or not password:
            return Response({'detail': 'Username and password required.'}, status=400)
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'detail': 'Invalid credentials.'}, status=401)
        if user.is_staff or not user.check_password(password):
            return Response({'detail': 'Invalid credentials.'}, status=401)
        if not user.has_usable_password():
            return Response({'detail': 'Invalid credentials.'}, status=401)
        return Response({
            **issue_tokens(user),
            'user': CustomerMeSerializer(user).data,
        })


class AuthConfigView(APIView):
    """Public auth options (e.g. Google client id for the sign-in button)."""

    permission_classes = [AllowAny]

    def get(self, request):
        cid = google_client_id()
        return Response({
            'google_sign_in': bool(cid),
            'google_client_id': cid,
        })


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        credential = (request.data.get('credential') or '').strip()
        if not credential:
            return Response({'detail': 'Missing Google credential.'}, status=400)
        try:
            claims = verify_google_credential(credential)
            user = get_or_create_user_from_google(claims)
        except ValueError as exc:
            msg = str(exc)
            if msg == 'Invalid credentials.':
                return Response({'detail': msg}, status=401)
            return Response({'detail': msg}, status=400)
        return Response({
            **issue_tokens(user),
            'user': CustomerMeSerializer(user).data,
        })


class CustomerMeView(APIView):
    permission_classes = [IsCustomerUser]

    def get(self, request):
        return Response(CustomerMeSerializer(request.user).data)


class CustomerOrdersOverviewView(APIView):
    """Unified custom commands + store orders for the signed-in client."""

    permission_classes = [IsCustomerUser]

    def get(self, request):
        from .models import StoreOrder
        from .serializers import ProjectCommandTrackBriefSerializer, StoreOrderPublicSerializer
        from .tracking import commands_for_user

        from django.db.models import Q

        commands = commands_for_user(request.user).order_by('-created_at')[:30]
        email = (request.user.email or '').strip().lower()
        store_filter = Q(user=request.user)
        if email:
            store_filter |= Q(customer_email__iexact=email)
        store_orders = (
            StoreOrder.objects.filter(store_filter)
            .prefetch_related('items')
            .distinct()
            .order_by('-created_at')[:30]
        )
        return Response({
            'commands': ProjectCommandTrackBriefSerializer(commands, many=True).data,
            'store_orders': StoreOrderPublicSerializer(store_orders, many=True).data,
        })


class CustomerChangePasswordView(APIView):
    permission_classes = [IsCustomerUser]

    def post(self, request):
        ser = CustomerChangePasswordSerializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)
        request.user.set_password(ser.validated_data['new_password'])
        request.user.save(update_fields=['password'])
        return Response({'detail': 'Password updated.'})


class SubscriptionPackListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = SubscriptionPackPublicSerializer

    def get_queryset(self):
        return SubscriptionPack.objects.filter(is_active=True).prefetch_related('projects')


class SubscribePackView(APIView):
    permission_classes = [IsCustomerUser]

    def post(self, request, pack_id):
        try:
            pack = SubscriptionPack.objects.get(id=pack_id, is_active=True)
        except SubscriptionPack.DoesNotExist:
            return Response({'detail': 'Pack not found.'}, status=404)

        quote = quote_subscribe(request.user, pack)
        if quote.already_active:
            return Response({
                'detail': 'You already have an active subscription for this pack.',
            }, status=400)
        if quote.blocked_downgrade:
            return Response({
                'detail': 'You already have a higher-tier subscription. Lower packs are included.',
            }, status=400)

        subscription = UserSubscription.objects.create(
            user=request.user,
            pack=pack,
            status=UserSubscription.Status.PENDING,
        )

        base = site_base_url(request)
        success = f'{base}/account?subscribed=1'
        cancel = f'{base}/subscriptions?cancelled=1'

        extra_metadata = {}
        if quote.is_upgrade:
            extra_metadata = {
                'upgrade': 'true',
                'replaces_subscription_id': quote.replaces_subscription_id or '',
                'expires_at': quote.expires_at.isoformat() if quote.expires_at else '',
            }
            if quote.expires_at:
                subscription.expires_at = quote.expires_at
                subscription.save(update_fields=['expires_at'])

        charge = quote.amount
        charge_dzd = quote.amount_dzd
        provider = payment_provider_for_request(request)

        if provider == 'chargily' and charge_dzd <= 0:
            return Response(
                {'detail': 'This pack has no DZD price configured. Set price_dzd in admin.'},
                status=400,
            )
        if provider == 'stripe' and charge <= 0:
            return Response(
                {'detail': 'This pack has no USD price configured.'},
                status=400,
            )

        if (provider == 'chargily' and charge_dzd > 0) or (provider == 'stripe' and charge > 0):
            provider, checkout_url = start_pack_checkout(
                request,
                subscription,
                success,
                cancel,
                charge_amount=charge,
                charge_amount_dzd=charge_dzd,
                extra_metadata=extra_metadata,
            )
            if checkout_url:
                payload = {
                    'subscription_id': str(subscription.id),
                    'checkout_url': checkout_url,
                    'is_upgrade': quote.is_upgrade,
                    'mode': provider,
                    'provider': provider,
                }
                if provider == 'chargily':
                    payload['amount'] = str(charge_dzd)
                    payload['full_price'] = str(pack.price_dzd)
                    payload['currency'] = 'dzd'
                else:
                    payload['amount'] = str(charge)
                    payload['full_price'] = str(pack.price)
                    payload['currency'] = 'usd'
                return Response(payload)

        if charge <= 0 or payments_auto_confirm():
            from .payment_fulfillment import mark_subscription_paid

            paid_currency = 'dzd' if provider == 'chargily' else 'usd' if provider == 'stripe' else ''
            paid_amount = charge_dzd if paid_currency == 'dzd' else charge
            if paid_amount and paid_amount > 0:
                mark_subscription_paid(subscription, currency=paid_currency, amount=paid_amount)
            activate_subscription(
                subscription,
                expires_at=quote.expires_at if quote.is_upgrade else None,
                replaces_subscription_id=quote.replaces_subscription_id,
            )
            subscription.refresh_from_db()
            return Response({
                'subscription_id': str(subscription.id),
                'status': subscription.status,
                'expires_at': subscription.expires_at,
                'amount': str(charge),
                'is_upgrade': quote.is_upgrade,
                'mode': 'activated',
            })

        return Response({
            'subscription_id': str(subscription.id),
            'status': subscription.status,
            'amount': str(charge_dzd if provider == 'chargily' else charge),
            'full_price': str(pack.price_dzd if provider == 'chargily' else pack.price),
            'currency': 'dzd' if provider == 'chargily' else 'usd',
            'is_upgrade': quote.is_upgrade,
            'mode': 'manual',
            'instructions': payment_instructions(subscription=True),
        }, status=201)

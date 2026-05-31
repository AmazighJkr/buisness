from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .access import active_subscriptions_for
from .models import SubscriptionPack, UserSubscription
from .payments import (
    create_pack_checkout_session,
    payment_instructions,
    payments_auto_confirm,
    site_base_url,
    stripe_enabled,
)
from .permissions import IsCustomerUser
from .serializers import (
    CustomerMeSerializer,
    CustomerRegisterSerializer,
    SubscriptionPackPublicSerializer,
)

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
        if user.is_staff:
            return Response({'detail': 'Use the admin panel to sign in as staff.'}, status=403)
        if not user.check_password(password):
            return Response({'detail': 'Invalid credentials.'}, status=401)
        return Response({
            **issue_tokens(user),
            'user': CustomerMeSerializer(user).data,
        })


class CustomerMeView(APIView):
    permission_classes = [IsCustomerUser]

    def get(self, request):
        return Response(CustomerMeSerializer(request.user).data)


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

        now = timezone.now()
        existing = UserSubscription.objects.filter(
            user=request.user,
            pack=pack,
            status=UserSubscription.Status.ACTIVE,
            expires_at__gt=now,
        ).first()
        if existing:
            return Response({
                'detail': 'You already have an active subscription for this pack.',
                'subscription_id': str(existing.id),
                'expires_at': existing.expires_at,
            }, status=400)

        subscription = UserSubscription.objects.create(
            user=request.user,
            pack=pack,
            status=UserSubscription.Status.PENDING,
        )

        base = site_base_url(request)
        success = f'{base}/account?subscribed=1'
        cancel = f'{base}/subscriptions?cancelled=1'

        if stripe_enabled() and pack.price > 0:
            session = create_pack_checkout_session(subscription, success, cancel)
            return Response({
                'subscription_id': str(subscription.id),
                'checkout_url': session.url,
                'amount': str(pack.price),
                'mode': 'stripe',
            })

        if payments_auto_confirm() or pack.price <= 0:
            subscription.status = UserSubscription.Status.ACTIVE
            subscription.started_at = now
            subscription.expires_at = now + timedelta(days=pack.duration_days)
            subscription.save()
            return Response({
                'subscription_id': str(subscription.id),
                'status': subscription.status,
                'expires_at': subscription.expires_at,
                'mode': 'activated',
            })

        return Response({
            'subscription_id': str(subscription.id),
            'status': subscription.status,
            'amount': str(pack.price),
            'mode': 'manual',
            'instructions': payment_instructions(subscription=True),
        }, status=201)

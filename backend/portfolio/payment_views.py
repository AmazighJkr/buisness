import json
import os

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .chargily_payments import (
    chargily_enabled,
    chargily_public_key,
    parse_chargily_event,
    verify_chargily_signature,
)
from .models import ProjectCommand
from .payment_fulfillment import fulfill_payment_metadata
from .payment_region import client_country, is_algeria_request
from .payment_routing import payment_provider_for_request, start_command_checkout
from .payments import (
    payment_instructions,
    payments_auto_confirm,
    site_base_url,
    stripe_enabled,
    stripe_secret_key,
)
from .serializers import ProjectCommandTrackSerializer
from .tracking import get_command_for_code, get_command_for_user, user_owns_command


class CommandPayView(APIView):
    """Start payment for an accepted command (tracking code or account)."""

    permission_classes = [AllowAny]

    def post(self, request):
        user = request.user
        command_id = request.query_params.get('command_id')
        if command_id and user.is_authenticated and not user.is_staff:
            command = get_command_for_user(user, command_id)
        else:
            code = request.query_params.get('code')
            command = get_command_for_code(code)

        if command.status != ProjectCommand.Status.ACCEPTED:
            return Response(
                {'detail': 'Payment is only available after your command is accepted.'},
                status=400,
            )

        provider = payment_provider_for_request(request)

        if provider == 'chargily':
            if not command.quoted_price_dzd or command.quoted_price_dzd <= 0:
                return Response(
                    {
                        'detail': 'No DZD bill amount set for this command. '
                        'Contact support or wait for admin to set quoted_price_dzd.',
                    },
                    status=400,
                )
        elif not command.quoted_price or command.quoted_price <= 0:
            return Response({'detail': 'No payment amount set for this command.'}, status=400)

        if command.payment_status == ProjectCommand.PaymentStatus.PAID:
            return Response({'detail': 'This command is already paid.'}, status=400)
        if command.payment_status == ProjectCommand.PaymentStatus.WAIVED:
            return Response({'detail': 'Payment was waived for this command.'}, status=400)

        base = site_base_url(request)
        if user.is_authenticated and not user.is_staff and user_owns_command(user, command):
            success = f'{base}/track?command={command.id}&paid=1'
            cancel = f'{base}/track?command={command.id}'
        else:
            success = f'{base}/track?code={command.tracking_code}&paid=1'
            cancel = f'{base}/track?code={command.tracking_code}'

        provider, checkout_url = start_command_checkout(request, command, success, cancel)
        if checkout_url:
            if provider == 'chargily':
                return Response({
                    'checkout_url': checkout_url,
                    'amount': str(command.quoted_price_dzd),
                    'currency': 'dzd',
                    'payment_status': command.payment_status,
                    'mode': provider,
                    'provider': provider,
                })
            return Response({
                'checkout_url': checkout_url,
                'amount': str(command.quoted_price),
                'currency': 'usd',
                'payment_status': command.payment_status,
                'mode': provider,
                'provider': provider,
            })

        if payments_auto_confirm() or request.data.get('confirm') is True:
            command.payment_status = ProjectCommand.PaymentStatus.PAID
            command.save(update_fields=['payment_status'])
            return Response(
                ProjectCommandTrackSerializer(command, context={'request': request}).data,
            )

        amount = command.quoted_price_dzd if provider == 'chargily' else command.quoted_price
        return Response({
            'amount': str(amount),
            'currency': 'dzd' if provider == 'chargily' else 'usd',
            'payment_status': command.payment_status,
            'mode': 'manual',
            'provider': 'manual',
            'instructions': payment_instructions(subscription=False),
        })


class PaymentConfigView(APIView):
    """Public payment providers and detected region."""

    permission_classes = [AllowAny]

    def get(self, request):
        country = client_country(request)
        provider = payment_provider_for_request(request)
        is_dz = is_algeria_request(request)
        from .checkout_recaptcha import recaptcha_configured, recaptcha_site_key

        from django.conf import settings

        return Response({
            'stripe': stripe_enabled(),
            'chargily': chargily_enabled(),
            'auto_confirm': payments_auto_confirm(),
            'country': country,
            'is_algeria': is_dz,
            'store_available': is_dz,
            'provider': provider,
            'currency': 'dzd' if provider == 'chargily' else 'usd',
            'chargily_public_key': chargily_public_key() if chargily_enabled() else '',
            'recaptcha_site_key': recaptcha_site_key(),
            'recaptcha_enabled': recaptcha_configured(),
            'contact_email': getattr(settings, 'CONTACT_EMAIL', '') or '',
            'whatsapp_support_url': getattr(settings, 'WHATSAPP_SUPPORT_URL', '') or '',
        })


class ClientCountryView(APIView):
    """Country for payment/store routing — detected on the server (no browser GeoIP)."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'country': client_country(request)})


class StripeWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        from .payments import _stripe

        webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET', '').strip()
        if not stripe_secret_key() or not webhook_secret:
            return Response(status=404)

        payload = request.body
        sig = request.META.get('HTTP_STRIPE_SIGNATURE', '')
        stripe = _stripe()
        try:
            event = stripe.Webhook.construct_event(payload, sig, webhook_secret)
        except Exception:
            return Response(status=400)

        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            fulfill_payment_metadata(session.get('metadata') or {})

        return Response({'received': True})


class ChargilyWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not chargily_enabled():
            return Response(status=404)

        signature = request.headers.get('signature', '')
        payload = request.body
        if not verify_chargily_signature(signature, payload):
            return Response(status=403)

        try:
            event = parse_chargily_event(payload)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return Response(status=400)

        if event.get('type') == 'checkout.paid':
            checkout = event.get('data') or {}
            meta = checkout.get('metadata') or {}
            fulfill_payment_metadata(meta)

        return Response({'received': True})

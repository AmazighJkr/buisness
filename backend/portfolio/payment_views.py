from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ProjectCommand, UserSubscription
from .payments import (
    PAYMENTS_AUTO_CONFIRM,
    PAYMENT_INSTRUCTIONS,
    create_command_checkout_session,
    site_base_url,
    stripe_enabled,
)
from .serializers import ProjectCommandTrackSerializer
from .tracking import get_command_for_code


class CommandPayView(APIView):
    """Start payment for an accepted command (tracking code required)."""

    permission_classes = [AllowAny]

    def post(self, request):
        code = request.query_params.get('code')
        command = get_command_for_code(code)

        if command.status != ProjectCommand.Status.ACCEPTED:
            return Response(
                {'detail': 'Payment is only available after your command is accepted.'},
                status=400,
            )
        if not command.quoted_price or command.quoted_price <= 0:
            return Response({'detail': 'No payment amount set for this command.'}, status=400)
        if command.payment_status == ProjectCommand.PaymentStatus.PAID:
            return Response({'detail': 'This command is already paid.'}, status=400)
        if command.payment_status == ProjectCommand.PaymentStatus.WAIVED:
            return Response({'detail': 'Payment was waived for this command.'}, status=400)

        base = site_base_url(request)
        success = f'{base}/track?code={command.tracking_code}&paid=1'
        cancel = f'{base}/track?code={command.tracking_code}'

        if stripe_enabled():
            session = create_command_checkout_session(command, success, cancel)
            return Response({
                'checkout_url': session.url,
                'amount': str(command.quoted_price),
                'payment_status': command.payment_status,
                'mode': 'stripe',
            })

        if PAYMENTS_AUTO_CONFIRM or request.data.get('confirm') is True:
            command.payment_status = ProjectCommand.PaymentStatus.PAID
            command.save(update_fields=['payment_status'])
            return Response(
                ProjectCommandTrackSerializer(command, context={'request': request}).data,
            )

        return Response({
            'amount': str(command.quoted_price),
            'payment_status': command.payment_status,
            'mode': 'manual',
            'instructions': PAYMENT_INSTRUCTIONS,
        })


class StripeWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        import os

        from .payments import STRIPE_SECRET_KEY, _stripe

        webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET', '').strip()
        if not STRIPE_SECRET_KEY or not webhook_secret:
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
            meta = session.get('metadata') or {}
            if meta.get('type') == 'command':
                try:
                    cmd = ProjectCommand.objects.get(id=meta.get('command_id'))
                    cmd.payment_status = ProjectCommand.PaymentStatus.PAID
                    cmd.save(update_fields=['payment_status'])
                except ProjectCommand.DoesNotExist:
                    pass
            elif meta.get('type') == 'subscription':
                try:
                    sub = UserSubscription.objects.select_related('pack').get(
                        id=meta.get('subscription_id'),
                    )
                    now = timezone.now()
                    sub.status = UserSubscription.Status.ACTIVE
                    sub.started_at = now
                    sub.expires_at = now + timedelta(days=sub.pack.duration_days)
                    sub.save()
                except UserSubscription.DoesNotExist:
                    pass

        return Response({'received': True})

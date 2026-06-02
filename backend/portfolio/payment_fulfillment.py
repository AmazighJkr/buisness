"""Mark commands paid / activate subscriptions from payment provider metadata."""

from .models import ProjectCommand, UserSubscription
from .store_orders import fulfill_store_order
from .subscriptions import complete_subscription_from_metadata


def fulfill_payment_metadata(meta: dict) -> None:
    if not meta:
        return
    kind = meta.get('type')
    if kind == 'command':
        command_id = meta.get('command_id')
        if not command_id:
            return
        try:
            cmd = ProjectCommand.objects.get(id=command_id)
            cmd.payment_status = ProjectCommand.PaymentStatus.PAID
            cmd.save(update_fields=['payment_status'])
        except ProjectCommand.DoesNotExist:
            pass
    elif kind == 'subscription':
        sub_id = meta.get('subscription_id')
        if not sub_id:
            return
        try:
            sub = UserSubscription.objects.select_related('pack').get(id=sub_id)
            complete_subscription_from_metadata(sub, meta)
        except UserSubscription.DoesNotExist:
            pass
    elif kind == 'store_order':
        order_id = meta.get('store_order_id')
        if order_id:
            fulfill_store_order(order_id)

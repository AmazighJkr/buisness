"""Store catalog and checkout are available in Algeria only (DZD)."""

from rest_framework.exceptions import PermissionDenied

from .payment_region import is_algeria_request


def store_available_for_request(request) -> bool:
    return is_algeria_request(request)


def require_algeria_store(request):
    if not store_available_for_request(request):
        raise PermissionDenied(
            'The store is available in Algeria only. Prices are shown in DZD.',
        )


def store_cod_instructions(order_number: str) -> str:
    return (
        f'Order {order_number}: pay on delivery (cash) when your package arrives. '
        'We will contact you by phone or email to confirm shipping.'
    )

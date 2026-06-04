"""Algeria store shipping validation and pricing."""

import re

from django.core.exceptions import ValidationError

from .models import StorePostalCode, StoreWilaya

_PHONE_DIGITS = re.compile(r'^\+?213[567]\d{8}$|^0[567]\d{8}$|^[567]\d{8}$')


def normalize_algeria_phone(raw: str) -> str:
    digits = re.sub(r'\D', '', (raw or '').strip())
    if digits.startswith('213'):
        digits = digits[3:]
    if digits.startswith('0'):
        digits = digits[1:]
    if len(digits) != 9 or digits[0] not in '567':
        raise ValidationError(
            'Enter a valid Algerian mobile number (+213 5/6/7 followed by 8 digits).',
        )
    return f'+213{digits}'


def phone_is_algeria(raw: str) -> bool:
    try:
        normalize_algeria_phone(raw)
        return True
    except ValidationError:
        return False


def get_postal_code_for_checkout(postal_code: str, delivery_type: str) -> StorePostalCode:
    code = (postal_code or '').strip()
    if not code:
        raise ValidationError({'postal_code': 'Postal code is required.'})
    if delivery_type not in ('home', 'bureau'):
        raise ValidationError({'delivery_type': 'Choose home or bureau delivery.'})

    try:
        row = (
            StorePostalCode.objects.select_related('wilaya')
            .filter(postal_code__iexact=code, is_active=True, wilaya__is_active=True)
            .get()
        )
    except StorePostalCode.DoesNotExist as exc:
        raise ValidationError(
            {'postal_code': 'This postal code is not available for delivery. Contact us if you need help.'},
        ) from exc

    price = row.price_home_dzd if delivery_type == 'home' else row.price_bureau_dzd
    if price is None or price <= 0:
        raise ValidationError(
            {
                'delivery_type': (
                    'Home delivery is not available for this postal code.'
                    if delivery_type == 'home'
                    else 'Bureau (relay) delivery is not available for this postal code.'
                ),
            },
        )
    return row


def shipping_price_dzd(postal_row: StorePostalCode, delivery_type: str):
    if delivery_type == 'home':
        return postal_row.price_home_dzd
    return postal_row.price_bureau_dzd


def format_shipping_address(data) -> str:
    lines = [
        f"{data.get('first_name', '').strip()} {data.get('last_name', '').strip()}".strip(),
        data.get('address_line1', '').strip(),
    ]
    if data.get('address_line2', '').strip():
        lines.append(data['address_line2'].strip())
    city = data.get('city', '').strip()
    wilaya_name = data.get('wilaya_name', '') or ''
    postal = data.get('postal_code', '').strip()
    lines.append(f'{city}, {wilaya_name} {postal}'.strip())
    delivery = 'Home delivery' if data.get('delivery_type') == 'home' else 'Bureau / relay delivery'
    lines.append(delivery)
    lines.append(data.get('customer_phone', '').strip())
    return '\n'.join(line for line in lines if line)


def wilayas_with_active_postal_codes():
    return (
        StoreWilaya.objects.filter(is_active=True, postal_codes__is_active=True)
        .distinct()
        .order_by('code')
    )

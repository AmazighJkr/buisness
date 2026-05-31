from decimal import Decimal

from django.db import migrations
from django.utils.text import slugify


def seed_packs(apps, schema_editor):
    SubscriptionPack = apps.get_model('portfolio', 'SubscriptionPack')
    if SubscriptionPack.objects.exists():
        return
    packs = [
        {
            'name': 'Starter Pack',
            'slug': 'starter',
            'description': 'Access to beginner Arduino and basic IoT projects.',
            'price': Decimal('9.99'),
            'duration_days': 30,
            'sort_order': 1,
        },
        {
            'name': 'Pro Pack',
            'slug': 'pro',
            'description': 'Advanced firmware, sensors, and full project schematics.',
            'price': Decimal('19.99'),
            'duration_days': 30,
            'sort_order': 2,
        },
    ]
    for data in packs:
        SubscriptionPack.objects.create(is_active=True, **data)


class Migration(migrations.Migration):
    dependencies = [
        ('portfolio', '0013_payments_subscriptions'),
    ]

    operations = [
        migrations.RunPython(seed_packs, migrations.RunPython.noop),
    ]

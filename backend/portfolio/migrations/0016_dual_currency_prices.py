from decimal import Decimal

from django.db import migrations, models


def set_pack_dzd_prices(apps, schema_editor):
    SubscriptionPack = apps.get_model('portfolio', 'SubscriptionPack')
    defaults = {
        'starter': Decimal('1500'),
        'pro': Decimal('3500'),
    }
    for slug, dzd in defaults.items():
        SubscriptionPack.objects.filter(slug=slug).update(price_dzd=dzd)


class Migration(migrations.Migration):
    dependencies = [
        ('portfolio', '0015_user_social_auth'),
    ]

    operations = [
        migrations.AddField(
            model_name='subscriptionpack',
            name='price_dzd',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text='List price in Algerian dinar (Chargily)',
                max_digits=12,
            ),
        ),
        migrations.AddField(
            model_name='projectcommand',
            name='quoted_price_dzd',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Bill amount in DZD when accepted (Chargily)',
                max_digits=12,
                null=True,
            ),
        ),
        migrations.RunPython(set_pack_dzd_prices, migrations.RunPython.noop),
    ]

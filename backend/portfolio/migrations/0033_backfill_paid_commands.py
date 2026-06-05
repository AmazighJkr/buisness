from decimal import Decimal

from django.db import migrations
from django.utils import timezone


def backfill_paid_commands(apps, schema_editor):
    ProjectCommand = apps.get_model('portfolio', 'ProjectCommand')
    paid = 'paid'
    for cmd in ProjectCommand.objects.filter(payment_status=paid):
        dzd = cmd.quoted_price_dzd or Decimal('0')
        usd = cmd.quoted_price or Decimal('0')
        updates = {}
        if dzd > 0 and usd <= 0:
            updates = {'paid_currency': 'dzd', 'paid_amount': dzd}
        elif usd > 0 and dzd <= 0:
            updates = {'paid_currency': 'usd', 'paid_amount': usd}
        if updates and not cmd.paid_at:
            updates['paid_at'] = cmd.updated_at or timezone.now()
        if updates:
            ProjectCommand.objects.filter(pk=cmd.pk).update(**updates)


class Migration(migrations.Migration):
    dependencies = [
        ('portfolio', '0032_payment_tracking'),
    ]

    operations = [
        migrations.RunPython(backfill_paid_commands, migrations.RunPython.noop),
    ]

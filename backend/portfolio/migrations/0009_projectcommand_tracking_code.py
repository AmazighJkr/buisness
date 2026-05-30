import random

from django.conf import settings
from django.db import migrations, models


def fill_tracking_codes(apps, schema_editor):
    ProjectCommand = apps.get_model('portfolio', 'ProjectCommand')
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    used = set()
    for command in ProjectCommand.objects.all():
        while True:
            code = 'EG-' + ''.join(random.choices(chars, k=6))
            if code not in used:
                used.add(code)
                command.tracking_code = code
                command.save(update_fields=['tracking_code'])
                break


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0008_command_tracking'),
    ]

    operations = [
        migrations.AddField(
            model_name='projectcommand',
            name='tracking_code',
            field=models.CharField(blank=True, editable=False, max_length=12, null=True),
        ),
        migrations.RunPython(fill_tracking_codes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='projectcommand',
            name='tracking_code',
            field=models.CharField(editable=False, max_length=12, unique=True),
        ),
    ]

import secrets
import uuid

from django.conf import settings
from django.db import migrations, models


def fill_access_tokens(apps, schema_editor):
    ProjectCommand = apps.get_model('portfolio', 'ProjectCommand')
    for command in ProjectCommand.objects.all():
        if not command.access_token:
            command.access_token = secrets.token_urlsafe(24)
            command.save(update_fields=['access_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0007_project_code_files'),
    ]

    operations = [
        migrations.AddField(
            model_name='projectcommand',
            name='access_token',
            field=models.CharField(default='pending', editable=False, max_length=64),
            preserve_default=False,
        ),
        migrations.RunPython(fill_access_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='projectcommand',
            name='access_token',
            field=models.CharField(editable=False, max_length=64, unique=True),
        ),
        migrations.CreateModel(
            name='CommandMessage',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('role', models.CharField(choices=[('client', 'Client'), ('staff', 'Staff')], max_length=10)),
                ('author_name', models.CharField(max_length=120)),
                ('text', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                (
                    'command',
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name='messages',
                        to='portfolio.projectcommand',
                    ),
                ),
                (
                    'staff_user',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=models.deletion.SET_NULL,
                        related_name='command_messages',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
    ]

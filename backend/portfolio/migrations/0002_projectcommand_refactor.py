# Generated manually for command refactor

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def copy_orders_to_commands(apps, schema_editor):
    ClientOrder = apps.get_model('portfolio', 'ClientOrder')
    ProjectCommand = apps.get_model('portfolio', 'ProjectCommand')
    for order in ClientOrder.objects.all():
        ProjectCommand.objects.create(
            id=order.id,
            client_name=order.user.username if order.user_id else '',
            associated_project_id=order.associated_project_id,
            idea_description=order.requirements_text or '',
            status=order.status,
            created_at=order.created_at,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ProjectCommand',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('client_name', models.CharField(blank=True, max_length=120)),
                ('client_email', models.EmailField(blank=True, max_length=254)),
                ('idea_description', models.TextField(help_text='Describe the project idea')),
                ('price_limit', models.DecimalField(blank=True, decimal_places=2, help_text='Maximum budget in your currency', max_digits=12, null=True)),
                ('objectives', models.TextField(blank=True, help_text='Goals and deliverables')),
                ('problems', models.TextField(blank=True, help_text='Current problems or constraints')),
                ('attachment', models.FileField(blank=True, null=True, upload_to='commands/')),
                ('status', models.CharField(choices=[('Pending', 'Pending'), ('In_Design', 'In Design'), ('Prototyping', 'Prototyping'), ('Testing', 'Testing'), ('Shipped', 'Shipped')], default='Pending', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('associated_project', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='commands', to='portfolio.project')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddField(
            model_name='comment',
            name='author_name',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AlterField(
            model_name='comment',
            name='user',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='comments', to=settings.AUTH_USER_MODEL),
        ),
        migrations.RunPython(copy_orders_to_commands, migrations.RunPython.noop),
        migrations.DeleteModel(
            name='ClientOrder',
        ),
    ]

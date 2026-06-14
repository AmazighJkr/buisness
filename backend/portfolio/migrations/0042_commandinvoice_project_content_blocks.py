import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0041_storeproductcomment_comment_rating'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='content_blocks',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Ordered page sections: rich_text, heading, materials, wiring, image, etc.',
            ),
        ),
        migrations.CreateModel(
            name='CommandInvoice',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(default='Facture / Invoice', max_length=200)),
                ('line_items', models.JSONField(
                    blank=True,
                    default=list,
                    help_text='[{label, description, qty, unit_usd, unit_dzd}]',
                )),
                ('notes', models.TextField(blank=True)),
                ('total_usd', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('total_dzd', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('status', models.CharField(
                    choices=[
                        ('draft', 'Draft'),
                        ('sent', 'Sent'),
                        ('paid', 'Paid'),
                        ('cancelled', 'Cancelled'),
                    ],
                    default='draft',
                    max_length=12,
                )),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('command', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='invoices',
                    to='portfolio.projectcommand',
                )),
                ('created_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='command_invoices_created',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]

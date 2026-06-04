# Generated manually for Algeria shipping

from decimal import Decimal

from django.db import migrations, models
import django.db.models.deletion
import uuid

from portfolio.data.algeria_wilayas import WILAYAS


def seed_wilayas(apps, schema_editor):
    StoreWilaya = apps.get_model('portfolio', 'StoreWilaya')
    for code, name in WILAYAS:
        StoreWilaya.objects.get_or_create(code=code, defaults={'name': name, 'is_active': True})


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0021_command_layers'),
    ]

    operations = [
        migrations.CreateModel(
            name='StoreWilaya',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('code', models.CharField(db_index=True, max_length=2, unique=True)),
                ('name', models.CharField(max_length=80)),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'ordering': ['code'],
                'verbose_name_plural': 'Store wilayas',
            },
        ),
        migrations.CreateModel(
            name='StorePostalCode',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('postal_code', models.CharField(db_index=True, max_length=10)),
                ('city', models.CharField(blank=True, max_length=80)),
                ('price_home_dzd', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('price_bureau_dzd', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('wilaya', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='postal_codes', to='portfolio.storewilaya')),
            ],
            options={
                'verbose_name': 'Postal code (shipping)',
                'ordering': ['wilaya__code', 'postal_code'],
                'unique_together': {('wilaya', 'postal_code')},
            },
        ),
        migrations.AddField(
            model_name='storeorder',
            name='address_line1',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='storeorder',
            name='address_line2',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='storeorder',
            name='city',
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name='storeorder',
            name='customer_first_name',
            field=models.CharField(blank=True, max_length=60),
        ),
        migrations.AddField(
            model_name='storeorder',
            name='customer_last_name',
            field=models.CharField(blank=True, max_length=60),
        ),
        migrations.AddField(
            model_name='storeorder',
            name='delivery_type',
            field=models.CharField(blank=True, choices=[('home', 'Home'), ('bureau', 'Bureau / relay')], max_length=10),
        ),
        migrations.AddField(
            model_name='storeorder',
            name='postal_code',
            field=models.CharField(blank=True, db_index=True, max_length=10),
        ),
        migrations.AddField(
            model_name='storeorder',
            name='shipping_dzd',
            field=models.DecimalField(decimal_places=2, default=Decimal('0'), max_digits=12),
        ),
        migrations.AddField(
            model_name='storeorder',
            name='wilaya',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='orders', to='portfolio.storewilaya'),
        ),
        migrations.RunPython(seed_wilayas, migrations.RunPython.noop),
    ]

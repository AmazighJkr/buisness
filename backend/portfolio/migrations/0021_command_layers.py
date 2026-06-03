import uuid

from django.db import migrations, models


def seed_command_layers(apps, schema_editor):
    CommandLayer = apps.get_model('portfolio', 'CommandLayer')
    layers = [
        {
            'slug': 'basic-code',
            'name': 'Basic embedded code',
            'description': 'Firmware for your MCU: drivers, main logic, and documentation.',
            'group': 'firmware',
            'price_usd': '500.00',
            'price_dzd': '65000.00',
            'is_required': True,
            'sort_order': 10,
        },
        {
            'slug': 'esp-now',
            'name': 'ESP-NOW wireless',
            'description': 'Peer-to-peer ESP-NOW links between devices.',
            'group': 'wireless',
            'price_usd': '250.00',
            'price_dzd': '32500.00',
            'sort_order': 20,
        },
        {
            'slug': 'bluetooth-android',
            'name': 'Bluetooth + Android app',
            'description': 'BLE stack on device plus Android companion for control and data.',
            'group': 'wireless',
            'price_usd': '450.00',
            'price_dzd': '58500.00',
            'sort_order': 30,
        },
        {
            'slug': 'android-app',
            'name': 'Android companion app',
            'description': 'Standalone Android app (no BLE unless combined with Bluetooth layer).',
            'group': 'mobile',
            'price_usd': '400.00',
            'price_dzd': '52000.00',
            'sort_order': 40,
        },
        {
            'slug': 'server',
            'name': 'Backend server / API',
            'description': 'REST or MQTT backend, auth, and deployment guidance.',
            'group': 'cloud',
            'price_usd': '600.00',
            'price_dzd': '78000.00',
            'sort_order': 50,
        },
        {
            'slug': 'database',
            'name': 'Database',
            'description': 'Schema design, migrations, and integration with your backend.',
            'group': 'cloud',
            'price_usd': '200.00',
            'price_dzd': '26000.00',
            'sort_order': 60,
        },
        {
            'slug': 'website',
            'name': 'Website / web dashboard',
            'description': 'Admin or customer-facing web UI connected to your product.',
            'group': 'cloud',
            'price_usd': '450.00',
            'price_dzd': '58500.00',
            'sort_order': 70,
        },
        {
            'slug': 'wifi-cloud',
            'name': 'Wi-Fi + cloud IoT',
            'description': 'Wi-Fi connectivity, MQTT/HTTPS to cloud, remote monitoring hooks.',
            'group': 'wireless',
            'price_usd': '350.00',
            'price_dzd': '45500.00',
            'sort_order': 80,
        },
        {
            'slug': 'ota-updates',
            'name': 'OTA firmware updates',
            'description': 'Secure over-the-air update flow for field devices.',
            'group': 'firmware',
            'price_usd': '200.00',
            'price_dzd': '26000.00',
            'sort_order': 90,
        },
    ]
    for item in layers:
        slug = item['slug']
        defaults = {k: v for k, v in item.items() if k != 'slug'}
        CommandLayer.objects.update_or_create(slug=slug, defaults=defaults)


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0020_store_short_description_text'),
    ]

    operations = [
        migrations.CreateModel(
            name='CommandLayer',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('slug', models.SlugField(max_length=80, unique=True)),
                ('name', models.CharField(max_length=160)),
                ('description', models.TextField(blank=True)),
                (
                    'group',
                    models.CharField(
                        choices=[
                            ('firmware', 'Firmware & embedded'),
                            ('mobile', 'Mobile apps'),
                            ('cloud', 'Server & web'),
                            ('wireless', 'Wireless & connectivity'),
                        ],
                        default='firmware',
                        max_length=20,
                    ),
                ),
                ('price_usd', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('price_dzd', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('is_required', models.BooleanField(default=False, help_text='Always included in every new command (e.g. basic firmware).')),
                ('is_active', models.BooleanField(default=True)),
                ('sort_order', models.PositiveIntegerField(default=0)),
            ],
            options={
                'ordering': ['sort_order', 'name'],
            },
        ),
        migrations.AddField(
            model_name='projectcommand',
            name='selected_layers',
            field=models.JSONField(blank=True, default=list, help_text='Snapshot of chosen command layers [{id, slug, name, price_usd, price_dzd}]'),
        ),
        migrations.AddField(
            model_name='projectcommand',
            name='estimated_total_usd',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='projectcommand',
            name='estimated_total_dzd',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.RunPython(seed_command_layers, migrations.RunPython.noop),
    ]

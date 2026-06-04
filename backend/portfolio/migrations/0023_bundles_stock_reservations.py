import uuid

from django.db import migrations, models
import django.db.models.deletion


def seed_layer_bundles(apps, schema_editor):
    CommandLayer = apps.get_model('portfolio', 'CommandLayer')
    CommandLayerBundle = apps.get_model('portfolio', 'CommandLayerBundle')

    def ids_for(*slugs):
        out = []
        for slug in slugs:
            layer = CommandLayer.objects.filter(slug=slug, is_active=True).first()
            if layer:
                out.append(str(layer.id))
        return out

    presets = [
        {
            'slug': 'full-iot',
            'name': 'Full IoT stack',
            'description': 'Firmware, Wi-Fi cloud link, server, database, and Android companion.',
            'layer_slugs': ['basic-code', 'wifi-cloud', 'server', 'database', 'android-app'],
            'sort_order': 10,
        },
        {
            'slug': 'connected-device',
            'name': 'Connected device',
            'description': 'Firmware, BLE + Android app, and backend API.',
            'layer_slugs': ['basic-code', 'bluetooth-android', 'server'],
            'sort_order': 20,
        },
        {
            'slug': 'firmware-wireless',
            'name': 'Firmware + wireless',
            'description': 'Core firmware with ESP-NOW and OTA updates.',
            'layer_slugs': ['basic-code', 'esp-now', 'ota-updates'],
            'sort_order': 30,
        },
        {
            'slug': 'web-dashboard',
            'name': 'Device + web dashboard',
            'description': 'Firmware, server, database, and customer web dashboard.',
            'layer_slugs': ['basic-code', 'server', 'database', 'website'],
            'sort_order': 40,
        },
    ]
    for preset in presets:
        layer_ids = ids_for(*preset.pop('layer_slugs'))
        if not layer_ids:
            continue
        slug = preset['slug']
        defaults = {**preset, 'layer_ids': layer_ids, 'is_active': True}
        CommandLayerBundle.objects.update_or_create(slug=slug, defaults=defaults)


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0022_algeria_shipping'),
    ]

    operations = [
        migrations.CreateModel(
            name='CommandLayerBundle',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('slug', models.SlugField(max_length=80, unique=True)),
                ('name', models.CharField(max_length=160)),
                ('description', models.TextField(blank=True)),
                ('layer_ids', models.JSONField(default=list)),
                ('is_active', models.BooleanField(default=True)),
                ('sort_order', models.PositiveIntegerField(default=0)),
            ],
            options={
                'ordering': ['sort_order', 'name'],
            },
        ),
        migrations.CreateModel(
            name='StoreStockReservation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('reservation_key', models.CharField(db_index=True, max_length=64)),
                ('quantity', models.PositiveIntegerField(default=1)),
                ('expires_at', models.DateTimeField(db_index=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('order', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='stock_reservations', to='portfolio.storeorder')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='stock_reservations', to='portfolio.storeproduct')),
            ],
        ),
        migrations.AddIndex(
            model_name='storestockreservation',
            index=models.Index(fields=['reservation_key', 'product'], name='portfolio_st_reserv_6e2a0d_idx'),
        ),
        migrations.RunPython(seed_layer_bundles, migrations.RunPython.noop),
    ]

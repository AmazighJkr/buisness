from django.db import migrations
from django.utils.text import slugify


def seed_store_categories(apps, schema_editor):
    StoreCategory = apps.get_model('portfolio', 'StoreCategory')
    if StoreCategory.objects.exists():
        return

    tree = [
        ('Embedded', [
            ('Controllers', 0),
            ('Sensors', 1),
            ('Modules', 2),
            ('Kits', 3),
        ]),
        ('PC Parts', [
            ('Storage', 0),
            ('Memory', 1),
            ('Peripherals', 2),
        ]),
        ('Tools', [
            ('Soldering', 0),
            ('Measurement', 1),
        ]),
    ]

    for order, (parent_name, children) in enumerate(tree):
        parent = StoreCategory.objects.create(
            name=parent_name,
            slug=slugify(parent_name),
            sort_order=order,
            is_active=True,
        )
        for child_order, (child_name, _) in enumerate(children):
            StoreCategory.objects.create(
                parent=parent,
                name=child_name,
                slug=slugify(child_name),
                sort_order=child_order,
                is_active=True,
            )


def unseed_store_categories(apps, schema_editor):
    StoreCategory = apps.get_model('portfolio', 'StoreCategory')
    slugs = {
        'embedded', 'controllers', 'sensors', 'modules', 'kits',
        'pc-parts', 'storage', 'memory', 'peripherals',
        'tools', 'soldering', 'measurement',
    }
    StoreCategory.objects.filter(slug__in=slugs).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0039_store_category_parent_storeproductvariant'),
    ]

    operations = [
        migrations.RunPython(seed_store_categories, unseed_store_categories),
    ]

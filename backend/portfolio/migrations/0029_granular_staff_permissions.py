from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0028_legal_page'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='commandlayer',
            options={
                'ordering': ['sort_order', 'name'],
                'permissions': [
                    ('manage_command_layers', 'Can manage command layers'),
                ],
            },
        ),
        migrations.AlterModelOptions(
            name='storeproduct',
            options={
                'ordering': ['-is_featured', 'sort_order', 'name'],
                'permissions': [
                    ('post_store', 'Can post store products'),
                    ('edit_store', 'Can edit store catalog'),
                ],
            },
        ),
        migrations.AlterModelOptions(
            name='storeorder',
            options={
                'ordering': ['-created_at'],
                'permissions': [
                    ('manage_store_orders', 'Can manage store orders'),
                ],
            },
        ),
    ]

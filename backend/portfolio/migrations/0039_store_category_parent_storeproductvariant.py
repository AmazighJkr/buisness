import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0038_project_cover_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='storecategory',
            name='parent',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='children',
                to='portfolio.storecategory',
            ),
        ),
        migrations.CreateModel(
            name='StoreProductVariant',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=120)),
                ('description', models.TextField(blank=True)),
                ('image', models.ImageField(blank=True, null=True, upload_to='store/products/variants/')),
                ('sort_order', models.PositiveIntegerField(default=0)),
                (
                    'product',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='variants',
                        to='portfolio.storeproduct',
                    ),
                ),
            ],
            options={
                'ordering': ['sort_order', 'name'],
            },
        ),
    ]

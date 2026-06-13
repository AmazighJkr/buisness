import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0040_seed_store_categories'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='comment',
            name='rating',
            field=models.PositiveSmallIntegerField(
                blank=True,
                help_text='Optional 1–5 star rating',
                null=True,
            ),
        ),
        migrations.CreateModel(
            name='StoreProductComment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('author_name', models.CharField(max_length=120)),
                ('text', models.TextField()),
                ('rating', models.PositiveSmallIntegerField(
                    blank=True,
                    help_text='Optional 1–5 star rating',
                    null=True,
                )),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('product', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='comments',
                    to='portfolio.storeproduct',
                )),
                ('user', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='store_product_comments',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['timestamp'],
                'permissions': [('moderate_store_comment', 'Can moderate store product comments')],
            },
        ),
    ]

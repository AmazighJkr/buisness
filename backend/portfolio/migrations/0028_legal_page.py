from django.db import migrations, models

from portfolio.legal_defaults import LEGAL_SEED


def seed_legal(apps, schema_editor):
    LegalPage = apps.get_model('portfolio', 'LegalPage')
    for slug, content in LEGAL_SEED.items():
        LegalPage.objects.update_or_create(slug=slug, defaults={'content': content})


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0027_postal_city_post_name'),
    ]

    operations = [
        migrations.CreateModel(
            name='LegalPage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('slug', models.CharField(choices=[('terms', 'Terms (CGV)'), ('privacy', 'Privacy policy')], max_length=32, unique=True)),
                ('content', models.JSONField(blank=True, default=dict)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['slug'],
            },
        ),
        migrations.RunPython(seed_legal, migrations.RunPython.noop),
    ]

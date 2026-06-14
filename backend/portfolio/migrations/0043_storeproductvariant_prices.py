# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0042_commandinvoice_project_content_blocks'),
    ]

    operations = [
        migrations.AddField(
            model_name='storeproductvariant',
            name='price_dzd',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Leave empty to use the product base price.',
                max_digits=12,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='storeproductvariant',
            name='price_usd',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Leave empty to use the product base price.',
                max_digits=12,
                null=True,
            ),
        ),
    ]

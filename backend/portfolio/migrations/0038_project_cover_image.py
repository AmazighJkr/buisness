from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0037_project_model_3d_conversion_error'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='cover_image',
            field=models.ImageField(
                blank=True,
                help_text='Card/thumbnail image (optional — falls back to schematic).',
                null=True,
                upload_to='projects/covers/',
            ),
        ),
        migrations.AlterField(
            model_name='project',
            name='schematic_image',
            field=models.ImageField(
                blank=True,
                help_text='Wiring diagram / schematic shown on the project detail page.',
                null=True,
                upload_to='projects/schematics/',
            ),
        ),
    ]

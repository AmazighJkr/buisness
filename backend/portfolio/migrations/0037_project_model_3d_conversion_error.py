from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0036_project_model_3d_glb'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='model_3d_conversion_error',
            field=models.TextField(
                blank=True,
                default='',
                help_text='Last GLB conversion failure message (cleared on success).',
            ),
        ),
    ]

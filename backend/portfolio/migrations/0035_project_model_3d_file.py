from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0034_project_model_3d_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='model_3d_file',
            field=models.FileField(
                blank=True,
                help_text='GLB, GLTF, FBX, or OBJ (max 25 MB). Convert STEP/STP/SLDPRT in CAD first.',
                null=True,
                upload_to='projects/models/',
            ),
        ),
        migrations.AlterField(
            model_name='project',
            name='model_3d_url',
            field=models.URLField(
                blank=True,
                help_text='Legacy external URL — prefer model_3d_file upload.',
            ),
        ),
    ]

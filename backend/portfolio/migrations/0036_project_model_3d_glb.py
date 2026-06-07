from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0035_project_model_3d_file'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='model_3d_glb',
            field=models.FileField(
                blank=True,
                editable=False,
                help_text='Auto-generated GLB preview (do not upload manually).',
                null=True,
                upload_to='projects/models/glb/',
            ),
        ),
        migrations.AlterField(
            model_name='project',
            name='model_3d_file',
            field=models.FileField(
                blank=True,
                help_text='Source upload: GLB, STL, OBJ, STEP, STP, FBX (max 25 MB). Non-GLB files are auto-converted.',
                null=True,
                upload_to='projects/models/',
            ),
        ),
    ]

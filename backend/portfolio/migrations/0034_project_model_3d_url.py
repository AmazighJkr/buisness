from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0033_backfill_paid_commands'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='model_3d_url',
            field=models.URLField(
                blank=True,
                help_text='Public URL to GLB, GLTF, FBX, or OBJ (convert STEP/STP/SLDPRT in CAD first).',
            ),
        ),
    ]

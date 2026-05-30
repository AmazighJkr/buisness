from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0005_project_featured'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='video_url',
            field=models.URLField(blank=True),
        ),
    ]

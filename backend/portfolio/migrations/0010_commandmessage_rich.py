from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0009_projectcommand_tracking_code'),
    ]

    operations = [
        migrations.AddField(
            model_name='commandmessage',
            name='link_url',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='commandmessage',
            name='image',
            field=models.ImageField(blank=True, null=True, upload_to='commands/messages/'),
        ),
        migrations.AlterField(
            model_name='commandmessage',
            name='text',
            field=models.TextField(blank=True),
        ),
    ]

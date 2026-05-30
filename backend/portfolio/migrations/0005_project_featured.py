from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0004_categories'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='is_featured',
            field=models.BooleanField(default=False, help_text='Show in trending/default grid on Projects page'),
        ),
        migrations.AddField(
            model_name='project',
            name='featured_order',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AlterModelOptions(
            name='project',
            options={'ordering': ['-featured_order', '-created_at']},
        ),
    ]

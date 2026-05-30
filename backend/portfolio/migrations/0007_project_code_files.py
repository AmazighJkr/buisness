from django.db import migrations, models


def migrate_source_code_to_files(apps, schema_editor):
    Project = apps.get_model('portfolio', 'Project')
    for project in Project.objects.exclude(source_code=''):
        if project.code_files:
            continue
        code = (project.source_code or '').strip()
        if code:
            project.code_files = [{'title': 'main', 'code': project.source_code}]
            project.save(update_fields=['code_files'])


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0006_project_video_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='code_files',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(migrate_source_code_to_files, migrations.RunPython.noop),
    ]

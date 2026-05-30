# Project field restructure

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def migrate_project_fields(apps, schema_editor):
    Project = apps.get_model('portfolio', 'Project')
    for p in Project.objects.all():
        specs = getattr(p, 'hardware_specs', None) or {}
        if specs and not p.materials:
            p.materials = specs.get('bom', [])
            if specs.get('bom'):
                for row in p.materials:
                    if 'part' in row and 'component' not in row:
                        row['component'] = row.pop('part')
                    if 'qty' in row and 'quantity' not in row:
                        row['quantity'] = row.pop('qty')
        if getattr(p, 'libraries', '') == '' and specs:
            stack = specs.get('tech_stack', [])
            if stack:
                p.libraries = ', '.join(stack)
        old_url = getattr(p, 'circuit_simulation_url', '') or ''
        if old_url and not p.simulation_url:
            p.simulation_url = old_url
        old_img = getattr(p, 'image', None)
        if old_img and not p.schematic_image:
            p.schematic_image = old_img
        p.save()


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0002_projectcommand_refactor'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='materials',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='project',
            name='wiring',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='project',
            name='libraries',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='project',
            name='simulation_url',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='project',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name='projectcommand',
            name='staff_response',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='projectcommand',
            name='responded_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='projectcommand',
            name='responded_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='command_responses',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='project',
            name='schematic_image',
            field=models.ImageField(blank=True, null=True, upload_to='projects/schematics/'),
        ),
        migrations.RunPython(migrate_project_fields, migrations.RunPython.noop),
        migrations.RemoveField(model_name='project', name='chip_model'),
        migrations.RemoveField(model_name='project', name='hardware_specs'),
        migrations.RemoveField(model_name='project', name='circuit_simulation_url'),
        migrations.RemoveField(model_name='project', name='image'),
        migrations.AlterModelOptions(
            name='project',
            options={'ordering': ['-created_at'], 'permissions': [('post_project', 'Can post projects'), ('edit_project', 'Can edit projects')]},
        ),
        migrations.AlterModelOptions(
            name='projectcommand',
            options={'ordering': ['-created_at'], 'permissions': [('view_commands', 'Can view commands'), ('respond_commands', 'Can respond to commands')]},
        ),
        migrations.AlterModelOptions(
            name='comment',
            options={'ordering': ['timestamp'], 'permissions': [('moderate_comment', 'Can delete comments')]},
        ),
    ]

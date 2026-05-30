import uuid

import django.db.models.deletion
from django.db import migrations, models


def seed_categories(apps, schema_editor):
    ProjectCategory = apps.get_model('portfolio', 'ProjectCategory')
    Project = apps.get_model('portfolio', 'Project')

    arduino = ProjectCategory.objects.create(name='Arduino', sort_order=1)
    python_cat = ProjectCategory.objects.create(name='Python', sort_order=2)

    subs = [
        (arduino, 'Basic projects', 1),
        (arduino, 'Medium project', 2),
        (arduino, 'Advanced Projects', 3),
        (python_cat, 'basics', 1),
        (python_cat, 'software', 2),
        (python_cat, 'web app', 3),
        (python_cat, 'AI', 4),
    ]
    first_sub = None
    for parent, name, order in subs:
        sub = ProjectCategory.objects.create(parent=parent, name=name, sort_order=order)
        if first_sub is None:
            first_sub = sub

    if first_sub:
        for project in Project.objects.filter(subcategory__isnull=True):
            project.subcategory = first_sub
            project.save(update_fields=['subcategory_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0003_project_restructure'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProjectCategory',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=120)),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='children', to='portfolio.projectcategory')),
            ],
            options={
                'verbose_name_plural': 'Project categories',
                'ordering': ['sort_order', 'name'],
                'permissions': [('manage_categories', 'Can manage categories')],
            },
        ),
        migrations.AddField(
            model_name='project',
            name='subcategory',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='projects',
                to='portfolio.projectcategory',
            ),
        ),
        migrations.RunPython(seed_categories, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='project',
            name='subcategory',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='projects',
                to='portfolio.projectcategory',
            ),
        ),
    ]

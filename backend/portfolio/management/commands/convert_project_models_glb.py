from django.core.management.base import BaseCommand

from portfolio.model3d_convert import Model3dConversionError, convert_project_model_to_glb
from portfolio.models import Project


class Command(BaseCommand):
    help = 'Convert existing project 3D uploads to GLB preview files.'

    def handle(self, *args, **options):
        projects = Project.objects.exclude(model_3d_file='').exclude(model_3d_file__isnull=True)
        ok = 0
        failed = 0
        for project in projects.iterator():
            try:
                convert_project_model_to_glb(project)
                ok += 1
                self.stdout.write(f'OK  {project.title} ({project.pk})')
            except Model3dConversionError as exc:
                failed += 1
                self.stderr.write(f'FAIL {project.title} ({project.pk}): {exc}')
        self.stdout.write(self.style.SUCCESS(f'Done: {ok} processed, {failed} failed.'))

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Verify trimesh + cascadio are installed (required for 3D → GLB conversion).'

    def handle(self, *args, **options):
        try:
            import trimesh
            import cascadio  # noqa: F401
        except ImportError as exc:
            self.stderr.write(
                self.style.ERROR(
                    f'Missing 3D converter packages: {exc}\n'
                    'Run: pip install -r requirements.txt',
                ),
            )
            raise SystemExit(1) from exc
        self.stdout.write(self.style.SUCCESS(f'trimesh {trimesh.__version__} + cascadio OK'))

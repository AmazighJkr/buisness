import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()

DEFAULT_USERNAME = 'admin'
DEFAULT_PASSWORD = 'admin_lab_2026'
DEFAULT_EMAIL = 'admin@lab.local'


def _env_nonempty(key: str) -> str | None:
    value = os.getenv(key)
    if value is not None and value != '':
        return value
    return None


class Command(BaseCommand):
    help = 'Create or reset the local admin superuser for Django admin'

    def add_arguments(self, parser):
        parser.add_argument('--username', default=None)
        parser.add_argument('--password', default=None)
        parser.add_argument('--email', default=None)

    def handle(self, *args, **options):
        username = options['username'] or _env_nonempty('ADMIN_USERNAME') or DEFAULT_USERNAME
        if options['password'] is not None:
            password = options['password']
        else:
            password = _env_nonempty('ADMIN_PASSWORD') or DEFAULT_PASSWORD
        email = options['email'] or _env_nonempty('ADMIN_EMAIL') or DEFAULT_EMAIL

        user, created = User.objects.get_or_create(
            username=username,
            defaults={'email': email, 'is_staff': True, 'is_superuser': True},
        )
        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()

        action = 'Created' if created else 'Updated password for'
        self.stdout.write(self.style.SUCCESS(f'{action} admin user "{username}"'))
        render_host = os.getenv('RENDER_EXTERNAL_HOSTNAME', '').strip()
        if render_host:
            base = f'https://{render_host}'
            self.stdout.write(f'  Site: {base}/')
            self.stdout.write(f'  Admin panel: {base}/admin/')
            self.stdout.write('  Password: set via ADMIN_PASSWORD in Render (not printed)')
        else:
            self.stdout.write('  Admin panel: http://127.0.0.1:8000/admin/')
            if _env_nonempty('ADMIN_PASSWORD'):
                self.stdout.write('  Password: from ADMIN_PASSWORD env (not printed)')
            elif options['password'] is not None:
                self.stdout.write('  Password: from --password (not printed)')
            else:
                self.stdout.write(
                    '  Password: default dev credential (see README; not printed)'
                )
        self.stdout.write(f'  Username: {username}')

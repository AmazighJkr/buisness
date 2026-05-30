import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()

DEFAULT_USERNAME = 'admin'
DEFAULT_PASSWORD = 'admin_lab_2026'
DEFAULT_EMAIL = 'admin@lab.local'


class Command(BaseCommand):
    help = 'Create or reset the local admin superuser for the admin panel'

    def add_arguments(self, parser):
        parser.add_argument('--username', default=DEFAULT_USERNAME)
        parser.add_argument('--password', default=DEFAULT_PASSWORD)
        parser.add_argument('--email', default=DEFAULT_EMAIL)

    def handle(self, *args, **options):
        username = options['username'] or os.getenv('ADMIN_USERNAME', DEFAULT_USERNAME)
        password = options['password'] or os.getenv('ADMIN_PASSWORD', DEFAULT_PASSWORD)
        email = options['email'] or os.getenv('ADMIN_EMAIL', DEFAULT_EMAIL)

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
            self.stdout.write(f'  Admin panel: {base}/admin-panel')
        else:
            self.stdout.write(f'  Admin panel: http://localhost:5173/admin-panel')
            self.stdout.write(f'  Django admin: http://127.0.0.1:8000/admin/')
        self.stdout.write(f'  Username: {username}')
        self.stdout.write(f'  Password: {password}')

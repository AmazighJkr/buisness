"""Fix partial/failed 0009 tracking_code migration on PostgreSQL (Render deploys)."""
import random

from django.core.management.base import BaseCommand
from django.db import connection
from django.db.migrations.recorder import MigrationRecorder


class Command(BaseCommand):
    help = 'Repair stuck portfolio.0009 migration after a failed Render deploy'

    def handle(self, *args, **options):
        if connection.vendor != 'postgresql':
            return

        recorder = MigrationRecorder(connection)
        name = '0009_projectcommand_tracking_code'
        if recorder.migration_qs.filter(app='portfolio', name=name).exists():
            return

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'portfolio_projectcommand'
                  AND column_name = 'tracking_code'
                """
            )
            if not cursor.fetchone():
                return

        self.stdout.write(self.style.WARNING('Repairing partial migration 0009...'))

        from portfolio.models import ProjectCommand

        chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        used = {
            c
            for c in ProjectCommand.objects.exclude(tracking_code__isnull=True)
            .exclude(tracking_code='')
            .values_list('tracking_code', flat=True)
        }
        missing = ProjectCommand.objects.filter(tracking_code__isnull=True) | ProjectCommand.objects.filter(
            tracking_code=''
        )
        for command in missing:
            while True:
                code = 'EG-' + ''.join(random.choices(chars, k=6))
                if code not in used:
                    used.add(code)
                    command.tracking_code = code
                    command.save(update_fields=['tracking_code'])
                    break

        with connection.cursor() as cursor:
            cursor.execute(
                'DROP INDEX IF EXISTS portfolio_projectcommand_tracking_code_e9a66f66_like'
            )
            cursor.execute(
                'DROP INDEX IF EXISTS portfolio_projectcommand_tracking_code_e9a66f66'
            )
            cursor.execute(
                """
                DO $$ BEGIN
                    ALTER TABLE portfolio_projectcommand
                    ADD CONSTRAINT portfolio_projectcommand_tracking_code_key
                    UNIQUE (tracking_code);
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                END $$;
                """
            )

        recorder.record_applied('portfolio', name)
        self.stdout.write(self.style.SUCCESS('Marked 0009 as applied; migrate can continue.'))

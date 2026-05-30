from django.core.management.base import BaseCommand

from portfolio.models import Comment, Project, ProjectCategory

DEMO = [
    ('Arduino', 'Basic projects', {
        'title': 'Smart Greenhouse Monitor',
        'description': 'Environmental sensing with MQTT telemetry and automated irrigation.',
        'materials': [
            {'component': 'ESP32-WROOM-32', 'quantity': '1', 'notes': 'MCU'},
            {'component': 'DHT22', 'quantity': '2', 'notes': 'Sensors'},
        ],
        'wiring': [{'from_pin': 'GPIO4', 'to_pin': 'DHT22', 'notes': 'Data'}],
        'libraries': 'WiFi, PubSubClient, DHT',
        'simulation_url': 'https://wokwi.com/projects/example-greenhouse',
        'source_code': 'void loop() { /* telemetry */ }',
    }),
    ('Python', 'basics', {
        'title': 'Sensor Data Logger',
        'description': 'Python script to log serial sensor data to CSV.',
        'materials': [{'component': 'USB cable', 'quantity': '1', 'notes': ''}],
        'wiring': [],
        'libraries': 'pyserial, csv',
        'source_code': 'import serial\n# read loop',
    }),
]


class Command(BaseCommand):
    help = 'Seed categories and demo projects'

    def handle(self, *args, **options):
        for cat_name, sub_name, project_data in DEMO:
            cat, _ = ProjectCategory.objects.get_or_create(
                name=cat_name,
                parent=None,
                defaults={'sort_order': 0},
            )
            sub, _ = ProjectCategory.objects.get_or_create(
                name=sub_name,
                parent=cat,
                defaults={'sort_order': 0},
            )
            project, created = Project.objects.get_or_create(
                title=project_data['title'],
                defaults={**project_data, 'subcategory': sub},
            )
            if created:
                self.stdout.write(f'  + {project.title}')
                Comment.objects.get_or_create(
                    project=project,
                    author_name='Lab',
                    defaults={'text': 'Questions welcome in comments.'},
                )
        self.stdout.write(self.style.SUCCESS('Done.'))

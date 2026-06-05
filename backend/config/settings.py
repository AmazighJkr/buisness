import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / '.env')
except ImportError:
    pass  # optional; use venv: .\.venv\Scripts\python.exe manage.py runserver
# Built React app (render-build.sh copies to backend/frontend_dist)
FRONTEND_DIST = Path(os.getenv('FRONTEND_DIST', BASE_DIR / 'frontend_dist'))

# Single-server deploy: same host serves site + API (leave empty in frontend .env)
_on_render = os.getenv('RENDER', '').strip().lower() in ('true', '1', 'yes')
_debug = os.getenv('DEBUG', 'True').lower() in ('true', '1', 'yes')
SERVE_FRONTEND = os.getenv(
    'SERVE_FRONTEND',
    'false' if _debug else 'true',
).lower() in ('true', '1', 'yes')
if _on_render:
    SERVE_FRONTEND = True
    USE_X_FORWARDED_HOST = True

SECRET_KEY = os.getenv(
    'DJANGO_SECRET_KEY',
    'dev-only-change-me-before-production-embedded-iot-lab',
)

DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 'yes')
if _on_render:
    DEBUG = os.getenv('DEBUG', 'false').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = [
    h.strip()
    for h in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
    if h.strip()
]

# Render sets this automatically (e.g. myapp.onrender.com)
_render_host = os.getenv('RENDER_EXTERNAL_HOSTNAME', '').strip()
if _render_host and _render_host not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(_render_host)

_cloudinary_url = os.getenv('CLOUDINARY_URL', '').strip()

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
]
if _cloudinary_url:
    INSTALLED_APPS += [
        'cloudinary_storage',
        'django.contrib.staticfiles',
        'cloudinary',
    ]
else:
    INSTALLED_APPS += ['django.contrib.staticfiles']
INSTALLED_APPS += [
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'portfolio',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'portfolio.middleware.StaffAuditMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Local dev: keep USE_SQLITE=true in backend/.env (installer does this).
# Render: DATABASE_URL is set automatically — do not set USE_SQLITE there.
_force_sqlite = os.getenv('USE_SQLITE', '').lower() in ('true', '1', 'yes')
_database_url = os.getenv('DATABASE_URL', '').strip()
if _database_url and not _force_sqlite:
    import dj_database_url

    DATABASES = {
        'default': dj_database_url.config(
            default=_database_url,
            conn_max_age=600,
        ),
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.sqlite3'),
            'NAME': os.getenv('DB_NAME', str(BASE_DIR / 'db.sqlite3')),
            'USER': os.getenv('DB_USER', ''),
            'PASSWORD': os.getenv('DB_PASSWORD', ''),
            'HOST': os.getenv('DB_HOST', ''),
            'PORT': os.getenv('DB_PORT', ''),
        },
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
_media_env = os.getenv('MEDIA_ROOT', '').strip()
_on_production = _on_render or bool(_render_host)
if _cloudinary_url:
    MEDIA_ROOT = Path(_media_env or BASE_DIR / 'media')
elif _on_production:
    if _media_env:
        _candidate = Path(_media_env)
        # /var/data/media only works with a Render persistent disk attached.
        if _candidate.is_dir() or not str(_candidate).startswith('/var/data'):
            MEDIA_ROOT = _candidate
        else:
            MEDIA_ROOT = Path('/tmp/embeddedgrid-media')
    else:
        MEDIA_ROOT = Path('/tmp/embeddedgrid-media')
else:
    MEDIA_ROOT = Path(_media_env or BASE_DIR / 'media')

STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
        'OPTIONS': {
            'location': MEDIA_ROOT,
            'base_url': MEDIA_URL,
        },
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage',
    },
}

if _cloudinary_url:
  # Persistent uploads on Render (free Cloudinary account). Set CLOUDINARY_URL in Render Environment.
    STORAGES['default'] = {
        'BACKEND': 'cloudinary_storage.storage.MediaCloudinaryStorage',
    }
    MEDIA_URL = '/media/'  # cloudinary_storage still exposes .url on fields

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:5173,http://127.0.0.1:5173',
    ).split(',')
    if origin.strip()
]

CORS_ALLOW_CREDENTIALS = True

if _render_host:
    _cors_origin = f'https://{_render_host}'
    if _cors_origin not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(_cors_origin)

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'portfolio.authentication.OptionalJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
}

FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024

ALLOWED_UPLOAD_EXTENSIONS = {'.pdf', '.png', '.jpg', '.jpeg', '.gif', '.zip', '.txt', '.csv', '.sch', '.brd', '.webp'}

# Shown to clients on staff command messages (never the admin username).
ENTERPRISE_DISPLAY_NAME = os.getenv('ENTERPRISE_DISPLAY_NAME', 'EmbeddedGrid')
PUBLIC_SITE_URL = os.getenv('PUBLIC_SITE_URL', '').strip().rstrip('/')
if not PUBLIC_SITE_URL and _render_host:
    PUBLIC_SITE_URL = f'https://{_render_host}'
if not PUBLIC_SITE_URL:
    PUBLIC_SITE_URL = 'http://localhost:5173'

WHATSAPP_SUPPORT_URL = os.getenv('WHATSAPP_SUPPORT_URL', '').strip()
SLA_COMMAND_REPLY_HOURS = int(os.getenv('SLA_COMMAND_REPLY_HOURS', '48'))
SLA_SHIP_DAYS_AFTER_PAYMENT = int(os.getenv('SLA_SHIP_DAYS_AFTER_PAYMENT', '5'))
STORE_LOW_STOCK_THRESHOLD = int(os.getenv('STORE_LOW_STOCK_THRESHOLD', '3'))

STORE_CART_RESERVATION_TTL_MINUTES = int(os.getenv('STORE_CART_RESERVATION_TTL_MINUTES', '15'))
STORE_ORDER_RESERVATION_TTL_MINUTES = int(os.getenv('STORE_ORDER_RESERVATION_TTL_MINUTES', '60'))

DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', '').strip() or None
CONTACT_EMAIL = os.getenv('CONTACT_EMAIL', '').strip() or DEFAULT_FROM_EMAIL or ''
COMMAND_NOTIFY_EMAIL = os.getenv('COMMAND_NOTIFY_EMAIL', '').strip() or CONTACT_EMAIL or None
EMAIL_HOST = os.getenv('EMAIL_HOST', '')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587') or 587)
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'true').lower() in ('true', '1', 'yes')

RECAPTCHA_SITE_KEY = os.getenv('RECAPTCHA_SITE_KEY', '').strip()
RECAPTCHA_SECRET_KEY = os.getenv('RECAPTCHA_SECRET_KEY', '').strip()
if EMAIL_HOST and DEFAULT_FROM_EMAIL:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

_DEV_SECRET = 'dev-only-change-me-before-production-embedded-iot-lab'
if _on_render and SECRET_KEY == _DEV_SECRET:
    raise RuntimeError(
        'Set DJANGO_SECRET_KEY in Render environment (do not use the dev default).',
    )
if _on_render and DEBUG:
    import warnings

    warnings.warn('DEBUG=True on Render — set DEBUG=false in environment.', stacklevel=1)

if not DEBUG:
    CSRF_TRUSTED_ORIGINS = [
        origin.strip()
        for origin in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',')
        if origin.strip()
    ]
    if _render_host:
        _render_origin = f'https://{_render_host}'
        if _render_origin not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(_render_origin)

    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    # Default false — Render/nginx already serve HTTPS; redirect can break health checks.
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'false').lower() in (
        'true',
        '1',
        'yes',
    )
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

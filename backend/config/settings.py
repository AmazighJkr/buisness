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

SECRET_KEY = os.getenv(
    'DJANGO_SECRET_KEY',
    'dev-only-change-me-before-production-embedded-iot-lab',
)

DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = [
    h.strip()
    for h in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
    if h.strip()
]

# Render sets this automatically (e.g. myapp.onrender.com)
_render_host = os.getenv('RENDER_EXTERNAL_HOSTNAME', '').strip()
if _render_host and _render_host not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(_render_host)

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
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
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.context_processors.request',
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
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

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

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
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

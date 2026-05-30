from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from portfolio.media_views import serve_media
from portfolio.spa_views import serve_frontend

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include('portfolio.urls')),
]

# Uploaded files (schematics, command attachments, chat images)
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve_media, name='serve-media'),
]

# React app (same IP as API) — must be after /api/ and /media/
if getattr(settings, 'SERVE_FRONTEND', False):
    urlpatterns += [
        path('', serve_frontend, name='spa-index'),
        re_path(r'^(?!api/|media/|static/|admin/).+', serve_frontend, name='spa-catchall'),
    ]

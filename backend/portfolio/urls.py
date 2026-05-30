from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminCategoryViewSet,
    AdminCommentDestroyView,
    AdminCommentListView,
    AdminCommandViewSet,
    AdminMeView,
    AdminProjectViewSet,
    AdminUserListCreateView,
    CategoryListView,
    CommandTrackMessageView,
    CommandTrackView,
    ProjectCommandCreateView,
    ProjectViewSet,
)

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')

admin_router = DefaultRouter()
admin_router.register(r'projects', AdminProjectViewSet, basename='admin-project')
admin_router.register(r'categories', AdminCategoryViewSet, basename='admin-category')
admin_router.register(r'commands', AdminCommandViewSet, basename='admin-command')

urlpatterns = [
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('', include(router.urls)),
    path('commands/', ProjectCommandCreateView.as_view(), name='command-create'),
    path('commands/track/', CommandTrackView.as_view(), name='command-track'),
    path('commands/messages/', CommandTrackMessageView.as_view(), name='command-messages'),
    path('admin/', include(admin_router.urls)),
    path('admin/me/', AdminMeView.as_view(), name='admin-me'),
    path('admin/users/', AdminUserListCreateView.as_view(), name='admin-users'),
    path('admin/comments/', AdminCommentListView.as_view(), name='admin-comment-list'),
    path('admin/comments/<uuid:id>/', AdminCommentDestroyView.as_view(), name='admin-comment-delete'),
]

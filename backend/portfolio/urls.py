from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .auth_views import (
    AuthConfigView,
    CustomerLoginView,
    CustomerMeView,
    CustomerRegisterView,
    GoogleLoginView,
    SubscribePackView,
    SubscriptionPackListView,
)
from .payment_views import (
    ChargilyWebhookView,
    CommandPayView,
    PaymentConfigView,
    StripeWebhookView,
)
from .views import (
    AdminCategoryViewSet,
    AdminCommentDestroyView,
    AdminCommentListView,
    AdminCommandViewSet,
    AdminCustomerDetailView,
    AdminCustomerListView,
    AdminMeView,
    AdminProjectViewSet,
    AdminSubscriptionPackViewSet,
    AdminUserListCreateView,
    CategoryListView,
    CommandTrackMessageView,
    CommandTrackView,
    MyCommandDetailView,
    MyCommandsListView,
    ProjectCommandCreateView,
    ProjectViewSet,
)

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')

admin_router = DefaultRouter()
admin_router.register(r'projects', AdminProjectViewSet, basename='admin-project')
admin_router.register(r'categories', AdminCategoryViewSet, basename='admin-category')
admin_router.register(r'commands', AdminCommandViewSet, basename='admin-command')
admin_router.register(r'packs', AdminSubscriptionPackViewSet, basename='admin-pack')

urlpatterns = [
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('', include(router.urls)),
    path('commands/', ProjectCommandCreateView.as_view(), name='command-create'),
    path('commands/mine/', MyCommandsListView.as_view(), name='command-mine-list'),
    path('commands/mine/<uuid:command_id>/', MyCommandDetailView.as_view(), name='command-mine-detail'),
    path('commands/track/', CommandTrackView.as_view(), name='command-track'),
    path('commands/messages/', CommandTrackMessageView.as_view(), name='command-messages'),
    path('commands/pay/', CommandPayView.as_view(), name='command-pay'),
    path('payments/config/', PaymentConfigView.as_view(), name='payment-config'),
    path('auth/register/', CustomerRegisterView.as_view(), name='auth-register'),
    path('auth/login/', CustomerLoginView.as_view(), name='auth-login'),
    path('auth/google/', GoogleLoginView.as_view(), name='auth-google'),
    path('auth/config/', AuthConfigView.as_view(), name='auth-config'),
    path('auth/me/', CustomerMeView.as_view(), name='auth-me'),
    path('packs/', SubscriptionPackListView.as_view(), name='pack-list'),
    path('packs/<uuid:pack_id>/subscribe/', SubscribePackView.as_view(), name='pack-subscribe'),
    path('webhooks/stripe/', StripeWebhookView.as_view(), name='stripe-webhook'),
    path('webhooks/chargily/', ChargilyWebhookView.as_view(), name='chargily-webhook'),
    path('admin/', include(admin_router.urls)),
    path('admin/me/', AdminMeView.as_view(), name='admin-me'),
    path('admin/users/', AdminUserListCreateView.as_view(), name='admin-users'),
    path('admin/customers/', AdminCustomerListView.as_view(), name='admin-customers'),
    path('admin/customers/<int:id>/', AdminCustomerDetailView.as_view(), name='admin-customer-detail'),
    path('admin/comments/', AdminCommentListView.as_view(), name='admin-comment-list'),
    path('admin/comments/<uuid:id>/', AdminCommentDestroyView.as_view(), name='admin-comment-delete'),
]

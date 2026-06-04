from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .auth_views import (
    AuthConfigView,
    CustomerChangePasswordView,
    CustomerLoginView,
    CustomerMeView,
    CustomerRegisterView,
    GoogleLoginView,
    SubscribePackView,
    SubscriptionPackListView,
)
from .shipping_views import (
    AdminStorePostalCodeViewSet,
    AdminStoreWilayaListView,
    StoreCartValidateView,
    StorePostalCodeListView,
    StoreShippingQuoteView,
    StoreWilayaListView,
)
from .payment_views import (
    ChargilyWebhookView,
    CommandPayView,
    ClientCountryView,
    PaymentConfigView,
    StripeWebhookView,
)
from .store_views import (
    AdminStoreOrderViewSet,
    MyStoreOrdersListView,
    StoreOrderCreateView,
    StoreOrderPayView,
    StoreOrderResumeView,
    StoreOrderTrackView,
)
from .views import (
    AdminAmazonSearchView,
    AdminCommandLayerBundleViewSet,
    AdminCommandLayerViewSet,
    AdminCategoryViewSet,
    AdminCommentDestroyView,
    AdminCommentListView,
    AdminCommandViewSet,
    AdminCustomerDetailView,
    AdminCustomerListView,
    AdminMeView,
    AdminProjectViewSet,
    AdminStoreCategoryViewSet,
    AdminStoreProductGalleryImageView,
    AdminStoreProductGalleryView,
    AdminStoreProductViewSet,
    AdminSubscriptionPackViewSet,
    AdminUserListCreateView,
    CategoryListView,
    CommandLayerBundleListView,
    CommandLayerListView,
    CommandTrackMessageView,
    CommandTrackView,
    MyCommandDetailView,
    MyCommandsListView,
    ProjectCommandCreateView,
    ProjectViewSet,
    StoreCategoryListView,
    StoreProductViewSet,
)

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'store/products', StoreProductViewSet, basename='store-product')

admin_router = DefaultRouter()
admin_router.register(r'command-layers', AdminCommandLayerViewSet, basename='admin-command-layer')
admin_router.register(
    r'command-layer-bundles',
    AdminCommandLayerBundleViewSet,
    basename='admin-command-layer-bundle',
)
admin_router.register(r'projects', AdminProjectViewSet, basename='admin-project')
admin_router.register(r'categories', AdminCategoryViewSet, basename='admin-category')
admin_router.register(r'commands', AdminCommandViewSet, basename='admin-command')
admin_router.register(r'packs', AdminSubscriptionPackViewSet, basename='admin-pack')
admin_router.register(r'store/categories', AdminStoreCategoryViewSet, basename='admin-store-category')
admin_router.register(r'store/products', AdminStoreProductViewSet, basename='admin-store-product')
admin_router.register(r'store/orders', AdminStoreOrderViewSet, basename='admin-store-order')
admin_router.register(r'store/postal-codes', AdminStorePostalCodeViewSet, basename='admin-store-postal')

urlpatterns = [
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('store/categories/', StoreCategoryListView.as_view(), name='store-category-list'),
    path('store/shipping/wilayas/', StoreWilayaListView.as_view(), name='store-shipping-wilayas'),
    path('store/shipping/postal-codes/', StorePostalCodeListView.as_view(), name='store-shipping-postal'),
    path('store/shipping/quote/', StoreShippingQuoteView.as_view(), name='store-shipping-quote'),
    path('store/cart/validate/', StoreCartValidateView.as_view(), name='store-cart-validate'),
    path('store/orders/', StoreOrderCreateView.as_view(), name='store-order-create'),
    path('store/orders/track/', StoreOrderTrackView.as_view(), name='store-order-track'),
    path('store/orders/mine/', MyStoreOrdersListView.as_view(), name='store-order-mine'),
    path('store/orders/<uuid:order_id>/resume/', StoreOrderResumeView.as_view(), name='store-order-resume'),
    path('store/orders/<uuid:order_id>/pay/', StoreOrderPayView.as_view(), name='store-order-pay'),
    path('', include(router.urls)),
    path('commands/layers/', CommandLayerListView.as_view(), name='command-layer-list'),
    path('commands/layer-bundles/', CommandLayerBundleListView.as_view(), name='command-layer-bundle-list'),
    path('commands/', ProjectCommandCreateView.as_view(), name='command-create'),
    path('commands/mine/', MyCommandsListView.as_view(), name='command-mine-list'),
    path('commands/mine/<uuid:command_id>/', MyCommandDetailView.as_view(), name='command-mine-detail'),
    path('commands/track/', CommandTrackView.as_view(), name='command-track'),
    path('commands/messages/', CommandTrackMessageView.as_view(), name='command-messages'),
    path('commands/pay/', CommandPayView.as_view(), name='command-pay'),
    path('payments/config/', PaymentConfigView.as_view(), name='payment-config'),
    path('payments/country/', ClientCountryView.as_view(), name='payment-country'),
    path('auth/register/', CustomerRegisterView.as_view(), name='auth-register'),
    path('auth/login/', CustomerLoginView.as_view(), name='auth-login'),
    path('auth/google/', GoogleLoginView.as_view(), name='auth-google'),
    path('auth/config/', AuthConfigView.as_view(), name='auth-config'),
    path('auth/me/', CustomerMeView.as_view(), name='auth-me'),
    path('auth/change-password/', CustomerChangePasswordView.as_view(), name='auth-change-password'),
    path('packs/', SubscriptionPackListView.as_view(), name='pack-list'),
    path('packs/<uuid:pack_id>/subscribe/', SubscribePackView.as_view(), name='pack-subscribe'),
    path('webhooks/stripe/', StripeWebhookView.as_view(), name='stripe-webhook'),
    path('webhooks/chargily/', ChargilyWebhookView.as_view(), name='chargily-webhook'),
    path('admin/', include(admin_router.urls)),
    path('admin/me/', AdminMeView.as_view(), name='admin-me'),
    path('admin/amazon/search/', AdminAmazonSearchView.as_view(), name='admin-amazon-search'),
    path('admin/store/wilayas/', AdminStoreWilayaListView.as_view(), name='admin-store-wilayas'),
    path('admin/users/', AdminUserListCreateView.as_view(), name='admin-users'),
    path('admin/customers/', AdminCustomerListView.as_view(), name='admin-customers'),
    path('admin/customers/<int:id>/', AdminCustomerDetailView.as_view(), name='admin-customer-detail'),
    path('admin/comments/', AdminCommentListView.as_view(), name='admin-comment-list'),
    path('admin/comments/<uuid:id>/', AdminCommentDestroyView.as_view(), name='admin-comment-delete'),
    path(
        'admin/store/products/<uuid:product_id>/gallery/',
        AdminStoreProductGalleryView.as_view(),
        name='admin-store-product-gallery',
    ),
    path(
        'admin/store/products/<uuid:product_id>/gallery/<uuid:image_id>/',
        AdminStoreProductGalleryImageView.as_view(),
        name='admin-store-product-gallery-image',
    ),
]

from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .authentication import OptionalJWTAuthentication
from .chargily_payments import chargily_enabled
from .models import StoreOrder
from .payment_routing import start_store_checkout
from .store_region import require_algeria_store, store_cod_instructions
from .payments import payment_instructions, payments_auto_confirm, site_base_url
from .permissions import CanManageStore, IsCustomerUser
from .serializers import (
    AdminStoreOrderSerializer,
    StoreOrderCreateSerializer,
    StoreOrderPublicSerializer,
)
from .store_orders import create_store_order, fulfill_store_order, get_store_order_for_track


class StoreOrderCreateView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [OptionalJWTAuthentication]

    def post(self, request):
        require_algeria_store(request)
        ser = StoreOrderCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        user = request.user if request.user.is_authenticated else None
        order = create_store_order(
            user=user,
            customer_data=data,
            items_data=data['items'],
        )
        return Response(
            StoreOrderPublicSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )


class StoreOrderPayView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [OptionalJWTAuthentication]

    def post(self, request, order_id):
        require_algeria_store(request)
        try:
            order = StoreOrder.objects.prefetch_related('items').get(id=order_id)
        except StoreOrder.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=404)

        payment_method = (request.data.get('payment_method') or '').strip().lower()

        if order.payment_status == StoreOrder.PaymentStatus.PAID:
            return Response({'detail': 'This order is already paid.'}, status=400)
        if order.payment_status == StoreOrder.PaymentStatus.WAIVED:
            return Response({'detail': 'Payment was waived for this order.'}, status=400)
        if order.status == StoreOrder.Status.CANCELLED:
            return Response({'detail': 'This order was cancelled.'}, status=400)

        if not order.total_dzd or order.total_dzd <= 0:
            return Response({'detail': 'No DZD total for this order.'}, status=400)

        if payment_method in ('cod', 'cash_on_delivery', 'delivery'):
            order.payment_status = StoreOrder.PaymentStatus.PENDING
            order.save(update_fields=['payment_status', 'updated_at'])
            return Response({
                'mode': 'cod',
                'provider': 'cod',
                'payment_status': order.payment_status,
                'currency': 'dzd',
                'amount': str(order.total_dzd),
                'instructions': store_cod_instructions(order.order_number),
                'order': StoreOrderPublicSerializer(order).data,
            })

        if not chargily_enabled():
            return Response(
                {'detail': 'Online card payment is not configured. Choose pay on delivery.'},
                status=400,
            )

        base = site_base_url(request)
        success = f'{base}/shop/order?number={order.order_number}&paid=1'
        cancel = f'{base}/shop/checkout?order={order.id}'

        provider, checkout_url = start_store_checkout(request, order, success, cancel)
        if checkout_url:
            return Response({
                'checkout_url': checkout_url,
                'amount': str(order.total_dzd),
                'currency': 'dzd',
                'payment_status': order.payment_status,
                'mode': provider,
                'provider': provider,
            })

        if payments_auto_confirm() or request.data.get('confirm') is True:
            fulfill_store_order(order.id)
            order.refresh_from_db()
            return Response(StoreOrderPublicSerializer(order).data)

        return Response({
            'amount': str(order.total_dzd),
            'currency': 'dzd',
            'payment_status': order.payment_status,
            'mode': 'manual',
            'provider': 'manual',
            'instructions': payment_instructions(subscription=False),
        })


class StoreOrderResumeView(APIView):
    """Unpaid order summary for completing Chargily after cancel/back."""

    permission_classes = [AllowAny]

    def get(self, request, order_id):
        require_algeria_store(request)
        try:
            order = StoreOrder.objects.prefetch_related('items').get(id=order_id)
        except StoreOrder.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=404)
        if order.payment_status == StoreOrder.PaymentStatus.PAID:
            return Response({
                'paid': True,
                'order_number': order.order_number,
                'detail': 'This order is already paid.',
            })
        return Response(StoreOrderPublicSerializer(order).data)


class StoreOrderTrackView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        order_number = request.data.get('order_number') or request.query_params.get('number')
        email = request.data.get('email') or request.data.get('customer_email')
        try:
            order = get_store_order_for_track(order_number, email)
        except ValidationError as exc:
            return Response({'detail': str(exc.detail if hasattr(exc, 'detail') else exc)}, status=400)
        return Response(StoreOrderPublicSerializer(order).data)


class MyStoreOrdersListView(APIView):
    permission_classes = [IsCustomerUser]
    authentication_classes = [OptionalJWTAuthentication]

    def get(self, request):
        orders = (
            StoreOrder.objects.filter(user=request.user)
            .prefetch_related('items')
            .order_by('-created_at')[:50]
        )
        return Response(StoreOrderPublicSerializer(orders, many=True).data)


class AdminStoreOrderViewSet(viewsets.ModelViewSet):
    queryset = StoreOrder.objects.select_related('user').prefetch_related('items').all()
    serializer_class = AdminStoreOrderSerializer
    permission_classes = [CanManageStore]
    http_method_names = ['get', 'patch', 'head', 'options']

    def perform_update(self, serializer):
        instance = self.get_object()
        old_payment = instance.payment_status
        order = serializer.save()
        if (
            old_payment != StoreOrder.PaymentStatus.PAID
            and order.payment_status == StoreOrder.PaymentStatus.PAID
        ):
            fulfill_store_order(order.id)

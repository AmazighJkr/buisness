"""Public and admin APIs for Algeria store shipping."""

from decimal import Decimal

from django.db.models import Count, Q
from rest_framework import status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .algeria_shipping import get_postal_code_for_checkout, shipping_price_dzd
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import StorePostalCode, StoreWilaya
from .permissions import CanEditStore
from .serializers import (
    AdminStorePostalCodeSerializer,
    AdminStoreWilayaSerializer,
    StoreCartValidateSerializer,
    StorePostalCodePublicSerializer,
    StoreWilayaPublicSerializer,
)


class AdminPostalPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 500


def _postal_codes_available():
    return StorePostalCode.objects.filter(is_active=True, wilaya__is_active=True).filter(
        Q(price_home_dzd__gt=0) | Q(price_bureau_dzd__gt=0),
    )


def _postal_codes_directory():
    return StorePostalCode.objects.filter(is_active=True, wilaya__is_active=True)


class StoreWilayaListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        wilaya_ids = _postal_codes_directory().values_list('wilaya_id', flat=True).distinct()
        rows = StoreWilaya.objects.filter(id__in=wilaya_ids, is_active=True).order_by('code')
        return Response(StoreWilayaPublicSerializer(rows, many=True).data)


class StoreShippingSearchView(APIView):
    """Typeahead search over all active postal codes (shipping prices optional)."""

    permission_classes = [AllowAny]

    def get(self, request):
        q = (request.query_params.get('q') or '').strip()
        wilaya_id = (request.query_params.get('wilaya') or '').strip()
        try:
            limit = min(max(int(request.query_params.get('limit') or 20), 1), 50)
        except (TypeError, ValueError):
            limit = 20

        if len(q) < 1:
            return Response([])

        qs = _postal_codes_directory().select_related('wilaya')
        if wilaya_id:
            qs = qs.filter(wilaya_id=wilaya_id)
        qs = qs.filter(
            Q(postal_code__icontains=q)
            | Q(city__icontains=q)
            | Q(wilaya__name__icontains=q),
        ).order_by('wilaya__code', 'postal_code')[:limit]
        return Response(StorePostalCodePublicSerializer(qs, many=True).data)


class StorePostalCodeListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        wilaya_id = (request.query_params.get('wilaya') or '').strip()
        if not wilaya_id:
            return Response({'detail': 'wilaya query parameter is required.'}, status=400)
        qs = (
            _postal_codes_available()
            .filter(wilaya_id=wilaya_id)
            .select_related('wilaya')
            .order_by('postal_code')
        )
        return Response(StorePostalCodePublicSerializer(qs, many=True).data)


class StoreShippingQuoteView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        postal_code = (request.data.get('postal_code') or '').strip()
        delivery_type = (request.data.get('delivery_type') or '').strip()
        try:
            row = get_postal_code_for_checkout(postal_code, delivery_type)
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=400)
        price = shipping_price_dzd(row, delivery_type)
        return Response({
            'postal_code': row.postal_code,
            'city': row.city,
            'wilaya_id': str(row.wilaya_id),
            'wilaya_name': row.wilaya.name,
            'delivery_type': delivery_type,
            'shipping_dzd': str(price),
            'has_home': row.has_home,
            'has_bureau': row.has_bureau,
        })


class StoreCartValidateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = StoreCartValidateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        return Response(ser.validated_data)


class AdminStorePostalCodeViewSet(viewsets.ModelViewSet):
    queryset = StorePostalCode.objects.select_related('wilaya').all()
    serializer_class = AdminStorePostalCodeSerializer
    permission_classes = [CanEditStore]
    pagination_class = AdminPostalPagination

    def get_queryset(self):
        qs = super().get_queryset()
        wilaya = (self.request.query_params.get('wilaya') or '').strip()
        if wilaya:
            qs = qs.filter(wilaya_id=wilaya)
        q = (self.request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(
                Q(postal_code__icontains=q) | Q(city__icontains=q) | Q(wilaya__name__icontains=q),
            )
        status_filter = (self.request.query_params.get('status') or '').strip()
        if status_filter == 'configured':
            qs = qs.filter(Q(price_home_dzd__gt=0) | Q(price_bureau_dzd__gt=0))
        elif status_filter == 'no_rates':
            qs = qs.filter(is_active=True).exclude(
                Q(price_home_dzd__gt=0) | Q(price_bureau_dzd__gt=0),
            )
        elif status_filter == 'inactive':
            qs = qs.filter(is_active=False)
        elif status_filter == 'home_only':
            qs = qs.filter(price_home_dzd__gt=0).filter(
                Q(price_bureau_dzd__isnull=True) | Q(price_bureau_dzd__lte=0),
            )
        elif status_filter == 'bureau_only':
            qs = qs.filter(price_bureau_dzd__gt=0).filter(
                Q(price_home_dzd__isnull=True) | Q(price_home_dzd__lte=0),
            )
        return qs.order_by('wilaya__code', 'postal_code')


class AdminStoreWilayaListView(APIView):
    permission_classes = [CanEditStore]

    def get(self, request):
        rows = (
            StoreWilaya.objects.annotate(
                postal_count=Count('postal_codes', distinct=True),
                configured_count=Count(
                    'postal_codes',
                    filter=Q(postal_codes__price_home_dzd__gt=0)
                    | Q(postal_codes__price_bureau_dzd__gt=0),
                    distinct=True,
                ),
            )
            .order_by('code')
        )
        return Response(AdminStoreWilayaSerializer(rows, many=True).data)

import json
import logging
import os
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Count
from django.contrib.auth.models import Permission
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import serializers

from .embed_utils import normalize_code_files, resolve_simulation_embed_url
from .models import (
    Comment,
    CommandLayer,
    CommandLayerBundle,
    CommandMessage,
    CommandInvoice,
    ContactMessage,
    Project,
    ProjectCategory,
    ProjectCommand,
    SubscriptionPack,
    StoreCategory,
    StoreOrder,
    StoreOrderItem,
    StorePostalCode,
    StoreProduct,
    StoreProductComment,
    StoreProductImage,
    StoreProductVariant,
    StaffAuditLog,
    StoreWilaya,
    UserSubscription,
)
from .access import project_access, required_packs_for, user_can_view_project
from .command_layers import build_command_layers_snapshot, parse_layer_ids
from .validators import validate_upload_extension

User = get_user_model()
logger = logging.getLogger(__name__)

PORTFOLIO_PERMS = [
    'post_project',
    'edit_project',
    'manage_categories',
    'view_commands',
    'respond_commands',
    'manage_command_layers',
    'view_contact_messages',
    'respond_contact_messages',
    'moderate_comment',
    'manage_packs',
    'manage_store',
    'post_store',
    'edit_store',
    'manage_store_orders',
]


def normalize_simulation_url(value):
    if not value or not str(value).strip():
        return ''
    url = str(value).strip()
    if not url.startswith(('http://', 'https://')):
        url = f'https://{url}'
    return url


def project_model_3d_url(obj):
    """Browser preview URL — GLB only (never raw STEP/OBJ)."""
    from .model3d_convert import extension_from_name, is_glb_name

    url = media_url(getattr(obj, 'model_3d_glb', None))
    if url:
        return url
    source = getattr(obj, 'model_3d_file', None)
    if source and getattr(source, 'name', None) and is_glb_name(source.name):
        url = media_url(source)
        if url:
            return url
    legacy = (getattr(obj, 'model_3d_url', None) or '').strip()
    if legacy and extension_from_name(legacy.split('?')[0]) in {'.glb', '.gltf'}:
        return legacy
    return ''


def media_url(file_field):
    """Public URL for an uploaded file, or None if the file is not on disk."""
    if not file_field:
        return None
    name = getattr(file_field, 'name', None) or ''
    if not name:
        return None
    try:
        if not file_field.storage.exists(name):
            return None
        # Local storage: double-check real file (Render can have DB path but no bytes).
        path = getattr(file_field, 'path', None)
        if path and not os.path.isfile(path):
            return None
    except Exception:
        return None
    url = file_field.url
    if not url:
        return None
    if url.startswith('http://') or url.startswith('https://'):
        return url
    if not url.startswith('/'):
        url = f'/{url.lstrip("/")}'
    if not url.startswith('/media/') and not url.startswith('http'):
        url = f'/media/{url.lstrip("/")}'
    return url


def parse_json_list(raw, field_name):
    if not raw:
        return []
    if isinstance(raw, list):
        return raw
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise serializers.ValidationError({field_name: 'Invalid table data.'}) from exc
    if not isinstance(data, list):
        raise serializers.ValidationError({field_name: 'Must be a list.'})
    return data


class SubCategoryBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectCategory
        fields = ['id', 'name']


class CategoryChildSerializer(serializers.ModelSerializer):
    project_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ProjectCategory
        fields = ['id', 'name', 'sort_order', 'project_count']


class CategoryTreeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = ProjectCategory
        fields = ['id', 'name', 'sort_order', 'children']

    def get_children(self, obj):
        kids = obj.children.annotate(project_count=Count('projects')).order_by(
            'sort_order', 'name',
        )
        return CategoryChildSerializer(kids, many=True).data


class StoreCategoryChildSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = StoreCategory
        fields = ['id', 'name', 'slug', 'description', 'image_url', 'product_count', 'sort_order']

    def get_image_url(self, obj):
        return media_url(obj.image)


class StoreCategoryTreeSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    product_count = serializers.IntegerField(read_only=True)
    children = serializers.SerializerMethodField()

    class Meta:
        model = StoreCategory
        fields = [
            'id', 'name', 'slug', 'description', 'image_url', 'product_count', 'sort_order', 'children',
        ]

    def get_image_url(self, obj):
        return media_url(obj.image)

    def get_children(self, obj):
        kids = getattr(obj, '_prefetched_objects_cache', {}).get('children')
        if kids is None:
            kids = obj.children.filter(is_active=True).annotate(
                product_count=Count('products'),
            ).order_by('sort_order', 'name')
        return StoreCategoryChildSerializer(kids, many=True).data


class StoreCategoryPublicSerializer(StoreCategoryChildSerializer):
    """Flat category row (legacy / admin lists)."""


class StoreProductVariantPublicSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = StoreProductVariant
        fields = ['id', 'name', 'description', 'image_url', 'price_usd', 'price_dzd', 'sort_order']

    def get_image_url(self, obj):
        return media_url(obj.image)


class StoreProductPublicSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    gallery_urls = serializers.SerializerMethodField()
    variants = StoreProductVariantPublicSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    parent_category_name = serializers.CharField(
        source='category.parent.name', read_only=True, default='',
    )
    parent_category_slug = serializers.CharField(
        source='category.parent.slug', read_only=True, default='',
    )
    review_count = serializers.SerializerMethodField()
    review_avg = serializers.SerializerMethodField()

    class Meta:
        model = StoreProduct
        fields = [
            'id',
            'name',
            'slug',
            'short_description',
            'description',
            'image_url',
            'gallery_urls',
            'variants',
            'price_usd',
            'price_dzd',
            'stock_qty',
            'is_featured',
            'category',
            'category_name',
            'category_slug',
            'parent_category_name',
            'parent_category_slug',
            'review_count',
            'review_avg',
            'sort_order',
            'created_at',
        ]

    def get_review_count(self, obj):
        if hasattr(obj, 'review_count') and obj.review_count is not None:
            return int(obj.review_count)
        return obj.comments.count()

    def get_review_avg(self, obj):
        avg = getattr(obj, 'review_avg', None)
        if avg is not None:
            return round(float(avg), 1)
        from django.db.models import Avg
        computed = obj.comments.aggregate(a=Avg('rating'))['a']
        return round(float(computed), 1) if computed is not None else None

    def get_image_url(self, obj):
        return media_url(obj.image)

    def get_gallery_urls(self, obj):
        urls = []
        main = media_url(obj.image)
        if main:
            urls.append(main)
        gallery = getattr(obj, '_prefetched_objects_cache', {}).get('gallery')
        if gallery is None:
            gallery = obj.gallery.all()
        for row in gallery:
            url = media_url(row.image)
            if url and url not in urls:
                urls.append(url)
        return urls


class ProjectListSerializer(serializers.ModelSerializer):
    cover_url = serializers.SerializerMethodField()
    schematic_url = serializers.SerializerMethodField()
    libraries_list = serializers.SerializerMethodField()
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True)
    category_name = serializers.CharField(source='subcategory.parent.name', read_only=True)
    access = serializers.SerializerMethodField()
    locked = serializers.SerializerMethodField()
    required_packs = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    review_avg = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id',
            'title',
            'description',
            'cover_url',
            'schematic_url',
            'libraries_list',
            'subcategory',
            'subcategory_name',
            'category_name',
            'is_featured',
            'is_free',
            'access',
            'locked',
            'required_packs',
            'review_count',
            'review_avg',
            'featured_order',
            'created_at',
        ]

    def get_review_count(self, obj):
        if hasattr(obj, 'review_count') and obj.review_count is not None:
            return int(obj.review_count)
        return obj.comments.count()

    def get_review_avg(self, obj):
        avg = getattr(obj, 'review_avg', None)
        if avg is not None:
            return round(float(avg), 1)
        from django.db.models import Avg
        computed = obj.comments.aggregate(a=Avg('rating'))['a']
        return round(float(computed), 1) if computed is not None else None

    def _user(self):
        request = self.context.get('request')
        return request.user if request else None

    def get_access(self, obj):
        return project_access(self._user(), obj)

    def get_locked(self, obj):
        return self.get_access(obj) == 'locked'

    def get_required_packs(self, obj):
        if obj.is_free or self.get_access(obj) != 'locked':
            return []
        return required_packs_for(obj)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get('locked'):
            desc = (instance.description or '').strip()
            data['description'] = (
                desc[:140] + '…' if len(desc) > 140 else desc
            ) or 'Subscribe to unlock full project details.'
        return data

    def get_cover_url(self, obj):
        return project_cover_url(obj)

    def get_schematic_url(self, obj):
        return media_url(obj.schematic_image)

    def get_libraries_list(self, obj):
        return obj.libraries_list


def project_cover_url(obj):
    """Listing/card image — dedicated cover, else schematic."""
    url = media_url(getattr(obj, 'cover_image', None))
    if url:
        return url
    return media_url(obj.schematic_image)


def schematic_file_missing(obj) -> bool:
    if not obj.schematic_image or not getattr(obj.schematic_image, 'name', None):
        return False
    return media_url(obj.schematic_image) is None


class ProjectDetailSerializer(serializers.ModelSerializer):
    cover_url = serializers.SerializerMethodField()
    schematic_url = serializers.SerializerMethodField()
    schematic_file_missing = serializers.SerializerMethodField()
    simulation_embed_url = serializers.SerializerMethodField()
    model_3d_url = serializers.SerializerMethodField()
    model_3d_pending = serializers.SerializerMethodField()
    model_3d_conversion_error = serializers.CharField(read_only=True)
    libraries_list = serializers.SerializerMethodField()
    code_files = serializers.SerializerMethodField()
    comments = serializers.SerializerMethodField()
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True)
    category_name = serializers.CharField(source='subcategory.parent.name', read_only=True)
    access = serializers.SerializerMethodField()
    locked = serializers.SerializerMethodField()
    required_packs = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id',
            'title',
            'description',
            'content_blocks',
            'subcategory_name',
            'category_name',
            'is_free',
            'access',
            'locked',
            'required_packs',
            'materials',
            'wiring',
            'cover_url',
            'schematic_url',
            'schematic_file_missing',
            'simulation_url',
            'simulation_embed_url',
            'model_3d_url',
            'model_3d_pending',
            'model_3d_conversion_error',
            'video_url',
            'libraries_list',
            'code_files',
            'comments',
            'created_at',
        ]

    def _user(self):
        request = self.context.get('request')
        return request.user if request else None

    def get_access(self, obj):
        return project_access(self._user(), obj)

    def get_locked(self, obj):
        return self.get_access(obj) == 'locked'

    def get_required_packs(self, obj):
        if obj.is_free:
            return []
        return required_packs_for(obj)

    def get_model_3d_url(self, obj):
        return project_model_3d_url(obj)

    def get_model_3d_pending(self, obj):
        from .model3d_convert import project_model_3d_pending

        return project_model_3d_pending(obj)

    def to_representation(self, instance):
        user = self._user()
        if not user_can_view_project(user, instance):
            desc = (instance.description or '').strip()
            return {
                'id': str(instance.id),
                'title': instance.title,
                'description': (
                    desc[:220] + '…' if len(desc) > 220 else desc
                ) or 'Subscribe to unlock this project.',
                'subcategory_name': instance.subcategory.name,
                'category_name': instance.subcategory.parent.name if instance.subcategory.parent_id else '',
                'is_free': instance.is_free,
                'access': 'locked',
                'locked': True,
                'required_packs': required_packs_for(instance),
                'materials': [],
                'wiring': [],
                'cover_url': project_cover_url(instance),
                'schematic_url': None,
                'schematic_file_missing': False,
                'simulation_url': '',
                'simulation_embed_url': None,
                'model_3d_url': '',
                'model_3d_pending': False,
                'model_3d_conversion_error': '',
                'video_url': '',
                'libraries_list': [],
                'code_files': [],
                'comments': [],
                'created_at': instance.created_at,
            }
        return super().to_representation(instance)

    def get_cover_url(self, obj):
        return project_cover_url(obj)

    def get_schematic_url(self, obj):
        return media_url(obj.schematic_image)

    def get_schematic_file_missing(self, obj):
        return schematic_file_missing(obj)

    def get_simulation_embed_url(self, obj):
        return resolve_simulation_embed_url(obj.simulation_url)

    def get_libraries_list(self, obj):
        return obj.libraries_list

    def get_code_files(self, obj):
        return obj.code_files_list

    def get_comments(self, obj):
        qs = obj.comments.all()
        return CommentSerializer(qs, many=True).data


class CommentSerializer(serializers.ModelSerializer):
    project_title = serializers.CharField(source='project.title', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'project', 'project_title', 'author_name', 'text', 'rating', 'timestamp']


class CommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['author_name', 'text', 'rating']

    def validate_author_name(self, value):
        value = (value or '').strip() or 'Guest'
        return value[:120]

    def validate_text(self, value):
        return (value or '').strip()

    def validate_rating(self, value):
        if value is None:
            return value
        if value < 1 or value > 5:
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value

    def validate(self, attrs):
        if not attrs.get('text') and not attrs.get('rating'):
            raise serializers.ValidationError('Provide a star rating, written review, or both.')
        return attrs


class CommentAdminUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['author_name', 'text', 'rating']

    def validate_text(self, value):
        return (value or '').strip()

    def validate_rating(self, value):
        if value is None:
            return value
        if value < 1 or value > 5:
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value

    def validate(self, attrs):
        text = attrs.get('text', getattr(self.instance, 'text', ''))
        text = (text or '').strip()
        rating = attrs.get('rating', getattr(self.instance, 'rating', None))
        if not text and not rating:
            raise serializers.ValidationError('Provide a star rating, written review, or both.')
        attrs['text'] = text
        return attrs


class StoreProductCommentSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = StoreProductComment
        fields = ['id', 'product', 'product_name', 'author_name', 'text', 'rating', 'timestamp']


class StoreProductCommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreProductComment
        fields = ['author_name', 'text', 'rating']

    def validate_author_name(self, value):
        value = (value or '').strip() or 'Guest'
        return value[:120]

    def validate_text(self, value):
        return (value or '').strip()

    def validate_rating(self, value):
        if value is None:
            return value
        if value < 1 or value > 5:
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value

    def validate(self, attrs):
        if not attrs.get('text') and not attrs.get('rating'):
            raise serializers.ValidationError('Provide a star rating, written review, or both.')
        return attrs


class StoreProductCommentAdminUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreProductComment
        fields = ['author_name', 'text', 'rating']

    def validate_text(self, value):
        return (value or '').strip()

    def validate_rating(self, value):
        if value is None:
            return value
        if value < 1 or value > 5:
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value

    def validate(self, attrs):
        text = attrs.get('text', getattr(self.instance, 'text', ''))
        text = (text or '').strip()
        rating = attrs.get('rating', getattr(self.instance, 'rating', None))
        if not text and not rating:
            raise serializers.ValidationError('Provide a star rating, written review, or both.')
        attrs['text'] = text
        return attrs


class CategoryAdminSerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source='parent.name', read_only=True, allow_null=True)
    is_top_level = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProjectCategory
        fields = ['id', 'name', 'parent', 'parent_name', 'sort_order', 'is_top_level']
        read_only_fields = ['id']

    def validate(self, attrs):
        parent = attrs.get('parent') or getattr(self.instance, 'parent', None)
        if self.instance and parent and parent.id == self.instance.id:
            raise serializers.ValidationError({'parent': 'A category cannot be its own parent.'})
        return attrs


class AdminStoreCategorySerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)
    product_count = serializers.SerializerMethodField(read_only=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True, default='')
    slug = serializers.CharField(max_length=120)

    class Meta:
        model = StoreCategory
        fields = [
            'id',
            'parent',
            'parent_name',
            'name',
            'slug',
            'description',
            'image',
            'image_url',
            'is_active',
            'sort_order',
            'product_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_image_url(self, obj):
        return media_url(obj.image)

    def get_product_count(self, obj):
        return obj.products.count()

    def validate_image(self, value):
        if value:
            validate_upload_extension(value)
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError('Category image must be 5 MB or smaller.')
        return value

    def validate_slug(self, value):
        return _normalize_store_slug(self.Meta.model, value, self.instance)


class AdminStoreProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = StoreProductImage
        fields = ['id', 'image_url', 'alt_text', 'sort_order']

    def get_image_url(self, obj):
        return media_url(obj.image)


class AdminStoreProductVariantSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = StoreProductVariant
        fields = ['id', 'name', 'description', 'image', 'image_url', 'price_usd', 'price_dzd', 'sort_order']
        read_only_fields = ['id']

    def get_image_url(self, obj):
        return media_url(obj.image)


class AdminStoreProductSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    gallery = AdminStoreProductImageSerializer(many=True, read_only=True)
    variants = AdminStoreProductVariantSerializer(many=True, read_only=True)
    variants_json = serializers.CharField(write_only=True, required=False, allow_blank=True)
    gallery_urls = serializers.SerializerMethodField()
    slug = serializers.CharField(max_length=180)

    class Meta:
        model = StoreProduct
        fields = [
            'id',
            'category',
            'category_name',
            'name',
            'slug',
            'short_description',
            'description',
            'image',
            'image_url',
            'gallery',
            'variants',
            'variants_json',
            'gallery_urls',
            'price_usd',
            'price_dzd',
            'stock_qty',
            'is_active',
            'is_featured',
            'sort_order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_image_url(self, obj):
        return media_url(obj.image)

    def get_gallery_urls(self, obj):
        urls = []
        main = media_url(obj.image)
        if main:
            urls.append(main)
        for row in obj.gallery.all():
            url = media_url(row.image)
            if url and url not in urls:
                urls.append(url)
        return urls

    def validate_image(self, value):
        if value:
            validate_upload_extension(value)
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError('Product image must be 5 MB or smaller.')
        return value

    def validate_slug(self, value):
        return _normalize_store_slug(self.Meta.model, value, self.instance)

    def validate(self, attrs):
        if 'variants_json' in self.initial_data:
            attrs['_variants_data'] = parse_json_list(
                self.initial_data.get('variants_json', '[]'),
                'variants_json',
            )
        return attrs

    def create(self, validated_data):
        variants_data = validated_data.pop('_variants_data', None)
        instance = super().create(validated_data)
        self._apply_variants(instance, variants_data)
        return instance

    def update(self, instance, validated_data):
        variants_data = validated_data.pop('_variants_data', None)
        instance = super().update(instance, validated_data)
        self._apply_variants(instance, variants_data)
        return instance

    def _apply_variants(self, instance, variants_data):
        if variants_data is None:
            return
        request = self.context.get('request')
        files = getattr(request, 'FILES', {}) if request else {}
        instance.variants.all().delete()
        for index, row in enumerate(variants_data):
            if not isinstance(row, dict):
                continue
            name = (row.get('name') or '').strip()
            if not name:
                continue
            image = files.get(f'variant_image_{index}')
            price_usd = row.get('price_usd')
            price_dzd = row.get('price_dzd')
            StoreProductVariant.objects.create(
                product=instance,
                name=name,
                description=(row.get('description') or '').strip(),
                image=image or None,
                price_usd=price_usd if price_usd not in (None, '') else None,
                price_dzd=price_dzd if price_dzd not in (None, '') else None,
                sort_order=int(row.get('sort_order') or index),
            )


def _normalize_store_slug(model, value, instance):
    slug = slugify(value or '', allow_unicode=False)
    if not slug:
        raise serializers.ValidationError(
            'Enter a valid link using letters and numbers (e.g. my-product).',
        )
    conflict = model.objects.filter(slug=slug)
    if instance:
        conflict = conflict.exclude(pk=instance.pk)
        if conflict.exists():
            raise serializers.ValidationError('This store link is already in use. Pick another.')
        return slug
    if not conflict.exists():
        return slug
    base = slug
    n = 2
    while model.objects.filter(slug=slug).exists():
        slug = f'{base}-{n}'
        n += 1
    return slug


class StoreOrderItemSerializer(serializers.ModelSerializer):
    line_total_usd = serializers.SerializerMethodField()
    line_total_dzd = serializers.SerializerMethodField()

    class Meta:
        model = StoreOrderItem
        fields = [
            'id',
            'product',
            'product_name',
            'product_slug',
            'quantity',
            'unit_price_usd',
            'unit_price_dzd',
            'line_total_usd',
            'line_total_dzd',
        ]

    def get_line_total_usd(self, obj):
        return str(Decimal(obj.unit_price_usd) * obj.quantity)

    def get_line_total_dzd(self, obj):
        return str(Decimal(obj.unit_price_dzd) * obj.quantity)


class StoreOrderPublicSerializer(serializers.ModelSerializer):
    items = StoreOrderItemSerializer(many=True, read_only=True)
    wilaya_name = serializers.CharField(source='wilaya.name', read_only=True, default='')

    class Meta:
        model = StoreOrder
        fields = [
            'id',
            'order_number',
            'customer_name',
            'customer_first_name',
            'customer_last_name',
            'customer_email',
            'customer_phone',
            'shipping_address',
            'address_line1',
            'address_line2',
            'city',
            'wilaya',
            'wilaya_name',
            'postal_code',
            'delivery_type',
            'shipping_dzd',
            'status',
            'payment_status',
            'total_usd',
            'total_dzd',
            'notes',
            'paid_at',
            'created_at',
            'items',
        ]


class StoreWilayaPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreWilaya
        fields = ['id', 'code', 'name']


class StorePostalCodePublicSerializer(serializers.ModelSerializer):
    wilaya_name = serializers.CharField(source='wilaya.name', read_only=True)
    has_home = serializers.BooleanField(read_only=True)
    has_bureau = serializers.BooleanField(read_only=True)

    class Meta:
        model = StorePostalCode
        fields = [
            'id',
            'postal_code',
            'city',
            'wilaya',
            'wilaya_name',
            'has_home',
            'has_bureau',
        ]


class AdminStoreWilayaSerializer(serializers.ModelSerializer):
    postal_count = serializers.IntegerField(read_only=True)
    configured_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = StoreWilaya
        fields = ['id', 'code', 'name', 'is_active', 'postal_count', 'configured_count']


class AdminStorePostalCodeSerializer(serializers.ModelSerializer):
    wilaya_name = serializers.CharField(source='wilaya.name', read_only=True)
    has_home = serializers.BooleanField(read_only=True)
    has_bureau = serializers.BooleanField(read_only=True)

    class Meta:
        model = StorePostalCode
        fields = [
            'id',
            'wilaya',
            'wilaya_name',
            'postal_code',
            'city',
            'price_home_dzd',
            'price_bureau_dzd',
            'has_home',
            'has_bureau',
            'is_active',
            'sort_order',
        ]


class StoreCartValidateSerializer(serializers.Serializer):
    items = serializers.ListField(child=serializers.DictField(), allow_empty=False)
    reservation_id = serializers.CharField(required=False, allow_blank=True, max_length=64)

    def validate(self, attrs):
        from .store_orders import validate_cart_items

        return validate_cart_items(
            attrs['items'],
            reservation_key=(attrs.get('reservation_id') or '').strip() or None,
        )


class StoreOrderCreateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=60)
    last_name = serializers.CharField(max_length=60)
    customer_email = serializers.EmailField()
    customer_phone = serializers.CharField(max_length=40)
    address_line1 = serializers.CharField(max_length=200)
    address_line2 = serializers.CharField(max_length=200, required=False, allow_blank=True)
    city = serializers.CharField(max_length=80)
    postal_code = serializers.CharField(max_length=10)
    delivery_type = serializers.ChoiceField(choices=['home', 'bureau'])
    notes = serializers.CharField(required=False, allow_blank=True)
    reservation_id = serializers.CharField(required=False, allow_blank=True, max_length=64)
    items = serializers.ListField(child=serializers.DictField(), allow_empty=False)
    accepted_terms = serializers.BooleanField()
    recaptcha_response = serializers.CharField(max_length=4096, required=False, allow_blank=True)
    # Legacy fields (ignored when structured address is sent)
    customer_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    shipping_address = serializers.CharField(required=False, allow_blank=True)

    def validate_accepted_terms(self, value):
        if not value:
            raise serializers.ValidationError(
                'Vous devez accepter les CGV et la politique de confidentialité.',
            )
        return value

    def validate_customer_phone(self, value):
        from .algeria_shipping import normalize_algeria_phone

        return normalize_algeria_phone(value)

    def validate(self, attrs):
        from .checkout_recaptcha import verify_recaptcha

        request = self.context.get('request')
        ip = None
        if request:
            ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR')
        verify_recaptcha(attrs.get('recaptcha_response', ''), ip)
        return attrs


class AdminStoreOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreOrderItem
        fields = [
            'id',
            'product',
            'product_name',
            'product_slug',
            'quantity',
            'unit_price_usd',
            'unit_price_dzd',
        ]


class CustomerChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(min_length=8, write_only=True)

    def validate_new_password(self, value):
        from django.contrib.auth.password_validation import validate_password

        validate_password(value)
        return value

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value


class AdminStoreOrderSerializer(serializers.ModelSerializer):
    items = AdminStoreOrderItemSerializer(many=True, read_only=True)
    username = serializers.CharField(source='user.username', read_only=True, default=None)
    wilaya_name = serializers.CharField(source='wilaya.name', read_only=True, default='')

    class Meta:
        model = StoreOrder
        fields = [
            'id',
            'order_number',
            'user',
            'username',
            'customer_name',
            'customer_first_name',
            'customer_last_name',
            'customer_email',
            'customer_phone',
            'shipping_address',
            'address_line1',
            'address_line2',
            'city',
            'wilaya',
            'wilaya_name',
            'postal_code',
            'delivery_type',
            'shipping_dzd',
            'status',
            'payment_status',
            'total_usd',
            'total_dzd',
            'notes',
            'admin_notes',
            'paid_at',
            'created_at',
            'updated_at',
            'items',
        ]
        read_only_fields = [
            'id',
            'order_number',
            'user',
            'total_usd',
            'total_dzd',
            'paid_at',
            'created_at',
            'updated_at',
            'items',
        ]


class AdminProjectSerializer(serializers.ModelSerializer):
    materials_json = serializers.CharField(write_only=True, required=False, allow_blank=True)
    wiring_json = serializers.CharField(write_only=True, required=False, allow_blank=True)
    code_files_json = serializers.CharField(write_only=True, required=False, allow_blank=True)
    code_archive = serializers.FileField(write_only=True, required=False, allow_null=True)
    simulation_url = serializers.URLField(required=False, allow_blank=True, default='')
    model_3d_url = serializers.SerializerMethodField(read_only=True)
    model_3d_pending = serializers.SerializerMethodField(read_only=True)
    model_3d_conversion_error = serializers.CharField(read_only=True)
    model_3d_file = serializers.FileField(write_only=True, required=False, allow_null=True)
    video_url = serializers.URLField(required=False, allow_blank=True, default='')
    cover_url = serializers.SerializerMethodField(read_only=True)
    schematic_url = serializers.SerializerMethodField(read_only=True)
    pack_ids = serializers.SerializerMethodField(read_only=True)
    pack_ids_json = serializers.CharField(write_only=True, required=False, allow_blank=True)
    content_blocks_json = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Project
        fields = [
            'id',
            'subcategory',
            'title',
            'description',
            'content_blocks',
            'content_blocks_json',
            'materials',
            'wiring',
            'materials_json',
            'wiring_json',
            'cover_image',
            'cover_url',
            'schematic_image',
            'schematic_url',
            'simulation_url',
            'model_3d_url',
            'model_3d_pending',
            'model_3d_conversion_error',
            'model_3d_file',
            'video_url',
            'libraries',
            'source_code',
            'code_files',
            'code_files_json',
            'code_archive',
            'is_featured',
            'is_free',
            'pack_ids',
            'pack_ids_json',
            'featured_order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_subcategory(self, value):
        if not value.parent_id:
            raise serializers.ValidationError(
                'Choose a subcategory (e.g. Arduino → Basic projects), not a top-level category.',
            )
        return value

    def validate_simulation_url(self, value):
        return normalize_simulation_url(value)

    def validate_video_url(self, value):
        return normalize_simulation_url(value)

    def validate_cover_image(self, value):
        if not value:
            return value
        validate_upload_extension(value)
        max_bytes = 5 * 1024 * 1024
        if value.size > max_bytes:
            raise serializers.ValidationError('Cover image must be 5 MB or smaller.')
        return value

    def validate_schematic_image(self, value):
        if not value:
            return value
        validate_upload_extension(value)
        max_bytes = 5 * 1024 * 1024
        if value.size > max_bytes:
            raise serializers.ValidationError('Schematic image must be 5 MB or smaller.')
        return value

    def validate_model_3d_file(self, value):
        if not value:
            return value
        validate_upload_extension(value)
        max_bytes = getattr(settings, 'MAX_MODEL_3D_UPLOAD_BYTES', 25 * 1024 * 1024)
        if value.size > max_bytes:
            raise serializers.ValidationError(
                f'3D model must be {max_bytes // (1024 * 1024)} MB or smaller.',
            )
        return value

    def get_cover_url(self, obj):
        return project_cover_url(obj)

    def get_schematic_url(self, obj):
        return media_url(obj.schematic_image)

    def get_model_3d_url(self, obj):
        return project_model_3d_url(obj)

    def get_model_3d_pending(self, obj):
        from .model3d_convert import project_model_3d_pending

        return project_model_3d_pending(obj)

    def get_pack_ids(self, obj):
        return [str(p.id) for p in obj.packs.all()]

    def _validate_material_store_products(self, materials):
        for index, row in enumerate(materials):
            if not isinstance(row, dict):
                continue
            sid = str(row.get('store_product_id') or '').strip()
            if not sid:
                continue
            if not StoreProduct.objects.filter(
                id=sid,
                is_active=True,
                category__is_active=True,
            ).exists():
                raise serializers.ValidationError({
                    'materials_json': (
                        f'Row {index + 1}: linked store product is missing or inactive.'
                    ),
                })

    def _apply_packs(self, instance, pack_ids):
        if pack_ids is not None:
            instance.packs.set(SubscriptionPack.objects.filter(id__in=pack_ids))

    def _merge_request_files(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'FILES'):
            if 'cover_image' in request.FILES:
                validated_data['cover_image'] = request.FILES['cover_image']
            if 'schematic_image' in request.FILES:
                validated_data['schematic_image'] = request.FILES['schematic_image']
            if 'model_3d_file' in request.FILES:
                validated_data['model_3d_file'] = request.FILES['model_3d_file']
            if 'code_archive' in request.FILES:
                validated_data['code_archive'] = request.FILES['code_archive']
        return validated_data

    def _extract_code_archive(self, archive) -> list:
        import zipfile
        from pathlib import Path as PathLib

        rows = []
        try:
            with zipfile.ZipFile(archive) as zf:
                for info in zf.infolist():
                    if info.is_dir() or info.filename.startswith('__MACOSX'):
                        continue
                    if info.file_size > 512_000:
                        continue
                    name = PathLib(info.filename).name
                    if not name or name.startswith('.'):
                        continue
                    try:
                        text = zf.read(info).decode('utf-8')
                    except UnicodeDecodeError:
                        continue
                    if text.strip():
                        rows.append({'title': name, 'code': text})
        except zipfile.BadZipFile as exc:
            raise serializers.ValidationError({'code_archive': 'Invalid ZIP file.'}) from exc
        return rows

    def _verify_image_saved(self, instance, field_name: str, label: str) -> None:
        file_field = getattr(instance, field_name, None)
        if not file_field or not getattr(file_field, 'name', None):
            return
        if not file_field.storage.exists(file_field.name):
            raise serializers.ValidationError({
                field_name: (
                    f'{label} was not saved on the server. On Render, set CLOUDINARY_URL '
                    'in Environment (see RENDER.md) or try a smaller file (max 5 MB).'
                ),
            })

    def _uploaded_in_request(self, field_name: str) -> bool:
        request = self.context.get('request')
        return bool(
            request
            and hasattr(request, 'FILES')
            and field_name in request.FILES
        )

    def _verify_schematic_saved(self, instance):
        if not self._uploaded_in_request('schematic_image'):
            return
        self._verify_image_saved(instance, 'schematic_image', 'Schematic image')

    def _verify_cover_saved(self, instance):
        if not self._uploaded_in_request('cover_image'):
            return
        self._verify_image_saved(instance, 'cover_image', 'Cover image')

    def _clear_stale_legacy_schematic(self, instance):
        blocks = instance.content_blocks or []
        if not any(b.get('type') == 'schematic' for b in blocks):
            return
        if not instance.schematic_image or not getattr(instance.schematic_image, 'name', None):
            return
        if media_url(instance.schematic_image) is None:
            instance.schematic_image = None
            instance.save(update_fields=['schematic_image'])

    def _convert_model_3d(self, instance, uploaded_new: bool):
        if not uploaded_new:
            return
        from .model3d_convert import (
            convert_project_model_to_glb,
            is_glb_name,
            schedule_model_3d_conversion,
        )

        if instance.model_3d_file and is_glb_name(instance.model_3d_file.name):
            if instance.model_3d_glb:
                instance.model_3d_glb.delete(save=False)
                instance.model_3d_glb = None
            instance.model_3d_conversion_error = ''
            instance.save(update_fields=['model_3d_glb', 'model_3d_conversion_error'])
            return
        schedule_model_3d_conversion(instance.pk)

    def _apply_block_image_uploads(self, instance):
        request = self.context.get('request')
        if not request or not hasattr(request, 'FILES'):
            return
        blocks = list(instance.content_blocks or [])
        if not blocks:
            return
        from django.core.files.storage import default_storage

        from .validators import validate_upload_extension

        changed = False
        prefix = 'block_image_'
        errors = []
        for key, upload in request.FILES.items():
            if not key.startswith(prefix):
                continue
            block_id = key[len(prefix):]
            try:
                validate_upload_extension(upload)
            except Exception as exc:
                errors.append(f'{block_id}: {exc}')
                continue
            if upload.size > 5 * 1024 * 1024:
                errors.append(f'{block_id}: Image must be 5 MB or smaller.')
                continue
            saved_name = default_storage.save(
                f'project_blocks/{instance.pk}/{block_id}_{upload.name}',
                upload,
            )
            if not default_storage.exists(saved_name):
                errors.append(
                    f'{block_id}: Image was not saved on the server. '
                    'On Render, set CLOUDINARY_URL or try a smaller file (max 5 MB).',
                )
                continue
            url = default_storage.url(saved_name)
            if url and not url.startswith('http'):
                url = request.build_absolute_uri(url)
            for block in blocks:
                if str(block.get('id')) == block_id:
                    block['image_url'] = url
                    changed = True
        if errors:
            raise serializers.ValidationError({'content_blocks_json': ' '.join(errors)})
        if changed:
            instance.content_blocks = blocks
            instance.save(update_fields=['content_blocks', 'updated_at'])

    def create(self, validated_data):
        pack_ids = validated_data.pop('pack_ids', None)
        validated_data = self._merge_request_files(validated_data)
        had_model = 'model_3d_file' in validated_data and validated_data['model_3d_file']
        instance = super().create(validated_data)
        self._apply_packs(instance, pack_ids)
        self._verify_cover_saved(instance)
        self._verify_schematic_saved(instance)
        self._clear_stale_legacy_schematic(instance)
        self._convert_model_3d(instance, bool(had_model))
        self._apply_block_image_uploads(instance)
        return instance

    def update(self, instance, validated_data):
        pack_ids = validated_data.pop('pack_ids', None)
        request = self.context.get('request')
        uploaded_new = bool(
            request
            and hasattr(request, 'FILES')
            and 'model_3d_file' in request.FILES,
        )
        validated_data = self._merge_request_files(validated_data)
        instance = super().update(instance, validated_data)
        self._apply_packs(instance, pack_ids)
        self._verify_cover_saved(instance)
        self._verify_schematic_saved(instance)
        self._clear_stale_legacy_schematic(instance)
        self._convert_model_3d(instance, uploaded_new)
        self._apply_block_image_uploads(instance)
        return instance

    def validate(self, attrs):
        if 'materials_json' in self.initial_data:
            attrs['materials'] = parse_json_list(
                self.initial_data.get('materials_json', '[]'),
                'materials_json',
            )
        if 'wiring_json' in self.initial_data:
            attrs['wiring'] = parse_json_list(
                self.initial_data.get('wiring_json', '[]'),
                'wiring_json',
            )
        if 'code_files_json' in self.initial_data:
            attrs['code_files'] = normalize_code_files(
                parse_json_list(
                    self.initial_data.get('code_files_json', '[]'),
                    'code_files_json',
                ),
            )
        archive = attrs.pop('code_archive', None)
        if archive:
            extracted = self._extract_code_archive(archive)
            if extracted:
                existing = attrs.get('code_files') or []
                attrs['code_files'] = normalize_code_files(existing + extracted)
        attrs.pop('materials_json', None)
        attrs.pop('wiring_json', None)
        attrs.pop('code_files_json', None)
        if 'is_featured' in self.initial_data:
            val = self.initial_data.get('is_featured')
            attrs['is_featured'] = str(val).lower() in ('true', '1', 'on', 'yes')
        if 'is_free' in self.initial_data:
            val = self.initial_data.get('is_free')
            attrs['is_free'] = str(val).lower() in ('true', '1', 'on', 'yes')
        if 'pack_ids_json' in self.initial_data:
            raw = self.initial_data.get('pack_ids_json', '[]')
            try:
                parsed = json.loads(raw) if raw else []
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError({'pack_ids_json': 'Invalid pack list.'}) from exc
            if not isinstance(parsed, list):
                raise serializers.ValidationError({'pack_ids_json': 'Must be a list.'})
            attrs['pack_ids'] = parsed
        attrs.pop('pack_ids_json', None)
        if 'content_blocks_json' in self.initial_data:
            raw = self.initial_data.get('content_blocks_json', '[]')
            try:
                parsed = json.loads(raw) if raw else []
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError({'content_blocks_json': 'Invalid blocks.'}) from exc
            if not isinstance(parsed, list):
                raise serializers.ValidationError({'content_blocks_json': 'Must be a list.'})
            attrs['content_blocks'] = parsed
        attrs.pop('content_blocks_json', None)
        materials = attrs.get('materials')
        if materials is not None:
            self._validate_material_store_products(materials)
        if 'featured_order' in self.initial_data:
            try:
                attrs['featured_order'] = int(self.initial_data.get('featured_order') or 0)
            except (TypeError, ValueError):
                attrs['featured_order'] = 0
        return attrs


class CommandLayerPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommandLayer
        fields = [
            'id',
            'slug',
            'name',
            'description',
            'group',
            'price_usd',
            'price_dzd',
            'is_required',
            'sort_order',
        ]


class AdminCommandLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommandLayer
        fields = [
            'id',
            'slug',
            'name',
            'description',
            'group',
            'price_usd',
            'price_dzd',
            'is_required',
            'is_active',
            'sort_order',
        ]

    def validate_slug(self, value):
        slug = slugify((value or '').strip()) or 'layer'
        return slug

    def validate(self, attrs):
        name = (attrs.get('name') or '').strip()
        if not attrs.get('slug') and name:
            attrs['slug'] = slugify(name) or 'layer'
        return attrs


class CommandLayerBundlePublicSerializer(serializers.ModelSerializer):
    layer_ids = serializers.SerializerMethodField()
    estimated_total_usd = serializers.SerializerMethodField()
    estimated_total_dzd = serializers.SerializerMethodField()

    class Meta:
        model = CommandLayerBundle
        fields = [
            'id',
            'slug',
            'name',
            'description',
            'layer_ids',
            'estimated_total_usd',
            'estimated_total_dzd',
        ]

    def get_layer_ids(self, obj):
        active = CommandLayer.objects.filter(is_active=True).values_list('id', flat=True)
        active_set = {str(x) for x in active}
        return [lid for lid in (obj.layer_ids or []) if str(lid) in active_set]

    def _totals(self, obj):
        ids = self.get_layer_ids(obj)
        _, usd, dzd = build_command_layers_snapshot(ids)
        return usd, dzd

    def get_estimated_total_usd(self, obj):
        return str(self._totals(obj)[0])

    def get_estimated_total_dzd(self, obj):
        return str(self._totals(obj)[1])


class AdminCommandLayerBundleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommandLayerBundle
        fields = [
            'id',
            'slug',
            'name',
            'description',
            'layer_ids',
            'is_active',
            'sort_order',
        ]

    def validate_slug(self, value):
        return slugify((value or '').strip()) or 'bundle'

    def validate_layer_ids(self, value):
        if not isinstance(value, list) or not value:
            raise serializers.ValidationError('Select at least one layer.')
        active = {
            str(x)
            for x in CommandLayer.objects.filter(is_active=True).values_list('id', flat=True)
        }
        cleaned = []
        for raw in value:
            sid = str(raw).strip()
            if sid not in active:
                raise serializers.ValidationError(f'Unknown or inactive layer: {sid}')
            if sid not in cleaned:
                cleaned.append(sid)
        return cleaned

    def validate(self, attrs):
        name = (attrs.get('name') or '').strip()
        if not attrs.get('slug') and name:
            attrs['slug'] = slugify(name) or 'bundle'
        return attrs


class ProjectCommandCreateSerializer(serializers.ModelSerializer):
    tracking_code = serializers.CharField(read_only=True)
    client_email = serializers.EmailField(required=False, allow_blank=True)
    layer_ids_json = serializers.CharField(write_only=True, required=False, allow_blank=True)
    accepted_terms = serializers.BooleanField(write_only=True)
    recaptcha_response = serializers.CharField(
        max_length=4096,
        write_only=True,
        required=False,
        allow_blank=True,
    )

    class Meta:
        model = ProjectCommand
        fields = [
            'id',
            'tracking_code',
            'client_name',
            'client_email',
            'associated_project',
            'idea_description',
            'price_limit',
            'objectives',
            'problems',
            'attachment',
            'layer_ids_json',
            'accepted_terms',
            'recaptcha_response',
            'selected_layers',
            'estimated_total_usd',
            'estimated_total_dzd',
        ]
        read_only_fields = [
            'id',
            'tracking_code',
            'selected_layers',
            'estimated_total_usd',
            'estimated_total_dzd',
        ]

    def validate(self, attrs):
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        signed_in = user and user.is_authenticated and not user.is_staff
        email = (attrs.get('client_email') or '').strip()
        if signed_in:
            if not email and user.email:
                attrs['client_email'] = user.email.strip().lower()
            elif email:
                attrs['client_email'] = email.lower()
        elif not email:
            raise serializers.ValidationError({'client_email': 'Email is required.'})
        else:
            attrs['client_email'] = email.lower()
        raw_layers = attrs.pop('layer_ids_json', None)
        if raw_layers is None and 'layer_ids_json' in self.initial_data:
            raw_layers = self.initial_data.get('layer_ids_json')
        try:
            layer_ids = parse_layer_ids(raw_layers)
        except ValueError as exc:
            raise serializers.ValidationError({'layer_ids_json': str(exc)}) from exc
        rows, total_usd, total_dzd = build_command_layers_snapshot(layer_ids)
        if not rows:
            raise serializers.ValidationError(
                {'layer_ids_json': 'Select at least one project layer.'},
            )
        attrs['_layer_rows'] = rows
        attrs['_layer_total_usd'] = total_usd
        attrs['_layer_total_dzd'] = total_dzd

        if not attrs.get('accepted_terms'):
            raise serializers.ValidationError({
                'accepted_terms': 'Vous devez accepter les CGV et la politique de confidentialité.',
            })
        from .checkout_recaptcha import verify_recaptcha

        ip = None
        if request:
            ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get(
                'REMOTE_ADDR',
            )
        verify_recaptcha(attrs.get('recaptcha_response', ''), ip)
        attrs.pop('accepted_terms', None)
        attrs.pop('recaptcha_response', None)
        return attrs

    def create(self, validated_data):
        rows = validated_data.pop('_layer_rows', [])
        total_usd = validated_data.pop('_layer_total_usd', None)
        total_dzd = validated_data.pop('_layer_total_dzd', None)
        validated_data.pop('layer_ids_json', None)
        return ProjectCommand.objects.create(
            selected_layers=rows,
            estimated_total_usd=total_usd,
            estimated_total_dzd=total_dzd,
            **validated_data,
        )

    def validate_attachment(self, value):
        if value:
            validate_upload_extension(value)
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError('Attachment must be 5 MB or smaller.')
        return value

    def validate_idea_description(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Please describe your project idea.')
        return attrs


class CommandInvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommandInvoice
        fields = [
            'id',
            'command',
            'title',
            'line_items',
            'notes',
            'total_usd',
            'total_dzd',
            'status',
            'sent_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'command', 'total_usd', 'total_dzd', 'status', 'sent_at', 'created_at', 'updated_at']


class CommandInvoiceWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommandInvoice
        fields = ['title', 'line_items', 'notes']

    def validate_line_items(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('Line items must be a list.')
        cleaned = []
        for row in value:
            if not isinstance(row, dict):
                continue
            label = (row.get('label') or '').strip()
            if not label:
                continue
            cleaned.append({
                'label': label[:200],
                'description': (row.get('description') or '').strip()[:2000],
                'qty': max(1, int(row.get('qty') or 1)),
                'unit_usd': str(row.get('unit_usd') or '0'),
                'unit_dzd': str(row.get('unit_dzd') or '0'),
            })
        if not cleaned:
            raise serializers.ValidationError('Add at least one line item.')
        return cleaned


class CommandMessagePublicSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = CommandMessage
        fields = ['id', 'role', 'author_name', 'text', 'link_url', 'image_url', 'created_at']

    def get_image_url(self, obj):
        return media_url(obj.image)


class CommandMessageAdminSerializer(CommandMessagePublicSerializer):
    staff_responder = serializers.SerializerMethodField()

    class Meta(CommandMessagePublicSerializer.Meta):
        fields = CommandMessagePublicSerializer.Meta.fields + ['staff_responder']

    def get_staff_responder(self, obj):
        if obj.role != 'staff' or not obj.staff_user_id:
            return None
        return obj.staff_user.username


class CommandMessageCreateSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=8000, required=False, allow_blank=True)
    link_url = serializers.URLField(required=False, allow_blank=True)
    author_name = serializers.CharField(max_length=120, required=False, allow_blank=True)

    def validate(self, attrs):
        text = (attrs.get('text') or '').strip()
        link = (attrs.get('link_url') or '').strip()
        attrs['text'] = text
        attrs['link_url'] = link
        return attrs

    def validate_text(self, value):
        return (value or '').strip()


class CommandMessageAdminCreateSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=8000, required=False, allow_blank=True)
    link_url = serializers.URLField(required=False, allow_blank=True)

    def validate(self, attrs):
        text = (attrs.get('text') or '').strip()
        link = (attrs.get('link_url') or '').strip()
        if not text and not link:
            # image checked in view from FILES
            pass
        attrs['text'] = text
        attrs['link_url'] = normalize_simulation_url(link) if link else ''
        return attrs


class ProjectCommandTrackSerializer(serializers.ModelSerializer):
    project_title = serializers.CharField(
        source='associated_project.title',
        read_only=True,
        allow_null=True,
    )
    messages = CommandMessagePublicSerializer(many=True, read_only=True)
    invoices = CommandInvoiceSerializer(many=True, read_only=True)
    payment_due = serializers.SerializerMethodField()

    class Meta:
        model = ProjectCommand
        fields = [
            'id',
            'tracking_code',
            'client_name',
            'client_email',
            'status',
            'idea_description',
            'objectives',
            'problems',
            'selected_layers',
            'estimated_total_usd',
            'estimated_total_dzd',
            'project_title',
            'quoted_price',
            'quoted_price_dzd',
            'payment_status',
            'payment_due',
            'accepted_at',
            'paid_at',
            'created_at',
            'responded_at',
            'messages',
            'invoices',
        ]

    def get_payment_due(self, obj):
        has_bill = (
            (obj.quoted_price and obj.quoted_price > 0)
            or (obj.quoted_price_dzd and obj.quoted_price_dzd > 0)
        )
        return has_bill and obj.payment_status == ProjectCommand.PaymentStatus.PENDING


class ProjectCommandTrackBriefSerializer(serializers.ModelSerializer):
    idea_preview = serializers.SerializerMethodField()

    class Meta:
        model = ProjectCommand
        fields = [
            'id',
            'tracking_code',
            'client_name',
            'status',
            'payment_status',
            'created_at',
            'idea_preview',
        ]

    def get_idea_preview(self, obj):
        text = (obj.idea_description or '').strip()
        return text[:100] + ('…' if len(text) > 100 else '')


class ProjectCommandAdminSerializer(serializers.ModelSerializer):
    project_title = serializers.CharField(
        source='associated_project.title',
        read_only=True,
        allow_null=True,
    )
    responded_by_name = serializers.CharField(
        source='responded_by.username',
        read_only=True,
        allow_null=True,
    )
    messages = CommandMessageAdminSerializer(many=True, read_only=True)
    invoices = CommandInvoiceSerializer(many=True, read_only=True)

    class Meta:
        model = ProjectCommand
        fields = [
            'id',
            'access_token',
            'tracking_code',
            'client_name',
            'client_email',
            'associated_project',
            'project_title',
            'idea_description',
            'price_limit',
            'objectives',
            'problems',
            'selected_layers',
            'estimated_total_usd',
            'estimated_total_dzd',
            'attachment',
            'status',
            'quoted_price',
            'quoted_price_dzd',
            'payment_status',
            'paid_at',
            'accepted_at',
            'staff_response',
            'responded_at',
            'responded_by_name',
            'messages',
            'invoices',
            'created_at',
        ]


class ProjectCommandRespondSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectCommand
        fields = [
            'status',
            'staff_response',
            'quoted_price',
            'quoted_price_dzd',
            'payment_status',
        ]

    def validate_staff_response(self, value):
        return (value or '').strip()

    def validate(self, attrs):
        status = attrs.get('status')
        instance = self.instance
        if instance and status == ProjectCommand.Status.ACCEPTED:
            if attrs.get('quoted_price') in (None, '') and not instance.quoted_price:
                if instance.estimated_total_usd and instance.estimated_total_usd > 0:
                    attrs['quoted_price'] = instance.estimated_total_usd
            if attrs.get('quoted_price_dzd') in (None, '') and not instance.quoted_price_dzd:
                if instance.estimated_total_dzd and instance.estimated_total_dzd > 0:
                    attrs['quoted_price_dzd'] = instance.estimated_total_dzd
        quoted = attrs.get('quoted_price', getattr(instance, 'quoted_price', None) if instance else None)
        quoted_dzd = attrs.get(
            'quoted_price_dzd',
            getattr(instance, 'quoted_price_dzd', None) if instance else None,
        )
        if status == ProjectCommand.Status.ACCEPTED and (
            (quoted and quoted > 0) or (quoted_dzd and quoted_dzd > 0)
        ):
            if 'payment_status' not in attrs:
                attrs['payment_status'] = ProjectCommand.PaymentStatus.PENDING
        return attrs


class AdminUserCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(min_length=8, write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    permissions = serializers.ListField(
        child=serializers.ChoiceField(choices=PORTFOLIO_PERMS),
        allow_empty=True,
    )

    def create(self, validated_data):
        perms = validated_data.pop('permissions', [])
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            is_staff=True,
        )
        for codename in perms:
            try:
                perm = Permission.objects.get(
                    codename=codename,
                    content_type__app_label='portfolio',
                )
                user.user_permissions.add(perm)
            except Permission.DoesNotExist:
                pass
        return user


class AdminUserSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_superuser', 'permissions']

    def get_permissions(self, obj):
        if obj.is_superuser:
            return list(PORTFOLIO_PERMS)
        return [
            p.split('.')[-1]
            for p in obj.get_all_permissions()
            if p.startswith('portfolio.') and p.split('.')[-1] in PORTFOLIO_PERMS
        ]


def _apply_staff_permissions(user, codenames: list[str]) -> None:
    user.user_permissions.clear()
    for codename in codenames:
        try:
            perm = Permission.objects.get(
                codename=codename,
                content_type__app_label='portfolio',
            )
            user.user_permissions.add(perm)
        except Permission.DoesNotExist:
            pass


class AdminUserUpdateSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(min_length=8, write_only=True, required=False, allow_blank=True)
    permissions = serializers.ListField(
        child=serializers.ChoiceField(choices=PORTFOLIO_PERMS),
        required=False,
    )
    is_superuser = serializers.BooleanField(required=False)

    def update(self, instance, validated_data):
        if 'email' in validated_data:
            instance.email = validated_data['email']
        password = validated_data.get('password', '')
        if password:
            instance.set_password(password)
        if 'is_superuser' in validated_data and self.context['request'].user.is_superuser:
            instance.is_superuser = validated_data['is_superuser']
        if 'permissions' in validated_data and not instance.is_superuser:
            _apply_staff_permissions(instance, validated_data['permissions'])
        instance.save()
        return instance


class CustomerRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(min_length=8, write_only=True)
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name']

    def validate_password(self, value):
        from django.contrib.auth.password_validation import validate_password

        validate_password(value)
        return value

    def validate_username(self, value):
        name = (value or '').strip()
        if len(name) < 3:
            raise serializers.ValidationError('Username must be at least 3 characters.')
        if User.objects.filter(username__iexact=name).exists():
            raise serializers.ValidationError('This username is already taken.')
        return name

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value.strip()).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value.strip().lower()

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(
            is_staff=False,
            **validated_data,
        )
        user.set_password(password)
        user.save()
        return user


class UserSubscriptionBriefSerializer(serializers.ModelSerializer):
    pack_name = serializers.CharField(source='pack.name', read_only=True)
    pack_slug = serializers.CharField(source='pack.slug', read_only=True)

    class Meta:
        model = UserSubscription
        fields = ['id', 'pack_name', 'pack_slug', 'status', 'started_at', 'expires_at']


class CustomerMeSerializer(serializers.ModelSerializer):
    subscriptions = serializers.SerializerMethodField()
    active_pack_ids = serializers.SerializerMethodField()
    subscription_tier = serializers.SerializerMethodField()
    has_usable_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'has_usable_password',
            'subscriptions',
            'active_pack_ids',
            'subscription_tier',
        ]

    def get_has_usable_password(self, obj):
        return obj.has_usable_password()

    def get_subscriptions(self, obj):
        from .access import active_subscriptions_for

        qs = active_subscriptions_for(obj)
        return UserSubscriptionBriefSerializer(qs, many=True).data

    def get_active_pack_ids(self, obj):
        from .access import active_pack_ids

        return [str(x) for x in active_pack_ids(obj)]

    def get_subscription_tier(self, obj):
        from .subscriptions import highest_active_pack_sort_order

        return highest_active_pack_sort_order(obj)


class SubscriptionPackPublicSerializer(serializers.ModelSerializer):
    project_count = serializers.SerializerMethodField()
    access_state = serializers.SerializerMethodField()
    price_due = serializers.SerializerMethodField()
    price_due_dzd = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionPack
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'price',
            'price_dzd',
            'duration_days',
            'sort_order',
            'project_count',
            'access_state',
            'price_due',
            'price_due_dzd',
        ]

    def get_project_count(self, obj):
        return obj.projects.count()

    def _quote(self, obj):
        cache = self.context.setdefault('_pack_quotes', {})
        key = str(obj.id)
        if key not in cache:
            from .subscriptions import quote_subscribe

            request = self.context.get('request')
            user = getattr(request, 'user', None) if request else None
            if user and user.is_authenticated and not user.is_staff:
                cache[key] = quote_subscribe(user, obj)
            else:
                cache[key] = None
        return cache[key]

    def get_access_state(self, obj):
        quote = self._quote(obj)
        if quote is None:
            return 'available'
        if quote.already_active:
            return 'active'
        if quote.blocked_downgrade:
            return 'included'
        if quote.is_upgrade:
            return 'upgrade'
        return 'available'

    def get_price_due(self, obj):
        quote = self._quote(obj)
        if quote is None:
            return str(obj.price)
        if quote.blocked_downgrade or quote.already_active:
            return str(obj.price)
        return str(quote.amount)

    def get_price_due_dzd(self, obj):
        quote = self._quote(obj)
        if quote is None:
            return str(obj.price_dzd)
        if quote.blocked_downgrade or quote.already_active:
            return str(obj.price_dzd)
        return str(quote.amount_dzd)


class SubscriptionPackAdminSerializer(serializers.ModelSerializer):
    project_ids = serializers.SerializerMethodField(read_only=True)
    project_ids_json = serializers.CharField(write_only=True, required=False, allow_blank=True)
    project_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SubscriptionPack
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'price',
            'price_dzd',
            'duration_days',
            'is_active',
            'sort_order',
            'project_ids',
            'project_ids_json',
            'project_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_project_ids(self, obj):
        return [str(p.id) for p in obj.projects.all()]

    def get_project_count(self, obj):
        return obj.projects.count()

    def validate(self, attrs):
        if 'project_ids_json' in self.initial_data:
            raw = self.initial_data.get('project_ids_json', '[]')
            try:
                parsed = json.loads(raw) if raw else []
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError({'project_ids_json': 'Invalid project list.'}) from exc
            if not isinstance(parsed, list):
                raise serializers.ValidationError({'project_ids_json': 'Must be a list.'})
            attrs['project_ids'] = parsed
        attrs.pop('project_ids_json', None)
        return attrs

    def _apply_projects(self, instance, project_ids):
        if project_ids is not None:
            instance.projects.set(Project.objects.filter(id__in=project_ids))

    def create(self, validated_data):
        project_ids = validated_data.pop('project_ids', None)
        instance = super().create(validated_data)
        self._apply_projects(instance, project_ids)
        return instance

    def update(self, instance, validated_data):
        project_ids = validated_data.pop('project_ids', None)
        instance = super().update(instance, validated_data)
        self._apply_projects(instance, project_ids)
        return instance


class AdminCustomerSubscriptionSerializer(serializers.ModelSerializer):
    pack_name = serializers.CharField(source='pack.name', read_only=True)

    class Meta:
        model = UserSubscription
        fields = [
            'id',
            'pack_name',
            'status',
            'started_at',
            'expires_at',
            'created_at',
        ]


class AdminCustomerCommandSerializer(serializers.ModelSerializer):
    project_title = serializers.CharField(
        source='associated_project.title',
        read_only=True,
        default='',
    )

    class Meta:
        model = ProjectCommand
        fields = [
            'id',
            'tracking_code',
            'status',
            'payment_status',
            'quoted_price',
            'client_name',
            'client_email',
            'project_title',
            'created_at',
        ]


class AdminCustomerSerializer(serializers.ModelSerializer):
    subscriptions = AdminCustomerSubscriptionSerializer(many=True, read_only=True)
    commands = AdminCustomerCommandSerializer(
        source='project_commands',
        many=True,
        read_only=True,
    )
    active_subscriptions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'date_joined',
            'last_login',
            'is_active',
            'active_subscriptions',
            'subscriptions',
            'commands',
        ]

    def get_active_subscriptions(self, obj):
        now = timezone.now()
        return sum(
            1
            for sub in obj.subscriptions.all()
            if sub.status == UserSubscription.Status.ACTIVE
            and sub.expires_at
            and sub.expires_at > now
        )


class ContactMessageCreateSerializer(serializers.ModelSerializer):
    accepted_terms = serializers.BooleanField(write_only=True)
    recaptcha_response = serializers.CharField(
        max_length=4096,
        write_only=True,
        required=False,
        allow_blank=True,
    )

    class Meta:
        model = ContactMessage
        fields = [
            'client_name',
            'client_email',
            'body',
            'accepted_terms',
            'recaptcha_response',
        ]

    def validate(self, attrs):
        if not attrs.get('accepted_terms'):
            raise serializers.ValidationError({
                'accepted_terms': 'Vous devez accepter les CGV et la politique de confidentialité.',
            })
        from .checkout_recaptcha import verify_recaptcha

        request = self.context.get('request')
        ip = None
        if request:
            ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get(
                'REMOTE_ADDR',
            )
        verify_recaptcha(attrs.get('recaptcha_response', ''), ip)
        attrs.pop('accepted_terms', None)
        attrs.pop('recaptcha_response', None)
        attrs['client_email'] = (attrs.get('client_email') or '').strip().lower()
        attrs['client_name'] = (attrs.get('client_name') or '').strip()
        attrs['body'] = (attrs.get('body') or '').strip()
        if not attrs['body']:
            raise serializers.ValidationError({'body': 'Message is required.'})
        return attrs


class AdminContactMessageSerializer(serializers.ModelSerializer):
    replied_by_name = serializers.CharField(
        source='replied_by.username',
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = ContactMessage
        fields = [
            'id',
            'client_name',
            'client_email',
            'body',
            'status',
            'staff_reply',
            'replied_at',
            'replied_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class ContactMessageRespondSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['status', 'staff_reply']


class StaffAuditLogSerializer(serializers.ModelSerializer):
    actor = serializers.CharField(source='actor_username', read_only=True)

    class Meta:
        model = StaffAuditLog
        fields = [
            'id',
            'actor',
            'action',
            'resource',
            'object_id',
            'object_label',
            'summary',
            'metadata',
            'method',
            'path',
            'status_code',
            'ip_address',
            'created_at',
        ]
        read_only_fields = fields

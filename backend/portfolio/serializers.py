import json
import os

from django.contrib.auth import get_user_model
from django.db.models import Count
from django.contrib.auth.models import Permission
from django.utils import timezone
from rest_framework import serializers

from .embed_utils import normalize_code_files, resolve_simulation_embed_url
from .models import (
    Comment,
    CommandMessage,
    Project,
    ProjectCategory,
    ProjectCommand,
    SubscriptionPack,
    UserSubscription,
)
from .access import project_access, required_packs_for, user_can_view_project
from .validators import validate_upload_extension

User = get_user_model()

PORTFOLIO_PERMS = [
    'post_project',
    'edit_project',
    'manage_categories',
    'view_commands',
    'respond_commands',
    'moderate_comment',
    'manage_packs',
]


def normalize_simulation_url(value):
    if not value or not str(value).strip():
        return ''
    url = str(value).strip()
    if not url.startswith(('http://', 'https://')):
        url = f'https://{url}'
    return url


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


class ProjectListSerializer(serializers.ModelSerializer):
    schematic_url = serializers.SerializerMethodField()
    libraries_list = serializers.SerializerMethodField()
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
            'featured_order',
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

    def get_schematic_url(self, obj):
        return media_url(obj.schematic_image)

    def get_libraries_list(self, obj):
        return obj.libraries_list


def schematic_file_missing(obj) -> bool:
    if not obj.schematic_image or not getattr(obj.schematic_image, 'name', None):
        return False
    return media_url(obj.schematic_image) is None


class ProjectDetailSerializer(serializers.ModelSerializer):
    schematic_url = serializers.SerializerMethodField()
    schematic_file_missing = serializers.SerializerMethodField()
    simulation_embed_url = serializers.SerializerMethodField()
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
            'subcategory_name',
            'category_name',
            'is_free',
            'access',
            'locked',
            'required_packs',
            'materials',
            'wiring',
            'schematic_url',
            'schematic_file_missing',
            'simulation_url',
            'simulation_embed_url',
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
                'schematic_url': None,
                'schematic_file_missing': False,
                'simulation_url': '',
                'simulation_embed_url': None,
                'video_url': '',
                'libraries_list': [],
                'code_files': [],
                'comments': [],
                'created_at': instance.created_at,
            }
        return super().to_representation(instance)

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
        fields = ['id', 'project', 'project_title', 'author_name', 'text', 'timestamp']


class CommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['author_name', 'text']

    def validate_author_name(self, value):
        value = (value or '').strip() or 'Guest'
        return value[:120]

    def validate_text(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Comment cannot be empty.')
        return value


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


class AdminProjectSerializer(serializers.ModelSerializer):
    materials_json = serializers.CharField(write_only=True, required=False, allow_blank=True)
    wiring_json = serializers.CharField(write_only=True, required=False, allow_blank=True)
    code_files_json = serializers.CharField(write_only=True, required=False, allow_blank=True)
    simulation_url = serializers.URLField(required=False, allow_blank=True, default='')
    video_url = serializers.URLField(required=False, allow_blank=True, default='')
    schematic_url = serializers.SerializerMethodField(read_only=True)
    pack_ids = serializers.SerializerMethodField(read_only=True)
    pack_ids_json = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Project
        fields = [
            'id',
            'subcategory',
            'title',
            'description',
            'materials',
            'wiring',
            'materials_json',
            'wiring_json',
            'schematic_image',
            'schematic_url',
            'simulation_url',
            'video_url',
            'libraries',
            'source_code',
            'code_files',
            'code_files_json',
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

    def validate_schematic_image(self, value):
        if not value:
            return value
        validate_upload_extension(value)
        max_bytes = 5 * 1024 * 1024
        if value.size > max_bytes:
            raise serializers.ValidationError('Schematic image must be 5 MB or smaller.')
        return value

    def get_schematic_url(self, obj):
        return media_url(obj.schematic_image)

    def get_pack_ids(self, obj):
        return [str(p.id) for p in obj.packs.all()]

    def _apply_packs(self, instance, pack_ids):
        if pack_ids is not None:
            instance.packs.set(SubscriptionPack.objects.filter(id__in=pack_ids))

    def _merge_request_files(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'FILES') and 'schematic_image' in request.FILES:
            validated_data['schematic_image'] = request.FILES['schematic_image']
        return validated_data

    def _verify_schematic_saved(self, instance):
        if not instance.schematic_image or not getattr(instance.schematic_image, 'name', None):
            return
        name = instance.schematic_image.name
        if not instance.schematic_image.storage.exists(name):
            raise serializers.ValidationError({
                'schematic_image': (
                    'Image was not saved on the server. On Render, set CLOUDINARY_URL '
                    'in Environment (see RENDER.md) or try a smaller file (max 5 MB).'
                ),
            })

    def create(self, validated_data):
        pack_ids = validated_data.pop('pack_ids', None)
        validated_data = self._merge_request_files(validated_data)
        instance = super().create(validated_data)
        self._apply_packs(instance, pack_ids)
        self._verify_schematic_saved(instance)
        return instance

    def update(self, instance, validated_data):
        pack_ids = validated_data.pop('pack_ids', None)
        validated_data = self._merge_request_files(validated_data)
        instance = super().update(instance, validated_data)
        self._apply_packs(instance, pack_ids)
        self._verify_schematic_saved(instance)
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
        if 'featured_order' in self.initial_data:
            try:
                attrs['featured_order'] = int(self.initial_data.get('featured_order') or 0)
            except (TypeError, ValueError):
                attrs['featured_order'] = 0
        return attrs


class ProjectCommandCreateSerializer(serializers.ModelSerializer):
    tracking_code = serializers.CharField(read_only=True)
    client_email = serializers.EmailField(required=False, allow_blank=True)

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
        ]
        read_only_fields = ['id', 'tracking_code']

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
        return attrs

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
        return value


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
            'project_title',
            'quoted_price',
            'quoted_price_dzd',
            'payment_status',
            'payment_due',
            'accepted_at',
            'created_at',
            'responded_at',
            'messages',
        ]

    def get_payment_due(self, obj):
        has_bill = (
            (obj.quoted_price and obj.quoted_price > 0)
            or (obj.quoted_price_dzd and obj.quoted_price_dzd > 0)
        )
        return (
            obj.status == ProjectCommand.Status.ACCEPTED
            and has_bill
            and obj.payment_status == ProjectCommand.PaymentStatus.PENDING
        )


class ProjectCommandTrackBriefSerializer(serializers.ModelSerializer):
    idea_preview = serializers.SerializerMethodField()

    class Meta:
        model = ProjectCommand
        fields = [
            'id',
            'tracking_code',
            'client_name',
            'status',
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
            'attachment',
            'status',
            'quoted_price',
            'quoted_price_dzd',
            'payment_status',
            'accepted_at',
            'staff_response',
            'responded_at',
            'responded_by_name',
            'messages',
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
        quoted = attrs.get('quoted_price')
        quoted_dzd = attrs.get('quoted_price_dzd')
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
            return PORTFOLIO_PERMS + ['manage_categories']
        return [
            p.split('.')[-1]
            for p in obj.get_all_permissions()
            if p.startswith('portfolio.') and p.split('.')[-1] in PORTFOLIO_PERMS
        ]


class CustomerRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(min_length=8, write_only=True)
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name']

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

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'subscriptions',
            'active_pack_ids',
            'subscription_tier',
        ]

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

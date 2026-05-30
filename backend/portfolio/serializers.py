import json

from django.contrib.auth import get_user_model
from django.db.models import Count
from django.contrib.auth.models import Permission
from django.utils import timezone
from rest_framework import serializers

from .embed_utils import normalize_code_files, resolve_simulation_embed_url
from .models import Comment, CommandMessage, Project, ProjectCategory, ProjectCommand
from .validators import validate_upload_extension

User = get_user_model()

PORTFOLIO_PERMS = [
    'post_project',
    'edit_project',
    'manage_categories',
    'view_commands',
    'respond_commands',
    'moderate_comment',
]


def normalize_simulation_url(value):
    if not value or not str(value).strip():
        return ''
    url = str(value).strip()
    if not url.startswith(('http://', 'https://')):
        url = f'https://{url}'
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
            'featured_order',
            'created_at',
        ]

    def get_schematic_url(self, obj):
        request = self.context.get('request')
        if obj.schematic_image and request:
            return request.build_absolute_uri(obj.schematic_image.url)
        if obj.schematic_image:
            return obj.schematic_image.url
        return None

    def get_libraries_list(self, obj):
        return obj.libraries_list


class ProjectDetailSerializer(serializers.ModelSerializer):
    schematic_url = serializers.SerializerMethodField()
    simulation_embed_url = serializers.SerializerMethodField()
    libraries_list = serializers.SerializerMethodField()
    code_files = serializers.SerializerMethodField()
    comments = serializers.SerializerMethodField()
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True)
    category_name = serializers.CharField(source='subcategory.parent.name', read_only=True)

    class Meta:
        model = Project
        fields = [
            'id',
            'title',
            'description',
            'subcategory_name',
            'category_name',
            'materials',
            'wiring',
            'schematic_url',
            'simulation_url',
            'simulation_embed_url',
            'video_url',
            'libraries_list',
            'code_files',
            'comments',
            'created_at',
        ]

    def get_schematic_url(self, obj):
        request = self.context.get('request')
        if obj.schematic_image and request:
            return request.build_absolute_uri(obj.schematic_image.url)
        if obj.schematic_image:
            return obj.schematic_image.url
        return None

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
            'simulation_url',
            'video_url',
            'libraries',
            'source_code',
            'code_files',
            'code_files_json',
            'is_featured',
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
        if 'featured_order' in self.initial_data:
            try:
                attrs['featured_order'] = int(self.initial_data.get('featured_order') or 0)
            except (TypeError, ValueError):
                attrs['featured_order'] = 0
        return attrs


class ProjectCommandCreateSerializer(serializers.ModelSerializer):
    tracking_code = serializers.CharField(read_only=True)

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
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


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
            'created_at',
            'responded_at',
            'messages',
        ]


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
            'staff_response',
            'responded_at',
            'responded_by_name',
            'messages',
            'created_at',
        ]


class ProjectCommandRespondSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectCommand
        fields = ['status', 'staff_response']

    def validate_staff_response(self, value):
        return (value or '').strip()


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

from django.conf import settings
from django.contrib import admin, messages
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth.models import Group, Permission
from django import forms
from django.utils import timezone
from django.utils.html import format_html

from .models import (
    CommandMessage,
    Comment,
    Project,
    ProjectCategory,
    ProjectCommand,
    StaffAuditLog,
    SubscriptionPack,
    StoreCategory,
    StoreOrder,
    StoreOrderItem,
    StoreProduct,
    StoreProductImage,
    UserSocialAuth,
    UserSubscription,
)

User = get_user_model()
admin.site.site_header = 'EmbeddedGrid Administration'
admin.site.site_title = 'EmbeddedGrid Admin'
admin.site.index_title = 'Operations'
PORTFOLIO_PERMS = (
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
)

class AccountTypeFilter(admin.SimpleListFilter):
    title = 'account type'
    parameter_name = 'account_type'

    def lookups(self, request, model_admin):
        return (
            ('staff', 'Staff'),
            ('client', 'Client'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'staff':
            return queryset.filter(is_staff=True)
        if self.value() == 'client':
            return queryset.filter(is_staff=False)
        return queryset


@admin.register(ProjectCategory)
class ProjectCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent', 'sort_order')
    list_filter = ('parent',)
    search_fields = ('name', 'parent__name')
    ordering = ('parent__name', 'sort_order', 'name')


class ProjectCommentInline(admin.TabularInline):
    model = Comment
    extra = 0
    fields = ('author_name', 'text', 'timestamp')
    readonly_fields = ('timestamp',)


class ProjectAdminForm(forms.ModelForm):
    pack_memberships = forms.ModelMultipleChoiceField(
        queryset=SubscriptionPack.objects.all(),
        required=False,
        help_text='Assign this project to one or more subscription packs.',
        widget=admin.widgets.FilteredSelectMultiple('Packs', is_stacked=False),
    )

    class Meta:
        model = Project
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['pack_memberships'].queryset = SubscriptionPack.objects.order_by('sort_order', 'name')
        if self.instance and self.instance.pk:
            self.fields['pack_memberships'].initial = self.instance.packs.all()


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    form = ProjectAdminForm
    list_display = (
        'title',
        'subcategory',
        'is_featured',
        'featured_order',
        'is_free',
        'created_at',
        'updated_at',
    )
    list_filter = ('is_featured', 'is_free', 'subcategory__parent', 'subcategory')
    search_fields = ('title', 'description', 'subcategory__name', 'subcategory__parent__name')
    readonly_fields = ('id', 'created_at', 'updated_at')
    inlines = [ProjectCommentInline]
    fieldsets = (
        ('Identity', {'fields': ('id', 'subcategory', 'title', 'description')}),
        ('Visibility & Access', {'fields': ('is_featured', 'featured_order', 'is_free', 'pack_memberships')}),
        ('Content', {'fields': ('materials', 'wiring', 'libraries', 'simulation_url', 'video_url')}),
        ('Code & Files', {'fields': ('schematic_image', 'source_code', 'code_files')}),
        ('Audit', {'fields': ('created_at', 'updated_at')}),
    )

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        packs = form.cleaned_data.get('pack_memberships')
        if packs is not None:
            form.instance.packs.set(packs)


class CommandMessageInline(admin.TabularInline):
    model = CommandMessage
    extra = 0
    fields = ('created_at', 'role', 'author_name', 'text', 'link_url', 'image', 'staff_user')
    readonly_fields = ('created_at',)
    autocomplete_fields = ('staff_user',)


@admin.register(ProjectCommand)
class ProjectCommandAdmin(admin.ModelAdmin):
    list_display = (
        'tracking_code',
        'tracking_link',
        'client_name',
        'client_email',
        'status',
        'payment_status',
        'quoted_price',
        'quoted_price_dzd',
        'created_at',
    )
    list_filter = ('status', 'payment_status', 'created_at')
    search_fields = (
        'tracking_code',
        'client_name',
        'client_email',
        'idea_description',
        'user__username',
        'user__email',
    )
    readonly_fields = ('id', 'access_token', 'tracking_code', 'created_at', 'accepted_at', 'responded_at')
    autocomplete_fields = ('user', 'associated_project', 'responded_by')
    inlines = [CommandMessageInline]
    actions = ('mark_payment_pending', 'mark_payment_paid', 'mark_payment_waived', 'mark_accepted')
    fieldsets = (
        ('Identity', {'fields': ('id', 'user', 'client_name', 'client_email', 'associated_project')}),
        ('Request', {'fields': ('idea_description', 'objectives', 'problems', 'price_limit', 'attachment')}),
        (
            'Tracking & Lifecycle',
            {
                'fields': (
                    'access_token',
                    'tracking_code',
                    'status',
                    'accepted_at',
                    'staff_response',
                    'responded_by',
                    'responded_at',
                )
            },
        ),
        ('Billing', {'fields': ('quoted_price', 'quoted_price_dzd', 'payment_status')}),
        ('Audit', {'fields': ('created_at',)}),
    )

    @admin.display(description='Track URL')
    def tracking_link(self, obj):
        base = (getattr(settings, 'PUBLIC_SITE_URL', '') or '').rstrip('/')
        if not base:
            return 'Set PUBLIC_SITE_URL'
        url = f'{base}/track?code={obj.tracking_code}'
        return format_html('<a href="{}" target="_blank" rel="noopener noreferrer">Open</a>', url)

    @admin.action(description='Set payment status → pending')
    def mark_payment_pending(self, request, queryset):
        updated = queryset.update(payment_status=ProjectCommand.PaymentStatus.PENDING)
        self.message_user(request, f'Updated {updated} command(s) to pending.', messages.SUCCESS)

    @admin.action(description='Set payment status → paid')
    def mark_payment_paid(self, request, queryset):
        updated = queryset.update(payment_status=ProjectCommand.PaymentStatus.PAID)
        self.message_user(request, f'Updated {updated} command(s) to paid.', messages.SUCCESS)

    @admin.action(description='Set payment status → waived')
    def mark_payment_waived(self, request, queryset):
        updated = queryset.update(payment_status=ProjectCommand.PaymentStatus.WAIVED)
        self.message_user(request, f'Updated {updated} command(s) to waived.', messages.SUCCESS)

    @admin.action(description='Set status → accepted (timestamp if empty)')
    def mark_accepted(self, request, queryset):
        now = timezone.now()
        updated = queryset.update(status=ProjectCommand.Status.ACCEPTED)
        queryset.filter(accepted_at__isnull=True).update(accepted_at=now)
        self.message_user(request, f'Accepted {updated} command(s).', messages.SUCCESS)

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        for obj in instances:
            if isinstance(obj, CommandMessage) and not obj.pk:
                # Mirror React admin chat behavior: new admin messages are staff authored.
                obj.role = CommandMessage.AuthorRole.STAFF
                if not obj.author_name:
                    obj.author_name = 'EmbeddedGrid'
                if not obj.staff_user_id:
                    obj.staff_user = request.user
            obj.save()
        formset.save_m2m()


@admin.register(CommandMessage)
class CommandMessageAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'command', 'role', 'author_name', 'staff_user')
    list_filter = ('role', 'created_at')
    search_fields = ('author_name', 'text', 'command__tracking_code')
    autocomplete_fields = ('command', 'staff_user')
    readonly_fields = ('id', 'created_at')


@admin.register(Comment)
class ProjectCommentAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'author_name', 'project', 'user')
    list_filter = ('timestamp', 'project')
    search_fields = ('author_name', 'text', 'project__title', 'user__username', 'user__email')
    autocomplete_fields = ('project', 'user')
    readonly_fields = ('id', 'timestamp')


@admin.register(SubscriptionPack)
class SubscriptionPackAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'price', 'price_dzd', 'duration_days', 'is_active', 'sort_order')
    list_filter = ('is_active',)
    search_fields = ('name', 'slug', 'description')
    filter_horizontal = ('projects',)
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'pack', 'status', 'started_at', 'expires_at', 'created_at')
    list_filter = ('status', 'pack')
    search_fields = ('user__username', 'user__email', 'pack__name')
    raw_id_fields = ('user', 'pack')
    readonly_fields = ('id', 'created_at')


@admin.register(UserSocialAuth)
class UserSocialAuthAdmin(admin.ModelAdmin):
    list_display = ('user', 'provider', 'provider_uid', 'created_at')
    list_filter = ('provider',)
    search_fields = ('user__username', 'user__email', 'provider_uid')
    raw_id_fields = ('user',)
    readonly_fields = ('id', 'created_at')


@admin.register(StoreCategory)
class StoreCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_active', 'sort_order', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'slug', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at')
    prepopulated_fields = {'slug': ('name',)}


class StoreProductImageInline(admin.TabularInline):
    model = StoreProductImage
    extra = 1
    fields = ('image', 'alt_text', 'sort_order')


@admin.register(StoreProduct)
class StoreProductAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'category',
        'price_usd',
        'price_dzd',
        'stock_qty',
        'is_active',
        'is_featured',
        'sort_order',
    )
    list_filter = ('is_active', 'is_featured', 'category')
    search_fields = ('name', 'slug', 'short_description', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at')
    autocomplete_fields = ('category',)
    prepopulated_fields = {'slug': ('name',)}
    inlines = [StoreProductImageInline]


class StoreOrderItemInline(admin.TabularInline):
    model = StoreOrderItem
    extra = 0
    readonly_fields = (
        'product_name',
        'product_slug',
        'quantity',
        'unit_price_usd',
        'unit_price_dzd',
    )
    autocomplete_fields = ('product',)


@admin.register(StoreOrder)
class StoreOrderAdmin(admin.ModelAdmin):
    list_display = (
        'order_number',
        'customer_name',
        'customer_email',
        'status',
        'payment_status',
        'total_usd',
        'total_dzd',
        'created_at',
    )
    list_filter = ('status', 'payment_status', 'created_at')
    search_fields = ('order_number', 'customer_name', 'customer_email', 'customer_phone')
    readonly_fields = ('id', 'order_number', 'paid_at', 'created_at', 'updated_at')
    inlines = [StoreOrderItemInline]
    autocomplete_fields = ('user',)


class CustomerSubscriptionInline(admin.TabularInline):
    model = UserSubscription
    extra = 0
    fields = ('pack', 'status', 'started_at', 'expires_at', 'created_at')
    readonly_fields = ('created_at',)
    autocomplete_fields = ('pack',)


class CustomerCommandInline(admin.TabularInline):
    model = ProjectCommand
    fk_name = 'user'
    extra = 0
    fields = ('tracking_code', 'status', 'payment_status', 'associated_project', 'created_at')
    readonly_fields = ('tracking_code', 'created_at')
    autocomplete_fields = ('associated_project',)


@admin.action(description='Grant portfolio editor permissions')
def grant_portfolio_editor(modeladmin, request, queryset):
    codenames = ('post_project', 'edit_project', 'manage_categories', 'manage_packs')
    perms = list(Permission.objects.filter(content_type__app_label='portfolio', codename__in=codenames))
    count = 0
    for user in queryset:
        if user.is_superuser:
            continue
        user.is_staff = True
        user.save(update_fields=['is_staff'])
        user.user_permissions.add(*perms)
        count += 1
    modeladmin.message_user(request, f'Updated {count} staff user(s).', messages.SUCCESS)


@admin.action(description='Grant command manager permissions')
def grant_command_manager(modeladmin, request, queryset):
    codenames = ('view_commands', 'respond_commands', 'moderate_comment')
    perms = list(Permission.objects.filter(content_type__app_label='portfolio', codename__in=codenames))
    count = 0
    for user in queryset:
        if user.is_superuser:
            continue
        user.is_staff = True
        user.save(update_fields=['is_staff'])
        user.user_permissions.add(*perms)
        count += 1
    modeladmin.message_user(request, f'Updated {count} staff user(s).', messages.SUCCESS)


@admin.action(description='Revoke all portfolio permissions')
def revoke_portfolio_permissions(modeladmin, request, queryset):
    perms = Permission.objects.filter(content_type__app_label='portfolio', codename__in=PORTFOLIO_PERMS)
    count = 0
    for user in queryset:
        user.user_permissions.remove(*perms)
        count += 1
    modeladmin.message_user(request, f'Removed portfolio permissions for {count} user(s).', messages.WARNING)


class PortfolioUserAdmin(DjangoUserAdmin):
    list_display = (
        'username',
        'email',
        'is_staff',
        'is_superuser',
        'is_active',
        'active_subscriptions',
        'commands_count',
        'last_login',
    )
    list_filter = (AccountTypeFilter, 'is_staff', 'is_superuser', 'is_active', 'groups')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    filter_horizontal = ('groups', 'user_permissions')
    inlines = (CustomerSubscriptionInline, CustomerCommandInline)
    actions = (grant_portfolio_editor, grant_command_manager, revoke_portfolio_permissions)

    fieldsets = DjangoUserAdmin.fieldsets + (
        (
            'Portfolio summary',
            {
                'fields': ('portfolio_permissions',),
            },
        ),
    )
    readonly_fields = ('portfolio_permissions',)

    @admin.display(description='Active packs')
    def active_subscriptions(self, obj):
        return obj.subscriptions.filter(status=UserSubscription.Status.ACTIVE).count()

    @admin.display(description='Commands')
    def commands_count(self, obj):
        return obj.project_commands.count()

    @admin.display(description='Portfolio permissions')
    def portfolio_permissions(self, obj):
        if obj.is_superuser:
            return 'All permissions (superuser)'
        perms = sorted(
            [
                p.codename
                for p in obj.user_permissions.filter(content_type__app_label='portfolio')
                if p.codename in PORTFOLIO_PERMS
            ],
        )
        return ', '.join(perms) if perms else 'None'


try:
    admin.site.unregister(User)
except admin.sites.NotRegistered:
    pass

try:
    admin.site.unregister(Group)
except admin.sites.NotRegistered:
    pass

@admin.register(StaffAuditLog)
class StaffAuditLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'actor_username', 'action', 'resource', 'object_label', 'summary')
    list_filter = ('action', 'resource', 'method')
    search_fields = ('actor_username', 'summary', 'object_label', 'object_id', 'path')
    readonly_fields = (
        'id',
        'actor',
        'actor_username',
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
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


admin.site.register(User, PortfolioUserAdmin)
admin.site.register(Group)

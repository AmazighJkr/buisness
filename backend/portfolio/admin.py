from django.contrib import admin

from .models import (
    Comment,
    Project,
    ProjectCategory,
    ProjectCommand,
    SubscriptionPack,
    UserSocialAuth,
    UserSubscription,
)


@admin.register(ProjectCategory)
class ProjectCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent', 'sort_order')
    list_filter = ('parent',)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_at', 'updated_at')
    search_fields = ('title', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(ProjectCommand)
class ProjectCommandAdmin(admin.ModelAdmin):
    list_display = ('client_name', 'client_email', 'status', 'payment_status', 'created_at')
    list_filter = ('status', 'payment_status')
    list_editable = ('status',)
    search_fields = ('client_name', 'client_email', 'tracking_code')


@admin.register(Comment)
class ProjectCommentAdmin(admin.ModelAdmin):
    list_display = ('author_name', 'project', 'timestamp')


@admin.register(SubscriptionPack)
class SubscriptionPackAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'price', 'duration_days', 'is_active', 'sort_order')
    list_filter = ('is_active',)
    search_fields = ('name', 'slug')
    filter_horizontal = ('projects',)


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'pack', 'status', 'started_at', 'expires_at', 'created_at')
    list_filter = ('status', 'pack')
    search_fields = ('user__username', 'user__email', 'pack__name')
    raw_id_fields = ('user', 'pack')


@admin.register(UserSocialAuth)
class UserSocialAuthAdmin(admin.ModelAdmin):
    list_display = ('user', 'provider', 'provider_uid', 'created_at')
    list_filter = ('provider',)
    search_fields = ('user__username', 'user__email', 'provider_uid')
    raw_id_fields = ('user',)

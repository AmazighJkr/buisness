from django.contrib import admin

from .models import Comment, Project, ProjectCategory, ProjectCommand


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
    list_display = ('client_name', 'client_email', 'status', 'created_at')
    list_filter = ('status',)
    list_editable = ('status',)


@admin.register(Comment)
class ProjectCommentAdmin(admin.ModelAdmin):
    list_display = ('author_name', 'project', 'timestamp')

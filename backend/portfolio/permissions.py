from rest_framework.permissions import BasePermission


class IsStaffUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class HasPerm(BasePermission):
    """Check a single Django permission codename (app_label.codename)."""

    perm = ''

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return request.user.has_perm(self.perm)


class CanPostProject(HasPerm):
    perm = 'portfolio.post_project'


class CanEditProject(HasPerm):
    perm = 'portfolio.edit_project'


class CanViewCommands(HasPerm):
    perm = 'portfolio.view_commands'


class CanRespondCommands(HasPerm):
    perm = 'portfolio.respond_commands'


class CanDeleteComment(HasPerm):
    perm = 'portfolio.moderate_comment'


class CanManageCategories(HasPerm):
    perm = 'portfolio.manage_categories'


class CanManageUsers(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)


class IsCustomerUser(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and not request.user.is_staff,
        )


class CanManagePacks(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return request.user.has_perm('portfolio.manage_packs') or request.user.has_perm(
            'portfolio.edit_project',
        )

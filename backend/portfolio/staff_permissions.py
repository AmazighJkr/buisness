"""Granular staff permission helpers (manage_store remains full store access)."""

STORE_PERMS = ('manage_store', 'post_store', 'edit_store', 'manage_store_orders')


def staff_has_perm(user, codename: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    if codename == 'manage_store' and user.has_perm('portfolio.manage_store'):
        return True
    return user.has_perm(f'portfolio.{codename}')


def staff_has_any_perm(user, *codenames: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    if user.has_perm('portfolio.manage_store'):
        return True
    return any(user.has_perm(f'portfolio.{c}') for c in codenames)


def staff_can_post_store(user) -> bool:
    return staff_has_any_perm(user, 'manage_store', 'post_store')


def staff_can_edit_store(user) -> bool:
    return staff_has_any_perm(user, 'manage_store', 'edit_store')


def staff_can_manage_store_orders(user) -> bool:
    return staff_has_any_perm(user, 'manage_store', 'manage_store_orders')


def staff_can_manage_command_layers(user) -> bool:
    return staff_has_any_perm(user, 'respond_commands', 'manage_command_layers')

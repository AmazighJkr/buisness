"""Project access and active subscriptions."""

from django.utils import timezone

from .models import SubscriptionPack, UserSubscription
from .subscriptions import accessible_pack_ids, highest_active_pack_sort_order


def active_subscriptions_for(user):
    if not user or not user.is_authenticated:
        return UserSubscription.objects.none()
    now = timezone.now()
    return UserSubscription.objects.filter(
        user=user,
        status=UserSubscription.Status.ACTIVE,
        expires_at__gt=now,
    ).select_related('pack')


def active_pack_ids(user):
    return accessible_pack_ids(user)


def user_can_view_project(user, project):
    if project.is_free:
        return True
    tier = highest_active_pack_sort_order(user)
    if tier <= 0:
        return False
    return project.packs.filter(is_active=True, sort_order__lte=tier).exists()


def project_access(user, project):
    if project.is_free:
        return 'free'
    if user_can_view_project(user, project):
        return 'unlocked'
    return 'locked'


def required_packs_for(project):
    return list(
        project.packs.filter(is_active=True).values('id', 'name', 'slug', 'price', 'sort_order'),
    )

"""Project access and active subscriptions."""

from django.utils import timezone

from .models import SubscriptionPack, UserSubscription


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
    return list(active_subscriptions_for(user).values_list('pack_id', flat=True))


def user_can_view_project(user, project):
    if project.is_free:
        return True
    pack_ids = active_pack_ids(user)
    if not pack_ids:
        return False
    return project.packs.filter(id__in=pack_ids).exists()


def project_access(user, project):
    if project.is_free:
        return 'free'
    if user_can_view_project(user, project):
        return 'unlocked'
    return 'locked'


def required_packs_for(project):
    return list(
        project.packs.filter(is_active=True).values('id', 'name', 'slug', 'price'),
    )

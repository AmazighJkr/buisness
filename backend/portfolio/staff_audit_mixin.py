"""Mixin + helpers so every staff create/update/delete is logged with field-level detail."""

from __future__ import annotations

from .staff_audit import log_staff_action, snapshot_instance


class StaffAuditMixin:
    """Attach to admin ModelViewSets — logs create/update/delete with price/qty/status deltas."""

    audit_resource: str = ''

    def _audit_label(self, instance) -> str:
        for attr in ('order_number', 'title', 'name', 'username', 'slug', 'tracking_code'):
            val = getattr(instance, attr, None)
            if val:
                return str(val)[:120]
        return str(getattr(instance, 'pk', '') or getattr(instance, 'id', ''))[:120]

    def _audit_object_id(self, instance) -> str:
        return str(getattr(instance, 'pk', None) or getattr(instance, 'id', '') or '')[:64]

    def perform_create(self, serializer):
        super().perform_create(serializer)
        instance = serializer.instance
        log_staff_action(
            self.request,
            action='create',
            resource=self.audit_resource,
            object_label=self._audit_label(instance),
            object_id=self._audit_object_id(instance),
            after=snapshot_instance(instance),
            request_data=validated_data(serializer),
        )

    def perform_update(self, serializer):
        instance = serializer.instance
        before = snapshot_instance(instance)
        super().perform_update(serializer)
        instance.refresh_from_db()
        log_staff_action(
            self.request,
            action='update',
            resource=self.audit_resource,
            object_label=self._audit_label(instance),
            object_id=self._audit_object_id(instance),
            before=before,
            after=snapshot_instance(instance),
            request_data=validated_data(serializer),
        )

    def perform_destroy(self, instance):
        label = self._audit_label(instance)
        object_id = self._audit_object_id(instance)
        before = snapshot_instance(instance)
        super().perform_destroy(instance)
        log_staff_action(
            self.request,
            action='delete',
            resource=self.audit_resource,
            object_label=label,
            object_id=object_id,
            before=before,
        )


def validated_data(serializer) -> dict:
    try:
        return dict(serializer.validated_data)
    except Exception:
        return {}

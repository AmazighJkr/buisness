from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import CreateAPIView
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import ContactMessage
from .permissions import CanRespondContactMessages, CanViewContactMessages
from .serializers import (
    AdminContactMessageSerializer,
    ContactMessageCreateSerializer,
    ContactMessageRespondSerializer,
)
from .staff_audit import log_staff_action


class ContactMessageCreateView(CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = ContactMessageCreateSerializer
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        try:
            from .notifications import notify_contact_message_received

            notify_contact_message_received(message)
        except Exception:
            pass
        return Response(
            {
                'id': str(message.id),
                'detail': 'Message sent. We will reply to your email shortly.',
            },
            status=status.HTTP_201_CREATED,
        )


class AdminContactMessageViewSet(viewsets.ReadOnlyModelViewSet):
    audit_resource = 'contact/messages'
    queryset = ContactMessage.objects.select_related('replied_by').all()
    serializer_class = AdminContactMessageSerializer
    lookup_field = 'id'

    def get_permissions(self):
        if self.action == 'respond':
            return [CanRespondContactMessages()]
        return [CanViewContactMessages()]

    @action(detail=True, methods=['patch'], url_path='respond')
    def respond(self, request, id=None):
        message = self.get_object()
        before_status = message.status
        serializer = ContactMessageRespondSerializer(message, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        reply_text = (serializer.validated_data.get('staff_reply') or '').strip()
        new_status = serializer.validated_data.get('status', message.status)
        if reply_text:
            message.staff_reply = reply_text
            message.replied_by = request.user
            message.replied_at = timezone.now()
            if new_status == ContactMessage.Status.NEW:
                new_status = ContactMessage.Status.REPLIED
        message.status = new_status
        message.save()
        try:
            from .notifications import notify_contact_message_reply

            if reply_text:
                notify_contact_message_reply(message)
        except Exception:
            pass
        log_staff_action(
            request,
            action='respond',
            resource='contact/messages',
            object_label=message.client_email,
            object_id=str(message.id),
            before={'status': before_status},
            after={'status': message.status, 'staff_reply': bool(reply_text)},
            request_data=dict(serializer.validated_data),
            subaction='respond',
        )
        return Response(AdminContactMessageSerializer(message).data)

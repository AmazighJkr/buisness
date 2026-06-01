from django.contrib.auth import get_user_model
from django.db.models import Count, Prefetch
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Comment,
    CommandMessage,
    Project,
    ProjectCategory,
    ProjectCommand,
    SubscriptionPack,
    UserSubscription,
)
from .permissions import (
    CanDeleteComment,
    CanEditProject,
    CanManageCategories,
    CanManageCustomers,
    CanManagePacks,
    CanManageUsers,
    CanPostProject,
    CanRespondCommands,
    CanViewCommands,
    IsCustomerUser,
    IsStaffUser,
)
from .serializers import (
    AdminCustomerSerializer,
    AdminProjectSerializer,
    AdminUserCreateSerializer,
    AdminUserSerializer,
    CategoryAdminSerializer,
    CategoryTreeSerializer,
    CommentCreateSerializer,
    CommentSerializer,
    CommandMessageAdminCreateSerializer,
    CommandMessageAdminSerializer,
    CommandMessageCreateSerializer,
    CommandMessagePublicSerializer,
    ProjectCommandAdminSerializer,
    ProjectCommandCreateSerializer,
    ProjectCommandRespondSerializer,
    ProjectCommandTrackBriefSerializer,
    ProjectCommandTrackSerializer,
    ProjectDetailSerializer,
    ProjectListSerializer,
    PORTFOLIO_PERMS,
    SubscriptionPackAdminSerializer,
)

from .enterprise import enterprise_display_name
from .tracking import (
    commands_for_user,
    get_command_for_code,
    get_command_for_user,
    normalize_client_email,
)
from .validators import validate_upload_extension

User = get_user_model()


def message_response(message, request, admin=False):
    serializer_class = CommandMessageAdminSerializer if admin else CommandMessagePublicSerializer
    return serializer_class(message, context={'request': request}).data


def create_staff_message(command, request, text='', link_url='', image=None):
    return CommandMessage.objects.create(
        command=command,
        role=CommandMessage.AuthorRole.STAFF,
        author_name=enterprise_display_name(),
        text=text,
        link_url=link_url,
        image=image,
        staff_user=request.user,
    )


class CategoryListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = CategoryTreeSerializer

    def get_queryset(self):
        return ProjectCategory.objects.filter(parent__isnull=True).order_by(
            'sort_order', 'name',
        )


class ProjectViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Project.objects.select_related('subcategory', 'subcategory__parent').prefetch_related(
        'packs',
    )
    lookup_field = 'id'
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProjectDetailSerializer
        return ProjectListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        sub = self.request.query_params.get('subcategory')
        featured = self.request.query_params.get('featured')
        if sub:
            qs = qs.filter(subcategory_id=sub)
        elif featured and featured.lower() in ('1', 'true', 'yes'):
            qs = qs.filter(is_featured=True)
        return qs

    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def comments(self, request, id=None):
        project = self.get_object()
        if request.method == 'GET':
            return Response(CommentSerializer(project.comments.all(), many=True).data)
        serializer = CommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = Comment.objects.create(
            project=project,
            author_name=serializer.validated_data['author_name'],
            text=serializer.validated_data['text'],
        )
        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class ProjectCommandCreateView(generics.CreateAPIView):
    queryset = ProjectCommand.objects.all()
    serializer_class = ProjectCommandCreateSerializer
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_authenticated and not user.is_staff:
            serializer.save(user=user)
        else:
            serializer.save()


class MyCommandsListView(APIView):
    """Commands linked to the signed-in customer account."""

    permission_classes = [IsCustomerUser]

    def get(self, request):
        commands = commands_for_user(request.user)
        return Response({
            'commands': ProjectCommandTrackBriefSerializer(commands, many=True).data,
        })


class MyCommandDetailView(APIView):
    permission_classes = [IsCustomerUser]

    def get(self, request, command_id):
        command = get_command_for_user(request.user, command_id)
        return Response(
            ProjectCommandTrackSerializer(command, context={'request': request}).data,
        )


class CommandTrackView(APIView):
    """Guest lookup by tracking code or email. Signed-in users should use /commands/mine/."""

    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user
        signed_in = user.is_authenticated and not user.is_staff

        code = request.query_params.get('code')
        email = request.query_params.get('email')

        if signed_in and email and not code:
            return Response(
                {'detail': 'Sign in — open Track to see your commands, or use a tracking code.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if code:
            command = get_command_for_code(code)
            data = ProjectCommandTrackSerializer(command, context={'request': request}).data
            return Response(data)

        if email:
            normalized = normalize_client_email(email)
            if not normalized:
                return Response({'detail': 'Email required.'}, status=status.HTTP_400_BAD_REQUEST)
            commands = ProjectCommand.objects.filter(client_email__iexact=normalized).order_by(
                '-created_at',
            )
            if not commands.exists():
                return Response(
                    {'detail': 'No commands found for this email.'},
                    status=status.HTTP_404_NOT_FOUND,
                )
            return Response({
                'email': normalized,
                'commands': ProjectCommandTrackBriefSerializer(commands, many=True).data,
            })

        return Response(
            {'detail': 'Provide a tracking code or email.'},
            status=status.HTTP_400_BAD_REQUEST,
        )


class CommandTrackMessageView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        user = request.user
        command_id = request.query_params.get('command_id')
        if command_id and user.is_authenticated and not user.is_staff:
            command = get_command_for_user(user, command_id)
        else:
            code = request.query_params.get('code')
            command = get_command_for_code(code)
        serializer = CommandMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        text = serializer.validated_data.get('text', '')
        link_url = serializer.validated_data.get('link_url', '')
        image = request.FILES.get('image')
        if not text and not link_url and not image:
            return Response(
                {'detail': 'Message must include text, a link, or an image.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if image:
            validate_upload_extension(image)
        author = (serializer.validated_data.get('author_name') or command.client_name or 'Client').strip()
        message = CommandMessage.objects.create(
            command=command,
            role=CommandMessage.AuthorRole.CLIENT,
            author_name=author[:120],
            text=text,
            link_url=link_url,
            image=image,
        )
        return Response(message_response(message, request), status=status.HTTP_201_CREATED)


class AdminProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.select_related('subcategory').prefetch_related('packs').all()
    serializer_class = AdminProjectSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    lookup_field = 'id'

    def get_permissions(self):
        if self.action in ('create',):
            return [CanPostProject()]
        if self.action in ('update', 'partial_update', 'destroy'):
            return [CanEditProject()]
        return [IsStaffUser()]


class AdminCategoryViewSet(viewsets.ModelViewSet):
    queryset = ProjectCategory.objects.select_related('parent').all()
    serializer_class = CategoryAdminSerializer
    permission_classes = [CanManageCategories]
    lookup_field = 'id'


class AdminCommandViewSet(viewsets.GenericViewSet):
    queryset = ProjectCommand.objects.select_related(
        'associated_project', 'responded_by',
    ).prefetch_related('messages', 'messages__staff_user')
    serializer_class = ProjectCommandAdminSerializer
    lookup_field = 'id'
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}

    def get_permissions(self):
        if self.action in ('respond', 'send_message'):
            return [CanRespondCommands()]
        return [CanViewCommands()]

    def list(self, request):
        return Response(self.get_serializer(self.get_queryset(), many=True).data)

    def retrieve(self, request, id=None):
        command = self.get_object()
        return Response(self.get_serializer(command).data)

    @action(detail=True, methods=['patch'], url_path='respond')
    def respond(self, request, id=None):
        command = self.get_object()
        serializer = ProjectCommandRespondSerializer(command, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data.get('status', command.status)
        staff_response = serializer.validated_data.get('staff_response', '').strip()
        quoted_price = serializer.validated_data.get('quoted_price', command.quoted_price)
        quoted_price_dzd = serializer.validated_data.get(
            'quoted_price_dzd',
            command.quoted_price_dzd,
        )
        payment_status = serializer.validated_data.get('payment_status', command.payment_status)

        command.status = new_status
        if quoted_price is not None:
            command.quoted_price = quoted_price
        if quoted_price_dzd is not None:
            command.quoted_price_dzd = quoted_price_dzd
        if payment_status:
            command.payment_status = payment_status
        if new_status == ProjectCommand.Status.ACCEPTED and not command.accepted_at:
            command.accepted_at = timezone.now()
        has_bill = (
            (command.quoted_price and command.quoted_price > 0)
            or (command.quoted_price_dzd and command.quoted_price_dzd > 0)
        )
        if (
            new_status == ProjectCommand.Status.ACCEPTED
            and has_bill
            and command.payment_status == ProjectCommand.PaymentStatus.NONE
        ):
            command.payment_status = ProjectCommand.PaymentStatus.PENDING
        if staff_response:
            command.staff_response = staff_response
            create_staff_message(command, request, text=staff_response)
        command.responded_by = request.user
        command.responded_at = timezone.now()
        command.save()
        return Response(ProjectCommandAdminSerializer(command).data)

    @action(detail=True, methods=['post'], url_path='messages', parser_classes=[MultiPartParser, FormParser])
    def send_message(self, request, id=None):
        command = self.get_object()
        serializer = CommandMessageAdminCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        text = serializer.validated_data.get('text', '')
        link_url = serializer.validated_data.get('link_url', '')
        image = request.FILES.get('image')
        if not text and not link_url and not image:
            return Response(
                {'detail': 'Add text, a link, or an image.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if image:
            validate_upload_extension(image)
        message = create_staff_message(command, request, text=text, link_url=link_url, image=image)
        command.responded_by = request.user
        command.responded_at = timezone.now()
        command.save(update_fields=['responded_by', 'responded_at'])
        return Response(message_response(message, request, admin=True), status=status.HTTP_201_CREATED)


class AdminCommentListView(generics.ListAPIView):
    queryset = Comment.objects.select_related('project').order_by('-timestamp')[:200]
    serializer_class = CommentSerializer
    permission_classes = [CanDeleteComment]


class AdminCommentDestroyView(generics.DestroyAPIView):
    queryset = Comment.objects.all()
    permission_classes = [CanDeleteComment]
    lookup_field = 'id'


class AdminUserListCreateView(generics.ListCreateAPIView):
    permission_classes = [CanManageUsers]

    def get_queryset(self):
        return User.objects.filter(is_staff=True).order_by('username')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AdminUserCreateSerializer
        return AdminUserSerializer


def _customer_queryset():
    return (
        User.objects.filter(is_staff=False)
        .prefetch_related(
            Prefetch(
                'subscriptions',
                queryset=UserSubscription.objects.select_related('pack').order_by('-created_at'),
            ),
            Prefetch(
                'project_commands',
                queryset=ProjectCommand.objects.select_related('associated_project').order_by(
                    '-created_at',
                ),
            ),
        )
        .order_by('-date_joined')
    )


class AdminCustomerListView(generics.ListAPIView):
    """Registered client accounts — visible to superuser only."""

    permission_classes = [CanManageCustomers]
    serializer_class = AdminCustomerSerializer

    def get_queryset(self):
        return _customer_queryset()


class AdminCustomerDetailView(generics.RetrieveAPIView):
    permission_classes = [CanManageCustomers]
    serializer_class = AdminCustomerSerializer
    lookup_field = 'id'

    def get_queryset(self):
        return _customer_queryset()


class AdminMeView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        user = request.user
        all_perms = PORTFOLIO_PERMS
        if user.is_superuser:
            perms = all_perms
        else:
            perms = [
                p.split('.')[-1]
                for p in user.get_all_permissions()
                if p.startswith('portfolio.') and p.split('.')[-1] in all_perms
            ]
        return Response({
            'id': user.id,
            'username': user.username,
            'is_superuser': user.is_superuser,
            'permissions': perms,
        })


class AdminSubscriptionPackViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionPack.objects.prefetch_related('projects').all()
    serializer_class = SubscriptionPackAdminSerializer
    lookup_field = 'id'
    permission_classes = [CanManagePacks]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

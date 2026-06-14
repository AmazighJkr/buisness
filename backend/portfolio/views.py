from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Prefetch, Q
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
    CommandLayer,
    CommandLayerBundle,
    CommandMessage,
    CommandInvoice,
    Project,
    ProjectCategory,
    ProjectCommand,
    StaffAuditLog,
    SubscriptionPack,
    StoreCategory,
    StoreProduct,
    StoreProductComment,
    UserSubscription,
)
from .staff_audit import log_staff_action, snapshot_instance
from .staff_audit_mixin import StaffAuditMixin
from .permissions import (
    CanDeleteComment,
    CanEditProject,
    CanEditStore,
    CanManageCategories,
    CanManageCommandLayers,
    CanManageCustomers,
    CanManagePacks,
    CanManageStore,
    CanManageUsers,
    CanPostProject,
    CanPostStore,
    CanRespondCommands,
    CanViewCommands,
    IsCustomerUser,
    IsStaffUser,
)
from .serializers import (
    AdminCommandLayerBundleSerializer,
    AdminCommandLayerSerializer,
    CommandLayerBundlePublicSerializer,
    AdminCustomerSerializer,
    AdminProjectSerializer,
    AdminUserCreateSerializer,
    AdminUserSerializer,
    AdminUserUpdateSerializer,
    StaffAuditLogSerializer,
    AdminStoreCategorySerializer,
    AdminStoreProductSerializer,
    CategoryAdminSerializer,
    CategoryTreeSerializer,
    CommentCreateSerializer,
    CommentSerializer,
    CommentAdminUpdateSerializer,
    StoreProductCommentCreateSerializer,
    StoreProductCommentSerializer,
    StoreProductCommentAdminUpdateSerializer,
    CommandLayerPublicSerializer,
    CommandMessageAdminCreateSerializer,
    CommandInvoiceSerializer,
    CommandInvoiceWriteSerializer,
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
    StoreCategoryPublicSerializer,
    StoreCategoryTreeSerializer,
    StoreProductPublicSerializer,
    PORTFOLIO_PERMS,
    SubscriptionPackAdminSerializer,
)

from .amazon_search import search_amazon_products
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
        from django.db.models import Q

        qs = super().get_queryset().annotate(
            review_count=Count('comments', distinct=True),
            review_avg=Avg('comments__rating'),
        )
        sub = self.request.query_params.get('subcategory')
        featured = self.request.query_params.get('featured')
        q = (self.request.query_params.get('q') or '').strip()
        if sub:
            qs = qs.filter(subcategory_id=sub)
        elif featured and featured.lower() in ('1', 'true', 'yes'):
            qs = qs.filter(is_featured=True)
        if q:
            qs = qs.filter(
                Q(title__icontains=q)
                | Q(description__icontains=q)
                | Q(subcategory__name__icontains=q)
                | Q(subcategory__parent__name__icontains=q),
            )
        return qs

    @action(detail=True, methods=['get'], url_path='download-bundle')
    def download_bundle(self, request, id=None):
        from .access import user_can_view_project
        from .project_bundle import build_project_bundle_response

        project = self.get_object()
        if not user_can_view_project(request.user, project):
            return Response(
                {'detail': 'Subscribe or sign in to download project files.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return build_project_bundle_response(project)

    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def comments(self, request, id=None):
        project = self.get_object()
        if request.method == 'GET':
            return Response(CommentSerializer(project.comments.all(), many=True).data)
        serializer = CommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user if request.user.is_authenticated and not request.user.is_staff else None
        comment = Comment.objects.create(
            project=project,
            user=user,
            author_name=serializer.validated_data['author_name'],
            text=serializer.validated_data['text'],
            rating=serializer.validated_data.get('rating'),
        )
        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class StoreCategoryListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = StoreCategoryTreeSerializer

    def initial(self, request, *args, **kwargs):
        from .store_region import require_algeria_store

        super().initial(request, *args, **kwargs)
        require_algeria_store(request)

    def get_queryset(self):
        child_qs = (
            StoreCategory.objects.filter(is_active=True)
            .annotate(product_count=Count('products'))
            .order_by('sort_order', 'name')
        )
        return (
            StoreCategory.objects.filter(is_active=True, parent__isnull=True)
            .annotate(product_count=Count('products'))
            .prefetch_related(Prefetch('children', queryset=child_qs))
            .order_by('sort_order', 'name')
        )


class StoreProductViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = StoreProductPublicSerializer
    lookup_field = 'id'
    lookup_url_kwarg = 'id'

    def initial(self, request, *args, **kwargs):
        from .store_region import require_algeria_store

        super().initial(request, *args, **kwargs)
        require_algeria_store(request)

    def get_queryset(self):
        qs = StoreProduct.objects.select_related(
            'category', 'category__parent',
        ).prefetch_related('gallery', 'variants').filter(
            is_active=True,
            category__is_active=True,
        ).annotate(
            review_count=Count('comments', distinct=True),
            review_avg=Avg('comments__rating'),
        )
        category = self.request.query_params.get('category')
        featured = self.request.query_params.get('featured')
        q = (self.request.query_params.get('q') or '').strip()
        if category:
            qs = qs.filter(
                Q(category__slug=category) | Q(category__parent__slug=category),
            )
        if featured and featured.lower() in ('1', 'true', 'yes'):
            qs = qs.filter(is_featured=True)
        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(short_description__icontains=q)
                | Q(description__icontains=q),
            )
        return qs.order_by('-is_featured', 'sort_order', 'name')

    def get_object(self):
        import uuid as uuid_mod

        from django.shortcuts import get_object_or_404

        lookup = self.kwargs[self.lookup_url_kwarg]
        qs = self.get_queryset()
        try:
            uuid_mod.UUID(str(lookup))
            return qs.get(id=lookup)
        except ValueError:
            return get_object_or_404(qs, slug=lookup)
        except StoreProduct.DoesNotExist:
            return get_object_or_404(qs, slug=lookup)

    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def comments(self, request, id=None):
        product = self.get_object()
        if request.method == 'GET':
            return Response(StoreProductCommentSerializer(product.comments.all(), many=True).data)
        serializer = StoreProductCommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user if request.user.is_authenticated and not request.user.is_staff else None
        comment = StoreProductComment.objects.create(
            product=product,
            user=user,
            author_name=serializer.validated_data['author_name'],
            text=serializer.validated_data['text'],
            rating=serializer.validated_data.get('rating'),
        )
        return Response(StoreProductCommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class CommandLayerListView(generics.ListAPIView):
    """Public catalog of command scope layers (priced add-ons)."""

    permission_classes = [AllowAny]
    serializer_class = CommandLayerPublicSerializer
    pagination_class = None

    def get_queryset(self):
        return CommandLayer.objects.filter(is_active=True).order_by('sort_order', 'name')


class CommandLayerBundleListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = CommandLayerBundlePublicSerializer

    def get_queryset(self):
        return CommandLayerBundle.objects.filter(is_active=True).order_by('sort_order', 'name')


class ProjectCommandCreateView(generics.CreateAPIView):
    queryset = ProjectCommand.objects.all()
    serializer_class = ProjectCommandCreateSerializer
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_authenticated and not user.is_staff:
            command = serializer.save(user=user)
        else:
            command = serializer.save()
        from .notifications import notify_command_created

        notify_command_created(command)


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
        command = ProjectCommand.objects.prefetch_related('messages', 'invoices').get(pk=command.pk)
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


class AdminProjectViewSet(StaffAuditMixin, viewsets.ModelViewSet):
    audit_resource = 'projects'
    queryset = Project.objects.select_related('subcategory').prefetch_related('packs').all()
    serializer_class = AdminProjectSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    lookup_field = 'id'

    def get_permissions(self):
        if self.action in ('create',):
            return [CanPostProject()]
        if self.action in ('update', 'partial_update', 'destroy', 'retry_model_3d'):
            return [CanEditProject()]
        return [IsStaffUser()]

    @action(detail=True, methods=['post'], url_path='retry-model-3d')
    def retry_model_3d(self, request, id=None):
        from .model3d_convert import is_glb_name, project_model_3d_pending, schedule_model_3d_conversion

        project = self.get_object()
        source = project.model_3d_file
        if not source or not getattr(source, 'name', None):
            return Response({'detail': 'No 3D file on this project.'}, status=status.HTTP_400_BAD_REQUEST)
        if is_glb_name(source.name):
            return Response({'detail': 'GLB uploads do not need conversion.'}, status=status.HTTP_400_BAD_REQUEST)
        schedule_model_3d_conversion(project.pk)
        project.refresh_from_db()
        data = AdminProjectSerializer(project, context={'request': request}).data
        data['model_3d_pending'] = project_model_3d_pending(project)
        return Response(data)


class AdminCategoryViewSet(StaffAuditMixin, viewsets.ModelViewSet):
    audit_resource = 'categories'
    queryset = ProjectCategory.objects.select_related('parent').all()
    serializer_class = CategoryAdminSerializer
    permission_classes = [CanManageCategories]
    lookup_field = 'id'


class AdminStoreCategoryViewSet(StaffAuditMixin, viewsets.ModelViewSet):
    audit_resource = 'store/categories'
    queryset = StoreCategory.objects.all().order_by('sort_order', 'name')
    serializer_class = AdminStoreCategorySerializer
    permission_classes = [CanEditStore]
    lookup_field = 'id'
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class AdminStoreProductViewSet(StaffAuditMixin, viewsets.ModelViewSet):
    audit_resource = 'store/products'
    queryset = StoreProduct.objects.select_related('category').prefetch_related('gallery').all()
    serializer_class = AdminStoreProductSerializer
    lookup_field = 'id'
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action == 'create':
            return [CanPostStore()]
        if self.action in ('update', 'partial_update', 'destroy'):
            return [CanEditStore()]
        return [CanManageStore()]


class AdminStoreProductGalleryView(APIView):
    """Upload extra product photos (shown in the store gallery)."""

    permission_classes = [CanEditStore]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, product_id):
        from django.shortcuts import get_object_or_404

        from .models import StoreProduct, StoreProductImage
        from .serializers import AdminStoreProductSerializer

        product = get_object_or_404(StoreProduct, id=product_id)
        files = request.FILES.getlist('images')
        if not files:
            return Response({'detail': 'Choose one or more image files.'}, status=400)
        start = product.gallery.count()
        for i, uploaded in enumerate(files):
            StoreProductImage.objects.create(
                product=product,
                image=uploaded,
                sort_order=start + i,
            )
        product = StoreProduct.objects.prefetch_related('gallery').get(id=product.id)
        log_staff_action(
            request,
            action='upload',
            resource='store/products',
            object_label=product.name,
            object_id=str(product.id),
            after={'gallery_count': product.gallery.count()},
            request_data={'images': len(files)},
            subaction='gallery',
        )
        return Response(
            AdminStoreProductSerializer(product, context={'request': request}).data,
        )


class AdminStoreProductGalleryImageView(APIView):
    permission_classes = [CanEditStore]

    def delete(self, request, product_id, image_id):
        from django.shortcuts import get_object_or_404

        from .models import StoreProductImage

        image = get_object_or_404(StoreProductImage, id=image_id, product_id=product_id)
        product_name = image.product.name
        log_staff_action(
            request,
            action='delete',
            resource='store/products',
            object_label=product_name,
            object_id=str(product_id),
            before={'gallery_image': str(image_id)},
            subaction='gallery-image',
            status_code=204,
        )
        image.delete()
        return Response(status=204)


class AdminCommandViewSet(viewsets.GenericViewSet):
    queryset = ProjectCommand.objects.select_related(
        'associated_project', 'responded_by',
    ).prefetch_related('messages', 'messages__staff_user', 'invoices')
    serializer_class = ProjectCommandAdminSerializer
    lookup_field = 'id'
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        from django.db.models import Q

        qs = super().get_queryset()
        return qs.exclude(
            Q(objectives__icontains='Contact form')
            | Q(objectives__icontains='website inquiry'),
        )

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}

    def get_permissions(self):
        if self.action in ('respond', 'send_message', 'create_invoice', 'update_invoice', 'send_invoice'):
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
        old_status = command.status
        before = snapshot_instance(command)
        before['status'] = old_status
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
        try:
            from .notifications import notify_command_quote_ready, notify_command_status_change

            if (
                new_status == ProjectCommand.Status.ACCEPTED
                and old_status != ProjectCommand.Status.ACCEPTED
                and has_bill
            ):
                notify_command_quote_ready(command)
            elif old_status != new_status:
                notify_command_status_change(command, old_status, new_status)
        except Exception:
            pass
        log_staff_action(
            request,
            action='respond',
            resource='commands',
            object_label=command.tracking_code or str(command.id),
            object_id=str(command.id),
            before=before,
            after=snapshot_instance(command),
            request_data=dict(serializer.validated_data),
            subaction='respond',
        )
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
        log_staff_action(
            request,
            action='message',
            resource='commands',
            object_label=command.tracking_code or str(command.id),
            object_id=str(command.id),
            request_data={'has_text': bool(text), 'has_link': bool(link_url), 'has_image': bool(image)},
            subaction='messages',
            status_code=201,
        )
        return Response(message_response(message, request, admin=True), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'], url_path='invoices')
    def invoices(self, request, id=None):
        from decimal import Decimal

        from .command_invoice import compute_invoice_totals

        command = self.get_object()
        if request.method == 'GET':
            rows = command.invoices.all()
            return Response(CommandInvoiceSerializer(rows, many=True).data)
        serializer = CommandInvoiceWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        line_items = serializer.validated_data['line_items']
        total_usd, total_dzd = compute_invoice_totals(line_items)
        invoice = CommandInvoice.objects.create(
            command=command,
            title=serializer.validated_data.get('title') or 'Facture / Invoice',
            line_items=line_items,
            notes=serializer.validated_data.get('notes') or '',
            total_usd=total_usd,
            total_dzd=total_dzd,
            created_by=request.user,
        )
        return Response(CommandInvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch', 'delete'], url_path=r'invoices/(?P<invoice_id>[^/.]+)')
    def update_invoice(self, request, id=None, invoice_id=None):
        from .command_invoice import compute_invoice_totals

        command = self.get_object()
        invoice = command.invoices.filter(id=invoice_id).first()
        if not invoice:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if request.method == 'DELETE':
            if invoice.status != CommandInvoice.Status.DRAFT:
                return Response({'detail': 'Only draft invoices can be deleted.'}, status=400)
            invoice.delete()
            return Response(status=204)
        if invoice.status != CommandInvoice.Status.DRAFT:
            return Response({'detail': 'Only draft invoices can be edited.'}, status=400)
        serializer = CommandInvoiceWriteSerializer(invoice, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for key, val in serializer.validated_data.items():
            setattr(invoice, key, val)
        invoice.total_usd, invoice.total_dzd = compute_invoice_totals(invoice.line_items)
        invoice.save()
        return Response(CommandInvoiceSerializer(invoice).data)

    @action(detail=True, methods=['post'], url_path=r'invoices/(?P<invoice_id>[^/.]+)/send')
    def send_invoice(self, request, id=None, invoice_id=None):
        from .command_invoice import compute_invoice_totals
        from .notifications import notify_command_invoice_sent

        command = self.get_object()
        invoice = command.invoices.filter(id=invoice_id).first()
        if not invoice:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if invoice.status != CommandInvoice.Status.DRAFT:
            return Response({'detail': 'Invoice already sent.'}, status=400)
        invoice.total_usd, invoice.total_dzd = compute_invoice_totals(invoice.line_items)
        invoice.status = CommandInvoice.Status.SENT
        invoice.sent_at = timezone.now()
        invoice.save()
        command.quoted_price = invoice.total_usd or None
        command.quoted_price_dzd = invoice.total_dzd or None
        has_bill = (invoice.total_usd and invoice.total_usd > 0) or (invoice.total_dzd and invoice.total_dzd > 0)
        if has_bill:
            command.payment_status = ProjectCommand.PaymentStatus.PENDING
        command.save(update_fields=['quoted_price', 'quoted_price_dzd', 'payment_status'])
        summary = invoice.title
        if invoice.total_dzd and invoice.total_dzd > 0:
            summary += f' — {invoice.total_dzd} DZD'
        if invoice.total_usd and invoice.total_usd > 0:
            summary += f' — {invoice.total_usd} USD'
        create_staff_message(
            command,
            request,
            text=f'Invoice sent / Facture envoyée: {summary}. Open your command page to pay.',
        )
        try:
            notify_command_invoice_sent(command, invoice)
        except Exception:
            pass
        log_staff_action(
            request,
            action='send',
            resource='commands',
            object_label=command.tracking_code or str(command.id),
            object_id=str(command.id),
            subaction='invoice',
        )
        return Response(CommandInvoiceSerializer(invoice).data)


class CommandInvoicePdfView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, invoice_id):
        from .command_invoice import command_invoice_pdf_response
        from .tracking import get_command_for_code, get_command_for_user

        invoice = CommandInvoice.objects.select_related('command').filter(id=invoice_id).first()
        if not invoice:
            return Response({'detail': 'Not found.'}, status=404)
        command = invoice.command
        user = request.user
        code = request.query_params.get('code')
        command_id = request.query_params.get('command_id')
        allowed = False
        if user.is_authenticated and not user.is_staff:
            try:
                get_command_for_user(user, command.id)
                allowed = True
            except Exception:
                allowed = False
        if code:
            try:
                tracked = get_command_for_code(code)
                allowed = tracked.id == command.id
            except Exception:
                pass
        if user.is_staff:
            allowed = True
        if not allowed:
            return Response({'detail': 'Forbidden.'}, status=403)
        return command_invoice_pdf_response(invoice, command)


class AdminCommentListView(generics.ListAPIView):
    queryset = Comment.objects.select_related('project').order_by('-timestamp')[:200]
    serializer_class = CommentSerializer
    permission_classes = [CanDeleteComment]


class AdminCommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Comment.objects.select_related('project').all()
    permission_classes = [CanDeleteComment]
    lookup_field = 'id'

    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return CommentAdminUpdateSerializer
        return CommentSerializer

    def perform_update(self, serializer):
        instance = serializer.save()
        log_staff_action(
            self.request,
            action='update',
            resource='comments',
            object_label=instance.project.title if instance.project_id else str(instance.id),
            object_id=str(instance.id),
        )

    def perform_destroy(self, instance):
        log_staff_action(
            self.request,
            action='delete',
            resource='comments',
            object_label=instance.project.title if instance.project_id else str(instance.id),
            object_id=str(instance.id),
            before={'author': instance.author_name},
        )
        super().perform_destroy(instance)


class AdminStoreCommentListView(generics.ListAPIView):
    queryset = StoreProductComment.objects.select_related('product').order_by('-timestamp')[:200]
    serializer_class = StoreProductCommentSerializer
    permission_classes = [CanEditStore]


class AdminStoreCommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = StoreProductComment.objects.select_related('product').all()
    permission_classes = [CanEditStore]
    lookup_field = 'id'

    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return StoreProductCommentAdminUpdateSerializer
        return StoreProductCommentSerializer

    def perform_update(self, serializer):
        instance = serializer.save()
        log_staff_action(
            self.request,
            action='update',
            resource='store/comments',
            object_label=instance.product.name if instance.product_id else str(instance.id),
            object_id=str(instance.id),
        )

    def perform_destroy(self, instance):
        log_staff_action(
            self.request,
            action='delete',
            resource='store/comments',
            object_label=instance.product.name if instance.product_id else str(instance.id),
            object_id=str(instance.id),
            before={'author': instance.author_name},
        )
        super().perform_destroy(instance)


class AdminUserListCreateView(generics.ListCreateAPIView):
    permission_classes = [CanManageUsers]

    def get_queryset(self):
        return User.objects.filter(is_staff=True).order_by('username')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AdminUserCreateSerializer
        return AdminUserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        log_staff_action(
            self.request,
            action='create',
            resource='users',
            object_label=user.username,
            object_id=str(user.id),
            after={'permissions': serializer.validated_data.get('permissions', [])},
            request_data=dict(serializer.validated_data),
        )


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [CanManageUsers]
    lookup_field = 'id'

    def get_queryset(self):
        return User.objects.filter(is_staff=True)

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return AdminUserUpdateSerializer
        return AdminUserSerializer

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        before = {'username': instance.username, 'email': instance.email}
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_staff_action(
            request,
            action='update',
            resource='users',
            object_label=user.username,
            object_id=str(user.id),
            before=before,
            after={
                'email': user.email,
                'permissions': serializer.validated_data.get('permissions'),
            },
            request_data=dict(serializer.validated_data),
        )
        return Response(AdminUserSerializer(user).data)


class AdminDashboardView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        from django.conf import settings

        from .models import StoreOrder, StoreProduct
        from .staff_permissions import (
            staff_can_edit_store,
            staff_can_manage_store_orders,
            staff_has_any_perm,
            staff_has_perm,
        )

        user = request.user
        can_commands = staff_has_perm(user, 'view_commands')
        can_contact = staff_has_perm(user, 'view_contact_messages') or can_commands
        can_orders = staff_can_manage_store_orders(user)
        can_catalog = staff_can_edit_store(user)
        can_projects = staff_has_any_perm(user, 'post_project', 'edit_project')
        can_ops = user.is_superuser or staff_has_perm(user, 'manage_store')

        payload = {
            'access': {
                'commands': can_commands,
                'contact_messages': can_contact,
                'store_orders': can_orders,
                'store_catalog': can_catalog,
                'projects': can_projects,
                'operations': can_ops,
            },
        }

        if can_commands:
            payload['pending_commands'] = ProjectCommand.objects.filter(
                status=ProjectCommand.Status.PENDING,
            ).count()
            payload['sla_command_reply_hours'] = getattr(
                settings, 'SLA_COMMAND_REPLY_HOURS', 48,
            )

        if can_contact:
            from .models import ContactMessage

            payload['new_contact_messages'] = ContactMessage.objects.filter(
                status=ContactMessage.Status.NEW,
            ).count()

        if can_orders:
            payload['unpaid_orders'] = StoreOrder.objects.filter(
                status__in=[StoreOrder.Status.PENDING, StoreOrder.Status.PROCESSING],
            ).exclude(payment_status=StoreOrder.PaymentStatus.PAID).count()
            payload['sla_ship_days_after_payment'] = getattr(
                settings, 'SLA_SHIP_DAYS_AFTER_PAYMENT', 5,
            )

        if can_catalog:
            threshold = getattr(settings, 'STORE_LOW_STOCK_THRESHOLD', 3)
            payload['low_stock_products'] = StoreProduct.objects.filter(
                is_active=True,
                stock_qty__gt=0,
                stock_qty__lte=threshold,
            ).count()

        if can_ops or can_commands or can_orders:
            payload['contact_email'] = getattr(settings, 'CONTACT_EMAIL', '')
            payload['whatsapp_url'] = getattr(settings, 'WHATSAPP_SUPPORT_URL', '')

        if can_ops or can_catalog or can_projects:
            payload['cloudinary_enabled'] = 'cloudinary' in (
                settings.STORAGES.get('default', {}).get('BACKEND', '')
            )

        return Response(payload)


class AdminEconomicsView(APIView):
    """Superuser-only revenue summary with estimated payment-provider fees."""

    permission_classes = [CanManageUsers]

    def get(self, request):
        from .economics import build_economics_report

        return Response(
            build_economics_report(
                period=request.query_params.get('period', 'all'),
                date_from=request.query_params.get('from', ''),
                date_to=request.query_params.get('to', ''),
            ),
        )


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


class AdminCommandLayerViewSet(StaffAuditMixin, viewsets.ModelViewSet):
    audit_resource = 'command-layers'
    queryset = CommandLayer.objects.all().order_by('sort_order', 'name')
    serializer_class = AdminCommandLayerSerializer
    permission_classes = [CanManageCommandLayers]
    lookup_field = 'id'


class AdminCommandLayerBundleViewSet(StaffAuditMixin, viewsets.ModelViewSet):
    audit_resource = 'command-layer-bundles'
    queryset = CommandLayerBundle.objects.all().order_by('sort_order', 'name')
    serializer_class = AdminCommandLayerBundleSerializer
    permission_classes = [CanManageCommandLayers]
    lookup_field = 'id'


class AdminAmazonSearchView(APIView):
    """Staff-only Amazon product search for project BOM linking."""

    permission_classes = [IsStaffUser]

    def get(self, request):
        query = (request.query_params.get('q') or '').strip()
        if len(query) < 2:
            return Response({'detail': 'Enter at least 2 characters to search.'}, status=400)
        domain = (request.query_params.get('domain') or 'amazon.com').strip().lower()
        try:
            results = search_amazon_products(query, domain=domain, limit=10)
        except RuntimeError as exc:
            return Response({'detail': str(exc)}, status=502)
        return Response({'results': results})


class AdminSubscriptionPackViewSet(StaffAuditMixin, viewsets.ModelViewSet):
    audit_resource = 'packs'
    queryset = SubscriptionPack.objects.prefetch_related('projects').all()
    serializer_class = SubscriptionPackAdminSerializer
    lookup_field = 'id'
    permission_classes = [CanManagePacks]
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class AdminStaffAuditLogListView(generics.ListAPIView):
    """Superuser-only history of staff actions on the admin API."""

    serializer_class = StaffAuditLogSerializer
    permission_classes = [CanManageUsers]

    def get_queryset(self):
        qs = StaffAuditLog.objects.select_related('actor').all()
        staff = (self.request.query_params.get('staff') or '').strip()
        resource = (self.request.query_params.get('resource') or '').strip()
        action = (self.request.query_params.get('action') or '').strip()
        if staff:
            qs = qs.filter(actor_username__icontains=staff)
        if resource:
            qs = qs.filter(resource=resource)
        if action:
            qs = qs.filter(action=action)
        return qs[:500]

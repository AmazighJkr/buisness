import uuid
import secrets

from django.conf import settings
from django.db import models


class ProjectCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
    )
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = 'Project categories'
        ordering = ['sort_order', 'name']
        permissions = [
            ('manage_categories', 'Can manage categories'),
        ]

    def __str__(self):
        if self.parent_id:
            return f'{self.parent.name} → {self.name}'
        return self.name

    @property
    def is_top_level(self):
        return self.parent_id is None


class Project(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subcategory = models.ForeignKey(
        ProjectCategory,
        on_delete=models.PROTECT,
        related_name='projects',
        limit_choices_to={'parent__isnull': False},
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    materials = models.JSONField(default=list, blank=True)
    wiring = models.JSONField(default=list, blank=True)
    schematic_image = models.ImageField(upload_to='projects/schematics/', blank=True, null=True)
    simulation_url = models.URLField(blank=True)
    video_url = models.URLField(blank=True)
    libraries = models.TextField(blank=True)
    source_code = models.TextField(blank=True)
    code_files = models.JSONField(default=list, blank=True)
    is_featured = models.BooleanField(
        default=False,
        help_text='Show in trending/default grid on Projects page',
    )
    is_free = models.BooleanField(
        default=False,
        help_text='Visible to everyone without a subscription pack',
    )
    featured_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-featured_order', '-created_at']
        permissions = [
            ('post_project', 'Can post projects'),
            ('edit_project', 'Can edit projects'),
        ]

    def __str__(self):
        return self.title

    @property
    def libraries_list(self):
        if not self.libraries:
            return []
        return [x.strip() for x in self.libraries.split(',') if x.strip()]

    @property
    def code_files_list(self):
        if self.code_files:
            return self.code_files
        if self.source_code and self.source_code.strip():
            return [{'title': 'main', 'code': self.source_code}]
        return []


class ProjectCommand(models.Model):
    class Status(models.TextChoices):
        PENDING = 'Pending', 'Pending'
        ACCEPTED = 'Accepted', 'Accepted'
        IN_DESIGN = 'In_Design', 'In Design'
        PROTOTYPING = 'Prototyping', 'Prototyping'
        TESTING = 'Testing', 'Testing'
        SHIPPED = 'Shipped', 'Shipped'

    class PaymentStatus(models.TextChoices):
        NONE = 'none', 'None'
        PENDING = 'pending', 'Pending'
        PAID = 'paid', 'Paid'
        WAIVED = 'waived', 'Waived'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='project_commands',
    )
    client_name = models.CharField(max_length=120, blank=True)
    client_email = models.EmailField(blank=True)
    associated_project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='commands',
    )
    idea_description = models.TextField()
    price_limit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    objectives = models.TextField(blank=True)
    problems = models.TextField(blank=True)
    attachment = models.FileField(upload_to='commands/', blank=True, null=True)
    access_token = models.CharField(max_length=64, unique=True, editable=False)
    tracking_code = models.CharField(max_length=12, unique=True, editable=False, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    quoted_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Bill amount in USD when accepted (Stripe)',
    )
    quoted_price_dzd = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Bill amount in DZD when accepted (Chargily)',
    )
    payment_status = models.CharField(
        max_length=10,
        choices=PaymentStatus.choices,
        default=PaymentStatus.NONE,
    )
    accepted_at = models.DateTimeField(null=True, blank=True)
    staff_response = models.TextField(blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    responded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='command_responses',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    selected_layers = models.JSONField(
        default=list,
        blank=True,
        help_text='Snapshot of chosen command layers [{id, slug, name, price_usd, price_dzd}]',
    )
    estimated_total_usd = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )
    estimated_total_dzd = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ['-created_at']
        permissions = [
            ('view_commands', 'Can view commands'),
            ('respond_commands', 'Can respond to commands'),
        ]

    def __str__(self):
        label = self.client_name or self.client_email or str(self.id)[:8]
        return f'Command {label}'

    def save(self, *args, **kwargs):
        if not self.access_token:
            self.access_token = secrets.token_urlsafe(24)
        if not self.tracking_code:
            from .tracking import generate_tracking_code
            self.tracking_code = generate_tracking_code()
        super().save(*args, **kwargs)


class CommandLayer(models.Model):
    """Add-on scope clients pick when submitting a custom command (priced building blocks)."""

    class Group(models.TextChoices):
        FIRMWARE = 'firmware', 'Firmware & embedded'
        MOBILE = 'mobile', 'Mobile apps'
        CLOUD = 'cloud', 'Server & web'
        WIRELESS = 'wireless', 'Wireless & connectivity'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=80, unique=True)
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    group = models.CharField(
        max_length=20,
        choices=Group.choices,
        default=Group.FIRMWARE,
    )
    price_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    price_dzd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_required = models.BooleanField(
        default=False,
        help_text='Always included in every new command (e.g. basic firmware).',
    )
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name


class CommandLayerBundle(models.Model):
    """Preset combinations of command layers (e.g. full IoT stack)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=80, unique=True)
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    layer_ids = models.JSONField(
        default=list,
        help_text='List of CommandLayer UUID strings included in this preset.',
    )
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name


class CommandMessage(models.Model):
    class AuthorRole(models.TextChoices):
        CLIENT = 'client', 'Client'
        STAFF = 'staff', 'Staff'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    command = models.ForeignKey(
        ProjectCommand,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    role = models.CharField(max_length=10, choices=AuthorRole.choices)
    author_name = models.CharField(max_length=120)
    text = models.TextField(blank=True)
    link_url = models.URLField(blank=True)
    image = models.ImageField(upload_to='commands/messages/', blank=True, null=True)
    staff_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='command_messages',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.author_name} ({self.role}) on {self.command_id}'


class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='comments',
    )
    author_name = models.CharField(max_length=120)
    text = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']
        permissions = [
            ('moderate_comment', 'Can delete comments'),
        ]

    def __str__(self):
        return f'{self.author_name} on {self.project.title}'


class SubscriptionPack(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=80, unique=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='USD price for Stripe (international)',
    )
    price_dzd = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text='DZD price for Chargily (Algeria)',
    )
    duration_days = models.PositiveIntegerField(
        default=30,
        help_text='Access length after payment',
    )
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    projects = models.ManyToManyField(
        Project,
        blank=True,
        related_name='packs',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'name']
        permissions = [
            ('manage_packs', 'Can manage subscription packs'),
        ]

    def __str__(self):
        return self.name


class StoreCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='store/categories/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'name']
        permissions = [
            ('manage_store', 'Can manage store catalog'),
        ]

    def __str__(self):
        return self.name


class StoreProduct(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(
        StoreCategory,
        on_delete=models.PROTECT,
        related_name='products',
    )
    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True)
    short_description = models.TextField(blank=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='store/products/', blank=True, null=True)
    price_usd = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    price_dzd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stock_qty = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_featured', 'sort_order', 'name']

    def __str__(self):
        return self.name


class StoreProductImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        StoreProduct,
        on_delete=models.CASCADE,
        related_name='gallery',
    )
    image = models.ImageField(upload_to='store/products/gallery/')
    alt_text = models.CharField(max_length=160, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']

    def __str__(self):
        return f'{self.product.name} image'


class StoreStockReservation(models.Model):
    """Short-lived stock hold during cart validation / checkout."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reservation_key = models.CharField(max_length=64, db_index=True)
    product = models.ForeignKey(
        StoreProduct,
        on_delete=models.CASCADE,
        related_name='stock_reservations',
    )
    quantity = models.PositiveIntegerField(default=1)
    order = models.ForeignKey(
        'StoreOrder',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='stock_reservations',
    )
    expires_at = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['reservation_key', 'product']),
        ]

    def __str__(self):
        return f'{self.product_id} x{self.quantity} ({self.reservation_key[:8]}…)'


class StoreWilaya(models.Model):
    """Algerian wilaya for store shipping."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=2, unique=True, db_index=True)
    name = models.CharField(max_length=80)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['code']
        verbose_name_plural = 'Store wilayas'

    def __str__(self):
        return f'{self.code} — {self.name}'


class StorePostalCode(models.Model):
    """Postal code with home / bureau shipping rates (DZD). Hidden until prices are set."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wilaya = models.ForeignKey(
        StoreWilaya,
        on_delete=models.CASCADE,
        related_name='postal_codes',
    )
    postal_code = models.CharField(max_length=10, db_index=True)
    city = models.CharField(max_length=80, blank=True)
    price_home_dzd = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )
    price_bureau_dzd = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['wilaya__code', 'postal_code']
        unique_together = [['wilaya', 'postal_code']]
        verbose_name = 'Postal code (shipping)'

    def __str__(self):
        return f'{self.postal_code} ({self.wilaya.name})'


class StoreOrder(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        SHIPPED = 'shipped', 'Shipped'
        DELIVERED = 'delivered', 'Delivered'
        CANCELLED = 'cancelled', 'Cancelled'

    class PaymentStatus(models.TextChoices):
        NONE = 'none', 'None'
        PENDING = 'pending', 'Pending payment'
        PAID = 'paid', 'Paid'
        FAILED = 'failed', 'Failed'
        WAIVED = 'waived', 'Waived'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=20, unique=True, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='store_orders',
    )
    customer_name = models.CharField(max_length=120)
    customer_first_name = models.CharField(max_length=60, blank=True)
    customer_last_name = models.CharField(max_length=60, blank=True)
    customer_email = models.EmailField()
    customer_phone = models.CharField(max_length=40, blank=True)
    shipping_address = models.TextField()
    address_line1 = models.CharField(max_length=200, blank=True)
    address_line2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=80, blank=True)
    wilaya = models.ForeignKey(
        StoreWilaya,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
    )
    postal_code = models.CharField(max_length=10, blank=True, db_index=True)
    class DeliveryType(models.TextChoices):
        HOME = 'home', 'Home'
        BUREAU = 'bureau', 'Bureau / relay'

    delivery_type = models.CharField(
        max_length=10,
        choices=DeliveryType.choices,
        blank=True,
    )
    shipping_dzd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    payment_status = models.CharField(
        max_length=12,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    total_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_dzd = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    admin_notes = models.TextField(blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.order_number


class StoreOrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        StoreOrder,
        on_delete=models.CASCADE,
        related_name='items',
    )
    product = models.ForeignKey(
        StoreProduct,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order_items',
    )
    product_name = models.CharField(max_length=160)
    product_slug = models.SlugField(max_length=180, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price_usd = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unit_price_dzd = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ['product_name']

    def __str__(self):
        return f'{self.product_name} x{self.quantity}'


class UserSubscription(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending payment'
        ACTIVE = 'active', 'Active'
        EXPIRED = 'expired', 'Expired'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscriptions',
    )
    pack = models.ForeignKey(
        SubscriptionPack,
        on_delete=models.CASCADE,
        related_name='subscriptions',
    )
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    started_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} → {self.pack.name} ({self.status})'


class UserSocialAuth(models.Model):
    """Links a customer account to Google (or other providers later)."""

    class Provider(models.TextChoices):
        GOOGLE = 'google', 'Google'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='social_auth',
    )
    provider = models.CharField(max_length=32, choices=Provider.choices)
    provider_uid = models.CharField(max_length=255, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['provider', 'provider_uid'],
                name='unique_social_provider_uid',
            ),
        ]

    def __str__(self):
        return f'{self.provider}:{self.provider_uid} → {self.user.username}'

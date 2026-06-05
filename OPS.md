# Operations guide (EmbeddedGrid / Render)

## Single inbox

Route all operational email to one mailbox you check daily:

| Variable | Purpose |
|----------|---------|
| `CONTACT_EMAIL` | Public contact + default sender context |
| `COMMAND_NOTIFY_EMAIL` | New custom commands (falls back to `CONTACT_EMAIL`) |
| `DEFAULT_FROM_EMAIL` | SMTP From header |

On Render, set SMTP (e.g. SendGrid, Mailgun, or your host):

```env
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_HOST_USER=...
EMAIL_HOST_PASSWORD=...
EMAIL_USE_TLS=true
DEFAULT_FROM_EMAIL=contact@yourdomain.com
CONTACT_EMAIL=contact@yourdomain.com
COMMAND_NOTIFY_EMAIL=contact@yourdomain.com
```

Clients receive **bilingual EN/FR** emails when:

- A custom command is received
- A quote is ready (status → Accepted with price)
- Command status changes
- A store order is created
- A store order is shipped

## Internal SLA (configurable)

```env
SLA_COMMAND_REPLY_HOURS=48
SLA_SHIP_DAYS_AFTER_PAYMENT=5
STORE_LOW_STOCK_THRESHOLD=3
```

Shown on the admin **Dashboard** tab. Adjust to match your real commitments.

## Weekly backup (Postgres on Render)

1. **Database** — From Render dashboard → Postgres → *Connect* → use `pg_dump`:
   ```bash
   pg_dump "$DATABASE_URL" -Fc -f embeddedgrid-$(date +%Y%m%d).dump
   ```
   Store dumps off Render (S3, Google Drive, encrypted disk). Test restore quarterly.

2. **Media** — With `CLOUDINARY_URL` set, product images and project schematics live in Cloudinary (survive redeploys). Back up Cloudinary via their dashboard or API if needed.

3. **Without Cloudinary** — Files sit on ephemeral disk; they are **lost on redeploy**. Use Cloudinary in production.

## Cloudinary on production

In Render → Environment:

```env
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

Django uses Cloudinary as default file storage when this is set. Re-upload is not needed after redeploy.

Also set:

```env
PUBLIC_SITE_URL=https://your-app.onrender.com
WHATSAPP_SUPPORT_URL=https://wa.me/213XXXXXXXXX
```

## Staff permissions

When creating/editing staff in **Admin → Staff**:

| Permission | Access |
|------------|--------|
| `manage_command_layers` | Command layer bundles & pricing |
| `post_store` | Add new store products |
| `edit_store` | Categories, edit products, shipping/postal codes |
| `manage_store_orders` | Fulfillment, payment status, invoice PDF |
| `manage_store` | Legacy full store access (all of the above + legal pages) |

Superusers can create and edit all staff accounts.

## Staff activity log

All successful **POST / PATCH / PUT / DELETE** requests to `/api/admin/*` by staff are stored in `StaffAuditLog` (who, what, when, summary, sanitized payload). Superusers review them in **Admin → Activity** or Django admin → Staff audit logs.

## Invoice PDFs

- **Customers**: order track page → *Download invoice* (order number + checkout email).
- **Staff**: Admin → Orders → *Download invoice PDF* (`reportlab` required on server).

Install on Render via `requirements.txt` (`reportlab`).

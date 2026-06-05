"""Simple PDF invoice for store orders (Algeria / DZD)."""

import io
from decimal import Decimal

from django.http import HttpResponse


def build_order_invoice_pdf(order) -> bytes:
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.pdfgen import canvas
    except ImportError as exc:
        raise RuntimeError('reportlab is required for PDF invoices') from exc

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    w, h = A4
    y = h - 25 * mm
    from django.conf import settings

    company = getattr(settings, 'ENTERPRISE_DISPLAY_NAME', 'EmbeddedGrid')
    contact = getattr(settings, 'CONTACT_EMAIL', '') or ''

    c.setFont('Helvetica-Bold', 16)
    c.drawString(20 * mm, y, company)
    y -= 6 * mm
    if contact:
        c.setFont('Helvetica', 9)
        c.drawString(20 * mm, y, contact)
        y -= 6 * mm
    c.setFont('Helvetica', 10)
    c.drawString(20 * mm, y, f'Invoice / Facture — {order.order_number}')
    y -= 12 * mm

    c.drawString(20 * mm, y, f'Customer / Client: {order.customer_name}')
    y -= 6 * mm
    c.drawString(20 * mm, y, f'Email: {order.customer_email}')
    y -= 6 * mm
    c.drawString(20 * mm, y, f'Phone / Tél: {order.customer_phone or "—"}')
    y -= 6 * mm
    addr = order.address_line1 or order.shipping_address or '—'
    c.drawString(20 * mm, y, f'Address / Adresse: {addr[:80]}')
    y -= 6 * mm
    c.drawString(20 * mm, y, f'City / Ville: {order.city} — {order.postal_code}')
    y -= 12 * mm

    c.setFont('Helvetica-Bold', 11)
    c.drawString(20 * mm, y, 'Items / Articles')
    y -= 7 * mm
    c.setFont('Helvetica', 10)
    for line in order.items.all():
        total_line = line.unit_price_dzd * line.quantity
        c.drawString(22 * mm, y, f'{line.product_name} x{line.quantity} — {total_line} DZD')
        y -= 6 * mm

    y -= 4 * mm
    shipping = order.shipping_dzd or Decimal('0')
    c.drawString(20 * mm, y, f'Shipping / Livraison: {shipping} DZD')
    y -= 8 * mm
    c.setFont('Helvetica-Bold', 12)
    c.drawString(20 * mm, y, f'Total TTC: {order.total_dzd} DZD')
    y -= 10 * mm
    c.setFont('Helvetica', 9)
    c.drawString(20 * mm, y, f'Payment / Paiement: {order.get_payment_status_display()}')
    y -= 5 * mm
    c.drawString(20 * mm, y, f'Status / Statut: {order.get_status_display()}')

    c.showPage()
    c.save()
    return buffer.getvalue()


def invoice_pdf_response(order) -> HttpResponse:
    pdf = build_order_invoice_pdf(order)
    response = HttpResponse(pdf, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="invoice-{order.order_number}.pdf"'
    return response

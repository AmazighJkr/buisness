"""PDF facture / invoice for custom commands (upgrades, quotes)."""

import io
from decimal import Decimal

from django.http import HttpResponse


def _line_total(qty, unit) -> Decimal:
    try:
        q = Decimal(str(qty or 1))
        u = Decimal(str(unit or 0))
    except Exception:
        return Decimal('0')
    return q * u


def compute_invoice_totals(line_items) -> tuple[Decimal, Decimal]:
    total_usd = Decimal('0')
    total_dzd = Decimal('0')
    for row in line_items or []:
        if not isinstance(row, dict):
            continue
        qty = row.get('qty') or 1
        total_usd += _line_total(qty, row.get('unit_usd'))
        total_dzd += _line_total(qty, row.get('unit_dzd'))
    return total_usd, total_dzd


def build_command_invoice_pdf(invoice, command) -> bytes:
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.pdfgen import canvas
    except ImportError as exc:
        raise RuntimeError('reportlab is required for PDF invoices') from exc

    from django.conf import settings

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    _w, h = A4
    y = h - 25 * mm
    company = getattr(settings, 'ENTERPRISE_DISPLAY_NAME', 'EmbeddedGrid')
    contact = getattr(settings, 'CONTACT_EMAIL', '') or ''

    c.setFont('Helvetica-Bold', 16)
    c.drawString(20 * mm, y, company)
    y -= 6 * mm
    if contact:
        c.setFont('Helvetica', 9)
        c.drawString(20 * mm, y, contact)
        y -= 6 * mm

    c.setFont('Helvetica-Bold', 12)
    c.drawString(20 * mm, y, invoice.title or 'Facture / Invoice')
    y -= 7 * mm
    c.setFont('Helvetica', 10)
    c.drawString(20 * mm, y, f'Command / Commande: {command.tracking_code}')
    y -= 6 * mm
    c.drawString(20 * mm, y, f'Client: {command.client_name or "—"}')
    y -= 6 * mm
    c.drawString(20 * mm, y, f'Email: {command.client_email or "—"}')
    y -= 10 * mm

    c.setFont('Helvetica-Bold', 11)
    c.drawString(20 * mm, y, 'Details / Détails')
    y -= 7 * mm
    c.setFont('Helvetica', 9)

    for row in invoice.line_items or []:
        if not isinstance(row, dict):
            continue
        label = (row.get('label') or 'Item')[:60]
        desc = (row.get('description') or '').strip()
        qty = row.get('qty') or 1
        usd = _line_total(qty, row.get('unit_usd'))
        dzd = _line_total(qty, row.get('unit_dzd'))
        price_bits = []
        if usd > 0:
            price_bits.append(f'{usd} USD')
        if dzd > 0:
            price_bits.append(f'{dzd} DZD')
        price_str = ' · '.join(price_bits) if price_bits else '—'
        c.drawString(22 * mm, y, f'• {label} x{qty} — {price_str}')
        y -= 5 * mm
        if desc:
            c.drawString(26 * mm, y, desc[:90])
            y -= 5 * mm
        if y < 40 * mm:
            c.showPage()
            y = h - 25 * mm

    y -= 4 * mm
    c.setFont('Helvetica-Bold', 11)
    if invoice.total_usd and invoice.total_usd > 0:
        c.drawString(20 * mm, y, f'Total USD: {invoice.total_usd}')
        y -= 6 * mm
    if invoice.total_dzd and invoice.total_dzd > 0:
        c.drawString(20 * mm, y, f'Total DZD: {invoice.total_dzd}')
        y -= 8 * mm

    if invoice.notes:
        c.setFont('Helvetica', 9)
        for line in invoice.notes.splitlines()[:12]:
            c.drawString(20 * mm, y, line[:95])
            y -= 5 * mm

    y -= 4 * mm
    c.setFont('Helvetica', 9)
    c.drawString(20 * mm, y, f'Payment status / Paiement: {command.get_payment_status_display()}')
    y -= 5 * mm
    c.drawString(20 * mm, y, f'Project status / Statut: {command.get_status_display()}')

    c.showPage()
    c.save()
    return buffer.getvalue()


def command_invoice_pdf_response(invoice, command) -> HttpResponse:
    pdf = build_command_invoice_pdf(invoice, command)
    response = HttpResponse(pdf, content_type='application/pdf')
    code = command.tracking_code or str(invoice.id)[:8]
    response['Content-Disposition'] = f'attachment; filename="facture-{code}.pdf"'
    return response

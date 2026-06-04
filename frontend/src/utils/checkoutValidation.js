const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isAlgeriaPhone(raw) {
  let digits = (raw || '').replace(/\D/g, '')
  if (digits.startsWith('213')) digits = digits.slice(3)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits.length === 9 && /^[567]/.test(digits)
}

export function validateCheckoutForm(form, { shippingQuote, acceptedTerms, captchaAnswer, t }) {
  const errors = {}

  if (!form.first_name?.trim()) errors.first_name = t('checkout.errFirstName')
  if (!form.last_name?.trim()) errors.last_name = t('checkout.errLastName')
  if (!form.customer_email?.trim() || !EMAIL_RE.test(form.customer_email.trim())) {
    errors.customer_email = t('checkout.errEmail')
  }
  if (!isAlgeriaPhone(form.customer_phone)) errors.customer_phone = t('checkout.errPhone')
  if (!form.address_line1?.trim()) errors.address_line1 = t('checkout.errAddress')
  if (!form.city?.trim()) errors.city = t('checkout.errCity')
  if (!form.postal_code?.trim()) errors.postal_code = t('checkout.errPostal')
  if (!shippingQuote) errors.shipping = t('checkout.selectShipping')
  if (!acceptedTerms) errors.terms = t('checkout.errTerms')
  if (!String(captchaAnswer ?? '').trim()) errors.captcha = t('checkout.errCaptcha')

  return errors
}

export function firstCheckoutError(errors) {
  const order = [
    'first_name',
    'last_name',
    'customer_email',
    'customer_phone',
    'address_line1',
    'city',
    'postal_code',
    'shipping',
    'terms',
    'captcha',
  ]
  for (const key of order) {
    if (errors[key]) return errors[key]
  }
  return ''
}

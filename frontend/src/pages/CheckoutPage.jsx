import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import StoreHeader from '../components/StoreHeader.jsx'
import StoreAlgeriaGate, { StoreNotAvailableInRegion } from '../components/store/StoreAlgeriaGate.jsx'
import {
  createStoreOrder,
  fetchShippingQuote,
  fetchStoreOrderResume,
  fetchUserMe,
  payStoreOrder,
  validateStoreCart,
} from '../api/client.js'
import { useCart } from '../hooks/useCart.js'
import { useStoreRegion } from '../hooks/useStoreRegion.js'
import ShippingLocationCombobox from '../components/store/ShippingLocationCombobox.jsx'
import CheckoutCaptcha from '../components/checkout/CheckoutCaptcha.jsx'
import CheckoutLegalConsent from '../components/checkout/CheckoutLegalConsent.jsx'
import { validateCheckoutForm, firstCheckoutError } from '../utils/checkoutValidation.js'
import {
  clearPendingStoreOrder,
  readPendingStoreOrder,
  savePendingStoreOrder,
} from '../utils/storeCheckout.js'
import { formatDzd } from '../utils/formatMoney.js'
import { useTranslation } from '../context/LocaleContext.jsx'
import {
  clearCartReservationId,
  getCartReservationId,
  setCartReservationId,
} from '../utils/cartReservation.js'

export default function CheckoutPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const resumeOrderId = searchParams.get('order')
  const { items, subtotalDzd, clearCart } = useCart()
  const { loading: regionLoading, isAlgeria, chargily } = useStoreRegion()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [resumeOrder, setResumeOrder] = useState(null)
  const [resumeLoading, setResumeLoading] = useState(false)
  const [cartSnapshot, setCartSnapshot] = useState(null)
  const [cartRefreshError, setCartRefreshError] = useState('')
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [shippingQuote, setShippingQuote] = useState(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    customer_email: '',
    customer_phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    wilaya_id: '',
    postal_code: '',
    delivery_type: 'home',
    notes: '',
  })

  const isResumeMode = Boolean(resumeOrderId)

  useEffect(() => {
    if (location.state?.freshCheckout && resumeOrderId) {
      setSearchParams({}, { replace: true })
    }
  }, [location.state?.freshCheckout, resumeOrderId, setSearchParams])

  useEffect(() => {
    if (chargily) setPaymentMethod((m) => (m === 'cod' ? m : 'chargily'))
  }, [chargily])

  useEffect(() => {
    let cancelled = false
    fetchUserMe()
      .then((me) => {
        if (cancelled) return
        setUser(me)
        if (me) {
          setForm((f) => ({
            ...f,
            first_name: f.first_name || me.first_name || '',
            last_name: f.last_name || '',
            customer_email: f.customer_email || me.email || '',
          }))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!resumeOrderId || !isAlgeria) {
      setResumeOrder(null)
      return
    }
    let cancelled = false
    setResumeLoading(true)
    setError('')
    fetchStoreOrderResume(resumeOrderId)
      .then((data) => {
        if (cancelled) return
        if (data.paid) {
          clearPendingStoreOrder()
          clearCart()
          navigate(`/shop/order?number=${data.order_number}&paid=1`, { replace: true })
          return
        }
        setResumeOrder(data)
        setPaymentMethod('chargily')
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load that order.')
      })
      .finally(() => {
        if (!cancelled) setResumeLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [resumeOrderId, isAlgeria, navigate, clearCart])

  useEffect(() => {
    if (!isAlgeria || items.length === 0) {
      setCartSnapshot(null)
      return
    }
    let cancelled = false
    setCartRefreshError('')
    const resId = getCartReservationId()
    validateStoreCart(items, resId || null)
      .then((data) => {
        if (!cancelled) {
          setCartSnapshot(data)
          if (data.reservation_id) setCartReservationId(data.reservation_id)
        }
      })
      .catch((err) => {
        if (!cancelled) setCartRefreshError(err.message || t('store.loadError'))
      })
    return () => {
      cancelled = true
    }
  }, [isAlgeria, items, t])

  useEffect(() => {
    if (!form.postal_code || !form.delivery_type) {
      setShippingQuote(null)
      return
    }
    let cancelled = false
    fetchShippingQuote(form.postal_code, form.delivery_type)
      .then((q) => {
        if (!cancelled) setShippingQuote(q)
      })
      .catch(() => {
        if (!cancelled) setShippingQuote(null)
      })
    return () => {
      cancelled = true
    }
  }, [form.postal_code, form.delivery_type])

  const displayItems =
    cartSnapshot?.items?.map((row) => ({
      productId: row.product_id,
      name: row.name,
      quantity: row.quantity,
      price_dzd: Number(row.price_dzd),
      line_total_dzd: Number(row.line_total_dzd),
    })) ??
    items.map((row) => ({
      ...row,
      line_total_dzd: row.price_dzd * row.quantity,
    }))

  const productsSubtotal = cartSnapshot
    ? Number(cartSnapshot.subtotal_dzd)
    : subtotalDzd
  const shippingDzd = shippingQuote ? Number(shippingQuote.shipping_dzd) : 0
  const orderTotalDzd = productsSubtotal + shippingDzd

  const selectedPostal = selectedLocation
  const canHome = shippingQuote?.has_home ?? selectedLocation?.has_home
  const canBureau = shippingQuote?.has_bureau ?? selectedLocation?.has_bureau

  useEffect(() => {
    if (!selectedPostal) return
    if (form.delivery_type === 'home' && !canHome && canBureau) {
      setForm((f) => ({ ...f, delivery_type: 'bureau' }))
    }
    if (form.delivery_type === 'bureau' && !canBureau && canHome) {
      setForm((f) => ({ ...f, delivery_type: 'home' }))
    }
  }, [selectedPostal, canHome, canBureau, form.delivery_type])

  const startPayment = async (orderId, method) => {
    setSubmitting(true)
    setError('')
    try {
      const result = await payStoreOrder(orderId, { payment_method: method })
      if (result.checkout_url) {
        const pending = resumeOrder || readPendingStoreOrder() || { id: orderId }
        savePendingStoreOrder(pending)
        window.location.href = result.checkout_url
        return
      }
      if (result.mode === 'cod') {
        clearPendingStoreOrder()
        clearCart()
        clearCartReservationId()
        const num = result.order?.order_number || resumeOrder?.order_number
        navigate(`/shop/order?number=${num}&cod=1`, { replace: true })
        return
      }
      if (result.mode === 'manual') {
        setError(result.instructions || 'Complete payment using the instructions provided.')
        return
      }
      clearPendingStoreOrder()
      clearCart()
      clearCartReservationId()
      navigate(`/shop/order?number=${resumeOrder?.order_number || ''}&paid=1`, { replace: true })
    } catch (err) {
      setError(err.message || 'Payment could not be started.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (items.length === 0) {
      setError(t('checkout.cartEmpty'))
      return
    }
    const errors = validateCheckoutForm(form, {
      shippingQuote,
      acceptedTerms,
      captchaAnswer,
      t,
    })
    if (!captchaToken) errors.captcha = t('checkout.captchaLoadFailed')
    setFieldErrors(errors)
    const firstErr = firstCheckoutError(errors)
    if (firstErr) {
      setError(firstErr)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const order = await createStoreOrder({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        customer_email: form.customer_email.trim(),
        customer_phone: form.customer_phone.trim(),
        address_line1: form.address_line1.trim(),
        address_line2: form.address_line2.trim(),
        city: form.city.trim(),
        postal_code: form.postal_code,
        delivery_type: form.delivery_type,
        notes: form.notes,
        accepted_terms: true,
        captcha_token: captchaToken,
        captcha_answer: String(captchaAnswer).trim(),
        reservation_id: getCartReservationId() || cartSnapshot?.reservation_id || '',
        items: displayItems.map((row) => ({
          product_id: row.productId,
          quantity: row.quantity,
        })),
      })
      savePendingStoreOrder(order)
      const result = await payStoreOrder(order.id, { payment_method: paymentMethod })
      if (result.checkout_url) {
        window.location.href = result.checkout_url
        return
      }
      if (result.mode === 'cod') {
        clearPendingStoreOrder()
        clearCart()
        clearCartReservationId()
        navigate(`/shop/order?number=${order.order_number}&cod=1`, { replace: true })
        return
      }
      if (result.mode === 'manual') {
        clearPendingStoreOrder()
        clearCart()
        clearCartReservationId()
        navigate(`/shop/order?number=${order.order_number}&manual=1`, { replace: true })
        return
      }
      clearPendingStoreOrder()
      clearCart()
      clearCartReservationId()
      navigate(`/shop/order?number=${order.order_number}&paid=1`, { replace: true })
    } catch (err) {
      const msg = err.message || t('checkout.checkoutFailed')
      setError(msg)
      if (/captcha|security check/i.test(msg)) {
        setFieldErrors((prev) => ({ ...prev, captcha: msg }))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const inputErrorClass = (key) =>
    fieldErrors[key] ? 'border-red-500/60' : 'border-dark-border'

  const startNewCheckout = () => {
    setSearchParams({}, { replace: true })
    setResumeOrder(null)
    setError('')
  }

  if (!regionLoading && !isAlgeria) {
    return <StoreNotAvailableInRegion />
  }

  if (isResumeMode && (resumeLoading || loading)) {
    return (
      <StoreAlgeriaGate loading={regionLoading}>
        <div className="page-shell">
          <StoreHeader highlight="/shop/checkout" />
          <main className="mx-auto max-w-lg p-6 text-center text-sm text-dark-muted animate-pulse">
            {t('checkout.loadingOrder')}
          </main>
        </div>
      </StoreAlgeriaGate>
    )
  }

  if (isResumeMode && resumeOrder) {
    return (
      <StoreAlgeriaGate loading={regionLoading}>
        <div className="page-shell">
          <StoreHeader highlight="/shop/checkout" />
          <main className="mx-auto max-w-lg p-4 sm:p-6">
            <h1 className="text-2xl font-semibold">{t('checkout.completePayment')}</h1>
            <p className="mt-1 text-sm text-dark-muted">
              {t('checkout.orderLabel')}{' '}
              <span className="font-mono text-dark-text">{resumeOrder.order_number}</span>
            </p>

            <div className="panel mt-6 p-4">
              <p className="text-sm font-semibold">{formatDzd(Number(resumeOrder.total_dzd))}</p>
              <ul className="mt-3 space-y-1 border-t border-dark-border pt-3 text-sm text-dark-muted">
                {resumeOrder.items?.map((line) => (
                  <li key={line.id}>
                    {line.product_name} × {line.quantity}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-dark-muted">{t('checkout.cartUnchanged')}</p>

              {error && (
                <p className="mt-3 border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              <div className="mt-4 flex flex-col gap-2">
                {chargily && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => startPayment(resumeOrder.id, 'chargily')}
                    className="btn-primary w-full"
                  >
                    {submitting ? t('checkout.openingChargily') : t('checkout.payChargily')}
                  </button>
                )}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => startPayment(resumeOrder.id, 'cod')}
                  className="w-full rounded border border-dark-border px-4 py-2 text-sm hover:border-lab-cyan"
                >
                  {t('checkout.switchCod')}
                </button>
                <button
                  type="button"
                  onClick={startNewCheckout}
                  className="text-xs text-dark-muted hover:text-lab-cyan"
                >
                  {t('checkout.newOrder')}
                </button>
              </div>
            </div>

            {items.length > 0 && (
              <Link to="/shop/cart" className="mt-4 inline-block text-sm text-lab-cyan hover:underline">
                {t('checkout.backToCart')} ({items.length})
              </Link>
            )}
          </main>
        </div>
      </StoreAlgeriaGate>
    )
  }

  return (
    <StoreAlgeriaGate loading={regionLoading}>
      <div className="page-shell">
        <StoreHeader highlight="/shop/checkout" />
        <main className="mx-auto max-w-3xl p-4 sm:p-6">
          <h1 className="text-2xl font-semibold">{t('checkout.title')}</h1>
          <p className="mt-1 text-sm text-dark-muted">{t('checkout.algeriaDzd')}</p>

          {isResumeMode && error && !resumeOrder && (
            <div className="panel mt-6 p-4">
              <p className="text-sm text-red-300">{error}</p>
              <button type="button" onClick={startNewCheckout} className="btn-primary mt-4">
                {t('checkout.newCheckout')}
              </button>
            </div>
          )}

          {loading ? (
            <p className="mt-4 text-sm text-dark-muted animate-pulse">{t('checkout.loading')}</p>
          ) : items.length === 0 ? (
            <div className="panel mt-6 p-6 text-center">
              <p className="text-sm text-dark-muted">{t('checkout.emptyCart')}</p>
              <Link to="/shop/cart" className="btn-primary mt-4 inline-block">
                {t('checkout.viewCart')}
              </Link>
              <Link to="/shop" className="mt-3 block text-xs text-dark-muted hover:underline">
                {t('checkout.continueShopping')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs text-dark-muted">{t('checkout.pricesConfirmed')}</p>
                {cartSnapshot?.reservation_expires_minutes && (
                  <p className="text-xs text-dark-muted">
                    {t('checkout.reservationHint', {
                      minutes: cartSnapshot.reservation_expires_minutes,
                    })}
                  </p>
                )}
                {cartRefreshError && (
                  <p className="border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    {cartRefreshError}
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs text-dark-muted">
                    {t('checkout.firstName')}
                    <input
                      required
                      value={form.first_name}
                      onChange={(e) => {
                        setForm({ ...form, first_name: e.target.value })
                        setFieldErrors((fe) => ({ ...fe, first_name: undefined }))
                      }}
                      className={`mt-1 w-full border bg-dark-bg px-3 py-2 text-sm ${inputErrorClass('first_name')}`}
                    />
                    {fieldErrors.first_name && (
                      <span className="mt-0.5 block text-xs text-red-300">{fieldErrors.first_name}</span>
                    )}
                  </label>
                  <label className="block text-xs text-dark-muted">
                    {t('checkout.lastName')}
                    <input
                      required
                      value={form.last_name}
                      onChange={(e) => {
                        setForm({ ...form, last_name: e.target.value })
                        setFieldErrors((fe) => ({ ...fe, last_name: undefined }))
                      }}
                      className={`mt-1 w-full border bg-dark-bg px-3 py-2 text-sm ${inputErrorClass('last_name')}`}
                    />
                    {fieldErrors.last_name && (
                      <span className="mt-0.5 block text-xs text-red-300">{fieldErrors.last_name}</span>
                    )}
                  </label>
                </div>
                <label className="block text-xs text-dark-muted">
                  {t('checkout.email')}
                  <input
                    type="email"
                    required
                    value={form.customer_email}
                    onChange={(e) => {
                      setForm({ ...form, customer_email: e.target.value })
                      setFieldErrors((fe) => ({ ...fe, customer_email: undefined }))
                    }}
                    className={`mt-1 w-full border bg-dark-bg px-3 py-2 text-sm ${inputErrorClass('customer_email')}`}
                  />
                  {fieldErrors.customer_email && (
                    <span className="mt-0.5 block text-xs text-red-300">{fieldErrors.customer_email}</span>
                  )}
                </label>
                <label className="block text-xs text-dark-muted">
                  {t('checkout.phone')}
                  <input
                    required
                    value={form.customer_phone}
                    onChange={(e) => {
                      setForm({ ...form, customer_phone: e.target.value })
                      setFieldErrors((fe) => ({ ...fe, customer_phone: undefined }))
                    }}
                    className={`mt-1 w-full border bg-dark-bg px-3 py-2 text-sm ${inputErrorClass('customer_phone')}`}
                    placeholder={t('checkout.phonePlaceholder')}
                  />
                  {fieldErrors.customer_phone && (
                    <span className="mt-0.5 block text-xs text-red-300">{fieldErrors.customer_phone}</span>
                  )}
                </label>
                <label className="block text-xs text-dark-muted">
                  {t('checkout.address1')}
                  <input
                    required
                    value={form.address_line1}
                    onChange={(e) => {
                      setForm({ ...form, address_line1: e.target.value })
                      setFieldErrors((fe) => ({ ...fe, address_line1: undefined }))
                    }}
                    className={`mt-1 w-full border bg-dark-bg px-3 py-2 text-sm ${inputErrorClass('address_line1')}`}
                  />
                  {fieldErrors.address_line1 && (
                    <span className="mt-0.5 block text-xs text-red-300">{fieldErrors.address_line1}</span>
                  )}
                </label>
                <label className="block text-xs text-dark-muted">
                  {t('checkout.address2')}
                  <input
                    value={form.address_line2}
                    onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
                    className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs text-dark-muted">
                  {t('checkout.city')}
                  <input
                    required
                    value={form.city}
                    onChange={(e) => {
                      setForm({ ...form, city: e.target.value })
                      setFieldErrors((fe) => ({ ...fe, city: undefined }))
                    }}
                    className={`mt-1 w-full border bg-dark-bg px-3 py-2 text-sm ${inputErrorClass('city')}`}
                  />
                  {fieldErrors.city && (
                    <span className="mt-0.5 block text-xs text-red-300">{fieldErrors.city}</span>
                  )}
                </label>
                <label className="block text-xs text-dark-muted">
                  {t('checkout.searchLocation')}
                  <ShippingLocationCombobox
                    value={selectedLocation}
                    onChange={(row) => {
                      if (!row) {
                        setSelectedLocation(null)
                        setForm((f) => ({ ...f, wilaya_id: '', postal_code: '' }))
                        setFieldErrors((fe) => ({ ...fe, postal_code: undefined, shipping: undefined }))
                        return
                      }
                      setSelectedLocation(row)
                      setForm((f) => ({
                        ...f,
                        wilaya_id: row.wilaya,
                        postal_code: row.postal_code,
                        city: f.city || row.city || '',
                      }))
                      setFieldErrors((fe) => ({ ...fe, postal_code: undefined, shipping: undefined }))
                    }}
                  />
                  {fieldErrors.postal_code && (
                    <span className="mt-0.5 block text-xs text-red-300">{fieldErrors.postal_code}</span>
                  )}
                  {fieldErrors.shipping && (
                    <span className="mt-0.5 block text-xs text-red-300">{fieldErrors.shipping}</span>
                  )}
                  {selectedLocation && !canHome && !canBureau && (
                    <span className="mt-1 block text-amber-300">{t('checkout.noShippingRates')}</span>
                  )}
                </label>
                <fieldset className="space-y-2 text-sm">
                  <legend className="text-xs text-dark-muted">{t('checkout.delivery')}</legend>
                  {canHome && (
                    <label className="flex gap-2">
                      <input
                        type="radio"
                        name="delivery_type"
                        value="home"
                        checked={form.delivery_type === 'home'}
                        onChange={() => setForm({ ...form, delivery_type: 'home' })}
                      />
                      {t('checkout.homeDelivery')}
                    </label>
                  )}
                  {canBureau && (
                    <label className="flex gap-2">
                      <input
                        type="radio"
                        name="delivery_type"
                        value="bureau"
                        checked={form.delivery_type === 'bureau'}
                        onChange={() => setForm({ ...form, delivery_type: 'bureau' })}
                      />
                      {t('checkout.bureauDelivery')}
                    </label>
                  )}
                </fieldset>
                <label className="block text-xs text-dark-muted">
                  {t('checkout.orderNotes')}
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
                  />
                </label>
                <CheckoutLegalConsent
                  accepted={acceptedTerms}
                  onChange={(v) => {
                    setAcceptedTerms(v)
                    setFieldErrors((fe) => ({ ...fe, terms: undefined }))
                  }}
                  error={fieldErrors.terms}
                />
                <CheckoutCaptcha
                  token={captchaToken}
                  answer={captchaAnswer}
                  onTokenChange={setCaptchaToken}
                  onAnswerChange={(v) => {
                    setCaptchaAnswer(v)
                    setFieldErrors((fe) => ({ ...fe, captcha: undefined }))
                  }}
                  error={fieldErrors.captcha}
                />
              </div>

              <div className="panel h-fit p-4">
                <h2 className="font-semibold">{t('checkout.orderSummary')}</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {displayItems.map((row) => (
                    <li key={row.productId} className="flex justify-between gap-2">
                      <span>
                        {row.name} × {row.quantity}
                      </span>
                      <span>{formatDzd(row.line_total_dzd)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex justify-between text-sm text-dark-muted">
                  <span>{t('checkout.subtotal')}</span>
                  <span>{formatDzd(productsSubtotal)}</span>
                </div>
                <div className="mt-1 flex justify-between text-sm text-dark-muted">
                  <span>{t('checkout.shipping')}</span>
                  <span>{shippingQuote ? formatDzd(shippingDzd) : '—'}</span>
                </div>
                <div className="mt-4 flex justify-between border-t border-dark-border pt-3 text-sm font-semibold">
                  <span>{t('checkout.total')}</span>
                  <span>{formatDzd(orderTotalDzd)}</span>
                </div>

                <fieldset className="mt-4 space-y-2 border-t border-dark-border pt-4">
                  <legend className="text-xs font-semibold text-dark-muted">{t('checkout.payment')}</legend>
                  <label className="flex cursor-pointer items-start gap-2 rounded border border-dark-border p-3 has-[:checked]:border-lab-cyan">
                    <input
                      type="radio"
                      name="payment"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="mt-1"
                    />
                    <span className="text-sm">
                      <strong>{t('checkout.codTitle')}</strong>
                      <span className="mt-0.5 block text-xs text-dark-muted">{t('checkout.codHint')}</span>
                    </span>
                  </label>
                  {chargily && (
                    <label className="flex cursor-pointer items-start gap-2 rounded border border-dark-border p-3 has-[:checked]:border-lab-cyan">
                      <input
                        type="radio"
                        name="payment"
                        value="chargily"
                        checked={paymentMethod === 'chargily'}
                        onChange={() => setPaymentMethod('chargily')}
                        className="mt-1"
                      />
                      <span className="text-sm">
                        <strong>{t('checkout.chargilyTitle')}</strong>
                        <span className="mt-0.5 block text-xs text-dark-muted">{t('checkout.chargilyHint')}</span>
                      </span>
                    </label>
                  )}
                </fieldset>

                <p className="mt-2 text-xs text-dark-muted">
                  {user ? t('checkout.linkedAccount') : t('checkout.guestCheckout')}
                </p>
                {error && (
                  <p className="mt-3 border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !shippingQuote ||
                    Boolean(cartRefreshError) ||
                    !acceptedTerms ||
                    !captchaToken ||
                    !String(captchaAnswer).trim()
                  }
                  className="btn-primary mt-4 w-full"
                >
                  {submitting
                    ? t('checkout.processing')
                    : paymentMethod === 'cod'
                      ? t('checkout.placeCod')
                      : t('checkout.placePayCard')}
                </button>
                <Link
                  to="/shop/cart"
                  className="mt-3 block text-center text-xs text-dark-muted hover:underline"
                >
                  {t('checkout.backToCart')}
                </Link>
              </div>
            </form>
          )}
        </main>
      </div>
    </StoreAlgeriaGate>
  )
}

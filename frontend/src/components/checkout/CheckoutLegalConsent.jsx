import { Link } from 'react-router-dom'
import { useTranslation } from '../../context/LocaleContext.jsx'

export default function CheckoutLegalConsent({ accepted, onChange, error }) {
  const { t } = useTranslation()

  return (
    <fieldset className="space-y-3 rounded border border-dark-border p-3">
      <legend className="px-1 text-xs font-semibold text-dark-text">{t('checkout.legalTitle')}</legend>
      <p className="text-xs leading-relaxed text-dark-muted">{t('checkout.privacyNotice')}</p>
      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1"
          required
        />
        <span>
          {t('checkout.acceptTermsBefore')}{' '}
          <Link to="/legal/terms" target="_blank" rel="noopener noreferrer" className="text-lab-cyan underline">
            {t('checkout.termsLink')}
          </Link>{' '}
          {t('checkout.acceptTermsMiddle')}{' '}
          <Link
            to="/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lab-cyan underline"
          >
            {t('checkout.privacyLink')}
          </Link>
          {t('checkout.acceptTermsAfter')}
        </span>
      </label>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </fieldset>
  )
}

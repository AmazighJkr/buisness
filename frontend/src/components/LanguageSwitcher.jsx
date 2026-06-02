import { useTranslation } from '../context/LocaleContext.jsx'

export default function LanguageSwitcher({ compact = false }) {
  const { locale, setLocale, t } = useTranslation()

  return (
    <div
      className={`lang-switcher ${compact ? 'lang-switcher--compact' : ''}`}
      role="group"
      aria-label={t('lang.switch')}
    >
      <button
        type="button"
        className={`lang-switcher__btn ${locale === 'en' ? 'lang-switcher__btn--active' : ''}`}
        onClick={() => setLocale('en')}
        aria-pressed={locale === 'en'}
      >
        EN
      </button>
      <button
        type="button"
        className={`lang-switcher__btn ${locale === 'fr' ? 'lang-switcher__btn--active' : ''}`}
        onClick={() => setLocale('fr')}
        aria-pressed={locale === 'fr'}
      >
        FR
      </button>
    </div>
  )
}

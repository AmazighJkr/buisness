import { Search, X } from 'lucide-react'
import { useTranslation } from '../context/LocaleContext.jsx'

export default function SearchBar({ value, onChange, placeholder, ariaLabel }) {
  const { t } = useTranslation()
  const ph = placeholder || t('common.search')
  const label = ariaLabel || ph

  return (
    <div className="store-search-bar">
      <Search className="store-search-bar__icon" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={ph}
        className="store-search-bar__input"
        aria-label={label}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="store-search-bar__clear"
          aria-label={t('common.clearSearch')}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}

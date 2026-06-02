import SearchBar from '../SearchBar.jsx'
import { useTranslation } from '../../context/LocaleContext.jsx'

export default function StoreSearchBar({ value, onChange, placeholder }) {
  const { t } = useTranslation()
  return (
    <SearchBar
      value={value}
      onChange={onChange}
      placeholder={placeholder || t('store.searchProducts')}
      ariaLabel={t('store.searchProducts')}
    />
  )
}

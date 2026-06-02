import { Search, X } from 'lucide-react'

export default function StoreSearchBar({ value, onChange, placeholder = 'Search products…' }) {
  return (
    <div className="store-search-bar">
      <Search className="store-search-bar__icon" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="store-search-bar__input"
        aria-label="Search products"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="store-search-bar__clear"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}

import { PanelLeftClose } from 'lucide-react'
import { useTranslation } from '../../context/LocaleContext.jsx'

export default function StoreCategorySidebar({
  id,
  categories,
  selectedSlug,
  onSelectCategory,
  open,
  onClose,
}) {
  const { t } = useTranslation()

  return (
    <>
      {open && (
        <button
          type="button"
          className="nav-scrim fixed inset-0 z-40 lg:hidden"
          style={{ top: 'var(--eg-chrome-h, 3.25rem)' }}
          aria-label={t('nav.hideCategories')}
          onClick={onClose}
        />
      )}

      <aside
        id={id}
        className={[
          'flex flex-col border-dark-border bg-dark-panel',
          'fixed left-0 bottom-0 z-50 w-[min(92vw,18rem)] border-r shadow-xl',
          'transition-transform duration-200 ease-out lg:duration-300',
          open ? 'translate-x-0' : '-translate-x-full pointer-events-none',
          'lg:pointer-events-auto lg:static lg:top-auto lg:z-auto lg:shadow-none lg:transition-[width,transform]',
          open
            ? 'lg:w-56 lg:shrink-0 lg:translate-x-0 lg:border-r'
            : 'lg:w-0 lg:overflow-hidden lg:border-r-0 lg:translate-x-0',
        ].join(' ')}
        style={{ top: 'var(--eg-chrome-h, 3.25rem)' }}
        aria-hidden={!open}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-dark-border px-3 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wider text-dark-muted">
            {t('nav.categories')}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-dark-muted hover:bg-dark-border/50 hover:text-dark-text"
            aria-label={t('nav.hideCategories')}
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain p-2">
          <button
            type="button"
            onClick={() => onSelectCategory('')}
            className={`mb-2 w-full rounded px-2 py-2.5 text-left text-sm ${
              !selectedSlug ? 'bg-dark-border text-dark-text' : 'text-dark-muted hover:text-dark-text'
            }`}
          >
            {t('nav.allProducts')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.slug)}
              className={`mb-1 w-full rounded px-2 py-2.5 text-left text-sm ${
                selectedSlug === cat.slug
                  ? 'bg-dark-border text-dark-text'
                  : 'text-dark-muted hover:text-dark-text'
              }`}
            >
              <span className="block truncate">{cat.name}</span>
              <span className="text-xs text-dark-muted">({cat.product_count ?? 0})</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  )
}

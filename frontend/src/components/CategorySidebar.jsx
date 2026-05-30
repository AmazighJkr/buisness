import { ChevronDown, PanelLeftClose, Plus } from 'lucide-react'

export default function CategorySidebar({
  id,
  categories,
  expanded,
  onToggleExpand,
  selectedSubId,
  onSelectSub,
  open,
  onClose,
}) {
  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 top-12 z-40 bg-black/70 lg:hidden"
          aria-label="Close categories"
          onClick={onClose}
        />
      )}

      <aside
        id={id}
        className={[
          'flex flex-col border-dark-border bg-dark-panel',
          // Mobile: drawer under header (top-12 ≈ header height)
          'fixed left-0 top-12 bottom-0 z-50 w-[min(92vw,18rem)] border-r shadow-xl',
          'transition-transform duration-200 ease-out lg:duration-300',
          open ? 'translate-x-0' : '-translate-x-full pointer-events-none',
          // Desktop: in-flow column, width animates (show / hide)
          'lg:pointer-events-auto lg:static lg:top-auto lg:z-auto lg:shadow-none lg:transition-[width,transform]',
          open
            ? 'lg:w-56 lg:shrink-0 lg:translate-x-0 lg:border-r'
            : 'lg:w-0 lg:overflow-hidden lg:border-r-0 lg:translate-x-0',
        ].join(' ')}
        aria-hidden={!open}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-dark-border px-3 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wider text-dark-muted">Categories</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-dark-muted hover:bg-dark-border/50 hover:text-dark-text"
            aria-label="Hide categories"
            title="Hide categories"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain p-2">
          <button
            type="button"
            onClick={() => onSelectSub(null)}
            className={`mb-2 w-full rounded px-2 py-2.5 text-left text-sm ${
              !selectedSubId ? 'bg-dark-border text-dark-text' : 'text-dark-muted hover:text-dark-text'
            }`}
          >
            Trending
          </button>

          {categories.map((cat) => {
            const isOpen = expanded[cat.id]
            return (
              <div key={cat.id} className="mb-1">
                <button
                  type="button"
                  onClick={() => onToggleExpand(cat.id)}
                  className="flex w-full items-center gap-1 rounded px-2 py-2 text-left text-sm text-dark-text hover:bg-dark-border/50"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-dark-muted" />
                  ) : (
                    <Plus className="h-4 w-4 shrink-0 text-dark-muted" />
                  )}
                  <span className="truncate">{cat.name}</span>
                </button>
                {isOpen && (
                  <ul className="ml-5 border-l border-dark-border pl-2">
                    {cat.children?.map((sub) => (
                      <li key={sub.id}>
                        <button
                          type="button"
                          onClick={() => onSelectSub(sub.id)}
                          className={`w-full rounded px-2 py-2 text-left text-xs ${
                            selectedSubId === sub.id
                              ? 'bg-dark-border/60 text-dark-text'
                              : 'text-dark-muted hover:text-dark-text'
                          }`}
                        >
                          {sub.name}
                          <span className="ml-1 text-dark-muted">({sub.project_count})</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

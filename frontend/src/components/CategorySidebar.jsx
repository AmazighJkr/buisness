import { ChevronDown, Plus } from 'lucide-react'

export default function CategorySidebar({
  categories,
  expanded,
  onToggleExpand,
  selectedSubId,
  onSelectSub,
}) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-dark-border bg-dark-panel">
      <div className="border-b border-dark-border px-3 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-dark-muted">Categories</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <button
          type="button"
          onClick={() => onSelectSub(null)}
          className={`mb-2 w-full rounded px-2 py-2 text-left text-sm ${
            !selectedSubId ? 'bg-dark-border text-dark-text' : 'text-dark-muted hover:text-dark-text'
          }`}
        >
          Trending
        </button>

        {categories.map((cat) => {
          const open = expanded[cat.id]
          return (
            <div key={cat.id} className="mb-1">
              <button
                type="button"
                onClick={() => onToggleExpand(cat.id)}
                className="flex w-full items-center gap-1 rounded px-2 py-2 text-left text-sm text-dark-text hover:bg-dark-border/50"
              >
                {open ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-dark-muted" />
                ) : (
                  <Plus className="h-4 w-4 shrink-0 text-dark-muted" />
                )}
                <span className="truncate">{cat.name}</span>
              </button>
              {open && (
                <ul className="ml-5 border-l border-dark-border pl-2">
                  {cat.children?.map((sub) => (
                    <li key={sub.id}>
                      <button
                        type="button"
                        onClick={() => onSelectSub(sub.id)}
                        className={`w-full rounded px-2 py-1.5 text-left text-xs ${
                          selectedSubId === sub.id
                            ? 'text-dark-text'
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
  )
}

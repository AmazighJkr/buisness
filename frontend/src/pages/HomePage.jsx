import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { fetchCategories } from '../api/client.js'

export default function HomePage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-semibold text-theme-fg sm:text-4xl">
          Embedded Systems & IoT Lab
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-theme-muted">
          Browse projects by category. Select a topic to see subcategories and modules.
        </p>
        <Link
          to="/command"
          className="mt-6 inline-block border border-theme-border px-4 py-2 text-sm text-theme-fg panel-hover"
        >
          Submit a project command
        </Link>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-theme-muted">
          Categories
        </h2>

        {error && (
          <p className="border border-theme-border p-4 text-sm text-theme-muted">
            {error}. Start the backend with run.bat
          </p>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((n) => (
              <div key={n} className="panel h-16 animate-pulse" />
            ))}
          </div>
        ) : (
          <ul className="space-y-3">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  to={`/browse/${cat.id}`}
                  className="panel panel-hover flex items-center justify-between px-5 py-4"
                >
                  <div>
                    <span className="text-lg font-medium text-theme-fg">{cat.name}</span>
                    <p className="mt-1 text-xs text-theme-muted">
                      {cat.children?.length || 0} subcategories
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-theme-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

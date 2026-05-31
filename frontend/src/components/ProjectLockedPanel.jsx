import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'

export default function ProjectLockedPanel({ project }) {
  const packs = project.required_packs || []

  return (
    <div className="rounded border border-dark-border bg-dark-panel p-6 text-center">
      <Lock className="mx-auto h-10 w-10 text-dark-muted" />
      <h3 className="mt-3 text-lg font-medium">Subscription required</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-dark-muted">
        {project.description}
      </p>
      {packs.length > 0 && (
        <ul className="mx-auto mt-4 max-w-sm space-y-2 text-left text-sm">
          {packs.map((p) => (
            <li key={p.id} className="flex justify-between border border-dark-border px-3 py-2">
              <span>{p.name}</span>
              <span className="text-dark-muted">${Number(p.price).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link
          to="/subscriptions"
          className="border border-lab-accent px-4 py-2 text-sm text-lab-accent panel-hover"
        >
          View subscription packs
        </Link>
        <Link
          to="/account"
          className="border border-dark-border px-4 py-2 text-sm panel-hover"
        >
          Sign in / Register
        </Link>
      </div>
    </div>
  )
}

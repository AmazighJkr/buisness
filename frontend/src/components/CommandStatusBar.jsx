import { COMMAND_STATUSES, statusLabel } from '../constants/commandStatus.js'

export default function CommandStatusBar({ status }) {
  const currentIndex = COMMAND_STATUSES.findIndex((s) => s.value === status)

  return (
    <div>
      <p className="mb-3 text-sm text-dark-muted">
        Current stage: <span className="text-dark-text">{statusLabel(status)}</span>
      </p>
      <ol className="flex flex-wrap gap-2">
        {COMMAND_STATUSES.map((step, i) => {
          const done = i <= currentIndex
          const active = i === currentIndex
          return (
            <li
              key={step.value}
              className={`border px-2 py-1 text-xs ${
                active
                  ? 'border-lab-cyan text-lab-cyan'
                  : done
                    ? 'border-dark-border text-dark-text'
                    : 'border-dark-border text-dark-muted'
              }`}
            >
              {step.label}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

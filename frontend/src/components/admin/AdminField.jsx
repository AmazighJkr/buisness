export default function AdminField({ label, hint, children, required }) {
  return (
    <label className="block text-xs text-dark-muted">
      <span className="mb-1 block font-medium text-dark-text">
        {label}
        {required ? <span className="text-red-400"> *</span> : null}
      </span>
      {hint ? <span className="mb-1 block text-[10px] leading-snug opacity-80">{hint}</span> : null}
      {children}
    </label>
  )
}

export const adminInputCls =
  'mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm text-dark-text'

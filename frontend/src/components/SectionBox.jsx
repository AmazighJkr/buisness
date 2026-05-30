export default function SectionBox({ title, children, noPadding }) {
  return (
    <section className="lab-panel">
      {title && (
        <div className="lab-panel-header">
          <span className="lab-section-title">{title}</span>
        </div>
      )}
      <div className={noPadding ? '' : 'lab-panel-body'}>{children}</div>
    </section>
  )
}

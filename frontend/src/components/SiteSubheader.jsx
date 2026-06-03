/** Full-width row under the top nav (search, filters, etc.). */
export default function SiteSubheader({ children }) {
  if (!children) return null
  return <div className="site-subheader">{children}</div>
}

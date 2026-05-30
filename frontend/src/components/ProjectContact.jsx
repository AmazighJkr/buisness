import { Link } from 'react-router-dom'
import SectionBox from './SectionBox.jsx'

export default function ProjectContact({ projectId }) {
  return (
    <SectionBox title="Contact">
      <p className="text-sm text-theme-muted">
        Request a custom build or ask a question.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          to={`/command?project=${projectId}`}
          className="border border-theme-border px-4 py-2 text-sm panel-hover"
        >
          Submit command
        </Link>
        <Link to="/contact" className="border border-theme-border px-4 py-2 text-sm text-theme-muted panel-hover">
          Contact page
        </Link>
      </div>
    </SectionBox>
  )
}

import { useState } from 'react'
import { postComment } from '../api/client.js'
import SectionBox from './SectionBox.jsx'

export default function ProjectComments({ projectId, initial = [] }) {
  const [comments, setComments] = useState(initial)
  const [authorName, setAuthorName] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const created = await postComment(projectId, { author_name: authorName, text })
      setComments((prev) => [...prev, created])
      setText('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <SectionBox title="Comments">
      <div className="max-h-48 space-y-3 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-xs text-dark-muted">No comments yet.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="lab-thread-entry">
              <span className="text-dark-muted">{c.author_name}: </span>
              <span>{c.text}</span>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSubmit} className="mt-4 space-y-2 border-t border-dark-border pt-4">
        <input
          placeholder="Name (optional)"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          className="w-full border border-dark-border bg-dark-bg px-2 py-1.5 text-xs outline-none focus:border-dark-border"
        />
        <textarea
          required
          rows={2}
          placeholder="Write a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full border border-dark-border bg-dark-bg px-2 py-1.5 text-xs outline-none focus:border-dark-border"
        />
        {error && <p className="text-xs text-dark-muted">{error}</p>}
        <button
          type="submit"
          className="border border-dark-border px-3 py-1 text-xs panel-hover"
        >
          Post
        </button>
      </form>
    </SectionBox>
  )
}

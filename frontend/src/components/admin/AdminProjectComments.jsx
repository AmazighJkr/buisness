import { useState } from 'react'
import { adminDeleteComment, adminUpdateComment } from '../../api/client.js'
import { useTranslation } from '../../context/LocaleContext.jsx'

export default function AdminProjectComments({ comments, onReload }) {
  const { t } = useTranslation()
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ author_name: '', text: '', rating: '' })

  const startEdit = (row) => {
    setEditingId(row.id)
    setEditForm({
      author_name: row.author_name,
      text: row.text,
      rating: row.rating ?? '',
    })
  }

  const saveEdit = async () => {
    await adminUpdateComment(editingId, {
      author_name: editForm.author_name,
      text: editForm.text,
      rating: editForm.rating === '' ? null : Number(editForm.rating),
    })
    setEditingId(null)
    onReload()
  }

  const remove = async (id) => {
    if (!window.confirm(t('adminStoreComments.confirmDelete'))) return
    await adminDeleteComment(id)
    onReload()
  }

  if (comments.length === 0) {
    return <p className="text-sm text-dark-muted">{t('adminProjectComments.empty')}</p>
  }

  return (
    <ul className="space-y-3 max-w-3xl">
      {comments.map((c) => (
        <li key={c.id} className="border border-dark-border bg-dark-panel p-4 text-sm">
          {editingId === c.id ? (
            <div className="space-y-2">
              <input
                value={editForm.author_name}
                onChange={(e) => setEditForm((f) => ({ ...f, author_name: e.target.value }))}
                className="input-field text-sm"
              />
              <select
                value={editForm.rating}
                onChange={(e) => setEditForm((f) => ({ ...f, rating: e.target.value }))}
                className="input-field text-sm"
              >
                <option value="">{t('adminStoreComments.noRating')}</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n} ★</option>
                ))}
              </select>
              <textarea
                rows={3}
                value={editForm.text}
                onChange={(e) => setEditForm((f) => ({ ...f, text: e.target.value }))}
                className="input-field resize-y text-sm"
              />
              <div className="flex gap-2">
                <button type="button" onClick={saveEdit} className="btn-primary text-xs">
                  {t('adminStore.save')}
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="text-xs text-dark-muted">
                  {t('adminStore.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-medium text-lab-cyan">{c.author_name}</p>
                <p className="text-xs text-dark-muted mt-0.5">
                  {t('adminProjectComments.onProject')}{' '}
                  <span className="text-dark-text">{c.project_title}</span>
                  {c.rating ? ` · ${c.rating}★` : ''}
                </p>
                <p className="mt-2 text-dark-muted">{c.text}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button type="button" onClick={() => startEdit(c)} className="text-xs text-lab-cyan">
                  {t('adminStore.edit')}
                </button>
                <button type="button" onClick={() => remove(c.id)} className="text-xs text-red-400">
                  {t('adminStore.delete')}
                </button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

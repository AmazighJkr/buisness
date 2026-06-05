import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import {
  PERM_LABELS,
  adminCreateUser,
  adminFetchUsers,
  adminUpdateUser,
} from '../../api/client.js'

const ALL_PERMS = Object.keys(PERM_LABELS)

const EMPTY_CREATE = { username: '', password: '', email: '', permissions: [] }

export default function AdminStaff({ isSuperuser, onMessage }) {
  const [staffUsers, setStaffUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [newUser, setNewUser] = useState(EMPTY_CREATE)
  const [editId, setEditId] = useState(null)
  const [editDraft, setEditDraft] = useState({
    email: '',
    password: '',
    permissions: [],
    is_superuser: false,
  })

  const load = async () => {
    setLoading(true)
    try {
      setStaffUsers(await adminFetchUsers())
    } catch (e) {
      onMessage?.('error', e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSuperuser) load()
  }, [isSuperuser])

  const togglePerm = (list, setList, perm) => {
    setList((u) => ({
      ...u,
      permissions: u.permissions.includes(perm)
        ? u.permissions.filter((p) => p !== perm)
        : [...u.permissions, perm],
    }))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await adminCreateUser(newUser)
      onMessage?.('success', `User "${newUser.username}" created.`)
      setNewUser(EMPTY_CREATE)
      await load()
    } catch (err) {
      onMessage?.('error', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (u) => {
    setEditId(u.id)
    setEditDraft({
      email: u.email || '',
      password: '',
      permissions: [...(u.permissions || [])],
      is_superuser: !!u.is_superuser,
    })
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editId) return
    setSubmitting(true)
    try {
      const body = {
        email: editDraft.email,
        permissions: editDraft.permissions,
      }
      if (editDraft.password) body.password = editDraft.password
      if (isSuperuser) body.is_superuser = editDraft.is_superuser
      const updated = await adminUpdateUser(editId, body)
      setStaffUsers((list) => list.map((u) => (u.id === updated.id ? updated : u)))
      onMessage?.('success', 'Staff account updated.')
      setEditId(null)
    } catch (err) {
      onMessage?.('error', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isSuperuser) {
    return <p className="text-sm text-dark-muted">Only superusers can manage staff accounts.</p>
  }

  const editing = staffUsers.find((u) => u.id === editId)

  return (
    <div className="grid gap-8 lg:grid-cols-2 max-w-4xl">
      <form
        onSubmit={handleCreate}
        className="border border-lab-border bg-lab-surface chamfer p-6 space-y-4"
      >
        <h2 className="flex items-center gap-2 text-sm text-lab-cyan">
          <Users className="h-4 w-4" /> Create staff account
        </h2>
        <input
          required
          placeholder="Username"
          value={newUser.username}
          onChange={(e) => setNewUser((u) => ({ ...u, username: e.target.value }))}
          className="w-full border border-lab-border bg-lab-bg px-3 py-2 text-sm"
        />
        <input
          type="email"
          placeholder="Email"
          value={newUser.email}
          onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
          className="w-full border border-lab-border bg-lab-bg px-3 py-2 text-sm"
        />
        <input
          required
          type="password"
          minLength={8}
          placeholder="Password"
          value={newUser.password}
          onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
          className="w-full border border-lab-border bg-lab-bg px-3 py-2 text-sm"
        />
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Permissions</p>
          {ALL_PERMS.map((perm) => (
            <label key={perm} className="flex items-center gap-2 text-xs text-dark-text">
              <input
                type="checkbox"
                checked={newUser.permissions.includes(perm)}
                onChange={() => togglePerm(newUser, setNewUser, perm)}
              />
              {PERM_LABELS[perm]}
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full border border-lab-cyan py-2 text-sm text-lab-cyan disabled:opacity-50"
        >
          Create user
        </button>
      </form>

      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-dark-muted animate-pulse">Loading staff…</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {staffUsers.map((u) => (
              <li key={u.id} className="border border-lab-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-lab-cyan">{u.username}</span>
                  <button
                    type="button"
                    onClick={() => startEdit(u)}
                    className="text-lab-copper hover:underline"
                  >
                    Edit
                  </button>
                </div>
                {u.is_superuser && <span className="text-lab-copper">superuser</span>}
                <p className="mt-1 text-gray-500">
                  {(u.permissions || []).map((p) => PERM_LABELS[p] || p).join(' · ') || '—'}
                </p>
              </li>
            ))}
          </ul>
        )}

        {editing && (
          <form
            onSubmit={handleSaveEdit}
            className="border border-lab-cyan/40 bg-lab-surface p-4 space-y-3 text-xs"
          >
            <h3 className="font-medium text-lab-cyan">Edit {editing.username}</h3>
            <input
              type="email"
              placeholder="Email"
              value={editDraft.email}
              onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))}
              className="w-full border border-lab-border bg-lab-bg px-3 py-2"
            />
            <input
              type="password"
              minLength={8}
              placeholder="New password (leave blank to keep)"
              value={editDraft.password}
              onChange={(e) => setEditDraft((d) => ({ ...d, password: e.target.value }))}
              className="w-full border border-lab-border bg-lab-bg px-3 py-2"
            />
            {isSuperuser && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editDraft.is_superuser}
                  onChange={(e) =>
                    setEditDraft((d) => ({ ...d, is_superuser: e.target.checked }))
                  }
                />
                Superuser
              </label>
            )}
            <div className="max-h-48 space-y-1 overflow-y-auto border border-lab-border p-2">
              {ALL_PERMS.map((perm) => (
                <label key={perm} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    disabled={editDraft.is_superuser}
                    checked={editDraft.is_superuser || editDraft.permissions.includes(perm)}
                    onChange={() => togglePerm(editDraft, setEditDraft, perm)}
                  />
                  {PERM_LABELS[perm]}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="border border-lab-cyan px-3 py-1 text-lab-cyan disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditId(null)}
                className="border border-lab-border px-3 py-1 text-dark-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

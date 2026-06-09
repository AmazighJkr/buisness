const CODE_EXTENSIONS = /\.(ino|cpp|c|h|hpp|py|js|ts|json|txt|md|xml|yaml|yml|cmake|mk|gradle)$/i

export default function CodeFilesEditor({ files, onChange, emptyFile }) {
  const updateFile = (idx, key, value) => {
    onChange(files.map((f, i) => (i === idx ? { ...f, [key]: value } : f)))
  }

  const addFile = () => onChange([...files, { ...emptyFile }])
  const removeFile = (idx) => onChange(files.filter((_, i) => i !== idx))

  const importFile = (idx, file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const code = String(reader.result || '')
      const title = file.name || 'code.txt'
      updateFile(idx, 'title', title)
      updateFile(idx, 'code', code)
    }
    reader.readAsText(file)
  }

  const readText = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => resolve('')
      reader.readAsText(file)
    })

  const importMany = async (fileList) => {
    const list = Array.from(fileList || []).filter(
      (f) => CODE_EXTENSIONS.test(f.name) || !/\./.test(f.name),
    )
    if (!list.length) return
    const base = files.filter((f) => f.title?.trim() || f.code?.trim())
    const codes = await Promise.all(list.map((file) => readText(file)))
    onChange([
      ...base,
      ...list.map((file, index) => ({ title: file.name, code: codes[index] || '' })),
    ])
  }

  return (
    <div className="space-y-3">
      {files.map((file, idx) => (
        <div key={idx} className="border border-lab-border p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <input
              value={file.title || ''}
              onChange={(e) => updateFile(idx, 'title', e.target.value)}
              placeholder="File title (e.g. main.ino, sensors.py)"
              className="min-w-[10rem] flex-1 border border-lab-border bg-lab-bg px-2 py-1 text-xs outline-none focus:border-lab-cyan"
            />
            <label className="cursor-pointer border border-lab-border px-2 py-1 text-xs text-lab-cyan hover:border-lab-cyan">
              Upload file
              <input
                type="file"
                accept=".ino,.cpp,.c,.h,.hpp,.py,.js,.ts,.json,.txt,.md,.xml,.yaml,.yml"
                className="hidden"
                onChange={(e) => {
                  importFile(idx, e.target.files?.[0] || null)
                  e.target.value = ''
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => removeFile(idx)}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>
          <textarea
            rows={10}
            value={file.code || ''}
            onChange={(e) => updateFile(idx, 'code', e.target.value)}
            placeholder="Paste code here or upload a file above…"
            className="h-48 w-full resize-y overflow-y-auto border border-lab-border bg-lab-bg px-2 py-1 font-mono text-xs outline-none focus:border-lab-cyan"
          />
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addFile}
          className="border border-lab-border px-3 py-1 text-xs text-lab-cyan hover:border-lab-cyan"
        >
          + Add code file
        </button>
        <label className="cursor-pointer border border-lab-border px-3 py-1 text-xs text-lab-cyan hover:border-lab-cyan">
          + Upload multiple files
          <input
            type="file"
            multiple
            accept=".ino,.cpp,.c,.h,.hpp,.py,.js,.ts,.json,.txt,.md,.xml,.yaml,.yml"
            className="hidden"
            onChange={(e) => {
              importMany(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
      </div>
    </div>
  )
}

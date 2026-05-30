export default function CodeFilesEditor({ files, onChange, emptyFile }) {
  const updateFile = (idx, key, value) => {
    onChange(files.map((f, i) => (i === idx ? { ...f, [key]: value } : f)))
  }

  const addFile = () => onChange([...files, { ...emptyFile }])
  const removeFile = (idx) => onChange(files.filter((_, i) => i !== idx))

  return (
    <div className="space-y-3">
      {files.map((file, idx) => (
        <div key={idx} className="border border-lab-border p-3">
          <div className="mb-2 flex items-center gap-2">
            <input
              value={file.title || ''}
              onChange={(e) => updateFile(idx, 'title', e.target.value)}
              placeholder="File title (e.g. main.ino, sensors.py)"
              className="flex-1 border border-lab-border bg-lab-bg px-2 py-1 text-xs outline-none focus:border-lab-cyan"
            />
            <button
              type="button"
              onClick={() => removeFile(idx)}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>
          <textarea
            rows={8}
            value={file.code || ''}
            onChange={(e) => updateFile(idx, 'code', e.target.value)}
            placeholder="Paste code here..."
            className="h-40 w-full resize-none overflow-y-auto border border-lab-border bg-lab-bg px-2 py-1 font-mono text-xs outline-none focus:border-lab-cyan"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addFile}
        className="border border-lab-border px-3 py-1 text-xs text-lab-cyan hover:border-lab-cyan"
      >
        + Add code file
      </button>
    </div>
  )
}

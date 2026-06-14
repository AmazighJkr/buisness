import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import RichTextEditor from '../RichTextEditor.jsx'
import EditableRows from '../EditableRows.jsx'
import ProjectMaterialsEditor from './ProjectMaterialsEditor.jsx'
import CodeFilesEditor from '../CodeFilesEditor.jsx'
import { BLOCK_TYPES, blockTypeLabel, newBlock } from '../../utils/projectBlocks.js'

const EMPTY_WIRE = { from_pin: '', to_pin: '', notes: '' }

export default function ProjectBlocksEditor({ blocks, onChange, blockFiles = {}, onBlockFileChange }) {
  const [selectedId, setSelectedId] = useState(blocks[0]?.id || null)
  const selected = blocks.find((b) => b.id === selectedId) || blocks[0]

  const updateBlock = (id, patch) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }

  const moveBlock = (index, dir) => {
    const next = [...blocks]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const removeBlock = (id) => {
    const next = blocks.filter((b) => b.id !== id)
    onChange(next.length ? next : [newBlock('rich_text')])
    if (selectedId === id) setSelectedId(next[0]?.id || null)
  }

  const addBlock = (type) => {
    const block = newBlock(type)
    onChange([...blocks, block])
    setSelectedId(block.id)
  }

  const renderEditor = (block) => {
    if (!block) return null
    switch (block.type) {
      case 'heading':
        return (
          <input
            value={block.title || ''}
            onChange={(e) => updateBlock(block.id, { title: e.target.value })}
            placeholder="Section heading"
            className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
          />
        )
      case 'rich_text':
        return (
          <RichTextEditor
            value={block.html || ''}
            onChange={(html) => updateBlock(block.id, { html })}
            placeholder="Write description, lists, titles…"
            minHeight="14rem"
          />
        )
      case 'libraries':
        return (
          <textarea
            rows={3}
            value={block.text || ''}
            onChange={(e) => updateBlock(block.id, { text: e.target.value })}
            placeholder="Comma-separated libraries"
            className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
          />
        )
      case 'code':
        return (
          <CodeFilesEditor
            files={block.code_files || []}
            onChange={(code_files) => updateBlock(block.id, { code_files })}
            emptyFile={{ title: '', code: '' }}
          />
        )
      case 'schematic':
        return (
          <div className="space-y-2">
            <input
              value={block.title || ''}
              onChange={(e) => updateBlock(block.id, { title: e.target.value })}
              placeholder="Caption (optional)"
              className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-xs"
            />
            {block.image_url && !blockFiles[block.id] && (
              <img src={block.image_url} alt="" className="max-h-48 w-full object-contain bg-dark-bg" />
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              className="block w-full text-xs"
              onChange={(e) => onBlockFileChange?.(block.id, e.target.files?.[0] || null)}
            />
          </div>
        )
      case 'video':
      case 'simulation':
        return (
          <input
            value={block.url || ''}
            onChange={(e) => updateBlock(block.id, { url: e.target.value })}
            placeholder="https://…"
            className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
          />
        )
      case 'materials':
        return (
          <ProjectMaterialsEditor
            rows={block.materials || []}
            onChange={(materials) => updateBlock(block.id, { materials })}
          />
        )
      case 'wiring':
        return (
          <EditableRows
            columns={[
              { key: 'from_pin', label: 'From' },
              { key: 'to_pin', label: 'To' },
              { key: 'notes', label: 'Notes' },
            ]}
            rows={block.wiring || []}
            onChange={(wiring) => updateBlock(block.id, { wiring })}
            emptyRow={EMPTY_WIRE}
          />
        )
      case 'model_3d':
        return (
          <p className="text-xs text-dark-muted">
            Upload the 3D file using the field below the page builder. This block marks where the viewer appears
            on the project page.
          </p>
        )
      default:
        return null
    }
  }

  return (
    <div className="project-blocks-editor grid gap-4 lg:grid-cols-[minmax(0,11rem)_1fr]">
      <aside className="space-y-2">
        <p className="text-xs font-semibold uppercase text-dark-muted">Page sections</p>
        <ul className="space-y-1 max-h-[28rem] overflow-y-auto">
          {blocks.map((block, index) => (
            <li key={block.id}>
              <div className="flex items-stretch gap-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedId(block.id)}
                  className={`min-w-0 flex-1 border px-2 py-1.5 text-left text-[11px] ${
                    selected?.id === block.id ? 'border-lab-cyan bg-dark-panel' : 'border-dark-border'
                  }`}
                >
                  <span className="block truncate">{block.title || blockTypeLabel(block.type)}</span>
                  <span className="text-dark-muted">{blockTypeLabel(block.type)}</span>
                </button>
                <div className="flex flex-col">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveBlock(index, -1)}
                    className="border border-dark-border px-1 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    disabled={index === blocks.length - 1}
                    onClick={() => moveBlock(index, 1)}
                    className="border border-dark-border px-1 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="border border-dark-border p-2">
          <p className="mb-2 text-[10px] text-dark-muted">Add section</p>
          <div className="flex flex-col gap-1">
            {BLOCK_TYPES.map((bt) => (
              <button
                key={bt.type}
                type="button"
                onClick={() => addBlock(bt.type)}
                className="flex items-center gap-1 border border-dark-border px-2 py-1 text-left text-[11px] panel-hover"
              >
                <Plus className="h-3 w-3 shrink-0" />
                {bt.label}
              </button>
            ))}
          </div>
        </div>
      </aside>
      <div className="min-w-0 space-y-2 border border-dark-border p-3">
        {selected ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium">{blockTypeLabel(selected.type)}</p>
              <button
                type="button"
                onClick={() => removeBlock(selected.id)}
                className="text-red-400 panel-hover"
                aria-label="Remove section"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {selected.type !== 'heading' && selected.type !== 'rich_text' && (
              <input
                value={selected.title || ''}
                onChange={(e) => updateBlock(selected.id, { title: e.target.value })}
                placeholder="Section label (shown on page)"
                className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-xs"
              />
            )}
            {renderEditor(selected)}
          </>
        ) : (
          <p className="text-xs text-dark-muted">Add a section from the list.</p>
        )}
      </div>
    </div>
  )
}

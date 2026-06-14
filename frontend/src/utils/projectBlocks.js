import { EMPTY_MATERIAL_ROW } from '../components/admin/ProjectMaterialsEditor.jsx'

export const BLOCK_TYPES = [
  { type: 'heading', label: 'Section title' },
  { type: 'rich_text', label: 'Rich text' },
  { type: 'libraries', label: 'Libraries' },
  { type: 'code', label: 'Code files' },
  { type: 'schematic', label: 'Schematic / image' },
  { type: 'video', label: 'Video embed' },
  { type: 'simulation', label: 'Simulation embed' },
  { type: 'materials', label: 'Materials list' },
  { type: 'wiring', label: 'Wiring table' },
  { type: 'model_3d', label: '3D model note' },
]

const uid = () => `blk_${Math.random().toString(36).slice(2, 10)}`

export function newBlock(type) {
  const base = { id: uid(), type }
  switch (type) {
    case 'heading':
      return { ...base, title: 'Section title' }
    case 'rich_text':
      return { ...base, title: '', html: '' }
    case 'libraries':
      return { ...base, title: 'Libraries', text: '' }
    case 'code':
      return { ...base, title: 'Code', code_files: [{ title: 'main', code: '' }] }
    case 'schematic':
      return { ...base, title: 'Schematic', image_url: '' }
    case 'video':
      return { ...base, title: 'Video', url: '' }
    case 'simulation':
      return { ...base, title: 'Simulation', url: '' }
    case 'materials':
      return { ...base, title: 'Materials', materials: [{ ...EMPTY_MATERIAL_ROW }] }
    case 'wiring':
      return { ...base, title: 'Wiring', wiring: [{ from_pin: '', to_pin: '', notes: '' }] }
    case 'model_3d':
      return { ...base, title: '3D model', note: '' }
    default:
      return { ...base, title: '' }
  }
}

export function blocksFromLegacy(project, materials, wiring, codeFiles, form) {
  const blocks = []
  if (form.description?.trim()) {
    blocks.push({
      id: uid(),
      type: 'rich_text',
      title: 'Description',
      html: form.description.replace(/\n/g, '<br>'),
    })
  }
  if (form.libraries?.trim()) {
    blocks.push({ id: uid(), type: 'libraries', title: 'Libraries', text: form.libraries })
  }
  const codes = (codeFiles || []).filter((f) => f.title?.trim() || f.code?.trim())
  if (codes.length) {
    blocks.push({ id: uid(), type: 'code', title: 'Code', code_files: codes })
  }
  if (project?.schematic_url) {
    blocks.push({
      id: uid(),
      type: 'schematic',
      title: 'Schematic',
      image_url: project.schematic_url,
    })
  }
  if (form.simulation_url?.trim()) {
    blocks.push({
      id: uid(),
      type: 'simulation',
      title: 'Simulation',
      url: form.simulation_url,
    })
  }
  if (form.video_url?.trim()) {
    blocks.push({ id: uid(), type: 'video', title: 'Video', url: form.video_url })
  }
  const mats = (materials || []).filter((r) => r.component?.trim())
  if (mats.length) {
    blocks.push({ id: uid(), type: 'materials', title: 'Materials', materials: mats })
  }
  const wires = (wiring || []).filter((r) => r.from_pin?.trim() || r.to_pin?.trim())
  if (wires.length) {
    blocks.push({ id: uid(), type: 'wiring', title: 'Wiring', wiring: wires })
  }
  if (project?.model_3d_url || project?.model_3d_pending) {
    blocks.push({ id: uid(), type: 'model_3d', title: '3D model', note: '' })
  }
  return blocks.length ? blocks : [newBlock('rich_text')]
}

export function blockTypeLabel(type) {
  return BLOCK_TYPES.find((b) => b.type === type)?.label || type
}

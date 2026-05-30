/** Detect highlight.js language from file title / extension. */
export function detectLanguage(title) {
  const name = (title || '').toLowerCase().trim()
  if (!name) return 'plaintext'

  const ext = name.includes('.') ? name.split('.').pop() : ''

  const extMap = {
    ino: 'cpp',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    h: 'cpp',
    hpp: 'cpp',
    c: 'c',
    py: 'python',
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sh: 'bash',
    bash: 'bash',
    xml: 'xml',
    html: 'xml',
    css: 'css',
  }

  if (extMap[ext]) return extMap[ext]

  if (name.includes('python') || name.includes('micropython')) return 'python'
  if (name.includes('arduino') || name.includes('sketch') || name.includes('firmware')) return 'cpp'
  if (name.includes('javascript') || name.includes('node')) return 'javascript'

  return 'plaintext'
}

export function langLabel(lang) {
  const labels = {
    cpp: 'cpp',
    c: 'c',
    python: 'py',
    javascript: 'js',
    typescript: 'ts',
    json: 'json',
    yaml: 'yaml',
    markdown: 'md',
    bash: 'sh',
    xml: 'xml',
    css: 'css',
    plaintext: 'txt',
  }
  return labels[lang] || lang
}

export function displayFileName(title, index) {
  const name = (title || '').trim()
  if (name) return name
  return `file_${index + 1}.txt`
}

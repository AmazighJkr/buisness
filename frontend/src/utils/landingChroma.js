const PALETTE = [
  { border: '#22d3ee', accent: '#0891b2' },
  { border: '#06b6d4', accent: '#0e7490' },
  { border: '#fbbf24', accent: '#b45309' },
  { border: '#4F46E5', accent: '#312e81' },
  { border: '#34d399', accent: '#047857' },
  { border: '#8b5cf6', accent: '#5b21b6' },
]

export function pillarToChromaItem({ title, text, handle }, index) {
  const p = PALETTE[index % PALETTE.length]
  return {
    title,
    subtitle: text,
    handle,
    borderColor: p.border,
    gradient: `linear-gradient(145deg, ${p.border}, #0c1017)`,
    image: '/hero-bg.png',
  }
}

export function serviceToChromaItem({ title, text }, index) {
  const p = PALETTE[(index + 1) % PALETTE.length]
  return {
    title,
    subtitle: text,
    handle: 'Services',
    borderColor: p.border,
    gradient: `linear-gradient(160deg, ${p.accent}, #0c1017)`,
    image: '/hero-bg.png',
  }
}

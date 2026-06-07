import { useNavigate } from 'react-router-dom'
import MagicBento from '../reactbits/MagicBento.jsx'

const BENTO_COLORS = ['#0c1017', '#111827', '#0f172a', '#0c1017', '#111827', '#0f172a']

export function pillarToBentoCard({ title, text, handle }, index) {
  return {
    color: BENTO_COLORS[index % BENTO_COLORS.length],
    label: handle || 'Enterprise',
    title,
    description: text,
  }
}

export function serviceToBentoCard({ title, text, label, to }, index) {
  return {
    color: BENTO_COLORS[index % BENTO_COLORS.length],
    label: label || 'Services',
    title,
    description: text,
    to,
  }
}

export default function LandingSectionBento({ cards, layout = 'services', className = '', onCardClick }) {
  const navigate = useNavigate()

  const handleCard = (card) => {
    if (onCardClick) {
      onCardClick(card)
      return
    }
    if (card.to) navigate(card.to)
    if (card.href) {
      if (card.external) {
        window.open(card.href, '_blank', 'noopener,noreferrer')
      } else {
        window.location.href = card.href
      }
    }
  }

  return (
    <div className={`landing-magic-bento ${className}`.trim()}>
      <MagicBento
        cards={cards}
        layout={layout}
        glowColor="34, 211, 238"
        enableStars
        enableSpotlight
        enableBorderGlow
        enableMagnetism
        clickEffect
        textAutoHide={false}
        onCardClick={handleCard}
      />
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useTheme } from '../../context/ThemeContext.jsx'
import Ferrofluid from './Ferrofluid.jsx'

const DARK_COLORS = ['#22d3ee', '#0891b2', '#0c1017', '#fbbf24', '#164e63']
const LIGHT_COLORS = ['#0e7490', '#06b6d4', '#e0f2fe', '#f0f4f8', '#b45309']

export default function HeroFerrofluid() {
  const { isDark } = useTheme()
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const colors = useMemo(() => (isDark ? DARK_COLORS : LIGHT_COLORS), [isDark])

  return (
    <Ferrofluid
      className="hero-ferrofluid ferrofluid-container"
      colors={colors}
      paused={reducedMotion}
      flowDirection="up"
      speed={0.42}
      scale={1.55}
      glow={isDark ? 2 : 1.6}
      opacity={isDark ? 0.95 : 0.88}
      mouseInteraction={!reducedMotion}
    />
  )
}

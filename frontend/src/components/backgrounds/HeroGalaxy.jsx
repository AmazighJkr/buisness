import { useEffect, useMemo, useState } from 'react'
import { useTheme } from '../../context/ThemeContext.jsx'
import Galaxy from './Galaxy.jsx'
import GalaxyCanvas2D from './GalaxyCanvas2D.jsx'
import { probeWebGL } from './webglUtils.js'

const DARK_GALAXY = {
  hueShift: 165,
  density: 1.15,
  glowIntensity: 0.42,
  saturation: 0.4,
  starSpeed: 0.5,
  speed: 0.85,
  twinkleIntensity: 0.38,
  rotationSpeed: 0.06,
}

const LIGHT_GALAXY = {
  hueShift: 200,
  density: 0.95,
  glowIntensity: 0.55,
  saturation: 0.55,
  starSpeed: 0.38,
  speed: 0.65,
  twinkleIntensity: 0.28,
  rotationSpeed: 0.04,
}

export default function HeroGalaxy() {
  const { isDark } = useTheme()
  const [reducedMotion, setReducedMotion] = useState(false)
  const [useWebGL, setUseWebGL] = useState(null)

  useEffect(() => {
    setUseWebGL(probeWebGL())
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const settings = useMemo(() => (isDark ? DARK_GALAXY : LIGHT_GALAXY), [isDark])
  const className = 'hero-galaxy galaxy-container'

  if (useWebGL === null) {
    return <div className={className} aria-hidden />
  }

  if (!useWebGL) {
    return (
      <GalaxyCanvas2D
        isDark={isDark}
        paused={reducedMotion}
        className={className}
      />
    )
  }

  return (
    <Galaxy
      className={className}
      transparent
      mouseInteraction={!reducedMotion}
      disableAnimation={reducedMotion}
      mouseRepulsion
      repulsionStrength={2}
      {...settings}
      onUnavailable={() => setUseWebGL(false)}
    />
  )
}

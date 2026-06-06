import { useEffect, useMemo, useState } from 'react'
import { useTheme } from '../../context/ThemeContext.jsx'
import Ferrofluid from './Ferrofluid.jsx'
import HeroFerrofluidStatic from './HeroFerrofluidStatic.jsx'
import { probeWebGL } from './webglUtils.js'

const LIGHT_COLORS = ['#4F46E5', '#06B6D4', '#E0F2FE']
/** Single white — Edge WebGL1 can mis-read multi-stop palettes and show blue/yellow tints. */
const DARK_COLORS = ['#ffffff']

const FERRO_PROPS = {
  speed: 0.5,
  scale: 1.6,
  turbulence: 1.05,
  fluidity: 0.1,
  rimWidth: 0.2,
  sharpness: 2.5,
  shimmer: 0.9,
  glow: 2,
  flowDirection: 'down',
  opacity: 1,
  mouseStrength: 1,
  mouseRadius: 0.5,
  mouseDampening: 0.15,
}

function readDomTheme() {
  if (typeof document === 'undefined') return null
  const t = document.documentElement.getAttribute('data-theme')
  return t === 'dark' || t === 'light' ? t : null
}

export default function HeroFerrofluid() {
  const { resolved } = useTheme()
  const [reducedMotion, setReducedMotion] = useState(false)
  const [webglOk, setWebglOk] = useState(null)
  const [webglFailed, setWebglFailed] = useState(false)

  useEffect(() => {
    setWebglOk(probeWebGL())
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const isDark = resolved === 'dark' || readDomTheme() === 'dark'

  const colors = useMemo(
    () => (isDark ? DARK_COLORS : LIGHT_COLORS),
    [isDark],
  )

  if (webglOk === false || webglFailed) {
    return <HeroFerrofluidStatic isDark={isDark} />
  }

  if (webglOk === null) {
    return <HeroFerrofluidStatic isDark={isDark} />
  }

  return (
    <Ferrofluid
      key={resolved}
      className="hero-ferrofluid"
      colors={colors}
      paused={reducedMotion}
      mouseInteraction={!reducedMotion}
      onUnavailable={() => setWebglFailed(true)}
      {...FERRO_PROPS}
    />
  )
}

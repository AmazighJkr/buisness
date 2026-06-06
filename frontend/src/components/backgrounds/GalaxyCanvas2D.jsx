/**
 * Animated starfield fallback — works without WebGL (Canvas 2D).
 */
import { useEffect, useRef } from 'react'

function makeStars(count, w, h) {
  const stars = []
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.4 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 1.2,
      hue: Math.random(),
    })
  }
  return stars
}

export default function GalaxyCanvas2D({ isDark, paused = false, className = '' }) {
  const canvasRef = useRef(null)
  const starsRef = useRef([])
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    let disposed = false

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const { width, height } = parent.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      starsRef.current = makeStars(Math.floor((width * height) / 4200), width, height)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)

    const draw = (t) => {
      if (disposed) return
      rafRef.current = requestAnimationFrame(draw)

      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return

      const grad = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75)
      if (isDark) {
        grad.addColorStop(0, '#141c2e')
        grad.addColorStop(0.55, '#0c1017')
        grad.addColorStop(1, '#06080d')
      } else {
        grad.addColorStop(0, '#dbeafe')
        grad.addColorStop(0.5, '#e8f4fc')
        grad.addColorStop(1, '#cfdce8')
      }
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      const time = paused ? 0 : t * 0.001
      for (const star of starsRef.current) {
        const twinkle = paused ? 1 : 0.55 + 0.45 * Math.sin(time * star.speed + star.phase)
        const alpha = (isDark ? 0.35 + star.hue * 0.65 : 0.25 + star.hue * 0.55) * twinkle
        if (isDark) {
          ctx.fillStyle = `hsla(${185 + star.hue * 40}, 80%, ${72 + star.hue * 20}%, ${alpha})`
        } else {
          ctx.fillStyle = `hsla(${195 + star.hue * 30}, 70%, ${28 + star.hue * 18}%, ${alpha})`
        }
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r * (0.8 + twinkle * 0.4), 0, Math.PI * 2)
        ctx.fill()
      }

      if (!paused) {
        const nebula = ctx.createRadialGradient(w * 0.72, h * 0.28, 0, w * 0.72, h * 0.28, w * 0.35)
        nebula.addColorStop(0, isDark ? 'rgba(34, 211, 238, 0.12)' : 'rgba(14, 116, 144, 0.14)')
        nebula.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = nebula
        ctx.fillRect(0, 0, w, h)
      }
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      disposed = true
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [isDark, paused])

  return <canvas ref={canvasRef} className={className} aria-hidden />
}

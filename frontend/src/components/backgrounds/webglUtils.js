/** Quick probe — avoids throwing inside ogl when WebGL is blocked. */
export function probeWebGL() {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false })
      || canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false })
      || canvas.getContext('experimental-webgl', { failIfMajorPerformanceCaveat: false })
    return Boolean(gl)
  } catch {
    return false
  }
}

export function waitForElementSize(element) {
  return new Promise((resolve) => {
    const tick = () => {
      const { width, height } = element.getBoundingClientRect()
      if (width > 0 && height > 0) {
        resolve()
        return
      }
      requestAnimationFrame(tick)
    }
    tick()
  })
}

/**
 * Edge (and some GPUs) fail when the canvas is off-DOM or antialias is forced on.
 * Try several WebGL modes before giving up — same shader, safer boot.
 */
export function createOglRenderer(Renderer, { canvas, dpr }) {
  const attempts = [
    { webgl: 2, antialias: true },
    { webgl: 2, antialias: false },
    { webgl: 1, antialias: true },
    { webgl: 1, antialias: false },
  ]

  for (const opts of attempts) {
    try {
      const renderer = new Renderer({
        canvas,
        dpr,
        alpha: true,
        antialias: opts.antialias,
        webgl: opts.webgl,
      })
      if (renderer?.gl) return renderer
    } catch {
      /* try next mode */
    }
  }

  return null
}

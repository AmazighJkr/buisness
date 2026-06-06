/** Quick probe — avoids throwing inside ogl when WebGL is blocked. */
export function probeWebGL() {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false })
      || canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false })
      || canvas.getContext('experimental-webgl')
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

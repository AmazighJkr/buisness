/** Browser 3D preview formats (React Bits ModelViewer / three.js). */
export const SUPPORTED_MODEL_EXTENSIONS = ['glb', 'gltf', 'fbx', 'obj', 'stl']

/** Proprietary CAD — cannot upload; export GLB or STL from SolidWorks / Fusion first. */
export const CAD_EXTENSIONS_NEEDING_CONVERSION = [
  'sldprt',
  'sldasm',
  'iges',
  'igs',
  '3mf',
  'dae',
]

export function modelExtensionFromUrl(url) {
  if (!url || typeof url !== 'string') return ''
  const clean = url.split('?')[0].split('#')[0]
  const parts = clean.split('.')
  if (parts.length < 2) return ''
  return parts.pop().toLowerCase()
}

export function isSupportedModelUrl(url) {
  return SUPPORTED_MODEL_EXTENSIONS.includes(modelExtensionFromUrl(url))
}

export function isCadFormatNeedingConversion(url) {
  return CAD_EXTENSIONS_NEEDING_CONVERSION.includes(modelExtensionFromUrl(url))
}

import { Component, lazy, Suspense, useEffect, useState } from 'react'
import { probeWebGL } from './backgrounds/webglUtils.js'
import { useTranslation } from '../context/LocaleContext.jsx'
import { resolveMediaUrl } from '../utils/mediaUrl.js'
import {
  isCadFormatNeedingConversion,
  isSupportedModelUrl,
  modelExtensionFromUrl,
  SUPPORTED_MODEL_EXTENSIONS,
} from '../utils/model3dFormat.js'

const ModelViewer = lazy(() => import('./reactbits/ModelViewer.jsx'))

class ModelViewerErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(err) {
    console.warn('3D model preview failed:', err)
  }

  render() {
    if (this.state.failed) {
      return this.props.fallback
    }
    return this.props.children
  }
}

export default function HardwareModelViewer({ url, className = '' }) {
  const { t } = useTranslation()
  const resolvedUrl = resolveMediaUrl(url) || url
  const ext = modelExtensionFromUrl(resolvedUrl)
  const isObj = ext === 'obj'
  const [webglOk, setWebglOk] = useState(null)

  useEffect(() => {
    setWebglOk(probeWebGL())
  }, [])

  if (!url?.trim()) return null

  if (webglOk === false) {
    return (
      <div className={`model-viewer-notice ${className}`.trim()}>
        <p className="text-sm text-dark-muted">{t('projects.model3dWebgl')}</p>
      </div>
    )
  }

  if (isCadFormatNeedingConversion(resolvedUrl)) {
    return (
      <div className={`model-viewer-notice ${className}`.trim()}>
        <p className="text-sm font-medium text-dark-text">{t('projects.model3dCadTitle')}</p>
        <p className="mt-2 text-xs text-dark-muted">{t('projects.model3dCadBody', { ext: ext.toUpperCase() })}</p>
      </div>
    )
  }

  if (!isSupportedModelUrl(resolvedUrl)) {
    return (
      <div className={`model-viewer-notice ${className}`.trim()}>
        <p className="text-sm text-dark-muted">
          {t('projects.model3dUnsupported', {
            ext: ext || '?',
            supported: SUPPORTED_MODEL_EXTENSIONS.join(', ').toUpperCase(),
          })}
        </p>
      </div>
    )
  }

  const errorFallback = (
    <p className="py-12 text-center text-sm text-dark-muted">{t('projects.model3dLoadFailed')}</p>
  )

  return (
    <div className={`hardware-model-viewer ${className}`.trim()}>
      <ModelViewerErrorBoundary fallback={errorFallback}>
        <Suspense fallback={<p className="py-12 text-center text-sm text-dark-muted">{t('projects.model3dLoading')}</p>}>
          {webglOk ? (
            <ModelViewer
              url={resolvedUrl}
              width="100%"
              height={420}
              showScreenshotButton={false}
              environmentPreset={isObj ? 'none' : 'city'}
              enableShadows={!isObj}
              autoFrame
              defaultRotationX={-35}
              defaultRotationY={25}
              defaultZoom={1.2}
              enableManualRotation
              enableManualZoom
              autoRotate
              autoRotateSpeed={0.25}
            />
          ) : (
            <p className="py-12 text-center text-sm text-dark-muted">{t('projects.model3dLoading')}</p>
          )}
        </Suspense>
      </ModelViewerErrorBoundary>
    </div>
  )
}

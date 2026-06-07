import { lazy, Suspense, useEffect, useState } from 'react'
import { probeWebGL } from './backgrounds/webglUtils.js'
import { useTranslation } from '../context/LocaleContext.jsx'
import {
  isCadFormatNeedingConversion,
  isSupportedModelUrl,
  modelExtensionFromUrl,
  SUPPORTED_MODEL_EXTENSIONS,
} from '../utils/model3dFormat.js'

const ModelViewer = lazy(() => import('./reactbits/ModelViewer.jsx'))

export default function HardwareModelViewer({ url, className = '' }) {
  const { t } = useTranslation()
  const ext = modelExtensionFromUrl(url)
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

  if (isCadFormatNeedingConversion(url)) {
    return (
      <div className={`model-viewer-notice ${className}`.trim()}>
        <p className="text-sm font-medium text-dark-text">{t('projects.model3dCadTitle')}</p>
        <p className="mt-2 text-xs text-dark-muted">{t('projects.model3dCadBody', { ext: ext.toUpperCase() })}</p>
      </div>
    )
  }

  if (!isSupportedModelUrl(url)) {
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

  return (
    <div className={`hardware-model-viewer ${className}`.trim()}>
      <Suspense fallback={<p className="py-12 text-center text-sm text-dark-muted">{t('projects.model3dLoading')}</p>}>
        {webglOk ? (
          <ModelViewer
            url={url}
            width="100%"
            height={420}
            showScreenshotButton={false}
            environmentPreset="city"
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
    </div>
  )
}

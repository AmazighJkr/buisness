import { useEffect, useState } from 'react'
import LegalDocumentLayout from '../components/legal/LegalDocumentLayout.jsx'
import LegalDocumentBody from '../components/legal/LegalDocumentBody.jsx'
import { fetchLegalPage } from '../api/client.js'
import { useTranslation } from '../context/LocaleContext.jsx'

export default function TermsPage() {
  const { t, locale } = useTranslation()
  const [doc, setDoc] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchLegalPage('terms', locale)
      .then((data) => {
        if (!cancelled) setDoc(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || t('legal.loadError'))
      })
    return () => {
      cancelled = true
    }
  }, [locale, t])

  if (error) {
    return (
      <LegalDocumentLayout title={t('legal.termsTitle')} subtitle="">
        <p className="text-sm text-red-300">{error}</p>
      </LegalDocumentLayout>
    )
  }

  if (!doc) {
    return (
      <LegalDocumentLayout title={t('legal.termsTitle')} subtitle="">
        <p className="text-sm text-dark-muted animate-pulse">{t('common.loading')}</p>
      </LegalDocumentLayout>
    )
  }

  return (
    <LegalDocumentLayout
      title={doc.title}
      subtitle={
        doc.subtitle +
        (doc.updated_at ? ` · ${t('legal.updated')} ${new Date(doc.updated_at).toLocaleDateString(locale)}` : '')
      }
    >
      <LegalDocumentBody doc={doc} />
    </LegalDocumentLayout>
  )
}

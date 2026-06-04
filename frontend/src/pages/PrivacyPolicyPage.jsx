import LegalDocumentLayout, { LegalP, LegalSection } from '../components/legal/LegalDocumentLayout.jsx'
import { PRIVACY_META, PRIVACY_SECTIONS } from '../content/legal/privacy.fr.js'
import { useTranslation } from '../context/LocaleContext.jsx'

export default function PrivacyPolicyPage() {
  const { t } = useTranslation()

  return (
    <LegalDocumentLayout
      title={PRIVACY_META.title}
      subtitle={`${PRIVACY_META.subtitle} · ${t('legal.updated')} ${PRIVACY_META.updated}`}
    >
      {PRIVACY_SECTIONS.map((section) => (
        <LegalSection key={section.title} title={section.title}>
          {section.paragraphs.map((p) => (
            <LegalP key={p.slice(0, 48)}>{p}</LegalP>
          ))}
        </LegalSection>
      ))}
    </LegalDocumentLayout>
  )
}

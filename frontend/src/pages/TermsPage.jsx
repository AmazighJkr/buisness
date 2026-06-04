import LegalDocumentLayout, { LegalP, LegalSection } from '../components/legal/LegalDocumentLayout.jsx'
import { CGV_ARTICLES, CGV_INTRO, CGV_META } from '../content/legal/cgv.fr.js'
import { useTranslation } from '../context/LocaleContext.jsx'

export default function TermsPage() {
  const { t } = useTranslation()

  return (
    <LegalDocumentLayout
      title={CGV_META.title}
      subtitle={`${CGV_META.subtitle} · ${t('legal.updated')} ${CGV_META.updated}`}
    >
      {CGV_INTRO.map((p) => (
        <LegalP key={p.slice(0, 40)}>{p}</LegalP>
      ))}
      {CGV_ARTICLES.map((article) => (
        <LegalSection key={article.title} title={article.title}>
          {article.paragraphs.map((p) => (
            <LegalP key={p.slice(0, 48)}>{p}</LegalP>
          ))}
        </LegalSection>
      ))}
    </LegalDocumentLayout>
  )
}

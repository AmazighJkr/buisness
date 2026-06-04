import { LegalP, LegalSection } from './LegalDocumentLayout.jsx'

export default function LegalDocumentBody({ doc }) {
  if (!doc) return null
  return (
    <>
      {doc.intro?.map((p) => (
        <LegalP key={p.slice(0, 40)}>{p}</LegalP>
      ))}
      {doc.sections?.map((section) => (
        <LegalSection key={section.title} title={section.title}>
          {section.paragraphs?.map((p) => (
            <LegalP key={`${section.title}-${p.slice(0, 32)}`}>{p}</LegalP>
          ))}
        </LegalSection>
      ))}
    </>
  )
}

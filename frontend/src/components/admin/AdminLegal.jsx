import { useEffect, useState } from 'react'
import { adminFetchLegalPage, adminUpdateLegalPage } from '../../api/client.js'
import { useTranslation } from '../../context/LocaleContext.jsx'

const SLUGS = [
  { id: 'terms', labelKey: 'adminLegal.terms' },
  { id: 'privacy', labelKey: 'adminLegal.privacy' },
]

const EMPTY_LOCALE = { title: '', subtitle: '', intro: [], sections: [] }

function paragraphsFromText(text) {
  return (text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

function textFromParagraphs(paragraphs) {
  return (paragraphs || []).join('\n\n')
}

function normalizeLocale(raw) {
  return {
    title: raw?.title || '',
    subtitle: raw?.subtitle || '',
    intro: Array.isArray(raw?.intro) ? raw.intro : [],
    sections: Array.isArray(raw?.sections) ? raw.sections : [],
  }
}

export default function AdminLegal() {
  const { t } = useTranslation()
  const [slug, setSlug] = useState('terms')
  const [lang, setLang] = useState('fr')
  const [content, setContent] = useState({ en: { ...EMPTY_LOCALE }, fr: { ...EMPTY_LOCALE } })
  const [introText, setIntroText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  const locale = normalizeLocale(content[lang] || EMPTY_LOCALE)

  const load = async (s) => {
    setLoading(true)
    setMsg({ type: '', text: '' })
    try {
      const data = await adminFetchLegalPage(s)
      const c = data.content || { en: { ...EMPTY_LOCALE }, fr: { ...EMPTY_LOCALE } }
      setContent({
        en: normalizeLocale(c.en),
        fr: normalizeLocale(c.fr),
      })
    } catch (e) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(slug)
  }, [slug])

  useEffect(() => {
    setIntroText(textFromParagraphs(locale.intro))
  }, [slug, lang, content])

  const updateLocale = (patch) => {
    setContent((c) => ({
      ...c,
      [lang]: { ...normalizeLocale(c[lang]), ...patch },
    }))
  }

  const updateSection = (index, patch) => {
    const sections = [...locale.sections]
    sections[index] = { ...sections[index], ...patch }
    updateLocale({ sections })
  }

  const addSection = () => {
    updateLocale({
      sections: [...locale.sections, { title: '', paragraphs: [''] }],
    })
  }

  const removeSection = (index) => {
    updateLocale({ sections: locale.sections.filter((_, i) => i !== index) })
  }

  const save = async () => {
    setSaving(true)
    setMsg({ type: '', text: '' })
    const next = {
      ...content,
      [lang]: {
        ...locale,
        intro: paragraphsFromText(introText),
      },
    }
    try {
      await adminUpdateLegalPage(slug, next)
      setContent(next)
      setMsg({ type: 'ok', text: t('adminLegal.saved') })
    } catch (e) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold">{t('adminLegal.title')}</h2>
        <p className="mt-1 text-sm text-dark-muted">{t('adminLegal.lead')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SLUGS.map(({ id, labelKey }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSlug(id)}
            className={`rounded-md border px-3 py-1.5 text-xs ${
              slug === id
                ? 'border-lab-cyan text-lab-cyan'
                : 'border-dark-border text-dark-muted'
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {['fr', 'en'].map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            className={`rounded-md border px-3 py-1.5 text-xs uppercase ${
              lang === code
                ? 'border-lab-cyan text-lab-cyan'
                : 'border-dark-border text-dark-muted'
            }`}
          >
            {code === 'fr' ? t('adminLegal.langFr') : t('adminLegal.langEn')}
          </button>
        ))}
      </div>

      {msg.text && (
        <p
          className={`rounded px-3 py-2 text-sm ${
            msg.type === 'error'
              ? 'border border-red-500/50 bg-red-500/15 text-red-300'
              : 'border border-lab-green/40 text-lab-green'
          }`}
        >
          {msg.text}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-dark-muted animate-pulse">{t('common.loading')}</p>
      ) : (
        <div className="panel space-y-4 p-4">
          <label className="block text-xs text-dark-muted">
            {t('adminLegal.pageTitle')}
            <input
              value={locale.title}
              onChange={(e) => updateLocale({ title: e.target.value })}
              className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-dark-muted">
            {t('adminLegal.subtitle')}
            <input
              value={locale.subtitle}
              onChange={(e) => updateLocale({ subtitle: e.target.value })}
              className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-dark-muted">
            {t('adminLegal.intro')}
            <textarea
              rows={4}
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm font-mono"
              placeholder={t('adminLegal.introHint')}
            />
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-dark-text">{t('adminLegal.sections')}</span>
              <button type="button" onClick={addSection} className="text-xs text-lab-cyan hover:underline">
                + {t('adminLegal.addSection')}
              </button>
            </div>
            {locale.sections.map((section, si) => (
              <div key={si} className="rounded border border-dark-border p-3 space-y-2">
                <div className="flex justify-between gap-2">
                  <label className="block flex-1 text-xs text-dark-muted">
                    {t('adminLegal.sectionTitle')}
                    <input
                      value={section.title}
                      onChange={(e) => updateSection(si, { title: e.target.value })}
                      className="mt-1 w-full border border-dark-border bg-dark-bg px-2 py-1.5 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeSection(si)}
                    className="self-start text-xs text-red-300 hover:underline"
                  >
                    {t('adminLegal.removeSection')}
                  </button>
                </div>
                <label className="block text-xs text-dark-muted">
                  {t('adminLegal.sectionBody')}
                  <textarea
                    rows={5}
                    value={textFromParagraphs(section.paragraphs)}
                    onChange={(e) =>
                      updateSection(si, { paragraphs: paragraphsFromText(e.target.value) })
                    }
                    className="mt-1 w-full border border-dark-border bg-dark-bg px-2 py-1.5 text-sm font-mono"
                  />
                </label>
              </div>
            ))}
          </div>

          <button type="button" disabled={saving} onClick={save} className="btn-primary">
            {saving ? t('adminLegal.saving') : t('adminLegal.save')}
          </button>
        </div>
      )}
    </div>
  )
}

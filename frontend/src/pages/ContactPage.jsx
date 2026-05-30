import SectionBox from '../components/SectionBox.jsx'

export default function ContactPage() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold text-theme-fg">Contact</h1>
        <p className="mt-2 text-sm text-theme-muted">
          Reach out for consulting, custom hardware, or firmware work.
        </p>
      </section>

      <SectionBox title="Email">
        <p className="text-sm text-theme-fg">lab@embedded-iot.dev</p>
      </SectionBox>

      <SectionBox title="Message">
        <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
          <input placeholder="Name" className="w-full border border-theme-border bg-theme-bg px-3 py-2 text-sm" />
          <input placeholder="Email" type="email" className="w-full border border-theme-border bg-theme-bg px-3 py-2 text-sm" />
          <textarea rows={4} placeholder="Message" className="w-full border border-theme-border bg-theme-bg px-3 py-2 text-sm" />
          <button type="submit" className="border border-theme-border px-4 py-2 text-sm panel-hover">
            Send
          </button>
        </form>
      </SectionBox>
    </div>
  )
}

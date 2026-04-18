import { Link } from 'react-router-dom'
import { useT } from '@/i18n'

type Channel = {
  label: string
  email: string
  subject?: string
  body: string
  sla: string
}

function mailHref(c: Channel) {
  const q = new URLSearchParams()
  if (c.subject) q.set('subject', c.subject)
  const qs = q.toString()
  return `mailto:${c.email}${qs ? `?${qs}` : ''}`
}

export function ContactPage() {
  const t = useT()

  const channels: Channel[] = [
    {
      label: t.contact.channelGeneral,
      email: 'contato@up2gether.com.br',
      body: t.contact.channelGeneralBody,
      sla: t.contact.channelGeneralSla,
    },
    {
      label: t.contact.channelPrivacy,
      email: 'contato@up2gether.com.br',
      subject: 'LGPD',
      body: t.contact.channelPrivacyBody,
      sla: t.contact.channelPrivacySla,
    },
    {
      label: t.contact.channelDpo,
      email: 'contato@up2gether.com.br',
      subject: 'DPO',
      body: t.contact.channelDpoBody,
      sla: t.contact.channelDpoSla,
    },
    {
      label: t.contact.channelSecurity,
      email: 'contato@up2gether.com.br',
      subject: 'SECURITY',
      body: t.contact.channelSecurityBody,
      sla: t.contact.channelSecuritySla,
    },
    {
      label: t.contact.channelPress,
      email: 'contato@up2gether.com.br',
      subject: 'IMPRENSA',
      body: t.contact.channelPressBody,
      sla: t.contact.channelPressSla,
    },
  ]

  const nav = [
    { to: '/privacy', label: t.contact.navPrivacy },
    { to: '/terms', label: t.contact.navTerms },
    { to: '/contact', label: t.contact.navContact },
  ]

  return (
    <div className="min-h-screen bg-up-bg text-up-dim">
      <header className="border-b border-up-line bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-3 transition-colors hover:text-up-orange"
          >
            <img src="/up2gether-logo.png" alt="Up2Gether" className="h-8 w-auto" />
            <span className="font-display text-lg text-up-orange">Up2Gether</span>
          </Link>
          <nav className="flex items-center gap-6 text-[11px] uppercase tracking-widest">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`transition-colors hover:text-up-orange ${
                  n.to === '/contact' ? 'text-up-orange' : 'text-up-dim'
                }`}
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/login"
              className="rounded-sm border border-up-orange/40 px-3 py-1 text-up-orange transition-colors hover:bg-up-orange/10"
            >
              {t.contact.navLogin}
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <nav className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-up-dim">
          <Link to="/" className="transition-colors hover:text-up-orange">
            Up2Gether
          </Link>
          <span className="text-up-line">/</span>
          <span className="text-up-text">{t.contact.breadcrumbContact}</span>
        </nav>

        <div className="mb-10 border-b border-up-line/60 pb-8">
          <h1 className="font-display text-4xl text-up-orange sm:text-5xl">{t.contact.title}</h1>
          <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-up-dim">
            {t.contact.subtitle}
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          {channels.map((c) => (
            <article
              key={c.label}
              className="flex flex-col justify-between rounded-md border border-up-line/60 bg-up-panel/30 p-5 transition-colors hover:border-up-orange"
            >
              <div>
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-up-amber">
                  {c.label}
                </div>
                <p className="text-[13px] leading-relaxed text-up-dim">{c.body}</p>
              </div>
              <div className="mt-4 border-t border-up-line/50 pt-4">
                <a
                  href={mailHref(c)}
                  className="flex items-center gap-2 text-[13px] text-up-orange hover:underline"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                  <span>{c.email}</span>
                  {c.subject && (
                    <span className="rounded-sm border border-up-line bg-black/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-up-amber">
                      {t.contact.subjectLabel}: {c.subject}
                    </span>
                  )}
                </a>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-up-dim">
                  {c.sla}
                </p>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-12 grid gap-6 rounded-md border border-up-line/60 bg-up-panel/30 p-6 sm:grid-cols-2">
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-up-amber">
              {t.contact.officeHoursLabel}
            </div>
            <p className="text-[13px] leading-relaxed text-up-dim">
              {t.contact.officeHoursBody}
            </p>
          </div>
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-up-amber">
              {t.contact.officialChannelsLabel}
            </div>
            <p className="text-[13px] leading-relaxed text-up-dim">
              {t.contact.officialChannelsBody}
            </p>
          </div>
        </section>

        <section className="mt-12 rounded-md border border-up-amber/30 bg-up-amber/5 p-6">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-up-amber">
            <span className="h-1 w-1 rounded-full bg-up-amber" />
            {t.contact.beforeWritingLabel}
          </div>
          <ul className="space-y-2 text-[13px] leading-relaxed text-up-text/90">
            <li>
              {t.contact.beforeWritingAccount}
              <code className="font-mono text-[11px] text-up-orange">{t.contact.beforeWritingAccountCode}</code>
              {t.contact.beforeWritingAccountEnd}
            </li>
            <li>
              {t.contact.beforeWritingSecurity}
            </li>
            <li>
              {t.contact.beforeWritingIdentity}
            </li>
          </ul>
        </section>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-up-line/60 pt-6 font-mono text-[10px] uppercase tracking-widest text-up-dim">
          <div>
            <Link to="/privacy" className="transition-colors hover:text-up-orange">
              {t.contact.footerPrivacy}
            </Link>
            <span className="mx-3 text-up-line">·</span>
            <Link to="/terms" className="transition-colors hover:text-up-orange">
              {t.contact.footerTerms}
            </Link>
          </div>
          <span>up2gether.com.br</span>
        </footer>
      </main>
    </div>
  )
}

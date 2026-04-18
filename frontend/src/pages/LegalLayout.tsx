import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useT } from '@/i18n'

type TocItem = { id: string; label: string }

type Props = {
  title: string
  effectiveAt: string
  updatedAt: string
  summary?: ReactNode
  toc?: TocItem[]
  children: ReactNode
}

export function LegalLayout({ title, effectiveAt, updatedAt, summary, toc, children }: Props) {
  const location = useLocation()
  const t = useT()

  const nav: { to: string; label: string }[] = [
    { to: '/privacy', label: t.legal.navPrivacy },
    { to: '/terms', label: t.legal.navTerms },
    { to: '/contact', label: t.legal.navContact },
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
                  location.pathname === n.to ? 'text-up-orange' : 'text-up-dim'
                }`}
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/login"
              className="rounded-sm border border-up-orange/40 px-3 py-1 text-up-orange transition-colors hover:bg-up-orange/10"
            >
              {t.legal.navLogin}
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
          <span>{t.legal.breadcrumbLegal}</span>
          <span className="text-up-line">/</span>
          <span className="text-up-text">{title}</span>
        </nav>

        <div className="mb-10 border-b border-up-line/60 pb-8">
          <h1 className="font-display text-4xl text-up-orange sm:text-5xl">{title}</h1>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[11px] uppercase tracking-widest text-up-dim">
            <div>
              <span className="text-up-line">{t.legal.effectiveLabel}</span>
              <span className="ml-2 text-up-text">{effectiveAt}</span>
            </div>
            <div>
              <span className="text-up-line">{t.legal.lastRevision}</span>
              <span className="ml-2 text-up-text">{updatedAt}</span>
            </div>
          </div>
        </div>

        {summary && (
          <aside className="mb-10 rounded-md border border-up-amber/30 bg-up-amber/5 p-5">
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-up-amber">
              <span className="h-1 w-1 rounded-full bg-up-amber" />
              {t.legal.summaryLabel}
            </div>
            <div className="text-sm leading-relaxed text-up-text/90 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1">
              {summary}
            </div>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-up-dim">
              {t.legal.summaryDisclaimer}
            </p>
          </aside>
        )}

        <div className="grid gap-10 md:grid-cols-[220px_1fr]">
          {toc && toc.length > 0 && (
            <aside className="hidden md:block">
              <div className="sticky top-8">
                <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-up-amber">
                  {t.legal.tocLabel}
                </div>
                <ul className="space-y-1.5 border-l border-up-line/60 pl-3 text-[12px]">
                  {toc.map((tt) => (
                    <li key={tt.id}>
                      <a
                        href={`#${tt.id}`}
                        className="block text-up-dim transition-colors hover:text-up-orange"
                      >
                        {tt.label}
                      </a>
                    </li>
                  ))}
                </ul>
                <a
                  href="#top"
                  className="mt-6 block font-mono text-[10px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-orange"
                >
                  ↑ {t.legal.toTop}
                </a>
              </div>
            </aside>
          )}

          <article
            id="top"
            className="prose prose-invert max-w-none text-[14px] leading-relaxed text-up-dim
              [&_a]:text-up-orange [&_a:hover]:underline
              [&_section]:scroll-mt-8
              [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-up-orange [&_h2]:border-t [&_h2]:border-up-line [&_h2]:pt-8
              [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-base [&_h3]:text-up-amber
              [&_p]:my-3
              [&_li]:my-1
              [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5
              [&_strong]:text-up-text
              [&_code]:rounded-sm [&_code]:border [&_code]:border-up-line [&_code]:bg-black/40 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_code]:text-up-amber
              [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[12px]
              [&_th]:border [&_th]:border-up-line [&_th]:bg-black/40 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-mono [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-up-amber
              [&_td]:border [&_td]:border-up-line [&_td]:px-3 [&_td]:py-2 [&_td]:align-top"
          >
            {children}
          </article>
        </div>

        <footer className="mt-16 grid gap-6 border-t border-up-line/60 pt-8 text-[12px] sm:grid-cols-2">
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-up-amber">
              {t.legal.footerOfficialChannel}
            </div>
            <a
              href="mailto:contato@up2gether.com.br"
              className="text-up-orange hover:underline"
            >
              contato@up2gether.com.br
            </a>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-up-dim">
              {t.legal.footerOfficialSla}
            </p>
          </div>
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-up-amber">
              {t.legal.footerDpo}
            </div>
            <a
              href="mailto:contato@up2gether.com.br?subject=DPO"
              className="text-up-orange hover:underline"
            >
              contato@up2gether.com.br
            </a>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-up-dim">
              {t.legal.footerDpoSla}
            </p>
          </div>
        </footer>
      </main>
    </div>
  )
}

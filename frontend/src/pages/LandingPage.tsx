import { useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store'
import { discordLoginUrl, trackLandingVisit } from '@/features/auth/api'
import { VoteSim } from '@/components/landing/VoteSim'
import { VoteTimeline } from '@/components/landing/VoteTimeline'
import { MomentRow } from '@/components/landing/MomentRow'
import { LibraryVisual } from '@/components/landing/LibraryVisual'
import { CalendarVisual } from '@/components/landing/CalendarVisual'
import { FaqAccordion } from '@/components/landing/FaqAccordion'
import { useT } from '@/i18n'

const BOT_INVITE_URL =
  'https://discord.com/oauth2/authorize?client_id=1478820217697075250&permissions=68608&integration_type=0&scope=bot+applications.commands'

export function LandingPage() {
  const token = useAuthStore((s) => s.token)
  useEffect(() => {
    if (!token) trackLandingVisit()
  }, [token])
  if (token) return <Navigate to="/groups" replace />

  return (
    <div className="min-h-screen bg-up-bg text-up-dim">
      <div className="bg-up-grid-fine">
        <Header />

        <main className="relative">
          <Hero />
          <RecursosSection />
          <TrustStrip />
          <FaqSection />
          <FinalCta />
        </main>

        <Footer />
      </div>
    </div>
  )
}

function Header() {
  const t = useT().landing
  return (
    <header className="relative border-b border-up-line/60 bg-black/40 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <img src="/up2gether-logo.png" alt="Up2Gether" className="h-8 w-auto" />
          <span className="font-display text-lg text-up-orange">Up2Gether</span>
        </Link>
        <nav className="hidden items-center gap-8 text-[11px] uppercase tracking-widest sm:flex">
          <a href="#recursos" className="transition-colors hover:text-up-orange">
            {t.navFeatures}
          </a>
          <a href="#faq" className="transition-colors hover:text-up-orange">
            {t.navFaq}
          </a>
          <a
            href={discordLoginUrl()}
            className="text-up-orange transition-colors hover:text-up-amber"
          >
            {t.navLogin}
          </a>
        </nav>
      </div>
    </header>
  )
}

function Hero() {
  const t = useT().landing
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 up-scan pointer-events-none opacity-60" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-16 pb-20 md:grid-cols-[1.05fr_1fr] md:pt-24 md:pb-28">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-up-line/80 bg-black/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-up-amber">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-up-orange" />
            {t.betaOpen}
          </div>

          <h1 className="font-display text-5xl leading-[1.05] text-up-text sm:text-6xl">
            {t.heroTitle}<br />
            <span className="text-up-orange">{t.heroTitleHighlight}</span>{t.heroTitleEnd}
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-up-dim">
            {t.heroDesc}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href={discordLoginUrl()}
              className="inline-flex items-center justify-center rounded-sm bg-up-orange px-7 py-3 text-sm font-medium uppercase tracking-widest text-up-bg transition-colors hover:bg-up-amber"
            >
              {t.ctaLogin}
            </a>
            <a
              href={BOT_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-sm border border-up-line px-7 py-3 text-sm uppercase tracking-widest text-up-text transition-colors hover:border-up-orange hover:text-up-orange"
            >
              {t.ctaBot}
            </a>
          </div>

          <div className="mt-7 flex items-center gap-6 text-[11px] text-up-dim/80">
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-up-green" /> {t.freeBeta}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-up-green" /> {t.noCard}
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-10 bg-gradient-to-br from-up-orange/10 via-transparent to-transparent blur-2xl" />
          <VoteSim />
        </div>
      </div>
    </section>
  )
}

function RecursosSection() {
  const t = useT().landing
  return (
    <section id="recursos" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <div className="mb-10 flex flex-col gap-10 md:mb-14 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.4em] text-up-amber">
            {t.featuresLabel}
          </div>
          <h2 className="font-display text-4xl leading-tight text-up-text sm:text-5xl">
            {t.featuresTitle}<br />{t.featuresTitleBr}
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-up-dim">
            {t.featuresDesc}
          </p>
        </div>

        <ol className="grid w-full max-w-md grid-cols-3 gap-2 font-mono text-[10px] uppercase tracking-widest">
          <StepIndex n="01" label={t.step01} active />
          <StepIndex n="02" label={t.step02} />
          <StepIndex n="03" label={t.step03} />
        </ol>
      </div>

      <div className="space-y-28">
        <MomentRow
          eyebrow={t.votingEyebrow}
          title={t.votingTitle}
          body={<>{t.votingBody}</>}
          visual={<VoteTimeline />}
        />

        <MomentRow
          reverse
          eyebrow={t.libraryEyebrow}
          title={t.libraryTitle}
          body={<>{t.libraryBody}</>}
          visual={<LibraryVisual />}
        />

        <MomentRow
          eyebrow={t.calendarEyebrow}
          title={t.calendarTitle}
          body={<>{t.calendarBody}</>}
          visual={<CalendarVisual />}
        />
      </div>
    </section>
  )
}

function StepIndex({ n, label, active }: { n: string; label: string; active?: boolean }) {
  return (
    <li
      className={`flex flex-col items-start gap-1 rounded-sm border px-3 py-2.5 transition-colors ${
        active
          ? 'border-up-orange/60 bg-up-orange/5 text-up-orange'
          : 'border-up-line/60 bg-black/30 text-up-dim'
      }`}
    >
      <span className={active ? 'text-up-amber' : 'text-up-dim/60'}>{n}</span>
      <span className={active ? 'text-up-text' : 'text-up-text/80'}>{label}</span>
    </li>
  )
}

function TrustStrip() {
  const t = useT().landing
  return (
    <section className="border-y border-up-line/60 bg-black/30 py-14">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-3">
        <TrustCell stat="0" suffix={t.trustMessagesRead} body={t.trustMessagesBody} />
        <TrustCell stat="30" suffix={t.trustDaysToDelete} body={t.trustDaysBody} />
        <TrustCell stat={t.trustLgpd} suffix={t.trustCompliance} body={t.trustComplianceBody} />
      </div>
    </section>
  )
}

function TrustCell({ stat, suffix, body }: { stat: string; suffix: string; body: string }) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-4xl text-up-orange">{stat}</span>
        <span className="text-[11px] uppercase tracking-widest text-up-dim">{suffix}</span>
      </div>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-up-dim">{body}</p>
    </div>
  )
}

function FaqSection() {
  const t = useT().landing
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-24 md:py-32">
      <div className="mb-10">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.4em] text-up-amber">
          {t.faqLabel}
        </div>
        <h2 className="font-display text-4xl leading-tight text-up-text sm:text-5xl">
          {t.faqTitle}<br />{t.faqTitleBr}
        </h2>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-up-dim">
          {t.faqDesc}
          <Link to="/contact" className="text-up-orange hover:underline">
            {t.faqDescLink}
          </Link>
          {t.faqDescEnd}
        </p>
      </div>

      <FaqAccordion
        items={[
          {
            q: t.faqQ1,
            a: <>{t.faqA1}</>,
          },
          {
            q: t.faqQ2,
            a: (
              <>
                {t.faqA2pre}
                <code className="font-mono text-up-orange">{t.faqA2cmd1}</code>
                {t.faqA2mid}
                <code className="font-mono text-up-orange">{t.faqA2cmd2}</code>
                {t.faqA2post}
              </>
            ),
          },
          {
            q: t.faqQ3,
            a: (
              <>
                {t.faqA3pre}
                <Link to="/privacy" className="text-up-orange hover:underline">
                  {t.faqA3link}
                </Link>
                {t.faqA3post}
              </>
            ),
          },
          {
            q: t.faqQ4,
            a: <>{t.faqA4}</>,
          },
          {
            q: t.faqQ5,
            a: <>{t.faqA5}</>,
          },
          {
            q: t.faqQ6,
            a: (
              <>
                {t.faqA6pre}
                <code className="font-mono text-up-orange">{t.faqA6code}</code>
                {t.faqA6post}
              </>
            ),
          },
        ]}
      />
    </section>
  )
}

function FinalCta() {
  const t = useT().landing
  return (
    <section className="relative mx-auto max-w-5xl px-6 py-28">
      <div className="relative overflow-hidden rounded-md border border-up-orange/40 bg-gradient-to-br from-up-orange/10 via-black/60 to-black/80 px-8 py-14 text-center md:px-14 md:py-20">
        <div className="absolute inset-0 up-scan pointer-events-none opacity-50" />
        <div className="relative">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.4em] text-up-amber">
            {t.ctaStartLabel}
          </div>
          <h2 className="font-display text-4xl leading-tight text-up-text sm:text-5xl">
            {t.ctaTitle}<br />{t.ctaTitleBr}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-up-dim">
            {t.ctaDesc}
          </p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href={discordLoginUrl()}
              className="inline-flex items-center justify-center rounded-sm bg-up-orange px-8 py-3.5 text-sm font-medium uppercase tracking-widest text-up-bg transition-colors hover:bg-up-amber"
            >
              {t.ctaLogin}
            </a>
            <a
              href={BOT_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-sm border border-up-line px-8 py-3.5 text-sm uppercase tracking-widest text-up-text transition-colors hover:border-up-orange hover:text-up-orange"
            >
              {t.ctaBotShort}
            </a>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-up-dim/80">
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-up-green" /> {t.freeBeta}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-up-green" /> {t.noCard}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-up-green" /> {t.setupTime}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  const t = useT().landing
  return (
    <footer className="border-t border-up-line/60 bg-black/40">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <img src="/up2gether-logo.png" alt="Up2Gether" className="h-6 w-auto opacity-80" />
            <div className="text-[10px] uppercase tracking-widest text-up-dim/70">
              {t.footerTagline}
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-5 text-[11px] uppercase tracking-widest">
            <Link to="/privacy" className="transition-colors hover:text-up-orange">
              {t.footerPrivacy}
            </Link>
            <Link to="/terms" className="transition-colors hover:text-up-orange">
              {t.footerTerms}
            </Link>
            <Link to="/contact" className="transition-colors hover:text-up-orange">
              {t.footerContact}
            </Link>
            <a
              href={BOT_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-up-orange"
            >
              {t.footerAddBot}
            </a>
          </nav>
        </div>
      </div>
    </footer>
  )
}

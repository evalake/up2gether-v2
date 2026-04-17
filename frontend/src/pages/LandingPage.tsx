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
  return (
    <header className="relative border-b border-up-line/60 bg-black/40 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <img src="/up2gether-logo.png" alt="Up2Gether" className="h-8 w-auto" />
          <span className="font-display text-lg text-up-orange">Up2Gether</span>
        </Link>
        <nav className="hidden items-center gap-8 text-[11px] uppercase tracking-widest sm:flex">
          <a href="#recursos" className="transition-colors hover:text-up-orange">
            Recursos
          </a>
          <a href="#faq" className="transition-colors hover:text-up-orange">
            FAQ
          </a>
          <a
            href={discordLoginUrl()}
            className="text-up-orange transition-colors hover:text-up-amber"
          >
            Entrar
          </a>
        </nav>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 up-scan pointer-events-none opacity-60" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-16 pb-20 md:grid-cols-[1.05fr_1fr] md:pt-24 md:pb-28">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-up-line/80 bg-black/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-up-amber">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-up-orange" />
            Beta aberto
          </div>

          <h1 className="font-display text-5xl leading-[1.05] text-up-text sm:text-6xl">
            Decida o jogo em<br />
            <span className="text-up-orange">minutos</span>, não em horas.
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-up-dim">
            O Up2Gether organiza a votação, cruza a biblioteca do grupo e
            agenda a sessão. Integrado ao Discord da sua comunidade.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href={discordLoginUrl()}
              className="inline-flex items-center justify-center rounded-sm bg-up-orange px-7 py-3 text-sm font-medium uppercase tracking-widest text-up-bg transition-colors hover:bg-up-amber"
            >
              Entrar com Discord
            </a>
            <a
              href={BOT_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-sm border border-up-line px-7 py-3 text-sm uppercase tracking-widest text-up-text transition-colors hover:border-up-orange hover:text-up-orange"
            >
              Adicionar bot ao servidor
            </a>
          </div>

          <div className="mt-7 flex items-center gap-6 text-[11px] text-up-dim/80">
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-up-green" /> Gratuito durante o beta
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-up-green" /> Sem cartão de crédito
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
  return (
    <section id="recursos" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <div className="mb-10 flex flex-col gap-10 md:mb-14 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.4em] text-up-amber">
            Recursos
          </div>
          <h2 className="font-display text-4xl leading-tight text-up-text sm:text-5xl">
            Três etapas do fluxo,<br />sem atrito.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-up-dim">
            Do primeiro voto até a sessão marcada, tudo acontece no mesmo lugar.
            Cada etapa deixa histórico e notifica o grupo no Discord.
          </p>
        </div>

        <ol className="grid w-full max-w-md grid-cols-3 gap-2 font-mono text-[10px] uppercase tracking-widest">
          <StepIndex n="01" label="Votação" active />
          <StepIndex n="02" label="Biblioteca" />
          <StepIndex n="03" label="Agenda" />
        </ol>
      </div>

      <div className="space-y-28">
        <MomentRow
          eyebrow="Votação"
          title="Histórico auditável de cada rodada."
          body={
            <>
              Cada fase fica registrada: quem foi eliminado, com quantos votos e
              em que horário. O grupo vê o desenho completo da decisão, não só o
              vencedor. Sem revisão obscura, sem perda de contexto.
            </>
          }
          visual={<VoteTimeline />}
        />

        <MomentRow
          reverse
          eyebrow="Biblioteca Steam"
          title="Saiba quem tem cada jogo, sem precisar perguntar."
          body={
            <>
              Após conectar a Steam, o Up2Gether cruza a biblioteca de todos os
              membros. Fica fácil ver quais títulos o grupo inteiro possui,
              quem jogou recentemente e quem precisaria comprar para participar.
            </>
          }
          visual={<LibraryVisual />}
        />

        <MomentRow
          eyebrow="Agenda"
          title="Sessões com horário marcado e confirmação de presença."
          body={
            <>
              Cada sessão tem data, hora, limite de participantes e RSVP. É
              possível integrar com o Google Calendar e o lembrete chega no
              Discord 30 minutos antes do horário combinado.
            </>
          }
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
  return (
    <section className="border-y border-up-line/60 bg-black/30 py-14">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-3">
        <TrustCell
          stat="0"
          suffix="Mensagens lidas"
          body="O Up2Gether nunca acessa o conteúdo do chat. O login via Discord autoriza apenas identidade e lista de servidores."
        />
        <TrustCell
          stat="30"
          suffix="Dias para exclusão"
          body="A exclusão de conta é feita pelo próprio aplicativo e processada em até 30 dias, conforme a LGPD."
        />
        <TrustCell
          stat="LGPD"
          suffix="Em conformidade"
          body="Política de privacidade pública, finalidade de uso declarada e direito de portabilidade disponível."
        />
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
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-24 md:py-32">
      <div className="mb-10">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.4em] text-up-amber">
          FAQ
        </div>
        <h2 className="font-display text-4xl leading-tight text-up-text sm:text-5xl">
          Dúvidas antes<br />de começar.
        </h2>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-up-dim">
          O que a gente mais ouve quando um grupo novo entra. Se faltar
          alguma, o{' '}
          <Link to="/contact" className="text-up-orange hover:underline">
            contato
          </Link>{' '}
          responde direto.
        </p>
      </div>

      <FaqAccordion
        items={[
          {
            q: 'O serviço é gratuito?',
            a: (
              <>
                Durante o beta, sim, para qualquer grupo. Quando os planos pagos
                entrarem em vigor, grupos que já estiverem em uso serão mantidos
                em uma tarifa legada, sem cobrança.
              </>
            ),
          },
          {
            q: 'Preciso instalar alguma coisa?',
            a: (
              <>
                Não. O Up2Gether funciona direto no navegador. O bot oficial do
                Discord é opcional e recomendado, pois disponibiliza slash
                commands como <code className="font-mono text-up-orange">/up2gether</code> e{' '}
                <code className="font-mono text-up-orange">/vote</code>.
              </>
            ),
          },
          {
            q: 'O Up2Gether lê as mensagens do meu servidor?',
            a: (
              <>
                Não. O OAuth do Discord autoriza apenas identidade e lista de
                servidores. O conteúdo de chat nunca é acessado. Mais detalhes
                na{' '}
                <Link to="/privacy" className="text-up-orange hover:underline">
                  Política de Privacidade
                </Link>
                .
              </>
            ),
          },
          {
            q: 'Funciona para jogos fora da Steam?',
            a: (
              <>
                Sim. O catálogo inclui títulos da Riot (League of Legends,
                Valorant), Epic (Fortnite, Rocket League) e outras plataformas.
                Caso o jogo desejado não esteja listado, é possível adicioná-lo
                manualmente no grupo.
              </>
            ),
          },
          {
            q: 'Preciso conectar a Steam?',
            a: (
              <>
                A integração com a Steam é opcional. Sem ela, o grupo continua
                votando normalmente, porém sem o cruzamento automático de
                biblioteca. Também é possível marcar manualmente quais jogos
                cada pessoa já possui.
              </>
            ),
          },
          {
            q: 'Posso excluir meus dados?',
            a: (
              <>
                Sim. Em{' '}
                <code className="font-mono text-up-orange">Configurações</code>
                {' '}há a opção de encerrar a conta. Todos os dados são apagados
                em até 30 dias, conforme previsto pela LGPD.
              </>
            ),
          },
        ]}
      />
    </section>
  )
}

function FinalCta() {
  return (
    <section className="relative mx-auto max-w-5xl px-6 py-28">
      <div className="relative overflow-hidden rounded-md border border-up-orange/40 bg-gradient-to-br from-up-orange/10 via-black/60 to-black/80 px-8 py-14 text-center md:px-14 md:py-20">
        <div className="absolute inset-0 up-scan pointer-events-none opacity-50" />
        <div className="relative">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.4em] text-up-amber">
            Começar agora
          </div>
          <h2 className="font-display text-4xl leading-tight text-up-text sm:text-5xl">
            Conecte o seu grupo<br />e comece a organizar.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-up-dim">
            O primeiro grupo e a primeira votação acontecem no mesmo fluxo.
            Login pelo Discord, grupo criado, convite enviado para os membros.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href={discordLoginUrl()}
              className="inline-flex items-center justify-center rounded-sm bg-up-orange px-8 py-3.5 text-sm font-medium uppercase tracking-widest text-up-bg transition-colors hover:bg-up-amber"
            >
              Entrar com Discord
            </a>
            <a
              href={BOT_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-sm border border-up-line px-8 py-3.5 text-sm uppercase tracking-widest text-up-text transition-colors hover:border-up-orange hover:text-up-orange"
            >
              Adicionar bot
            </a>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-up-dim/80">
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-up-green" /> Gratuito durante o beta
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-up-green" /> Sem cartão de crédito
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-up-green" /> Configuração em 1 min
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-up-line/60 bg-black/40">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <img src="/up2gether-logo.png" alt="Up2Gether" className="h-6 w-auto opacity-80" />
            <div className="text-[10px] uppercase tracking-widest text-up-dim/70">
              Organize, vote e jogue em grupo
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-5 text-[11px] uppercase tracking-widest">
            <Link to="/privacy" className="transition-colors hover:text-up-orange">
              Privacidade
            </Link>
            <Link to="/terms" className="transition-colors hover:text-up-orange">
              Termos
            </Link>
            <Link to="/contact" className="transition-colors hover:text-up-orange">
              Contato
            </Link>
            <a
              href={BOT_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-up-orange"
            >
              Adicionar bot
            </a>
          </nav>
        </div>
      </div>
    </footer>
  )
}

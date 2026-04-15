import { useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store'
import { discordLoginUrl, trackLandingVisit } from '@/features/auth/api'

const BOT_INVITE_URL =
  'https://discord.com/oauth2/authorize?client_id=1478820217697075250&permissions=68608&integration_type=0&scope=bot+applications.commands'

export function LandingPage() {
  const token = useAuthStore((s) => s.token)
  // telemetria: registra visita so pra visitante (token presente ja passou do funil)
  useEffect(() => {
    if (!token) trackLandingVisit()
  }, [token])
  // user logado vai direto pro dashboard, landing e pra visitante
  if (token) return <Navigate to="/groups" replace />

  return (
    <div className="min-h-screen bg-nerv-grid text-nerv-dim">
      <div className="absolute inset-0 nerv-scan pointer-events-none" />

      <header className="relative border-b border-nerv-line bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src="/up2gether-logo.png" alt="Up2Gether" className="h-8 w-auto" />
            <span className="font-display text-lg text-nerv-orange">Up2Gether</span>
          </Link>
          <nav className="hidden items-center gap-6 text-[11px] uppercase tracking-widest sm:flex">
            <a href="#como-funciona" className="transition-colors hover:text-nerv-orange">
              Como funciona
            </a>
            <a href="#recursos" className="transition-colors hover:text-nerv-orange">
              Recursos
            </a>
            <a href="#faq" className="transition-colors hover:text-nerv-orange">
              FAQ
            </a>
            <a href={discordLoginUrl()} className="text-nerv-orange transition-colors hover:text-nerv-amber">
              Entrar
            </a>
          </nav>
        </div>
      </header>

      <main className="relative">
        {/* hero */}
        <section className="mx-auto max-w-5xl px-6 pt-20 pb-24 text-center">
          <div className="mb-4 text-[10px] uppercase tracking-[0.4em] text-nerv-amber">
            Para comunidades Discord que jogam juntas
          </div>
          <h1 className="font-display text-5xl leading-tight text-nerv-orange sm:text-6xl">
            Pare de perder 30 minutos<br />decidindo o que jogar
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-nerv-dim">
            Votação rápida, agenda compartilhada e compatibilidade automática de biblioteca.
            Tudo integrado ao Discord que o seu grupo já usa.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={discordLoginUrl()}
              className="w-full rounded-sm border border-nerv-orange bg-nerv-orange/10 px-8 py-3 text-sm uppercase tracking-widest text-nerv-orange transition-colors hover:bg-nerv-orange/20 sm:w-auto"
            >
              Entrar com Discord
            </a>
            <a
              href={BOT_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-sm border border-nerv-line bg-black/40 px-8 py-3 text-sm uppercase tracking-widest text-nerv-dim transition-colors hover:border-nerv-orange hover:text-nerv-orange sm:w-auto"
            >
              Adicionar bot no servidor
            </a>
          </div>

          <div className="mt-6 text-[10px] uppercase tracking-widest text-nerv-dim/70">
            Gratuito durante a fase de testes
          </div>
        </section>

        {/* como funciona */}
        <section id="como-funciona" className="border-y border-nerv-line bg-black/30 py-20">
          <div className="mx-auto max-w-5xl px-6">
            <div className="mb-12 text-center">
              <div className="mb-2 text-[10px] uppercase tracking-[0.4em] text-nerv-amber">
                Três passos
              </div>
              <h2 className="font-display text-3xl text-nerv-orange">Como funciona</h2>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              <div className="rounded-sm border border-nerv-line bg-black/40 p-6">
                <div className="font-display text-4xl text-nerv-orange/60">01</div>
                <div className="mt-3 font-display text-lg text-nerv-orange">
                  Conecte o Discord
                </div>
                <p className="mt-2 text-sm leading-relaxed">
                  Login via OAuth. O servidor onde você é administrador vira um grupo no
                  Up2Gether em um clique.
                </p>
              </div>

              <div className="rounded-sm border border-nerv-line bg-black/40 p-6">
                <div className="font-display text-4xl text-nerv-orange/60">02</div>
                <div className="mt-3 font-display text-lg text-nerv-orange">
                  Sincronize a biblioteca
                </div>
                <p className="mt-2 text-sm leading-relaxed">
                  Conecte a sua Steam para saber quem tem cada jogo. É opcional, mas elimina
                  o "eu não tenho esse jogo" em cada votação.
                </p>
              </div>

              <div className="rounded-sm border border-nerv-line bg-black/40 p-6">
                <div className="font-display text-4xl text-nerv-orange/60">03</div>
                <div className="mt-3 font-display text-lg text-nerv-orange">
                  Abra uma votação
                </div>
                <p className="mt-2 text-sm leading-relaxed">
                  Sistema de eliminação em múltiplas rodadas. O grupo decide rápido e o
                  Up2Gether notifica todos pelo Discord.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* recursos */}
        <section id="recursos" className="mx-auto max-w-5xl px-6 py-20">
          <div className="mb-12 text-center">
            <div className="mb-2 text-[10px] uppercase tracking-[0.4em] text-nerv-amber">
              O que tem dentro
            </div>
            <h2 className="font-display text-3xl text-nerv-orange">Recursos</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <FeatureCard
              title="Votação em múltiplas rodadas"
              body="Sistema de eliminação 30/15/7/3/2 que converge rápido. Chega de thread no Discord com quarenta mensagens para decidir o coop de sábado."
            />
            <FeatureCard
              title="Agenda compartilhada"
              body="Crie sessões com data, duração e participantes. Integração opcional com Google Calendar para lembrete automático."
            />
            <FeatureCard
              title="Compatibilidade Steam"
              body="Veja na hora quem tem cada jogo, quem jogou recentemente e quanto tempo dedicou. Nunca mais escolha um jogo que metade do grupo não possui."
            />
            <FeatureCard
              title="Bot Discord oficial"
              body="Slash commands nativos no servidor. Digite /up2gether para ver o resumo do grupo sem sair do Discord."
            />
            <FeatureCard
              title="Temas e temporadas"
              body="Organize fases do grupo, como um 'mês de coop e terror', com vencedor decidido por votação cega."
            />
            <FeatureCard
              title="Histórico de sessões"
              body="Veja o que o grupo jogou, quantas horas e com quem. Ótimo para retomar um jogo deixado de lado ou planejar a próxima campanha."
            />
          </div>
        </section>

        {/* faq */}
        <section id="faq" className="border-t border-nerv-line bg-black/30 py-20">
          <div className="mx-auto max-w-3xl px-6">
            <div className="mb-12 text-center">
              <div className="mb-2 text-[10px] uppercase tracking-[0.4em] text-nerv-amber">
                Perguntas frequentes
              </div>
              <h2 className="font-display text-3xl text-nerv-orange">FAQ</h2>
            </div>

            <div className="space-y-6">
              <FaqItem q="É gratuito?">
                Durante a fase de testes, é gratuito para qualquer grupo. Quando lançarmos
                planos pagos, os grupos que já estiverem em uso ficarão em uma tarifa legada,
                sem cobrança, para sempre.
              </FaqItem>
              <FaqItem q="Preciso instalar alguma coisa?">
                Não. Funciona direto no navegador. O bot do Discord é opcional, mas
                recomendado, pois permite comandos rápidos dentro do próprio servidor.
              </FaqItem>
              <FaqItem q="Vocês leem mensagens do Discord?">
                Não. Nunca acessamos o conteúdo de chat. Usamos o Discord apenas para
                identidade (saber quem é você) e para listar os servidores dos quais você
                faz parte. Os detalhes estão na{' '}
                <Link to="/privacy" className="text-nerv-orange hover:underline">
                  Política de Privacidade
                </Link>
                .
              </FaqItem>
              <FaqItem q="Preciso conectar a Steam?">
                Não é obrigatório. A conexão é opcional, mas ajuda muito na hora da votação,
                pois o app sabe quem tem cada jogo. Você pode usar o Up2Gether sem Steam,
                marcando manualmente os jogos desejados.
              </FaqItem>
              <FaqItem q="Funciona para jogos fora da Steam?">
                Sim. Títulos da Riot (League of Legends, Valorant), Epic Games (Fortnite) e
                outros grandes estão no catálogo. Jogos fora desse conjunto podem ser
                adicionados manualmente.
              </FaqItem>
              <FaqItem q="Posso sair e apagar meus dados?">
                Sim, a qualquer momento. Em Configurações você solicita a exclusão e os
                dados são apagados em até 30 dias. Esse é um direito garantido pela LGPD.
              </FaqItem>
            </div>
          </div>
        </section>

        {/* cta final */}
        <section className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="font-display text-3xl text-nerv-orange">
            Comece agora
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed">
            Leva um minuto para conectar o Discord e criar o primeiro grupo. Sem cartão,
            sem período de avaliação e sem letra miúda.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={discordLoginUrl()}
              className="w-full rounded-sm border border-nerv-orange bg-nerv-orange/10 px-8 py-3 text-sm uppercase tracking-widest text-nerv-orange transition-colors hover:bg-nerv-orange/20 sm:w-auto"
            >
              Entrar com Discord
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-nerv-line bg-black/40">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <img src="/up2gether-logo.png" alt="Up2Gether" className="h-6 w-auto opacity-80" />
              <div className="text-[10px] uppercase tracking-widest text-nerv-dim/70">
                Coordene, vote e jogue junto
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-5 text-[11px] uppercase tracking-widest">
              <Link to="/privacy" className="transition-colors hover:text-nerv-orange">
                Privacidade
              </Link>
              <Link to="/terms" className="transition-colors hover:text-nerv-orange">
                Termos
              </Link>
              <a
                href="mailto:contato@up2gether.com.br"
                className="transition-colors hover:text-nerv-orange"
              >
                Contato
              </a>
              <a
                href={BOT_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-nerv-orange"
              >
                Adicionar bot
              </a>
            </nav>
          </div>

          <div className="mt-6 border-t border-nerv-line pt-4 text-[10px] uppercase tracking-widest text-nerv-dim/50">
            Operado por Yuri da Silva Amaral, CNPJ 48.127.326/0001-00, Campo Grande/MS
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-sm border border-nerv-line bg-black/40 p-6 transition-colors hover:border-nerv-orange/50">
      <div className="font-display text-lg text-nerv-orange">{title}</div>
      <p className="mt-2 text-sm leading-relaxed">{body}</p>
    </div>
  )
}

function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-nerv-line bg-black/40 p-5">
      <div className="font-display text-nerv-amber">{q}</div>
      <div className="mt-2 text-sm leading-relaxed">{children}</div>
    </div>
  )
}

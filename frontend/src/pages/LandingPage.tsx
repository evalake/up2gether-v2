import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store'
import { discordLoginUrl } from '@/features/auth/api'

const BOT_INVITE_URL =
  'https://discord.com/oauth2/authorize?client_id=1478820217697075250&permissions=68608&integration_type=0&scope=bot+applications.commands'

export function LandingPage() {
  const token = useAuthStore((s) => s.token)
  // user logado vai direto pro dashboard, landing e pra visitante
  if (token) return <Navigate to="/groups" replace />

  return (
    <div className="min-h-screen bg-nerv-grid text-nerv-dim">
      <div className="absolute inset-0 nerv-scan pointer-events-none" />

      <header className="relative border-b border-nerv-line bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src="/up2gether-logo.png" alt="up2gether" className="h-8 w-auto" />
            <span className="font-display text-lg text-nerv-orange">up2gether</span>
          </Link>
          <nav className="hidden items-center gap-6 text-[11px] uppercase tracking-widest sm:flex">
            <a href="#como-funciona" className="transition-colors hover:text-nerv-orange">
              como funciona
            </a>
            <a href="#features" className="transition-colors hover:text-nerv-orange">
              recursos
            </a>
            <a href="#faq" className="transition-colors hover:text-nerv-orange">
              faq
            </a>
            <a href={discordLoginUrl()} className="text-nerv-orange transition-colors hover:text-nerv-amber">
              entrar
            </a>
          </nav>
        </div>
      </header>

      <main className="relative">
        {/* hero */}
        <section className="mx-auto max-w-5xl px-6 pt-20 pb-24 text-center">
          <div className="mb-4 text-[10px] uppercase tracking-[0.4em] text-nerv-amber">
            pra comunidades discord que jogam junto
          </div>
          <h1 className="font-display text-5xl leading-tight text-nerv-orange sm:text-6xl">
            pare de perder 30min<br />decidindo o que jogar
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-nerv-dim">
            votacao rapida, agenda compartilhada, compatibilidade automatica de biblioteca.
            tudo integrado ao discord que teu grupo ja usa.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={discordLoginUrl()}
              className="w-full rounded-sm border border-nerv-orange bg-nerv-orange/10 px-8 py-3 text-sm uppercase tracking-widest text-nerv-orange transition-colors hover:bg-nerv-orange/20 sm:w-auto"
            >
              entrar com discord
            </a>
            <a
              href={BOT_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-sm border border-nerv-line bg-black/40 px-8 py-3 text-sm uppercase tracking-widest text-nerv-dim transition-colors hover:border-nerv-orange hover:text-nerv-orange sm:w-auto"
            >
              adicionar bot no servidor
            </a>
          </div>

          <div className="mt-6 text-[10px] uppercase tracking-widest text-nerv-dim/70">
            gratis enquanto durar a fase de testes
          </div>
        </section>

        {/* como funciona */}
        <section id="como-funciona" className="border-y border-nerv-line bg-black/30 py-20">
          <div className="mx-auto max-w-5xl px-6">
            <div className="mb-12 text-center">
              <div className="mb-2 text-[10px] uppercase tracking-[0.4em] text-nerv-amber">
                tres passos
              </div>
              <h2 className="font-display text-3xl text-nerv-orange">como funciona</h2>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              <div className="rounded-sm border border-nerv-line bg-black/40 p-6">
                <div className="font-display text-4xl text-nerv-orange/60">01</div>
                <div className="mt-3 font-display text-lg text-nerv-orange">
                  conecta o discord
                </div>
                <p className="mt-2 text-sm leading-relaxed">
                  login com OAuth. o servidor onde voce e admin vira um grupo no up2gether em
                  um clique.
                </p>
              </div>

              <div className="rounded-sm border border-nerv-line bg-black/40 p-6">
                <div className="font-display text-4xl text-nerv-orange/60">02</div>
                <div className="mt-3 font-display text-lg text-nerv-orange">
                  sincroniza a biblioteca
                </div>
                <p className="mt-2 text-sm leading-relaxed">
                  conecta a steam pra saber quem tem o que. opcional mas elimina o "eu nao
                  tenho esse jogo" em cada votacao.
                </p>
              </div>

              <div className="rounded-sm border border-nerv-line bg-black/40 p-6">
                <div className="font-display text-4xl text-nerv-orange/60">03</div>
                <div className="mt-3 font-display text-lg text-nerv-orange">
                  abre uma votacao
                </div>
                <p className="mt-2 text-sm leading-relaxed">
                  sistema de eliminacao multi-rodada. o grupo decide rapido e o up2gether
                  avisa todo mundo no discord.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* features */}
        <section id="features" className="mx-auto max-w-5xl px-6 py-20">
          <div className="mb-12 text-center">
            <div className="mb-2 text-[10px] uppercase tracking-[0.4em] text-nerv-amber">
              o que tem dentro
            </div>
            <h2 className="font-display text-3xl text-nerv-orange">recursos</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <FeatureCard
              title="votacao multi-rodada"
              body="sistema de eliminacao 30/15/7/3/2 que converge rapido. chega de thread de discord com 40 mensagens pra decidir coop de sabado."
            />
            <FeatureCard
              title="agenda compartilhada"
              body="cria sessao com data, duracao e participantes. integracao opcional com google calendar pra lembrete automatico."
            />
            <FeatureCard
              title="compatibilidade steam"
              body="sabe na hora quem tem o jogo, quem jogou recentemente e quanto tempo. para de perder tempo com jogo que metade nao tem."
            />
            <FeatureCard
              title="bot discord"
              body="slash commands nativos no servidor. /up2gether mostra resumo do grupo sem sair do discord."
            />
            <FeatureCard
              title="temas e seasons"
              body="organiza fases do grupo tipo 'mes de coop-horror' com vencedor decidido por votacao cega."
            />
            <FeatureCard
              title="historia de sessoes"
              body="ve o que o grupo jogou, quantas horas, com quem. boa pra retomar jogo largado ou negociar a proxima campanha."
            />
          </div>
        </section>

        {/* faq */}
        <section id="faq" className="border-t border-nerv-line bg-black/30 py-20">
          <div className="mx-auto max-w-3xl px-6">
            <div className="mb-12 text-center">
              <div className="mb-2 text-[10px] uppercase tracking-[0.4em] text-nerv-amber">
                perguntas comuns
              </div>
              <h2 className="font-display text-3xl text-nerv-orange">faq</h2>
            </div>

            <div className="space-y-6">
              <FaqItem q="e gratis?">
                durante a fase de testes, tudo gratis pra qualquer grupo. quando lancarmos
                planos pagos, grupos que ja estao usando ficam em tarifa legada pra sempre.
              </FaqItem>
              <FaqItem q="precisa instalar alguma coisa?">
                nao. funciona no navegador. o bot discord e opcional mas recomendado, serve
                pra comandos rapidos dentro do servidor.
              </FaqItem>
              <FaqItem q="voces leem mensagens do discord?">
                nao. a gente nunca le conteudo de chat. so usamos o discord pra identidade
                (quem voce e) e pra saber de quais servidores voce faz parte. detalhes na{' '}
                <Link to="/privacy" className="text-nerv-orange hover:underline">
                  politica de privacidade
                </Link>
                .
              </FaqItem>
              <FaqItem q="preciso conectar a steam?">
                nao. e opcional, mas ajuda muito na hora de votar jogo (sabe quem tem o que).
                da pra usar o up2gether sem steam, marcando manual os jogos que o grupo quer.
              </FaqItem>
              <FaqItem q="funciona pra jogos fora da steam?">
                sim. riot (lol, valorant), epic (fortnite) e outros principais estao no
                catalogo. jogos custom da pra adicionar manualmente.
              </FaqItem>
              <FaqItem q="posso sair e apagar meus dados?">
                sim, a qualquer momento. em configuracoes voce solicita exclusao e os dados
                sao apagados em ate 30 dias. direito garantido pela LGPD.
              </FaqItem>
            </div>
          </div>
        </section>

        {/* cta final */}
        <section className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="font-display text-3xl text-nerv-orange">
            comeca agora
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed">
            leva um minuto pra conectar o discord e criar o primeiro grupo. sem cartao,
            sem trial, sem letra miuda.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={discordLoginUrl()}
              className="w-full rounded-sm border border-nerv-orange bg-nerv-orange/10 px-8 py-3 text-sm uppercase tracking-widest text-nerv-orange transition-colors hover:bg-nerv-orange/20 sm:w-auto"
            >
              entrar com discord
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-nerv-line bg-black/40">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <img src="/up2gether-logo.png" alt="up2gether" className="h-6 w-auto opacity-80" />
              <div className="text-[10px] uppercase tracking-widest text-nerv-dim/70">
                coordena, vota e joga junto
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-5 text-[11px] uppercase tracking-widest">
              <Link to="/privacy" className="transition-colors hover:text-nerv-orange">
                privacidade
              </Link>
              <Link to="/terms" className="transition-colors hover:text-nerv-orange">
                termos
              </Link>
              <a
                href="mailto:contato@up2gether.com.br"
                className="transition-colors hover:text-nerv-orange"
              >
                contato
              </a>
              <a
                href={BOT_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-nerv-orange"
              >
                adicionar bot
              </a>
            </nav>
          </div>

          <div className="mt-6 border-t border-nerv-line pt-4 text-[10px] uppercase tracking-widest text-nerv-dim/50">
            operado por yuri da silva amaral, cnpj 48.127.326/0001-00, campo grande/ms
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

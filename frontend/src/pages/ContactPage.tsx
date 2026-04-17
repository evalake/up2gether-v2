import { Link } from 'react-router-dom'

type Channel = {
  label: string
  email: string
  subject?: string
  body: string
  sla: string
}

const CHANNELS: Channel[] = [
  {
    label: 'Suporte geral',
    email: 'contato@up2gether.com.br',
    body:
      'Dúvidas sobre o produto, bugs, sugestões de funcionalidades e pedidos relativos à conta.',
    sla: 'Resposta em até 5 dias úteis',
  },
  {
    label: 'Privacidade e LGPD',
    email: 'contato@up2gether.com.br',
    subject: 'LGPD',
    body:
      'Solicitações de acesso, correção, portabilidade ou exclusão de dados, revogação de consentimento e reclamações relacionadas à Lei Geral de Proteção de Dados.',
    sla: 'Resposta em até 15 dias corridos',
  },
  {
    label: 'Encarregado de dados (DPO)',
    email: 'contato@up2gether.com.br',
    subject: 'DPO',
    body:
      'Contato direto com o Encarregado de Tratamento de Dados Pessoais para demandas formais previstas no art. 41 da LGPD.',
    sla: 'Resposta em até 15 dias corridos',
  },
  {
    label: 'Segurança',
    email: 'contato@up2gether.com.br',
    subject: 'SECURITY',
    body:
      'Divulgação responsável de vulnerabilidades. Inclua passos de reprodução e impacto estimado. Pedimos que não divulgue publicamente antes da correção.',
    sla: 'Reconhecimento em até 48 horas',
  },
  {
    label: 'Imprensa e parcerias',
    email: 'contato@up2gether.com.br',
    subject: 'IMPRENSA',
    body:
      'Entrevistas, solicitações de material de imprensa, propostas de parceria com criadores de conteúdo e integrações comerciais.',
    sla: 'Resposta em até 10 dias úteis',
  },
]

const NAV = [
  { to: '/privacy', label: 'Privacidade' },
  { to: '/terms', label: 'Termos' },
  { to: '/contact', label: 'Contato' },
]

function mailHref(c: Channel) {
  const q = new URLSearchParams()
  if (c.subject) q.set('subject', c.subject)
  const qs = q.toString()
  return `mailto:${c.email}${qs ? `?${qs}` : ''}`
}

export function ContactPage() {
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
            {NAV.map((n) => (
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
              Entrar
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
          <span className="text-up-text">Contato</span>
        </nav>

        <div className="mb-10 border-b border-up-line/60 pb-8">
          <h1 className="font-display text-4xl text-up-orange sm:text-5xl">Contato</h1>
          <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-up-dim">
            Escolha o canal abaixo conforme o tipo de solicitação. Todas as
            mensagens recebidas seguem o prazo de resposta indicado ao lado de
            cada canal. Para solicitações formais, indique o assunto sugerido.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          {CHANNELS.map((c) => (
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
                    <span className="rounded-sm border border-up-line bg-black/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-up-amber">
                      assunto: {c.subject}
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
              Horário de atendimento
            </div>
            <p className="text-[13px] leading-relaxed text-up-dim">
              Segunda a sexta, das 9h às 18h, no fuso de Brasília (GMT-3). Fora
              desse horário e em feriados nacionais, as mensagens são respondidas
              no próximo dia útil.
            </p>
          </div>
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-up-amber">
              Canais oficiais
            </div>
            <p className="text-[13px] leading-relaxed text-up-dim">
              O único canal formal de contato é por e-mail. Não há atendimento
              por redes sociais. Qualquer requisição em outros canais será
              direcionada ao endereço oficial.
            </p>
          </div>
        </section>

        <section className="mt-12 rounded-md border border-up-amber/30 bg-up-amber/5 p-6">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-up-amber">
            <span className="h-1 w-1 rounded-full bg-up-amber" />
            Antes de escrever
          </div>
          <ul className="space-y-2 text-[13px] leading-relaxed text-up-text/90">
            <li>
              Para <strong>excluir a sua conta</strong>, você pode fazer isso pelo
              próprio aplicativo, na seção <code className="font-mono text-[11px] text-up-orange">Configurações</code>.
              A exclusão por canal é destinada a casos em que o acesso ao
              aplicativo esteja indisponível.
            </li>
            <li>
              Para <strong>reportar um problema de segurança</strong>, use o
              canal de Segurança acima e evite divulgar detalhes publicamente até
              que uma correção esteja disponível.
            </li>
            <li>
              Para <strong>conhecer a identificação completa do operador</strong>
              {' '}(razão social, CNPJ e endereço), basta solicitar pelo canal de
              Suporte, e o dado é enviado de volta ao remetente.
            </li>
          </ul>
        </section>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-up-line/60 pt-6 font-mono text-[10px] uppercase tracking-widest text-up-dim">
          <div>
            <Link to="/privacy" className="transition-colors hover:text-up-orange">
              Privacidade
            </Link>
            <span className="mx-3 text-up-line">·</span>
            <Link to="/terms" className="transition-colors hover:text-up-orange">
              Termos
            </Link>
          </div>
          <span>up2gether.com.br</span>
        </footer>
      </main>
    </div>
  )
}

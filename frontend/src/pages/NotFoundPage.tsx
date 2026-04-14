import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-nerv-grid text-nerv-dim">
      <header className="border-b border-nerv-line bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3 transition-colors hover:text-nerv-orange">
            <img src="/up2gether-logo.png" alt="Up2Gether" className="h-8 w-auto" />
            <span className="font-display text-lg text-nerv-orange">Up2Gether</span>
          </Link>
          <nav className="flex items-center gap-4 text-[11px] uppercase tracking-widest">
            <Link to="/privacy" className="transition-colors hover:text-nerv-orange">
              Privacidade
            </Link>
            <Link to="/terms" className="transition-colors hover:text-nerv-orange">
              Termos
            </Link>
            <Link to="/login" className="transition-colors hover:text-nerv-orange">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
        <span className="font-display text-7xl text-nerv-orange">404</span>
        <h1 className="mt-4 font-display text-2xl text-nerv-dim">Página não encontrada</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-nerv-dim/80">
          O link que você acessou não existe, foi movido ou expirou. Verifique o endereço ou volte
          para a página inicial.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="rounded-lg border border-nerv-orange/40 bg-nerv-orange/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-nerv-orange transition-colors hover:bg-nerv-orange/20"
          >
            Voltar para o início
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-nerv-line px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-nerv-dim transition-colors hover:border-nerv-orange/40 hover:text-nerv-orange"
          >
            Entrar
          </Link>
        </div>

        <footer className="mt-24 border-t border-nerv-line pt-6 text-[10px] uppercase tracking-widest text-nerv-dim/70">
          Up2Gether · Coordenação de sessões para comunidades do Discord
        </footer>
      </main>
    </div>
  )
}

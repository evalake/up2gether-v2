import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-up-grid text-up-dim">
      <header className="border-b border-up-line bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3 transition-colors hover:text-up-orange">
            <img src="/up2gether-logo.png" alt="Up2Gether" className="h-8 w-auto" />
            <span className="font-display text-lg text-up-orange">Up2Gether</span>
          </Link>
          <nav className="flex items-center gap-4 text-[11px] uppercase tracking-widest">
            <Link to="/privacy" className="transition-colors hover:text-up-orange">
              Privacidade
            </Link>
            <Link to="/terms" className="transition-colors hover:text-up-orange">
              Termos
            </Link>
            <Link to="/login" className="transition-colors hover:text-up-orange">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
        <span className="font-display text-7xl text-up-orange">404</span>
        <h1 className="mt-4 font-display text-2xl text-up-dim">Página não encontrada</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-up-dim/80">
          O link que você acessou não existe, foi movido ou expirou. Verifique o endereço ou volte
          para a página inicial.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="rounded-lg border border-up-orange/40 bg-up-orange/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-up-orange transition-colors hover:bg-up-orange/20"
          >
            Voltar para o início
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-up-line px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-up-dim transition-colors hover:border-up-orange hover:text-up-orange"
          >
            Entrar
          </Link>
        </div>

        <footer className="mt-24 border-t border-up-line pt-6 text-[10px] uppercase tracking-widest text-up-dim/70">
          Up2Gether · Coordenação de sessões para comunidades do Discord
        </footer>
      </main>
    </div>
  )
}

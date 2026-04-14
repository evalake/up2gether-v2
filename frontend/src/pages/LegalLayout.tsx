import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function LegalLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-nerv-grid text-nerv-dim">
      <header className="border-b border-nerv-line bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3 transition-colors hover:text-nerv-orange">
            <img src="/up2gether-logo.png" alt="up2gether" className="h-8 w-auto" />
            <span className="font-display text-lg text-nerv-orange">up2gether</span>
          </Link>
          <nav className="flex items-center gap-4 text-[11px] uppercase tracking-widest">
            <Link to="/privacy" className="transition-colors hover:text-nerv-orange">
              privacidade
            </Link>
            <Link to="/terms" className="transition-colors hover:text-nerv-orange">
              termos
            </Link>
            <Link to="/login" className="transition-colors hover:text-nerv-orange">
              entrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-3xl text-nerv-orange">{title}</h1>
        <p className="mt-2 text-xs uppercase tracking-widest text-nerv-dim">{subtitle}</p>

        <div className="prose prose-invert mt-8 max-w-none text-sm leading-relaxed text-nerv-dim [&_a]:text-nerv-orange [&_a:hover]:underline [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-lg [&_h2]:text-nerv-orange [&_h3]:mt-6 [&_h3]:text-nerv-amber [&_li]:my-1 [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>

        <footer className="mt-16 border-t border-nerv-line pt-6 text-[10px] uppercase tracking-widest text-nerv-dim/70">
          operado por YURI DA SILVA AMARAL, CNPJ 48.127.326/0001-00, Campo Grande, MS.
          <br />
          contato: <a href="mailto:contato@up2gether.com.br" className="text-nerv-orange hover:underline">contato@up2gether.com.br</a>
        </footer>
      </main>
    </div>
  )
}

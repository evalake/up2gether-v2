import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

type Step = {
  n: number
  title: string
  hint: string
  cta: string
  path: string
  done: boolean
}

type Props = {
  groupId: string
  gamesCount: number
  votesCount: number
  sessionsCount: number
  hasTheme: boolean
}

export function FirstStepsGuide({ groupId, gamesCount, votesCount, sessionsCount, hasTheme }: Props) {
  const navigate = useNavigate()
  const steps: Step[] = [
    {
      n: 1,
      title: 'monte o acervo',
      hint: 'adicione os jogos que o grupo joga ou quer jogar. steam puxa metadata automático.',
      cta: 'adicionar jogos',
      path: `/groups/${groupId}/games`,
      done: gamesCount > 0,
    },
    {
      n: 2,
      title: 'abra uma votação',
      hint: 'com 2+ jogos o grupo pode votar pra decidir o próximo. engine estreita em stages.',
      cta: 'nova votação',
      path: `/groups/${groupId}/votes`,
      done: votesCount > 0,
    },
    {
      n: 3,
      title: 'agende a sessão',
      hint: 'toque num horário livre no calendário. o grupo inteiro é notificado no discord.',
      cta: 'ir pro calendário',
      path: `/groups/${groupId}/sessions`,
      done: sessionsCount > 0,
    },
    {
      n: 4,
      title: 'defina o tema do mês',
      hint: 'opcional. ciclo mensal onde cada um sugere e o grupo vota no tema (ex: coop, indie).',
      cta: 'ver tema',
      path: `/groups/${groupId}/themes`,
      done: hasTheme,
    },
  ]

  const allDone = steps.every((s) => s.done)
  if (allDone) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-sm border border-nerv-orange/20 bg-nerv-panel/40 p-5"
    >
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-nerv-orange/80">primeiros passos</div>
          <div className="mt-1 text-[12px] text-nerv-dim">conclua pra destravar o fluxo completo do grupo</div>
        </div>
        <div className="font-mono text-[10px] tabular-nums text-nerv-dim">
          <span className="text-nerv-orange">{steps.filter((s) => s.done).length}</span>/{steps.length}
        </div>
      </div>
      <ol className="grid gap-2 md:grid-cols-2">
        {steps.map((s, i) => (
          <motion.li
            key={s.n}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 + i * 0.05 }}
          >
            <button
              type="button"
              onClick={() => navigate(s.path)}
              disabled={s.done}
              className={`group flex w-full items-start gap-3 rounded-sm border p-3 text-left transition-all ${
                s.done
                  ? 'cursor-default border-nerv-green/30 bg-nerv-green/5 opacity-70'
                  : 'border-nerv-line/40 bg-black/20 hover:border-nerv-orange/60 hover:bg-nerv-orange/5'
              }`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border font-mono text-xs tabular-nums ${
                  s.done
                    ? 'border-nerv-green/60 bg-nerv-green/10 text-nerv-green'
                    : 'border-nerv-orange/40 bg-nerv-orange/5 text-nerv-orange'
                }`}
              >
                {s.done ? '✓' : s.n}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block font-display text-sm ${s.done ? 'text-nerv-dim line-through' : 'text-nerv-text'}`}>
                  {s.title}
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-nerv-dim">{s.hint}</span>
                {!s.done && (
                  <span className="mt-2 inline-block font-mono text-[10px] uppercase tracking-wider text-nerv-orange/80 transition-colors group-hover:text-nerv-orange">
                    {s.cta} →
                  </span>
                )}
              </span>
            </button>
          </motion.li>
        ))}
      </ol>
    </motion.section>
  )
}

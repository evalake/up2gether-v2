import { motion, AnimatePresence } from 'framer-motion'
import { useOnboarding } from '@/features/auth/hooks'

const STEPS: {
  key: 'has_group' | 'has_games' | 'has_session' | 'has_vote'
  label: string
  hint: string
}[] = [
  { key: 'has_group', label: 'conecta um servidor', hint: 'importa do discord em 1 clique' },
  { key: 'has_games', label: 'cataloga 3 jogos', hint: 'adiciona os top games da galera' },
  { key: 'has_session', label: 'cria uma sessão', hint: 'marca o próximo play' },
  { key: 'has_vote', label: 'vota num game', hint: 'participa de uma enquete' },
]

export function OnboardingChecklist() {
  const q = useOnboarding()
  if (!q.data) return null
  const { complete, steps_done, steps_total } = q.data
  if (complete) return null
  const pct = Math.round((steps_done / steps_total) * 100)
  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18 }}
        className="rounded-sm border border-up-orange/25 bg-up-panel/20 p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-up-orange">
              primeiro passo
            </div>
            <h2 className="mt-0.5 font-display text-lg text-up-text">
              bora ligar sua comunidade
            </h2>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl tabular-nums text-up-orange">
              {steps_done}
              <span className="text-up-dim">/{steps_total}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-up-line/30">
          <div
            className="h-full bg-up-orange transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {STEPS.map((s) => {
            const done = q.data![s.key]
            return (
              <li
                key={s.key}
                className={`flex items-start gap-2.5 rounded-sm border p-2.5 transition-colors ${
                  done
                    ? 'border-up-green/25 bg-up-green/5'
                    : 'border-up-line/50 bg-up-panel/10'
                }`}
              >
                <span
                  className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                    done
                      ? 'border-up-green/60 bg-up-green/20 text-up-green'
                      : 'border-up-line/50 text-up-dim'
                  }`}
                >
                  {done ? '·' : ''}
                </span>
                <div className="min-w-0">
                  <div
                    className={`font-mono text-[11px] uppercase tracking-wider ${
                      done ? 'text-up-green' : 'text-up-text'
                    }`}
                  >
                    {s.label}
                  </div>
                  <div className="mt-0.5 text-[11px] text-up-dim">{s.hint}</div>
                </div>
              </li>
            )
          })}
        </ul>
      </motion.section>
    </AnimatePresence>
  )
}

import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useT } from '@/i18n'

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
}

export function FirstStepsGuide({ groupId, gamesCount, votesCount, sessionsCount }: Props) {
  const navigate = useNavigate()
  const t = useT()
  const steps: Step[] = [
    {
      n: 1,
      title: t.firstSteps.buildLibrary,
      hint: t.firstSteps.buildLibraryHint,
      cta: t.firstSteps.addGames,
      path: `/groups/${groupId}/games`,
      done: gamesCount > 0,
    },
    {
      n: 2,
      title: t.firstSteps.openVote,
      hint: t.firstSteps.openVoteHint,
      cta: t.firstSteps.newVote,
      path: `/groups/${groupId}/votes`,
      done: votesCount > 0,
    },
    {
      n: 3,
      title: t.firstSteps.scheduleSession,
      hint: t.firstSteps.scheduleSessionHint,
      cta: t.firstSteps.goToCalendar,
      path: `/groups/${groupId}/sessions`,
      done: sessionsCount > 0,
    },
  ]

  const allDone = steps.every((s) => s.done)
  if (allDone) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-sm border border-up-orange/30 bg-up-panel/40 p-5"
    >
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-up-orange">{t.firstSteps.title}</div>
          <div className="mt-1 text-[12px] text-up-dim">{t.firstSteps.subtitle}</div>
        </div>
        <div className="font-mono text-[10px] tabular-nums text-up-dim">
          <span className="text-up-orange">{steps.filter((s) => s.done).length}</span>/{steps.length}
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
              className={`group flex w-full items-start gap-3 rounded-sm border p-3 text-left transition-colors ${
                s.done
                  ? 'cursor-default border-up-green/40 bg-up-green/5'
                  : 'border-up-line bg-black/20 hover:border-up-orange hover:bg-up-orange/5'
              }`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border font-mono text-xs tabular-nums ${
                  s.done
                    ? 'border-up-green/60 bg-up-green/15 text-up-green'
                    : 'border-up-orange/50 bg-up-orange/10 text-up-orange'
                }`}
              >
                {s.done ? '·' : s.n}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block font-display text-sm ${s.done ? 'text-up-dim line-through' : 'text-up-text'}`}>
                  {s.title}
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-up-dim">{s.hint}</span>
                {!s.done && (
                  <span className="mt-2 inline-block font-mono text-[10px] uppercase tracking-wider text-up-orange transition-colors group-hover:text-up-amber">
                    {s.cta}
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

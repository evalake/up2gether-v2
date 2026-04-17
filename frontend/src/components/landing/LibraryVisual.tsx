import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Cover } from './Cover'
import { MOCK } from './mockGames'
import { useT } from '@/i18n'

// Matriz de compatibilidade: membros nas colunas, jogos nas linhas,
// marcadores por celula (tem / quer / nao tem). Formato deliberadamente
// diferente do grid dinamico do VoteSim.

type Cell = 'has' | 'want' | 'none'

type Row = {
  id: string
  cells: Cell[]
}

const MEMBERS = [
  { initial: 'Y', color: 'bg-orange-500/80' },
  { initial: 'L', color: 'bg-sky-500/80' },
  { initial: 'R', color: 'bg-emerald-500/80' },
  { initial: 'M', color: 'bg-rose-500/80' },
  { initial: 'T', color: 'bg-violet-500/80' },
  { initial: 'K', color: 'bg-amber-500/80' },
]

const ROWS: Row[] = [
  { id: 'drg', cells: ['has', 'has', 'has', 'has', 'has', 'has'] },
  { id: 'hd2', cells: ['has', 'has', 'want', 'has', 'has', 'want'] },
  { id: 'cs2', cells: ['has', 'has', 'has', 'has', 'has', 'has'] },
  { id: 'brg', cells: ['has', 'want', 'has', 'none', 'has', 'none'] },
  { id: 'phas', cells: ['has', 'none', 'has', 'has', 'none', 'want'] },
]

function countOwns(r: Row) {
  return r.cells.filter((c) => c === 'has').length
}

export function LibraryVisual() {
  const t = useT()
  const [highlightRow, setHighlightRow] = useState<number | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setHighlightRow(null)
    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => setHighlightRow(0), 1200))
    timers.push(setTimeout(() => setHighlightRow(2), 2600))
    timers.push(setTimeout(() => setHighlightRow(1), 4000))
    timers.push(setTimeout(() => setHighlightRow(null), 5400))
    timers.push(setTimeout(() => setTick((t) => t + 1), 7800))
    return () => timers.forEach(clearTimeout)
  }, [tick])

  return (
    <div className="rounded-md border border-up-orange/25 bg-up-panel/60 p-5 shadow-[0_30px_80px_-30px_rgba(255,102,0,0.3)]">
      <div className="mb-4 flex items-center justify-between border-b border-up-line/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-up-green animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-up-dim">
            {t.landing.libraryCrossRef} · {t.landing.membersCount(6)}
          </span>
        </div>
        <span className="font-mono text-[10px] text-up-green">{t.landing.syncedCount(312, 340)}</span>
      </div>

      <div className="mb-2 grid grid-cols-[auto_auto_1fr_auto] items-center gap-x-3">
        <div className="w-10" aria-hidden />
        <div className="w-24" aria-hidden />
        <div className="flex items-center justify-end gap-2 pr-2">
          {MEMBERS.map((m, i) => (
            <div
              key={i}
              title={t.landing.memberN(i + 1)}
              className={`grid h-5 w-5 place-items-center rounded-full border border-black/40 ${m.color} font-mono text-[9px] font-bold text-black/80`}
            >
              {m.initial}
            </div>
          ))}
        </div>
        <div className="pl-2 text-right font-mono text-[9px] uppercase tracking-wider text-up-dim">
          {t.landing.has}
        </div>
      </div>

      <div className="space-y-1.5">
        {ROWS.map((r, i) => {
          const g = MOCK[r.id]
          if (!g) return null
          const owns = countOwns(r)
          const isFull = owns === MEMBERS.length
          const highlighted = highlightRow === i
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
              className={`grid grid-cols-[auto_auto_1fr_auto] items-center gap-x-3 rounded-sm border px-2 py-1.5 transition-all ${
                highlighted
                  ? 'border-up-orange/60 bg-up-orange/5'
                  : isFull
                    ? 'border-up-green/30 bg-up-green/5'
                    : 'border-up-line/50 bg-black/20'
              }`}
            >
              <Cover
                src={g.cover}
                name={g.name}
                gradient={g.gradient}
                showTitle={false}
                className="h-8 w-10 rounded-sm"
              />
              <span className="w-24 truncate text-[12px] text-up-text">{g.name}</span>
              <div className="flex items-center justify-end gap-2 pr-2">
                {r.cells.map((c, j) => (
                  <CellDot key={j} kind={c} />
                ))}
              </div>
              <div className="pl-2 text-right font-mono text-[11px] tabular-nums">
                <span className={isFull ? 'text-up-green' : 'text-up-amber'}>
                  {owns}/{MEMBERS.length}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-up-line/60 pt-3 font-mono text-[10px] uppercase tracking-wider text-up-dim">
        <LegendItem tone="has" label={t.landing.has} />
        <LegendItem tone="want" label={t.landing.wants} />
        <LegendItem tone="none" label={t.landing.none} />
      </div>
    </div>
  )
}

function CellDot({ kind }: { kind: Cell }) {
  if (kind === 'has') {
    return <span className="h-3 w-3 rounded-full bg-up-green shadow-[0_0_6px_rgba(0,255,102,0.5)]" />
  }
  if (kind === 'want') {
    return (
      <span className="grid h-3 w-3 place-items-center rounded-full border border-up-amber/70">
        <span className="h-1 w-1 rounded-full bg-up-amber" />
      </span>
    )
  }
  return <span className="h-3 w-3 rounded-full border border-up-line/70" />
}

function LegendItem({ tone, label }: { tone: Cell; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <CellDot kind={tone} />
      {label}
    </span>
  )
}

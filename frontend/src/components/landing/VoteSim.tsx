import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MockCursor, type CursorStep } from './MockCursor'
import { Cover } from './Cover'
import { MOCK, type MockGame } from './mockGames'

// Simulacao do fluxo de votacao: cursor clica em um card,
// votos aparecem em tempo real, lider emerge, rodada avanca.
// Espelha a UI real (cover, vote count, magenta para voto do user,
// orange para lider). Mockado apenas para a landing.

type Card = MockGame & { owns: number; total: number }

const CARDS: Card[] = [
  { ...MOCK.hd2, owns: 5, total: 7 },
  { ...MOCK.brg, owns: 4, total: 7 },
  { ...MOCK.cs2, owns: 7, total: 7 },
  { ...MOCK.pal, owns: 6, total: 7 },
  { ...MOCK.leth, owns: 6, total: 7 },
  { ...MOCK.phas, owns: 3, total: 7 },
]

type Phase = 0 | 1 | 2 | 3
const TOTAL_VOTERS = 7

export function VoteSim() {
  const [phase, setPhase] = useState<Phase>(0)
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [userPicked, setUserPicked] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const cursorSteps: CursorStep[] = useMemo(
    () => [
      { x: 78, y: 96, ms: 800 },
      { x: 18, y: 36, ms: 900, click: true, hold: 450 },
      { x: 110, y: 108, ms: 900 },
    ],
    [],
  )

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    const schedule = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms))

    setVotes({})
    setUserPicked(null)
    setPhase(0)

    schedule(1800, () => {
      setUserPicked('hd2')
      setVotes({ hd2: 1 })
    })
    schedule(2200, () => setVotes({ hd2: 2, cs2: 1 }))
    schedule(2600, () => setVotes({ hd2: 3, cs2: 1, leth: 1 }))
    schedule(3000, () => setVotes({ hd2: 3, cs2: 2, leth: 1, pal: 1 }))
    schedule(3400, () => setVotes({ hd2: 3, cs2: 2, leth: 1, pal: 1 }))

    schedule(4400, () => {
      setPhase(1)
      setVotes({})
    })
    schedule(4900, () => setVotes({ hd2: 2, cs2: 1 }))
    schedule(5300, () => setVotes({ hd2: 3, cs2: 2, leth: 1 }))
    schedule(5700, () => setVotes({ hd2: 4, cs2: 2, leth: 1 }))

    schedule(6400, () => {
      setPhase(2)
      setVotes({})
    })
    schedule(6800, () => setVotes({ hd2: 3, cs2: 1 }))
    schedule(7200, () => setVotes({ hd2: 5, cs2: 2 }))

    schedule(7900, () => setPhase(3))
    schedule(11800, () => setTick((t) => t + 1))

    return () => timers.forEach(clearTimeout)
  }, [tick])

  const roundCards = phase === 0
    ? CARDS
    : phase === 1
      ? CARDS.filter((c) => ['hd2', 'cs2', 'leth'].includes(c.id))
      : CARDS.filter((c) => ['hd2', 'cs2'].includes(c.id))

  const maxVotes = Math.max(1, ...Object.values(votes))
  const leaderId = Object.entries(votes).reduce<string | null>(
    (lead, [id, n]) => (lead === null || n > (votes[lead] ?? 0) ? id : lead),
    null,
  )
  const votesCast = Object.values(votes).reduce((a, b) => a + b, 0)
  const participationPct = Math.min(100, Math.round((votesCast / TOTAL_VOTERS) * 100))

  const phaseLabel =
    phase === 0 ? 'Fase 1/3 · 6 candidatos'
      : phase === 1 ? 'Fase 2/3 · 3 restam'
        : phase === 2 ? 'Fase final · 2 restam'
          : 'Encerrado'

  return (
    <div className="relative rounded-md border border-up-orange/25 bg-up-panel/60 p-4 shadow-[0_30px_80px_-30px_rgba(255,102,0,0.35)]">
      {phase === 0 && <MockCursor steps={cursorSteps} loop={false} />}

      <div className="mb-3 flex items-center justify-between border-b border-up-line/60 pb-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-up-orange animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-up-dim">
            Votação · sexta 21h
          </span>
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={phase}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.2 }}
            className="font-mono text-[10px] uppercase tracking-widest text-up-amber"
          >
            {phaseLabel}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-up-dim">
          <span>Participação</span>
          <span className={participationPct >= 70 ? 'text-up-green' : 'text-up-amber'}>
            {votesCast}/{TOTAL_VOTERS}
          </span>
        </div>
        <div className="h-[3px] overflow-hidden rounded-full bg-up-line/50">
          <motion.div
            animate={{ width: `${participationPct}%` }}
            transition={{ type: 'spring', stiffness: 90, damping: 20 }}
            className={`h-full ${participationPct >= 70 ? 'bg-up-green/80' : 'bg-up-amber/70'}`}
          />
        </div>
      </div>

      <div className="relative min-h-[270px]">
        <AnimatePresence mode="wait">
          {phase === 3 ? (
            <WinnerCard key="winner" card={CARDS.find((c) => c.id === 'hd2')!} />
          ) : (
            <motion.div
              key={phase}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={phase === 2 ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 gap-2 sm:grid-cols-3'}
            >
              {roundCards.map((c, i) => (
                <CandidateCard
                  key={c.id}
                  card={c}
                  index={i}
                  count={votes[c.id] ?? 0}
                  maxVotes={maxVotes}
                  isUserPick={userPicked === c.id}
                  isLeader={leaderId === c.id && (votes[c.id] ?? 0) > 0}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function CandidateCard({
  card,
  index,
  count,
  maxVotes,
  isUserPick,
  isLeader,
}: {
  card: Card
  index: number
  count: number
  maxVotes: number
  isUserPick: boolean
  isLeader: boolean
}) {
  const pct = Math.round((count / maxVotes) * 100)
  const border = isUserPick
    ? 'border-up-magenta shadow-[0_0_22px_rgba(255,0,102,0.22)]'
    : isLeader
      ? 'border-up-orange shadow-[0_0_20px_rgba(255,102,0,0.2)]'
      : 'border-up-line/60'
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className={`relative overflow-hidden rounded-sm border bg-black/40 transition-shadow ${border}`}
    >
      <Cover
        src={card.cover}
        name={card.name}
        gradient={card.gradient}
        className="h-16 w-full"
      />
      {isUserPick && (
        <div className="absolute right-1.5 top-1.5 z-10 rounded-sm bg-up-magenta/20 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-up-magenta">
          seu voto
        </div>
      )}
      <div className="px-2 py-1.5">
        <div className="flex items-center justify-between font-mono text-[9px] text-up-dim">
          <span>{card.owns}/{card.total} tem</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={count}
              initial={{ scale: 1.6, color: '#ff6600' }}
              animate={{ scale: 1, color: isLeader ? '#ff6600' : '#7c7c8e' }}
              transition={{ duration: 0.35 }}
              className="tabular-nums"
            >
              {count}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="mt-1 h-[2px] overflow-hidden rounded-full bg-up-line/40">
          <motion.div
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
            className={`h-full ${isUserPick ? 'bg-up-magenta' : 'bg-up-orange/70'}`}
          />
        </div>
      </div>
    </motion.div>
  )
}

function WinnerCard({ card }: { card: Card }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 24 }}
      className="relative overflow-hidden rounded-sm border border-up-orange/60 bg-gradient-to-br from-up-orange/15 via-black/40 to-black/60 p-5"
    >
      <div className="absolute inset-0 up-scan pointer-events-none opacity-40" />
      <div className="relative">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-up-amber">
          <span className="h-1 w-1 rounded-full bg-up-green" />
          Decidido
        </div>
        <div className="mt-3 flex items-center gap-4">
          <Cover
            src={card.cover}
            name={card.name}
            gradient={card.gradient}
            showTitle={false}
            className="h-16 w-28 rounded-sm"
          />
          <div>
            <div className="font-display text-2xl text-up-orange">{card.name}</div>
            <div className="mt-1 font-mono text-[10px] text-up-dim">
              5 votos · {card.owns}/{card.total} já têm
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-sm border border-up-green/40 bg-up-green/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-up-green">
          <span className="h-1 w-1 rounded-full bg-up-green animate-pulse" />
          Sessão agendada · sex 21h
        </div>
      </div>
    </motion.div>
  )
}

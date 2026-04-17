import { motion } from 'framer-motion'
import { Cover } from './Cover'
import { MOCK } from './mockGames'

// Timeline estatica do pos-votacao. Lista cronologica de rodadas
// mostrando o que foi eliminado e o vencedor. Formato deliberadamente
// diferente do grid dinamico do VoteSim.

type Round = {
  label: string
  at: string
  items: { id: string; votes: number; eliminated?: boolean; winner?: boolean }[]
}

const ROUNDS: Round[] = [
  {
    label: 'Fase 1 · 6 candidatos',
    at: '21h05',
    items: [
      { id: 'hd2', votes: 5 },
      { id: 'cs2', votes: 5 },
      { id: 'leth', votes: 3 },
      { id: 'pal', votes: 2, eliminated: true },
      { id: 'brg', votes: 2, eliminated: true },
      { id: 'phas', votes: 1, eliminated: true },
    ],
  },
  {
    label: 'Fase 2 · 3 restam',
    at: '21h09',
    items: [
      { id: 'hd2', votes: 5 },
      { id: 'cs2', votes: 3 },
      { id: 'leth', votes: 3, eliminated: true },
    ],
  },
  {
    label: 'Fase final · 2 restam',
    at: '21h13',
    items: [
      { id: 'hd2', votes: 5, winner: true },
      { id: 'cs2', votes: 2 },
    ],
  },
]

export function VoteTimeline() {
  return (
    <div className="rounded-md border border-up-orange/20 bg-up-panel/50 p-5 shadow-[0_30px_80px_-30px_rgba(255,102,0,0.25)]">
      <div className="mb-5 flex items-center justify-between border-b border-up-line/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-up-green" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-up-dim">
            Histórico da votação · sexta
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-up-amber">
          duração 8min
        </span>
      </div>

      <div className="relative space-y-5">
        <div className="absolute left-[7px] top-1 bottom-2 w-px bg-up-line/60" aria-hidden />

        {ROUNDS.map((round, ri) => (
          <motion.div
            key={ri}
            initial={{ opacity: 0, x: -6 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: ri * 0.1, duration: 0.3 }}
            className="relative pl-8"
          >
            <span
              className={`absolute left-0 top-0.5 h-3.5 w-3.5 rounded-full border-2 ${
                ri === ROUNDS.length - 1
                  ? 'border-up-orange bg-up-orange/20'
                  : 'border-up-amber/80 bg-black'
              }`}
            />
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-mono text-[11px] uppercase tracking-widest text-up-text">
                {round.label}
              </span>
              <span className="font-mono text-[10px] text-up-dim">{round.at}</span>
            </div>
            <div className="space-y-1.5">
              {round.items.map((it) => {
                const g = MOCK[it.id]
                if (!g) return null
                return (
                  <Row key={`${ri}-${it.id}`} game={g} votes={it.votes} eliminated={it.eliminated} winner={it.winner} />
                )
              })}
            </div>
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 4 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="relative pl-8"
        >
          <span className="absolute left-[-2px] top-1 h-5 w-5 rounded-full bg-up-orange shadow-[0_0_14px_rgba(255,102,0,0.7)]" />
          <div className="rounded-sm border border-up-orange/40 bg-up-orange/10 p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-up-amber">
              Sessão criada
            </div>
            <div className="mt-1 font-display text-sm text-up-text">
              Helldivers 2 · sexta 21h · 7/7 confirmados
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function Row({
  game,
  votes,
  eliminated,
  winner,
}: {
  game: { id: string; name: string; cover: string; gradient: string }
  votes: number
  eliminated?: boolean
  winner?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-sm border bg-black/30 px-2 py-1.5 transition-opacity ${
        winner
          ? 'border-up-orange/60 shadow-[0_0_18px_rgba(255,102,0,0.2)]'
          : eliminated
            ? 'border-up-line opacity-50'
            : 'border-up-line/60'
      }`}
    >
      <Cover
        src={game.cover}
        name={game.name}
        gradient={game.gradient}
        showTitle={false}
        className="h-8 w-14 shrink-0 rounded-sm"
      />
      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-[12px] ${
            winner ? 'text-up-orange' : eliminated ? 'text-up-dim line-through' : 'text-up-text'
          }`}
        >
          {game.name}
        </div>
        <div className="mt-0.5 h-[2px] overflow-hidden rounded-full bg-up-line/30">
          <div
            className={`h-full ${winner ? 'bg-up-orange' : eliminated ? 'bg-up-line' : 'bg-up-amber/70'}`}
            style={{ width: `${Math.min(100, votes * 18)}%` }}
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 font-mono text-[10px]">
        <span className={winner ? 'text-up-orange' : eliminated ? 'text-up-dim' : 'text-up-amber'}>
          {votes}
        </span>
        {winner && (
          <span className="rounded-sm border border-up-orange/50 bg-up-orange/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-up-orange">
            vencedor
          </span>
        )}
        {eliminated && !winner && (
          <span className="font-mono text-[9px] uppercase tracking-wider text-up-dim">
            fora
          </span>
        )}
      </div>
    </div>
  )
}

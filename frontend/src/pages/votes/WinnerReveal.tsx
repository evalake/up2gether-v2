import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { steamCover, steamHeaderLarge } from '@/lib/steamCover'
import type { Game } from '@/features/games/api'

type VoteRow = {
  id: string
  title: string
  ballots_count: number
  eligible_voter_count: number
  winner_game_id: string | null
}

export function WinnerReveal({
  game, vote, candidates, onClose,
}: {
  game: Game
  vote: VoteRow
  candidates: Game[]
  onClose: () => void
}) {
  const cover = steamHeaderLarge(game.steam_appid) ?? steamCover(game)
  const [phase, setPhase] = useState<'scanning' | 'shuffling' | 'lockin' | 'winner'>('scanning')
  const [shuffleIdx, setShuffleIdx] = useState(0)
  const [imgReady, setImgReady] = useState(false)

  useEffect(() => {
    if (!cover) { setImgReady(true); return }
    const img = new Image()
    img.onload = () => setImgReady(true)
    img.onerror = () => setImgReady(true)
    img.src = cover
  }, [cover])

  // fases: scanning (1.2s) -> shuffling (2.4s) -> lockin (0.7s) -> winner
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('shuffling'), 1200)
    const t2 = setTimeout(() => setPhase('lockin'), 1200 + 2400)
    const t3 = setTimeout(() => setPhase('winner'), 1200 + 2400 + 700)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  // cicla entre candidatos na fase shuffling
  useEffect(() => {
    if (phase !== 'shuffling' || candidates.length === 0) return
    let delay = 80
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      setShuffleIdx((i) => (i + 1) % candidates.length)
      delay = Math.min(delay * 1.08, 220)
      setTimeout(tick, delay)
    }
    const id = setTimeout(tick, delay)
    return () => { cancelled = true; clearTimeout(id) }
  }, [phase, candidates.length])

  const showWinner = phase === 'winner' && imgReady
  const shown = phase === 'shuffling' && candidates.length > 0
    ? candidates[shuffleIdx]
    : game
  const shownCover = phase === 'shuffling'
    ? steamHeaderLarge(shown.steam_appid) ?? steamCover(shown)
    : cover

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={phase === 'winner' ? onClose : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
    >
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_2px,rgba(255,255,255,0.02)_2px,rgba(255,255,255,0.02)_3px)]" />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-lg overflow-hidden rounded-sm border bg-nerv-panel transition-all ${
          showWinner
            ? 'border-nerv-orange shadow-[0_0_180px_rgba(255,102,0,0.55)]'
            : 'border-nerv-orange/40 shadow-[0_0_80px_rgba(255,102,0,0.25)]'
        }`}
      >
        <div className="flex items-center justify-between border-b border-nerv-orange/20 bg-black/40 px-4 py-2">
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className={`h-1.5 w-1.5 rounded-full ${showWinner ? 'bg-nerv-orange' : 'bg-nerv-magenta'}`}
            />
            <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-nerv-orange/80">
              {phase === 'scanning' && 'apurando votos...'}
              {phase === 'shuffling' && 'computando resultado...'}
              {phase === 'lockin' && 'finalizando...'}
              {phase === 'winner' && 'resultado final'}
            </span>
          </div>
          <span className="truncate font-mono text-[9px] uppercase tracking-wider text-nerv-dim">{vote.title}</span>
        </div>

        <div className="relative aspect-[16/9] overflow-hidden bg-black">
          <AnimatePresence mode="wait">
            {phase === 'scanning' && (
              <motion.div
                key="scan"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-nerv-orange/60">
                    {vote.ballots_count} / {vote.eligible_voter_count} cédulas
                  </div>
                  <div className="mt-3 flex justify-center gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scaleY: [1, 2.2, 1] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12 }}
                        className="h-4 w-1 origin-bottom bg-nerv-orange"
                      />
                    ))}
                  </div>
                </div>
                <motion.div
                  animate={{ y: ['0%', '100%'] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-nerv-orange to-transparent"
                />
              </motion.div>
            )}

            {(phase === 'shuffling' || phase === 'lockin' || phase === 'winner') && shownCover && (
              <motion.img
                key={shown.id + phase}
                src={shownCover}
                alt=""
                initial={{ opacity: 0, scale: 1.08 }}
                animate={{
                  opacity: showWinner ? 1 : phase === 'lockin' ? 0.9 : 0.75,
                  scale: showWinner ? 1 : 1.04,
                }}
                transition={{ duration: phase === 'shuffling' ? 0.08 : 0.4 }}
                className="h-full w-full object-cover"
              />
            )}
          </AnimatePresence>

          {phase === 'shuffling' && (
            <>
              <motion.div
                animate={{ y: ['-5%', '105%'] }}
                transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-nerv-orange/20 to-transparent"
              />
              <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_4px,rgba(255,0,102,0.08)_4px,rgba(255,0,102,0.08)_5px)]" />
            </>
          )}

          {phase === 'lockin' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.3, 1, 0] }}
              transition={{ duration: 0.7 }}
              className="absolute inset-0 bg-nerv-orange/80"
            />
          )}

          {showWinner && (
            <motion.div
              initial={{ x: '-120%' }}
              animate={{ x: '120%' }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-nerv-panel via-transparent to-transparent" />
        </div>

        <div className="min-h-[72px] px-6 py-4 text-center">
          <AnimatePresence mode="wait">
            {phase === 'scanning' && (
              <motion.div
                key="scanning-name"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-mono text-xs uppercase tracking-[0.25em] text-nerv-dim"
              >
                calculando consenso
              </motion.div>
            )}
            {phase === 'shuffling' && (
              <motion.div
                key={'shuf-' + shown.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.08 }}
                className="font-display text-xl text-nerv-text/80"
              >
                {shown.name}
              </motion.div>
            )}
            {(phase === 'lockin' || phase === 'winner') && (
              <motion.div
                key="winner-name"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              >
                <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-nerv-orange/70">vencedor</div>
                <div className="mt-0.5 font-display text-2xl text-nerv-orange">{game.name}</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
                  {vote.ballots_count} / {vote.eligible_voter_count} votaram
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: showWinner ? 1 : 0.3 }}
          disabled={!showWinner}
          onClick={onClose}
          className="block w-full border-t border-nerv-orange/30 bg-black/40 py-3 font-mono text-[10px] uppercase tracking-[0.25em] text-nerv-orange transition-colors hover:bg-nerv-orange/15 disabled:cursor-wait"
        >
          {showWinner ? 'fechar' : 'aguarde...'}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

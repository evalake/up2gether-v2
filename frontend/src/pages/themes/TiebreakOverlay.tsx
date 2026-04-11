import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Suggestion } from '@/features/themes/api'

export function TiebreakOverlay({ data, onClose }: { data: { kind: string; tied: Suggestion[]; winner: Suggestion }; onClose: () => void }) {
  const isTiebreak = data.kind.startsWith('tiebreak')
  const [stage, setStage] = useState<'spin' | 'reveal'>(isTiebreak ? 'spin' : 'spin')
  useEffect(() => {
    const delay = data.kind === 'tiebreak_coin' ? 1800 : isTiebreak ? 2500 : 3800
    const t = setTimeout(() => setStage('reveal'), delay)
    return () => clearTimeout(t)
  }, [data.kind, isTiebreak])

  useEffect(() => {
    if (data.winner.image_url) {
      const img = new Image()
      img.src = data.winner.image_url
    }
  }, [data.winner.image_url])

  const headerLabel = isTiebreak
    ? (data.kind === 'tiebreak_coin' ? 'empate · cara ou coroa' : 'empate · roleta')
    : data.kind === 'admin' ? 'decisão do admin' : 'apurando votos...'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-6 backdrop-blur-md"
      onClick={stage === 'reveal' ? onClose : undefined}
    >
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_2px,rgba(255,255,255,0.02)_2px,rgba(255,255,255,0.02)_3px)]" />
      <div className="relative w-full max-w-md text-center">
        <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-nerv-magenta">
          {headerLabel}
        </div>
        {stage === 'spin' && isTiebreak ? (
          <motion.div
            animate={
              data.kind === 'tiebreak_coin'
                ? { rotateY: [0, 1080], scale: [1, 1.1, 1] }
                : { rotate: [0, 1440] }
            }
            transition={{ duration: data.kind === 'tiebreak_coin' ? 1.6 : 2.3, ease: 'easeOut' }}
            className="mx-auto grid h-40 w-40 place-items-center rounded-full border-2 border-nerv-orange/60 bg-nerv-panel/60 font-display text-5xl text-nerv-orange"
          >
            ?
          </motion.div>
        ) : stage === 'spin' && !isTiebreak ? (
          <div className="mx-auto flex h-40 w-full max-w-sm flex-col items-center justify-center gap-3 rounded-sm border border-nerv-orange/40 bg-nerv-panel/60">
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scaleY: [1, 2.4, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12 }}
                  className="h-5 w-1 origin-bottom bg-nerv-magenta"
                />
              ))}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-nerv-dim">calculando consenso</div>
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              className="h-px w-32 bg-gradient-to-r from-transparent via-nerv-magenta to-transparent"
            />
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="mx-auto overflow-hidden rounded-sm border border-nerv-orange/60 bg-nerv-panel/80"
          >
            {data.winner.image_url && (
              <div className="h-32 w-full overflow-hidden">
                <img src={data.winner.image_url} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="p-5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-nerv-magenta">vencedor</div>
              <div className="mt-1 font-display text-2xl text-nerv-orange">{data.winner.name}</div>
              <div className="mt-1 font-mono text-[10px] text-nerv-dim">sugerido por {data.winner.user_name ?? '?'}</div>
            </div>
          </motion.div>
        )}
        {data.tied.length > 0 && (
          <div className="mt-4 font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
            {data.tied.length} empatados
          </div>
        )}
        {stage === 'reveal' && (
          <button onClick={onClose} className="mt-4 font-mono text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-orange">
            fechar
          </button>
        )}
      </div>
    </motion.div>
  )
}

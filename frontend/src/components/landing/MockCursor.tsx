import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

// cursor falso percorrendo pontos ancora. cada step tem (x,y) em %
// relativo ao container, duracao de movimento e flag de "click".
// o click dispara um ripple e chama opcional onClick(step).

export type CursorStep = {
  x: number
  y: number
  ms: number
  click?: boolean
  hold?: number
}

type Props = {
  steps: CursorStep[]
  onStep?: (i: number) => void
  loop?: boolean
}

export function MockCursor({ steps, onStep, loop = true }: Props) {
  const [i, setI] = useState(0)
  const [clicking, setClicking] = useState(false)
  const s = steps[i]

  useEffect(() => {
    if (!s) return
    onStep?.(i)
    const total = s.ms + (s.hold ?? 0)
    let clickTimer: ReturnType<typeof setTimeout> | null = null
    if (s.click) {
      clickTimer = setTimeout(() => {
        setClicking(true)
        setTimeout(() => setClicking(false), 320)
      }, s.ms)
    }
    const t = setTimeout(() => {
      setI((prev) => {
        const next = prev + 1
        if (next >= steps.length) return loop ? 0 : prev
        return next
      })
    }, total)
    return () => {
      clearTimeout(t)
      if (clickTimer) clearTimeout(clickTimer)
    }
  }, [i, s, steps.length, loop, onStep])

  if (!s) return null

  return (
    <motion.div
      className="pointer-events-none absolute z-30"
      animate={{ left: `${s.x}%`, top: `${s.y}%` }}
      transition={{ duration: s.ms / 1000, ease: [0.32, 0.72, 0.35, 1] }}
      style={{ left: `${s.x}%`, top: `${s.y}%` }}
    >
      <div className="relative -translate-x-1 -translate-y-1">
        <svg width="18" height="22" viewBox="0 0 18 22" className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
          <path
            d="M1 1 L1 17 L5 13 L8 20 L10.5 19 L7.5 12 L13 12 Z"
            fill="#ecebf2"
            stroke="#0b0b14"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
        {clicking && (
          <motion.span
            initial={{ scale: 0.2, opacity: 0.9 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            className="absolute left-0 top-0 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-up-orange bg-up-orange/20"
          />
        )}
      </div>
    </motion.div>
  )
}

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

type Props = {
  title: string
  hint?: string
  action?: ReactNode
  glyph?: string
  tone?: 'default' | 'soft'
}

export function EmptyState({ title, hint, action, glyph = '◈', tone = 'default' }: Props) {
  const softer = tone === 'soft'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-sm border border-dashed px-6 py-12 text-center ${
        softer ? 'border-nerv-line/40 bg-black/10' : 'border-nerv-orange/25 bg-black/20'
      }`}
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,102,0,0.08),transparent_60%)]" />
      <motion.div
        animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.04, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative mb-4 grid h-14 w-14 place-items-center rounded-full border border-nerv-orange/40 bg-nerv-orange/5 font-display text-2xl text-nerv-orange/80"
      >
        {glyph}
      </motion.div>
      <p className="relative font-display text-base text-nerv-text">{title}</p>
      {hint && (
        <p className="relative mt-2 max-w-sm text-[12px] leading-relaxed text-nerv-dim">
          {hint}
        </p>
      )}
      {action && <div className="relative mt-5 flex justify-center">{action}</div>}
    </motion.div>
  )
}

import { motion } from 'framer-motion'

type Props = { label?: string; size?: 'sm' | 'md' }

export function Loading({ label = 'sincronizando', size = 'md' }: Props) {
  const dim = size === 'sm' ? 18 : 28
  return (
    <div className="flex items-center gap-3 text-sm text-nerv-orange/90">
      <motion.span
        className="relative grid place-items-center"
        style={{ width: dim, height: dim }}
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      >
        <span
          className="absolute inset-0 rounded-full border border-nerv-orange/30"
          style={{ borderTopColor: 'currentColor', borderRightColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: 'transparent' }}
        />
        <motion.span
          className="absolute inset-[3px] rounded-full border border-nerv-orange/20"
          animate={{ rotate: -360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          style={{ borderBottomColor: 'currentColor', borderTopColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent' }}
        />
      </motion.span>
      <motion.span
        className="font-mono text-[11px] uppercase tracking-[0.2em] text-nerv-orange/80"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {label}
      </motion.span>
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`relative overflow-hidden rounded-sm bg-nerv-line/20 ${className}`}
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.span
        className="absolute inset-0 bg-gradient-to-r from-transparent via-nerv-orange/10 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  )
}

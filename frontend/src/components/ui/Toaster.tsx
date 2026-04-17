import { AnimatePresence, motion } from 'framer-motion'
import { useToastStore } from './toast'

const styles: Record<string, string> = {
  success: 'border-up-green/40 bg-up-panel/95 text-up-green',
  error: 'border-up-red/40 bg-up-panel/95 text-up-red',
  info: 'border-up-orange/40 bg-up-panel/95 text-up-orange',
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-1.5">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            initial={{ x: 120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 120, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto flex items-center gap-2 rounded-sm border px-3 py-1.5 text-left backdrop-blur-sm ${styles[t.kind]}`}
          >
            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'currentColor' }} />
            <span className="font-mono text-[11px] text-up-text">{t.message}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}

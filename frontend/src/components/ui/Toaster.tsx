import { AnimatePresence, motion } from 'framer-motion'
import { useToastStore } from './toast'

const styles: Record<string, string> = {
  success: 'border-nerv-green/60 bg-black/90 text-nerv-green',
  error: 'border-nerv-red/60 bg-black/90 text-nerv-red',
  info: 'border-nerv-orange/60 bg-black/90 text-nerv-orange',
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-96 flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto flex items-center gap-3 rounded-sm border px-4 py-3 text-left shadow-[0_0_30px_rgba(255,102,0,0.15)] backdrop-blur-sm ${styles[t.kind]}`}
          >
            <span className="inline-block h-2 w-2 nerv-pulse rounded-full" style={{ background: 'currentColor' }} />
            <span className="text-sm text-nerv-text">{t.message}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}

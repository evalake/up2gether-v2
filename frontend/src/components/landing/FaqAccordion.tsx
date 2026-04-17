import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

type Item = { q: string; a: ReactNode }

export function FaqAccordion({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <ul className="divide-y divide-up-line/60 border-y border-up-line/60">
      {items.map((it, i) => {
        const isOpen = open === i
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="group flex w-full items-center justify-between gap-6 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className={`text-base transition-colors ${isOpen ? 'text-up-orange' : 'text-up-text group-hover:text-up-orange'}`}>
                {it.q}
              </span>
              <span
                className={`font-mono text-xs transition-colors ${isOpen ? 'text-up-orange' : 'text-up-dim'}`}
              >
                {isOpen ? '-' : '+'}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="pb-5 pr-10 text-sm leading-relaxed text-up-dim">
                    {it.a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        )
      })}
    </ul>
  )
}

import { motion } from 'framer-motion'
import type { GroupWithStats } from '@/features/groups/api'

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

type Props = {
  group: GroupWithStats
  isSoleAdmin: boolean
  isSysAdmin: boolean
  now: Date
  stats: { members: number; games: number; votes: number; sessions: number }
  fallbackGameCover: string | null
  onLeave: () => void
}

export function GroupHero({ group, isSoleAdmin, isSysAdmin, now, stats, fallbackGameCover, onLeave }: Props) {
  const hasBanner = !!group.banner_url
  const hasSplash = !!group.splash_url
  const hasIcon = !!group.icon_url
  const bgUrl = group.banner_url || group.splash_url || group.icon_url || (!hasBanner && !hasSplash && !hasIcon ? fallbackGameCover : null)
  const isIcon = !hasBanner && !hasSplash && hasIcon
  const isGameCover = !hasBanner && !hasSplash && !hasIcon && !!fallbackGameCover

  return (
    <motion.header
      {...fadeUp}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden border border-nerv-orange/25 bg-gradient-to-br from-nerv-panel/60 via-nerv-panel/30 to-transparent px-8 py-10"
      style={{ clipPath: 'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 22px 100%, 0 calc(100% - 22px))' }}
    >
      {bgUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0"
        >
          <img
            src={bgUrl}
            alt=""
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            className={`h-full w-full object-cover ${
              hasBanner ? 'opacity-40'
              : hasSplash ? 'opacity-35'
              : isGameCover ? 'opacity-45 blur-sm'
              : 'scale-[2] opacity-40 blur-3xl saturate-150'
            }`}
          />
          {isIcon && (
            <img
              src={bgUrl}
              alt=""
              aria-hidden
              className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-nerv-bg via-nerv-bg/70 to-nerv-bg/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-nerv-bg/80 via-transparent to-nerv-bg/40" />
        </motion.div>
      )}
      <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 border-l-2 border-t-2 border-nerv-orange/60" />
      <span className="pointer-events-none absolute bottom-1 right-1 h-4 w-4 border-b-2 border-r-2 border-nerv-orange/60" />
      <div className="absolute left-0 right-0 top-0 flex items-center justify-between border-b border-nerv-orange/15 bg-black/30 px-4 py-1 font-mono text-[9px] uppercase tracking-[0.25em] text-nerv-orange/70">
        <span>group monitor // {group.name}</span>
        <span className="tabular-nums text-nerv-green">{now.toLocaleTimeString('pt-BR', { hour12: false })}</span>
      </div>
      <div className="h-5" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 3px, currentColor 3px 4px)',
          color: '#ff6b35',
        }}
      />
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ transformOrigin: 'left' }}
        className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-nerv-orange via-nerv-magenta to-transparent"
      />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-nerv-magenta">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-nerv-green nerv-pulse" />
            <span>{group.user_role}</span>
            {isSoleAdmin && <span className="text-nerv-dim">· único admin</span>}
            {isSysAdmin && <span className="text-nerv-red">· sys_admin</span>}
          </div>
          <h1 className="mt-3 font-display text-5xl leading-none text-nerv-text sm:text-6xl">{group.name}</h1>
          <div className="mt-4 flex items-center gap-5 font-mono text-[11px] text-nerv-dim">
            <Stat n={stats.members} label="membros" tone="text-nerv-green" />
            <Stat n={stats.games} label="jogos" tone="text-nerv-amber" />
            <Stat n={stats.votes} label="votações" tone="text-nerv-magenta" />
            <Stat n={stats.sessions} label="sessões" tone="text-nerv-orange" />
          </div>
        </div>
        {!isSoleAdmin && (
          <button
            onClick={onLeave}
            className="rounded-sm border border-nerv-line/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:border-nerv-red/40 hover:text-nerv-red"
          >
            sair do grupo
          </button>
        )}
      </div>
    </motion.header>
  )
}

function Stat({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className={`font-display text-xl tabular-nums ${tone}`}>{n}</span>
      <span className="uppercase tracking-wider">{label}</span>
    </span>
  )
}

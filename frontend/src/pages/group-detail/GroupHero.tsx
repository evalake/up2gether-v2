import { motion } from 'framer-motion'
import { useT } from '@/i18n'
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
  const t = useT()
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
      className="relative overflow-hidden border border-up-orange/25 bg-gradient-to-br from-up-panel/60 via-up-panel/30 to-transparent px-6 py-6"
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
          <div className="absolute inset-0 bg-gradient-to-t from-up-bg via-up-bg/70 to-up-bg/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-up-bg/80 via-transparent to-up-bg/40" />
        </motion.div>
      )}
      <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 border-l-2 border-t-2 border-up-orange/60" />
      <span className="pointer-events-none absolute bottom-1 right-1 h-4 w-4 border-b-2 border-r-2 border-up-orange/60" />
      <div className="absolute left-0 right-0 top-0 flex items-center justify-between border-b border-up-orange/20 bg-black/30 px-4 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-up-orange">
        <span>{t.groupDetail.monitor(group.name)}</span>
        <span className="tabular-nums text-up-green">{now.toLocaleTimeString('pt-BR', { hour12: false })}</span>
      </div>
      <div className="h-3" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 3px, currentColor 3px 4px)',
          color: 'var(--color-up-orange)',
        }}
      />
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ transformOrigin: 'left' }}
        className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-up-orange via-up-magenta to-transparent"
      />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-up-magenta">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-up-green up-pulse" />
            <span>{group.user_role}</span>
            {isSoleAdmin && <span className="text-up-dim">· {t.groupDetail.onlyAdmin}</span>}
            {isSysAdmin && <span className="text-up-red">· {t.groupDetail.sysAdmin}</span>}
          </div>
          <h1 className="mt-2 font-display text-3xl leading-none text-up-text sm:text-4xl">{group.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 font-mono text-[11px] text-up-dim">
            <Stat n={stats.members} label={t.groupDetail.membersLabel} tone="text-up-green" />
            <Stat n={stats.games} label={t.groupDetail.gamesLabel} tone="text-up-amber" />
            <Stat n={stats.votes} label={t.groupDetail.votesLabel} tone="text-up-magenta" />
            <Stat n={stats.sessions} label={t.groupDetail.sessionsLabel} tone="text-up-orange" />
          </div>
        </div>
        {!isSoleAdmin && (
          <button
            onClick={onLeave}
            className="rounded-sm border border-up-line px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-up-dim transition-colors hover:border-up-red hover:text-up-red"
          >
            {t.groupDetail.leaveGroup}
          </button>
        )}
      </div>
    </motion.header>
  )
}

function Stat({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className={`font-display text-lg tabular-nums ${tone}`}>{n}</span>
      <span className="uppercase tracking-wider">{label}</span>
    </span>
  )
}

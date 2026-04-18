import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  useGame,
  useGameOwners,
  useSetInterest,
  useToggleOwnership,
  useUpdateGame,
} from '@/features/games/hooks'
import { useGroup } from '@/features/groups/hooks'
import { useMe } from '@/features/auth/hooks'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { EnergyBar } from '@/components/core/EnergyBar'
import { useTitle } from '@/lib/useTitle'
import { MemberProfileModal } from '@/components/members/MemberProfileModal'
import { GameEditForm } from '@/components/games/GameEditForm'
import { GameHero } from '@/components/games/GameHero'
import { GameSidebar } from '@/components/games/GameSidebar'
import { GameStatusBar } from '@/components/games/GameStatusBar'
import { GameActionsBar } from '@/components/games/GameActionsBar'
import { useT, type Translations } from '@/i18n'
import { useTranslateGenre } from '@/i18n/steamGenres'

// stagger delay entre sections (30ms conforme UX guideline)
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.03 } } }
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
}

export function GameDetailPage() {
  const t = useT()
  const trGenre = useTranslateGenre()
  const { id = '', gameId = '' } = useParams()
  const game = useGame(id, gameId)
  useTitle(game.data?.name)
  const owners = useGameOwners(gameId)
  const setInt = useSetInterest(id)
  const toggleOwn = useToggleOwnership(id)
  const update = useUpdateGame(id, gameId)
  const group = useGroup(id)
  const me = useMe()
  const canManage =
    !!me.data?.is_sys_admin ||
    group.data?.user_role === 'admin' ||
    group.data?.user_role === 'mod'
  const [editing, setEditing] = useState(false)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)

  if (game.isLoading) return <Loading />
  if (game.error) return <ErrorBox error={game.error} />
  if (!game.data) return null

  const g = game.data
  const v = g.viability

  return (
    <motion.div className="space-y-5" variants={stagger} initial="hidden" animate="show">
      {/* breadcrumb + actions */}
      <motion.header variants={fadeUp} className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-up-dim">
          {group.data && (
            <>
              <Link to={`/groups/${id}`} className="transition-colors hover:text-up-orange">
                {group.data.name}
              </Link>
              <span className="text-up-line">/</span>
            </>
          )}
          <Link to={`/groups/${id}/games`} className="transition-colors hover:text-up-orange">
            {t.games.library}
          </Link>
        </nav>
        <GameActionsBar
          game={g}
          groupId={id}
          canManage={canManage}
          editing={editing}
          onToggleEdit={() => setEditing((v) => !v)}
          update={update}
        />
      </motion.header>

      <AnimatePresence>
        {editing && <GameEditForm game={g} update={update} onClose={() => setEditing(false)} />}
      </AnimatePresence>

      {/* hero com todos os dados do jogo */}
      <motion.div variants={fadeUp}>
        <GameHero game={g} />
      </motion.div>

      {/* barra de interesse + posse (full width, acesso rapido) */}
      <motion.div variants={fadeUp}>
        <GameStatusBar
          game={g}
          onSetInterest={(gameId, signal) => setInt.mutate({ gameId, signal: signal as 'want' | 'ok' | 'pass' })}
          onToggleOwnership={(gameId, owns) => toggleOwn.mutate({ gameId, owns })}
          setInterestPending={setInt.isPending}
          toggleOwnPending={toggleOwn.isPending}
        />
      </motion.div>

      {/* grid principal: viabilidade + conteudo | sidebar */}
      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div className="lg:col-span-2 space-y-4" variants={stagger}>
          {/* viabilidade: hero section do lado esquerdo */}
          <motion.section variants={fadeUp} className="rounded-sm border border-up-orange/15 bg-up-panel/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-3xl text-up-orange tabular-nums">
                  {v.viability_score.toFixed(0)}
                  <span className="text-lg text-up-dim">%</span>
                </span>
                <span className="text-[11px] uppercase tracking-wider text-up-dim">{t.games.viability}</span>
              </div>
              <ViabilityChip score={v.viability_score} t={t} />
            </div>
            <p className="mb-3 text-xs leading-relaxed text-up-dim">{viabilitySummary(v, t)}</p>
            <div className="mb-3 text-[11px] tracking-wider text-up-dim">
              <span className="uppercase">{t.games.groupInterest}</span>{' '}
              <span className="font-mono tabular-nums text-up-green">{v.interest_want_count}</span> {t.games.want(v.interest_want_count)},{' '}
              <span className="font-mono tabular-nums text-up-amber">{v.interest_ok_count}</span> {t.games.ok(v.interest_ok_count)},{' '}
              <span className="font-mono tabular-nums text-up-red">{v.interest_pass_count}</span> {t.games.pass(v.interest_pass_count)}
            </div>
            <div className="space-y-2">
              <EnergyBar label={t.games.price.toUpperCase()} value={v.price_score} color="green" />
              <EnergyBar label={t.games.hardware.toUpperCase()} value={v.hardware_fit_percent} color="amber" />
              <EnergyBar label={t.games.interest.toUpperCase()} value={v.interest_score} color="orange" />
            </div>
          </motion.section>

          {/* descricao */}
          {g.description && (
            <motion.section variants={fadeUp} className="rounded-sm border border-up-orange/15 bg-up-panel/30 p-5">
              <div className="mb-2 text-[10px] uppercase tracking-wider text-up-dim">{t.games.description}</div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-up-text">{g.description}</p>
            </motion.section>
          )}

          {/* generos + categorias */}
          {(g.genres.length > 0 || g.tags.length > 0) && (
            <motion.section variants={fadeUp} className="rounded-sm border border-up-orange/15 bg-up-panel/30 p-4">
              {g.genres.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[10px] uppercase tracking-wider text-up-dim">{t.games.genres}</div>
                  <div className="flex flex-wrap gap-1">
                    {g.genres.map((x) => (
                      <span key={`g-${x}`} className="rounded-sm border border-up-orange/30 bg-up-orange/5 px-2 py-0.5 text-[10px] text-up-text transition-colors hover:border-up-orange/60 hover:text-up-orange">
                        {trGenre(x)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {g.tags.length > 0 && <CollapsibleTags tags={g.tags} hasGenres={g.genres.length > 0} t={t} />}
            </motion.section>
          )}
        </motion.div>

        <GameSidebar
          game={g}
          owners={owners.data}
          ownersLoading={owners.isLoading}
          memberCount={group.data?.member_count}
          canManage={canManage}
          onOpenProfile={setProfileUserId}
          update={update}
        />
      </div>
      <MemberProfileModal groupId={id} userId={profileUserId} onClose={() => setProfileUserId(null)} />
    </motion.div>
  )
}

function ViabilityChip({ score, t }: { score: number; t: Translations }) {
  const cfg =
    score >= 75
      ? { label: t.games.strongCandidate, cls: 'border-up-green/60 bg-up-green/10 text-up-green' }
      : score >= 50
        ? { label: t.games.goodCandidate, cls: 'border-up-amber/60 bg-up-amber/10 text-up-amber' }
        : score >= 25
          ? { label: t.games.needsInterest, cls: 'border-up-orange/50 bg-up-orange/10 text-up-orange' }
          : { label: t.games.hardToViabilize, cls: 'border-up-line bg-black/40 text-up-dim' }
  return (
    <span className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function viabilitySummary(
  v: { price_score: number; hardware_fit_percent: number; interest_score: number },
  t: Translations,
): string {
  const price = v.price_score >= 70 ? t.games.priceAffordable : v.price_score >= 40 ? t.games.priceModerate : t.games.priceHigh
  const hw = v.hardware_fit_percent >= 70 ? t.games.hwRunsWell : v.hardware_fit_percent >= 40 ? t.games.hwNeedsAttention : t.games.hwHeavy
  const interest = v.interest_score >= 70 ? t.games.interestHigh : v.interest_score >= 40 ? t.games.interestModerate : t.games.interestLow
  return `${price}, ${hw} ${t.common.and} ${interest}.`
}

const TAG_LIMIT = 8

function CollapsibleTags({ tags, hasGenres, t }: { tags: string[]; hasGenres: boolean; t: Translations }) {
  const [expanded, setExpanded] = useState(false)
  const needsCollapse = tags.length > TAG_LIMIT
  const visible = expanded || !needsCollapse ? tags : tags.slice(0, TAG_LIMIT)

  return (
    <div className={hasGenres ? 'mt-2.5' : ''}>
      <div className="mb-1.5 text-[10px] uppercase tracking-wider text-up-dim">{t.games.categories}</div>
      <div className="flex flex-wrap gap-1">
        {visible.map((x) => (
          <span key={`t-${x}`} className="rounded-sm border border-up-line/60 px-1.5 py-0.5 text-[10px] text-up-dim transition-colors hover:border-up-line hover:text-up-text">
            {x}
          </span>
        ))}
        {needsCollapse && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-sm border border-up-line/40 px-1.5 py-0.5 text-[10px] text-up-dim transition-colors hover:border-up-orange/40 hover:text-up-orange"
          >
            {expanded ? t.common.showLess : t.common.showMore(tags.length - TAG_LIMIT)}
          </button>
        )}
      </div>
    </div>
  )
}

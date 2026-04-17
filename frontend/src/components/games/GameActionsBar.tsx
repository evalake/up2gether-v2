import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import type { UseMutationResult } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { Game, GameUpdateInput } from '@/features/games/api'
import { useArchiveGame } from '@/features/games/hooks'
import { steamGetDetails, builtinGetDetails } from '@/features/steam/api'
import { useT } from '@/i18n'
import { useToast } from '@/components/ui/toast'

type Props = {
  game: Game
  groupId: string
  canManage: boolean
  editing: boolean
  onToggleEdit: () => void
  update: UseMutationResult<Game, Error, GameUpdateInput>
}

export function GameActionsBar({ game: g, groupId, canManage, editing, onToggleEdit, update }: Props) {
  const t = useT()
  const toast = useToast()
  const navigate = useNavigate()
  const archive = useArchiveGame(groupId)
  const [confirming, setConfirming] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const builtinSlug =
    g.source && g.source !== 'steam' && g.source !== 'manual'
      ? g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : null

  const canRefresh = !!g.steam_appid || !!builtinSlug
  const refreshLabel = g.steam_appid ? t.games.syncFromSteam : builtinSlug ? t.games.syncFromCatalog : ''

  const refresh = async () => {
    setRefreshing(true)
    try {
      if (g.steam_appid) {
        const d = await steamGetDetails(g.steam_appid)
        await update.mutateAsync({
          player_min: d.player_min ?? g.player_min,
          player_max: d.player_max ?? g.player_max,
          min_hardware_tier: d.hardware_tier !== 'unknown' ? d.hardware_tier : g.min_hardware_tier,
          description: d.short_description ?? g.description,
          price_current: d.price != null ? d.price / 100 : g.price_current,
          developer: d.developer ?? g.developer,
          release_date: d.release_date ?? g.release_date,
          metacritic_score: d.metacritic_score ?? g.metacritic_score,
          price_original: d.price_initial != null ? d.price_initial / 100 : g.price_original,
          discount_percent: d.discount_percent ?? g.discount_percent,
        })
        toast.success(t.games.syncedSteam)
      } else if (builtinSlug) {
        const b = await builtinGetDetails(builtinSlug, g.name)
        await update.mutateAsync({
          cover_url: b.cover_url,
          description: b.description ?? g.description,
          player_min: b.player_min ?? g.player_min,
          player_max: b.player_max ?? g.player_max,
          min_hardware_tier: b.min_hardware_tier ?? g.min_hardware_tier,
          developer: b.developer ?? g.developer,
          release_date: b.release_date ?? g.release_date,
        })
        toast.success(t.games.syncedCatalog)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.common.syncFail)
    } finally {
      setRefreshing(false)
    }
  }

  const remove = async () => {
    try {
      await archive.mutateAsync(g.id)
      toast.success(t.games.gameRemoved)
      navigate(`/groups/${groupId}/games`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.games.removeFail)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {g.steam_appid && (
          <a
            href={`https://store.steampowered.com/app/${g.steam_appid}`}
            target="_blank"
            rel="noopener noreferrer"
            title={t.games.openSteam}
            className="inline-flex items-center gap-1.5 rounded-sm border border-up-line/60 bg-black/30 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-up-dim transition-colors hover:border-up-orange hover:text-up-orange"
          >
            <IconExternal />
            {t.games.steam}
          </a>
        )}
        {canManage && canRefresh && (
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing || update.isPending}
            title={t.games.syncLabel(refreshLabel)}
            className="inline-flex items-center gap-1.5 rounded-sm border border-up-line/60 bg-black/30 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-up-dim transition-colors hover:border-up-orange hover:text-up-orange disabled:opacity-40"
          >
            <IconRefresh spinning={refreshing} />
            {refreshing ? t.common.syncing : t.common.sync}
          </button>
        )}
        {canManage && (
          <button
            type="button"
            onClick={onToggleEdit}
            title={editing ? t.games.cancelEdit : t.games.editGame}
            className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
              editing
                ? 'border-up-orange/60 bg-up-orange/10 text-up-orange'
                : 'border-up-line/60 bg-black/30 text-up-dim hover:border-up-orange hover:text-up-orange'
            }`}
          >
            <IconPencil />
            {editing ? t.common.cancel : t.common.edit}
          </button>
        )}
        {canManage && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            title={t.games.removeFromLibrary}
            className="inline-flex items-center gap-1 rounded-sm border border-transparent px-1.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-up-dim transition-colors hover:border-up-red/40 hover:text-up-red"
          >
            <IconTrash />
          </button>
        )}
      </div>

      <AnimatePresence>
        {confirming && (
          <ConfirmRemoveModal
            gameName={g.name}
            isPending={archive.isPending}
            onConfirm={remove}
            onCancel={() => setConfirming(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function ConfirmRemoveModal({
  gameName,
  isPending,
  onConfirm,
  onCancel,
}: {
  gameName: string
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const t = useT()
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-lg border border-up-red/30 bg-up-panel shadow-[0_20px_80px_-20px_rgba(255,0,0,0.35)]"
      >
        <div className="border-b border-up-red/20 bg-up-red/5 px-5 py-4">
          <div className="text-[10px] uppercase tracking-wider text-up-red">{t.games.removeGameTitle}</div>
          <div className="mt-1 text-base text-up-text">{t.games.removeGameConfirm(gameName)}</div>
        </div>
        <div className="px-5 py-4 text-sm leading-relaxed text-up-dim">
          {t.games.removeGameHint}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-up-line bg-black/20 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-sm border border-up-line/60 bg-black/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-up-dim transition-colors hover:border-up-text/40 hover:text-up-text disabled:opacity-40"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-sm border border-up-red/60 bg-up-red/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-up-red transition-colors hover:bg-up-red/20 disabled:opacity-40"
          >
            {isPending ? t.common.removing : t.common.remove}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

function IconExternal() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function IconRefresh({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={spinning ? 'animate-spin' : undefined}
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

function IconPencil() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

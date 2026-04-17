import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Avatar } from '@/components/core/Avatar'
import { Textarea } from '@/components/ui/Textarea'
import type { Cycle, Suggestion } from '@/features/themes/api'

type CycleSectionProps = {
  cycle: Cycle
  isStaff: boolean
  isAdmin: boolean
  isSysAdmin: boolean
  meId: string | null
  onAudit: () => void
  onSubmitSuggestion: (input: { name: string; description: string | null; image_url: string | null }) => Promise<void>
  onDeleteAny: (suggestionId: string) => Promise<void>
  onVote: (suggestionId: string) => Promise<void>
  onClose: () => Promise<void>
  onForce: (suggestionId: string) => Promise<void>
  onCancel: () => Promise<void>
}

export function CycleSection({ cycle, isStaff, isAdmin, isSysAdmin, meId, onAudit, onSubmitSuggestion, onDeleteAny, onVote, onClose, onForce, onCancel }: CycleSectionProps) {
  const mySug = cycle.suggestions.find((s) => s.user_id === meId) ?? null
  const [editing, setEditing] = useState(!mySug)
  const [name, setName] = useState(mySug?.name ?? '')
  const [desc, setDesc] = useState(mySug?.description ?? '')
  const [imageUrl, setImageUrl] = useState(mySug?.image_url ?? '')
  const [showImage, setShowImage] = useState(!!mySug?.image_url)

  useEffect(() => {
    setName(mySug?.name ?? '')
    setDesc(mySug?.description ?? '')
    setImageUrl(mySug?.image_url ?? '')
    setShowImage(!!mySug?.image_url)
    setEditing(!mySug)
  }, [mySug?.id])

  const maxVotes = useMemo(
    () => cycle.suggestions.reduce((acc, s) => Math.max(acc, s.vote_count), 0),
    [cycle.suggestions],
  )

  const submit = async () => {
    if (!name.trim()) return
    await onSubmitSuggestion({ name: name.trim(), description: desc.trim() || null, image_url: imageUrl.trim() || null })
    setEditing(false)
  }

  return (
    <section className="space-y-6 rounded-sm border border-up-orange/20 bg-up-panel/30 p-6">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-up-orange/15 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-sm border border-up-magenta/40 bg-up-magenta/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-up-magenta">
              {cycle.phase === 'voting' ? 'votação' : 'sugestões'}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-up-dim">{cycle.month_year}</span>
          </div>
          <div className="mt-2 font-mono text-[10px] text-up-dim">
            <span className="tabular-nums text-up-text">{cycle.suggestions.length}</span> sugestões · <span className="tabular-nums text-up-text">{cycle.total_votes}</span> votos · todos sugerem e votam
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onAudit}
            className="inline-flex items-center gap-1.5 rounded-sm border border-up-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-dim transition-colors hover:border-up-orange hover:text-up-orange"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            auditar
          </button>
          {cycle.suggestions.length > 0 && isStaff && (
            <button
              onClick={onClose}
              className="rounded-sm border border-up-green/50 bg-up-green/10 px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-green transition-colors hover:bg-up-green/20"
            >
              encerrar e decidir
            </button>
          )}
          {isAdmin && (
            <button
              onClick={onCancel}
              className="rounded-sm border border-up-red/30 px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-dim transition-colors hover:border-up-red/60 hover:text-up-red"
            >
              cancelar ciclo
            </button>
          )}
        </div>
      </div>

      {/* form - only when no suggestion yet or actively editing */}
      {(!mySug || editing) && (
        <div className="rounded-sm border border-up-line bg-black/30 p-4">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-up-dim">
            {mySug ? 'editando sugestão' : 'sua sugestão'}
          </div>
          <div className="space-y-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: souls-likes, indies, retro..."
              className="h-9 w-full rounded-sm border border-up-line bg-black/40 px-3 text-sm transition-colors focus-visible:border-up-orange focus-visible:outline-none"
            />
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="por que esse tema? (opcional)"
              className="w-full resize-none rounded-sm border border-up-line bg-black/40 px-3 py-2 text-xs transition-colors focus-visible:border-up-orange focus-visible:outline-none"
            />
            <div>
              <button
                type="button"
                onClick={() => setShowImage((v) => !v)}
                className="text-[10px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-text"
              >
                {showImage ? '−' : '+'} imagem (opcional)
              </button>
              {showImage && (
                <div className="mt-2 flex items-center gap-2">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt=""
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
                      className="h-10 w-16 shrink-0 rounded-sm border border-up-line object-cover"
                    />
                  )}
                  <input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="cole o link de uma imagem"
                    className="h-8 flex-1 rounded-sm border border-up-line bg-black/40 px-2 text-xs transition-colors focus-visible:border-up-orange focus-visible:outline-none"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              {mySug && (
                <button
                  onClick={() => { setEditing(false); setName(mySug.name); setDesc(mySug.description ?? ''); setImageUrl(mySug.image_url ?? '') }}
                  className="text-[10px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-text"
                >
                  cancelar
                </button>
              )}
              <button
                onClick={submit}
                disabled={!name.trim()}
                className="rounded-sm border border-up-orange/60 bg-up-orange/15 px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-orange transition-colors hover:bg-up-orange/25 disabled:opacity-40"
              >
                salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* grid de sugestoes */}
      {cycle.suggestions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {cycle.suggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              s={s}
              cycle={cycle}
              meId={meId}
              isStaff={isStaff}
              isAdmin={isAdmin}
              isSysAdmin={isSysAdmin}
              maxVotes={maxVotes}
              onVote={() => onVote(s.id)}
              onForce={() => onForce(s.id)}
              onDelete={() => onDeleteAny(s.id)}
              onEdit={s.user_id === meId ? () => setEditing(true) : undefined}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function SuggestionCard({ s, cycle, meId, isStaff, isAdmin, maxVotes, onVote, onForce, onDelete, onEdit }: {
  s: Suggestion
  cycle: Cycle
  meId: string | null
  isStaff: boolean
  isAdmin: boolean
  isSysAdmin: boolean
  maxVotes: number
  onVote: () => void
  onForce: () => void
  onDelete: () => void
  onEdit?: () => void
}) {
  const isMine = s.user_id === meId
  const voted = cycle.user_vote_suggestion_id === s.id
  const pct = maxVotes > 0 ? Math.round((s.vote_count / maxVotes) * 100) : 0
  return (
    <motion.div
      layout
      className={`group relative overflow-hidden rounded-sm border bg-up-panel/40 transition-colors ${
        voted
          ? 'border-up-magenta/70 ring-1 ring-up-magenta/30'
          : 'border-up-line hover:border-up-orange'
      }`}
    >
      {s.image_url && (
        <div className="relative h-28 w-full overflow-hidden">
          <img
            src={s.image_url}
            alt=""
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-up-panel via-up-panel/40 to-transparent" />
        </div>
      )}
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-display text-lg text-up-orange">{s.name}</span>
              {isMine && (
                <span className="shrink-0 rounded-sm bg-up-magenta/20 px-1 text-[10px] uppercase tracking-wider text-up-magenta">sua</span>
              )}
            </div>
            {s.description && <p className="mt-1 line-clamp-2 text-xs text-up-dim">{s.description}</p>}
          </div>
          <div className="shrink-0 text-right">
            <div className="font-display text-2xl tabular-nums text-up-magenta">{s.vote_count}</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-up-dim">votos</div>
          </div>
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full bg-up-line/30">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-up-orange to-up-magenta"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] text-up-dim">
            <Avatar discordId={s.user_discord_id} hash={s.user_avatar} name={s.user_name ?? '?'} size="sm" />
            <span className="truncate">{s.user_name ?? '...'}</span>
          </div>
          <div className="flex shrink-0 gap-1">
            {isMine && onEdit && (
              <button
                onClick={onEdit}
                className="rounded-sm border border-up-line px-2 py-1 text-[10px] uppercase tracking-wider text-up-dim transition-colors hover:border-up-orange hover:text-up-orange"
              >
                editar
              </button>
            )}
            <button
              onClick={onVote}
              className={`rounded-sm border px-2.5 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                voted
                  ? 'border-up-magenta bg-up-magenta/20 text-up-magenta'
                  : 'border-up-line text-up-dim hover:border-up-magenta hover:text-up-magenta'
              }`}
            >
              {voted ? 'votado' : 'votar'}
            </button>
            {isAdmin && (
              <button
                onClick={onForce}
                title="forçar como vencedor"
                className="rounded-sm border border-up-line px-2 py-1 text-[10px] text-up-dim transition-colors hover:border-up-amber/60 hover:text-up-amber"
              >
                ★
              </button>
            )}
            {(isMine || isStaff) && (
              <button
                onClick={onDelete}
                title="remover"
                className="rounded-sm border border-up-line px-2 py-1 text-[10px] text-up-dim transition-colors hover:border-up-red/60 hover:text-up-red"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Avatar } from '@/components/nerv/Avatar'
import type { Cycle, Suggestion } from '@/features/themes/api'

type CycleSectionProps = {
  cycle: Cycle
  isStaff: boolean
  isAdmin: boolean
  isSysAdmin: boolean
  meId: string | null
  onSubmitSuggestion: (input: { name: string; description: string | null; image_url: string | null }) => Promise<void>
  onDeleteSuggestion: () => Promise<void>
  onDeleteAny: (suggestionId: string) => Promise<void>
  onVote: (suggestionId: string) => Promise<void>
  onClose: () => Promise<void>
  onForce: (suggestionId: string) => Promise<void>
  onCancel: () => Promise<void>
}

export function CycleSection({ cycle, isStaff, isAdmin, isSysAdmin, meId, onSubmitSuggestion, onDeleteSuggestion, onDeleteAny, onVote, onClose, onForce, onCancel }: CycleSectionProps) {
  const mySug = cycle.suggestions.find((s) => s.user_id === meId) ?? null
  const [editing, setEditing] = useState(!mySug)
  const [name, setName] = useState(mySug?.name ?? '')
  const [desc, setDesc] = useState(mySug?.description ?? '')
  const [imageUrl, setImageUrl] = useState(mySug?.image_url ?? '')

  useEffect(() => {
    setName(mySug?.name ?? '')
    setDesc(mySug?.description ?? '')
    setImageUrl(mySug?.image_url ?? '')
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
    <section className="space-y-6 rounded-sm border border-nerv-orange/20 bg-nerv-panel/30 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-nerv-line/40 pb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-nerv-magenta">ciclo aberto · sugira e vote</div>
          <div className="mt-1 font-display text-xl text-nerv-text">{cycle.month_year}</div>
          <div className="mt-0.5 font-mono text-[10px] text-nerv-dim">
            {cycle.suggestions.length} sugestões · {cycle.total_votes} votos
          </div>
        </div>
        <div className="flex gap-2">
          {cycle.suggestions.length > 0 && isStaff && (
            <button
              onClick={onClose}
              className="rounded-sm border border-nerv-green/50 bg-nerv-green/10 px-3 py-1.5 text-[10px] uppercase tracking-wider text-nerv-green transition-colors hover:bg-nerv-green/20"
            >
              encerrar e decidir
            </button>
          )}
          {isAdmin && (
            <button
              onClick={onCancel}
              className="rounded-sm border border-nerv-red/30 px-3 py-1.5 text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:border-nerv-red/60 hover:text-nerv-red"
            >
              cancelar
            </button>
          )}
        </div>
      </div>

      {/* minha sugestao */}
      <div className="rounded-sm border border-nerv-line/40 bg-black/30 p-4">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-nerv-dim">sua sugestão</div>
        {!editing && mySug ? (
          <div className="flex items-start gap-3">
            {mySug.image_url && (
              <img
                src={mySug.image_url}
                alt=""
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                className="h-14 w-20 shrink-0 rounded-sm object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-display text-base text-nerv-orange">{mySug.name}</div>
              {mySug.description && <p className="mt-0.5 text-xs text-nerv-text/70">{mySug.description}</p>}
            </div>
            <div className="flex shrink-0 gap-3">
              <button onClick={() => setEditing(true)} className="text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-orange">editar</button>
              <button onClick={onDeleteSuggestion} className="text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-red">remover</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: souls-likes, indies, retro..."
              className="h-9 w-full rounded-sm border border-nerv-line bg-black/40 px-3 text-sm transition-colors focus:border-nerv-orange focus:outline-none"
            />
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              placeholder="por que esse tema? (opcional)"
              className="w-full rounded-sm border border-nerv-line bg-black/40 px-3 py-2 text-xs transition-colors focus:border-nerv-orange focus:outline-none"
            />
            <div className="flex items-center gap-2">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt=""
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
                  className="h-9 w-14 shrink-0 rounded-sm border border-nerv-line object-cover"
                />
              )}
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="url de imagem (opcional)"
                className="h-8 flex-1 rounded-sm border border-nerv-line bg-black/40 px-2 text-xs transition-colors focus:border-nerv-orange focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              {mySug && (
                <button
                  onClick={() => { setEditing(false); setName(mySug.name); setDesc(mySug.description ?? ''); setImageUrl(mySug.image_url ?? '') }}
                  className="text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-text"
                >
                  cancelar
                </button>
              )}
              <button
                onClick={submit}
                disabled={!name.trim()}
                className="rounded-sm border border-nerv-orange/60 bg-nerv-orange/15 px-3 py-1.5 text-[10px] uppercase tracking-wider text-nerv-orange transition-colors hover:bg-nerv-orange/25 disabled:opacity-40"
              >
                salvar
              </button>
            </div>
          </div>
        )}
      </div>

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
            />
          ))}
        </div>
      )}
    </section>
  )
}

function SuggestionCard({ s, cycle, meId, isStaff, isAdmin, maxVotes, onVote, onForce, onDelete }: {
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
}) {
  const isMine = s.user_id === meId
  const voted = cycle.user_vote_suggestion_id === s.id
  const pct = maxVotes > 0 ? Math.round((s.vote_count / maxVotes) * 100) : 0
  return (
    <motion.div
      layout
      className={`group relative overflow-hidden rounded-sm border bg-nerv-panel/40 transition-all ${
        voted
          ? 'border-nerv-magenta/70 ring-1 ring-nerv-magenta/30'
          : 'border-nerv-line/40 hover:-translate-y-0.5 hover:border-nerv-orange/40'
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
          <div className="absolute inset-0 bg-gradient-to-t from-nerv-panel via-nerv-panel/40 to-transparent" />
        </div>
      )}
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg text-nerv-orange">{s.name}</div>
            {s.description && <p className="mt-1 line-clamp-2 text-xs text-nerv-text/70">{s.description}</p>}
          </div>
          <div className="shrink-0 text-right">
            <div className="font-display text-2xl tabular-nums text-nerv-magenta">{s.vote_count}</div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-nerv-dim">votos</div>
          </div>
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full bg-nerv-line/30">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-nerv-orange to-nerv-magenta"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] text-nerv-dim">
            <Avatar discordId={s.user_discord_id} hash={s.user_avatar} name={s.user_name ?? '?'} size="sm" />
            <span className="truncate">{s.user_name ?? '...'}</span>
            {isMine && <span className="uppercase tracking-wider text-nerv-orange">· você</span>}
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              onClick={onVote}
              className={`rounded-sm border px-2.5 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                voted
                  ? 'border-nerv-magenta bg-nerv-magenta/20 text-nerv-magenta'
                  : 'border-nerv-line text-nerv-dim hover:border-nerv-magenta/60 hover:text-nerv-magenta'
              }`}
            >
              {voted ? '✓ votado' : 'votar'}
            </button>
            {isAdmin && (
              <button
                onClick={onForce}
                title="forçar como vencedor"
                className="rounded-sm border border-nerv-line px-2 py-1 text-[10px] text-nerv-dim transition-colors hover:border-nerv-amber/60 hover:text-nerv-amber"
              >
                ★
              </button>
            )}
            {(isMine || isStaff) && (
              <button
                onClick={onDelete}
                title="remover"
                className="rounded-sm border border-nerv-line px-2 py-1 text-[10px] text-nerv-dim transition-colors hover:border-nerv-red/60 hover:text-nerv-red"
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

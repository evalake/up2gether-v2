// Display dos jogadores. Trata dois casos:
// 1) min/max ja preenchidos no banco
// 2) min=1, max=null (default historico) -> tenta inferir das tags/categories Steam
export function formatPlayers(
  min: number | null | undefined,
  max: number | null | undefined,
  tags?: string[] | null,
): string {
  // 1: ambos preenchidos
  if (min != null && max != null) return min === max ? `${min}` : `${min}-${max}`

  // 2: tenta inferir das tags Steam
  const lower = (tags ?? []).map((t) => t.toLowerCase())
  const hasSolo = lower.some((c) => c.includes('single-player'))
  const hasMulti = lower.some(
    (c) => c.includes('multi-player') || c.includes('co-op') || c.includes('pvp') || c.includes('mmo'),
  )

  if (min != null && max == null) {
    if (hasSolo && !hasMulti) return '1'
    if (hasMulti) return `${min}+`
    return min <= 1 ? '1+' : `${min}+`
  }

  if (max != null && min == null) return `${max}`

  // nada conhecido
  if (hasSolo && !hasMulti) return '1'
  if (hasMulti) return '1+'
  return '1+'
}

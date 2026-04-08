// devolve uma URL de capa pro jogo. prioridade: cover_url -> header derivado do appid -> null
export function steamCover(g: { cover_url: string | null; steam_appid: number | null }): string | null {
  if (g.cover_url) return g.cover_url
  if (g.steam_appid) {
    return `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.steam_appid}/header.jpg`
  }
  return null
}

// versao maior pra hero/banner
export function steamHeaderLarge(appid: number | null | undefined): string | null {
  if (!appid) return null
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_hero.jpg`
}

// chain de fallback de imagens da steam por appid. nem todo jogo tem header.jpg
// (apps novos, indies, sem capsule). a gente tenta varias rotas em ordem ate uma carregar.
export function steamImageFallbacks(appid: number | string | null | undefined): string[] {
  if (!appid) return []
  const base = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}`
  return [
    `${base}/header.jpg`,
    `${base}/capsule_231x87.jpg`,
    `${base}/capsule_184x69.jpg`,
    `${base}/library_600x900.jpg`,
    `${base}/library_hero.jpg`,
  ]
}

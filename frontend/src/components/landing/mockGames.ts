// Catalogo mockado so para a landing. Usa header.jpg do Steam (CDN publica)
// com fallback de gradiente caso a imagem falhe.

export type MockGame = {
  id: string
  name: string
  cover: string
  gradient: string
}

const steam = (appid: number) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`

export const MOCK: Record<string, MockGame> = {
  hd2: {
    id: 'hd2',
    name: 'Helldivers 2',
    cover: steam(553850),
    gradient: 'from-amber-500/50 to-orange-800/70',
  },
  brg: {
    id: 'brg',
    name: "Baldur's Gate 3",
    cover: steam(1086940),
    gradient: 'from-purple-600/50 to-red-900/70',
  },
  drg: {
    id: 'drg',
    name: 'Deep Rock Galactic',
    cover: steam(548430),
    gradient: 'from-amber-600/50 to-stone-900/70',
  },
  leth: {
    id: 'leth',
    name: 'Lethal Company',
    cover: steam(1966720),
    gradient: 'from-yellow-500/50 to-lime-900/70',
  },
  phas: {
    id: 'phas',
    name: 'Phasmophobia',
    cover: steam(739630),
    gradient: 'from-slate-500/50 to-slate-950/70',
  },
  cs2: {
    id: 'cs2',
    name: 'Counter-Strike 2',
    cover: steam(730),
    gradient: 'from-orange-400/50 to-yellow-800/70',
  },
  cp77: {
    id: 'cp77',
    name: 'Cyberpunk 2077',
    cover: steam(1091500),
    gradient: 'from-yellow-400/50 to-red-900/70',
  },
  pal: {
    id: 'pal',
    name: 'Palworld',
    cover: steam(1623730),
    gradient: 'from-sky-400/50 to-emerald-900/70',
  },
  er: {
    id: 'er',
    name: 'Elden Ring',
    cover: steam(1245620),
    gradient: 'from-amber-700/50 to-slate-950/70',
  },
}

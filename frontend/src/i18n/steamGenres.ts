import { useLocaleStore, type Locale } from '@/features/locale/store'

// canonical EN -> PT
const enToPt: Record<string, string> = {
  Action: 'Ação',
  Adventure: 'Aventura',
  Casual: 'Casual',
  Indie: 'Indie',
  'Massively Multiplayer': 'Multiplayer Massivo',
  Racing: 'Corrida',
  RPG: 'RPG',
  Simulation: 'Simulação',
  Sports: 'Esportes',
  Strategy: 'Estratégia',
  'Free to Play': 'Gratuito',
  'Early Access': 'Acesso Antecipado',
  'Animation & Modeling': 'Animação e Modelagem',
  'Audio Production': 'Produção de Áudio',
  'Design & Illustration': 'Design e Ilustração',
  Education: 'Educação',
  'Game Development': 'Desenvolvimento de Jogos',
  Photo: 'Foto',
  'Software Training': 'Treinamento de Software',
  Utilities: 'Utilitários',
  'Video Production': 'Produção de Vídeo',
  'Web Publishing': 'Publicação Web',
  'Sexual Content': 'Conteúdo Sexual',
  Nudity: 'Nudez',
  Violent: 'Violento',
  Gore: 'Sangue',
  Shooter: 'Tiro',
  Puzzle: 'Quebra-cabeça',
  Platformer: 'Plataforma',
  Fighting: 'Luta',
  Survival: 'Sobrevivência',
  Horror: 'Terror',
  'Open World': 'Mundo Aberto',
  Multiplayer: 'Multiplayer',
  'Co-op': 'Cooperativo',
  Singleplayer: 'Single-player',
  Tactical: 'Tático',
  Stealth: 'Furtivo',
  Sandbox: 'Sandbox',
  Roguelike: 'Roguelike',
  'Visual Novel': 'Visual Novel',
}

// strip diacritics pra match resiliente: "Estrategia" == "Estratégia" == "estrategia"
function fold(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

// invertido pra normalizar dado antigo em PT pra EN canonico (com e sem acento)
const ptToEn: Record<string, string> = Object.entries(enToPt).reduce(
  (acc, [en, pt]) => {
    acc[fold(pt)] = en
    return acc
  },
  {} as Record<string, string>,
)

function canonicalize(g: string): string {
  return ptToEn[fold(g)] ?? g
}

export function translateGenre(g: string, locale: Locale): string {
  const canon = canonicalize(g)
  if (locale === 'pt') return enToPt[canon] ?? canon
  return canon
}

export function useTranslateGenre() {
  const locale = useLocaleStore((s) => s.locale)
  return (g: string) => translateGenre(g, locale)
}

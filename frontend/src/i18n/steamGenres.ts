import { useLocaleStore, type Locale } from '@/features/locale/store'

const ptMap: Record<string, string> = {
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

export function translateGenre(g: string, locale: Locale): string {
  if (locale === 'pt') return ptMap[g] ?? g
  return g
}

export function useTranslateGenre() {
  const locale = useLocaleStore((s) => s.locale)
  return (g: string) => translateGenre(g, locale)
}

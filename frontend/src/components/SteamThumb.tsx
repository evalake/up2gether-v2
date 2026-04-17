import { useState, useEffect } from 'react'
import { steamImageFallbacks } from '@/lib/steamCover'

type Props = {
  appid: number | string | null | undefined
  alt?: string
  className?: string
}

// tenta varias urls da steam em sequencia ate uma carregar.
// fallback final: bloco vazio com a inicial do alt.
export function SteamThumb({ appid, alt = '', className = '' }: Props) {
  const urls = steamImageFallbacks(appid)
  const [idx, setIdx] = useState(0)
  useEffect(() => { setIdx(0) }, [appid])

  if (urls.length === 0 || idx >= urls.length) {
    return (
      <div className={`grid place-items-center bg-up-line/30 text-[10px] uppercase text-up-dim ${className}`}>
        {alt.slice(0, 2) || '?'}
      </div>
    )
  }

  return (
    <img
      src={urls[idx]}
      alt={alt}
      onError={() => setIdx((i) => i + 1)}
      className={className}
    />
  )
}

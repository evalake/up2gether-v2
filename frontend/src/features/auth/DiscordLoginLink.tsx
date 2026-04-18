import type { ReactNode } from 'react'
import { useDiscordLoginUrl } from './hooks'

type Props = {
  next?: string
  className?: string
  children: ReactNode
}

/** Anchor que aponta pra URL de authorize do Discord pre-assinada pelo backend.
 *  Prefetch via useQuery deixa o href pronto no primeiro render. Se ainda estiver
 *  carregando ou der erro o click dispara loading no lugar de navegar pra `#`. */
export function DiscordLoginLink({ next, className, children }: Props) {
  const q = useDiscordLoginUrl(next)
  const url = q.data?.url
  const disabled = !url || q.isError
  return (
    <a
      href={url ?? '#'}
      aria-disabled={disabled}
      className={className}
      onClick={(e) => {
        if (!url) {
          e.preventDefault()
          if (q.isError) q.refetch()
        }
      }}
    >
      {children}
    </a>
  )
}

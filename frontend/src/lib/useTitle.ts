import { useEffect } from 'react'

export function useTitle(title: string | undefined) {
  useEffect(() => {
    const prev = document.title
    if (title) document.title = `${title} · up2gether`
    return () => { document.title = prev }
  }, [title])
}

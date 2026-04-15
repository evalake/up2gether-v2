import { Skeleton } from './Loading'

export function GameCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-sm border border-nerv-orange/15 bg-nerv-panel/30">
      <Skeleton className="h-32 w-full" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-1 w-full" />
        <div className="flex gap-1">
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="h-5 flex-1" />
        </div>
        <Skeleton className="h-5 w-full" />
      </div>
    </div>
  )
}

export function GameGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <GameCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function SessionCardSkeleton() {
  return (
    <div className="rounded-sm border border-nerv-line/40 bg-nerv-panel/20 p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-14 w-24 shrink-0 rounded-sm" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function SessionListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SessionCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function VoteCardSkeleton() {
  return (
    <div className="rounded-sm border border-nerv-line/40 bg-nerv-panel/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-16 w-24" />
        <Skeleton className="h-16 w-24" />
        <Skeleton className="h-16 w-24" />
      </div>
    </div>
  )
}

export function VoteListSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <VoteCardSkeleton key={i} />
      ))}
    </div>
  )
}

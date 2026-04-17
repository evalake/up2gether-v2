export function HazardDivider({ label }: { label?: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-2 flex-1 bg-hazard opacity-60" />
      {label && (
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-up-amber">{label}</span>
      )}
      <div className="h-2 flex-1 bg-hazard opacity-60" />
    </div>
  )
}

import { cn } from '@/lib/utils'

export type DataHealth = 'live' | 'delayed' | 'stale' | 'demo' | 'unavailable'

export function DataHealthBadge({
  status,
  asOf,
  className,
}: {
  status: DataHealth
  asOf?: string
  className?: string
}) {
  const map: Record<DataHealth, { label: string; cls: string }> = {
    live: { label: 'LIVE', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    delayed: { label: 'DELAYED', cls: 'bg-amber-500/20 text-amber-200 border-amber-500/30' },
    stale: { label: 'STALE', cls: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
    demo: { label: 'DEMO', cls: 'bg-zinc-700 text-zinc-300 border-zinc-600' },
    unavailable: { label: 'OFF', cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
  }
  const m = map[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide',
        m.cls,
        className,
      )}
      title={asOf ? `As of ${asOf}` : undefined}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'live' && 'bg-emerald-400 animate-pulse',
          status === 'delayed' && 'bg-amber-400',
          status === 'demo' && 'bg-zinc-400',
          status === 'stale' && 'bg-orange-400',
          status === 'unavailable' && 'bg-red-400',
        )}
      />
      {m.label}
    </span>
  )
}

/** Map quote source → health */
export function healthFromSource(source?: string, ageMs?: number): DataHealth {
  if (!source || source === 'demo') return 'demo'
  if (source === 'live') {
    if (ageMs != null && ageMs > 60_000) return 'stale'
    return 'live'
  }
  if (source === 'delayed') {
    if (ageMs != null && ageMs > 24 * 60 * 60 * 1000) return 'stale'
    return 'delayed'
  }
  return 'unavailable'
}

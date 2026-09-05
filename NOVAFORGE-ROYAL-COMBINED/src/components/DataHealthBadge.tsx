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
    live: {
      label: 'LIVE',
      cls: 'bg-[#7cbc6e]/20 text-[#2f5c28] border-[#7cbc6e]/50',
    },
    delayed: {
      label: 'DELAYED',
      cls: 'bg-[#a8d4e6]/35 text-[#2c241c] border-[#7eb8d4]/50',
    },
    stale: {
      label: 'STALE',
      cls: 'bg-orange-100 text-orange-800 border-orange-300',
    },
    demo: {
      label: 'DEMO',
      cls: 'bg-[#f3ebe0] text-[#6b4f3a] border-[#6b4f3a]/25',
    },
    unavailable: {
      label: 'OFF',
      cls: 'bg-red-50 text-red-700 border-red-200',
    },
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
          status === 'live' && 'bg-[#5a9a4c] animate-pulse',
          status === 'delayed' && 'bg-[#7eb8d4]',
          status === 'demo' && 'bg-[#6b4f3a]',
          status === 'stale' && 'bg-orange-400',
          status === 'unavailable' && 'bg-red-400',
        )}
      />
      {m.label}
    </span>
  )
}

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

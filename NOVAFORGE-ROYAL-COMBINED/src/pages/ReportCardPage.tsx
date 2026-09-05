import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DataHealthBadge } from '@/components/DataHealthBadge'
import { useAngelLiveFeed } from '@/hooks/useAngelLiveFeed'
import {
  autoScoreDue,
  clearAllCalls,
  listCalls,
  lockCall,
  scoreCall,
  summaryStats,
  type LockedCall,
} from '@/services/reportCard'
import { ClipboardCheck, Lock, RefreshCw, Trash2 } from 'lucide-react'

export function ReportCardPage() {
  const { data, refreshSnapshot } = useAngelLiveFeed()
  const ltp = (data.ltp || {}) as Record<string, number>
  const nifty = ltp.NIFTY ?? null
  const status =
    data.status === 'live' || data.source === 'angel-rest-ltp'
      ? 'live'
      : data.status === 'session_ok'
        ? 'delayed'
        : data.status === 'simulated'
          ? 'demo'
          : 'unavailable'

  const [calls, setCalls] = useState<LockedCall[]>([])
  const [bias, setBias] = useState<LockedCall['bias']>('range')
  const [confidence, setConfidence] = useState(55)
  const [horizon, setHorizon] = useState(30)
  const [note, setNote] = useState('')

  const reload = useCallback(() => {
    const getSpot = (sym: string) => {
      if (sym === 'NIFTY') return ltp.NIFTY ?? null
      if (sym === 'BANKNIFTY') return ltp.BANKNIFTY ?? null
      return null
    }
    setCalls(autoScoreDue(getSpot))
  }, [ltp.NIFTY, ltp.BANKNIFTY])

  useEffect(() => {
    reload()
    const t = setInterval(reload, 15000)
    return () => clearInterval(t)
  }, [reload])

  const stats = useMemo(() => summaryStats(calls), [calls])

  const zone =
    nifty != null
      ? {
          low: Math.round(nifty * 0.997),
          high: Math.round(nifty * 1.003),
        }
      : { low: null as number | null, high: null as number | null }

  const onLock = () => {
    if (nifty == null) {
      alert('No NIFTY spot yet — open Live Terminal or wait for bridge.')
      return
    }
    lockCall({
      symbol: 'NIFTY',
      lockSpot: nifty,
      bias,
      confidence,
      zoneLow: zone.low,
      zoneHigh: zone.high,
      invalidation:
        bias === 'bullish'
          ? `Break below ${zone.low}`
          : bias === 'bearish'
            ? `Break above ${zone.high}`
            : `Expand outside ${zone.low}–${zone.high}`,
      horizonMin: horizon,
      dataStatus: status,
      note: note.trim() || undefined,
    })
    setNote('')
    reload()
  }

  const resultColor = (r?: LockedCall['result']) => {
    if (r === 'hit') return 'bg-[#e8f6e4] text-[#2f5c28] border-[#7cbc6e]/50'
    if (r === 'partial') return 'bg-[#eef6fa] text-[#2c241c] border-[#7eb8d4]/50'
    if (r === 'miss') return 'bg-[#fdecea] text-[#7a3a2e] border-[#e0a090]/60'
    if (r === 'void') return 'bg-[#f3ebe0] text-[#6b4f3a] border-[#6b4f3a]/25'
    return 'bg-[#fffdf9] text-[#7a6a5c] border-[#6b4f3a]/15'
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#2c241c] flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-[#5a9a4c]" />
            Report Card
          </h1>
          <p className="text-sm text-[#7a6a5c] mt-1 flex flex-wrap items-center gap-2">
            Lock a view → score vs real Nifty · personal device log
            <DataHealthBadge status={status === 'live' ? 'live' : status === 'demo' ? 'demo' : 'delayed'} />
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { void refreshSnapshot(); reload() }}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      <Card className="border border-[#6b4f3a]/15 bg-[#a8d4e6]/15 text-sm text-[#2c241c]">
        Educational track record only. Locks with DEMO data are marked void. Not investment advice.
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="text-xs font-semibold text-[#7a6a5c]">Nifty now</div>
          <div className="text-2xl font-bold text-[#2c241c] tabular-nums mt-1">
            {nifty != null ? nifty.toLocaleString('en-IN') : '—'}
          </div>
        </Card>
        <Card>
          <div className="text-xs font-semibold text-[#7a6a5c]">Scored calls</div>
          <div className="text-2xl font-bold text-[#2c241c] mt-1">{stats.n}</div>
        </Card>
        <Card>
          <div className="text-xs font-semibold text-[#7a6a5c]">Hit rate</div>
          <div className="text-2xl font-bold text-[#2f5c28] mt-1">{stats.n ? `${stats.hitRate}%` : '—'}</div>
          <div className="text-[10px] text-[#7a6a5c]">
            {stats.hit} hit · {stats.partial} partial · {stats.miss} miss
          </div>
        </Card>
        <Card>
          <div className="text-xs font-semibold text-[#7a6a5c]">Useful rate</div>
          <div className="text-2xl font-bold text-[#4a3428] mt-1">
            {stats.n ? `${stats.usefulRate}%` : '—'}
          </div>
          <div className="text-[10px] text-[#7a6a5c]">Hit + half partial</div>
        </Card>
      </div>

      <Card>
        <div className="font-semibold text-[#2c241c] mb-3 flex items-center gap-2">
          <Lock className="h-4 w-4 text-[#6b4f3a]" />
          Lock Nifty view now
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs font-semibold text-[#4a3428]">Bias</label>
            <select
              className="mt-1 h-10 w-full rounded-xl border border-[#6b4f3a]/25 bg-[#fffdf9] px-2 text-sm"
              value={bias}
              onChange={(e) => setBias(e.target.value as LockedCall['bias'])}
            >
              <option value="bullish">Bullish</option>
              <option value="range">Range</option>
              <option value="bearish">Bearish</option>
              <option value="no_trade">No trade / wait</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#4a3428]">Confidence</label>
            <input
              type="number"
              min={30}
              max={90}
              className="mt-1 h-10 w-full rounded-xl border border-[#6b4f3a]/25 bg-[#fffdf9] px-2 text-sm"
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value) || 50)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#4a3428]">Horizon (minutes)</label>
            <select
              className="mt-1 h-10 w-full rounded-xl border border-[#6b4f3a]/25 bg-[#fffdf9] px-2 text-sm"
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#4a3428]">Zone (auto ±0.3%)</label>
            <div className="mt-1 h-10 flex items-center text-sm font-semibold text-[#2c241c]">
              {zone.low != null ? `${zone.low} – ${zone.high}` : '—'}
            </div>
          </div>
        </div>
        <input
          className="mt-3 h-10 w-full rounded-xl border border-[#6b4f3a]/25 bg-[#fffdf9] px-3 text-sm"
          placeholder="Optional note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" onClick={onLock} disabled={nifty == null}>
            Lock call
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (confirm('Clear all report-card history on this device?')) {
                clearAllCalls()
                reload()
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear history
          </Button>
        </div>
      </Card>

      <div className="space-y-2">
        <div className="font-semibold text-[#2c241c]">History</div>
        {!calls.length && (
          <Card className="text-sm text-[#7a6a5c]">No locks yet — lock a view during market hours.</Card>
        )}
        {calls.map((c) => (
          <Card key={c.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-[#2c241c]">
                  {c.symbol} · <span className="capitalize">{c.bias.replace('_', ' ')}</span> ·{' '}
                  {c.confidence}%
                </div>
                <div className="text-xs text-[#7a6a5c] mt-0.5">
                  Locked {new Date(c.lockedAt).toLocaleString('en-IN')} · spot{' '}
                  {c.lockSpot.toLocaleString('en-IN')} · {c.horizonMin}m · data {c.dataStatus}
                </div>
                {c.zoneLow != null && (
                  <div className="text-xs text-[#4a3428] mt-1">
                    Zone {c.zoneLow}–{c.zoneHigh} · {c.invalidation}
                  </div>
                )}
                {c.note && <div className="text-xs text-[#7a6a5c] mt-1">{c.note}</div>}
              </div>
              <span
                className={`text-xs font-semibold capitalize px-2.5 py-1 rounded-full border ${resultColor(c.result)}`}
              >
                {c.result || 'pending'}
              </span>
            </div>
            {c.endSpot != null && (
              <div className="text-sm text-[#2c241c] mt-2">
                End spot {c.endSpot.toLocaleString('en-IN')}{' '}
                <span className="text-[#7a6a5c]">
                  ({c.endSpot >= c.lockSpot ? '+' : ''}
                  {(c.endSpot - c.lockSpot).toFixed(2)})
                </span>
              </div>
            )}
            {c.resultNote && <p className="text-xs text-[#4a3428] mt-1">{c.resultNote}</p>}
            {!c.result && nifty != null && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  scoreCall(c.id, nifty)
                  reload()
                }}
              >
                Score now with current Nifty
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

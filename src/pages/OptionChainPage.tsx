import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DataHealthBadge } from '@/components/DataHealthBadge'
import { Layers, RefreshCw, ShieldAlert } from 'lucide-react'

const BRIDGE = (import.meta.env.VITE_ANGEL_BRIDGE_URL as string | undefined)?.replace(/\/$/, '')

type Row = {
  strike: number
  callLtp: number | null
  callOi: number | null
  putLtp: number | null
  putOi: number | null
}

type ChainRes = {
  ok?: boolean
  spot: number | null
  expiry: string | null
  rows: Row[]
  status: string
  error?: string
  guide: {
    pcr: number | null
    maxPain: number | null
    resistanceZone: number | null
    supportZone: number | null
    bias: string
    notes: string[]
  }
  disclaimer?: string
}

export function OptionChainPage() {
  const [data, setData] = useState<ChainRes | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    if (!BRIDGE) {
      setErr('Set VITE_ANGEL_BRIDGE_URL')
      return
    }
    setLoading(true)
    setErr('')
    try {
      const r = await fetch(`${BRIDGE}/option-chain`, { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok || j.ok === false) throw new Error(j.error || 'chain_failed')
      setData(j)
    } catch (e) {
      setErr(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), 60_000)
    return () => clearInterval(t)
  }, [load])

  const health =
    data?.status === 'ok' ? 'live' : data?.status === 'empty_chain' ? 'delayed' : 'unavailable'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#2c241c] flex items-center gap-2">
            <Layers className="h-6 w-6 text-[#5a9a4c]" />
            Nifty Chain Guide
          </h1>
          <p className="text-sm text-[#7a6a5c] flex items-center gap-2 mt-1">
            Option chain + educational zones
            <DataHealthBadge status={health} />
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="border border-[#6b4f3a]/15 bg-[#a8d4e6]/15">
        <div className="flex gap-2 text-sm text-[#2c241c]">
          <ShieldAlert className="h-4 w-4 text-[#6b4f3a] shrink-0 mt-0.5" />
          <p>
            Educational guide only — not signals. OI/LTP from Angel when available. Compare with your
            broker app before any trade.
          </p>
        </div>
      </Card>

      {err && (
        <Card className="border border-red-200 bg-red-50 text-sm text-red-800">{err}</Card>
      )}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <div className="text-xs font-semibold text-[#7a6a5c]">Spot</div>
              <div className="text-2xl font-bold text-[#2c241c] tabular-nums mt-1">
                {data.spot != null ? data.spot.toLocaleString('en-IN') : '—'}
              </div>
            </Card>
            <Card>
              <div className="text-xs font-semibold text-[#7a6a5c]">Expiry</div>
              <div className="text-sm font-bold text-[#2c241c] mt-2">{data.expiry || '—'}</div>
            </Card>
            <Card>
              <div className="text-xs font-semibold text-[#7a6a5c]">PCR</div>
              <div className="text-2xl font-bold text-[#2c241c] mt-1">
                {data.guide.pcr != null ? data.guide.pcr.toFixed(2) : '—'}
              </div>
            </Card>
            <Card>
              <div className="text-xs font-semibold text-[#7a6a5c]">Max pain (approx)</div>
              <div className="text-2xl font-bold text-[#2c241c] mt-1">
                {data.guide.maxPain ?? '—'}
              </div>
            </Card>
            <Card>
              <div className="text-xs font-semibold text-[#7a6a5c]">Guide bias</div>
              <div className="text-lg font-bold capitalize text-[#4a3428] mt-2">{data.guide.bias}</div>
            </Card>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Card>
              <div className="text-xs font-semibold text-[#7a6a5c]">Support zone (Put OI)</div>
              <div className="text-xl font-bold text-[#2f5c28] mt-1">
                {data.guide.supportZone ?? '—'}
              </div>
            </Card>
            <Card>
              <div className="text-xs font-semibold text-[#7a6a5c]">Resistance zone (Call OI)</div>
              <div className="text-xl font-bold text-[#7a3a2e] mt-1">
                {data.guide.resistanceZone ?? '—'}
              </div>
            </Card>
            <Card>
              <div className="text-xs font-semibold text-[#7a6a5c]">Status</div>
              <div className="text-sm font-semibold text-[#2c241c] mt-2">{data.status}</div>
              {data.error && <div className="text-xs text-[#b45a46] mt-1">{data.error}</div>}
            </Card>
          </div>

          <Card>
            <div className="text-xs font-semibold text-[#7a6a5c] mb-2">Guide notes</div>
            <ul className="space-y-1 text-sm text-[#2c241c]">
              {data.guide.notes.map((n) => (
                <li key={n}>• {n}</li>
              ))}
            </ul>
          </Card>

          <Card className="overflow-x-auto">
            <div className="text-xs font-semibold text-[#7a6a5c] mb-3">Chain (ATM window)</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase text-[#7a6a5c] border-b border-[#6b4f3a]/15">
                  <th className="py-2 pr-2">Call OI</th>
                  <th className="py-2 pr-2">Call LTP</th>
                  <th className="py-2 pr-2 text-center">Strike</th>
                  <th className="py-2 pr-2">Put LTP</th>
                  <th className="py-2">Put OI</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => {
                  const atm =
                    data.spot != null && Math.abs(r.strike - data.spot) < 30
                  return (
                    <tr
                      key={r.strike}
                      className={`border-b border-[#6b4f3a]/10 ${atm ? 'bg-[#7cbc6e]/12' : ''}`}
                    >
                      <td className="py-1.5 pr-2 tabular-nums text-[#4a3428]">
                        {r.callOi != null ? r.callOi.toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="py-1.5 pr-2 tabular-nums text-[#2c241c]">
                        {r.callLtp != null ? r.callLtp.toFixed(2) : '—'}
                      </td>
                      <td className="py-1.5 pr-2 text-center font-bold text-[#2c241c]">{r.strike}</td>
                      <td className="py-1.5 pr-2 tabular-nums text-[#2c241c]">
                        {r.putLtp != null ? r.putLtp.toFixed(2) : '—'}
                      </td>
                      <td className="py-1.5 tabular-nums text-[#4a3428]">
                        {r.putOi != null ? r.putOi.toLocaleString('en-IN') : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!data.rows.length && (
              <p className="text-sm text-[#7a6a5c] mt-2">
                No rows — ensure bridge scrip master downloaded and market session active.
              </p>
            )}
          </Card>

          <p className="text-[10px] text-[#7a6a5c]">{data.disclaimer}</p>
        </>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { ModeToggle } from '@/components/workspace/ModeToggle'
import { FactorModelCard } from '@/components/workspace/FactorModelCard'
import { useWorkspaceMode } from '@/stores/workspaceMode'
import { useAngelLiveFeed } from '@/hooks/useAngelLiveFeed'
import { DataHealthBadge } from '@/components/DataHealthBadge'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { Activity, Radio, RefreshCw, Building2 } from 'lucide-react'
import { fetchMacroMatrix, type MacroRow } from '@/services/macro'
import { fetchFIIDII, type FIIDIIRow } from '@/services/liveData'

export function LiveTerminalPage() {
  const { mode } = useWorkspaceMode()
  const { data, connected, bridgeConfigured, refreshSnapshot, isLive, ageSec } = useAngelLiveFeed()
  const pro = mode === 'pro'
  const ltp = (data.ltp || {}) as Record<string, number>
  const health = isLive
    ? 'live'
    : data.status === 'session_ok'
      ? 'delayed'
      : data.status === 'simulated'
        ? 'demo'
        : 'unavailable'

  const [macro, setMacro] = useState<MacroRow[]>([])
  const [fii, setFii] = useState<FIIDIIRow[]>([])
  const [fiiSource, setFiiSource] = useState('')
  const [macroLoading, setMacroLoading] = useState(false)

  const loadSide = async () => {
    setMacroLoading(true)
    try {
      const [m, f] = await Promise.all([fetchMacroMatrix(), fetchFIIDII()])
      setMacro(m)
      setFii(f.rows.slice(0, 8))
      setFiiSource(f.source)
    } finally {
      setMacroLoading(false)
    }
  }

  useEffect(() => {
    void loadSide()
    const t = setInterval(() => void loadSide(), 120_000)
    return () => clearInterval(t)
  }, [])

  
  return (
    <div className={cn('space-y-4', pro && 'space-y-2 text-[13px]')}>
      <div className="nf-art-line" />
      <div className={cn('flex flex-wrap items-center justify-between gap-3', pro && 'mb-1')}>
        <div>
          <h1
            className={cn(
              'font-bold flex items-center gap-2 text-[#0f1b2d]',
              pro ? 'text-lg' : 'text-2xl',
            )}
          >
            <Activity className="h-5 w-5 text-[#c9a227]" />
            Live Terminal
          </h1>
          <p className="text-xs text-[#5a6b82] flex items-center gap-2 flex-wrap mt-1">
            Nifty/Bank · Angel bridge
            <DataHealthBadge status={health} />
            {ageSec != null && (
              <span className="text-[11px] font-semibold text-[#1a5f9e]">
                snapshot {ageSec}s ago
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-[#0f1b2d]">
            <Radio className={cn('h-3.5 w-3.5', connected ? 'text-[#2d8f6f]' : 'text-[#5a6b82]')} />
            {bridgeConfigured ? (connected ? 'Bridge on' : 'Connecting…') : 'Set bridge URL'}
          </div>
          <Button variant="outline" size="sm" onClick={() => void refreshSnapshot()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <ModeToggle />
        </div>
      </div>

      {!bridgeConfigured && (
        <Card className="border border-[rgba(26,95,158,0.25)] bg-[rgba(26,95,158,0.06)] text-sm text-[#0f1b2d]">
          Set <code className="font-semibold">VITE_ANGEL_BRIDGE_URL</code> on Vercel to your Railway
          bridge for LIVE Nifty/Bank.
        </Card>
      )}

      {health !== 'live' && bridgeConfigured && (
        <Card className="border border-[rgba(179,58,58,0.25)] bg-[rgba(179,58,58,0.05)] text-sm text-[#0f1b2d]">
          Index feed is <strong>{health}</strong>. Open Railway logs / Angel TOTP session. Chain trade
          ideas stay off until LIVE.
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {['NIFTY', 'BANKNIFTY'].map((sym) => (
          <Card key={sym}>
            <div className="text-xs font-semibold text-[#5a6b82]">{sym}</div>
            <div className="text-2xl font-bold tabular-nums text-[#0f1b2d] mt-1">
              {ltp[sym] != null ? ltp[sym].toLocaleString('en-IN') : '—'}
            </div>
            <div className="text-[11px] text-[#5a6b82] mt-1 capitalize">{health}</div>
          </Card>
        ))}
        <Card>
          <div className="text-xs font-semibold text-[#5a6b82]">Feed status</div>
          <div className="text-lg font-bold capitalize mt-1 text-[#0f1b2d]">{data.status || '—'}</div>
          <div className="text-[11px] text-[#5a6b82] mt-1">
            {data.ts ? new Date(data.ts).toLocaleTimeString('en-IN') : '—'}
          </div>
        </Card>
        <Card>
          <div className="text-xs font-semibold text-[#5a6b82]">Source</div>
          <div className="text-sm mt-1 font-semibold text-[#0f1b2d]">
            {String((data as { source?: string }).source || '—')}
          </div>
          <div className="text-[11px] text-[#5a6b82] mt-1">{String(data.build || '')}</div>
        </Card>
      </div>

      {data.factors && (
        <FactorModelCard
          score={data.factors.score}
          weights={data.factors.weights}
          components={data.factors.components}
        />
      )}

      {/* Global macro — delayed public */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="text-xs font-semibold text-[#0f1b2d]">Global macro matrix</div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[rgba(26,95,158,0.25)] bg-[rgba(26,95,158,0.08)] text-[#1a5f9e]">
            delayed public · not NSE live
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(macro.length ? macro : [
            { name: 'USD/INR', value: '—', chg: '…', tone: 'neu' as const, source: 'unavailable' as const },
            { name: 'Crude (WTI)', value: '—', chg: '…', tone: 'neu' as const, source: 'unavailable' as const },
            { name: 'S&P futures', value: '—', chg: '…', tone: 'neu' as const, source: 'unavailable' as const },
            { name: 'US 10Y', value: '—', chg: '…', tone: 'neu' as const, source: 'unavailable' as const },
          ]).map((m) => (
            <div
              key={m.name}
              className="rounded-xl border border-[rgba(15,40,80,0.1)] bg-[#f7f9fc] p-3"
            >
              <div className="text-[10px] font-semibold text-[#5a6b82]">{m.name}</div>
              <div className="text-lg font-bold tabular-nums text-[#0f1b2d] mt-0.5">
                {macroLoading && m.value === '—' ? '…' : m.value}
              </div>
              <div
                className={cn(
                  'text-xs font-semibold mt-0.5',
                  m.tone === 'pos' && 'text-[#2d8f6f]',
                  m.tone === 'neg' && 'text-[#b33a3a]',
                  m.tone === 'neu' && 'text-[#5a6b82]',
                )}
              >
                {m.chg}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* FII DII — EOD / public, not intraday live */}
      <Card>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Building2 className="h-4 w-4 text-[#c9a227]" />
          <div className="text-xs font-semibold text-[#0f1b2d]">FII / DII (cash style)</div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[rgba(201,162,39,0.35)] bg-[rgba(201,162,39,0.1)] text-[#6b5344]">
            source: {fiiSource || '—'} · not intraday live
          </span>
        </div>
        <p className="text-[11px] text-[#5a6b82] mb-2">
          Official institutional flow is typically end-of-day (NSE/NSDL). Use as multi-day context, not
          a 9:20 signal.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[#5a6b82] border-b border-[rgba(15,40,80,0.1)]">
                <th className="py-1.5 pr-2">Date</th>
                <th className="py-1.5 pr-2">FII net</th>
                <th className="py-1.5">DII net</th>
              </tr>
            </thead>
            <tbody>
              {fii.map((r) => (
                <tr key={r.date + r.fii} className="border-b border-[rgba(15,40,80,0.05)]">
                  <td className="py-1.5 pr-2 font-semibold text-[#0f1b2d]">{r.date}</td>
                  <td
                    className={cn(
                      'py-1.5 pr-2 tabular-nums font-semibold',
                      r.fii >= 0 ? 'text-[#2d8f6f]' : 'text-[#b33a3a]',
                    )}
                  >
                    {r.fii >= 0 ? '+' : ''}
                    {r.fii}
                  </td>
                  <td
                    className={cn(
                      'py-1.5 tabular-nums font-semibold',
                      r.dii >= 0 ? 'text-[#2d8f6f]' : 'text-[#b33a3a]',
                    )}
                  >
                    {r.dii >= 0 ? '+' : ''}
                    {r.dii}
                  </td>
                </tr>
              ))}
              {!fii.length && (
                <tr>
                  <td colSpan={3} className="py-2 text-[#5a6b82]">
                    No rows — feed unavailable
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  fetchIndexBars,
  fetchStockBars,
  fetchFIIDII,
  quoteFromBars,
  WATCHLIST_SYMBOLS,
  type IndexQuote,
  type FIIDIIRow,
} from '@/services/liveData'
import {
  runAllModels,
  combineBias,
  educationalRiskMap,
  type Bar,
  type ModelResult,
} from '@/services/indicators'
import { formatPercent, cn } from '@/lib/utils'
import { Sunrise, RefreshCw, AlertTriangle, Shield } from 'lucide-react'
import { DataHealthBadge, healthFromSource } from '@/components/DataHealthBadge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

type StockPack = {
  symbol: string
  name: string
  quote: IndexQuote
  models: ModelResult[]
  combined: ReturnType<typeof combineBias>
  risk: ReturnType<typeof educationalRiskMap>
}

export function MorningBriefPage() {
  const [loading, setLoading] = useState(true)
  const [nifty, setNifty] = useState<IndexQuote | null>(null)
  const [sensex, setSensex] = useState<IndexQuote | null>(null)
  const [niftyModels, setNiftyModels] = useState<ModelResult[]>([])
  const [niftyBias, setNiftyBias] = useState<ReturnType<typeof combineBias> | null>(null)
  const [fii, setFii] = useState<FIIDIIRow[]>([])
  const [fiiSource, setFiiSource] = useState('')
  const [stocks, setStocks] = useState<StockPack[]>([])
  const [maxLoss, setMaxLoss] = useState(1000)
  const [err, setErr] = useState('')

  const load = async () => {
    setLoading(true)
    setErr('')
    try {
      const [n, s, flow] = await Promise.all([
        fetchIndexBars('nifty'),
        fetchIndexBars('sensex'),
        fetchFIIDII(),
      ])
      setNifty(quoteFromBars('NIFTY', 'Nifty 50', n.bars, n.source))
      setSensex(quoteFromBars('SENSEX', 'Sensex', s.bars, s.source))
      const nm = runAllModels(n.bars)
      setNiftyModels(nm)
      setNiftyBias(combineBias(nm))
      setFii(flow.rows)
      setFiiSource(flow.source)

      const packs: StockPack[] = []
      for (const w of WATCHLIST_SYMBOLS) {
        const { bars, source } = await fetchStockBars(w.symbol)
        const quote = quoteFromBars(w.symbol, w.name, bars, source)
        const models = runAllModels(bars)
        const combined = combineBias(models)
        const side = combined.bias === 'bearish' ? 'short' : 'long'
        const risk = educationalRiskMap(quote.price, bars, side, maxLoss)
        packs.push({ symbol: w.symbol, name: w.name, quote, models, combined, risk })
      }
      setStocks(packs)
    } catch (e) {
      setErr('Could not refresh some feeds — showing available / demo data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    // recompute qty ideas when max loss changes
    setStocks((prev) =>
      prev.map((p) => {
        const side = p.combined.bias === 'bearish' ? 'short' : 'long'
        // risk map needs bars — approximate using stop distance already stored
        return {
          ...p,
          risk: {
            ...p.risk,
            qtyIdea:
              p.risk.riskPerUnit > 0 ? Math.max(0, Math.floor(maxLoss / p.risk.riskPerUnit)) : 0,
          },
        }
      }),
    )
  }, [maxLoss])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sunrise className="h-6 w-6 text-amber-400" />
            Morning Brief
          </h1>
          <p className="text-sm text-zinc-400 flex flex-wrap items-center gap-2">
            9:15–11 focus · personal use
            {nifty && (
              <DataHealthBadge status={healthFromSource(nifty.source)} asOf={nifty.asOf} />
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <Card className="border border-amber-500/20 bg-amber-500/5">
        <div className="flex gap-3 text-sm text-zinc-300">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <strong className="text-amber-200">Personal educational tool — not investment advice.</strong>
            {' '}No guaranteed profit. Data may be delayed or demo if feeds fail. You place trades on your broker.
          </div>
        </div>
      </Card>

      {err && <p className="text-sm text-amber-400">{err}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[nifty, sensex].map(
          (q) =>
            q && (
              <Card key={q.symbol}>
                <div className="text-xs text-zinc-500">{q.name} · {q.source}</div>
                <div className="mt-1 text-xl font-bold tabular-nums">{q.price.toLocaleString('en-IN')}</div>
                <div className={cn('text-sm', q.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {formatPercent(q.changePercent)}
                </div>
              </Card>
            ),
        )}
        <Card>
          <div className="text-xs text-zinc-500 flex items-center gap-1">
            <Shield className="h-3 w-3" /> Max loss per idea (₹)
          </div>
          <input
            type="number"
            value={maxLoss}
            onChange={(e) => setMaxLoss(Number(e.target.value) || 0)}
            className="mt-2 h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-lg font-bold outline-none focus:border-indigo-500"
          />
          <p className="mt-1 text-[10px] text-zinc-500">Used only to size educational qty ideas</p>
        </Card>
        <Card>
          <div className="text-xs text-zinc-500">Model mix (Nifty)</div>
          <div className="mt-1 text-lg font-semibold capitalize text-indigo-300">
            {niftyBias?.bias || '—'}
          </div>
          <p className="text-xs text-zinc-400 mt-1">{niftyBias?.text}</p>
        </Card>
      </div>

      {/* 3 models */}
      <div>
        <h2 className="font-semibold mb-3">Chart models (retail-app style)</h2>
        <div className="grid gap-3 lg:grid-cols-3">
          {niftyModels.map((m) => (
            <Card key={m.id}>
              <div className="text-xs text-zinc-500">{m.usedInApps}</div>
              <div className="font-semibold mt-1">{m.name}</div>
              <div
                className={cn(
                  'mt-2 text-sm font-medium capitalize',
                  m.signal === 'bullish' && 'text-emerald-400',
                  m.signal === 'bearish' && 'text-red-400',
                  m.signal === 'neutral' && 'text-zinc-400',
                )}
              >
                {m.signal} · {m.confidence} confidence
              </div>
              <p className="mt-2 text-sm text-zinc-300">{m.summary}</p>
              <ul className="mt-2 space-y-1 text-xs text-zinc-400">
                {m.levels.map((l) => (
                  <li key={l.label} className="flex justify-between gap-2">
                    <span>{l.label}</span>
                    <span className="tabular-nums text-zinc-200">{l.value}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-indigo-300">{m.invalidation}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* FII DII */}
      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="font-semibold text-[#2c241c]">FII / DII</span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-[#7eb8d4]/50 bg-[#eef6fa] text-[#2c241c]">
            source: {fiiSource || '—'}
          </span>
          {fiiSource === 'demo' && (
            <span className="text-[11px] text-[#7a3a2e]">Illustrative sample — not NSE official live</span>
          )}
          {fiiSource === 'public-feed' && (
            <span className="text-[11px] text-[#2f5c28]">Third-party public feed — verify on NSE/NSDL</span>
          )}
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fii}>
              <XAxis dataKey="date" tick={{ fill: '#7a6a5c', fontSize: 10 }} />
              <YAxis tick={{ fill: '#7a6a5c', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#fffdf9', border: '1px solid rgba(107,79,58,0.2)', borderRadius: 8, color: '#2c241c' }} />
              <Legend />
              <Bar dataKey="fii" name="FII net" fill="#6366f1" />
              <Bar dataKey="dii" name="DII net" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Stock watchlist */}
      <div>
        <h2 className="font-semibold mb-3">Intraday watchlist (educational zones)</h2>
        <div className="space-y-3">
          {stocks.map((s) => (
            <Card key={s.symbol}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">
                    {s.symbol}{' '}
                    <span className="text-zinc-500 font-normal text-sm">{s.name}</span>
                  </div>
                  <div className="text-sm tabular-nums">
                    ₹{s.quote.price.toLocaleString('en-IN')}{' '}
                    <span className={s.quote.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {formatPercent(s.quote.changePercent)}
                    </span>
                    <span className="text-xs text-zinc-500 ml-2">{s.quote.source}</span>
                  </div>
                </div>
                <div
                  className={cn(
                    'text-sm font-semibold capitalize px-3 py-1 rounded-full border shadow-sm',
                    s.combined.bias === 'bullish' &&
                      'bg-[#e8f6e4] text-[#2f5c28] border-[#7cbc6e]/50',
                    s.combined.bias === 'bearish' &&
                      'bg-[#fdecea] text-[#7a3a2e] border-[#e0a090]/60',
                    s.combined.bias !== 'bullish' &&
                      s.combined.bias !== 'bearish' &&
                      'bg-[#eef6fa] text-[#2c241c] border-[#7eb8d4]/50',
                  )}
                >
                  {s.combined.bias}
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
                <div>
                  <div className="text-xs text-zinc-500">Stop idea</div>
                  <div className="font-medium tabular-nums">₹{s.risk.stopIdea}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Target idea (1.5R)</div>
                  <div className="font-medium tabular-nums">₹{s.risk.targetIdea}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Qty idea @ max loss ₹{maxLoss}</div>
                  <div className="font-medium tabular-nums">{s.risk.qtyIdea}</div>
                </div>
              </div>
              <p className="mt-2 text-xs text-zinc-500">{s.risk.note}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

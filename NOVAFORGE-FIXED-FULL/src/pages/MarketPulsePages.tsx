import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn, formatPercent } from '@/lib/utils'
import {
  OPTIONS_SNAPSHOT,
  SMART_MONEY,
  BREADTH,
  SECTORS,
  SCANNERS,
  IPOS,
  SAMPLE_STOCK_SCORES,
  DEFAULT_MARKET_SCORE,
} from '@/services/intelligence'
import {
  Activity, Bell, Layers, Rocket, Wallet, Gauge, Building2, TrendingUp, Plus, Trash2, Check,
} from 'lucide-react'

export function OptionsAnalyticsPage() {
  const o = OPTIONS_SNAPSHOT
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-indigo-400" /> Options Analytics
        </h1>
        <p className="text-sm text-zinc-400">OI · PCR · Max Pain · zones · educational snapshot</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['PCR', o.pcr.toFixed(2)],
          ['Max Pain', o.maxPain.toLocaleString('en-IN')],
          ['Call OI Δ', `${o.changeOiCall}%`],
          ['Put OI Δ', `${o.changeOiPut}%`],
        ].map(([k, v]) => (
          <Card key={k}>
            <div className="text-xs text-zinc-500">{k}</div>
            <div className="text-xl font-bold mt-1">{v}</div>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="font-semibold mb-2">Direction score</div>
          <div className="text-4xl font-bold text-indigo-300">{o.directionScore}</div>
          <p className="text-sm text-zinc-400 mt-2">{o.interpretation}</p>
        </Card>
        <Card>
          <div className="font-semibold mb-2">Zones</div>
          <div className="text-sm space-y-2">
            <div>
              <span className="text-emerald-400">Support:</span> {o.support.join(' · ')}
            </div>
            <div>
              <span className="text-red-400">Resistance:</span> {o.resistance.join(' · ')}
            </div>
            <p className="text-xs text-zinc-500 mt-3">Not live exchange OI — illustrative structure for decision practice.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function SmartMoneyPage() {
  const s = SMART_MONEY
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6 text-indigo-400" /> Smart Money Tracker
        </h1>
        <p className="text-sm text-zinc-400">Bulk / block / ownership style context</p>
      </div>
      <Card>
        <div className="text-xs text-zinc-500">Smart Money Score</div>
        <div className="text-4xl font-bold text-indigo-300">{s.score}<span className="text-lg text-zinc-500">/100</span></div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="font-semibold mb-2">Bulk deals</div>
          {s.bulk.map((b) => (
            <div key={b.symbol + b.side} className="flex justify-between text-sm border-b border-zinc-800 py-2">
              <span>{b.symbol} · {b.side}</span>
              <span className="text-zinc-400">{b.value}</span>
            </div>
          ))}
        </Card>
        <Card>
          <div className="font-semibold mb-2">Block / other</div>
          {[...s.block, ...s.promoter].map((b) => (
            <div key={b.symbol + b.side} className="flex justify-between text-sm border-b border-zinc-800 py-2">
              <span>{b.symbol} · {b.side}</span>
              <span className="text-zinc-400">{b.value}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

export function BreadthPage() {
  const b = BREADTH
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-indigo-400" /> Market Breadth
        </h1>
        <p className="text-sm text-zinc-400">Advancers / decliners · DMA participation</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><div className="text-xs text-zinc-500">Advancers</div><div className="text-2xl font-bold text-emerald-400">{b.advancers}</div></Card>
        <Card><div className="text-xs text-zinc-500">Decliners</div><div className="text-2xl font-bold text-red-400">{b.decliners}</div></Card>
        <Card><div className="text-xs text-zinc-500">A/D Ratio</div><div className="text-2xl font-bold">{b.ratio}</div></Card>
        <Card><div className="text-xs text-zinc-500">Breadth Strength</div><div className="text-2xl font-bold text-indigo-300">{b.strength}</div></Card>
      </div>
      <Card>
        <div className="font-semibold mb-3">% stocks above DMA (illustrative)</div>
        {[
          ['20 DMA', b.above20],
          ['50 DMA', b.above50],
          ['100 DMA', b.above100],
          ['200 DMA', b.above200],
        ].map(([l, v]) => (
          <div key={l as string} className="mb-3">
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>{l}</span><span>{v}%</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${v}%` }} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}

export function SectorsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="h-6 w-6 text-indigo-400" /> Sector Analysis
        </h1>
        <p className="text-sm text-zinc-400">Money flow · momentum · relative strength</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {SECTORS.map((s) => (
          <Card key={s.name}>
            <div className="font-semibold">{s.name}</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-zinc-900 p-2">Flow <span className="float-right text-zinc-200">{s.flow}</span></div>
              <div className="rounded-lg bg-zinc-900 p-2">Mom <span className="float-right text-zinc-200">{s.momentum}</span></div>
              <div className="rounded-lg bg-zinc-900 p-2">RS <span className="float-right text-zinc-200">{s.rs}</span></div>
              <div className="rounded-lg bg-zinc-900 p-2">Inst <span className="float-right text-zinc-200">{s.inst}</span></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function ScannersAdvancedPage() {
  const tabs = Object.keys(SCANNERS)
  const [active, setActive] = useState(tabs[0])
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Advanced Scanners</h1>
        <p className="text-sm text-zinc-400">Breakout · volume · momentum · build-up styles</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs border',
              active === t ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200' : 'border-zinc-700 text-zinc-400',
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {SCANNERS[active].map((r) => (
          <Card key={r.symbol + r.metric} className="flex justify-between items-center">
            <div>
              <div className="font-semibold">{r.symbol} <span className="text-zinc-500 font-normal text-sm">{r.name}</span></div>
              <div className="text-xs text-zinc-500">{r.metric}</div>
            </div>
            <span className="text-sm text-indigo-300">{r.value}</span>
          </Card>
        ))}
      </div>
      <div>
        <h2 className="font-semibold mb-2">AI stock scores</h2>
        <div className="space-y-2">
          {SAMPLE_STOCK_SCORES.map((s) => (
            <Card key={s.symbol} className="flex flex-wrap justify-between gap-2 text-sm">
              <div>
                <span className="font-semibold">{s.symbol}</span>
                <span className="text-zinc-500 ml-2">{s.sector}</span>
              </div>
              <div className="text-zinc-300">
                Final <strong className="text-indigo-300">{s.final}</strong> · {s.rating}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

type AlertItem = { id: string; type: string; target: string; condition: string }

export function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([
    { id: '1', type: 'Price', target: 'NIFTY', condition: 'Above 24500' },
    { id: '2', type: 'PCR', target: 'NIFTY', condition: 'PCR < 0.8' },
  ])
  const [type, setType] = useState('Price')
  const [target, setTarget] = useState('NIFTY')
  const [condition, setCondition] = useState('')

  const add = () => {
    if (!condition.trim()) return
    setAlerts((a) => [...a, { id: String(Date.now()), type, target, condition }])
    setCondition('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6 text-indigo-400" /> Alert Center
        </h1>
        <p className="text-sm text-zinc-400">Local alerts (browser session) · wire push/email later</p>
      </div>
      <Card className="grid gap-3 sm:grid-cols-4">
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
          {['Price', 'Volume', 'PCR', 'OI', 'RSI', 'MACD', 'Market Score', 'Sector'].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <input value={target} onChange={(e) => setTarget(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Symbol" />
        <input value={condition} onChange={(e) => setCondition(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Condition" />
        <Button onClick={add} className="gap-1"><Plus className="h-4 w-4" /> Add</Button>
      </Card>
      <div className="space-y-2">
        {alerts.map((a) => (
          <Card key={a.id} className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-indigo-300">{a.type}</span> · {a.target} · {a.condition}
            </div>
            <button onClick={() => setAlerts((x) => x.filter((i) => i.id !== a.id))} className="text-zinc-500 hover:text-red-400">
              <Trash2 className="h-4 w-4" />
            </button>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function IPOPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Rocket className="h-6 w-6 text-indigo-400" /> IPO Center
        </h1>
        <p className="text-sm text-zinc-400">Pipeline · GMP style · risk tags (sample data)</p>
      </div>
      <div className="space-y-2">
        {IPOS.map((i) => (
          <Card key={i.name} className="flex flex-wrap justify-between gap-3">
            <div>
              <div className="font-semibold">{i.name}</div>
              <div className="text-xs text-zinc-500">{i.status} · Risk {i.risk}</div>
            </div>
            <div className="text-sm text-right">
              <div>GMP {i.gmp}</div>
              <div className="text-zinc-500">Sub {i.sub} · AI {i.rating}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function PricingPage() {
  const plans = [
    { name: 'Free', price: '₹0', features: ['Morning Brief', 'Basic screeners', 'News', 'Delayed data'] },
    { name: 'Premium', price: '₹999/mo', features: ['AI Copilot', 'Options lab', 'Alerts', 'Advanced scanners'], highlight: true },
    { name: 'Professional', price: '₹2,499/mo', features: ['All Premium', 'Priority data', 'Portfolio AI', 'Reports'] },
    { name: 'Enterprise', price: 'Custom', features: ['API access', 'Team seats', 'SLA', 'Custom models'] },
  ]
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pricing</h1>
        <p className="text-sm text-zinc-400">Simple plans · payments (Razorpay/Stripe) can plug in later</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <Card key={p.name} className={cn(p.highlight && 'border-indigo-500/50 ring-1 ring-indigo-500/30')}>
            <div className="text-sm text-zinc-400">{p.name}</div>
            <div className="text-2xl font-bold mt-1">{p.price}</div>
            <ul className="mt-4 space-y-2 text-sm text-zinc-300">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 shrink-0" />{f}</li>
              ))}
            </ul>
            <Button className="w-full mt-4" variant={p.highlight ? 'default' : 'outline'}>
              {p.name === 'Enterprise' ? 'Contact' : 'Start'}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function MarketScoreWidget() {
  const m = DEFAULT_MARKET_SCORE
  return (
    <Card>
      <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
        <Gauge className="h-4 w-4 text-indigo-400" /> AI Market Score
      </div>
      <div className="text-4xl font-bold text-indigo-300">{m.score}</div>
      <div className="text-sm text-zinc-300 mt-1">{m.label}</div>
      <div className="mt-3 h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400" style={{ width: `${m.score}%` }} />
      </div>
    </Card>
  )
}

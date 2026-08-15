import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn, formatPercent } from '@/lib/utils'
import {
  Newspaper, Building2, Filter, Sparkles, Calendar, Settings,
  TrendingUp, Shield, Cpu, Plane, Leaf, Zap, Landmark, Heart,
  ChevronRight, AlertCircle, Globe2,
} from 'lucide-react'
import { Link } from 'react-router-dom'

/** —— NEWS —— */
const NEWS = [
  {
    title: 'Central bank holds policy rate; stance stays data-dependent',
    source: 'Market Wire',
    tag: 'Macro',
    sentiment: 'neutral' as const,
    blurb: 'Rates unchanged. Markets watch guidance on inflation and liquidity.',
    icon: Landmark,
    color: 'from-slate-500 to-zinc-600',
  },
  {
    title: 'Energy major expands renewable capacity roadmap',
    source: 'Corp Desk',
    tag: 'Energy',
    sentiment: 'positive' as const,
    blurb: 'Long-term capex plan highlighted; near-term execution remains key.',
    icon: Leaf,
    color: 'from-emerald-500 to-teal-600',
  },
  {
    title: 'IT services: deal pipeline commentary mixed across peers',
    source: 'Tech Desk',
    tag: 'IT',
    sentiment: 'neutral' as const,
    blurb: 'Select large-deal wins vs softer discretionary spend in some regions.',
    icon: Cpu,
    color: 'from-indigo-500 to-violet-600',
  },
  {
    title: 'Foreign flows turn constructive after recent selling stretch',
    source: 'Flow Desk',
    tag: 'FII/DII',
    sentiment: 'positive' as const,
    blurb: 'Daily net figures matter less than 5–10 session confirmation.',
    icon: Globe2,
    color: 'from-blue-500 to-cyan-600',
  },
  {
    title: 'Banking: credit growth steady; NIMs under watch',
    source: 'Finance Desk',
    tag: 'Banks',
    sentiment: 'neutral' as const,
    blurb: 'Private banks remain leadership candidates when risk appetite holds.',
    icon: Building2,
    color: 'from-amber-500 to-orange-600',
  },
  {
    title: 'Defence & aerospace order book updates in focus',
    source: 'Policy Desk',
    tag: 'Defence',
    sentiment: 'positive' as const,
    blurb: 'Theme stays structural; valuation and delivery timelines matter.',
    icon: Shield,
    color: 'from-red-500 to-rose-600',
  },
]

export function NewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Newspaper className="h-6 w-6 text-indigo-400" /> News Intelligence
        </h1>
        <p className="text-sm text-zinc-400">Curated headlines with simple sentiment tags · educational context only</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {NEWS.map((n) => (
          <Card key={n.title} className="flex gap-4 hover:border-indigo-500/30 transition">
            <div
              className={cn(
                'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white',
                n.color,
              )}
            >
              <n.icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-500">
                <span>{n.source}</span>
                <span>·</span>
                <span className="text-indigo-300">{n.tag}</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5',
                    n.sentiment === 'positive' && 'bg-emerald-500/15 text-emerald-400',
                    n.sentiment === 'neutral' && 'bg-zinc-700 text-zinc-300',
                    n.sentiment === 'negative' && 'bg-red-500/15 text-red-400',
                  )}
                >
                  {n.sentiment}
                </span>
              </div>
              <div className="mt-1 font-semibold leading-snug">{n.title}</div>
              <p className="mt-1 text-xs text-zinc-400">{n.blurb}</p>
            </div>
          </Card>
        ))}
      </div>
      <p className="text-xs text-zinc-500">
        Headlines are illustrative / aggregated-style context for learning. Always verify from primary sources before decisions.
      </p>
    </div>
  )
}

/** —— FII / DII —— */
export function InstitutionalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6 text-indigo-400" /> Institutional Tracker
        </h1>
        <p className="text-sm text-zinc-400">FII / DII style flow context · pair with Morning Brief</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['FII Net (session style)', '+₹1,240 Cr', 'text-emerald-400'],
          ['DII Net (session style)', '−₹420 Cr', 'text-red-400'],
          ['FII trend (recent)', 'Improving', 'text-emerald-400'],
          ['DII trend (recent)', 'Steady bid', 'text-zinc-200'],
        ].map(([l, v, c]) => (
          <Card key={l}>
            <div className="text-xs text-zinc-400">{l}</div>
            <div className={cn('mt-1 text-xl font-bold', c)}>{v}</div>
          </Card>
        ))}
      </div>
      <Card>
        <div className="font-semibold mb-2">How to read flows</div>
        <ul className="text-sm text-zinc-400 space-y-1 list-disc pl-5">
          <li>One day is noise — watch 5–10 session stretches.</li>
          <li>FII selling + strong DII often means choppy index options tape.</li>
          <li>Confirm with Nifty structure on Morning Brief models.</li>
        </ul>
        <Link to="/morning" className="mt-3 inline-flex text-sm text-indigo-400 items-center gap-1">
          Open Morning Brief <ChevronRight className="h-4 w-4" />
        </Link>
      </Card>
    </div>
  )
}

/** —— SCREENERS —— */
type Row = { symbol: string; name: string; sector: string; score: number; note: string; chg: number }

const SCREENER_DATA: Record<string, Row[]> = {
  Momentum: [
    { symbol: 'RELIANCE', name: 'Reliance', sector: 'Energy', score: 78, note: 'Relative strength vs broad market', chg: 0.8 },
    { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banks', score: 74, note: 'Leadership candidate in risk-on', chg: 0.5 },
    { symbol: 'TCS', name: 'TCS', sector: 'IT', score: 71, note: 'Quality momentum', chg: 0.3 },
  ],
  Quality: [
    { symbol: 'TCS', name: 'TCS', sector: 'IT', score: 88, note: 'Margins & balance sheet strength', chg: 0.2 },
    { symbol: 'INFY', name: 'Infosys', sector: 'IT', score: 84, note: 'Consistent return profile', chg: -0.1 },
    { symbol: 'HINDUNILVR', name: 'HUL', sector: 'FMCG', score: 82, note: 'Defensive quality', chg: 0.1 },
  ],
  'Private Banks': [
    { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banks', score: 80, note: 'Core private bank complex', chg: 0.4 },
    { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banks', score: 79, note: 'Growth + franchise', chg: 0.6 },
    { symbol: 'KOTAKBANK', name: 'Kotak Bank', sector: 'Banks', score: 72, note: 'Premium franchise', chg: -0.2 },
  ],
  Technology: [
    { symbol: 'TCS', name: 'TCS', sector: 'IT', score: 85, note: 'Large-cap IT anchor', chg: 0.2 },
    { symbol: 'INFY', name: 'Infosys', sector: 'IT', score: 81, note: 'Growth optionality', chg: -0.1 },
    { symbol: 'HCLTECH', name: 'HCL Tech', sector: 'IT', score: 76, note: 'Services diversification', chg: 0.3 },
  ],
  'High Dividend': [
    { symbol: 'ITC', name: 'ITC', sector: 'Consumer', score: 77, note: 'Yield + cash flows', chg: 0.2 },
    { symbol: 'COALINDIA', name: 'Coal India', sector: 'Energy', score: 74, note: 'High payout history', chg: -0.4 },
    { symbol: 'ONGC', name: 'ONGC', sector: 'Energy', score: 70, note: 'Cyclical yield', chg: 0.5 },
  ],
  'Large Cap': [
    { symbol: 'RELIANCE', name: 'Reliance', sector: 'Energy', score: 86, note: 'Index heavyweight', chg: 0.5 },
    { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banks', score: 85, note: 'Systemically important', chg: 0.4 },
    { symbol: 'TCS', name: 'TCS', sector: 'IT', score: 84, note: 'Global IT leader', chg: 0.2 },
  ],
}

export function ScreenersPage() {
  const tabs = Object.keys(SCREENER_DATA)
  const [active, setActive] = useState(tabs[0])
  const rows = SCREENER_DATA[active]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Filter className="h-6 w-6 text-indigo-400" /> Screeners
        </h1>
        <p className="text-sm text-zinc-400">Ready filters · educational shortlists · not buy recommendations</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium border transition',
              active === t
                ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-500',
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <Card key={r.symbol} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold">
                {r.symbol} <span className="text-zinc-500 font-normal text-sm">{r.name}</span>
              </div>
              <div className="text-xs text-zinc-500">
                {r.sector} · {r.note}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-zinc-300">Score {r.score}</div>
              <div className={cn('text-xs', r.chg >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {formatPercent(r.chg)} sample
              </div>
            </div>
          </Card>
        ))}
      </div>
      <p className="text-xs text-zinc-500 flex items-start gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        Lists are illustrative for research workflow. Cross-check live prices and filings before any decision.
      </p>
    </div>
  )
}

/** —— THEMES —— */
const THEMES = [
  {
    name: 'Digital & IT Services',
    desc: 'Global tech spend, large deals, margin discipline.',
    icon: Cpu,
    color: 'from-indigo-500 to-violet-600',
    names: ['TCS', 'INFY', 'HCLTECH'],
  },
  {
    name: 'Private Banking',
    desc: 'Credit growth, liability franchise, capital buffers.',
    icon: Landmark,
    color: 'from-amber-500 to-orange-600',
    names: ['HDFCBANK', 'ICICIBANK', 'KOTAKBANK'],
  },
  {
    name: 'Defence & Aerospace',
    desc: 'Order books, indigenisation, multi-year delivery.',
    icon: Shield,
    color: 'from-red-500 to-rose-600',
    names: ['HAL', 'BEL', 'BDL'],
  },
  {
    name: 'Energy Transition',
    desc: 'Renewables, transmission, selective oil-to-green pivots.',
    icon: Leaf,
    color: 'from-emerald-500 to-teal-600',
    names: ['RELIANCE', 'POWERGRID', 'NTPC'],
  },
  {
    name: 'Manufacturing & Capex',
    desc: 'Industrial orders, infra cycle, capital goods.',
    icon: Zap,
    color: 'from-yellow-500 to-amber-600',
    names: ['LT', 'SIEMENS', 'ABB'],
  },
  {
    name: 'Healthcare',
    desc: 'Hospitals, pharma exports, domestic consumption.',
    icon: Heart,
    color: 'from-pink-500 to-rose-600',
    names: ['SUNPHARMA', 'APOLLOHOSP', 'DIVISLAB'],
  },
  {
    name: 'Aviation & Mobility',
    desc: 'Travel demand, fleet expansion, cyclical risk.',
    icon: Plane,
    color: 'from-sky-500 to-blue-600',
    names: ['INDIGO', 'MOTHERSON'],
  },
  {
    name: 'Momentum Leaders',
    desc: 'Relative strength baskets — rotate carefully.',
    icon: TrendingUp,
    color: 'from-fuchsia-500 to-purple-600',
    names: ['RELIANCE', 'HDFCBANK', 'TCS'],
  },
]

export function ThemesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-400" /> Theme Intelligence
        </h1>
        <p className="text-sm text-zinc-400">Secular & tactical themes with example names · not recommendations</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {THEMES.map((t) => (
          <Card key={t.name} className="overflow-hidden p-0">
            <div className={cn('h-20 bg-gradient-to-br flex items-center justify-center', t.color)}>
              <t.icon className="h-10 w-10 text-white/90" />
            </div>
            <div className="p-4">
              <div className="font-semibold">{t.name}</div>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{t.desc}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.names.map((n) => (
                  <span key={n} className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

/** —— CALENDAR —— */
function buildCalendar() {
  const today = new Date()
  const events = [
    { d: 0, title: 'Market open focus', type: 'Session', note: '9:15–11 bias window' },
    { d: 1, title: 'Weekly options expiry watch', type: 'Derivatives', note: 'Higher gamma near strikes' },
    { d: 3, title: 'Macro data window', type: 'Macro', note: 'Inflation / activity prints' },
    { d: 5, title: 'FII/DII weekly review', type: 'Flows', note: 'Confirm multi-day trend' },
    { d: 7, title: 'Monthly derivatives expiry zone', type: 'Derivatives', note: 'Plan size early' },
    { d: 10, title: 'Corporate results cluster', type: 'Earnings', note: 'Gap risk on names' },
    { d: 14, title: 'Policy / commentary risk', type: 'Policy', note: 'Avoid oversized overnight' },
  ]
  return events.map((e) => {
    const dt = new Date(today)
    dt.setDate(dt.getDate() + e.d)
    return {
      ...e,
      date: dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
    }
  })
}

export function CalendarPage() {
  const events = useMemo(() => buildCalendar(), [])
  const typeColor: Record<string, string> = {
    Session: 'bg-indigo-500/20 text-indigo-300',
    Derivatives: 'bg-amber-500/20 text-amber-300',
    Macro: 'bg-sky-500/20 text-sky-300',
    Flows: 'bg-emerald-500/20 text-emerald-300',
    Earnings: 'bg-fuchsia-500/20 text-fuchsia-300',
    Policy: 'bg-red-500/20 text-red-300',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-indigo-400" /> Economic & Event Calendar
        </h1>
        <p className="text-sm text-zinc-400">Forward-looking risk map · educational planning tool</p>
      </div>
      <div className="space-y-2">
        {events.map((e) => (
          <Card key={e.title + e.date} className="flex flex-wrap items-center gap-4">
            <div className="w-28 shrink-0">
              <div className="text-sm font-semibold text-zinc-200">{e.date}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{e.title}</div>
              <div className="text-xs text-zinc-500">{e.note}</div>
            </div>
            <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-medium', typeColor[e.type] || 'bg-zinc-800')}>
              {e.type}
            </span>
          </Card>
        ))}
      </div>
      <Card className="border-amber-500/20 bg-amber-500/5">
        <p className="text-sm text-zinc-300">
          Calendar is a <strong className="text-zinc-100">planning aid</strong>. Exact release times change — verify official sources on event days.
        </p>
      </Card>
    </div>
  )
}

/** —— SETTINGS —— */
export function SettingsPage() {
  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-indigo-400" /> Settings
        </h1>
        <p className="text-sm text-zinc-400">Personal preferences</p>
      </div>
      <Card className="space-y-4">
        <div>
          <div className="text-sm font-medium">Theme</div>
          <div className="text-xs text-zinc-500">Dark (default) — premium trading workspace</div>
        </div>
        <div>
          <div className="text-sm font-medium">Data mode</div>
          <div className="text-xs text-zinc-500">Delayed / session data via secured API routes</div>
        </div>
        <div>
          <div className="text-sm font-medium">Risk reminder</div>
          <div className="text-xs text-zinc-500">Always set max loss before size. Educational product only.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Reload app
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await fetch('/api/gate', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logout' }),
              })
              window.location.href = '/'
            }}
          >
            Lock site again
          </Button>
        </div>
        <p className="text-[10px] text-zinc-500">
          Personal mode: share only your access key with people you trust. This is not bank-grade encryption.
        </p>
      </Card>
    </div>
  )
}

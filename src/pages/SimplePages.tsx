import { Card } from '@/components/ui/Card'

export function NewsPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">News Intelligence</h1><p className="text-sm text-zinc-400">Sentiment-tagged headlines</p></div>
      <div className="space-y-3">
        {[
          ['RBI holds rates; neutral stance', 'Reuters', 'neutral'],
          ['Reliance expands green energy roadmap', 'ET', 'positive'],
          ['IT majors report strong deal pipeline', 'Mint', 'positive'],
          ['FII flows turn net positive', 'Bloomberg', 'positive'],
        ].map(([t, s, sent]) => (
          <Card key={t}>
            <div className="text-[10px] uppercase text-zinc-500 mb-1">{s} · {sent}</div>
            <div className="font-medium">{t}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function InstitutionalPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Institutional Tracker</h1><p className="text-sm text-zinc-400">FII / DII style flow context</p></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['FII Net (Today)', '+₹1,240 Cr', 'text-emerald-400'],
          ['DII Net (Today)', '-₹420 Cr', 'text-red-400'],
          ['FII YTD', '+₹48,200 Cr', 'text-emerald-400'],
          ['DII YTD', '+₹92,100 Cr', 'text-emerald-400'],
        ].map(([l, v, c]) => (
          <Card key={l}>
            <div className="text-xs text-zinc-400">{l}</div>
            <div className={`mt-1 text-xl font-bold ${c}`}>{v}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function ScreenersPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Screeners</h1><p className="text-sm text-zinc-400">Ready filters</p></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {['Large Cap', 'Technology', 'Private Banks', 'High Dividend', 'Momentum', 'Quality'].map((s) => (
          <Card key={s} hover><div className="font-semibold">{s}</div><div className="text-xs text-zinc-500 mt-1">Preset screener</div></Card>
        ))}
      </div>
    </div>
  )
}

export function ThemesPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Theme Intelligence</h1><p className="text-sm text-zinc-400">Secular themes</p></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['Digital India', 'Fintech, DPI, payments'],
          ['Green Energy', 'Renewables, EV chain'],
          ['Defence', 'Domestic manufacturing'],
          ['Healthcare', 'Pharma & hospitals'],
          ['Premium Consumer', 'Discretionary spend'],
          ['Financial Inclusion', 'Banks & NBFCs'],
        ].map(([n, d]) => (
          <Card key={n} hover><div className="font-semibold">{n}</div><div className="text-sm text-zinc-400 mt-1">{d}</div></Card>
        ))}
      </div>
    </div>
  )
}

export function CalendarPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Economic Calendar</h1><p className="text-sm text-zinc-400">Earnings & macro</p></div>
      <div className="space-y-2">
        {[
          ['2026-08-05', 'earnings', 'HDFC Bank results'],
          ['2026-08-07', 'policy', 'RBI commentary watch'],
          ['2026-08-12', 'macro', 'CPI print'],
          ['2026-08-18', 'earnings', 'Infosys results'],
        ].map(([d, ty, t]) => (
          <Card key={t} className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm text-zinc-400 w-28">{d}</span>
            <span className="text-xs uppercase text-indigo-300">{ty}</span>
            <span className="font-medium">{t}</span>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function SettingsPage() {
  return (
    <div className="space-y-6 max-w-xl">
      <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-sm text-zinc-400">Preferences</p></div>
      <Card>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-zinc-300">Theme</span><span className="text-zinc-500">Dark</span></div>
          <div className="flex justify-between"><span className="text-zinc-300">Currency</span><span className="text-zinc-500">INR</span></div>
          <div className="flex justify-between"><span className="text-zinc-300">Mode</span><span className="text-zinc-500">Production-ready codebase</span></div>
        </div>
      </Card>
    </div>
  )
}

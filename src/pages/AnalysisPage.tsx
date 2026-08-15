import { Card } from '@/components/ui/Card'
import { EXPIRY_STATS, BUDGET_STATS, ANALOGS, FII_DII_RECENT } from '@/services/analysis'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import { History, Building2 } from 'lucide-react'

export function AnalysisPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6 text-indigo-400" />
          Market Analysis Labs
        </h1>
        <p className="text-sm text-zinc-400">
          Expiry · Budget · FII/DII · historical analogs (illustrative long-history style studies)
        </p>
      </div>

      {/* FII DII */}
      <Card>
        <div className="mb-4 flex items-center gap-2 font-semibold">
          <Building2 className="h-4 w-4 text-indigo-400" /> FII & DII flows (recent pulse)
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={FII_DII_RECENT}>
              <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }} />
              <Legend />
              <Bar dataKey="fii" name="FII net" fill="#6366f1" radius={[2, 2, 0, 0]} />
              <Bar dataKey="dii" name="DII net" fill="#10b981" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-sm text-zinc-400">
          India-specific: FII selling with strong DII buying often creates choppy tape — useful context before Nifty/Bank Nifty options on your broker/your broker.
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="font-semibold mb-1">{EXPIRY_STATS.title}</div>
          <div className="text-xs text-zinc-500 mb-3">Samples: {EXPIRY_STATS.samples}</div>
          <ul className="space-y-2 text-sm text-zinc-300 mb-4">
            {EXPIRY_STATS.notes.map((n) => (
              <li key={n} className="flex gap-2"><span className="text-indigo-400">•</span>{n}</li>
            ))}
          </ul>
          <div className="space-y-2">
            {EXPIRY_STATS.frequencies.map((f) => (
              <div key={f.label}>
                <div className="mb-1 flex justify-between text-xs text-zinc-400">
                  <span>{f.label}</span><span>{f.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800">
                  <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${f.value}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-100">{EXPIRY_STATS.hint}</p>
        </Card>

        <Card>
          <div className="font-semibold mb-1">{BUDGET_STATS.title}</div>
          <div className="text-xs text-zinc-500 mb-3">Samples: {BUDGET_STATS.samples}</div>
          <ul className="space-y-2 text-sm text-zinc-300 mb-4">
            {BUDGET_STATS.notes.map((n) => (
              <li key={n} className="flex gap-2"><span className="text-indigo-400">•</span>{n}</li>
            ))}
          </ul>
          <div className="space-y-2">
            {BUDGET_STATS.frequencies.map((f) => (
              <div key={f.label}>
                <div className="mb-1 flex justify-between text-xs text-zinc-400">
                  <span>{f.label}</span><span>{f.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800">
                  <div className="h-2 rounded-full bg-violet-500" style={{ width: `${f.value}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-100">{BUDGET_STATS.hint}</p>
        </Card>
      </div>

      <Card>
        <div className="mb-4 font-semibold">Historical analogs — “did it repeat?”</div>
        <p className="text-xs text-zinc-500 mb-4">Frequencies from similar past setups — not a prediction that history must repeat.</p>
        <div className="space-y-4">
          {ANALOGS.map((a) => (
            <div key={a.setup} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="font-medium text-zinc-100">{a.setup}</div>
              <div className="text-xs text-zinc-500 mt-0.5">Similar cases: {a.samples}</div>
              <p className="mt-2 text-sm text-zinc-300">{a.outcome}</p>
              <p className="mt-2 text-sm text-indigo-300">Hint: {a.hint}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

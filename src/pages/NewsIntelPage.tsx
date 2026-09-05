import { Card } from '@/components/ui/Card'
import { SAMPLE_NEWS, toneClasses, type ImpactTone } from '@/services/newsIntel'

function Badge({ tone }: { tone: ImpactTone }) {
  const label = tone === 'up' ? 'Possible upside lean' : tone === 'down' ? 'Possible downside lean' : 'Mixed / unclear'
  const color =
    tone === 'up' ? 'text-[#1a5c47] bg-[rgba(45,143,111,0.15)]' : tone === 'down' ? 'text-[#8a2a2a] bg-[rgba(179,58,58,0.1)]' : 'text-[#1a5f9e] bg-[rgba(26,95,158,0.1)]'
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${color}`}>
      {label}
    </span>
  )
}

export function NewsIntelPage() {
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="nf-art-line" />
      <div>
        <h1 className="text-2xl font-bold text-[#0f1b2d]">News impact desk</h1>
        <p className="text-sm text-[#5a6b82] mt-1">
          Colour = educational lean only · not guaranteed direction · examples until a live news API is
          connected
        </p>
      </div>

      <Card className="text-xs text-[#5a6b82]">
        <strong className="text-[#0f1b2d]">Legend:</strong>{' '}
        <span className="text-[#1a5c47] font-semibold">Green</span> = news may support prices ·{' '}
        <span className="text-[#8a2a2a] font-semibold">Red</span> = may pressure ·{' '}
        <span className="text-[#1a5f9e] font-semibold">Blue</span> = mixed. Indirect names are hypothesis
        for learning, not a portfolio recommendation.
      </Card>

      {SAMPLE_NEWS.map((n) => (
        <Card key={n.id} className={`border ${toneClasses(n.tone)}`}>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge tone={n.tone} />
            <span className="text-[10px] font-semibold text-[#5a6b82] uppercase">{n.scope}</span>
            <span className="text-[10px] text-[#5a6b82]">{n.timeLabel}</span>
          </div>
          <div className="font-semibold text-[#0f1b2d] text-base">{n.headline}</div>
          <p className="text-sm text-[#5a6b82] mt-1">{n.why}</p>
          <div className="mt-2 text-xs text-[#0f1b2d]">
            <span className="font-semibold">Primary focus: </span>
            {n.primarySymbols.join(', ')}
          </div>
          {!!n.indirect.length && (
            <div className="mt-2 rounded-xl bg-white/70 border border-[rgba(15,40,80,0.08)] p-3">
              <div className="text-xs font-semibold text-[#0f1b2d] mb-1">Indirect / peer impact</div>
              <ul className="text-xs text-[#5a6b82] space-y-1">
                {n.indirect.map((x) => (
                  <li key={x.symbol}>
                    <span className="font-semibold text-[#0f1b2d]">{x.symbol}:</span> {x.effect}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="text-[10px] text-[#5a6b82] mt-2">Confidence: {n.confidence}</div>
        </Card>
      ))}
    </div>
  )
}

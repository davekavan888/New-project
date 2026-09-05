import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { IPO_DESK, statusStyle, type IpoStatus } from '@/services/ipo'
import { Landmark, ExternalLink } from 'lucide-react'

const FILTERS: { id: 'all' | IpoStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'closed', label: 'Closed' },
  { id: 'listed', label: 'Listed' },
]

export function IpoDeskPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')
  const rows = useMemo(
    () => (filter === 'all' ? IPO_DESK : IPO_DESK.filter((x) => x.status === filter)),
    [filter],
  )

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="nf-art-line" />
      <div>
        <h1 className="text-2xl font-bold text-[#0f1b2d] flex items-center gap-2">
          <Landmark className="h-6 w-6 text-[#c9a227]" />
          IPO Desk
        </h1>
        <p className="text-sm text-[#5a6b82] mt-1">
          Educational calendar · verify every date on NSE/SEBI · not GMP trading advice
        </p>
      </div>

      <Card className="border border-[rgba(179,58,58,0.25)] bg-[rgba(179,58,58,0.05)] text-sm text-[#0f1b2d]">
        <strong>GMP disclaimer:</strong> Grey market premium on apps/social is{' '}
        <strong>unofficial</strong>. Novaforge does <strong>not</strong> treat GMP as a target or
        guarantee. Always read the RHP and exchange notices.
      </Card>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
              filter === f.id
                ? 'bg-[#1a5f9e] text-white border-[#1a5f9e]'
                : 'bg-white text-[#0f1b2d] border-[rgba(15,40,80,0.12)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {rows.map((ipo) => (
          <Card key={ipo.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-bold text-[#0f1b2d] text-lg">{ipo.name}</div>
                <div className="text-xs text-[#5a6b82] mt-0.5">
                  {ipo.type} · {ipo.exchange}
                </div>
              </div>
              <span
                className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${statusStyle(ipo.status)}`}
              >
                {ipo.status}
              </span>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div>
                <div className="text-[10px] font-semibold text-[#5a6b82]">Price band</div>
                <div className="font-semibold text-[#0f1b2d]">{ipo.priceBand}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-[#5a6b82]">Lot size</div>
                <div className="font-semibold text-[#0f1b2d]">{ipo.lotSize ?? '—'}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-[#5a6b82]">Open → Close</div>
                <div className="font-semibold text-[#0f1b2d]">
                  {ipo.openDate} → {ipo.closeDate}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-[#5a6b82]">Listing</div>
                <div className="font-semibold text-[#0f1b2d]">{ipo.listingDate}</div>
              </div>
            </div>

            <div className="mt-2 text-sm text-[#5a6b82]">
              Issue size: <span className="font-semibold text-[#0f1b2d]">{ipo.issueSize}</span>
            </div>

            <div className="mt-3 rounded-xl border border-[rgba(201,162,39,0.35)] bg-[rgba(201,162,39,0.08)] p-3 text-xs text-[#0f1b2d]">
              <strong>GMP note:</strong> {ipo.gmpNote}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-[#1a5c47] mb-1">What to check (+)</div>
                <ul className="text-xs text-[#5a6b82] space-y-1">
                  {ipo.strengths.map((s) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold text-[#8a2a2a] mb-1">Risks</div>
                <ul className="text-xs text-[#5a6b82] space-y-1">
                  {ipo.risks.map((s) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
              {ipo.nseLink && (
                <a
                  href={ipo.nseLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[#1a5f9e]"
                >
                  NSE IPO page <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {ipo.sebiLink && (
                <a
                  href={ipo.sebiLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[#1a5f9e]"
                >
                  SEBI <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>

      <p className="text-[10px] text-[#5a6b82]">
        Sample structure for the desk. Replace rows in <code>src/services/ipo.ts</code> with current
        NSE issues. Not investment advice.
      </p>
    </div>
  )
}

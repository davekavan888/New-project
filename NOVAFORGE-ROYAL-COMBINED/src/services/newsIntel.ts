/**
 * Educational news impact cards — curated templates + optional headline input.
 * Colour = hypothetical directional lean, NOT prediction certainty.
 */

export type ImpactTone = 'up' | 'down' | 'neutral'

export type NewsCard = {
  id: string
  headline: string
  scope: 'company' | 'sector' | 'india' | 'global'
  primarySymbols: string[]
  tone: ImpactTone
  confidence: 'low' | 'medium'
  why: string
  indirect: { symbol: string; effect: string }[]
  timeLabel: string
}

/** Static educational examples (replace later with real news API) */
export const SAMPLE_NEWS: NewsCard[] = [
  {
    id: '1',
    headline: 'Power sector policy / tariff review chatter in media',
    scope: 'sector',
    primarySymbols: ['ADANIPOWER', 'TATAPOWER', 'NTPC'],
    tone: 'neutral',
    confidence: 'low',
    why: 'Policy headlines can move rate-sensitive power names both ways until details are clear.',
    indirect: [
      { symbol: 'POWERGRID', effect: 'Transmission utilities sometimes move with sector sentiment.' },
      { symbol: 'COALINDIA', effect: 'Fuel-cost narrative can spill into coal-linked names.' },
    ],
    timeLabel: 'Educational example',
  },
  {
    id: '2',
    headline: 'US yields / dollar strength in global markets',
    scope: 'global',
    primarySymbols: ['^NSEI'],
    tone: 'down',
    confidence: 'low',
    why: 'Stronger USD / higher yields historically pressure emerging-market risk assets short-term.',
    indirect: [
      { symbol: 'IT basket', effect: 'Exporters can sometimes see mixed FX vs global demand effects.' },
      { symbol: 'Banks', effect: 'Rate path headlines can reprice banking multiples.' },
    ],
    timeLabel: 'Educational example',
  },
  {
    id: '3',
    headline: 'Domestic institutional support narrative vs FII selling days',
    scope: 'india',
    primarySymbols: ['^NSEI', 'HDFCBANK', 'ICICIBANK'],
    tone: 'neutral',
    confidence: 'low',
    why: 'FII/DII is usually EOD context. One day does not define trend; watch multi-day stretches.',
    indirect: [
      { symbol: 'Midcaps', effect: 'Risk-off FII days often hit mid/small more than index heavyweights.' },
    ],
    timeLabel: 'Educational example',
  },
  {
    id: '4',
    headline: 'Crude oil spike risk for importers',
    scope: 'global',
    primarySymbols: ['RELIANCE', 'ONGC'],
    tone: 'neutral',
    confidence: 'low',
    why: 'Crude up can help upstream optics and pressure pure marketing / airline-type costs (name-specific).',
    indirect: [
      { symbol: 'OMCs', effect: 'Margin narrative depends on pricing policy lag.' },
      { symbol: 'Paint / chemical', effect: 'Input-cost sensitivity on sustained crude strength.' },
    ],
    timeLabel: 'Educational example',
  },
]

export function toneClasses(tone: ImpactTone) {
  if (tone === 'up') return 'border-[rgba(45,143,111,0.4)] bg-[rgba(45,143,111,0.08)]'
  if (tone === 'down') return 'border-[rgba(179,58,58,0.35)] bg-[rgba(179,58,58,0.06)]'
  return 'border-[rgba(26,95,158,0.3)] bg-[rgba(26,95,158,0.06)]'
}

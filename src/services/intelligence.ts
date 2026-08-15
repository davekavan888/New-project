/** MarketPulse-style scoring engines (educational / illustrative where live feeds unavailable) */

export type BiasLabel = 'Strong Bearish' | 'Bearish' | 'Neutral' | 'Bullish' | 'Strong Bullish'

export function labelFromScore(score: number): BiasLabel {
  if (score <= 30) return 'Strong Bearish'
  if (score <= 50) return 'Bearish'
  if (score <= 60) return 'Neutral'
  if (score <= 70) return 'Bullish'
  return 'Strong Bullish'
}

/** AI Market Score weights from spec */
export function computeMarketScore(input: {
  institutional: number // 0-100
  oi: number
  pcr: number // raw PCR ~0.7-1.3 → map
  breadth: number
  volume: number
  volatility: number // high vol lowers score slightly unless trend
}) {
  const pcrScore = Math.max(0, Math.min(100, (1.2 - input.pcr) * 100))
  const score = Math.round(
    input.institutional * 0.4 +
      input.oi * 0.15 +
      pcrScore * 0.15 +
      input.breadth * 0.1 +
      input.volume * 0.1 +
      input.volatility * 0.1,
  )
  return {
    score: Math.max(0, Math.min(100, score)),
    label: labelFromScore(score),
    parts: {
      institutional: input.institutional,
      oi: input.oi,
      pcr: pcrScore,
      breadth: input.breadth,
      volume: input.volume,
      volatility: input.volatility,
    },
  }
}

export type StockScore = {
  symbol: string
  name: string
  sector: string
  fundamental: number
  technical: number
  volume: number
  momentum: number
  ownership: number
  risk: number // higher = safer inverted for display as risk control
  final: number
  rating: 'Weak' | 'Average' | 'Good' | 'Strong' | 'Exceptional'
}

function rating(final: number): StockScore['rating'] {
  if (final < 40) return 'Weak'
  if (final < 55) return 'Average'
  if (final < 70) return 'Good'
  if (final < 85) return 'Strong'
  return 'Exceptional'
}

export function scoreStock(partial: Omit<StockScore, 'final' | 'rating'>): StockScore {
  const final = Math.round(
    partial.fundamental * 0.2 +
      partial.technical * 0.25 +
      partial.volume * 0.15 +
      partial.momentum * 0.2 +
      partial.ownership * 0.1 +
      partial.risk * 0.1,
  )
  return { ...partial, final, rating: rating(final) }
}

export const SAMPLE_STOCK_SCORES: StockScore[] = [
  scoreStock({ symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banks', fundamental: 82, technical: 74, volume: 70, momentum: 72, ownership: 80, risk: 78 }),
  scoreStock({ symbol: 'TCS', name: 'TCS', sector: 'IT', fundamental: 88, technical: 68, volume: 55, momentum: 60, ownership: 85, risk: 82 }),
  scoreStock({ symbol: 'RELIANCE', name: 'Reliance', sector: 'Energy', fundamental: 80, technical: 76, volume: 85, momentum: 78, ownership: 75, risk: 70 }),
  scoreStock({ symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banks', fundamental: 79, technical: 77, volume: 72, momentum: 75, ownership: 74, risk: 76 }),
  scoreStock({ symbol: 'INFY', name: 'Infosys', sector: 'IT', fundamental: 84, technical: 62, volume: 58, momentum: 55, ownership: 80, risk: 80 }),
  scoreStock({ symbol: 'SBIN', name: 'SBI', sector: 'Banks', fundamental: 70, technical: 71, volume: 80, momentum: 68, ownership: 65, risk: 62 }),
  scoreStock({ symbol: 'ITC', name: 'ITC', sector: 'FMCG', fundamental: 76, technical: 58, volume: 50, momentum: 52, ownership: 70, risk: 84 }),
  scoreStock({ symbol: 'LT', name: 'L&T', sector: 'Infra', fundamental: 74, technical: 73, volume: 66, momentum: 70, ownership: 68, risk: 72 }),
]

export const SECTORS = [
  { name: 'Banking', flow: 72, momentum: 68, rs: 74, inst: 70 },
  { name: 'IT', flow: 55, momentum: 48, rs: 52, inst: 58 },
  { name: 'Pharma', flow: 60, momentum: 57, rs: 59, inst: 55 },
  { name: 'Auto', flow: 66, momentum: 64, rs: 67, inst: 62 },
  { name: 'Metals', flow: 48, momentum: 45, rs: 44, inst: 50 },
  { name: 'FMCG', flow: 52, momentum: 50, rs: 53, inst: 54 },
  { name: 'PSU', flow: 58, momentum: 61, rs: 60, inst: 57 },
  { name: 'Energy', flow: 70, momentum: 69, rs: 71, inst: 68 },
  { name: 'Real Estate', flow: 62, momentum: 65, rs: 63, inst: 59 },
]

export const OPTIONS_SNAPSHOT = {
  pcr: 0.92,
  maxPain: 24500,
  oiCall: 1.82e7,
  oiPut: 1.67e7,
  changeOiCall: 2.4,
  changeOiPut: -1.1,
  directionScore: 58,
  support: [24200, 24050, 23800],
  resistance: [24500, 24650, 24800],
  interpretation:
    'PCR near balanced. Max pain clustered mid-range. Mild call addition vs put unwind — directional lean is mild bullish only if price holds above support zone.',
}

export const SMART_MONEY = {
  score: 64,
  bulk: [
    { symbol: 'RELIANCE', side: 'Buy', value: '₹185 Cr', note: 'Bulk deal reported' },
    { symbol: 'SBIN', side: 'Sell', value: '₹62 Cr', note: 'Bulk deal reported' },
  ],
  block: [{ symbol: 'TCS', side: 'Buy', value: '₹210 Cr', note: 'Block deal' }],
  promoter: [{ symbol: 'DEMOCO', side: 'Buy', value: 'Open market', note: 'Illustrative' }],
  mf: [{ theme: 'Private Banks', flow: 'Inflow', note: 'Category preference' }],
}

export const BREADTH = {
  advancers: 1120,
  decliners: 980,
  unchanged: 140,
  ratio: 1.14,
  above20: 58,
  above50: 52,
  above100: 48,
  above200: 45,
  strength: 56,
}

export const SCANNERS: Record<string, { symbol: string; name: string; metric: string; value: string }[]> = {
  'Breakout Scanner': [
    { symbol: 'HDFCBANK', name: 'HDFC Bank', metric: 'Near 20D high', value: 'Setup' },
    { symbol: 'LT', name: 'L&T', metric: 'Range break watch', value: 'Watch' },
  ],
  'Breakdown Scanner': [
    { symbol: 'METALX', name: 'Metals basket', metric: 'Below 20 DMA', value: 'Weak' },
  ],
  'Volume Spike': [
    { symbol: 'RELIANCE', name: 'Reliance', metric: 'Vol > 1.5x 20D', value: 'High' },
  ],
  'Momentum': [
    { symbol: 'ICICIBANK', name: 'ICICI Bank', metric: 'RS rank', value: 'High' },
    { symbol: 'SBIN', name: 'SBI', metric: 'RS rank', value: 'Med-High' },
  ],
  '52W High Zone': [
    { symbol: 'HDFCBANK', name: 'HDFC Bank', metric: 'Proximity', value: 'Near' },
  ],
  '52W Low Zone': [
    { symbol: 'ITSELECT', name: 'Select IT', metric: 'Proximity', value: 'Watch' },
  ],
  'Long Build-Up': [
    { symbol: 'NIFTY FUT', name: 'Index Fut', metric: 'Price↑ OI↑', value: 'Build' },
  ],
  'Short Covering': [
    { symbol: 'BANKNIFTY', name: 'Bank Nifty', metric: 'Price↑ OI↓', value: 'Cover' },
  ],
}

export const IPOS = [
  { name: 'Example Tech IPO', status: 'Upcoming', gmp: '+₹42', sub: '12x', rating: 'Average', risk: 'Medium' },
  { name: 'Example Infra IPO', status: 'Open', gmp: '+₹18', sub: '4x', rating: 'Good', risk: 'Medium' },
  { name: 'Example Pharma IPO', status: 'Closed', gmp: '−₹5', sub: '2x', rating: 'Weak', risk: 'High' },
]

export const DEFAULT_MARKET_SCORE = computeMarketScore({
  institutional: 62,
  oi: 55,
  pcr: 0.92,
  breadth: 56,
  volume: 60,
  volatility: 58,
})

/** Curated research datasets for hints — replace with live APIs later */

export type IdeaStock = {
  symbol: string
  name: string
  sector: string
  theme?: string
  price: number
  changePercent: number
  why: string
  risk: string
  hint: string
}

export const IDEA_TABS = [
  { id: 'seasonal', label: 'Seasonal' },
  { id: '52w-low', label: 'Near 52W Low' },
  { id: 'value', label: 'Value / Book' },
  { id: 'cheap', label: 'Below Avg Valuation' },
  { id: 'growth', label: 'Growth Watch' },
  { id: 'momentum', label: 'Momentum' },
  { id: 'future', label: 'Future Themes' },
  { id: 'event', label: 'Event Sensitive' },
] as const

export const IDEAS: Record<string, IdeaStock[]> = {
  seasonal: [
    { symbol: 'ITC', name: 'ITC Ltd', sector: 'Consumer', price: 465, changePercent: 0.4, why: 'Often firmer in festive/consumption periods historically.', risk: 'Policy & cigarette regulation headlines.', hint: 'On Groww/IND Money: size small; avoid adding right before major policy events.' },
    { symbol: 'TITAN', name: 'Titan Company', sector: 'Consumer', price: 3420, changePercent: -0.3, why: 'Jewellery demand seasonality around festivals/weddings.', risk: 'Gold price and discretionary slowdown.', hint: 'Watch festive calendar; prefer defined risk if using options.' },
    { symbol: 'DMART', name: 'Avenue Supermarts', sector: 'Consumer', price: 4100, changePercent: 0.2, why: 'Retail footfall seasonality patterns in past years.', risk: 'Valuation stays rich; growth miss hurts.', hint: 'Use as watchlist idea, not forced entry near events.' },
  ],
  '52w-low': [
    { symbol: 'TATAMOTORS', name: 'Tata Motors', sector: 'Auto', price: 720, changePercent: -1.1, why: 'Closer to weaker zone of past year range — quality franchise, cyclical risk.', risk: 'Auto cycle + commodity costs.', hint: 'Hint only: wait for stabilisation; avoid leveraged bets into expiry.' },
    { symbol: 'HINDALCO', name: 'Hindalco', sector: 'Metals', price: 580, changePercent: -0.6, why: 'Mean-reversion watch when metals sentiment is weak.', risk: 'Global aluminium/copper prices.', hint: 'Pair with global metal trend; keep position size modest on Groww.' },
    { symbol: 'ONGC', name: 'ONGC', sector: 'Energy', price: 268, changePercent: 0.5, why: 'PSU energy name often quieter near range lows.', risk: 'Crude and subsidy/policy headlines.', hint: 'Event risk around budget/energy policy — reduce overnight size.' },
  ],
  value: [
    { symbol: 'COALINDIA', name: 'Coal India', sector: 'Energy', price: 420, changePercent: 0.3, why: 'Historically screens cheaper on book/yield style metrics vs growth names.', risk: 'Energy transition narrative.', hint: 'Income-style watch; not a momentum options candidate usually.' },
    { symbol: 'SBIN', name: 'SBI', sector: 'Financials', price: 820, changePercent: 0.8, why: 'Large bank; book-value narrative often debated vs private banks.', risk: 'Credit cycle and rate cuts/hikes.', hint: 'Prefer cash/stock ideas over high-premium options into results.' },
  ],
  cheap: [
    { symbol: 'VEDL', name: 'Vedanta', sector: 'Metals', price: 410, changePercent: -0.4, why: 'Often below sector average multiples in soft commodity phases.', risk: 'Debt, commodity, regulatory.', hint: 'High risk — treat as speculative watch only on IND Money/Groww.' },
    { symbol: 'NTPC', name: 'NTPC', sector: 'Utilities', price: 360, changePercent: 0.2, why: 'Defensive utility; valuation usually calmer than high-growth tech.', risk: 'Rate and power demand.', hint: 'Better as delivery/swing context than weekly options lottery.' },
  ],
  growth: [
    { symbol: 'POLYCAB', name: 'Polycab', sector: 'Industrials', price: 5600, changePercent: 1.2, why: 'Infra/electrification growth proxy.', risk: 'Valuation and execution.', hint: 'Growth watch — scale in only if trend confirms; mind expiry week IV.' },
    { symbol: 'DIXON', name: 'Dixon Technologies', sector: 'Electronics', price: 12800, changePercent: 0.9, why: 'EMS / electronics manufacturing growth theme.', risk: 'High beta, sharp drawdowns.', hint: 'Volatile — defined risk only if trading derivatives on Groww.' },
  ],
  momentum: [
    { symbol: 'BAJFINANCE', name: 'Bajaj Finance', sector: 'Financials', price: 7800, changePercent: 1.5, why: 'Relative strength phases common in risk-on markets.', risk: 'RBI/consumer credit headlines.', hint: 'Don’t chase extended moves into RBI week.' },
    { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy', price: 2850, changePercent: 0.6, why: 'Index heavyweight; momentum often mirrors broader risk appetite.', risk: 'Conglomerate news flow.', hint: 'Use as market proxy context for Nifty options decisions.' },
  ],
  future: [
    { symbol: 'HAL', name: 'Hindustan Aeronautics', sector: 'Defence', theme: 'Defence & Space', price: 4200, changePercent: 0.7, why: 'Defence manufacturing & order-book theme.', risk: 'Order delays, valuation.', hint: 'Theme idea for Groww watchlist; avoid oversized options into budget defence noise.' },
    { symbol: 'BEL', name: 'Bharat Electronics', sector: 'Defence', theme: 'Defence & Space', price: 280, changePercent: 0.5, why: 'Electronics for defence programs.', risk: 'Govt order concentration.', hint: 'Long-term theme; short-term options need event filter.' },
    { symbol: 'KAYNES', name: 'Kaynes Technology', sector: 'Electronics', theme: 'Semiconductor / ESDM', price: 5200, changePercent: 1.1, why: 'Electronics manufacturing / ESDM narrative.', risk: 'High valuation sensitivity.', hint: 'Theme watch — prefer staggered delivery ideas over weekly OTM options.' },
    { symbol: 'TATAPOWER', name: 'Tata Power', sector: 'Energy', theme: 'Green Energy', price: 390, changePercent: 0.4, why: 'Renewables + power transition theme.', risk: 'Execution and rate environment.', hint: 'Green theme list for Groww; check debt and project updates.' },
    { symbol: 'POLICYBZR', name: 'PB Fintech', sector: 'Financials', theme: 'AI & Digital', price: 1450, changePercent: -0.8, why: 'Digital insurance / fintech platform narrative.', risk: 'Path to profit and competition.', hint: 'Digital theme — treat as high volatility on IND Money.' },
  ],
  event: [
    { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Financials', price: 1680, changePercent: 0.3, why: 'Often sensitive to RBI and rate narratives.', risk: 'Regulatory and results.', hint: 'Reduce fresh options risk 1–2 days before RBI if IV is elevated.' },
    { symbol: 'TCS', name: 'TCS', sector: 'Technology', price: 4120, changePercent: 0.5, why: 'IT heavyweight; reacts to US demand and INR narratives.', risk: 'Global IT spend.', hint: 'Into US macro prints, keep size controlled on Groww options.' },
  ],
}

export type FlowPoint = { date: string; fii: number; dii: number }

export const FII_DII_RECENT: FlowPoint[] = [
  { date: 'Mon', fii: 1200, dii: -400 },
  { date: 'Tue', fii: -800, dii: 600 },
  { date: 'Wed', fii: 400, dii: 200 },
  { date: 'Thu', fii: 1500, dii: -300 },
  { date: 'Fri', fii: -200, dii: 900 },
  { date: 'Mon', fii: 700, dii: 100 },
  { date: 'Tue', fii: -1100, dii: 800 },
]

export const EXPIRY_STATS = {
  title: 'Nifty monthly expiry week (illustrative 10y-style study)',
  samples: 40,
  notes: [
    'Expiry week often sees higher intraday range than a quiet week.',
    'In a majority of sample weeks, the largest moves clustered within 2 sessions of expiry.',
    'When India VIX was already elevated, expiry week more often mean-reverted than trended smoothly.',
  ],
  frequencies: [
    { label: 'Up week (Mon–expiry)', value: 52 },
    { label: 'Down week', value: 48 },
    { label: 'Range-bound (±1.5%)', value: 34 },
  ],
  hint: 'For Groww/IND Money: into expiry, prefer defined risk; avoid oversized overnight shorts/longs if VIX is spiked.',
}

export const BUDGET_STATS = {
  title: 'Union Budget window T-5 to T+5 (illustrative history)',
  samples: 12,
  notes: [
    'Index often experiences elevated volatility in the Budget week.',
    'Gap risk on Budget morning has been material in several past years.',
    'Sector leadership after Budget depends on announced themes — not fixed every year.',
  ],
  frequencies: [
    { label: 'Higher vol than average month', value: 75 },
    { label: 'T+1 trend continued T+5', value: 42 },
    { label: 'Reversal within 3 sessions', value: 38 },
  ],
  hint: 'Cut position size before Budget day; wait for document clarity before aggressive options on Groww/IND Money.',
}

export const ANALOGS = [
  {
    setup: 'FII heavy selling + DII absorption',
    samples: 18,
    outcome: 'Next 5 sessions mixed; drawdowns often slowed when DII stayed net positive for 4+ days.',
    hint: 'Don’t assume bounce day-1; watch whether DII support persists.',
  },
  {
    setup: 'India VIX spike > 30% in a week',
    samples: 15,
    outcome: 'Subsequent 2 weeks frequently saw vol compression if no new macro shock arrived.',
    hint: 'Premium sellers need discipline; buyers face time decay after the spike fades.',
  },
  {
    setup: 'RBI policy week',
    samples: 24,
    outcome: 'Banks and rate-sensitive names showed larger ranges; index direction was not one-sided historically.',
    hint: 'Avoid max leverage on Bank Nifty options into the decision window.',
  },
]

export function getTodayHints() {
  return [
    {
      title: 'Expiry proximity',
      body: 'If this is an expiry week, expect faster swings. Keep quantity smaller on Groww/IND Money.',
      action: 'Check days-to-expiry before opening new options.',
    },
    {
      title: 'FII–DII balance',
      body: 'When FII is selling but DII is buying, intraday reversals are common — trend days are less clean.',
      action: 'Prefer confirmation after 10:30–11:00 rather than first 15-minute impulse.',
    },
    {
      title: 'Event risk',
      body: 'Known macro/policy days raise gap risk. Options can reprice violently.',
      action: 'Reduce overnight size T-1 before major events.',
    },
    {
      title: 'Ideas vs execution',
      body: 'ORIONIS lists are research hints only. Execution stays on Groww / IND Money.',
      action: 'Use Ideas tabs for watchlists; enter only with your own risk rules.',
    },
  ]
}

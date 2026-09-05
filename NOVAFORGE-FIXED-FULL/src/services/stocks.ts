/**
 * Stock search + fundamentals via public Yahoo chart meta (often delayed).
 * Not a Groww/Angel full terminal replacement. Labels must stay honest.
 */

export type StockQuote = {
  symbol: string
  name: string
  exchange: string
  price: number | null
  changePct: number | null
  currency: string
  marketCap: number | null
  pe: number | null
  eps: number | null
  high52: number | null
  low52: number | null
  dayHigh: number | null
  dayLow: number | null
  volume: number | null
  avgVolume: number | null
  previousClose: number | null
  source: 'delayed' | 'unavailable'
  asOf: string
}

export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number }

/** Curated liquid NSE names for search (Yahoo uses .NS) */
export const UNIVERSE: { symbol: string; name: string; sector: string }[] = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'Energy' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'IT' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', sector: 'Banks' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank', sector: 'Banks' },
  { symbol: 'INFY.NS', name: 'Infosys', sector: 'IT' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel', sector: 'Telecom' },
  { symbol: 'SBIN.NS', name: 'State Bank of India', sector: 'Banks' },
  { symbol: 'ITC.NS', name: 'ITC', sector: 'FMCG' },
  { symbol: 'LT.NS', name: 'Larsen & Toubro', sector: 'Infra' },
  { symbol: 'AXISBANK.NS', name: 'Axis Bank', sector: 'Banks' },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank', sector: 'Banks' },
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever', sector: 'FMCG' },
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance', sector: 'Finance' },
  { symbol: 'MARUTI.NS', name: 'Maruti Suzuki', sector: 'Auto' },
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharma', sector: 'Pharma' },
  { symbol: 'TITAN.NS', name: 'Titan Company', sector: 'Consumer' },
  { symbol: 'ADANIENT.NS', name: 'Adani Enterprises', sector: 'Conglomerate' },
  { symbol: 'ADANIPOWER.NS', name: 'Adani Power', sector: 'Power' },
  { symbol: 'TATAPOWER.NS', name: 'Tata Power', sector: 'Power' },
  { symbol: 'NTPC.NS', name: 'NTPC', sector: 'Power' },
  { symbol: 'POWERGRID.NS', name: 'Power Grid', sector: 'Power' },
  { symbol: 'ONGC.NS', name: 'ONGC', sector: 'Energy' },
  { symbol: 'COALINDIA.NS', name: 'Coal India', sector: 'Energy' },
  { symbol: 'TATASTEEL.NS', name: 'Tata Steel', sector: 'Metals' },
  { symbol: 'JSWSTEEL.NS', name: 'JSW Steel', sector: 'Metals' },
  { symbol: 'HINDALCO.NS', name: 'Hindalco', sector: 'Metals' },
  { symbol: 'ASIANPAINT.NS', name: 'Asian Paints', sector: 'Consumer' },
  { symbol: 'WIPRO.NS', name: 'Wipro', sector: 'IT' },
  { symbol: 'HCLTECH.NS', name: 'HCL Tech', sector: 'IT' },
  { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement', sector: 'Cement' },
  { symbol: '^NSEI', name: 'Nifty 50', sector: 'Index' },
  { symbol: '^BSESN', name: 'Sensex', sector: 'Index' },
]

export function searchUniverse(q: string) {
  const s = q.trim().toLowerCase()
  if (!s) return UNIVERSE.slice(0, 20)
  return UNIVERSE.filter(
    (u) =>
      u.symbol.toLowerCase().includes(s) ||
      u.name.toLowerCase().includes(s) ||
      u.sector.toLowerCase().includes(s),
  ).slice(0, 25)
}

export async function fetchStockQuote(symbol: string): Promise<StockQuote> {
  const asOf = new Date().toISOString()
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!r.ok) throw new Error('quote_fail')
    const j = await r.json()
    const result = j?.chart?.result?.[0]
    const meta = result?.meta || {}
    const price = num(meta.regularMarketPrice)
    const prev = num(meta.chartPreviousClose ?? meta.previousClose)
    const changePct =
      price != null && prev ? ((price - prev) / prev) * 100 : num(meta.regularMarketChangePercent)

    return {
      symbol,
      name: String(meta.longName || meta.shortName || symbol),
      exchange: String(meta.exchangeName || meta.fullExchangeName || 'NSE'),
      price,
      changePct,
      currency: String(meta.currency || 'INR'),
      marketCap: num(meta.marketCap),
      pe: num(meta.trailingPE ?? meta.forwardPE),
      eps: num(meta.epsTrailingTwelveMonths),
      high52: num(meta.fiftyTwoWeekHigh),
      low52: num(meta.fiftyTwoWeekLow),
      dayHigh: num(meta.regularMarketDayHigh),
      dayLow: num(meta.regularMarketDayLow),
      volume: num(meta.regularMarketVolume),
      avgVolume: num(meta.averageDailyVolume3Month ?? meta.averageDailyVolume10Day),
      previousClose: prev,
      source: 'delayed',
      asOf,
    }
  } catch {
    return {
      symbol,
      name: symbol,
      exchange: '—',
      price: null,
      changePct: null,
      currency: 'INR',
      marketCap: null,
      pe: null,
      eps: null,
      high52: null,
      low52: null,
      dayHigh: null,
      dayLow: null,
      volume: null,
      avgVolume: null,
      previousClose: null,
      source: 'unavailable',
      asOf,
    }
  }
}

export async function fetchCandles(
  symbol: string,
  range: '1mo' | '3mo' | '6mo' | '1y' = '3mo',
  interval: '1d' | '1wk' = '1d',
): Promise<Candle[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!r.ok) return []
    const j = await r.json()
    const res = j?.chart?.result?.[0]
    const ts: number[] = res?.timestamp || []
    const q = res?.indicators?.quote?.[0] || {}
    const out: Candle[] = []
    for (let i = 0; i < ts.length; i++) {
      const o = num(q.open?.[i])
      const h = num(q.high?.[i])
      const l = num(q.low?.[i])
      const c = num(q.close?.[i])
      if (o == null || h == null || l == null || c == null) continue
      out.push({ t: ts[i] * 1000, o, h, l, c, v: num(q.volume?.[i]) || 0 })
    }
    return out
  } catch {
    return []
  }
}

/** Simple educational rating 0–100 from available fields only */
export function educationalRating(q: StockQuote): {
  score: number
  label: string
  notes: string[]
} {
  const notes: string[] = []
  let score = 50
  if (q.pe != null && q.pe > 0 && q.pe < 25) {
    score += 10
    notes.push('PE not extreme vs high-growth stretch (rough screen only).')
  } else if (q.pe != null && q.pe > 45) {
    score -= 8
    notes.push('Elevated PE — growth expectations already high.')
  }
  if (q.high52 && q.low52 && q.price) {
    const pos = (q.price - q.low52) / (q.high52 - q.low52)
    if (pos < 0.3) {
      score += 6
      notes.push('Closer to 52W low zone than high (mean-reversion interest only).')
    } else if (pos > 0.85) {
      score -= 4
      notes.push('Near 52W high — momentum strong or extended.')
    }
  }
  if (q.changePct != null && q.changePct < -3) {
    score -= 5
    notes.push('Sharp session decline — wait for structure, not chase.')
  }
  score = Math.max(15, Math.min(85, score))
  const label = score >= 62 ? 'Constructive screen' : score <= 40 ? 'Cautious screen' : 'Neutral screen'
  notes.push('Not a buy/sell rating. Missing debt/ROE in free feed limits quality.')
  return { score, label, notes }
}

function num(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function formatInrCr(n: number | null): string {
  if (n == null) return '—'
  if (n >= 1e12) return `₹${(n / 1e12).toFixed(2)}T`
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  return `₹${n.toLocaleString('en-IN')}`
}

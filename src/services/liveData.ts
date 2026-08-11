/**
 * Free-first live/delayed data.
 * Priority: Twelve Data (VITE_TWELVEDATA_KEY) → Yahoo → demo
 */

import type { Bar } from './indicators'

export type IndexQuote = {
  symbol: string
  name: string
  price: number
  changePercent: number
  asOf: string
  source: 'live' | 'delayed' | 'demo'
}

export type FIIDIIRow = {
  date: string
  fii: number
  dii: number
}

const TD_KEY = import.meta.env.VITE_TWELVEDATA_KEY as string | undefined

function demoBars(base: number, n = 80): Bar[] {
  const bars: Bar[] = []
  let p = base
  const day = 86400000
  const start = Date.now() - n * day
  for (let i = 0; i < n; i++) {
    const o = p
    const c = p * (1 + (Math.random() - 0.48) * 0.012)
    const h = Math.max(o, c) * (1 + Math.random() * 0.004)
    const l = Math.min(o, c) * (1 - Math.random() * 0.004)
    bars.push({ t: start + i * day, o, h, l, c, v: 1e6 + Math.random() * 1e6 })
    p = c
  }
  return bars
}

/** Twelve Data time series */
async function twelveBars(symbol: string): Promise<Bar[] | null> {
  if (!TD_KEY) return null
  try {
    const url =
      `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}` +
      `&interval=1day&outputsize=90&apikey=${TD_KEY}`
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()
    if (json?.status === 'error' || !json?.values) return null
    const values = [...json.values].reverse()
    const bars: Bar[] = values.map((v: { datetime: string; open: string; high: string; low: string; close: string; volume?: string }) => ({
      t: new Date(v.datetime).getTime(),
      o: Number(v.open),
      h: Number(v.high),
      l: Number(v.low),
      c: Number(v.close),
      v: v.volume ? Number(v.volume) : undefined,
    }))
    return bars.length > 10 ? bars : null
  } catch {
    return null
  }
}

async function yahooChart(symbol: string): Promise<Bar[] | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=6mo`
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()
    const r = json?.chart?.result?.[0]
    if (!r) return null
    const ts: number[] = r.timestamp || []
    const q = r.indicators?.quote?.[0]
    if (!q) return null
    const bars: Bar[] = []
    for (let i = 0; i < ts.length; i++) {
      if (q.close[i] == null) continue
      bars.push({
        t: ts[i] * 1000,
        o: q.open[i] ?? q.close[i],
        h: q.high[i] ?? q.close[i],
        l: q.low[i] ?? q.close[i],
        c: q.close[i],
        v: q.volume?.[i],
      })
    }
    return bars.length > 10 ? bars : null
  } catch {
    return null
  }
}

async function resolveBars(
  twelveSymbol: string,
  yahooSymbol: string,
  demoBase: number,
): Promise<{ bars: Bar[]; source: IndexQuote['source'] }> {
  const td = await twelveBars(twelveSymbol)
  if (td) return { bars: td, source: TD_KEY ? 'delayed' : 'delayed' }
  const y = await yahooChart(yahooSymbol)
  if (y) return { bars: y, source: 'delayed' }
  return { bars: demoBars(demoBase), source: 'demo' }
}

export async function fetchIndexBars(kind: 'nifty' | 'sensex'): Promise<{ bars: Bar[]; source: IndexQuote['source'] }> {
  if (kind === 'nifty') {
    return resolveBars('NSEI', '^NSEI', 24500)
  }
  return resolveBars('BSESN', '^BSESN', 80000)
}

export async function fetchStockBars(symbol: string): Promise<{ bars: Bar[]; source: IndexQuote['source'] }> {
  // Twelve often uses SYMBOL:NSE or RELIANCE.NSE — try both patterns via NSE suffix for Yahoo
  const td = await twelveBars(`${symbol}:NSE`)
  if (td) return { bars: td, source: 'delayed' }
  const td2 = await twelveBars(symbol)
  if (td2) return { bars: td2, source: 'delayed' }
  const y = await yahooChart(`${symbol}.NS`)
  if (y) return { bars: y, source: 'delayed' }
  const bases: Record<string, number> = {
    RELIANCE: 2850, TCS: 4100, HDFCBANK: 1680, INFY: 1850, ICICIBANK: 1240, SBIN: 820,
  }
  return { bars: demoBars(bases[symbol] || 1000), source: 'demo' }
}

export function quoteFromBars(
  symbol: string,
  name: string,
  bars: Bar[],
  source: IndexQuote['source'],
): IndexQuote {
  const last = bars[bars.length - 1]
  const prev = bars[bars.length - 2] || last
  const changePercent = prev.c ? ((last.c - prev.c) / prev.c) * 100 : 0
  return {
    symbol,
    name,
    price: Number(last.c.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    asOf: new Date(last.t).toISOString(),
    source: source === 'demo' ? 'demo' : 'delayed',
  }
}

export async function fetchFIIDII(): Promise<{ rows: FIIDIIRow[]; source: string }> {
  try {
    const res = await fetch('https://fii-diidata.mrchartist.com/api/history', {
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      const data = await res.json()
      const rows: FIIDIIRow[] = (Array.isArray(data) ? data : data?.data || [])
        .slice(0, 15)
        .map((d: Record<string, unknown>) => ({
          date: String(d.d || d.date || ''),
          fii: Number(d.fn ?? d.fii ?? d.fiiNet ?? 0),
          dii: Number(d.dn ?? d.dii ?? d.diiNet ?? 0),
        }))
        .filter((r: FIIDIIRow) => r.date)
      if (rows.length) return { rows, source: 'public-feed' }
    }
  } catch {
    /* fallback */
  }
  return {
    source: 'demo',
    rows: [
      { date: 'Mon', fii: 1200, dii: -400 },
      { date: 'Tue', fii: -800, dii: 650 },
      { date: 'Wed', fii: 400, dii: 200 },
      { date: 'Thu', fii: 1500, dii: -300 },
      { date: 'Fri', fii: -200, dii: 900 },
      { date: 'Mon', fii: 700, dii: 100 },
      { date: 'Tue', fii: -1100, dii: 800 },
    ],
  }
}

export const WATCHLIST_SYMBOLS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank' },
  { symbol: 'TCS', name: 'TCS' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank' },
  { symbol: 'INFY', name: 'Infosys' },
] as const

export function hasTwelveKey(): boolean {
  return Boolean(TD_KEY && TD_KEY.length > 5)
}

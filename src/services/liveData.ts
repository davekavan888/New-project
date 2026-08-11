/**
 * Live/delayed data via /api/market (Twelve Data + Yahoo fallback on server)
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

const cache = new Map<string, { bars: Bar[]; source: IndexQuote['source']; at: number }>()
const CACHE_MS = 3 * 60 * 1000 // 3 minutes — OK for your use

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
    bars.push({ t: start + i * day, o, h, l, c, v: 1e6 })
    p = c
  }
  return bars
}

function parseBars(json: unknown): Bar[] | null {
  const j = json as { status?: string; values?: { datetime: string; open: string; high: string; low: string; close: string; volume?: string }[] }
  if (!j?.values || j.status === 'error') return null
  const values = [...j.values].reverse()
  const bars: Bar[] = values.map((v) => ({
    t: new Date(v.datetime).getTime(),
    o: Number(v.open),
    h: Number(v.high),
    l: Number(v.low),
    c: Number(v.close),
    v: v.volume ? Number(v.volume) : undefined,
  }))
  return bars.length > 5 ? bars : null
}

async function fetchBars(symbol: string, demoBase: number): Promise<{ bars: Bar[]; source: IndexQuote['source'] }> {
  const hit = cache.get(symbol)
  if (hit && Date.now() - hit.at < CACHE_MS) return { bars: hit.bars, source: hit.source }

  try {
    const res = await fetch(`/api/market?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=90`)
    if (res.ok) {
      const json = await res.json()
      const bars = parseBars(json)
      if (bars) {
        const source: IndexQuote['source'] = 'delayed'
        cache.set(symbol, { bars, source, at: Date.now() })
        return { bars, source }
      }
    }
  } catch {
    /* demo */
  }
  const bars = demoBars(demoBase)
  return { bars, source: 'demo' }
}

export async function fetchIndexBars(kind: 'nifty' | 'sensex'): Promise<{ bars: Bar[]; source: IndexQuote['source'] }> {
  if (kind === 'nifty') return fetchBars('NSEI', 24500)
  return fetchBars('BSESN', 80000)
}

export async function fetchStockBars(symbol: string): Promise<{ bars: Bar[]; source: IndexQuote['source'] }> {
  const bases: Record<string, number> = {
    RELIANCE: 2850, TCS: 4100, HDFCBANK: 1680, INFY: 1850, ICICIBANK: 1240, SBIN: 820, BANKNIFTY: 52000,
  }
  // Prefer Yahoo-style via our API map: RELIANCE → RELIANCE.NS on server
  return fetchBars(symbol, bases[symbol] || 1000)
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
    /* demo */
  }
  return {
    source: 'demo',
    rows: [
      { date: 'Mon', fii: 1200, dii: -400 },
      { date: 'Tue', fii: -800, dii: 650 },
      { date: 'Wed', fii: 400, dii: 200 },
      { date: 'Thu', fii: 1500, dii: -300 },
      { date: 'Fri', fii: -200, dii: 900 },
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

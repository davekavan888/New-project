/**
 * NIFTY option chain helper — Angel session + scrip master + quote FULL
 * Educational: PCR / max-pain approx from available OI fields.
 */
import type { AngelSession } from '../auth/angelAuth.js'
import fs from 'fs'
import path from 'path'

export type ChainRow = {
  strike: number
  callLtp: number | null
  callOi: number | null
  putLtp: number | null
  putOi: number | null
  callToken?: string
  putToken?: string
}

export type ChainGuide = {
  pcr: number | null
  maxPain: number | null
  resistanceZone: number | null
  supportZone: number | null
  bias: 'bullish' | 'bearish' | 'range' | 'unknown'
  notes: string[]
}

function headers(session: AngelSession, apiKey: string) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${session.jwtToken}`,
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-ClientLocalIP': '127.0.0.1',
    'X-ClientPublicIP': '127.0.0.1',
    'X-MACAddress': '00:00:00:00:00:00',
    'X-PrivateKey': apiKey,
  }
}

type ScripRow = {
  token?: string
  symboltoken?: string
  symbol?: string
  name?: string
  expiry?: string
  strike?: string | number
  instrumenttype?: string
  exch_seg?: string
}

function loadScrips(): ScripRow[] {
  const p = path.join(process.cwd(), 'data', 'OpenAPIScripMaster.json')
  if (!fs.existsSync(p)) return []
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as ScripRow[]
  } catch {
    return []
  }
}

/** Parse strike — Angel often stores strike * 100 */
function parseStrike(raw: string | number | undefined): number | null {
  if (raw == null) return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  if (n > 100000) return n / 100
  return n
}

function nearestExpiry(dates: string[]): string | null {
  if (!dates.length) return null
  const uniq = [...new Set(dates)].sort()
  const now = Date.now()
  for (const d of uniq) {
    const t = Date.parse(d)
    if (!Number.isNaN(t) && t + 86400000 >= now) return d
  }
  return uniq[0] || null
}

export async function fetchNiftySpot(
  session: AngelSession,
  apiKey: string,
): Promise<number | null> {
  try {
    const res = await fetch(
      'https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/',
      {
        method: 'POST',
        headers: headers(session, apiKey),
        body: JSON.stringify({
          mode: 'LTP',
          exchangeTokens: { NSE: ['99926000', '99926011'] },
        }),
      },
    )
    const json = await res.json()
    const list = json?.data?.fetched || []
    for (const row of list) {
      const p = Number(row.ltp)
      if (Number.isFinite(p) && p > 1000) return p
    }
    return null
  } catch {
    return null
  }
}

async function quoteFull(
  session: AngelSession,
  apiKey: string,
  tokens: string[],
): Promise<Map<string, { ltp: number | null; oi: number | null }>> {
  const map = new Map<string, { ltp: number | null; oi: number | null }>()
  if (!tokens.length) return map
  // batch ~50
  for (let i = 0; i < tokens.length; i += 40) {
    const batch = tokens.slice(i, i + 40)
    try {
      const res = await fetch(
        'https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/',
        {
          method: 'POST',
          headers: headers(session, apiKey),
          body: JSON.stringify({
            mode: 'FULL',
            exchangeTokens: { NFO: batch },
          }),
        },
      )
      const json = await res.json()
      const list = json?.data?.fetched || []
      for (const row of list) {
        const tok = String(row.symbolToken || row.token || '')
        map.set(tok, {
          ltp: Number.isFinite(Number(row.ltp)) ? Number(row.ltp) : null,
          oi: Number.isFinite(Number(row.opnInterest ?? row.oi ?? row.openInterest))
            ? Number(row.opnInterest ?? row.oi ?? row.openInterest)
            : null,
        })
      }
    } catch {
      /* continue */
    }
  }
  return map
}

export function buildGuide(rows: ChainRow[], spot: number | null): ChainGuide {
  let callOi = 0
  let putOi = 0
  let maxCallOi = 0
  let maxPutOi = 0
  let resStrike: number | null = null
  let supStrike: number | null = null

  for (const r of rows) {
    const c = r.callOi || 0
    const p = r.putOi || 0
    callOi += c
    putOi += p
    if (c > maxCallOi) {
      maxCallOi = c
      resStrike = r.strike
    }
    if (p > maxPutOi) {
      maxPutOi = p
      supStrike = r.strike
    }
  }

  const pcr = callOi > 0 ? putOi / callOi : null

  // Max pain approx: strike minimizing sum of ITM exercise losses proxy = min sum |K-S|*OI style
  let maxPain: number | null = null
  if (rows.length) {
    let best = Infinity
    for (const cand of rows) {
      let cost = 0
      for (const r of rows) {
        const ce = r.callOi || 0
        const pe = r.putOi || 0
        if (cand.strike > r.strike) cost += (cand.strike - r.strike) * ce
        if (cand.strike < r.strike) cost += (r.strike - cand.strike) * pe
      }
      if (cost < best) {
        best = cost
        maxPain = cand.strike
      }
    }
  }

  const notes: string[] = []
  let bias: ChainGuide['bias'] = 'unknown'
  if (pcr != null) {
    if (pcr >= 1.1) {
      notes.push(`PCR ${pcr.toFixed(2)} elevated — put-heavy positioning (often support bias, not a signal).`)
      bias = 'range'
    } else if (pcr <= 0.7) {
      notes.push(`PCR ${pcr.toFixed(2)} low — call-heavy positioning (caution on chase).`)
      bias = 'range'
    } else {
      notes.push(`PCR ${pcr.toFixed(2)} balanced zone.`)
      bias = 'range'
    }
  } else {
    notes.push('PCR DATA UNAVAILABLE — OI missing from feed.')
  }
  if (resStrike != null) notes.push(`Highest Call OI near ${resStrike} → resistance zone candidate.`)
  if (supStrike != null) notes.push(`Highest Put OI near ${supStrike} → support zone candidate.`)
  if (maxPain != null) notes.push(`Approx max-pain style level: ${maxPain}.`)
  if (spot != null) notes.push(`Spot ~ ${spot.toFixed(2)}. Zones are educational, not guarantees.`)
  notes.push('Invalidation: sustained break beyond support/resistance zones with volume.')

  return {
    pcr,
    maxPain,
    resistanceZone: resStrike,
    supportZone: supStrike,
    bias,
    notes,
  }
}

export async function buildNiftyChain(
  session: AngelSession,
  apiKey: string,
): Promise<{
  spot: number | null
  expiry: string | null
  rows: ChainRow[]
  guide: ChainGuide
  status: string
  error?: string
}> {
  const spot = await fetchNiftySpot(session, apiKey)
  const scrips = loadScrips()
  if (!scrips.length) {
    return {
      spot,
      expiry: null,
      rows: [],
      guide: buildGuide([], spot),
      status: 'no_scrip_master',
      error: 'Scrip master missing — call /admin/refresh-scrip or restart bridge after download',
    }
  }

  const niftyOpt = scrips.filter((s) => {
    const name = String(s.name || s.symbol || '').toUpperCase()
    const seg = String(s.exch_seg || '').toUpperCase()
    const inst = String(s.instrumenttype || '').toUpperCase()
    return (
      (seg === 'NFO' || seg.includes('NFO')) &&
      name.includes('NIFTY') &&
      !name.includes('BANK') &&
      !name.includes('FINNIFTY') &&
      !name.includes('MIDCP') &&
      (inst.includes('OPT') || name.includes('CE') || name.includes('PE') || String(s.symbol || '').includes('CE') || String(s.symbol || '').includes('PE'))
    )
  })

  const expiries = niftyOpt.map((s) => String(s.expiry || '')).filter(Boolean)
  const expiry = nearestExpiry(expiries)

  let focused = niftyOpt.filter((s) => String(s.expiry || '') === expiry)
  if (!focused.length) focused = niftyOpt

  // ATM window ± 10 strikes step 50
  const step = 50
  const atm = spot != null ? Math.round(spot / step) * step : 24500
  const lo = atm - step * 8
  const hi = atm + step * 8

  const byStrike = new Map<number, ChainRow>()
  for (const s of focused) {
    const strike = parseStrike(s.strike)
    if (strike == null || strike < lo || strike > hi) continue
    const sym = String(s.symbol || s.name || '').toUpperCase()
    const tok = String(s.token || s.symboltoken || '')
    if (!tok) continue
    if (!byStrike.has(strike)) {
      byStrike.set(strike, {
        strike,
        callLtp: null,
        callOi: null,
        putLtp: null,
        putOi: null,
      })
    }
    const row = byStrike.get(strike)!
    if (sym.includes('CE') || String(s.symbol || '').endsWith('CE')) {
      row.callToken = tok
    } else if (sym.includes('PE') || String(s.symbol || '').endsWith('PE')) {
      row.putToken = tok
    }
  }

  const tokens: string[] = []
  for (const r of byStrike.values()) {
    if (r.callToken) tokens.push(r.callToken)
    if (r.putToken) tokens.push(r.putToken)
  }

  const q = await quoteFull(session, apiKey, tokens)
  for (const r of byStrike.values()) {
    if (r.callToken && q.has(r.callToken)) {
      const x = q.get(r.callToken)!
      r.callLtp = x.ltp
      r.callOi = x.oi
    }
    if (r.putToken && q.has(r.putToken)) {
      const x = q.get(r.putToken)!
      r.putLtp = x.ltp
      r.putOi = x.oi
    }
  }

  const rows = [...byStrike.values()].sort((a, b) => a.strike - b.strike)
  const guide = buildGuide(rows, spot)
  return {
    spot,
    expiry,
    rows,
    guide,
    status: rows.length ? 'ok' : 'empty_chain',
    error: rows.length ? undefined : 'No NIFTY option rows matched — scrip filter/expiry',
  }
}

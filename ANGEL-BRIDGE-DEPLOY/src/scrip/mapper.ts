/**
 * Instrument token mapper using Angel OpenAPIScripMaster.json
 */
import fs from 'fs'
import path from 'path'

const SCRIP_URL = 'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json'
const CACHE = path.join(process.cwd(), 'data', 'scrip_master.json')

export type ScripRow = {
  token: string
  symbol: string
  name: string
  expiry: string
  strike: string
  lotsize: string
  instrumenttype: string
  exch_seg: string
  tick_size: string
}

let rows: ScripRow[] = []

export async function refreshScripMaster(): Promise<number> {
  const res = await fetch(SCRIP_URL)
  if (!res.ok) throw new Error(`Scrip download failed: ${res.status}`)
  const data = (await res.json()) as ScripRow[]
  const dir = path.dirname(CACHE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(CACHE, JSON.stringify(data))
  rows = data
  return data.length
}

export function loadScripMaster(): void {
  if (rows.length) return
  if (fs.existsSync(CACHE)) {
    rows = JSON.parse(fs.readFileSync(CACHE, 'utf8'))
  }
}

export function findIndexToken(name: 'NIFTY' | 'BANKNIFTY' | 'SENSEX'): ScripRow | undefined {
  loadScripMaster()
  const n = name === 'NIFTY' ? 'Nifty 50' : name === 'BANKNIFTY' ? 'Nifty Bank' : 'Sensex'
  return rows.find(
    (r) =>
      r.exch_seg === 'NSE' &&
      (r.instrumenttype === 'AMXIDX' || r.symbol?.includes('NIFTY') || r.name?.toLowerCase().includes(n.toLowerCase())) &&
      (r.name === n || r.symbol === name || r.symbol?.startsWith(name)),
  )
}

/** Map e.g. NIFTY 24500 CE near expiry */
export function findOptionToken(params: {
  underlying: 'NIFTY' | 'BANKNIFTY'
  strike: number
  type: 'CE' | 'PE'
  expiryHint?: string // e.g. 25MAR2026
}): ScripRow | undefined {
  loadScripMaster()
  const seg = 'NFO'
  return rows.find((r) => {
    if (r.exch_seg !== seg) return false
    if (!r.symbol?.startsWith(params.underlying)) return false
    if (!r.symbol?.endsWith(params.type)) return false
    const strikeNum = Number(r.strike) / 100 // Angel often stores strike * 100
    const strikeAlt = Number(r.strike)
    const matchStrike = strikeNum === params.strike || strikeAlt === params.strike
    if (!matchStrike) return false
    if (params.expiryHint && r.expiry && !r.expiry.includes(params.expiryHint.replace(/-/g, ''))) {
      // soft match — still allow if strike+type unique enough
    }
    return true
  })
}

export function tokenForSymbol(human: string): string | null {
  loadScripMaster()
  const upper = human.toUpperCase().trim()
  if (upper === 'NIFTY' || upper === 'NIFTY 50') {
    return findIndexToken('NIFTY')?.token || null
  }
  if (upper === 'BANKNIFTY' || upper === 'NIFTY BANK') {
    return findIndexToken('BANKNIFTY')?.token || null
  }
  // RELIANCE etc equity
  const eq = rows.find((r) => r.exch_seg === 'NSE' && r.symbol === upper && r.instrumenttype === 'EQ')
  return eq?.token || null
}

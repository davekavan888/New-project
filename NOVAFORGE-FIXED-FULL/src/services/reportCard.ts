/**
 * Prediction report card — lock a view, score later against real spot.
 * Stored in localStorage (personal device). Educational only.
 */

export type LockedCall = {
  id: string
  symbol: string
  lockedAt: number
  lockSpot: number
  bias: 'bullish' | 'range' | 'bearish' | 'no_trade'
  confidence: number
  zoneLow: number | null
  zoneHigh: number | null
  invalidation: string
  horizonMin: number
  dataStatus: string
  note?: string
  /** filled when scored */
  scoredAt?: number
  endSpot?: number
  result?: 'hit' | 'partial' | 'miss' | 'void'
  resultNote?: string
}

const KEY = 'novaforge_report_card_v1'

function read(): LockedCall[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as LockedCall[]
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function write(rows: LockedCall[]) {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 100)))
}

export function listCalls(): LockedCall[] {
  return read().sort((a, b) => b.lockedAt - a.lockedAt)
}

export function lockCall(
  input: Omit<LockedCall, 'id' | 'lockedAt' | 'scoredAt' | 'endSpot' | 'result' | 'resultNote'>,
): LockedCall {
  const row: LockedCall = {
    ...input,
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    lockedAt: Date.now(),
  }
  const all = read()
  all.unshift(row)
  write(all)
  return row
}

export function scoreCall(id: string, endSpot: number): LockedCall | null {
  const all = read()
  const i = all.findIndex((c) => c.id === id)
  if (i < 0) return null
  const c = all[i]
  if (c.dataStatus === 'demo' || c.dataStatus === 'unavailable') {
    c.scoredAt = Date.now()
    c.endSpot = endSpot
    c.result = 'void'
    c.resultNote = 'Not counted — data was demo/unavailable at lock.'
    write(all)
    return c
  }

  const move = endSpot - c.lockSpot
  const movePct = c.lockSpot ? (move / c.lockSpot) * 100 : 0
  let result: LockedCall['result'] = 'partial'
  let resultNote = ''

  if (c.bias === 'no_trade') {
    // success if market stayed quiet (±0.25%)
    if (Math.abs(movePct) <= 0.25) {
      result = 'hit'
      resultNote = 'NO TRADE was reasonable — market stayed tight.'
    } else {
      result = 'miss'
      resultNote = 'Market moved more than a quiet band; standing aside was conservative.'
    }
  } else if (c.bias === 'range') {
    const inZone =
      c.zoneLow != null &&
      c.zoneHigh != null &&
      endSpot >= c.zoneLow &&
      endSpot <= c.zoneHigh
    if (inZone || Math.abs(movePct) <= 0.35) {
      result = 'hit'
      resultNote = 'Price behaved in a range-like way vs lock plan.'
    } else if (Math.abs(movePct) <= 0.6) {
      result = 'partial'
      resultNote = 'Some expansion beyond quiet range.'
    } else {
      result = 'miss'
      resultNote = 'Directional expansion vs range plan.'
    }
  } else if (c.bias === 'bullish') {
    if (movePct >= 0.15) {
      result = 'hit'
      resultNote = 'Spot moved up vs bullish lock.'
    } else if (movePct >= -0.15) {
      result = 'partial'
      resultNote = 'Mostly flat vs bullish bias.'
    } else {
      result = 'miss'
      resultNote = 'Spot moved against bullish bias.'
    }
    if (c.zoneHigh != null && endSpot >= c.zoneLow! && endSpot <= c.zoneHigh * 1.002) {
      if (result === 'miss') result = 'partial'
    }
  } else {
    // bearish
    if (movePct <= -0.15) {
      result = 'hit'
      resultNote = 'Spot moved down vs bearish lock.'
    } else if (movePct <= 0.15) {
      result = 'partial'
      resultNote = 'Mostly flat vs bearish bias.'
    } else {
      result = 'miss'
      resultNote = 'Spot moved against bearish bias.'
    }
  }

  c.scoredAt = Date.now()
  c.endSpot = endSpot
  c.result = result
  c.resultNote = resultNote
  write(all)
  return c
}

export function autoScoreDue(getSpot: (symbol: string) => number | null): LockedCall[] {
  const all = read()
  let changed = false
  const now = Date.now()
  for (const c of all) {
    if (c.result) continue
    const due = c.lockedAt + c.horizonMin * 60 * 1000
    if (now < due) continue
    const spot = getSpot(c.symbol)
    if (spot == null) continue
    scoreCall(c.id, spot)
    changed = true
  }
  return changed ? listCalls() : all.sort((a, b) => b.lockedAt - a.lockedAt)
}

export function summaryStats(calls: LockedCall[]) {
  const scored = calls.filter((c) => c.result && c.result !== 'void')
  const hit = scored.filter((c) => c.result === 'hit').length
  const partial = scored.filter((c) => c.result === 'partial').length
  const miss = scored.filter((c) => c.result === 'miss').length
  const n = scored.length
  return {
    n,
    hit,
    partial,
    miss,
    hitRate: n ? Math.round((hit / n) * 100) : 0,
    usefulRate: n ? Math.round(((hit + partial * 0.5) / n) * 100) : 0,
  }
}

export function clearAllCalls() {
  localStorage.removeItem(KEY)
}

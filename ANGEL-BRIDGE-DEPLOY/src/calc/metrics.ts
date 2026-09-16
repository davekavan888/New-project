/** Live PCR / Max Pain / OI delta from option chain snapshots */

export type StrikeSide = { strike: number; ceOi: number; peOi: number; ceLtp?: number; peLtp?: number }

export function calcPcr(rows: StrikeSide[]): number {
  const ce = rows.reduce((s, r) => s + r.ceOi, 0)
  const pe = rows.reduce((s, r) => s + r.peOi, 0)
  if (!ce) return 0
  return Number((pe / ce).toFixed(3))
}

/** Max pain: strike where total option writer pain is minimized */
export function calcMaxPain(rows: StrikeSide[]): number {
  if (!rows.length) return 0
  let bestStrike = rows[0].strike
  let bestPain = Number.POSITIVE_INFINITY
  for (const candidate of rows) {
    let pain = 0
    for (const r of rows) {
      // call writers pain if settlement > strike
      if (candidate.strike > r.strike) pain += (candidate.strike - r.strike) * r.ceOi
      // put writers pain if settlement < strike
      if (candidate.strike < r.strike) pain += (r.strike - candidate.strike) * r.peOi
    }
    if (pain < bestPain) {
      bestPain = pain
      bestStrike = candidate.strike
    }
  }
  return bestStrike
}

export function oiDelta(prev: StrikeSide[], next: StrikeSide[]): { ce: number; pe: number } {
  const map = new Map(prev.map((p) => [p.strike, p]))
  let ce = 0
  let pe = 0
  for (const n of next) {
    const p = map.get(n.strike)
    if (!p) continue
    ce += n.ceOi - p.ceOi
    pe += n.peOi - p.peOi
  }
  return { ce, pe }
}

/** Factor model for UI transparency */
export function directionFactors(input: {
  technical: number // 0-100
  optionsFlow: number
  breadth: number
}) {
  const score = Math.round(input.technical * 0.3 + input.optionsFlow * 0.4 + input.breadth * 0.3)
  return {
    score,
    weights: { technical: 0.3, optionsFlow: 0.4, marketBreadth: 0.3 },
    components: input,
  }
}

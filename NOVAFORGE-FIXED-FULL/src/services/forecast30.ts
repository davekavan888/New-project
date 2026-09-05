/**
 * 30-minute probabilistic desk — deterministic factors only.
 * No fabricated news counts or historical "82% similar".
 */

export type Bias = 'bullish' | 'range' | 'bearish'
export type FactorTone = 'pos' | 'neg' | 'neu'

export type Factor = {
  label: string
  tone: FactorTone
  detail: string
  source: 'live' | 'delayed' | 'derived' | 'unavailable'
}

export type Forecast30 = {
  symbol: string
  asOf: string
  last: number | null
  dataStatus: 'live' | 'delayed' | 'demo' | 'unavailable'
  bias: Bias
  probs: { bullish: number; range: number; bearish: number }
  confidence: number
  range: { lower: number; base: number; upper: number } | null
  invalidation: string
  regime: string
  factors: Factor[]
  reasons: string[]
  disclaimer: string
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function round(n: number, d = 2) {
  const p = 10 ** d
  return Math.round(n * p) / p
}

/** Simple ATR-like from high/low list */
export function estimateAtr(bars: { high: number; low: number; close: number }[], period = 14): number | null {
  if (!bars?.length) return null
  const slice = bars.slice(-Math.max(period, 2))
  if (slice.length < 2) {
    const b = slice[0]
    return b ? Math.abs(b.high - b.low) : null
  }
  let sum = 0
  for (let i = 1; i < slice.length; i++) {
    const h = slice[i].high
    const l = slice[i].low
    const pc = slice[i - 1].close
    sum += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc))
  }
  return sum / (slice.length - 1)
}

export function buildForecast30(input: {
  symbol: string
  last: number | null
  prevClose?: number | null
  dayHigh?: number | null
  dayLow?: number | null
  bars?: { high: number; low: number; close: number }[]
  dataStatus: Forecast30['dataStatus']
  /** optional model scores 0-100 */
  technical?: number
  optionsFlow?: number
  breadth?: number
}): Forecast30 {
  const asOf = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  const last = input.last
  const factors: Factor[] = []
  let bull = 33
  let bear = 33
  let rangeP = 34

  if (last == null || !Number.isFinite(last)) {
    return {
      symbol: input.symbol,
      asOf,
      last: null,
      dataStatus: 'unavailable',
      bias: 'range',
      probs: { bullish: 33, range: 34, bearish: 33 },
      confidence: 15,
      range: null,
      invalidation: 'DATA UNAVAILABLE — no forecast levels',
      regime: 'Unknown',
      factors: [
        {
          label: 'Price feed',
          tone: 'neu',
          detail: 'No usable LTP',
          source: 'unavailable',
        },
      ],
      reasons: ['Price data unavailable — confidence collapsed.'],
      disclaimer:
        'Educational estimate only. Not investment advice. Probabilities are model outputs, not guarantees.',
    }
  }

  const prev = input.prevClose ?? null
  const dayHigh = input.dayHigh ?? null
  const dayLow = input.dayLow ?? null
  const atr =
    estimateAtr(input.bars || []) ??
    (dayHigh != null && dayLow != null ? (dayHigh - dayLow) * 0.35 : last * 0.003)

  // Factor: vs prev close
  if (prev != null && prev > 0) {
    const chg = ((last - prev) / prev) * 100
    if (chg > 0.25) {
      factors.push({
        label: 'Above prev close',
        tone: 'pos',
        detail: `${chg.toFixed(2)}%`,
        source: input.dataStatus === 'live' ? 'live' : 'delayed',
      })
      bull += 8
      bear -= 4
    } else if (chg < -0.25) {
      factors.push({
        label: 'Below prev close',
        tone: 'neg',
        detail: `${chg.toFixed(2)}%`,
        source: input.dataStatus === 'live' ? 'live' : 'delayed',
      })
      bear += 8
      bull -= 4
    } else {
      factors.push({
        label: 'Near prev close',
        tone: 'neu',
        detail: `${chg.toFixed(2)}%`,
        source: 'derived',
      })
      rangeP += 6
    }
  } else {
    factors.push({
      label: 'Prev close',
      tone: 'neu',
      detail: 'DATA UNAVAILABLE',
      source: 'unavailable',
    })
  }

  // Factor: location in day range
  if (dayHigh != null && dayLow != null && dayHigh > dayLow) {
    const pos = (last - dayLow) / (dayHigh - dayLow)
    if (pos > 0.65) {
      factors.push({
        label: 'Upper day range',
        tone: 'pos',
        detail: `Pos ${(pos * 100).toFixed(0)}%`,
        source: 'derived',
      })
      bull += 5
    } else if (pos < 0.35) {
      factors.push({
        label: 'Lower day range',
        tone: 'neg',
        detail: `Pos ${(pos * 100).toFixed(0)}%`,
        source: 'derived',
      })
      bear += 5
    } else {
      factors.push({
        label: 'Mid day range',
        tone: 'neu',
        detail: `Pos ${(pos * 100).toFixed(0)}%`,
        source: 'derived',
      })
      rangeP += 5
    }
  }

  // Optional component scores
  const tech = input.technical
  if (tech != null) {
    if (tech >= 58) {
      factors.push({ label: 'Technical score', tone: 'pos', detail: `${Math.round(tech)}`, source: 'derived' })
      bull += 6
    } else if (tech <= 42) {
      factors.push({ label: 'Technical score', tone: 'neg', detail: `${Math.round(tech)}`, source: 'derived' })
      bear += 6
    } else {
      factors.push({ label: 'Technical score', tone: 'neu', detail: `${Math.round(tech)}`, source: 'derived' })
      rangeP += 4
    }
  }

  if (input.optionsFlow != null) {
    const o = input.optionsFlow
    if (o >= 58) {
      factors.push({ label: 'Options-flow proxy', tone: 'pos', detail: `${Math.round(o)}`, source: 'derived' })
      bull += 4
    } else if (o <= 42) {
      factors.push({ label: 'Options-flow proxy', tone: 'neg', detail: `${Math.round(o)}`, source: 'derived' })
      bear += 4
    } else {
      factors.push({ label: 'Options-flow proxy', tone: 'neu', detail: `${Math.round(o)}`, source: 'derived' })
    }
  }

  // Data freshness penalty
  if (input.dataStatus === 'demo') {
    factors.push({ label: 'Feed quality', tone: 'neu', detail: 'DEMO', source: 'unavailable' })
    rangeP += 10
    bull -= 5
    bear -= 5
  } else if (input.dataStatus === 'delayed') {
    factors.push({ label: 'Feed quality', tone: 'neu', detail: 'DELAYED', source: 'delayed' })
  } else {
    factors.push({ label: 'Feed quality', tone: 'pos', detail: 'LIVE/near-live', source: 'live' })
  }

  // Normalize probs
  bull = Math.max(5, bull)
  bear = Math.max(5, bear)
  rangeP = Math.max(5, rangeP)
  const sum = bull + bear + rangeP
  const probs = {
    bullish: Math.round((bull / sum) * 100),
    range: Math.round((rangeP / sum) * 100),
    bearish: Math.round((bear / sum) * 100),
  }
  // Fix rounding to 100
  const pSum = probs.bullish + probs.range + probs.bearish
  if (pSum !== 100) probs.range += 100 - pSum

  let bias: Bias = 'range'
  if (probs.bullish >= probs.bearish && probs.bullish >= probs.range) bias = 'bullish'
  else if (probs.bearish >= probs.bullish && probs.bearish >= probs.range) bias = 'bearish'

  const agreement = Math.max(probs.bullish, probs.range, probs.bearish)
  let confidence = clamp(agreement - 8, 25, 72)
  if (input.dataStatus === 'demo') confidence = Math.min(confidence, 35)
  if (input.dataStatus === 'delayed') confidence = Math.min(confidence, 55)
  if (factors.some((f) => f.source === 'unavailable')) confidence = Math.min(confidence, confidence - 5)

  const span = atr * (bias === 'range' ? 0.55 : 0.85)
  const range = {
    lower: round(last - span),
    base: round(last + (bias === 'bullish' ? span * 0.35 : bias === 'bearish' ? -span * 0.35 : 0)),
    upper: round(last + span),
  }

  let regime = 'Range'
  if (bias === 'bullish' && confidence >= 55) regime = 'Weak uptrend bias'
  else if (bias === 'bearish' && confidence >= 55) regime = 'Weak downtrend bias'
  else if (atr / last > 0.008) regime = 'Elevated volatility'
  else regime = 'Range / chop risk'

  const inv =
    bias === 'bullish'
      ? `Bullish bias weakens if ${input.symbol} sustains below ${range.lower} with strength`
      : bias === 'bearish'
        ? `Bearish bias weakens if ${input.symbol} sustains above ${range.upper}`
        : `Range idea fails on decisive break outside ${range.lower}–${range.upper}`

  const reasons = factors.slice(0, 7).map((f) => {
    const icon = f.tone === 'pos' ? '🟢' : f.tone === 'neg' ? '🔴' : '🟡'
    return `${icon} ${f.label}: ${f.detail}`
  })

  return {
    symbol: input.symbol,
    asOf,
    last: round(last),
    dataStatus: input.dataStatus,
    bias,
    probs,
    confidence: Math.round(confidence),
    range,
    invalidation: inv,
    regime,
    factors,
    reasons,
    disclaimer:
      'Educational model estimate for the next ~30 minutes only. Not investment advice. Not a guarantee. You place trades on your broker.',
  }
}

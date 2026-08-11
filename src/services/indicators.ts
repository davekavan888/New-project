/**
 * Educational chart models (common in retail apps).
 * Not investment advice — for personal decision support only.
 */

export type Bar = { t: number; o: number; h: number; l: number; c: number; v?: number }

export type ModelResult = {
  id: string
  name: string
  usedInApps: string
  signal: 'bullish' | 'bearish' | 'neutral'
  confidence: 'low' | 'medium'
  summary: string
  levels: { label: string; value: number }[]
  invalidation: string
  notes: string[]
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const out: number[] = []
  let prev = values[0]
  for (let i = 0; i < values.length; i++) {
    prev = i === 0 ? values[0] : values[i] * k + prev * (1 - k)
    out.push(prev)
  }
  return out
}

function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50
  let gains = 0
  let losses = 0
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    if (d >= 0) gains += d
    else losses -= d
  }
  const ag = gains / period
  const al = losses / period
  if (al === 0) return 100
  const rs = ag / al
  return 100 - 100 / (1 + rs)
}

/** Model 1 — Trend structure (EMA 20/50) — used widely on Groww/TV style charts */
export function modelTrendStructure(bars: Bar[]): ModelResult {
  const closes = bars.map((b) => b.c)
  const e20 = ema(closes, 20)
  const e50 = ema(closes, Math.min(50, closes.length))
  const last = closes[closes.length - 1]
  const a = e20[e20.length - 1]
  const b = e50[e50.length - 1]
  let signal: ModelResult['signal'] = 'neutral'
  if (last > a && a >= b) signal = 'bullish'
  else if (last < a && a <= b) signal = 'bearish'

  const recent = bars.slice(-20)
  const swingHigh = Math.max(...recent.map((x) => x.h))
  const swingLow = Math.min(...recent.map((x) => x.l))

  return {
    id: 'trend',
    name: 'Trend Structure (EMA 20 / 50)',
    usedInApps: 'Groww · TradingView · most chart apps',
    signal,
    confidence: signal === 'neutral' ? 'low' : 'medium',
    summary:
      signal === 'bullish'
        ? 'Price above short EMA and short EMA above long EMA — trend structure constructive.'
        : signal === 'bearish'
          ? 'Price below short EMA and short EMA below long EMA — trend structure weak.'
          : 'Mixed EMAs — no clean trend structure.',
    levels: [
      { label: 'EMA 20', value: Number(a.toFixed(2)) },
      { label: 'EMA 50', value: Number(b.toFixed(2)) },
      { label: 'Swing high', value: Number(swingHigh.toFixed(2)) },
      { label: 'Swing low', value: Number(swingLow.toFixed(2)) },
    ],
    invalidation:
      signal === 'bullish'
        ? `Educational invalidation: sustained trade below EMA20 (~${a.toFixed(0)})`
        : signal === 'bearish'
          ? `Educational invalidation: sustained trade above EMA20 (~${a.toFixed(0)})`
          : 'Wait for EMA alignment before leaning on trend model.',
    notes: [
      'Same family of tools retail traders use on moving-average charts.',
      'Works better with higher timeframe bias; weak alone in chop.',
    ],
  }
}

/** Model 2 — RSI(14) momentum — standard on almost every app */
export function modelRsi(bars: Bar[]): ModelResult {
  const closes = bars.map((b) => b.c)
  const r = rsi(closes, 14)
  const last = closes[closes.length - 1]
  let signal: ModelResult['signal'] = 'neutral'
  if (r >= 60) signal = 'bullish'
  else if (r <= 40) signal = 'bearish'

  return {
    id: 'rsi',
    name: 'RSI (14) Momentum',
    usedInApps: 'Groww · Upstox · TradingView · MetaTrader-style apps',
    signal,
    confidence: r > 70 || r < 30 ? 'medium' : 'low',
    summary:
      r > 70
        ? `RSI ${r.toFixed(0)} — elevated momentum; chase risk is higher (educational).`
        : r < 30
          ? `RSI ${r.toFixed(0)} — depressed momentum; bounce risk both ways.`
          : `RSI ${r.toFixed(0)} — mid-zone; momentum not extreme.`,
    levels: [
      { label: 'RSI', value: Number(r.toFixed(1)) },
      { label: 'Last close', value: Number(last.toFixed(2)) },
      { label: 'Overbought ref', value: 70 },
      { label: 'Oversold ref', value: 30 },
    ],
    invalidation: 'RSI alone is not a trigger — combine with trend + levels.',
    notes: [
      'Classic oscillator on retail platforms.',
      'In strong trends RSI can stay “overbought/oversold” longer than expected.',
    ],
  }
}

/** Model 3 — Opening range / S-R (intraday 9:15–11 style) */
export function modelOpeningRange(bars: Bar[], sessionHint = true): ModelResult {
  const recent = bars.slice(-30)
  const hi = Math.max(...recent.map((b) => b.h))
  const lo = Math.min(...recent.map((b) => b.l))
  const mid = (hi + lo) / 2
  const last = bars[bars.length - 1].c
  let signal: ModelResult['signal'] = 'neutral'
  if (last > mid + (hi - lo) * 0.15) signal = 'bullish'
  else if (last < mid - (hi - lo) * 0.15) signal = 'bearish'

  const range = hi - lo
  const stopPad = range * 0.15

  return {
    id: 'range',
    name: 'Range & Levels (S/R + opening-range style)',
    usedInApps: 'Intraday desks · TradingView sessions · many Indian retail setups',
    signal,
    confidence: 'low',
    summary: sessionHint
      ? `Session-style range map: upper ${hi.toFixed(0)} / lower ${lo.toFixed(0)}. Price is ${signal} vs midpoint.`
      : `Recent range high ${hi.toFixed(0)} low ${lo.toFixed(0)}.`,
    levels: [
      { label: 'Range high (resistance idea)', value: Number(hi.toFixed(2)) },
      { label: 'Mid', value: Number(mid.toFixed(2)) },
      { label: 'Range low (support idea)', value: Number(lo.toFixed(2)) },
      { label: 'Educational stop distance', value: Number(stopPad.toFixed(2)) },
    ],
    invalidation: `Educational: break & hold outside range (${lo.toFixed(0)}–${hi.toFixed(0)}) cancels range play.`,
    notes: [
      'Similar to “mark high/low of opening window” thinking used by intraday traders.',
      'For 9:15–11 focus: respect first-hour range more than random midday noise.',
    ],
  }
}

export function runAllModels(bars: Bar[]): ModelResult[] {
  if (!bars.length) return []
  return [modelTrendStructure(bars), modelRsi(bars), modelOpeningRange(bars)]
}

/** Combine models into a simple bias (educational) */
export function combineBias(models: ModelResult[]): {
  bias: 'bullish' | 'bearish' | 'neutral'
  agreement: number
  text: string
} {
  const scores = { bullish: 0, bearish: 0, neutral: 0 }
  models.forEach((m) => {
    scores[m.signal] += m.confidence === 'medium' ? 2 : 1
  })
  let bias: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (scores.bullish > scores.bearish && scores.bullish > scores.neutral) bias = 'bullish'
  else if (scores.bearish > scores.bullish && scores.bearish > scores.neutral) bias = 'bearish'
  const agreement = Math.max(scores.bullish, scores.bearish, scores.neutral)
  return {
    bias,
    agreement,
    text:
      bias === 'neutral'
        ? 'Models disagree or mixed — reduce size / wait (educational).'
        : `${bias.toUpperCase()} lean from model mix — still not a trade order. Manage max loss.`,
  }
}

/** Educational SL/target zones from range model */
export function educationalRiskMap(
  entry: number,
  bars: Bar[],
  side: 'long' | 'short',
  maxLossRs: number,
) {
  const recent = bars.slice(-20)
  const hi = Math.max(...recent.map((b) => b.h))
  const lo = Math.min(...recent.map((b) => b.l))
  const stop = side === 'long' ? lo : hi
  const riskPerUnit = Math.abs(entry - stop)
  const qtyIdea = riskPerUnit > 0 ? Math.floor(maxLossRs / riskPerUnit) : 0
  const reward = riskPerUnit * 1.5
  const target = side === 'long' ? entry + reward : entry - reward
  return {
    stopIdea: Number(stop.toFixed(2)),
    targetIdea: Number(target.toFixed(2)),
    riskPerUnit: Number(riskPerUnit.toFixed(2)),
    qtyIdea: Math.max(0, qtyIdea),
    note: 'Educational map only — not advice. Options use premium risk, not only spot points.',
  }
}

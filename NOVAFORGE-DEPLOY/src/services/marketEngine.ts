/**
 * Optional weighted score helper — NOT a multi-horizon oracle.
 * Only call when you pass REAL inputs. Do not feed zeros for PCR/OI/VIX.
 * Horizon scores are intentionally NOT score-2/score-4 fakes.
 */
export type MarketInputs = {
  price: number
  ema20?: number
  ema50?: number
  ema200?: number
  rsi?: number
  pcr?: number
  putOIChange?: number
  callOIChange?: number
  totalOIChange?: number
  bankStrength?: number
  vix?: number
  volume?: number
  avgVolume?: number
  advanceStocks?: number
  declineStocks?: number
  vwap?: number
  prevClose?: number
}

export type MarketPrediction = {
  timestamp: number
  score: number
  signal: 'BULLISH' | 'BEARISH' | 'SIDEWAYS'
  confidence: number
  factorsUsed: string[]
}

export class MarketEngine {
  history: Array<MarketPrediction & { correct?: boolean; price?: number }> = []

  predict(data: MarketInputs): MarketPrediction {
    const {
      price = 0,
      ema20,
      ema50,
      ema200,
      rsi,
      pcr,
      putOIChange,
      callOIChange,
      totalOIChange,
      bankStrength,
      vix,
      volume,
      avgVolume = 1,
      advanceStocks,
      declineStocks,
      vwap,
      prevClose,
    } = data

    let score = 50
    const factorsUsed: string[] = []

    if (ema20 != null) {
      factorsUsed.push('ema20')
      score += price > ema20 ? 5 : -5
    }
    if (ema50 != null) {
      factorsUsed.push('ema50')
      score += price > ema50 ? 10 : -10
    }
    if (ema200 != null) {
      factorsUsed.push('ema200')
      score += price > ema200 ? 15 : -15
    }
    if (rsi != null) {
      factorsUsed.push('rsi')
      if (rsi > 60) score += 8
      if (rsi < 40) score -= 8
    }
    if (pcr != null) {
      factorsUsed.push('pcr')
      if (pcr > 1.1) score += 10
      if (pcr < 0.8) score -= 10
    }
    if (putOIChange != null && callOIChange != null) {
      factorsUsed.push('oi')
      score += putOIChange > callOIChange ? 15 : -15
    }
    if (prevClose != null && totalOIChange != null) {
      factorsUsed.push('oiBuild')
      if (price > prevClose && totalOIChange > 0) score += 12
      if (price < prevClose && totalOIChange > 0) score -= 12
    }
    if (bankStrength != null) {
      factorsUsed.push('bank')
      if (bankStrength > 70) score += 12
      if (bankStrength < 40) score -= 12
    }
    if (volume != null && avgVolume > 0) {
      factorsUsed.push('vol')
      if (volume / avgVolume > 1.5) score += 10
    }
    if (vix != null) {
      factorsUsed.push('vix')
      if (vix < 13) score += 5
      if (vix > 20) score -= 10
    }
    if (advanceStocks != null && declineStocks != null) {
      factorsUsed.push('breadth')
      const breadth = advanceStocks / Math.max(advanceStocks + declineStocks, 1)
      if (breadth > 0.6) score += 10
      if (breadth < 0.4) score -= 10
    }
    if (vwap != null) {
      factorsUsed.push('vwap')
      score += price > vwap ? 5 : -5
    }

    score = Math.max(0, Math.min(100, score))
    let signal: MarketPrediction['signal'] = 'SIDEWAYS'
    if (score >= 70) signal = 'BULLISH'
    if (score <= 30) signal = 'BEARISH'

    return {
      timestamp: Date.now(),
      score,
      signal,
      confidence: Math.round(Math.abs(score - 50) * 2),
      factorsUsed,
    }
  }

  save(result: MarketPrediction & { price?: number }) {
    this.history.push(result)
    if (this.history.length > 500) this.history.shift()
  }
}

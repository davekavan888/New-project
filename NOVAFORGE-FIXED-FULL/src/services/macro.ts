/** Global macro — free public quotes (often delayed). Always label as delayed/ref. */

export type MacroRow = {
  name: string
  value: string
  chg: string
  tone: 'pos' | 'neg' | 'neu'
  source: 'delayed' | 'unavailable'
}

async function yahooQuote(symbol: string): Promise<{ price: number; changePct: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!r.ok) return null
    const j = await r.json()
    const meta = j?.chart?.result?.[0]?.meta
    const price = Number(meta?.regularMarketPrice)
    const prev = Number(meta?.chartPreviousClose ?? meta?.previousClose)
    if (!Number.isFinite(price)) return null
    const changePct =
      Number.isFinite(prev) && prev ? ((price - prev) / prev) * 100 : Number(meta?.regularMarketChangePercent) || 0
    return { price, changePct }
  } catch {
    return null
  }
}

export async function fetchMacroMatrix(): Promise<MacroRow[]> {
  const specs: { name: string; symbol: string; digits: number }[] = [
    { name: 'USD/INR', symbol: 'INR=X', digits: 2 },
    { name: 'Crude (WTI)', symbol: 'CL=F', digits: 2 },
    { name: 'S&P futures', symbol: 'ES=F', digits: 2 },
    { name: 'US 10Y', symbol: '^TNX', digits: 3 },
  ]
  const out: MacroRow[] = []
  await Promise.all(
    specs.map(async (s) => {
      const q = await yahooQuote(s.symbol)
      if (!q) {
        out.push({ name: s.name, value: '—', chg: 'n/a', tone: 'neu', source: 'unavailable' })
        return
      }
      const tone = q.changePct > 0.05 ? 'pos' : q.changePct < -0.05 ? 'neg' : 'neu'
      out.push({
        name: s.name,
        value: q.price.toFixed(s.digits),
        chg: `${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%`,
        tone,
        source: 'delayed',
      })
    }),
  )
  // stable order
  return specs.map((s) => out.find((o) => o.name === s.name)!).filter(Boolean)
}

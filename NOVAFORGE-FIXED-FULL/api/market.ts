type Req = { method?: string; query: Record<string, string | string[] | undefined> }
type Res = {
  setHeader: (k: string, v: string) => void
  status: (n: number) => { json: (b: unknown) => unknown; end: () => void }
  end: () => void
}

/** Map friendly names → Yahoo symbols (works well for India indices) */
const YAHOO_MAP: Record<string, string> = {
  NSEI: '^NSEI',
  NIFTY: '^NSEI',
  NIFTY50: '^NSEI',
  'NIFTY:INDEX': '^NSEI',
  BSESN: '^BSESN',
  SENSEX: '^BSESN',
  'SENSEX:INDEX': '^BSESN',
  BANKNIFTY: '^NSEBANK',
  INDIAVIX: '^INDIAVIX',
}

async function fromYahoo(symbol: string) {
  const ySym = YAHOO_MAP[symbol] || (symbol.includes(':') ? symbol.split(':')[0] + '.NS' : symbol)
  const yahooSym = YAHOO_MAP[symbol] || (symbol.endsWith('.NS') ? symbol : `${symbol.replace(':NSE', '')}.NS`)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=6mo`
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!r.ok) return null
  const json = await r.json()
  const result = json?.chart?.result?.[0]
  if (!result?.timestamp) return null
  const q = result.indicators?.quote?.[0]
  const values = []
  for (let i = 0; i < result.timestamp.length; i++) {
    if (q.close[i] == null) continue
    const d = new Date(result.timestamp[i] * 1000)
    const ds = d.toISOString().slice(0, 10)
    values.push({
      datetime: ds,
      open: String(q.open[i] ?? q.close[i]),
      high: String(q.high[i] ?? q.close[i]),
      low: String(q.low[i] ?? q.close[i]),
      close: String(q.close[i]),
      volume: q.volume?.[i] != null ? String(q.volume[i]) : undefined,
    })
  }
  values.reverse()
  return {
    meta: { symbol, source: 'yahoo' },
    values,
    status: 'ok',
  }
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const symbol = String(req.query.symbol || '')
  const interval = String(req.query.interval || '1day')
  const outputsize = String(req.query.outputsize || '90')
  if (!symbol) {
    res.status(400).json({ error: 'symbol_required' })
    return
  }

  const key = process.env.TWELVEDATA_KEY || process.env.VITE_TWELVEDATA_KEY

  // 1) Try Twelve Data if key present
  if (key) {
    try {
      const url =
        `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}` +
        `&interval=${interval}&outputsize=${outputsize}&apikey=${key}`
      const r = await fetch(url)
      const json = await r.json()
      if (json?.values && json.status !== 'error') {
        res.status(200).json(json)
        return
      }
      // invalid symbol or rate limit → fall through to Yahoo
    } catch {
      /* fall through */
    }
  }

  // 2) Yahoo fallback (good for Nifty/Sensex/NSE stocks)
  try {
    const y = await fromYahoo(symbol)
    if (y) {
      res.status(200).json(y)
      return
    }
  } catch {
    /* fall through */
  }

  res.status(404).json({
    error: 'no_data',
    message: 'No data from Twelve Data or Yahoo for this symbol',
    symbol,
  })
}

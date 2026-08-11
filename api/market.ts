type Req = { method?: string; query: Record<string, string | string[] | undefined> }
type Res = {
  setHeader: (k: string, v: string) => void
  status: (n: number) => { json: (b: unknown) => unknown; end: () => void }
  end: () => void
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const key = process.env.TWELVEDATA_KEY || process.env.VITE_TWELVEDATA_KEY
  if (!key) {
    res.status(400).json({ error: 'missing_key', message: 'Set TWELVEDATA_KEY in Vercel env' })
    return
  }

  const symbol = String(req.query.symbol || '')
  const interval = String(req.query.interval || '1day')
  const outputsize = String(req.query.outputsize || '90')
  if (!symbol) {
    res.status(400).json({ error: 'symbol_required' })
    return
  }

  try {
    const url =
      `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}` +
      `&interval=${interval}&outputsize=${outputsize}&apikey=${key}`
    const r = await fetch(url)
    const json = await r.json()
    res.status(200).json(json)
  } catch {
    res.status(500).json({ error: 'upstream_failed' })
  }
}

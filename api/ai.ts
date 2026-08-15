type Req = {
  method?: string
  body?: string
}
type Res = {
  setHeader: (k: string, v: string) => void
  status: (n: number) => { json: (b: unknown) => unknown; end: () => void }
  end: () => void
}

async function getNiftySnippet(): Promise<string> {
  try {
    const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
    // relative won't work on server — fetch yahoo directly
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1d&range=5d'
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!r.ok) return ''
    const j = await r.json()
    const res = j?.chart?.result?.[0]
    const q = res?.indicators?.quote?.[0]
    const closes = (q?.close || []).filter((x: number) => x != null)
    if (closes.length < 2) return ''
    const last = closes[closes.length - 1]
    const prev = closes[closes.length - 2]
    const chg = (((last - prev) / prev) * 100).toFixed(2)
    return `Latest Nifty 50 (delayed): ${last.toFixed(2)} (${Number(chg) >= 0 ? '+' : ''}${chg}% vs prior session).`
  } catch {
    return ''
  }
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }

  const key = process.env.OPENAI_API_KEY
  if (!key) {
    res.status(400).json({
      error: 'missing_key',
      message: 'Set OPENAI_API_KEY in Vercel Environment Variables, then Redeploy.',
    })
    return
  }

  let body: { messages?: { role: string; content: string }[]; question?: string }
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body) || {}
  } catch {
    res.status(400).json({ error: 'bad_json' })
    return
  }

  const userMessages = body.messages || []
  const question = body.question || userMessages[userMessages.length - 1]?.content || ''
  if (!question) {
    res.status(400).json({ error: 'empty' })
    return
  }

  const nifty = await getNiftySnippet()

  const system = `You are Novaforge AI Copilot — a personal educational assistant for Indian markets (Nifty, Sensex, F&O context, stocks).
Rules:
- Educational decision support only. NOT investment advice. Never guarantee profits.
- Be concise, practical, structured.
- Prefer levels, risk, invalidation, and scenario thinking over "buy this tip".
- User trades on Groww / IND Money; you only help thinking.
- If data is incomplete, say so.
${nifty ? `Market context: ${nifty}` : ''}`

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 700,
        messages: [
          { role: 'system', content: system },
          ...userMessages.slice(-8).map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
        ],
      }),
    })
    const json = await r.json()
    if (!r.ok) {
      res.status(500).json({
        error: 'openai_error',
        message: json?.error?.message || 'OpenAI request failed',
      })
      return
    }
    const content =
      json?.choices?.[0]?.message?.content ||
      'No response. Try again.'
    res.status(200).json({ content, model: 'gpt-4o-mini' })
  } catch {
    res.status(500).json({ error: 'upstream_failed' })
  }
}

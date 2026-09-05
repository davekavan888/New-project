type Req = {
  method?: string
  body?: string | Record<string, unknown>
  headers?: Record<string, string | string[] | undefined>
}
type Res = {
  setHeader: (k: string, v: string) => void
  status: (n: number) => { json: (b: unknown) => unknown; end: () => void }
  end: () => void
}

function parseBody(req: Req): Record<string, string> {
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    return (b || {}) as Record<string, string>
  } catch {
    return {}
  }
}

function cookieGet(req: Req, name: string): string | null {
  const raw = req.headers?.cookie
  const str = Array.isArray(raw) ? raw.join(';') : raw || ''
  const parts = str.split(';')
  for (const p of parts) {
    const [k, ...rest] = p.trim().split('=')
    if (k === name) return decodeURIComponent(rest.join('=') || '')
  }
  return null
}

function tokenFor(key: string): string {
  let h = 0
  const s = `novaforge-gate-v1:${key}`
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return `nf_${Math.abs(h).toString(16)}_${key.length}`
}

export default async function handler(req: Req, res: Res) {
  const origin = (req.headers?.origin as string) || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const siteKey = process.env.SITE_ACCESS_KEY || ''
  if (!siteKey) {
    res.status(200).json({ ok: true, locked: false, mode: 'open' })
    return
  }

  const expected = tokenFor(siteKey)

  if (req.method === 'GET') {
    const c = cookieGet(req, 'nf_access')
    res.status(200).json({ ok: c === expected, locked: true, mode: 'personal' })
    return
  }

  if (req.method === 'POST') {
    const body = parseBody(req)
    if (body.action === 'logout') {
      res.setHeader('Set-Cookie', 'nf_access=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure')
      res.status(200).json({ ok: true, cleared: true })
      return
    }
    const provided = (body.key || '').trim()
    if (provided !== siteKey) {
      res.status(401).json({ ok: false, error: 'invalid_key' })
      return
    }
    res.setHeader(
      'Set-Cookie',
      `nf_access=${encodeURIComponent(expected)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure`,
    )
    res.status(200).json({ ok: true, locked: true })
    return
  }

  res.status(405).json({ error: 'method' })
}

/**
 * Angel One SmartAPI session engine
 * Docs: https://smartapi.angelbroking.com/
 * Security: runs ONLY on private server. Never expose password/MPIN/TOTP to React.
 */
import { authenticator } from 'otplib'
import fs from 'fs'
import path from 'path'

const TOKEN_CACHE = path.join(process.cwd(), 'data', 'session.json')

export type AngelSession = {
  jwtToken: string
  refreshToken?: string
  feedToken: string
  clientCode: string
  obtainedAt: number
}

function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function loadCachedSession(): AngelSession | null {
  try {
    ensureDataDir()
    if (!fs.existsSync(TOKEN_CACHE)) return null
    const s = JSON.parse(fs.readFileSync(TOKEN_CACHE, 'utf8')) as AngelSession
    // Angel tokens typically valid for the trading day; refresh if > 20h old
    if (Date.now() - s.obtainedAt > 20 * 60 * 60 * 1000) return null
    return s
  } catch {
    return null
  }
}

function saveSession(s: AngelSession) {
  ensureDataDir()
  fs.writeFileSync(TOKEN_CACHE, JSON.stringify(s, null, 2))
}

export async function loginAngel(): Promise<AngelSession> {
  const apiKey = process.env.ANGEL_API_KEY!
  const clientCode = process.env.ANGEL_CLIENT_CODE!
  const password = process.env.ANGEL_PASSWORD!
  const totpSecret = process.env.ANGEL_TOTP_SECRET
  const totpCode = process.env.ANGEL_TOTP_CODE

  if (!apiKey || !clientCode || !password) {
    throw new Error('Missing ANGEL_API_KEY / ANGEL_CLIENT_CODE / ANGEL_PASSWORD')
  }

  const totp = totpCode || (totpSecret ? authenticator.generate(totpSecret) : '')
  if (!totp) throw new Error('Provide ANGEL_TOTP_SECRET or ANGEL_TOTP_CODE')

  const res = await fetch('https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-UserType': 'USER',
      'X-SourceID': 'WEB',
      'X-ClientLocalIP': '127.0.0.1',
      'X-ClientPublicIP': '127.0.0.1',
      'X-MACAddress': '00:00:00:00:00:00',
      'X-PrivateKey': apiKey,
    },
    body: JSON.stringify({
      clientcode: clientCode,
      password,
      totp,
    }),
  })

  const json = await res.json()
  if (!json?.status || !json?.data?.jwtToken) {
    throw new Error(`Angel login failed: ${json?.message || res.status}`)
  }

  const session: AngelSession = {
    jwtToken: json.data.jwtToken,
    refreshToken: json.data.refreshToken,
    feedToken: json.data.feedToken,
    clientCode,
    obtainedAt: Date.now(),
  }
  saveSession(session)
  return session
}

export async function getSession(): Promise<AngelSession> {
  const cached = loadCachedSession()
  if (cached) return cached
  return loginAngel()
}

/** Schedule-style helper: call at ~09:00 IST from cron on your VPS */
export async function renewSessionAtMarketOpen(): Promise<AngelSession> {
  return loginAngel()
}

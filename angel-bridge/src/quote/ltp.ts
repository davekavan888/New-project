/**
 * Angel SmartAPI REST LTP quote (market-hours near-live)
 */
import type { AngelSession } from '../auth/angelAuth.js'

export type LtpMap = Record<string, number>

function headers(session: AngelSession, apiKey: string) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${session.jwtToken}`,
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-ClientLocalIP': '127.0.0.1',
    'X-ClientPublicIP': '127.0.0.1',
    'X-MACAddress': '00:00:00:00:00:00',
    'X-PrivateKey': apiKey,
  }
}

export async function fetchLtp(
  session: AngelSession,
  apiKey: string,
  tokenToSymbol: Record<string, string>,
): Promise<{ ltp: LtpMap; raw?: unknown; error?: string }> {
  const tokens = Object.keys(tokenToSymbol)
  if (!tokens.length) return { ltp: {}, error: 'no_tokens' }

  try {
    const res = await fetch(
      'https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/',
      {
        method: 'POST',
        headers: headers(session, apiKey),
        body: JSON.stringify({
          mode: 'LTP',
          exchangeTokens: { NSE: tokens },
        }),
      },
    )
    const json = await res.json()
    if (!json?.status) {
      return { ltp: {}, error: json?.message || `quote_http_${res.status}`, raw: json }
    }

    const ltp: LtpMap = {}
    const fetched = json?.data?.fetched || json?.data || []
    const list = Array.isArray(fetched) ? fetched : []
    for (const row of list) {
      const tok = String(row.symbolToken || row.token || '')
      const sym = tokenToSymbol[tok] || row.tradingSymbol || tok
      const price = Number(row.ltp ?? row.last_traded_price ?? row.lastPrice)
      if (sym && Number.isFinite(price)) ltp[sym] = price
    }
    return { ltp, raw: json }
  } catch (e) {
    return { ltp: {}, error: String(e) }
  }
}

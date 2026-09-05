/**
 * Angel SmartAPI REST LTP — indices use known tokens
 */
import type { AngelSession } from '../auth/angelAuth.js'

export type LtpMap = Record<string, number>

/** Official-style index tokens used by Angel (NSE) */
export const INDEX_TOKENS: Record<string, string> = {
  NIFTY: '99926000',
  BANKNIFTY: '99926009',
  // alternates sometimes used
  NIFTY_ALT: '99926011',
  BANKNIFTY_ALT: '99926009',
}

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

function parseFetched(json: any, tokenToSymbol: Record<string, string>): LtpMap {
  const ltp: LtpMap = {}
  const data = json?.data
  let list: any[] = []
  if (Array.isArray(data?.fetched)) list = data.fetched
  else if (Array.isArray(data?.unfetched) && Array.isArray(data?.fetched)) list = data.fetched
  else if (Array.isArray(data)) list = data
  else if (data && typeof data === 'object') {
    // sometimes map by token
    for (const [k, v] of Object.entries(data)) {
      if (v && typeof v === 'object' && ('ltp' in (v as object) || 'last_traded_price' in (v as object))) {
        list.push({ symbolToken: k, ...(v as object) })
      }
    }
  }

  for (const row of list) {
    const tok = String(row.symbolToken ?? row.token ?? row.symboltoken ?? '')
    const sym =
      tokenToSymbol[tok] ||
      (String(row.tradingSymbol || row.symbol || '').toUpperCase().includes('BANK')
        ? 'BANKNIFTY'
        : String(row.tradingSymbol || row.symbol || '').toUpperCase().includes('NIFTY')
          ? 'NIFTY'
          : tok)
    const price = Number(row.ltp ?? row.last_traded_price ?? row.lastPrice ?? row.close)
    if (sym && Number.isFinite(price) && price > 0) {
      if (sym === 'NIFTY' || sym === 'BANKNIFTY' || tokenToSymbol[tok]) {
        ltp[sym === tok ? tokenToSymbol[tok] || sym : sym] = price
      }
    }
  }
  return ltp
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

    if (json?.status === false || json?.success === false) {
      return {
        ltp: {},
        error: json?.message || json?.errorcode || `quote_failed_${res.status}`,
        raw: { message: json?.message, errorcode: json?.errorcode },
      }
    }

    const ltp = parseFetched(json, tokenToSymbol)
    if (!Object.keys(ltp).length) {
      return {
        ltp: {},
        error: 'empty_ltp_parse',
        raw: {
          message: json?.message,
          keys: json?.data ? Object.keys(json.data) : [],
          sample: JSON.stringify(json?.data).slice(0, 400),
        },
      }
    }
    return { ltp, raw: { ok: true } }
  } catch (e) {
    return { ltp: {}, error: String(e) }
  }
}

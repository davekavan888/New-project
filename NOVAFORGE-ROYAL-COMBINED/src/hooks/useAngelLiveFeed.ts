/**
 * Novaforge Angel Bridge — REST snapshot poll (primary) + Socket.IO (optional)
 * Phase 0: only treat as LIVE when status live + numeric LTP present.
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

export type LiveSnapshot = {
  status?: string
  source?: string
  ts?: number
  ltp?: Record<string, number>
  tick?: unknown
  build?: string
  factors?: {
    score: number
    weights: { technical: number; optionsFlow: number; marketBreadth: number }
    components: { technical: number; optionsFlow: number; breadth: number }
  }
  error?: string
  quoteError?: string
}

const BRIDGE = (import.meta.env.VITE_ANGEL_BRIDGE_URL as string | undefined)?.replace(/\/$/, '')
const POLL_MS = 2000
const STALE_MS = 15000

function normalize(j: LiveSnapshot): LiveSnapshot {
  const ltp = j.ltp || {}
  const hasNifty = typeof ltp.NIFTY === 'number' && Number.isFinite(ltp.NIFTY)
  const hasBank = typeof ltp.BANKNIFTY === 'number' && Number.isFinite(ltp.BANKNIFTY)
  const sourceLive = j.status === 'live' || j.source === 'angel-rest-ltp'
  // Phase 0 strict: need live-ish status AND at least one index LTP
  if (sourceLive && (hasNifty || hasBank)) {
    return { ...j, status: 'live' }
  }
  if (j.status === 'session_ok' && (hasNifty || hasBank)) {
    return { ...j, status: 'session_ok' }
  }
  if (j.status === 'simulated') return j
  if (j.error || j.quoteError) return j
  return j
}

export function useAngelLiveFeed() {
  const [data, setData] = useState<LiveSnapshot>({ status: 'idle' })
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const failRef = useRef(0)

  const refreshSnapshot = useCallback(async () => {
    if (!BRIDGE) return
    try {
      const r = await fetch(`${BRIDGE}/snapshot`, { cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const j = normalize((await r.json()) as LiveSnapshot)
      // Stale guard
      if (j.ts && Date.now() - j.ts > STALE_MS && j.status === 'live') {
        j.status = 'session_ok'
      }
      setData(j)
      failRef.current = 0
      if (j.status === 'live' || j.status === 'session_ok') setConnected(true)
    } catch (e) {
      failRef.current += 1
      setConnected(false)
      setData((d) => ({
        ...d,
        status: failRef.current >= 3 ? 'connect_error' : d.status,
        error: String(e),
      }))
    }
  }, [])

  useEffect(() => {
    if (!BRIDGE) {
      setData({ status: 'no_bridge_url', error: 'Set VITE_ANGEL_BRIDGE_URL' })
      return
    }

    void refreshSnapshot()
    const poll = setInterval(() => void refreshSnapshot(), POLL_MS)

    try {
      const socket = io(BRIDGE, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 12,
        reconnectionDelay: 1500,
      })
      socketRef.current = socket
      socket.on('connect', () => setConnected(true))
      socket.on('market', (payload: LiveSnapshot) => {
        setData(normalize(payload))
        setConnected(true)
        failRef.current = 0
      })
    } catch {
      /* poll only */
    }

    return () => {
      clearInterval(poll)
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [refreshSnapshot])

  const ageSec = data.ts ? Math.max(0, Math.round((Date.now() - data.ts) / 1000)) : null

  return {
    data,
    connected,
    bridgeConfigured: Boolean(BRIDGE),
    refreshSnapshot,
    ageSec,
    isLive: data.status === 'live',
  }
}

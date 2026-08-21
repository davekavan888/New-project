/**
 * Novaforge Angel Bridge — REST snapshot poll (primary) + Socket.IO (optional)
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
const POLL_MS = 3000

export function useAngelLiveFeed() {
  const [data, setData] = useState<LiveSnapshot>({ status: 'idle' })
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  const refreshSnapshot = useCallback(async () => {
    if (!BRIDGE) return
    try {
      const r = await fetch(`${BRIDGE}/snapshot`, { cache: 'no-store' })
      const j = (await r.json()) as LiveSnapshot
      setData(j)
      if (j.status === 'live' || j.status === 'session_ok') {
        setConnected(true)
      }
    } catch (e) {
      setConnected(false)
      setData((d) => ({
        ...d,
        status: d.status === 'live' ? d.status : 'connect_error',
        error: String(e),
      }))
    }
  }, [])

  useEffect(() => {
    if (!BRIDGE) {
      setData({ status: 'no_bridge_url', error: 'Set VITE_ANGEL_BRIDGE_URL' })
      return
    }

    // Immediate + interval REST poll (reliable behind Railway)
    void refreshSnapshot()
    const poll = setInterval(() => void refreshSnapshot(), POLL_MS)

    // Optional Socket.IO (may fail CORS; poll still works)
    try {
      const socket = io(BRIDGE, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      })
      socketRef.current = socket
      socket.on('connect', () => setConnected(true))
      socket.on('disconnect', () => {
        /* keep poll */
      })
      socket.on('market', (payload: LiveSnapshot) => {
        setData(payload)
        setConnected(true)
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

  return {
    data,
    connected,
    bridgeConfigured: Boolean(BRIDGE),
    refreshSnapshot,
  }
}

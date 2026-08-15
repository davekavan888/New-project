/**
 * Connect React UI to Novaforge Angel Bridge (Socket.IO).
 * Set VITE_ANGEL_BRIDGE_URL=https://your-bridge.example.com
 */
import { useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

export type LiveSnapshot = {
  status?: string
  ts?: number
  ltp?: Record<string, number>
  tick?: unknown
  factors?: {
    score: number
    weights: { technical: number; optionsFlow: number; marketBreadth: number }
    components: { technical: number; optionsFlow: number; breadth: number }
  }
  error?: string
}

const BRIDGE = import.meta.env.VITE_ANGEL_BRIDGE_URL as string | undefined

export function useAngelLiveFeed() {
  const [data, setData] = useState<LiveSnapshot>({ status: 'idle' })
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!BRIDGE) {
      setData({ status: 'no_bridge_url', error: 'Set VITE_ANGEL_BRIDGE_URL' })
      return
    }

    let socket: Socket | null = io(BRIDGE, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1500,
    })

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('market', (payload: LiveSnapshot) => setData(payload))
    socket.on('connect_error', (err) => {
      setData({ status: 'connect_error', error: err.message })
    })

    const hb = setInterval(() => socket?.emit('heartbeat'), 25000)

    return () => {
      clearInterval(hb)
      socket?.disconnect()
      socket = null
    }
  }, [])

  const refreshSnapshot = useCallback(async () => {
    if (!BRIDGE) return
    try {
      const r = await fetch(`${BRIDGE}/snapshot`)
      const j = await r.json()
      setData(j)
    } catch (e) {
      setData((d) => ({ ...d, error: String(e) }))
    }
  }, [])

  return { data, connected, bridgeConfigured: Boolean(BRIDGE), refreshSnapshot }
}

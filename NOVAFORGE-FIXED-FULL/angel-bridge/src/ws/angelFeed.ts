/**
 * Angel SmartWebSocketV2-style feed client (binary/json variants evolve — adapt version field as needed).
 * Reference: Angel SmartAPI WebSocket V2 documentation.
 */
import WebSocket from 'ws'
import type { AngelSession } from '../auth/angelAuth.js'

export type TickHandler = (tick: Record<string, unknown>) => void

export class AngelFeed {
  private ws: WebSocket | null = null
  private heartbeat: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private tokens: string[] = []

  constructor(
    private session: AngelSession,
    private apiKey: string,
    private onTick: TickHandler,
  ) {}

  connect(tokens: string[]) {
    this.tokens = tokens
    // Endpoint may vary by Angel API version — confirm in latest SmartAPI docs
    const url = `wss://smartapisocket.angelone.in/smart-stream`
    this.ws = new WebSocket(url)

    this.ws.on('open', () => {
      const authMsg = {
        correlationID: 'novaforge',
        action: 1, // subscribe
        params: {
          mode: 3, // snapquote / full — check docs
          tokenList: [
            { exchangeType: 1, tokens }, // NSE
            // NFO exchangeType often 2
          ],
        },
      }
      // Some builds require login payload first with jwt + feedToken
      const login = {
        action: 1,
        params: {
          mode: 1,
          tokenList: [],
        },
        authorization: this.session.jwtToken,
        feedToken: this.session.feedToken,
        apiKey: this.apiKey,
        clientCode: this.session.clientCode,
      }
      this.ws?.send(JSON.stringify(login))
      this.ws?.send(JSON.stringify(authMsg))
      this.startHeartbeat()
      console.log('[angel-feed] connected, subscribed', tokens.length)
    })

    this.ws.on('message', (buf) => {
      try {
        // Production: parse binary packets per Angel V2 spec
        const text = buf.toString()
        if (text.startsWith('{')) {
          const msg = JSON.parse(text)
          this.onTick(msg)
        } else {
          this.onTick({ raw: text, ts: Date.now() })
        }
      } catch {
        this.onTick({ parseError: true, ts: Date.now() })
      }
    })

    this.ws.on('close', () => {
      console.warn('[angel-feed] closed — reconnecting')
      this.stopHeartbeat()
      this.scheduleReconnect()
    })

    this.ws.on('error', (err) => {
      console.error('[angel-feed]', err.message)
    })
  }

  private startHeartbeat() {
    this.heartbeat = setInterval(() => {
      try {
        this.ws?.ping()
      } catch {
        /* ignore */
      }
    }, 30000)
  }

  private stopHeartbeat() {
    if (this.heartbeat) clearInterval(this.heartbeat)
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect(this.tokens)
    }, 3000)
  }

  disconnect() {
    this.stopHeartbeat()
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
  }
}

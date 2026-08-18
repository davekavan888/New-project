/**
 * Novaforge Angel Bridge — REST LTP poll (no WS)
 */
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { loginAngel } from '../auth/angelAuth.js'
import { refreshScripMaster, loadScripMaster } from '../scrip/mapper.js'
import { directionFactors } from '../calc/metrics.js'
import { fetchLtp } from '../quote/ltp.js'

const PORT = Number(process.env.PORT || process.env.BRIDGE_PORT || 8787)
const origin = process.env.CORS_ORIGIN || '*'
const POLL_MS = Number(process.env.LTP_POLL_MS || 3000)

const app = express()
app.use(cors({ origin, credentials: true }))
app.use(express.json())

const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin, credentials: true } })

let latest: Record<string, unknown> = {
  status: 'starting',
  factors: directionFactors({ technical: 55, optionsFlow: 58, breadth: 56 }),
}

let activeSession: Awaited<ReturnType<typeof loginAngel>> | null = null

/** Fixed Angel index tokens — do not use scrip-master guesses for NIFTY/BANKNIFTY */
let tokenToSymbol: Record<string, string> = {
  '99926000': 'NIFTY',
  '99926009': 'BANKNIFTY',
}

let pollTimer: NodeJS.Timeout | null = null

app.get('/', (_req, res) => {
  res.json({
    service: 'novaforge-angel-bridge',
    ok: true,
    health: '/health',
    snapshot: '/snapshot',
  })
})

app.get('/health', (_req, res) => {
  res.json({ ok: true, latestStatus: latest.status, port: PORT })
})

app.get('/snapshot', (_req, res) => {
  res.json(latest)
})

app.get('/env-check', (_req, res) => {
  const keys = [
    'ANGEL_API_KEY',
    'ANGEL_CLIENT_CODE',
    'ANGEL_PASSWORD',
    'ANGEL_TOTP_SECRET',
    'PORT',
  ] as const
  const report: Record<string, { present: boolean; length: number }> = {}
  for (const k of keys) {
    const v = process.env[k]
    report[k] = {
      present: Boolean(v && String(v).trim()),
      length: v ? String(v).length : 0,
    }
  }
  res.json({ report })
})

app.post('/admin/renew-session', async (_req, res) => {
  try {
    activeSession = await loginAngel()
    latest = { ...latest, status: 'session_ok', renewedAt: Date.now() }
    res.json({ ok: true, at: activeSession.obtainedAt })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) })
  }
})

io.on('connection', (socket) => {
  socket.emit('market', latest)
})

function publish(update: Record<string, unknown>) {
  latest = update
  io.emit('market', latest)
}

async function pollOnce() {
  if (!activeSession || !process.env.ANGEL_API_KEY) return
  try {
    if (Date.now() - activeSession.obtainedAt > 6 * 60 * 60 * 1000) {
      activeSession = await loginAngel()
    }
    const { ltp, error, raw } = await fetchLtp(
      activeSession,
      process.env.ANGEL_API_KEY,
      tokenToSymbol,
    )
    if (error && !Object.keys(ltp).length) {
      publish({
        status: 'session_ok',
        quoteError: error,
        quoteRaw: raw,
        symbols: ['NIFTY', 'BANKNIFTY'],
        tokens: Object.keys(tokenToSymbol),
        ts: Date.now(),
        factors: directionFactors({ technical: 55, optionsFlow: 58, breadth: 56 }),
      })
      return
    }
    if (Object.keys(ltp).length) {
      publish({
        status: 'live',
        source: 'angel-rest-ltp',
        ltp,
        symbols: ['NIFTY', 'BANKNIFTY'],
        tokens: Object.keys(tokenToSymbol),
        ts: Date.now(),
        factors: directionFactors({ technical: 55, optionsFlow: 58, breadth: 56 }),
      })
    }
  } catch (e) {
    publish({ status: 'session_ok', quoteError: String(e), ts: Date.now() })
  }
}

function startLtpPoll() {
  if (pollTimer) clearInterval(pollTimer)
  void pollOnce()
  pollTimer = setInterval(() => void pollOnce(), POLL_MS)
}

async function boot() {
  try {
    try {
      await refreshScripMaster()
    } catch {
      try {
        loadScripMaster()
      } catch {
        /* ignore */
      }
    }

    if (
      !process.env.ANGEL_API_KEY ||
      !process.env.ANGEL_CLIENT_CODE ||
      !process.env.ANGEL_PASSWORD
    ) {
      publish({
        status: 'error',
        error: 'Missing ANGEL_API_KEY / ANGEL_CLIENT_CODE / ANGEL_PASSWORD',
        ts: Date.now(),
      })
      return
    }

    activeSession = await loginAngel()
    publish({
      status: 'session_ok',
      symbols: ['NIFTY', 'BANKNIFTY'],
      tokens: Object.keys(tokenToSymbol),
      ts: Date.now(),
      factors: directionFactors({ technical: 55, optionsFlow: 58, breadth: 56 }),
    })
    startLtpPoll()
  } catch (e) {
    console.error('Boot error', e)
    publish({ status: 'error', error: String(e), ts: Date.now() })
  }
}

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Novaforge Angel Bridge listening on 0.0.0.0:${PORT}`)
  void boot()
})

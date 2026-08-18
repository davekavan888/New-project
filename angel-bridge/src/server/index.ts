/**
 * Novaforge Angel Bridge — REST LTP poll + Socket.IO
 */
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { getSession, renewSessionAtMarketOpen, loginAngel } from '../auth/angelAuth.js'
import { refreshScripMaster, tokenForSymbol, loadScripMaster } from '../scrip/mapper.js'
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

let activeSession: Awaited<ReturnType<typeof getSession>> | null = null
let tokenToSymbol: Record<string, string> = {}
let pollTimer: NodeJS.Timeout | null = null

app.get('/', (_req, res) => {
  res.json({
    service: 'novaforge-angel-bridge',
    ok: true,
    health: '/health',
    snapshot: '/snapshot',
    port: PORT,
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
    'CORS_ORIGIN',
    'PORT',
    'SUBSCRIBE_SYMBOLS',
  ] as const
  const report: Record<string, { present: boolean; length: number }> = {}
  for (const k of keys) {
    const v = process.env[k]
    report[k] = { present: Boolean(v && String(v).trim()), length: v ? String(v).length : 0 }
  }
  res.json({ report, nodeEnv: process.env.NODE_ENV || null })
})

app.post('/admin/renew-session', async (_req, res) => {
  try {
    activeSession = await loginAngel()
    latest = { ...latest, status: 'session_ok', renewedAt: Date.now() }
    res.json({ ok: true, clientCode: activeSession.clientCode, at: activeSession.obtainedAt })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) })
  }
})

app.post('/admin/refresh-scrip', async (_req, res) => {
  try {
    const n = await refreshScripMaster()
    res.json({ ok: true, rows: n })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) })
  }
})

io.on('connection', (socket) => {
  socket.emit('market', latest)
  socket.on('heartbeat', () => socket.emit('heartbeat', { t: Date.now() }))
})

function publish(update: Record<string, unknown>) {
  latest = update
  io.emit('market', latest)
}

async function pollOnce() {
  if (!activeSession || !process.env.ANGEL_API_KEY) return
  if (!Object.keys(tokenToSymbol).length) return

  try {
    // Refresh session if older than 6 hours
    if (Date.now() - activeSession.obtainedAt > 6 * 60 * 60 * 1000) {
      activeSession = await loginAngel()
    }

    const { ltp, error } = await fetchLtp(activeSession, process.env.ANGEL_API_KEY, tokenToSymbol)
    if (error && !Object.keys(ltp).length) {
      publish({
        status: 'session_ok',
        quoteError: error,
        symbols: Object.values(tokenToSymbol),
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
        symbols: Object.values(tokenToSymbol),
        tokens: Object.keys(tokenToSymbol),
        ts: Date.now(),
        factors: directionFactors({
          technical: 55,
          optionsFlow: 58,
          breadth: 56,
        }),
      })
    }
  } catch (e) {
    publish({
      status: 'session_ok',
      quoteError: String(e),
      ts: Date.now(),
    })
  }
}

function startLtpPoll() {
  if (pollTimer) clearInterval(pollTimer)
  pollOnce()
  pollTimer = setInterval(pollOnce, POLL_MS)
}

function startSimulated() {
  setInterval(() => {
    if (latest.status === 'live' || latest.status === 'session_ok') return
    publish({
      status: 'simulated',
      ltp: {
        NIFTY: 24350 + Math.random() * 20,
        BANKNIFTY: 51200 + Math.random() * 40,
      },
      factors: directionFactors({
        technical: 50 + Math.random() * 20,
        optionsFlow: 50 + Math.random() * 20,
        breadth: 50 + Math.random() * 20,
      }),
      ts: Date.now(),
      note: 'Simulated until Angel session succeeds',
    })
  }, 3000)
}

async function boot() {
  try {
    try {
      await refreshScripMaster()
    } catch (e) {
      console.warn('Scrip refresh skipped', e)
      try {
        loadScripMaster()
      } catch {
        /* empty */
      }
    }

    const hasKeys =
      process.env.ANGEL_API_KEY && process.env.ANGEL_CLIENT_CODE && process.env.ANGEL_PASSWORD

    if (!hasKeys) {
      publish({
        status: 'error',
        error: 'Missing ANGEL_API_KEY / ANGEL_CLIENT_CODE / ANGEL_PASSWORD',
        ts: Date.now(),
      })
      startSimulated()
      return
    }

    activeSession = await loginAngel() // fresh JWT each boot for quote API
    const symbols = (process.env.SUBSCRIBE_SYMBOLS || 'NIFTY,BANKNIFTY')
      .split(',')
      .map((s) => s.trim())

    // Prefer official Angel index tokens (scrip map often wrong for indices)
    tokenToSymbol = {
      '99926000': 'NIFTY',
      '99926009': 'BANKNIFTY',
    }
    // Also try alternate Nifty token if needed later
    for (const sym of symbols) {
      const tok = tokenForSymbol(sym)
      if (tok && !Object.values(tokenToSymbol).includes(sym)) {
        tokenToSymbol[tok] = sym
      }
    }

    publish({
      status: 'session_ok',
      symbols: Object.values(tokenToSymbol),
      tokens: Object.keys(tokenToSymbol),
      ts: Date.now(),
      factors: directionFactors({ technical: 55, optionsFlow: 58, breadth: 56 }),
    })

    // REST LTP poll = near-live during market hours
    startLtpPoll()
} catch (e) {
    console.error('Boot error', e)
    publish({ status: 'error', error: String(e), ts: Date.now() })
    startSimulated()
  }
}

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Novaforge Angel Bridge listening on 0.0.0.0:${PORT}`)
  boot().catch((e) => {
    console.error('boot fatal', e)
    publish({ status: 'error', error: String(e), ts: Date.now() })
    startSimulated()
  })
})

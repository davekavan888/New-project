/**
 * Novaforge Angel Bridge — Express + Socket.IO
 * Deploy on Railway/Render/VPS. Not for Vercel serverless.
 */
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { getSession, renewSessionAtMarketOpen } from '../auth/angelAuth.js'
import { refreshScripMaster, tokenForSymbol, loadScripMaster } from '../scrip/mapper.js'
import { AngelFeed } from '../ws/angelFeed.js'
import { directionFactors } from '../calc/metrics.js'

// Railway sets PORT; domain may target 8787 — set PORT=8787 in Variables to match
const PORT = Number(process.env.PORT || process.env.BRIDGE_PORT || 8787)
const origin = process.env.CORS_ORIGIN || '*'

const app = express()
app.use(cors({ origin, credentials: true }))
app.use(express.json())

const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin, credentials: true } })

let latest: Record<string, unknown> = {
  status: 'starting',
  factors: directionFactors({ technical: 55, optionsFlow: 58, breadth: 56 }),
}

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

/** Safe: only shows whether keys exist, never values */
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
    const s = await renewSessionAtMarketOpen()
    res.json({ ok: true, clientCode: s.clientCode, at: s.obtainedAt })
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

function startSimulated() {
  setInterval(() => {
    if (latest.status === 'live' || latest.status === 'session_ok') return
    latest = {
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
    }
    io.emit('market', latest)
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
      latest = {
        status: 'error',
        error: 'Missing ANGEL_API_KEY / ANGEL_CLIENT_CODE / ANGEL_PASSWORD',
        ts: Date.now(),
      }
      startSimulated()
      return
    }

    const session = await getSession()
    const symbols = (process.env.SUBSCRIBE_SYMBOLS || 'NIFTY,BANKNIFTY')
      .split(',')
      .map((s) => s.trim())
    const tokens = symbols.map(tokenForSymbol).filter(Boolean) as string[]

    latest = {
      status: 'session_ok',
      symbols,
      tokens,
      ts: Date.now(),
      factors: directionFactors({ technical: 55, optionsFlow: 58, breadth: 56 }),
    }
    io.emit('market', latest)

    if (tokens.length && process.env.ANGEL_API_KEY) {
      try {
        const feed = new AngelFeed(session, process.env.ANGEL_API_KEY, (tick) => {
          latest = {
            status: 'live',
            tick,
            ts: Date.now(),
            factors: directionFactors({ technical: 55, optionsFlow: 60, breadth: 56 }),
          }
          io.emit('market', latest)
        })
        feed.connect(tokens)
      } catch (e) {
        console.error('Feed connect failed', e)
        latest = { ...latest, status: 'session_ok', feedError: String(e) }
        startSimulated()
      }
    } else {
      console.warn('No tokens mapped — simulated')
      startSimulated()
    }
  } catch (e) {
    console.error('Boot error', e)
    latest = { status: 'error', error: String(e), ts: Date.now() }
    startSimulated()
  }
}

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Novaforge Angel Bridge listening on 0.0.0.0:${PORT}`)
  boot().catch((e) => {
    console.error('boot fatal', e)
    latest = { status: 'error', error: String(e), ts: Date.now() }
    startSimulated()
  })
})

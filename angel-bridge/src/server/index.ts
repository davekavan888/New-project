/**
 * Novaforge Angel Bridge — Express + Socket.IO broadcast to React
 * Deploy on a private VPS (Railway/Render/Fly/DigitalOcean). Not for Vercel serverless.
 */
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { getSession, renewSessionAtMarketOpen } from '../auth/angelAuth.js'
import { refreshScripMaster, tokenForSymbol, loadScripMaster } from '../scrip/mapper.js'
import { AngelFeed } from '../ws/angelFeed.js'
import { directionFactors } from '../calc/metrics.js'

const PORT = Number(process.env.PORT || process.env.BRIDGE_PORT || 8787)
const origin = process.env.CORS_ORIGIN || '*'

const app = express()
app.use(cors({ origin }))
app.use(express.json())

const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin } })

let latest: Record<string, unknown> = {
  status: 'starting',
  factors: directionFactors({ technical: 55, optionsFlow: 58, breadth: 56 }),
}

app.get('/', (_req, res) =>
  res.json({
    service: 'novaforge-angel-bridge',
    ok: true,
    health: '/health',
    snapshot: '/snapshot',
  }),
)
app.get('/health', (_req, res) => res.json({ ok: true, latestStatus: latest.status }))
app.get('/snapshot', (_req, res) => res.json(latest))

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

async function boot() {
  try {
    try {
      await refreshScripMaster()
    } catch (e) {
      console.warn('Scrip refresh skipped', e)
      loadScripMaster()
    }

    const session = await getSession()
    const symbols = (process.env.SUBSCRIBE_SYMBOLS || 'NIFTY,BANKNIFTY').split(',').map((s) => s.trim())
    const tokens = symbols.map(tokenForSymbol).filter(Boolean) as string[]

    latest = {
      ...latest,
      status: 'session_ok',
      symbols,
      tokens,
      ts: Date.now(),
    }
    io.emit('market', latest)

    if (tokens.length && process.env.ANGEL_API_KEY) {
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
    } else {
      console.warn('No tokens or API key — snapshot mode only')
      // Demo pulse so UI can be developed without market hours
      setInterval(() => {
        latest = {
          status: 'simulated',
          ltp: { NIFTY: 24350 + Math.random() * 20, BANKNIFTY: 51200 + Math.random() * 40 },
          factors: directionFactors({
            technical: 50 + Math.random() * 20,
            optionsFlow: 50 + Math.random() * 20,
            breadth: 50 + Math.random() * 20,
          }),
          ts: Date.now(),
        }
        io.emit('market', latest)
      }, 2000)
    }
  } catch (e) {
    console.error('Boot error', e)
    latest = { status: 'error', error: String(e), ts: Date.now() }
  }
}

httpServer.listen(PORT, () => {
  console.log(`Novaforge Angel Bridge on :${PORT}`)
  boot()
})

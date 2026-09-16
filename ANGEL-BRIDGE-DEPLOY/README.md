# Novaforge Angel One Bridge

Private microservice: Angel SmartAPI session → WebSocket ticks → Socket.IO → React.

## Security
- Run on a **private VPS** only (not Vercel serverless, not browser).
- Never commit `.env` with password / TOTP secret.
- Prefer hardware/app TOTP; rotate credentials if leaked.

## Setup
```bash
cd angel-bridge
cp .env.example .env
# fill ANGEL_* vars
npm install
npm run scrip:refresh
npm run dev
```

## Cron (09:00 IST daily)
```bash
0 9 * * 1-5 curl -X POST http://127.0.0.1:8787/admin/renew-session
```

## Frontend
Vercel env: `VITE_ANGEL_BRIDGE_URL=https://your-bridge-host`

## Note on WebSocket packet format
Angel SmartWebSocketV2 binary layouts change by version. After login works, validate subscribe packet against the **latest** Angel SmartAPI WebSocket docs and adjust `angelFeed.ts` action/mode/exchangeType fields.

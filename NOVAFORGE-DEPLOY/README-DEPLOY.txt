NOVAFORGE — deploy these on GitHub → Vercel

FILES TO UPLOAD (same paths on GitHub):
  src/App.tsx
  src/pages/ExtraPages.tsx
  src/services/marketEngine.ts   (optional helper; desk works without wiring it)

Vercel env:
  VITE_ANGEL_BRIDGE_URL = https://YOUR-RAILWAY-BRIDGE-URL   (no trailing slash)

HOW TO USE DESK:
  1) Market open, bridge LIVE
  2) Type ORB High + ORB Low after 9:30
  3) CALL only above high, PUT only below low, else WAIT
  4) Lock 5m / 10m / 15m / 30m (different target/stop each)
  5) Scorecard auto HIT/MISS — real only

DO NOT deploy old "quantum 78%" ExtraPages.

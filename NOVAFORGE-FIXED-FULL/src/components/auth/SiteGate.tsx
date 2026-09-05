import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Lock } from 'lucide-react'

/**
 * Personal-use lock. Requires SITE_ACCESS_KEY on Vercel.
 * If env not set → site stays open (dev).
 */
export function SiteGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'loading' | 'open' | 'locked' | 'unlocked'>('loading')
  const [key, setKey] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/gate', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (!j.locked) setState('open')
        else if (j.ok) setState('unlocked')
        else setState('locked')
      })
      .catch(() => setState('open'))
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const r = await fetch('/api/gate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      const j = await r.json()
      if (r.ok && j.ok) setState('unlocked')
      else setErr('Invalid access key')
    } catch {
      setErr('Could not verify key')
    } finally {
      setBusy(false)
    }
  }

  if (state === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-400 text-sm">
        Checking access…
      </div>
    )
  }

  if (state === 'open' || state === 'unlocked') return <>{children}</>

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 mb-4">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold">Personal access</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Novaforge is locked for private use. Enter the access key to continue.
        </p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Access key"
          autoFocus
          className="mt-4 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm outline-none focus:border-indigo-500"
        />
        {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
        <Button type="submit" className="mt-4 w-full" disabled={busy || !key.trim()}>
          {busy ? 'Checking…' : 'Unlock'}
        </Button>
        <p className="mt-4 text-[10px] text-zinc-600">
          Free personal gate — not bank-grade security. Do not share the key publicly.
        </p>
      </form>
    </div>
  )
}

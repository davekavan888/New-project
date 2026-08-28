import { useEffect, useState } from 'react'
import { Download, X, Smartphone, Monitor } from 'lucide-react'
import { canInstallPWA, onInstallAvailability, promptInstallPWA } from '@/pwa'
import { Button } from '@/components/ui/Button'

/**
 * Always visible install entry.
 * Chrome only shows native prompt sometimes; we always show manual steps.
 */
export function InstallAppButton() {
  const [ready, setReady] = useState(canInstallPWA())
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => onInstallAvailability(() => setReady(canInstallPWA())), [])

  const onInstallClick = async () => {
    setBusy(true)
    setMsg('')
    try {
      if (canInstallPWA()) {
        const ok = await promptInstallPWA()
        setMsg(ok ? 'Install started.' : 'Install dismissed. You can use the steps below.')
        setReady(canInstallPWA())
      } else {
        setOpen(true)
        setMsg('Use the steps below for your device.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={onInstallClick} disabled={busy} title="Install Novaforge">
        <Download className="h-3.5 w-3.5" />
        {ready ? 'Install app' : 'Get app'}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(44,36,28,0.45)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-5 shadow-2xl"
            style={{
              background: 'linear-gradient(165deg, #fffdf9, #f3ebe0)',
              borderColor: 'rgba(107,79,58,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-lg font-bold text-[#2c241c]">Install Novaforge</div>
                <div className="text-xs text-[#7a6a5c] mt-0.5">
                  Add to phone or laptop like an app
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-[#7a6a5c] hover:bg-[#a8d4e6]/30"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {ready && (
              <Button
                className="w-full mb-4"
                onClick={async () => {
                  const ok = await promptInstallPWA()
                  setMsg(ok ? 'Install started.' : 'Dismissed — try manual steps.')
                  setReady(canInstallPWA())
                }}
              >
                <Download className="h-4 w-4" />
                Install now
              </Button>
            )}

            {msg && <p className="text-xs text-[#4a3428] mb-3">{msg}</p>}

            <div className="space-y-3 text-sm text-[#2c241c]">
              <div className="rounded-xl border border-[#6b4f3a]/15 bg-[#fffdf9] p-3">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <Smartphone className="h-4 w-4 text-[#5a9a4c]" />
                  Android (Chrome)
                </div>
                <ol className="list-decimal pl-5 space-y-1 text-[#4a3428] text-xs">
                  <li>Open this site in <strong>Chrome</strong> (not Instagram/FB browser).</li>
                  <li>Tap menu <strong>⋮</strong> (top right).</li>
                  <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                  <li>Confirm → Novaforge icon appears on home screen.</li>
                </ol>
              </div>

              <div className="rounded-xl border border-[#6b4f3a]/15 bg-[#fffdf9] p-3">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <Monitor className="h-4 w-4 text-[#7eb8d4]" />
                  Laptop (Chrome / Edge)
                </div>
                <ol className="list-decimal pl-5 space-y-1 text-[#4a3428] text-xs">
                  <li>Open <strong>https://novaforges.in</strong> in Chrome or Edge.</li>
                  <li>Look at the address bar for an <strong>Install</strong> icon (⊕ / monitor).</li>
                  <li>Or menu <strong>⋮</strong> → <strong>Install Novaforge…</strong> / <strong>Apps</strong>.</li>
                  <li>If missing: refresh twice, stay 30 seconds, try again.</li>
                </ol>
              </div>

              <div className="rounded-xl border border-[#6b4f3a]/15 bg-[#eef6fa] p-3">
                <div className="font-semibold mb-1 text-xs">iPhone (Safari)</div>
                <ol className="list-decimal pl-5 space-y-1 text-[#4a3428] text-xs">
                  <li>Open site in <strong>Safari</strong>.</li>
                  <li>Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.</li>
                </ol>
              </div>
            </div>

            <p className="text-[10px] text-[#7a6a5c] mt-3">
              Install is a browser feature. The button appears automatically only on some Chrome sessions;
              the steps above always work.
            </p>
          </div>
        </div>
      )}
    </>
  )
}

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { canInstallPWA, onInstallAvailability, promptInstallPWA } from '@/pwa'
import { Button } from '@/components/ui/Button'

/** Shows when browser fires beforeinstallprompt (Chrome Android / desktop). */
export function InstallAppButton() {
  const [ready, setReady] = useState(canInstallPWA())

  useEffect(() => onInstallAvailability(() => setReady(canInstallPWA())), [])

  if (!ready) return null

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await promptInstallPWA()
        setReady(canInstallPWA())
      }}
      title="Install Novaforge app"
    >
      <Download className="h-3.5 w-3.5" />
      Install app
    </Button>
  )
}

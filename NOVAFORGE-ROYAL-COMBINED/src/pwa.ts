/** Register service worker for installable PWA (Android + desktop Chrome/Edge). */
export function registerPWA() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('PWA SW register failed', err)
    })
  })
}

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

export function setupInstallPrompt() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    listeners.forEach((fn) => fn())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((fn) => fn())
  })
}

export function canInstallPWA() {
  return Boolean(deferred)
}

export function onInstallAvailability(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export async function promptInstallPWA() {
  if (!deferred) return false
  await deferred.prompt()
  const choice = await deferred.userChoice
  deferred = null
  listeners.forEach((fn) => fn())
  return choice.outcome === 'accepted'
}

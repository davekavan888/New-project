import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { useAuthStore } from './stores/auth'
import { SiteGate } from './components/auth/SiteGate'
import './index.css'

const qc = new QueryClient()

function Bootstrap() {
  const init = useAuthStore((s) => s.init)
  useEffect(() => {
    init()
  }, [init])
  return (
    <SiteGate>
      <App />
    </SiteGate>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Bootstrap />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

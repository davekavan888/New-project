import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/Button'
import { LogOut } from 'lucide-react'
import { InstallAppButton } from '@/components/InstallAppButton'

export function AppLayout() {
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh' }}>
      <Sidebar />
      <div className="nf-shell">
        <header className="nf-header">
          <div style={{ fontSize: 13, color: '#5c5348', fontFamily: 'Georgia, serif' }}>
            <span style={{ color: '#1e3a5f', fontWeight: 800 }}>Novaforge</span>
            <span style={{ margin: '0 8px', color: '#c9a227' }}>◆</span>
            <span style={{ color: '#8a6d12', fontWeight: 600 }}>Court of markets</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            <InstallAppButton />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1520' }}>
                {profile?.full_name || 'Trader'}
              </div>
              <div style={{ fontSize: 10, color: '#c9a227', fontWeight: 700 }}>Personal</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut()
                navigate('/login')
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="nf-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

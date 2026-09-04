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
          <div style={{ fontSize: 13, color: '#5a6b82' }}>
            <span style={{ color: '#1a5f9e', fontWeight: 800 }}>Novaforge</span>
            <span style={{ margin: '0 8px', color: '#c9a227' }}>·</span>
            <span style={{ color: '#2d8f6f', fontWeight: 600 }}>Royal desk</span>
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
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f1b2d' }}>
                {profile?.full_name || 'Trader'}
              </div>
              <div style={{ fontSize: 10, color: '#1a5f9e', fontWeight: 600 }}>Personal</div>
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

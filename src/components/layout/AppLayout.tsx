import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/Button'
import { LogOut } from 'lucide-react'

export function AppLayout() {
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh' }}>
      <Sidebar />
      <div className="nf-shell">
        <header className="nf-header">
          <div style={{ fontSize: 13, color: '#7a6a5c' }}>
            <span style={{ color: '#6b4f3a', fontWeight: 700 }}>Novaforge</span>
            <span style={{ margin: '0 8px', color: '#c4b5a5' }}>·</span>
            <span style={{ color: '#5a9a4c' }}>Trading desk</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 650, color: '#2c241c' }}>
                {profile?.full_name || 'Trader'}
              </div>
              <div style={{ fontSize: 10, color: '#7eb8d4', fontWeight: 600 }}>Personal</div>
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

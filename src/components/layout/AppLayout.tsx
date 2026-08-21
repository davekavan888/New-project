import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/Button'
import { LogOut } from 'lucide-react'

export function AppLayout() {
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#07070b' }}>
      <Sidebar />
      <div className="nf-shell">
        <header className="nf-header">
          <div style={{ fontSize: 13, color: '#9a958c' }}>
            <span style={{ color: '#d4a017', fontWeight: 600 }}>Novaforge</span>
            <span style={{ margin: '0 8px', color: '#333' }}>·</span>
            Trading desk
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#ece8e1' }}>
                {profile?.full_name || 'Trader'}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(212,160,23,0.75)' }}>Personal</div>
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

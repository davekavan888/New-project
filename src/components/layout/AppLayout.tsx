import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/Button'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function AppLayout() {
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-6 backdrop-blur">
          <div className="text-sm text-zinc-500">Search stocks, themes, news… (⌘K)</div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium">{profile?.full_name || 'Investor'}</div>
              <div className="text-[10px] text-zinc-500 capitalize">{profile?.role || 'user'} plan</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut()
                navigate('/')
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

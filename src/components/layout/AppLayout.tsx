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
    <div className="min-h-screen bg-[#07070b]">
      <Sidebar />
      <div className="pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-amber-500/10 bg-[#07070b]/90 px-6 backdrop-blur-xl">
          <div className="text-sm text-zinc-500">
            <span className="text-amber-500/90 font-medium">Novaforge</span>
            <span className="mx-2 text-zinc-700">·</span>
            Trading desk
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-zinc-200">{profile?.full_name || 'Trader'}</div>
              <div className="text-[10px] text-amber-600/80">Personal</div>
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
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

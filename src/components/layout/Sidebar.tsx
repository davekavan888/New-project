import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Sunrise,
  Radio,
  Filter,
  Activity,
  Bell,
  Bot,
  Star,
  Settings,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/** Clean trading-only menu */
const items = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/morning', label: 'Morning Brief', icon: Sunrise },
  { to: '/live', label: 'Live Terminal', icon: Radio },
  { to: '/scanners', label: 'Scanners', icon: Filter },
  { to: '/options', label: 'Options', icon: Activity },
  { to: '/institutional', label: 'FII / DII', icon: Building2 },
  { to: '/watchlist', label: 'Watchlist', icon: Star },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/ai', label: 'AI Copilot', icon: Bot },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-amber-500/10 bg-[#0a0a0f]/95 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-2 border-b border-amber-500/10 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-bold text-zinc-950 shadow-lg shadow-amber-500/25">
          N
        </div>
        <div>
          <div className="text-sm font-semibold tracking-wide text-zinc-100">Novaforge</div>
          <div className="text-[10px] text-amber-500/80">Trading desk</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out',
                'hover:translate-x-1 hover:bg-amber-500/10 hover:text-amber-100 hover:shadow-[inset_3px_0_0_0_rgba(245,158,11,0.7)]',
                isActive
                  ? 'bg-amber-500/15 text-amber-100 shadow-[inset_3px_0_0_0_rgba(245,158,11,1)]'
                  : 'text-zinc-400',
              )
            }
          >
            <item.icon
              className={cn(
                'h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110',
              )}
            />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-amber-500/10 p-3 text-[10px] text-zinc-600">
        Personal use · educational only
      </div>
    </aside>
  )
}

import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Globe2, Briefcase, Star, Newspaper, Bot,
  Filter, Settings, Building2, Calendar, Sparkles, Lightbulb, History, Sunrise,
  Activity, Bell, Layers, Rocket, Wallet, TrendingUp, CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/morning', label: 'Morning Brief', icon: Sunrise },
  { to: '/hints', label: 'Next-Step Hints', icon: Lightbulb },
  { to: '/ideas', label: 'Suggested Ideas', icon: Sparkles },
  { to: '/analysis', label: 'Analysis Labs', icon: History },
  { to: '/options', label: 'Options Analytics', icon: Activity },
  { to: '/smart-money', label: 'Smart Money', icon: Wallet },
  { to: '/breadth', label: 'Market Breadth', icon: TrendingUp },
  { to: '/sectors', label: 'Sectors', icon: Layers },
  { to: '/scanners', label: 'Scanners', icon: Filter },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/ipo', label: 'IPO Center', icon: Rocket },
  { to: '/markets', label: 'Markets', icon: Globe2 },
  { to: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { to: '/watchlist', label: 'Watchlist', icon: Star },
  { to: '/institutional', label: 'FII / DII', icon: Building2 },
  { to: '/news', label: 'News', icon: Newspaper },
  { to: '/ai', label: 'AI Copilot', icon: Bot },
  { to: '/themes', label: 'Themes', icon: Sparkles },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/pricing', label: 'Pricing', icon: CreditCard },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold shadow-lg shadow-indigo-500/30">
          N
        </div>
        <div>
          <div className="text-sm font-semibold">Novaforge</div>
          <div className="text-[10px] text-zinc-500">AI market intelligence</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive ? 'bg-indigo-500/15 text-indigo-300' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

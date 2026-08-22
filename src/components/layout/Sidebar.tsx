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
  Target,
} from 'lucide-react'

const items = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/morning', label: 'Morning Brief', icon: Sunrise },
  { to: '/live', label: 'Live Terminal', icon: Radio },
  { to: '/forecast30', label: '30-Min Desk', icon: Target },
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
    <aside className="nf-sidebar">
      <div className="nf-brand">
        <div className="nf-brand-mark">N</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#4a3428', letterSpacing: '0.02em' }}>
            Novaforge
          </div>
          <div style={{ fontSize: 10, color: '#5a9a4c', fontWeight: 600 }}>Trading desk</div>
        </div>
      </div>
      <nav className="nf-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? 'nf-nav-link active' : 'nf-nav-link')}
          >
            <item.icon />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div
        style={{
          borderTop: '1px solid rgba(107,79,58,0.18)',
          padding: 12,
          fontSize: 10,
          color: '#7a6a5c',
          background: 'linear-gradient(90deg, rgba(168,212,230,0.2), rgba(124,188,110,0.12))',
        }}
      >
        Personal use · educational only
      </div>
    </aside>
  )
}

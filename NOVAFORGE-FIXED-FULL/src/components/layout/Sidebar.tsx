import { NavLink } from 'react-router-dom'
import {
  Scale,
  Radio,
  ClipboardCheck,
  Layers,
  Sunrise,
  Settings,
  Landmark,
  Search,
  Newspaper,
} from 'lucide-react'

const items = [
  { to: '/decision', label: 'Decision Desk', icon: Scale },
  { to: '/live', label: 'Live Terminal', icon: Radio },
  { to: '/report-card', label: 'Report Card', icon: ClipboardCheck },
  { to: '/chain', label: 'Nifty Chain', icon: Layers },
  { to: '/morning', label: 'Morning Brief', icon: Sunrise },
  { to: '/ipo', label: 'IPO Desk', icon: Landmark },
  { to: '/search', label: 'Stocks', icon: Search },
  { to: '/news', label: 'News impact', icon: Newspaper },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="nf-sidebar">
      <div className="nf-brand">
        <div className="nf-brand-mark">N</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f1b2d', letterSpacing: '0.02em' }}>
            Novaforge
          </div>
          <div style={{ fontSize: 10, color: '#c9a227', fontWeight: 700 }}>Decision desk</div>
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
          borderTop: '1px solid rgba(15,40,80,0.1)',
          padding: 12,
          fontSize: 10,
          color: '#5a6b82',
          background: 'linear-gradient(90deg, rgba(201,162,39,0.1), rgba(26,95,158,0.06))',
        }}
      >
        Educational · not investment advice
      </div>
    </aside>
  )
}

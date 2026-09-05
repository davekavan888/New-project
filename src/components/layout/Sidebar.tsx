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
  { to: '/search', label: 'Stock Search', icon: Search },
  { to: '/news', label: 'News impact', icon: Newspaper },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="nf-sidebar">
      <div className="nf-brand">
        <div className="nf-brand-mark">N</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#f4f0e6', letterSpacing: '0.04em', fontFamily: 'Georgia, serif' }}>
            Novaforge
          </div>
          <div style={{ fontSize: 10, color: '#c9a227', fontWeight: 700, letterSpacing: '0.06em' }}>
            ROYAL DESK
          </div>
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
          borderTop: '1px solid rgba(201,162,39,0.25)',
          padding: 12,
          fontSize: 10,
          color: 'rgba(244,240,230,0.65)',
          background: 'rgba(201,162,39,0.08)',
          fontFamily: 'Georgia, serif',
        }}
      >
        Educational · not investment advice
      </div>
    </aside>
  )
}

import React, { useState, useEffect } from 'react'
import {
  Activity,
  Search,
  Newspaper,
  Globe,
  Landmark,
  ShieldAlert,
  User,
  Lock,
  ArrowRight,
  History,
  Download,
} from 'lucide-react'
import {
  FoDecisionDesk,
  UniversalStockScreener,
  InstitutionalFlowsDesk,
  VisualNewsWireDesk,
  SectorEtfMatrix,
  RiskProtocolDesk,
  HistoricalReportDesk,
} from '@/pages/ExtraPages'

type Tab =
  | 'fo'
  | 'history'
  | 'screener'
  | 'fii_dii'
  | 'news'
  | 'etf'
  | 'risk'

export function SovereignShell() {
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [currentTab, setCurrentTab] = useState<Tab>('fo')
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [installMsg, setInstallMsg] = useState('')

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const onInstall = async () => {
    if (!deferredPrompt) {
      setInstallMsg(
        'Use browser menu: Install app / Add to Home Screen (Chrome/Edge/Android).',
      )
      return
    }
    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setInstallMsg(
      choice.outcome === 'accepted' ? 'Install started' : 'Install dismissed',
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#050914] via-[#091326] to-[#040812] text-[#F8FAFC] flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-sm bg-[#0D182E] border-2 border-[#D4AF37]/50 rounded-3xl p-8 shadow-2xl">
          <div className="text-center space-y-2 mb-6">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-[#60A5FA] to-[#D4AF37] flex items-center justify-center text-[#070E1C] font-bold text-lg">
              N
            </div>
            <h1 className="text-2xl font-serif font-black tracking-widest text-[#FDFBF7]">
              NOVAFORGE
            </h1>
            <p className="text-[11px] font-mono text-[#60A5FA] uppercase font-bold">
              KD&apos;s Agent Desk
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setIsAuthenticated(true)
            }}
            className="space-y-4 font-mono text-xs"
          >
            <div className="space-y-1">
              <label className="text-[#94A3B8] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#D4AF37]" /> Trader ID
              </label>
              <input
                className="w-full bg-[#070E1C] border border-[#D4AF37]/30 rounded-xl px-3.5 py-2.5 text-[#FDFBF7]"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[#94A3B8] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#D4AF37]" /> Passkey
              </label>
              <input
                type="password"
                className="w-full bg-[#070E1C] border border-[#D4AF37]/30 rounded-xl px-3.5 py-2.5 text-[#FDFBF7]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#60A5FA] text-[#070E1C] font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"
            >
              Unlock <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    )
  }

  const nav: { id: Tab; label: string; icon: typeof Search }[] = [
    { id: 'fo', label: 'F&O · KD Agent', icon: Activity },
    { id: 'history', label: '5-Day Report Card', icon: History },
    { id: 'screener', label: 'Stock Screener', icon: Search },
    { id: 'fii_dii', label: 'FII / DII', icon: Landmark },
    { id: 'news', label: 'India News', icon: Newspaper },
    { id: 'etf', label: 'ETFs', icon: Globe },
    { id: 'risk', label: 'Risk Rules', icon: ShieldAlert },
  ]

  return (
    <div className="min-h-screen bg-[#070E1C] text-[#F8FAFC] flex flex-col md:flex-row font-sans">
      <aside className="w-full md:w-64 bg-[#0D182E] border-r border-[#D4AF37]/20 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-5 border-b border-[#D4AF37]/20 bg-[#12203D]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#60A5FA] to-[#D4AF37] text-[#070E1C] font-bold flex items-center justify-center">
                N
              </div>
              <div>
                <h1 className="font-serif font-black tracking-wider text-base text-[#FDFBF7]">
                  NOVAFORGE
                </h1>
                <p className="text-[10px] font-mono tracking-widest text-[#60A5FA] uppercase font-bold">
                  KD Agent Desk
                </p>
              </div>
            </div>
          </div>
          <nav className="p-3 space-y-1.5 text-xs font-mono font-bold">
            {nav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all ${
                  currentTab === item.id
                    ? 'bg-[#60A5FA] text-[#070E1C] shadow-md'
                    : 'text-[#94A3B8] hover:bg-[#16274A] hover:text-[#F8FAFC]'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-[#D4AF37]/20 space-y-2">
          <button
            type="button"
            onClick={() => void onInstall()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/25"
          >
            <Download className="w-4 h-4" /> Install App
          </button>
          {installMsg ? (
            <p className="text-[10px] text-[#94A3B8] leading-snug">{installMsg}</p>
          ) : (
            <p className="text-[10px] text-[#64748B]">
              Phone/Desktop: install for home-screen access
            </p>
          )}
          <button
            type="button"
            onClick={() => setIsAuthenticated(false)}
            className="text-[11px] text-[#94A3B8] hover:text-[#D4AF37]"
          >
            Lock desk
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-[#D4AF37]/20 bg-[#0D182E] px-5 flex items-center justify-between shrink-0">
          <div className="text-xs font-mono text-[#94A3B8] truncate">
            <span className="text-[#60A5FA] font-bold">NOVAFORGE</span>
            <span className="mx-2">/</span>
            <span className="text-[#F8FAFC]">
              {nav.find((n) => n.id === currentTab)?.label}
            </span>
          </div>
        </header>
        <main className="flex-1 p-5 overflow-y-auto bg-[#070E1C]">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'fo' && <FoDecisionDesk />}
            {currentTab === 'history' && <HistoricalReportDesk />}
            {currentTab === 'screener' && <UniversalStockScreener />}
            {currentTab === 'fii_dii' && <InstitutionalFlowsDesk />}
            {currentTab === 'news' && <VisualNewsWireDesk />}
            {currentTab === 'etf' && <SectorEtfMatrix />}
            {currentTab === 'risk' && <RiskProtocolDesk />}
          </div>
        </main>
      </div>
    </div>
  )
}

export default SovereignShell

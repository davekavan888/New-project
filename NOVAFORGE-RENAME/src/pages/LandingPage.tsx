import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Bot, LineChart, Shield, Zap, Brain, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const features = [
  { icon: Brain, title: 'AI Research Engine', desc: 'Institutional-style research notes and decision support.' },
  { icon: LineChart, title: 'Market Intelligence', desc: 'India + global indices, quotes, and sector views.' },
  { icon: BarChart3, title: 'Portfolio Command', desc: 'Holdings, P&L, concentration and risk notes.' },
  { icon: Shield, title: 'Institutional Tracker', desc: 'FII/DII style flows and ownership context.' },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <nav className="fixed top-0 z-50 w-full border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold">O</div>
            <span className="font-semibold">Novaforge</span>
          </div>
          <div className="flex gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/signup"><Button size="sm">Get started</Button></Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden pt-28 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.15),_transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300">
              <Zap className="h-3 w-3" /> From zero. Forged for the world.
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Invest with <span className="text-gradient">institutional intelligence</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-zinc-400">
              Live-style markets, AI research, portfolio risk, and institutional flows — in one premium system.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link to="/signup"><Button size="lg" className="gap-2">Start free <ArrowRight className="h-4 w-4" /></Button></Link>
              <Link to="/login"><Button size="lg" variant="outline">Sign in</Button></Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-t border-zinc-800 py-16">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="glass-card rounded-xl p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-zinc-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-500">
        Novaforge © 2026 — Built for serious investors
      </footer>
    </div>
  )
}

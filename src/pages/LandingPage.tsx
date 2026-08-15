import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { motion } from 'framer-motion'
import { ArrowRight, Zap, Building2, Activity, Bell, Brain, Shield } from 'lucide-react'

const FEATURES = [
  { icon: Building2, title: 'Institutional flows', desc: 'FII/DII context and smart-money style trackers.' },
  { icon: Activity, title: 'Options analytics', desc: 'PCR, max pain, OI direction and zone maps.' },
  { icon: Brain, title: 'AI Copilot', desc: 'Ask why the market moved — educational answers.' },
  { icon: Bell, title: 'Alert center', desc: 'Price, PCR, score and sector style alerts.' },
  { icon: Zap, title: 'Scanners', desc: 'Breakout, momentum, volume and build-up lists.' },
  { icon: Shield, title: 'Risk-first design', desc: 'Max-loss framing and clear disclaimers.' },
]

const FAQS = [
  { q: 'Is this investment advice?', a: 'No. Novaforge is educational market intelligence. You decide and trade on your own broker.' },
  { q: 'Is data real-time?', a: 'Core feeds are delayed/session-based on free tiers. Paid data can be added later.' },
  { q: 'Can I sell subscriptions?', a: 'Pricing page is ready; connect Razorpay/Stripe when you go commercial.' },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 font-bold shadow-lg shadow-indigo-500/30">N</div>
          <span className="font-semibold">Novaforge</span>
        </div>
        <div className="flex gap-2">
          <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
          <Link to="/signup"><Button>Start free</Button></Link>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 pb-20 pt-12 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.2),_transparent_55%)]" />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300">
            <Zap className="h-3 w-3" /> Indian market intelligence
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            See where <span className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">smart money</span> moves before the crowd
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            AI-powered market intelligence, institutional tracking, options context and professional alerts for serious traders.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/signup"><Button size="lg" className="gap-2">Start free trial <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link to="/login"><Button size="lg" variant="outline">Open dashboard</Button></Link>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-center text-2xl font-bold mb-8">Built for clarity under pressure</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <f.icon className="h-6 w-6 text-indigo-400 mb-3" />
              <div className="font-semibold">{f.title}</div>
              <p className="text-sm text-zinc-400 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-center text-2xl font-bold mb-2">Simple pricing</h2>
        <p className="text-center text-sm text-zinc-500 mb-8">Start free · upgrade when you need AI & alerts</p>
        <div className="grid gap-4 md:grid-cols-3 max-w-4xl mx-auto">
          {[
            ['Free', '₹0', 'Morning Brief, screeners, news'],
            ['Premium', '₹999/mo', 'AI Copilot, options, alerts'],
            ['Pro', '₹2,499/mo', 'Full suite + priority'],
          ].map(([n, p, d]) => (
            <div key={n} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
              <div className="text-sm text-zinc-400">{n}</div>
              <div className="text-3xl font-bold mt-1">{p}</div>
              <p className="text-xs text-zinc-500 mt-2">{d}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-6">
          <Link to="/pricing" className="text-sm text-indigo-400">View full pricing →</Link>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <h2 className="text-center text-2xl font-bold mb-8">FAQ</h2>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-xl border border-zinc-800 p-4">
              <div className="font-medium">{f.q}</div>
              <p className="text-sm text-zinc-400 mt-1">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-8 text-center text-xs text-zinc-500">
        Novaforge © {new Date().getFullYear()} — Educational market intelligence. Not investment advice.
      </footer>
    </div>
  )
}

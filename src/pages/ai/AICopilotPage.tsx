import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Bot, Send, User } from 'lucide-react'
import { cn } from '@/lib/utils'

type Msg = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'Analyse banking sector outlook',
  'Compare TCS vs Infosys',
  'What are key risks in my portfolio?',
  'Summarise FII trends this week',
]

function reply(q: string): string {
  const lower = q.toLowerCase()
  if (lower.includes('risk')) {
    return 'Portfolio risk appears moderate. Top concentration is in Financials + Technology. Consider monitoring single-stock weight and sector overlap. VaR-style daily move estimate is roughly 1–2% under normal conditions. This is decision support, not advice.'
  }
  if (lower.includes('tcs') || lower.includes('infosys') || lower.includes('compare')) {
    return 'TCS typically trades at a quality premium with stronger margins and return profile; Infosys often offers relatively better growth optionality at times. Compare on: revenue growth, EBIT margin, deal wins, and valuation (P/E, EV/EBITDA). Prefer the name that matches your horizon and risk budget.'
  }
  if (lower.includes('fii') || lower.includes('flow')) {
    return 'Recent sessions show FII activity turning more constructive after a selling stretch, while DII remains a steady domestic bid. Watch the next 5 sessions for confirmation. Pair with Nifty levels and banking leadership for context.'
  }
  return 'ORIONIS view: setup looks constructive with supportive flows and selective sector strength (Banks/IT). Keep position sizing disciplined and use levels for adds/trims. Ask me about a specific ticker, sector, or risk question for a tighter read.\n\n(Demo AI — connect OpenAI key in production for live models.)'
}

export function AICopilotPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Hello. I am ORIONIS AI Copilot. Ask about stocks, sectors, portfolio risk, or market structure.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (text?: string) => {
    const content = (text || input).trim()
    if (!content || loading) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content }])
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    setMessages((m) => [...m, { role: 'assistant', content: reply(content) }])
    setLoading(false)
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bot className="h-6 w-6 text-indigo-400" /> AI Copilot</h1>
        <p className="text-sm text-zinc-400">Research & decision intelligence</p>
      </div>
      <Card className="flex flex-1 flex-col overflow-hidden p-0">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={cn('flex gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'assistant' && <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300"><Bot className="h-4 w-4" /></div>}
              <div className={cn('max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap', m.role === 'user' ? 'bg-indigo-500 text-white rounded-br-md' : 'bg-zinc-800 text-zinc-100 rounded-bl-md')}>{m.content}</div>
              {m.role === 'user' && <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-700"><User className="h-4 w-4" /></div>}
            </div>
          ))}
          {loading && <div className="text-sm text-zinc-500 pl-11">Thinking…</div>}
          <div ref={endRef} />
        </div>
        {messages.length < 3 && (
          <div className="flex flex-wrap gap-2 px-4 pb-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:border-indigo-500/50 hover:text-indigo-300">{s}</button>
            ))}
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); send() }} className="flex gap-2 border-t border-zinc-800 p-4">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about markets, stocks, risk…" className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm outline-none focus:border-indigo-500" disabled={loading} />
          <Button type="submit" disabled={!input.trim() || loading}><Send className="h-4 w-4" /></Button>
        </form>
      </Card>
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Bot, Send, User } from 'lucide-react'
import { cn } from '@/lib/utils'

type Msg = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'Nifty bias for next session with risk levels',
  'Compare TCS vs Infosys for swing hold',
  'How to size a trade with max loss ₹1000',
  'What to watch on Bank Nifty around events',
]

function offlineReply(q: string): string {
  const lower = q.toLowerCase()
  if (lower.includes('risk') || lower.includes('size') || lower.includes('1000')) {
    return 'Educational sizing: decide max loss first (e.g. ₹1000). Risk per unit = |entry − stop|. Qty idea ≈ max loss / risk per unit. For options, risk is mainly premium paid (or defined margin). Never risk money you cannot afford. Not advice.'
  }
  if (lower.includes('tcs') || lower.includes('infosys')) {
    return 'Educational compare frame: margins, growth, deal pipeline, valuation. Prefer the name that matches your horizon and risk budget. Confirm with live prices on your broker/your broker. Not advice.'
  }
  return 'AI key not connected yet. Add OPENAI_API_KEY on Vercel and Redeploy for live answers.\n\nMeanwhile: use Morning Brief for Nifty/Sensex, FII/DII and chart models. This is educational only — not investment advice.'
}

export function AICopilotPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        'Hello — Novaforge AI Copilot. Ask about Nifty, stocks, risk sizing, or sector structure. Educational only — not investment advice. You execute on your broker.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'live' | 'offline' | 'unknown'>('unknown')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text?: string) => {
    const content = (text || input).trim()
    if (!content || loading) return
    setInput('')
    const nextUser: Msg = { role: 'user', content }
    const history = [...messages, nextUser]
    setMessages(history)
    setLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .slice(-8)
            .map((m) => ({ role: m.role, content: m.content })),
          question: content,
        }),
      })
      const json = await res.json()
      if (res.ok && json.content) {
        setMode('live')
        setMessages((m) => [...m, { role: 'assistant', content: json.content }])
      } else {
        setMode('offline')
        const hint =
          json?.message ||
          json?.error ||
          'API unavailable'
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content: `${offlineReply(content)}\n\n(System: ${hint})`,
          },
        ])
      }
    } catch {
      setMode('offline')
      setMessages((m) => [...m, { role: 'assistant', content: offlineReply(content) }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-indigo-400" /> AI Copilot
          </h1>
          <p className="text-sm text-zinc-400">
            Research & decision support · mode:{' '}
            <span className="text-indigo-300">
              {mode === 'live' ? 'OpenAI live' : mode === 'offline' ? 'offline / setup needed' : '—'}
            </span>
          </p>
        </div>
      </div>
      <Card className="flex flex-1 flex-col overflow-hidden p-0">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={cn('flex gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                  m.role === 'user'
                    ? 'bg-indigo-500 text-white rounded-br-md'
                    : 'bg-zinc-800 text-zinc-100 rounded-bl-md',
                )}
              >
                {m.content}
              </div>
              {m.role === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-700">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {loading && <div className="text-sm text-zinc-500 pl-11">Thinking…</div>}
          <div ref={endRef} />
        </div>
        {messages.length < 3 && (
          <div className="flex flex-wrap gap-2 px-4 pb-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:border-indigo-500/50 hover:text-indigo-300"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
          className="flex gap-2 border-t border-zinc-800 p-4"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about markets, stocks, risk…"
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm outline-none focus:border-indigo-500"
            disabled={loading}
          />
          <Button type="submit" disabled={!input.trim() || loading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  )
}

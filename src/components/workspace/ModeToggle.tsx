import { useWorkspaceMode } from '@/stores/workspaceMode'
import { cn } from '@/lib/utils'

export function ModeToggle() {
  const { mode, setMode } = useWorkspaceMode()
  return (
    <div className="inline-flex rounded-lg border border-zinc-700 p-0.5 text-xs">
      <button
        onClick={() => setMode('retail')}
        className={cn(
          'rounded-md px-2.5 py-1 font-medium transition',
          mode === 'retail' ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:text-zinc-200',
        )}
      >
        Retail
      </button>
      <button
        onClick={() => setMode('pro')}
        className={cn(
          'rounded-md px-2.5 py-1 font-medium transition',
          mode === 'pro' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-200',
        )}
      >
        Pro Terminal
      </button>
    </div>
  )
}

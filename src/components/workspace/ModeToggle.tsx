import { useWorkspaceMode } from '@/stores/workspaceMode'
import { cn } from '@/lib/utils'

export function ModeToggle() {
  const { mode, setMode } = useWorkspaceMode()
  return (
    <div className="inline-flex rounded-xl border border-[#6b4f3a]/20 bg-[#fffdf9] p-0.5 text-xs shadow-sm">
      <button
        type="button"
        onClick={() => setMode('retail')}
        className={cn(
          'rounded-lg px-2.5 py-1 font-semibold transition',
          mode === 'retail'
            ? 'bg-[#6b4f3a] text-[#fffdf9] shadow'
            : 'text-[#7a6a5c] hover:text-[#4a3428] hover:bg-[#a8d4e6]/25',
        )}
      >
        Retail
      </button>
      <button
        type="button"
        onClick={() => setMode('pro')}
        className={cn(
          'rounded-lg px-2.5 py-1 font-semibold transition',
          mode === 'pro'
            ? 'bg-[#5a9a4c] text-[#fffdf9] shadow'
            : 'text-[#7a6a5c] hover:text-[#4a3428] hover:bg-[#7cbc6e]/15',
        )}
      >
        Pro Terminal
      </button>
    </div>
  )
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type WorkspaceMode = 'retail' | 'pro'

type State = {
  mode: WorkspaceMode
  setMode: (m: WorkspaceMode) => void
  toggle: () => void
}

export const useWorkspaceMode = create<State>()(
  persist(
    (set, get) => ({
      mode: 'retail',
      setMode: (mode) => set({ mode }),
      toggle: () => set({ mode: get().mode === 'retail' ? 'pro' : 'retail' }),
    }),
    { name: 'novaforge-workspace-mode' },
  ),
)

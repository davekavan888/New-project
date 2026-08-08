import { create } from 'zustand'
import { isDemoMode, supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export type Profile = {
  id: string
  email: string
  full_name: string
  role: string
}

type AuthState = {
  user: User | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
  enableDemo: () => void
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string, name: string) => Promise<string | null>
  signOut: () => Promise<void>
  init: () => void
}

const DEMO_USER = {
  id: 'demo-001',
  email: 'demo@orionis.app',
  user_metadata: { full_name: 'Demo Investor' },
} as User

const DEMO_PROFILE: Profile = {
  id: 'demo-001',
  email: 'demo@orionis.app',
  full_name: 'Demo Investor',
  role: 'pro',
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,

  enableDemo: () => {
    sessionStorage.setItem('orionis_demo', '1')
    set({
      user: DEMO_USER,
      profile: DEMO_PROFILE,
      loading: false,
      initialized: true,
    })
  },

  init: () => {
    if (isDemoMode) {
      if (sessionStorage.getItem('orionis_demo') === '1') {
        set({ user: DEMO_USER, profile: DEMO_PROFILE, loading: false, initialized: true })
      } else {
        set({ loading: false, initialized: true })
      }
      return
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({
        user: session?.user ?? null,
        profile: session?.user
          ? {
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || 'Investor',
              role: 'user',
            }
          : null,
        loading: false,
        initialized: true,
      })
    })
  },

  signIn: async (email, password) => {
    if (isDemoMode) {
      sessionStorage.setItem('orionis_demo', '1')
      set({ user: DEMO_USER, profile: { ...DEMO_PROFILE, email, full_name: email.split('@')[0] }, loading: false, initialized: true })
      return null
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  },

  signUp: async (email, password, name) => {
    if (isDemoMode) {
      sessionStorage.setItem('orionis_demo', '1')
      set({
        user: DEMO_USER,
        profile: { id: 'demo-001', email, full_name: name, role: 'pro' },
        loading: false,
        initialized: true,
      })
      return null
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    return error?.message ?? null
  },

  signOut: async () => {
    sessionStorage.removeItem('orionis_demo')
    if (!isDemoMode) await supabase.auth.signOut()
    set({ user: null, profile: null })
  },
}))

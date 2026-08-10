import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'

export const isDemoMode = !import.meta.env.VITE_SUPABASE_URL

if (isDemoMode) {
  console.info('[Novaforge] Demo mode — no Supabase keys required')
}

export const supabase: SupabaseClient = createClient(url, key, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
})

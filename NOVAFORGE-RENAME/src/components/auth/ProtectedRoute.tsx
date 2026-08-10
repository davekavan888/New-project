import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized, loading } = useAuthStore()
  if (!initialized || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-400 text-sm">
        Loading Novaforge…
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

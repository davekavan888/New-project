import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth'

export function LoginPage() {
  const [email, setEmail] = useState('demo@orionis.app')
  const [password, setPassword] = useState('demo1234')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const signIn = useAuthStore((s) => s.signIn)
  const navigate = useNavigate()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const err = await signIn(email, password)
    setLoading(false)
    if (err) setError(err)
    else navigate('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-zinc-400">Sign in to ORIONIS</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-300">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm outline-none focus:border-indigo-500" required />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-300">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm outline-none focus:border-indigo-500" required />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>Sign in</Button>
        </form>
        <p className="text-center text-sm text-zinc-500">Demo: any email/password works. <Link to="/signup" className="text-indigo-400">Sign up</Link></p>
      </div>
    </div>
  )
}

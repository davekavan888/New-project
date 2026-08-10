import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth'

export function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const signUp = useAuthStore((s) => s.signUp)
  const navigate = useNavigate()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('Password min 6 characters'); return }
    setLoading(true)
    const err = await signUp(email, password, name || 'Investor')
    setLoading(false)
    if (err) setError(err)
    else navigate('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create account</h1>
          <p className="text-sm text-zinc-400">Start with Novaforge</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-300">Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-300">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm outline-none focus:border-indigo-500" required />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-300">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm outline-none focus:border-indigo-500" required />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>Create account</Button>
        </form>
        <p className="text-center text-sm text-zinc-500">
          <Link to="/login" className="text-indigo-400 hover:underline">Already have an account?</Link>
        </p>
      </div>
    </div>
  )
}

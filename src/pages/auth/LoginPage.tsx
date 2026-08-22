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
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{
        background:
          'radial-gradient(800px 400px at 15% 0%, rgba(168,212,230,0.45), transparent 55%), radial-gradient(700px 380px at 90% 10%, rgba(124,188,110,0.25), transparent 50%), linear-gradient(180deg, #f6f3ee, #ebe4d8)',
      }}
    >
      <div
        className="w-full max-w-md space-y-6 rounded-2xl border p-8 shadow-xl"
        style={{
          background: 'linear-gradient(165deg, #fffdf9, #f3ebe0)',
          borderColor: 'rgba(107,79,58,0.2)',
          boxShadow: '0 16px 48px rgba(74,52,40,0.12)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-extrabold text-[#fffdf9]"
            style={{
              background: 'linear-gradient(135deg, #6b4f3a, #4a3428)',
              boxShadow: '0 4px 14px rgba(74,52,40,0.3)',
            }}
          >
            N
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#2c241c]">Welcome back</h1>
            <p className="text-sm text-[#7a6a5c]">
              Sign in to <span className="font-semibold text-[#5a9a4c]">Novaforge</span>
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#4a3428]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border px-3 text-sm text-[#2c241c] outline-none transition"
              style={{
                borderColor: 'rgba(107,79,58,0.25)',
                background: '#fffdf9',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#7eb8d4'
                e.target.style.boxShadow = '0 0 0 3px rgba(168,212,230,0.45)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(107,79,58,0.25)'
                e.target.style.boxShadow = 'none'
              }}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#4a3428]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-xl border px-3 text-sm text-[#2c241c] outline-none transition"
              style={{
                borderColor: 'rgba(107,79,58,0.25)',
                background: '#fffdf9',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#7cbc6e'
                e.target.style.boxShadow = '0 0 0 3px rgba(124,188,110,0.35)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(107,79,58,0.25)'
                e.target.style.boxShadow = 'none'
              }}
              required
            />
          </div>
          {error && <p className="text-sm font-medium text-[#b45a46]">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>

        <p className="text-center text-sm text-[#7a6a5c]">
          Demo: any email/password works.{' '}
          <Link to="/signup" className="font-semibold text-[#2f6f9e] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

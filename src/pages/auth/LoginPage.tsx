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
    else navigate('/decision')
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{
        background:
          'radial-gradient(800px 400px at 10% 0%, rgba(201,162,39,0.18), transparent 55%), radial-gradient(700px 380px at 100% 10%, rgba(26,95,158,0.14), transparent 50%), linear-gradient(180deg, #f7f9fc, #eef3f9)',
      }}
    >
      <div
        className="w-full max-w-md space-y-6 rounded-2xl border p-8"
        style={{
          background: 'linear-gradient(165deg, #ffffff, #f3f7fc)',
          borderColor: 'rgba(201,162,39,0.35)',
          boxShadow: '0 20px 50px rgba(15,40,80,0.1)',
        }}
      >
        <div className="h-1 rounded-full" style={{ background: 'linear-gradient(90deg,#c9a227,#1a5f9e,#2d8f6f)' }} />
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-extrabold text-white"
            style={{
              background: 'linear-gradient(135deg, #1a5f9e, #0d3d6e)',
              boxShadow: '0 4px 14px rgba(26,95,158,0.35)',
            }}
          >
            N
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0f1b2d]">Welcome back</h1>
            <p className="text-sm text-[#5a6b82]">
              Sign in to <span className="font-semibold text-[#c9a227]">Novaforge</span>
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0f1b2d]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border px-3 text-sm text-[#0f1b2d] outline-none"
              style={{ borderColor: 'rgba(15,40,80,0.15)', background: '#fff' }}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#0f1b2d]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-xl border px-3 text-sm text-[#0f1b2d] outline-none"
              style={{ borderColor: 'rgba(15,40,80,0.15)', background: '#fff' }}
              required
            />
          </div>
          {error && <p className="text-sm font-medium text-[#b33a3a]">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>
        <p className="text-center text-sm text-[#5a6b82]">
          Demo works with any email/password.{' '}
          <Link to="/signup" className="font-semibold text-[#1a5f9e]">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

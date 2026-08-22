import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth'

export function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const signUp = useAuthStore((s) => s.signUp)
  const navigate = useNavigate()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const err = await signUp(email, password, name)
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
        className="w-full max-w-md space-y-6 rounded-2xl border p-8"
        style={{
          background: 'linear-gradient(165deg, #fffdf9, #f3ebe0)',
          borderColor: 'rgba(107,79,58,0.2)',
          boxShadow: '0 16px 48px rgba(74,52,40,0.12)',
        }}
      >
        <div>
          <h1 className="text-2xl font-bold text-[#2c241c]">Create account</h1>
          <p className="text-sm text-[#7a6a5c]">Join Novaforge trading desk</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#4a3428]">Name</label>
            <input className="h-11 w-full rounded-xl border border-[#6b4f3a]/25 bg-[#fffdf9] px-3 text-sm text-[#2c241c] outline-none focus:border-[#7eb8d4]" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#4a3428]">Email</label>
            <input type="email" className="h-11 w-full rounded-xl border border-[#6b4f3a]/25 bg-[#fffdf9] px-3 text-sm text-[#2c241c] outline-none focus:border-[#7eb8d4]" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#4a3428]">Password</label>
            <input type="password" className="h-11 w-full rounded-xl border border-[#6b4f3a]/25 bg-[#fffdf9] px-3 text-sm text-[#2c241c] outline-none focus:border-[#7cbc6e]" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-[#b45a46]">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>Sign up</Button>
        </form>
        <p className="text-center text-sm text-[#7a6a5c]">
          Have an account? <Link to="/login" className="font-semibold text-[#2f6f9e]">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

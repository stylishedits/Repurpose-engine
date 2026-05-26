import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/router'

export default function Login() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      router.push('/app')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head><title>Log in — Repurpose Engine</title></Head>
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#080808]">
        <Link href="/" className="font-display text-xl tracking-widest mb-12 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent inline-block" />
          REPURPOSE ENGINE
        </Link>

        <div className="w-full max-w-sm">
          <h1 className="font-display text-4xl tracking-wide mb-2">WELCOME BACK</h1>
          <p className="text-white/40 text-sm mb-8">Log in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded px-4 py-3 text-sm text-white focus:border-accent focus:outline-none transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded px-4 py-3 text-sm text-white focus:border-accent focus:outline-none transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-white py-3 rounded font-medium text-sm hover:opacity-85 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Log in →'}
            </button>
          </form>

          <p className="text-center text-sm text-white/30 mt-6">
            Don't have an account?{' '}
            <Link href="/signup" className="text-white hover:text-accent transition-colors">Sign up free</Link>
          </p>
        </div>
      </div>
    </>
  )
}

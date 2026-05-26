import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/router'

export default function Signup() {
  const { signup } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await signup(name, email, password)
      router.push('/app')
    } catch (err: any) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head><title>Sign up — Repurpose Engine</title></Head>
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#080808]">
        <Link href="/" className="font-display text-xl tracking-widest mb-12 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent inline-block" />
          REPURPOSE ENGINE
        </Link>

        <div className="w-full max-w-sm">
          <h1 className="font-display text-4xl tracking-wide mb-2">GET STARTED FREE</h1>
          <p className="text-white/40 text-sm mb-8">3 videos/day free forever · No credit card needed</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">Full name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded px-4 py-3 text-sm text-white focus:border-accent focus:outline-none transition-colors"
                placeholder="Your name"
                required
              />
            </div>
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
                placeholder="Min. 8 characters"
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
              {loading ? 'Creating account...' : 'Create free account →'}
            </button>
          </form>

          <p className="text-center text-xs text-white/20 mt-4">
            By signing up you agree to our Terms of Service
          </p>

          <p className="text-center text-sm text-white/30 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-white hover:text-accent transition-colors">Log in</Link>
          </p>
        </div>
      </div>
    </>
  )
}

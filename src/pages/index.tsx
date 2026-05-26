import Head from 'next/head'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useState } from 'react'

export default function Home() {
  const { user } = useAuth()
  const [email, setEmail] = useState('')

  return (
    <>
      <Head>
        <title>Repurpose Engine — Turn Any Video Into Every Platform Format</title>
        <meta name="description" content="Upload a video or paste a YouTube URL. We find the viral moments, cut the clips, add captions, and export for every platform." />
        <meta property="og:title" content="Repurpose Engine" />
        <meta property="og:description" content="One video. Every platform. No software needed." />
      </Head>

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-5 bg-black/90 backdrop-blur border-b border-white/5">
        <div className="font-display text-xl tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse-dot inline-block" />
          REPURPOSE ENGINE
        </div>
        <div className="flex items-center gap-8">
          <Link href="#how" className="text-sm text-white/40 hover:text-white transition-colors">How it works</Link>
          <Link href="#pricing" className="text-sm text-white/40 hover:text-white transition-colors">Pricing</Link>
          {user ? (
            <Link href="/app" className="text-sm bg-accent text-white px-5 py-2 rounded hover:opacity-85 transition-opacity">
              Go to App →
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm text-white/40 hover:text-white transition-colors">Log in</Link>
              <Link href="/signup" className="text-sm bg-accent text-white px-5 py-2 rounded hover:opacity-85 transition-opacity">
                Get started free
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-10 pt-28 pb-20 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,77,0,0.08) 0%, transparent 70%)' }} />
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)' }} />
        </div>

        <p className="font-mono text-xs tracking-widest text-accent uppercase mb-6 animate-fadeUp delay-200">
          No software. No upload limits. No leaving your browser.
        </p>

        <h1 className="font-display text-7xl md:text-9xl leading-none tracking-wide mb-7 animate-fadeUp delay-300">
          ONE VIDEO.<br />
          <span className="text-accent">EVERY</span> PLATFORM.
        </h1>

        <p className="text-lg md:text-xl text-white/40 font-light max-w-xl leading-relaxed mb-12 animate-fadeUp delay-400">
          Upload your video or paste a YouTube URL. We find the viral moments, cut the clips, add captions, and export for every platform in minutes.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 animate-fadeUp delay-500">
          <Link href={user ? '/app' : '/signup'} className="bg-accent text-white px-9 py-4 rounded font-medium text-base hover:opacity-85 transition-all hover:-translate-y-0.5 flex items-center gap-2">
            ⚡ Start for free — no credit card
          </Link>
          <Link href="#how" className="text-white/40 px-7 py-4 rounded border border-white/10 text-base hover:text-white hover:border-white/20 transition-all flex items-center gap-2">
            See how it works ↓
          </Link>
        </div>

        <p className="mt-6 text-xs text-white/20 font-mono animate-fadeUp delay-600">
          // Your files never leave your device · Powered by AI · 100% in-browser
        </p>
      </section>

      {/* VS SECTION */}
      <section className="py-24 px-10 max-w-5xl mx-auto" id="how">
        <p className="font-mono text-xs tracking-widest text-accent uppercase mb-4">The difference</p>
        <h2 className="font-display text-5xl md:text-7xl leading-none tracking-wide mb-16">
          EVERY OTHER TOOL<br />MAKES YOU LEAVE.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-l-xl p-7">
            <div className="text-sm font-medium text-white/40 mb-5">😩 Opus Clip / Descript / Kapwing</div>
            {['Export your video (15–20 min)', 'Upload to a website (wait in queue)', 'Wait for AI processing', 'Download all the versions', 'Re-import into your editor', '$30–$50 per month forever'].map(t => (
              <div key={t} className="flex items-start gap-3 mb-3 text-sm text-white/40">
                <span className="text-red-500 mt-0.5 flex-shrink-0">✕</span>{t}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center bg-[#111] border-y border-white/10 p-4">
            <span className="font-display text-2xl text-white/20">VS</span>
          </div>

          <div className="bg-accent/5 border border-accent/40 rounded-r-xl p-7 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-mono px-3 py-1 rounded-full tracking-widest whitespace-nowrap">
              THIS IS YOU
            </div>
            <div className="text-sm font-medium text-white mb-5">⚡ Repurpose Engine</div>
            {['Upload once, right here', 'AI finds the viral moments', 'Cuts and reframes in-browser', 'Captions burned in automatically', 'Download all clips as a zip', 'Free tier available'].map(t => (
              <div key={t} className="flex items-start gap-3 mb-3 text-sm text-white">
                <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>{t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-[#111] border-y border-white/5">
        <div className="max-w-5xl mx-auto px-10">
          <p className="font-mono text-xs tracking-widest text-accent uppercase mb-4">How it works</p>
          <h2 className="font-display text-5xl md:text-7xl leading-none tracking-wide mb-16">FOUR STEPS.<br />DONE IN MINUTES.</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5">
            {[
              { n: '01', title: 'Upload or paste URL', desc: 'Drop your video or paste any YouTube URL. Supports MP4, MOV, AVI up to 4GB.' },
              { n: '02', title: 'AI finds viral moments', desc: 'Claude analyzes audio energy, pacing, and YouTube comment timestamps to score every segment.' },
              { n: '03', title: 'We cut and reframe', desc: 'FFmpeg runs right in your browser. Your footage never leaves your device.' },
              { n: '04', title: 'Download your clips', desc: 'Every platform format ready to post. Optional captions burned in.' },
            ].map(s => (
              <div key={s.n} className="bg-[#080808] p-8 hover:bg-[#0d0d0d] transition-colors">
                <div className="font-display text-6xl leading-none text-accent/15 mb-4">{s.n}</div>
                <div className="font-medium text-base mb-2">{s.title}</div>
                <div className="text-sm text-white/40 leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-24 px-10 max-w-4xl mx-auto text-center" id="pricing">
        <p className="font-mono text-xs tracking-widest text-accent uppercase mb-4">Pricing</p>
        <h2 className="font-display text-5xl md:text-7xl leading-none tracking-wide mb-16">SIMPLE.<br />NO SURPRISES.</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 rounded-xl overflow-hidden border border-white/10">
          {[
            {
              name: 'Free', price: '0', cycle: 'forever', featured: false,
              features: [
                { t: '3 videos per day', ok: true },
                { t: 'All platform formats', ok: true },
                { t: 'Smart reframe', ok: true },
                { t: 'Auto-captions', ok: false },
                { t: 'AI viral finder', ok: false },
                { t: 'YouTube URL', ok: false },
              ],
              btnText: 'Get started free', btnHref: '/signup', btnStyle: 'border border-white/10 text-white/40 hover:text-white hover:border-white/20'
            },
            {
              name: 'Pro', price: '19', cycle: 'per month', featured: true,
              features: [
                { t: 'Unlimited videos', ok: true },
                { t: 'All platform formats', ok: true },
                { t: 'Smart reframe', ok: true },
                { t: 'Auto-captions', ok: true },
                { t: 'AI viral finder', ok: true },
                { t: 'YouTube URL support', ok: true },
              ],
              btnText: 'Get Pro — $19/mo', btnHref: '/signup?plan=pro', btnStyle: 'bg-accent text-white hover:opacity-85'
            },
            {
              name: 'Agency', price: '79', cycle: 'per month', featured: false,
              features: [
                { t: 'Everything in Pro', ok: true },
                { t: '10 team seats', ok: true },
                { t: 'Bulk upload', ok: true },
                { t: 'API access', ok: true },
                { t: 'White-label exports', ok: true },
                { t: 'Priority support', ok: true },
              ],
              btnText: 'Contact us', btnHref: 'mailto:hello@repurposeengine.com', btnStyle: 'border border-white/10 text-white/40 hover:text-white hover:border-white/20'
            }
          ].map(plan => (
            <div key={plan.name} className={`p-8 text-left ${plan.featured ? 'bg-accent/5 border-x border-accent/30' : 'bg-[#1a1a1a]'}`}>
              <div className="font-mono text-xs tracking-widest text-white/40 uppercase mb-3">{plan.name}</div>
              <div className="font-display text-6xl leading-none mb-1"><sup className="text-3xl">$</sup>{plan.price}</div>
              <div className="text-sm text-white/40 mb-7">{plan.cycle}</div>
              <ul className="space-y-2 mb-8">
                {plan.features.map(f => (
                  <li key={f.t} className={`flex items-center gap-2 text-sm ${f.ok ? 'text-white' : 'text-white/20'}`}>
                    <span className={f.ok ? 'text-green-400' : 'text-white/10'}>{f.ok ? '✓' : '✕'}</span>
                    {f.t}
                  </li>
                ))}
              </ul>
              <Link href={plan.btnHref} className={`block w-full py-3 rounded text-sm font-medium text-center transition-all ${plan.btnStyle}`}>
                {plan.btnText}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-10 py-8 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
        <div className="font-display text-lg tracking-widest">⚡ REPURPOSE ENGINE</div>
        <div className="flex gap-6 text-sm text-white/30">
          <Link href="#how" className="hover:text-white transition-colors">How it works</Link>
          <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
          <a href="mailto:hello@repurposeengine.com" className="hover:text-white transition-colors">Contact</a>
        </div>
        <div className="text-xs text-white/20">© 2024 Repurpose Engine</div>
      </footer>
    </>
  )
}

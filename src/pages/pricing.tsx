import Head from 'next/head'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useEffect, useState } from 'react'
import Script from 'next/script'

const PLANS = [
  {
    name: 'Free', price: '0', cycle: 'forever', featured: false,
    paypalPlanId: null,
    features: [
      { t: '3 videos per day', ok: true },
      { t: 'All 7 platform formats', ok: true },
      { t: 'Smart reframe', ok: true },
      { t: 'FFmpeg browser processing', ok: true },
      { t: 'Auto-captions (Whisper)', ok: false },
      { t: 'AI viral finder', ok: false },
      { t: 'YouTube URL support', ok: false },
      { t: 'Unlimited videos', ok: false },
    ]
  },
  {
    name: 'Pro', price: '19', cycle: 'per month', featured: true,
    paypalPlanId: process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID || 'PRO_PLAN_ID',
    features: [
      { t: 'Unlimited videos', ok: true },
      { t: 'All 7 platform formats', ok: true },
      { t: 'Smart reframe', ok: true },
      { t: 'FFmpeg browser processing', ok: true },
      { t: 'Auto-captions (Whisper)', ok: true },
      { t: 'AI viral finder', ok: true },
      { t: 'YouTube URL support', ok: true },
      { t: 'Priority support', ok: true },
    ]
  },
  {
    name: 'Agency', price: '79', cycle: 'per month', featured: false,
    paypalPlanId: process.env.NEXT_PUBLIC_PAYPAL_AGENCY_PLAN_ID || 'AGENCY_PLAN_ID',
    features: [
      { t: 'Everything in Pro', ok: true },
      { t: '10 team seats', ok: true },
      { t: 'Bulk upload', ok: true },
      { t: 'API access', ok: true },
      { t: 'White-label exports', ok: true },
      { t: 'Invoice available', ok: true },
      { t: 'Priority support', ok: true },
      { t: 'Custom integrations', ok: true },
    ]
  }
]

export default function Pricing() {
  const { user, isPro } = useAuth()
  const [upgrading, setUpgrading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handlePayPalApprove = async (subscriptionId: string, planId: string) => {
    setUpgrading(true)
    try {
      const token = localStorage.getItem('re_token')
      const res = await fetch('/api/paypal/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, planId, token })
      })
      if (res.ok) {
        setSuccess(true)
        setTimeout(() => window.location.href = '/app', 2000)
      }
    } catch (err) {
      console.error('Upgrade error:', err)
    } finally {
      setUpgrading(false)
    }
  }

  return (
    <>
      <Head><title>Pricing — Repurpose Engine</title></Head>
      <Script
        src={`https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&vault=true&intent=subscription`}
        data-sdk-integration-source="button-factory"
      />

      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-5 bg-black/90 backdrop-blur border-b border-white/5">
        <Link href="/" className="font-display text-xl tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent inline-block" />
          REPURPOSE ENGINE
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <Link href="/app" className="text-sm text-white/40 hover:text-white transition-colors">Back to app</Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-white/40 hover:text-white transition-colors">Log in</Link>
              <Link href="/signup" className="text-sm bg-accent text-white px-5 py-2 rounded hover:opacity-85">Sign up free</Link>
            </>
          )}
        </div>
      </nav>

      <div className="pt-28 pb-20 px-10 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="font-mono text-xs tracking-widest text-accent uppercase mb-4">Pricing</p>
          <h1 className="font-display text-6xl md:text-8xl leading-none tracking-wide mb-4">SIMPLE.<br />NO SURPRISES.</h1>
          <p className="text-white/40 text-base">Pay with PayPal · Cancel anytime · No hidden fees</p>
        </div>

        {success && (
          <div className="mb-8 bg-green-500/10 border border-green-500/20 rounded-xl p-5 text-center text-green-400">
            🎉 Upgrade successful! Redirecting to app...
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 rounded-xl overflow-hidden border border-white/10">
          {PLANS.map(plan => (
            <div key={plan.name} className={`p-8 ${plan.featured ? 'bg-accent/5' : 'bg-[#111]'}`}>
              <div className="font-mono text-xs tracking-widest text-white/40 uppercase mb-3">{plan.name}</div>
              <div className="font-display text-6xl leading-none mb-1">
                <sup className="text-3xl">$</sup>{plan.price}
              </div>
              <div className="text-sm text-white/40 mb-7">{plan.cycle}</div>

              <ul className="space-y-2 mb-8">
                {plan.features.map(f => (
                  <li key={f.t} className={`flex items-center gap-2 text-sm ${f.ok ? 'text-white' : 'text-white/20'}`}>
                    <span className={f.ok ? 'text-green-400' : 'text-white/10'}>{f.ok ? '✓' : '✕'}</span>
                    {f.t}
                  </li>
                ))}
              </ul>

              {plan.name === 'Free' ? (
                <Link href={user ? '/app' : '/signup'} className="block w-full py-3 rounded text-sm font-medium text-center border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-all">
                  {user ? 'Go to app' : 'Get started free'}
                </Link>
              ) : plan.name === 'Agency' ? (
                <a href="mailto:hello@repurposeengine.com" className="block w-full py-3 rounded text-sm font-medium text-center border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-all">
                  Contact us
                </a>
              ) : (
                <div>
                  {isPro ? (
                    <div className="w-full py-3 rounded text-sm font-medium text-center bg-green-500/10 text-green-400 border border-green-500/20">
                      ✓ Current plan
                    </div>
                  ) : !user ? (
                    <Link href="/signup?plan=pro" className="block w-full py-3 rounded text-sm font-medium text-center bg-accent text-white hover:opacity-85 transition-opacity">
                      Get Pro — $19/mo
                    </Link>
                  ) : (
                    <div id="paypal-button-container" className="w-full">
                      <div className="w-full py-3 rounded text-sm font-medium text-center bg-accent text-white cursor-pointer hover:opacity-85 transition-opacity"
                        onClick={() => {
                          // PayPal button renders here when SDK loads
                          if (typeof window !== 'undefined' && (window as any).paypal) {
                            (window as any).paypal.Buttons({
                              style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'subscribe' },
                              createSubscription: (data: any, actions: any) => {
                                return actions.subscription.create({ plan_id: plan.paypalPlanId || 'PLAN_ID_HERE' })
                              },
                              onApprove: (data: any) => {
                                handlePayPalApprove(data.subscriptionID, plan.paypalPlanId || '')
                              },
                              onError: (err: any) => console.error('PayPal error:', err)
                            }).render('#paypal-button-container')
                          }
                        }}
                      >
                        {upgrading ? 'Processing...' : 'Subscribe with PayPal — $19/mo'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-white/30">
            🔒 Secure payments via PayPal · 30-day money-back guarantee · Cancel anytime from your PayPal account
          </p>
        </div>
      </div>
    </>
  )
}

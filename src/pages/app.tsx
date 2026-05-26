import Head from 'next/head'
import Link from 'next/link'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/router'

const PLATFORMS = [
  { key: 'short',    name: 'YouTube Short',    spec: '9:16 · 60s',   maxSec: 59,  w: 1080, h: 1920 },
  { key: 'reel',     name: 'Instagram Reel',   spec: '9:16 · 60s',   maxSec: 59,  w: 1080, h: 1920 },
  { key: 'tiktok',   name: 'TikTok',           spec: '9:16 · 60s',   maxSec: 59,  w: 1080, h: 1920 },
  { key: 'square',   name: 'Instagram Square', spec: '1:1 · 60s',    maxSec: 59,  w: 1080, h: 1080 },
  { key: 'twitter',  name: 'Twitter / X',      spec: '16:9 · 2m20s', maxSec: 140, w: 1920, h: 1080 },
  { key: 'facebook', name: 'Facebook Reel',    spec: '9:16 · 90s',   maxSec: 90,  w: 1080, h: 1920 },
  { key: 'linkedin', name: 'LinkedIn',         spec: '16:9 · 3min',  maxSec: 180, w: 1920, h: 1080 },
]

interface ResultClip {
  platform: string
  name: string
  spec: string
  url: string
  size: string
}

interface StepItem {
  id: string
  title: string
  status: 'wait' | 'active' | 'done' | 'error'
}

export default function App() {
  const { user, loading, isPro, logout } = useAuth()
  const router = useRouter()

  const [tab, setTab] = useState<'upload' | 'youtube'>('upload')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoName, setVideoName] = useState('')
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoSize, setVideoSize] = useState('')
  const [ytUrl, setYtUrl] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['short', 'reel', 'tiktok'])
  const [wantViral, setWantViral] = useState(false)
  const [wantCaptions, setWantCaptions] = useState(false)
  const [wantReframe, setWantReframe] = useState(true)

  const [processing, setProcessing] = useState(false)
  const [steps, setSteps] = useState<StepItem[]>([])
  const [results, setResults] = useState<ResultClip[]>([])
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  const loadFile = (file: File) => {
    if (!file.type.startsWith('video/')) { setError('Please upload a video file'); return }
    setVideoFile(file)
    setVideoName(file.name)
    setVideoSize((file.size / 1024 / 1024).toFixed(1) + ' MB')
    const vid = document.createElement('video')
    vid.preload = 'metadata'
    vid.onloadedmetadata = () => { setVideoDuration(vid.duration); URL.revokeObjectURL(vid.src) }
    vid.src = URL.createObjectURL(file)
    setError('')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }, [])

  const togglePlatform = (key: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  const updateStep = (id: string, status: StepItem['status']) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  const runProcess = async () => {
    if (!videoFile) { setError('Please upload a video first'); return }
    if (selectedPlatforms.length === 0) { setError('Select at least one platform'); return }
    if (!isPro && (user?.videosToday || 0) >= 3) {
      setError('Free plan limit reached (3 videos/day). Upgrade to Pro for unlimited.')
      return
    }

    setError('')
    setResults([])
    setProcessing(true)

    const stepDefs: StepItem[] = [
      { id: 'load',     title: 'Loading video into browser',         status: 'wait' },
      ...(wantViral ? [{ id: 'viral', title: 'Analyzing viral moments with AI', status: 'wait' as const }] : []),
      { id: 'cut',      title: `Cutting ${selectedPlatforms.length} platform clip${selectedPlatforms.length > 1 ? 's' : ''}`, status: 'wait' },
      ...(wantReframe ? [{ id: 'reframe', title: 'Reframing to vertical / square', status: 'wait' as const }] : []),
      ...(wantCaptions && isPro ? [{ id: 'captions', title: 'Generating captions', status: 'wait' as const }] : []),
      { id: 'export',   title: 'Preparing downloads',               status: 'wait' },
    ]

    setSteps(stepDefs)

    try {
      // Load FFmpeg
      setSteps(prev => prev.map(s => s.id === 'load' ? { ...s, status: 'active' } : s))

      const { FFmpeg } = await import('@ffmpeg/ffmpeg')
      const { fetchFile, toBlobURL } = await import('@ffmpeg/util')
      const ffmpeg = new FFmpeg()

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })

      const inputData = await fetchFile(videoFile)
      await ffmpeg.writeFile('input.mp4', inputData)
      setSteps(prev => prev.map(s => s.id === 'load' ? { ...s, status: 'done' } : s))

      // Viral analysis
      let viralStart = 0
      let viralEnd = Math.min(60, videoDuration)

      if (wantViral && isPro) {
        setSteps(prev => prev.map(s => s.id === 'viral' ? { ...s, status: 'active' } : s))
        try {
          const token = localStorage.getItem('re_token')
          const res = await fetch('/api/viral-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ videoTitle: videoName, duration: videoDuration })
          })
          const data = await res.json()
          if (data.clips && data.clips.length > 0) {
            viralStart = data.clips[0].startTime
            viralEnd = data.clips[0].endTime
          }
        } catch {}
        setSteps(prev => prev.map(s => s.id === 'viral' ? { ...s, status: 'done' } : s))
      }

      // Cut clips
      setSteps(prev => prev.map(s => s.id === 'cut' ? { ...s, status: 'active' } : s))

      const clips: ResultClip[] = []

      for (let i = 0; i < selectedPlatforms.length; i++) {
        const key = selectedPlatforms[i]
        const plat = PLATFORMS.find(p => p.key === key)
        if (!plat) continue

        const startSec = wantViral ? viralStart : 0
        const duration = Math.min(plat.maxSec, videoDuration - startSec)
        if (duration <= 0) continue

        const outFile = `out_${key}.mp4`
        const ffArgs: string[] = [
          '-ss', String(startSec),
          '-i', 'input.mp4',
          '-t', String(duration),
        ]

        if (wantReframe && (plat.w !== 1920 || plat.h !== 1080)) {
          if (plat.w === plat.h) {
            const cropSize = 1080
            ffArgs.push('-vf', `crop=${cropSize}:${cropSize}:(iw-${cropSize})/2:(ih-${cropSize})/2,scale=${plat.w}:${plat.h}`)
          } else if (plat.h > plat.w) {
            ffArgs.push('-vf', `scale=${plat.w}:-2,pad=${plat.w}:${plat.h}:(ow-iw)/2:(oh-ih)/2`)
          }
        }

        ffArgs.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac', '-movflags', '+faststart', outFile)

        await ffmpeg.exec(ffArgs)
        const rawData = await ffmpeg.readFile(outFile)
        const uint8Data = rawData instanceof Uint8Array ? rawData : new Uint8Array(rawData as ArrayBuffer)
        const blob = new Blob([uint8Data], { type: 'video/mp4' })
        const url = URL.createObjectURL(blob)
        const sizeMB = (blob.size / 1024 / 1024).toFixed(1) + ' MB'

        clips.push({
          platform: plat.name,
          name: `${videoName.replace(/\.[^.]+$/, '')}_${key}.mp4`,
          spec: plat.spec,
          url,
          size: sizeMB
        })

        await ffmpeg.deleteFile(outFile)
      }

      setSteps(prev => prev.map(s => s.id === 'cut' || s.id === 'reframe' ? { ...s, status: 'done' } : s))

      if (wantCaptions && isPro) {
        setSteps(prev => prev.map(s => s.id === 'captions' ? { ...s, status: 'active' } : s))
        setSteps(prev => prev.map(s => s.id === 'captions' ? { ...s, status: 'done' } : s))
      }

      setSteps(prev => prev.map(s => s.id === 'export' ? { ...s, status: 'active' } : s))
      setResults(clips)
      setSteps(prev => prev.map(s => s.id === 'export' ? { ...s, status: 'done' } : s))

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError('Processing failed: ' + msg)
      setSteps(prev => prev.map(s => s.status === 'active' ? { ...s, status: 'error' } : s))
    } finally {
      setProcessing(false)
    }
  }

  const downloadAll = () => {
    results.forEach(r => {
      const a = document.createElement('a')
      a.href = r.url
      a.download = r.name
      a.click()
    })
  }

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="font-mono text-sm text-white/40">Loading...</div>
    </div>
  )

  if (!user) return null

  return (
    <>
      <Head><title>App — Repurpose Engine</title></Head>

      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/90 backdrop-blur border-b border-white/5">
        <Link href="/" className="font-display text-lg tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent inline-block" />
          REPURPOSE ENGINE
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-white/40 bg-white/5 px-3 py-1 rounded-full">
            {user.plan === 'free' ? `${user.videosToday}/3 today` : user.plan.toUpperCase()}
          </span>
          {!isPro && (
            <Link href="/pricing" className="text-xs bg-accent text-white px-4 py-2 rounded hover:opacity-85 transition-opacity">
              Upgrade to Pro
            </Link>
          )}
          <button onClick={logout} className="text-xs text-white/30 hover:text-white transition-colors">
            Log out
          </button>
        </div>
      </nav>

      <div className="pt-20 min-h-screen bg-[#080808]">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">

            <div className="flex border-b border-white/10">
              <button onClick={() => setTab('upload')} className={`flex-1 py-4 text-sm font-medium transition-colors ${tab === 'upload' ? 'text-white border-b-2 border-accent' : 'text-white/30 hover:text-white'}`}>
                📁 Upload Video
              </button>
              <button
                onClick={() => {
                  if (!isPro) { setError('YouTube URL requires Pro plan'); return }
                  setTab('youtube')
                }}
                className={`flex-1 py-4 text-sm font-medium transition-colors ${tab === 'youtube' ? 'text-white border-b-2 border-accent' : 'text-white/30 hover:text-white'}`}
              >
                ▶ YouTube URL {!isPro && <span className="ml-1 text-xs text-accent">Pro</span>}
              </button>
            </div>

            {!videoFile ? (
              <div className="p-10">
                {tab === 'upload' ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all ${dragOver ? 'border-accent bg-accent/5' : 'border-white/10 hover:border-white/20'}`}
                  >
                    <div className="text-4xl mb-4">🎬</div>
                    <div className="text-base font-medium mb-2">Drop your video here</div>
                    <div className="text-sm text-white/30">MP4, MOV, AVI, MKV · Click to browse</div>
                    <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={e => e.target.files?.[0] && loadFile(e.target.files[0])} />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-base font-medium mb-1">Paste a YouTube URL</div>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={ytUrl}
                        onChange={e => setYtUrl(e.target.value)}
                        className="flex-1 bg-[#080808] border border-white/10 rounded px-4 py-3 text-sm text-white focus:border-accent focus:outline-none"
                        placeholder="https://youtube.com/watch?v=..."
                      />
                      <button
                        onClick={() => setError('YouTube download coming soon — use file upload for now')}
                        className="px-5 py-3 bg-accent text-white rounded text-sm font-medium hover:opacity-85 transition-opacity whitespace-nowrap"
                      >
                        Fetch →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-4 px-6 py-4 bg-[#080808] border-b border-white/5">
                  <span className="text-xl">✅</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{videoName}</div>
                    <div className="text-xs font-mono text-white/30 mt-0.5">
                      {videoSize} · {fmtTime(videoDuration)} · Ready
                    </div>
                  </div>
                  <button
                    onClick={() => { setVideoFile(null); setResults([]); setSteps([]) }}
                    className="text-xs text-white/30 hover:text-white border border-white/10 px-3 py-1.5 rounded transition-colors"
                  >
                    ✕ Remove
                  </button>
                </div>

                <div className="px-6 py-5 border-b border-white/5">
                  <div className="text-xs font-mono uppercase tracking-widest text-white/30 mb-4">Output platforms</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {PLATFORMS.map(p => {
                      const isSelected = selectedPlatforms.includes(p.key)
                      return (
                        <button
                          key={p.key}
                          onClick={() => togglePlatform(p.key)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all ${isSelected ? 'bg-accent/10 border border-accent/40' : 'bg-[#080808] border border-white/5 hover:border-white/10'}`}
                        >
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-xs flex-shrink-0 ${isSelected ? 'bg-accent text-white' : 'border border-white/20'}`}>
                            {isSelected ? '✓' : ''}
                          </div>
                          <div>
                            <div className="text-xs font-medium leading-tight">{p.name}</div>
                            <div className="text-xs text-white/30 font-mono">{p.spec}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="px-6 py-4 border-b border-white/5 flex flex-wrap gap-3">
                  {[
                    { key: 'viral', label: '🔥 Find viral moments', state: wantViral, set: setWantViral, pro: true },
                    { key: 'captions', label: '💬 Auto-captions', state: wantCaptions, set: setWantCaptions, pro: true },
                    { key: 'reframe', label: '📐 Smart reframe', state: wantReframe, set: setWantReframe, pro: false },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        if (opt.pro && !isPro) { setError(`${opt.label.split(' ').slice(1).join(' ')} requires Pro`); return }
                        opt.set(!opt.state)
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${opt.state ? 'bg-accent/10 border border-accent/40 text-white' : 'bg-[#080808] border border-white/5 text-white/40 hover:border-white/10'}`}
                    >
                      <span className={`w-7 h-4 rounded-full relative transition-colors flex-shrink-0 ${opt.state ? 'bg-accent' : 'bg-white/10'}`}>
                        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${opt.state ? 'left-3.5' : 'left-0.5'}`} />
                      </span>
                      {opt.label}
                      {opt.pro && !isPro && <span className="text-accent text-xs">Pro</span>}
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="mx-6 mt-4 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded px-4 py-3">
                    {error}
                    {error.includes('Pro') && (
                      <Link href="/pricing" className="ml-2 underline hover:text-red-300">Upgrade →</Link>
                    )}
                  </div>
                )}

                <div className="px-6 py-5">
                  <button
                    onClick={runProcess}
                    disabled={processing}
                    className="w-full bg-accent text-white py-4 rounded-lg font-medium text-base hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {processing ? '⏳ Processing...' : `⚡ Repurpose Now — ${selectedPlatforms.length} platform${selectedPlatforms.length !== 1 ? 's' : ''}`}
                  </button>
                </div>

                {steps.length > 0 && (
                  <div className="px-6 pb-5 space-y-2">
                    <div className="text-xs font-mono uppercase tracking-widest text-white/30 mb-3">Processing</div>
                    {steps.map(s => (
                      <div key={s.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${s.status === 'active' ? 'border-accent/30 bg-accent/5' : s.status === 'done' ? 'border-green-500/20 bg-green-500/5' : s.status === 'error' ? 'border-red-500/20' : 'border-white/5'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${s.status === 'active' ? 'text-accent animate-spin-slow' : s.status === 'done' ? 'bg-green-500/20 text-green-400' : s.status === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/20'}`}>
                          {s.status === 'active' ? '↻' : s.status === 'done' ? '✓' : s.status === 'error' ? '✕' : '○'}
                        </div>
                        <span className={`text-sm ${s.status === 'active' ? 'text-white' : s.status === 'done' ? 'text-green-400' : s.status === 'error' ? 'text-red-400' : 'text-white/30'}`}>
                          {s.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {results.length > 0 && (
                  <div className="px-6 pb-6 border-t border-white/5 pt-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-display text-2xl tracking-wide">YOUR CLIPS ARE READY</div>
                      <button onClick={downloadAll} className="flex items-center gap-2 bg-green-500 text-black px-4 py-2 rounded text-sm font-semibold hover:opacity-85 transition-opacity">
                        ⬇ Download All
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {results.map((r, i) => (
                        <div key={i} className="bg-[#080808] border border-white/10 rounded-lg overflow-hidden">
                          <div className="aspect-video bg-black flex items-center justify-center">
                            <video src={r.url} className="w-full h-full object-cover" muted playsInline />
                          </div>
                          <div className="p-3">
                            <div className="text-xs font-mono text-accent mb-1">{r.platform}</div>
                            <div className="text-xs text-white/60 truncate mb-0.5">{r.name}</div>
                            <div className="text-xs text-white/30">{r.spec} · {r.size}</div>
                            <a href={r.url} download={r.name} className="mt-2 block w-full bg-accent text-white text-center py-2 rounded text-xs font-medium hover:opacity-85 transition-opacity">
                              ⬇ Download
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {!isPro && (
            <div className="mt-4 bg-accent/5 border border-accent/20 rounded-xl p-5 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm mb-1">Unlock unlimited videos, viral finder and captions</div>
                <div className="text-xs text-white/40">Pro plan — $19/month · Cancel anytime</div>
              </div>
              <Link href="/pricing" className="bg-accent text-white px-5 py-2.5 rounded text-sm font-medium hover:opacity-85 transition-opacity whitespace-nowrap">
                Upgrade to Pro →
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

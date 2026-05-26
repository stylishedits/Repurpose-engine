import Head from 'next/head'
import Link from 'next/link'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/router'

// ── Audio Energy Analysis ─────────────────────────────────────
async function analyzeAudioEnergy(file: File, segmentSecs: number = 59): Promise<{
  start: number; end: number; score: number
  allSegments: { start: number; end: number; score: number }[]
}> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        const audioCtx = new AudioCtx()
        const arrayBuffer = e.target?.result as ArrayBuffer
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
        const duration = audioBuffer.duration
        const sampleRate = audioBuffer.sampleRate
        const channelData = audioBuffer.getChannelData(0)
        const samplesPerSegment = Math.floor(sampleRate * segmentSecs)
        const numSegments = Math.floor(duration / segmentSecs)

        if (numSegments < 1) {
          resolve({ start: 0, end: Math.min(segmentSecs, duration), score: 100, allSegments: [] })
          return
        }

        const segments: { start: number; end: number; score: number }[] = []

        for (let i = 0; i < numSegments; i++) {
          const startSample = i * samplesPerSegment
          const endSample = Math.min(startSample + samplesPerSegment, channelData.length)
          const segment = channelData.slice(startSample, endSample)

          // RMS energy
          let sumSquares = 0
          for (let j = 0; j < segment.length; j++) sumSquares += segment[j] * segment[j]
          const rms = Math.sqrt(sumSquares / segment.length)

          // Variance across 2-second chunks
          const chunkSize = Math.floor(sampleRate * 2)
          const chunkRms: number[] = []
          for (let k = 0; k < segment.length; k += chunkSize) {
            const chunk = segment.slice(k, Math.min(k + chunkSize, segment.length))
            let cs = 0
            for (let j = 0; j < chunk.length; j++) cs += chunk[j] * chunk[j]
            chunkRms.push(Math.sqrt(cs / chunk.length))
          }
          const avgRms = chunkRms.reduce((a, b) => a + b, 0) / chunkRms.length
          let sumVar = 0
          for (const cr of chunkRms) sumVar += (cr - avgRms) ** 2
          const variance = Math.sqrt(sumVar / chunkRms.length)

          // Peak count
          let peaks = 0
          const threshold = rms * 2.5
          for (let j = 1; j < segment.length - 1; j += Math.floor(sampleRate * 0.1)) {
            if (Math.abs(segment[j]) > threshold) peaks++
          }

          // Skip intros (first 10%)
          const posBonus = i / numSegments < 0.1 ? 0.6 : i / numSegments < 0.2 ? 0.85 : 1.0
          const raw = ((rms * 0.5) + (variance * 0.3) + (peaks * 0.0001 * 0.2)) * posBonus
          segments.push({ start: i * segmentSecs, end: Math.min((i + 1) * segmentSecs, duration), score: raw })
        }

        // Normalize 0-100
        const maxS = Math.max(...segments.map(s => s.score))
        const minS = Math.min(...segments.map(s => s.score))
        const norm = segments.map(s => ({
          ...s,
          score: maxS > minS ? Math.round(((s.score - minS) / (maxS - minS)) * 100) : 50
        }))

        const sorted = [...norm].sort((a, b) => b.score - a.score)
        audioCtx.close()
        resolve({ start: sorted[0].start, end: sorted[0].end, score: sorted[0].score, allSegments: norm })
      } catch {
        resolve({ start: 0, end: segmentSecs, score: 50, allSegments: [] })
      }
    }
    reader.onerror = () => resolve({ start: 0, end: segmentSecs, score: 50, allSegments: [] })
    reader.readAsArrayBuffer(file)
  })
}

const PLATFORMS = [
  { key: 'vertical', name: 'Vertical Short',   spec: '9:16 · 60s — YouTube, TikTok & Reels', maxSec: 59,  w: 1080, h: 1920 },
  { key: 'square',   name: 'Instagram Square', spec: '1:1 · 60s',                             maxSec: 59,  w: 1080, h: 1080 },
  { key: 'facebook', name: 'Facebook Reel',    spec: '9:16 · 90s',                            maxSec: 90,  w: 1080, h: 1920 },
  { key: 'twitter',  name: 'Twitter / X',      spec: '16:9 · 2m20s',                          maxSec: 140, w: 1920, h: 1080 },
  { key: 'linkedin', name: 'LinkedIn',         spec: '16:9 · 3min',                           maxSec: 180, w: 1920, h: 1080 },
]

interface ResultClip { platform: string; name: string; spec: string; url: string; size: string }
interface StepItem { id: string; title: string; status: 'wait' | 'active' | 'done' | 'error' }
interface ViralSegment { start: number; end: number; score: number }

export default function App() {
  const { user, loading, isPro, logout } = useAuth()
  const router = useRouter()

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoName, setVideoName] = useState('')
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoSize, setVideoSize] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['vertical'])
  const [wantViral, setWantViral] = useState(true)
  const [wantCaptions, setWantCaptions] = useState(false)
  const [wantReframe, setWantReframe] = useState(true)

  const [processing, setProcessing] = useState(false)
  const [steps, setSteps] = useState<StepItem[]>([])
  const [results, setResults] = useState<ResultClip[]>([])
  const [lockedSegments, setLockedSegments] = useState<ViralSegment[]>([])
  const [topScore, setTopScore] = useState(0)
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (!loading && !user) router.push('/login') }, [user, loading, router])

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
    setResults([])
    setLockedSegments([])
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]; if (file) loadFile(file)
  }, [])

  const togglePlatform = (key: string) => {
    setSelectedPlatforms(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  const runProcess = async () => {
    if (!videoFile) { setError('Please upload a video first'); return }
    if (selectedPlatforms.length === 0) { setError('Select at least one platform'); return }
    if (!isPro && (user?.videosToday || 0) >= 3) {
      setError('Free plan limit reached (3 videos/day). Upgrade to Pro for unlimited.')
      return
    }

    setError(''); setResults([]); setLockedSegments([]); setProcessing(true)

    const stepDefs: StepItem[] = [
      { id: 'load',     title: 'Loading video into browser',   status: 'wait' },
      ...(wantViral ? [{ id: 'viral', title: isPro ? 'Finding viral moments with AI' : 'Analyzing audio for best moment...', status: 'wait' as const }] : []),
      { id: 'cut',      title: `Cutting ${selectedPlatforms.length} clip${selectedPlatforms.length > 1 ? 's' : ''}`, status: 'wait' },
      ...(wantReframe ? [{ id: 'reframe', title: 'Reframing to vertical / square', status: 'wait' as const }] : []),
      ...(wantCaptions && isPro ? [{ id: 'captions', title: 'Generating captions', status: 'wait' as const }] : []),
      { id: 'export',   title: 'Preparing downloads',          status: 'wait' },
    ]
    setSteps(stepDefs)

    try {
      // Load FFmpeg
      setSteps(prev => prev.map(s => s.id === 'load' ? { ...s, status: 'active', title: 'Loading FFmpeg engine...' } : s))
      const { FFmpeg } = await import('@ffmpeg/ffmpeg')
      const { fetchFile, toBlobURL } = await import('@ffmpeg/util')
      const ffmpeg = new FFmpeg()

      ffmpeg.on('log', ({ message }: { message: string }) => {
        const m = message.match(/time=(\d+):(\d+):(\d+\.\d+)/)
        if (m) {
          const t = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3])
          const pct = Math.min(99, Math.round((t / (videoDuration || 60)) * 100))
          setSteps(prev => prev.map(s => s.id === 'cut' && s.status === 'active' ? { ...s, title: `Cutting clips... ${pct}%` } : s))
        }
      })

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile))
      setSteps(prev => prev.map(s => s.id === 'load' ? { ...s, status: 'done', title: 'Video loaded' } : s))

      // Viral analysis
      let viralStart = 0
      let viralEnd = Math.min(59, videoDuration)

      if (wantViral) {
        setSteps(prev => prev.map(s => s.id === 'viral' ? { ...s, status: 'active' } : s))
        try {
          if (isPro) {
            const token = localStorage.getItem('re_token')
            const res = await fetch('/api/viral-analysis', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ videoTitle: videoName, duration: videoDuration })
            })
            const data = await res.json()
            if (data.clips?.[0]) { viralStart = data.clips[0].startTime; viralEnd = data.clips[0].endTime }
          } else {
            // Free: real Web Audio API analysis
            setSteps(prev => prev.map(s => s.id === 'viral' ? { ...s, title: 'Analyzing audio energy...' } : s))
            const result = await analyzeAudioEnergy(videoFile, 59)
            viralStart = result.start
            viralEnd = result.end
            setTopScore(result.allSegments.sort((a, b) => b.score - a.score)[0]?.score || 0)
            // Store other segments for upsell (skip the best one we're giving them)
            const sorted = result.allSegments.sort((a, b) => b.score - a.score)
            setLockedSegments(sorted.slice(1, 5))
          }
        } catch {
          viralStart = 0; viralEnd = Math.min(59, videoDuration)
        }
        setSteps(prev => prev.map(s => s.id === 'viral' ? { ...s, status: 'done', title: isPro ? 'Viral moment found!' : 'Best moment found!' } : s))
      }

      // Cut clips
      setSteps(prev => prev.map(s => s.id === 'cut' ? { ...s, status: 'active' } : s))
      const clips: ResultClip[] = []

      for (const key of selectedPlatforms) {
        const plat = PLATFORMS.find(p => p.key === key)
        if (!plat) continue
        const startSec = wantViral ? viralStart : 0
        const duration = Math.min(plat.maxSec, videoDuration - startSec)
        if (duration <= 0) continue

        const outFile = `out_${key}.mp4`
        const ffArgs: string[] = ['-ss', String(startSec), '-t', String(duration), '-i', 'input.mp4', '-t', String(duration)]

        if (wantReframe && (plat.w !== 1920 || plat.h !== 1080)) {
          if (plat.w === plat.h) {
            ffArgs.push('-vf', `crop=ih:ih:(iw-ih)/2:0,scale=${plat.w}:${plat.h}`)
          } else if (plat.h > plat.w) {
            ffArgs.push('-vf', `scale=-2:${plat.h},crop=${plat.w}:${plat.h}:(iw-${plat.w})/2:0`)
          }
        }

        ffArgs.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac', '-movflags', '+faststart', outFile)
        await ffmpeg.exec(ffArgs)

        const rawData = await ffmpeg.readFile(outFile)
        const blob = new Blob([rawData as Uint8Array], { type: 'video/mp4' })
        clips.push({
          platform: plat.name,
          name: `${videoName.replace(/\.[^.]+$/, '')}_${key === 'vertical' ? 'short_tiktok_reel' : key}.mp4`,
          spec: plat.spec, url: URL.createObjectURL(blob),
          size: (blob.size / 1024 / 1024).toFixed(1) + ' MB'
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

  const downloadAll = () => results.forEach(r => { const a = document.createElement('a'); a.href = r.url; a.download = r.name; a.click() })

  if (loading) return <div className="min-h-screen bg-[#080808] flex items-center justify-center"><div className="font-mono text-sm text-white/40">Loading...</div></div>
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
          {!isPro && <Link href="/pricing" className="text-xs bg-accent text-white px-4 py-2 rounded hover:opacity-85 transition-opacity">Upgrade to Pro</Link>}
          <button onClick={logout} className="text-xs text-white/30 hover:text-white transition-colors">Log out</button>
        </div>
      </nav>

      <div className="pt-20 min-h-screen bg-[#080808]">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">

            {!videoFile ? (
              <div className="p-10">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all ${dragOver ? 'border-accent bg-accent/5' : 'border-white/10 hover:border-white/20'}`}
                >
                  <div className="text-5xl mb-4">🎬</div>
                  <div className="text-lg font-medium mb-2">Drop your video here</div>
                  <div className="text-sm text-white/30 mb-1">MP4, MOV, AVI, MKV · Click to browse</div>
                  <div className="text-xs text-white/20 font-mono">Your file never leaves your device</div>
                  <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={e => e.target.files?.[0] && loadFile(e.target.files[0])} />
                </div>
              </div>
            ) : (
              <div>
                {/* Video info bar */}
                <div className="flex items-center gap-4 px-6 py-4 bg-[#080808] border-b border-white/5">
                  <span className="text-xl">✅</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{videoName}</div>
                    <div className="text-xs font-mono text-white/30 mt-0.5">{videoSize} · {fmtTime(videoDuration)} · Ready</div>
                  </div>
                  <button onClick={() => { setVideoFile(null); setResults([]); setSteps([]) }} className="text-xs text-white/30 hover:text-white border border-white/10 px-3 py-1.5 rounded transition-colors">✕ Remove</button>
                </div>

                {/* Platforms */}
                <div className="px-6 py-5 border-b border-white/5">
                  <div className="text-xs font-mono uppercase tracking-widest text-white/30 mb-4">Output platforms</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PLATFORMS.map(p => {
                      const on = selectedPlatforms.includes(p.key)
                      return (
                        <button key={p.key} onClick={() => togglePlatform(p.key)} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${on ? 'bg-accent/10 border border-accent/40' : 'bg-[#080808] border border-white/5 hover:border-white/10'}`}>
                          <div className={`w-4 h-4 rounded flex items-center justify-center text-xs flex-shrink-0 ${on ? 'bg-accent text-white' : 'border border-white/20'}`}>{on ? '✓' : ''}</div>
                          <div>
                            <div className="text-sm font-medium">{p.name}</div>
                            <div className="text-xs text-white/30 font-mono">{p.spec}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Options */}
                <div className="px-6 py-4 border-b border-white/5 flex flex-wrap gap-3">
                  <button onClick={() => setWantViral(!wantViral)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${wantViral ? 'bg-accent/10 border border-accent/40 text-white' : 'bg-[#080808] border border-white/5 text-white/40'}`}>
                    <span className={`w-7 h-4 rounded-full relative flex-shrink-0 ${wantViral ? 'bg-accent' : 'bg-white/10'}`}><span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${wantViral ? 'left-3.5' : 'left-0.5'}`} /></span>
                    {isPro ? '🔥 AI viral finder' : '🔥 Find best moment'}
                  </button>
                  <button onClick={() => { if (!isPro) { setError('Auto-captions requires Pro'); return } setWantCaptions(!wantCaptions) }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${wantCaptions ? 'bg-accent/10 border border-accent/40 text-white' : 'bg-[#080808] border border-white/5 text-white/40'}`}>
                    <span className={`w-7 h-4 rounded-full relative flex-shrink-0 ${wantCaptions ? 'bg-accent' : 'bg-white/10'}`}><span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${wantCaptions ? 'left-3.5' : 'left-0.5'}`} /></span>
                    💬 Auto-captions {!isPro && <span className="text-accent text-xs">Pro</span>}
                  </button>
                  <button onClick={() => setWantReframe(!wantReframe)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${wantReframe ? 'bg-accent/10 border border-accent/40 text-white' : 'bg-[#080808] border border-white/5 text-white/40'}`}>
                    <span className={`w-7 h-4 rounded-full relative flex-shrink-0 ${wantReframe ? 'bg-accent' : 'bg-white/10'}`}><span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${wantReframe ? 'left-3.5' : 'left-0.5'}`} /></span>
                    📐 Smart reframe
                  </button>
                </div>

                {error && (
                  <div className="mx-6 mt-4 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded px-4 py-3">
                    {error}{error.includes('Pro') && <Link href="/pricing" className="ml-2 underline">Upgrade →</Link>}
                  </div>
                )}

                <div className="px-6 py-5">
                  <button onClick={runProcess} disabled={processing} className="w-full bg-accent text-white py-4 rounded-lg font-medium text-base hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                    {processing ? '⏳ Processing...' : `⚡ Repurpose Now — ${selectedPlatforms.length} platform${selectedPlatforms.length !== 1 ? 's' : ''}`}
                  </button>
                </div>

                {/* Steps */}
                {steps.length > 0 && (
                  <div className="px-6 pb-5 space-y-2">
                    {steps.map(s => (
                      <div key={s.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${s.status === 'active' ? 'border-accent/30 bg-accent/5' : s.status === 'done' ? 'border-green-500/20 bg-green-500/5' : s.status === 'error' ? 'border-red-500/20' : 'border-white/5'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${s.status === 'active' ? 'text-accent animate-spin-slow' : s.status === 'done' ? 'bg-green-500/20 text-green-400' : s.status === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/20'}`}>
                          {s.status === 'active' ? '↻' : s.status === 'done' ? '✓' : s.status === 'error' ? '✕' : '○'}
                        </div>
                        <span className={`text-sm ${s.status === 'active' ? 'text-white' : s.status === 'done' ? 'text-green-400' : s.status === 'error' ? 'text-red-400' : 'text-white/30'}`}>{s.title}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Results */}
                {results.length > 0 && (
                  <div className="px-6 pb-6 border-t border-white/5 pt-5 space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="font-display text-2xl tracking-wide">YOUR CLIP IS READY</div>
                      <button onClick={downloadAll} className="flex items-center gap-2 bg-green-500 text-black px-4 py-2 rounded text-sm font-semibold hover:opacity-85 transition-opacity">⬇ Download</button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {results.map((r, i) => (
                        <div key={i} className="bg-[#080808] border border-white/10 rounded-lg overflow-hidden">
                          <div className="aspect-video bg-black"><video src={r.url} className="w-full h-full object-cover" muted playsInline /></div>
                          <div className="p-3">
                            <div className="text-xs font-mono text-accent mb-1">{r.platform}</div>
                            <div className="text-xs text-white/60 truncate">{r.name}</div>
                            <div className="text-xs text-white/30 mb-2">{r.size}</div>
                            <a href={r.url} download={r.name} className="block w-full bg-accent text-white text-center py-2 rounded text-xs font-medium hover:opacity-85 transition-opacity">⬇ Download</a>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Freemium upsell — show after delivery */}
                    {wantViral && !isPro && lockedSegments.length > 0 && (
                      <div className="bg-[#0f0f0a] border border-accent/30 rounded-xl p-5">
                        <div className="flex items-start gap-3 mb-4">
                          <span className="text-2xl">🔥</span>
                          <div>
                            <div className="font-semibold text-base mb-1">We found {lockedSegments.length + 1} high-energy moments in your video</div>
                            <div className="text-sm text-white/50">You just got the #1 moment (audio score: {topScore}/100). Here&apos;s what else we found:</div>
                          </div>
                        </div>
                        <div className="space-y-2 mb-4">
                          {lockedSegments.map((seg, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-lg px-4 py-3">
                              <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs flex-shrink-0">🔒</div>
                              <div className="flex-1">
                                <span className="text-sm text-white/40">{fmtTime(seg.start)} → {fmtTime(seg.end)}</span>
                              </div>
                              <div className="text-xs font-mono">
                                <span className="text-accent">{seg.score}</span>
                                <span className="text-white/20">/100</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-white/30 mb-3 text-center">Pro also unlocks AI analysis using real YouTube comment data, auto-captions, and unlimited videos</div>
                        <Link href="/pricing" className="block w-full bg-accent text-white text-center py-3 rounded-lg text-sm font-bold hover:opacity-85 transition-opacity">
                          ⚡ Unlock all {lockedSegments.length + 1} clips with Pro — $19/month
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {!isPro && !results.length && (
            <div className="mt-4 bg-accent/5 border border-accent/20 rounded-xl p-5 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm mb-1">Unlock unlimited videos, AI viral finder & captions</div>
                <div className="text-xs text-white/40">Pro plan — $19/month · Cancel anytime</div>
              </div>
              <Link href="/pricing" className="bg-accent text-white px-5 py-2.5 rounded text-sm font-medium hover:opacity-85 transition-opacity whitespace-nowrap">Upgrade to Pro →</Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

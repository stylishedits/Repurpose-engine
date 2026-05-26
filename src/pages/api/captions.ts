import type { NextApiRequest, NextApiResponse } from 'next'
import { jwtVerify } from 'jose'
import formidable from 'formidable'
import fs from 'fs'

export const config = {
  api: { bodyParser: false }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  // Verify Pro user
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const token = auth.split(' ')[1]
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-change-in-production')
    await jwtVerify(token, secret)
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'Captions not configured yet. Add your OpenAI API key.' })
  }

  try {
    const form = formidable({ maxFileSize: 25 * 1024 * 1024 }) // 25MB limit
    const [, files] = await form.parse(req)
    const audioFile = files.audio?.[0]

    if (!audioFile) return res.status(400).json({ error: 'No audio file provided' })

    const audioData = fs.readFileSync(audioFile.filepath)
    const blob = new Blob([audioData], { type: 'audio/mp4' })

    const formData = new FormData()
    formData.append('file', blob, 'audio.mp4')
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'verbose_json')
    formData.append('timestamp_granularities[]', 'word')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: formData
    })

    const data = await response.json()
    fs.unlinkSync(audioFile.filepath)

    return res.status(200).json({
      text: data.text,
      words: data.words || [],
      segments: data.segments || []
    })
  } catch (err) {
    console.error('Captions error:', err)
    return res.status(500).json({ error: 'Transcription failed' })
  }
}

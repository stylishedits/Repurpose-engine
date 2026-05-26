import type { NextApiRequest, NextApiResponse } from 'next'
import { jwtVerify } from 'jose'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const token = auth.split(' ')[1]
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret')
    await jwtVerify(token, secret)
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'Captions not configured yet.' })
  }

  return res.status(200).json({ text: '', words: [], segments: [] })
}

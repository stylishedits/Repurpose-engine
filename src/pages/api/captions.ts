import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'Captions not configured yet.' })
  }
  return res.status(200).json({ text: '', words: [], segments: [] })
}

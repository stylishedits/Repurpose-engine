import type { NextApiRequest, NextApiResponse } from 'next'
import { jwtVerify } from 'jose'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  // Verify user is Pro
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const token = auth.split(' ')[1]
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-change-in-production')
    await jwtVerify(token, secret)
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }

  const { videoTitle, duration, youtubeUrl } = req.body

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'Viral finder not configured yet. Add your Anthropic API key.' })
  }

  try {
    const prompt = `You are a viral video analyst with web search access.

Video: "${videoTitle}"
Duration: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s
${youtubeUrl ? `YouTube URL: ${youtubeUrl}` : ''}

TASK:
1. Search for this video on YouTube if a URL is provided
2. Find comments mentioning timestamps like "0:45", "at 2 minutes" etc
3. Check if the video has chapter markers
4. Score each 60-second segment 0-100 based on engagement signals
5. The first 20% of the video gets a hook bonus
6. Moments with lots of comment timestamp mentions score highest

Return ONLY valid JSON, no markdown:
{
  "videoFound": true,
  "channelName": "channel name if found",
  "totalViews": "views if found",
  "clips": [
    {
      "startTime": 0,
      "endTime": 60,
      "startLabel": "0:00",
      "endLabel": "1:00",
      "score": 95,
      "reason": "Why this moment is viral",
      "signals": ["signal1", "signal2"],
      "signalTypes": ["hook", "eng"],
      "commentCount": 12
    }
  ]
}

Generate 6-8 clips covering different parts of the video. Make startTime/endTime actual seconds.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    let text = ''
    if (data.content) {
      data.content.forEach((block: any) => {
        if (block.type === 'text') text += block.text
      })
    }

    // Parse JSON from response
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}')
    if (jsonStart > -1 && jsonEnd > -1) {
      const parsed = JSON.parse(text.substring(jsonStart, jsonEnd + 1))
      return res.status(200).json(parsed)
    }

    throw new Error('Could not parse response')
  } catch (err) {
    console.error('Viral analysis error:', err)
    return res.status(500).json({ error: 'Analysis failed' })
  }
}

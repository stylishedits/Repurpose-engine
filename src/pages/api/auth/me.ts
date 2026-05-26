import type { NextApiRequest, NextApiResponse } from 'next'
import { jwtVerify } from 'jose'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })

  const token = auth.split(' ')[1]

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-change-in-production')
    const { payload } = await jwtVerify(token, secret)
    const userId = payload.userId as string

    const client = await clientPromise
    const db = client.db('repurpose-engine')
    const dbUser = await db.collection('users').findOne({ _id: new ObjectId(userId) })

    if (!dbUser) return res.status(404).json({ error: 'User not found' })

    // Reset daily count if new day
    const today = new Date().toDateString()
    if (dbUser.videosDate !== today) {
      await db.collection('users').updateOne({ _id: dbUser._id }, { $set: { videosToday: 0, videosDate: today } })
      dbUser.videosToday = 0
    }

    return res.status(200).json({
      user: {
        id: dbUser._id.toString(),
        name: dbUser.name,
        email: dbUser.email,
        plan: dbUser.plan,
        videosToday: dbUser.videosToday
      }
    })
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

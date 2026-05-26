import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import clientPromise from '@/lib/mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  try {
    const client = await clientPromise
    const db = client.db('repurpose-engine')
    const users = db.collection('users')

    const dbUser = await users.findOne({ email: email.toLowerCase() })
    if (!dbUser) return res.status(401).json({ error: 'Invalid email or password' })

    const valid = await bcrypt.compare(password, dbUser.password)
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

    // Reset daily count if new day
    const today = new Date().toDateString()
    if (dbUser.videosDate !== today) {
      await users.updateOne({ _id: dbUser._id }, { $set: { videosToday: 0, videosDate: today } })
      dbUser.videosToday = 0
    }

    const user = {
      id: dbUser._id.toString(),
      name: dbUser.name,
      email: dbUser.email,
      plan: dbUser.plan,
      videosToday: dbUser.videosToday
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-change-in-production')
    const token = await new SignJWT({ userId: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .sign(secret)

    return res.status(200).json({ token, user })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

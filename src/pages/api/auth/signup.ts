import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import clientPromise from '@/lib/mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { name, email, password } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields required' })
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  try {
    const client = await clientPromise
    const db = client.db('repurpose-engine')
    const users = db.collection('users')

    // Check if email already exists
    const existing = await users.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    // Hash password
    const hash = await bcrypt.hash(password, 12)

    // Create user
    const result = await users.insertOne({
      name,
      email: email.toLowerCase(),
      password: hash,
      plan: 'free',
      videosToday: 0,
      videosDate: new Date().toDateString(),
      createdAt: new Date()
    })

    const user = {
      id: result.insertedId.toString(),
      name,
      email: email.toLowerCase(),
      plan: 'free' as const,
      videosToday: 0
    }

    // Sign JWT
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-change-in-production')
    const token = await new SignJWT({ userId: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .sign(secret)

    return res.status(201).json({ token, user })
  } catch (err) {
    console.error('Signup error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

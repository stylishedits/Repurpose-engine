import type { NextApiRequest, NextApiResponse } from 'next'
import { jwtVerify } from 'jose'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// Verify PayPal webhook and upgrade user plan
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { subscriptionId, planId, token } = req.body

    // Verify the user
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-change-in-production')
    const { payload } = await jwtVerify(token, secret)
    const userId = payload.userId as string

    // Verify subscription with PayPal
    const paypalRes = await fetch(
      `https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(
            `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
          ).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const subscription = await paypalRes.json()

    if (subscription.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Subscription not active' })
    }

    // Determine plan from planId
    const plan = planId === process.env.NEXT_PUBLIC_PAYPAL_AGENCY_PLAN_ID ? 'agency' : 'pro'

    // Update user plan in database
    const client = await clientPromise
    const db = client.db('repurpose-engine')
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          plan,
          paypalSubscriptionId: subscriptionId,
          planUpdatedAt: new Date()
        }
      }
    )

    return res.status(200).json({ success: true, plan })
  } catch (err) {
    console.error('PayPal upgrade error:', err)
    return res.status(500).json({ error: 'Failed to upgrade plan' })
  }
}

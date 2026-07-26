import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Service role bypasses RLS — server-side only, never exposed to browser
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Read raw body for Stripe signature verification
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const rawBody = Buffer.concat(chunks)

  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('[webhook] signature failed:', err.message)
    return res.status(400).json({ error: err.message })
  }

  // ── Payment succeeded → upgrade to PRO ──────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId  = session.client_reference_id

    if (userId) {
      const { error } = await supabase
        .from('profiles')
        .update({
          plan:               'pro',
          stripe_customer_id: session.customer,
        })
        .eq('id', userId)

      if (error) console.error('[webhook] upgrade failed:', error)
      else console.log('[webhook] upgraded user:', userId)
    }
  }

  // ── Subscription cancelled → downgrade to free ──────────
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', sub.customer)
      .single()

    if (profile) {
      await supabase
        .from('profiles')
        .update({ plan: 'free' })
        .eq('id', profile.id)
      console.log('[webhook] downgraded user:', profile.id)
    }
  }

  res.status(200).json({ received: true })
}

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
      // Fetch subscription to get trial end date
      let trialEnd = null
      let subStatus = 'active'
      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription)
        trialEnd  = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null
        subStatus = sub.status
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          plan:               'pro',
          stripe_customer_id: session.customer,
          stripe_trial_end:   trialEnd,
          stripe_sub_status:  subStatus,
        })
        .eq('id', userId)

      if (error) console.error('[webhook] upgrade failed:', error)
      else console.log('[webhook] upgraded user:', userId, '| trial_end:', trialEnd)
    }
  }

  // ── Subscription cancelled or past_due → downgrade to free ──────────
  if (
    event.type === 'customer.subscription.deleted' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'invoice.payment_failed'
  ) {
    const obj = event.data.object
    const customerId = obj.customer

    // For subscription events check status
    if (event.type === 'customer.subscription.updated') {
      const status = obj.status
      // Only downgrade on past_due, unpaid, or canceled
      if (!['past_due', 'unpaid', 'canceled'].includes(status)) {
        return res.status(200).json({ received: true })
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (profile) {
      await supabase
        .from('profiles')
        .update({
          plan:              'free',
          stripe_sub_status: event.type === 'customer.subscription.deleted' ? 'canceled' : obj.status,
          stripe_trial_end:  null,
        })
        .eq('id', profile.id)
      console.log('[webhook] downgraded user:', profile.id, '| event:', event.type)
    }
  }

  res.status(200).json({ received: true })
}

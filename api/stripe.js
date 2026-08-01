import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe    = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase  = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const APP_URL = 'https://maistorix.com'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { action } = req.body

  // ── Create checkout session ───────────────────────────────
  if (action === 'checkout') {
    const { userId, userEmail, trial, billing } = req.body
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    const priceId = billing === 'yearly' && process.env.STRIPE_YEARLY_PRICE_ID
      ? process.env.STRIPE_YEARLY_PRICE_ID
      : process.env.STRIPE_PRICE_ID

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single()

      let customerId = profile?.stripe_customer_id || null

      if (customerId) {
        const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 5 })
        const activeSub = subs.data.find(s => ['active', 'trialing'].includes(s.status))
        if (activeSub) return res.status(400).json({ error: 'Already has active subscription' })
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        ...(customerId ? { customer: customerId } : { customer_email: userEmail }),
        client_reference_id: userId,
        metadata: { userId },
        ...(trial ? { subscription_data: { trial_period_days: 3 } } : {}),
        success_url: `${APP_URL}?upgraded=true`,
        cancel_url:  `${APP_URL}`,
        locale: 'bg',
      })

      return res.json({ url: session.url })
    } catch (err) {
      console.error('[stripe/checkout]', err)
      return res.status(500).json({ error: err.message })
    }
  }

  // ── Customer portal ───────────────────────────────────────
  if (action === 'portal') {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    try {
      const { data: profile, error: dbError } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single()

      if (dbError) return res.status(500).json({ error: dbError.message })
      if (!profile?.stripe_customer_id) return res.status(400).json({ error: 'No Stripe customer found' })

      const session = await stripe.billingPortal.sessions.create({
        customer:   profile.stripe_customer_id,
        return_url: APP_URL,
      })

      return res.json({ url: session.url })
    } catch (err) {
      console.error('[stripe/portal]', err)
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(400).json({ error: 'Unknown action' })
}

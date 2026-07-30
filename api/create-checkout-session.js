import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const APP_URL = 'https://maistorix.com'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId, userEmail, trial, billing } = req.body
  if (!userId) return res.status(400).json({ error: 'Missing userId' })

  // Select monthly or yearly price
  const priceId = billing === 'yearly' && process.env.STRIPE_YEARLY_PRICE_ID
    ? process.env.STRIPE_YEARLY_PRICE_ID
    : process.env.STRIPE_PRICE_ID

  try {
    // Check if customer already exists in Stripe to avoid duplicates
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    let customerId = profile?.stripe_customer_id || null

    // If existing customer, check for active/trialing subscriptions
    if (customerId) {
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 5,
      })
      const activeSub = subs.data.find(s => ['active', 'trialing'].includes(s.status))
      if (activeSub) {
        return res.status(400).json({ error: 'Already has active subscription' })
      }
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

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[checkout]', err)
    res.status(500).json({ error: err.message })
  }
}

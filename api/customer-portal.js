import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const APP_URL = 'https://maistorix.com'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    const { data: profile, error: dbError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (dbError) return res.status(500).json({ error: dbError.message })

    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer found' })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   profile.stripe_customer_id,
      return_url: APP_URL,
    })

    res.json({ url: session.url })
  } catch (err) {
    console.error('[customer-portal]', err)
    res.status(500).json({ error: err.message })
  }
}

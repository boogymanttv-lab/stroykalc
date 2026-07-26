import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const APP_URL = 'https://maistorix.com'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId, userEmail, trial, billing } = req.body
  if (!userId) return res.status(400).json({ error: 'Missing userId' })

  // Select monthly or yearly price
  const priceId = billing === 'yearly' && process.env.STRIPE_YEARLY_PRICE_ID
    ? process.env.STRIPE_YEARLY_PRICE_ID
    : process.env.STRIPE_PRICE_ID

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: userEmail,
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

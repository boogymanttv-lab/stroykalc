import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const ADMIN_EMAIL = 'wellecfx@gmail.com'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Maistorix <noreply@maistorix.com>'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const requestEmail = req.headers['x-admin-email']
  if (requestEmail !== ADMIN_EMAIL) return res.status(403).json({ error: 'Forbidden' })

  const { subject, html, targetGroup } = req.body
  // targetGroup: 'all' | 'pro' | 'free'

  if (!subject?.trim() || !html?.trim()) {
    return res.status(400).json({ error: 'Missing subject or html' })
  }

  // Fetch all users via admin API
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) return res.status(500).json({ error: error.message })

  // Get profiles for plan filter
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, plan')

  const planMap = {}
  if (profiles) profiles.forEach(p => { planMap[p.id] = p.plan || 'free' })

  // Filter confirmed users
  let targets = users.filter(u => u.email_confirmed_at)

  if (targetGroup === 'pro') {
    targets = targets.filter(u => planMap[u.id] === 'pro')
  } else if (targetGroup === 'free') {
    targets = targets.filter(u => planMap[u.id] !== 'pro')
  }

  if (targets.length === 0) {
    return res.json({ ok: true, sent: 0, skipped: 0 })
  }

  // Send in batches of 50 (Resend batch limit)
  let sent = 0
  let failed = 0
  const BATCH = 50

  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH)
    const emails = batch.map(u => ({
      from: FROM,
      to:   u.email,
      subject,
      html,
    }))

    try {
      await resend.batch.send(emails)
      sent += batch.length
    } catch (e) {
      console.error('[bulk-email] batch failed:', e.message)
      failed += batch.length
    }
  }

  console.log(`[bulk-email] sent: ${sent}, failed: ${failed}`)
  return res.json({ ok: true, sent, failed, total: targets.length })
}

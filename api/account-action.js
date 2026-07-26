import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { action, userId, password, reason, days } = req.body
  if (!action || !userId) return res.status(400).json({ error: 'Missing params' })

  try {
    // Verify password by attempting sign-in
    const { data: authData } = await supabase.auth.admin.getUserById(userId)
    if (!authData?.user) return res.status(404).json({ error: 'User not found' })

    const email = authData.user.email

    // Verify password via signInWithPassword
    const anonClient = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )
    const { error: signInError } = await anonClient.auth.signInWithPassword({ email, password })
    if (signInError) return res.status(401).json({ error: 'Грешна парола' })

    // ── Temporary suspension ───────────────────────────────────
    if (action === 'suspend') {
      if (!days || ![7, 14, 30].includes(Number(days))) {
        return res.status(400).json({ error: 'Invalid days' })
      }
      const suspendedUntil = new Date()
      suspendedUntil.setDate(suspendedUntil.getDate() + Number(days))

      await supabase.from('profiles').update({
        account_status: 'suspended',
        suspended_until: suspendedUntil.toISOString(),
        suspension_reason: reason || '',
      }).eq('id', userId)

      // Sign out the user
      await supabase.auth.admin.signOut(userId)

      return res.json({ ok: true, suspended_until: suspendedUntil.toISOString() })
    }

    // ── Request permanent deletion ─────────────────────────────
    if (action === 'request_delete') {
      await supabase.from('profiles').update({
        account_status: 'pending_delete',
        delete_reason: reason || '',
        delete_requested_at: new Date().toISOString(),
      }).eq('id', userId)

      return res.json({ ok: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error('[account-action]', err)
    res.status(500).json({ error: err.message })
  }
}

import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'wellecfx@gmail.com'
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const requestEmail = req.headers['x-admin-email']
  if (requestEmail !== ADMIN_EMAIL) return res.status(403).json({ error: 'Forbidden' })

  const { action, userId } = req.body
  if (!action || !userId) return res.status(400).json({ error: 'Missing action or userId' })

  try {
    // ── Suspend user ──────────────────────────────────────────
    if (action === 'suspend') {
      await supabase.from('profiles')
        .update({ account_status: 'suspended', suspended_until: null })
        .eq('id', userId)
      return res.json({ ok: true })
    }

    // ── Restore user ──────────────────────────────────────────
    if (action === 'restore') {
      await supabase.from('profiles')
        .update({
          account_status: 'active',
          suspended_until: null,
          suspension_reason: null,
          delete_reason: null,
          delete_requested_at: null,
        })
        .eq('id', userId)
      return res.json({ ok: true })
    }

    // ── Permanently delete user ───────────────────────────────
    if (action === 'delete') {
      // Delete all user data first
      const tables = ['projects', 'clients', 'payments', 'expenses', 'tasks', 'photos', 'profiles']
      for (const t of tables) {
        const col = t === 'profiles' ? 'id' : 'user_id'
        await supabase.from(t).delete().eq(col, userId)
      }
      // Delete auth user
      await supabase.auth.admin.deleteUser(userId)
      return res.json({ ok: true })
    }

    // ── Get user data (projects + clients + documents) ────────
    if (action === 'get_data') {
      const [{ data: projects }, { data: clients }, { data: documents }] = await Promise.all([
        supabase.from('projects')
          .select('id, name, total, status, offer_number, created_at, clients(name)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('clients')
          .select('id, name, phone, email')
          .eq('user_id', userId)
          .limit(50),
        supabase.from('documents')
          .select('id, project_id, type, name, storage_path, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100),
      ])
      return res.json({
        projects:  projects  || [],
        clients:   clients   || [],
        documents: documents || [],
      })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error('[admin-action]', err)
    res.status(500).json({ error: err.message })
  }
}

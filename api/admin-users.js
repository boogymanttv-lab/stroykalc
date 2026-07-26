import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'wellecfx@gmail.com'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  // Verify admin via header token (user id passed from client)
  const requestEmail = req.headers['x-admin-email']
  if (requestEmail !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    // Get all auth users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, plan, full_name, company_name, account_status, suspended_until, suspension_reason, delete_reason, delete_requested_at')
    if (profilesError) throw profilesError

    const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))

    const users = authData.users.map(u => ({
      id:                  u.id,
      email:               u.email,
      created_at:          u.created_at,
      plan:                profileMap[u.id]?.plan || 'free',
      full_name:           profileMap[u.id]?.full_name || '',
      company_name:        profileMap[u.id]?.company_name || '',
      account_status:      profileMap[u.id]?.account_status || 'active',
      suspended_until:     profileMap[u.id]?.suspended_until || null,
      suspension_reason:   profileMap[u.id]?.suspension_reason || '',
      delete_reason:       profileMap[u.id]?.delete_reason || '',
      delete_requested_at: profileMap[u.id]?.delete_requested_at || null,
    }))

    // Sort newest first
    users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    res.status(200).json({ users })
  } catch (err) {
    console.error('[admin-users]', err)
    res.status(500).json({ error: err.message })
  }
}

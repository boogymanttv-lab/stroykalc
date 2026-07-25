import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'wellecfx@gmail.com'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
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
      .select('id, plan, full_name, company_name, stripe_customer_id, created_at')
    if (profilesError) throw profilesError

    const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))

    const users = authData.users.map(u => ({
      id:           u.id,
      email:        u.email,
      created_at:   u.created_at,
      plan:         profileMap[u.id]?.plan || 'free',
      full_name:    profileMap[u.id]?.full_name || '',
      company_name: profileMap[u.id]?.company_name || '',
    }))

    // Sort newest first
    users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    res.status(200).json({ users })
  } catch (err) {
    console.error('[admin-users]', err)
    res.status(500).json({ error: err.message })
  }
}

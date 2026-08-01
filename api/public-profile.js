import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') return res.status(405).end()

  const { slug } = req.query
  if (!slug) return res.status(400).json({ error: 'Missing slug' })

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      company_name, full_name, logo_url, public_bio, public_services,
      public_website, public_show_phone, public_show_email, phone, email,
      city, address, company_type
    `)
    .eq('public_slug', slug)
    .eq('public_enabled', true)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Not found' })

  // Only return phone/email if user opted in
  const result = {
    company_name:  data.company_name || data.full_name || '',
    logo_url:      data.logo_url     || null,
    bio:           data.public_bio   || '',
    services:      data.public_services || [],
    website:       data.public_website  || '',
    city:          data.city            || '',
    company_type:  data.company_type    || '',
    phone:         data.public_show_phone ? (data.phone || '') : '',
    email:         data.public_show_email ? (data.email || '') : '',
  }

  res.json(result)
}

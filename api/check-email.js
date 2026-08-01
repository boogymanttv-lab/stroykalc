import disposableDomains from 'disposable-email-domains'

const domainSet = new Set(disposableDomains)

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'POST') return res.status(405).end()

  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Missing email' })

  const domain = email.split('@')[1]?.toLowerCase()
  const blocked = domain ? domainSet.has(domain) : false

  return res.json({ blocked })
}

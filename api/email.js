import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = 'Maistorix <noreply@maistorix.com>'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'wellecfx@gmail.com'

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

async function sendEmail(to, subject, html) {
  try {
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (e) {
    console.error('[email] failed:', to, e.message)
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Cron job calls via GET — run reminders
  if (req.method === 'GET') {
    req.body = { action: 'reminders' }
  } else if (req.method !== 'POST') {
    return res.status(405).end()
  }

  const { action } = req.body

  // ── Send offer to client ──────────────────────────────────────────────────
  if (action === 'offer') {
    const { to, senderName, offerName, shareUrl, message, offerHtml } = req.body
    if (!to || !offerHtml) return res.status(400).json({ error: 'Missing fields' })

    const subject = `${offerName || 'Оферта'} от ${senderName || 'Maistorix'}`
    const html = `
<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px;">Maistorix</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px;">Управление на строителния бизнес</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="font-size:16px;color:#334155;margin:0 0 8px;">Здравейте,</p>
            <p style="font-size:15px;color:#475569;margin:0 0 24px;">
              ${senderName ? `<strong>${senderName}</strong> Ви изпраща оферта чрез Maistorix.` : 'Получихте нова оферта чрез Maistorix.'}
              ${message ? `<br><br><em style="color:#64748b;">"${message}"</em>` : ''}
            </p>
            ${shareUrl ? `
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
              <tr>
                <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:12px;padding:14px 28px;text-align:center;">
                  <a href="${shareUrl}" style="color:#fff;font-size:15px;font-weight:700;text-decoration:none;">
                    👁️ Преглед на офертата онлайн
                  </a>
                </td>
              </tr>
            </table>` : ''}
            <div style="border-top:1px solid #e2e8f0;margin:24px 0;"></div>
            <p style="font-size:12px;color:#94a3b8;margin:0 0 16px;">Офертата е приложена по-долу:</p>
            <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">${offerHtml}</div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="font-size:11px;color:#94a3b8;margin:0;">
              Изпратено чрез <strong>Maistorix</strong> ·
              <a href="https://maistorix.com" style="color:#6366f1;text-decoration:none;">maistorix.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    try {
      await resend.emails.send({ from: FROM, to, subject, html })
      return res.json({ ok: true })
    } catch (err) {
      console.error('[email/offer]', err)
      return res.status(500).json({ error: err.message })
    }
  }

  // ── Send bulk email to all users (admin only) ─────────────────────────────
  if (action === 'bulk') {
    const requestEmail = req.headers['x-admin-email']
    if (requestEmail !== ADMIN_EMAIL) return res.status(403).json({ error: 'Forbidden' })

    const { subject, html, targetGroup } = req.body
    if (!subject?.trim() || !html?.trim()) return res.status(400).json({ error: 'Missing subject or html' })

    const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (error) return res.status(500).json({ error: error.message })

    const { data: profiles } = await supabase.from('profiles').select('id, plan')
    const planMap = {}
    if (profiles) profiles.forEach(p => { planMap[p.id] = p.plan || 'free' })

    let targets = users.filter(u => u.email_confirmed_at)
    if (targetGroup === 'pro')  targets = targets.filter(u => planMap[u.id] === 'pro')
    if (targetGroup === 'free') targets = targets.filter(u => planMap[u.id] !== 'pro')

    if (targets.length === 0) return res.json({ ok: true, sent: 0, failed: 0 })

    let sent = 0, failed = 0
    for (let i = 0; i < targets.length; i += 50) {
      const batch = targets.slice(i, i + 50)
      try {
        await resend.batch.send(batch.map(u => ({ from: FROM, to: u.email, subject, html })))
        sent += batch.length
      } catch (e) {
        console.error('[email/bulk] batch failed:', e.message)
        failed += batch.length
      }
    }

    return res.json({ ok: true, sent, failed, total: targets.length })
  }

  // ── Send subscription reminders (cron) ───────────────────────────────────
  if (action === 'reminders') {
    const auth = req.headers.authorization
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized' })

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, company_name, stripe_trial_end, stripe_current_period_end, stripe_billing_interval, stripe_sub_status, plan')
      .eq('plan', 'pro')

    if (error) return res.status(500).json({ error: error.message })

    let sent = 0
    for (const p of profiles) {
      const name = p.full_name || p.company_name || p.email

      if (p.stripe_sub_status === 'trialing' && daysUntil(p.stripe_trial_end) === 1) {
        await sendEmail(p.email, '⏳ Пробният ви период изтича утре — Maistorix',
          `<p>Здравейте, ${name}!</p><p>Пробният ви период в <strong>Maistorix PRO</strong> изтича <strong>утре</strong>.</p>
           <p><a href="https://maistorix.com" style="background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:10px">Управление на абонамента</a></p>
           <p style="color:#94a3b8;font-size:12px;margin-top:20px">Maistorix</p>`)
        sent++
      }

      if (p.stripe_sub_status === 'active' && p.stripe_billing_interval === 'month' && daysUntil(p.stripe_current_period_end) === 3) {
        await sendEmail(p.email, '💳 Предстоящо плащане след 3 дни — Maistorix',
          `<p>Здравейте, ${name}!</p><p>Месечният ви абонамент се подновява след <strong>3 дни</strong>. Сумата от <strong>€2.99</strong> ще бъде изтеглена автоматично.</p>
           <p><a href="https://maistorix.com" style="background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:10px">Управление на абонамента</a></p>
           <p style="color:#94a3b8;font-size:12px;margin-top:20px">Maistorix</p>`)
        sent++
      }

      if (p.stripe_sub_status === 'active' && p.stripe_billing_interval === 'year' && daysUntil(p.stripe_current_period_end) === 30) {
        await sendEmail(p.email, '📅 Годишният ви абонамент изтича след 1 месец — Maistorix',
          `<p>Здравейте, ${name}!</p><p>Годишният ви абонамент се подновява след <strong>30 дни</strong>. Сумата от <strong>€24.99</strong> ще бъде изтеглена автоматично.</p>
           <p><a href="https://maistorix.com" style="background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:10px">Управление на абонамента</a></p>
           <p style="color:#94a3b8;font-size:12px;margin-top:20px">Maistorix</p>`)
        sent++
      }
    }

    return res.json({ ok: true, sent })
  }

  return res.status(400).json({ error: 'Unknown action' })
}

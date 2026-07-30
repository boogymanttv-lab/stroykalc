import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'Maistorix <noreply@maistorix.com>'

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

async function sendEmail(to, subject, html) {
  try {
    await resend.emails.send({ from: FROM, to, subject, html })
    console.log('[reminders] sent to:', to, '|', subject)
  } catch (e) {
    console.error('[reminders] failed:', to, e.message)
  }
}

export default async function handler(req, res) {
  // Allow only Vercel cron or internal calls
  const auth = req.headers.authorization
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, company_name, stripe_trial_end, stripe_current_period_end, stripe_billing_interval, stripe_sub_status, plan')
    .eq('plan', 'pro')

  if (error) {
    console.error('[reminders] fetch failed:', error)
    return res.status(500).json({ error: error.message })
  }

  let sent = 0

  for (const p of profiles) {
    const name = p.full_name || p.company_name || p.email

    // ── Trial: 1 day left ────────────────────────────────────
    if (p.stripe_sub_status === 'trialing' && p.stripe_trial_end) {
      const days = daysUntil(p.stripe_trial_end)
      if (days === 1) {
        await sendEmail(p.email,
          '⏳ Пробният ви период изтича утре — Maistorix',
          `<p>Здравейте, ${name}!</p>
           <p>Пробният ви период в <strong>Maistorix PRO</strong> изтича <strong>утре</strong>.</p>
           <p>За да продължите да използвате всички PRO функции, уверете се, че имате валидна карта.</p>
           <p><a href="https://maistorix.com" style="background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:10px">Управление на абонамента</a></p>
           <p style="color:#94a3b8;font-size:12px;margin-top:20px">Maistorix — управление на строителния бизнес</p>`
        )
        sent++
      }
    }

    // ── Monthly: 3 days left ─────────────────────────────────
    if (p.stripe_sub_status === 'active' && p.stripe_billing_interval === 'month' && p.stripe_current_period_end) {
      const days = daysUntil(p.stripe_current_period_end)
      if (days === 3) {
        await sendEmail(p.email,
          '💳 Предстоящо плащане след 3 дни — Maistorix',
          `<p>Здравейте, ${name}!</p>
           <p>Месечният ви абонамент за <strong>Maistorix PRO</strong> се подновява след <strong>3 дни</strong>.</p>
           <p>Сумата от <strong>€2.99</strong> ще бъде изтеглена автоматично от вашата карта.</p>
           <p><a href="https://maistorix.com" style="background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:10px">Управление на абонамента</a></p>
           <p style="color:#94a3b8;font-size:12px;margin-top:20px">Maistorix — управление на строителния бизнес</p>`
        )
        sent++
      }
    }

    // ── Yearly: 30 days left ─────────────────────────────────
    if (p.stripe_sub_status === 'active' && p.stripe_billing_interval === 'year' && p.stripe_current_period_end) {
      const days = daysUntil(p.stripe_current_period_end)
      if (days === 30) {
        await sendEmail(p.email,
          '📅 Годишният ви абонамент изтича след 1 месец — Maistorix',
          `<p>Здравейте, ${name}!</p>
           <p>Годишният ви абонамент за <strong>Maistorix PRO</strong> се подновява след <strong>30 дни</strong>.</p>
           <p>Сумата от <strong>€24.99</strong> ще бъде изтеглена автоматично от вашата карта.</p>
           <p><a href="https://maistorix.com" style="background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:10px">Управление на абонамента</a></p>
           <p style="color:#94a3b8;font-size:12px;margin-top:20px">Maistorix — управление на строителния бизнес</p>`
        )
        sent++
      }
    }
  }

  console.log('[reminders] done. sent:', sent)
  res.status(200).json({ ok: true, sent })
}

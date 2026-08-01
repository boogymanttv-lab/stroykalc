import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = 'Maistorix <noreply@maistorix.com>'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

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

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px;">Maistorix</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px;">Управление на строителния бизнес</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="font-size:16px;color:#334155;margin:0 0 8px;">Здравейте,</p>
            <p style="font-size:15px;color:#475569;margin:0 0 24px;">
              ${senderName ? `<strong>${senderName}</strong> Ви изпраща оферта чрез Maistorix.` : 'Получихте нова оферта чрез Maistorix.'}
              ${message ? `<br><br><em style="color:#64748b;">"${message}"</em>` : ''}
            </p>

            ${shareUrl ? `
            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
              <tr>
                <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:12px;padding:14px 28px;text-align:center;">
                  <a href="${shareUrl}" style="color:#fff;font-size:15px;font-weight:700;text-decoration:none;">
                    👁️ Преглед на офертата онлайн
                  </a>
                </td>
              </tr>
            </table>
            ` : ''}

            <!-- Divider -->
            <div style="border-top:1px solid #e2e8f0;margin:24px 0;"></div>
            <p style="font-size:12px;color:#94a3b8;margin:0 0 16px;">Офертата е приложена по-долу:</p>

            <!-- Offer HTML -->
            <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
              ${offerHtml}
            </div>
          </td>
        </tr>

        <!-- Footer -->
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
    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[send-offer]', err)
    res.status(500).json({ error: err.message })
  }
}

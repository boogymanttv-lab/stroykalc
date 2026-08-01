import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

webpush.setVapidDetails(
  'mailto:noreply@maistorix.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export default async function handler(req, res) {
  const auth = req.headers.authorization
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // ── Fetch overdue tasks ──────────────────────────────────
  const { data: overdueTasks } = await supabase
    .from('tasks')
    .select('id, title, due_date, user_id')
    .lt('due_date', today.toISOString())
    .eq('completed', false)

  // ── Fetch overdue payments ───────────────────────────────
  const { data: overduePayments } = await supabase
    .from('payments')
    .select('id, amount, due_date, user_id, projects(name)')
    .lt('due_date', today.toISOString())
    .eq('status', 'pending')

  // Group by user_id
  const userMap = {}

  for (const task of (overdueTasks || [])) {
    if (!userMap[task.user_id]) userMap[task.user_id] = { tasks: [], payments: [] }
    userMap[task.user_id].tasks.push(task)
  }
  for (const payment of (overduePayments || [])) {
    if (!userMap[payment.user_id]) userMap[payment.user_id] = { tasks: [], payments: [] }
    userMap[payment.user_id].payments.push(payment)
  }

  if (Object.keys(userMap).length === 0) {
    return res.status(200).json({ ok: true, sent: 0 })
  }

  // ── Fetch push subscriptions for affected users ──────────
  const userIds = Object.keys(userMap)
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds)

  let sent = 0
  const stale = []

  for (const sub of (subs || [])) {
    const info = userMap[sub.user_id]
    if (!info) continue

    const taskCount    = info.tasks.length
    const paymentCount = info.payments.length

    let title = '⚠️ Maistorix напомняне'
    let body  = ''

    if (taskCount > 0 && paymentCount > 0) {
      body = `${taskCount} просрочени задачи и ${paymentCount} просрочени плащания`
    } else if (taskCount > 0) {
      body = taskCount === 1
        ? `Задача "${info.tasks[0].title}" е просрочена`
        : `${taskCount} просрочени задачи чакат вас`
    } else {
      body = paymentCount === 1
        ? `Плащане за "${info.payments[0].projects?.name || 'проект'}" е просрочено`
        : `${paymentCount} просрочени плащания`
    }

    const pushSub = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    }

    try {
      await webpush.sendNotification(pushSub, JSON.stringify({ title, body }))
      sent++
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        stale.push(sub.endpoint)
      } else {
        console.error('[push] failed:', sub.endpoint, err.message)
      }
    }
  }

  // Remove stale subscriptions
  if (stale.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', stale)
  }

  console.log('[push] sent:', sent, 'stale removed:', stale.length)
  res.status(200).json({ ok: true, sent })
}

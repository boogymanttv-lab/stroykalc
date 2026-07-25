import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const fmt = n =>
  '€ ' + Number(n).toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function OverdueAlert({ onGoToProject }) {
  const { user, profile } = useAuth()
  const [overdue,  setOverdue]  = useState([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => { checkOverdue() }, [profile])

  async function checkOverdue() {
    if (!user) return
    const days = profile?.reminder_days ?? 7

    // Load all active (non-completed) projects with payment sums
    const [{ data: projects }, { data: payments }] = await Promise.all([
      supabase.from('projects')
        .select('id, name, total, created_at')
        .not('status', 'in', '(completed,cancelled)')
        .lt('created_at', new Date(Date.now() - days * 86400000).toISOString()),
      supabase.from('payments').select('project_id, amount'),
    ])

    if (!projects?.length) return

    // Build paid map
    const paidMap = {}
    for (const p of (payments || [])) {
      paidMap[p.project_id] = (paidMap[p.project_id] || 0) + Number(p.amount)
    }

    // Find projects with remaining balance
    const overduelist = projects.filter(p => {
      const paid = paidMap[p.id] || 0
      return Number(p.total) - paid > 0.01
    })

    setOverdue(overduelist)
  }

  if (dismissed || overdue.length === 0) return null

  return (
    <div className="mx-4 mt-3 flex-shrink-0 bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="font-bold text-amber-800 text-sm mb-1">
            💰 {overdue.length} проект{overdue.length > 1 ? 'а' : ''} с неплатени суми
          </div>
          <div className="space-y-1">
            {overdue.slice(0, 3).map(p => (
              <button
                key={p.id}
                onClick={() => { onGoToProject?.(p.id); setDismissed(true) }}
                className="block text-xs text-amber-700 hover:text-amber-900 hover:underline text-left"
              >
                → {p.name} ({fmt(p.total)})
              </button>
            ))}
            {overdue.length > 3 && (
              <div className="text-xs text-amber-500">и още {overdue.length - 3}...</div>
            )}
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400 hover:text-amber-600 text-xl leading-none flex-shrink-0"
        >
          ×
        </button>
      </div>
    </div>
  )
}

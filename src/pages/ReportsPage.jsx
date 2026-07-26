import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'

const fmt = n =>
  '€ ' + Number(n).toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const MONTHS_BG = ['Яну','Фев','Мар','Апр','Май','Юни','Юли','Авг','Сеп','Окт','Ное','Дек']

const STATUS_LABEL = {
  draft:       'Чернова',
  sent:        'Изпратена',
  accepted:    'Приета',
  in_progress: 'В процес',
  completed:   'Завършена',
  cancelled:   'Отказана',
}

const STATUS_COLOR = {
  draft:       '#94a3b8',
  sent:        '#3b82f6',
  accepted:    '#22c55e',
  in_progress: '#f59e0b',
  completed:   '#10b981',
  cancelled:   '#ef4444',
}

export default function ReportsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [payments, setPayments] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [expenses, setExpenses] = useState([])

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    if (navigator.onLine) {
      const [{ data: proj }, { data: pays }, { data: exps }] = await Promise.all([
        supabase.from('projects').select('id, name, total, subtotal, vat_amount, status, created_at, clients(name)'),
        supabase.from('payments').select('*').order('paid_at', { ascending: true }),
        supabase.from('expenses').select('project_id, amount'),
      ])
      setProjects(proj || [])
      setPayments(pays || [])
      setExpenses(exps || [])
    } else {
      // Offline — read from IndexedDB with fallback
      try {
        let proj = await db.projects.where('user_id').equals(user.id).toArray()
        if (!proj.length) proj = await db.projects.toArray()

        let pays = await db.payments.where('user_id').equals(user.id).toArray()
        if (!pays.length) pays = await db.payments.toArray()

        let exps = await db.expenses.where('user_id').equals(user.id).toArray()
        if (!exps.length) exps = await db.expenses.toArray()

        setProjects(proj.map(p => ({ ...p, clients: p._client_name ? { name: p._client_name } : null })))
        setPayments(pays.sort((a, b) => new Date(a.paid_at) - new Date(b.paid_at)))
        setExpenses(exps)
      } catch (e) {
        console.warn('[offline] ReportsPage read failed', e)
      }
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Зареждане...
      </div>
    )
  }

  /* ── CSV Export ── */
  function exportCSV() {
    // Build paid + expense maps
    const paidMap = {}
    for (const p of payments) paidMap[p.project_id] = (paidMap[p.project_id] || 0) + Number(p.amount)
    const expMap = {}
    for (const e of expenses) expMap[e.project_id] = (expMap[e.project_id] || 0) + Number(e.amount)

    const rows = [
      ['Проект', 'Клиент', 'Статус', 'Стойност (€)', 'Получено (€)', 'Разходи (€)', 'Печалба (€)', 'Дата'],
      ...projects.map(p => {
        const paid = paidMap[p.id] || 0
        const exp  = expMap[p.id]  || 0
        return [
          p.name,
          p.clients?.name || '',
          STATUS_LABEL[p.status] || p.status,
          Number(p.total).toFixed(2),
          paid.toFixed(2),
          exp.toFixed(2),
          (paid - exp).toFixed(2),
          new Date(p.created_at).toLocaleDateString('bg-BG'),
        ]
      }),
      [], // blank row
      ['ОБЩО', '', '', totalValue.toFixed(2), totalReceived.toFixed(2), totalExpenses.toFixed(2), (totalReceived - totalExpenses).toFixed(2), ''],
    ]

    const csv = rows
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `Maistorix_Отчет_${new Date().toLocaleDateString('bg-BG')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ── Derived stats ── */
  const totalValue    = projects.reduce((s, p) => s + Number(p.total), 0)
  const totalReceived = payments.reduce((s, p) => s + Number(p.amount), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const outstanding   = totalValue - totalReceived
  const totalProfit   = totalReceived - totalExpenses

  // Paid totals per project
  const paidMap = {}
  for (const p of payments) {
    paidMap[p.project_id] = (paidMap[p.project_id] || 0) + Number(p.amount)
  }

  // Projects by status
  const statusCounts = {}
  for (const p of projects) {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
  }

  // Monthly payments — last 6 months
  const now      = new Date()
  const months   = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    return { year: d.getFullYear(), month: d.getMonth(), label: MONTHS_BG[d.getMonth()] }
  })
  const monthTotals = months.map(m => {
    const sum = payments
      .filter(p => {
        const d = new Date(p.paid_at)
        return d.getFullYear() === m.year && d.getMonth() === m.month
      })
      .reduce((s, p) => s + Number(p.amount), 0)
    return { ...m, sum }
  })
  const maxMonthVal = Math.max(...monthTotals.map(m => m.sum), 1)

  // Recent payments (last 8)
  const recentPayments = [...payments].reverse().slice(0, 8)

  // Top projects by total
  const topProjects = [...projects]
    .sort((a, b) => Number(b.total) - Number(a.total))
    .slice(0, 5)

  return (
    <div className="flex-1 overflow-y-auto thin-scroll p-4 max-w-2xl mx-auto w-full">
      <div className="space-y-5 pb-10">

        {/* ── Export button ── */}
        <div className="flex justify-end">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700
                       font-semibold text-sm hover:bg-emerald-100 transition-colors border border-emerald-200"
          >
            📥 Експорт CSV / Excel
          </button>
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            icon="📁" label="Проекти" value={String(projects.length)}
            sub={`${projects.filter(p => p.status === 'completed').length} завършени`}
            color="indigo"
          />
          <SummaryCard
            icon="💼" label="Обща стойност" value={fmt(totalValue)}
            sub="всички оферти"
            color="violet"
          />
          <SummaryCard
            icon="✅" label="Получено" value={fmt(totalReceived)}
            sub="от клиенти"
            color="emerald"
          />
          <SummaryCard
            icon="⏳" label="Предстои" value={fmt(Math.max(0, outstanding))}
            sub="незаплатено"
            color={outstanding > 0 ? 'amber' : 'emerald'}
          />
          <SummaryCard
            icon="💸" label="Разходи" value={fmt(totalExpenses)}
            sub="материали, наем..."
            color="red"
          />
          <SummaryCard
            icon="📈" label="Реална печалба" value={fmt(totalProfit)}
            sub="получено − разходи"
            color={totalProfit >= 0 ? 'emerald' : 'red'}
          />
        </div>

        {/* ── Monthly income bar chart ── */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-700 mb-4">📊 Приходи по месеци</h2>
          {monthTotals.every(m => m.sum === 0) ? (
            <p className="text-slate-400 text-sm text-center py-6">Няма регистрирани плащания</p>
          ) : (
            <div className="flex items-end gap-2 h-36">
              {monthTotals.map(m => {
                const pct = (m.sum / maxMonthVal) * 100
                return (
                  <div key={`${m.year}-${m.month}`} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-xs font-bold text-indigo-600 leading-none mb-1">
                      {m.sum > 0 ? '€' + Math.round(m.sum) : ''}
                    </div>
                    <div className="w-full rounded-t-lg transition-all duration-500 relative overflow-hidden"
                      style={{
                        height: `${Math.max(pct, m.sum > 0 ? 8 : 0)}%`,
                        background: m.sum > 0
                          ? 'linear-gradient(180deg,#4f46e5,#7c3aed)'
                          : '#f1f5f9',
                        minHeight: m.sum > 0 ? '6px' : '3px',
                      }}
                    />
                    <div className="text-[10px] text-slate-400 font-semibold">{m.label}</div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Projects by status ── */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-700 mb-4">📋 Проекти по статус</h2>
          {projects.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">Няма проекти</p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(statusCounts).map(([status, count]) => {
                const pct = Math.round((count / projects.length) * 100)
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-600">
                        {STATUS_LABEL[status] || status}
                      </span>
                      <span className="text-xs text-slate-400">{count} бр. · {pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: STATUS_COLOR[status] || '#94a3b8' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Top projects by value ── */}
        {topProjects.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-700 mb-4">🏆 Топ проекти по стойност</h2>
            <div className="space-y-2">
              {topProjects.map((p, i) => {
                const paid      = paidMap[p.id] || 0
                const paidPct   = p.total > 0 ? Math.min(100, (paid / p.total) * 100) : 0
                const fullyPaid = paid >= Number(p.total) - 0.01
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-black flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-semibold text-slate-700 truncate">{p.name}</span>
                        <span className="text-sm font-bold text-indigo-600 ml-2 flex-shrink-0">{fmt(p.total)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${paidPct}%`,
                            background: fullyPaid ? '#10b981' : '#4f46e5',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Recent payments ── */}
        {recentPayments.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-700 mb-4">💸 Последни плащания</h2>
            <div className="space-y-2">
              {recentPayments.map(p => {
                const proj = projects.find(x => x.id === p.project_id)
                const typeLabel = { advance: 'Аванс', payment: 'Плащане', final: 'Финал' }[p.type] || p.type
                const methLabel = { cash: '💵', bank: '🏦', card: '💳' }[p.method] || ''
                return (
                  <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="text-xl flex-shrink-0">{methLabel}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-700 truncate">
                        {proj?.name || '—'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {typeLabel} · {new Date(p.paid_at).toLocaleDateString('bg-BG')}
                        {p.notes && ` · ${p.notes}`}
                      </div>
                    </div>
                    <div className="font-bold text-emerald-600 text-sm whitespace-nowrap">
                      {fmt(p.amount)}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {projects.length === 0 && payments.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-slate-600 mb-2">Няма данни за отчет</h3>
            <p className="text-slate-400 text-sm">Запази проекти и регистрирай плащания, за да видиш статистиката</p>
          </div>
        )}

      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value, sub, color }) {
  const colors = {
    indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  sub: 'text-indigo-400' },
    violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  sub: 'text-violet-400' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', sub: 'text-emerald-400' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   sub: 'text-amber-400' },
    red:     { bg: 'bg-red-50',     text: 'text-red-600',     sub: 'text-red-400' },
  }
  const c = colors[color] || colors.indigo
  return (
    <div className={`${c.bg} rounded-2xl p-4`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-xs font-semibold uppercase tracking-wide ${c.sub} mb-1`}>{label}</div>
      <div className={`text-lg font-black ${c.text} leading-tight`}>{value}</div>
      <div className={`text-xs ${c.sub} mt-0.5`}>{sub}</div>
    </div>
  )
}

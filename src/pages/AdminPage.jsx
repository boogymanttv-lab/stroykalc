import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'
import { showToast } from '../lib/toast'

const ADMIN_EMAIL = 'wellecfx@gmail.com'
const fmt = n => '€ ' + Number(n || 0).toLocaleString('bg-BG', { minimumFractionDigits: 2 })

const STATUS_KEY = {
  active:               'statusActive',
  suspended:            'statusSuspended',
  pending_reactivation: 'statusPendingReactivation',
  pending_delete:       'statusPendingDelete',
}

const STATUS_COLOR = {
  active:               'bg-emerald-100 text-emerald-700',
  suspended:            'bg-amber-100 text-amber-700',
  pending_reactivation: 'bg-orange-100 text-orange-700',
  pending_delete:       'bg-red-100 text-red-600',
}

const TICKET_STATUS_COLOR = {
  new:      'bg-blue-100 text-blue-700',
  pending:  'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
}
const TICKET_STATUS_LABEL = { new: 'Ново', pending: 'В изчакване', resolved: 'Решено' }

export default function AdminPage() {
  const { user } = useAuth()
  const { t, lang } = useLang()
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [filter,  setFilter]  = useState('all')
  const [search,  setSearch]  = useState('')
  const [viewUser, setViewUser]   = useState(null)
  const [userData, setUserData]   = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  // Bulk email
  const [bulkSubject,  setBulkSubject]  = useState('')
  const [bulkText,     setBulkText]     = useState('')
  const [bulkGroup,    setBulkGroup]    = useState('all')
  const [bulkLoading,  setBulkLoading]  = useState(false)
  const [bulkResult,   setBulkResult]   = useState(null)

  async function sendBulkEmail() {
    if (!bulkSubject.trim() || !bulkText.trim()) return showToast('Попълни тема и текст', 'error')
    if (!confirm(`Изпрати имейл до всички ${bulkGroup === 'all' ? 'потребители' : bulkGroup === 'pro' ? 'PRO потребители' : 'Free потребители'}?`)) return
    setBulkLoading(true)
    setBulkResult(null)
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-email': user.email },
      body: JSON.stringify({ action: 'bulk', subject: bulkSubject, html: buildEmailHtml(bulkText), targetGroup: bulkGroup }),
    })
    const data = await res.json()
    setBulkLoading(false)
    if (data.ok) {
      setBulkResult(data)
      showToast(`✅ Изпратено до ${data.sent} потребители`, 'success')
      setBulkSubject(''); setBulkText('')
    } else {
      showToast('Грешка: ' + data.error, 'error')
    }
  }

  function buildEmailHtml(text) {
    const paragraphs = text.split('\n').filter(l => l.trim()).map(l => `<p style="margin:0 0 12px">${l}</p>`).join('')
    return `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px">
          <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">Maistorix</h1>
          <p style="color:rgba(255,255,255,.7);margin:4px 0 0;font-size:13px">Управление на строителния бизнес</p>
        </div>
        <div style="padding:32px;color:#1e293b;font-size:15px;line-height:1.6">
          ${paragraphs}
        </div>
        <div style="padding:20px 32px;border-top:1px solid #f1f5f9;text-align:center">
          <a href="https://maistorix.com" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Отвори Maistorix</a>
          <p style="color:#94a3b8;font-size:11px;margin:16px 0 0">© 2025 Maistorix · <a href="https://maistorix.com" style="color:#94a3b8">maistorix.com</a></p>
        </div>
      </div>`
  }

  // Grant PRO modal
  const [proModal,    setProModal]    = useState(null) // user object
  const [proStart,    setProStart]    = useState('')
  const [proEnd,      setProEnd]      = useState('')
  const [proLoading,  setProLoading]  = useState(false)

  async function grantPro() {
    if (!proStart || !proEnd) return showToast('Избери дата от и до', 'error')
    if (new Date(proEnd) <= new Date(proStart)) return showToast('Крайната дата трябва да е след началната', 'error')
    setProLoading(true)
    const res = await fetch('/api/admin-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-email': user.email },
      body: JSON.stringify({ action: 'grant_pro', userId: proModal.id, startDate: proStart, endDate: proEnd }),
    })
    const data = await res.json()
    setProLoading(false)
    if (data.ok) {
      showToast('✅ PRO активиран до ' + new Date(proEnd).toLocaleDateString('bg-BG'), 'success')
      setProModal(null)
      await loadUsers()
    } else {
      showToast('Грешка: ' + data.error, 'error')
    }
  }

  async function revokePro(u) {
    if (!confirm(`Махни PRO от ${u.email}?`)) return
    setActionLoading(u.id + 'revoke_pro')
    const res = await fetch('/api/admin-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-email': user.email },
      body: JSON.stringify({ action: 'revoke_pro', userId: u.id }),
    })
    const data = await res.json()
    setActionLoading(null)
    if (data.ok) { showToast('PRO премахнат', 'success'); await loadUsers() }
    else showToast('Грешка: ' + data.error, 'error')
  }

  // Support tickets
  const [tickets,       setTickets]       = useState([])
  const [ticketsTab,    setTicketsTab]    = useState('all')
  const [ticketLoading, setTicketLoading] = useState(false)
  const [adminNote,     setAdminNote]     = useState({})

  useEffect(() => { loadUsers(); loadTickets() }, [])

  async function loadTickets() {
    setTicketLoading(true)
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
    setTickets(data || [])
    setTicketLoading(false)
  }

  async function updateTicketStatus(id, status) {
    await supabase.from('support_tickets').update({ status }).eq('id', id)
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  async function saveAdminNote(id) {
    const note = adminNote[id] || ''
    await supabase.from('support_tickets').update({ admin_note: note }).eq('id', id)
    setTickets(prev => prev.map(t => t.id === id ? { ...t, admin_note: note } : t))
  }

  async function loadUsers() {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin-users', { headers: { 'x-admin-email': user.email } })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setUsers(data.users)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function adminAction(action, userId) {
    const confirmKey = {
      suspend: 'adminConfirmSuspend',
      delete:  'adminConfirmDelete',
      restore: 'adminConfirmRestore',
    }[action]
    if (!confirm(t(confirmKey))) return
    setActionLoading(userId + action)
    const res  = await fetch('/api/admin-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-email': user.email },
      body: JSON.stringify({ action, userId }),
    })
    const data = await res.json()
    setActionLoading(null)
    if (data.ok) {
      await loadUsers()
    } else {
      showToast(t('error') + ': ' + data.error, 'error')
    }
  }

  async function viewUserData(u) {
    setViewUser(u)
    setUserData(null)
    const res  = await fetch('/api/admin-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-email': user.email },
      body: JSON.stringify({ action: 'get_data', userId: u.id }),
    })
    const data = await res.json()
    setUserData(data)
  }

  const filtered = users.filter(u => {
    const matchFilter = filter === 'all' || u.plan === filter ||
      (filter === 'flagged' && ['suspended','pending_reactivation','pending_delete'].includes(u.account_status))
    const matchSearch = !search ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const proCount     = users.filter(u => u.plan === 'pro').length
  const freeCount    = users.filter(u => u.plan === 'free').length
  const flaggedCount = users.filter(u => ['suspended','pending_reactivation','pending_delete'].includes(u.account_status)).length

  function exportCSV() {
    const rows = [['Email', 'Name', 'Company', 'Plan', 'Status', 'Created']]
    filtered.forEach(u => rows.push([
      u.email, u.full_name || '', u.company_name || '', u.plan,
      u.account_status || 'active', new Date(u.created_at).toLocaleDateString('bg-BG'),
    ]))
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `maistorix-users-${new Date().toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">{t('loading')}</div>
  )
  if (error) return (
    <div className="flex-1 flex items-center justify-center text-red-400 text-sm">{t('error')}: {error}</div>
  )

  return (
    <div className="flex-1 overflow-y-auto thin-scroll p-4 max-w-4xl mx-auto w-full">
      <div className="space-y-4 pb-10">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center shadow-sm">
            <div className="text-2xl font-black text-slate-800">{users.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">{t('adminTotal')}</div>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center shadow-sm">
            <div className="text-2xl font-black text-indigo-600">{proCount}</div>
            <div className="text-[11px] text-indigo-400 mt-1">PRO</div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center shadow-sm">
            <div className="text-2xl font-black text-slate-500">{freeCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Free</div>
          </div>
          <div className={`border rounded-2xl p-4 text-center shadow-sm ${flaggedCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
            <div className={`text-2xl font-black ${flaggedCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>{flaggedCount}</div>
            <div className={`text-[11px] mt-1 ${flaggedCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>{t('adminFlagged')}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap items-center">
          {[
            { id: 'all',     label: t('all') },
            { id: 'pro',     label: '⚡ PRO' },
            { id: 'free',    label: 'Free' },
            { id: 'flagged', label: t('adminFilterFlagged') },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${filter === f.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {f.label}
            </button>
          ))}
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('adminSearch')}
            className="flex-1 min-w-[180px] px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <button onClick={exportCSV}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
            {t('adminExportCSV')}
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          {filtered.length === 0
            ? <div className="text-center py-10 text-slate-400 text-sm">{t('adminNoUsers')}</div>
            : filtered.map((u, i) => {
              const statusKey = STATUS_KEY[u.account_status || 'active'] || 'statusActive'
              const statusColor = STATUS_COLOR[u.account_status || 'active'] || STATUS_COLOR.active
              const isMe = u.email === ADMIN_EMAIL
              return (
                <div key={u.id} className={`border-b border-slate-50 p-4 ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                  <div className="flex items-start gap-3 flex-wrap">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-800">{u.email}</span>
                        {u.plan === 'pro'
                          ? <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">⚡ PRO</span>
                          : <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px]">Free</span>}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${statusColor}`}>
                          {t(statusKey)}
                        </span>
                      </div>
                      {(u.company_name || u.full_name) && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{u.company_name || u.full_name}</div>
                      )}
                      {u.suspension_reason && (
                        <div className="text-[11px] text-amber-600 mt-0.5">{t('adminSuspendReason')} {u.suspension_reason}</div>
                      )}
                      {u.delete_reason && (
                        <div className="text-[11px] text-red-500 mt-0.5">{t('adminWantsDelete')} {u.delete_reason}</div>
                      )}
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        {new Date(u.created_at).toLocaleDateString('bg-BG')}
                        {u.suspended_until && ` · ${t('adminSuspendedUntil')} ${new Date(u.suspended_until).toLocaleDateString('bg-BG')}`}
                      </div>
                    </div>

                    {/* Actions */}
                    {!isMe && (
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => viewUserData(u)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors">
                          {t('adminViewData')}
                        </button>
                        {/* PRO controls */}
                        {u.plan !== 'pro' ? (
                          <button
                            onClick={() => { setProModal(u); setProStart(''); setProEnd('') }}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors">
                            ⚡ Grant PRO
                          </button>
                        ) : (
                          <button
                            onClick={() => revokePro(u)}
                            disabled={actionLoading === u.id + 'revoke_pro'}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors disabled:opacity-50">
                            ⚡ Revoke PRO
                          </button>
                        )}
                        {(u.account_status || 'active') === 'active' && (
                          <button onClick={() => adminAction('suspend', u.id)}
                            disabled={actionLoading === u.id + 'suspend'}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 transition-colors disabled:opacity-50">
                            {t('adminSuspend')}
                          </button>
                        )}
                        {['suspended','pending_reactivation','pending_delete'].includes(u.account_status) && (
                          <button onClick={() => adminAction('restore', u.id)}
                            disabled={actionLoading === u.id + 'restore'}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors disabled:opacity-50">
                            {t('adminRestore')}
                          </button>
                        )}
                        <button onClick={() => adminAction('delete', u.id)}
                          disabled={actionLoading === u.id + 'delete'}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors disabled:opacity-50">
                          {t('adminDelete')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          }
        </div>
        <p className="text-center text-xs text-slate-300">{filtered.length} {t('adminUsersShown')}</p>

        {/* ── Bulk Email ── */}
        <div className="mt-6 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <span className="text-base">📢</span>
            <h3 className="font-bold text-slate-700 text-sm">Изпрати имейл до потребители</h3>
          </div>
          <div className="p-4 space-y-3">
            {/* Target group */}
            <div className="flex gap-2">
              {[
                { id: 'all',  label: '👥 Всички' },
                { id: 'pro',  label: '⚡ PRO' },
                { id: 'free', label: '🆓 Free' },
              ].map(g => (
                <button key={g.id} onClick={() => setBulkGroup(g.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                    ${bulkGroup === g.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {g.label}
                </button>
              ))}
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Тема</label>
              <input
                type="text"
                value={bulkSubject}
                onChange={e => setBulkSubject(e.target.value)}
                placeholder="Примерно: 🎉 Специална промоция за абонати на Maistorix"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Съдържание</label>
              <textarea
                rows={6}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder={'Здравейте!\n\nПишем ви, за да ви уведомим...\n\nEкипът на Maistorix'}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none font-mono"
              />
              <p className="text-[11px] text-slate-300 mt-1">Всеки нов ред = нов параграф. Имейлът се изпраща с branded шаблон на Maistorix.</p>
            </div>

            {/* Result */}
            {bulkResult && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-xs text-emerald-700">
                ✅ Изпратено до <strong>{bulkResult.sent}</strong> потребители
                {bulkResult.failed > 0 && <span className="text-red-500 ml-2">· {bulkResult.failed} неуспешни</span>}
              </div>
            )}

            <button
              onClick={sendBulkEmail}
              disabled={bulkLoading || !bulkSubject.trim() || !bulkText.trim()}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 transition-all disabled:opacity-40">
              {bulkLoading ? 'Изпращане...' : '📤 Изпрати имейл'}
            </button>
          </div>
        </div>

        {/* ── Support Tickets ── */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-700 text-sm">
                🎧 {lang === 'en' ? 'Support tickets' : 'Съпорт тикети'}
              </h3>
              {tickets.filter(t => t.status === 'new').length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                  {tickets.filter(t => t.status === 'new').length} {lang === 'en' ? 'new' : 'нови'}
                </span>
              )}
            </div>
            <div className="flex gap-1.5">
              {['all', 'new', 'pending', 'resolved'].map(s => (
                <button key={s} onClick={() => setTicketsTab(s)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors
                    ${ticketsTab === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {s === 'all' ? (lang === 'en' ? 'All' : 'Всички')
                    : TICKET_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          {ticketLoading ? (
            <p className="text-xs text-slate-400 text-center py-4">{t('loading')}</p>
          ) : tickets.filter(t => ticketsTab === 'all' || t.status === ticketsTab).length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">
              {lang === 'en' ? 'No tickets.' : 'Няма тикети.'}
            </p>
          ) : (
            <div className="space-y-2">
              {tickets
                .filter(tk => ticketsTab === 'all' || tk.status === ticketsTab)
                .map(tk => (
                  <div key={tk.id}
                    className={`bg-white border rounded-2xl p-4 ${tk.status === 'new' ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100'}`}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-bold text-slate-800">{tk.subject}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TICKET_STATUS_COLOR[tk.status]}`}>
                            {TICKET_STATUS_LABEL[tk.status]}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-0.5">
                          {tk.name} · {tk.email}
                        </p>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{tk.message}</p>
                        <p className="text-[10px] text-slate-300 mt-1">
                          {new Date(tk.created_at).toLocaleString('bg-BG')}
                        </p>
                        {/* Admin note */}
                        <div className="mt-2 flex gap-1.5">
                          <input
                            type="text"
                            value={adminNote[tk.id] ?? (tk.admin_note || '')}
                            onChange={e => setAdminNote(n => ({ ...n, [tk.id]: e.target.value }))}
                            placeholder={lang === 'en' ? 'Internal note...' : 'Вътрешна бележка...'}
                            className="flex-1 px-2 py-1 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300"
                          />
                          <button onClick={() => saveAdminNote(tk.id)}
                            className="px-2 py-1 text-[11px] rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold transition-colors">
                            {lang === 'en' ? 'Save' : 'Запази'}
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <a href={`mailto:${tk.email}?subject=Re: ${encodeURIComponent(tk.subject)}`}
                          className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors text-center">
                          ✉️ {lang === 'en' ? 'Reply' : 'Отговори'}
                        </a>
                        {tk.status !== 'resolved' && (
                          <button onClick={() => updateTicketStatus(tk.id, 'resolved')}
                            className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors">
                            ✅ {lang === 'en' ? 'Resolve' : 'Реши'}
                          </button>
                        )}
                        {tk.status !== 'pending' && tk.status !== 'resolved' && (
                          <button onClick={() => updateTicketStatus(tk.id, 'pending')}
                            className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 transition-colors">
                            ⏳ {lang === 'en' ? 'Pending' : 'В изчакване'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </div>

      </div>

      {/* ── Grant PRO modal ── */}
      {proModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setProModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">⚡ Grant PRO</h3>
                <p className="text-xs text-slate-400 mt-0.5">{proModal.email}</p>
              </div>
              <button onClick={() => setProModal(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">От дата</label>
                <input
                  type="date"
                  value={proStart}
                  onChange={e => setProStart(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">До дата</label>
                <input
                  type="date"
                  value={proEnd}
                  onChange={e => setProEnd(e.target.value)}
                  min={proStart || undefined}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              {proStart && proEnd && (
                <div className="bg-violet-50 border border-violet-100 rounded-xl px-3 py-2 text-xs text-violet-700">
                  PRO от <strong>{new Date(proStart).toLocaleDateString('bg-BG')}</strong> до <strong>{new Date(proEnd).toLocaleDateString('bg-BG')}</strong>
                  {' '}({Math.ceil((new Date(proEnd) - new Date(proStart)) / 86400000)} дни)
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setProModal(null)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                  Отказ
                </button>
                <button onClick={grantPro} disabled={proLoading || !proStart || !proEnd}
                  className="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 transition-all disabled:opacity-40">
                  {proLoading ? 'Запазване...' : '⚡ Активирай PRO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User data modal */}
      {viewUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewUser(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{viewUser.email}</h3>
                <p className="text-xs text-slate-400">{viewUser.company_name || viewUser.full_name || t('adminNoCompanyData')}</p>
              </div>
              <button onClick={() => setViewUser(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="p-5">
              {!userData
                ? <div className="text-center py-8 text-slate-400 text-sm">{t('loading')}</div>
                : <>
                    <h4 className="font-semibold text-slate-700 text-sm mb-3">
                      {t('adminProjects')} ({userData.projects?.length || 0})
                    </h4>
                    {userData.projects?.length === 0
                      ? <p className="text-xs text-slate-400 mb-4">{t('adminNoProjects')}</p>
                      : <div className="space-y-2 mb-5">
                          {userData.projects.map(p => (
                            <div key={p.id} className="bg-slate-50 rounded-xl p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-700">{p.name}</span>
                                <span className="text-xs font-bold text-indigo-600">{fmt(p.total)}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {p.offer_number} · {p.clients?.name || t('noClientName')} · {new Date(p.created_at).toLocaleDateString('bg-BG')}
                              </div>
                            </div>
                          ))}
                        </div>
                    }
                    <h4 className="font-semibold text-slate-700 text-sm mb-3">
                      {t('adminClients')} ({userData.clients?.length || 0})
                    </h4>
                    {userData.clients?.length === 0
                      ? <p className="text-xs text-slate-400 mb-4">{t('adminNoClients')}</p>
                      : <div className="space-y-1.5 mb-5">
                          {userData.clients.map(c => (
                            <div key={c.id} className="bg-slate-50 rounded-xl px-3 py-2 flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-700">{c.name}</span>
                              <span className="text-[11px] text-slate-400">{c.phone || c.email || ''}</span>
                            </div>
                          ))}
                        </div>
                    }

                    <h4 className="font-semibold text-slate-700 text-sm mb-3">
                      {t('adminDocuments')} ({userData.documents?.length || 0})
                    </h4>
                    {!userData.documents?.length
                      ? <p className="text-xs text-slate-400">{t('adminNoDocuments')}</p>
                      : <div className="space-y-1.5">
                          {userData.documents.map(d => {
                            const publicUrl = d.storage_path
                              ? supabase.storage.from('documents').getPublicUrl(d.storage_path).data.publicUrl
                              : null
                            return (
                              <div key={d.id} className="bg-slate-50 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-xs font-medium text-slate-700 truncate">{d.name}</div>
                                  <div className="text-[10px] text-slate-400">
                                    {d.type === 'offer' ? t('adminDocOffer') : t('adminDocContract')}
                                    {' · '}{new Date(d.created_at).toLocaleDateString('bg-BG')}
                                  </div>
                                </div>
                                {publicUrl && (
                                  <a
                                    href={publicUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 px-2 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors"
                                  >
                                    {t('adminViewLink')}
                                  </a>
                                )}
                              </div>
                            )
                          })}
                        </div>
                    }
                  </>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

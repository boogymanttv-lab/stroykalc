import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

const ADMIN_EMAIL = 'wellecfx@gmail.com'
const fmt = n => '€ ' + Number(n || 0).toLocaleString('bg-BG', { minimumFractionDigits: 2 })

const STATUS_LABEL = {
  active:               { label: 'Активен',       color: 'bg-emerald-100 text-emerald-700' },
  suspended:            { label: 'Спрян',          color: 'bg-amber-100 text-amber-700' },
  pending_reactivation: { label: 'Чака реакт.',   color: 'bg-orange-100 text-orange-700' },
  pending_delete:       { label: 'Чака изтриване', color: 'bg-red-100 text-red-600' },
}

export default function AdminPage() {
  const { user } = useAuth()
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [filter,  setFilter]  = useState('all')
  const [search,  setSearch]  = useState('')
  const [viewUser, setViewUser] = useState(null) // user data modal
  const [userData, setUserData] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => { loadUsers() }, [])

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
    const labels = { suspend: 'спирате', delete: 'ИЗТРИЕТЕ ЗАВИНАГИ', restore: 'възстановите' }
    if (!confirm(`Сигурни ли сте, че искате да ${labels[action]} този акаунт?`)) return
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
      alert('Грешка: ' + data.error)
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

  const proCount      = users.filter(u => u.plan === 'pro').length
  const freeCount     = users.filter(u => u.plan === 'free').length
  const flaggedCount  = users.filter(u => ['suspended','pending_reactivation','pending_delete'].includes(u.account_status)).length

  function exportCSV() {
    const rows = [['Имейл', 'Иmе', 'Фирма', 'План', 'Статус', 'Регистриран']]
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

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Зареждане...</div>
  if (error)   return <div className="flex-1 flex items-center justify-center text-red-400 text-sm">Грешка: {error}</div>

  return (
    <div className="flex-1 overflow-y-auto thin-scroll p-4 max-w-4xl mx-auto w-full">
      <div className="space-y-4 pb-10">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center shadow-sm">
            <div className="text-2xl font-black text-slate-800">{users.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">Общо</div>
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
            <div className={`text-[11px] mt-1 ${flaggedCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>Маркирани</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap items-center">
          {[
            { id: 'all', label: 'Всички' },
            { id: 'pro', label: '⚡ PRO' },
            { id: 'free', label: 'Free' },
            { id: 'flagged', label: '🚩 Маркирани' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${filter === f.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {f.label}
            </button>
          ))}
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Търси по имейл или фирма..."
            className="flex-1 min-w-[180px] px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <button onClick={exportCSV}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
            ⬇ CSV
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          {filtered.length === 0
            ? <div className="text-center py-10 text-slate-400 text-sm">Няма потребители</div>
            : filtered.map((u, i) => {
              const st = STATUS_LABEL[u.account_status || 'active'] || STATUS_LABEL.active
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
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${st.color}`}>{st.label}</span>
                      </div>
                      {(u.company_name || u.full_name) && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{u.company_name || u.full_name}</div>
                      )}
                      {u.suspension_reason && (
                        <div className="text-[11px] text-amber-600 mt-0.5">Причина: {u.suspension_reason}</div>
                      )}
                      {u.delete_reason && (
                        <div className="text-[11px] text-red-500 mt-0.5">Иска изтриване: {u.delete_reason}</div>
                      )}
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        {new Date(u.created_at).toLocaleDateString('bg-BG')}
                        {u.suspended_until && ` · спрян до ${new Date(u.suspended_until).toLocaleDateString('bg-BG')}`}
                      </div>
                    </div>

                    {/* Actions */}
                    {!isMe && (
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => viewUserData(u)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors">
                          👁 Данни
                        </button>
                        {(u.account_status || 'active') === 'active' && (
                          <button onClick={() => adminAction('suspend', u.id)}
                            disabled={actionLoading === u.id + 'suspend'}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 transition-colors disabled:opacity-50">
                            ⏸ Спри
                          </button>
                        )}
                        {['suspended','pending_reactivation','pending_delete'].includes(u.account_status) && (
                          <button onClick={() => adminAction('restore', u.id)}
                            disabled={actionLoading === u.id + 'restore'}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors disabled:opacity-50">
                            ✅ Възстанови
                          </button>
                        )}
                        <button onClick={() => adminAction('delete', u.id)}
                          disabled={actionLoading === u.id + 'delete'}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors disabled:opacity-50">
                          🗑 Изтрий
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          }
        </div>
        <p className="text-center text-xs text-slate-300">{filtered.length} потребители показани</p>
      </div>

      {/* User data modal */}
      {viewUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewUser(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{viewUser.email}</h3>
                <p className="text-xs text-slate-400">{viewUser.company_name || viewUser.full_name || 'Няма фирмени данни'}</p>
              </div>
              <button onClick={() => setViewUser(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="p-5">
              {!userData
                ? <div className="text-center py-8 text-slate-400 text-sm">Зареждане...</div>
                : <>
                    <h4 className="font-semibold text-slate-700 text-sm mb-3">📋 Проекти и оферти ({userData.projects?.length || 0})</h4>
                    {userData.projects?.length === 0
                      ? <p className="text-xs text-slate-400 mb-4">Няма проекти</p>
                      : <div className="space-y-2 mb-5">
                          {userData.projects.map(p => (
                            <div key={p.id} className="bg-slate-50 rounded-xl p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-700">{p.name}</span>
                                <span className="text-xs font-bold text-indigo-600">{fmt(p.total)}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {p.offer_number} · {p.clients?.name || 'Без клиент'} · {new Date(p.created_at).toLocaleDateString('bg-BG')}
                              </div>
                            </div>
                          ))}
                        </div>
                    }
                    <h4 className="font-semibold text-slate-700 text-sm mb-3">👥 Клиенти ({userData.clients?.length || 0})</h4>
                    {userData.clients?.length === 0
                      ? <p className="text-xs text-slate-400">Няма клиенти</p>
                      : <div className="space-y-1.5">
                          {userData.clients.map(c => (
                            <div key={c.id} className="bg-slate-50 rounded-xl px-3 py-2 flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-700">{c.name}</span>
                              <span className="text-[11px] text-slate-400">{c.phone || c.email || ''}</span>
                            </div>
                          ))}
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

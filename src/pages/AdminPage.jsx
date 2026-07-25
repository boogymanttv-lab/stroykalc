import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function AdminPage() {
  const { user } = useAuth()
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [filter,  setFilter]  = useState('all') // 'all' | 'free' | 'pro'
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin-users', {
          headers: { 'x-admin-email': user.email },
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setUsers(data.users)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = users.filter(u => {
    const matchPlan   = filter === 'all' || u.plan === filter
    const matchSearch = !search || u.email.toLowerCase().includes(search.toLowerCase()) ||
                        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                        u.company_name?.toLowerCase().includes(search.toLowerCase())
    return matchPlan && matchSearch
  })

  const proCount  = users.filter(u => u.plan === 'pro').length
  const freeCount = users.filter(u => u.plan === 'free').length

  function exportCSV() {
    const rows = [['Имейл', 'Имe', 'Фирма', 'План', 'Регистриран']]
    filtered.forEach(u => rows.push([
      u.email,
      u.full_name || '',
      u.company_name || '',
      u.plan,
      new Date(u.created_at).toLocaleDateString('bg-BG'),
    ]))
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `maistorix-users-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
      Зареждане...
    </div>
  )

  if (error) return (
    <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
      Грешка: {error}
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto thin-scroll p-4 max-w-3xl mx-auto w-full">
      <div className="space-y-4 pb-10">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center shadow-sm">
            <div className="text-3xl font-black text-slate-800">{users.length}</div>
            <div className="text-xs text-slate-400 mt-1">Общо</div>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center shadow-sm">
            <div className="text-3xl font-black text-indigo-600">{proCount}</div>
            <div className="text-xs text-indigo-400 mt-1">PRO</div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center shadow-sm">
            <div className="text-3xl font-black text-slate-500">{freeCount}</div>
            <div className="text-xs text-slate-400 mt-1">Free</div>
          </div>
        </div>

        {/* Filters + Export */}
        <div className="flex gap-2 flex-wrap items-center">
          {['all', 'free', 'pro'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              {f === 'all' ? 'Всички' : f === 'pro' ? '⚡ PRO' : 'Free'}
            </button>
          ))}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Търси по имейл или фирма..."
            className="flex-1 min-w-[180px] px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            onClick={exportCSV}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            ⬇ CSV
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">Няма потребители</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Имейл / Фирма</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500">План</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Регистриран</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id} className={`border-b border-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                    <td className="px-4 py-3">
                      <div className="text-slate-800 font-medium text-xs">{u.email}</div>
                      {(u.company_name || u.full_name) && (
                        <div className="text-slate-400 text-[11px]">{u.company_name || u.full_name}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {u.plan === 'pro'
                        ? <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">⚡ PRO</span>
                        : <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">Free</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">
                      {new Date(u.created_at).toLocaleDateString('bg-BG')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-center text-xs text-slate-300">{filtered.length} потребители показани</p>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import { offlineInsert, offlineDelete } from '../lib/syncService'

const CATEGORIES = {
  materials:     { label: 'Материали',       icon: '🧱', color: 'bg-orange-100 text-orange-700' },
  workers:       { label: 'Работници',       icon: '👷', color: 'bg-yellow-100 text-yellow-700' },
  equipment:     { label: 'Оборудване/Наем', icon: '🔧', color: 'bg-blue-100 text-blue-700' },
  fuel:          { label: 'Гориво',          icon: '⛽', color: 'bg-red-100 text-red-700' },
  subcontractor: { label: 'Подизпълнител',   icon: '🤝', color: 'bg-purple-100 text-purple-700' },
  other:         { label: 'Друго',           icon: '📦', color: 'bg-slate-100 text-slate-600' },
}

const fmt = n =>
  '€ ' + Number(n).toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function ExpensesModal({ project, onClose }) {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { loadExpenses() }, [])

  async function loadExpenses() {
    setLoading(true)
    if (navigator.onLine) {
      const { data } = await supabase
        .from('expenses').select('*')
        .eq('project_id', project.id)
        .order('expense_date', { ascending: false })
      if (data) {
        await db.expenses.bulkPut(data)
        setExpenses(data)
      }
    } else {
      const local = await db.expenses.where('project_id').equals(project.id).toArray()
      setExpenses(local.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date)))
    }
    setLoading(false)
  }

  async function deleteExpense(id) {
    if (!confirm('Изтрий разхода?')) return
    await offlineDelete('expenses', id)
    setExpenses(e => e.filter(x => x.id !== id))
  }

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const profit        = Number(project.total) - totalExpenses
  const margin        = project.total > 0 ? (profit / Number(project.total)) * 100 : 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
      <div className="flex-1" onClick={onClose} />

      <div className="bg-white rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">💸 Разходи</h2>
            <p className="text-xs text-slate-400 truncate max-w-[220px]">{project.name}</p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center">×</button>
        </div>

        {/* Summary */}
        <div className="px-4 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-indigo-50 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-400 mb-1">Оферта</div>
              <div className="font-bold text-indigo-700 text-sm">{fmt(project.total)}</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-400 mb-1">Разходи</div>
              <div className="font-bold text-red-600 text-sm">{fmt(totalExpenses)}</div>
            </div>
            <div className={`rounded-xl p-3 text-center ${profit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className="text-xs text-slate-400 mb-1">Печалба</div>
              <div className={`font-bold text-sm ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {fmt(profit)}
              </div>
            </div>
          </div>
          {/* Margin bar */}
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(0, Math.min(100, margin))}%`,
                background: margin >= 20
                  ? 'linear-gradient(90deg,#10b981,#059669)'
                  : margin >= 0
                    ? 'linear-gradient(90deg,#f59e0b,#d97706)'
                    : '#ef4444',
              }}
            />
          </div>
          <div className="text-right text-xs text-slate-400 mt-1">
            Марж: {Math.round(margin)}%
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto thin-scroll px-4 py-3">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Зареждане...</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-slate-400 text-sm">Няма записани разходи</p>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map(e => {
                const cat = CATEGORIES[e.category] || CATEGORIES.other
                return (
                  <div key={e.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                    <div className="text-xl flex-shrink-0">{cat.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-semibold text-sm text-slate-800 truncate">{e.description}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cat.color}`}>{cat.label}</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        📅 {new Date(e.expense_date).toLocaleDateString('bg-BG')}
                        {e.notes && <span className="ml-2 italic">— {e.notes}</span>}
                      </div>
                    </div>
                    <div className="font-bold text-red-500 text-sm whitespace-nowrap">{fmt(e.amount)}</div>
                    <button onClick={() => deleteExpense(e.id)} className="text-red-300 hover:text-red-500 text-xl leading-none flex-shrink-0">×</button>
                  </div>
                )
              })}
            </div>
          )}

          {showForm && (
            <AddExpenseForm
              projectId={project.id}
              userId={user.id}
              onSaved={() => { setShowForm(false); loadExpenses() }}
              onCancel={() => setShowForm(false)}
            />
          )}
        </div>

        {!showForm && (
          <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex-shrink-0">
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm
                         bg-gradient-to-r from-orange-500 to-red-500
                         hover:opacity-90 active:scale-[.98] transition-all shadow-sm"
            >
              + Добави разход
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function AddExpenseForm({ projectId, userId, onSaved, onCancel }) {
  const [desc,     setDesc]     = useState('')
  const [amount,   setAmount]   = useState('')
  const [category, setCategory] = useState('materials')
  const [notes,    setNotes]    = useState('')
  const [date,     setDate]     = useState(new Date().toISOString().slice(0, 10))
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  async function handleSave() {
    if (!desc.trim()) { setError('Въведи описание!'); return }
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setError('Въведи сума!'); return }
    setSaving(true)
    setError('')

    try {
      await offlineInsert('expenses', {
        project_id:   projectId,
        user_id:      userId,
        description:  desc.trim(),
        amount:       amt,
        category,
        notes:        notes.trim() || null,
        expense_date: date,
      })
      onSaved()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
      <h3 className="font-bold text-slate-700 mb-3 text-sm">➕ Нов разход</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Описание *</label>
          <input
            type="text"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 bg-white"
            placeholder="напр. Гипсокартон, Наем скеле..."
            value={desc}
            onChange={e => setDesc(e.target.value)}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Сума (€) *</label>
            <input
              type="number" min="0" step="0.01"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 bg-white"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Категория</label>
            <select
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 bg-white"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Дата</label>
          <input
            type="date"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 bg-white"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Бележка</label>
          <input
            type="text"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 bg-white"
            placeholder="По желание..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </div>

        {error && <div className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2">⚠️ {error}</div>}

        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl font-semibold text-slate-600 bg-white border border-slate-200 text-sm">Отказ</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 active:scale-[.98] disabled:opacity-60"
          >
            {saving ? '⏳...' : '💾 Запази'}
          </button>
        </div>
      </div>
    </div>
  )
}

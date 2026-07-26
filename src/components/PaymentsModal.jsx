import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import { offlineInsert, offlineDelete } from '../lib/syncService'

const fmt = n =>
  '€ ' + Number(n).toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function PaymentsModal({ project, onClose }) {
  const { user } = useAuth()
  const { t } = useLang()
  const [payments, setPayments] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { loadPayments() }, [])

  async function loadPayments() {
    setLoading(true)
    if (navigator.onLine) {
      const { data } = await supabase
        .from('payments').select('*')
        .eq('project_id', project.id)
        .order('paid_at', { ascending: false })
      if (data) { await db.payments.bulkPut(data); setPayments(data) }
    } else {
      const local = await db.payments.where('project_id').equals(project.id).toArray()
      setPayments(local.sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at)))
    }
    setLoading(false)
  }

  async function deletePayment(id) {
    if (!confirm(t('deletePaymentConfirm'))) return
    await offlineDelete('payments', id)
    setPayments(p => p.filter(x => x.id !== id))
  }

  const totalPaid  = payments.reduce((s, p) => s + Number(p.amount), 0)
  const remaining  = Number(project.total) - totalPaid
  const paidPct    = project.total > 0 ? Math.min(100, (totalPaid / project.total) * 100) : 0
  const fullyPaid  = remaining <= 0.01

  const TYPES = {
    advance: { label: t('paymentAdvance'), color: 'bg-blue-100 text-blue-700' },
    payment: { label: t('paymentPayment'), color: 'bg-indigo-100 text-indigo-700' },
    final:   { label: t('paymentFinal'),   color: 'bg-emerald-100 text-emerald-700' },
  }
  const METHODS = {
    cash: t('methodCash'),
    bank: t('methodBank'),
    card: t('methodCard'),
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
      <div className="flex-1" onClick={onClose} />

      <div className="bg-white rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{t('paymentsTitle')}</h2>
            <p className="text-xs text-slate-400 truncate max-w-[220px]">{project.name}</p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center">×</button>
        </div>

        {/* Summary bar */}
        <div className="px-4 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-400 mb-1">{t('total')}</div>
              <div className="font-bold text-slate-700 text-sm">{fmt(project.total)}</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-400 mb-1">{t('totalPaid')}</div>
              <div className="font-bold text-emerald-600 text-sm">{fmt(totalPaid)}</div>
            </div>
            <div className={`rounded-xl p-3 text-center ${fullyPaid ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className="text-xs text-slate-400 mb-1">{t('totalRemaining')}</div>
              <div className={`font-bold text-sm ${fullyPaid ? 'text-emerald-600' : 'text-red-500'}`}>
                {fullyPaid ? t('paid') : fmt(remaining)}
              </div>
            </div>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${paidPct}%`,
                background: fullyPaid
                  ? 'linear-gradient(90deg,#10b981,#059669)'
                  : 'linear-gradient(90deg,#4f46e5,#7c3aed)',
              }}
            />
          </div>
          <div className="text-right text-xs text-slate-400 mt-1">{Math.round(paidPct)}%</div>
        </div>

        {/* Payments list */}
        <div className="flex-1 overflow-y-auto thin-scroll px-4 py-3">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">{t('loading')}</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">💸</div>
              <p className="text-slate-400 text-sm">{t('noPayments')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map(p => {
                const tp = TYPES[p.type] || TYPES.payment
                return (
                  <div key={p.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tp.color}`}>{tp.label}</span>
                        <span className="text-xs text-slate-400">{METHODS[p.method] || p.method}</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        📅 {new Date(p.paid_at).toLocaleDateString('bg-BG')}
                        {p.notes && <span className="ml-2 italic">— {p.notes}</span>}
                      </div>
                    </div>
                    <div className="font-bold text-emerald-600 text-sm whitespace-nowrap">{fmt(p.amount)}</div>
                    <button onClick={() => deletePayment(p.id)} className="text-red-300 hover:text-red-500 text-xl leading-none flex-shrink-0">×</button>
                  </div>
                )
              })}
            </div>
          )}

          {showForm && (
            <AddPaymentForm
              projectId={project.id}
              userId={user.id}
              remaining={remaining}
              onSaved={() => { setShowForm(false); loadPayments() }}
              onCancel={() => setShowForm(false)}
            />
          )}
        </div>

        {!showForm && (
          <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex-shrink-0">
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm
                         bg-gradient-to-r from-emerald-500 to-teal-600
                         hover:opacity-90 active:scale-[.98] transition-all shadow-sm"
            >
              {t('addPayment')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function AddPaymentForm({ projectId, userId, remaining, onSaved, onCancel }) {
  const { t } = useLang()
  const [amount, setAmount] = useState(remaining > 0 ? String(Math.round(remaining * 100) / 100) : '')
  const [type,   setType]   = useState('payment')
  const [method, setMethod] = useState('cash')
  const [notes,  setNotes]  = useState('')
  const [date,   setDate]   = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleSave() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setError(t('amount') + '!'); return }
    setSaving(true); setError('')
    try {
      await offlineInsert('payments', {
        project_id: projectId, user_id: userId,
        amount: amt, type, method,
        notes: notes.trim() || null, paid_at: date,
      })
      onSaved()
    } catch (err) {
      setError(err.message); setSaving(false)
    }
  }

  return (
    <div className="mt-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
      <h3 className="font-bold text-slate-700 mb-3 text-sm">➕ {t('addPayment')}</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t('amount')} (€)</label>
          <input type="number" min="0" step="0.01"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-400 bg-white"
            value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t('paymentType')}</label>
            <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-400 bg-white"
              value={type} onChange={e => setType(e.target.value)}>
              <option value="advance">{t('paymentAdvance')}</option>
              <option value="payment">{t('paymentPayment')}</option>
              <option value="final">{t('paymentFinal')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t('paymentMethod')}</label>
            <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-400 bg-white"
              value={method} onChange={e => setMethod(e.target.value)}>
              <option value="cash">{t('methodCash')}</option>
              <option value="bank">{t('methodBank')}</option>
              <option value="card">{t('methodCard')}</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t('date')}</label>
          <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-400 bg-white"
            value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t('notes')}</label>
          <input type="text" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-400 bg-white"
            value={notes} onChange={e => setNotes(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()} />
        </div>
        {error && <div className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2">⚠️ {error}</div>}
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl font-semibold text-slate-600 bg-white border border-slate-200 text-sm">{t('cancel')}</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 active:scale-[.98] disabled:opacity-60">
            {saving ? '⏳...' : t('save')}
          </button>
        </div>
      </div>
    </div>
  )
}

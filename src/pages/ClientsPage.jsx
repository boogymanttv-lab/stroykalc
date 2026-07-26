import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import { offlineUpsert, offlineDelete, offlineInsert } from '../lib/syncService'

export default function ClientsPage() {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editClient, setEditClient] = useState(null)

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    setLoading(true)
    if (navigator.onLine) {
      const { data } = await supabase.from('clients').select('*').order('name')
      if (data) {
        await db.clients.bulkPut(data)
        setClients(data)
      }
    } else {
      try {
        let local = await db.clients.where('user_id').equals(user.id).toArray()
        if (!local.length) local = await db.clients.toArray()
        setClients(local.sort((a, b) => a.name.localeCompare(b.name)))
      } catch (e) {
        console.warn('[offline] ClientsPage read failed', e)
        setClients([])
      }
    }
    setLoading(false)
  }

  async function deleteClient(id, name) {
    if (!confirm(`Изтрий клиент „${name}"?`)) return
    await offlineDelete('clients', id)
    setClients(c => c.filter(x => x.id !== id))
  }

  if (showForm) {
    return (
      <ClientForm
        client={editClient}
        userId={user.id}
        onSaved={() => { setShowForm(false); setEditClient(null); loadClients() }}
        onCancel={() => { setShowForm(false); setEditClient(null) }}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto thin-scroll p-4">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">Зареждане...</div>
        ) : clients.length === 0 ? (
          <EmptyState onAdd={() => setShowForm(true)} />
        ) : (
          <div className="space-y-3 pb-4">
            {clients.map(c => (
              <div key={c.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 text-base">{c.name}</div>
                    {c.phone && <div className="text-sm text-slate-500 mt-1">📞 {c.phone}</div>}
                    {c.email && <div className="text-sm text-slate-500">✉️ {c.email}</div>}
                    {(c.address || c.city) && (
                      <div className="text-sm text-slate-400 mt-0.5">
                        📍 {[c.address, c.city].filter(Boolean).join(', ')}
                      </div>
                    )}
                    {c.eik && <div className="text-xs text-slate-400 mt-1">ЕИК: {c.eik}</div>}
                    {c.vat_number && <div className="text-xs text-slate-400">ДДС №: {c.vat_number}</div>}
                    {c.notes && (
                      <div className="text-xs text-slate-400 mt-1 italic border-t border-slate-100 pt-1">{c.notes}</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditClient(c); setShowForm(true) }}
                    className="flex-1 text-xs py-2 rounded-lg bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 transition-colors"
                  >
                    ✏️ Редактирай
                  </button>
                  <button
                    onClick={() => deleteClient(c.id, c.name)}
                    className="text-xs px-4 py-2 rounded-lg bg-red-50 text-red-500 font-semibold hover:bg-red-100 transition-colors"
                  >
                    🗑️ Изтрий
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-100 bg-white flex-shrink-0">
        <button
          data-tour="new-client-btn"
          onClick={() => { setEditClient(null); setShowForm(true) }}
          className="w-full py-3 rounded-xl font-semibold text-white text-sm
                     bg-gradient-to-r from-indigo-600 to-violet-700
                     hover:opacity-90 active:scale-[.98] transition-all shadow-sm"
        >
          + Добави клиент
        </button>
      </div>
    </div>
  )
}

function ClientForm({ client, userId, onSaved, onCancel }) {
  const [form, setForm] = useState({
    name:       client?.name       || '',
    phone:      client?.phone      || '',
    email:      client?.email      || '',
    address:    client?.address    || '',
    city:       client?.city       || '',
    eik:        client?.eik        || '',
    vat_number: client?.vat_number || '',
    notes:      client?.notes      || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.name.trim()) { setError('Името е задължително'); return }
    setSaving(true)
    setError('')

    const payload = { ...form, user_id: userId }

    try {
      if (client) {
        await offlineUpsert('clients', { ...payload, id: client.id })
      } else {
        await offlineInsert('clients', payload)
      }
      onSaved()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto thin-scroll p-4 max-w-xl mx-auto w-full">
        <h2 className="text-lg font-bold text-slate-800 mb-5">
          {client ? '✏️ Редактирай клиент' : '➕ Нов клиент'}
        </h2>
        <div className="space-y-3">
          <Field label="Имe *" value={form.name}       onChange={v => set('name', v)}       placeholder="Петър Петров" />
          <Field label="Телефон" value={form.phone}    onChange={v => set('phone', v)}      placeholder="+359 888 000 000" type="tel" />
          <Field label="Имейл"   value={form.email}    onChange={v => set('email', v)}      placeholder="petar@example.com" type="email" />
          <Field label="Адрес"   value={form.address}  onChange={v => set('address', v)}    placeholder="ул. Примерна 1" />
          <Field label="Град"    value={form.city}     onChange={v => set('city', v)}       placeholder="Пловдив" />
          <Field label="ЕИК / ЕГН"   value={form.eik}        onChange={v => set('eik', v)}        placeholder="123456789" />
          <Field label="ДДС номер"   value={form.vat_number} onChange={v => set('vat_number', v)} placeholder="BG123456789" />
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Бележки</label>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 resize-none"
              rows={3}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Допълнителна информация..."
            />
          </div>
          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              ⚠️ {error}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 bg-white flex-shrink-0 flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 text-sm transition-colors"
        >
          Отказ
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-700
                     hover:opacity-90 active:scale-[.98] text-sm disabled:opacity-60"
        >
          {saving ? '⏳...' : '💾 Запази'}
        </button>
      </div>
    </div>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20">
      <div className="text-6xl mb-4">👥</div>
      <h3 className="text-lg font-semibold text-slate-600 mb-2">Нямате клиенти</h3>
      <p className="text-slate-400 text-sm mb-6">Добавете клиент, за да го включите в офертата</p>
      <button
        onClick={onAdd}
        className="px-6 py-2.5 rounded-xl font-semibold text-white text-sm
                   bg-gradient-to-r from-indigo-600 to-violet-700 hover:opacity-90"
      >
        + Добави клиент
      </button>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</label>
      <input
        type={type}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

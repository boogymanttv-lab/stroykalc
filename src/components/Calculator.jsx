import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import { offlineInsert, offlineUpdate } from '../lib/syncService'
import { generateOfferPDF, generateContractPDF } from '../lib/pdf'
import { saveDocument } from '../lib/documents'
import ServicePicker from './ServicePicker'

const fmt = n =>
  '€ ' + Number(n).toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Calculator({ editProjectId }) {
  const { user, profile } = useAuth()

  const [projectName,    setProjectName]    = useState('')
  const [projectAddress, setProjectAddress] = useState('')
  const [offerNumber,    setOfferNumber]    = useState('')
  const [vatOn,          setVatOn]          = useState(profile?.default_vat || false)
  const [notes,          setNotes]          = useState('')
  const [items,          setItems]          = useState([])
  const [clientId,       setClientId]       = useState('')
  const [savedId,        setSavedId]        = useState(null)

  const [showPicker,    setShowPicker]    = useState(false)
  const [clients,       setClients]       = useState([])
  const [saving,        setSaving]        = useState(false)
  const [showActions,   setShowActions]   = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const draftKey = `calc_draft_${user?.id || 'anon'}`
  const autoSaveTimer = useRef(null)

  const subtotal = items.reduce((s, i) => s + Number(i.qty) * Number(i.price), 0)
  const vatAmt   = vatOn ? subtotal * 0.2 : 0
  const total    = subtotal + vatAmt

  const grouped = items.reduce((acc, item) => {
    const k = item.category || 'Други'
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})

  useEffect(() => {
    async function loadClients() {
      if (navigator.onLine) {
        const { data } = await supabase.from('clients').select('id, name').order('name')
        if (data) { await db.clients.bulkPut(data); setClients(data) }
      } else {
        try {
          let local = await db.clients.where('user_id').equals(user.id).toArray()
          if (!local.length) local = await db.clients.toArray()
          setClients(local.sort((a, b) => a.name.localeCompare(b.name)))
        } catch (e) {
          console.warn('[offline] Calculator clients failed', e)
        }
      }
    }
    loadClients()
  }, [])

  useEffect(() => {
    if (!editProjectId) return
    async function loadProject() {
      let data
      if (navigator.onLine) {
        const r = await supabase.from('projects').select('*').eq('id', editProjectId).single()
        data = r.data
      } else {
        data = await db.projects.get(editProjectId)
      }
      if (!data) return
      setProjectName(data.name || '')
      setProjectAddress(data.address || '')
      setOfferNumber(data.offer_number || '')
      setVatOn(data.vat || false)
      setNotes(data.notes || '')
      setClientId(data.client_id || '')
      setItems(data.items || [])
      setSavedId(data.id)
    }
    loadProject()
  }, [editProjectId])

  // ── Restore draft on first load (only for new projects) ──
  useEffect(() => {
    if (editProjectId) return // editing existing — don't restore draft
    try {
      const saved = localStorage.getItem(draftKey)
      if (!saved) return
      const draft = JSON.parse(saved)
      if (!draft.items?.length) return
      if (window.confirm('📋 Намерена е незапазена чернова. Искаш ли да я възстановиш?')) {
        setProjectName(draft.projectName || '')
        setProjectAddress(draft.projectAddress || '')
        setOfferNumber(draft.offerNumber || '')
        setVatOn(draft.vatOn || false)
        setNotes(draft.notes || '')
        setClientId(draft.clientId || '')
        setItems(draft.items || [])
        setDraftRestored(true)
      } else {
        localStorage.removeItem(draftKey)
      }
    } catch {}
  }, []) // eslint-disable-line

  // ── Auto-save draft on every change ──
  useEffect(() => {
    if (editProjectId) return // don't draft-save when editing existing
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      try {
        if (items.length === 0 && !projectName) {
          localStorage.removeItem(draftKey)
          return
        }
        localStorage.setItem(draftKey, JSON.stringify({
          projectName, projectAddress, offerNumber, vatOn, notes, clientId, items,
          savedAt: new Date().toISOString(),
        }))
      } catch {}
    }, 800)
    return () => clearTimeout(autoSaveTimer.current)
  }, [projectName, projectAddress, offerNumber, vatOn, notes, clientId, items]) // eslint-disable-line

  const addItem    = item => setItems(prev => [...prev, item])
  const removeItem = id   => setItems(prev => prev.filter(i => i.id !== id))
  const updateItem = (id, key, val) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [key]: val } : i))

  async function saveProject() {
    if (items.length === 0) { alert('Добавете поне една услуга!'); return }
    setSaving(true)

    const name      = projectName.trim() || 'Проект ' + new Date().toLocaleDateString('bg-BG')
    const offer_num = offerNumber.trim() || ('OF-' + Date.now().toString().slice(-6))

    const payload = {
      user_id:      user.id,
      client_id:    clientId || null,
      name,
      address:      projectAddress,
      vat:          vatOn,
      notes,
      items,
      subtotal,
      vat_amount:   vatAmt,
      total,
      offer_number: offer_num,
      offer_date:   new Date().toISOString().slice(0, 10),
      updated_at:   new Date().toISOString(),
    }

    let newId = savedId
    if (newId) {
      await offlineUpdate('projects', newId, payload)
    } else {
      const record = await offlineInsert('projects', { ...payload, status: 'draft' })
      if (record) { newId = record.id; setSavedId(newId); setOfferNumber(offer_num) }
    }

    setSaving(false)
    localStorage.removeItem(draftKey)
    alert('✅ Проектът е запазен!')
  }

  async function getClientData() {
    if (!clientId) return null
    if (navigator.onLine) {
      const { data } = await supabase.from('clients').select('*').eq('id', clientId).single()
      return data
    }
    return db.clients.get(clientId)
  }

  async function handlePDF() {
    if (items.length === 0) { alert('Добавете поне една услуга!'); return }
    const clientData = await getClientData()
    const num = offerNumber || ('OF-' + Date.now().toString().slice(-6))
    const html = generateOfferPDF({
      profile,
      client: clientData,
      isPro: profile?.plan === 'pro',
      project: {
        name: projectName || 'Проект', address: projectAddress, notes, items,
        subtotal, vat: vatOn, vat_amount: vatAmt, total,
        offer_number: num,
        offer_date: new Date().toLocaleDateString('bg-BG'),
      },
    })
    if (html && savedId) {
      saveDocument({
        html, projectId: savedId, userId: user.id,
        type: 'offer', name: `Оферта ${num}`,
      })
    }
  }

  async function handleContract() {
    if (items.length === 0) { alert('Добавете поне една услуга!'); return }
    const clientData = await getClientData()
    const html = generateContractPDF({
      profile,
      client: clientData,
      project: {
        name: projectName || 'Проект', address: projectAddress, notes, items,
        subtotal, vat: vatOn, vat_amount: vatAmt, total,
      },
    })
    if (html && savedId) {
      saveDocument({
        html, projectId: savedId, userId: user.id,
        type: 'contract', name: `Договор ${projectName || 'Проект'}`,
      })
    }
    setShowActions(false)
  }

  async function handleShare() {
    if (!savedId) { alert('Запази проекта първо!'); return }
    // Generate or retrieve existing share token
    const { data: existing } = await supabase
      .from('projects').select('share_token').eq('id', savedId).single()

    let token = existing?.share_token
    if (!token) {
      token = crypto.randomUUID()
      await supabase.from('projects').update({ share_token: token }).eq('id', savedId)
    }

    const url = `${window.location.origin}${window.location.pathname}#share/${token}`
    try {
      await navigator.clipboard.writeText(url)
      alert('🔗 Линкът е копиран!\n\nКлиентът може да го отвори в браузъра си:\n' + url)
    } catch {
      prompt('Копирай линка:', url)
    }
    setShowActions(false)
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Project header ── */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex-shrink-0 space-y-2">
        <input
          className="w-full text-lg font-bold outline-none placeholder-slate-300 text-slate-800 bg-transparent"
          placeholder="Название на проект..."
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
        />
        <input
          className="w-full text-sm outline-none placeholder-slate-300 text-slate-500 bg-transparent"
          placeholder="📍 Адрес на обекта..."
          value={projectAddress}
          onChange={e => setProjectAddress(e.target.value)}
        />
        <select
          className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:border-indigo-400 text-slate-600 bg-white"
          value={clientId}
          onChange={e => setClientId(e.target.value)}
        >
          <option value="">👤 Без клиент</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          className="w-full text-xs outline-none placeholder-slate-300 text-slate-400 bg-transparent"
          placeholder="Номер на оферта (напр. OF-2024-001)..."
          value={offerNumber}
          onChange={e => setOfferNumber(e.target.value)}
        />
      </div>

      {/* ── Items area ── */}
      <div className="flex-1 overflow-y-auto thin-scroll p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="text-6xl mb-4">🏗️</div>
            <h3 className="text-lg font-semibold text-slate-600 mb-2">Няма добавени услуги</h3>
            <p className="text-slate-400 text-sm">Натисни „+ Добави услуга" по-долу</p>
          </div>
        ) : (
          <>
            {Object.entries(grouped).map(([catName, catItems]) => (
              <div key={catName} className="mb-5">
                <div
                  className="text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: catItems[0]?.catColor || '#6366f1' }}
                >
                  {catName}
                </div>
                {catItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl p-3 mb-2 shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-800 truncate mb-1">{item.name}</div>
                      {/* ── Inline editable qty × price ── */}
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <input
                          type="number" min="0" step="0.1"
                          className="w-14 border-b border-slate-200 text-center outline-none focus:border-indigo-400 bg-transparent py-0.5"
                          value={item.qty}
                          onChange={e => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                        />
                        <span className="text-slate-400">{item.unit} ×</span>
                        <input
                          type="number" min="0" step="1"
                          className="w-16 border-b border-slate-200 text-right outline-none focus:border-indigo-400 bg-transparent py-0.5"
                          value={item.price}
                          onChange={e => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                        />
                        <span className="text-slate-400">€</span>
                      </div>
                    </div>
                    <div className="font-bold text-indigo-600 text-sm whitespace-nowrap">
                      {fmt(Number(item.qty) * Number(item.price))}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-300 hover:text-red-500 text-xl leading-none transition-colors flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ))}

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">📝 Бележки</label>
              <textarea
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-indigo-400 resize-none"
                rows={2}
                placeholder="Условия, забележки за клиента..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {/* VAT toggle */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 mb-4 flex items-center justify-between shadow-sm">
              <div>
                <div className="font-semibold text-sm text-slate-800">ДДС (20%)</div>
                <div className="text-xs text-slate-400 mt-0.5">Включи ДДС в офертата</div>
              </div>
              <button
                onClick={() => setVatOn(v => !v)}
                className="relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
                style={{ background: vatOn ? '#4f46e5' : '#e2e8f0' }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                  style={{ transform: vatOn ? 'translateX(21px)' : 'translateX(2px)' }}
                />
              </button>
            </div>

            {/* Summary card */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-5 mb-4 text-white shadow-lg">
              <div className="flex justify-between text-sm opacity-80 mb-2">
                <span>Сума без ДДС</span><span>{fmt(subtotal)}</span>
              </div>
              {vatOn && (
                <div className="flex justify-between text-sm opacity-80 mb-2">
                  <span>ДДС 20%</span><span>{fmt(vatAmt)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-black border-t border-white/30 pt-3 mt-2">
                <span>ОБЩО</span><span>{fmt(total)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Action bar ── */}
      <div className="bg-white border-t border-slate-100 p-3 flex-shrink-0 relative">

        {/* Extra actions popup — appears ABOVE */}
        {showActions && items.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-10">
            <button
              onClick={() => { handleContract(); setShowActions(false) }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100"
            >
              <span>📄</span> Генерирай договор
            </button>
            <button
              onClick={() => { handleShare(); setShowActions(false) }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span>🔗</span> Сподели линк с клиент
              {!savedId && <span className="ml-auto text-xs text-slate-400">(запази първо)</span>}
            </button>
          </div>
        )}

        {items.length > 0 && (
          <div className="flex gap-2 mb-2">
            <button
              onClick={saveProject}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm
                         bg-emerald-500 hover:bg-emerald-600 active:scale-[.98] disabled:opacity-60"
            >
              {saving ? '⏳...' : '💾 Запази'}
            </button>
            <button
              onClick={handlePDF}
              className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm
                         bg-blue-500 hover:bg-blue-600 active:scale-[.98]"
            >
              🖨️ PDF оферта
            </button>
            <button
              onClick={() => setShowActions(v => !v)}
              className="px-3 py-2.5 rounded-xl font-semibold text-slate-600 text-sm
                         bg-slate-100 hover:bg-slate-200 active:scale-[.98]"
            >
              •••
            </button>
          </div>
        )}

        <button
          data-tour="add-service-btn"
          onClick={() => setShowPicker(true)}
          className="w-full py-3 rounded-xl font-semibold text-white text-sm
                     bg-gradient-to-r from-indigo-600 to-violet-700
                     hover:opacity-90 active:scale-[.98] transition-all shadow-sm"
        >
          + Добави услуга
        </button>
      </div>

      {showPicker && (
        <ServicePicker onAdd={addItem} onClose={() => setShowPicker(false)} />
      )}
    </div>
  )
}

import { useState } from 'react'
import { SERVICES } from '../data/services'
import { useLang } from '../contexts/LanguageContext'

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

export default function ServicePicker({ onAdd, onClose }) {
  const { t } = useLang()
  const [catId,      setCatId]      = useState(null)
  const [search,     setSearch]     = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const cat = SERVICES.find(s => s.id === catId)
  const q   = search.trim().toLowerCase()

  const allItems = SERVICES.flatMap(c =>
    c.items.map(i => ({ ...i, catName: c.name, catColor: c.color }))
  )
  const displayItems = q
    ? allItems.filter(i => i.name.toLowerCase().includes(q))
    : cat
      ? cat.items.map(i => ({ ...i, catName: cat.name, catColor: cat.color }))
      : []

  const handleAdd = (item, qty, price) => {
    onAdd({
      id:        genId(),
      serviceId: item.id,
      name:      item.name,
      unit:      item.unit,
      qty:       parseFloat(qty),
      price:     parseFloat(price) || 0,
      category:  item.catName,
      catColor:  item.catColor,
    })
    setExpandedId(null)
  }

  const groups   = ['Вътрешни', 'Външни']
  const groupIcon = { 'Вътрешни': '🏠', 'Външни': '🌿' }

  // ── Shared service list ──
  const ServiceList = () => (
    <div className="flex-1 overflow-y-auto thin-scroll px-4 py-3">
      {displayItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm">{t('noServicesFound')}</p>
        </div>
      )}
      {displayItems.map(item => (
        <ServiceRow
          key={item.id}
          item={item}
          expanded={expandedId === item.id}
          onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
          onAdd={handleAdd}
        />
      ))}
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/50 backdrop-blur-sm md:items-center md:justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}
    >

      {/* ════════════════════════════════
          MOBILE — bottom sheet
      ════════════════════════════════ */}
      <div className="md:hidden flex-1 flex flex-col justify-end">
        <div className="bg-white rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl">

          {/* Handle */}
          <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

          {/* Header */}
          <div className="flex items-center gap-3 px-4 pb-3 pt-1 border-b border-slate-100 flex-shrink-0">
            {catId && !q && (
              <button
                onClick={() => { setCatId(null); setExpandedId(null) }}
                className="text-indigo-600 text-sm font-semibold flex items-center gap-1"
              >
                ‹ {t('back').replace('← ', '')}
              </button>
            )}
            <h2 className="text-lg font-bold text-slate-800 flex-1">
              {catId && !q ? cat.icon + ' ' + cat.name : t('selectService')}
            </h2>
            <button onClick={onClose} className="text-2xl leading-none text-slate-400 w-8 h-8 flex items-center justify-center">×</button>
          </div>

          {/* Search */}
          <div className="px-4 py-2.5 border-b border-slate-100 flex-shrink-0">
            <input
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white transition-colors"
              placeholder={t('searchService')}
              value={search}
              onChange={e => { setSearch(e.target.value); setExpandedId(null) }}
              autoFocus
            />
          </div>

          {/* Category list OR service list */}
          {!catId && !q ? (
            <div className="flex-1 overflow-y-auto thin-scroll">
              {groups.map(group => (
                <div key={group}>
                  <div className="sticky top-0 px-4 py-2 bg-slate-50 border-b border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {groupIcon[group]} {group}
                    </span>
                  </div>
                  {SERVICES.filter(s => s.group === group).map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setCatId(s.id); setExpandedId(null) }}
                      className="flex items-center gap-3 w-full px-4 py-3.5 border-b border-slate-100 text-left hover:bg-slate-50 transition-colors"
                    >
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                        style={{ background: s.color + '20' }}
                      >
                        {s.icon}
                      </span>
                      <span className="flex-1 text-sm font-medium text-slate-700">{s.name}</span>
                      <span className="text-xs text-slate-400">{s.items.length} {t('servicesCount')}</span>
                      <span className="text-slate-300 text-sm">›</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <ServiceList />
          )}
        </div>
      </div>

      {/* ════════════════════════════════
          DESKTOP — centered modal with sidebar
      ════════════════════════════════ */}
      <div
        className="hidden md:flex bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ width: 'min(1100px, 92vw)', height: 'min(760px, 88vh)' }}
      >
        {/* Left sidebar */}
        <div className="w-52 flex-shrink-0 border-r border-slate-100 flex flex-col bg-slate-50 overflow-y-auto">
          {groups.map(group => (
            <div key={group}>
              <div className="px-4 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {groupIcon[group]} {group}
              </div>
              {SERVICES.filter(s => s.group === group).map(s => (
                <button
                  key={s.id}
                  onClick={() => { setCatId(s.id); setSearch(''); setExpandedId(null) }}
                  className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left border-l-2 transition-all
                    ${s.id === catId
                      ? 'border-indigo-500 bg-white text-indigo-700 font-semibold'
                      : 'border-transparent text-slate-500 hover:bg-white hover:text-slate-700'}`}
                >
                  <span
                    className="w-6 h-6 rounded flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: s.id === catId ? s.color + '20' : 'transparent' }}
                  >
                    {s.icon}
                  </span>
                  <span className="truncate">{s.name}</span>
                  <span className="ml-auto text-[10px] text-slate-300">{s.items.length}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Right panel */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
            <h2 className="text-base font-bold text-slate-800">
              {cat ? cat.icon + ' ' + cat.name : t('selectService')}
            </h2>
            <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-600 w-7 h-7 flex items-center justify-center">×</button>
          </div>

          {/* Search */}
          <div className="px-5 py-3 border-b border-slate-100 flex-shrink-0">
            <input
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white transition-colors"
              placeholder={t('searchService')}
              value={search}
              onChange={e => { setSearch(e.target.value); setExpandedId(null) }}
            />
          </div>

          {/* Service list or placeholder */}
          {!catId && !q ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
              <div className="text-5xl mb-3">👈</div>
              <p className="text-sm">{t('selectCategory')}</p>
            </div>
          ) : (
            <ServiceList />
          )}
        </div>
      </div>

    </div>
  )
}

function ServiceRow({ item, expanded, onToggle, onAdd }) {
  const { t } = useLang()
  const [qty,   setQty]   = useState('')
  const [price, setPrice] = useState(String(item.price))

  const handleAdd = () => {
    const q = parseFloat(qty)
    if (!q || q <= 0) { alert(t('enterQty')); return }
    onAdd(item, qty, price)
    setQty('')
  }

  return (
    <div className="border border-slate-100 rounded-xl mb-2 overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 transition-colors"
        onClick={onToggle}
      >
        <span className="font-semibold text-sm text-slate-800 flex-1 text-left">{item.name}</span>
        <span className="text-xs text-slate-400 mx-2 flex-shrink-0">/ {item.unit}</span>
        <span className="text-sm font-bold mr-2 flex-shrink-0" style={{ color: item.catColor }}>
          € {item.price}
        </span>
        <span className="text-slate-300 text-xs flex-shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 bg-slate-50 flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
              {t('quantity')} ({item.unit})
            </label>
            <input
              type="number" min="0" step="0.1"
              className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-indigo-400 bg-white"
              placeholder="0.00"
              value={qty}
              onChange={e => setQty(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
              {t('pricePerUnit')} / {item.unit}
            </label>
            <input
              type="number" min="0" step="0.5"
              className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-indigo-400 bg-white"
              value={price}
              onChange={e => setPrice(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold flex-shrink-0 transition-opacity hover:opacity-90 active:scale-95"
            style={{ background: item.catColor }}
          >
            + {t('add')}
          </button>
        </div>
      )}
    </div>
  )
}

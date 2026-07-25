import { useState } from 'react'
import { SERVICES } from '../data/services'

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

export default function ServicePicker({ onAdd, onClose }) {
  const [catId, setCatId] = useState(SERVICES[0].id)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const cat = SERVICES.find(s => s.id === catId) || SERVICES[0]
  const q = search.trim().toLowerCase()

  const allItems = SERVICES.flatMap(c =>
    c.items.map(i => ({ ...i, catName: c.name, catColor: c.color }))
  )
  const displayItems = q
    ? allItems.filter(i => i.name.toLowerCase().includes(q))
    : cat.items.map(i => ({ ...i, catName: cat.name, catColor: cat.color }))

  const handleAdd = (item, qty, price) => {
    onAdd({
      id: genId(),
      serviceId: item.id,
      name: item.name,
      unit: item.unit,
      qty: parseFloat(qty),
      price: parseFloat(price) || 0,
      category: item.catName,
      catColor: item.catColor,
    })
    setExpandedId(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="flex-1" onClick={onClose} />

      <div className="bg-white rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Handle */}
        <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800">Избери услуга</h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 border-b border-slate-100 flex-shrink-0">
          <input
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white transition-colors"
            placeholder="🔍 Търсене на услуга..."
            value={search}
            onChange={e => { setSearch(e.target.value); setExpandedId(null) }}
            autoFocus
          />
        </div>

        {/* Category pills — grouped, wrapping */}
        {!q && (
          <div className="px-4 py-2.5 border-b border-slate-100 flex-shrink-0 overflow-y-auto thin-scroll" style={{maxHeight:'180px'}}>
            {['Вътрешни','Външни'].map(group => (
              <div key={group} className="mb-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{group}</div>
                <div className="flex flex-wrap gap-1.5">
                  {SERVICES.filter(s => s.group === group).map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setCatId(s.id); setExpandedId(null) }}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap"
                      style={{
                        background: s.id === catId ? s.color : '#f1f5f9',
                        color: s.id === catId ? 'white' : s.color,
                      }}
                    >
                      {s.icon} {s.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Service list */}
        <div className="flex-1 overflow-y-auto thin-scroll px-4 py-3">
          {displayItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm">Няма намерени услуги</p>
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
      </div>
    </div>
  )
}

function ServiceRow({ item, expanded, onToggle, onAdd }) {
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState(String(item.price))

  const handleAdd = () => {
    const q = parseFloat(qty)
    if (!q || q <= 0) { alert('Въведи количество!'); return }
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
              Количество ({item.unit})
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
              Цена / {item.unit}
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
            + Добави
          </button>
        </div>
      )}
    </div>
  )
}

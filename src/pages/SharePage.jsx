import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { generateOfferPDF } from '../lib/pdf'

const fmt = n =>
  '€ ' + Number(n).toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function SharePage({ token }) {
  const [project, setProject] = useState(null)
  const [profile, setProfile] = useState(null)
  const [client,  setClient]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => { loadShare() }, [token])

  async function loadShare() {
    setLoading(true)

    const { data: proj, error: err } = await supabase
      .from('projects')
      .select('*')
      .eq('share_token', token)
      .single()

    if (err || !proj) {
      setError('Линкът е невалиден или е изтекъл.')
      setLoading(false)
      return
    }

    setProject(proj)

    const [{ data: prof }, { data: cli }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', proj.user_id).single(),
      proj.client_id
        ? supabase.from('clients').select('*').eq('id', proj.client_id).single()
        : { data: null },
    ])

    setProfile(prof)
    setClient(cli)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <img src="/pwa-192.png" alt="Maistorix" className="w-16 h-16 rounded-2xl mb-3 mx-auto shadow-md animate-pulse" />
          <p className="text-slate-400 text-sm">Зареждане на офертата...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔗</div>
          <h2 className="text-lg font-bold text-slate-700 mb-2">Линкът не е намерен</h2>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  // Group items by category
  const grouped = (project.items || []).reduce((acc, item) => {
    const k = item.category || 'Услуги'
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})

  const companyName = profile?.company_name || profile?.full_name || 'Maistorix'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-700 text-white px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <img src="/pwa-192.png" alt="Maistorix" className="w-7 h-7 rounded-lg shadow" />
              <h1 className="font-black text-lg">{companyName}</h1>
            </div>
            <p className="text-white/70 text-xs mt-0.5">Оферта за Вас</p>
          </div>
          <button
            onClick={() => generateOfferPDF({ profile, client, project: {
              ...project,
              offer_date: new Date(project.offer_date || project.created_at).toLocaleDateString('bg-BG'),
              vat: project.vat,
              vat_amount: project.vat_amount,
            }, shareUrl: window.location.href })}
            className="text-xs px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 font-semibold transition-colors"
          >
            🖨️ PDF
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">

        {/* Offer meta */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Оферта</div>
              {project.offer_number && (
                <div className="font-bold text-indigo-600 text-lg">№ {project.offer_number}</div>
              )}
              <div className="font-bold text-slate-800 text-base mt-1">{project.name}</div>
              {project.address && <div className="text-sm text-slate-400 mt-0.5">📍 {project.address}</div>}
              {project.offer_date && (
                <div className="text-xs text-slate-400 mt-1">
                  📅 {new Date(project.offer_date).toLocaleDateString('bg-BG')}
                </div>
              )}
            </div>
            {profile?.logo_url && (
              <img src={profile.logo_url} alt="logo" className="w-16 h-16 object-contain rounded-xl flex-shrink-0" />
            )}
          </div>
        </div>

        {/* Company + Client */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Изпълнител</div>
            <div className="font-bold text-slate-800 text-sm">{companyName}</div>
            {profile?.phone   && <div className="text-xs text-slate-500 mt-1">📞 {profile.phone}</div>}
            {profile?.email   && <div className="text-xs text-slate-500">✉️ {profile.email}</div>}
            {(profile?.address || profile?.city) && (
              <div className="text-xs text-slate-400">📍 {[profile?.address, profile?.city].filter(Boolean).join(', ')}</div>
            )}
            {profile?.eik     && <div className="text-xs text-slate-400">ЕИК: {profile.eik}</div>}
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Клиент</div>
            {client ? (
              <>
                <div className="font-bold text-slate-800 text-sm">{client.name}</div>
                {client.phone && <div className="text-xs text-slate-500 mt-1">📞 {client.phone}</div>}
                {client.email && <div className="text-xs text-slate-500">✉️ {client.email}</div>}
                {(client.address || client.city) && (
                  <div className="text-xs text-slate-400">📍 {[client.address, client.city].filter(Boolean).join(', ')}</div>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-400 italic">—</div>
            )}
          </div>
        </div>

        {/* Services */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-700">Видове работа</h2>
          </div>
          {Object.entries(grouped).map(([catName, catItems]) => (
            <div key={catName}>
              <div className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wide">
                {catName}
              </div>
              {catItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-center px-5 py-3 gap-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-slate-50`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm text-slate-800">{item.name}</div>
                    <div className="text-xs text-slate-400">
                      {item.qty} {item.unit} × {fmt(item.price)}
                    </div>
                  </div>
                  <div className="font-bold text-indigo-600 text-sm whitespace-nowrap">
                    {fmt(item.qty * item.price)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex justify-between text-sm opacity-80 mb-2">
            <span>Сума без ДДС</span>
            <span>{fmt(project.subtotal)}</span>
          </div>
          {project.vat && (
            <div className="flex justify-between text-sm opacity-80 mb-2">
              <span>ДДС 20%</span>
              <span>{fmt(project.vat_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-black border-t border-white/30 pt-3 mt-2">
            <span>ОБЩО</span>
            <span>{fmt(project.total)}</span>
          </div>
        </div>

        {/* Notes */}
        {project.notes && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Бележки</div>
            <p className="text-sm text-slate-600 italic">{project.notes}</p>
          </div>
        )}

        {/* Footer */}
        {profile?.offer_footer && (
          <div className="text-center text-xs text-slate-400 pb-4">{profile.offer_footer}</div>
        )}
      </div>
    </div>
  )
}

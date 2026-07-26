import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import { offlineDelete } from '../lib/syncService'
import PaymentsModal from '../components/PaymentsModal'
import PhotosModal from '../components/PhotosModal'
import ExpensesModal from '../components/ExpensesModal'
import { generateOfferPDF, generateContractPDF } from '../lib/pdf'
import { saveDocument } from '../lib/documents'
import DocumentsModal from '../components/DocumentsModal'
import TasksModal from '../components/TasksModal'
import ProGateModal from '../components/ProGate'

const STATUS = {
  draft:       { label: 'Чернова',   color: 'bg-slate-100 text-slate-600' },
  sent:        { label: 'Изпратена', color: 'bg-blue-100 text-blue-700' },
  accepted:    { label: 'Приета',    color: 'bg-green-100 text-green-700' },
  in_progress: { label: 'В процес',  color: 'bg-amber-100 text-amber-700' },
  completed:   { label: 'Завършена', color: 'bg-emerald-100 text-emerald-700' },
  cancelled:   { label: 'Отказана',  color: 'bg-red-100 text-red-600' },
}

const fmt = n =>
  '€ ' + Number(n).toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function ProjectsPage({ onEdit, onNew, onGoUpgrade }) {
  const { user, profile } = useAuth()
  const isPro = profile?.plan === 'pro'
  const [projects, setProjects]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [payProject,     setPayProject]     = useState(null)
  const [photoProject,   setPhotoProject]   = useState(null)
  const [expenseProject, setExpenseProject] = useState(null)
  const [taskProject,    setTaskProject]    = useState(null)
  const [docProject,     setDocProject]     = useState(null)
  const [proGateFeature, setProGateFeature] = useState(null) // null = hidden
  const [taskMap,        setTaskMap]        = useState({}) // { project_id: count }
  // payment sums per project: { [project_id]: number }
  const [paidMap,    setPaidMap]      = useState({})
  // photo counts per project: { [project_id]: number }
  const [photoMap,   setPhotoMap]     = useState({})

  const proAction = (fn, feature) => isPro ? fn() : setProGateFeature(feature || 'default')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)

    let proj, pays, phs, tks

    if (navigator.onLine) {
      const [r1, r2, r3, r4] = await Promise.all([
        supabase.from('projects').select('*, clients(name)').order('created_at', { ascending: false }),
        supabase.from('payments').select('project_id, amount'),
        supabase.from('photos').select('project_id'),
        supabase.from('tasks').select('project_id, status').eq('status', 'todo'),
      ])
      proj = r1.data; pays = r2.data; phs = r3.data; tks = r4.data
      // Cache projects (flatten clients join for IndexedDB)
      if (proj) await db.projects.bulkPut(proj.map(p => ({
        ...p, _client_name: p.clients?.name ?? null,
      })))
      if (pays) await db.payments.bulkPut(pays.map(p => ({ ...p, id: p.id || (p.project_id + '_' + p.amount) })))
    } else {
      // Offline — read from IndexedDB
      try {
        let localProj = await db.projects.where('user_id').equals(user.id).toArray()
        if (!localProj.length) localProj = await db.projects.toArray()
        proj = localProj
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .map(p => ({ ...p, clients: p._client_name ? { name: p._client_name } : null }))

        let localPays = await db.payments.where('user_id').equals(user.id).toArray()
        if (!localPays.length) localPays = await db.payments.toArray()
        pays = localPays

        let localPhs = await db.photos.where('user_id').equals(user.id).toArray()
        if (!localPhs.length) localPhs = await db.photos.toArray()
        phs = localPhs

        let localTks = await db.tasks.where('user_id').equals(user.id).filter(t => t.status === 'todo').toArray()
        if (!localTks.length) localTks = (await db.tasks.toArray()).filter(t => t.status === 'todo')
        tks = localTks
      } catch (e) {
        console.warn('[offline] ProjectsPage read failed', e)
        proj = []; pays = []; phs = []; tks = []
      }
    }

    setProjects(proj || [])

    const map = {}
    for (const p of (pays || [])) {
      map[p.project_id] = (map[p.project_id] || 0) + Number(p.amount)
    }
    setPaidMap(map)

    const phmap = {}
    for (const p of (phs || [])) {
      phmap[p.project_id] = (phmap[p.project_id] || 0) + 1
    }
    setPhotoMap(phmap)

    const tkmap = {}
    for (const t of (tks || [])) {
      tkmap[t.project_id] = (tkmap[t.project_id] || 0) + 1
    }
    setTaskMap(tkmap)
    setLoading(false)
  }

  async function deleteProject(id, name) {
    if (!confirm(`Изтрий проект „${name}"?`)) return
    await offlineDelete('projects', id)
    setProjects(p => p.filter(x => x.id !== id))
  }

  async function changeStatus(id, status) {
    await supabase.from('projects').update({ status }).eq('id', id)
    setProjects(p => p.map(x => x.id === id ? { ...x, status } : x))
  }

  async function duplicateProject(p) {
    await supabase.from('projects').insert({
      user_id:      user.id,
      client_id:    p.client_id,
      name:         'Копие на ' + p.name,
      address:      p.address,
      status:       'draft',
      items:        p.items,
      vat:          p.vat,
      notes:        p.notes,
      subtotal:     p.subtotal,
      vat_amount:   p.vat_amount,
      total:        p.total,
      offer_date:   new Date().toISOString().slice(0, 10),
    })
    loadAll()
  }

  async function getProjectData(p) {
    const [{ data: profile }, { data: client }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      p.client_id
        ? supabase.from('clients').select('*').eq('id', p.client_id).single()
        : { data: null },
    ])
    return { profile, client }
  }

  async function handleOfferPDF(p) {
    const { profile, client } = await getProjectData(p)

    // Ensure share token exists for QR code
    let token = p.share_token
    if (!token) {
      token = crypto.randomUUID()
      await supabase.from('projects').update({ share_token: token }).eq('id', p.id)
    }
    const shareUrl = `${window.location.origin}${window.location.pathname}#share/${token}`

    const html = generateOfferPDF({
      profile, client,
      shareUrl,
      isPro: profile?.plan === 'pro',
      project: {
        ...p,
        offer_date: p.offer_date
          ? new Date(p.offer_date).toLocaleDateString('bg-BG')
          : new Date().toLocaleDateString('bg-BG'),
        vat_amount: p.vat_amount,
      },
    })
    if (html) {
      saveDocument({
        html, projectId: p.id, userId: user.id,
        type: 'offer', name: `Оферта ${p.offer_number || new Date().toLocaleDateString('bg-BG')}`,
      })
    }
  }

  async function handleContractPDF(p) {
    const { profile, client } = await getProjectData(p)
    const html = generateContractPDF({ profile, client, project: p })
    if (html) {
      saveDocument({
        html, projectId: p.id, userId: user.id,
        type: 'contract', name: `Договор ${p.name}`,
      })
    }
  }

  async function handleShare(p) {
    const { data: existing } = await supabase
      .from('projects').select('share_token').eq('id', p.id).single()

    let token = existing?.share_token
    if (!token) {
      token = crypto.randomUUID()
      await supabase.from('projects').update({ share_token: token }).eq('id', p.id)
    }

    const url = `${window.location.origin}${window.location.pathname}#share/${token}`
    try {
      await navigator.clipboard.writeText(url)
      alert('🔗 Линкът е копиран!\n\nПрати го на клиента — той ще види офертата директно в браузъра си без да влиза в системата.\n\n' + url)
    } catch {
      prompt('Копирай линка:', url)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto thin-scroll p-4">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">Зареждане...</div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-lg font-semibold text-slate-600 mb-2">Няма запазени проекти</h3>
            <p className="text-slate-400 text-sm mb-6">Създайте оферта в Калкулатора и я запазете</p>
            <button
              onClick={onNew}
              className="px-6 py-2.5 rounded-xl font-semibold text-white text-sm
                         bg-gradient-to-r from-indigo-600 to-violet-700 hover:opacity-90"
            >
              + Нов проект
            </button>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {projects.map(p => {
              const st       = STATUS[p.status] || STATUS.draft
              const paid     = paidMap[p.id] || 0
              const remaining = Number(p.total) - paid
              const paidPct  = p.total > 0 ? Math.min(100, (paid / p.total) * 100) : 0
              const fullyPaid = remaining <= 0.01

              return (
                <div key={p.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">

                  {/* Title row */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 truncate">{p.name}</div>
                      {p.clients?.name && (
                        <div className="text-sm text-slate-500 mt-0.5">👤 {p.clients.name}</div>
                      )}
                      {p.address && (
                        <div className="text-sm text-slate-400">📍 {p.address}</div>
                      )}
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(p.created_at).toLocaleDateString('bg-BG')}
                        {' · '}{p.items?.length || 0} услуги
                        {p.offer_number && ` · ${p.offer_number}`}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-indigo-600">{fmt(p.total)}</div>
                      {p.vat && <div className="text-xs text-slate-400">с ДДС</div>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mt-1 inline-block ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                  </div>

                  {/* Payment progress */}
                  <div
                    className="flex items-center gap-2 mb-3 cursor-pointer group"
                    onClick={() => setPayProject(p)}
                  >
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${paidPct}%`,
                          background: fullyPaid
                            ? 'linear-gradient(90deg,#10b981,#059669)'
                            : 'linear-gradient(90deg,#4f46e5,#7c3aed)',
                        }}
                      />
                    </div>
                    <div className={`text-xs font-semibold whitespace-nowrap ${fullyPaid ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {fullyPaid
                        ? '✅ Платено'
                        : paid > 0
                          ? `${fmt(paid)} / остатък ${fmt(remaining)}`
                          : 'Не е платено'
                      }
                    </div>
                  </div>

                  {/* Status pills */}
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {Object.entries(STATUS).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => changeStatus(p.id, key)}
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all ${val.color} ${
                          p.status === key
                            ? 'ring-2 ring-offset-1 ring-indigo-400 opacity-100'
                            : 'opacity-35 hover:opacity-75'
                        }`}
                      >
                        {val.label}
                      </button>
                    ))}
                  </div>

                  {/* Actions */}
                  {/* Ред 1 — основни действия */}
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => onEdit(p.id)}
                      className="flex-1 text-xs py-2.5 rounded-xl bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 transition-colors"
                    >
                      ✏️ Редактирай
                    </button>
                    <button
                      onClick={() => setPayProject(p)}
                      className="flex-1 text-xs py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 transition-colors"
                    >
                      💰 Плащания
                    </button>
                    <button
                      onClick={() => proAction(() => setExpenseProject(p), 'expenses')}
                      className="flex-1 text-xs py-2.5 rounded-xl bg-orange-50 text-orange-600 font-semibold hover:bg-orange-100 transition-colors"
                    >
                      💸 Разходи{!isPro && ' ⚡'}
                    </button>
                    <button
                      onClick={() => proAction(() => setTaskProject(p), 'tasks')}
                      className="relative text-xs px-3 py-2.5 rounded-xl bg-indigo-50 text-indigo-600 font-semibold hover:bg-indigo-100 transition-colors"
                      title="Задачи"
                    >
                      ✅{taskMap[p.id] ? <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{taskMap[p.id]}</span> : null}
                      {!isPro && <span className="absolute -bottom-1 -right-1 text-[8px]">⚡</span>}
                    </button>
                  </div>

                  {/* Ред 2 — документи и допълнителни */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOfferPDF(p)}
                      className="flex-1 text-xs py-2 rounded-xl bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors"
                    >
                      🖨️ Оферта
                    </button>
                    <button
                      onClick={() => proAction(() => handleContractPDF(p), 'contract')}
                      className="flex-1 text-xs py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
                    >
                      📄 Договор{!isPro && ' ⚡'}
                    </button>
                    <button
                      onClick={() => proAction(() => setDocProject(p), 'documents')}
                      className="flex-1 text-xs py-2 rounded-xl bg-amber-50 text-amber-700 font-semibold hover:bg-amber-100 transition-colors"
                    >
                      📁 Документи{!isPro && ' ⚡'}
                    </button>
                    <button
                      onClick={() => proAction(() => handleShare(p), 'share')}
                      className="flex-1 text-xs py-2 rounded-xl bg-violet-50 text-violet-700 font-semibold hover:bg-violet-100 transition-colors"
                    >
                      🔗 Сподели{!isPro && ' ⚡'}
                    </button>
                    <button
                      onClick={() => proAction(() => setPhotoProject(p), 'photos')}
                      className="relative text-xs px-3 py-2 rounded-xl bg-slate-100 text-slate-600 font-semibold hover:bg-slate-200 transition-colors"
                    >
                      📷{photoMap[p.id] ? <span className="absolute -top-1 -right-1 bg-violet-600 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{photoMap[p.id]}</span> : null}
                      {!isPro && <span className="absolute -bottom-1 -right-1 text-[8px]">⚡</span>}
                    </button>
                    <button
                      onClick={() => duplicateProject(p)}
                      className="text-xs px-3 py-2 rounded-xl bg-slate-100 text-slate-500 font-semibold hover:bg-slate-200 transition-colors"
                      title="Дублирай проекта"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => deleteProject(p.id, p.name)}
                      className="text-xs px-3 py-2 rounded-xl bg-red-50 text-red-500 font-semibold hover:bg-red-100 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-100 bg-white flex-shrink-0">
        <button
          onClick={onNew}
          className="w-full py-3 rounded-xl font-semibold text-white text-sm
                     bg-gradient-to-r from-indigo-600 to-violet-700
                     hover:opacity-90 active:scale-[.98] transition-all shadow-sm"
        >
          + Нов проект
        </button>
      </div>

      {/* Payments modal */}
      {payProject && (
        <PaymentsModal
          project={payProject}
          onClose={() => { setPayProject(null); loadAll() }}
        />
      )}

      {/* Photos modal */}
      {photoProject && (
        <PhotosModal
          project={photoProject}
          onClose={() => { setPhotoProject(null); loadAll() }}
        />
      )}

      {/* Expenses modal */}
      {expenseProject && (
        <ExpensesModal
          project={expenseProject}
          onClose={() => { setExpenseProject(null); loadAll() }}
        />
      )}

      {/* Tasks modal */}
      {taskProject && (
        <TasksModal
          project={taskProject}
          onClose={() => { setTaskProject(null); loadAll() }}
        />
      )}

      {/* Documents modal */}
      {docProject && (
        <DocumentsModal
          project={docProject}
          onClose={() => setDocProject(null)}
        />
      )}

      {/* PRO gate */}
      {proGateFeature && (
        <ProGateModal
          feature={proGateFeature}
          onClose={() => setProGateFeature(null)}
          onUpgrade={() => { setProGateFeature(null); onGoUpgrade?.() }}
        />
      )}
    </div>
  )
}

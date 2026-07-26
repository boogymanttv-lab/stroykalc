import { useState, useEffect } from 'react'
import { getProjectDocuments, deleteDocument } from '../lib/documents'
import { db } from '../lib/db'
import { supabase } from '../lib/supabase'
import { useLang } from '../contexts/LanguageContext'
import { showToast } from '../lib/toast'

const TYPE_LABEL = {
  offer:    { labelKey: 'docOffer',    color: 'bg-blue-50 text-blue-700',   icon: '🖨️' },
  contract: { labelKey: 'docContract', color: 'bg-slate-100 text-slate-700', icon: '📄' },
}

export default function DocumentsModal({ project, onClose }) {
  const { t } = useLang()
  const [docs,     setDocs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { loadDocs() }, [project.id])

  async function loadDocs() {
    setLoading(true)
    const data = await getProjectDocuments(project.id)
    setDocs(data)
    setLoading(false)
  }

  async function handleDelete(doc) {
    if (!confirm(`${t('deleteDocConfirm')} „${doc.name}"?`)) return
    setDeleting(doc.id)
    await deleteDocument(doc)
    setDocs(d => d.filter(x => x.id !== doc.id))
    setDeleting(null)
  }

  async function openDoc(doc) {
    try {
      let html = null
      const cached = await db.documents.get(doc.id)
      if (cached?.html) {
        html = cached.html
      } else if (navigator.onLine && doc.storage_path) {
        const { data: { publicUrl } } = supabase.storage
          .from('documents').getPublicUrl(doc.storage_path)
        const res = await fetch(publicUrl)
        html = await res.text()
        await db.documents.put({ ...doc, html })
      }

      if (!html) { showToast(t('docNotAvailableOffline'), 'warning'); return }

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const win  = window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      if (!win) showToast('Allow pop-ups for maistorix.com', 'warning')
    } catch (e) {
      console.error('[openDoc]', e)
      showToast(t('error'), 'error')
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-slate-800 text-base">{t('documentsTitle')}</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[240px]">{project.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto thin-scroll p-4">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-sm">{t('loading')}</div>
          ) : docs.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">📂</div>
              <p className="text-slate-500 font-semibold text-sm">{t('noDocuments')}</p>
              <p className="text-slate-400 text-xs mt-1.5">{t('noDocumentsDesc')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map(doc => {
                const tp = TYPE_LABEL[doc.type] || TYPE_LABEL.offer
                return (
                  <div key={doc.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                    <span className="text-xl flex-shrink-0">{tp.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">{doc.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${tp.color}`}>
                          {t(tp.labelKey)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(doc.created_at).toLocaleDateString('bg-BG', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => openDoc(doc)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors"
                      >
                        👁 {t('open')}
                      </button>
                      <button
                        onClick={() => handleDelete(doc)}
                        disabled={deleting === doc.id}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-4 pb-4 pt-2 flex-shrink-0 border-t border-slate-50">
          <p className="text-center text-[11px] text-slate-400">{t('docPrintHint')}</p>
        </div>
      </div>
    </div>
  )
}

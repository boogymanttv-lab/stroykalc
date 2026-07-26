import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'

export default function PhotosModal({ project, onClose }) {
  const { user } = useAuth()
  const { t } = useLang()
  const [photos,    setPhotos]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [lightbox,  setLightbox]  = useState(null)
  const fileRef = useRef()

  useEffect(() => { loadPhotos() }, [])

  async function loadPhotos() {
    setLoading(true)
    const { data } = await supabase
      .from('photos').select('*').eq('project_id', project.id)
      .order('created_at', { ascending: false })
    setPhotos(data || [])
    setLoading(false)
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)

    for (const file of files) {
      const ext  = file.name.split('.').pop()
      const path = `${user.id}/${project.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('project-photos').upload(path, file, { upsert: false })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('project-photos').getPublicUrl(path)
        await supabase.from('photos').insert({
          project_id: project.id, user_id: user.id,
          url: urlData.publicUrl,
          caption: file.name.replace(/\.[^.]+$/, ''),
        })
      }
    }
    e.target.value = ''
    await loadPhotos()
    setUploading(false)
  }

  async function deletePhoto(photo) {
    if (!confirm(t('deletePhotoConfirm'))) return
    const url = photo.url, bucket = 'project-photos'
    const marker = `/${bucket}/`
    const idx = url.indexOf(marker)
    if (idx !== -1) {
      const storagePath = decodeURIComponent(url.slice(idx + marker.length))
      await supabase.storage.from(bucket).remove([storagePath])
    }
    await supabase.from('photos').delete().eq('id', photo.id)
    setPhotos(p => p.filter(x => x.id !== photo.id))
  }

  async function updateCaption(id, caption) {
    await supabase.from('photos').update({ caption }).eq('id', id)
    setPhotos(p => p.map(x => x.id === id ? { ...x, caption } : x))
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
        <div className="flex-1" onClick={onClose} />

        <div className="bg-white rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl">
          <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 pt-1 border-b border-slate-100 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-slate-800">{t('photosTitle')}</h2>
              <p className="text-xs text-slate-400 truncate max-w-[220px]">{project.name}</p>
            </div>
            <button onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center">×</button>
          </div>

          {/* Photo count */}
          {!loading && (
            <div className="px-4 py-2 border-b border-slate-100 flex-shrink-0">
              <p className="text-xs text-slate-400">
                {photos.length === 0 ? t('noPhotos') : `${photos.length} ${t('photosTitle').replace('📷 ', '')}`}
              </p>
            </div>
          )}

          {/* Grid */}
          <div className="flex-1 overflow-y-auto thin-scroll p-4">
            {loading ? (
              <div className="text-center py-12 text-slate-400 text-sm">{t('loading')}</div>
            ) : photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="text-5xl mb-3">📸</div>
                <p className="text-slate-400 text-sm mb-1">{t('noPhotos')}</p>
                <p className="text-slate-300 text-xs">{t('addPhoto')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map(photo => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    onView={() => setLightbox(photo.url)}
                    onDelete={() => deletePhoto(photo)}
                    onCaptionChange={cap => updateCaption(photo.id, cap)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Upload button */}
          <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex-shrink-0">
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm
                         bg-gradient-to-r from-indigo-600 to-violet-700
                         hover:opacity-90 active:scale-[.98] transition-all shadow-sm disabled:opacity-60"
            >
              {uploading ? '⏳ ...' : `+ ${t('addPhoto')}`}
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox} alt=""
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl leading-none">×</button>
        </div>
      )}
    </>
  )
}

function PhotoCard({ photo, onView, onDelete, onCaptionChange }) {
  const { t } = useLang()
  const [editCap, setEditCap] = useState(false)
  const [cap,     setCap]     = useState(photo.caption || '')

  function saveCaption() {
    onCaptionChange(cap)
    setEditCap(false)
  }

  return (
    <div className="rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-white">
      <div className="aspect-square bg-slate-100 cursor-pointer overflow-hidden relative group" onClick={onView}>
        <img
          src={photo.url} alt={photo.caption || ''}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <span className="text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity">🔍</span>
        </div>
      </div>
      <div className="p-2">
        {editCap ? (
          <div className="flex gap-1">
            <input
              className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-400"
              value={cap} onChange={e => setCap(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveCaption() }} autoFocus
            />
            <button onClick={saveCaption} className="text-xs text-indigo-600 font-bold px-1">✓</button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-1">
            <button onClick={() => setEditCap(true)} className="text-xs text-slate-400 hover:text-slate-700 truncate text-left flex-1">
              {photo.caption || <span className="italic">{t('notes')}...</span>}
            </button>
            <button onClick={onDelete} className="text-red-300 hover:text-red-500 text-base leading-none flex-shrink-0">×</button>
          </div>
        )}
      </div>
    </div>
  )
}

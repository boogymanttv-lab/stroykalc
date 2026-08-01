import { useState, useEffect } from 'react'

export default function PublicProfilePage({ slug }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/public-profile?slug=${encodeURIComponent(slug)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setProfile(data); setLoading(false) })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [slug])

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
      <div className="text-center">
        <img src="/pwa-192.png" alt="Maistorix" className="w-12 h-12 rounded-2xl mx-auto mb-3 shadow-md animate-pulse" />
        <p className="text-slate-400 text-sm">Зарежда...</p>
      </div>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-xl font-black text-slate-800 mb-2">Страницата не е намерена</h1>
        <p className="text-slate-400 text-sm mb-6">Тази публична страница не съществува или е деактивирана.</p>
        <a href="https://maistorix.com"
          className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">
          Към Maistorix
        </a>
      </div>
    </div>
  )

  const initials = profile.company_name
    ? profile.company_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '??'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-700 pt-10 pb-16 px-4">
        <div className="max-w-lg mx-auto text-center">
          {profile.logo_url ? (
            <img src={profile.logo_url} alt={profile.company_name}
              className="w-24 h-24 rounded-2xl mx-auto mb-4 object-contain bg-white shadow-xl p-1" />
          ) : (
            <div className="w-24 h-24 rounded-2xl mx-auto mb-4 bg-white/20 flex items-center justify-center shadow-xl">
              <span className="text-3xl font-black text-white">{initials}</span>
            </div>
          )}
          <h1 className="text-2xl font-black text-white mb-1">{profile.company_name}</h1>
          {profile.city && (
            <p className="text-indigo-200 text-sm">📍 {profile.city}</p>
          )}
        </div>
      </div>

      {/* Card */}
      <div className="max-w-lg mx-auto px-4 -mt-8 pb-16">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* Bio */}
          {profile.bio && (
            <div className="p-6 border-b border-slate-100">
              <p className="text-slate-600 text-sm leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Services */}
          {profile.services?.length > 0 && (
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Услуги</h2>
              <div className="flex flex-wrap gap-2">
                {profile.services.map((s, i) => (
                  <span key={i}
                    className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold border border-indigo-100">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          {(profile.phone || profile.email || profile.website) && (
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Контакти</h2>
              <div className="space-y-3">
                {profile.phone && (
                  <a href={`tel:${profile.phone}`}
                    className="flex items-center gap-3 text-sm text-slate-700 hover:text-indigo-600 transition-colors group">
                    <span className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-base flex-shrink-0
                                     group-hover:bg-emerald-100 transition-colors">📞</span>
                    <span className="font-medium">{profile.phone}</span>
                  </a>
                )}
                {profile.email && (
                  <a href={`mailto:${profile.email}`}
                    className="flex items-center gap-3 text-sm text-slate-700 hover:text-indigo-600 transition-colors group">
                    <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-base flex-shrink-0
                                     group-hover:bg-blue-100 transition-colors">✉️</span>
                    <span className="font-medium">{profile.email}</span>
                  </a>
                )}
                {profile.website && (
                  <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-slate-700 hover:text-indigo-600 transition-colors group">
                    <span className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-base flex-shrink-0
                                     group-hover:bg-violet-100 transition-colors">🌐</span>
                    <span className="font-medium">{profile.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Share */}
          <div className="p-6 flex gap-2">
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: profile.company_name, url: window.location.href })
                } else {
                  navigator.clipboard.writeText(window.location.href)
                  alert('Линкът е копиран!')
                }
              }}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold
                         hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
              📤 Сподели
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <a href="https://maistorix.com" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-500 transition-colors">
            <img src="/pwa-192.png" alt="Maistorix" className="w-4 h-4 rounded-md" />
            Страницата е създадена с Maistorix
          </a>
        </div>
      </div>
    </div>
  )
}

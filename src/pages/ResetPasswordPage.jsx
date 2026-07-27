import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage({ onDone }) {
  const [password, setPassword]   = useState('')
  const [confirm,  setConfirm]    = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [showConf, setShowConf]   = useState(false)
  const [loading,  setLoading]    = useState(false)
  const [error,    setError]      = useState('')
  const [done,     setDone]       = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Паролите не съвпадат.'); return }
    if (password.length < 6)  { setError('Паролата трябва да е поне 6 символа.'); return }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (err) { setError(err.message); return }
    setDone(true)
    setTimeout(() => {
      window.history.replaceState({}, '', window.location.pathname)
      onDone?.()
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <img src="/pwa-192.png" alt="Maistorix" className="w-16 h-16 rounded-2xl mb-2 mx-auto shadow-md" />
          <h1 className="text-2xl font-black text-slate-800">Maistorix</h1>
        </div>

        {done ? (
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Паролата е сменена!</h2>
            <p className="text-slate-400 text-sm">Влизате в акаунта си...</p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Нова парола</h2>
            <p className="text-sm text-slate-400 mb-6">Въведете новата си парола два пъти.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Нова парола
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} required
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-indigo-400 transition-colors"
                    placeholder="Минимум 6 символа"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}>
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Повтори паролата
                </label>
                <div className="relative">
                  <input
                    type={showConf ? 'text' : 'password'} required
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-indigo-400 transition-colors"
                    placeholder="Повтори новата парола"
                  />
                  <button type="button" onClick={() => setShowConf(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}>
                    {showConf ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-white text-sm
                           bg-gradient-to-r from-indigo-600 to-violet-700
                           hover:opacity-90 active:scale-[.98] transition-all
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? '⏳ Запазване...' : 'Смени паролата'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode]       = useState('login')   // login | register
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [agreedTerms,   setAgreedTerms]   = useState(false)
  const [agreedPrivacy, setAgreedPrivacy] = useState(false)

  const isLogin = mode === 'login'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!isLogin && password !== confirm) {
      setError('Паролите не съвпадат.'); return
    }
    if (password.length < 6) {
      setError('Паролата трябва да е поне 6 символа.'); return
    }
    if (!isLogin && (!agreedTerms || !agreedPrivacy)) {
      setError('Трябва да приемете Общите условия и Политиката за поверителност.'); return
    }

    setLoading(true)

    if (isLogin) {
      const err = await signIn(email, password)
      if (err) setError(translateError(err.message))
    } else {
      const err = await signUp(email, password)
      if (err) setError(translateError(err.message))
      else setDone(true)
    }

    setLoading(false)
  }

  if (done) {
    return (
      <Screen>
        <div className="text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Провери имейла си</h2>
          <p className="text-slate-500 text-sm mb-6">
            Изпратихме линк за потвърждение на <strong>{email}</strong>.<br />
            Кликни го и след това влез тук.
          </p>
          <button
            onClick={() => { setDone(false); setMode('login') }}
            className="text-indigo-600 font-semibold text-sm"
          >
            ← Към Вход
          </button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen>
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="text-4xl mb-2">🏗️</div>
        <h1 className="text-2xl font-black text-slate-800">Maistorix</h1>
        <p className="text-slate-400 text-sm mt-1">Калкулатор за ремонти и строителство</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => { setMode('login'); setError('') }}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            isLogin ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          Вход
        </button>
        <button
          onClick={() => { setMode('register'); setError('') }}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            !isLogin ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          Регистрация
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Имейл
          </label>
          <input
            type="email" required
            value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors"
            placeholder="ivan@example.com"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Парола
          </label>
          <input
            type="password" required
            value={password} onChange={e => setPassword(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors"
            placeholder="Минимум 6 символа"
          />
        </div>

        {!isLogin && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Повтори парола
            </label>
            <input
              type="password" required
              value={confirm} onChange={e => setConfirm(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors"
              placeholder="Повтори паролата"
            />
          </div>
        )}

        {!isLogin && (
          <div className="space-y-2.5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={e => setAgreedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-indigo-600 flex-shrink-0"
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                Прочетох и приемам{' '}
                <a href="/terms.html" target="_blank" rel="noopener noreferrer"
                   className="text-indigo-600 underline font-semibold">
                  Общите условия
                </a>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedPrivacy}
                onChange={e => setAgreedPrivacy(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-indigo-600 flex-shrink-0"
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                Запознат съм с{' '}
                <a href="/privacy.html" target="_blank" rel="noopener noreferrer"
                   className="text-indigo-600 underline font-semibold">
                  Политиката за поверителност
                </a>{' '}
                и давам съгласие за обработка на личните ми данни
              </span>
            </label>
          </div>
        )}

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
                     disabled:opacity-60 disabled:cursor-not-allowed mt-2"
        >
          {loading ? '⏳ Зареждане...' : isLogin ? 'Влез в акаунта' : 'Създай акаунт'}
        </button>
      </form>

      {isLogin && (
        <p className="text-center text-xs text-slate-400 mt-4">
          Нямаш акаунт?{' '}
          <button onClick={() => setMode('register')} className="text-indigo-600 font-semibold">
            Регистрирай се
          </button>
        </p>
      )}
    </Screen>
  )
}

function Screen({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        {children}
      </div>
    </div>
  )
}

function translateError(msg) {
  if (msg.includes('Invalid login'))   return 'Грешен имейл или парола.'
  if (msg.includes('already registered')) return 'Този имейл вече е регистриран.'
  if (msg.includes('Email not confirmed')) return 'Потвърди имейла си първо.'
  return msg
}

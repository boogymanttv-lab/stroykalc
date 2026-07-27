import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'

export default function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth()
  const { t, lang, setLang } = useLang()
  const [mode, setMode]         = useState('login')   // 'login' | 'register' | 'forgot'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [agreedTerms,   setAgreedTerms]   = useState(false)
  const [agreedPrivacy, setAgreedPrivacy] = useState(false)

  const isLogin    = mode === 'login'
  const isRegister = mode === 'register'
  const isForgot   = mode === 'forgot'

  function switchMode(m) {
    setMode(m)
    setError('')
    setDone(false)
    setPassword('')
    setConfirm('')
    setShowPass(false)
    setShowConf(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // Forgot password
    if (isForgot) {
      setLoading(true)
      const err = await resetPassword(email)
      setLoading(false)
      if (err) setError(translateError(err.message, t))
      else setDone(true)
      return
    }

    if (!isLogin && password !== confirm) {
      setError(t('errPasswordsMatch')); return
    }
    if (password.length < 6) {
      setError(t('errPasswordShort')); return
    }
    if (!isLogin && (!agreedTerms || !agreedPrivacy)) {
      setError(t('errAgreeTerms')); return
    }

    setLoading(true)

    if (isLogin) {
      const err = await signIn(email, password)
      if (err) setError(translateError(err.message, t))
    } else {
      const err = await signUp(email, password)
      if (err) setError(translateError(err.message, t))
      else setDone(true)
    }

    setLoading(false)
  }

  // ── Forgot password — done state ─────────────────────────────────────────
  if (isForgot && done) {
    return (
      <Screen lang={lang} setLang={setLang}>
        <div className="text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {lang === 'en' ? 'Check your email' : 'Проверете имейла си'}
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            {lang === 'en'
              ? <>Link to reset your password was sent to <strong>{email}</strong>.</>
              : <>Линк за нова парола беше изпратен на <strong>{email}</strong>.</>
            }
          </p>
          <button
            onClick={() => switchMode('login')}
            className="text-indigo-600 font-semibold text-sm"
          >
            {lang === 'en' ? '← Back to login' : '← Назад към вход'}
          </button>
        </div>
      </Screen>
    )
  }

  // ── Register — done state ─────────────────────────────────────────────────
  if (isRegister && done) {
    return (
      <Screen lang={lang} setLang={setLang}>
        <div className="text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{t('checkEmail')}</h2>
          <p className="text-slate-500 text-sm mb-6">
            {t('confirmSent')} <strong>{email}</strong>.<br />
            {t('confirmClick')}
          </p>
          <button
            onClick={() => switchMode('login')}
            className="text-indigo-600 font-semibold text-sm"
          >
            {t('backToLogin')}
          </button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen lang={lang} setLang={setLang}>
      {/* Logo */}
      <div className="text-center mb-8">
        <img src="/pwa-192.png" alt="Maistorix" className="w-16 h-16 rounded-2xl mb-2 mx-auto shadow-md" />
        <h1 className="text-2xl font-black text-slate-800">Maistorix</h1>
        <p className="text-slate-400 text-sm mt-1">{t('appTagline')}</p>
      </div>

      {/* Tabs — only for login/register */}
      {!isForgot && (
        <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              isLogin ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            {t('login')}
          </button>
          <button
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              isRegister ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            {t('register')}
          </button>
        </div>
      )}

      {/* Forgot password header */}
      {isForgot && (
        <div className="mb-6">
          <button
            onClick={() => switchMode('login')}
            className="text-sm text-slate-400 hover:text-slate-600 mb-3 flex items-center gap-1"
          >
            ← {lang === 'en' ? 'Back' : 'Назад'}
          </button>
          <h2 className="text-lg font-bold text-slate-800">
            {lang === 'en' ? 'Reset password' : 'Забравена парола'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {lang === 'en'
              ? 'Enter your email and we'll send you a reset link.'
              : 'Въведете имейла си и ще ви изпратим линк за нова парола.'}
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            {t('emailLabel')}
          </label>
          <input
            type="email" required
            value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors"
            placeholder="ivan@example.com"
          />
        </div>

        {/* Password */}
        {!isForgot && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {t('passwordLabel')}
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'} required
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-indigo-400 transition-colors"
                placeholder={t('passwordMin')}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
        )}

        {/* Confirm password */}
        {isRegister && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {t('repeatPassword')}
            </label>
            <div className="relative">
              <input
                type={showConf ? 'text' : 'password'} required
                value={confirm} onChange={e => setConfirm(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-indigo-400 transition-colors"
                placeholder={t('repeatPassPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowConf(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showConf ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
        )}

        {/* Terms */}
        {isRegister && (
          <div className="space-y-2.5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={e => setAgreedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-indigo-600 flex-shrink-0"
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                {t('agreeTerms')}{' '}
                <a href="/terms.html" target="_blank" rel="noopener noreferrer"
                   className="text-indigo-600 underline font-semibold">
                  {t('termsLink')}
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
                {t('agreePrivacy')}{' '}
                <a href="/privacy.html" target="_blank" rel="noopener noreferrer"
                   className="text-indigo-600 underline font-semibold">
                  {t('privacyLink')}
                </a>{' '}
                {t('privacyConsent')}
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
          {loading
            ? `⏳ ${t('loading')}`
            : isForgot
              ? (lang === 'en' ? 'Send reset link' : 'Изпрати линк')
              : isLogin
                ? t('loginBtn')
                : t('registerBtn')
          }
        </button>
      </form>

      {/* Forgot password link */}
      {isLogin && (
        <div className="text-center mt-4 space-y-2">
          <button
            onClick={() => switchMode('forgot')}
            className="block w-full text-xs text-slate-400 hover:text-indigo-600 transition-colors"
          >
            {lang === 'en' ? 'Forgot your password?' : 'Забравена парола?'}
          </button>
          <p className="text-xs text-slate-400">
            {t('noAccount')}{' '}
            <button onClick={() => switchMode('register')} className="text-indigo-600 font-semibold">
              {t('registerLink')}
            </button>
          </p>
        </div>
      )}
    </Screen>
  )
}

function Screen({ children, lang, setLang }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 relative">
        <button
          onClick={() => setLang(lang === 'bg' ? 'en' : 'bg')}
          className="absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded-lg
                     bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
        >
          {lang === 'bg' ? '🇬🇧 EN' : '🇧🇬 BG'}
        </button>
        {children}
      </div>
    </div>
  )
}

function translateError(msg, t) {
  if (msg.includes('Invalid login'))        return t('errInvalidLogin')
  if (msg.includes('already registered'))   return t('errAlreadyRegistered')
  if (msg.includes('Email not confirmed'))  return t('errEmailNotConfirmed')
  return msg
}

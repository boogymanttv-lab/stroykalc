import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'
import { showToast } from '../lib/toast'

export default function UpgradePage() {
  const { user, profile } = useAuth()
  const { t } = useLang()
  const [loading,       setLoading]       = useState(null) // 'now' | 'trial' | null
  const [error,         setError]         = useState('')
  const [billing,       setBilling]       = useState('monthly')
  const [portalLoading, setPortalLoading] = useState(false)

  const FEATURES_FREE = [
    t('featUnlimitedProjects'),
    t('featCalc'),
    t('featNoPdf'),
    t('featClients'),
    t('featPayments'),
  ]

  const FEATURES_PRO = [
    t('featPdfNo'),
    t('featContracts'),
    t('featQR'),
    t('featExpenses'),
    t('featPhotos'),
    t('featReports'),
    t('featTasks'),
    t('featDocuments'),
    t('featOffline'),
    t('featSupport'),
  ]

  async function handleUpgrade(trial = false) {
    setLoading(trial ? 'trial' : 'now')
    setError('')
    try {
      const res = await fetch('/api/create-checkout-session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id, userEmail: user.email, trial, billing }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || t('error'))
        setLoading(null)
      }
    } catch (e) {
      setError(e.message)
      setLoading(null)
    }
  }

  async function handleManageSubscription() {
    setPortalLoading(true)
    try {
      const res  = await fetch('/api/customer-portal', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (e) {
      showToast(t('error') + ': ' + e.message, 'error')
    }
    setPortalLoading(false)
  }

  const isPro = profile?.plan === 'pro'

  // Calculate trial days remaining
  const trialDaysLeft = (() => {
    if (!profile?.stripe_trial_end) return null
    const end = new Date(profile.stripe_trial_end)
    const now = new Date()
    if (end <= now) return 0
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  })()

  const isTrialing = profile?.stripe_sub_status === 'trialing' && trialDaysLeft > 0

  // Next payment date + days remaining
  const nextPayment = (() => {
    if (!profile?.stripe_current_period_end) return null
    return new Date(profile.stripe_current_period_end)
  })()

  const daysUntilPayment = (() => {
    if (!nextPayment) return null
    const diff = nextPayment - new Date()
    if (diff <= 0) return 0
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  })()

  if (isPro) {
    return (
      <div className="flex-1 overflow-y-auto thin-scroll p-4 max-w-xl mx-auto w-full">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🌟</div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">{t('youArePro')}</h2>
          <p className="text-slate-500 text-sm mb-6">{t('proDesc')}</p>

          {isTrialing && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold">
              ⏳ Пробен период — остават <strong>{trialDaysLeft} {trialDaysLeft === 1 ? 'ден' : 'дни'}</strong>
              {nextPayment && (
                <div className="text-xs font-normal mt-1 text-amber-600">
                  Първо плащане: {nextPayment.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
            </div>
          )}

          {!isTrialing && nextPayment && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm">
              💳 Следващо плащане: <strong>{nextPayment.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
              <span className="text-indigo-500 text-xs ml-1">({daysUntilPayment} {daysUntilPayment === 1 ? 'ден' : 'дни'})</span>
            </div>
          )}

          <div className="inline-block px-6 py-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-700 text-white font-bold text-sm mb-8">
            {t('proActive')}
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-left">
            <h3 className="font-bold text-slate-700 text-sm mb-1">{t('manageSubscription')}</h3>
            <p className="text-xs text-slate-400 mb-4">{t('manageSubDesc')}</p>
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="w-full py-3 rounded-xl font-semibold text-sm
                         border border-slate-200 text-slate-600
                         hover:bg-slate-50 active:scale-[.98] transition-all
                         disabled:opacity-60"
            >
              {portalLoading ? t('loadingPortal') : t('manageSubscription')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto thin-scroll p-4 max-w-xl mx-auto w-full">
      <div className="space-y-5 pb-10">

        {/* Hero */}
        <div className="text-center pt-4 pb-2">
          <div className="text-5xl mb-3">🚀</div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">{t('upgradeTitle')}</h1>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">{t('upgradeDesc')}</p>
        </div>

        {/* Pricing card */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white text-center shadow-xl">
          <div className="text-sm font-semibold text-indigo-200 mb-3">Maistorix PRO</div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-1 bg-white/10 rounded-xl p-1 mb-5">
            <button
              onClick={() => setBilling('monthly')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                billing === 'monthly'
                  ? 'bg-white text-indigo-700 shadow'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {t('monthly')}
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all relative ${
                billing === 'yearly'
                  ? 'bg-white text-indigo-700 shadow'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {t('yearly')}
              <span className="absolute -top-2 -right-1 bg-amber-400 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                -30%
              </span>
            </button>
          </div>

          {/* Price display */}
          {billing === 'monthly' ? (
            <>
              <div className="flex items-end justify-center gap-1 mb-1">
                <span className="text-5xl font-black">€2.99</span>
                <span className="text-indigo-200 mb-2">{t('perMonth')}</span>
              </div>
              <div className="text-indigo-200 text-xs mb-5">{t('monthlyYearlyNote')}</div>
            </>
          ) : (
            <>
              <div className="flex items-end justify-center gap-1 mb-1">
                <span className="text-5xl font-black">€24.99</span>
                <span className="text-indigo-200 mb-2">{t('perYear')}</span>
              </div>
              <div className="text-indigo-200 text-xs mb-5">{t('yearlyPerMonthNote')}</div>
            </>
          )}

          <button
            onClick={() => handleUpgrade(false)}
            disabled={!!loading}
            className="w-full py-3.5 rounded-xl font-bold text-indigo-700 bg-white
                       hover:bg-indigo-50 active:scale-[.98] transition-all text-sm shadow-lg
                       disabled:opacity-70 mb-2"
          >
            {loading === 'now' ? t('redirecting') : t('upgradeNow')}
          </button>
          {profile?.trial_used ? (
            <div className="w-full py-3 rounded-xl text-white/50 border border-white/20 text-sm text-center">
              🚫 Пробният период е вече използван
            </div>
          ) : (
            <button
              onClick={() => handleUpgrade(true)}
              disabled={!!loading}
              className="w-full py-3 rounded-xl font-semibold text-white/90 border border-white/40
                         hover:bg-white/10 active:scale-[.98] transition-all text-sm
                         disabled:opacity-70"
            >
              {loading === 'trial' ? t('redirecting') : t('trialBtn')}
            </button>
          )}
          {error && <p className="text-red-300 text-xs mt-2">{error}</p>}
          <p className="text-xs text-indigo-200 mt-3">{t('cancelAnytime')}</p>
        </div>

        {/* Feature comparison */}
        <div className="grid grid-cols-2 gap-3">
          {/* Free */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{t('freeFeatures')}</div>
            <div className="space-y-2">
              {FEATURES_FREE.map(f => (
                <div key={f} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="text-slate-300 flex-shrink-0 mt-0.5">✓</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-3">{t('proFeatures')}</div>
            <div className="space-y-2">
              {FEATURES_PRO.map(f => (
                <div key={f} className="flex items-start gap-2 text-xs text-indigo-700 font-medium">
                  <span className="text-indigo-500 flex-shrink-0 mt-0.5">✓</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm text-amber-800 italic">{t('testimonialText')}</p>
          <p className="text-xs text-amber-600 mt-2 font-semibold">{t('testimonialAuthor')}</p>
        </div>

      </div>
    </div>
  )
}

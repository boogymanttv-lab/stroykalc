import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const FEATURES_FREE = [
  'Неограничени проекти',
  'Калкулатор с 370+ услуги',
  'PDF оферти (с watermark)',
  'Управление на клиенти',
  'Основни плащания',
]

const FEATURES_PRO = [
  'PDF оферти БЕЗ watermark',
  'Договори',
  'Клиентски портал с QR код',
  'Разходи и реална печалба',
  'Снимки по проекти',
  'Отчети + CSV/Excel експорт',
  'Задачи по проект',
  'Офлайн режим',
  'Приоритетна поддръжка',
]

export default function UpgradePage() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(null) // 'now' | 'trial' | null
  const [error,   setError]   = useState('')

  async function handleUpgrade(trial = false) {
    setLoading(trial ? 'trial' : 'now')
    setError('')
    try {
      const res = await fetch('/api/create-checkout-session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id, userEmail: user.email, trial }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Грешка при създаване на сесия')
        setLoading(null)
      }
    } catch (e) {
      setError(e.message)
      setLoading(null)
    }
  }
  const isPro = profile?.plan === 'pro'

  if (isPro) {
    return (
      <div className="flex-1 overflow-y-auto thin-scroll p-4 max-w-xl mx-auto w-full">
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🌟</div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Вие сте PRO!</h2>
          <p className="text-slate-500 text-sm">Имате достъп до всички функции без ограничения.</p>
          <div className="mt-6 inline-block px-6 py-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-700 text-white font-bold text-sm">
            ✅ Активен PRO план
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
          <h1 className="text-2xl font-black text-slate-800 mb-2">Надградете до PRO</h1>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            Премахнете watermark-а и отключете всички професионални функции
          </p>
        </div>

        {/* Pricing card */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white text-center shadow-xl">
          <div className="text-sm font-semibold text-indigo-200 mb-1">Maistorix PRO</div>
          <div className="flex items-end justify-center gap-1 mb-1">
            <span className="text-5xl font-black">€2.99</span>
            <span className="text-indigo-200 mb-2">/месец</span>
          </div>
          <div className="text-indigo-200 text-xs mb-5">или €24.99/година (2 месеца безплатно)</div>
          <button
            onClick={() => handleUpgrade(false)}
            disabled={!!loading}
            className="w-full py-3.5 rounded-xl font-bold text-indigo-700 bg-white
                       hover:bg-indigo-50 active:scale-[.98] transition-all text-sm shadow-lg
                       disabled:opacity-70"
          >
            {loading === 'now' ? '⏳ Пренасочване...' : '⚡ Надградете сега'}
          </button>
          <button
            onClick={() => handleUpgrade(true)}
            disabled={!!loading}
            className="w-full py-3 rounded-xl font-semibold text-white/90 border border-white/40
                       hover:bg-white/10 active:scale-[.98] transition-all text-sm
                       disabled:opacity-70"
          >
            {loading === 'trial' ? '⏳ Пренасочване...' : '🎁 Тествайте 3 дни безплатно'}
          </button>
          {error && <p className="text-red-300 text-xs mt-2">{error}</p>}
          <p className="text-xs text-indigo-200 mt-2">Отказ по всяко време · Без скрити такси · За цената на кафе</p>
        </div>

        {/* Feature comparison */}
        <div className="grid grid-cols-2 gap-3">
          {/* Free */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Безплатно</div>
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
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-3">PRO ⚡</div>
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

        {/* Testimonial / value prop */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm text-amber-800 italic">
            „Изпълнител с 3 проекта по €3,000 прави €9,000 на месец.
            €2.99 за инструмента е буквално по-малко от едно кафе."
          </p>
          <p className="text-xs text-amber-600 mt-2 font-semibold">— Екипът на Maistorix</p>
        </div>

      </div>
    </div>
  )
}

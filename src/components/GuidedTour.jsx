import { useState, useEffect } from 'react'

const GUIDED_KEY = 'maistorix_guided_done'

const STEPS = [
  {
    tab:     'clients',
    target:  null,
    title:   '👥 Стъпка 1 — Добави клиент',
    text:    'Натисни бутона „+ Нов клиент" и попълни името, телефона и адреса. Клиентите се запазват и после ги избираш в калкулатора.',
    tip:     '💡 Натисни „+ Нов клиент" горе вдясно',
    position: 'center',
  },
  {
    tab:     'clients',
    target:  null,
    title:   '✅ Клиентът е запазен!',
    text:    'Сега отиваме в Калкулатора, където ще създадем оферта за него.',
    position: 'center',
  },
  {
    tab:     'calc',
    target:  null,
    title:   '🧮 Стъпка 2 — Калкулатор',
    text:    'Тук създаваш оферти. Първо избери клиента от полето „Клиент" — ще видиш клиента когото добави.',
    tip:     '💡 Избери клиента от падащото меню',
    position: 'center',
  },
  {
    tab:     'calc',
    target:  '[data-tour="add-service-btn"]',
    title:   '➕ Стъпка 3 — Добави услуги',
    text:    'Натисни „+ Добави услуга", избери категория (например Зидария), после избери конкретна услуга, въведи количество и натисни „+ Добави".',
    tip:     '💡 Добави 2-3 услуги за да видиш как изглежда офертата',
    position: 'top',
  },
  {
    tab:     'calc',
    target:  null,
    title:   '💾 Стъпка 4 — Запази проекта',
    text:    'Когато добавиш услугите, въведи заглавие на проекта и натисни „Запази оферта". Проектът се запазва автоматично.',
    tip:     '💡 Натисни „Запази оферта" в долната част',
    position: 'center',
  },
  {
    tab:     'projects',
    target:  null,
    title:   '📁 Стъпка 5 — Проекти',
    text:    'Тук виждаш всички запазени проекти. Натисни върху проекта за да видиш опциите.',
    position: 'center',
  },
  {
    tab:     'projects',
    target:  null,
    title:   '🎛️ Какво можеш да правиш с проект',
    text:    '• 📄 Оферта — генерира PDF за клиента\n• 💰 Плащания — следи кое е платено\n• 📋 Задачи — списък с работи\n• 📸 Снимки — прикачи снимки от обекта\n• 📑 Договор — генерира договор (PRO)\n• 🔗 Сподели — клиентски портал с QR',
    position: 'center',
  },
  {
    tab:     null,
    target:  null,
    title:   '🎉 Готов си!',
    text:    'Вече знаеш как работи Maistorix. Създай реална оферта за твой клиент и я изпрати като PDF!',
    position: 'center',
  },
]

export default function GuidedTour({ setTab, onDone }) {
  const [step,    setStep]    = useState(0)
  const [visible, setVisible] = useState(false)
  const [rect,    setRect]    = useState(null)

  useEffect(() => {
    if (localStorage.getItem(GUIDED_KEY)) { onDone?.(); return }
    setTimeout(() => setVisible(true), 400)
  }, [])

  useEffect(() => {
    if (!visible) return
    const s = STEPS[step]
    // Navigate to tab
    if (s.tab) setTab(s.tab)
    // Find target element
    if (!s.target) { setRect(null); return }
    const timer = setTimeout(() => {
      const el = document.querySelector(s.target)
      if (el) setRect(el.getBoundingClientRect())
    }, 400)
    return () => clearTimeout(timer)
  }, [step, visible])

  function next() {
    if (step < STEPS.length - 1) {
      setRect(null)
      setStep(s => s + 1)
    } else {
      finish()
    }
  }

  function finish() {
    localStorage.setItem(GUIDED_KEY, '1')
    setVisible(false)
    onDone?.()
  }

  if (!visible) return null

  const s = STEPS[step]
  const isLast = step === STEPS.length - 1

  const cardStyle = {
    position: 'fixed',
    zIndex: 10001,
    width: 300,
  }

  if (rect) {
    // Position near target element
    const pad = 12
    const fitsBelow = rect.bottom + pad + 240 < window.innerHeight
    cardStyle.top  = fitsBelow ? rect.bottom + pad : rect.top - 240 - pad
    cardStyle.left = Math.max(12, Math.min(rect.left, window.innerWidth - 312))
  } else {
    // Center
    cardStyle.top       = '50%'
    cardStyle.left      = '50%'
    cardStyle.transform = 'translate(-50%, -50%)'
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 10000, background: 'rgba(0,0,0,0.6)' }}
        onClick={finish}
      />

      {/* Spotlight */}
      {rect && (
        <div style={{
          position: 'fixed',
          top: rect.top - 6, left: rect.left - 6,
          width: rect.width + 12, height: rect.height + 12,
          borderRadius: 10,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
          border: '2px solid rgba(255,255,255,0.4)',
          zIndex: 10000,
          pointerEvents: 'none',
        }} />
      )}

      {/* Card */}
      <div style={cardStyle} className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-700 px-5 py-4">
          {/* Progress bar */}
          <div className="flex gap-1 mb-3">
            {STEPS.map((_, i) => (
              <div key={i} className="h-1 rounded-full flex-1 transition-all"
                style={{ background: i <= step ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)' }} />
            ))}
          </div>
          <h3 className="text-white font-bold text-sm">{s.title}</h3>
          <p className="text-white/60 text-[10px] mt-0.5">Стъпка {step + 1} от {STEPS.length}</p>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-line">{s.text}</p>
          {s.tip && (
            <div className="mt-3 px-3 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
              <p className="text-indigo-600 text-xs font-medium">{s.tip}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 flex items-center justify-between">
          <button onClick={finish} className="text-xs text-slate-400 hover:text-slate-600">
            Пропусни тура
          </button>
          <button
            onClick={next}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
          >
            {isLast ? '🚀 Започни!' : 'Следващо →'}
          </button>
        </div>
      </div>
    </>
  )
}

import { useState, useEffect, useRef } from 'react'

const TOUR_KEY = 'maistorix_tour_done'

const STEPS = [
  {
    target: null,
    title: '👋 Добре дошъл в Maistorix!',
    text:  'Нека ти покажем как работи приложението за 30 секунди.',
    position: 'center',
  },
  {
    target: '[data-tour="calc-tab"]',
    title: '🧮 Калкулатор',
    text:  'Тук създаваш оферти. Добавяш услуги, въвеждаш количества и получаваш готова цена.',
    position: 'right',
  },
  {
    target: '[data-tour="projects-tab"]',
    title: '📁 Проекти',
    text:  'Всички твои проекти на едно място — статус, плащания, задачи, снимки.',
    position: 'right',
  },
  {
    target: '[data-tour="clients-tab"]',
    title: '👥 Клиенти',
    text:  'Добавяй клиенти и ги свързвай с проектите си за бърз достъп.',
    position: 'right',
  },
  {
    target: '[data-tour="pro-tab"]',
    title: '⚡ PRO план',
    text:  'За €2.99/месец отключваш договори, отчети, разходи и премахваш watermark-а от офертите.',
    position: 'right',
  },
  {
    target: '[data-tour="settings-btn"]',
    title: '⚙️ Фирмен профил',
    text:  'Попълни данните на фирмата си — ще се появяват автоматично във всяка оферта.',
    position: 'right',
  },
  {
    target: null,
    title: '🚀 Готов си!',
    text:  'Започни с първата си оферта — натисни Калкулатор и добави услуга.',
    position: 'center',
  },
]

export default function OnboardingTour({ onDone }) {
  const [step,    setStep]    = useState(0)
  const [rect,    setRect]    = useState(null)
  const [visible, setVisible] = useState(false)
  const tooltipRef = useRef(null)

  useEffect(() => {
    if (localStorage.getItem(TOUR_KEY)) { onDone?.(); return }
    setTimeout(() => setVisible(true), 600)
  }, [])

  useEffect(() => {
    if (!visible) return
    const s = STEPS[step]
    if (!s.target) { setRect(null); return }
    const el = document.querySelector(s.target)
    if (!el) { setRect(null); return }
    const r = el.getBoundingClientRect()
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
  }, [step, visible])

  function next() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      finish()
    }
  }

  function finish() {
    localStorage.setItem(TOUR_KEY, '1')
    setVisible(false)
    onDone?.()
  }

  if (!visible) return null

  const s = STEPS[step]
  const isCenter = s.position === 'center' || !rect

  // Tooltip position
  const getTooltipStyle = () => {
    if (isCenter) return {
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 10001,
    }
    const pad = 16
    // Place tooltip to the right of target (desktop sidebar)
    // or below target (mobile bottom nav)
    const isMobile = window.innerWidth < 768
    if (isMobile) {
      return {
        position: 'fixed',
        top: Math.min(rect.top + rect.height + pad, window.innerHeight - 200),
        left: Math.max(pad, Math.min(rect.left, window.innerWidth - 280 - pad)),
        zIndex: 10001,
      }
    }
    return {
      position: 'fixed',
      top: rect.top + rect.height / 2 - 60,
      left: rect.left + rect.width + pad,
      zIndex: 10001,
    }
  }

  // Arrow direction
  const arrowClass = isCenter ? '' :
    window.innerWidth < 768 ? 'arrow-top' : 'arrow-left'

  return (
    <>
      {/* Dark overlay */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 10000, background: 'rgba(0,0,0,0.55)', pointerEvents: 'auto' }}
        onClick={finish}
      />

      {/* Spotlight around target */}
      {rect && (
        <div
          style={{
            position: 'fixed',
            top:    rect.top    - 6,
            left:   rect.left   - 6,
            width:  rect.width  + 12,
            height: rect.height + 12,
            borderRadius: 10,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
            zIndex: 10000,
            pointerEvents: 'none',
            border: '2px solid rgba(255,255,255,0.3)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={{ ...getTooltipStyle(), width: 260 }}
        className="bg-white rounded-2xl shadow-2xl p-5 select-none"
      >
        {/* Arrow left (desktop) */}
        {!isCenter && window.innerWidth >= 768 && rect && (
          <div style={{
            position: 'absolute', left: -8, top: 28,
            width: 0, height: 0,
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderRight: '8px solid white',
          }} />
        )}
        {/* Arrow top (mobile) */}
        {!isCenter && window.innerWidth < 768 && rect && (
          <div style={{
            position: 'absolute', top: -8, left: 24,
            width: 0, height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '8px solid white',
          }} />
        )}

        {/* Progress dots */}
        <div className="flex gap-1 mb-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all"
              style={{
                width: i === step ? 20 : 6,
                background: i === step ? '#4f46e5' : '#e2e8f0',
              }}
            />
          ))}
        </div>

        <h3 className="font-bold text-slate-800 text-sm mb-1">{s.title}</h3>
        <p className="text-slate-500 text-xs leading-relaxed mb-4">{s.text}</p>

        <div className="flex items-center justify-between">
          <button
            onClick={finish}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Пропусни
          </button>
          <button
            onClick={next}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
          >
            {step === STEPS.length - 1 ? '🚀 Да започваме!' : 'Следващо →'}
          </button>
        </div>
      </div>
    </>
  )
}

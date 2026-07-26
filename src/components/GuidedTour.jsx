import { useState, useEffect, useCallback } from 'react'

const GUIDED_KEY = 'maistorix_guided_done'

// waitFor:
//   'manual' — user clicks "Следващо" button
//   'click'  — auto-advance when spotlight element is clicked
const STEPS = [
  {
    id:      'welcome',
    tab:     null,
    target:  null,
    title:   '👋 Здравей! Нека те преведем.',
    text:    'Ще извършиш реални действия в приложението — ние ти показваме какво да направиш на всяка стъпка.',
    waitFor: 'manual',
    btn:     'Да, започваме! →',
  },
  {
    id:      'go-settings',
    tab:     null,
    target:  '[data-tour="settings-btn"]',
    title:   '⚙️ Стъпка 1 — Фирмен профил',
    text:    'Натисни „⚙️ Фирмен профил" за да попълниш данните на фирмата си.',
    waitFor: 'click',
  },
  {
    id:      'fill-settings',
    tab:     'settings',
    target:  null,
    title:   '📝 Попълни данните на фирмата',
    text:    'Въведи името на фирмата, телефон и адрес. Тези данни ще се появяват автоматично в офертите. Натисни „Запази" и след това „Следващо".',
    waitFor: 'manual',
    tip:     '💡 Натисни „Запази" след като попълниш',
  },
  {
    id:      'go-clients',
    tab:     null,
    target:  '[data-tour="clients-tab"]',
    title:   '👥 Стъпка 2 — Клиенти',
    text:    'Натисни „👥 Клиенти" за да добавиш първия си клиент.',
    waitFor: 'click',
  },
  {
    id:      'new-client',
    tab:     'clients',
    target:  '[data-tour="new-client-btn"]',
    title:   '➕ Добави нов клиент',
    text:    'Натисни „+ Нов клиент" за да отвориш формата.',
    waitFor: 'click',
  },
  {
    id:      'fill-client',
    tab:     'clients',
    target:  null,
    title:   '📋 Попълни данните на клиента',
    text:    'Въведи име, телефон и адрес на клиента. Натисни „Запази" след което се върни тук.',
    waitFor: 'manual',
    tip:     '💡 Натисни „Запази" в модалния прозорец',
  },
  {
    id:      'go-calc',
    tab:     null,
    target:  '[data-tour="calc-tab"]',
    title:   '🧮 Стъпка 3 — Калкулатор',
    text:    'Натисни „🧮 Калкулатор" за да създадеш оферта за клиента.',
    waitFor: 'click',
  },
  {
    id:      'select-client',
    tab:     'calc',
    target:  null,
    title:   '👤 Избери клиента',
    text:    'В полето „Клиент" избери клиента когото добави. Така офертата ще е свързана с него.',
    waitFor: 'manual',
    tip:     '💡 Натисни полето „Клиент" и избери от списъка',
  },
  {
    id:      'add-service',
    tab:     'calc',
    target:  '[data-tour="add-service-btn"]',
    title:   '➕ Добави услуга',
    text:    'Натисни „+ Добави услуга" за да отвориш каталога с услуги.',
    waitFor: 'click',
  },
  {
    id:      'pick-service',
    tab:     'calc',
    target:  null,
    title:   '🔧 Избери услуга от каталога',
    text:    'Избери категория (напр. Зидария), натисни услуга, въведи количество и натисни „+ Добави". Добави 2-3 услуги.',
    waitFor: 'manual',
    tip:     '💡 Затвори каталога след като добавиш услугите',
  },
  {
    id:      'save-project',
    tab:     'calc',
    target:  null,
    title:   '💾 Запази проекта',
    text:    'Въведи заглавие на проекта и натисни „Запази оферта". Проектът ще се появи в секция Проекти.',
    waitFor: 'manual',
    tip:     '💡 Натисни „Запази оферта" в долната част на страницата',
  },
  {
    id:      'go-projects',
    tab:     null,
    target:  '[data-tour="projects-tab"]',
    title:   '📁 Стъпка 4 — Проекти',
    text:    'Натисни „📁 Проекти" за да видиш запазения проект.',
    waitFor: 'click',
  },
  {
    id:      'show-project-options',
    tab:     'projects',
    target:  null,
    title:   '🎛️ Опции на проекта',
    text:    'Натисни върху проекта за да видиш:\n\n📄 Оферта — PDF за клиента\n💰 Плащания — следи плащанията\n📋 Задачи — работни задачи\n📸 Снимки — от обекта\n🔗 Сподели — клиентски портал',
    waitFor: 'manual',
  },
  {
    id:      'done',
    tab:     null,
    target:  null,
    title:   '🎉 Готов си!',
    text:    'Вече знаеш как работи Maistorix. Създай реална оферта и я изпрати на клиент като PDF!',
    waitFor: 'manual',
    btn:     '🚀 Да започваме!',
  },
]

export default function GuidedTour({ setTab, onDone }) {
  const [step,    setStep]    = useState(0)
  const [visible, setVisible] = useState(false)
  const [rect,    setRect]    = useState(null)

  useEffect(() => {
    if (localStorage.getItem(GUIDED_KEY)) { onDone?.(); return }
    setTimeout(() => setVisible(true), 500)
  }, [])

  // Update spotlight rect when step changes
  useEffect(() => {
    if (!visible) return
    const s = STEPS[step]
    if (s.tab) setTab(s.tab)

    if (!s.target) { setRect(null); return }

    // Try to find element (retry a few times for tabs that need render)
    let attempts = 0
    const tryFind = () => {
      const el = document.querySelector(s.target)
      if (el) {
        setRect(el.getBoundingClientRect())
      } else if (attempts < 5) {
        attempts++
        setTimeout(tryFind, 200)
      } else {
        setRect(null)
      }
    }
    setTimeout(tryFind, 300)
  }, [step, visible])

  // Auto-advance on click for 'click' steps
  useEffect(() => {
    if (!visible) return
    const s = STEPS[step]
    if (s.waitFor !== 'click' || !s.target) return

    const el = document.querySelector(s.target)
    if (!el) return

    const handler = () => {
      setTimeout(() => advance(), 400) // small delay so navigation happens first
    }
    el.addEventListener('click', handler)
    return () => el.removeEventListener('click', handler)
  }, [step, visible, rect])

  function advance() {
    setRect(null)
    if (step < STEPS.length - 1) {
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

  const s      = STEPS[step]
  const isLast = step === STEPS.length - 1
  const pad    = 8

  // Tooltip position — always outside spotlight, clamped to viewport
  const CARD_W = 280
  const CARD_H = 220

  const getCardStyle = () => {
    if (!rect) return {
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 10002,
      width: CARD_W,
    }
    const spaceRight  = window.innerWidth  - rect.right  - pad
    const spaceBottom = window.innerHeight - rect.bottom - pad
    const spaceLeft   = rect.left - pad
    const spaceTop    = rect.top  - pad

    let top, left

    if (spaceRight >= CARD_W + 10) {
      // Right of spotlight
      left = rect.right + pad
      top  = Math.max(pad, Math.min(rect.top, window.innerHeight - CARD_H - pad))
    } else if (spaceBottom >= CARD_H + 10) {
      // Below spotlight
      top  = rect.bottom + pad
      left = Math.max(pad, Math.min(rect.left, window.innerWidth - CARD_W - pad))
    } else if (spaceTop >= CARD_H + 10) {
      // Above spotlight
      top  = rect.top - CARD_H - pad
      left = Math.max(pad, Math.min(rect.left, window.innerWidth - CARD_W - pad))
    } else {
      // Left of spotlight
      left = rect.left - CARD_W - pad
      top  = Math.max(pad, Math.min(rect.top, window.innerHeight - CARD_H - pad))
    }

    return { position: 'fixed', top, left, zIndex: 10002, width: CARD_W }
  }

  const BG = 'rgba(0,0,0,0.65)'

  return (
    <>
      {/* 4-rectangle overlay — spotlight area stays clickable */}
      {rect ? (
        <>
          <div style={{ position:'fixed', inset:0, top:0, left:0, right:0, height: Math.max(0, rect.top - pad), background: BG, zIndex:10000 }} />
          <div style={{ position:'fixed', top: rect.bottom + pad, left:0, right:0, bottom:0, background: BG, zIndex:10000 }} />
          <div style={{ position:'fixed', top: rect.top - pad, left:0, width: Math.max(0, rect.left - pad), height: rect.height + pad*2, background: BG, zIndex:10000 }} />
          <div style={{ position:'fixed', top: rect.top - pad, left: rect.right + pad, right:0, height: rect.height + pad*2, background: BG, zIndex:10000 }} />
          {/* Spotlight border */}
          <div style={{
            position:'fixed',
            top: rect.top - pad, left: rect.left - pad,
            width: rect.width + pad*2, height: rect.height + pad*2,
            border: '2px solid rgba(255,255,255,0.5)',
            borderRadius: 12,
            zIndex: 10001,
            pointerEvents: 'none',
            boxShadow: '0 0 20px rgba(99,102,241,0.4)',
          }} />
        </>
      ) : (
        <div style={{ position:'fixed', inset:0, background: BG, zIndex:10000 }} />
      )}

      {/* Tour card */}
      <div style={getCardStyle()} className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', padding: '14px 16px' }}>
          {/* Progress bar */}
          <div style={{ display:'flex', gap:3, marginBottom:10 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                height: 3, borderRadius: 9999, flex:1, transition:'all 0.3s',
                background: i <= step ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
              }} />
            ))}
          </div>
          <div style={{ color:'white', fontWeight:700, fontSize:13 }}>{s.title}</div>
          <div style={{ color:'rgba(255,255,255,0.6)', fontSize:10, marginTop:2 }}>
            Стъпка {step + 1} от {STEPS.length}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '12px 16px' }}>
          <p style={{ color:'#475569', fontSize:12, lineHeight:1.6, whiteSpace:'pre-line', margin:0 }}>{s.text}</p>
          {s.tip && (
            <div style={{ marginTop:10, padding:'7px 10px', background:'#eef2ff', borderRadius:8, border:'1px solid #c7d2fe' }}>
              <p style={{ color:'#4f46e5', fontSize:11, fontWeight:500, margin:0 }}>{s.tip}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'10px 16px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <button
            onClick={finish}
            style={{ fontSize:11, color:'#94a3b8', background:'none', border:'none', cursor:'pointer' }}
          >
            Пропусни
          </button>
          {s.waitFor === 'manual' && (
            <button
              onClick={advance}
              style={{
                padding:'8px 16px', borderRadius:10,
                background:'#4f46e5', color:'white',
                fontSize:12, fontWeight:700, border:'none', cursor:'pointer',
              }}
            >
              {s.btn || (isLast ? '🚀 Готово!' : 'Следващо →')}
            </button>
          )}
          {s.waitFor === 'click' && (
            <span style={{ fontSize:11, color:'#4f46e5', fontWeight:500 }}>
              👆 Натисни маркирания елемент
            </span>
          )}
        </div>
      </div>
    </>
  )
}

import { useState, useEffect } from 'react'
import { useLang } from '../contexts/LanguageContext'

const GUIDED_KEY = 'maistorix_guided_done'

// Steps are defined per language
const STEPS_DATA = {
  bg: [
    {
      id: 'welcome', tab: null, target: null, waitFor: 'manual',
      btn: 'Да, започваме! →',
      title: '👋 Здравей! Нека те преведем.',
      text: 'Ще извършиш реални действия в приложението — ние ти показваме какво да направиш на всяка стъпка.',
    },
    {
      id: 'go-settings', tab: null, target: '[data-tour="settings-btn"]', waitFor: 'click',
      title: '⚙️ Стъпка 1 — Фирмен профил',
      text: 'Натисни „⚙️ Фирмен профил" за да попълниш данните на фирмата си.',
    },
    {
      id: 'fill-settings', tab: 'settings', target: null, waitFor: 'manual',
      title: '📝 Попълни данните на фирмата',
      text: 'Въведи името на фирмата, телефон и адрес. Тези данни ще се появяват автоматично в офертите. Натисни „Запази" и след това „Следващо".',
      tip: '💡 Натисни „Запази промените" след като попълниш',
    },
    {
      id: 'go-clients', tab: null, target: '[data-tour="clients-tab"]', waitFor: 'click',
      title: '👥 Стъпка 2 — Клиенти',
      text: 'Натисни „👥 Клиенти" за да добавиш първия си клиент.',
    },
    {
      id: 'new-client', tab: 'clients', target: '[data-tour="new-client-btn"]', waitFor: 'click',
      title: '➕ Добави нов клиент',
      text: 'Натисни „+ Нов клиент" за да отвориш формата.',
    },
    {
      id: 'fill-client', tab: 'clients', target: null, waitFor: 'manual',
      title: '📋 Попълни данните на клиента',
      text: 'Въведи ime, телефон и адрес на клиента. Натисни „Запази" след което се върни тук.',
      tip: '💡 Натисни „Запази" в модалния прозорец',
    },
    {
      id: 'go-calc', tab: null, target: '[data-tour="calc-tab"]', waitFor: 'click',
      title: '🧮 Стъпка 3 — Калкулатор',
      text: 'Натисни „🧮 Калкулатор" за да създадеш оферта за клиента.',
    },
    {
      id: 'select-client', tab: 'calc', target: null, waitFor: 'manual',
      title: '👤 Избери клиента',
      text: 'В полето „Клиент" избери клиента когото добави. Така офертата ще е свързана с него.',
      tip: '💡 Натисни полето „Клиент" и избери от списъка',
    },
    {
      id: 'add-service', tab: 'calc', target: '[data-tour="add-service-btn"]', waitFor: 'click',
      title: '➕ Добави услуга',
      text: 'Натисни „+ Добави услуга" за да отвориш каталога с услуги.',
    },
    {
      id: 'pick-service', tab: 'calc', target: null, waitFor: 'manual',
      title: '🔧 Избери услуга от каталога',
      text: 'Избери категория (напр. Зидария), натисни услуга, въведи количество и натисни „+ Добави". Добави 2-3 услуги.',
      tip: '💡 Затвори каталога след като добавиш услугите',
    },
    {
      id: 'save-project', tab: 'calc', target: null, waitFor: 'manual',
      title: '💾 Запази проекта',
      text: 'Въведи заглавие на проекта и натисни „Запази оферта". Проектът ще се появи в секция Проекти.',
      tip: '💡 Натисни „Запази оферта" в долната част на страницата',
    },
    {
      id: 'go-projects', tab: null, target: '[data-tour="projects-tab"]', waitFor: 'click',
      title: '📁 Стъпка 4 — Проекти',
      text: 'Натисни „📁 Проекти" за да видиш запазения проект.',
    },
    {
      id: 'show-project-options', tab: 'projects', target: null, waitFor: 'manual',
      title: '🎛️ Опции на проекта',
      text: 'Натисни върху проекта за да видиш:\n\n📄 Оферта — PDF за клиента\n💰 Плащания — следи плащанията\n📋 Задачи — работни задачи\n📸 Снимки — от обекта\n🔗 Сподели — клиентски портал',
    },
    {
      id: 'done', tab: null, target: null, waitFor: 'manual',
      btn: '🚀 Да започваме!',
      title: '🎉 Готов си!',
      text: 'Вече знаеш как работи Maistorix. Създай реална оферта и я изпрати на клиент като PDF!',
    },
  ],
  en: [
    {
      id: 'welcome', tab: null, target: null, waitFor: 'manual',
      btn: "Let's go! →",
      title: '👋 Welcome! Let us show you around.',
      text: "You'll perform real actions in the app — we'll guide you step by step.",
    },
    {
      id: 'go-settings', tab: null, target: '[data-tour="settings-btn"]', waitFor: 'click',
      title: '⚙️ Step 1 — Company profile',
      text: 'Click "⚙️ Company profile" to fill in your company details.',
    },
    {
      id: 'fill-settings', tab: 'settings', target: null, waitFor: 'manual',
      title: '📝 Fill in your company details',
      text: 'Enter your company name, phone and address. This info will appear automatically in your offers. Click "Save changes" then click "Next".',
      tip: '💡 Click "Save changes" after filling in',
    },
    {
      id: 'go-clients', tab: null, target: '[data-tour="clients-tab"]', waitFor: 'click',
      title: '👥 Step 2 — Clients',
      text: 'Click "👥 Clients" to add your first client.',
    },
    {
      id: 'new-client', tab: 'clients', target: '[data-tour="new-client-btn"]', waitFor: 'click',
      title: '➕ Add a new client',
      text: 'Click "+ New client" to open the form.',
    },
    {
      id: 'fill-client', tab: 'clients', target: null, waitFor: 'manual',
      title: '📋 Fill in the client details',
      text: 'Enter the client name, phone and address. Click "Save" then come back here.',
      tip: '💡 Click "Save" in the modal',
    },
    {
      id: 'go-calc', tab: null, target: '[data-tour="calc-tab"]', waitFor: 'click',
      title: '🧮 Step 3 — Calculator',
      text: 'Click "🧮 Calculator" to create an offer for your client.',
    },
    {
      id: 'select-client', tab: 'calc', target: null, waitFor: 'manual',
      title: '👤 Select the client',
      text: 'In the "Client" field, select the client you just added. This links the offer to them.',
      tip: '💡 Click the "Client" field and pick from the list',
    },
    {
      id: 'add-service', tab: 'calc', target: '[data-tour="add-service-btn"]', waitFor: 'click',
      title: '➕ Add a service',
      text: 'Click "+ Add service" to open the service catalogue.',
    },
    {
      id: 'pick-service', tab: 'calc', target: null, waitFor: 'manual',
      title: '🔧 Pick a service from the catalogue',
      text: 'Choose a category (e.g. Masonry), click a service, enter a quantity and click "+ Add". Add 2-3 services.',
      tip: '💡 Close the catalogue after adding services',
    },
    {
      id: 'save-project', tab: 'calc', target: null, waitFor: 'manual',
      title: '💾 Save the project',
      text: 'Enter a project title and click "💾 Save". The project will appear in the Projects section.',
      tip: '💡 Click "💾 Save" at the bottom of the page',
    },
    {
      id: 'go-projects', tab: null, target: '[data-tour="projects-tab"]', waitFor: 'click',
      title: '📁 Step 4 — Projects',
      text: 'Click "📁 Projects" to see the saved project.',
    },
    {
      id: 'show-project-options', tab: 'projects', target: null, waitFor: 'manual',
      title: '🎛️ Project options',
      text: 'Click on the project to see:\n\n📄 Offer — PDF for the client\n💰 Payments — track payments\n📋 Tasks — work checklist\n📸 Photos — from the site\n🔗 Share — client portal',
    },
    {
      id: 'done', tab: null, target: null, waitFor: 'manual',
      btn: '🚀 Let\'s go!',
      title: '🎉 You\'re all set!',
      text: 'You now know how Maistorix works. Create a real offer and send it to a client as a PDF!',
    },
  ],
}

export default function GuidedTour({ setTab, onDone }) {
  const { lang, t } = useLang()
  const [step,    setStep]    = useState(0)
  const [visible, setVisible] = useState(false)
  const [rect,    setRect]    = useState(null)

  const STEPS = STEPS_DATA[lang] || STEPS_DATA.bg

  useEffect(() => {
    if (localStorage.getItem(GUIDED_KEY)) { onDone?.(); return }
    setTimeout(() => setVisible(true), 500)
  }, [])

  useEffect(() => {
    if (!visible) return
    const s = STEPS[step]
    if (s.tab) setTab(s.tab)

    if (!s.target) { setRect(null); return }

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
  }, [step, visible, lang])

  useEffect(() => {
    if (!visible) return
    const s = STEPS[step]
    if (s.waitFor !== 'click' || !s.target) return

    const el = document.querySelector(s.target)
    if (!el) return

    const handler = () => { setTimeout(() => advance(), 400) }
    el.addEventListener('click', handler)
    return () => el.removeEventListener('click', handler)
  }, [step, visible, rect, lang])

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

  const CARD_W = 280
  const CARD_H = 300

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
      left = rect.right + pad
      top  = Math.max(pad, Math.min(rect.top, window.innerHeight - CARD_H - pad))
    } else if (spaceBottom >= CARD_H + 10) {
      top  = rect.bottom + pad
      left = Math.max(pad, Math.min(rect.left, window.innerWidth - CARD_W - pad))
    } else if (spaceTop >= CARD_H + 10) {
      top  = rect.top - CARD_H - pad
      left = Math.max(pad, Math.min(rect.left, window.innerWidth - CARD_W - pad))
    } else {
      left = rect.left - CARD_W - pad
      top  = Math.max(pad, Math.min(rect.top, window.innerHeight - CARD_H - pad))
    }

    return { position: 'fixed', top, left, zIndex: 10002, width: CARD_W }
  }

  const BG = 'rgba(0,0,0,0.65)'

  return (
    <>
      {/* 4-rectangle overlay — spotlight stays clickable */}
      {rect ? (
        <>
          <div style={{ position:'fixed', inset:0, top:0, left:0, right:0, height: Math.max(0, rect.top - pad), background: BG, zIndex:10000 }} />
          <div style={{ position:'fixed', top: rect.bottom + pad, left:0, right:0, bottom:0, background: BG, zIndex:10000 }} />
          <div style={{ position:'fixed', top: rect.top - pad, left:0, width: Math.max(0, rect.left - pad), height: rect.height + pad*2, background: BG, zIndex:10000 }} />
          <div style={{ position:'fixed', top: rect.top - pad, left: rect.right + pad, right:0, height: rect.height + pad*2, background: BG, zIndex:10000 }} />
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
      <div style={{ ...getCardStyle(), maxHeight: 'calc(100vh - 32px)' }} className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
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
            {t('tourStep')} {step + 1} {t('tourOf')} {STEPS.length}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1 }}>
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
            {t('tourSkip')}
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
              {s.btn || (isLast ? t('tourDone') : t('tourNext'))}
            </button>
          )}
          {s.waitFor === 'click' && (
            <span style={{ fontSize:11, color:'#4f46e5', fontWeight:500 }}>
              {t('tourClickTarget')}
            </span>
          )}
        </div>
      </div>
    </>
  )
}

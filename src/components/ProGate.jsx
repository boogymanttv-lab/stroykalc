// ProGate — shows upgrade modal when a free user tries a PRO feature

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

// Context-specific info for each PRO feature
const FEATURE_INFO = {
  expenses: {
    icon: '💸',
    title: 'Разходи и реална печалба',
    desc: 'Следете всеки разход по проект и виждайте реалната нетна печалба след материали, транспорт и труд.',
  },
  tasks: {
    icon: '✅',
    title: 'Задачи по проект',
    desc: 'Управлявайте задачите си с чеклист — кое е свършено, кое чака. Никога не пропускайте стъпка.',
  },
  contract: {
    icon: '📄',
    title: 'Договори',
    desc: 'Генерирайте официален договор с условия и подписи директно от проекта — за секунди.',
  },
  documents: {
    icon: '📁',
    title: 'Документи по проект',
    desc: 'Всички издадени оферти и договори са запазени на едно място — достъпни дори без интернет.',
  },
  share: {
    icon: '🔗',
    title: 'Клиентски портал с QR код',
    desc: 'Споделете офертата с линк или QR код — клиентът я вижда директно в браузъра без да влиза.',
  },
  photos: {
    icon: '📷',
    title: 'Снимки по проект',
    desc: 'Документирайте напредъка с снимки преди и след — директно от телефона на обекта.',
  },
  reports: {
    icon: '📊',
    title: 'Отчети и CSV/Excel експорт',
    desc: 'Виждайте приходите, разходите и нетната печалба за всеки период. Експортирайте с един клик.',
  },
}

const DEFAULT_FEATURE = {
  icon: '⚡',
  title: 'PRO функция',
  desc: 'Тази функция е достъпна само за PRO потребители.',
}

export function useProGate(onGoUpgrade) {
  const { profile } = useAuth()
  const isPro = profile?.plan === 'pro'

  function requirePro(fn) {
    return (...args) => {
      if (isPro) return fn(...args)
      onGoUpgrade()
    }
  }

  return { isPro, requirePro }
}

export default function ProGateModal({ onClose, onUpgrade, feature }) {
  const info = (feature && FEATURE_INFO[feature]) || DEFAULT_FEATURE

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">

        {/* Feature icon + badge */}
        <div className="relative inline-block mb-4">
          <div className="text-5xl">{info.icon}</div>
          <span className="absolute -top-1 -right-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">PRO</span>
        </div>

        <h2 className="text-lg font-black text-slate-800 mb-2">{info.title}</h2>
        <p className="text-slate-500 text-sm mb-1 leading-relaxed">{info.desc}</p>
        <p className="text-indigo-600 font-bold text-base mt-3 mb-5">само €2.99/месец</p>

        <div className="space-y-2">
          <button
            onClick={onUpgrade}
            className="w-full py-3 rounded-xl font-bold text-white text-sm
                       bg-gradient-to-r from-indigo-600 to-violet-700
                       hover:opacity-90 active:scale-[.98] transition-all"
          >
            ⚡ Надградете сега
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-semibold text-slate-500 text-sm
                       bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Не сега
          </button>
        </div>
      </div>
    </div>
  )
}

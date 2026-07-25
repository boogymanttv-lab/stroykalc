// ProGate — shows upgrade modal when a free user tries a PRO feature
// Usage: wrap any action with requirePro(fn) from the useProGate hook

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

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

export default function ProGateModal({ onClose, onUpgrade }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
        <div className="text-5xl mb-3">⚡</div>
        <h2 className="text-xl font-black text-slate-800 mb-2">PRO функция</h2>
        <p className="text-slate-500 text-sm mb-1">
          Тази функция е достъпна само за PRO потребители.
        </p>
        <p className="text-indigo-600 font-bold text-lg mb-5">само €2.99/месец</p>

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

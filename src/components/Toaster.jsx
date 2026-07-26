import { useState, useEffect } from 'react'
import { onToast } from '../lib/toast'

const ICONS = {
  success: '✅',
  error:   '❌',
  warning: '⚠️',
  info:    'ℹ️',
}

const COLORS = {
  success: 'bg-emerald-600',
  error:   'bg-red-600',
  warning: 'bg-amber-500',
  info:    'bg-indigo-600',
}

export default function Toaster() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    return onToast(toast => {
      setToasts(prev => [...prev, { ...toast, visible: true }])
      setTimeout(() => {
        setToasts(prev => prev.map(t => t.id === toast.id ? { ...t, visible: false } : t))
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toast.id))
        }, 300)
      }, toast.duration)
    })
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] flex flex-col items-center justify-center gap-3 px-4">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5
                      rounded-2xl shadow-2xl text-white text-sm font-semibold
                      max-w-sm w-full transition-all duration-300
                      ${COLORS[toast.type] || COLORS.info}
                      ${toast.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        >
          <span className="text-base flex-shrink-0">{ICONS[toast.type] || ICONS.info}</span>
          <span className="flex-1 leading-snug">{toast.msg}</span>
          <button
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            className="flex-shrink-0 opacity-70 hover:opacity-100 text-lg leading-none"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

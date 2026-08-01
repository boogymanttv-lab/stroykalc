import { useState, useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export default function PWABanners() {
  // ── Update banner ─────────────────────────────────────────
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  // ── Install banner ────────────────────────────────────────
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstall,   setShowInstall]   = useState(false)
  const [dismissed,     setDismissed]     = useState(
    () => localStorage.getItem('pwa_install_dismissed') === '1'
  )

  useEffect(() => {
    // Check if already captured before React loaded
    if (window.__pwaInstallPrompt && !dismissed) {
      setInstallPrompt(window.__pwaInstallPrompt)
      setShowInstall(true)
    }
    // Also listen for future events
    function onReady() {
      if (window.__pwaInstallPrompt && !dismissed) {
        setInstallPrompt(window.__pwaInstallPrompt)
        setShowInstall(true)
      }
    }
    window.addEventListener('pwaInstallReady', onReady)
    return () => window.removeEventListener('pwaInstallReady', onReady)
  }, [dismissed])

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setShowInstall(false)
      setInstallPrompt(null)
    }
  }

  function dismissInstall() {
    setShowInstall(false)
    setDismissed(true)
    localStorage.setItem('pwa_install_dismissed', '1')
  }

  return (
    <>
      {/* ── Update available banner ── */}
      {needRefresh && (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] p-3 flex justify-center">
          <div className="w-full max-w-sm bg-slate-900 text-white rounded-2xl shadow-2xl
                          px-4 py-3 flex items-center gap-3">
            <span className="text-xl">🔄</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Налична е нова версия</p>
              <p className="text-xs text-slate-400">Обнови за да видиш новостите</p>
            </div>
            <button
              onClick={() => updateServiceWorker(true)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-indigo-500
                         hover:bg-indigo-400 text-white text-xs font-bold transition-colors"
            >
              Обнови
            </button>
          </div>
        </div>
      )}

      {/* ── Install banner ── */}
      {showInstall && !needRefresh && (
        <div className="fixed bottom-0 left-0 right-0 z-[9998] p-3 flex justify-center">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl px-4 py-3">
            <div className="flex items-center gap-3">
              <img src="/pwa-192.png" alt="Maistorix" className="w-10 h-10 rounded-xl shadow-sm flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">Добави Maistorix</p>
                <p className="text-xs text-slate-400">Инсталирай като приложение на устройството си</p>
              </div>
              <button
                onClick={dismissInstall}
                className="text-slate-300 hover:text-slate-500 text-lg leading-none flex-shrink-0 px-1"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={dismissInstall}
                className="flex-1 py-2 rounded-xl text-xs font-semibold border border-slate-200
                           text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Не сега
              </button>
              <button
                onClick={handleInstall}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white
                           bg-gradient-to-r from-indigo-600 to-violet-700
                           hover:opacity-90 transition-all"
              >
                📲 Инсталирай
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

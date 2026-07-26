// ProGate — shows upgrade modal when a free user tries a PRO feature

import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'

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
  const { t } = useLang()

  const FEATURE_INFO = {
    expenses:  { icon: '💸', titleKey: 'featExpenses',  descKey: 'proFeatureExpenses' },
    tasks:     { icon: '✅', titleKey: 'featTasks',     descKey: 'proFeatureTasks' },
    contract:  { icon: '📄', titleKey: 'featContracts', descKey: 'proFeatureContract' },
    documents: { icon: '📁', titleKey: 'featDocuments', descKey: 'proFeatureDocuments' },
    share:     { icon: '🔗', titleKey: 'featQR',        descKey: 'proFeatureShare' },
    photos:    { icon: '📷', titleKey: 'featPhotos',    descKey: 'proFeaturePhotos' },
    reports:   { icon: '📊', titleKey: 'featReports',   descKey: 'proFeatureReports' },
  }

  const info = (feature && FEATURE_INFO[feature]) || { icon: '⚡', titleKey: null, descKey: 'proFeatureDefault' }
  const title = info.titleKey ? t(info.titleKey) : 'PRO'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">

        {/* Feature icon + badge */}
        <div className="relative inline-block mb-4">
          <div className="text-5xl">{info.icon}</div>
          <span className="absolute -top-1 -right-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">PRO</span>
        </div>

        <h2 className="text-lg font-black text-slate-800 mb-2">{title}</h2>
        <p className="text-slate-500 text-sm mb-1 leading-relaxed">{t(info.descKey)}</p>
        <p className="text-indigo-600 font-bold text-base mt-3 mb-5">{t('proGatePrice')}</p>

        <div className="space-y-2">
          <button
            onClick={onUpgrade}
            className="w-full py-3 rounded-xl font-bold text-white text-sm
                       bg-gradient-to-r from-indigo-600 to-violet-700
                       hover:opacity-90 active:scale-[.98] transition-all"
          >
            {t('upgradeNow')}
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-semibold text-slate-500 text-sm
                       bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            {t('notNow')}
          </button>
        </div>
      </div>
    </div>
  )
}

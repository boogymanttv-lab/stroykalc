// PDFLangPicker — ask the user which language the PDF should be in.
// Usage:
//   const [pdfLangCtx, setPdfLangCtx] = useState(null) // { type: 'offer'|'contract', onGenerate }
//   <PDFLangPicker ctx={pdfLangCtx} onClose={() => setPdfLangCtx(null)} />

import { useLang } from '../contexts/LanguageContext'

export default function PDFLangPicker({ ctx, onClose }) {
  const { t } = useLang()
  if (!ctx) return null

  function pick(pdfLang) {
    onClose()
    ctx.onGenerate(pdfLang)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
        <div className="text-4xl mb-3">
          {ctx.type === 'offer' ? '🖨️' : '📄'}
        </div>
        <h2 className="text-lg font-black text-slate-800 mb-1">{t('pdfLangTitle')}</h2>
        <p className="text-slate-500 text-sm mb-5">{t('pdfLangDesc')}</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => pick('bg')}
            className="py-4 rounded-xl border-2 border-slate-200 hover:border-indigo-400
                       hover:bg-indigo-50 transition-all font-bold text-slate-700"
          >
            <div className="text-3xl mb-1">🇧🇬</div>
            <div className="text-sm">Български</div>
          </button>
          <button
            onClick={() => pick('en')}
            className="py-4 rounded-xl border-2 border-slate-200 hover:border-indigo-400
                       hover:bg-indigo-50 transition-all font-bold text-slate-700"
          >
            <div className="text-3xl mb-1">🇬🇧</div>
            <div className="text-sm">English</div>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl font-semibold text-slate-500 text-sm
                     bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}

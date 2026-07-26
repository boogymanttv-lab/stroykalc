import { useState, useEffect, useRef } from 'react'
import { onPDFViewer } from '../lib/pdfViewer'
import { useLang } from '../contexts/LanguageContext'

export default function PDFViewer() {
  const { lang } = useLang()
  const [html, setHtml] = useState(null)
  const iframeRef = useRef(null)

  useEffect(() => {
    return onPDFViewer(htmlContent => setHtml(htmlContent))
  }, [])

  useEffect(() => {
    if (html && iframeRef.current) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document
      doc.open()
      doc.write(html)
      doc.close()
    }
  }, [html])

  if (!html) return null

  function handlePrint() {
    iframeRef.current?.contentWindow?.print()
  }

  return (
    <div className="fixed inset-0 z-[9998] flex flex-col bg-slate-100">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0 shadow-sm">
        <button
          onClick={() => setHtml(null)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100
                     hover:bg-slate-200 text-slate-700 text-sm font-semibold
                     active:scale-[.97] transition-all"
        >
          ← {lang === 'en' ? 'Back' : 'Назад'}
        </button>

        <span className="text-sm font-semibold text-slate-600">
          {lang === 'en' ? 'Preview' : 'Преглед'}
        </span>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-3 py-2 rounded-xl
                     bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold
                     active:scale-[.97] transition-all"
        >
          🖨️ {lang === 'en' ? 'Print / Save PDF' : 'Принтирай / PDF'}
        </button>
      </div>

      {/* PDF iframe */}
      <iframe
        ref={iframeRef}
        className="flex-1 w-full border-0"
        title="PDF preview"
      />
    </div>
  )
}

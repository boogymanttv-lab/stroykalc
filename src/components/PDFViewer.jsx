import { useState, useEffect, useRef } from 'react'
import { onPDFViewer } from '../lib/pdfViewer'
import { useLang } from '../contexts/LanguageContext'
import { showToast } from '../lib/toast'

export default function PDFViewer() {
  const { lang } = useLang()
  const [html, setHtml]   = useState(null)
  const [meta, setMeta]   = useState({})
  const iframeRef = useRef(null)

  useEffect(() => {
    return onPDFViewer(({ html: h, meta: m }) => {
      setHtml(h)
      setMeta(m || {})
    })
  }, [])

  useEffect(() => {
    if (html && iframeRef.current) {
      // Strip auto-print script — we have explicit buttons
      const cleanHtml = html.replace(/<script>window\.onload[^<]*<\/script>/g, '')
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document
      doc.open()
      doc.write(cleanHtml)
      doc.close()
    }
  }, [html])

  if (!html) return null

  // ── Actions ──────────────────────────────────────────────────

  function handlePrint() {
    iframeRef.current?.contentWindow?.print()
  }

  function handleSavePDF() {
    // Trigger print dialog — user picks "Save as PDF" destination
    // On iOS/Android this opens "Save to Files / Downloads"
    iframeRef.current?.contentWindow?.print()
  }

  async function handleShare() {
    const url = meta.shareUrl
    if (!url) {
      showToast(
        lang === 'en'
          ? 'Save the project first to get a shareable link'
          : 'Запазете проекта първо, за да получите линк',
        'warning'
      )
      return
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: meta.name || 'Оферта',
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        showToast(
          lang === 'en' ? 'Link copied!' : 'Линкът е копиран!',
          'success'
        )
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        // Fallback: copy to clipboard
        try {
          await navigator.clipboard.writeText(url)
          showToast(lang === 'en' ? 'Link copied!' : 'Линкът е копиран!', 'success')
        } catch {
          showToast(lang === 'en' ? 'Share failed' : 'Грешка при споделяне', 'error')
        }
      }
    }
  }

  const hasShareUrl = !!meta.shareUrl

  return (
    <div className="fixed inset-0 z-[9998] flex flex-col bg-slate-100">

      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-white border-b border-slate-200 flex-shrink-0 shadow-sm">

        {/* Back */}
        <button
          onClick={() => setHtml(null)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100
                     hover:bg-slate-200 text-slate-700 text-sm font-semibold
                     active:scale-[.97] transition-all flex-shrink-0"
        >
          ← {lang === 'en' ? 'Back' : 'Назад'}
        </button>

        {/* Document name */}
        <span className="flex-1 text-center text-sm font-semibold text-slate-600 truncate px-1">
          {meta.name || (lang === 'en' ? 'Document' : 'Документ')}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">

          {/* Share — direct link to client portal */}
          <button
            onClick={handleShare}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold
                        active:scale-[.97] transition-all
                        ${hasShareUrl
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-400'}`}
            title={hasShareUrl
              ? (lang === 'en' ? 'Share link' : 'Сподели линк')
              : (lang === 'en' ? 'Save project first' : 'Запазете проекта първо')}
          >
            🔗 <span className="hidden sm:inline">{lang === 'en' ? 'Share' : 'Сподели'}</span>
          </button>

          {/* Save as PDF */}
          <button
            onClick={handleSavePDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl
                       bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold
                       border border-slate-200 active:scale-[.97] transition-all"
            title={lang === 'en' ? 'Save as PDF' : 'Запази като PDF'}
          >
            💾 <span className="hidden sm:inline">{lang === 'en' ? 'Save PDF' : 'Запази PDF'}</span>
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl
                       bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold
                       active:scale-[.97] transition-all"
            title={lang === 'en' ? 'Print' : 'Принтирай'}
          >
            🖨️ <span className="hidden sm:inline">{lang === 'en' ? 'Print' : 'Принтирай'}</span>
          </button>
        </div>
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

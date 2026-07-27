import { useState, useEffect, useRef } from 'react'
import { onPDFViewer } from '../lib/pdfViewer'
import { useLang } from '../contexts/LanguageContext'
import { showToast } from '../lib/toast'

export default function PDFViewer() {
  const { lang } = useLang()
  const [html, setHtml] = useState(null)
  const [meta, setMeta] = useState({})
  const iframeRef = useRef(null)

  useEffect(() => {
    return onPDFViewer(({ html: h, meta: m }) => {
      setHtml(h)
      setMeta(m || {})
    })
  }, [])

  useEffect(() => {
    if (html && iframeRef.current) {
      // Strip auto-print script — we have an explicit Print button
      const cleanHtml = html.replace(/<script>window\.onload[^<]*<\/script>/g, '')
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document
      doc.open()
      doc.write(cleanHtml)
      doc.close()
    }
  }, [html])

  if (!html) return null

  const filename = (meta.name || 'document').replace(/[/\\?%*:|"<>]/g, '-')

  function handlePrint() {
    iframeRef.current?.contentWindow?.print()
  }

  function handleDownload() {
    // Trigger print dialog → user selects "Save as PDF" for a proper PDF file
    iframeRef.current?.contentWindow?.print()
  }

  async function handleShare() {
    try {
      // Best case: share the live client portal URL (looks great, no code visible)
      if (meta.shareUrl) {
        if (navigator.share) {
          await navigator.share({ url: meta.shareUrl, title: filename })
        } else {
          // Desktop fallback: copy to clipboard
          await navigator.clipboard.writeText(meta.shareUrl)
          showToast(
            lang === 'en' ? 'Link copied to clipboard' : 'Линкът е копиран',
            'success'
          )
        }
        return
      }

      // Fallback for contracts / documents without a share URL: download the file
      handleDownload()
      showToast(
        lang === 'en' ? 'File downloaded' : 'Файлът е изтеглен',
        'info'
      )
    } catch (e) {
      if (e.name !== 'AbortError') {
        showToast(lang === 'en' ? 'Share failed' : 'Грешка при споделяне', 'error')
      }
    }
  }

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
          {meta.name || (lang === 'en' ? 'Preview' : 'Преглед')}
        </span>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl
                       bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold
                       active:scale-[.97] transition-all"
            title={lang === 'en' ? 'Share' : 'Сподели'}
          >
            📤 <span className="hidden sm:inline">{lang === 'en' ? 'Share' : 'Сподели'}</span>
          </button>

          {/* Save as PDF / Print */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl
                       bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold
                       active:scale-[.97] transition-all"
            title={lang === 'en' ? 'Save as PDF / Print' : 'Запази PDF / Принтирай'}
          >
            🖨️ <span className="hidden sm:inline">{lang === 'en' ? 'Save PDF' : 'Запази PDF'}</span>
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

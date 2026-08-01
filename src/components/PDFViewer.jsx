import { useState, useEffect, useRef } from 'react'
import { onPDFViewer } from '../lib/pdfViewer'
import { useLang } from '../contexts/LanguageContext'
import { showToast } from '../lib/toast'
import { useAuth } from '../contexts/AuthContext'

export default function PDFViewer() {
  const { lang } = useLang()
  const { profile } = useAuth()
  const [html, setHtml]         = useState(null)
  const [meta, setMeta]         = useState({})
  const [showEmail, setShowEmail] = useState(false)
  const [emailTo, setEmailTo]   = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  const [sending, setSending]   = useState(false)
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

  function handleEmailOpen() {
    setEmailTo(meta.clientEmail || '')
    setEmailMsg('')
    setShowEmail(true)
  }

  async function handleSendEmail(e) {
    e.preventDefault()
    if (!emailTo) return
    setSending(true)
    try {
      const senderName = profile?.company_name || profile?.full_name || ''
      // Get clean offer HTML from iframe
      const iframeDoc = iframeRef.current?.contentDocument
      const offerHtml = iframeDoc ? iframeDoc.body?.innerHTML || '' : ''

      const res = await fetch('/api/send-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to:         emailTo,
          senderName,
          offerName:  meta.name || 'Оферта',
          shareUrl:   meta.shareUrl || null,
          message:    emailMsg,
          offerHtml,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        showToast(lang === 'en' ? 'Email sent!' : 'Имейлът е изпратен!', 'success')
        setShowEmail(false)
      } else {
        showToast(data.error || 'Грешка', 'error')
      }
    } catch (err) {
      showToast(err.message, 'error')
    }
    setSending(false)
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
          {meta.name || (lang === 'en' ? 'Document' : 'Документ')}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">

          {/* Email to client */}
          <button
            onClick={handleEmailOpen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold
                       bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200
                       active:scale-[.97] transition-all"
            title={lang === 'en' ? 'Send by email' : 'Изпрати по имейл'}
          >
            📧 <span className="hidden sm:inline">{lang === 'en' ? 'Email' : 'Имейл'}</span>
          </button>

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

      {/* Email modal */}
      {showEmail && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              📧 {lang === 'en' ? 'Send offer by email' : 'Изпрати оферта по имейл'}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              {lang === 'en' ? 'The offer will be sent directly to the client.' : 'Офертата ще бъде изпратена директно на клиента.'}
            </p>
            <form onSubmit={handleSendEmail} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  {lang === 'en' ? 'Client email' : 'Имейл на клиента'} *
                </label>
                <input
                  type="email" required
                  value={emailTo}
                  onChange={e => setEmailTo(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  {lang === 'en' ? 'Message (optional)' : 'Съобщение (незадължително)'}
                </label>
                <textarea
                  value={emailMsg}
                  onChange={e => setEmailMsg(e.target.value)}
                  rows={3}
                  placeholder={lang === 'en' ? 'Add a personal message...' : 'Добавете лично съобщение...'}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEmail(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
                >
                  {lang === 'en' ? 'Cancel' : 'Отказ'}
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700
                             text-white text-sm font-bold disabled:opacity-60"
                >
                  {sending ? '⏳...' : (lang === 'en' ? 'Send' : 'Изпрати')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

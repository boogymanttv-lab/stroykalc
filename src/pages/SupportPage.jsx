import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'

const SUBJECTS = {
  bg: ['Технически проблем', 'Въпрос за функция', 'Плащане / абонамент', 'Друго'],
  en: ['Technical issue', 'Feature question', 'Billing / subscription', 'Other'],
}

const STATUS_LABEL = {
  bg: { new: 'Ново', pending: 'В изчакване', resolved: 'Решено' },
  en: { new: 'New', pending: 'Pending', resolved: 'Resolved' },
}
const STATUS_COLOR = {
  new:      'bg-blue-50 text-blue-700',
  pending:  'bg-amber-50 text-amber-700',
  resolved: 'bg-emerald-50 text-emerald-700',
}

export default function SupportPage() {
  const { user, profile } = useAuth()
  const { lang } = useLang()

  const [subject,  setSubject]  = useState('')
  const [message,  setMessage]  = useState('')
  const [sending,  setSending]  = useState(false)
  const [sent,     setSent]     = useState(false)
  const [error,    setError]    = useState('')
  const [tickets,  setTickets]  = useState([])
  const [loading,  setLoading]  = useState(true)

  const name  = profile?.full_name || profile?.company_name || ''
  const email = user?.email || ''

  useEffect(() => { fetchTickets() }, [])

  async function fetchTickets() {
    setLoading(true)
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
    setTickets(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!subject) { setError(lang === 'en' ? 'Please select a subject.' : 'Моля избери тема.'); return }
    if (!message.trim()) { setError(lang === 'en' ? 'Please enter a message.' : 'Моля напиши съобщение.'); return }
    setError('')
    setSending(true)
    const { error: err } = await supabase.from('support_tickets').insert({
      user_id: user.id,
      name,
      email,
      subject,
      message: message.trim(),
    })
    setSending(false)
    if (err) { setError(err.message); return }
    setSubject('')
    setMessage('')
    setSent(true)
    fetchTickets()
    setTimeout(() => setSent(false), 4000)
  }

  const subjects = SUBJECTS[lang] || SUBJECTS.bg
  const statusLabel = STATUS_LABEL[lang] || STATUS_LABEL.bg

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-2xl mx-auto w-full">

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          🎧 {lang === 'en' ? 'Support' : 'Съпорт'}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {lang === 'en'
            ? 'Have a question or issue? Write to us and we\'ll get back to you.'
            : 'Имаш въпрос или проблем? Напиши ни и ще се свържем с теб.'}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-5 mb-6 space-y-4">

        {/* Auto-filled fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">
              {lang === 'en' ? 'Name' : 'Име'}
            </label>
            <input
              type="text"
              value={name}
              readOnly
              className="w-full px-3 py-2 rounded-xl border border-slate-100 bg-slate-50
                         text-sm text-slate-500 cursor-not-allowed"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              {lang === 'en' ? 'from company profile' : 'от фирмения профил'}
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">
              {lang === 'en' ? 'Reply email' : 'Имейл за отговор'}
            </label>
            <input
              type="text"
              value={email}
              readOnly
              className="w-full px-3 py-2 rounded-xl border border-slate-100 bg-slate-50
                         text-sm text-slate-500 cursor-not-allowed"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              {lang === 'en' ? 'from your account' : 'от акаунта'}
            </p>
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">
            {lang === 'en' ? 'Subject' : 'Тема'}
          </label>
          <select
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white
                       text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">{lang === 'en' ? 'Select a subject...' : 'Избери тема...'}</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Message */}
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">
            {lang === 'en' ? 'Message' : 'Съобщение'}
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={5}
            placeholder={lang === 'en' ? 'Describe your issue or question...' : 'Опиши проблема или въпроса си...'}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white
                       text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {sent && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium bg-emerald-50 rounded-xl px-3 py-2">
            ✅ {lang === 'en' ? 'Message sent! We\'ll get back to you soon.' : 'Съобщението е изпратено! Ще се свържем скоро.'}
          </div>
        )}

        <button
          type="submit"
          disabled={sending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white
                     text-sm font-semibold hover:bg-indigo-700 active:scale-[.98] transition-all
                     disabled:opacity-60"
        >
          📤 {sending
            ? (lang === 'en' ? 'Sending...' : 'Изпращане...')
            : (lang === 'en' ? 'Send message' : 'Изпрати съобщение')}
        </button>
      </form>

      {/* Ticket history */}
      <div>
        <h3 className="text-sm font-semibold text-slate-600 mb-3">
          {lang === 'en' ? 'Previous requests' : 'Предишни запитвания'}
        </h3>

        {loading ? (
          <p className="text-sm text-slate-400">{lang === 'en' ? 'Loading...' : 'Зареждане...'}</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-slate-400">
            {lang === 'en' ? 'No previous requests.' : 'Нямаш предишни запитвания.'}
          </p>
        ) : (
          <div className="space-y-2">
            {tickets.map(t => (
              <div key={t.id}
                   className="bg-white border border-slate-100 rounded-xl px-4 py-3
                              flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{t.subject}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(t.created_at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'bg-BG')}
                  </p>
                  {t.admin_note && (
                    <p className="text-xs text-indigo-600 mt-1 italic">💬 {t.admin_note}</p>
                  )}
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_COLOR[t.status]}`}>
                  {statusLabel[t.status] || t.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const { t } = useLang()
  const [form, setForm] = useState({
    full_name: '', phone: '', company_name: '', company_type: 'individual',
    eik: '', vat_number: '', address: '', city: '',
    offer_footer: '',
    default_vat: false,
    reminder_days: 7,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)

  useEffect(() => {
    if (profile) {
      setForm({
        full_name:     profile.full_name     || '',
        phone:         profile.phone         || '',
        company_name:  profile.company_name  || '',
        company_type:  profile.company_type  || 'individual',
        eik:           profile.eik           || '',
        vat_number:    profile.vat_number    || '',
        address:       profile.address       || '',
        city:          profile.city          || '',
        offer_footer:  profile.offer_footer  || t('offerFooterDefault'),
        default_vat:   profile.default_vat   || false,
        reminder_days: profile.reminder_days ?? 7,
      })
      if (profile.logo_url) setLogoPreview(profile.logo_url)
    }
  }, [profile])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    setSaving(true)
    let logo_url = profile?.logo_url || null

    if (logoFile) {
      const ext = logoFile.name.split('.').pop()
      const path = `${user.id}/logo.${ext}`
      const { error: upErr } = await supabase.storage
        .from('project-photos')
        .upload(path, logoFile, { upsert: true })
      if (!upErr) {
        const { data } = supabase.storage.from('project-photos').getPublicUrl(path)
        logo_url = data.publicUrl
      }
    }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      ...form,
      logo_url,
      updated_at: new Date().toISOString(),
    })

    if (!error) {
      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  function handleLogoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  return (
    <div className="flex-1 overflow-y-auto thin-scroll p-4 max-w-2xl mx-auto w-full">
      <div className="space-y-5 pb-10">

        {/* Logo */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-700 mb-4">{t('logoSectionTitle')}</h2>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
              {logoPreview
                ? <img src={logoPreview} alt="logo" className="w-full h-full object-contain" />
                : <img src="/pwa-192.png" alt="Maistorix" className="w-12 h-12 rounded-xl opacity-40" />
              }
            </div>
            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-semibold text-sm hover:bg-indigo-100 transition-colors">
                {t('logoChooseFile')}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
              <p className="text-xs text-slate-400 mt-1.5">{t('logoHint')}</p>
            </div>
          </div>
        </section>

        {/* Personal */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-700 mb-4">{t('personalInfo')}</h2>
          <div className="space-y-3">
            <Field label={t('fullNameLabel')} value={form.full_name} onChange={v => set('full_name', v)} placeholder="Иван Петров" />
            <Field label={t('phone')} value={form.phone} onChange={v => set('phone', v)} placeholder="+359 888 123 456" type="tel" />
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t('emailReadOnly')}</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
                value={user?.email || ''} readOnly
              />
            </div>
          </div>
        </section>

        {/* Company */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-700 mb-4">{t('companyData')}</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t('companyType')}</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                value={form.company_type}
                onChange={e => set('company_type', e.target.value)}
              >
                <option value="individual">{t('entityIndividual')}</option>
                <option value="company">{t('entityCompany')}</option>
              </select>
            </div>
            <Field label={t('companyName')} value={form.company_name} onChange={v => set('company_name', v)} placeholder="Строй ЕООД" />
            <Field label={t('eik')} value={form.eik} onChange={v => set('eik', v)} placeholder="123456789" />
            <Field label={t('vatNumber')} value={form.vat_number} onChange={v => set('vat_number', v)} placeholder="BG123456789" />
            <Field label={t('address')} value={form.address} onChange={v => set('address', v)} placeholder="ул. Строителна 1" />
            <Field label={t('city')} value={form.city} onChange={v => set('city', v)} placeholder="София" />
          </div>
        </section>

        {/* Offer defaults */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-700 mb-4">{t('offerSettingsTitle')}</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                {t('offerFooterNote')}
              </label>
              <textarea
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 resize-none"
                rows={3}
                value={form.offer_footer}
                onChange={e => set('offer_footer', e.target.value)}
                placeholder={t('offerFooterDefault')}
              />
            </div>
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl">
              <div>
                <div className="font-semibold text-sm text-slate-700">{t('defaultVat')}</div>
                <div className="text-xs text-slate-400">{t('defaultVatDesc')}</div>
              </div>
              <button
                onClick={() => set('default_vat', !form.default_vat)}
                className="relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
                style={{ background: form.default_vat ? '#4f46e5' : '#e2e8f0' }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                  style={{ transform: form.default_vat ? 'translateX(21px)' : 'translateX(2px)' }}
                />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                {t('reminderDaysLabel')}
              </label>
              <input
                type="number"
                min={1}
                max={365}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors"
                value={form.reminder_days}
                onChange={e => set('reminder_days', Number(e.target.value))}
              />
              <p className="text-xs text-slate-400 mt-1">{t('reminderDaysDesc')}</p>
            </div>
          </div>
        </section>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-700
                     hover:opacity-90 active:scale-[.98] transition-all disabled:opacity-60 text-sm"
        >
          {saving ? t('savingChangesBtn') : saved ? t('savedChangesBtn') : t('saveChangesBtn')}
        </button>

        {/* Install app */}
        <InstallApp />

        {/* Push notifications */}
        <PushNotifications user={user} />

        {/* Change password */}
        <ChangePassword user={user} />

        {/* Account management */}
        <AccountManagement user={user} />

        {/* Legal links */}
        <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
          <p className="text-xs text-slate-400 text-center mb-1">Maistorix © {new Date().getFullYear()}</p>
          <div className="flex justify-center gap-4">
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer"
               className="text-xs text-indigo-500 hover:underline">
              {t('legalPrivacy')}
            </a>
            <a href="/terms.html" target="_blank" rel="noopener noreferrer"
               className="text-xs text-indigo-500 hover:underline">
              {t('legalTerms')}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function AccountManagement({ user }) {
  const { t } = useLang()
  const [mode, setMode]         = useState(null)
  const [days, setDays]         = useState(7)
  const [password, setPassword] = useState('')
  const [reason, setReason]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState('')

  async function handleSuspend() {
    if (!password) { setMsg(t('enterPasswordErr')); return }
    if (!reason)   { setMsg(t('enterReasonErr'));   return }
    setLoading(true)
    const res  = await fetch('/api/account-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'suspend', userId: user.id, password, reason, days }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.ok) {
      setMsg(`${t('accountMgmtTitle')} — ${t('adminSuspendedUntil')} ${new Date(data.suspended_until).toLocaleDateString('bg-BG')}`)
      setTimeout(() => window.location.reload(), 2500)
    } else {
      setMsg(data.error || t('error'))
    }
  }

  async function handleDeleteRequest() {
    if (!password) { setMsg(t('enterPasswordErr')); return }
    if (!reason)   { setMsg(t('enterReasonErr'));   return }
    setLoading(true)
    const res  = await fetch('/api/account-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request_delete', userId: user.id, password, reason }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.ok) {
      setMsg(t('requestSent'))
      setMode(null)
    } else {
      setMsg(data.error || t('error'))
    }
  }

  return (
    <div className="pt-4 border-t border-slate-100">
      <h3 className="font-bold text-slate-700 text-sm mb-3">{t('accountMgmtTitle')}</h3>

      {!mode && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => { setMode('suspend'); setMsg('') }}
            className="w-full py-2.5 rounded-xl text-sm font-semibold border border-amber-200
                       text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
          >
            {t('suspendAccountBtn')}
          </button>
          <button
            onClick={() => { setMode('delete'); setMsg('') }}
            className="w-full py-2.5 rounded-xl text-sm font-semibold border border-red-200
                       text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
          >
            {t('deleteAccountBtn')}
          </button>
        </div>
      )}

      {mode === 'suspend' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <p className="text-xs text-amber-800 font-semibold">{t('suspendChoosePeriod')}</p>
          <div className="flex gap-2">
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors
                  ${days === d ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-700 border-amber-300'}`}>
                {d} {t('days')}
              </button>
            ))}
          </div>
          <input type="password" placeholder={t('yourPassword')} value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400" />
          <textarea placeholder={t('suspendReasonPlaceholder')} value={reason}
            onChange={e => setReason(e.target.value)} rows={2}
            className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400 resize-none" />
          {msg && <p className="text-xs text-amber-700">{msg}</p>}
          <div className="flex gap-2">
            <button onClick={() => setMode(null)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600">
              {t('cancel')}
            </button>
            <button onClick={handleSuspend} disabled={loading}
              className="flex-1 py-2 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60">
              {loading ? '⏳...' : t('confirm')}
            </button>
          </div>
        </div>
      )}

      {mode === 'delete' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <p className="text-xs text-red-700 font-semibold">{t('deleteAccountInfo')}</p>
          <input type="password" placeholder={t('yourPassword')} value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400" />
          <textarea placeholder={t('deleteReasonPlaceholder')} value={reason}
            onChange={e => setReason(e.target.value)} rows={3}
            className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400 resize-none" />
          {msg && <p className="text-xs text-red-600">{msg}</p>}
          <div className="flex gap-2">
            <button onClick={() => setMode(null)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600">
              {t('cancel')}
            </button>
            <button onClick={handleDeleteRequest} disabled={loading}
              className="flex-1 py-2 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-60">
              {loading ? '⏳...' : t('sendRequest')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ChangePassword({ user }) {
  const [open,        setOpen]        = useState(false)
  const [current,     setCurrent]     = useState('')
  const [newPass,     setNewPass]     = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [showConf,    setShowConf]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [msg,         setMsg]         = useState('')
  const [success,     setSuccess]     = useState(false)

  async function handleChange() {
    setMsg('')
    if (!current)           { setMsg('Въведете текущата парола.'); return }
    if (newPass.length < 6) { setMsg('Новата парола трябва да е поне 6 символа.'); return }
    if (newPass !== confirm) { setMsg('Новите пароли не съвпадат.'); return }

    setLoading(true)
    // Verify current password
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email, password: current,
    })
    if (signInErr) { setMsg('Текущата парола е грешна.'); setLoading(false); return }

    // Update to new password
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPass })
    setLoading(false)
    if (updateErr) { setMsg(updateErr.message); return }

    setSuccess(true)
    setCurrent(''); setNewPass(''); setConfirm('')
    setTimeout(() => { setSuccess(false); setOpen(false) }, 2500)
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-700">🔑 Смяна на парола</h2>
        {!open && (
          <button
            onClick={() => { setOpen(true); setMsg(''); setSuccess(false) }}
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 font-semibold hover:bg-indigo-100 transition-colors"
          >
            Смени
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          {/* Current password */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Текуща парола</label>
            <div className="relative">
              <input type={showCurrent ? 'text' : 'password'} value={current}
                onChange={e => setCurrent(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-sm outline-none focus:border-indigo-400"
                placeholder="Текуща парола" />
              <button type="button" onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" tabIndex={-1}>
                {showCurrent ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Нова парола</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={newPass}
                onChange={e => setNewPass(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-sm outline-none focus:border-indigo-400"
                placeholder="Минимум 6 символа" />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" tabIndex={-1}>
                {showNew ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Confirm new */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Повтори новата парола</label>
            <div className="relative">
              <input type={showConf ? 'text' : 'password'} value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-sm outline-none focus:border-indigo-400"
                placeholder="Повтори новата парола" />
              <button type="button" onClick={() => setShowConf(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" tabIndex={-1}>
                {showConf ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {msg     && <p className="text-xs text-red-600">⚠️ {msg}</p>}
          {success && <p className="text-xs text-emerald-600">✅ Паролата е сменена успешно!</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={() => { setOpen(false); setMsg('') }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">
              Откажи
            </button>
            <button onClick={handleChange} disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {loading ? '⏳...' : 'Запази'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function InstallApp() {
  const [prompt,    setPrompt]    = useState(null)
  const [installed, setInstalled] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    // Already installed?
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true); return
    }
    // Captured early in index.html?
    if (window.__pwaInstallPrompt) {
      setPrompt(window.__pwaInstallPrompt)
    }
    function onReady() {
      if (window.__pwaInstallPrompt) setPrompt(window.__pwaInstallPrompt)
    }
    window.addEventListener('pwaInstallReady', onReady)
    return () => window.removeEventListener('pwaInstallReady', onReady)
  }, [])

  async function handleInstall() {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      setInstalled(true)
      window.__pwaInstallPrompt = null
    }
  }

  if (installed) return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-3">
        <img src="/pwa-192.png" alt="Maistorix" className="w-10 h-10 rounded-xl shadow-sm" />
        <div>
          <h2 className="font-bold text-slate-700">📲 Приложението е инсталирано</h2>
          <p className="text-xs text-slate-400 mt-0.5">Можете да го отворите от началния екран</p>
        </div>
      </div>
    </section>
  )

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <img src="/pwa-192.png" alt="Maistorix" className="w-10 h-10 rounded-xl shadow-sm" />
        <div>
          <h2 className="font-bold text-slate-700">📲 Инсталирай приложението</h2>
          <p className="text-xs text-slate-400 mt-0.5">Добави на началния екран за бърз достъп</p>
        </div>
      </div>
      {prompt ? (
        <button
          onClick={handleInstall}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white
                     bg-gradient-to-r from-indigo-600 to-violet-700
                     hover:opacity-90 active:scale-[.98] transition-all"
        >
          Инсталирай сега
        </button>
      ) : (
        <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-4 py-3">
          В браузъра натисни <strong>⋮ → Инсталирай приложение</strong> (Chrome/Edge) или <strong>Сподели → Добави към началния екран</strong> (Safari/iPhone)
        </p>
      )}
    </section>
  )
}

const VAPID_PUBLIC_KEY = 'BHthsxiISbyOy7p1FepjOhmY8aLPdarwa7qe_PHdm4oQumOnietuX2tVLdIMuqNNRuFdgme6aIStIWEt8oV1xxo'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

function PushNotifications({ user }) {
  const [status,   setStatus]   = useState('idle') // idle | loading | enabled | denied | unsupported
  const [msg,      setMsg]      = useState('')

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setStatus('unsupported'); return
    }
    if (Notification.permission === 'granted') setStatus('enabled')
    else if (Notification.permission === 'denied') setStatus('denied')
  }, [])

  async function handleEnable() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported'); return
    }
    setStatus('loading')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setStatus('denied'); return }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      await fetch('/api/save-push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, subscription: sub.toJSON() }),
      })

      setStatus('enabled')
      setMsg('Известията са включени!')
    } catch (err) {
      console.error('[push]', err)
      setStatus('idle')
      setMsg('Грешка: ' + err.message)
    }
  }

  async function handleDisable() {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      setStatus('idle')
      setMsg('Известията са изключени.')
    } catch (err) {
      setMsg('Грешка: ' + err.message)
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-700">🔔 Push известия</h2>
          <p className="text-xs text-slate-400 mt-0.5">Просрочени задачи и плащания — всеки ден в 9:00</p>
        </div>
        {status === 'unsupported' && (
          <span className="text-xs text-slate-400">Не се поддържа</span>
        )}
        {status === 'denied' && (
          <span className="text-xs text-red-400">Блокирано от браузъра</span>
        )}
        {(status === 'idle' || status === 'loading') && (
          <button
            onClick={handleEnable}
            disabled={status === 'loading'}
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-60"
          >
            {status === 'loading' ? '⏳...' : 'Включи'}
          </button>
        )}
        {status === 'enabled' && (
          <button
            onClick={handleDisable}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 font-semibold hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            ✅ Включени
          </button>
        )}
      </div>
      {msg && <p className="text-xs text-slate-500 mt-2">{msg}</p>}
    </section>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</label>
      <input
        type={type}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

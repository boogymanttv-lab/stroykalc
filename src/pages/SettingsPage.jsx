import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const [form, setForm] = useState({
    full_name: '', phone: '', company_name: '', company_type: 'individual',
    eik: '', vat_number: '', address: '', city: '',
    offer_footer: 'Офертата е валидна 30 дни от датата на издаване.',
    default_vat: false,
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
        offer_footer:  profile.offer_footer  || 'Офертата е валидна 30 дни от датата на издаване.',
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
          <h2 className="font-bold text-slate-700 mb-4">🖼️ Лого на фирмата</h2>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
              {logoPreview
                ? <img src={logoPreview} alt="logo" className="w-full h-full object-contain" />
                : <span className="text-3xl">🏗️</span>
              }
            </div>
            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-semibold text-sm hover:bg-indigo-100 transition-colors">
                📎 Избери снимка
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
              <p className="text-xs text-slate-400 mt-1.5">PNG или JPG — ще се появи в PDF офертите</p>
            </div>
          </div>
        </section>

        {/* Personal */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-700 mb-4">👤 Лична информация</h2>
          <div className="space-y-3">
            <Field label="Имe и фамилия" value={form.full_name} onChange={v => set('full_name', v)} placeholder="Иван Петров" />
            <Field label="Телефон" value={form.phone} onChange={v => set('phone', v)} placeholder="+359 888 123 456" type="tel" />
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Имейл</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
                value={user?.email || ''} readOnly
              />
            </div>
          </div>
        </section>

        {/* Company */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-700 mb-4">🏢 Фирмени данни</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Тип субект</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                value={form.company_type}
                onChange={e => set('company_type', e.target.value)}
              >
                <option value="individual">Физическо лице / ЕТ</option>
                <option value="company">ЕООД / ООД / АД</option>
              </select>
            </div>
            <Field label="Фирма / Търговско наименование" value={form.company_name} onChange={v => set('company_name', v)} placeholder="Строй ЕООД" />
            <Field label="ЕИК / ЕГН" value={form.eik} onChange={v => set('eik', v)} placeholder="123456789" />
            <Field label="ДДС номер" value={form.vat_number} onChange={v => set('vat_number', v)} placeholder="BG123456789" />
            <Field label="Адрес" value={form.address} onChange={v => set('address', v)} placeholder="ул. Строителна 1" />
            <Field label="Град" value={form.city} onChange={v => set('city', v)} placeholder="София" />
          </div>
        </section>

        {/* Offer defaults */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-700 mb-4">📄 Настройки на офертата</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Забележка в края на офертата
              </label>
              <textarea
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 resize-none"
                rows={3}
                value={form.offer_footer}
                onChange={e => set('offer_footer', e.target.value)}
                placeholder="Офертата е валидна 30 дни..."
              />
            </div>
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl">
              <div>
                <div className="font-semibold text-sm text-slate-700">ДДС по подразбиране</div>
                <div className="text-xs text-slate-400">Включи ДДС в новите оферти</div>
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
                🔔 Напомняния за неплатени — след (дни)
              </label>
              <input
                type="number"
                min={1}
                max={365}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors"
                value={form.reminder_days}
                onChange={e => set('reminder_days', Number(e.target.value))}
              />
              <p className="text-xs text-slate-400 mt-1">Показвай предупреждение, ако проект не е платен след толкова дни</p>
            </div>
          </div>
        </section>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-700
                     hover:opacity-90 active:scale-[.98] transition-all disabled:opacity-60 text-sm"
        >
          {saving ? '⏳ Запазване...' : saved ? '✅ Запазено!' : '💾 Запази промените'}
        </button>

        {/* Legal links */}
        <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
          <p className="text-xs text-slate-400 text-center mb-1">Maistorix © {new Date().getFullYear()}</p>
          <div className="flex justify-center gap-4">
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer"
               className="text-xs text-indigo-500 hover:underline">
              🔒 Поверителност
            </a>
            <a href="/terms.html" target="_blank" rel="noopener noreferrer"
               className="text-xs text-indigo-500 hover:underline">
              📋 Общи условия
            </a>
          </div>
        </div>
      </div>
    </div>
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

import QRCode from 'qrcode'
import { showToast } from './toast.js'
import { openPDFViewer } from './pdfViewer.js'

const fmt = (n, lang = 'bg') =>
  '€ ' + Number(n).toLocaleString(lang === 'en' ? 'en-GB' : 'bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ─────────────────────────────────────────────────────────────
// Translation map for PDF content
// ─────────────────────────────────────────────────────────────
const PDF_STRINGS = {
  // Offer PDF
  offerTitle:          { bg: 'ОФЕРТА',                   en: 'QUOTATION' },
  offerDate:           { bg: 'Дата:',                    en: 'Date:' },
  toClient:            { bg: 'До клиент',                en: 'To client' },
  projectLabel:        { bg: 'Обект / Проект',           en: 'Project / Object' },
  colService:          { bg: 'Вид работа / Услуга',      en: 'Work / Service' },
  colQty:              { bg: 'Количество',               en: 'Quantity' },
  colUnitPrice:        { bg: 'Ед. цена',                 en: 'Unit price' },
  colTotal:            { bg: 'Сума',                     en: 'Amount' },
  subtotalLabel:       { bg: 'Сума без ДДС',             en: 'Subtotal (excl. VAT)' },
  vatLabel:            { bg: 'ДДС 20%',                  en: 'VAT 20%' },
  grandTotal:          { bg: 'ОБЩО',                     en: 'TOTAL' },
  qrHint:              { bg: 'Сканирай за онлайн оферта', en: 'Scan for online quotation' },
  sigContractor:       { bg: 'Изготвил:',                en: 'Prepared by:' },
  sigClient:           { bg: 'Клиент:',                  en: 'Client:' },
  watermarkText:       { bg: 'Създадено безплатно с',    en: 'Created for free with' },
  eikLabel:            { bg: 'ЕИК:',                     en: 'Reg.No.:' },
  vatNoLabel:          { bg: 'ДДС №:',                   en: 'VAT No.:' },
  // Contract PDF
  contractTitle:       { bg: 'ДОГОВОР ЗА ИЗПЪЛНЕНИЕ НА СТРОИТЕЛНО-МОНТАЖНИ РАБОТИ',
                         en: 'CONTRACT FOR CONSTRUCTION AND ASSEMBLY WORKS' },
  sec1Title:           { bg: 'Раздел 1. Страни по договора',    en: 'Section 1. Parties' },
  sec2Title:           { bg: 'Раздел 2. Предмет на договора',   en: 'Section 2. Scope of work' },
  sec3Title:           { bg: 'Раздел 3. Цена и начин на плащане', en: 'Section 3. Price and payment' },
  sec4Title:           { bg: 'Раздел 4. Срок за изпълнение',    en: 'Section 4. Timeline' },
  sec5Title:           { bg: 'Раздел 5. Права и задължения',    en: 'Section 5. Rights and obligations' },
  sec6Title:           { bg: 'Раздел 6. Гаранционен срок',      en: 'Section 6. Warranty period' },
  sec7Title:           { bg: 'Раздел 7. Неустойки',             en: 'Section 7. Penalties' },
  sec8Title:           { bg: 'Раздел 8. Разрешаване на спорове', en: 'Section 8. Dispute resolution' },
  roleContractor:      { bg: 'Изпълнител',               en: 'Contractor' },
  roleClient:          { bg: 'Възложител (Клиент)',       en: 'Client' },
  sec2Intro:           { bg: 'Изпълнителят се задължава да извърши следните строително-монтажни работи на обект:',
                         en: 'The Contractor undertakes to perform the following construction and assembly works at the site:' },
  totalBoxLabel:       { bg: 'ОБЩА СТОЙНОСТ',            en: 'TOTAL VALUE' },
  sec3_1:              { bg: 'Общата стойност на СМР е',  en: 'The total value of the works is' },
  withVAT:             { bg: '(с включен ДДС 20%)',       en: '(incl. VAT 20%)' },
  withoutVAT:          { bg: '(без ДДС)',                 en: '(excl. VAT)' },
  sec3_2:              { bg: 'Авансово плащане: ______% от общата сума (', en: 'Advance payment: ______% of the total amount (' },
  sec3_2b:             { bg: ' €) — преди започване на работа.',             en: ' €) — before commencement of works.' },
  sec3_3:              { bg: 'Междинно плащане: ______% — при',              en: 'Interim payment: ______% — upon' },
  sec3_4:              { bg: 'Финално плащане: остатъкът — при подписване на приемо-предавателен протокол.',
                         en: 'Final payment: the remainder — upon signing the acceptance protocol.' },
  sec4_1:              { bg: 'Начало на работа:',         en: 'Commencement of works:' },
  sec4_2:              { bg: 'Краен срок:',               en: 'Completion date:' },
  sec4_3:              { bg: 'Срокът може да бъде удължен при форсмажорни обстоятелства или промяна в обема на работата.',
                         en: 'The timeline may be extended due to force majeure events or changes in the scope of work.' },
  sec5_1:              { bg: 'Изпълнителят се задължава да изпълни СМР в съответствие с действащите стандарти и добрите строителни практики.',
                         en: 'The Contractor shall perform the works in accordance with applicable standards and good construction practices.' },
  sec5_2:              { bg: 'Възложителят осигурява достъп до обекта и необходимите разрешения.',
                         en: 'The Client shall provide access to the site and any required permits.' },
  sec5_3:              { bg: 'Промени в обхвата на работата се договарят писмено и могат да доведат до промяна в цената и срока.',
                         en: 'Changes in the scope of work shall be agreed in writing and may result in adjustments to price and timeline.' },
  sec6_1:              { bg: 'Изпълнителят предоставя гаранционен срок от',
                         en: 'The Contractor provides a warranty period of' },
  sec6_1b:             { bg: 'месеца от датата на предаване на обекта.',
                         en: 'months from the date of project handover.' },
  sec6_2:              { bg: 'Гаранцията покрива дефекти, произтичащи от некачествено изпълнение, но не и такива, причинени от неправилна употреба.',
                         en: 'The warranty covers defects arising from poor workmanship, but not those caused by improper use.' },
  sec7_1:              { bg: 'При забава на Изпълнителя — 0.1% от стойността на договора за всеки просрочен ден, но не повече от 10%.',
                         en: 'For delays by the Contractor — 0.1% of the contract value per delayed day, not exceeding 10%.' },
  sec7_2:              { bg: 'При забава на Възложителя при плащане — 0.05% на ден върху дължимата сума.',
                         en: 'For delays by the Client in payment — 0.05% per day on the outstanding amount.' },
  sec8body:            { bg: 'Споровете се решават по взаимно съгласие. При невъзможност — от компетентния съд по местонахождение на обекта.',
                         en: 'Disputes shall be resolved by mutual agreement. If not possible — by the competent court at the location of the works.' },
  sigContractorLabel:  { bg: 'ИЗПЪЛНИТЕЛ:',              en: 'CONTRACTOR:' },
  sigClientLabel:      { bg: 'ВЪЗЛОЖИТЕЛ:',              en: 'CLIENT:' },
  sigLine:             { bg: 'Подпис: _______________________', en: 'Signature: _______________________' },
}

function s(key, lang) {
  return PDF_STRINGS[key]?.[lang] ?? PDF_STRINGS[key]?.bg ?? key
}

// ─────────────────────────────────────────────────────────────
// OFFER PDF
// ─────────────────────────────────────────────────────────────
export async function generateOfferPDF({ profile, client, project, shareUrl, isPro = false, lang = 'bg' }) {
  // Generate QR code as data URL (offline-safe, no external API)
  let qrDataUrl = null
  if (shareUrl) {
    try {
      qrDataUrl = await QRCode.toDataURL(shareUrl, {
        width: 100,
        margin: 1,
        color: { dark: '#4f46e5', light: '#ffffff' },
      })
    } catch { /* QR generation failed, skip */ }
  }

  // Group items by category
  const grouped = {}
  for (const item of (project.items || [])) {
    const k = item.category || (lang === 'en' ? 'Services' : 'Услуги')
    if (!grouped[k]) grouped[k] = []
    grouped[k].push(item)
  }

  const offerDate = project.offer_date || new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'bg-BG')
  const htmlLang  = lang === 'en' ? 'en' : 'bg'

  const html = `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
<meta charset="UTF-8">
<title>${s('offerTitle', lang)} ${project.offer_number || ''}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1e293b; background: #fff; }
  .page { max-width: 210mm; margin: 0 auto; padding: 18mm 14mm 14mm; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start;
            border-bottom: 3px solid #4f46e5; padding-bottom: 18px; margin-bottom: 22px; }
  .company-block { display: flex; align-items: flex-start; gap: 14px; }
  .logo { width: 72px; height: 72px; object-fit: contain; border-radius: 10px; }
  .logo-ph { width: 72px; height: 72px; background: linear-gradient(135deg,#4f46e5,#7c3aed);
             border-radius: 10px; display: flex; align-items: center; justify-content: center;
             font-size: 30px; }
  .company-name { font-size: 19px; font-weight: 800; color: #4f46e5; }
  .company-det  { color: #64748b; font-size: 11.5px; margin-top: 3px; }
  .offer-meta   { text-align: right; }
  .offer-title  { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
  .offer-num    { font-size: 14px; color: #4f46e5; font-weight: 700; margin-top: 5px; }
  .offer-dt     { font-size: 11.5px; color: #64748b; margin-top: 3px; }

  /* Info boxes */
  .info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 22px; }
  .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 13px 15px; }
  .ib-label { font-size: 9.5px; font-weight: 700; text-transform: uppercase;
              letter-spacing: 0.8px; color: #94a3b8; margin-bottom: 6px; }
  .ib-name  { font-weight: 700; font-size: 13.5px; }
  .ib-det   { color: #64748b; font-size: 11.5px; margin-top: 3px; }

  /* Table */
  table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 12.5px; }
  .cat-row td { background: #4f46e5; color: #fff; font-weight: 700; font-size: 11px;
                text-transform: uppercase; letter-spacing: 0.5px; padding: 7px 12px; }
  thead th { background: #f1f5f9; color: #475569; font-size: 10.5px; text-transform: uppercase;
             letter-spacing: 0.5px; padding: 8px 12px; text-align: left; }
  tbody td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  tr:nth-child(even) td { background: #fafafa; }
  .c-right { text-align: right; }
  .c-center { text-align: center; }
  .iname { font-weight: 500; }
  .itotal { font-weight: 700; color: #4f46e5; }

  /* Totals */
  .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 30px; }
  .totals { width: 270px; }
  .t-row { display: flex; justify-content: space-between; padding: 5px 0; color: #475569; }
  .t-main { background: linear-gradient(135deg,#4f46e5,#7c3aed); color: #fff; font-weight: 800;
            font-size: 15px; padding: 11px 14px; border-radius: 10px; margin-top: 6px;
            display: flex; justify-content: space-between; }

  /* Signatures */
  .sig-row { display: grid; grid-template-columns: 1fr 1fr; gap: 50px; margin-top: 40px; }
  .sig-line { border-top: 1px solid #cbd5e1; padding-top: 7px; text-align: center;
              font-size: 11px; color: #94a3b8; }

  /* Footer note */
  .footer-note { margin-top: 22px; border-top: 1px solid #e2e8f0; padding-top: 12px;
                 color: #94a3b8; font-size: 11px; font-style: italic; }

  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .page { padding: 10mm; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="company-block">
      ${profile?.logo_url
        ? `<img src="${profile.logo_url}" class="logo" alt="logo" />`
        : `<img src="https://maistorix.vercel.app/pwa-192.png" class="logo" alt="Maistorix" style="border-radius:8px;" />`}
      <div>
        <div class="company-name">${profile?.company_name || profile?.full_name || 'Maistorix'}</div>
        ${profile?.phone      ? `<div class="company-det">📞 ${profile.phone}</div>` : ''}
        ${profile?.email      ? `<div class="company-det">✉️ ${profile.email}</div>` : ''}
        ${(profile?.address || profile?.city) ? `<div class="company-det">📍 ${[profile?.address, profile?.city].filter(Boolean).join(', ')}</div>` : ''}
        ${profile?.eik        ? `<div class="company-det">${s('eikLabel', lang)} ${profile.eik}</div>` : ''}
        ${profile?.vat_number ? `<div class="company-det">${s('vatNoLabel', lang)} ${profile.vat_number}</div>` : ''}
      </div>
    </div>
    <div class="offer-meta">
      <div class="offer-title">${s('offerTitle', lang)}</div>
      ${project.offer_number ? `<div class="offer-num">№ ${project.offer_number}</div>` : ''}
      <div class="offer-dt">${s('offerDate', lang)} ${offerDate}</div>
    </div>
  </div>

  <!-- Client + Project -->
  <div class="info-row">
    <div class="info-box">
      <div class="ib-label">${s('toClient', lang)}</div>
      <div class="ib-name">${client?.name || '—'}</div>
      ${client?.phone   ? `<div class="ib-det">📞 ${client.phone}</div>` : ''}
      ${client?.email   ? `<div class="ib-det">✉️ ${client.email}</div>` : ''}
      ${(client?.address || client?.city) ? `<div class="ib-det">📍 ${[client?.address, client?.city].filter(Boolean).join(', ')}</div>` : ''}
      ${client?.eik     ? `<div class="ib-det">${s('eikLabel', lang)} ${client.eik}</div>` : ''}
      ${client?.vat_number ? `<div class="ib-det">${s('vatNoLabel', lang)} ${client.vat_number}</div>` : ''}
    </div>
    <div class="info-box">
      <div class="ib-label">${s('projectLabel', lang)}</div>
      <div class="ib-name">${project.name}</div>
      ${project.address ? `<div class="ib-det">📍 ${project.address}</div>` : ''}
      ${project.notes   ? `<div class="ib-det" style="margin-top:6px;font-style:italic">${project.notes}</div>` : ''}
    </div>
  </div>

  <!-- Services table -->
  <table>
    <thead>
      <tr>
        <th style="width:48%">${s('colService', lang)}</th>
        <th class="c-center" style="width:16%">${s('colQty', lang)}</th>
        <th class="c-right"  style="width:16%">${s('colUnitPrice', lang)}</th>
        <th class="c-right"  style="width:20%">${s('colTotal', lang)}</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(grouped).map(([cat, catItems]) => `
        <tr class="cat-row"><td colspan="4">${cat}</td></tr>
        ${catItems.map(item => `
        <tr>
          <td class="iname">${item.name}</td>
          <td class="c-center">${item.qty} ${item.unit}</td>
          <td class="c-right">${fmt(item.price, lang)}</td>
          <td class="c-right itotal">${fmt(item.qty * item.price, lang)}</td>
        </tr>`).join('')}
      `).join('')}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals-wrap">
    <div class="totals">
      <div class="t-row"><span>${s('subtotalLabel', lang)}</span><span>${fmt(project.subtotal, lang)}</span></div>
      ${project.vat ? `<div class="t-row"><span>${s('vatLabel', lang)}</span><span>${fmt(project.vat_amount, lang)}</span></div>` : ''}
      <div class="t-main"><span>${s('grandTotal', lang)}</span><span>${fmt(project.total, lang)}</span></div>
    </div>
  </div>

  <!-- QR code + Signatures -->
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:30px;gap:20px">
    ${qrDataUrl ? `
    <div style="text-align:center;flex-shrink:0">
      <img src="${qrDataUrl}" width="100" height="100"
           style="border-radius:8px;border:2px solid #e2e8f0" alt="QR" />
      <div style="font-size:9px;color:#94a3b8;margin-top:4px">${s('qrHint', lang)}</div>
    </div>` : '<div></div>'}
    <div style="flex:1">
      <div class="sig-row">
        <div><div class="sig-line">${s('sigContractor', lang)} _______________________<br>/ ${profile?.full_name || profile?.company_name || ''} /</div></div>
        <div><div class="sig-line">${s('sigClient', lang)} _______________________<br>/ ${client?.name || ''} /</div></div>
      </div>
    </div>
  </div>

  <!-- Footer note -->
  ${profile?.offer_footer ? `<div class="footer-note">${profile.offer_footer}</div>` : ''}

  <!-- Watermark for free plan -->
  ${!isPro ? `
  <div style="margin-top:18px;padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;
              border-radius:8px;display:flex;align-items:center;justify-content:space-between;">
    <span style="font-size:10.5px;color:#94a3b8;">
      🏗️ ${s('watermarkText', lang)} <strong style="color:#4f46e5;">Maistorix</strong>
    </span>
    <span style="font-size:10px;color:#c7d2fe;">maistorix.com</span>
  </div>` : ''}

</div>
<script>window.onload = () => { window.focus(); window.print(); }</script>
</body>
</html>`

  const offerName = project.offer_number
    ? `${lang === 'en' ? 'Offer' : 'Оферта'}-${project.offer_number}`
    : (lang === 'en' ? 'Offer' : 'Оферта')
  openPDFViewer(html, { name: offerName, type: 'offer', shareUrl: shareUrl || null, clientEmail: client?.email || null })
  return html
}

// ─────────────────────────────────────────────────────────────
// CONTRACT PDF
// ─────────────────────────────────────────────────────────────
export function generateContractPDF({ profile, client, project, lang = 'bg' }) {
  const today      = new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'bg-BG')
  const contractor = profile?.company_name || profile?.full_name || (lang === 'en' ? 'Contractor' : 'Изпълнител')
  const customer   = client?.name || '________________________________'
  const totalText  = fmt(project.total, lang)
  const htmlLang   = lang === 'en' ? 'en' : 'bg'

  // Group items
  const grouped = {}
  for (const item of (project.items || [])) {
    const k = item.category || (lang === 'en' ? 'Services' : 'Услуги')
    if (!grouped[k]) grouped[k] = []
    grouped[k].push(item)
  }

  const html = `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
<meta charset="UTF-8">
<title>${s('contractTitle', lang).split('.')[0]} — ${project.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; font-size:13px; color:#1e293b; background:#fff; }
  .page { max-width:210mm; margin:0 auto; padding:20mm 16mm; }
  h1 { text-align:center; font-size:15px; font-weight:900; letter-spacing:0.5px; margin-bottom:4px; }
  .subtitle { text-align:center; font-size:11px; color:#64748b; margin-bottom:24px; }
  .section { margin-bottom:18px; }
  .sec-title { font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;
               color:#4f46e5; border-bottom:2px solid #4f46e5; padding-bottom:4px; margin-bottom:10px; }
  p { margin-bottom:8px; line-height:1.6; }
  .parties { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  .party-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px; }
  .party-role { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px;
                color:#94a3b8; margin-bottom:6px; }
  .party-name { font-weight:700; font-size:14px; }
  .party-det  { font-size:11.5px; color:#64748b; margin-top:3px; }
  table { width:100%; border-collapse:collapse; font-size:12px; margin:10px 0; }
  .cat-row td { background:#4f46e5; color:#fff; font-weight:700; padding:6px 10px;
                font-size:10.5px; text-transform:uppercase; letter-spacing:0.5px; }
  thead th { background:#f1f5f9; color:#475569; font-size:10.5px; text-transform:uppercase;
             letter-spacing:0.5px; padding:7px 10px; text-align:left; }
  tbody td { padding:7px 10px; border-bottom:1px solid #f1f5f9; }
  .c-right { text-align:right; }
  .c-center { text-align:center; }
  .total-box { background:linear-gradient(135deg,#4f46e5,#7c3aed); color:#fff;
               padding:14px 18px; border-radius:10px; display:flex;
               justify-content:space-between; font-size:16px; font-weight:900; margin:14px 0; }
  .sig-row { display:grid; grid-template-columns:1fr 1fr; gap:50px; margin-top:40px; }
  .sig-line { border-top:1px solid #cbd5e1; padding-top:8px; text-align:center;
              font-size:11px; color:#94a3b8; }
  .underline { border-bottom:1px solid #334155; display:inline-block; min-width:160px; }
  @media print {
    body { print-color-adjust:exact; -webkit-print-color-adjust:exact; }
    .page { padding:10mm; }
  }
</style>
</head>
<body>
<div class="page">

  <h1>${s('contractTitle', lang)}</h1>
  <div class="subtitle">${s('offerDate', lang)} ${today}</div>

  <!-- Страни / Parties -->
  <div class="section">
    <div class="sec-title">${s('sec1Title', lang)}</div>
    <div class="parties">
      <div class="party-box">
        <div class="party-role">${s('roleContractor', lang)}</div>
        <div class="party-name">${contractor}</div>
        ${profile?.eik        ? `<div class="party-det">${s('eikLabel', lang)} ${profile.eik}</div>` : ''}
        ${profile?.vat_number ? `<div class="party-det">${s('vatNoLabel', lang)} ${profile.vat_number}</div>` : ''}
        ${profile?.address || profile?.city ? `<div class="party-det">📍 ${[profile?.address, profile?.city].filter(Boolean).join(', ')}</div>` : ''}
        ${profile?.phone      ? `<div class="party-det">📞 ${profile.phone}</div>` : ''}
      </div>
      <div class="party-box">
        <div class="party-role">${s('roleClient', lang)}</div>
        <div class="party-name">${customer}</div>
        ${client?.eik         ? `<div class="party-det">${s('eikLabel', lang)} ${client.eik}</div>` : ''}
        ${client?.address || client?.city ? `<div class="party-det">📍 ${[client?.address, client?.city].filter(Boolean).join(', ')}</div>` : ''}
        ${client?.phone       ? `<div class="party-det">📞 ${client.phone}</div>` : ''}
      </div>
    </div>
  </div>

  <!-- Предмет / Scope -->
  <div class="section">
    <div class="sec-title">${s('sec2Title', lang)}</div>
    <p>${s('sec2Intro', lang)} <strong>${project.name}${project.address ? ' — ' + project.address : ''}</strong></p>
    <table>
      <thead>
        <tr>
          <th style="width:48%">${s('colService', lang)}</th>
          <th class="c-center" style="width:16%">${s('colQty', lang)}</th>
          <th class="c-right" style="width:16%">${s('colUnitPrice', lang)}</th>
          <th class="c-right" style="width:20%">${s('colTotal', lang)}</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(grouped).map(([cat, items]) => `
          <tr class="cat-row"><td colspan="4">${cat}</td></tr>
          ${items.map(i => `
          <tr>
            <td>${i.name}</td>
            <td class="c-center">${i.qty} ${i.unit}</td>
            <td class="c-right">${fmt(i.price, lang)}</td>
            <td class="c-right" style="font-weight:700;color:#4f46e5">${fmt(i.qty * i.price, lang)}</td>
          </tr>`).join('')}
        `).join('')}
      </tbody>
    </table>
    <div class="total-box"><span>${s('totalBoxLabel', lang)}</span><span>${totalText}</span></div>
  </div>

  <!-- Цена / Price -->
  <div class="section">
    <div class="sec-title">${s('sec3Title', lang)}</div>
    <p>3.1. ${s('sec3_1', lang)} <strong>${totalText}</strong> ${project.vat ? s('withVAT', lang) : s('withoutVAT', lang)}.</p>
    <p>3.2. ${s('sec3_2', lang)}<span class="underline"></span>${s('sec3_2b', lang)}</p>
    <p>3.3. ${s('sec3_3', lang)} <span class="underline" style="min-width:200px"></span>.</p>
    <p>3.4. ${s('sec3_4', lang)}</p>
  </div>

  <!-- Срок / Timeline -->
  <div class="section">
    <div class="sec-title">${s('sec4Title', lang)}</div>
    <p>4.1. ${s('sec4_1', lang)} <span class="underline"></span></p>
    <p>4.2. ${s('sec4_2', lang)} <span class="underline"></span></p>
    <p>4.3. ${s('sec4_3', lang)}</p>
  </div>

  <!-- Задължения / Obligations -->
  <div class="section">
    <div class="sec-title">${s('sec5Title', lang)}</div>
    <p>5.1. ${s('sec5_1', lang)}</p>
    <p>5.2. ${s('sec5_2', lang)}</p>
    <p>5.3. ${s('sec5_3', lang)}</p>
  </div>

  <!-- Гаранция / Warranty -->
  <div class="section">
    <div class="sec-title">${s('sec6Title', lang)}</div>
    <p>6.1. ${s('sec6_1', lang)} <span class="underline" style="min-width:60px"></span> ${s('sec6_1b', lang)}</p>
    <p>6.2. ${s('sec6_2', lang)}</p>
  </div>

  <!-- Неустойки / Penalties -->
  <div class="section">
    <div class="sec-title">${s('sec7Title', lang)}</div>
    <p>7.1. ${s('sec7_1', lang)}</p>
    <p>7.2. ${s('sec7_2', lang)}</p>
  </div>

  <!-- Спорове / Disputes -->
  <div class="section">
    <div class="sec-title">${s('sec8Title', lang)}</div>
    <p>${s('sec8body', lang)}</p>
  </div>

  <!-- Подписи / Signatures -->
  <div class="sig-row">
    <div>
      <div class="sig-line">
        ${s('sigContractorLabel', lang)}<br><br>
        ${s('sigLine', lang)}<br>
        / ${contractor} /
      </div>
    </div>
    <div>
      <div class="sig-line">
        ${s('sigClientLabel', lang)}<br><br>
        ${s('sigLine', lang)}<br>
        / ${customer} /
      </div>
    </div>
  </div>

</div>
<script>window.onload = () => { window.focus(); window.print(); }</script>
</body>
</html>`

  const contractName = project.name
    ? `${lang === 'en' ? 'Contract' : 'Договор'}-${project.name}`
    : (lang === 'en' ? 'Contract' : 'Договор')
  openPDFViewer(html, { name: contractName, type: 'contract' })
  return html
}

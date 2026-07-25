const fmt = n =>
  '€ ' + Number(n).toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function generateOfferPDF({ profile, client, project, shareUrl, isPro = false }) {
  // Group items by category
  const grouped = {}
  for (const item of (project.items || [])) {
    const k = item.category || 'Услуги'
    if (!grouped[k]) grouped[k] = []
    grouped[k].push(item)
  }

  const offerDate = project.offer_date || new Date().toLocaleDateString('bg-BG')

  const html = `<!DOCTYPE html>
<html lang="bg">
<head>
<meta charset="UTF-8">
<title>Оферта ${project.offer_number || ''}</title>
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
  .totals { width: 250px; }
  .t-row { display: flex; justify-content: space-between; padding: 5px 0; color: #475569; }
  .t-main { background: linear-gradient(135deg,#4f46e5,#7c3aed); color: #fff; font-weight: 800;
            font-size: 15px; padding: 11px 14px; border-radius: 10px; margin-top: 6px; }
  .t-main { display: flex; justify-content: space-between; }

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
        : `<div class="logo-ph">🏗️</div>`}
      <div>
        <div class="company-name">${profile?.company_name || profile?.full_name || 'СтройКалк'}</div>
        ${profile?.phone       ? `<div class="company-det">📞 ${profile.phone}</div>` : ''}
        ${profile?.email       ? `<div class="company-det">✉️ ${profile.email}</div>` : ''}
        ${(profile?.address || profile?.city) ? `<div class="company-det">📍 ${[profile?.address, profile?.city].filter(Boolean).join(', ')}</div>` : ''}
        ${profile?.eik         ? `<div class="company-det">ЕИК: ${profile.eik}</div>` : ''}
        ${profile?.vat_number  ? `<div class="company-det">ДДС №: ${profile.vat_number}</div>` : ''}
      </div>
    </div>
    <div class="offer-meta">
      <div class="offer-title">ОФЕРТА</div>
      ${project.offer_number ? `<div class="offer-num">№ ${project.offer_number}</div>` : ''}
      <div class="offer-dt">Дата: ${offerDate}</div>
    </div>
  </div>

  <!-- Client + Project -->
  <div class="info-row">
    <div class="info-box">
      <div class="ib-label">До клиент</div>
      <div class="ib-name">${client?.name || '—'}</div>
      ${client?.phone   ? `<div class="ib-det">📞 ${client.phone}</div>` : ''}
      ${client?.email   ? `<div class="ib-det">✉️ ${client.email}</div>` : ''}
      ${(client?.address || client?.city) ? `<div class="ib-det">📍 ${[client?.address, client?.city].filter(Boolean).join(', ')}</div>` : ''}
      ${client?.eik     ? `<div class="ib-det">ЕИК: ${client.eik}</div>` : ''}
      ${client?.vat_number ? `<div class="ib-det">ДДС №: ${client.vat_number}</div>` : ''}
    </div>
    <div class="info-box">
      <div class="ib-label">Обект / Проект</div>
      <div class="ib-name">${project.name}</div>
      ${project.address ? `<div class="ib-det">📍 ${project.address}</div>` : ''}
      ${project.notes   ? `<div class="ib-det" style="margin-top:6px;font-style:italic">${project.notes}</div>` : ''}
    </div>
  </div>

  <!-- Services table -->
  <table>
    <thead>
      <tr>
        <th style="width:48%">Вид работа / Услуга</th>
        <th class="c-center" style="width:16%">Количество</th>
        <th class="c-right"  style="width:16%">Ед. цена</th>
        <th class="c-right"  style="width:20%">Сума</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(grouped).map(([cat, catItems]) => `
        <tr class="cat-row"><td colspan="4">${cat}</td></tr>
        ${catItems.map(item => `
        <tr>
          <td class="iname">${item.name}</td>
          <td class="c-center">${item.qty} ${item.unit}</td>
          <td class="c-right">${fmt(item.price)}</td>
          <td class="c-right itotal">${fmt(item.qty * item.price)}</td>
        </tr>`).join('')}
      `).join('')}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals-wrap">
    <div class="totals">
      <div class="t-row"><span>Сума без ДДС</span><span>${fmt(project.subtotal)}</span></div>
      ${project.vat ? `<div class="t-row"><span>ДДС 20%</span><span>${fmt(project.vat_amount)}</span></div>` : ''}
      <div class="t-main"><span>ОБЩО</span><span>${fmt(project.total)}</span></div>
    </div>
  </div>

  <!-- QR code + Signatures -->
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:30px;gap:20px">
    ${shareUrl ? `
    <div style="text-align:center;flex-shrink:0">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(shareUrl)}&color=4f46e5"
           width="100" height="100" style="border-radius:8px;border:2px solid #e2e8f0" alt="QR" />
      <div style="font-size:9px;color:#94a3b8;margin-top:4px">Сканирай за онлайн оферта</div>
    </div>` : '<div></div>'}
    <div style="flex:1">
      <div class="sig-row">
        <div><div class="sig-line">Изготвил: _______________________<br>/ ${profile?.full_name || profile?.company_name || ''} /</div></div>
        <div><div class="sig-line">Клиент: _______________________<br>/ ${client?.name || ''} /</div></div>
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
      🏗️ Създадено безплатно с <strong style="color:#4f46e5;">СтройКалк</strong>
    </span>
    <span style="font-size:10px;color:#c7d2fe;">stroykalc.vercel.app</span>
  </div>` : ''}

</div>
<script>window.onload = () => { window.focus(); window.print(); }</script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  } else {
    alert('Моля, разреши изскачащите прозорци (pop-ups) в браузъра!')
  }
}

// ─────────────────────────────────────────────────────────────
// CONTRACT PDF
// ─────────────────────────────────────────────────────────────
export function generateContractPDF({ profile, client, project }) {
  const today      = new Date().toLocaleDateString('bg-BG')
  const contractor = profile?.company_name || profile?.full_name || 'Изпълнител'
  const customer   = client?.name || '________________________________'
  const totalText  = fmt(project.total)

  // Group items
  const grouped = {}
  for (const item of (project.items || [])) {
    const k = item.category || 'Услуги'
    if (!grouped[k]) grouped[k] = []
    grouped[k].push(item)
  }

  const html = `<!DOCTYPE html>
<html lang="bg">
<head>
<meta charset="UTF-8">
<title>Договор — ${project.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; font-size:13px; color:#1e293b; background:#fff; }
  .page { max-width:210mm; margin:0 auto; padding:20mm 16mm; }
  h1 { text-align:center; font-size:16px; font-weight:900; letter-spacing:1px; margin-bottom:4px; }
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

  <h1>ДОГОВОР ЗА ИЗПЪЛНЕНИЕ НА СТРОИТЕЛНО-МОНТАЖНИ РАБОТИ</h1>
  <div class="subtitle">Дата: ${today}</div>

  <!-- Страни -->
  <div class="section">
    <div class="sec-title">Раздел 1. Страни по договора</div>
    <div class="parties">
      <div class="party-box">
        <div class="party-role">Изпълнител</div>
        <div class="party-name">${contractor}</div>
        ${profile?.eik        ? `<div class="party-det">ЕИК: ${profile.eik}</div>` : ''}
        ${profile?.vat_number ? `<div class="party-det">ДДС №: ${profile.vat_number}</div>` : ''}
        ${profile?.address || profile?.city ? `<div class="party-det">📍 ${[profile?.address, profile?.city].filter(Boolean).join(', ')}</div>` : ''}
        ${profile?.phone      ? `<div class="party-det">📞 ${profile.phone}</div>` : ''}
      </div>
      <div class="party-box">
        <div class="party-role">Възложител (Клиент)</div>
        <div class="party-name">${customer}</div>
        ${client?.eik         ? `<div class="party-det">ЕИК: ${client.eik}</div>` : ''}
        ${client?.address || client?.city ? `<div class="party-det">📍 ${[client?.address, client?.city].filter(Boolean).join(', ')}</div>` : ''}
        ${client?.phone       ? `<div class="party-det">📞 ${client.phone}</div>` : ''}
      </div>
    </div>
  </div>

  <!-- Предмет -->
  <div class="section">
    <div class="sec-title">Раздел 2. Предмет на договора</div>
    <p>Изпълнителят се задължава да извърши следните строително-монтажни работи на обект:
      <strong>${project.name}${project.address ? ' — ' + project.address : ''}</strong>
    </p>
    <table>
      <thead>
        <tr>
          <th style="width:48%">Вид работа</th>
          <th class="c-center" style="width:16%">Количество</th>
          <th class="c-right" style="width:16%">Ед. цена</th>
          <th class="c-right" style="width:20%">Сума</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(grouped).map(([cat, items]) => `
          <tr class="cat-row"><td colspan="4">${cat}</td></tr>
          ${items.map(i => `
          <tr>
            <td>${i.name}</td>
            <td class="c-center">${i.qty} ${i.unit}</td>
            <td class="c-right">${fmt(i.price)}</td>
            <td class="c-right" style="font-weight:700;color:#4f46e5">${fmt(i.qty * i.price)}</td>
          </tr>`).join('')}
        `).join('')}
      </tbody>
    </table>
    <div class="total-box"><span>ОБЩА СТОЙНОСТ</span><span>${totalText}</span></div>
  </div>

  <!-- Цена и плащане -->
  <div class="section">
    <div class="sec-title">Раздел 3. Цена и начин на плащане</div>
    <p>3.1. Общата стойност на СМР е <strong>${totalText}</strong>${project.vat ? ' (с включен ДДС 20%)' : ' (без ДДС)'}.</p>
    <p>3.2. Авансово плащане: ______% от общата сума (<span class="underline"></span> €) — преди започване на работа.</p>
    <p>3.3. Междинно плащане: ______% — при <span class="underline" style="min-width:200px"></span>.</p>
    <p>3.4. Финално плащане: остатъкът — при подписване на приемо-предавателен протокол.</p>
  </div>

  <!-- Срок -->
  <div class="section">
    <div class="sec-title">Раздел 4. Срок за изпълнение</div>
    <p>4.1. Начало на работа: <span class="underline"></span></p>
    <p>4.2. Краен срок: <span class="underline"></span></p>
    <p>4.3. Срокът може да бъде удължен при форсмажорни обстоятелства или промяна в обема на работата.</p>
  </div>

  <!-- Задължения -->
  <div class="section">
    <div class="sec-title">Раздел 5. Права и задължения</div>
    <p>5.1. Изпълнителят се задължава да изпълни СМР в съответствие с действащите стандарти и добрите строителни практики.</p>
    <p>5.2. Възложителят осигурява достъп до обекта и необходимите разрешения.</p>
    <p>5.3. Промени в обхвата на работата се договарят писмено и могат да доведат до промяна в цената и срока.</p>
  </div>

  <!-- Гаранция -->
  <div class="section">
    <div class="sec-title">Раздел 6. Гаранционен срок</div>
    <p>6.1. Изпълнителят предоставя гаранционен срок от <span class="underline" style="min-width:60px"></span> месеца от датата на предаване на обекта.</p>
    <p>6.2. Гаранцията покрива дефекти, произтичащи от некачествено изпълнение, но не и такива, причинени от неправилна употреба.</p>
  </div>

  <!-- Неустойки -->
  <div class="section">
    <div class="sec-title">Раздел 7. Неустойки</div>
    <p>7.1. При забава на Изпълнителя — 0.1% от стойността на договора за всеки просрочен ден, но не повече от 10%.</p>
    <p>7.2. При забава на Възложителя при плащане — 0.05% на ден върху дължимата сума.</p>
  </div>

  <!-- Разрешаване -->
  <div class="section">
    <div class="sec-title">Раздел 8. Разрешаване на спорове</div>
    <p>Споровете се решават по взаимно съгласие. При невъзможност — от компетентния съд по местонахождение на обекта.</p>
  </div>

  <!-- Подписи -->
  <div class="sig-row">
    <div>
      <div class="sig-line">
        ИЗПЪЛНИТЕЛ:<br><br>
        Подпис: _______________________<br>
        / ${contractor} /
      </div>
    </div>
    <div>
      <div class="sig-line">
        ВЪЗЛОЖИТЕЛ:<br><br>
        Подпис: _______________________<br>
        / ${customer} /
      </div>
    </div>
  </div>

</div>
<script>window.onload = () => { window.focus(); window.print(); }</script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  } else {
    alert('Моля, разреши изскачащите прозорци (pop-ups) в браузъра!')
  }
}

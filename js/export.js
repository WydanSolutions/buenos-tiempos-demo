/* ==========================================================================
   Exportables: documentos PDF (vista previa + impresión A4) y Excel
   --------------------------------------------------------------------------
   BT.doc.open({ title, subtitle, sede, code, body, landscape, filename })
     body se arma con los helpers BT.doc.*:
       section(title, html, {icon})      kv([[k,v],...], cols)        table(cols, rows, {foot, compact, zebra})
       kpis([{label, value, sub}])       chart(config, {w,h})         badge(text, tone)
       note(html, tone)                  signatures(['Firma 1', ...]) twoCol(a, b)
   BT.xlsx({ filename, title, subtitle, sede, sheets:[{ name, columns:[{header,key,width,fmt}], rows, totals:{key:'sum'} }] })
     fmt: 'money' | 'date' | 'datetime' | 'int' | 'dec' | 'pct' | 'text'
   BT.csv(filename, columns, rows)
   ========================================================================== */
(function () {
  'use strict';
  const BT = window.BT; const u = BT.u; const esc = u.esc;
  const doc = (BT.doc = {});

  const DOC_CSS = `
  @font-face{font-family:InterVar;font-weight:100 900;src:url(__FONT__) format('woff2');}
  :root{--g:#297040;--g7:#226037;--g1:#e2f0e6;--g05:#f1f8f3;--ink:#262625;--ink8:#393939;--ink5:#7b7770;--ink4:#9d988f;--line:#e4e0d8;--z:#f8f7f4;}
  *{box-sizing:border-box}
  html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{margin:0;font-family:InterVar,Inter,"Segoe UI",system-ui,sans-serif;color:var(--ink);font-size:10pt;line-height:1.5;font-feature-settings:"cv11","ss01";-webkit-font-smoothing:antialiased;background:#fff}
  .num,td.num,.money{font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}
  @page{size:A4 __ORIENT__;margin:16mm 15mm 20mm 15mm;
    @bottom-left{content:"__EMITIDO__";font:7.5pt InterVar,"Segoe UI",sans-serif;color:#9d988f}
    @bottom-center{content:"Desarrollado por Wydan Solutions";font:7.5pt InterVar,"Segoe UI",sans-serif;color:#9d988f}
    @bottom-right{content:"Página " counter(page) " de " counter(pages);font:600 7.5pt InterVar,"Segoe UI",sans-serif;color:#7b7770}
    @top-right{content:"Residencial Buenos Tiempos · __TITLE__";font:7.5pt InterVar,"Segoe UI",sans-serif;color:#9d988f}
  }
  @page:first{@top-right{content:none}}
  .paper{padding:0}
  @media screen{.paper{padding:56px 56px 40px}.screen-foot{display:flex}}
  @media print{.screen-foot{display:none}}
  header.dh{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-bottom:14px;border-bottom:2px solid var(--g);position:relative}
  header.dh::after{content:"";position:absolute;left:0;bottom:-2px;width:90px;height:2px;background:var(--ink8)}
  .brand{display:flex;gap:14px;align-items:center}
  .brand img{width:74px;height:auto}
  .brand .n{font-weight:750;font-size:13.5pt;letter-spacing:-.01em;color:var(--ink)}
  .brand .s{font-size:8.5pt;color:var(--ink5);line-height:1.4}
  .dmeta{text-align:right}
  .dmeta .k{font-size:7.5pt;letter-spacing:.12em;text-transform:uppercase;color:var(--g);font-weight:700}
  .dmeta h1{margin:3px 0 2px;font-size:17pt;letter-spacing:-.02em;line-height:1.15;font-weight:750;color:var(--ink)}
  .dmeta .sub{font-size:9pt;color:var(--ink5)}
  .dmeta .code{display:inline-block;margin-top:6px;font-size:7.5pt;font-weight:600;color:var(--g7);background:var(--g05);border:1px solid var(--g1);padding:2px 8px;border-radius:99px}
  h2{font-size:11.5pt;margin:20px 0 9px;letter-spacing:-.01em;display:flex;align-items:center;gap:8px;break-after:avoid;color:var(--ink)}
  h2::before{content:"";width:4px;height:14px;border-radius:2px;background:var(--g)}
  h3{font-size:10pt;margin:14px 0 6px;break-after:avoid}
  section{break-inside:auto}
  .kv{display:grid;grid-template-columns:repeat(var(--cols,2),1fr);gap:0;border:1px solid var(--line);border-radius:8px;overflow:hidden}
  .kv>div{padding:7px 11px;border-bottom:1px solid var(--line);border-right:1px solid var(--line);break-inside:avoid}
  .kv .k{font-size:7.5pt;color:var(--ink5);text-transform:uppercase;letter-spacing:.05em;font-weight:600}
  .kv .v{font-weight:550;color:var(--ink);font-size:9.5pt}
  table{width:100%;border-collapse:collapse;font-size:8.8pt}
  thead{display:table-header-group}
  tr{break-inside:avoid}
  th{background:var(--g);color:#fff;text-align:left;font-weight:650;font-size:7.8pt;letter-spacing:.04em;text-transform:uppercase;padding:7px 9px}
  th:first-child{border-radius:6px 0 0 0}th:last-child{border-radius:0 6px 0 0}
  td{padding:6.5px 9px;border-bottom:1px solid #eeebe5;vertical-align:top}
  table.zebra tbody tr:nth-child(even) td{background:var(--z)}
  table.compact td{padding:4.5px 8px}
  td.num,th.num{text-align:right}
  td.center,th.center{text-align:center}
  tfoot td{font-weight:750;border-top:1.5px solid var(--ink8);border-bottom:0;background:var(--g05)}
  .kpis{display:grid;grid-template-columns:repeat(var(--n,4),1fr);gap:8px;margin:16px 0 6px}
  .kpi{border:1px solid var(--line);border-radius:9px;padding:9px 11px;background:linear-gradient(180deg,#fff,var(--g05));break-inside:avoid}
  .kpi .l{font-size:7.5pt;color:var(--ink5);font-weight:600;text-transform:uppercase;letter-spacing:.05em}
  .kpi .v{font-size:14pt;font-weight:750;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
  .kpi .s{font-size:7.5pt;color:var(--ink5)}
  .chart{break-inside:avoid;border:1px solid var(--line);border-radius:9px;padding:10px 10px 6px;margin:6px 0}
  .chart img{width:100%;height:auto;display:block}
  .chart .cap{font-size:8pt;color:var(--ink5);margin:0 2px 6px;font-weight:600}
  .badge{display:inline-block;padding:1px 7px;border-radius:99px;font-size:7.5pt;font-weight:650;background:#f1efea;color:#4c4a47;white-space:nowrap}
  .badge.ok{background:#e7f3eb;color:#2f7d4a}.badge.warn{background:#fcf2df;color:#a8660b}.badge.danger{background:#fbecea;color:#b4352b}.badge.info{background:#e8f0fa;color:#2a619c}
  .note{border-radius:8px;padding:9px 12px;background:var(--g05);border:1px solid var(--g1);font-size:9pt;break-inside:avoid;margin:8px 0}
  .note.warn{background:#fcf2df;border-color:#f0d6a6}.note.danger{background:#fbecea;border-color:#f0c3be}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .sigs{display:grid;grid-template-columns:repeat(var(--n,2),1fr);gap:28px;margin-top:46px;break-inside:avoid}
  .sigs div{border-top:1px solid var(--ink8);padding-top:5px;font-size:8.5pt;color:var(--ink5);text-align:center}
  .muted{color:var(--ink5)} .small{font-size:8pt}
  .amend{border-left:3px solid #f0d6a6;background:#fffaf0;padding:5px 9px;margin-top:5px;border-radius:0 6px 6px 0;font-size:8.5pt}
  .tl{border-left:2px solid var(--g1);padding-left:12px;margin-left:4px}
  .tl .it{position:relative;padding:3px 0 8px;break-inside:avoid}
  .tl .it::before{content:"";position:absolute;left:-17px;top:8px;width:8px;height:8px;border-radius:50%;background:var(--g);box-shadow:0 0 0 2px #fff}
  .screen-foot{display:none;justify-content:space-between;margin-top:36px;padding-top:10px;border-top:1px solid var(--line);font-size:7.5pt;color:var(--ink4)}
  .wm{position:fixed;right:15mm;bottom:8mm;font-size:7pt;color:#c4bfb5}
  `;

  const userLine = () => { const usr = BT.state.user || { nombre: 'Sistema', role: '' }; return usr.nombre + (usr.role ? ' (' + (BT.ROLES[usr.role] ? BT.ROLES[usr.role].label : usr.role) + ')' : ''); };
  const cssStr = (s) => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  /** Arma el documento HTML completo */
  doc.build = function ({ title, subtitle = '', sede = BT.state.sede, code = '', body = '', landscape = false, kicker = 'Documento' }) {
    const sObj = BT.db.sedes.find((x) => x.id === sede);
    const now = new Date();
    const emitido = 'Emitido el ' + u.fmtDate(now) + ' a las ' + u.fmtTime(now) + ' por ' + userLine();
    const css = DOC_CSS.replace('__FONT__', BT.FONT_DATA || '').replace('__ORIENT__', landscape ? 'landscape' : 'portrait').replace('__EMITIDO__', cssStr(emitido)).replace('__TITLE__', cssStr(title));
    const sedeLine = sObj ? esc(sObj.nombre) + ' · ' + esc(sObj.direccion) + ', ' + esc(sObj.barrio) + ' · Tel. ' + esc(sObj.tel) : 'Sedes BT1 (Malvín) y BT2 (Unión) · Montevideo';
    return '<!doctype html><html lang="es-UY"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>' + css + '</style></head><body><div class="paper">' +
      '<header class="dh"><div class="brand"><img src="' + BT.LOGO + '" alt=""><div><div class="n">Residencial Buenos Tiempos</div><div class="s">' + sedeLine + '<br>' + esc(BT.db.meta.company) + ' · RUT ' + esc(BT.db.meta.rut) + '</div></div></div>' +
      '<div class="dmeta"><div class="k">' + esc(kicker) + '</div><h1>' + esc(title) + '</h1>' + (subtitle ? '<div class="sub">' + subtitle + '</div>' : '') + '<div class="code">' + esc(code || ('BT-' + now.getFullYear() + u.pad(now.getMonth() + 1) + u.pad(now.getDate()) + '-' + String(now.getHours()) + u.pad(now.getMinutes()))) + '</div></div></header>' +
      body +
      '<div class="screen-foot"><span>' + esc(emitido) + '</span><span>Desarrollado por Wydan Solutions</span><span>Página 1 de 1</span></div>' +
      '</div></body></html>';
  };

  /** Vista previa animada con descarga (imprimir → Guardar como PDF) */
  doc.open = function (opts) {
    const html = doc.build(opts);
    const filename = (opts.filename || opts.title).replace(/[\\/:*?"<>|]+/g, '-');
    const ov = document.createElement('div');
    ov.className = 'overlay preview-ov';
    ov.innerHTML = '<div class="preview"><div class="preview-bar"><span class="k-ic" style="width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:rgba(255,255,255,.12)">' + BT.ic('file-text') + '</span><div class="grow"><div class="t">' + esc(opts.title) + '</div><div class="s">Vista previa · A4 ' + (opts.landscape ? 'horizontal' : 'vertical') + ' · ' + esc(BT.sedeName(opts.sede || BT.state.sede)) + '</div></div>' +
      '<button class="btn ghost sm" data-print>' + BT.ic('printer') + 'Imprimir</button><button class="btn primary sm" data-pdf>' + BT.ic('download') + 'Descargar PDF</button><button class="icon-btn ghost" style="color:#fff" data-close aria-label="Cerrar">' + BT.ic('x') + '</button></div>' +
      '<div class="preview-stage"><div class="preview-paper ' + (opts.landscape ? 'landscape' : '') + '"><div class="skel" style="height:1123px;border-radius:4px"></div></div></div></div>';
    document.body.appendChild(ov);
    const paper = ov.querySelector('.preview-paper');
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', opts.title);
    iframe.style.opacity = '0';
    iframe.srcdoc = html;
    iframe.addEventListener('load', () => {
      const d = iframe.contentDocument; d.title = filename;
      const fit = () => { iframe.style.height = Math.max(1123 * (opts.landscape ? 0.707 : 1), d.documentElement.scrollHeight) + 'px'; };
      fit(); setTimeout(fit, 300);
      const sk = paper.querySelector('.skel'); if (sk) sk.remove();
      iframe.style.transition = 'opacity 300ms ease'; iframe.style.opacity = '1';
    });
    setTimeout(() => paper.appendChild(iframe), 180);
    const close = () => { ov.classList.add('closing'); setTimeout(() => ov.remove(), 220); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    ov.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]') || e.target === ov.querySelector('.preview-stage')) close();
      if (e.target.closest('[data-print]') || e.target.closest('[data-pdf]')) {
        const w = iframe.contentWindow; if (!w) return;
        const prevTitle = document.title; document.title = filename;
        if (e.target.closest('[data-pdf]')) BT.ui.toast('Elegí «Guardar como PDF» en el destino', { type: 'info', icon: 'file-down', sub: 'El documento sale en A4 con numeración de páginas', ms: 4200 });
        setTimeout(() => { w.focus(); w.print(); document.title = prevTitle; }, 250);
      }
    });
    BT.audit('Exportó', opts.title + ' (PDF)', { residentId: opts.residentId, detail: opts.subtitle ? String(opts.subtitle).replace(/<[^>]+>/g, '') : '' });
    return ov;
  };

  /* ---------- Helpers de contenido ---------- */
  doc.section = (title, html) => '<section><h2>' + esc(title) + '</h2>' + html + '</section>';
  doc.kv = (pairs, cols = 2) => '<div class="kv" style="--cols:' + cols + '">' + pairs.filter(Boolean).map(([k, v]) => '<div><div class="k">' + esc(k) + '</div><div class="v">' + (v == null || v === '' ? '—' : v) + '</div></div>').join('') + '</div>';
  /** cols: [{label, key, align:'num'|'center', render:(row)=>html, width}] */
  doc.table = (cols, rows, opts = {}) => {
    if (!rows.length) return '<div class="note">' + esc(opts.empty || 'Sin registros en el período.') + '</div>';
    return '<table class="' + (opts.zebra === false ? '' : 'zebra ') + (opts.compact ? 'compact' : '') + '"><thead><tr>' + cols.map((c) => '<th class="' + (c.align || '') + '"' + (c.width ? ' style="width:' + c.width + '"' : '') + '>' + esc(c.label) + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map((r) => '<tr>' + cols.map((c) => '<td class="' + (c.align || '') + '">' + (c.render ? c.render(r) : esc(r[c.key])) + '</td>').join('') + '</tr>').join('') + '</tbody>' + (opts.foot ? '<tfoot>' + opts.foot + '</tfoot>' : '') + '</table>';
  };
  doc.kpis = (items) => '<div class="kpis" style="--n:' + Math.min(items.length, 4) + '">' + items.map((k) => '<div class="kpi"><div class="l">' + esc(k.label) + '</div><div class="v">' + k.value + '</div>' + (k.sub ? '<div class="s">' + k.sub + '</div>' : '') + '</div>').join('') + '</div>';
  doc.badge = (t, tone = '') => '<span class="badge ' + tone + '">' + esc(t) + '</span>';
  doc.note = (html, tone = '') => '<div class="note ' + tone + '">' + html + '</div>';
  doc.twoCol = (a, b) => '<div class="two"><div>' + a + '</div><div>' + b + '</div></div>';
  doc.signatures = (labels) => '<div class="sigs" style="--n:' + labels.length + '">' + labels.map((l) => '<div>' + esc(l) + '</div>').join('') + '</div>';
  /** Renderiza un gráfico Chart.js a imagen nítida (3x) para documentos */
  doc.chart = function (config, { w = 680, h = 240, caption = '' } = {}) {
    if (!window.Chart) return '';
    BT.chartDefaults();
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.style.width = w + 'px'; c.style.height = h + 'px';
    const holder = document.createElement('div'); holder.style.cssText = 'position:fixed;left:-99999px;top:0;width:' + w + 'px;height:' + h + 'px'; holder.appendChild(c); document.body.appendChild(holder);
    const cfg = JSON.parse(JSON.stringify(config, (k, v) => (typeof v === 'function' ? undefined : v)));
    // conservar callbacks de formato si los hay
    if (config.options && config.options.scales) Object.keys(config.options.scales).forEach((ax) => { const t = config.options.scales[ax].ticks; if (t && t.callback) { cfg.options.scales[ax].ticks = cfg.options.scales[ax].ticks || {}; cfg.options.scales[ax].ticks.callback = t.callback; } });
    cfg.options = Object.assign({}, cfg.options, { responsive: false, animation: false, devicePixelRatio: 3, maintainAspectRatio: false });
    cfg.options.plugins = Object.assign({ legend: { display: true, position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'rectRounded', padding: 14, font: { size: 11 } } } }, cfg.options.plugins || {});
    const ch = new window.Chart(c, cfg);
    const url = c.toDataURL('image/png');
    ch.destroy(); holder.remove();
    return '<div class="chart">' + (caption ? '<div class="cap">' + esc(caption) + '</div>' : '') + '<img src="' + url + '" alt="' + esc(caption) + '"></div>';
  };
  doc.money = (n) => '<span class="num">' + u.fmtMoney(n) + '</span>';

  /* ==========================================================================
     Excel (ExcelJS) — encabezados verdes, $U, fechas, filtros y paneles fijos
     ========================================================================== */
  const FMT = {
    money: '"$U" #,##0;[Red]-"$U" #,##0',
    money2: '"$U" #,##0.00;[Red]-"$U" #,##0.00',
    date: 'dd/mm/yyyy',
    datetime: 'dd/mm/yyyy hh:mm',
    int: '#,##0',
    dec: '#,##0.00',
    pct: '0.0%',
    text: '@',
  };
  const toDateVal = (v) => { if (!v) return null; if (v instanceof Date) return v; if (typeof v === 'number') return new Date(v); const d = u.toDate(v); return isNaN(d) ? v : d; };
  BT.xlsx = async function ({ filename, title, subtitle = '', sede = BT.state.sede, sheets }) {
    if (!window.ExcelJS) { BT.ui.toast('No se pudo generar el Excel', { type: 'danger', sub: 'Librería no disponible' }); return; }
    const wb = new window.ExcelJS.Workbook();
    wb.creator = 'Residencial Buenos Tiempos · Wydan Solutions'; wb.created = new Date(); wb.company = BT.db.meta.company;
    let logoId = null;
    try { logoId = wb.addImage({ base64: BT.LOGO, extension: 'png' }); } catch (e) { }
    const now = new Date();
    sheets.forEach((sh) => {
      const ws = wb.addWorksheet(sh.name.slice(0, 31), {
        views: [{ state: 'frozen', ySplit: 5, xSplit: sh.freezeCols || 0, showGridLines: false }],
        pageSetup: { paperSize: 9, orientation: sh.columns.length > 6 ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.7, header: 0.3, footer: 0.3 } },
        headerFooter: { oddFooter: '&L&8Emitido ' + u.fmtDateTime(now) + ' por ' + userLine() + '&C&8Desarrollado por Wydan Solutions&R&8Página &P de &N' },
      });
      ws.columns = sh.columns.map((c) => ({ key: c.key, width: c.width || Math.max(12, String(c.header).length + 4) }));
      // Encabezado del documento
      ws.getRow(1).height = 24; ws.getRow(2).height = 18; ws.getRow(3).height = 16; ws.getRow(4).height = 8;
      if (logoId != null) ws.addImage(logoId, { tl: { col: 0.15, row: 0.2 }, ext: { width: 62, height: 56 } });
      const tcol = 2;
      ws.getCell(1, tcol).value = title; ws.getCell(1, tcol).font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF262625' } };
      ws.getCell(2, tcol).value = 'Residencial Buenos Tiempos · ' + BT.sedeName(sede) + (subtitle ? ' · ' + subtitle : ''); ws.getCell(2, tcol).font = { size: 10, color: { argb: 'FF7B7770' } };
      ws.getCell(3, tcol).value = BT.db.meta.company + ' · RUT ' + BT.db.meta.rut + ' · Emitido ' + u.fmtDateTime(now); ws.getCell(3, tcol).font = { size: 9, color: { argb: 'FF9D988F' } };
      if (ws.getColumn(1).width < 11) ws.getColumn(1).width = 11;
      // Fila de encabezados
      const hr = ws.getRow(5);
      sh.columns.forEach((c, i) => {
        const cell = hr.getCell(i + 1); cell.value = c.header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF297040' } };
        cell.alignment = { vertical: 'middle', horizontal: ['money', 'int', 'dec', 'pct', 'money2'].includes(c.fmt) ? 'right' : 'left', wrapText: true };
        cell.border = { bottom: { style: 'medium', color: { argb: 'FF1C4F2D' } } };
      });
      hr.height = 26;
      // Datos
      sh.rows.forEach((r, ri) => {
        const row = ws.getRow(6 + ri);
        sh.columns.forEach((c, ci) => {
          let v = typeof c.value === 'function' ? c.value(r) : r[c.key];
          if (c.fmt === 'date' || c.fmt === 'datetime') v = toDateVal(v);
          if (c.fmt === 'pct' && typeof v === 'number' && v > 1) v = v / 100;
          const cell = row.getCell(ci + 1); cell.value = v == null ? null : v;
          if (FMT[c.fmt]) cell.numFmt = FMT[c.fmt];
          cell.font = { size: 10, color: { argb: 'FF262625' } };
          cell.alignment = { vertical: 'middle', horizontal: ['money', 'int', 'dec', 'pct', 'money2'].includes(c.fmt) ? 'right' : c.align === 'center' ? 'center' : 'left', wrapText: !!c.wrap };
          cell.border = { bottom: { style: 'thin', color: { argb: 'FFE9E6DF' } } };
          if (ri % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F9F5' } };
        });
        row.height = 19;
      });
      // Totales
      if (sh.totals) {
        const tr = ws.getRow(6 + sh.rows.length);
        sh.columns.forEach((c, ci) => {
          const cell = tr.getCell(ci + 1); const L = ws.getColumn(ci + 1).letter;
          if (ci === 0) cell.value = 'Total';
          if (sh.totals[c.key] === 'sum' && sh.rows.length) cell.value = { formula: 'SUBTOTAL(9,' + L + '6:' + L + (5 + sh.rows.length) + ')' };
          else if (sh.totals[c.key] != null && sh.totals[c.key] !== 'sum') cell.value = sh.totals[c.key];
          if (FMT[c.fmt]) cell.numFmt = FMT[c.fmt];
          cell.font = { bold: true, size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2F0E6' } };
          cell.border = { top: { style: 'medium', color: { argb: 'FF393939' } } };
          cell.alignment = { horizontal: ['money', 'int', 'dec', 'pct', 'money2'].includes(c.fmt) ? 'right' : 'left' };
        });
        tr.height = 21;
      }
      if (sh.rows.length) ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5 + sh.rows.length, column: sh.columns.length } };
      if (sh.notes) { const nr = 8 + sh.rows.length; ws.getCell(nr, 1).value = sh.notes; ws.getCell(nr, 1).font = { italic: true, size: 9, color: { argb: 'FF7B7770' } }; }
    });
    const buf = await wb.xlsx.writeBuffer();
    download(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), (filename || title) + '.xlsx');
    BT.audit('Exportó', title + ' (Excel)', {});
    BT.ui.toast('Excel generado', { sub: (filename || title) + '.xlsx', icon: 'file-spreadsheet' });
  };

  BT.csv = function (filename, columns, rows) {
    const q = (v) => { v = v == null ? '' : String(v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const lines = [columns.map((c) => q(c.header)).join(';')].concat(rows.map((r) => columns.map((c) => { let v = typeof c.value === 'function' ? c.value(r) : r[c.key]; if (c.fmt === 'date' && v) v = u.fmtDate(v); if (typeof v === 'number') v = String(v).replace('.', ','); return q(v); }).join(';')));
    download(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), filename + '.csv');
    BT.audit('Exportó', filename + ' (CSV)', {});
    BT.ui.toast('CSV generado', { sub: filename + '.csv', icon: 'file-down' });
  };

  function download(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  BT.download = download;
})();

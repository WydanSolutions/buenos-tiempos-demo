/* ==========================================================================
   Insumos y compras
   Stock por sede · Consumo por residente (→ cargos extra en Cobranzas) · Proveedores · Órdenes
   ========================================================================== */
(function () {
  'use strict';
  const BT = window.BT; const u = BT.u; const ui = BT.ui; const ic = BT.ic; const esc = u.esc;
  const CATS = [{ id: 'all', label: 'Todo', icon: 'boxes' }, { id: 'Pañales', label: 'Pañales', icon: 'baby' }, { id: 'Enfermería', label: 'Enfermería', icon: 'syringe' }, { id: 'Limpieza', label: 'Limpieza', icon: 'spray-can' }, { id: 'Alimentos', label: 'Alimentos', icon: 'wheat' }];
  const CAT_ICON = { 'Pañales': 'baby', 'Enfermería': 'syringe', 'Limpieza': 'spray-can', 'Alimentos': 'wheat' };
  const MARKUP = 1.1; // los insumos se refacturan con 10 %

  BT.addCSS('ins', `
    .ins-st { display: flex; align-items: center; gap: 10px; min-width: 190px; }
    .ins-st .bar { flex: 1; position: relative; }
    .ins-st .bar::after { content: ""; position: absolute; top: -2px; bottom: -2px; width: 2px; border-radius: 2px; background: var(--ink-700); left: var(--min, 50%); opacity: .55; }
    .ins-st b { font-variant-numeric: tabular-nums; min-width: 64px; text-align: right; font-size: var(--fs-sm); }
    .ins-cat { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; background: var(--ink-100); color: var(--ink-600); flex: none; }
    .ins-cat.Pañales { background: var(--info-bg); color: var(--info); }
    .ins-cat.Enfermería { background: var(--brand-50); color: var(--brand-600); }
    .ins-cat.Limpieza { background: var(--violet-bg); color: var(--violet); }
    .ins-cat.Alimentos { background: var(--warn-bg); color: var(--warn); }
    .ins-sup { padding: 18px; display: flex; flex-direction: column; gap: 12px; }
    .ins-sup .top { display: flex; gap: 12px; align-items: center; }
    .ins-flow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 14px 16px; border-radius: var(--r-lg); background: linear-gradient(90deg, var(--brand-50), #fff); border: 1px solid var(--brand-100); }
    .ins-flow .st { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; font-size: var(--fs-sm); color: var(--ink-800); background: #fff; border: 1px solid var(--line); border-radius: 99px; padding: 6px 12px; box-shadow: var(--sh-1); }
    .ins-flow .ar { color: var(--brand-400); }
    .ins-qty { width: 96px; text-align: right; }
  `);

  const lowItems = () => BT.bySede(BT.db.stock).filter((s) => s.stock < s.minimo);
  const supplier = (id) => BT.db.suppliers.find((s) => s.id === id) || { nombre: '—' };
  const curYM = () => u.ym(u.today());
  const stockTone = (s) => (s.stock < s.minimo * 0.5 ? 'danger' : s.stock < s.minimo ? 'warn' : '');

  function render(el) {
    const items = BT.bySede(BT.db.stock);
    const low = lowItems();
    const valor = u.sum(items, (s) => s.stock * s.costo);
    const pend = BT.bySede(BT.db.purchases).filter((p) => p.estado !== 'Recibida');
    const mes = curYM();
    const consMes = BT.db.consumption.filter((c) => c.mes === mes && BT.inSede(BT.resident(c.residentId) || {}));
    const facturable = u.sum(consMes, (c) => { const it = BT.db.stock.find((s) => s.id === c.itemId); return it ? c.cantidad * it.costo * MARKUP : 0; });
    el.innerHTML = ui.pageHeader({
      eyebrow: 'Insumos y compras', icon: 'boxes', title: 'Stock, consumo y proveedores',
      sub: BT.sedeName() + ' · ' + items.length + ' artículos controlados',
      actions: ui.exportMenu([{ id: 'xls', label: 'Stock en Excel', sub: 'Con mínimos, valorización y proveedor', icon: 'file-spreadsheet' }, { id: 'xlsc', label: 'Consumo por residente (Excel)', sub: 'Mes en curso', icon: 'file-spreadsheet' }]) +
        '<button class="btn primary" data-act="order" ' + (low.length ? '' : 'disabled') + '>' + ic('shopping-cart') + 'Generar orden' + (low.length ? ' (' + low.length + ')' : '') + '</button>',
    }) +
      '<div class="grid g-4 stagger mb-16">' +
      ui.kpi({ label: 'Bajo el mínimo', value: low.length, icon: 'triangle-alert', tone: low.length ? 'danger' : 'ink', foot: low.length ? 'Reponer cuanto antes' : 'Todo en orden' }) +
      ui.kpi({ label: 'Valor del stock', value: valor, money: true, icon: 'package', foot: 'A costo de compra' }) +
      ui.kpi({ label: 'A facturar este mes', value: facturable, money: true, icon: 'receipt', tone: 'info', foot: 'Consumo por residente (+10 %)' }) +
      ui.kpi({ label: 'Órdenes pendientes', value: pend.length, icon: 'truck', tone: 'warn', foot: pend.length ? 'Esperando entrega' : 'Sin pendientes' }) +
      '</div><div id="insTabs"></div>';
    ui.on(el, {
      order: () => orderFlow(),
      export: (t) => (t.dataset.id === 'xls' ? exportStock() : exportCons()),
    });
    ui.subtabs(el.querySelector('#insTabs'), 'ins', [
      { id: 'stock', label: 'Stock', icon: 'boxes', count: low.length ? low.length + ' bajos' : '' },
      { id: 'consumo', label: 'Consumo por residente', icon: 'user-round' },
      { id: 'ordenes', label: 'Órdenes de compra', icon: 'shopping-cart', count: pend.length || '' },
      { id: 'prov', label: 'Proveedores', icon: 'truck' },
    ], (p, id) => ({ stock: renderStock, consumo: renderCons, ordenes: renderOrders, prov: renderProv }[id](p)));
  }

  /* ---------------- Stock ---------------- */
  function renderStock(p) {
    const cat = BT.state.sub.insCat || 'all';
    const q = BT.state.sub.insQ || '';
    let items = BT.bySede(BT.db.stock).filter((s) => (cat === 'all' || s.categoria === cat) && (!q || u.norm(s.item).includes(u.norm(q))));
    items = u.sortBy(items, (s) => s.stock / s.minimo);
    p.innerHTML = '<div class="row between wrap mb-16">' + ui.seg('inscat', CATS, cat, 'sm') +
      '<div style="position:relative;width:min(280px,100%)"><span style="position:absolute;left:13px;top:9px;color:var(--ink-400)">' + ic('search') + '</span><input class="input" id="insQ" placeholder="Buscar artículo…" value="' + esc(q) + '" style="border-radius:99px;padding-left:38px;height:36px"></div></div>' +
      '<section class="card"><div class="card-b flush">' + ui.table([
        { label: 'Artículo', render: (s) => '<div class="row"><span class="ins-cat ' + s.categoria + '">' + ic(CAT_ICON[s.categoria], 'ic-sm') + '</span><div><div class="strong">' + esc(s.item) + '</div><div class="muted" style="font-size:var(--fs-xs)">' + esc(s.categoria) + (s.porResidente ? ' · <span class="t-info">se factura por residente</span>' : '') + '</div></div></div>' },
        { label: 'Sede', render: (s) => BT.sedeTag(s.sede) },
        { label: 'Stock vs. mínimo', render: (s) => { const max = s.minimo * 2.4; return '<div class="ins-st" data-tip="Mínimo: ' + u.fmtNum(s.minimo) + ' ' + esc(s.unidad) + '"><div class="bar ' + stockTone(s) + '" style="--min:' + ((s.minimo / max) * 100).toFixed(1) + '%"><span style="width:' + u.clamp((s.stock / max) * 100, 2, 100) + '%"></span></div><b>' + u.fmtNum(s.stock) + '</b></div>'; } },
        { label: 'Unidad', render: (s) => '<span class="muted">' + esc(s.unidad) + '</span>' },
        { label: 'Costo', align: 'num', render: (s) => u.fmtMoney(s.costo) },
        { label: 'Valor', align: 'num', render: (s) => u.fmtMoney(s.stock * s.costo) },
        { label: 'Estado', render: (s) => (s.stock < s.minimo * 0.5 ? ui.badge('Crítico', 'danger', { dot: true }) : s.stock < s.minimo ? ui.badge('Bajo mínimo', 'warn', { dot: true }) : ui.badge('OK', 'ok', { dot: true })) },
        { label: '', align: 'num', render: (s) => '<div class="row gap-4" style="justify-content:flex-end"><button class="btn xs" data-act="in" data-id="' + s.id + '" data-tip="Registrar ingreso">' + ic('package-plus') + 'Ingreso</button><button class="btn xs ghost" data-act="adj" data-id="' + s.id + '" data-tip="Ajustar por inventario">' + ic('sliders-horizontal') + '</button></div>' },
      ], items, { rowAttrs: (s) => (s.stock < s.minimo * 0.5 ? 'class="row-flag-danger"' : s.stock < s.minimo ? 'class="row-flag-warn"' : ''), empty: { ill: 'search', title: 'Sin artículos', text: 'No hay artículos que coincidan con el filtro.' } }) + '</div></section>';
    p.querySelector('.seg[data-seg="inscat"]').addEventListener('segchange', (e) => { BT.state.sub.insCat = e.detail.value; renderStock(p); ui.enhance(p); });
    const qi = p.querySelector('#insQ');
    qi.addEventListener('input', u.debounce(() => { BT.state.sub.insQ = qi.value; const pos = qi.selectionStart; renderStock(p); ui.enhance(p); const n = p.querySelector('#insQ'); n.focus(); n.setSelectionRange(pos, pos); }, 220));
    ui.on(p, { in: (t) => moveFlow(t.dataset.id, 'in'), adj: (t) => moveFlow(t.dataset.id, 'adj') });
  }
  function moveFlow(id, mode) {
    const s = BT.db.stock.find((x) => x.id === id); if (!s) return;
    ui.modal({
      title: mode === 'in' ? 'Registrar ingreso' : 'Ajuste de inventario', sub: esc(s.item) + ' · ' + s.sede, icon: mode === 'in' ? 'package-plus' : 'sliders-horizontal',
      body: '<div class="kv-cards mb-16"><div class="kv-card"><div class="k">' + ic('package', 'ic-xs') + 'Stock actual</div><div class="v num">' + u.fmtNum(s.stock) + ' ' + esc(s.unidad) + '</div></div><div class="kv-card"><div class="k">' + ic('flag', 'ic-xs') + 'Mínimo</div><div class="v num">' + u.fmtNum(s.minimo) + '</div></div><div class="kv-card"><div class="k">' + ic('truck', 'ic-xs') + 'Proveedor</div><div class="v">' + esc(supplier(s.proveedorId).nombre) + '</div></div></div>' +
        '<form class="form-grid" id="mvForm">' + (mode === 'in'
        ? ui.field({ label: 'Cantidad recibida', name: 'qty', type: 'number', required: true, value: Math.max(0, s.minimo * 2 - s.stock), attrs: 'min="1"' }) + ui.field({ label: 'Remito / factura', name: 'ref', placeholder: 'Ej.: e-Factura A 0012345' })
        : ui.field({ label: 'Stock contado', name: 'qty', type: 'number', required: true, value: s.stock, attrs: 'min="0"' }) + ui.field({ label: 'Motivo', name: 'ref', type: 'select', options: ['Conteo de inventario', 'Rotura o vencimiento', 'Préstamo entre sedes', 'Corrección de error'], value: 'Conteo de inventario' })) + '</form>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>' + ic('check') + 'Guardar</button>',
      onMount: (m, close) => m.querySelector('[data-save]').addEventListener('click', () => {
        const f = m.querySelector('#mvForm'); if (!ui.validate(f)) return; const d = ui.formData(f);
        const prev = s.stock; s.stock = mode === 'in' ? s.stock + Math.max(0, +d.qty) : Math.max(0, +d.qty);
        BT.audit('Modificó', 'Stock de insumos', { sede: s.sede, detail: s.item + ': ' + prev + ' → ' + s.stock + (d.ref ? ' (' + d.ref + ')' : '') });
        BT.save(); close(); BT.refresh();
        ui.toast(mode === 'in' ? 'Ingreso registrado' : 'Stock ajustado', { sub: s.item + ' · ' + u.fmtNum(s.stock) + ' ' + s.unidad, icon: 'package-check' });
      }),
    });
  }

  /* ---------------- Consumo por residente ---------------- */
  function consRows(mes) {
    const rows = [];
    BT.db.consumption.filter((c) => c.mes === mes).forEach((c) => {
      const r = BT.resident(c.residentId); const it = BT.db.stock.find((s) => s.id === c.itemId);
      if (!r || !it || !BT.inSede(r)) return;
      const concepto = it.item.startsWith('Pañal') ? 'Pañales' : 'Insumos de enfermería';
      const monto = Math.round(c.cantidad * it.costo * MARKUP);
      const ch = BT.db.charges.find((x) => x.residentId === r.id && x.mes === mes && x.concepto === concepto);
      rows.push({ c, r, it, concepto, monto, facturado: !!ch, ok: ch && Math.abs(ch.monto - aggMonto(r.id, mes, concepto)) < 2 });
    });
    return rows.sort((a, b) => BT.fullName(a.r).localeCompare(BT.fullName(b.r)) || a.concepto.localeCompare(b.concepto));
  }
  function aggMonto(rid, mes, concepto) {
    return u.sum(BT.db.consumption.filter((c) => c.residentId === rid && c.mes === mes), (c) => { const it = BT.db.stock.find((s) => s.id === c.itemId); if (!it) return 0; const cc = it.item.startsWith('Pañal') ? 'Pañales' : 'Insumos de enfermería'; return cc === concepto ? Math.round(c.cantidad * it.costo * MARKUP) : 0; });
  }
  function renderCons(p) {
    const months = BT.finMonths();
    const mes = BT.state.sub.insMes && months.includes(BT.state.sub.insMes) ? BT.state.sub.insMes : curYM();
    const rows = consRows(mes);
    const pend = rows.filter((x) => !x.ok).length;
    p.innerHTML = '<div class="ins-flow mb-16"><span class="st">' + ic('hand-heart', 'ic-sm') + 'Cuidadora registra el consumo</span><span class="ar">' + ic('arrow-right') + '</span><span class="st">' + ic('boxes', 'ic-sm') + 'Descuenta del stock</span><span class="ar">' + ic('arrow-right') + '</span><span class="st">' + ic('receipt', 'ic-sm') + 'Se factura como cargo extra en Cobranzas</span><span class="grow"></span>' +
      '<select class="select" id="insMes" style="width:auto;min-height:36px">' + months.slice().reverse().map((m) => '<option value="' + m + '"' + (m === mes ? ' selected' : '') + '>' + u.cap(u.fmtMonth(m)) + '</option>').join('') + '</select></div>' +
      '<section class="card"><div class="card-h"><div><h3>' + ic('user-round') + 'Consumo de ' + u.fmtMonth(mes) + '</h3><div class="sub">' + rows.length + ' líneas · ' + (pend ? '<span class="t-warn strong">' + pend + ' sin facturar o desactualizadas</span>' : '<span class="t-ok strong">todo facturado</span>') + '</div></div><div class="row gap-6"><button class="btn sm" data-act="add-cons">' + ic('plus') + 'Registrar consumo</button><button class="btn sm primary" data-act="gen" ' + (pend ? '' : 'disabled') + '>' + ic('receipt') + 'Generar cargos del mes</button></div></div><div class="card-b flush">' +
      ui.table([
        { label: 'Residente', render: (x) => ui.person(BT.fullName(x.r), x.r.sede + ' · Hab. ' + x.r.habitacion + x.r.cama + ' · Barthel ' + BT.lastBarthel(x.r)) },
        { label: 'Artículo', render: (x) => '<span class="strong">' + esc(x.it.item) + '</span>' },
        { label: 'Cantidad', align: 'num', render: (x) => u.fmtNum(x.c.cantidad) + ' <span class="muted">' + esc(x.it.unidad) + (x.c.cantidad > 1 && x.it.unidad === 'unidad' ? 'es' : x.c.cantidad > 1 ? 's' : '') + '</span>' },
        { label: 'Concepto en cuenta', render: (x) => ui.badge(x.concepto, 'outline') },
        { label: 'Importe', align: 'num', render: (x) => '<span class="strong">' + u.fmtMoney(x.monto) + '</span>' },
        { label: 'Cobranzas', render: (x) => (x.ok ? ui.badge('Facturado', 'ok', { icon: 'check' }) : x.facturado ? ui.badge('Desactualizado', 'warn', { dot: true }) : ui.badge('Se facturará', 'info', { dot: true })) },
      ], rows, { empty: { ill: 'leaf', title: 'Sin consumos registrados', text: 'No hay consumo de insumos por residente en este mes.' }, foot: rows.length ? '<tr><td colspan="4">Total a facturar</td><td class="num">' + u.fmtMoney(u.sum(rows, 'monto')) + '</td><td></td></tr>' : '' }) + '</div></section>';
    p.querySelector('#insMes').addEventListener('change', (e) => { BT.state.sub.insMes = e.target.value; renderCons(p); ui.enhance(p); });
    ui.on(p, { gen: () => genCharges(mes, p), 'add-cons': () => addCons(p) });
  }
  function genCharges(mes, p) {
    const agg = {};
    BT.db.consumption.filter((c) => c.mes === mes).forEach((c) => {
      const r = BT.resident(c.residentId); const it = BT.db.stock.find((s) => s.id === c.itemId); if (!r || !it || !BT.inSede(r)) return;
      const concepto = it.item.startsWith('Pañal') ? 'Pañales' : 'Insumos de enfermería';
      const k = r.id + '|' + concepto; agg[k] = agg[k] || { r, concepto, monto: 0, cantidad: 0 };
      agg[k].monto += Math.round(c.cantidad * it.costo * MARKUP); agg[k].cantidad += c.cantidad;
    });
    let nuevos = 0, act = 0;
    Object.values(agg).forEach((a) => {
      const ch = BT.db.charges.find((x) => x.residentId === a.r.id && x.mes === mes && x.concepto === a.concepto);
      if (ch) { if (Math.abs(ch.monto - a.monto) >= 2) { ch.monto = a.monto; ch.cantidad = a.cantidad; act++; } }
      else { BT.db.charges.push({ id: u.uid('ch'), residentId: a.r.id, sede: a.r.sede, mes, concepto: a.concepto, monto: a.monto, cantidad: a.cantidad }); nuevos++; }
    });
    BT.audit('Creó', 'Cargos extra por insumos', { detail: u.fmtMonth(mes) + ': ' + nuevos + ' nuevos, ' + act + ' actualizados' });
    BT.save();
    renderCons(p); ui.enhance(p);
    ui.toast('Cargos generados en Cobranzas', { sub: nuevos + ' nuevos · ' + act + ' actualizados · sin duplicados', icon: 'receipt' });
  }
  function addCons(p) {
    const res = BT.residentsInSede().sort((a, b) => BT.fullName(a).localeCompare(BT.fullName(b)));
    const itemOpts = (rid) => { const r = BT.resident(rid); return r ? BT.db.stock.filter((s) => s.sede === r.sede && s.porResidente).map((s) => ({ v: s.id, l: s.item + ' (' + s.unidad + ')' })) : []; };
    ui.modal({
      title: 'Registrar consumo', sub: 'Se descuenta del stock y se suma al cargo extra del mes', icon: 'package-minus',
      body: '<form class="form-grid" id="csForm">' + ui.field({ label: 'Residente', name: 'rid', type: 'select', full: true, required: true, placeholder: 'Elegí un residente…', options: res.map((r) => ({ v: r.id, l: BT.fullName(r) + ' · ' + r.sede + ' · Hab. ' + r.habitacion + r.cama })) }) +
        '<div class="field full" id="csItem">' + ui.field({ label: 'Artículo', name: 'item', type: 'select', options: [], placeholder: 'Primero elegí un residente', required: true }) + '</div>' +
        ui.field({ label: 'Cantidad', name: 'qty', type: 'number', required: true, value: 1, attrs: 'min="1"' }) + '</form>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>' + ic('check') + 'Registrar</button>',
      onMount: (m, close) => {
        m.querySelector('select[name="rid"]').addEventListener('change', (e) => { m.querySelector('#csItem').innerHTML = ui.field({ label: 'Artículo', name: 'item', type: 'select', options: itemOpts(e.target.value), required: true }); });
        m.querySelector('[data-save]').addEventListener('click', () => {
          const f = m.querySelector('#csForm'); if (!ui.validate(f)) return; const d = ui.formData(f);
          const it = BT.db.stock.find((s) => s.id === d.item); const qty = Math.max(1, +d.qty); const mes = curYM();
          const c = BT.db.consumption.find((x) => x.residentId === d.rid && x.itemId === d.item && x.mes === mes);
          if (c) c.cantidad += qty; else BT.db.consumption.push({ residentId: d.rid, itemId: d.item, mes, cantidad: qty });
          it.stock = Math.max(0, it.stock - qty);
          BT.audit('Creó', 'Consumo de insumos', { residentId: d.rid, detail: it.item + ' × ' + qty });
          BT.save(); close(); BT.state.sub.insMes = mes; renderCons(p); ui.enhance(p);
          ui.toast('Consumo registrado', { sub: it.item + ' × ' + qty + ' · pendiente de facturar', icon: 'package-minus' });
        });
      },
    });
  }

  /* ---------------- Órdenes de compra ---------------- */
  function renderOrders(p) {
    const list = BT.bySede(BT.db.purchases).slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
    p.innerHTML = '<section class="card"><div class="card-h"><div><h3>' + ic('shopping-cart') + 'Órdenes de compra</h3><div class="sub">Últimas compras y entregas pendientes</div></div><button class="btn sm primary" data-act="order" ' + (lowItems().length ? '' : 'disabled') + '>' + ic('wand-sparkles') + 'Generar desde stock bajo</button></div><div class="card-b flush">' +
      ui.table([
        { label: 'Nº', render: (o) => '<span class="num strong">OC-' + String(o.id).replace(/\D/g, '').padStart(4, '0').slice(-4) + '</span>' },
        { label: 'Fecha', align: 'num', render: (o) => u.fmtDate(o.fecha) },
        { label: 'Proveedor', render: (o) => '<div class="strong">' + esc(supplier(o.proveedorId).nombre) + '</div><div class="muted" style="font-size:var(--fs-xs)">' + esc(supplier(o.proveedorId).rubro || '') + '</div>' },
        { label: 'Sede', render: (o) => BT.sedeTag(o.sede) },
        { label: 'Detalle', render: (o) => '<span class="muted" style="font-size:var(--fs-sm)">' + esc(o.items) + '</span>' },
        { label: 'Total', align: 'num', render: (o) => '<span class="strong">' + u.fmtMoney(o.total) + '</span>' },
        { label: 'Estado', render: (o) => (o.estado === 'Recibida' ? ui.badge('Recibida', 'ok', { icon: 'check' }) : ui.badge(o.estado, 'warn', { dot: true })) },
        { label: '', align: 'num', render: (o) => (o.estado !== 'Recibida' ? '<button class="btn xs" data-act="recv" data-id="' + o.id + '">' + ic('package-check') + 'Recibir</button>' : '') },
      ], list, { empty: { ill: 'default', title: 'Sin órdenes', text: 'Generá una orden desde los artículos bajo el mínimo.' } }) + '</div></section>';
    ui.on(p, {
      order: () => orderFlow(),
      recv: (t) => {
        const o = BT.db.purchases.find((x) => x.id === t.dataset.id);
        o.estado = 'Recibida';
        let det = '';
        (o.lines || []).forEach((l) => { const it = BT.db.stock.find((s) => s.id === l.itemId); if (it) { it.stock += l.qty; det += it.item + ' +' + l.qty + '; '; } });
        BT.audit('Modificó', 'Orden de compra recibida', { sede: o.sede, detail: supplier(o.proveedorId).nombre + (det ? ' · ' + det : '') });
        BT.save(); BT.refresh();
        ui.toast('Orden recibida', { sub: o.lines ? 'El stock se actualizó automáticamente' : supplier(o.proveedorId).nombre, icon: 'package-check' });
      },
    });
  }
  function orderFlow() {
    const low = lowItems(); if (!low.length) return;
    const bySup = u.groupBy(low, (s) => s.proveedorId + '|' + s.sede);
    const sug = (s) => Math.max(1, Math.ceil(s.minimo * 2 - s.stock));
    ui.modal({
      title: 'Generar órdenes de compra', sub: low.length + ' artículos bajo el mínimo · cantidades sugeridas para llegar al doble del mínimo', icon: 'shopping-cart', size: 'lg',
      body: Object.entries(bySup).map(([k, arr]) => {
        const [pid, sede] = k.split('|'); const sp = supplier(pid);
        return '<div class="card mb-16" style="box-shadow:none"><div class="card-h"><div><h3 style="font-size:var(--fs-md)">' + ic('truck') + esc(sp.nombre) + ' ' + BT.sedeTag(sede) + '</h3><div class="sub">' + esc(sp.contacto || '') + ' · ' + esc(sp.tel || '') + ' · Pago a ' + esc(sp.plazo || '—') + '</div></div></div><div class="card-b" style="padding-top:10px">' +
          arr.map((s) => '<div class="row between" style="padding:6px 0;border-bottom:1px solid var(--ink-100)"><div class="grow"><div class="strong" style="font-size:var(--fs-md)">' + esc(s.item) + '</div><div class="muted" style="font-size:var(--fs-xs)">Stock ' + u.fmtNum(s.stock) + ' · mínimo ' + u.fmtNum(s.minimo) + ' · ' + u.fmtMoney(s.costo) + ' c/u</div></div><input class="input ins-qty num" type="number" min="0" data-item="' + s.id + '" value="' + sug(s) + '"><span class="muted" style="width:62px;font-size:var(--fs-xs)">' + esc(s.unidad) + '</span></div>').join('') +
          '</div></div>';
      }).join('') + '<div class="row between"><span class="muted">Total estimado</span><span class="strong num" id="ocTot" style="font-size:var(--fs-xl)"></span></div>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>' + ic('send') + 'Emitir órdenes</button>',
      onMount: (m, close) => {
        const tot = () => { const t = u.sum([...m.querySelectorAll('[data-item]')], (i) => (+i.value || 0) * BT.db.stock.find((s) => s.id === i.dataset.item).costo); m.querySelector('#ocTot').textContent = u.fmtMoney(t); return t; };
        tot(); m.querySelectorAll('[data-item]').forEach((i) => i.addEventListener('input', tot));
        m.querySelector('[data-save]').addEventListener('click', () => {
          let n = 0;
          Object.entries(bySup).forEach(([k, arr]) => {
            const [pid, sede] = k.split('|');
            const lines = arr.map((s) => ({ itemId: s.id, qty: Math.max(0, +m.querySelector('[data-item="' + s.id + '"]').value || 0) })).filter((l) => l.qty > 0);
            if (!lines.length) return;
            const total = u.sum(lines, (l) => l.qty * BT.db.stock.find((s) => s.id === l.itemId).costo);
            BT.db.purchases.push({ id: u.uid('oc'), proveedorId: pid, sede, fecha: u.todayIso(), items: lines.map((l) => BT.db.stock.find((s) => s.id === l.itemId).item + ' × ' + u.fmtNum(l.qty)).join(', '), total: Math.round(total), estado: 'Pendiente de entrega', lines });
            n++;
          });
          BT.audit('Creó', 'Órdenes de compra', { detail: n + ' órdenes por ' + u.fmtMoney(tot()) });
          BT.save(); close(); BT.state.sub.ins = 'ordenes'; BT.refresh();
          ui.toast(n + ' orden' + (n === 1 ? '' : 'es') + ' emitida' + (n === 1 ? '' : 's'), { sub: 'Enviadas a los proveedores por correo (simulado)', icon: 'send' });
        });
      },
    });
  }

  /* ---------------- Proveedores ---------------- */
  function renderProv(p) {
    p.innerHTML = '<div class="grid g-3 stagger">' + BT.db.suppliers.map((s) => {
      const ocs = BT.bySede(BT.db.purchases).filter((o) => o.proveedorId === s.id);
      const items = BT.bySede(BT.db.stock).filter((i) => i.proveedorId === s.id);
      const low = items.filter((i) => i.stock < i.minimo).length;
      return '<section class="card hover ins-sup"><div class="top">' + ui.avatar(s.nombre, { size: 'lg', sq: true }) + '<div class="grow" style="min-width:0"><div class="strong ellipsis">' + esc(s.nombre) + '</div><div class="muted" style="font-size:var(--fs-sm)">' + esc(s.rubro) + '</div></div>' + (low ? ui.badge(low + ' a reponer', 'warn', { dot: true }) : '') + '</div>' +
        ui.kv([['Contacto', esc(s.contacto)], ['Teléfono', '<span class="num">' + esc(s.tel) + '</span>'], ['Correo', '<span style="font-size:var(--fs-sm)">' + esc(s.email) + '</span>'], ['RUT', '<span class="num">' + esc(s.rut) + '</span>'], ['Plazo de pago', esc(s.plazo)]]) +
        '<div class="row between" style="border-top:1px solid var(--line);padding-top:10px"><span class="muted" style="font-size:var(--fs-sm)">' + ocs.length + ' órdenes · ' + items.length + ' artículos</span><span class="strong num">' + u.fmtMoney(u.sum(ocs, 'total')) + '</span></div></section>';
    }).join('') + '</div>';
  }

  /* ---------------- Exportaciones ---------------- */
  function exportStock() {
    const rows = BT.bySede(BT.db.stock).map((s) => ({ sede: s.sede, categoria: s.categoria, item: s.item, unidad: s.unidad, stock: s.stock, minimo: s.minimo, costo: s.costo, valor: s.stock * s.costo, estado: s.stock < s.minimo * 0.5 ? 'Crítico' : s.stock < s.minimo ? 'Bajo mínimo' : 'OK', proveedor: supplier(s.proveedorId).nombre }));
    BT.xlsx({ filename: 'Stock de insumos - ' + BT.sedeLabel() + ' - ' + u.todayIso(), title: 'Stock de insumos', subtitle: 'Al ' + u.fmtDate(new Date()), sheets: [{ name: 'Stock', columns: [
      { header: 'Sede', key: 'sede', width: 8 }, { header: 'Categoría', key: 'categoria', width: 14 }, { header: 'Artículo', key: 'item', width: 40 }, { header: 'Unidad', key: 'unidad', width: 10 },
      { header: 'Stock', key: 'stock', width: 10, fmt: 'int' }, { header: 'Mínimo', key: 'minimo', width: 10, fmt: 'int' }, { header: 'Costo unitario', key: 'costo', width: 15, fmt: 'money' }, { header: 'Valor', key: 'valor', width: 15, fmt: 'money' }, { header: 'Estado', key: 'estado', width: 13 }, { header: 'Proveedor', key: 'proveedor', width: 36 },
    ], rows, totals: { valor: 'sum' } }] });
  }
  function exportCons() {
    const mes = BT.state.sub.insMes || curYM();
    const rows = consRows(mes).map((x) => ({ residente: BT.fullName(x.r), sede: x.r.sede, hab: x.r.habitacion + x.r.cama, item: x.it.item, cantidad: x.c.cantidad, concepto: x.concepto, importe: x.monto, estado: x.ok ? 'Facturado' : 'Pendiente' }));
    BT.xlsx({ filename: 'Consumo por residente - ' + mes, title: 'Consumo de insumos por residente', subtitle: u.cap(u.fmtMonth(mes)), sheets: [{ name: 'Consumo', columns: [
      { header: 'Residente', key: 'residente', width: 30 }, { header: 'Sede', key: 'sede', width: 8 }, { header: 'Hab.', key: 'hab', width: 8 }, { header: 'Artículo', key: 'item', width: 30 }, { header: 'Cantidad', key: 'cantidad', width: 11, fmt: 'int' }, { header: 'Concepto', key: 'concepto', width: 22 }, { header: 'Importe', key: 'importe', width: 14, fmt: 'money' }, { header: 'Cobranzas', key: 'estado', width: 12 },
    ], rows, totals: { cantidad: 'sum', importe: 'sum' } }] });
  }

  /* ---------------- Alertas ---------------- */
  BT.addAlerts(() => ['BT1', 'BT2'].map((sede) => {
    const low = BT.db.stock.filter((s) => s.sede === sede && s.stock < s.minimo);
    if (!low.length) return null;
    const crit = low.some((s) => s.stock < s.minimo * 0.5);
    return { id: 'ins-' + sede, tone: crit ? 'warn' : 'info', icon: 'package', title: low.length + ' insumo' + (low.length > 1 ? 's' : '') + ' bajo el mínimo · ' + sede, desc: low.slice(0, 3).map((s) => s.item).join(', ') + (low.length > 3 ? '…' : ''), tab: 'insumos', sede, roles: ['direccion', 'administracion', 'enfermeria'] };
  }).filter(Boolean));

  BT.tab({ id: 'insumos', label: 'Insumos y compras', icon: 'boxes', group: 'admin', order: 12, roles: ['direccion', 'administracion', 'enfermeria'], badge: () => lowItems().length, render });
})();

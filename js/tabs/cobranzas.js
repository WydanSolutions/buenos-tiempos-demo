/* ==========================================================================
   Cobranzas — cuotas, extras, estado de cuenta, recibos, garantías, e-Factura
   ========================================================================== */
(function () {
  'use strict';
  const BT = window.BT; const u = BT.u; const ui = BT.ui; const ic = BT.ic; const esc = u.esc;
  const C = (BT.cob = {});

  /* Para la demo: algunas e-Facturas del mes en curso quedan pendientes de emitir */
  const origSeed = BT.seed;
  BT.seed = function () {
    const db = origSeed.apply(this, arguments);
    const cur = u.ym(u.today());
    const pend = ['r2', 'r5', 'r9', 'r15', 'r21', 'r25', 'r27'];
    db.invoices = db.invoices.filter((i) => !(i.mes === cur && pend.includes(i.residentId)));
    db.invoices.forEach((i, k) => { i.cae = '9024' + String(1180000 + k * 37).padStart(7, '0'); i.serie = 'A'; });
    return db;
  };

  BT.addCSS('cobranzas', `
    .cob-filter{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:14px 20px 0}
    .cob-filter .input{max-width:260px;min-height:34px;height:34px;padding:0 12px 0 34px}
    .cob-filter .sw{position:relative}
    .cob-filter .sw .ic{position:absolute;left:11px;top:9px;color:var(--ink-400);width:16px;height:16px}
    .aging{padding:16px 18px;display:flex;flex-direction:column;gap:8px}
    .aging .v{font-size:22px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
    .aging .l{font-size:var(--fs-sm);color:var(--ink-500);font-weight:500}
    .mv-month td{background:var(--surface-2);font-weight:650;color:var(--ink-700);font-size:var(--fs-xs);letter-spacing:.05em;text-transform:uppercase}
    .mv-pay td{color:var(--ok)}
    .page[data-tab="cobranzas"] .card-h,.page[data-tab="finanzas"] .card-h,.page[data-tab="familias"] .card-h{flex-wrap:wrap}
    .cfe{border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden;background:#fff}
    .cfe-h{display:flex;justify-content:space-between;gap:12px;padding:16px 18px;background:linear-gradient(135deg,var(--brand-50),#fff);border-bottom:1px dashed var(--line-strong)}
    .cfe-b{padding:14px 18px}
    .cfe-row{display:flex;justify-content:space-between;padding:5px 0;font-size:var(--fs-md)}
    .cfe-row b{font-variant-numeric:tabular-nums}
    .cfe-foot{display:flex;gap:14px;align-items:center;padding:14px 18px;border-top:1px dashed var(--line-strong);background:var(--surface-2);font-size:var(--fs-xs);color:var(--ink-600)}
    .qr{width:84px;height:84px;flex:none;background:#fff;border:1px solid var(--line);border-radius:8px;padding:5px}
    .emit-steps{display:flex;flex-direction:column;gap:12px;margin:6px 0 4px}
    .emit-step{display:flex;align-items:center;gap:12px;font-size:var(--fs-md);color:var(--ink-400);transition:color var(--d) var(--ease)}
    .emit-step .es-ic{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;border:2px solid var(--ink-200);transition:all var(--d) var(--ease-spring);flex:none}
    .emit-step.run{color:var(--ink-900)} .emit-step.run .es-ic{border-color:var(--brand-400);border-top-color:transparent;animation:spin 800ms linear infinite}
    .emit-step.done{color:var(--ink-900)} .emit-step.done .es-ic{background:var(--brand-600);border-color:var(--brand-600);color:#fff;animation:pop 400ms var(--ease-spring)}
    @keyframes spin{to{transform:rotate(360deg)}}
    .pay-ok{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:14px 0 6px}
    .pay-ok .dose{--sz:64px;border-radius:50%}
    .pay-ok .dose svg.chk{width:32px;height:32px}
    .pay-ok .amt{font-size:28px;font-weight:700;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
  `);

  /* ---------------- Cálculos ---------------- */
  C.curMes = () => u.ym(u.today());
  C.dueDate = (mes) => mes + '-' + u.pad(BT.db.settings.dueDay);
  C.chargesOf = (rid, mes) => BT.db.charges.filter((c) => c.residentId === rid && !c.garantia && (!mes || c.mes === mes));
  C.totalMes = (rid, mes) => u.sum(C.chargesOf(rid, mes), 'monto');
  C.cuotaMes = (rid, mes) => u.sum(C.chargesOf(rid, mes).filter((c) => c.concepto === 'Cuota mensual'), 'monto');
  /** Estado de un mes: Pagado | Parcial | Pendiente | Vencido */
  C.statusMes = (rid, mes) => {
    const tot = C.totalMes(rid, mes); if (!tot) return { label: 'Sin cargos', tone: '' };
    const un = BT.account(rid).unpaid.find((x) => x.mes === mes);
    if (!un) return { label: 'Pagado', tone: 'ok', icon: 'check' };
    const vencido = C.dueDate(mes) < u.todayIso();
    if (un.monto < tot) return { label: vencido ? 'Parcial vencido' : 'Pago parcial', tone: vencido ? 'danger' : 'warn', icon: 'circle-dashed', resta: un.monto };
    return vencido ? { label: 'Vencido', tone: 'danger', icon: 'circle-alert', resta: un.monto } : { label: 'Pendiente', tone: 'warn', icon: 'clock', resta: un.monto };
  };
  C.aging = (rid) => BT.account(rid).unpaid.filter((x) => C.dueDate(x.mes) < u.todayIso()).map((x) => Object.assign({ dias: u.daysBetween(C.dueDate(x.mes), u.today()) }, x));
  C.residents = () => BT.bySede(BT.db.residents.filter((r) => r.estado === 'activo')).sort((a, b) => (a.sede + a.habitacion.padStart(2, '0') + a.cama).localeCompare(b.sede + b.habitacion.padStart(2, '0') + b.cama));
  C.morosos = () => C.residents().map((r) => ({ r, a: BT.account(r.id), ag: C.aging(r.id) })).filter((x) => x.a.vencido > 0).sort((a, b) => b.a.vencido - a.a.vencido);
  C.nextRecibo = () => 'R-' + String(Math.max(0, ...BT.db.payments.map((p) => parseInt(String(p.recibo).replace(/\D/g, ''), 10) || 0)) + 1).padStart(6, '0');
  C.pendingInvoices = (sedeFilter = true) => {
    const mes = C.curMes();
    const list = sedeFilter ? C.residents() : BT.db.residents.filter((r) => r.estado === 'activo');
    return list.filter((r) => C.totalMes(r.id, mes) > 0 && !BT.db.invoices.some((i) => i.residentId === r.id && i.mes === mes));
  };
  /** Imputación FIFO de un pago concreto a los meses adeudados */
  C.imputacion = (pid) => {
    const p = BT.db.payments.find((x) => x.id === pid); if (!p || p.garantia) return [];
    const pays = BT.db.payments.filter((x) => x.residentId === p.residentId && !x.garantia).sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.recibo > b.recibo ? 1 : -1));
    let before = u.sum(pays.slice(0, pays.indexOf(p)), 'monto'); let rest = p.monto; const out = [];
    const byM = u.groupBy(C.chargesOf(p.residentId), 'mes');
    Object.keys(byM).sort().forEach((mes) => {
      let t = u.sum(byM[mes], 'monto');
      const cov = Math.min(before, t); before -= cov; t -= cov;
      if (t > 0 && rest > 0) { const a = Math.min(t, rest); out.push({ mes, monto: a }); rest -= a; }
    });
    if (rest > 0.5) out.push({ mes: null, monto: rest });
    return out;
  };

  /** Número a letras (pesos uruguayos) */
  C.letras = function (n) {
    n = Math.round(n);
    const U = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
    const D = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const CC = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
    const tri = (x) => { if (x === 0) return ''; if (x === 100) return 'cien'; const c = Math.floor(x / 100), r = x % 100; let s = CC[c]; if (r) { s += (s ? ' ' : '') + (r < 30 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? ' y ' + U[r % 10] : '')); } return s; };
    if (n === 0) return 'cero';
    const mill = Math.floor(n / 1e6), miles = Math.floor((n % 1e6) / 1000), resto = n % 1000;
    let s = '';
    if (mill) s += (mill === 1 ? 'un millón' : tri(mill).replace(/uno$/, 'un') + ' millones') + ' ';
    if (miles) s += (miles === 1 ? 'mil' : tri(miles).replace(/uno$/, 'ún').replace(/veintiún$/, 'veintiún') + ' mil') + ' ';
    s += tri(resto);
    return s.trim();
  };

  /** QR decorativo determinístico (placeholder del código DGI) */
  C.qr = function (seed) {
    const N = 21; let h = u.hash(seed) || 7; const rnd = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
    let r = '';
    const finder = (x, y) => '<rect x="' + x + '" y="' + y + '" width="7" height="7" fill="#262625"/><rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="5" height="5" fill="#fff"/><rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="3" height="3" fill="#262625"/>';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const inF = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12); if (!inF && rnd() > 0.52) r += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>'; }
    return '<svg class="qr" viewBox="0 0 ' + N + ' ' + N + '" shape-rendering="crispEdges"><g fill="#262625">' + r + '</g>' + finder(0, 0) + finder(14, 0) + finder(0, 14) + '</svg>';
  };

  /* ---------------- Acciones ---------------- */
  C.registrarPago = function (rid) {
    if (!BT.can('money.write')) return ui.toast('Tu rol no puede registrar pagos', { type: 'warn' });
    const list = C.residents();
    let sel = rid || (list[0] && list[0].id);
    const MEDIOS = ['Transferencia BROU', 'Transferencia Itaú', 'Transferencia Santander', 'Depósito', 'Débito automático', 'Efectivo', 'Tarjeta de débito'];
    const formHtml = () => {
      const a = BT.account(sel);
      const sug = a.vencido || Math.max(0, a.saldo);
      return '<div class="form-grid">' +
        ui.field({ label: 'Residente', name: 'rid', type: 'select', value: sel, required: true, full: true, options: list.map((r) => ({ v: r.id, l: BT.fullName(r) + ' · ' + r.sede + ' · Hab. ' + r.habitacion + r.cama })) }) +
        '<div class="full kv-cards" id="pgInfo">' + C.miniCards(sel) + '</div>' +
        ui.field({ label: 'Monto recibido ($U)', name: 'monto', type: 'number', value: sug || '', required: true, attrs: 'min="1" step="10" inputmode="numeric"', hint: sug ? 'Sugerido: ' + (a.vencido ? 'deuda vencida' : 'saldo de la cuenta') : 'La cuenta está al día' }) +
        ui.field({ label: 'Fecha', name: 'fecha', type: 'date', value: u.todayIso(), required: true }) +
        ui.field({ label: 'Medio de pago', name: 'medio', type: 'chips', value: MEDIOS[0], options: MEDIOS, required: true, full: true }) +
        ui.field({ label: 'Observaciones', name: 'nota', type: 'text', placeholder: 'Ej.: transferencia desde cuenta de la hija', full: true }) +
        '</div>';
    };
    ui.modal({
      title: 'Registrar pago', sub: 'Se imputa automáticamente a los meses más antiguos (FIFO)', icon: 'banknote', size: 'lg', body: formHtml(),
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>' + ic('check') + 'Registrar y emitir recibo</button>',
      onMount: (el, close) => {
        el.addEventListener('change', (e) => { if (e.target.name === 'rid') { sel = e.target.value; const a = BT.account(sel); el.querySelector('#pgInfo').innerHTML = C.miniCards(sel); el.querySelector('[name=monto]').value = a.vencido || Math.max(0, a.saldo) || ''; } });
        el.querySelector('[data-save]').addEventListener('click', () => {
          const b = el.querySelector('.modal-b');
          if (!ui.validate(b)) return;
          const d = ui.formData(b); const monto = Math.round(Number(d.monto));
          if (!(monto > 0)) { el.querySelector('[name=monto]').classList.add('invalid'); return; }
          const r = BT.resident(d.rid);
          const p = { id: u.uid('pg'), residentId: r.id, sede: r.sede, fecha: d.fecha, monto, medio: d.medio, recibo: C.nextRecibo(), nota: d.nota, userId: BT.state.user.id };
          BT.db.payments.push(p);
          BT.audit('Registró pago', 'Cobranzas', { residentId: r.id, detail: p.recibo + ' · ' + u.fmtMoney(monto) + ' · ' + p.medio });
          BT.save();
          const a = BT.account(r.id);
          b.innerHTML = '<div class="pay-ok"><span class="dose done">' + BT.check + '</span><div class="muted">Pago registrado · Recibo ' + p.recibo + '</div><div class="amt">' + u.fmtMoney(monto) + '</div><div class="muted" style="font-size:var(--fs-sm)">' + esc(BT.fullName(r)) + ' · ' + esc(p.medio) + '</div>' +
            '<div class="row mt-8">' + (a.saldo <= 0 ? ui.badge('Cuenta al día', 'ok', { icon: 'circle-check', lg: true }) : ui.badge('Saldo restante ' + u.fmtMoney(a.saldo), a.vencido ? 'danger' : 'warn', { lg: true })) + '</div></div>';
          el.querySelector('.modal-f').innerHTML = '<button class="btn ghost" data-close>Listo</button><button class="btn primary" data-rec>' + ic('file-text') + 'Ver recibo</button>';
          el.querySelector('[data-rec]').addEventListener('click', () => { close(); C.reciboPDF(p.id); });
          ui.toast('Pago registrado', { sub: p.recibo + ' · ' + u.fmtMoney(monto) });
          BT.refresh(); BT.shell.updateNav();
          C._afterPay && C._afterPay(r.id);
        });
      },
    });
  };
  C.miniCards = (rid) => {
    const a = BT.account(rid); const r = BT.resident(rid);
    return '<div class="kv-card"><div class="k">' + ic('wallet', 'ic-xs') + 'Saldo de la cuenta</div><div class="v num">' + u.fmtMoney(a.saldo) + '</div></div>' +
      '<div class="kv-card"><div class="k">' + ic('circle-alert', 'ic-xs') + 'Deuda vencida</div><div class="v num ' + (a.vencido ? 't-danger' : '') + '">' + u.fmtMoney(a.vencido) + (a.mesesAdeudados ? ' <span class="subtle" style="font-weight:500">(' + a.mesesAdeudados + (a.mesesAdeudados === 1 ? ' mes' : ' meses') + ')</span>' : '') + '</div></div>' +
      '<div class="kv-card"><div class="k">' + ic('user-round', 'ic-xs') + 'Referente</div><div class="v">' + esc(r.referente.nombre) + '</div></div>';
  };

  /** Recordatorio de pago por WhatsApp (simulado) */
  C.recordatorio = function (rid) {
    const r = BT.resident(rid); const a = BT.account(rid);
    const txt = 'Hola ' + r.referente.nombre.split(' ')[0] + ', te escribimos de Residencial Buenos Tiempos. Te recordamos que la cuenta de ' + r.nombre.split(' ')[0] + ' registra un saldo vencido de ' + u.fmtMoney(a.vencido) + '. Podés abonar por transferencia a la cuenta BROU 001-234567-00001 indicando el nombre del residente. ¡Muchas gracias!';
    if (BT.fam && BT.fam.whatsapp) return BT.fam.whatsapp({ to: [r.referente.nombre + ' · ' + r.referente.tel], text: txt, title: 'Recordatorio de pago', after: () => BT.audit('Envió recordatorio', 'Cobranzas', { residentId: rid, detail: 'WhatsApp a ' + r.referente.nombre }) });
    ui.toast('Recordatorio enviado por WhatsApp', { sub: r.referente.nombre + ' · ' + r.referente.tel, icon: 'message-circle' });
  };

  /* ---------------- Estado de cuenta (drawer) ---------------- */
  C.movements = (rid) => {
    const ch = C.chargesOf(rid).map((c) => ({ fecha: c.mes + '-01', mes: c.mes, concepto: c.concepto + (c.cantidad ? ' (' + u.fmtNum(c.cantidad) + ' u.)' : ''), cargo: c.monto, abono: 0, ord: 0 }));
    const pg = BT.db.payments.filter((p) => p.residentId === rid && !p.garantia).map((p) => ({ fecha: p.fecha, mes: p.fecha.slice(0, 7), concepto: 'Pago · ' + p.medio + ' · ' + p.recibo, cargo: 0, abono: p.monto, ord: 1, pid: p.id }));
    const all = ch.concat(pg).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.ord - b.ord);
    let s = 0; all.forEach((m) => { s += m.cargo - m.abono; m.saldo = s; });
    return all;
  };
  C.openAccount = function (rid) {
    const r = BT.resident(rid); if (!r) return;
    BT.audit('Abrió', 'Estado de cuenta', { residentId: rid });
    const body = () => {
      const a = BT.account(rid); const mv = C.movements(rid); const g = BT.db.charges.find((c) => c.residentId === rid && c.garantia);
      let lastMes = '';
      const ordered = [...new Set(mv.map((m) => m.mes))].sort().reverse().flatMap((mes) => mv.filter((m) => m.mes === mes));
      const rows = ordered.map((m) => {
        let head = '';
        if (m.mes !== lastMes) { lastMes = m.mes; head = '<tr class="mv-month"><td colspan="4">' + u.cap(u.fmtMonth(m.mes)) + '</td></tr>'; }
        return head + '<tr class="' + (m.abono ? 'mv-pay' : '') + '"><td class="nowrap">' + u.fmtDate(m.fecha) + '</td><td>' + esc(m.concepto) + (m.pid ? ' <button class="btn xs ghost" data-act="rec" data-id="' + m.pid + '" data-tip="Ver recibo">' + ic('file-text') + '</button>' : '') + '</td><td class="num">' + (m.cargo ? u.fmtMoney(m.cargo) : '<b>− ' + u.fmtMoney(m.abono).replace('−', '') + '</b>') + '</td><td class="num">' + u.fmtMoney(m.saldo) + '</td></tr>';
      }).join('');
      return '<div class="kv-cards stagger" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' +
        '<div class="kv-card"><div class="k">' + ic('wallet', 'ic-xs') + 'Saldo</div><div class="v num" style="font-size:18px">' + u.fmtMoney(a.saldo) + '</div></div>' +
        '<div class="kv-card"><div class="k">' + ic('circle-alert', 'ic-xs') + 'Vencido</div><div class="v num ' + (a.vencido ? 't-danger' : 't-ok') + '" style="font-size:18px">' + u.fmtMoney(a.vencido) + '</div></div>' +
        '<div class="kv-card"><div class="k">' + ic('house', 'ic-xs') + 'Cuota mensual</div><div class="v num" style="font-size:18px">' + u.fmtMoney(r.cuota) + '</div></div>' +
        '<div class="kv-card"><div class="k">' + ic('shield-check', 'ic-xs') + 'Depósito de garantía</div><div class="v num" style="font-size:18px">' + u.fmtMoney(g ? g.monto : r.deposito) + '</div></div></div>' +
        (a.vencido ? '<div class="alert danger mt-16">' + ic('circle-alert') + '<div><b>' + a.mesesAdeudados + (a.mesesAdeudados === 1 ? ' mes vencido' : ' meses vencidos') + '.</b> Vencimiento el día ' + BT.db.settings.dueDay + ' de cada mes. Antigüedad de la deuda: ' + Math.max(0, ...C.aging(rid).map((x) => x.dias)) + ' días.</div></div>' : '<div class="alert ok mt-16">' + ic('circle-check') + '<div><b>Cuenta al día.</b> ' + (a.saldo > 0 ? 'Hay ' + u.fmtMoney(a.saldo) + ' del mes en curso, con vencimiento el ' + u.fmtDate(C.dueDate(C.curMes())) + '.' : 'Sin saldos pendientes.') + '</div></div>') +
        '<div class="row wrap mt-16">' + (BT.can('money.write') ? '<button class="btn primary" data-act="pay">' + ic('banknote') + 'Registrar pago</button>' : '') + '<button class="btn" data-act="pdf">' + ic('file-text') + 'Estado de cuenta PDF</button>' + (a.vencido ? '<button class="btn" data-act="wa">' + ic('message-circle') + 'Enviar recordatorio</button>' : '') + '</div>' +
        '<div class="card mt-16"><div class="card-h"><h3>' + ic('list') + 'Movimientos</h3><span class="muted" style="font-size:var(--fs-xs)">Últimos 6 meses · mes más reciente primero</span></div><div class="card-b flush"><div class="table-wrap"><table class="table compact"><thead><tr><th>Fecha</th><th>Concepto</th><th class="num">Importe</th><th class="num">Saldo</th></tr></thead><tbody>' + rows + '</tbody></table></div></div></div>';
    };
    ui.drawer({
      head: '<div class="row gap-16">' + ui.avatar(BT.fullName(r), { size: 'lg' }) + '<div><div class="muted" style="font-size:var(--fs-xs);font-weight:600;letter-spacing:.06em;text-transform:uppercase">Estado de cuenta</div><h3 style="font-size:var(--fs-xl)">' + esc(BT.fullName(r)) + '</h3><div class="muted" style="font-size:var(--fs-sm)">' + BT.sedeTag(r.sede) + ' Hab. ' + r.habitacion + r.cama + ' · Referente: ' + esc(r.referente.nombre) + ' (' + esc(r.referente.vinculo) + ') · ' + esc(r.referente.tel) + '</div></div></div>',
      body: body(),
      onMount: (d) => {
        const b = d.querySelector('.drawer-b');
        C._afterPay = (id) => { if (id === rid && document.body.contains(b)) { b.innerHTML = body(); ui.enhance(b); } };
        ui.on(d, { pay: () => C.registrarPago(rid), pdf: () => C.estadoCuentaPDF(rid), wa: () => C.recordatorio(rid), rec: (t) => C.reciboPDF(t.dataset.id) });
      },
    });
  };

  /* ---------------- Documentos ---------------- */
  C.estadoCuentaPDF = function (rid) {
    const D = BT.doc; const r = BT.resident(rid); const a = BT.account(rid); const mv = C.movements(rid);
    const g = BT.db.charges.find((c) => c.residentId === rid && c.garantia);
    const months = [...new Set(mv.map((m) => m.mes))].sort();
    const resumen = months.map((mes) => ({ mes, cargos: u.sum(mv.filter((m) => m.mes === mes), 'cargo'), pagos: u.sum(mv.filter((m) => m.mes === mes), 'abono'), st: C.statusMes(rid, mes) }));
    const body =
      D.kv([['Residente', esc(BT.fullName(r))], ['Cédula', u.fmtCI(r.ci)], ['Sede y habitación', esc(BT.sedeName(r.sede)) + ' · Hab. ' + r.habitacion + r.cama], ['Referente', esc(r.referente.nombre) + ' (' + esc(r.referente.vinculo) + ')'], ['Cuota mensual', D.money(r.cuota)], ['Depósito de garantía', D.money(g ? g.monto : r.deposito) + ' · en custodia']], 3) +
      D.kpis([{ label: 'Cargos del período', value: u.fmtMoney(a.cargos) }, { label: 'Pagos recibidos', value: u.fmtMoney(a.pagos) }, { label: 'Saldo', value: u.fmtMoney(a.saldo) }, { label: 'Deuda vencida', value: u.fmtMoney(a.vencido), sub: a.mesesAdeudados ? a.mesesAdeudados + ' mes(es)' : 'Al día' }]) +
      D.section('Resumen por mes', D.table([
        { label: 'Mes', render: (x) => u.cap(u.fmtMonth(x.mes)) }, { label: 'Cargos', align: 'num', render: (x) => u.fmtMoney(x.cargos) }, { label: 'Pagos', align: 'num', render: (x) => u.fmtMoney(x.pagos) },
        { label: 'Estado', align: 'center', render: (x) => D.badge(x.st.label, x.st.tone) },
      ], resumen, { compact: true })) +
      D.section('Detalle de movimientos', D.table([
        { label: 'Fecha', render: (m) => u.fmtDate(m.fecha), width: '78px' }, { label: 'Concepto', render: (m) => esc(m.concepto) },
        { label: 'Cargo', align: 'num', render: (m) => (m.cargo ? u.fmtMoney(m.cargo) : '') }, { label: 'Pago', align: 'num', render: (m) => (m.abono ? u.fmtMoney(m.abono) : '') }, { label: 'Saldo', align: 'num', render: (m) => u.fmtMoney(m.saldo) },
      ], mv, { compact: true, foot: '<tr><td></td><td>Totales</td><td class="num">' + u.fmtMoney(a.cargos) + '</td><td class="num">' + u.fmtMoney(a.pagos) + '</td><td class="num">' + u.fmtMoney(a.saldo) + '</td></tr>' })) +
      D.note('<b>Formas de pago:</b> transferencia a la cuenta BROU 001-234567-00001 a nombre de Galauru SAS, indicando el nombre del residente; débito automático o efectivo en administración (lunes a viernes de 9 a 17). Vencimiento: día ' + BT.db.settings.dueDay + ' de cada mes. Las e-Facturas se envían por correo electrónico al referente.');
    D.open({ title: 'Estado de cuenta', subtitle: esc(BT.fullName(r)) + ' · al ' + u.fmtDate(u.today()), sede: r.sede, kicker: 'Cobranzas', code: 'EC-' + rid.toUpperCase() + '-' + C.curMes().replace('-', ''), body, residentId: rid, filename: 'Estado de cuenta ' + BT.fullName(r) });
  };
  C.reciboPDF = function (pid) {
    const D = BT.doc; const p = BT.db.payments.find((x) => x.id === pid); if (!p) return;
    const r = BT.resident(p.residentId); const imp = C.imputacion(pid);
    const words = C.letras(p.monto);
    const concepto = imp.length ? imp.map((x) => (x.mes ? 'cuota y extras de ' + u.fmtMonth(x.mes) : 'saldo a favor') + ' (' + u.fmtMoney(x.monto) + ')').join('; ') : 'pago a cuenta';
    const body =
      '<div style="margin-top:22px;border:1.5px solid #297040;border-radius:14px;overflow:hidden;break-inside:avoid">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;background:linear-gradient(135deg,#f1f8f3,#fff)"><div><div style="font-size:7.5pt;letter-spacing:.12em;text-transform:uppercase;color:#7b7770;font-weight:700">Recibo de pago</div><div style="font-size:20pt;font-weight:750;letter-spacing:-.02em">' + esc(p.recibo) + '</div></div>' +
      '<div style="text-align:right"><div style="font-size:7.5pt;letter-spacing:.12em;text-transform:uppercase;color:#7b7770;font-weight:700">Importe</div><div class="num" style="font-size:22pt;font-weight:750;color:#226037;letter-spacing:-.02em">' + u.fmtMoney(p.monto) + '</div></div></div>' +
      '<div style="padding:16px 20px;font-size:10.5pt;line-height:1.7">Recibimos de <b>' + esc(r.referente.nombre) + '</b> la suma de <b>pesos uruguayos ' + esc(words) + '</b> (' + u.fmtMoney(p.monto) + ') por concepto de ' + esc(concepto) + ', correspondiente al/la residente <b>' + esc(BT.fullName(r)) + '</b>.</div></div>' +
      D.section('Datos del pago', D.kv([['Fecha de pago', u.fmtDate(p.fecha)], ['Medio de pago', esc(p.medio)], ['Residente', esc(BT.fullName(r))], ['Sede y habitación', esc(BT.sedeName(r.sede)) + ' · Hab. ' + r.habitacion + r.cama], ['Referente', esc(r.referente.nombre) + ' · CI ' + u.fmtCI(r.referente.ci || '1234567')], ['Saldo luego del pago', D.money(BT.account(r.id).saldo)]], 2)) +
      (imp.length ? D.section('Imputación', D.table([{ label: 'Período', render: (x) => (x.mes ? u.cap(u.fmtMonth(x.mes)) : 'Saldo a favor') }, { label: 'Importe imputado', align: 'num', render: (x) => u.fmtMoney(x.monto) }], imp, { compact: true, foot: '<tr><td>Total</td><td class="num">' + u.fmtMoney(p.monto) + '</td></tr>' })) : '') +
      D.signatures(['Por Galauru SAS — Administración', 'Recibí conforme']) +
      D.note('Este recibo acredita el pago. La e-Factura (CFE) correspondiente se emite electrónicamente y se envía al correo del referente.', '');
    D.open({ title: 'Recibo ' + p.recibo, subtitle: esc(BT.fullName(r)) + ' · ' + u.fmtDate(p.fecha), sede: r.sede, kicker: 'Cobranzas', code: p.recibo, body, residentId: r.id, filename: 'Recibo ' + p.recibo });
  };

  /* ---------------- e-Factura ---------------- */
  C.cfeCard = (inv) => {
    const r = BT.resident(inv.residentId); const s = BT.db.sedes.find((x) => x.id === inv.sede);
    const lines = C.chargesOf(inv.residentId, inv.mes);
    return '<div class="cfe"><div class="cfe-h"><div><div class="muted" style="font-size:var(--fs-xs);font-weight:600;letter-spacing:.06em;text-transform:uppercase">' + esc(inv.tipo) + ' · Serie ' + esc(inv.serie || 'A') + '</div><div style="font-size:20px;font-weight:700;letter-spacing:-.02em">Nº ' + esc(inv.nro.replace(/^A\s*/, '')) + '</div><div class="muted" style="font-size:var(--fs-sm)">' + esc(BT.db.meta.company) + ' · RUT ' + esc(BT.db.meta.rut) + '<br>' + esc(s ? s.direccion : '') + '</div></div>' +
      '<div style="text-align:right">' + ui.badge(inv.estado, inv.estado.includes('Aceptada') ? 'ok' : 'warn', { icon: 'badge-check' }) + '<div class="muted mt-8" style="font-size:var(--fs-sm)">Emisión ' + u.fmtDate(inv.fecha) + '<br>Período ' + u.fmtMonth(inv.mes) + '</div></div></div>' +
      '<div class="cfe-b"><div class="muted" style="font-size:var(--fs-sm);margin-bottom:8px">Receptor: <b style="color:var(--ink-900)">' + esc(r.referente.nombre) + '</b> por ' + esc(BT.fullName(r)) + ' (consumidor final)</div>' +
      lines.map((l) => '<div class="cfe-row"><span>' + esc(l.concepto) + (l.cantidad ? ' <span class="subtle">× ' + l.cantidad + '</span>' : '') + '</span><b>' + u.fmtMoney(l.monto) + '</b></div>').join('') +
      '<hr class="hr" style="margin:10px 0"><div class="cfe-row"><span class="muted">Neto gravado</span><b>' + u.fmtMoney(inv.neto) + '</b></div><div class="cfe-row"><span class="muted">IVA tasa mínima ' + Math.round(BT.db.settings.iva * 100) + ' %</span><b>' + u.fmtMoney(inv.iva) + '</b></div><div class="cfe-row" style="font-size:var(--fs-lg)"><span><b>Total</b></span><b>' + u.fmtMoney(inv.total) + '</b></div></div>' +
      '<div class="cfe-foot">' + C.qr(inv.nro) + '<div>Código de seguridad <b>' + esc((inv.cae || '').slice(-6)) + '</b><br>CAE Nº <b>' + esc(inv.cae || '—') + '</b> · Rango A 0000001 – A 0099999<br>Puede verificar el comprobante en <b>www.efactura.dgi.gub.uy</b><br>IVA al día · Resolución DGI (simulada para la demo)</div></div></div>';
  };
  C.emitir = function () {
    const pend = C.pendingInvoices();
    if (!pend.length) return ui.toast('No hay e-Facturas pendientes', { type: 'info', sub: 'Todo el mes está facturado' });
    const total = u.sum(pend, (r) => C.totalMes(r.id, C.curMes()));
    const steps = [['file-signature', 'Generando y firmando CFE con certificado digital'], ['send', 'Enviando a DGI'], ['badge-check', 'Recibiendo constancia de aceptación (CAE)'], ['mail', 'Enviando por correo a los referentes']];
    ui.modal({
      title: 'Emitir e-Facturas de ' + u.fmtMonth(C.curMes()), sub: pend.length + ' comprobantes (e-Ticket) por ' + u.fmtMoney(total) + ' · IVA ' + Math.round(BT.db.settings.iva * 100) + ' % incluido', icon: 'receipt',
      body: '<div class="list" style="margin:0 -24px 8px">' + pend.slice(0, 7).map((r) => '<div class="li" style="padding:8px 24px">' + ui.avatar(BT.fullName(r), { size: 'sm' }) + '<div class="grow"><div class="t">' + esc(BT.fullName(r)) + '</div><div class="d">' + r.sede + ' · Hab. ' + r.habitacion + r.cama + ' · ' + esc(r.referente.nombre) + '</div></div><b class="num">' + u.fmtMoney(C.totalMes(r.id, C.curMes())) + '</b></div>').join('') + '</div>' +
        '<div class="emit-steps hidden" id="emSteps">' + steps.map(([i, t]) => '<div class="emit-step"><span class="es-ic">' + ic(i, 'ic-sm') + '</span>' + t + '</div>').join('') + '</div><div class="bar mt-16 hidden" id="emBar"><span style="width:0;animation:none;transition:width 500ms var(--ease-out)"></span></div>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-go>' + ic('send') + 'Emitir ' + pend.length + ' e-Facturas</button>',
      onMount: (el, close) => {
        el.querySelector('[data-go]').addEventListener('click', (ev) => {
          ev.currentTarget.disabled = true; el.querySelector('[data-close]').disabled = true;
          el.querySelector('.list').style.display = 'none';
          const st = el.querySelector('#emSteps'); st.classList.remove('hidden'); const bar = el.querySelector('#emBar'); bar.classList.remove('hidden');
          const items = st.querySelectorAll('.emit-step'); let k = 0;
          const fast = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const next = () => {
            if (k > 0) { items[k - 1].classList.remove('run'); items[k - 1].classList.add('done'); items[k - 1].querySelector('.es-ic').innerHTML = ic('check', 'ic-sm'); }
            bar.firstElementChild.style.width = (k / items.length) * 100 + '%';
            if (k === items.length) return finish();
            items[k].classList.add('run'); items[k].querySelector('.es-ic').innerHTML = ''; k++;
            setTimeout(next, fast ? 30 : 650 + Math.random() * 250);
          };
          const finish = () => {
            const mes = C.curMes(); let n = Math.max(...BT.db.invoices.map((i) => parseInt(i.nro.replace(/\D/g, ''), 10) || 0));
            const created = pend.map((r) => {
              const tot = C.totalMes(r.id, mes); const neto = Math.round(tot / (1 + BT.db.settings.iva));
              const inv = { id: u.uid('fe'), nro: 'A ' + String(++n).padStart(7, '0'), tipo: 'e-Ticket', residentId: r.id, sede: r.sede, mes, neto, iva: tot - neto, total: tot, estado: 'Aceptada DGI', fecha: u.todayIso(), cae: '9024' + String(1190000 + n).padStart(7, '0'), serie: 'A' };
              BT.db.invoices.push(inv); return inv;
            });
            BT.audit('Emitió e-Facturas', 'Facturación electrónica', { detail: created.length + ' CFE · ' + created[0].nro + ' a ' + created[created.length - 1].nro });
            BT.save();
            setTimeout(() => { close(); ui.toast(created.length + ' e-Facturas aceptadas por DGI', { sub: created[0].nro + ' a ' + created[created.length - 1].nro, icon: 'badge-check' }); BT.state.sub.cob = 'efactura'; BT.refresh(); BT.shell.updateNav(); }, fast ? 0 : 500);
          };
          next();
        });
      },
    });
  };

  /* ---------------- Exportables Excel ---------------- */
  C.xlsxCuotas = function () {
    const mes = C.curMes();
    const rows = C.residents().map((r) => { const ch = C.chargesOf(r.id, mes); const st = C.statusMes(r.id, mes); const a = BT.account(r.id); return { res: BT.fullName(r), sede: r.sede, hab: r.habitacion + r.cama, ref: r.referente.nombre, cuota: u.sum(ch.filter((c) => c.concepto === 'Cuota mensual'), 'monto'), pan: u.sum(ch.filter((c) => c.concepto === 'Pañales'), 'monto'), med: u.sum(ch.filter((c) => c.concepto === 'Medicación'), 'monto'), serv: u.sum(ch.filter((c) => ['Peluquería', 'Podología', 'Insumos de enfermería'].includes(c.concepto)), 'monto'), total: u.sum(ch, 'monto'), estado: st.label, saldo: a.saldo, venc: u.toDate(C.dueDate(mes)) }; });
    const mor = C.morosos().map((x) => ({ res: BT.fullName(x.r), sede: x.r.sede, ref: x.r.referente.nombre, tel: x.r.referente.tel, meses: x.a.mesesAdeudados, venc: x.a.vencido, dias: Math.max(...x.ag.map((g) => g.dias)), desde: u.toDate(C.dueDate(x.ag[0].mes)) }));
    BT.xlsx({
      filename: 'Cobranzas ' + BT.sedeLabel() + ' ' + mes, title: 'Cuotas y morosidad', subtitle: u.cap(u.fmtMonth(mes)),
      sheets: [
        { name: 'Cuotas del mes', freezeCols: 1, columns: [{ header: 'Residente', key: 'res', width: 30 }, { header: 'Sede', key: 'sede', width: 7 }, { header: 'Hab.', key: 'hab', width: 7 }, { header: 'Referente', key: 'ref', width: 22 }, { header: 'Cuota', key: 'cuota', fmt: 'money', width: 13 }, { header: 'Pañales', key: 'pan', fmt: 'money', width: 12 }, { header: 'Medicación', key: 'med', fmt: 'money', width: 12 }, { header: 'Otros servicios', key: 'serv', fmt: 'money', width: 14 }, { header: 'Total del mes', key: 'total', fmt: 'money', width: 14 }, { header: 'Vencimiento', key: 'venc', fmt: 'date', width: 12 }, { header: 'Estado', key: 'estado', width: 15 }, { header: 'Saldo de la cuenta', key: 'saldo', fmt: 'money', width: 16 }], rows, totals: { cuota: 'sum', pan: 'sum', med: 'sum', serv: 'sum', total: 'sum', saldo: 'sum' } },
        { name: 'Morosidad', columns: [{ header: 'Residente', key: 'res', width: 30 }, { header: 'Sede', key: 'sede', width: 7 }, { header: 'Referente', key: 'ref', width: 22 }, { header: 'Teléfono', key: 'tel', width: 14 }, { header: 'Meses adeudados', key: 'meses', fmt: 'int', width: 14 }, { header: 'Vencido desde', key: 'desde', fmt: 'date', width: 13 }, { header: 'Días de atraso', key: 'dias', fmt: 'int', width: 13 }, { header: 'Deuda vencida', key: 'venc', fmt: 'money', width: 15 }], rows: mor, totals: { venc: 'sum' } },
      ],
    });
  };

  /* ---------------- Alertas ---------------- */
  BT.addAlerts(() => {
    if (!BT.isRole('direccion', 'administracion')) return [];
    const out = []; const m = C.morosos();
    if (m.length) {
      const tot = u.sum(m, (x) => x.a.vencido);
      out.push({ id: 'cob-venc', tone: m.some((x) => x.a.mesesAdeudados >= 2) ? 'danger' : 'warn', icon: 'receipt', title: m.length + (m.length === 1 ? ' cuenta con cuotas vencidas' : ' cuentas con cuotas vencidas'), desc: u.fmtMoney(tot) + ' de deuda vencida · ' + m.slice(0, 2).map((x) => BT.shortName(x.r)).join(', ') + (m.length > 2 ? '…' : ''), tab: 'cobranzas', params: { sub: 'morosidad' }, action: () => { BT.state.sub.cob = 'morosidad'; BT.go('cobranzas', { sub: 'morosidad' }); } });
    }
    const p = C.pendingInvoices();
    if (p.length) out.push({ id: 'cob-cfe', tone: 'info', icon: 'file-clock', title: p.length + ' e-Facturas del mes por emitir', desc: 'Período ' + u.fmtMonth(C.curMes()) + ' · ' + u.fmtMoney(u.sum(p, (r) => C.totalMes(r.id, C.curMes()))), tab: 'cobranzas', params: { sub: 'efactura' }, action: () => { BT.state.sub.cob = 'efactura'; BT.go('cobranzas', { sub: 'efactura' }); } });
    return out;
  });

  BT.actions.openAccount = C.openAccount;
  BT.actions.registrarPago = C.registrarPago;

  /* ---------------- Pestaña ---------------- */
  BT.tab({
    id: 'cobranzas', label: 'Cobranzas', icon: 'receipt', group: 'admin', order: 7, roles: ['direccion', 'administracion'],
    badge: () => C.morosos().length,
    render(el, params) {
      if (!BT.can('money.read')) { el.innerHTML = ui.empty({ title: 'Sin acceso', text: 'Tu rol no tiene acceso a cobranzas.' }); return; }
      if (params && params.sub) { BT.state.sub.cob = params.sub; params.sub = null; }
      const mes = C.curMes(); const res = C.residents();
      const facturado = u.sum(res, (r) => C.totalMes(r.id, mes));
      const cobradoMes = u.sum(BT.db.payments.filter((p) => !p.garantia && p.fecha.startsWith(mes) && res.some((r) => r.id === p.residentId)), 'monto');
      const pendMes = u.sum(res, (r) => { const un = BT.account(r.id).unpaid.find((x) => x.mes === mes); return un ? un.monto : 0; });
      const mor = C.morosos(); const venc = u.sum(mor, (x) => x.a.vencido);
      const pendCfe = C.pendingInvoices();
      const dueTxt = u.daysUntil(C.dueDate(mes));
      el.innerHTML = ui.pageHeader({
        eyebrow: 'Cobranzas · ' + BT.sedeName(), icon: 'receipt', title: 'Cobranzas y facturación',
        sub: 'Cuotas de ' + u.fmtMonth(mes) + ' · vencimiento el ' + u.fmtDate(C.dueDate(mes)) + ' (' + u.relDay(C.dueDate(mes)) + ')',
        actions: ui.exportMenu([{ id: 'xlsx', label: 'Cuotas y morosidad', sub: 'Excel · 2 hojas', icon: 'file-spreadsheet' }]) +
          (BT.can('money.write') ? '<button class="btn" data-act="emit">' + ic('send') + 'Emitir e-Facturas' + (pendCfe.length ? ' <span class="badge info" style="height:18px;padding:0 6px">' + pendCfe.length + '</span>' : '') + '</button><button class="btn primary" data-act="pay">' + ic('banknote') + 'Registrar pago</button>' : ''),
      }) +
        '<div class="grid g-4 stagger">' +
        ui.kpi({ label: 'Facturado en ' + u.fmtMonth(mes).split(' ')[0], value: facturado, money: true, icon: 'file-text', foot: res.length + ' residentes · cuotas y extras' }) +
        ui.kpi({ label: 'Cobrado en el mes', value: cobradoMes, money: true, icon: 'circle-check', foot: '<span class="delta up">' + u.fmtPct(facturado ? (cobradoMes / facturado) * 100 : 0, 0) + '</span> de lo facturado' }) +
        ui.kpi({ label: 'Pendiente del mes', value: pendMes, money: true, icon: 'clock', tone: 'warn', foot: dueTxt >= 0 ? 'Vence ' + u.relDay(C.dueDate(mes)) : 'Ya venció el día ' + BT.db.settings.dueDay }) +
        ui.kpi({ label: 'Deuda vencida', value: venc, money: true, icon: 'circle-alert', tone: 'danger', foot: mor.length + (mor.length === 1 ? ' cuenta en mora' : ' cuentas en mora') }) +
        '</div><div class="mt-24" id="cobBody"></div>';
      ui.subtabs(el.querySelector('#cobBody'), 'cob', [
        { id: 'cuotas', label: 'Cuotas del mes', icon: 'calendar-check' },
        { id: 'morosidad', label: 'Morosidad', icon: 'circle-alert', count: mor.length || '' },
        { id: 'pagos', label: 'Pagos y recibos', icon: 'banknote' },
        { id: 'efactura', label: 'e-Factura', icon: 'receipt-text', count: pendCfe.length || '' },
        { id: 'garantias', label: 'Depósitos de garantía', icon: 'shield-check' },
      ], (p, id) => PANELS[id](p, { mes, res, mor, pendCfe }));
      ui.on(el, {
        pay: (t) => C.registrarPago(t.dataset.id), emit: () => C.emitir(), export: () => C.xlsxCuotas(),
        acc: (t) => C.openAccount(t.dataset.id), wa: (t) => C.recordatorio(t.dataset.id), pdf: (t) => C.estadoCuentaPDF(t.dataset.id), rec: (t) => C.reciboPDF(t.dataset.id),
        cfe: (t) => { const inv = BT.db.invoices.find((i) => i.id === t.dataset.id); ui.modal({ title: inv.tipo + ' ' + inv.nro, sub: BT.fullName(BT.resident(inv.residentId)) + ' · ' + u.fmtMonth(inv.mes), icon: 'receipt-text', body: C.cfeCard(inv), foot: '<button class="btn ghost" data-close>Cerrar</button><button class="btn" data-close onclick="BT.ui.toast(\'CFE reenviado al referente\',{icon:\'mail\'})">' + ic('mail') + 'Reenviar por correo</button>' }); },
      });
    },
  });

  const PANELS = {
    cuotas(p, { mes, res }) {
      let filtro = 'todos'; let q = '';
      const rowsFor = () => res.filter((r) => { const st = C.statusMes(r.id, mes).tone; return (filtro === 'todos' || (filtro === 'pagados' && st === 'ok') || (filtro === 'pendientes' && st === 'warn') || (filtro === 'vencidos' && (st === 'danger' || BT.account(r.id).vencido > 0))) && (!q || u.norm(BT.fullName(r) + ' ' + r.referente.nombre).includes(u.norm(q))); });
      const extrasTip = (r) => C.chargesOf(r.id, mes).filter((c) => c.concepto !== 'Cuota mensual').map((c) => c.concepto + ' ' + u.fmtMoney(c.monto)).join(' · ');
      const table = () => ui.table([
        { label: 'Residente', render: (r) => ui.person(BT.fullName(r), BT.sedeTag(r.sede) + ' Hab. ' + r.habitacion + r.cama + ' · ' + esc(r.referente.nombre)) },
        { label: 'Cuota', align: 'num', render: (r) => u.fmtMoney(C.cuotaMes(r.id, mes)) },
        { label: 'Extras', align: 'num', render: (r) => { const e = C.totalMes(r.id, mes) - C.cuotaMes(r.id, mes); return e ? '<span data-tip="' + esc(extrasTip(r)) + '" style="border-bottom:1px dotted var(--ink-300)">' + u.fmtMoney(e) + '</span>' : '<span class="subtle">—</span>'; } },
        { label: 'Total del mes', align: 'num', render: (r) => '<b>' + u.fmtMoney(C.totalMes(r.id, mes)) + '</b>' },
        { label: 'Estado', render: (r) => { const st = C.statusMes(r.id, mes); return ui.badge(st.label, st.tone, { icon: st.icon }) + (st.resta && st.label.includes('arcial') ? '<div class="subtle" style="font-size:11px;margin-top:3px">Resta ' + u.fmtMoney(st.resta) + '</div>' : ''); } },
        { label: 'Saldo cuenta', align: 'num', render: (r) => { const a = BT.account(r.id); return '<span class="' + (a.vencido ? 't-danger' : '') + '">' + u.fmtMoney(a.saldo) + '</span>'; } },
        { label: '', align: 'num', render: (r) => '<div class="row gap-4" style="justify-content:flex-end">' + (BT.can('money.write') && BT.account(r.id).saldo > 0 ? '<button class="btn xs soft" data-act="pay" data-id="' + r.id + '">' + ic('banknote') + 'Cobrar</button>' : '') + '<button class="btn xs ghost" data-act="acc" data-id="' + r.id + '" data-tip="Estado de cuenta">' + ic('chevron-right') + '</button></div>' },
      ], rowsFor(), { rowAttrs: (r) => 'class="click" data-rid="' + r.id + '"', empty: { ill: 'search', title: 'Sin resultados', text: 'No hay cuentas que coincidan con el filtro.' } });
      const counts = { todos: res.length, pendientes: res.filter((r) => C.statusMes(r.id, mes).tone === 'warn').length, vencidos: res.filter((r) => BT.account(r.id).vencido > 0).length, pagados: res.filter((r) => C.statusMes(r.id, mes).tone === 'ok').length };
      p.innerHTML = '<div class="card"><div class="cob-filter">' + ui.seg('cobf', [{ id: 'todos', label: 'Todos (' + counts.todos + ')' }, { id: 'pendientes', label: 'Pendientes (' + counts.pendientes + ')' }, { id: 'vencidos', label: 'Con deuda vencida (' + counts.vencidos + ')' }, { id: 'pagados', label: 'Pagados (' + counts.pagados + ')' }], filtro, 'sm') +
        '<div class="sw grow" style="display:flex;justify-content:flex-end"><span style="position:relative">' + ic('search') + '<input class="input" type="search" placeholder="Buscar residente o referente…" id="cobQ"></span></div></div><div class="card-b flush mt-8" id="cobT">' + table() + '</div></div>';
      const tbody = p.querySelector('#cobT');
      p.querySelector('.seg').addEventListener('segchange', (e) => { filtro = e.detail.value; tbody.innerHTML = table(); });
      p.querySelector('#cobQ').addEventListener('input', u.debounce((e) => { q = e.target.value; tbody.innerHTML = table(); }, 120));
      tbody.addEventListener('click', (e) => { if (e.target.closest('[data-act]')) return; const tr = e.target.closest('tr[data-rid]'); if (tr) C.openAccount(tr.dataset.rid); });
    },
    morosidad(p, { mor }) {
      const B = [['1 a 30 días', 0, 30, 'warn'], ['31 a 60 días', 31, 60, 'warn'], ['61 a 90 días', 61, 90, 'danger'], ['Más de 90 días', 91, 99999, 'danger']];
      const all = mor.flatMap((x) => x.ag);
      const tot = u.sum(all, 'monto') || 1;
      p.innerHTML = '<div class="grid g-4 stagger">' + B.map(([l, a, b, t]) => { const xs = all.filter((g) => g.dias >= a && g.dias <= b); const m = u.sum(xs, 'monto'); return '<div class="card aging hover"><div class="row between"><span class="l">' + l + '</span>' + ui.badge(xs.length + (xs.length === 1 ? ' cuota' : ' cuotas'), xs.length ? t : '') + '</div><div class="v">' + u.fmtMoney(m) + '</div>' + ui.bar((m / tot) * 100, t, true) + '</div>'; }).join('') + '</div>' +
        ui.card({ cls: 'mt-16', title: 'Cuentas con deuda vencida', icon: 'circle-alert', sub: 'Ordenadas por monto · vencimiento día ' + BT.db.settings.dueDay + ' de cada mes', bodyCls: 'flush', body: ui.table([
          { label: 'Residente', render: (x) => ui.person(BT.fullName(x.r), BT.sedeTag(x.r.sede) + ' Hab. ' + x.r.habitacion + x.r.cama) },
          { label: 'Referente', render: (x) => '<div class="strong" style="font-size:var(--fs-md)">' + esc(x.r.referente.nombre) + '</div><div class="muted" style="font-size:var(--fs-xs)">' + esc(x.r.referente.vinculo) + ' · ' + esc(x.r.referente.tel) + '</div>' },
          { label: 'Meses', align: 'center', render: (x) => ui.badge(String(x.a.mesesAdeudados), x.a.mesesAdeudados >= 2 ? 'danger' : 'warn') },
          { label: 'Atraso', align: 'num', render: (x) => Math.max(...x.ag.map((g) => g.dias)) + ' días' },
          { label: 'Deuda vencida', align: 'num', render: (x) => '<b class="t-danger">' + u.fmtMoney(x.a.vencido) + '</b>' },
          { label: '', align: 'num', render: (x) => '<div class="row gap-4" style="justify-content:flex-end"><button class="btn xs" data-act="wa" data-id="' + x.r.id + '">' + ic('message-circle') + 'Recordar</button>' + (BT.can('money.write') ? '<button class="btn xs soft" data-act="pay" data-id="' + x.r.id + '">' + ic('banknote') + 'Cobrar</button>' : '') + '<button class="btn xs ghost" data-act="pdf" data-id="' + x.r.id + '" data-tip="Estado de cuenta PDF">' + ic('file-text') + '</button></div>' },
        ], mor, { rowAttrs: (x) => 'class="' + (x.a.mesesAdeudados >= 2 ? 'row-flag-danger' : 'row-flag-warn') + '"', empty: { ill: 'leaf', title: 'Sin morosidad', text: 'Todas las cuentas de la sede están al día. ¡Excelente!' }, foot: mor.length ? '<tr><td colspan="4">Total vencido</td><td class="num">' + u.fmtMoney(u.sum(mor, (x) => x.a.vencido)) + '</td><td></td></tr>' : '' }) });
    },
    pagos(p, { res }) {
      const ids = new Set(res.map((r) => r.id));
      const desde = u.iso(u.addDays(u.today(), -60));
      const pays = BT.db.payments.filter((x) => !x.garantia && ids.has(x.residentId) && x.fecha >= desde).sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.recibo > a.recibo ? 1 : -1));
      const byMedio = u.groupBy(pays, 'medio');
      p.innerHTML = '<div class="grid g-main">' + ui.card({ title: 'Pagos recibidos', icon: 'banknote', sub: 'Últimos 60 días · ' + pays.length + ' recibos', bodyCls: 'flush', body: ui.table([
        { label: 'Fecha', render: (x) => '<span class="num">' + u.fmtDate(x.fecha) + '</span>' },
        { label: 'Recibo', render: (x) => '<span class="badge outline num">' + esc(x.recibo) + '</span>' },
        { label: 'Residente', render: (x) => { const r = BT.resident(x.residentId); return '<div class="strong" style="font-size:var(--fs-md)">' + esc(BT.fullName(r)) + '</div><div class="muted" style="font-size:var(--fs-xs)">' + r.sede + ' · ' + esc(r.referente.nombre) + '</div>'; } },
        { label: 'Medio', render: (x) => '<span class="muted">' + esc(x.medio) + '</span>' },
        { label: 'Importe', align: 'num', render: (x) => '<b>' + u.fmtMoney(x.monto) + '</b>' },
        { label: '', align: 'num', render: (x) => '<button class="btn xs ghost" data-act="rec" data-id="' + x.id + '">' + ic('file-text') + 'Recibo</button>' },
      ], pays.slice(0, 80), { compact: true }) }) +
        ui.card({ title: 'Por medio de pago', icon: 'chart-pie', body: '<div class="chart-box sm"><canvas id="cobMed"></canvas></div><div class="mt-16">' + Object.entries(byMedio).sort((a, b) => u.sum(b[1], 'monto') - u.sum(a[1], 'monto')).map(([m, xs], i) => '<div class="row between" style="padding:6px 0;font-size:var(--fs-md)"><span class="row gap-6"><span class="sdot" style="background:' + BT.COLORS.cat[i % 10] + '"></span>' + esc(m) + '</span><span class="num"><b>' + u.fmtMoney(u.sum(xs, 'monto')) + '</b> <span class="subtle">· ' + xs.length + '</span></span></div>').join('') + '</div>' }) + '</div>';
      const ent = Object.entries(byMedio).sort((a, b) => u.sum(b[1], 'monto') - u.sum(a[1], 'monto'));
      BT.chart(p.querySelector('#cobMed'), { type: 'doughnut', data: { labels: ent.map((e) => e[0]), datasets: [{ data: ent.map((e) => u.sum(e[1], 'monto')), backgroundColor: ent.map((_, i) => BT.COLORS.cat[i % 10]), borderColor: '#fff', borderWidth: 3 }] }, options: { cutout: '66%', plugins: { tooltip: { callbacks: { label: (c) => ' ' + c.label + ': ' + u.fmtMoney(c.parsed) } } } } });
    },
    efactura(p, { mes, pendCfe }) {
      const ids = new Set(C.residents().map((r) => r.id));
      const invs = BT.db.invoices.filter((i) => i.mes === mes && ids.has(i.residentId)).sort((a, b) => b.nro.localeCompare(a.nro));
      const tot = u.sum(invs, 'total'), iva = u.sum(invs, 'iva');
      p.innerHTML = (pendCfe.length ? '<div class="alert info mb-16">' + ic('file-clock') + '<div class="grow"><b>' + pendCfe.length + ' residentes sin e-Factura de ' + u.fmtMonth(mes) + '.</b> ' + pendCfe.slice(0, 4).map((r) => esc(BT.shortName(r))).join(', ') + (pendCfe.length > 4 ? '…' : '') + '</div>' + (BT.can('money.write') ? '<button class="btn sm primary" data-act="emit">' + ic('send') + 'Emitir ahora</button>' : '') + '</div>' : '<div class="alert ok mb-16">' + ic('badge-check') + '<div><b>Período facturado completo.</b> Todos los comprobantes de ' + u.fmtMonth(mes) + ' fueron aceptados por DGI.</div></div>') +
        '<div class="grid g-3 stagger">' +
        ui.kpi({ label: 'Comprobantes emitidos', value: invs.length, icon: 'receipt-text', foot: 'e-Ticket · consumidor final' }) +
        ui.kpi({ label: 'Total facturado', value: tot, money: true, icon: 'file-text', foot: 'Neto ' + u.fmtMoney(tot - iva) }) +
        ui.kpi({ label: 'IVA tasa mínima (' + Math.round(BT.db.settings.iva * 100) + ' %)', value: iva, money: true, icon: 'landmark', tone: 'info', foot: 'Débito fiscal del período' }) + '</div>' +
        ui.card({ cls: 'mt-16', title: 'Comprobantes fiscales electrónicos', icon: 'receipt-text', sub: u.cap(u.fmtMonth(mes)) + ' · hacé clic para ver el CFE', bodyCls: 'flush', body: ui.table([
          { label: 'Número', render: (i) => '<b class="num">' + esc(i.nro) + '</b>' },
          { label: 'Tipo', render: (i) => ui.badge(i.tipo, 'outline') },
          { label: 'Residente', render: (i) => { const r = BT.resident(i.residentId); return esc(BT.fullName(r)) + ' <span class="subtle">· ' + r.sede + '</span>'; } },
          { label: 'Neto', align: 'num', render: (i) => u.fmtMoney(i.neto) }, { label: 'IVA', align: 'num', render: (i) => u.fmtMoney(i.iva) }, { label: 'Total', align: 'num', render: (i) => '<b>' + u.fmtMoney(i.total) + '</b>' },
          { label: 'Estado DGI', render: (i) => ui.badge(i.estado, 'ok', { icon: 'badge-check' }) },
          { label: '', align: 'num', render: (i) => '<button class="btn xs ghost" data-act="cfe" data-id="' + i.id + '">' + ic('eye') + 'Ver</button>' },
        ], invs, { compact: true, rowAttrs: (i) => 'class="click" data-act="cfe" data-id="' + i.id + '"', empty: { ill: 'default', title: 'Sin comprobantes', text: 'Todavía no se emitieron e-Facturas este mes.' } }) });
    },
    garantias(p, { res }) {
      const all = BT.bySede(BT.db.residents).map((r) => ({ r, ch: BT.db.charges.find((c) => c.residentId === r.id && c.garantia), pg: BT.db.payments.find((x) => x.residentId === r.id && x.garantia) })).filter((x) => x.ch);
      const act = all.filter((x) => x.r.estado === 'activo'); const egr = all.filter((x) => x.r.estado !== 'activo');
      const custodia = u.sum(act.filter((x) => x.pg), (x) => x.ch.monto);
      p.innerHTML = '<div class="grid g-3 stagger">' + ui.kpi({ label: 'Depósitos en custodia', value: custodia, money: true, icon: 'shield-check', foot: act.length + ' residentes activos' }) +
        ui.kpi({ label: 'Equivalente en cuotas', value: custodia / Math.max(1, u.avg(res, 'cuota')), decimals: 1, suffix: 'cuotas', icon: 'scale', tone: 'ink', foot: 'Cuota promedio ' + u.fmtMoney(u.avg(res, 'cuota')) }) +
        ui.kpi({ label: 'Devueltos (6 meses)', value: egr.length, icon: 'undo-2', tone: 'info', foot: 'Egresos: alta, traslado o fallecimiento' }) + '</div>' +
        ui.card({ cls: 'mt-16', title: 'Depósitos de garantía', icon: 'shield-check', sub: 'Equivalen a una cuota mensual al ingreso · se devuelven al egreso, descontando saldos pendientes', bodyCls: 'flush', body: ui.table([
          { label: 'Residente', render: (x) => ui.person(BT.fullName(x.r), BT.sedeTag(x.r.sede) + (x.r.estado === 'activo' ? ' Hab. ' + x.r.habitacion + x.r.cama : ' Egresó el ' + u.fmtDate(x.r.egreso.fecha))) },
          { label: 'Ingreso', render: (x) => '<span class="num">' + u.fmtDate(x.r.ingreso) + '</span>' },
          { label: 'Recibo', render: (x) => (x.pg ? '<span class="badge outline num">' + esc(x.pg.recibo) + '</span>' : '—') },
          { label: 'Monto', align: 'num', render: (x) => '<b>' + u.fmtMoney(x.ch.monto) + '</b>' },
          { label: 'Estado', render: (x) => (x.r.estado !== 'activo' ? ui.badge(x.r.egreso.motivo === 'Fallecimiento' ? 'Aplicado y devuelto a sucesión' : 'Devuelto el ' + u.fmtDate(u.addDays(x.r.egreso.fecha, 10)), 'info', { icon: 'undo-2' }) : x.pg ? ui.badge('En custodia', 'ok', { icon: 'lock' }) : ui.badge('Pendiente de cobro', 'warn')) },
        ], act.concat(egr), { compact: true, foot: '<tr><td colspan="3">Total en custodia</td><td class="num">' + u.fmtMoney(custodia) + '</td><td></td></tr>' }) });
    },
  };
})();

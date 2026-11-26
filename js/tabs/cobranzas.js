/* ==========================================================================
   Cobranzas — cuotas, extras, estado de cuenta, recibos, garantías y facturas (cargadas desde el sistema de facturación y guardadas en Google Drive)
   ========================================================================== */
(function () {
  'use strict';
  const BT = window.BT; const u = BT.u; const ui = BT.ui; const ic = BT.ic; const esc = u.esc;
  const C = (BT.cob = {});

  /* Para la demo: algunas facturas del mes en curso quedan pendientes de cargar */
  const origSeed = BT.seed;
  BT.seed = function () {
    const db = origSeed.apply(this, arguments);
    const cur = u.ym(u.today());
    const pend = ['r2', 'r5', 'r9', 'r15', 'r21', 'r25', 'r27'];
    db.invoices = db.invoices.filter((i) => !(i.mes === cur && pend.includes(i.residentId)));
    const staff = ['Paula Benavídez', 'Paula Benavídez', 'Dr. Miguel Yavarone'];
    db.invoices.forEach((i, k) => {
      i.cae = '9024' + String(1180000 + k * 37).padStart(7, '0'); i.serie = 'A'; i.estado = 'En Drive';
      const r = db.residents.find((x) => x.id === i.residentId);
      const d = u.toDate(i.fecha); d.setDate(2 + (k % 4)); i.fecha = u.iso(d);
      i.cargadaPor = staff[k % 3]; i.cargadaTs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10 + (k % 7), (k * 13) % 60).getTime();
      i.file = { name: i.nro.replace(/\s+/g, '-') + ' · ' + (r ? r.apellido + ' ' + r.nombre : 'Residente') + '.pdf', size: 88000 + ((k * 7919) % 90000), type: 'application/pdf', seeded: true };
    });
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
    .gdrive{width:20px;height:auto;flex:none;display:inline-block;vertical-align:middle}
    .gdrive.lg{width:40px}
    .btn .gdrive{width:17px;margin-right:2px}
    .btn.primary .gdrive{background:#fff;border-radius:5px;padding:2px;width:20px}
    .crumbs{display:inline-flex;flex-wrap:wrap;align-items:center;gap:2px;font-weight:550;color:var(--ink-700)}
    .crumbs .ic{color:var(--ink-400)}
    .fname{display:flex;align-items:center;gap:5px;margin-top:4px;font-size:var(--fs-xs);color:var(--ink-600);font-weight:600;word-break:break-all}
    .drive-dest{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--line);border-radius:var(--r-md);background:linear-gradient(135deg,#f5f9ff,#fff)}
    .drive-dest .gdrive{width:30px}
    .drive-card-in{display:flex;align-items:center;gap:16px;padding:18px 20px;flex-wrap:wrap}
    .fx-steps{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line)}
    .fx-steps>div{padding:14px 20px;display:grid;grid-template-columns:auto 1fr;column-gap:12px;align-items:center}
    .fx-steps>div+div{border-left:1px dashed var(--line-strong)}
    .fx-steps span{grid-row:span 2;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--brand-600);color:#fff;font-weight:700;font-size:var(--fs-sm)}
    .fx-steps b{font-size:var(--fs-md)}
    .fx-steps small{color:var(--ink-500);font-size:var(--fs-xs)}
    .fchip{display:inline-flex;align-items:center;gap:6px;max-width:230px;padding:3px 9px;border-radius:99px;background:var(--surface-2);border:1px solid var(--line);font-size:var(--fs-xs);color:var(--ink-700)}
    .drive-ok{display:inline-flex;align-items:center;gap:6px;font-size:var(--fs-xs);font-weight:600;color:var(--ok)}
    .drive-ok .gdrive{width:16px}
    .fx-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:20px;align-items:start}
    .fx-grid.rev{grid-template-columns:minmax(0,1.15fr) minmax(0,1fr)}
    .drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-align:center;padding:22px 16px;border:2px dashed var(--line-strong);border-radius:var(--r-lg);background:var(--surface-2);cursor:pointer;transition:all var(--d-fast) var(--ease);color:var(--ink-500)}
    .drop .ic{width:30px;height:30px;color:var(--brand-600)}
    .drop .dt{font-weight:650;color:var(--ink-900);font-size:var(--fs-md);word-break:break-all}
    .drop .dd{font-size:var(--fs-xs)}
    .drop:hover,.drop.over{border-color:var(--brand-500);background:var(--brand-50)}
    .drop.has{border-style:solid;border-color:var(--brand-300);background:var(--brand-50)}
    .drop.need{animation:shake 400ms;border-color:var(--danger)}
    .fprev{border:1px solid var(--line);border-radius:var(--r-lg);background:#eceae4;overflow:hidden;min-height:520px;display:flex;flex-direction:column}
    .fprev-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--ink-500);text-align:center;padding:30px}
    .fprev-empty .ic{width:44px;height:44px;color:var(--ink-300);stroke-width:1.5}
    .fprev-empty b{color:var(--ink-700)}
    .fprev-bar{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#fff;border-bottom:1px solid var(--line);font-size:var(--fs-sm)}
    .fprev-bar b{display:block;color:var(--ink-900)}
    .fprev-bar span{color:var(--ink-500);font-size:var(--fs-xs)}
    .fprev-body{flex:1;display:flex;min-height:480px}
    .fprev-pdf{flex:1;width:100%;min-height:560px;border:0;background:#fff}
    .fprev-img{flex:1;padding:14px;display:flex;align-items:flex-start;justify-content:center;max-height:640px;overflow:auto}
    .fprev-img img{max-width:100%;height:auto;box-shadow:0 6px 24px rgba(0,0,0,.14);border-radius:4px;background:#fff}
    .fprev-doc{flex:1;padding:16px;max-height:640px;overflow:auto}
    .fprev-doc .cfe{box-shadow:0 6px 24px rgba(0,0,0,.12)}
    .up-wrap{display:flex;flex-direction:column;gap:16px;max-width:520px;margin:8px auto}
    .up-file{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--line);border-radius:var(--r-md)}
    .up-file .ic{width:28px;height:28px;color:var(--brand-600)}
    .up-file b{display:block;word-break:break-all}
    .up-file span{font-size:var(--fs-xs);color:var(--ink-500)}
    .emit-step .es-ic .gdrive{width:16px}
    .up-done{text-align:center;padding:10px 0 4px;max-width:560px;margin:0 auto}
    .up-done h3{margin-top:12px;font-size:var(--fs-xl)}
    .up-ok{width:64px;height:64px;border-radius:50%;display:inline-grid;place-items:center;background:var(--ok);color:#fff}
    .up-ok svg{width:32px;height:32px}
    @media (max-width:900px){.fx-grid,.fx-grid.rev{grid-template-columns:1fr}.fx-steps{grid-template-columns:1fr}.fx-steps>div+div{border-left:0;border-top:1px dashed var(--line-strong)}.fprev{min-height:380px}}
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
      D.note('<b>Formas de pago:</b> transferencia a la cuenta BROU 001-234567-00001 a nombre de Galauru SAS, indicando el nombre del residente; débito automático o efectivo en administración (lunes a viernes de 9 a 17). Vencimiento: día ' + BT.db.settings.dueDay + ' de cada mes. Las facturas se emiten desde el sistema de facturación y se envían por correo al referente.');
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
      D.note('Este recibo acredita el pago. La factura correspondiente se emite desde el sistema de facturación de Galauru SAS y queda archivada en Google Drive.', '');
    D.open({ title: 'Recibo ' + p.recibo, subtitle: esc(BT.fullName(r)) + ' · ' + u.fmtDate(p.fecha), sede: r.sede, kicker: 'Cobranzas', code: p.recibo, body, residentId: r.id, filename: 'Recibo ' + p.recibo });
  };

  /* ---------------- e-Factura ---------------- */
  C.cfeCard = (inv) => {
    const r = BT.resident(inv.residentId); const s = BT.db.sedes.find((x) => x.id === inv.sede);
    const lines = C.chargesOf(inv.residentId, inv.mes);
    return '<div class="cfe"><div class="cfe-h"><div><div class="muted" style="font-size:var(--fs-xs);font-weight:600;letter-spacing:.06em;text-transform:uppercase">' + esc(inv.tipo) + ' · Serie ' + esc(inv.serie || 'A') + '</div><div style="font-size:20px;font-weight:700;letter-spacing:-.02em">Nº ' + esc(inv.nro.replace(/^A\s*/, '')) + '</div><div class="muted" style="font-size:var(--fs-sm)">' + esc(BT.db.meta.company) + ' · RUT ' + esc(BT.db.meta.rut) + '<br>' + esc(s ? s.direccion : '') + '</div></div>' +
      '<div style="text-align:right">' + ui.badge('Aceptada DGI', 'ok', { icon: 'badge-check' }) + '<div class="muted mt-8" style="font-size:var(--fs-sm)">Emisión ' + u.fmtDate(inv.fecha) + '<br>Período ' + u.fmtMonth(inv.mes) + '</div></div></div>' +
      '<div class="cfe-b"><div class="muted" style="font-size:var(--fs-sm);margin-bottom:8px">Receptor: <b style="color:var(--ink-900)">' + esc(r.referente.nombre) + '</b> por ' + esc(BT.fullName(r)) + ' (consumidor final)</div>' +
      lines.map((l) => '<div class="cfe-row"><span>' + esc(l.concepto) + (l.cantidad ? ' <span class="subtle">× ' + l.cantidad + '</span>' : '') + '</span><b>' + u.fmtMoney(l.monto) + '</b></div>').join('') +
      '<hr class="hr" style="margin:10px 0"><div class="cfe-row"><span class="muted">Neto gravado</span><b>' + u.fmtMoney(inv.neto) + '</b></div><div class="cfe-row"><span class="muted">IVA tasa mínima ' + Math.round(BT.db.settings.iva * 100) + ' %</span><b>' + u.fmtMoney(inv.iva) + '</b></div><div class="cfe-row" style="font-size:var(--fs-lg)"><span><b>Total</b></span><b>' + u.fmtMoney(inv.total) + '</b></div></div>' +
      '<div class="cfe-foot">' + C.qr(inv.nro) + '<div>Código de seguridad <b>' + esc((inv.cae || '').slice(-6)) + '</b><br>CAE Nº <b>' + esc(inv.cae || '—') + '</b> · Rango A 0000001 – A 0099999<br>Puede verificar el comprobante en <b>www.efactura.dgi.gub.uy</b><br>IVA al día · Resolución DGI (simulada para la demo)</div></div></div>';
  };
  /* ---------------- Facturas: se emiten en el sistema de facturación y se cargan acá ---------------- */
  const MESES_N = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  C.DRIVE_SVG = '<svg class="gdrive" viewBox="0 0 87.3 78" aria-hidden="true"><path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/><path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/><path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/><path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/><path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/><path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/></svg>';
  C.driveRoot = () => ((BT.db && BT.db.settings && BT.db.settings.driveFolder) || 'Buenos Tiempos/Facturas').split('/').filter(Boolean);
  C.driveConfig = function () {
    ui.modal({
      title: 'Carpeta de Google Drive', icon: 'folder-cog', sub: 'Dónde se guardan las facturas cargadas',
      body: '<div class="drive-dest mb-16">' + C.DRIVE_SVG + '<div class="grow"><div class="strong" style="font-size:var(--fs-sm)">facturas@buenostiempos.com.uy</div><div class="muted" style="font-size:var(--fs-xs)">Cuenta de Google conectada</div></div>' + ui.badge('Conectada', 'ok', { icon: 'badge-check' }) + '</div>' +
        ui.field({ label: 'Carpeta raíz', name: 'folder', value: C.driveRoot().join('/'), tip: 'Separá las subcarpetas con /' }) +
        '<p class="muted mt-8" style="font-size:var(--fs-sm)">Adentro se ordenan solas por año, mes y sede. Ej.: ' + C.crumbs(['Mi unidad'].concat(C.driveRoot(), [String(u.today().getFullYear()), '11 - Noviembre', 'BT1'])) + '</p>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-ok>' + ic('check') + 'Guardar</button>',
      onMount: (el, close) => el.querySelector('[data-ok]').addEventListener('click', () => {
        const v = el.querySelector('[name=folder]').value.split('/').map((x) => x.trim()).filter(Boolean).join('/'); if (!v) return;
        BT.db.settings.driveFolder = v; BT.audit('Cambió carpeta de Drive', 'Configuración', { detail: v }); BT.save(); close();
        ui.toast('Carpeta actualizada', { icon: 'folder-check', sub: v }); BT.refresh();
      }),
    });
  };

  C.drivePath = (inv) => { const [y, m] = inv.mes.split('-'); return ['Mi unidad'].concat(C.driveRoot(), [y, m + ' - ' + MESES_N[+m - 1], inv.sede]); };
  C.crumbs = (parts) => '<span class="crumbs">' + parts.map((x, i) => (i ? ic('chevron-right', 'ic-xs') : '') + '<span>' + esc(x) + '</span>').join('') + '</span>';
  C.fileName = (nro, rid, ext) => { const r = BT.resident(rid); return nro.replace(/\s+/g, '-') + ' · ' + (r ? r.apellido + ' ' + r.nombre : 'Residente') + '.' + (ext || 'pdf'); };
  const fmtSize = (b) => (b > 1048576 ? u.fmtNum(b / 1048576, 1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
  const extOf = (n) => (String(n).split('.').pop() || 'pdf').toLowerCase();

  /* Archivos adjuntos: se guardan en el navegador para la demo (en producción van directo a Google Drive) */
  const FKEY = 'bt-files';
  const mem = {};
  const store = { get(id) { if (mem[id]) return mem[id]; try { const all = JSON.parse(localStorage.getItem(FKEY) || '{}'); return all[id] || null; } catch (e) { return null; } },
    put(id, dataUrl) { mem[id] = dataUrl; try { const all = JSON.parse(localStorage.getItem(FKEY) || '{}'); all[id] = dataUrl; localStorage.setItem(FKEY, JSON.stringify(all)); return true; } catch (e) { return false; } } };
  const readAsDataURL = (file) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
  const toBlobUrl = async (dataUrl) => { try { const b = await (await fetch(dataUrl)).blob(); return URL.createObjectURL(b); } catch (e) { return dataUrl; } };

  /** Vista previa de un archivo (PDF o imagen). Si es una factura de ejemplo sin archivo real, muestra el comprobante */
  C.previewInto = async (box, { dataUrl, type, inv }) => {
    if (!dataUrl) { box.innerHTML = '<div class="fprev-doc">' + C.cfeCard(inv) + '</div>'; return; }
    if ((type || '').includes('pdf')) { const url = await toBlobUrl(dataUrl); box.innerHTML = '<iframe class="fprev-pdf" title="Vista previa de la factura" src="' + url + '#toolbar=0&navpanes=0&view=FitH"></iframe>'; return; }
    box.innerHTML = '<div class="fprev-img"><img src="' + dataUrl + '" alt="Factura adjunta"></div>';
  };

  /** Genera una factura de ejemplo (imagen) para probar la demo sin tener un PDF a mano */
  C.sampleInvoice = async function ({ nro, tipo, fecha, rid, mes, total }) {
    const r = BT.resident(rid); const s = BT.db.sedes.find((x) => x.id === r.sede);
    const W = 1240, H = 1754; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const F = (w, z) => w + ' ' + z + 'px InterVar, "Segoe UI", sans-serif';
    try { await document.fonts.load(F(700, 40)); } catch (e) { /* */ }
    c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#1f2937'; c.font = F(800, 46); c.fillText(BT.db.meta.company, 90, 140);
    c.font = F(500, 26); c.fillStyle = '#4b5563'; c.fillText('RUT ' + BT.db.meta.rut, 90, 186); c.fillText(s ? s.direccion + ', ' + s.barrio : '', 90, 224);
    c.strokeStyle = '#111827'; c.lineWidth = 3; c.strokeRect(760, 90, 390, 170);
    c.textAlign = 'center'; c.fillStyle = '#111827'; c.font = F(800, 34); c.fillText(tipo.toUpperCase(), 955, 148); c.font = F(700, 40); c.fillText(nro, 955, 205); c.font = F(500, 22); c.fillText('Fecha ' + u.fmtDate(fecha), 955, 240); c.textAlign = 'left';
    c.fillStyle = '#f3f4f6'; c.fillRect(90, 310, 1060, 130); c.fillStyle = '#374151'; c.font = F(600, 24); c.fillText('RECEPTOR', 120, 352);
    c.font = F(500, 28); c.fillStyle = '#111827'; c.fillText(r.referente.nombre + ' — por ' + BT.fullName(r), 120, 396); c.fillStyle = '#6b7280'; c.font = F(500, 22); c.fillText('Consumidor final · Período ' + u.fmtMonth(mes), 120, 428);
    let y = 520; c.fillStyle = '#111827'; c.fillRect(90, y - 40, 1060, 56); c.fillStyle = '#fff'; c.font = F(700, 24); c.fillText('DESCRIPCIÓN', 120, y - 3); c.textAlign = 'right'; c.fillText('IMPORTE', 1120, y - 3); c.textAlign = 'left';
    const lines = C.chargesOf(rid, mes); y += 60;
    (lines.length ? lines : [{ concepto: 'Servicios del mes', monto: total }]).forEach((l) => { c.fillStyle = '#1f2937'; c.font = F(500, 26); c.fillText(l.concepto + (l.cantidad ? ' × ' + l.cantidad : ''), 120, y); c.textAlign = 'right'; c.fillText(u.fmtMoney(l.monto), 1120, y); c.textAlign = 'left'; c.fillStyle = '#e5e7eb'; c.fillRect(90, y + 22, 1060, 2); y += 64; });
    const iva = BT.db.settings.iva; const neto = Math.round(total / (1 + iva));
    y += 30; [['Neto gravado', neto], ['IVA tasa mínima ' + Math.round(iva * 100) + ' %', total - neto]].forEach(([k, v]) => { c.fillStyle = '#4b5563'; c.font = F(500, 26); c.fillText(k, 700, y); c.textAlign = 'right'; c.fillText(u.fmtMoney(v), 1120, y); c.textAlign = 'left'; y += 48; });
    c.fillStyle = '#111827'; c.fillRect(690, y - 10, 460, 3); y += 44; c.font = F(800, 36); c.fillText('TOTAL', 700, y); c.textAlign = 'right'; c.fillText(u.fmtMoney(total), 1120, y); c.textAlign = 'left';
    // QR simulado
    const q = 220, qx = 90, qy = H - 360; let seed = 0; for (const ch of nro) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    c.fillStyle = '#111'; for (let i = 0; i < 25; i++) for (let j = 0; j < 25; j++) { seed = (seed * 1103515245 + 12345) >>> 0; const fin = (i < 7 && j < 7) || (i < 7 && j > 17) || (i > 17 && j < 7); if (fin ? (i % 6 === 0 || j % 6 === 0 || (i % 6 > 1 && i % 6 < 5 && j % 6 > 1 && j % 6 < 5)) : (seed >> 16) & 1) c.fillRect(qx + j * (q / 25), qy + i * (q / 25), q / 25, q / 25); }
    c.fillStyle = '#4b5563'; c.font = F(500, 22); ['Código de seguridad ' + String(seed).slice(-6), 'CAE Nº 9024' + String(seed).slice(-7) + ' · Serie ' + nro.split(' ')[0], 'Puede verificar el comprobante en www.efactura.dgi.gub.uy', 'IVA al día'].forEach((t, i) => c.fillText(t, 350, qy + 50 + i * 40));
    c.fillStyle = '#9ca3af'; c.font = F(500, 20); c.fillText('Comprobante de ejemplo generado para la demostración', 90, H - 70);
    return cv.toDataURL('image/jpeg', 0.9);
  };

  /** Cargar una factura emitida en el sistema de facturación: número + archivo → Google Drive */
  C.cargarFactura = function (rid, mes) {
    mes = mes || C.curMes();
    const pend = C.pendingInvoices(); const all = C.residents();
    if (!rid) rid = (pend[0] || all[0] || {}).id;
    const sug = () => { const n = Math.max(0, ...BT.db.invoices.map((i) => parseInt(String(i.nro).replace(/\D/g, ''), 10) || 0)); return 'A ' + String(n + 1).padStart(7, '0'); };
    let file = null; // { name, size, type, dataUrl, sample }
    const resOpts = pend.map((r) => ({ v: r.id, l: BT.fullName(r) + ' · ' + r.sede + ' · ' + u.fmtMoney(C.totalMes(r.id, mes)) + ' (sin factura)' })).concat(all.filter((r) => !pend.includes(r)).map((r) => ({ v: r.id, l: BT.fullName(r) + ' · ' + r.sede })));
    ui.modal({
      title: 'Cargar factura', icon: 'file-up', size: 'xl', sub: 'Emitiste la factura en tu sistema de facturación: cargá el número y el archivo, y se guarda sola en Google Drive',
      body: '<div class="fx-grid"><div class="col gap-12"><div class="form-grid">' +
        ui.field({ label: 'Residente', name: 'rid', type: 'select', value: rid, full: true, options: resOpts }) +
        ui.field({ label: 'Tipo de comprobante', name: 'tipo', type: 'chips', value: 'e-Ticket', full: true, options: [{ v: 'e-Ticket', l: 'e-Ticket', icon: 'receipt' }, { v: 'e-Factura', l: 'e-Factura', icon: 'file-text' }] }) +
        ui.field({ label: 'Número de factura', name: 'nro', required: true, placeholder: 'Ej.: ' + sug(), value: '', attrs: 'autocomplete="off" style="font-weight:650;letter-spacing:.02em"', tip: 'Serie y número, tal como figura en la factura' }) +
        ui.field({ label: 'Fecha de emisión', name: 'fecha', type: 'date', value: u.todayIso(), required: true }) +
        ui.field({ label: 'Importe total ($U)', name: 'total', type: 'number', value: C.totalMes(rid, mes), required: true, attrs: 'min="0" step="1"' }) +
        ui.field({ label: 'Período', name: 'mes', type: 'month', value: mes }) + '</div>' +
        '<div class="field"><label>Archivo de la factura<span class="req">*</span></label><label class="drop" id="fxDrop" tabindex="0"><input type="file" id="fxFile" accept="application/pdf,image/*" hidden>' + ic('upload-cloud') + '<span class="dt">Arrastrá el PDF o la foto de la factura</span><span class="dd">o hacé clic para elegirlo · PDF, JPG o PNG</span></label>' +
        '<button type="button" class="btn ghost sm mt-8" data-sample>' + ic('wand-sparkles') + '¿No tenés una a mano? Usar factura de ejemplo</button></div>' +
        '<div class="drive-dest">' + C.DRIVE_SVG + '<div class="grow"><div class="strong" style="font-size:var(--fs-sm)">Se guarda automáticamente en Google Drive</div><div class="muted" id="fxPath" style="font-size:var(--fs-xs)"></div></div></div></div>' +
        '<div class="fprev" id="fxPrev"><div class="fprev-empty">' + ic('file-search') + '<b>Vista previa</b><span>Cuando adjuntes la factura la vas a ver acá</span></div></div></div>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>' + C.DRIVE_SVG + 'Guardar en Drive</button>',
      onMount: (el, close) => {
        const $ = (q) => el.querySelector(q);
        const cur = () => { const d = ui.formData(el.querySelector('.modal-b')); return { rid: d.rid, tipo: d.tipo || 'e-Ticket', nro: String(d.nro || '').trim().toUpperCase().replace(/\s+/g, ' '), fecha: d.fecha, total: +d.total || 0, mes: d.mes || mes }; };
        const updPath = () => { const x = cur(); const r = BT.resident(x.rid); const inv = { mes: x.mes, sede: r.sede }; $('#fxPath').innerHTML = C.crumbs(C.drivePath(inv)) + '<div class="fname">' + ic('file', 'ic-xs') + esc(C.fileName(x.nro || 'A-0000000', x.rid, file ? extOf(file.name) : 'pdf')) + '</div>'; };
        const showFile = async () => {
          const x = cur(); const pv = $('#fxPrev');
          pv.innerHTML = '<div class="fprev-bar">' + ic(file.type.includes('pdf') ? 'file-text' : 'image') + '<div class="grow ellipsis"><b>' + esc(file.name) + '</b><span>' + fmtSize(file.size) + (file.sample ? ' · ejemplo' : '') + '</span></div><button type="button" class="btn xs ghost" data-change>' + ic('refresh-cw') + 'Cambiar</button></div><div class="fprev-body"></div>';
          await C.previewInto(pv.querySelector('.fprev-body'), { dataUrl: file.dataUrl, type: file.type, inv: x });
          $('#fxDrop').classList.add('has'); $('#fxDrop .dt').textContent = file.name; $('#fxDrop .dd').textContent = 'Listo · ' + fmtSize(file.size) + ' · hacé clic para cambiarlo';
          pv.querySelector('[data-change]').addEventListener('click', () => $('#fxFile').click()); updPath();
        };
        const take = async (f) => {
          if (!f) return; const okType = /pdf$/i.test(f.type) || /^image\//.test(f.type) || /\.(pdf|jpe?g|png|webp)$/i.test(f.name);
          if (!okType) return ui.toast('Formato no admitido', { type: 'warn', sub: 'Adjuntá un PDF o una imagen (JPG, PNG)' });
          if (f.size > 15 * 1048576) return ui.toast('El archivo es muy grande', { type: 'warn', sub: 'Máximo 15 MB' });
          file = { name: f.name, size: f.size, type: f.type || (/\.pdf$/i.test(f.name) ? 'application/pdf' : 'image/jpeg'), dataUrl: await readAsDataURL(f) };
          if (!$('[name=nro]').value) { const m = f.name.match(/([A-Z])[\s_-]?0*(\d{3,7})/i); if (m) $('[name=nro]').value = m[1].toUpperCase() + ' ' + m[2].padStart(7, '0'); }
          showFile();
        };
        $('#fxFile').addEventListener('change', (e) => take(e.target.files[0]));
        const dz = $('#fxDrop');
        ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('over'); }));
        ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('over'); }));
        dz.addEventListener('drop', (e) => take(e.dataTransfer.files[0]));
        dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#fxFile').click(); } });
        $('[data-sample]').addEventListener('click', async () => {
          if (!$('[name=nro]').value) $('[name=nro]').value = sug();
          const x = cur(); const dataUrl = await C.sampleInvoice(x);
          file = { name: C.fileName(x.nro, x.rid, 'jpg'), size: Math.round(dataUrl.length * 0.75), type: 'image/jpeg', dataUrl, sample: true }; showFile();
        });
        el.addEventListener('change', (e) => { if (e.target.name === 'rid') { $('[name=total]').value = C.totalMes(e.target.value, cur().mes); } updPath(); });
        el.addEventListener('input', (e) => { if (e.target.name === 'nro') updPath(); });
        updPath();
        $('[data-save]').addEventListener('click', () => {
          const b = el.querySelector('.modal-b'); if (!ui.validate(b)) return;
          const x = cur();
          if (!/^[A-Z]{1,2}\s?\d{1,8}$/.test(x.nro)) { ui.toast('Revisá el número de factura', { type: 'warn', sub: 'Serie y número, por ejemplo ' + sug() }); $('[name=nro]').focus(); return; }
          if (BT.db.invoices.some((i) => i.nro.replace(/\s/g, '') === x.nro.replace(/\s/g, ''))) { ui.toast('Ese número ya está cargado', { type: 'warn', sub: 'La factura ' + x.nro + ' ya existe' }); $('[name=nro]').focus(); return; }
          if (!file) { ui.toast('Falta adjuntar la factura', { type: 'warn', sub: 'Arrastrá el PDF o la foto' }); dz.classList.add('need'); setTimeout(() => dz.classList.remove('need'), 900); return; }
          const r = BT.resident(x.rid); const nro = x.nro.replace(/^([A-Z]{1,2})\s?(\d+)$/, (m, s1, n) => s1 + ' ' + n.padStart(7, '0'));
          const neto = Math.round(x.total / (1 + BT.db.settings.iva));
          const inv = { id: u.uid('fe'), nro, serie: nro.split(' ')[0], tipo: x.tipo, residentId: r.id, sede: r.sede, mes: x.mes, neto, iva: x.total - neto, total: x.total, estado: 'En Drive', fecha: x.fecha, cargadaPor: BT.state.user.nombre, cargadaTs: Date.now() };
          const ext = extOf(file.name);
          inv.file = { name: C.fileName(nro, r.id, ext === 'jpeg' ? 'jpg' : ext), original: file.name, size: file.size, type: file.type, drive: C.drivePath(inv).join(' / '), driveId: 'gd_' + Math.random().toString(36).slice(2, 12), sample: !!file.sample };
          // Pantalla de guardado
          const steps = [[C.DRIVE_SVG, 'Conectando con Google Drive'], ['upload-cloud', 'Subiendo ' + inv.file.name], ['folder-check', 'Guardando en ' + C.drivePath(inv).slice(-3).join(' › ')], ['link-2', 'Vinculando la factura a la cuenta de ' + BT.shortName(r)]];
          el.querySelector('.modal-f').innerHTML = '';
          b.innerHTML = '<div class="up-wrap"><div class="up-file">' + ic(file.type.includes('pdf') ? 'file-text' : 'image') + '<div><b>' + esc(inv.file.name) + '</b><span>' + fmtSize(file.size) + '</span></div></div><div class="bar"><span id="upBar" style="width:0;animation:none;transition:width 420ms var(--ease-out)"></span></div><div class="emit-steps">' + steps.map(([i, t]) => '<div class="emit-step"><span class="es-ic">' + (i.startsWith('<svg') ? i : ic(i, 'ic-sm')) + '</span>' + esc(t) + '</div>').join('') + '</div></div>';
          const items = b.querySelectorAll('.emit-step'); let k = 0; const fast = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion');
          const next = () => {
            if (k > 0) { items[k - 1].classList.remove('run'); items[k - 1].classList.add('done'); items[k - 1].querySelector('.es-ic').innerHTML = ic('check', 'ic-sm'); }
            b.querySelector('#upBar').style.width = (k / items.length) * 100 + '%';
            if (k === items.length) return done();
            items[k].classList.add('run'); k++; setTimeout(next, fast ? 40 : 520 + Math.random() * 200);
          };
          const done = () => {
            const persisted = store.put(inv.id, file.dataUrl); if (!persisted) inv.file.session = true;
            BT.db.invoices.push(inv);
            BT.audit('Cargó factura', 'Facturación', { residentId: r.id, sede: r.sede, detail: inv.tipo + ' ' + nro + ' · ' + u.fmtMoney(inv.total) + ' · Drive: ' + inv.file.drive });
            BT.save();
            b.innerHTML = '<div class="up-done"><span class="up-ok">' + BT.check + '</span><h3>Factura ' + esc(nro) + ' guardada en Google Drive</h3><p class="muted">' + esc(BT.fullName(r)) + ' · ' + u.fmtMoney(inv.total) + ' · ' + u.cap(u.fmtMonth(inv.mes)) + '</p><div class="drive-dest mt-16">' + C.DRIVE_SVG + '<div class="grow" style="text-align:left">' + C.crumbs(C.drivePath(inv)) + '<div class="fname">' + ic('file', 'ic-xs') + esc(inv.file.name) + '</div></div></div></div>';
            el.querySelector('.modal-f').innerHTML = '<button class="btn ghost" data-close>Listo</button><button class="btn" data-ver>' + ic('eye') + 'Ver factura</button>' + (pend.filter((p) => p.id !== r.id).length ? '<button class="btn primary" data-otra>' + ic('plus') + 'Cargar otra</button>' : '');
            el.querySelector('[data-close]').addEventListener('click', () => { close(); BT.refresh(); BT.shell.updateNav(); });
            el.querySelector('[data-ver]').addEventListener('click', () => { close(); BT.refresh(); BT.shell.updateNav(); setTimeout(() => C.verFactura(inv.id), 260); });
            const o = el.querySelector('[data-otra]'); if (o) o.addEventListener('click', () => { close(); BT.refresh(); BT.shell.updateNav(); setTimeout(() => C.cargarFactura(), 260); });
            ui.toast('Factura ' + nro + ' en Drive', { icon: 'folder-check', sub: C.drivePath(inv).slice(-3).join(' › ') });
          };
          next();
        });
      },
    });
  };

  /** Ver una factura cargada: vista previa del archivo + datos de Drive */
  C.verFactura = function (id) {
    const inv = BT.db.invoices.find((i) => i.id === id); if (!inv) return;
    const r = BT.resident(inv.residentId); const f = inv.file || {};
    const dataUrl = store.get(inv.id);
    ui.modal({
      title: inv.tipo + ' ' + inv.nro, icon: 'receipt-text', size: 'xl', sub: BT.fullName(r) + ' · ' + u.cap(u.fmtMonth(inv.mes)),
      body: '<div class="fx-grid rev"><div class="fprev" id="fvPrev"><div class="fprev-bar">' + ic((f.type || 'pdf').includes('pdf') ? 'file-text' : 'image') + '<div class="grow ellipsis"><b>' + esc(f.name || C.fileName(inv.nro, inv.residentId)) + '</b><span>' + (f.size ? fmtSize(f.size) : 'PDF') + '</span></div></div><div class="fprev-body"></div></div>' +
        '<div class="col gap-12">' + ui.kv([['Número', '<b class="num">' + esc(inv.nro) + '</b>'], ['Tipo', esc(inv.tipo)], ['Fecha de emisión', u.fmtDate(inv.fecha)], ['Período', u.cap(u.fmtMonth(inv.mes))], ['Residente', esc(BT.fullName(r))], ['Referente', esc(r.referente.nombre)], ['Importe', '<b>' + u.fmtMoney(inv.total) + '</b>'], ['IVA incluido', u.fmtMoney(inv.iva)]]) +
        '<div class="drive-dest">' + C.DRIVE_SVG + '<div class="grow"><div class="strong" style="font-size:var(--fs-sm)">Guardada en Google Drive ' + ui.badge('Sincronizada', 'ok', { icon: 'badge-check' }) + '</div>' + C.crumbs(C.drivePath(inv)) + '</div></div>' +
        '<div class="muted" style="font-size:var(--fs-xs)">' + ic('user-round', 'ic-xs') + ' Cargada por ' + esc(inv.cargadaPor || 'Paula Benavídez') + ' el ' + u.fmtDate(inv.cargadaTs ? new Date(inv.cargadaTs) : inv.fecha) + (inv.cargadaTs ? ' a las ' + u.fmtTime(new Date(inv.cargadaTs)) : '') + (f.session ? ' · en la demo el archivo queda disponible mientras esta página siga abierta' : '') + '</div></div></div>',
      foot: '<button class="btn ghost" data-close>Cerrar</button>' + (dataUrl ? '<button class="btn" data-dl>' + ic('download') + 'Descargar</button>' : '') + '<button class="btn" data-mail>' + ic('mail') + 'Enviar al referente</button><button class="btn primary" data-drive>' + C.DRIVE_SVG + 'Abrir en Drive</button>',
      onMount: (el) => {
        C.previewInto(el.querySelector('.fprev-body'), { dataUrl, type: f.type, inv });
        const dl = el.querySelector('[data-dl]'); if (dl) dl.addEventListener('click', async () => { const b = await (await fetch(dataUrl)).blob(); BT.download(b, f.name); });
        el.querySelector('[data-mail]').addEventListener('click', () => { BT.audit('Envió factura', 'Facturación', { residentId: r.id, detail: inv.nro + ' a ' + r.referente.nombre }); ui.toast('Factura enviada a ' + r.referente.nombre, { icon: 'mail', sub: 'Con el archivo adjunto · simulado en la demo' }); });
        el.querySelector('[data-drive]').addEventListener('click', () => ui.toast('Abriendo la carpeta en Google Drive', { icon: 'folder-open', sub: C.drivePath(inv).slice(-3).join(' › ') + ' · simulado en la demo' }));
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
    if (p.length) out.push({ id: 'cob-cfe', tone: 'info', icon: 'file-clock', title: p.length + (p.length === 1 ? ' factura del mes sin cargar' : ' facturas del mes sin cargar'), desc: 'Período ' + u.fmtMonth(C.curMes()) + ' · ' + u.fmtMoney(u.sum(p, (r) => C.totalMes(r.id, C.curMes()))), tab: 'cobranzas', params: { sub: 'efactura' }, action: () => { BT.state.sub.cob = 'efactura'; BT.go('cobranzas', { sub: 'efactura' }); } });
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
          (BT.can('money.write') ? '<button class="btn" data-act="fx">' + ic('file-up') + 'Cargar factura' + (pendCfe.length ? ' <span class="badge info" style="height:18px;padding:0 6px">' + pendCfe.length + '</span>' : '') + '</button><button class="btn primary" data-act="pay">' + ic('banknote') + 'Registrar pago</button>' : ''),
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
        { id: 'efactura', label: 'Facturas', icon: 'receipt-text', count: pendCfe.length || '' },
        { id: 'garantias', label: 'Depósitos de garantía', icon: 'shield-check' },
      ], (p, id) => PANELS[id](p, { mes, res, mor, pendCfe }));
      ui.on(el, {
        pay: (t) => C.registrarPago(t.dataset.id), fx: (t) => C.cargarFactura(t.dataset.id), drivecfg: () => C.driveConfig(), export: () => C.xlsxCuotas(),
        acc: (t) => C.openAccount(t.dataset.id), wa: (t) => C.recordatorio(t.dataset.id), pdf: (t) => C.estadoCuentaPDF(t.dataset.id), rec: (t) => C.reciboPDF(t.dataset.id),
        cfe: (t) => C.verFactura(t.dataset.id),
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
      const invs = BT.db.invoices.filter((i) => i.mes === mes && ids.has(i.residentId)).sort((a, b) => (b.cargadaTs || 0) - (a.cargadaTs || 0) || b.nro.localeCompare(a.nro));
      const tot = u.sum(invs, 'total');
      const w = BT.can('money.write');
      const sedeEj = BT.state.sede === 'ALL' ? 'BT1' : BT.state.sede;
      p.innerHTML =
        '<div class="card drive-card"><div class="drive-card-in">' + C.DRIVE_SVG.replace('class="gdrive"', 'class="gdrive lg"') + '<div class="grow"><div class="row gap-8 wrap"><b style="font-size:var(--fs-lg)">Google Drive conectado</b>' + ui.badge('Guardado automático', 'ok', { icon: 'refresh-cw' }) + '</div><div class="muted mt-4" style="font-size:var(--fs-sm)">Cada factura que cargues se guarda en ' + C.crumbs(C.drivePath({ mes, sede: sedeEj }).slice(0, -1).concat(BT.state.sede === 'ALL' ? ['BT1 o BT2'] : [sedeEj])) + '</div></div>' +
        '<button class="btn sm ghost" data-act="drivecfg">' + ic('folder-cog') + 'Cambiar carpeta</button></div>' +
        '<div class="fx-steps"><div><span>1</span><b>Cobrás acá</b><small>Cuotas, extras y pagos de cada residente</small></div><div><span>2</span><b>Facturás en tu sistema</b><small>Emitís el e-Ticket o la e-Factura como siempre</small></div><div><span>3</span><b>Volvés y la cargás</b><small>Número + PDF o foto → queda en Drive y en la cuenta</small></div></div></div>' +
        '<div class="grid g-3 stagger mt-16">' +
        ui.kpi({ label: 'Facturas cargadas', value: invs.length, icon: 'folder-check', foot: 'Guardadas en Google Drive' }) +
        ui.kpi({ label: 'Pendientes de cargar', value: pendCfe.length, icon: 'file-clock', tone: pendCfe.length ? 'warn' : 'ink', foot: pendCfe.length ? u.fmtMoney(u.sum(pendCfe, (r) => C.totalMes(r.id, mes))) + ' por facturar' : 'Período completo' }) +
        ui.kpi({ label: 'Total facturado', value: tot, money: true, icon: 'file-text', tone: 'info', foot: u.cap(u.fmtMonth(mes)) + ' · IVA incluido' }) + '</div>' +
        (pendCfe.length ? ui.card({ cls: 'mt-16', title: 'Falta cargar la factura', icon: 'file-clock', sub: 'Residentes con cuota de ' + u.fmtMonth(mes) + ' y sin factura cargada', actions: w ? '<button class="btn sm primary" data-act="fx">' + ic('file-up') + 'Cargar factura</button>' : '', bodyCls: 'flush', body: ui.table([
          { label: 'Residente', render: (r) => ui.person(BT.fullName(r), BT.sedeTag(r.sede) + ' Hab. ' + r.habitacion + r.cama + ' · ' + esc(r.referente.nombre)) },
          { label: 'Importe a facturar', align: 'num', render: (r) => '<b>' + u.fmtMoney(C.totalMes(r.id, mes)) + '</b>' },
          { label: 'Cobro', render: (r) => { const st = C.statusMes(r.id, mes); return ui.badge(st.label, st.tone, { icon: st.icon }); } },
          { label: '', align: 'num', render: (r) => (w ? '<button class="btn xs soft" data-act="fx" data-id="' + r.id + '">' + ic('file-up') + 'Cargar factura</button>' : '') },
        ], pendCfe, { compact: true }) }) : '<div class="alert ok mt-16">' + ic('badge-check') + '<div><b>Período completo.</b> Todas las facturas de ' + u.fmtMonth(mes) + ' están cargadas y guardadas en Drive.</div></div>') +
        ui.card({ cls: 'mt-16', title: 'Facturas de ' + u.fmtMonth(mes), icon: 'receipt-text', sub: 'Hacé clic para ver la factura adjunta', bodyCls: 'flush', body: ui.table([
          { label: 'Número', render: (i) => '<b class="num">' + esc(i.nro) + '</b>' },
          { label: 'Tipo', render: (i) => ui.badge(i.tipo, 'outline') },
          { label: 'Residente', render: (i) => { const r = BT.resident(i.residentId); return esc(BT.fullName(r)) + ' <span class="subtle">· ' + r.sede + '</span>'; } },
          { label: 'Emisión', render: (i) => '<span class="num">' + u.fmtDate(i.fecha) + '</span>' },
          { label: 'Total', align: 'num', render: (i) => '<b>' + u.fmtMoney(i.total) + '</b>' },
          { label: 'Archivo', render: (i) => '<span class="fchip">' + ic(i.file && (i.file.type || '').startsWith('image') ? 'image' : 'file-text', 'ic-xs') + '<span class="ellipsis">' + esc(i.file ? i.file.name : C.fileName(i.nro, i.residentId)) + '</span></span>' },
          { label: 'Drive', render: () => '<span class="drive-ok">' + C.DRIVE_SVG + 'Guardada</span>' },
          { label: '', align: 'num', render: (i) => '<button class="btn xs ghost" data-act="cfe" data-id="' + i.id + '">' + ic('eye') + 'Ver</button>' },
        ], invs, { compact: true, rowAttrs: (i) => 'class="click" data-act="cfe" data-id="' + i.id + '"', empty: { ill: 'default', title: 'Todavía no hay facturas cargadas', text: 'Cuando emitas una factura en tu sistema, cargala acá.' } }) });
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

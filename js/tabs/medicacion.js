/* ==========================================================================
   Medicación — plan por residente, planilla por turno, alertas y conciliación
   ========================================================================== */
(function () {
  'use strict';
  const BT = window.BT, u = BT.u, ic = BT.ic, esc = u.esc, ui = BT.ui;
  const ALL_HOURS = ['06:00', '08:00', '12:00', '16:00', '20:00', '22:00'];
  const CLIN_ROLES = ['direccion', 'medico', 'enfermeria', 'cuidadora'];

  BT.addCSS('med', `
  .med-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:14px 18px}
  .med-toolbar .input{width:auto;min-height:36px;padding:6px 10px}
  .med-toolbar .search-in{position:relative;flex:1;min-width:180px}
  .med-toolbar .search-in .input{width:100%;padding-left:34px}
  .med-toolbar .search-in .ic{position:absolute;left:10px;top:9px;color:var(--ink-400)}
  .med-wrap{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px;align-items:start}
  .med-side .sec-t.mt-16{margin-top:18px}
  .dose.static svg.chk{width:15px;height:15px}
  .med-side{position:sticky;top:calc(var(--topbar-h) + 12px);display:flex;flex-direction:column;gap:16px}
  @media (max-width:1080px){.med-wrap{grid-template-columns:1fr}.med-side{position:static;order:-1}.med-side .card:nth-child(2){display:none}}
  .med-res{overflow:hidden}
  .mr-h{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--ink-100);background:linear-gradient(180deg,var(--surface-2),#fff)}
  .mr-h .nm{font-weight:650;color:var(--ink-950);font-size:15px;line-height:1.2}
  .mr-h .mt{font-size:var(--fs-xs);color:var(--ink-500);display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:3px}
  .mr-dose{display:flex;align-items:center;gap:14px;padding:12px 18px;border-bottom:1px solid var(--ink-100);transition:background var(--d) var(--ease)}
  .mr-dose:last-child{border-bottom:0}
  .mr-dose:hover{background:var(--ink-50)}
  .mr-dose.is-done{background:linear-gradient(90deg,color-mix(in srgb, var(--brand-100) 55%, transparent),transparent 60%)}
  .mr-time{width:58px;flex:none;font-weight:700;font-size:15px;color:var(--ink-900);font-variant-numeric:tabular-nums;letter-spacing:-.01em}
  .mr-time small{display:block;font-size:10.5px;font-weight:600;color:var(--ink-400);letter-spacing:0}
  .mr-drug{flex:1;min-width:0}
  .mr-drug b{font-size:var(--fs-md);color:var(--ink-950);font-weight:650}
  .mr-drug .d2{font-size:var(--fs-sm);color:var(--ink-500)}
  .mr-drug .d3{font-size:var(--fs-xs);color:var(--ink-500);margin-top:2px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
  .mr-dose.is-done .mr-drug b{color:var(--ink-600)}
  .mr-st{font-size:var(--fs-xs);text-align:right;color:var(--ink-500);min-width:120px;line-height:1.35}
  .mr-st b{display:block;font-size:var(--fs-sm)}
  .dose.late{border:2px solid #e3b25a;background:var(--warn-bg);color:var(--warn);animation:medLate 2.2s ease-in-out infinite}
  .dose.ro{cursor:not-allowed;opacity:.65}
  .dose.ro:hover{transform:none;background:var(--surface);border-color:var(--ink-300);color:var(--ink-400)}
  @keyframes medLate{0%,100%{box-shadow:0 0 0 0 rgba(217,154,43,.35)}50%{box-shadow:0 0 0 6px rgba(217,154,43,0)}}
  .sum-list{display:flex;flex-direction:column;gap:8px;width:100%}
  .sum-list .row{justify-content:space-between;font-size:var(--fs-md)}
  .sum-list b{font-variant-numeric:tabular-nums}
  .med-pill{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:650;padding:2px 7px;border-radius:6px;background:var(--ink-100);color:var(--ink-700);font-variant-numeric:tabular-nums}
  .med-pill.on{background:var(--brand-50);color:var(--brand-700)}
  .res-list .li.on{background:var(--brand-50);box-shadow:inset 3px 0 0 var(--brand-600)}
  .agudo{border:1px solid var(--warn-line);background:linear-gradient(180deg,var(--warn-bg),#fff);border-radius:var(--r-md);padding:12px 14px}
  .stock-cell{min-width:110px}
  .stock-cell .muted{display:flex;gap:4px;align-items:center}
  .mr-drug .d3 > span{display:inline-flex;align-items:center;gap:4px}
  .med-day-head{display:flex;align-items:baseline;gap:8px}
  `);

  /* ---------------- Estado del módulo ---------------- */
  const ST = () => (BT.state.medUI = BT.state.medUI || { fecha: u.shiftDate(), turno: u.currentShift(), filtro: 'todas', q: '', rid: null, planQ: '' });
  const canGive = () => BT.can('meds.administer');
  const canIndicate = () => BT.can('clinical.indicate');
  const shortPerson = (n) => { const p = String(n || '').replace(/^(Dr\.|Dra\.|Lic\.)\s*/, '').split(/\s+/); return p[0] + (p[1] ? ' ' + p[1][0] + '.' : ''); };
  const doseKey = (d) => d.med.id + '|' + d.fecha + '|' + d.hora;
  const EST = {
    administrada: { t: 'Administrada', tone: 'ok', cls: 'done' },
    pendiente: { t: 'Pendiente', tone: '', cls: '' },
    atrasada: { t: 'Atrasada', tone: 'danger', cls: 'late' },
    rechazada: { t: 'Rechazada', tone: 'warn', cls: 'ref' },
    omitida: { t: 'Omitida', tone: 'danger', cls: 'miss' },
  };
  const fresh = (host) => { host.innerHTML = ''; const d = document.createElement('div'); host.appendChild(d); return d; };
  const sedesFor = () => (BT.state.sede === 'ALL' ? ['BT1', 'BT2'] : [BT.state.sede]);
  const roomSort = (a, b) => (a.sede + a.habitacion.padStart(2, '0') + a.cama).localeCompare(b.sede + b.habitacion.padStart(2, '0') + b.cama);
  const checkSvg = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2f7d4a" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  /** Dosis del turno para la sede actual (o ambas en consolidado) */
  function shiftDoses(fecha, turno) {
    return sedesFor().flatMap((s) => BT.dosesFor(fecha, turno, s));
  }
  /** Registro de una dosis (no se borra nunca) */
  BT.medRegister = function (dose, estado, nota) {
    const usr = BT.state.user;
    const rec = { id: u.uid('ma'), medId: dose.med.id, residentId: dose.resident.id, fecha: dose.fecha, hora: dose.hora, turno: u.shiftOfHour(dose.hora), estado, userId: usr.id, userName: usr.nombre, ts: Date.now(), nota: nota || '' };
    BT.db.medAdmin.push(rec);
    if (estado === 'administrada') dose.med.stock = Math.max(0, (dose.med.stock || 0) - 1);
    BT.save();
    BT.audit(estado === 'administrada' ? 'Administró' : 'Registró dosis ' + estado, 'Medicación', { residentId: dose.resident.id, detail: dose.med.droga + ' ' + dose.med.dosis + ' · ' + dose.hora + (nota ? ' · ' + nota : '') });
    dose.admin = rec; dose.estado = estado;
    return rec;
  };

  /* ---------------- Alertas ---------------- */
  function lateDosesToday(sede) {
    const now = new Date(); const op = u.shiftDate(now); const order = ['M', 'T', 'N'];
    const upTo = order.slice(0, order.indexOf(u.currentShift(now)) + 1);
    const out = [];
    upTo.forEach((t) => BT.dosesFor(op, t, sede).forEach((d) => { if (d.estado === 'atrasada') out.push(d); }));
    return { op, list: out };
  }
  BT.addAlerts(() => {
    const out = [];
    ['BT1', 'BT2'].forEach((s) => {
      const { op, list } = lateDosesToday(s);
      if (list.length) out.push({ id: 'med-late-' + s, tone: 'danger', icon: 'pill', sede: s, roles: CLIN_ROLES, when: list[0].due,
        title: list.length + (list.length === 1 ? ' dosis sin registrar' : ' dosis sin registrar') + ' · ' + s,
        desc: list.slice(0, 2).map((d) => d.hora + ' ' + d.med.droga + ' (' + BT.shortName(d.resident) + ')').join(' · ') + (list.length > 2 ? ' y ' + (list.length - 2) + ' más' : ''),
        tab: 'medicacion', params: { sub: 'planilla', fecha: op, turno: u.shiftOfHour(list[0].hora), sede: s } });
      const active = BT.db.meds.filter((m) => m.activo && (!m.hasta || m.hasta >= u.todayIso()) && BT.resident(m.residentId) && BT.resident(m.residentId).estado === 'activo' && BT.resident(m.residentId).sede === s);
      const low = active.filter((m) => BT.medDaysLeft(m) < 5);
      if (low.length) out.push({ id: 'med-stock-' + s, tone: 'warn', icon: 'package', sede: s, roles: ['direccion', 'medico', 'enfermeria'],
        title: 'Stock bajo de medicación · ' + s, desc: low.slice(0, 2).map((m) => m.droga + ' (' + BT.shortName(BT.resident(m.residentId)) + ', ' + BT.medDaysLeft(m) + ' d)').join(' · ') + (low.length > 2 ? ' y ' + (low.length - 2) + ' más' : ''),
        tab: 'medicacion', params: { sub: 'alertas' } });
      const rx = active.filter((m) => m.recetaVence && u.daysUntil(m.recetaVence) <= 7);
      if (rx.length) out.push({ id: 'med-rx-' + s, tone: rx.some((m) => u.daysUntil(m.recetaVence) <= 2) ? 'warn' : 'info', icon: 'file-warning', sede: s, roles: ['direccion', 'medico', 'enfermeria'],
        title: rx.length + (rx.length === 1 ? ' receta por vencer' : ' recetas por vencer') + ' · ' + s, desc: rx.slice(0, 2).map((m) => m.droga + ' · ' + BT.shortName(BT.resident(m.residentId)) + ' (' + u.relDay(m.recetaVence) + ')').join(' · '),
        tab: 'medicacion', params: { sub: 'alertas' } });
    });
    return out;
  });

  /* ==========================================================================
     Pestaña
     ========================================================================== */
  BT.tab({
    id: 'medicacion', label: 'Medicación', icon: 'pill', group: 'clinica', order: 4, roles: CLIN_ROLES,
    badge: () => { const s = BT.state.sede; return (s === 'ALL' ? ['BT1', 'BT2'] : [s]).reduce((n, x) => n + lateDosesToday(x).list.length, 0); },
    render(el, params) {
      const st = ST();
      if (params && !params._applied) {
        params._applied = true;
        if (params.fecha) st.fecha = params.fecha;
        if (params.turno) st.turno = params.turno;
        if (params.sub) BT.state.sub.med = params.sub;
        if (params.residentId) { st.rid = params.residentId; BT.state.sub.med = params.sub || 'plan'; }
      }
      const isCui = BT.isRole('cuidadora');
      el.innerHTML = ui.pageHeader({
        eyebrow: 'Salud · ' + BT.sedeName(), icon: 'pill', title: 'Medicación',
        sub: isCui ? 'Marcá cada dosis al administrarla. Queda registrada con tu usuario.' : 'Plan por residente, administración por turno y control contra la indicación médica.',
        actions: ui.exportMenu([
          { id: 'planilla', label: 'Planilla de medicación', sub: 'PDF A4 horizontal · fecha seleccionada', icon: 'file-text' },
          { id: 'plan', label: 'Plan de medicación', sub: 'Excel con todos los residentes', icon: 'file-spreadsheet' },
        ]) + (canIndicate() ? '<button class="btn primary" data-act="new-med">' + ic('plus') + 'Nueva indicación</button>' : ''),
      }) + '<div id="medTabs"></div>';
      const items = [
        { id: 'planilla', label: 'Planilla del turno', icon: 'list-checks' },
        { id: 'plan', label: 'Plan por residente', icon: 'clipboard-list' },
        { id: 'alertas', label: 'Alertas', icon: 'triangle-alert', count: alertCount() || '' },
      ];
      if (!isCui) items.push({ id: 'conciliacion', label: 'Control vs. indicación', icon: 'clipboard-check' });
      ui.subtabs(el.querySelector('#medTabs'), 'med', items, (panel, id) => {
        if (id === 'planilla') renderPlanilla(panel);
        else if (id === 'plan') renderPlan(panel);
        else if (id === 'alertas') renderAlertas(panel);
        else renderConciliacion(panel);
      });
      ui.on(el, {
        export: (t) => (t.dataset.id === 'planilla' ? exportPlanilla() : exportPlanExcel()),
        'new-med': () => medModal(ST().rid),
      });
    },
  });

  function alertCount() {
    return sedesFor().reduce((n, s) => {
      const active = BT.db.meds.filter((m) => m.activo && BT.resident(m.residentId) && BT.resident(m.residentId).estado === 'activo' && BT.resident(m.residentId).sede === s);
      return n + lateDosesToday(s).list.length + active.filter((m) => BT.medDaysLeft(m) < 5).length + active.filter((m) => m.recetaVence && u.daysUntil(m.recetaVence) <= 7).length;
    }, 0);
  }

  /* ---------------- Planilla del turno ---------------- */
  function renderPlanilla(host) {
    const panel = fresh(host);
    const st = ST();
    const SH = u.SHIFTS[st.turno];
    const isNow = st.fecha === u.shiftDate() && st.turno === u.currentShift();
    const doses = shiftDoses(st.fecha, st.turno);
    panel.innerHTML =
      '<div class="med-wrap"><div class="col" style="gap:16px">' +
      '<div class="card"><div class="med-toolbar">' +
      '<input type="date" class="input" data-med-fecha value="' + st.fecha + '" aria-label="Fecha">' +
      ui.seg('medTurno', ['M', 'T', 'N'].map((t) => ({ id: t, label: u.SHIFTS[t].label, icon: u.SHIFTS[t].icon })), st.turno, 'sm') +
      ui.seg('medFiltro', [{ id: 'todas', label: 'Todas' }, { id: 'pend', label: 'Pendientes' }], st.filtro, 'sm') +
      '<div class="search-in">' + ic('search', 'ic-sm') + '<input class="input" data-med-q placeholder="Buscar residente o medicamento…" value="' + esc(st.q) + '"></div>' +
      '</div></div>' +
      '<div id="medList" class="col" style="gap:14px"></div></div>' +
      '<aside class="med-side" id="medSide"></aside></div>';
    const map = {}; doses.forEach((d) => (map[doseKey(d)] = d));
    const drawList = () => {
      const q = u.norm(st.q);
      let ds = doses.filter((d) => !q || u.norm(BT.fullName(d.resident) + ' ' + d.med.droga + ' ' + d.resident.habitacion + d.resident.cama).includes(q));
      if (st.filtro === 'pend') ds = ds.filter((d) => d.estado === 'pendiente' || d.estado === 'atrasada');
      const byRes = u.groupBy(ds, (d) => d.resident.id);
      const res = Object.keys(byRes).map(BT.resident).sort(roomSort);
      const list = panel.querySelector('#medList');
      if (!res.length) {
        list.innerHTML = '<div class="card">' + (doses.length && st.filtro === 'pend'
          ? ui.empty({ ill: 'default', title: '¡Turno al día!', text: 'No quedan dosis pendientes en el turno ' + SH.label.toLowerCase() + '.' })
          : ui.empty({ ill: 'leaf', title: 'Sin dosis programadas', text: 'No hay medicación indicada para este turno y filtro.' })) + '</div>';
        return;
      }
      list.className = 'col stagger'; list.style.gap = '14px';
      list.innerHTML = res.map((r) => resCard(r, byRes[r.id])).join('');
    };
    const drawSide = () => { panel.querySelector('#medSide').innerHTML = sideHtml(doses, st, isNow); ui.enhance(panel.querySelector('#medSide')); };
    drawList(); drawSide();

    const updateSide = () => {
      const side = panel.querySelector('#medSide'); const c = countStates(doses);
      const done = c.administrada; const tot = doses.length; const pct = tot ? (done / tot) * 100 : 0;
      const circle = side.querySelector('[data-ring]'); if (circle) { const C = 2 * Math.PI * 52; circle.style.strokeDashoffset = C * (1 - pct / 100); }
      const lbl = side.querySelector('.ring .lbl b'); if (lbl) lbl.textContent = done + '/' + tot;
      Object.keys(c).forEach((k) => { const n = side.querySelector('[data-sum="' + k + '"]'); if (n) n.textContent = c[k]; });
      const nx = side.querySelector('[data-next]'); if (nx) nx.innerHTML = nextHtml(doses);
      const done100 = side.querySelector('[data-done100]'); if (done100) done100.classList.toggle('hidden', !(tot && done === tot));
    };
    const refreshRow = (key) => {
      const d = map[key]; const row = panel.querySelector('.mr-dose[data-key="' + CSS.escape(key) + '"]'); if (!row) return;
      row.outerHTML = doseRow(d);
      const card = panel.querySelector('.med-res[data-rid="' + d.resident.id + '"]');
      if (card) {
        const all = doses.filter((x) => x.resident.id === d.resident.id);
        const pending = all.filter((x) => x.estado === 'pendiente' || x.estado === 'atrasada').length;
        const tag = card.querySelector('[data-rtag]'); if (tag) tag.innerHTML = resTag(pending, all.length);
        if (!pending) ui.flash(card);
      }
      updateSide();
      BT.shell.updateNav();
    };

    panel.addEventListener('segchange', (e) => {
      if (e.detail.name === 'medTurno') { st.turno = e.detail.value; renderPlanilla(host); ui.enhance(host); }
      if (e.detail.name === 'medFiltro') { st.filtro = e.detail.value; drawList(); }
    });
    panel.querySelector('[data-med-fecha]').addEventListener('change', (e) => { if (e.target.value) { st.fecha = e.target.value; renderPlanilla(host); ui.enhance(host); } });
    panel.querySelector('[data-med-q]').addEventListener('input', u.debounce((e) => { st.q = e.target.value; drawList(); }, 120));
    panel.addEventListener('click', (e) => {
      const g = e.target.closest('[data-give]');
      if (g) {
        const d = map[g.dataset.give]; if (!d) return;
        if (d.admin) return doseInfo(d);
        if (!canGive()) return ui.toast('Solo enfermería y cuidadoras registran dosis', { type: 'info', icon: 'lock', sub: 'Tu rol puede consultar la planilla.' });
        if (st.fecha > u.todayIso()) return ui.toast('No se pueden registrar dosis futuras', { type: 'warn' });
        BT.medRegister(d, 'administrada');
        refreshRow(g.dataset.give);
        const left = d.med.stock; const daysLeft = BT.medDaysLeft(d.med);
        ui.toast('Dosis administrada', { sub: d.med.droga + ' ' + d.med.dosis + ' · ' + BT.shortName(d.resident) + (daysLeft < 5 ? ' · quedan ' + left + ' u.' : ''), icon: 'check' });
        return;
      }
      const m = e.target.closest('[data-more]');
      if (m) { const d = map[m.dataset.more]; if (!d) return; if (d.admin) return doseInfo(d); if (!canGive()) return ui.toast('Solo enfermería y cuidadoras registran dosis', { type: 'info', icon: 'lock' }); noGiveModal(d, () => { refreshRow(m.dataset.more); }); }
      const rn = e.target.closest('[data-open-res]');
      if (rn) { st.rid = rn.dataset.openRes; BT.state.sub.med = 'plan'; BT.refresh(); }
    });
  }
  function countStates(doses) { const c = { administrada: 0, pendiente: 0, atrasada: 0, rechazada: 0, omitida: 0 }; doses.forEach((d) => (c[d.estado] = (c[d.estado] || 0) + 1)); return c; }
  function nextHtml(doses) {
    const pend = doses.filter((d) => d.estado === 'pendiente').sort((a, b) => a.due - b.due);
    if (!pend.length) return '<span class="muted">Sin dosis pendientes</span>';
    const h = pend[0].hora; const n = pend.filter((d) => d.hora === h).length;
    return '<b style="font-size:var(--fs-lg)">' + h + '</b> <span class="muted">· ' + n + ' dosis · ' + (pend[0].due < Date.now() ? 'programada ' : '') + u.rel(pend[0].due) + '</span>';
  }
  function sideHtml(doses, st, isNow) {
    const c = countStates(doses); const done = c.administrada, tot = doses.length; const pct = tot ? (done / tot) * 100 : 0;
    const SH = u.SHIFTS[st.turno];
    const staff = BT.state.sede !== 'ALL' ? BT.shiftStaff(st.fecha, BT.state.sede, st.turno) : [];
    const line = (k, label, tone) => '<div class="row"><span class="row gap-6">' + ui.dot(tone) + label + '</span><b data-sum="' + k + '">' + (c[k] || 0) + '</b></div>';
    return '<div class="card hero"><div class="card-b">' +
      '<div class="row between"><div><div class="row gap-6 strong" style="font-size:var(--fs-lg)">' + ic(SH.icon, 'ic-sm') + 'Turno ' + SH.label.toLowerCase() + '</div><div class="muted" style="font-size:var(--fs-sm)">' + u.fmtDate(st.fecha) + ' · ' + SH.from + '–' + SH.to + '</div></div>' + (isNow ? ui.live('En curso') : ui.badge(st.fecha < u.shiftDate() || (st.fecha === u.shiftDate() && 'MTN'.indexOf(st.turno) < 'MTN'.indexOf(u.currentShift())) ? 'Cerrado' : 'Programado', 'outline')) + '</div>' +
      '<div class="row mt-16" style="gap:18px">' + ui.ring(pct, done + '/' + tot, 'administradas') + '<div class="sum-list">' + line('administrada', 'Administradas', 'ok') + line('pendiente', 'Pendientes', 'ink') + line('atrasada', 'Atrasadas', 'warn') + line('rechazada', 'Rechazadas', 'warn') + line('omitida', 'Omitidas', 'danger') + '</div></div>' +
      '<div data-done100 class="alert ok mt-16 ' + (tot && done === tot ? '' : 'hidden') + '">' + ic('party-popper') + '<div><b>Turno completo.</b> Todas las dosis quedaron registradas.</div></div>' +
      '</div></div>' +
      '<div class="card"><div class="card-b"><div class="sec-t">Próxima ronda</div><div data-next>' + nextHtml(doses) + '</div>' +
      (staff.length ? '<div class="sec-t mt-16">En turno</div><div class="col gap-6">' + staff.map((s) => ui.person(s.nombre, s.rol + (s.volante ? ' · Volante' : ''))).join('') + '</div>' : '') +
      '<div class="sec-t mt-16">Referencias</div><div class="col gap-6" style="font-size:var(--fs-sm)">' +
      '<div class="row"><span class="dose done static" style="--sz:26px;border-radius:8px">' + BT.check + '</span><span>Administrada (tocá para ver detalle)</span></div>' +
      '<div class="row"><span class="dose late" style="--sz:26px;border-radius:8px;animation:none">' + ic('plus', 'ic-xs') + '</span><span>Atrasada más de 60 min</span></div>' +
      '<div class="row"><span class="dose ref" style="--sz:26px;border-radius:8px">' + ic('hand', 'ic-xs') + '</span><span>Rechazada por el residente</span></div>' +
      '</div></div></div>';
  }
  function resTag(pending, total) {
    return pending ? ui.badge(pending + ' de ' + total + ' pendientes', 'outline') : ui.badge('Completo', 'ok', { icon: 'check' });
  }
  function resCard(r, ds) {
    const pending = ds.filter((d) => d.estado === 'pendiente' || d.estado === 'atrasada').length;
    const allRes = shiftDosesCache(r, ds);
    return '<section class="card med-res" data-rid="' + r.id + '"><div class="mr-h">' + ui.avatar(BT.fullName(r), { size: 'lg' }) +
      '<div class="grow" style="min-width:0"><button class="nm" data-open-res="' + r.id + '" style="all:unset;cursor:pointer;font-weight:650;font-size:15px;color:var(--ink-950)">' + esc(BT.fullName(r)) + '</button><div class="mt">' + BT.sedeTag(r.sede) + '<span>Hab. ' + r.habitacion + r.cama + '</span><span>·</span><span>' + u.age(r.nacimiento) + ' años</span>' +
      (r.alergias.length ? ui.badge('Alergia: ' + r.alergias.join(', '), 'danger', { icon: 'triangle-alert' }) : '') +
      (r.dieta.startsWith('Procesada') ? ui.badge('Disfagia: triturar si corresponde', 'warn', { icon: 'info' }) : '') + '</div></div>' +
      '<span data-rtag>' + resTag(pending, allRes) + '</span></div>' +
      ds.map(doseRow).join('') + '</section>';
  }
  function shiftDosesCache(r, ds) { return ds.length; }
  function doseRow(d) {
    const e = EST[d.estado]; const k = doseKey(d); const m = d.med;
    const st = d.admin
      ? '<b class="t-' + (e.tone || 'ok') + '">' + e.t + '</b>' + u.fmtTime(d.admin.ts) + ' · ' + esc(shortPerson(d.admin.userName))
      : d.estado === 'atrasada' ? '<b class="t-warn">Atrasada</b>' + u.rel(d.due) : '<b style="color:var(--ink-600)">Pendiente</b>' + (d.due > Date.now() ? u.rel(d.due) : 'en horario');
    const giveCls = d.admin ? e.cls : d.estado === 'atrasada' ? 'late' : '';
    const roCls = !d.admin && !canGive() ? ' ro' : '';
    return '<div class="mr-dose ' + (d.estado === 'administrada' ? 'is-done' : '') + '" data-key="' + esc(k) + '">' +
      '<div class="mr-time">' + d.hora + '<small>' + (d.fecha !== ST().fecha ? u.fmtDateShort(d.fecha) : u.SHIFTS[u.shiftOfHour(d.hora)].label) + '</small></div>' +
      '<div class="mr-drug"><b>' + esc(m.droga) + '</b> <span class="d2">' + esc(m.dosis) + ' · ' + esc(m.via) + '</span>' +
      '<div class="d3">' + (m.indicacion ? '<span>' + esc(m.indicacion) + '</span>' : '') + (m.agudo ? ui.badge('Cuadro agudo', 'warn', { icon: 'siren', tip: m.agudo.motivo }) : '') + (BT.medDaysLeft(m) < 5 ? ui.badge('Stock ' + m.stock + ' u.', 'danger', { tip: 'Quedan ' + BT.medDaysLeft(m) + ' días' }) : '') + (d.admin && d.admin.nota ? '<span class="t-warn">' + ic('message-circle', 'ic-xs') + ' ' + esc(d.admin.nota) + '</span>' : '') + '</div></div>' +
      '<div class="mr-st">' + st + '</div>' +
      ui.dose(giveCls + roCls, 'data-give="' + esc(k) + '" aria-label="' + (d.admin ? 'Ver registro' : 'Marcar como administrada') + '" data-tip="' + (d.admin ? 'Ver registro' : canGive() ? 'Marcar administrada' : 'Solo lectura') + '"', true) +
      '<button class="icon-btn ghost sm" data-more="' + esc(k) + '" aria-label="Más opciones" data-tip="' + (d.admin ? 'Detalle' : 'Rechazada u omitida') + '">' + ic('ellipsis', 'ic-sm') + '</button>' +
      '</div>';
  }
  function doseInfo(d) {
    const a = d.admin; const e = EST[a.estado];
    const late = a.ts - d.due;
    ui.modal({
      title: d.med.droga + ' ' + d.med.dosis, sub: BT.fullName(d.resident) + ' · Hab. ' + d.resident.habitacion + d.resident.cama, icon: 'pill',
      body: ui.kv([['Estado', ui.badge(e.t, e.tone, { dot: true })], ['Horario indicado', u.fmtDate(d.fecha) + ' ' + d.hora], ['Registrado', u.fmtDateTime(a.ts) + (late > 60 * 60000 ? ' ' + ui.badge('Fuera de horario', 'warn') : '')], ['Por', esc(a.userName)], ['Vía', esc(d.med.via)], ['Nota', a.nota ? esc(a.nota) : '']]) +
        '<div class="alert info mt-16">' + ic('lock') + '<div>Los registros de administración no se borran (Ley 18.331). Si hubo un error, dejá una enmienda en la historia clínica.</div></div>',
      foot: '<button class="btn" data-close>Cerrar</button>',
    });
  }
  function noGiveModal(d, done) {
    ui.modal({
      title: 'Dosis no administrada', sub: d.med.droga + ' ' + d.med.dosis + ' · ' + d.hora + ' · ' + BT.fullName(d.resident), icon: 'circle-x',
      body: '<div class="col gap-16">' +
        ui.field({ label: 'Qué pasó', name: 'estado', type: 'chips', required: true, lg: true, options: [{ v: 'rechazada', l: 'La rechazó', icon: 'hand' }, { v: 'omitida', l: 'No se administró', icon: 'circle-x' }] }) +
        ui.field({ label: 'Motivo frecuente', name: 'motivo', type: 'chips', options: ['Residente dormido', 'En consulta externa', 'Vómitos', 'Rechaza la medicación', 'Falta de stock', 'Suspensión indicada por médico'] }) +
        ui.field({ label: 'Nota para enfermería', name: 'nota', type: 'textarea', required: true, placeholder: 'Describí brevemente la situación y a quién se avisó…' }) +
        '<div class="alert warn">' + ic('bell') + '<div>Se notificará automáticamente a enfermería y quedará constancia en la historia clínica.</div></div></div>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>' + ic('check') + 'Guardar registro</button>',
      onMount: (el, close) => {
        el.addEventListener('chipchange', (e) => { const g = e.target.closest('[data-chips="motivo"]'); if (!g) return; const on = g.querySelector('.chip.on'); const ta = el.querySelector('[name="nota"]'); if (on && !ta.value) ta.value = on.dataset.v + '. '; });
        el.querySelector('[data-save]').addEventListener('click', () => {
          if (!ui.validate(el)) return;
          const f = ui.formData(el);
          BT.medRegister(d, f.estado, f.nota);
          BT.db.evoluciones.push({ id: u.uid('ev'), residentId: d.resident.id, ts: Date.now(), autor: BT.state.user.nombre, rol: BT.state.user.role, tipo: BT.isRole('cuidadora') ? 'Cuidados' : 'Enfermería', texto: 'Dosis de ' + d.med.droga + ' ' + d.med.dosis + ' (' + d.hora + ') ' + (f.estado === 'rechazada' ? 'rechazada por el residente' : 'no administrada') + '. ' + f.nota, enmiendas: [] });
          BT.save();
          close(); done && done();
          ui.toast('Registro guardado', { type: 'warn', icon: 'bell', sub: 'Se avisó a enfermería' });
        });
      },
    });
  }

  /* ---------------- Plan por residente ---------------- */
  function activeMeds(rid) { const t = u.todayIso(); return BT.db.meds.filter((m) => m.residentId === rid && m.activo && (!m.hasta || m.hasta >= t)); }
  function renderPlan(host) {
    const panel = fresh(host);
    const st = ST();
    const res = BT.residentsInSede().sort(roomSort);
    if (!res.length) { panel.innerHTML = '<div class="card">' + ui.empty({ title: 'Sin residentes' }) + '</div>'; return; }
    if (!st.rid || !res.some((r) => r.id === st.rid)) st.rid = res[0].id;
    panel.innerHTML = '<div class="grid g-side"><div class="card" style="align-self:start;overflow:hidden"><div class="card-b" style="padding-bottom:10px"><div class="search" style="width:100%"><span>' + ic('search') + '</span><input data-plan-q placeholder="Buscar residente…" value="' + esc(st.planQ) + '" style="padding-right:12px"></div></div><div class="list res-list" id="planList" style="max-height:640px;overflow:auto"></div></div><div id="planDetail"></div></div>';
    const drawList = () => {
      const q = u.norm(st.planQ);
      panel.querySelector('#planList').innerHTML = res.filter((r) => !q || u.norm(BT.fullName(r)).includes(q)).map((r) => {
        const ms = activeMeds(r.id); const low = ms.some((m) => BT.medDaysLeft(m) < 5); const rx = ms.some((m) => m.recetaVence && u.daysUntil(m.recetaVence) <= 7); const ag = ms.some((m) => m.agudo);
        return '<div class="li click ' + (r.id === st.rid ? 'on' : '') + '" data-pick="' + r.id + '">' + ui.avatar(BT.fullName(r), { size: 'sm' }) + '<div class="grow" style="min-width:0"><div class="t ellipsis">' + esc(BT.fullName(r)) + '</div><div class="d">' + r.sede + ' · Hab. ' + r.habitacion + r.cama + ' · ' + ms.length + ' medicamentos</div></div>' +
          (ag ? '<span data-tip="Cuadro agudo en curso" class="t-warn">' + ic('siren', 'ic-sm') + '</span>' : '') + (low ? '<span data-tip="Stock bajo">' + ui.dot('danger') + '</span>' : rx ? '<span data-tip="Receta por vencer">' + ui.dot('warn') + '</span>' : '') + '</div>';
      }).join('') || ui.empty({ ill: 'search', title: 'Sin resultados' });
    };
    const drawDetail = () => { const d = panel.querySelector('#planDetail'); d.innerHTML = planDetail(BT.resident(st.rid)); ui.enhance(d); };
    drawList(); drawDetail();
    panel.querySelector('[data-plan-q]').addEventListener('input', u.debounce((e) => { st.planQ = e.target.value; drawList(); }, 100));
    panel.addEventListener('click', (e) => {
      const p = e.target.closest('[data-pick]'); if (p) { st.rid = p.dataset.pick; panel.querySelectorAll('[data-pick]').forEach((x) => x.classList.toggle('on', x === p)); drawDetail(); return; }
      const a = e.target.closest('[data-plan-act]'); if (!a) return;
      const m = BT.db.meds.find((x) => x.id === a.dataset.id);
      const act = a.dataset.planAct;
      if (act === 'add') medModal(st.rid);
      if (act === 'suspend') suspendModal(m, drawDetail);
      if (act === 'renew') { m.recetaVence = u.iso(u.addDays(u.today(), 90)); BT.save(); BT.audit('Modificó', 'Receta', { residentId: m.residentId, detail: 'Renovó receta de ' + m.droga + ' hasta ' + u.fmtDate(m.recetaVence) }); ui.toast('Receta renovada', { sub: m.droga + ' · vence el ' + u.fmtDate(m.recetaVence) }); drawDetail(); drawList(); BT.shell.updateNav(); }
      if (act === 'restock') restockModal(m, () => { drawDetail(); drawList(); });
      if (act === 'hc') BT.go('historia', { residentId: st.rid });
    });
  }
  function planDetail(r) {
    const ms = activeMeds(r.id).sort((a, b) => (a.horarios[0] || '').localeCompare(b.horarios[0] || ''));
    const susp = BT.db.meds.filter((m) => m.residentId === r.id && (!m.activo || (m.hasta && m.hasta < u.todayIso())));
    const g = BT.depGrade(BT.lastBarthel(r));
    const agudos = ms.filter((m) => m.agudo);
    const daily = u.sum(ms, (m) => m.horarios.length);
    const hrs = ALL_HOURS.concat(['00:00', '02:00', '04:00']).filter((h) => ms.some((m) => m.horarios.includes(h)));
    const canRestock = BT.isRole('enfermeria', 'direccion');
    return '<div class="col" style="gap:16px">' +
      '<div class="card"><div class="card-b"><div class="row between wrap gap-16"><div class="row gap-16">' + ui.avatar(BT.fullName(r), { size: 'lg' }) + '<div><div class="strong" style="font-size:var(--fs-xl)">' + esc(BT.fullName(r)) + '</div><div class="muted" style="font-size:var(--fs-sm)">' + BT.sedeTag(r.sede) + ' Hab. ' + r.habitacion + r.cama + ' · ' + u.age(r.nacimiento) + ' años · ' + esc(r.mutualista) + '</div>' +
      '<div class="row wrap gap-6 mt-8">' + ui.badge('Dependencia ' + g.label.toLowerCase(), g.tone, { dot: true }) + (r.alergias.length ? ui.badge('Alergias: ' + r.alergias.join(', '), 'danger', { icon: 'triangle-alert' }) : ui.badge('Sin alergias conocidas', 'outline')) + ui.badge('Dieta ' + r.dieta.toLowerCase(), 'brand') + '</div></div></div>' +
      '<div class="row gap-6">' + (BT.can('clinical.read') ? '<button class="btn sm" data-plan-act="hc">' + ic('clipboard-list') + 'Historia clínica</button>' : '') + (canIndicate() ? '<button class="btn primary sm" data-plan-act="add">' + ic('plus') + 'Agregar medicación</button>' : '') + '</div></div>' +
      '<div class="kv-cards mt-16"><div class="kv-card"><div class="k">' + ic('pill', 'ic-xs') + 'Medicamentos activos</div><div class="v">' + ms.length + '</div></div><div class="kv-card"><div class="k">' + ic('clock', 'ic-xs') + 'Tomas diarias</div><div class="v">' + daily + '</div></div><div class="kv-card"><div class="k">' + ic('stethoscope', 'ic-xs') + 'Prescriptor</div><div class="v">' + esc(r.medico) + '</div></div></div>' +
      '</div></div>' +
      agudos.map((m) => '<div class="agudo"><div class="row between wrap"><div class="row gap-6 strong t-warn">' + ic('siren', 'ic-sm') + 'Medicación por cuadro agudo</div>' + ui.badge(m.hasta ? 'Hasta el ' + u.fmtDate(m.hasta) + ' (' + u.relDay(m.hasta) + ')' : 'En curso', 'warn') + '</div>' +
        '<div class="grid g-3 mt-12" style="gap:10px">' + [['Medicamento', esc(m.droga)], ['Motivo', esc(m.agudo.motivo)], ['Dosis', esc(m.agudo.dosis)], ['Duración', esc(m.agudo.duracion)], ['Inicio', u.fmtDate(m.desde)], ['Indicó', esc(m.prescriptor)]].map(([k, v]) => '<div><div class="muted" style="font-size:var(--fs-xs)">' + k + '</div><div style="font-weight:600">' + v + '</div></div>').join('') + '</div></div>').join('') +
      ui.card({
        title: 'Plan vigente', icon: 'clipboard-list', sub: 'Horarios de administración y control de stock por residente', bodyCls: 'flush',
        body: ms.length ? ui.table([
          { label: 'Medicamento', render: (m) => '<div class="strong">' + esc(m.droga) + (m.agudo ? ' ' + ui.badge('Agudo', 'warn') : '') + '</div><div class="muted" style="font-size:var(--fs-xs)">' + esc(m.dosis) + ' · ' + esc(m.via) + (m.indicacion ? ' · ' + esc(m.indicacion) : '') + '</div>' },
          { label: 'Horarios', render: (m) => '<div class="row wrap gap-4">' + hrs.map((h) => '<span class="med-pill ' + (m.horarios.includes(h) ? 'on' : '') + '" style="' + (m.horarios.includes(h) ? '' : 'opacity:.35') + '">' + h + '</span>').join('') + '</div>' },
          { label: 'Vigencia', render: (m) => '<div class="nowrap">' + u.fmtDate(m.desde) + '</div><div class="muted" style="font-size:var(--fs-xs)">' + (m.hasta ? 'hasta ' + u.fmtDate(m.hasta) : 'Crónica') + '</div>' },
          { label: 'Stock', cls: 'stock-cell', render: (m) => { const dl = BT.medDaysLeft(m); const tone = dl < 5 ? 'danger' : dl < 10 ? 'warn' : ''; return '<div class="row between" style="font-size:var(--fs-sm)"><b class="num ' + (tone ? 't-' + tone : '') + '">' + dl + ' días</b><span class="muted num">' + m.stock + ' u.</span></div>' + ui.bar(Math.min(100, (dl / 30) * 100), tone, true) + (m.repo ? '<div class="muted" style="font-size:11px;margin-top:3px">' + ic('truck', 'ic-xs') + ' Reposición pedida ' + u.rel(m.repo.ts) + '</div>' : ''); } },
          { label: 'Receta', render: (m) => { const n = u.daysUntil(m.recetaVence); return ui.badge(u.fmtDate(m.recetaVence), n < 0 ? 'danger' : n <= 7 ? 'warn' : 'outline', { tip: n < 0 ? 'Vencida' : 'Vence ' + u.relDay(m.recetaVence) }); } },
          { label: '', align: 'num', render: (m) => '<div class="row gap-4" style="justify-content:flex-end">' + (canRestock ? '<button class="btn xs" data-plan-act="restock" data-id="' + m.id + '" data-tip="Registrar reposición o pedir a farmacia">' + ic('package') + '</button>' : '') + (canIndicate() ? '<button class="btn xs" data-plan-act="renew" data-id="' + m.id + '" data-tip="Renovar receta 90 días">' + ic('refresh-ccw') + '</button><button class="btn xs danger" data-plan-act="suspend" data-id="' + m.id + '">Suspender</button>' : '') + '</div>' },
        ], ms) : ui.empty({ ill: 'leaf', title: 'Sin medicación activa', text: 'Este residente no tiene medicación indicada.' }),
      }) +
      (susp.length ? ui.card({ title: 'Suspendidas y finalizadas', icon: 'history', bodyCls: 'flush', body: ui.table([
        { label: 'Medicamento', render: (m) => '<span class="struck">' + esc(m.droga) + '</span> <span class="muted">' + esc(m.dosis) + '</span>' },
        { label: 'Período', render: (m) => u.fmtDate(m.desde) + ' – ' + u.fmtDate(m.hasta) },
        { label: 'Motivo', render: (m) => esc(m.suspension ? m.suspension.motivo : m.agudo ? 'Fin del tratamiento por cuadro agudo' : 'Fin de indicación') },
      ], susp, { compact: true }) }) : '') +
      '</div>';
  }
  function medModal(rid) {
    if (!canIndicate()) return ui.toast('Solo el médico puede indicar medicación', { type: 'info', icon: 'lock' });
    const res = BT.residentsInSede().sort(roomSort);
    ui.modal({
      title: 'Nueva indicación de medicación', sub: 'Queda firmada con tu usuario y se registra en la historia clínica', icon: 'pill', size: 'lg',
      body: '<div class="form-grid">' +
        ui.field({ label: 'Residente', name: 'rid', type: 'select', required: true, value: rid || '', placeholder: 'Elegí un residente', options: res.map((r) => ({ v: r.id, l: BT.fullName(r) + ' · ' + r.sede + ' ' + r.habitacion + r.cama })), full: true }) +
        ui.field({ label: 'Tipo de indicación', name: 'tipo', type: 'chips', required: true, value: 'Crónica', options: [{ v: 'Crónica', l: 'Tratamiento crónico', icon: 'repeat' }, { v: 'Agudo', l: 'Cuadro agudo', icon: 'siren' }], full: true }) +
        ui.field({ label: 'Medicamento', name: 'droga', required: true, placeholder: 'Ej.: Amoxicilina' }) +
        ui.field({ label: 'Dosis', name: 'dosis', required: true, placeholder: 'Ej.: 500 mg' }) +
        ui.field({ label: 'Vía', name: 'via', type: 'select', value: 'VO', options: ['VO', 'SC', 'IM', 'IV', 'Inhalatoria', 'Tópica', 'Oftálmica', 'Sublingual'] }) +
        ui.field({ label: 'Indicación', name: 'indicacion', placeholder: 'Ej.: con las comidas' }) +
        ui.field({ label: 'Horarios', name: 'horarios', type: 'chips', multi: true, required: true, options: ['06:00', '08:00', '12:00', '16:00', '20:00', '22:00'], full: true }) +
        ui.field({ label: 'Desde', name: 'desde', type: 'date', value: u.todayIso(), required: true }) +
        ui.field({ label: 'Stock inicial (unidades)', name: 'stock', type: 'number', value: 30 }) +
        '<div class="full req-box hidden" data-agudo><div class="t">' + ic('siren', 'ic-sm') + 'Constancia obligatoria por cuadro agudo (Decreto 356/016)</div><div class="form-grid mt-12">' +
        ui.field({ label: 'Motivo / cuadro clínico', name: 'motivo', full: true, placeholder: 'Ej.: infección urinaria con urocultivo positivo', attrs: 'data-agreq' }) +
        ui.field({ label: 'Dosis y frecuencia', name: 'agDosis', placeholder: 'Ej.: 500 mg c/8 h', attrs: 'data-agreq' }) +
        ui.field({ label: 'Duración', name: 'duracion', placeholder: 'Ej.: 7 días', attrs: 'data-agreq' }) +
        '</div></div></div>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>' + ic('check') + 'Indicar</button>',
      onMount: (el, close) => {
        const box = el.querySelector('[data-agudo]');
        const sync = () => {
          const ag = (ui.formData(el).tipo === 'Agudo');
          box.classList.toggle('hidden', !ag);
          box.querySelectorAll('[data-agreq]').forEach((i) => { if (ag) i.setAttribute('data-required', '1'); else { i.removeAttribute('data-required'); i.classList.remove('invalid'); } });
          box.querySelectorAll('label').forEach((l) => { const s = l.querySelector('.req'); if (ag && !s) l.insertAdjacentHTML('beforeend', '<span class="req">*</span>'); if (!ag && s) s.remove(); });
        };
        el.addEventListener('chipchange', sync); sync();
        el.querySelector('[data-save]').addEventListener('click', () => {
          if (!ui.validate(el)) return;
          const f = ui.formData(el); const ag = f.tipo === 'Agudo';
          let hasta = null;
          if (ag) { const n = parseInt(f.duracion, 10); if (n) hasta = u.iso(u.addDays(f.desde, n - 1)); }
          const m = { id: u.uid('md'), residentId: f.rid, droga: f.droga, dosis: f.dosis, via: f.via, horarios: f.horarios.sort(), indicacion: f.indicacion, desde: f.desde, hasta, stock: Number(f.stock) || 0, recetaVence: u.iso(u.addDays(u.today(), ag ? 30 : 90)), prescriptor: BT.state.user.nombre, activo: true };
          if (ag) m.agudo = { motivo: f.motivo, dosis: f.agDosis, duracion: f.duracion };
          BT.db.meds.push(m);
          BT.db.evoluciones.push({ id: u.uid('ev'), residentId: f.rid, ts: Date.now(), autor: BT.state.user.nombre, rol: BT.state.user.role, tipo: 'Médica', enmiendas: [],
            texto: (ag ? 'Cambio de medicación por cuadro agudo. Motivo: ' + f.motivo + '. Se indica ' + f.droga + ' ' + f.agDosis + ' durante ' + f.duracion + '.' : 'Se indica ' + f.droga + ' ' + f.dosis + ' ' + f.via + ' (' + m.horarios.join(', ') + ').') + (f.indicacion ? ' ' + f.indicacion + '.' : '') });
          BT.save();
          BT.audit('Modificó', 'Plan de medicación', { residentId: f.rid, detail: 'Indicó ' + f.droga + ' ' + f.dosis + (ag ? ' (cuadro agudo: ' + f.motivo + ')' : '') });
          close();
          ui.toast('Indicación registrada', { sub: f.droga + ' · ' + BT.shortName(BT.resident(f.rid)) + ' · quedó en la historia clínica' });
          ST().rid = f.rid; BT.state.sub.med = 'plan'; BT.refresh(); BT.shell.updateNav();
        });
      },
    });
  }
  function suspendModal(m, after) {
    const r = BT.resident(m.residentId);
    ui.modal({
      title: 'Suspender ' + m.droga, sub: BT.fullName(r) + ' · ' + m.dosis + ' ' + m.via, icon: 'circle-x',
      body: ui.field({ label: 'Motivo de la suspensión', name: 'motivo', type: 'textarea', required: true, placeholder: 'Ej.: control de PA en rango, se suspende por hipotensión…' }) + '<div class="alert info mt-16">' + ic('info') + '<div>La indicación original queda visible en el historial. Se registra una evolución médica automática.</div></div>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn danger" data-save>Suspender</button>',
      onMount: (el, close) => el.querySelector('[data-save]').addEventListener('click', () => {
        if (!ui.validate(el)) return;
        const f = ui.formData(el);
        m.activo = false; m.hasta = u.iso(u.addDays(u.today(), -1)) < m.desde ? m.desde : u.iso(u.addDays(u.today(), -1)); m.suspension = { ts: Date.now(), motivo: f.motivo, autor: BT.state.user.nombre };
        BT.db.evoluciones.push({ id: u.uid('ev'), residentId: r.id, ts: Date.now(), autor: BT.state.user.nombre, rol: BT.state.user.role, tipo: 'Médica', enmiendas: [], texto: 'Se suspende ' + m.droga + ' ' + m.dosis + '. Motivo: ' + f.motivo });
        BT.save(); BT.audit('Modificó', 'Plan de medicación', { residentId: r.id, detail: 'Suspendió ' + m.droga + ': ' + f.motivo });
        close(); ui.toast('Medicación suspendida', { sub: m.droga + ' · ' + BT.shortName(r) }); after && after(); BT.shell.updateNav();
      }),
    });
  }
  function restockModal(m, after) {
    const r = BT.resident(m.residentId);
    ui.modal({
      title: 'Stock de ' + m.droga, sub: BT.fullName(r) + ' · quedan ' + m.stock + ' unidades (' + BT.medDaysLeft(m) + ' días)', icon: 'package',
      body: '<div class="form-grid">' + ui.field({ label: 'Unidades recibidas', name: 'n', type: 'number', value: m.horarios.length * 30, hint: 'Equivale a 30 días de tratamiento' }) + ui.field({ label: 'Origen', name: 'origen', type: 'select', options: ['Entregada por la familia', 'Farmacia de la mutualista', 'Farmacia Central Unión'] }) + '</div>',
      foot: '<button class="btn ghost" data-req>' + ic('send') + 'Pedir a farmacia</button><button class="btn primary" data-save>' + ic('check') + 'Registrar ingreso</button>',
      onMount: (el, close) => {
        el.querySelector('[data-save]').addEventListener('click', () => { const f = ui.formData(el); const n = parseInt(f.n, 10) || 0; m.stock += n; BT.save(); BT.audit('Modificó', 'Stock de medicación', { residentId: r.id, detail: '+' + n + ' u. ' + m.droga + ' (' + f.origen + ')' }); close(); ui.toast('Stock actualizado', { sub: m.droga + ' · ' + m.stock + ' unidades' }); after && after(); BT.shell.updateNav(); });
        el.querySelector('[data-req]').addEventListener('click', () => { m.repo = { ts: Date.now(), por: BT.state.user.nombre }; BT.save(); BT.audit('Creó', 'Pedido de medicación', { residentId: r.id, detail: m.droga }); close(); ui.toast('Pedido enviado', { sub: 'Farmacia Central Unión · ' + m.droga, icon: 'send' }); after && after(); });
      },
    });
  }

  /* ---------------- Alertas ---------------- */
  function renderAlertas(host) {
    const panel = fresh(host);
    const sedes = sedesFor(); const late = sedes.flatMap((s) => lateDosesToday(s).list);
    const todayIso = u.todayIso();
    const non = BT.db.medAdmin.filter((a) => a.fecha >= u.iso(u.addDays(u.today(), -2)) && (a.estado === 'omitida' || a.estado === 'rechazada') && BT.resident(a.residentId) && sedes.includes(BT.resident(a.residentId).sede)).sort((a, b) => b.ts - a.ts);
    const active = BT.db.meds.filter((m) => m.activo && (!m.hasta || m.hasta >= todayIso) && BT.resident(m.residentId) && BT.resident(m.residentId).estado === 'activo' && sedes.includes(BT.resident(m.residentId).sede));
    const low = active.filter((m) => BT.medDaysLeft(m) < 5).sort((a, b) => BT.medDaysLeft(a) - BT.medDaysLeft(b));
    const rx = active.filter((m) => m.recetaVence && u.daysUntil(m.recetaVence) <= 7).sort((a, b) => a.recetaVence.localeCompare(b.recetaVence));
    const li = (icn, tone, t, d, w, extra = '') => '<div class="li">' + '<span class="li-ic ' + tone + '">' + ic(icn, 'ic-sm') + '</span><div class="grow" style="min-width:0"><div class="t">' + t + '</div><div class="d">' + d + '</div></div>' + (w ? '<span class="w">' + w + '</span>' : '') + extra + '</div>';
    const medById = (id) => BT.db.meds.find((m) => m.id === id) || {};
    panel.innerHTML = '<div class="grid g-3 stagger">' +
      ui.card({ title: 'Dosis sin registrar', icon: 'clock', sub: 'Atrasadas más de 60 minutos hoy', bodyCls: 'flush', actions: late.length ? ui.badge(late.length, 'danger') : ui.badge('Al día', 'ok', { icon: 'check' }),
        body: '<div class="list">' + (late.length ? late.map((d) => li('pill', 'danger', esc(d.med.droga) + ' ' + esc(d.med.dosis), esc(BT.shortName(d.resident)) + ' · Hab. ' + d.resident.habitacion + d.resident.cama + ' · ' + d.resident.sede, d.hora, '<button class="btn xs" data-go-plan="' + d.fecha + '|' + u.shiftOfHour(d.hora) + '">Ir</button>')).join('') : ui.empty({ ill: 'default', title: 'Todo registrado', text: 'No hay dosis atrasadas en el día.' })) +
          (non.length ? '<div class="sec-t" style="margin:14px 20px 4px">Rechazadas u omitidas (48 h)</div>' + non.slice(0, 6).map((a) => li(a.estado === 'rechazada' ? 'hand' : 'circle-x', 'warn', esc(medById(a.medId).droga || '') + ' · ' + esc(BT.shortName(BT.resident(a.residentId))), esc(a.nota || EST[a.estado].t), u.rel(a.ts))).join('') : '') + '</div>' }) +
      ui.card({ title: 'Stock bajo por residente', icon: 'package', sub: 'Menos de 5 días de tratamiento', bodyCls: 'flush', actions: low.length ? ui.badge(low.length, 'warn') : '',
        body: '<div class="list">' + (low.length ? low.map((m) => li('package', BT.medDaysLeft(m) < 2 ? 'danger' : 'warn', esc(m.droga) + ' ' + esc(m.dosis), esc(BT.shortName(BT.resident(m.residentId))) + ' · ' + m.stock + ' u. · ' + (m.repo ? 'pedido enviado' : 'sin pedido'), BT.medDaysLeft(m) + ' d', BT.isRole('enfermeria', 'direccion') && !m.repo ? '<button class="btn xs" data-req="' + m.id + '">' + ic('send') + 'Pedir</button>' : '')).join('') : ui.empty({ ill: 'leaf', title: 'Stock suficiente', text: 'Ningún residente con menos de 5 días.' })) + '</div>' }) +
      ui.card({ title: 'Recetas por vencer', icon: 'file-warning', sub: 'Próximos 7 días', bodyCls: 'flush', actions: rx.length ? ui.badge(rx.length, 'info') : '',
        body: '<div class="list">' + (rx.length ? rx.map((m) => li('file-text', u.daysUntil(m.recetaVence) <= 2 ? 'warn' : 'info', esc(m.droga) + ' ' + esc(m.dosis), esc(BT.shortName(BT.resident(m.residentId))) + ' · vence ' + u.fmtDate(m.recetaVence), u.relDay(m.recetaVence), canIndicate() ? '<button class="btn xs" data-renew="' + m.id + '">Renovar</button>' : '')).join('') : ui.empty({ ill: 'calendar', title: 'Sin vencimientos', text: 'Ninguna receta vence esta semana.' })) + '</div>' }) +
      '</div>';
    panel.addEventListener('click', (e) => {
      const g = e.target.closest('[data-go-plan]'); if (g) { const [f, t] = g.dataset.goPlan.split('|'); const st = ST(); st.fecha = f; st.turno = t; st.filtro = 'pend'; BT.state.sub.med = 'planilla'; BT.refresh(); return; }
      const rq = e.target.closest('[data-req]'); if (rq) { const m = BT.db.meds.find((x) => x.id === rq.dataset.req); m.repo = { ts: Date.now(), por: BT.state.user.nombre }; BT.save(); BT.audit('Creó', 'Pedido de medicación', { residentId: m.residentId, detail: m.droga }); ui.toast('Pedido enviado a farmacia', { icon: 'send', sub: m.droga }); renderAlertas(host); ui.enhance(host); return; }
      const rn = e.target.closest('[data-renew]'); if (rn) { const m = BT.db.meds.find((x) => x.id === rn.dataset.renew); m.recetaVence = u.iso(u.addDays(u.today(), 90)); BT.save(); BT.audit('Modificó', 'Receta', { residentId: m.residentId, detail: 'Renovó ' + m.droga }); ui.toast('Receta renovada', { sub: m.droga + ' · 90 días' }); renderAlertas(host); ui.enhance(host); BT.shell.updateNav(); }
    });
  }

  /* ---------------- Conciliación (lo administrado vs. lo indicado) ---------------- */
  function conciliacionData() {
    const now = Date.now(); const days = []; const perRes = {};
    for (let k = -6; k <= 0; k++) {
      const dIso = u.iso(u.addDays(u.today(), k));
      const day = { fecha: dIso, prog: 0, adm: 0, noadm: 0, sinreg: 0 };
      ['M', 'T', 'N'].forEach((t) => shiftDoses(dIso, t).forEach((d) => {
        if (d.due > now - 60 * 60000) return;
        const r = d.resident.id; const p = (perRes[r] = perRes[r] || { r: d.resident, prog: 0, adm: 0, rech: 0, omit: 0, sinreg: 0, fuera: 0, detalle: [] });
        p.prog++; day.prog++;
        if (d.estado === 'administrada') { p.adm++; day.adm++; if (d.admin.ts - d.due > 60 * 60000) { p.fuera++; p.detalle.push(d); } }
        else if (d.estado === 'rechazada') { p.rech++; day.noadm++; p.detalle.push(d); }
        else if (d.estado === 'omitida') { p.omit++; day.noadm++; p.detalle.push(d); }
        else { p.sinreg++; day.sinreg++; p.detalle.push(d); }
      }));
      days.push(day);
    }
    return { days, rows: Object.values(perRes).sort((a, b) => a.adm / a.prog - b.adm / b.prog || roomSort(a.r, b.r)) };
  }
  function renderConciliacion(host) {
    const panel = fresh(host);
    const { days, rows } = conciliacionData();
    const prog = u.sum(days, 'prog'), adm = u.sum(days, 'adm'), noadm = u.sum(days, 'noadm'), sinreg = u.sum(days, 'sinreg');
    const fuera = u.sum(rows, 'fuera');
    const pct = prog ? (adm / prog) * 100 : 100;
    panel.innerHTML = '<div class="grid g-4 stagger">' +
      ui.kpi({ label: 'Adherencia a la indicación', value: pct, decimals: 1, suffix: '%', icon: 'target', tone: pct >= 98 ? '' : 'warn', foot: 'Últimos 7 días' }) +
      ui.kpi({ label: 'Dosis programadas', value: prog, icon: 'pill', tone: 'ink', foot: 'Según plan vigente' }) +
      ui.kpi({ label: 'Sin registro', value: sinreg, icon: 'circle-alert', tone: sinreg ? 'danger' : '', foot: 'Requieren revisión' }) +
      ui.kpi({ label: 'Fuera de horario', value: fuera, icon: 'clock', tone: fuera ? 'warn' : '', foot: 'Más de 60 min de demora' }) +
      '</div>' +
      '<div class="grid g-main mt-16">' +
      ui.card({ title: 'Administración diaria', icon: 'chart-column', sub: 'Dosis administradas vs. no administradas o sin registro', body: '<div class="chart-box"><canvas id="cncChart"></canvas></div><div class="legend mt-12"><span><i style="background:' + BT.COLORS.brand + '"></i>Administradas</span><span><i style="background:' + BT.COLORS.warn + '"></i>Rechazadas u omitidas</span><span><i style="background:' + BT.COLORS.danger + '"></i>Sin registro</span></div>' }) +
      ui.card({ title: 'Cómo se controla', icon: 'shield-check', body: '<div class="col gap-16" style="font-size:var(--fs-md)">' +
        '<div class="row top">' + '<span class="li-ic brand" style="width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--brand-50);color:var(--brand-600);flex:none">' + ic('clipboard-list', 'ic-sm') + '</span><div>Cada dosis programada se genera desde la <b>indicación médica vigente</b>.</div></div>' +
        '<div class="row top"><span style="width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--brand-50);color:var(--brand-600);flex:none">' + ic('fingerprint', 'ic-sm') + '</span><div>La cuidadora la marca con <b>su usuario</b>; queda hora real y responsable.</div></div>' +
        '<div class="row top"><span style="width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--brand-50);color:var(--brand-600);flex:none">' + ic('scan-search', 'ic-sm') + '</span><div>El sistema detecta <b>dosis sin registro, rechazos y demoras</b> y avisa a enfermería.</div></div></div>' }) +
      '</div>' +
      ui.card({ cls: 'mt-16', title: 'Control por residente', icon: 'clipboard-check', sub: 'Programado según indicación vs. registrado (7 días)', bodyCls: 'flush',
        body: ui.table([
          { label: 'Residente', render: (p) => ui.person(BT.fullName(p.r), p.r.sede + ' · Hab. ' + p.r.habitacion + p.r.cama) },
          { label: 'Programadas', align: 'num', render: (p) => p.prog },
          { label: 'Administradas', align: 'num', render: (p) => p.adm },
          { label: 'Rech. / omit.', align: 'num', render: (p) => (p.rech + p.omit) || '<span class="subtle">0</span>' },
          { label: 'Sin registro', align: 'num', render: (p) => (p.sinreg ? '<b class="t-danger">' + p.sinreg + '</b>' : '<span class="subtle">0</span>') },
          { label: 'Adherencia', render: (p) => { const v = (p.adm / p.prog) * 100; return '<div class="row" style="min-width:150px"><div class="grow">' + ui.bar(v, v >= 98 ? '' : v >= 90 ? 'warn' : 'danger', true) + '</div><b class="num" style="width:52px;text-align:right">' + u.fmtNum(v, 1) + ' %</b></div>'; } },
          { label: 'Discrepancias', render: (p) => (p.detalle.length ? '<span data-tip="' + esc(p.detalle.slice(0, 3).map((d) => u.fmtDateShort(d.fecha) + ' ' + d.hora + ' ' + d.med.droga + ' (' + (d.admin ? EST[d.estado].t : 'sin registro') + ')').join(' · ')) + '">' + ui.badge(p.detalle.length + ' a revisar', p.sinreg ? 'danger' : 'warn') + '</span>' : ui.badge('Coincide', 'ok', { icon: 'check' })) },
        ], rows, { rowAttrs: (p) => (p.sinreg ? 'class="row-flag-danger"' : p.detalle.length ? 'class="row-flag-warn"' : '') }),
      });
    BT.chart(panel.querySelector('#cncChart'), {
      type: 'bar',
      data: { labels: days.map((d) => u.DIAS_C[u.toDate(d.fecha).getDay()] + ' ' + u.fmtDateShort(d.fecha)), datasets: [
        { label: 'Administradas', data: days.map((d) => d.adm), backgroundColor: BT.COLORS.brand, stack: 's', maxBarThickness: 38 },
        { label: 'Rechazadas u omitidas', data: days.map((d) => d.noadm), backgroundColor: BT.COLORS.warn, stack: 's', maxBarThickness: 38 },
        { label: 'Sin registro', data: days.map((d) => d.sinreg), backgroundColor: BT.COLORS.danger, stack: 's', maxBarThickness: 38 },
      ] },
      options: { scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true } }, interaction: { mode: 'index', intersect: false } },
    });
  }

  /* ---------------- Exportables ---------------- */
  function exportPlanilla() {
    const st = ST(); const D = BT.doc;
    const body = sedesFor().map((s) => {
      const res = BT.db.residents.filter((r) => r.sede === s && r.estado === 'activo').sort(roomSort);
      const meds = BT.db.meds.filter((m) => m.activo && m.desde <= st.fecha && (!m.hasta || m.hasta >= st.fecha) && res.some((r) => r.id === m.residentId));
      const hours = ALL_HOURS.concat(['00:00', '02:00', '04:00']).filter((h) => meds.some((m) => m.horarios.includes(h)));
      const rows = []; let tot = 0, adm = 0, no = 0;
      res.forEach((r) => meds.filter((m) => m.residentId === r.id).forEach((m, i) => rows.push({ r, m, first: i === 0 })));
      const cell = (m, h) => {
        if (!m.horarios.includes(h)) return '<span style="color:#dcd8cf">·</span>';
        tot++;
        const realDate = h < '06:00' ? u.iso(u.addDays(st.fecha, 1)) : st.fecha;
        const a = BT.db.medAdmin.find((x) => x.medId === m.id && x.fecha === realDate && x.hora === h);
        if (!a) return '<span style="display:inline-block;width:12px;height:12px;border:1.2px solid #9d988f;border-radius:3px"></span>';
        if (a.estado === 'administrada') { adm++; return checkSvg + ' <span class="num">' + u.fmtTime(a.ts) + '</span><br><span class="small muted">' + esc(u.initials(a.userName).toUpperCase()) + '</span>'; }
        no++; return D.badge(a.estado === 'rechazada' ? 'Rech.' : 'Omit.', a.estado === 'rechazada' ? 'warn' : 'danger');
      };
      const cols = [
        { label: 'Hab.', render: (x) => (x.first ? '<b>' + x.r.habitacion + x.r.cama + '</b>' : ''), width: '34px' },
        { label: 'Residente', render: (x) => (x.first ? '<b>' + esc(BT.fullName(x.r)) + '</b>' + (x.r.alergias.length ? '<br><span class="small" style="color:#b4352b">Alergia: ' + esc(x.r.alergias.join(', ')) + '</span>' : '') : ''), width: '150px' },
        { label: 'Medicamento', render: (x) => '<b>' + esc(x.m.droga) + '</b> ' + esc(x.m.dosis) + '<br><span class="small muted">' + esc(x.m.via) + (x.m.agudo ? ' · cuadro agudo' : '') + '</span>' },
      ].concat(hours.map((h) => ({ label: h, align: 'center', render: (x) => cell(x.m, h), width: '58px' })));
      const table = D.table(cols, rows, { compact: true });
      return D.section(BT.sedeName(s), D.kpis([{ label: 'Dosis programadas', value: tot }, { label: 'Administradas', value: adm }, { label: 'No administradas', value: no }, { label: 'Pendientes / sin registro', value: tot - adm - no }]) + table);
    }).join('');
    D.open({
      title: 'Planilla de medicación', kicker: 'Registro de enfermería', landscape: true,
      subtitle: u.cap(u.fmtDateLong(st.fecha)) + ' · ' + BT.sedeName(),
      filename: 'Planilla de medicación ' + u.fmtDate(st.fecha).replace(/\//g, '-') + ' ' + BT.sedeLabel(),
      body: body + D.note('<b>Referencias:</b> ' + checkSvg + ' administrada (hora real e iniciales de quien administró) · <b>Rech.</b> rechazada por el residente · <b>Omit.</b> no administrada con motivo · casilla vacía: pendiente o sin registro. Los registros no se borran (Ley 18.331).') +
        D.signatures(['Lic. en Enfermería responsable', 'Cuidadora turno mañana', 'Cuidadora turno tarde', 'Cuidadora turno noche']),
    });
  }
  function exportPlanExcel() {
    const t = u.todayIso();
    const rows = BT.db.meds.filter((m) => m.activo && (!m.hasta || m.hasta >= t)).map((m) => ({ m, r: BT.resident(m.residentId) })).filter((x) => x.r && x.r.estado === 'activo' && BT.inSede(x.r)).sort((a, b) => roomSort(a.r, b.r));
    BT.xlsx({
      filename: 'Plan de medicación ' + BT.sedeLabel() + ' ' + u.fmtDate(new Date()).replace(/\//g, '-'), title: 'Plan de medicación', subtitle: 'Vigente al ' + u.fmtDate(new Date()),
      sheets: [{ name: 'Plan de medicación', freezeCols: 3, columns: [
        { header: 'Sede', key: 'sede', width: 8, value: (x) => x.r.sede },
        { header: 'Hab.', key: 'hab', width: 7, value: (x) => x.r.habitacion + x.r.cama },
        { header: 'Residente', key: 'res', width: 30, value: (x) => BT.fullName(x.r) },
        { header: 'Medicamento', key: 'droga', width: 28, value: (x) => x.m.droga },
        { header: 'Dosis', key: 'dosis', width: 16, value: (x) => x.m.dosis },
        { header: 'Vía', key: 'via', width: 12, value: (x) => x.m.via },
        { header: 'Horarios', key: 'hor', width: 24, value: (x) => x.m.horarios.join(' · ') },
        { header: 'Indicación', key: 'ind', width: 34, value: (x) => x.m.indicacion || '' },
        { header: 'Tipo', key: 'tipo', width: 14, value: (x) => (x.m.agudo ? 'Cuadro agudo' : 'Crónica') },
        { header: 'Motivo (agudo)', key: 'mot', width: 36, value: (x) => (x.m.agudo ? x.m.agudo.motivo : '') },
        { header: 'Desde', key: 'desde', width: 12, fmt: 'date', value: (x) => x.m.desde },
        { header: 'Hasta', key: 'hasta', width: 12, fmt: 'date', value: (x) => x.m.hasta },
        { header: 'Stock (u.)', key: 'stock', width: 11, fmt: 'int', value: (x) => x.m.stock },
        { header: 'Días de stock', key: 'dias', width: 13, fmt: 'int', value: (x) => BT.medDaysLeft(x.m) },
        { header: 'Receta vence', key: 'rx', width: 14, fmt: 'date', value: (x) => x.m.recetaVence },
        { header: 'Prescriptor', key: 'pr', width: 22, value: (x) => x.m.prescriptor },
      ], rows }],
    });
  }
})();

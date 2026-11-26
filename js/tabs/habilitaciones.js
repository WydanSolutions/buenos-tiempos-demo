/* ==========================================================================
   Habilitaciones y vencimientos + Modo inspección
   ========================================================================== */
(function () {
  'use strict';
  const BT = window.BT; const u = BT.u; const ui = BT.ui; const ic = BT.ic; const esc = u.esc;
  const REQ_DOCS = ['Cédula de identidad', 'Consentimiento informado', 'Contrato de servicios', 'Ficha de usuario (Ord. 483/017)', 'Carné de vacunas', 'Certificado médico de ingreso'];
  const DOC_SHORT = { 'Cédula de identidad': 'Cédula', 'Consentimiento informado': 'Consent.', 'Contrato de servicios': 'Contrato', 'Ficha de usuario (Ord. 483/017)': 'Ficha 483', 'Carné de vacunas': 'Vacunas', 'Certificado médico de ingreso': 'Cert. médico' };
  const AREAS = [
    { id: 'est', label: 'Establecimiento', icon: 'building-2' },
    { id: 'res', label: 'Residentes', icon: 'users' },
    { id: 'per', label: 'Personal', icon: 'id-card' },
    { id: 'rat', label: 'Ratio de cuidadoras', icon: 'scale' },
    { id: 'reg', label: 'Registros obligatorios', icon: 'clipboard-check' },
  ];

  BT.addCSS('hab', `
    .hab-row { display: grid; grid-template-columns: auto minmax(0, 1.6fr) auto minmax(0, 1fr) auto auto; gap: 14px; align-items: center; padding: 12px 20px; border-bottom: 1px solid var(--ink-100); transition: background var(--d-fast); animation: rowIn var(--d-slow) var(--ease-out) both; }
    .hab-row:last-child { border-bottom: 0; }
    .hab-row:hover { background: var(--ink-50); }
    .hab-row .t { font-weight: 600; color: var(--ink-950); font-size: var(--fs-md); }
    .hab-row .d { font-size: var(--fs-xs); color: var(--ink-500); }
    .hab-days { font-variant-numeric: tabular-nums; text-align: right; min-width: 118px; }
    .hab-days b { display: block; font-size: var(--fs-md); }
    .hab-days span { font-size: var(--fs-xs); color: var(--ink-500); }
    .hab-doc { cursor: pointer; max-width: 210px; overflow: hidden; text-overflow: ellipsis; }
    .hab-doc:hover { border-color: var(--brand-300); color: var(--brand-700); }
    @media (max-width: 900px) { .hab-row { grid-template-columns: auto 1fr auto; } .hab-row .hide-sm { display: none; } }
    .hab-next { display: flex; gap: 12px; align-items: center; padding: 10px 20px; border-bottom: 1px solid var(--ink-100); }
    .hab-next:last-child { border-bottom: 0; }
    .hab-cal { width: 44px; height: 46px; border-radius: 10px; border: 1px solid var(--line); background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; flex: none; box-shadow: var(--sh-1); }
    .hab-cal small { font-size: 9.5px; font-weight: 700; text-transform: uppercase; color: var(--danger); letter-spacing: .05em; line-height: 1; }
    .hab-cal b { font-size: 17px; line-height: 1.1; font-variant-numeric: tabular-nums; }
    .insp-top { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 24px; align-items: center; }
    .insp-top > * { min-width: 0; }
    .insp-top h1 { font-size: 28px; letter-spacing: -.03em; }
    .insp-area { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .insp-area .hd { display: flex; align-items: center; gap: 10px; }
    .insp-area .sc { font-size: 26px; font-weight: 750; letter-spacing: -.03em; font-variant-numeric: tabular-nums; line-height: 1; }
    .dm { width: 24px; height: 24px; border-radius: 7px; display: inline-grid; place-items: center; }
    .dm svg { width: 14px; height: 14px; stroke-width: 2.6; }
    .dm.ok { background: var(--ok-bg); color: var(--ok); }
    .dm.falta { background: var(--danger-bg); color: var(--danger); }
    .dm.vencido { background: var(--warn-bg); color: var(--warn); }
    .table.matrix th, .table.matrix td { text-align: center; }
    .table.matrix th:first-child, .table.matrix td:first-child { text-align: left; }
    .miss { display: flex; gap: 12px; align-items: center; padding: 10px 20px; border-bottom: 1px solid var(--ink-100); animation: rowIn var(--d-slow) var(--ease-out) both; }
    .miss:last-child { border-bottom: 0; }
    .insp-pulse { animation: pulse 1.8s infinite; }
    @media (max-width: 1180px) { .insp-top { grid-template-columns: auto minmax(0, 1fr); } .insp-top > :last-child { grid-column: 1 / -1; flex-direction: row; flex-wrap: wrap; } }
    @media (max-width: 640px) { .insp-top { grid-template-columns: 1fr; } }
  `);

  const todayIso = () => u.todayIso();
  const daysTxt = (n) => (n < 0 ? 'Vencido hace ' + -n + ' día' + (n === -1 ? '' : 's') : n === 0 ? 'Vence hoy' : 'Vence en ' + n + ' día' + (n === 1 ? '' : 's'));
  const compList = () => u.sortBy(BT.bySede(BT.db.compliance), (c) => c.vence);
  const openRes = (id) => (BT.actions.openResident ? BT.actions.openResident(id) : BT.go('residentes'));
  const openStaff = (id) => (BT.actions.openStaff ? BT.actions.openStaff(id) : BT.go('personal'));

  /* ---------------- Motor de chequeos (inspección) ---------------- */
  BT.inspectionChecks = function () {
    const out = []; const T = todayIso();
    const S = BT.state.sede === 'ALL' ? ['BT1', 'BT2'] : [BT.state.sede];
    BT.bySede(BT.db.compliance).forEach((c) => { const n = u.daysUntil(c.vence); out.push({ area: 'est', item: c.item, who: c.organismo, sede: c.sede, ok: n >= 0, warn: n >= 0 && n <= 30, detail: daysTxt(n) + ' · ' + u.fmtDate(c.vence), act: { t: 'comp', id: c.id } }); });
    BT.residentsInSede().forEach((r) => {
      REQ_DOCS.forEach((tipo) => {
        const d = (r.docs || []).find((x) => x.tipo === tipo);
        const st = !d ? 'falta' : d.estado !== 'ok' ? d.estado : d.vence && d.vence < T ? 'vencido' : 'ok';
        out.push({ area: 'res', item: tipo, who: BT.fullName(r), sede: r.sede, ok: st === 'ok', state: st, detail: st === 'falta' ? 'No consta en la ficha' : st === 'vencido' ? 'Documento vencido' : 'Vigente', act: { t: 'res', id: r.id }, rid: r.id });
      });
      const lb = (r.barthel || []).slice(-1)[0];
      out.push({ area: 'res', item: 'Barthel actualizado (≤ 6 meses)', who: BT.fullName(r), sede: r.sede, ok: !!lb && u.daysUntil(lb.fecha) >= -183, detail: lb ? 'Última evaluación ' + u.fmtDate(lb.fecha) : 'Sin evaluación', act: { t: 'res', id: r.id }, rid: r.id });
      out.push({ area: 'res', item: 'Plan de atención individual vigente', who: BT.fullName(r), sede: r.sede, ok: !!(r.plan && r.plan.revision >= T), detail: r.plan ? 'Revisión ' + u.fmtDate(r.plan.revision) : 'Sin plan', act: { t: 'res', id: r.id }, rid: r.id });
    });
    BT.bySede(BT.db.staff).forEach((s) => {
      const cs = s.carneSalud && s.carneSalud.vence; const n = cs ? u.daysUntil(cs) : -1;
      out.push({ area: 'per', item: 'Carné de salud vigente', who: s.nombre, sede: s.sede, ok: n >= 0, warn: n >= 0 && n <= 30, detail: cs ? daysTxt(n) + ' · ' + u.fmtDate(cs) : 'No presentado', act: { t: 'staff', id: s.id }, sid: s.id });
      if (s.rol === 'Cuidadora') out.push({ area: 'per', item: 'Curso de cuidados (SNC)', who: s.nombre, sede: s.sede, ok: /^Certificado/.test(s.cursoCuidados.estado), warn: s.cursoCuidados.estado === 'En curso', detail: s.cursoCuidados.estado + (s.cursoCuidados.fecha ? ' · ' + u.fmtDate(s.cursoCuidados.fecha) : ''), act: { t: 'staff', id: s.id }, sid: s.id });
      const rcp = (s.capacitaciones || []).find((c) => /^RCP/.test(c.nombre));
      out.push({ area: 'per', item: 'RCP y primeros auxilios vigente', who: s.nombre, sede: s.sede, ok: !!rcp && (!rcp.vence || rcp.vence >= T), detail: rcp ? 'Realizado ' + u.fmtDate(rcp.fecha) + (rcp.vence ? ' · vence ' + u.fmtDate(rcp.vence) : '') : 'Sin constancia', act: { t: 'staff', id: s.id }, sid: s.id });
    });
    const dIso = u.shiftDate(new Date());
    S.forEach((sede) => ['M', 'T', 'N'].forEach((t) => { const st = BT.ratioStatus(dIso, sede, t); out.push({ area: 'rat', item: 'Turno ' + u.SHIFTS[t].label.toLowerCase() + ' (' + u.SHIFTS[t].from + '–' + u.SHIFTS[t].to + ')', who: BT.sedeName(sede), sede, ok: st.ok, detail: st.assigned + ' asignada' + (st.assigned === 1 ? '' : 's') + ' de ' + st.required + ' requerida' + (st.required === 1 ? '' : 's'), act: { t: 'ratio', fecha: dIso, sede, turno: t }, st }); }));
    BT.db.restrictions.forEach((r) => { const res = BT.resident(r.residentId); if (!res || !BT.inSede(res)) return; const ok = !!(r.motivo && r.indicadoPor && r.desde && r.hasta); out.push({ area: 'reg', item: 'Restricción de ' + r.tipo.toLowerCase() + ' fundamentada', who: BT.fullName(res), sede: res.sede, ok, detail: ok ? 'Indicada por ' + r.indicadoPor + ' · hasta ' + u.fmtDate(r.hasta) : 'Falta motivo, responsable o vigencia', act: { t: 'res', id: res.id }, rid: res.id }); });
    BT.db.meds.filter((m) => m.agudo && m.activo !== false).forEach((m) => { const res = BT.resident(m.residentId); if (!res || !BT.inSede(res) || res.estado !== 'activo') return; const a = m.agudo; const ok = !!(a.motivo && a.dosis && a.duracion); out.push({ area: 'reg', item: 'Medicación por cuadro agudo: ' + m.droga, who: BT.fullName(res), sede: res.sede, ok, detail: ok ? esc(a.motivo) + ' · ' + a.dosis + ' · ' + a.duracion : 'Falta motivo, dosis o duración', act: { t: 'res', id: res.id }, rid: res.id }); });
    return out;
  };
  const score = (arr) => (arr.length ? (arr.filter((c) => c.ok).length / arr.length) * 100 : 100);

  /* ---------------- Vista principal ---------------- */
  function render(el) {
    if (BT.state.sub.habInsp) return renderInspection(el);
    const list = compList();
    const venc = list.filter((c) => u.daysUntil(c.vence) < 0), prox = list.filter((c) => { const n = u.daysUntil(c.vence); return n >= 0 && n <= 30; });
    const checks = BT.inspectionChecks(); const sc = score(checks);
    el.innerHTML = ui.pageHeader({
      eyebrow: 'Habilitaciones y vencimientos', icon: 'shield-check', title: 'Todo lo que vence, en un vistazo',
      sub: BT.sedeName() + ' · MSP, MIDES, Bomberos, seguros, contratos y documentación',
      actions: '<button class="btn" data-act="pdf-venc">' + ic('file-text') + 'Informe de vencimientos</button><button class="btn dark" data-act="insp">' + ic('scan-search') + 'Modo inspección</button>',
    }) +
      '<div class="grid g-4 stagger mb-16">' +
      ui.kpi({ label: 'Vencidos', value: venc.length, icon: 'circle-x', tone: venc.length ? 'danger' : 'ink', foot: venc.length ? 'Requieren acción inmediata' : 'Ninguno vencido' }) +
      ui.kpi({ label: 'Vencen en 30 días', value: prox.length, icon: 'calendar-clock', tone: 'warn', foot: 'Planificá la renovación' }) +
      ui.kpi({ label: 'Al día', value: list.length - venc.length - prox.length, icon: 'circle-check', foot: 'De ' + list.length + ' habilitaciones' }) +
      ui.kpi({ label: 'Preparación para inspección', value: sc, decimals: 0, suffix: '%', icon: 'scan-search', tone: sc >= 95 ? '' : 'warn', foot: checks.filter((c) => !c.ok).length + ' puntos a resolver' }) +
      '</div>' +
      '<div class="grid g-main"><section class="card"><div class="card-h"><div><h3>' + ic('traffic-cone') + 'Semáforo del establecimiento</h3><div class="sub">Ordenado por urgencia · las habilitaciones generales aplican a ambas sedes</div></div><div class="row gap-6">' + ui.badge(venc.length + ' vencido' + (venc.length === 1 ? '' : 's'), 'danger', { dot: true }) + ui.badge(prox.length + ' próximos', 'warn', { dot: true }) + '</div></div><div class="card-b flush">' +
      list.map((c, i) => { const n = u.daysUntil(c.vence); const tone = BT.dueTone(c.vence); return '<div class="hab-row" style="animation-delay:' + Math.min(i * 25, 300) + 'ms">' + ui.traffic(tone) + '<div style="min-width:0"><div class="t ellipsis">' + esc(c.item) + '</div><div class="d">' + esc(c.organismo) + '</div></div>' + (c.sede === 'ALL' ? ui.badge('Galauru', 'outline') : BT.sedeTag(c.sede)) + '<span class="badge outline hab-doc hide-sm" data-act="doc" data-id="' + c.id + '" data-tip="Ver documento adjunto">' + ic('paperclip') + esc(c.doc) + '</span><div class="hab-days"><b class="' + (tone === 'danger' ? 't-danger' : tone === 'warn' ? 't-warn' : '') + '">' + u.fmtDate(c.vence) + '</b><span>' + daysTxt(n) + '</span></div><button class="btn xs ' + (tone === 'ok' ? 'ghost' : '') + '" data-act="renew" data-id="' + c.id + '">' + ic('refresh-ccw') + 'Renovar</button></div>'; }).join('') +
      '</div></section>' +
      '<div class="col gap-16"><section class="card"><div class="card-h"><div><h3>' + ic('calendar-days') + 'Próximos 90 días</h3><div class="sub">Agenda de renovaciones</div></div></div><div class="card-b flush">' + nextList() + '</div></section>' +
      '<section class="card tint"><div class="card-b"><div class="row gap-16">' + ui.ring(sc, Math.round(sc) + '%', 'listo') + '<div><div class="strong" style="font-size:var(--fs-lg)">¿Llega una inspección?</div><p class="muted mt-8" style="font-size:var(--fs-sm)">El Modo inspección junta toda la documentación de residentes, funcionarias y del establecimiento, y te muestra qué falta.</p><button class="btn primary sm mt-12" data-act="insp">' + ic('scan-search') + 'Activar Modo inspección</button></div></div></div></section></div></div>' +
      '<div class="grid g-2 mt-16">' + resDocsCard(checks) + staffDocsCard(checks) + '</div>';
    ui.on(el, {
      insp: () => enterInspection(),
      renew: (t) => renewFlow(t.dataset.id),
      doc: (t) => { const c = BT.db.compliance.find((x) => x.id === t.dataset.id); BT.audit('Leyó', 'Documento de habilitación', { sede: c.sede, detail: c.item }); ui.toast('Documento abierto (simulado)', { sub: c.doc, icon: 'file-text' }); },
      'open-res': (t) => openRes(t.dataset.id),
      'open-staff': (t) => openStaff(t.dataset.id),
      'pdf-venc': () => pdfVencimientos(),
    });
  }
  function nextList() {
    const items = [];
    compList().forEach((c) => { const n = u.daysUntil(c.vence); if (n >= 0 && n <= 90) items.push({ d: c.vence, t: c.item, s: c.sede === 'ALL' ? 'Galauru SAS' : c.sede, ic: 'building-2' }); });
    BT.bySede(BT.db.staff).forEach((s) => { const n = u.daysUntil(s.carneSalud.vence); if (n >= 0 && n <= 90) items.push({ d: s.carneSalud.vence, t: 'Carné de salud · ' + s.nombre.replace(/^Lic\. /, ''), s: s.sede, ic: 'id-card' }); });
    items.sort((a, b) => a.d.localeCompare(b.d));
    if (!items.length) return ui.empty({ ill: 'calendar', title: 'Sin vencimientos cercanos', text: 'No hay nada que venza en los próximos 90 días.' });
    return items.slice(0, 7).map((x) => { const d = u.toDate(x.d); return '<div class="hab-next"><div class="hab-cal"><small>' + u.MESES_C[d.getMonth()] + '</small><b>' + d.getDate() + '</b></div><div class="grow" style="min-width:0"><div class="strong ellipsis" style="font-size:var(--fs-md)">' + esc(x.t) + '</div><div class="muted" style="font-size:var(--fs-xs)">' + esc(x.s) + ' · ' + u.relDay(x.d) + '</div></div>' + ic(x.ic, 'ic-sm subtle') + '</div>'; }).join('');
  }
  function resDocsCard(checks) {
    const bad = checks.filter((c) => c.area === 'res' && !c.ok);
    const byR = u.groupBy(bad, 'rid');
    const rows = Object.entries(byR).map(([rid, arr]) => ({ r: BT.resident(rid), arr }));
    return '<section class="card"><div class="card-h"><div><h3>' + ic('folder-open') + 'Documentación de residentes</h3><div class="sub">Ficha de usuario (Ord. 483/017), consentimiento, contrato y más</div></div>' + ui.badge(bad.length ? bad.length + ' pendientes' : 'Completa', bad.length ? 'warn' : 'ok', { dot: true }) + '</div><div class="card-b flush"><div class="list">' +
      (rows.length ? rows.map(({ r, arr }) => '<div class="li click" data-act="open-res" data-id="' + r.id + '">' + ui.avatar(BT.fullName(r), { size: 'sm' }) + '<div class="grow"><div class="t">' + esc(BT.fullName(r)) + ' ' + BT.sedeTag(r.sede) + '</div><div class="d">' + arr.map((c) => esc(c.item) + (c.state === 'vencido' ? ' (vencido)' : '')).join(' · ') + '</div></div>' + ui.badge(arr.length + '', arr.some((c) => c.state === 'falta') ? 'danger' : 'warn') + ic('chevron-right', 'ic-sm subtle') + '</div>').join('') : ui.empty({ ill: 'leaf', title: 'Documentación completa', text: 'Todas las fichas tienen su documentación al día.' })) +
      '</div></div></section>';
  }
  function staffDocsCard(checks) {
    const bad = checks.filter((c) => c.area === 'per' && (!c.ok || c.warn));
    const byS = u.groupBy(bad, 'sid');
    const rows = Object.entries(byS).map(([sid, arr]) => ({ s: BT.staffById(sid), arr }));
    return '<section class="card"><div class="card-h"><div><h3>' + ic('id-card') + 'Legajos del personal</h3><div class="sub">Carné de salud, curso de cuidados y capacitaciones</div></div>' + ui.badge(bad.filter((c) => !c.ok).length ? bad.filter((c) => !c.ok).length + ' vencidos o faltantes' : 'Al día', bad.filter((c) => !c.ok).length ? 'danger' : 'ok', { dot: true }) + '</div><div class="card-b flush"><div class="list">' +
      (rows.length ? rows.map(({ s, arr }) => '<div class="li click" data-act="open-staff" data-id="' + s.id + '">' + ui.avatar(s.nombre, { size: 'sm' }) + '<div class="grow"><div class="t">' + esc(s.nombre) + ' ' + BT.sedeTag(s.sede) + '</div><div class="d">' + arr.map((c) => esc(c.item) + ': ' + esc(c.detail)).join(' · ') + '</div></div>' + (arr.some((c) => !c.ok) ? ui.badge('Falta', 'danger') : ui.badge('Por vencer', 'warn')) + ic('chevron-right', 'ic-sm subtle') + '</div>').join('') : ui.empty({ ill: 'leaf', title: 'Legajos al día', text: 'No hay vencimientos del personal.' })) +
      '</div></div></section>';
  }

  function renewFlow(id) {
    const c = BT.db.compliance.find((x) => x.id === id); if (!c) return;
    const sug = u.iso(u.addDays(u.toDate(c.vence) < u.today() ? u.today() : u.toDate(c.vence), /Fumigación|plagas|tanque/i.test(c.item) ? 182 : 365));
    ui.modal({
      title: 'Renovar habilitación', sub: esc(c.item) + ' · ' + esc(c.organismo), icon: 'refresh-ccw',
      body: '<div class="alert ' + (BT.dueTone(c.vence) === 'danger' ? 'danger' : BT.dueTone(c.vence) === 'warn' ? 'warn' : 'info') + ' mb-16">' + ic('calendar-clock') + '<div>Vencimiento actual: <b>' + u.fmtDate(c.vence) + '</b> · ' + daysTxt(u.daysUntil(c.vence)) + '</div></div>' +
        '<form class="form-grid" id="rnForm">' + ui.field({ label: 'Nueva fecha de vencimiento', name: 'vence', type: 'date', value: sug, required: true }) + ui.field({ label: 'Nº de constancia', name: 'nro', placeholder: 'Opcional' }) +
        '<div class="field full"><label>Documento</label><label class="file" style="cursor:pointer"><span class="fi">PDF</span><span class="grow"><span class="strong" id="rnFile">' + esc(c.item.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-')) + '-' + new Date().getFullYear() + '.pdf</span><br><span class="muted" style="font-size:var(--fs-xs)">Tocá para adjuntar el comprobante escaneado</span></span>' + ic('upload', 'ic-sm subtle') + '<input type="file" accept="application/pdf,image/*" style="display:none" id="rnInput"></label></div></form>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>' + ic('check') + 'Guardar renovación</button>',
      onMount: (m, close) => {
        m.querySelector('#rnInput').addEventListener('change', (e) => { if (e.target.files[0]) m.querySelector('#rnFile').textContent = e.target.files[0].name; });
        m.querySelector('[data-save]').addEventListener('click', () => {
          const f = m.querySelector('#rnForm'); if (!ui.validate(f)) return; const d = ui.formData(f);
          if (d.vence <= todayIso()) { const inp = f.querySelector('[name="vence"]'); inp.classList.add('invalid'); ui.toast('La nueva fecha tiene que ser futura', { type: 'warn' }); return; }
          const prev = c.vence; c.vence = d.vence; c.doc = m.querySelector('#rnFile').textContent; c.renovado = todayIso();
          BT.audit('Modificó', 'Habilitación', { sede: c.sede, detail: c.item + ': ' + u.fmtDate(prev) + ' → ' + u.fmtDate(c.vence) });
          BT.save(); close(); BT.refresh();
          ui.toast('Habilitación renovada', { sub: c.item + ' · vigente hasta ' + u.fmtDate(c.vence), icon: 'shield-check' });
        });
      },
    });
  }

  /* ---------------- Modo inspección ---------------- */
  function enterInspection() {
    BT.state.sub.habInsp = true;
    BT.audit('Abrió', 'Modo inspección', { detail: BT.sedeName() });
    BT.render();
    ui.toast('Modo inspección activado', { sub: 'Toda la documentación reunida en una sola vista', icon: 'scan-search' });
  }
  function renderInspection(el) {
    const checks = BT.inspectionChecks(); const sc = score(checks);
    const miss = checks.filter((c) => !c.ok);
    const now = new Date();
    el.innerHTML = '<div class="inspect-banner mt-16 mb-16" style="padding:22px 24px"><div class="insp-top">' + ui.ring(sc, Math.round(sc) + '%', 'preparación', sc >= 95 ? 'var(--brand-600)' : sc >= 85 ? '#d99a2b' : 'var(--danger)') +
      '<div><div class="row gap-6 mb-8">' + ui.badge('Modo inspección', 'dark', { icon: 'scan-search' }) + '<span class="live" style="color:var(--warn)">Activo</span></div><h1>Documentación lista para el inspector</h1><div class="muted mt-8">' + esc(BT.sedeName()) + ' · Relevado el ' + u.fmtDate(now) + ' a las ' + u.fmtTime(now) + ' · MSP (Decreto 356/016) y MIDES (Ley 17.066)</div>' +
      '<div class="row wrap gap-6 mt-12">' + (miss.length ? ui.badge(miss.length + ' puntos a resolver', 'danger', { dot: true }) : ui.badge('Sin faltantes', 'ok', { icon: 'check' })) + ui.badge(checks.length + ' controles revisados', 'outline') + '</div></div>' +
      '<div class="col gap-6"><button class="btn primary" data-act="pdf">' + ic('file-down') + 'Exportar informe PDF</button><button class="btn" data-act="exit">' + ic('log-out') + 'Salir del modo inspección</button></div></div></div>' +
      '<div class="grid g-5 stagger mb-16">' + AREAS.map((a) => { const arr = checks.filter((c) => c.area === a.id); const s = score(arr); const bad = arr.filter((c) => !c.ok).length; const tone = s >= 99.9 ? '' : s >= 90 ? 'warn' : 'danger'; return '<section class="card hover insp-area"><div class="hd"><span class="k-ic ' + (tone || '') + '" style="width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--' + (tone === 'danger' ? 'danger-bg' : tone === 'warn' ? 'warn-bg' : 'brand-50') + ');color:var(--' + (tone === 'danger' ? 'danger' : tone === 'warn' ? 'warn' : 'brand-600') + ')">' + ic(a.icon) + '</span><span class="strong grow" style="font-size:var(--fs-md)">' + a.label + '</span></div><div class="row between"><span class="sc"><span data-count="' + s + '">' + Math.round(s) + '</span><small style="font-size:14px;color:var(--ink-500)">%</small></span><span class="muted num" style="font-size:var(--fs-sm)">' + (arr.length - bad) + '/' + arr.length + '</span></div>' + ui.bar(s, tone, true) + '<div style="font-size:var(--fs-xs)" class="' + (bad ? 't-danger strong' : 't-ok strong') + '">' + (bad ? bad + ' faltante' + (bad === 1 ? '' : 's') : 'Completo') + '</div></section>'; }).join('') + '</div>' +
      '<div class="grid g-main mb-16"><section class="card"><div class="card-h"><div><h3>' + ic('list-todo') + 'Qué falta</h3><div class="sub">Resolvé cada punto desde acá: te lleva directo a la ficha, el legajo o el planificador</div></div>' + ui.badge(miss.length + '', miss.length ? 'danger' : 'ok') + '</div><div class="card-b flush">' +
      (miss.length ? miss.map((c, i) => { const a = AREAS.find((x) => x.id === c.area); return '<div class="miss" style="animation-delay:' + Math.min(i * 30, 400) + 'ms"><span class="li-ic danger" style="width:32px;height:32px;border-radius:9px;display:grid;place-items:center;background:var(--danger-bg);color:var(--danger);flex:none">' + ic(a.icon, 'ic-sm') + '</span><div class="grow" style="min-width:0"><div class="strong" style="font-size:var(--fs-md)">' + esc(c.item) + '</div><div class="muted" style="font-size:var(--fs-xs)">' + esc(c.who) + ' · ' + (c.sede === 'ALL' ? 'Galauru SAS' : c.sede) + ' · ' + c.detail + '</div></div>' + actBtn(c) + '</div>'; }).join('') : ui.empty({ ill: 'leaf', title: '¡Todo en regla!', text: 'No hay faltantes. Podés exportar el informe para el inspector.' })) +
      '</div></section>' +
      '<div class="col gap-16"><section class="card"><div class="card-h"><div><h3>' + ic('scale') + 'Ratio de cuidadoras · hoy</h3><div class="sub">Ord. 1032/2019 · dependiente = Barthel 0–40</div></div></div><div class="card-b flush">' + ui.table([
        { label: 'Sede', render: (c) => BT.sedeTag(c.sede) }, { label: 'Turno', render: (c) => esc(c.item.replace('Turno ', '').replace(/^./, (x) => x.toUpperCase())) },
        { label: 'Asig./Req.', align: 'num', render: (c) => '<span class="strong num">' + c.st.assigned + '/' + c.st.required + '</span>' }, { label: '', render: (c) => (c.ok ? ui.badge('OK', 'ok', { icon: 'check' }) : ui.badge('Bajo ratio', 'danger', { dot: true })) },
      ], checks.filter((c) => c.area === 'rat'), { compact: true }) + '</div></section>' +
      '<section class="card"><div class="card-h"><div><h3>' + ic('clipboard-check') + 'Registros obligatorios</h3><div class="sub">Restricciones y medicación por cuadros agudos</div></div></div><div class="card-b flush"><div class="list">' + checks.filter((c) => c.area === 'reg').map((c) => '<div class="li"><span class="li-ic ' + (c.ok ? 'ok' : 'danger') + '">' + ic(c.ok ? 'check' : 'x', 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(c.item) + '</div><div class="d">' + esc(c.who) + ' · ' + c.detail + '</div></div></div>').join('') + '</div></div></section></div></div>' +
      '<section class="card mb-16"><div class="card-h"><div><h3>' + ic('folder-open') + 'Matriz de documentación de residentes</h3><div class="sub">' + BT.residentsInSede().length + ' residentes · ' + REQ_DOCS.length + ' documentos requeridos + Barthel y plan de atención</div></div><div class="row gap-6 legend"><span><span class="dm ok">' + ic('check') + '</span>Vigente</span><span><span class="dm vencido">' + ic('clock') + '</span>Vencido</span><span><span class="dm falta">' + ic('x') + '</span>Falta</span></div></div><div class="card-b flush">' + resMatrix(checks) + '</div></section>' +
      '<div class="grid g-2"><section class="card"><div class="card-h"><div><h3>' + ic('id-card') + 'Personal</h3><div class="sub">Legajo exigible por la normativa</div></div></div><div class="card-b flush">' + staffTable(checks) + '</div></section>' +
      '<section class="card"><div class="card-h"><div><h3>' + ic('building-2') + 'Establecimiento</h3><div class="sub">Habilitaciones y certificados</div></div></div><div class="card-b flush">' + ui.table([
        { label: 'Habilitación', render: (c) => '<div class="strong" style="font-size:var(--fs-sm)">' + esc(c.item) + '</div><div class="muted" style="font-size:var(--fs-xs)">' + esc(c.who) + '</div>' },
        { label: 'Sede', render: (c) => (c.sede === 'ALL' ? ui.badge('Ambas', 'outline') : BT.sedeTag(c.sede)) },
        { label: 'Estado', render: (c) => (!c.ok ? ui.badge('Vencida', 'danger', { dot: true }) : c.warn ? ui.badge('Por vencer', 'warn', { dot: true }) : ui.badge('Vigente', 'ok', { dot: true })) },
        { label: 'Detalle', render: (c) => '<span class="muted" style="font-size:var(--fs-xs)">' + c.detail + '</span>' },
      ], u.sortBy(checks.filter((c) => c.area === 'est'), (c) => (c.ok ? (c.warn ? 1 : 2) : 0)), { compact: true }) + '</div></section></div>';
    ui.on(el, {
      exit: () => { BT.state.sub.habInsp = false; BT.render(); },
      pdf: () => pdfInspection(checks),
      go: (t) => {
        const c = miss[+t.dataset.i]; if (!c) return; const a = c.act;
        if (a.t === 'res') openRes(a.id); else if (a.t === 'staff') openStaff(a.id); else if (a.t === 'comp') renewFlow(a.id); else if (a.t === 'ratio') BT.go('personal', { fecha: a.fecha, sede: a.sede, turno: a.turno });
      },
      'open-res': (t) => openRes(t.dataset.id),
      'open-staff': (t) => openStaff(t.dataset.id),
    });
    function actBtn(c) {
      const i = miss.indexOf(c); const a = c.act;
      const lbl = a.t === 'res' ? ['Ver ficha', 'folder-open'] : a.t === 'staff' ? ['Ver legajo', 'id-card'] : a.t === 'comp' ? ['Renovar', 'refresh-ccw'] : ['Cubrir turno', 'calendar-plus'];
      return '<button class="btn xs" data-act="go" data-i="' + i + '">' + ic(lbl[1]) + lbl[0] + '</button>';
    }
  }
  function resMatrix(checks) {
    const res = BT.residentsInSede().sort((a, b) => a.sede.localeCompare(b.sede) || (a.habitacion + a.cama).localeCompare(b.habitacion + b.cama, undefined, { numeric: true }));
    const cell = (st) => '<span class="dm ' + st + '" data-tip="' + (st === 'ok' ? 'Vigente' : st === 'falta' ? 'Falta' : 'Vencido') + '">' + ic(st === 'ok' ? 'check' : st === 'falta' ? 'x' : 'clock') + '</span>';
    return '<div class="table-wrap"><table class="table compact matrix"><thead><tr><th>Residente</th>' + REQ_DOCS.map((d) => '<th data-tip="' + esc(d) + '">' + DOC_SHORT[d] + '</th>').join('') + '<th>Barthel</th><th>Plan</th></tr></thead><tbody>' +
      res.map((r) => { const my = checks.filter((c) => c.rid === r.id && c.area === 'res'); const get = (it) => my.find((c) => c.item === it); return '<tr class="click" data-act="open-res" data-id="' + r.id + '"><td>' + ui.person(BT.fullName(r), r.sede + ' · Hab. ' + r.habitacion + r.cama) + '</td>' + REQ_DOCS.map((d) => '<td>' + cell(get(d).state) + '</td>').join('') + '<td>' + cell(get('Barthel actualizado (≤ 6 meses)').ok ? 'ok' : 'vencido') + '</td><td>' + cell(get('Plan de atención individual vigente').ok ? 'ok' : 'vencido') + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  function staffTable(checks) {
    const st = BT.bySede(BT.db.staff);
    const b = (c) => (!c ? '<span class="subtle">—</span>' : !c.ok ? ui.badge(c.detail.split(' · ')[0], 'danger', { dot: true }) : c.warn ? ui.badge(c.detail.split(' · ')[0], 'warn', { dot: true }) : ui.badge('Vigente', 'ok', { icon: 'check' }));
    return ui.table([
      { label: 'Funcionaria', render: (s) => ui.person(s.nombre, s.rol + ' · ' + s.sede) },
      { label: 'Carné de salud', render: (s) => b(checks.find((c) => c.sid === s.id && c.item === 'Carné de salud vigente')) },
      { label: 'Curso cuidados', render: (s) => { const c = checks.find((x) => x.sid === s.id && x.item === 'Curso de cuidados (SNC)'); return c ? (c.ok ? ui.badge('Certificado', 'ok', { icon: 'check' }) : ui.badge(s.cursoCuidados.estado, c.warn ? 'warn' : 'danger', { dot: true })) : ui.badge('N/C', 'outline', { tip: 'No corresponde: ' + s.rol }); } },
      { label: 'RCP', render: (s) => { const c = checks.find((x) => x.sid === s.id && /^RCP/.test(x.item)); return c.ok ? ui.badge('Vigente', 'ok', { icon: 'check' }) : ui.badge('Falta', 'danger', { dot: true }); } },
    ], st, { compact: true, rowAttrs: (s) => 'class="click" data-act="open-staff" data-id="' + s.id + '"' });
  }

  /* ---------------- PDF ---------------- */
  function pdfInspection(checks) {
    const D = BT.doc; const sc = score(checks); const miss = checks.filter((c) => !c.ok);
    const sedeTxt = (s) => (s === 'ALL' ? 'Ambas' : s);
    const badge = (c) => (!c.ok ? D.badge(c.area === 'est' ? 'Vencida' : c.state === 'vencido' ? 'Vencido' : 'Falta', 'danger') : c.warn ? D.badge('Por vencer', 'warn') : D.badge('OK', 'ok'));
    const res = BT.residentsInSede().sort((a, b) => a.sede.localeCompare(b.sede) || (a.habitacion + a.cama).localeCompare(b.habitacion + b.cama, undefined, { numeric: true }));
    const stOf = (r, it) => { const c = checks.find((x) => x.rid === r.id && x.item === it); return !c ? '—' : c.ok ? D.badge('✓ OK', 'ok') : D.badge(c.state === 'vencido' || !c.state ? 'Vencido' : 'Falta', c.state === 'falta' ? 'danger' : 'warn'); };
    const body =
      D.kpis([
        { label: 'Preparación', value: u.fmtPct(sc, 0), sub: checks.length + ' controles revisados' },
        { label: 'Puntos a resolver', value: String(miss.length), sub: miss.length ? 'Detalle en la sección 2' : 'Sin faltantes' },
        { label: 'Habilitaciones vencidas', value: String(checks.filter((c) => c.area === 'est' && !c.ok).length), sub: 'De ' + checks.filter((c) => c.area === 'est').length + ' registradas' },
        { label: 'Ratio de hoy', value: checks.filter((c) => c.area === 'rat' && c.ok).length + '/' + checks.filter((c) => c.area === 'rat').length, sub: 'Turnos en cumplimiento' },
      ]) +
      D.section('1. Resumen por área', D.table([
        { label: 'Área', render: (a) => '<b>' + esc(a.label) + '</b>' },
        { label: 'Controles', align: 'num', render: (a) => String(checks.filter((c) => c.area === a.id).length) },
        { label: 'En regla', align: 'num', render: (a) => String(checks.filter((c) => c.area === a.id && c.ok).length) },
        { label: 'Faltantes', align: 'num', render: (a) => String(checks.filter((c) => c.area === a.id && !c.ok).length) },
        { label: 'Cumplimiento', align: 'num', render: (a) => '<b>' + u.fmtPct(score(checks.filter((c) => c.area === a.id)), 1) + '</b>' },
      ], AREAS)) +
      D.section('2. Puntos a resolver', miss.length ? D.table([
        { label: 'Área', render: (c) => esc(AREAS.find((a) => a.id === c.area).label) },
        { label: 'Requisito', render: (c) => '<b>' + esc(c.item) + '</b>' },
        { label: 'Corresponde a', render: (c) => esc(c.who) },
        { label: 'Sede', align: 'center', render: (c) => sedeTxt(c.sede) },
        { label: 'Detalle', render: (c) => '<span class="muted">' + c.detail + '</span>' },
      ], miss, { compact: true }) : D.note('No se detectaron faltantes. La documentación está completa a la fecha del relevamiento.')) +
      D.section('3. Habilitaciones del establecimiento', D.table([
        { label: 'Habilitación', render: (c) => '<b>' + esc(c.item) + '</b>' }, { label: 'Organismo', render: (c) => esc(c.who) }, { label: 'Sede', align: 'center', render: (c) => sedeTxt(c.sede) }, { label: 'Vencimiento', render: (c) => c.detail }, { label: 'Estado', align: 'center', render: badge },
      ], u.sortBy(checks.filter((c) => c.area === 'est'), (c) => (c.ok ? (c.warn ? 1 : 2) : 0)), { compact: true })) +
      D.section('4. Documentación de residentes (Ordenanza 483/017)', D.table(
        [{ label: 'Residente', render: (r) => '<b>' + esc(BT.fullName(r)) + '</b><br><span class="muted small">' + r.sede + ' · Hab. ' + r.habitacion + r.cama + '</span>' }]
          .concat(REQ_DOCS.map((d) => ({ label: DOC_SHORT[d], align: 'center', render: (r) => stOf(r, d) })))
          .concat([{ label: 'Barthel', align: 'center', render: (r) => stOf(r, 'Barthel actualizado (≤ 6 meses)') }, { label: 'Plan', align: 'center', render: (r) => stOf(r, 'Plan de atención individual vigente') }]),
        res, { compact: true })) +
      D.section('5. Personal', D.table([
        { label: 'Funcionaria', render: (s) => '<b>' + esc(s.nombre) + '</b><br><span class="muted small">' + esc(s.rol) + ' · ' + s.sede + '</span>' },
        { label: 'Carné de salud', render: (s) => { const c = checks.find((x) => x.sid === s.id && x.item === 'Carné de salud vigente'); return badge(c) + ' <span class="muted small">' + u.fmtDate(s.carneSalud.vence) + '</span>'; } },
        { label: 'Curso de cuidados', render: (s) => { const c = checks.find((x) => x.sid === s.id && x.item === 'Curso de cuidados (SNC)'); return c ? badge(c) + ' <span class="muted small">' + esc(s.cursoCuidados.estado) + '</span>' : '<span class="muted small">No corresponde</span>'; } },
        { label: 'RCP', align: 'center', render: (s) => badge(checks.find((x) => x.sid === s.id && /^RCP/.test(x.item))) },
        { label: 'Capacitaciones', align: 'num', render: (s) => String((s.capacitaciones || []).length) },
      ], BT.bySede(BT.db.staff), { compact: true })) +
      D.section('6. Ratio de cuidadoras del día', D.note('Cálculo según Decreto 356/016 (art. 19) y Ordenanza 1032/2019: se considera dependiente a la persona con índice de Barthel entre 0 y 40.') + D.table([
        { label: 'Sede', render: (c) => esc(c.who) }, { label: 'Turno', render: (c) => esc(c.item) }, { label: 'Asignadas', align: 'num', render: (c) => String(c.st.assigned) }, { label: 'Requeridas', align: 'num', render: (c) => String(c.st.required) }, { label: 'Estado', align: 'center', render: (c) => (c.ok ? D.badge('Cumple', 'ok') : D.badge('Bajo ratio', 'danger')) },
      ], checks.filter((c) => c.area === 'rat'), { compact: true })) +
      D.section('7. Registros obligatorios', D.table([
        { label: 'Registro', render: (c) => '<b>' + esc(c.item) + '</b>' }, { label: 'Residente', render: (c) => esc(c.who) }, { label: 'Constancia', render: (c) => '<span class="muted">' + c.detail + '</span>' }, { label: 'Estado', align: 'center', render: badge },
      ], checks.filter((c) => c.area === 'reg'), { compact: true })) +
      D.signatures(['Dirección · Carolina Galarza', 'Médico Director Técnico · Dr. Fernando Aguirre', 'Inspector/a actuante']);
    D.open({ title: 'Informe Modo inspección', kicker: 'Informe de cumplimiento', subtitle: esc(BT.sedeName()) + ' · Relevamiento del ' + u.fmtDate(new Date()), landscape: true, code: 'INSP-' + u.todayIso().replace(/-/g, '') + '-' + BT.sedeLabel().slice(0, 3).toUpperCase(), filename: 'Informe Modo inspección - ' + BT.sedeLabel() + ' - ' + u.todayIso(), body });
  }
  function pdfVencimientos() {
    const D = BT.doc; const list = compList();
    const tone = (c) => BT.dueTone(c.vence);
    const body = D.kpis([
      { label: 'Vencidas', value: String(list.filter((c) => tone(c) === 'danger').length) },
      { label: 'Próximas 30 días', value: String(list.filter((c) => tone(c) === 'warn').length) },
      { label: 'Al día', value: String(list.filter((c) => tone(c) === 'ok').length) },
      { label: 'Total', value: String(list.length) },
    ]) + D.section('Habilitaciones y vencimientos', D.table([
      { label: 'Habilitación', render: (c) => '<b>' + esc(c.item) + '</b>' }, { label: 'Organismo', render: (c) => esc(c.organismo) }, { label: 'Sede', align: 'center', render: (c) => (c.sede === 'ALL' ? 'Ambas' : c.sede) },
      { label: 'Vence', align: 'num', render: (c) => u.fmtDate(c.vence) }, { label: 'Situación', render: (c) => D.badge(daysTxt(u.daysUntil(c.vence)), tone(c)) }, { label: 'Responsable', render: (c) => esc(c.responsable) },
    ], list));
    D.open({ title: 'Habilitaciones y vencimientos', kicker: 'Informe', subtitle: esc(BT.sedeName()) + ' · al ' + u.fmtDate(new Date()), body, filename: 'Vencimientos - ' + BT.sedeLabel() + ' - ' + u.todayIso() });
  }

  /* ---------------- Alertas ---------------- */
  BT.addAlerts(() => BT.db.compliance.filter((c) => u.daysUntil(c.vence) <= 30).map((c) => {
    const n = u.daysUntil(c.vence);
    return { id: 'hab-' + c.id, tone: n < 0 ? 'danger' : 'warn', icon: n < 0 ? 'shield-alert' : 'calendar-clock', title: c.item + (c.sede !== 'ALL' ? ' · ' + c.sede : ''), desc: c.organismo + ' · ' + daysTxt(n), tab: 'habilitaciones', sede: c.sede, roles: ['direccion', 'administracion', 'medico'], action: () => { BT.state.sub.habInsp = false; BT.go('habilitaciones'); setTimeout(() => renewFlow(c.id), 420); } };
  }));

  BT.actions.inspectionMode = () => { BT.state.sub.habInsp = true; BT.go('habilitaciones'); };
  BT.tab({ id: 'habilitaciones', label: 'Habilitaciones', icon: 'shield-check', group: 'admin', order: 13, roles: ['direccion', 'administracion', 'medico'], badge: () => BT.bySede(BT.db.compliance).filter((c) => u.daysUntil(c.vence) <= 30).length, render });
})();

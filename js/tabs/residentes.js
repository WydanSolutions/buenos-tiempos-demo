/* ==========================================================================
   Residentes — listado y ficha de usuario (Ordenanza 483/017)
   ========================================================================== */
(function () {
  'use strict';
  const BT = window.BT; const u = BT.u; const ic = BT.ic; const ui = BT.ui; const esc = u.esc;

  BT.addCSS('residentes', `
    .res-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px}
    .res-card .rc-name{font-weight:650;font-size:15px;color:var(--ink-950);letter-spacing:-.01em;line-height:1.25}
    .res-card .rc-sub{font-size:var(--fs-xs);color:var(--ink-500)}
    .res-card .rc-foot{display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid var(--ink-100);font-size:var(--fs-xs);color:var(--ink-500)}
    .bscore{display:inline-flex;align-items:baseline;gap:3px;font-weight:750;font-variant-numeric:tabular-nums;font-size:15px}
    .bscore small{font-size:10px;color:var(--ink-400);font-weight:600}
    .filters{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px}
    .filters .input{max-width:280px;height:38px;min-height:38px;padding-left:36px}
    .filters .fwrap{position:relative}
    .filters .fwrap .ic{position:absolute;left:12px;top:10px;color:var(--ink-400)}
    .allergy{display:inline-flex;align-items:center;gap:5px;background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger-line);font-weight:650;font-size:11.5px;border-radius:99px;padding:2px 9px}
    .barthel-item{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--ink-100)}
    .barthel-item:last-child{border-bottom:0}
    .barthel-item .chips{gap:6px;justify-content:flex-end}
    .barthel-item .chip{padding:5px 10px;font-size:var(--fs-xs)}
    .b-total{position:sticky;top:-8px;z-index:2;display:flex;align-items:center;gap:16px;padding:12px 16px;border-radius:14px;background:var(--brand-50);border:1px solid var(--brand-100);margin-bottom:8px}
    .b-total .n{font-size:30px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums;color:var(--brand-800);min-width:64px}
    .doc-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}
    .scale-legend{display:flex;height:8px;border-radius:99px;overflow:hidden;margin-top:6px}
    .scale-legend i{flex:1}
    @media (max-width:640px){.barthel-item{grid-template-columns:1fr}.barthel-item .chips{justify-content:flex-start}}
  `);

  const BARTHEL = [
    ['Comer', [[0, 'Dependiente'], [5, 'Necesita ayuda'], [10, 'Independiente']]],
    ['Lavarse (baño)', [[0, 'Dependiente'], [5, 'Independiente']]],
    ['Vestirse', [[0, 'Dependiente'], [5, 'Necesita ayuda'], [10, 'Independiente']]],
    ['Arreglarse', [[0, 'Dependiente'], [5, 'Independiente']]],
    ['Deposiciones', [[0, 'Incontinente'], [5, 'Accidente ocasional'], [10, 'Continente']]],
    ['Micción', [[0, 'Incontinente'], [5, 'Accidente ocasional'], [10, 'Continente']]],
    ['Uso del retrete', [[0, 'Dependiente'], [5, 'Necesita ayuda'], [10, 'Independiente']]],
    ['Trasladarse (sillón/cama)', [[0, 'Dependiente'], [5, 'Gran ayuda'], [10, 'Mínima ayuda'], [15, 'Independiente']]],
    ['Deambular', [[0, 'Inmóvil'], [5, 'En silla de ruedas'], [10, 'Con ayuda'], [15, 'Independiente']]],
    ['Escalones', [[0, 'Dependiente'], [5, 'Necesita ayuda'], [10, 'Independiente']]],
  ];
  const clinical = () => BT.can('clinical.read');
  const depBadge = (r) => { const g = BT.depGrade(BT.lastBarthel(r)); return ui.badge(g.label, g.tone, { dot: true }); };
  const room = (r) => 'Hab. ' + r.habitacion + ' · cama ' + r.cama;

  /* ---------- Listado ---------- */
  BT.tab({
    id: 'residentes', label: 'Residentes', icon: 'users', group: 'dia', order: 2,
    roles: ['direccion', 'medico', 'enfermeria', 'administracion'],
    badge: () => BT.residentsInSede().length, badgeSoft: true,
    render(el, params) {
      const st = (BT.state.sub.resList = BT.state.sub.resList || { q: '', dep: 'all', view: 'cards' });
      if (params.filtro === 'docs') st.dep = 'docs';
      const all = BT.residentsInSede().sort((a, b) => (a.sede + a.habitacion.padStart(2, '0') + a.cama).localeCompare(b.sede + b.habitacion.padStart(2, '0') + b.cama));
      const dep = all.filter(BT.isDependent).length;
      const avgAge = Math.round(u.avg(all, (r) => u.age(r.nacimiento)));
      const docsMissing = all.filter((r) => r.docs.some((d) => d.estado !== 'ok')).length;
      const avgStay = Math.round(u.avg(all, (r) => u.daysBetween(r.ingreso, u.today())) / 30);

      el.innerHTML = ui.pageHeader({
        eyebrow: BT.sedeName(), icon: 'users', title: 'Residentes',
        sub: 'Ficha de usuario según la Ordenanza 483/017 del MSP · ' + all.length + ' residentes activos',
        actions: ui.exportMenu([{ id: 'list-xlsx', label: 'Listado de residentes', sub: 'Excel con filtros', icon: 'file-spreadsheet' }, { id: 'list-pdf', label: 'Nómina de residentes', sub: 'PDF A4', icon: 'file-text' }]) +
          (BT.isRole('direccion', 'administracion') ? '<button class="btn primary" data-act="new">' + ic('user-plus') + 'Nuevo ingreso</button>' : ''),
      }) +
        '<div class="grid g-4 stagger mb-16">' +
        ui.kpi({ label: 'Residentes', value: all.length, icon: 'users', variant: 'green', foot:BT.state.sede === 'ALL' ? 'BT1 ' + all.filter((r) => r.sede === 'BT1').length + ' · BT2 ' + all.filter((r) => r.sede === 'BT2').length : 'Edad promedio ' + avgAge + ' años' }) +
        ui.kpi({ label: 'Dependientes (Barthel ≤ 40)', value: dep, icon: 'accessibility', variant: 'yellow', foot: u.fmtPct((dep / Math.max(1, all.length)) * 100, 0) + ' · base del ratio de cuidadoras' }) +
        ui.kpi({ label: 'Estadía promedio', value: avgStay, suffix: 'meses', icon: 'hourglass', variant: 'violet', foot: 'Desde la fecha de ingreso' }) +
        ui.kpi({ label: 'Legajos incompletos', value: docsMissing, icon: 'file-warning', variant: docsMissing ? 'red' : 'mint', foot: docsMissing ? 'Requieren documentación' : 'Todo al día' }) +
        '</div>' +
        '<div class="filters"><div class="fwrap">' + ic('search') + '<input class="input" id="rq" placeholder="Buscar por nombre o habitación" value="' + esc(st.q) + '"></div>' +
        ui.seg('dep', [{ id: 'all', label: 'Todos' }, { id: 'dep', label: 'Dependientes' }, { id: 'ind', label: 'No dependientes' }, { id: 'docs', label: 'Legajo incompleto' }], st.dep, 'sm') +
        '<div class="spacer grow"></div>' + ui.seg('view', [{ id: 'cards', label: 'Tarjetas', icon: 'layout-grid' }, { id: 'table', label: 'Tabla', icon: 'list' }], st.view, 'sm') + '</div>' +
        '<div id="resList"></div>';

      const draw = () => {
        const q = u.norm(st.q);
        let list = all.filter((r) => !q || u.norm(BT.fullName(r) + ' ' + r.habitacion + r.cama + ' ' + r.referente.nombre).includes(q));
        if (st.dep === 'dep') list = list.filter(BT.isDependent);
        if (st.dep === 'ind') list = list.filter((r) => !BT.isDependent(r));
        if (st.dep === 'docs') list = list.filter((r) => r.docs.some((d) => d.estado !== 'ok'));
        const box = el.querySelector('#resList');
        if (!list.length) { box.innerHTML = '<div class="card">' + ui.empty({ ill: 'search', title: 'No encontramos residentes', text: 'Probá con otro nombre o quitá los filtros.' }) + '</div>'; return; }
        box.innerHTML = st.view === 'cards' ? '<div class="res-grid stagger">' + list.map(card).join('') + '</div>' : '<div class="card">' + ui.table([
          { label: 'Residente', render: (r) => ui.person(BT.fullName(r), u.age(r.nacimiento) + ' años · CI ' + u.fmtCI(r.ci)) },
          { label: 'Sede', render: (r) => BT.sedeTag(r.sede) },
          { label: 'Habitación', render: (r) => '<span class="num">' + r.habitacion + r.cama + '</span>' },
          clinical() ? { label: 'Barthel', align: 'num', render: (r) => '<span class="bscore">' + BT.lastBarthel(r) + '<small>/100</small></span>' } : null,
          clinical() ? { label: 'Dependencia', render: depBadge } : null,
          { label: 'Mutualista', render: (r) => esc(r.mutualista) + '<div class="muted" style="font-size:11px">' + esc(r.emergencia) + '</div>' },
          { label: 'Referente', render: (r) => esc(r.referente.nombre) + '<div class="muted" style="font-size:11px">' + esc(r.referente.vinculo) + ' · ' + esc(r.referente.tel) + '</div>' },
          { label: 'Ingreso', render: (r) => u.fmtDate(r.ingreso) },
        ].filter(Boolean), list, { rowAttrs: (r) => 'class="click" data-act="open" data-id="' + r.id + '"' }) + '</div>';
        ui.enhance(box);
      };
      draw();
      el.querySelector('#rq').addEventListener('input', u.debounce((e) => { st.q = e.target.value; draw(); }, 120));
      el.addEventListener('segchange', (e) => { if (e.detail.name === 'dep') st.dep = e.detail.value; if (e.detail.name === 'view') st.view = e.detail.value; draw(); });
      ui.on(el, {
        open: (t) => openResident(t.dataset.id),
        new: () => (BT.visibleTabs().some((t) => t.id === 'admisiones') ? BT.go('admisiones') : null),
        export: (t) => exportList(t.dataset.id, all),
      });
    },
  });

  function card(r) {
    const b = BT.lastBarthel(r); const g = BT.depGrade(b);
    const missing = r.docs.filter((d) => d.estado !== 'ok').length;
    return '<div class="card hover clickable res-card" data-act="open" data-id="' + r.id + '"><div class="rc-top">' + ui.avatar(BT.fullName(r), { size: 'lg' }) +
      '<div style="min-width:0" class="grow"><div class="rc-name ellipsis">' + esc(BT.fullName(r)) + '</div><div class="rc-sub">' + u.age(r.nacimiento) + ' años · ' + room(r) + '</div></div>' + BT.sedeTag(r.sede) + '</div>' +
      '<div class="rc-meta">' + (clinical() ? ui.badge(g.label, g.tone, { dot: true }) : '') + ui.badge(r.dieta, 'outline') + r.alergias.map((a) => '<span class="allergy">' + ic('triangle-alert', 'ic-xs') + esc(a) + '</span>').join('') + (missing ? ui.badge(missing + ' doc. pendiente' + (missing > 1 ? 's' : ''), 'warn', { icon: 'file-warning' }) : '') + '</div>' +
      (clinical() ? '<div><div class="row between" style="font-size:var(--fs-xs);color:var(--ink-500)"><span>Índice de Barthel</span><span class="bscore" style="font-size:13px">' + b + '<small>/100</small></span></div>' + ui.bar(b, b <= 40 ? 'danger' : b <= 55 ? 'warn' : '', true) + '</div>' : '') +
      '<div class="rc-foot"><span class="row gap-6">' + ic('user-round', 'ic-xs') + esc(r.referente.nombre) + ' · ' + esc(r.referente.vinculo.toLowerCase()) + '</span><span>' + esc(r.mutualista) + '</span></div></div>';
  }

  /* ---------- Ficha (drawer) ---------- */
  function openResident(id) {
    const r = BT.resident(id); if (!r) return;
    const canClin = clinical();
    BT.audit(canClin ? 'Abrió' : 'Abrió (datos administrativos)', 'Ficha del residente', { residentId: id });
    const g = BT.depGrade(BT.lastBarthel(r));
    const head = '<div class="profile-hero">' + (!BT.isRole('familiar') ? ui.avatarEdit(BT.fullName(r), BT.photoKey.resident(r)) : ui.avatar(BT.fullName(r), { size: 'xl' })) + '<div class="grow" style="min-width:0"><div class="row gap-6 wrap mb-8">' + BT.sedeTag(r.sede) + (canClin ? ui.badge('Dependencia ' + g.label.toLowerCase(), g.tone, { dot: true }) : '') + (r.alergias.length ? r.alergias.map((a) => '<span class="allergy">' + ic('triangle-alert', 'ic-xs') + 'Alergia: ' + esc(a) + '</span>').join('') : '') + '</div>' +
      '<h2>' + esc(BT.fullName(r)) + '</h2><div class="muted" style="font-size:var(--fs-md)">' + u.age(r.nacimiento) + ' años · ' + room(r) + ' · Ingresó el ' + u.fmtDate(r.ingreso) + ' (' + u.rel(u.toDate(r.ingreso)) + ')</div></div>' +
      '<div class="row gap-6">' + ui.exportMenu([{ id: 'ficha', label: 'Ficha del residente', sub: 'PDF A4 · Ord. 483/017', icon: 'file-text' }].concat(canClin ? [{ id: 'barthel', label: 'Evolución del Barthel', sub: 'PDF con gráfico', icon: 'chart-line' }] : []), 'Exportar') +
      (canClin && BT.visibleTabs().some((t) => t.id === 'historia') ? '<button class="btn primary sm" data-act="hc">' + ic('clipboard-list') + 'Historia clínica</button>' : '') + '</div></div>';
    const d = ui.drawer({
      head, width: 920,
      body: '<div id="fichaTabs"></div>' + (!canClin ? '<div class="alert info mt-16">' + ic('lock') + '<div>Tu rol no tiene acceso a datos clínicos de este residente (Ley 18.331 de protección de datos). El intento de acceso queda registrado.</div></div>' : ''),
      onMount: (drawer, close) => {
        const items = [{ id: 'datos', label: 'Datos personales', icon: 'id-card' }];
        if (canClin) items.push({ id: 'barthel', label: 'Dependencia', icon: 'gauge' }, { id: 'plan', label: 'Plan de atención', icon: 'clipboard-check' }, { id: 'social', label: 'Valoración social', icon: 'heart-handshake' });
        items.push({ id: 'docs', label: 'Documentos', icon: 'paperclip', count: r.docs.filter((x) => x.estado !== 'ok').length || '' });
        ui.subtabs(drawer.querySelector('#fichaTabs'), 'ficha', items, (panel, tab) => renderFichaTab(panel, tab, r, drawer));
        ui.on(drawer, {
          hc: () => { close(); setTimeout(() => BT.go('historia', { residentId: r.id }), 200); },
          export: (t) => (t.dataset.id === 'ficha' ? exportFicha(r) : exportBarthel(r)),
        });
      },
    });
    return d;
  }
  BT.actions.openResident = openResident;

  function renderFichaTab(panel, tab, r, drawer) {
    if (tab === 'datos') {
      panel.innerHTML = '<div class="grid g-2">' +
        ui.card({ title: 'Identificación', icon: 'id-card', body: ui.kv([['Nombre completo', esc(BT.fullName(r))], ['Cédula', '<span class="num">' + u.fmtCI(r.ci) + '</span>'], ['Nacimiento', u.fmtDate(r.nacimiento) + ' · ' + u.age(r.nacimiento) + ' años'], ['Sexo', r.sexo === 'F' ? 'Femenino' : 'Masculino'], ['Sede', esc(BT.sedeName(r.sede))], ['Habitación', room(r)], ['Fecha de ingreso', u.fmtDate(r.ingreso)]]) }) +
        ui.card({ title: 'Salud y cobertura', icon: 'hospital', body: ui.kv([['Mutualista', esc(r.mutualista)], ['Emergencia móvil', esc(r.emergencia)], ['Médico de referencia', esc(r.medico)], ['Alergias', r.alergias.length ? r.alergias.map((a) => '<span class="allergy">' + esc(a) + '</span>').join(' ') : '<span class="muted">Sin alergias conocidas</span>'], ['Dieta', ui.badge(r.dieta, 'brand')], clinical() ? ['Diagnósticos', r.diagnosticos.map(esc).join('<br>')] : null]) }) +
        ui.card({ title: 'Referente familiar', icon: 'user-round', body: ui.person(r.referente.nombre, esc(r.referente.vinculo), { size: 'lg' }) + '<div class="hr"></div>' + ui.kv([['Teléfono', '<a href="tel:' + r.referente.tel.replace(/\s/g, '') + '">' + esc(r.referente.tel) + '</a>'], ['Correo', esc(r.referente.email)], ['Cédula', r.referente.ci ? u.fmtCI(r.referente.ci) : '—']]) }) +
        ui.card({ title: 'Curador / representante legal', icon: 'scale', body: r.curador ? ui.kv([['Nombre', esc(r.curador.nombre)], ['Tipo', esc(r.curador.tipo)]]) + (/trámite/.test(r.curador.tipo) ? '<div class="alert warn mt-12">' + ic('hourglass') + '<div>Curaduría en trámite: mantener copia del expediente en el legajo.</div></div>' : '') : ui.empty({ ill: 'leaf', title: 'Sin curador designado', text: 'El residente conserva su capacidad de decisión. El referente familiar actúa como contacto principal.' }) }) +
        '</div>';
    }
    if (tab === 'barthel') {
      const hist = r.barthel; const last = hist[hist.length - 1]; const prev = hist[hist.length - 2];
      const g = BT.depGrade(last.score);
      panel.innerHTML = '<div class="grid g-side">' +
        '<div class="col gap-16">' + ui.card({ body: '<div class="col" style="align-items:center;text-align:center">' + ui.ring(last.score, last.score, 'de 100', last.score <= 40 ? '#c4473c' : last.score <= 55 ? '#d99a2b' : '#297040') + '<div class="mt-8">' + ui.badge('Dependencia ' + g.label.toLowerCase(), g.tone, { lg: true }) + '</div>' +
          '<div class="muted mt-8" style="font-size:var(--fs-sm)">Última evaluación ' + u.fmtDate(last.fecha) + '<br>por ' + esc(last.evaluador) + '</div>' +
          (prev ? '<div class="mt-8">' + (last.score < prev.score ? ui.badge('▼ ' + (prev.score - last.score) + ' puntos vs. anterior', 'danger') : last.score > prev.score ? ui.badge('▲ ' + (last.score - prev.score) + ' puntos vs. anterior', 'ok') : ui.badge('Sin cambios', 'outline')) + '</div>' : '') + '</div>' +
          '<div class="hr"></div><div class="alert ' + (last.score <= 40 ? 'warn' : 'info') + '">' + ic('scale') + '<div style="font-size:var(--fs-sm)">' + (last.score <= 40 ? '<b>Cuenta como dependiente</b> para el cálculo del ratio de cuidadoras (Barthel 0–40, Ord. 1032/2019).' : 'No cuenta como dependiente para el ratio (Barthel &gt; 40).') + '</div></div>' +
          (BT.can('clinical.write') ? '<button class="btn primary block mt-12" data-act="newb">' + ic('plus') + 'Nueva evaluación</button>' : '') }) + '</div>' +
        '<div class="col gap-16">' + ui.card({ title: 'Evolución del índice de Barthel', icon: 'chart-line', sub: hist.length + ' evaluaciones · ' + u.fmtDate(hist[0].fecha) + ' a ' + u.fmtDate(last.fecha), body: '<div class="chart-box"><canvas id="bChart"></canvas></div><div class="scale-legend" data-tip="0–19 total · 20–35 severa · 40–55 moderada · 60–95 leve · 100 independiente"><i style="background:#f0c3be;flex:20"></i><i style="background:#f6d8d4;flex:20"></i><i style="background:#f0d6a6;flex:20"></i><i style="background:#c2dfca;flex:40"></i></div>' }) +
        ui.card({ title: 'Historial', icon: 'history', bodyCls: 'flush', body: ui.table([{ label: 'Fecha', render: (x) => u.fmtDate(x.fecha) }, { label: 'Puntaje', align: 'num', render: (x) => '<span class="bscore">' + x.score + '<small>/100</small></span>' }, { label: 'Grado', render: (x) => { const gg = BT.depGrade(x.score); return ui.badge(gg.label, gg.tone, { dot: true }); } }, { label: 'Evaluó', render: (x) => esc(x.evaluador) }], [...hist].reverse(), { compact: true }) }) + '</div></div>';
      setTimeout(() => {
        const ctx = panel.querySelector('#bChart'); if (!ctx) return;
        const g2 = ctx.getContext('2d').createLinearGradient(0, 0, 0, 240); g2.addColorStop(0, BT.tint('rgba(41,112,64,.25)')); g2.addColorStop(1, BT.tint('rgba(41,112,64,0)'));
        BT.chart(ctx, {
          type: 'line',
          data: { labels: hist.map((x) => u.fmtDate(x.fecha)), datasets: [{ label: 'Barthel', data: hist.map((x) => x.score), borderColor: '#297040', backgroundColor: g2, fill: true, pointRadius: 4, pointBackgroundColor: '#fff', pointBorderColor: '#297040', pointBorderWidth: 2 }, { label: 'Umbral dependencia (40)', data: hist.map(() => 40), borderColor: '#c4473c', borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0, fill: false }] },
          options: { scales: { y: { min: 0, max: 100, ticks: { stepSize: 20 } }, x: { grid: { display: false } } }, plugins: { legend: { display: true, position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 16 } } } },
        });
      }, 30);
      ui.on(panel, { newb: () => barthelModal(r, () => { renderFichaTab(panel, 'barthel', r, drawer); ui.enhance(panel); }) });
    }
    if (tab === 'plan') {
      const p = r.plan;
      const list = (arr, icn) => '<div class="col gap-6">' + arr.map((x) => '<div class="row top" style="gap:10px;font-size:var(--fs-md)"><span class="t-brand" style="margin-top:2px">' + ic(icn, 'ic-sm') + '</span>' + esc(x) + '</div>').join('') + '</div>';
      const days = u.daysUntil(p.revision);
      panel.innerHTML = '<div class="alert ' + (days <= 14 ? 'warn' : 'ok') + ' mb-16">' + ic('calendar-check') + '<div><b>Próxima revisión: ' + u.fmtDate(p.revision) + '</b> (' + u.relDay(p.revision) + ') · Responsable: ' + esc(p.responsable) + '</div></div>' +
        '<div class="grid g-3 stagger">' + ui.card({ title: 'Objetivos', icon: 'target', body: list(p.objetivos, 'circle-check') }) + ui.card({ title: 'Cuidados indicados', icon: 'hand-heart', body: list(p.cuidados, 'check') }) + ui.card({ title: 'Actividades', icon: 'palette', body: list(p.actividades, 'sparkles') }) + '</div>' +
        ui.card({ cls: 'mt-16', title: 'Indicaciones vigentes', icon: 'stethoscope', bodyCls: 'flush', body: '<div class="list">' + BT.db.indicaciones.filter((x) => x.residentId === r.id).map((x) => '<div class="li"><span class="li-ic brand">' + ic('notebook-pen', 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(x.tipo) + '</div><div class="d">' + esc(x.texto) + '</div></div><span class="w">' + u.fmtDate(x.ts) + '</span></div>').join('') + '</div>' });
    }
    if (tab === 'social') {
      const s = r.social; const tone = { 'Muy buena': 'ok', 'Buena': 'ok', 'En proceso': 'warn', 'Con dificultades': 'danger' }[s.adaptacion];
      const visits = BT.db.visits.filter((v) => v.residentId === r.id && v.estado === 'Realizada');
      panel.innerHTML = '<div class="grid g-main">' + ui.card({ title: 'Proceso de adaptación', icon: 'heart-handshake', sub: 'Valoración social · ' + u.fmtDate(s.fecha) + ' · ' + esc(s.profesional), actions: ui.badge(s.adaptacion, tone, { lg: true, dot: true }), body: '<p style="font-size:var(--fs-base);line-height:1.65;color:var(--ink-800)">' + esc(s.texto) + '</p>' }) +
        ui.card({ title: 'Vínculo familiar', icon: 'users-round', body: '<div class="kv-cards"><div class="kv-card"><div class="k">' + ic('door-open', 'ic-xs') + 'Visitas (30 días)</div><div class="v num">' + visits.length + '</div></div><div class="kv-card"><div class="k">' + ic('calendar', 'ic-xs') + 'Última visita</div><div class="v">' + (visits.length ? u.fmtDate(u.sortBy(visits, 'fecha', true)[0].fecha) : '—') + '</div></div></div><div class="mt-12">' + ui.person(r.referente.nombre, esc(r.referente.vinculo) + ' · referente') + '</div>' }) + '</div>';
    }
    if (tab === 'docs') {
      const ft = (t) => (/Cédula|vacunas/.test(t) ? 'img' : /Contrato|Ficha/.test(t) ? 'doc' : '');
      panel.innerHTML = '<div class="col gap-6 stagger">' + r.docs.map((d, i) => '<div class="file doc-row"><div class="row"><span class="fi ' + ft(d.tipo) + '">' + (ft(d.tipo) === 'img' ? 'JPG' : 'PDF') + '</span><div><div class="strong" style="font-size:var(--fs-md)">' + esc(d.tipo) + '</div><div class="muted" style="font-size:var(--fs-xs)">' + (d.estado === 'ok' ? 'Cargado el ' + u.fmtDate(d.fecha) + (d.vence ? ' · vence ' + u.fmtDate(d.vence) : '') : d.estado === 'vencido' ? 'Vencido el ' + u.fmtDate(d.vence) : 'No se adjuntó todavía') + '</div></div></div>' +
        '<div class="row gap-6">' + (d.estado === 'ok' ? ui.badge('Al día', 'ok', { icon: 'check' }) + (d.file ? '<span class="subtle" style="font-size:var(--fs-xs)">' + ic(/^image/.test(d.file.type) ? 'image' : 'file-text', 'ic-xs') + ' adjunto</span>' : '') + '<button class="icon-btn ghost sm" data-tip="Ver documento" data-act="view" data-i="' + i + '">' + ic('eye', 'ic-sm') + '</button><button class="icon-btn ghost sm" data-tip="Reemplazar archivo" data-act="up" data-i="' + i + '">' + ic('upload', 'ic-sm') + '</button>' : ui.badge(d.estado === 'falta' ? 'Falta' : 'Vencido', 'danger') + '<button class="btn soft sm" data-act="up" data-i="' + i + '">' + ic('upload') + 'Adjuntar</button>') + '</div></div>').join('') + '</div>';
      ui.on(panel, {
        up: (t) => {
          const doc = r.docs[+t.dataset.i]; const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*,application/pdf';
          inp.addEventListener('change', async () => {
            const f = inp.files[0]; if (!f) return;
            const key = 'resdoc:' + r.id + ':' + doc.tipo; const d = await BT.readFileAsDataURL(f);
            if (!BT.files.put(key, d)) return ui.toast('No hay espacio para guardar el archivo', { type: 'warn', sub: 'En la demo los archivos se guardan en el navegador' });
            doc.estado = 'ok'; doc.fecha = u.todayIso(); doc.file = { name: f.name, type: f.type, size: f.size };
            if (doc.tipo === 'Carné de vacunas') doc.vence = u.iso(u.addDays(u.today(), 365));
            BT.save(); BT.audit('Adjuntó documento', doc.tipo, { residentId: r.id });
            ui.toast('Documento adjuntado', { sub: doc.tipo + ' · ' + BT.shortName(r), icon: 'paperclip' });
            renderFichaTab(panel, 'docs', r, drawer); BT.shell.updateNav();
            if (/Cédula/.test(doc.tipo) && /^image\//.test(f.type) && !BT.photos.get(BT.photoKey.resident(r))) setTimeout(() => viewDoc(doc), 300);
          });
          inp.click();
        },
        view: (t) => viewDoc(r.docs[+t.dataset.i]),
      });
      function viewDoc(doc) {
        BT.audit('Leyó', 'Documento: ' + doc.tipo, { residentId: r.id });
        BT.docPreview({ title: doc.tipo, sub: BT.fullName(r) + ' · cargado el ' + u.fmtDate(doc.fecha), dataUrl: BT.files.get('resdoc:' + r.id + ':' + doc.tipo), type: doc.file && doc.file.type,
          onUsePhoto: /Cédula/.test(doc.tipo) && !BT.isRole('familiar') ? (src) => BT.photoEditor({ title: 'Foto de perfil desde la cédula', name: BT.fullName(r), key: BT.photoKey.resident(r), source: src, onSave: () => { BT.audit('Actualizó foto', 'Ficha del residente', { residentId: r.id }); drawer.querySelectorAll('.av-edit').forEach((n) => { n.outerHTML = ui.avatarEdit(BT.fullName(r), BT.photoKey.resident(r)); }); BT.refresh(); } }) : null });
      }
    }
  }

  /* ---------- Evaluación de Barthel ---------- */
  function barthelModal(r, done) {
    const vals = BARTHEL.map(() => null);
    ui.modal({
      title: 'Nueva evaluación de Barthel', sub: BT.fullName(r) + ' · último puntaje ' + BT.lastBarthel(r), icon: 'gauge', size: 'lg',
      body: '<div class="b-total"><div class="n" id="bt">0</div><div class="grow"><div class="strong" id="bg">Completá los 10 ítems</div><div class="muted" style="font-size:var(--fs-xs)" id="bd">Dependiente para el ratio si el total es ≤ 40</div></div><div id="bc" class="muted num" style="font-size:var(--fs-sm)">0/10</div></div>' +
        BARTHEL.map(([name, opts], i) => '<div class="barthel-item"><div class="strong" style="font-size:var(--fs-md)">' + (i + 1) + '. ' + name + '</div>' + ui.field({ label: '', name: 'b' + i, type: 'chips', options: opts.map(([v, l]) => ({ v: String(v), l: l + ' · ' + v })) }).replace('<label', '<label class="sr-only"') + '</div>').join(''),
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save disabled>' + ic('check') + 'Guardar evaluación</button>',
      onMount: (m, close) => {
        const upd = () => {
          const f = ui.formData(m); BARTHEL.forEach((_, i) => (vals[i] = f['b' + i] === '' ? null : +f['b' + i]));
          const n = vals.filter((v) => v != null).length; const tot = u.sum(vals.filter((v) => v != null));
          m.querySelector('#bt').textContent = tot; m.querySelector('#bc').textContent = n + '/10';
          const g = BT.depGrade(tot); m.querySelector('#bg').innerHTML = n === 10 ? 'Dependencia ' + g.label.toLowerCase() + ' ' + ui.badge(tot <= 40 ? 'Cuenta para el ratio' : 'No dependiente', tot <= 40 ? 'warn' : 'ok') : 'Completá los 10 ítems';
          m.querySelector('[data-save]').disabled = n < 10;
        };
        m.addEventListener('chipchange', upd);
        m.querySelector('[data-save]').addEventListener('click', () => {
          const tot = u.sum(vals); const before = BT.lastBarthel(r); const reqBefore = BT.ratioRequired()[r.sede];
          r.barthel.push({ fecha: u.todayIso(), score: tot, evaluador: BT.state.user.nombre });
          BT.db.evoluciones.push({ id: u.uid('ev'), residentId: r.id, ts: Date.now(), autor: BT.state.user.nombre, rol: BT.role(), tipo: BT.isRole('medico') ? 'Médica' : 'Enfermería', texto: 'Reevaluación de índice de Barthel: ' + tot + '/100 (anterior ' + before + '). Grado de dependencia: ' + BT.depGrade(tot).label.toLowerCase() + '.', enmiendas: [] });
          BT.save(); BT.audit('Modificó', 'Índice de Barthel', { residentId: r.id, detail: before + ' → ' + tot });
          close();
          const reqAfter = BT.ratioRequired()[r.sede];
          if (reqAfter.N !== reqBefore.N || reqAfter.M !== reqBefore.M) ui.toast('Cambió el ratio requerido en ' + r.sede, { type: 'warn', icon: 'users', sub: 'Día ' + reqBefore.M + '→' + reqAfter.M + ' · Noche ' + reqBefore.N + '→' + reqAfter.N + ' cuidadoras', ms: 5200 });
          else ui.toast('Evaluación guardada', { sub: 'Barthel ' + tot + '/100 · ' + BT.depGrade(tot).label });
          BT.shell.updateNav();
          done && done();
        });
      },
    });
  }

  /* ---------- Exportables ---------- */
  function exportFicha(r) {
    const D = BT.doc; const canClin = clinical(); const g = BT.depGrade(BT.lastBarthel(r));
    let body = '<div style="display:flex;gap:16px;align-items:center;margin:18px 0 6px"><div style="width:64px;height:64px;border-radius:50%;background:#e2f0e6;color:#1c4f2d;display:grid;place-items:center;font-weight:750;font-size:20pt">' + esc(u.initials(BT.fullName(r)).toUpperCase()) + '</div><div><div style="font-size:15pt;font-weight:750;letter-spacing:-.02em">' + esc(BT.fullName(r)) + '</div><div class="muted">' + u.age(r.nacimiento) + ' años · ' + room(r) + ' · ' + esc(BT.sedeName(r.sede)) + '</div></div></div>';
    body += D.section('Datos personales', D.kv([['Nombre completo', esc(BT.fullName(r))], ['Cédula de identidad', u.fmtCI(r.ci)], ['Fecha de nacimiento', u.fmtDate(r.nacimiento)], ['Sexo', r.sexo === 'F' ? 'Femenino' : 'Masculino'], ['Fecha de ingreso', u.fmtDate(r.ingreso)], ['Habitación y cama', room(r)]], 3));
    body += D.section('Cobertura de salud', D.kv([['Mutualista', esc(r.mutualista)], ['Emergencia móvil', esc(r.emergencia)], ['Médico de referencia', esc(r.medico)], ['Alergias', r.alergias.length ? r.alergias.map((a) => D.badge(a, 'danger')).join(' ') : 'Sin alergias conocidas'], ['Dieta', esc(r.dieta)], canClin ? ['Grado de dependencia', D.badge(g.label, g.tone) + ' Barthel ' + BT.lastBarthel(r) + '/100'] : null], 3));
    body += D.section('Referente familiar y representación legal', D.kv([['Referente', esc(r.referente.nombre) + ' (' + esc(r.referente.vinculo) + ')'], ['Teléfono', esc(r.referente.tel)], ['Correo electrónico', esc(r.referente.email)], ['Curador', r.curador ? esc(r.curador.nombre) + ' — ' + esc(r.curador.tipo) : 'No corresponde']], 2));
    if (canClin) {
      body += D.section('Diagnósticos', '<div>' + r.diagnosticos.map((x) => D.badge(x)).join(' ') + '</div>');
      body += D.section('Plan de atención individual', D.twoCol('<h3>Objetivos</h3><ul>' + r.plan.objetivos.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>', '<h3>Cuidados indicados</h3><ul>' + r.plan.cuidados.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>') + D.note('Próxima revisión: <b>' + u.fmtDate(r.plan.revision) + '</b> · Responsable: ' + esc(r.plan.responsable)));
      body += D.section('Evolución del índice de Barthel', D.chart({ type: 'line', data: { labels: r.barthel.map((x) => u.fmtDate(x.fecha)), datasets: [{ label: 'Barthel', data: r.barthel.map((x) => x.score), borderColor: '#297040', backgroundColor: 'rgba(41,112,64,.12)', fill: true, pointRadius: 4, pointBackgroundColor: '#fff', pointBorderColor: '#297040', pointBorderWidth: 2 }, { label: 'Umbral de dependencia (40)', data: r.barthel.map(() => 40), borderColor: '#c4473c', borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0 }] }, options: { scales: { y: { min: 0, max: 100 } } } }, { w: 680, h: 210 }));
      body += D.section('Valoración social', '<p>' + esc(r.social.texto) + '</p><p class="muted small">Adaptación: <b>' + esc(r.social.adaptacion) + '</b> · ' + esc(r.social.profesional) + ' · ' + u.fmtDate(r.social.fecha) + '</p>');
    }
    body += D.section('Documentación del legajo', D.table([{ label: 'Documento', key: 'tipo' }, { label: 'Estado', render: (d) => D.badge(d.estado === 'ok' ? 'Al día' : d.estado === 'falta' ? 'Falta' : 'Vencido', d.estado === 'ok' ? 'ok' : 'danger') }, { label: 'Fecha', render: (d) => (d.estado === 'ok' ? u.fmtDate(d.fecha) : '—') }, { label: 'Vencimiento', render: (d) => (d.vence ? u.fmtDate(d.vence) : '—') }], r.docs, { compact: true }));
    body += D.signatures(['Firma del referente familiar', 'Dirección técnica']);
    D.open({ title: 'Ficha del residente', subtitle: esc(BT.fullName(r)) + ' · Ordenanza 483/017', sede: r.sede, kicker: 'Ficha de usuario', body, residentId: r.id, filename: 'Ficha - ' + BT.fullName(r) });
  }
  function exportBarthel(r) {
    const D = BT.doc;
    const body = D.kpis([{ label: 'Último puntaje', value: BT.lastBarthel(r) + '/100', sub: u.fmtDate(r.barthel[r.barthel.length - 1].fecha) }, { label: 'Grado', value: BT.depGrade(BT.lastBarthel(r)).label }, { label: 'Para el ratio', value: BT.isDependent(r) ? 'Dependiente' : 'No dep.', sub: 'Ord. 1032/2019' }, { label: 'Evaluaciones', value: r.barthel.length }]) +
      D.chart({ type: 'line', data: { labels: r.barthel.map((x) => u.fmtDate(x.fecha)), datasets: [{ label: 'Barthel', data: r.barthel.map((x) => x.score), borderColor: '#297040', backgroundColor: 'rgba(41,112,64,.12)', fill: true, pointRadius: 4, pointBackgroundColor: '#fff', pointBorderColor: '#297040', pointBorderWidth: 2 }, { label: 'Umbral (40)', data: r.barthel.map(() => 40), borderColor: '#c4473c', borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0 }] }, options: { scales: { y: { min: 0, max: 100 } } } }, { w: 680, h: 260, caption: 'Evolución del índice de Barthel' }) +
      D.section('Historial de evaluaciones', D.table([{ label: 'Fecha', render: (x) => u.fmtDate(x.fecha) }, { label: 'Puntaje', align: 'num', render: (x) => x.score + '/100' }, { label: 'Grado', render: (x) => BT.depGrade(x.score).label }, { label: 'Evaluó', key: 'evaluador' }], [...r.barthel].reverse()));
    D.open({ title: 'Evolución del índice de Barthel', subtitle: esc(BT.fullName(r)), sede: r.sede, kicker: 'Informe clínico', body, residentId: r.id });
  }
  function exportList(kind, all) {
    if (kind === 'list-xlsx') {
      BT.xlsx({ title: 'Nómina de residentes', filename: 'Residentes - ' + BT.sedeLabel(), sheets: [{ name: 'Residentes', freezeCols: 1, columns: [
        { header: 'Residente', key: 'n', width: 30 }, { header: 'Cédula', key: 'ci', width: 14 }, { header: 'Sede', key: 'sede', width: 8 }, { header: 'Hab.', key: 'hab', width: 8 }, { header: 'Nacimiento', key: 'nac', width: 13, fmt: 'date' }, { header: 'Edad', key: 'edad', width: 7, fmt: 'int' }, { header: 'Ingreso', key: 'ing', width: 13, fmt: 'date' },
        { header: 'Barthel', key: 'b', width: 9, fmt: 'int' }, { header: 'Dependencia', key: 'g', width: 14 }, { header: 'Mutualista', key: 'mut', width: 20 }, { header: 'Emergencia', key: 'em', width: 15 }, { header: 'Dieta', key: 'dieta', width: 18 }, { header: 'Alergias', key: 'al', width: 16 }, { header: 'Referente', key: 'ref', width: 24 }, { header: 'Teléfono', key: 'tel', width: 14 }, { header: 'Cuota mensual', key: 'cuota', width: 15, fmt: 'money' }],
        rows: all.map((r) => ({ n: BT.fullName(r), ci: u.fmtCI(r.ci), sede: r.sede, hab: r.habitacion + r.cama, nac: r.nacimiento, edad: u.age(r.nacimiento), ing: r.ingreso, b: BT.lastBarthel(r), g: BT.depGrade(BT.lastBarthel(r)).label, mut: r.mutualista, em: r.emergencia, dieta: r.dieta, al: r.alergias.join(', ') || '—', ref: r.referente.nombre + ' (' + r.referente.vinculo + ')', tel: r.referente.tel, cuota: r.cuota })),
        totals: { cuota: 'sum' } }] });
    } else {
      const D = BT.doc; const bySede = u.groupBy(all, 'sede');
      const body = D.kpis([{ label: 'Residentes', value: all.length }, { label: 'Dependientes', value: all.filter(BT.isDependent).length, sub: 'Barthel ≤ 40' }, { label: 'Edad promedio', value: Math.round(u.avg(all, (r) => u.age(r.nacimiento))) + ' años' }, { label: 'Mujeres', value: all.filter((r) => r.sexo === 'F').length }]) +
        Object.keys(bySede).sort().map((s) => D.section(BT.sedeName(s), D.table([{ label: 'Hab.', render: (r) => r.habitacion + r.cama, width: '44px' }, { label: 'Residente', render: (r) => '<b>' + esc(BT.fullName(r)) + '</b><br><span class="muted small">CI ' + u.fmtCI(r.ci) + '</span>' }, { label: 'Edad', align: 'num', render: (r) => u.age(r.nacimiento) }, { label: 'Dependencia', render: (r) => { const g = BT.depGrade(BT.lastBarthel(r)); return D.badge(g.label, g.tone) + ' <span class="muted small">' + BT.lastBarthel(r) + '</span>'; } }, { label: 'Mutualista / emergencia', render: (r) => esc(r.mutualista) + '<br><span class="muted small">' + esc(r.emergencia) + '</span>' }, { label: 'Referente', render: (r) => esc(r.referente.nombre) + '<br><span class="muted small">' + esc(r.referente.tel) + '</span>' }], bySede[s], { compact: true }))).join('');
      D.open({ title: 'Nómina de residentes', subtitle: u.cap(u.fmtDateLong(new Date())), body, kicker: 'Listado' });
    }
  }
})();

/* ==========================================================================
   Cocina y nutrición — menú semanal, dietas especiales y lista de comedor
   ========================================================================== */
(function () {
  'use strict';
  const BT = window.BT, u = BT.u, ic = BT.ic, esc = u.esc, ui = BT.ui;
  const MEALS = [
    { id: 'desayuno', label: 'Desayuno', icon: 'coffee', hora: '08:30' },
    { id: 'almuerzo', label: 'Almuerzo', icon: 'soup', hora: '12:00' },
    { id: 'merienda', label: 'Merienda', icon: 'cake', hora: '16:30' },
    { id: 'cena', label: 'Cena', icon: 'moon', hora: '20:00' },
  ];
  const DIET_META = {
    'Común': { tone: 'brand', icon: 'utensils-crossed', color: '#297040' },
    'Diabético': { tone: 'info', icon: 'droplet', color: '#3f78b5' },
    'Hiposódico': { tone: 'violet', icon: 'heart', color: '#6b5ba8' },
    'Blanda': { tone: 'warn', icon: 'soup', color: '#c9a26b' },
    'Procesada (disfagia)': { tone: 'danger', icon: 'triangle-alert', color: '#c4473c' },
    'Hipograsa': { tone: 'ok', icon: 'salad', color: '#3f9d8f' },
  };
  const DIETS = Object.keys(DIET_META);
  const todayIdx = () => (new Date().getDay() + 6) % 7; // lunes = 0
  const fresh = (host) => { host.innerHTML = ''; const d = document.createElement('div'); host.appendChild(d); return d; };
  const KS = () => (BT.state.cocUI = BT.state.cocUI || { meal: null, sede: 'BT1' });
  const roomSort = (a, b) => (a.sede + a.habitacion.padStart(2, '0') + a.cama).localeCompare(b.sede + b.habitacion.padStart(2, '0') + b.cama);
  const currentMeal = () => { const h = new Date().getHours() + new Date().getMinutes() / 60; return h < 10.5 ? 'desayuno' : h < 14.5 ? 'almuerzo' : h < 18.5 ? 'merienda' : 'cena'; };
  const needsHelp = (r) => BT.lastBarthel(r) <= 40;
  const dietVariant = (diet, plato) => {
    if (diet === 'Común') return plato;
    if (diet === 'Procesada (disfagia)') return plato.replace(/,.*$/, '') + ' — procesado en textura puré, líquidos espesados';
    if (diet === 'Blanda') return plato + ' — cocción prolongada, carnes picadas';
    if (diet === 'Diabético') return plato.replace(/mermelada|dulce de membrillo/gi, 'mermelada sin azúcar').replace(/Budín casero|Torta de naranja|Arroz con leche/gi, 'postre dietético con edulcorante') + ' — sin azúcar agregada';
    if (diet === 'Hiposódico') return plato + ' — sin sal agregada';
    if (diet === 'Hipograsa') return plato.replace(/Milanesa al horno/, 'Milanesa a la plancha') + ' — sin grasas visibles';
    return plato;
  };

  BT.addCSS('coc', `
  .menu-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:10px}
  @media (max-width:1240px){.menu-week{grid-template-columns:repeat(4,minmax(0,1fr))}}
  @media (max-width:760px){.menu-week{grid-template-columns:1fr}}
  .mday{border:1px solid var(--line);border-radius:var(--r-lg);background:var(--surface);padding:14px;display:flex;flex-direction:column;gap:10px;box-shadow:var(--sh-1);transition:box-shadow var(--d),transform var(--d)}
  .mday:hover{box-shadow:var(--sh-3);transform:translateY(-2px)}
  .mday.today{border-color:var(--brand-400);box-shadow:0 0 0 3px var(--brand-50),var(--sh-2);background:linear-gradient(180deg,var(--brand-50),#fff 45%)}
  .mday .dn{display:flex;justify-content:space-between;align-items:center;font-weight:700;color:var(--ink-950)}
  .mday .ml{display:flex;gap:8px;align-items:flex-start;font-size:var(--fs-sm);line-height:1.35}
  .mday .ml .ic{color:var(--ink-400);margin-top:1px;width:15px;height:15px}
  .mday .ml b{display:block;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-400);font-weight:650}
  .diet-card{border:1px solid var(--line);border-radius:var(--r-lg);background:var(--surface);overflow:hidden;box-shadow:var(--sh-1)}
  .diet-card .dh{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--ink-100);border-left:4px solid var(--dc)}
  .diet-card .plate{display:flex;gap:7px;align-items:flex-start;padding:10px 16px;background:var(--surface-2);font-size:var(--fs-sm);color:var(--ink-700);border-bottom:1px solid var(--ink-100)}
  .diet-card .who{display:flex;align-items:center;gap:10px;padding:9px 16px;border-bottom:1px solid var(--ink-100);font-size:var(--fs-md)}
  .diet-card .who:last-child{border-bottom:0}
  .diet-card .who .hb{width:34px;font-weight:700;color:var(--ink-500);font-size:var(--fs-xs);font-variant-numeric:tabular-nums}
  `);

  BT.tab({
    id: 'cocina', label: 'Cocina y nutrición', icon: 'utensils-crossed', group: 'gestion', order: 11, roles: ['direccion', 'medico', 'enfermeria', 'cuidadora'],
    render(el, params) {
      if (params && params.sub && !params._applied) { params._applied = true; BT.state.sub.coc = params.sub; }
      el.innerHTML = ui.pageHeader({ eyebrow: 'Gestión · ' + BT.sedeName(), icon: 'utensils-crossed', title: 'Cocina y nutrición', sub: 'Menú semanal, dietas especiales indicadas por el médico y quién come qué en cada comida.',
        actions: '<button class="btn" data-act="pdf">' + ic('printer') + 'Lista de comedor de hoy</button>' }) + '<div id="cocTabs"></div>';
      ui.subtabs(el.querySelector('#cocTabs'), 'coc', [
        { id: 'comedor', label: 'Quién come qué', icon: 'users' },
        { id: 'menu', label: 'Menú semanal', icon: 'calendar-days' },
        { id: 'dietas', label: 'Dietas especiales', icon: 'salad' },
      ], (p, id) => (id === 'comedor' ? renderComedor(p) : id === 'menu' ? renderMenu(p) : renderDietas(p)));
      ui.on(el, { pdf: exportComedor });
    },
  });

  /* ---------------- Quién come qué ---------------- */
  function renderComedor(host) {
    const panel = fresh(host); const ks = KS(); const meal = ks.meal || currentMeal();
    const res = BT.residentsInSede().sort(roomSort);
    const menu = BT.db.menu.semana[todayIdx()]; const plato = menu[meal];
    const byDiet = u.groupBy(res, 'dieta');
    const help = res.filter(needsHelp).length; const alerg = res.filter((r) => r.alergias.length).length; const esp = res.filter((r) => r.dieta !== 'Común').length;
    const M = MEALS.find((m) => m.id === meal);
    panel.innerHTML = '<div class="grid g-4 stagger">' +
      ui.kpi({ label: 'Comensales', value: res.length, icon: 'users', tone: 'ink', foot: BT.sedeName() }) +
      ui.kpi({ label: 'Dietas especiales', value: esp, icon: 'salad', foot: Math.round((esp / Math.max(1, res.length)) * 100) + ' % del total' }) +
      ui.kpi({ label: 'Requieren asistencia', value: help, icon: 'hand-heart', tone: 'warn', foot: 'Barthel ≤ 40' }) +
      ui.kpi({ label: 'Con alergias', value: alerg, icon: 'triangle-alert', tone: 'danger', foot: 'Verificar ingredientes' }) + '</div>' +
      '<div class="card mt-16"><div class="card-b row between wrap gap-16"><div class="row gap-16"><span class="k-ic" style="width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:var(--brand-50);color:var(--brand-600)">' + ic(M.icon, 'ic-lg') + '</span><div><div class="muted" style="font-size:var(--fs-sm)">' + u.cap(u.fmtDateLong(new Date())) + ' · ' + M.label + ' ' + M.hora + '</div><div class="strong" style="font-size:var(--fs-xl);letter-spacing:-.01em">' + esc(plato) + '</div></div></div>' +
      ui.seg('cocMeal', MEALS.map((m) => ({ id: m.id, label: m.label, icon: m.icon })), meal, 'sm') + '</div></div>' +
      '<div class="grid g-3 mt-16 stagger">' + DIETS.filter((d) => byDiet[d]).map((d) => {
        const DM = DIET_META[d]; const list = byDiet[d];
        return '<div class="diet-card" style="--dc:' + DM.color + '"><div class="dh"><span class="li-ic" style="width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:' + BT.alpha(DM.color, 0.12) + ';color:' + DM.color + '">' + ic(DM.icon, 'ic-sm') + '</span><div class="grow"><div class="strong">' + esc(d) + '</div><div class="muted" style="font-size:var(--fs-xs)">' + esc(BT.db.menu.variantes[d] || '') + '</div></div><span class="badge lg">' + list.length + '</span></div>' +
          '<div class="plate">' + ic('utensils-crossed', 'ic-xs') + ' ' + esc(dietVariant(d, plato)) + '</div>' +
          list.map((r) => '<div class="who"><span class="hb">' + (BT.state.sede === 'ALL' ? r.sede + ' ' : '') + r.habitacion + r.cama + '</span>' + ui.avatar(BT.fullName(r), { size: 'xs' }) + '<span class="grow ellipsis">' + esc(BT.shortName(r)) + '</span>' +
            (r.alergias.length ? ui.badge(r.alergias.join(', '), 'danger', { icon: 'triangle-alert', tip: 'Alergia' }) : '') + (needsHelp(r) ? '<span data-tip="Requiere asistencia para comer" class="t-warn">' + ic('hand-heart', 'ic-sm') + '</span>' : '') + '</div>').join('') + '</div>';
      }).join('') + '</div>';
    panel.addEventListener('segchange', (e) => { if (e.detail.name === 'cocMeal') { KS().meal = e.detail.value; renderComedor(host); ui.enhance(host); } });
  }

  /* ---------------- Menú semanal ---------------- */
  function renderMenu(host) {
    const panel = fresh(host); const ti = todayIdx(); const mon = u.addDays(u.today(), -ti);
    panel.innerHTML = '<div class="menu-week stagger">' + BT.db.menu.semana.map((d, i) => '<div class="mday ' + (i === ti ? 'today' : '') + '"><div class="dn"><span>' + d.dia + '</span>' + (i === ti ? ui.badge('Hoy', 'brand') : '<span class="subtle num" style="font-size:var(--fs-xs)">' + u.fmtDateShort(u.addDays(mon, i)) + '</span>') + '</div>' +
      MEALS.map((m) => '<div class="ml">' + ic(m.icon) + '<div><b>' + m.label + '</b>' + esc(d[m.id]) + '</div></div>').join('') + '</div>').join('') + '</div>' +
      '<div class="grid g-2 mt-16">' + ui.card({ title: 'Adaptaciones por dieta', icon: 'salad', sub: 'Cómo se adapta el menú general', bodyCls: 'flush', body: '<div class="list">' + DIETS.map((d) => '<div class="li"><span class="li-ic" style="background:' + BT.alpha(DIET_META[d].color, 0.12) + ';color:' + DIET_META[d].color + '">' + ic(DIET_META[d].icon, 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(d) + '</div><div class="d">' + esc(BT.db.menu.variantes[d]) + '</div></div><span class="w">' + BT.residentsInSede().filter((r) => r.dieta === d).length + ' res.</span></div>').join('') + '</div>' }) +
      ui.card({ title: 'Horarios del comedor', icon: 'clock', body: '<div class="col gap-16">' + MEALS.map((m) => '<div class="row between"><span class="row gap-6">' + ic(m.icon, 'ic-sm') + '<b>' + m.label + '</b></span><span class="num strong">' + m.hora + '</span></div>').join('') + '<div class="alert info">' + ic('info') + '<div>Los residentes con disfagia comen con <b>supervisión permanente</b> y en el primer turno del comedor.</div></div></div>' }) + '</div>';
  }

  /* ---------------- Dietas especiales ---------------- */
  function renderDietas(host) {
    const panel = fresh(host); const res = BT.residentsInSede().sort(roomSort);
    const canEdit = BT.isRole('medico', 'enfermeria');
    const counts = DIETS.map((d) => res.filter((r) => r.dieta === d).length);
    panel.innerHTML = '<div class="grid g-side">' + ui.card({ title: 'Distribución de dietas', icon: 'chart-column', body: '<div class="chart-box"><canvas id="dietChart"></canvas></div>' }) +
      ui.card({ title: 'Indicaciones dietéticas por residente', icon: 'salad', sub: canEdit ? 'Tocá una fila para modificar la dieta' : 'Indicadas por el médico tratante', bodyCls: 'flush',
        body: ui.table([
          { label: 'Residente', render: (r) => ui.person(BT.fullName(r), r.sede + ' · Hab. ' + r.habitacion + r.cama) },
          { label: 'Dieta', render: (r) => ui.badge(r.dieta, DIET_META[r.dieta] ? DIET_META[r.dieta].tone : '', { dot: true }) },
          { label: 'Alergias', render: (r) => (r.alergias.length ? r.alergias.map((a) => ui.badge(a, 'danger')).join(' ') : '<span class="subtle">—</span>') },
          { label: 'Asistencia', render: (r) => (needsHelp(r) ? ui.badge('Asistida', 'warn', { icon: 'hand-heart' }) : '<span class="muted" style="font-size:var(--fs-sm)">Autónoma</span>') },
          { label: 'Peso', align: 'num', render: (r) => { const w = BT.db.weights.filter((x) => x.residentId === r.id); if (w.length < 2) return '—'; const d = w[w.length - 1].kg - w[0].kg; return '<b class="num">' + u.fmtNum(w[w.length - 1].kg, 1) + ' kg</b><div style="font-size:11px" class="' + (d < -2 ? 't-danger' : 'muted') + '">' + (d >= 0 ? '+' : '−') + u.fmtNum(Math.abs(d), 1) + ' kg (6 m)</div>'; } },
        ], res, { rowAttrs: (r) => (canEdit ? 'class="click" data-diet="' + r.id + '"' : '') }) }) + '</div>';
    BT.chart(panel.querySelector('#dietChart'), { type: 'doughnut', data: { labels: DIETS, datasets: [{ data: counts, backgroundColor: DIETS.map((d) => DIET_META[d].color), borderWidth: 3, borderColor: '#fff', hoverOffset: 6 }] },
      options: { cutout: '64%', plugins: { legend: { display: true, position: 'bottom', labels: { usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 9, padding: 12 } } } } });
    panel.addEventListener('click', (e) => {
      const tr = e.target.closest('[data-diet]'); if (!tr) return; const r = BT.resident(tr.dataset.diet);
      ui.modal({ title: 'Dieta de ' + BT.shortName(r), sub: 'Actual: ' + r.dieta, icon: 'salad',
        body: ui.field({ label: 'Nueva dieta', name: 'dieta', type: 'chips', required: true, value: r.dieta, options: DIETS }) + '<div class="mt-16">' + ui.field({ label: 'Motivo', name: 'motivo', type: 'textarea', required: true, placeholder: 'Ej.: evaluación fonoaudiológica indica textura puré' }) + '</div>',
        foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>' + ic('check') + 'Guardar</button>',
        onMount: (el, close) => el.querySelector('[data-save]').addEventListener('click', () => {
          if (!ui.validate(el)) return; const f = ui.formData(el); const prev = r.dieta; r.dieta = f.dieta;
          BT.db.indicaciones.push({ id: u.uid('in'), residentId: r.id, ts: Date.now(), autor: BT.state.user.nombre, tipo: 'Dieta', texto: 'Cambio de dieta: ' + prev.toLowerCase() + ' → ' + f.dieta.toLowerCase() + '. ' + f.motivo });
          BT.save(); BT.audit('Modificó', 'Indicación dietética', { residentId: r.id, detail: prev + ' → ' + f.dieta });
          close(); ui.toast('Dieta actualizada', { sub: BT.shortName(r) + ' · ' + f.dieta + ' · cocina ya lo ve' }); renderDietas(host); ui.enhance(host);
        }),
      });
    });
  }

  /* ---------------- PDF: lista de comedor ---------------- */
  function exportComedor() {
    const D = BT.doc; const menu = BT.db.menu.semana[todayIdx()];
    const res = BT.residentsInSede().sort(roomSort);
    const body = D.kpis([{ label: 'Comensales', value: res.length }, { label: 'Dietas especiales', value: res.filter((r) => r.dieta !== 'Común').length }, { label: 'Requieren asistencia', value: res.filter(needsHelp).length }, { label: 'Con alergias', value: res.filter((r) => r.alergias.length).length }]) +
      D.section('Menú del día', D.table([{ label: 'Comida', render: (m) => '<b>' + m.label + '</b><br><span class="small muted">' + m.hora + '</span>', width: '90px' }, { label: 'Menú general', render: (m) => esc(menu[m.id]) }], MEALS)) +
      DIETS.filter((d) => res.some((r) => r.dieta === d)).map((d) => D.section(d + ' (' + res.filter((r) => r.dieta === d).length + ')',
        D.note('<b>Adaptación:</b> ' + esc(BT.db.menu.variantes[d]) + '<br><b>Almuerzo:</b> ' + esc(dietVariant(d, menu.almuerzo)) + ' · <b>Cena:</b> ' + esc(dietVariant(d, menu.cena)), d.startsWith('Procesada') ? 'danger' : '') +
        D.table([{ label: 'Hab.', render: (r) => '<b>' + (BT.state.sede === 'ALL' ? r.sede + ' ' : '') + r.habitacion + r.cama + '</b>', width: '60px' }, { label: 'Residente', render: (r) => esc(BT.fullName(r)) }, { label: 'Alergias', render: (r) => (r.alergias.length ? D.badge(r.alergias.join(', '), 'danger') : '—') }, { label: 'Asistencia', render: (r) => (needsHelp(r) ? D.badge('Asistida', 'warn') : 'Autónoma') }, { label: 'Desay.', align: 'center', render: () => '☐', width: '44px' }, { label: 'Alm.', align: 'center', render: () => '☐', width: '44px' }, { label: 'Mer.', align: 'center', render: () => '☐', width: '44px' }, { label: 'Cena', align: 'center', render: () => '☐', width: '44px' }], res.filter((r) => r.dieta === d), { compact: true }))).join('') +
      D.signatures(['Responsable de cocina', 'Enfermería']);
    D.open({ title: 'Lista de comedor', kicker: 'Cocina y nutrición', subtitle: u.cap(u.fmtDateLong(new Date())) + ' · ' + BT.sedeName(), filename: 'Lista de comedor ' + BT.sedeLabel() + ' ' + u.fmtDate(new Date()).replace(/\//g, '-'), body });
  }
})();

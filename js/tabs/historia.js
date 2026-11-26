/* ==========================================================================
   Historia clínica — evoluciones, signos vitales, peso, piel (Braden/UPP),
   caídas, indicaciones y auditoría inalterable de accesos (Ley 18.331)
   ========================================================================== */
(function () {
  'use strict';
  const BT = window.BT; const u = BT.u; const ic = BT.ic; const ui = BT.ui; const esc = u.esc;

  BT.addCSS('historia', `
    .hc{display:grid;grid-template-columns:300px minmax(0,1fr);gap:16px;align-items:start}
    .hc-list{position:sticky;top:calc(var(--topbar-h) + 12px);max-height:calc(100vh - var(--topbar-h) - 40px);display:flex;flex-direction:column;overflow:hidden}
    .hc-list .hl-search{padding:12px;border-bottom:1px solid var(--line)}
    .hc-list .hl-search .input{min-height:36px;height:36px;padding-left:34px}
    .hc-list .hl-search .ic{position:absolute;left:24px;top:21px;color:var(--ink-400)}
    .hc-list .hl-items{overflow:auto;padding:6px}
    .hl-item{display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border:0;background:transparent;border-radius:10px;text-align:left;transition:background var(--d-fast)}
    .hl-item:hover{background:var(--ink-50)}
    .hl-item.on{background:var(--brand-50);box-shadow:inset 0 0 0 1px var(--brand-100)}
    .hl-item .n{font-weight:600;font-size:var(--fs-md);color:var(--ink-950);line-height:1.2}
    .hl-item .m{font-size:11px;color:var(--ink-500)}
    .hc-head{display:flex;gap:16px;align-items:center;padding:18px 20px}
    .hc-head h2{font-size:22px;font-weight:750;letter-spacing:-.02em}
    .hc-mobile-sel{display:none;margin-bottom:12px}
    .vit-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
    .vit-now{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
    .vit-now .kv-card .v{font-size:18px;font-weight:750;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
    .vit-now .kv-card .v small{font-size:11px;color:var(--ink-500);font-weight:600}
    .evo{border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:var(--surface);transition:box-shadow var(--d),border-color var(--d)}
    .evo:hover{box-shadow:var(--sh-2);border-color:var(--line-strong)}
    .evo + .evo{margin-top:10px}
    .evo .eh{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    .evo .eb{margin-top:8px;font-size:var(--fs-md);color:var(--ink-800);line-height:1.6}
    .evo.new{animation:pop 500ms var(--ease-spring), flashOk 1.2s var(--ease-out)}
    .lock-banner{display:flex;gap:12px;align-items:center;padding:12px 16px;border-radius:14px;background:linear-gradient(135deg,var(--ink-800),var(--ink-950));color:#fff;margin-bottom:16px}
    .lock-banner .ic{color:var(--brand-300)}
    .au-day{font-size:var(--fs-xs);font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-500);margin:18px 0 10px}
    .au-day:first-child{margin-top:0}
    .au-meta{font-size:11px;color:var(--ink-400);font-variant-numeric:tabular-nums}
    .risk{display:flex;align-items:center;gap:14px;padding:14px;border-radius:14px;border:1px solid var(--line);background:var(--surface-2)}
    .risk .rv{font-size:26px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums;min-width:44px;text-align:center}
    .wound{border:1px solid var(--line);border-radius:14px;padding:14px 16px}
    .wound + .wound{margin-top:12px}
    .hc>*{min-width:0}
    @media (max-width:1080px){.hc{grid-template-columns:minmax(0,1fr)}.hc-list{display:none}.hc-mobile-sel{display:block}.vit-now{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media (max-width:640px){.vit-grid{grid-template-columns:1fr}.vit-now{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `);

  const TIPO_TONE = { 'Médica': 'info', 'Enfermería': 'brand', 'Cuidados': 'violet', 'Social': 'warn' };
  const ACT_STYLE = {
    'Abrió': ['folder-open', 'info'], 'Abrió (datos administrativos)': ['folder-open', 'info'], 'Leyó': ['eye', ''], 'Creó': ['file-plus-2', 'ok'], 'Modificó': ['pen-line', 'warn'], 'Enmendó': ['pen-line', 'warn'],
    'Administró': ['pill', 'ok'], 'Exportó': ['download', 'brand'], 'Registró caída': ['siren', 'danger'], 'Acceso denegado': ['shield-alert', 'danger'], 'Indicó': ['stethoscope', 'info'], 'Restringió': ['lock', 'danger'], 'Adjuntó documento': ['paperclip', 'ok'],
  };
  const BRADEN = [
    ['Percepción sensorial', [[1, 'Limitada'], [2, 'Muy limitada'], [3, 'Lig. limitada'], [4, 'Sin limitación']]],
    ['Humedad', [[1, 'Constante'], [2, 'A menudo'], [3, 'Ocasional'], [4, 'Rara vez']]],
    ['Actividad', [[1, 'En cama'], [2, 'En silla'], [3, 'Camina ocasional'], [4, 'Camina frecuente']]],
    ['Movilidad', [[1, 'Inmóvil'], [2, 'Muy limitada'], [3, 'Lig. limitada'], [4, 'Sin limitación']]],
    ['Nutrición', [[1, 'Muy pobre'], [2, 'Probablemente inadecuada'], [3, 'Adecuada'], [4, 'Excelente']]],
    ['Fricción y deslizamiento', [[1, 'Problema'], [2, 'Problema potencial'], [3, 'Sin problema']]],
  ];
  const bradenRisk = (s) => (s <= 12 ? { label: 'Riesgo alto', tone: 'danger' } : s <= 14 ? { label: 'Riesgo moderado', tone: 'warn' } : s <= 18 ? { label: 'Riesgo bajo', tone: 'info' } : { label: 'Sin riesgo', tone: 'ok' });
  const downtonRisk = (s) => (s >= 3 ? { label: 'Riesgo alto', tone: 'danger' } : { label: 'Riesgo bajo', tone: 'ok' });
  const last = (a) => a[a.length - 1];

  let readLog = new Set();
  const logRead = (rid, section) => { const k = rid + '|' + section; if (readLog.has(k)) return; readLog.add(k); BT.audit('Leyó', section, { residentId: rid }); };

  BT.addAlerts(() => {
    const out = []; const res = BT.residentsInSede();
    const high = res.filter((r) => last(r.braden).score <= 12 && !BT.db.wounds.some((w) => w.residentId === r.id && w.estado === 'Activa'));
    if (high.length) out.push({ id: 'braden', tone: 'info', icon: 'shield-plus', title: high.length + ' residentes con riesgo alto de úlceras', desc: 'Braden ≤ 12 · reforzar cambios posturales', tab: 'historia', params: { residentId: high[0].id, sec: 'piel' }, roles: ['medico', 'enfermeria', 'direccion'] });
    BT.db.wounds.filter((w) => w.estado === 'Activa').forEach((w) => { const r = BT.resident(w.residentId); if (!r || !BT.inSede(r)) return; const lc = last(w.curaciones); if (Date.now() - lc.ts > 2 * 864e5) out.push({ id: 'cur-' + w.id, tone: 'warn', icon: 'bandage', title: 'Curación pendiente: ' + BT.shortName(r), desc: w.zona + ' · ' + w.estadio + ' · última ' + u.rel(lc.ts), sede: r.sede, tab: 'historia', params: { residentId: r.id, sec: 'piel' }, roles: ['medico', 'enfermeria', 'direccion'] }); });
    BT.db.restrictions.filter((x) => x.hasta >= u.todayIso()).forEach((x) => { const r = BT.resident(x.residentId); if (!r || !BT.inSede(r)) return; out.push({ id: 'rs-' + x.id, tone: 'info', icon: 'lock', title: 'Restricción de ' + x.tipo.toLowerCase() + ': ' + BT.shortName(r), desc: 'Vigente hasta ' + u.fmtDate(x.hasta), sede: r.sede, tab: 'historia', params: { residentId: r.id, sec: 'indicaciones' } }); });
    return out;
  });

  BT.tab({
    id: 'historia', label: 'Historia clínica', icon: 'clipboard-list', group: 'clinica', order: 3,
    roles: ['direccion', 'medico', 'enfermeria', 'cuidadora'],
    render(el, params) {
      const list = BT.residentsInSede().sort((a, b) => (a.sede + a.habitacion.padStart(2, '0') + a.cama).localeCompare(b.sede + b.habitacion.padStart(2, '0') + b.cama));
      if (!list.length) { el.innerHTML = ui.pageHeader({ title: 'Historia clínica' }) + '<div class="card">' + ui.empty({ title: 'Sin residentes' }) + '</div>'; return; }
      let rid = params.residentId && list.some((r) => r.id === params.residentId) ? params.residentId : BT.state.sub.hcRes && list.some((r) => r.id === BT.state.sub.hcRes) ? BT.state.sub.hcRes : list[0].id;
      if (params.sec) BT.state.sub.hc = params.sec;
      el.innerHTML = ui.pageHeader({ eyebrow: BT.sedeName(), icon: 'clipboard-list', title: 'Historia clínica', sub: 'Registro clínico único · cada acceso queda auditado (Ley 18.331)', actions: '<div id="hcExport"></div>' }) +
        '<div class="hc-mobile-sel"><select class="select" id="hcSel">' + list.map((r) => '<option value="' + r.id + '">' + esc(r.habitacion + r.cama + ' · ' + BT.fullName(r)) + ' (' + r.sede + ')</option>').join('') + '</select></div>' +
        '<div class="hc"><aside class="card hc-list"><div class="hl-search" style="position:relative">' + ic('search') + '<input class="input" id="hcQ" placeholder="Buscar residente"></div><div class="hl-items" id="hcItems"></div></aside><div id="hcMain"></div></div>';
      const items = el.querySelector('#hcItems');
      const drawList = (q = '') => {
        const nq = u.norm(q);
        items.innerHTML = list.filter((r) => !nq || u.norm(BT.fullName(r) + r.habitacion + r.cama).includes(nq)).map((r) => { const g = BT.depGrade(BT.lastBarthel(r)); return '<button class="hl-item ' + (r.id === rid ? 'on' : '') + '" data-rid="' + r.id + '">' + ui.avatar(BT.fullName(r), { size: 'sm' }) + '<span class="grow" style="min-width:0"><span class="n ellipsis" style="display:block">' + esc(BT.shortName(r)) + '</span><span class="m">Hab. ' + r.habitacion + r.cama + ' · ' + g.label + '</span></span>' + (BT.state.sede === 'ALL' ? BT.sedeTag(r.sede) : '') + (r.alergias.length ? '<span class="sdot danger" data-tip="Alergias: ' + esc(r.alergias.join(', ')) + '"></span>' : '') + '</button>'; }).join('') || ui.empty({ ill: 'search', title: 'Sin coincidencias' });
      };
      const select = (id) => {
        rid = id; BT.state.sub.hcRes = id; readLog = new Set();
        items.querySelectorAll('.hl-item').forEach((b) => b.classList.toggle('on', b.dataset.rid === id));
        el.querySelector('#hcSel').value = id;
        BT.audit('Abrió', 'Historia clínica', { residentId: id });
        renderMain(el.querySelector('#hcMain'), BT.resident(id), el);
        BT.state.params = { residentId: id };
      };
      drawList(); select(rid);
      el.querySelector('#hcQ').addEventListener('input', u.debounce((e) => drawList(e.target.value), 100));
      items.addEventListener('click', (e) => { const b = e.target.closest('[data-rid]'); if (b && b.dataset.rid !== rid) select(b.dataset.rid); });
      el.querySelector('#hcSel').addEventListener('change', (e) => select(e.target.value));
      const on = items.querySelector('.hl-item.on'); if (on) setTimeout(() => on.scrollIntoView({ block: 'nearest' }), 50);
    },
  });

  function renderMain(box, r, page) {
    const g = BT.depGrade(BT.lastBarthel(r));
    const exp = page.querySelector('#hcExport');
    exp.innerHTML = ui.exportMenu([{ id: 'hc', label: 'Historia clínica', sub: 'PDF A4 · resumen, evoluciones y controles', icon: 'file-text' }].concat(BT.can('audit.read') ? [{ id: 'audit', label: 'Informe de auditoría de accesos', sub: 'PDF · quién accedió y cuándo', icon: 'shield-check' }] : []));
    exp.onclick = (e) => { const t = e.target.closest('[data-act="export"]'); if (!t) return; t.dataset.id === 'hc' ? exportHC(r) : exportAudit(r); };
    const restr = BT.db.restrictions.filter((x) => x.residentId === r.id && x.hasta >= u.todayIso());
    box.innerHTML = '<section class="card hc-head-card" style="margin-bottom:16px"><div class="hc-head">' + ui.avatar(BT.fullName(r), { size: 'lg' }) +
      '<div class="grow" style="min-width:0"><h2 class="ellipsis">' + esc(BT.fullName(r)) + '</h2><div class="muted" style="font-size:var(--fs-sm)">' + u.age(r.nacimiento) + ' años · CI ' + u.fmtCI(r.ci) + ' · Hab. ' + r.habitacion + r.cama + ' · ' + esc(r.mutualista) + ' · ' + esc(r.emergencia) + '</div>' +
      '<div class="row wrap gap-6 mt-8">' + BT.sedeTag(r.sede) + ui.badge('Barthel ' + BT.lastBarthel(r) + ' · ' + g.label, g.tone, { dot: true }) + ui.badge('Dieta ' + r.dieta.toLowerCase(), 'outline') + r.alergias.map((a) => '<span class="badge danger">' + ic('triangle-alert') + 'Alergia: ' + esc(a) + '</span>').join('') + restr.map((x) => ui.badge('Restricción de ' + x.tipo.toLowerCase(), 'dark', { icon: 'lock', tip: x.motivo })).join('') + '</div></div>' +
      (BT.actions.openResident && BT.visibleTabs().some((t) => t.id === 'residentes') ? '<button class="btn sm" data-act="ficha">' + ic('id-card') + 'Ficha</button>' : '') + '</div></section><div id="hcTabs"></div>';
    box.querySelector('[data-act="ficha"]') && box.querySelector('[data-act="ficha"]').addEventListener('click', () => BT.actions.openResident(r.id));
    const nEvo = BT.db.evoluciones.filter((e) => e.residentId === r.id).length;
    const tabs = [
      { id: 'resumen', label: 'Resumen', icon: 'layout-dashboard' },
      { id: 'evoluciones', label: 'Evoluciones', icon: 'notebook-pen', count: nEvo },
      { id: 'signos', label: 'Signos vitales', icon: 'activity' },
      { id: 'peso', label: 'Peso', icon: 'scale' },
      { id: 'piel', label: 'Piel y UPP', icon: 'bandage' },
      { id: 'caidas', label: 'Caídas', icon: 'siren', count: BT.db.falls.filter((f) => f.residentId === r.id).length || '' },
      { id: 'indicaciones', label: 'Indicaciones', icon: 'stethoscope' },
      { id: 'auditoria', label: 'Auditoría', icon: 'shield-check' },
    ];
    ui.subtabs(box.querySelector('#hcTabs'), 'hc', tabs, (panel, id) => SECTIONS[id](panel, r));
  }

  /* ======================= Secciones ======================= */
  const SECTIONS = {
    resumen(p, r) {
      logRead(r.id, 'Resumen clínico');
      const v = u.sortBy(BT.db.vitals.filter((x) => x.residentId === r.id), 'ts', true)[0];
      const meds = BT.db.meds.filter((m) => m.residentId === r.id && m.activo && (!m.hasta || m.hasta >= u.todayIso()));
      const br = last(r.braden), dw = last(r.downton); const bR = bradenRisk(br.score), dR = downtonRisk(dw.score);
      const evo = u.sortBy(BT.db.evoluciones.filter((e) => e.residentId === r.id), 'ts', true).slice(0, 3);
      p.innerHTML = '<div class="grid g-main"><div class="col gap-16">' +
        ui.card({ title: 'Últimos signos vitales', icon: 'activity', sub: v ? 'Registrados ' + u.rel(v.ts) + ' por ' + esc(v.autor) : '', body: v ? vitNow(v) : ui.empty({ title: 'Sin controles' }) }) +
        ui.card({ title: 'Últimas evoluciones', icon: 'notebook-pen', actions: '<button class="btn ghost sm" data-go="evoluciones">Ver todas ' + ic('arrow-right', 'ic-xs') + '</button>', body: evo.map((e) => evoCard(e, true)).join('') || ui.empty({ title: 'Sin evoluciones' }) }) +
        '</div><div class="col gap-16">' +
        ui.card({ title: 'Diagnósticos', icon: 'stethoscope', body: '<div class="col gap-6">' + r.diagnosticos.map((d) => '<div class="row" style="font-size:var(--fs-md)"><span class="sdot info"></span>' + esc(d) + '</div>').join('') + '</div>' }) +
        ui.card({ title: 'Escalas de riesgo', icon: 'gauge', body: '<div class="col gap-6"><div class="risk"><div class="rv">' + br.score + '</div><div class="grow"><div class="strong">Braden</div><div class="muted" style="font-size:var(--fs-xs)">Úlceras por presión · ' + u.fmtDate(br.fecha) + '</div></div>' + ui.badge(bR.label, bR.tone) + '</div><div class="risk"><div class="rv">' + dw.score + '</div><div class="grow"><div class="strong">Downton</div><div class="muted" style="font-size:var(--fs-xs)">Riesgo de caídas · ' + u.fmtDate(dw.fecha) + '</div></div>' + ui.badge(dR.label, dR.tone) + '</div><div class="risk"><div class="rv">' + BT.lastBarthel(r) + '</div><div class="grow"><div class="strong">Barthel</div><div class="muted" style="font-size:var(--fs-xs)">Actividades básicas · ' + u.fmtDate(last(r.barthel).fecha) + '</div></div>' + ui.badge(BT.depGrade(BT.lastBarthel(r)).label, BT.depGrade(BT.lastBarthel(r)).tone) + '</div></div>' }) +
        ui.card({ title: 'Medicación activa', icon: 'pill', sub: meds.length + ' indicaciones', bodyCls: 'flush', body: '<div class="list">' + meds.map((m) => '<div class="li"><span class="li-ic ' + (m.agudo ? 'warn' : 'brand') + '">' + ic('pill', 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(m.droga) + ' <span class="muted" style="font-weight:500">' + esc(m.dosis) + '</span></div><div class="d">' + esc(m.via) + ' · ' + m.horarios.join(' · ') + (m.agudo ? ' · <b class="t-warn">Cuadro agudo hasta ' + u.fmtDate(m.hasta) + '</b>' : '') + '</div></div></div>').join('') + '</div>' }) +
        '</div></div>';
      p.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => p.parentElement.querySelector('[data-st="' + b.dataset.go + '"]').click()));
    },

    evoluciones(p, r) {
      logRead(r.id, 'Evoluciones');
      const canW = BT.can('clinical.write');
      const draw = (flashId) => {
        const evs = u.sortBy(BT.db.evoluciones.filter((e) => e.residentId === r.id), 'ts', true);
        p.innerHTML = '<div class="alert info mb-16">' + ic('lock') + '<div><b>Registro inalterable.</b> Las anotaciones no se editan ni se borran: las correcciones se hacen como <b>enmienda</b> y la anotación original queda visible.</div></div>' +
          (canW ? ui.card({ cls: 'mb-16', title: 'Nueva evolución', icon: 'pen-line', body: '<div class="form-grid"><div class="full">' + ui.field({ label: 'Tipo', name: 'tipo', type: 'chips', value: BT.isRole('medico') ? 'Médica' : 'Enfermería', options: ['Médica', 'Enfermería'].filter((t) => BT.isRole('medico') || t === 'Enfermería') }) + '</div>' + ui.field({ label: 'Evolución', name: 'texto', type: 'textarea', required: true, full: true, placeholder: 'Describí el estado del residente, hallazgos y conducta…' }) + '</div><div class="row between mt-12"><span class="muted" style="font-size:var(--fs-xs)">' + ic('user-round', 'ic-xs') + ' Firmará: ' + esc(BT.state.user.nombre) + ' · ' + u.fmtDateTime(Date.now()) + '</span><button class="btn primary" data-act="save">' + ic('check') + 'Guardar evolución</button></div>' }) : '') +
          (evs.length ? evs.map((e) => evoCard(e, false, canW, e.id === flashId)).join('') : '<div class="card">' + ui.empty({ title: 'Sin evoluciones', text: 'Todavía no hay anotaciones para este residente.' }) + '</div>');
        ui.on(p, {
          save: () => {
            const f = p.querySelector('.card'); if (!ui.validate(f)) return;
            const d = ui.formData(f);
            const e = { id: u.uid('ev'), residentId: r.id, ts: Date.now(), autor: BT.state.user.nombre, rol: BT.role(), tipo: d.tipo || 'Enfermería', texto: d.texto, enmiendas: [] };
            BT.db.evoluciones.push(e); BT.save(); BT.audit('Creó', 'Evolución ' + e.tipo.toLowerCase(), { residentId: r.id });
            ui.toast('Evolución guardada', { sub: 'Firmada por ' + BT.state.user.nombre });
            draw(e.id);
          },
          amend: (t) => amendModal(BT.db.evoluciones.find((x) => x.id === t.dataset.id), r, () => draw(t.dataset.id)),
        });
      };
      draw();
    },

    signos(p, r) {
      logRead(r.id, 'Signos vitales');
      const vs = u.sortBy(BT.db.vitals.filter((x) => x.residentId === r.id), 'ts');
      const diab = vs.some((x) => x.hgt != null);
      const canAdd = BT.can('clinical.write') || BT.can('care.write');
      p.innerHTML = (vs.length ? ui.card({ cls: 'mb-16', title: 'Último control', icon: 'activity', sub: u.fmtDateTime(last(vs).ts) + ' · ' + esc(last(vs).autor), actions: canAdd ? '<button class="btn primary sm" data-act="add">' + ic('plus') + 'Registrar control</button>' : '', body: vitNow(last(vs)) }) : '') +
        '<div class="vit-grid">' + ui.card({ title: 'Presión arterial', icon: 'heart-pulse', sub: 'mmHg · últimas 12 semanas', body: '<div class="chart-box sm"><canvas id="cPA"></canvas></div>' }) +
        ui.card({ title: 'Frecuencia cardíaca', icon: 'activity', sub: 'lpm', body: '<div class="chart-box sm"><canvas id="cFC"></canvas></div>' }) +
        ui.card({ title: 'Saturación de O₂', icon: 'wind', sub: '%', body: '<div class="chart-box sm"><canvas id="cSat"></canvas></div>' }) +
        ui.card({ title: diab ? 'Glucemia capilar (HGT)' : 'Temperatura', icon: diab ? 'droplet' : 'thermometer', sub: diab ? 'mg/dl' : '°C', body: '<div class="chart-box sm"><canvas id="cX"></canvas></div>' }) + '</div>' +
        ui.card({ cls: 'mt-16', title: 'Registro de controles', icon: 'table', bodyCls: 'flush', body: ui.table([{ label: 'Fecha', render: (x) => u.fmtDateTime(x.ts) }, { label: 'PA', align: 'num', render: (x) => x.pas + '/' + x.pad }, { label: 'FC', align: 'num', key: 'fc' }, { label: 'T °C', align: 'num', render: (x) => u.fmtNum(x.temp, 1) }, { label: 'Sat %', align: 'num', key: 'sat' }, { label: 'HGT', align: 'num', render: (x) => (x.hgt == null ? '<span class="subtle">—</span>' : x.hgt) }, { label: 'Registró', render: (x) => '<span class="muted">' + esc(x.autor) + '</span>' }], [...vs].reverse().slice(0, 12), { compact: true }) });
      const labels = vs.map((x) => u.fmtDateShort(x.ts));
      const ds = (data, color, label, extra = {}) => Object.assign({ label, data, borderColor: color, backgroundColor: BT.alpha(color, 0.1), pointRadius: 2.5, pointBackgroundColor: '#fff', pointBorderColor: color, pointBorderWidth: 1.5 }, extra);
      const opt = (min, max) => ({ scales: { y: { suggestedMin: min, suggestedMax: max }, x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } } }, plugins: { tooltip: { mode: 'index', intersect: false } }, interaction: { mode: 'index', intersect: false } });
      setTimeout(() => {
        BT.chart(p.querySelector('#cPA'), { type: 'line', data: { labels, datasets: [ds(vs.map((x) => x.pas), '#297040', 'Sistólica', { fill: '+1', backgroundColor: 'rgba(41,112,64,.08)' }), ds(vs.map((x) => x.pad), '#8fc49f', 'Diastólica')] }, options: opt(50, 160) });
        BT.chart(p.querySelector('#cFC'), { type: 'line', data: { labels, datasets: [ds(vs.map((x) => x.fc), '#6b5ba8', 'FC', { fill: true })] }, options: opt(50, 100) });
        BT.chart(p.querySelector('#cSat'), { type: 'bar', data: { labels, datasets: [{ label: 'Sat', data: vs.map((x) => x.sat), backgroundColor: vs.map((x) => (x.sat < 92 ? '#c4473c' : '#3f78b5')), maxBarThickness: 18 }] }, options: opt(85, 100) });
        BT.chart(p.querySelector('#cX'), diab ? { type: 'line', data: { labels, datasets: [ds(vs.map((x) => x.hgt), '#d98c5f', 'HGT', { fill: true })] }, options: opt(60, 200) } : { type: 'line', data: { labels, datasets: [ds(vs.map((x) => x.temp), '#d98c5f', 'Temperatura', { fill: true })] }, options: opt(35.5, 38) });
      }, 30);
      ui.on(p, { add: () => vitalsModal(r, () => { SECTIONS.signos(p, r); ui.enhance(p); }) });
    },

    peso(p, r) {
      logRead(r.id, 'Peso');
      const ws = BT.db.weights.filter((x) => x.residentId === r.id).sort((a, b) => a.mes.localeCompare(b.mes));
      const first = ws[0], lastW = last(ws); const diff = lastW.kg - first.kg; const pct = (diff / first.kg) * 100;
      const tone = pct <= -5 ? 'danger' : pct <= -2 ? 'warn' : 'ok';
      p.innerHTML = '<div class="grid g-3 stagger mb-16">' + ui.kpi({ label: 'Peso actual', value: lastW.kg, decimals: 1, suffix: 'kg', icon: 'scale', foot: u.fmtMonth(lastW.mes) }) + ui.kpi({ label: 'Variación 6 meses', value: Math.abs(diff), decimals: 1, suffix: 'kg', icon: diff < 0 ? 'trending-down' : 'trending-up', tone, foot: ui.badge((diff < 0 ? '−' : '+') + u.fmtNum(Math.abs(pct), 1) + ' %', tone) }) + ui.kpi({ label: 'Control', value: ws.length, suffix: 'pesajes', icon: 'calendar-check', tone: 'info', foot: 'Pesaje mensual' }) + '</div>' +
        (pct <= -5 ? '<div class="alert danger mb-16">' + ic('triangle-alert') + '<div><b>Pérdida de peso significativa (' + u.fmtNum(pct, 1) + ' % en 6 meses).</b> Se sugiere valoración nutricional y revisar la consistencia de la dieta.</div></div>' : '') +
        ui.card({ title: 'Peso mensual', icon: 'chart-column', body: '<div class="chart-box"><canvas id="cW"></canvas></div>' });
      setTimeout(() => BT.chart(p.querySelector('#cW'), { type: 'bar', data: { labels: ws.map((x) => u.cap(u.fmtMonthShort(x.mes))), datasets: [{ label: 'Peso (kg)', data: ws.map((x) => x.kg), backgroundColor: ws.map((x, i) => (i === ws.length - 1 ? '#297040' : '#c2dfca')), maxBarThickness: 46 }] }, options: { scales: { y: { suggestedMin: Math.floor(Math.min(...ws.map((x) => x.kg)) - 4) }, x: { grid: { display: false } } } } }), 30);
    },

    piel(p, r) {
      logRead(r.id, 'Curaciones y UPP');
      const wounds = BT.db.wounds.filter((w) => w.residentId === r.id);
      const br = last(r.braden); const bR = bradenRisk(br.score);
      const canW = BT.can('clinical.write');
      p.innerHTML = '<div class="grid g-side"><div class="col gap-16">' + ui.card({ title: 'Escala de Braden', icon: 'gauge', body: '<div class="col" style="align-items:center">' + ui.ring((br.score / 23) * 100, br.score, 'de 23', bR.tone === 'danger' ? '#c4473c' : bR.tone === 'warn' ? '#d99a2b' : '#297040') + '<div class="mt-8">' + ui.badge(bR.label, bR.tone, { lg: true }) + '</div><div class="muted mt-8" style="font-size:var(--fs-xs)">Evaluada el ' + u.fmtDate(br.fecha) + '</div></div><div class="hr"></div>' + ui.table([{ label: 'Fecha', render: (x) => u.fmtDate(x.fecha) }, { label: 'Puntaje', align: 'num', key: 'score' }, { label: 'Riesgo', render: (x) => ui.badge(bradenRisk(x.score).label, bradenRisk(x.score).tone) }], [...r.braden].reverse(), { compact: true }) + (canW ? '<button class="btn soft block mt-12" data-act="braden">' + ic('plus') + 'Nueva evaluación de Braden</button>' : '') }) + '</div>' +
        '<div class="col gap-16">' + ui.card({ title: 'Úlceras por presión y curaciones', icon: 'bandage', sub: wounds.filter((w) => w.estado === 'Activa').length + ' activas', body: wounds.length ? wounds.map((w) => '<div class="wound"><div class="row between"><div class="row">' + '<span class="li-ic ' + (w.estado === 'Activa' ? 'danger' : 'ok') + '" style="width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--' + (w.estado === 'Activa' ? 'danger' : 'ok') + '-bg);color:var(--' + (w.estado === 'Activa' ? 'danger' : 'ok') + ')">' + ic('bandage', 'ic-sm') + '</span><div><div class="strong">' + esc(w.zona) + ' · ' + esc(w.estadio) + '</div><div class="muted" style="font-size:var(--fs-xs)">Desde ' + u.fmtDate(w.inicio) + ' (' + u.daysBetween(w.inicio, u.today()) + ' días) · ' + w.curaciones.length + ' curaciones</div></div></div>' + ui.badge(w.estado, w.estado === 'Activa' ? 'danger' : 'ok', { dot: true }) + '</div>' +
          '<div class="timeline mt-12">' + u.sortBy(w.curaciones, 'ts', true).slice(0, 4).map((c, i) => '<div class="tl-item"><span class="tl-dot ' + (i === 0 ? 'brand' : 'ok') + '">' + ic('check') + '</span><div class="tl-h"><span class="t">' + esc(c.autor) + '</span><span class="w">' + u.fmtDateTime(c.ts) + '</span></div><div class="tl-b">' + esc(c.nota) + '</div></div>').join('') + '</div>' +
          (canW && w.estado === 'Activa' ? '<button class="btn soft sm mt-12" data-act="cur" data-id="' + w.id + '">' + ic('plus') + 'Registrar curación</button>' : '') + '</div>').join('') : ui.empty({ ill: 'leaf', title: 'Piel íntegra', text: 'No hay úlceras por presión registradas.' }) }) + '</div></div>';
      ui.on(p, {
        cur: (t) => { const w = BT.db.wounds.find((x) => x.id === t.dataset.id); ui.modal({ title: 'Registrar curación', sub: BT.fullName(r) + ' · ' + w.zona, icon: 'bandage', body: ui.field({ label: 'Descripción de la curación', name: 'nota', type: 'textarea', required: true, placeholder: 'Aspecto del lecho, bordes, exudado, producto aplicado…' }) + '<div class="mt-12">' + ui.field({ label: 'Evolución', name: 'evo', type: 'chips', value: 'Favorable', options: ['Favorable', 'Estacionaria', 'Desfavorable', 'Cicatrizada'] }) + '</div>', foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-ok>' + ic('check') + 'Guardar</button>', onMount: (m, close) => m.querySelector('[data-ok]').addEventListener('click', () => { if (!ui.validate(m)) return; const f = ui.formData(m); w.curaciones.push({ ts: Date.now(), autor: BT.state.user.nombre, nota: f.nota + ' Evolución ' + f.evo.toLowerCase() + '.' }); if (f.evo === 'Cicatrizada') w.estado = 'Cicatrizada'; BT.save(); BT.audit('Creó', 'Registro de curación', { residentId: r.id, detail: w.zona }); close(); ui.toast('Curación registrada', { sub: w.zona }); SECTIONS.piel(p, r); ui.enhance(p); BT.shell.updateNav(); }) }); },
        braden: () => bradenModal(r, () => { SECTIONS.piel(p, r); ui.enhance(p); }),
      });
    },

    caidas(p, r) {
      logRead(r.id, 'Caídas');
      const falls = u.sortBy(BT.db.falls.filter((f) => f.residentId === r.id), 'ts', true);
      const dw = last(r.downton); const dR = downtonRisk(dw.score);
      p.innerHTML = '<div class="grid g-side"><div class="col gap-16">' + ui.card({ title: 'Riesgo de caídas', icon: 'footprints', sub: 'Escala de Downton', body: '<div class="risk"><div class="rv ' + (dR.tone === 'danger' ? 't-danger' : 't-ok') + '">' + dw.score + '</div><div class="grow"><div class="strong">' + dR.label + '</div><div class="muted" style="font-size:var(--fs-xs)">≥ 3 = riesgo alto · ' + u.fmtDate(dw.fecha) + '</div></div></div>' +
        '<div class="kv-cards mt-12"><div class="kv-card"><div class="k">Caídas (90 días)</div><div class="v num">' + falls.filter((f) => Date.now() - f.ts < 90 * 864e5).length + '</div></div><div class="kv-card"><div class="k">Última caída</div><div class="v">' + (falls.length ? u.fmtDate(falls[0].ts) : '—') + '</div></div></div>' +
        (dR.tone === 'danger' ? '<div class="alert warn mt-12">' + ic('lightbulb') + '<div style="font-size:var(--fs-sm)">Medidas sugeridas: luz nocturna, sensor de cama, calzado cerrado y acompañamiento en traslados.</div></div>' : '') +
        ((BT.can('care.write') || BT.can('clinical.write')) ? '<button class="btn danger block mt-12" data-act="fall">' + ic('siren') + 'Registrar caída</button>' : '') }) + '</div>' +
        '<div>' + ui.card({ title: 'Registro de caídas', icon: 'siren', bodyCls: falls.length ? '' : '', body: falls.length ? '<div class="timeline">' + falls.map((f, i) => '<div class="tl-item"><span class="tl-dot ' + (/Sin lesi/.test(f.lesiones) ? 'warn' : 'danger') + '">' + ic('siren') + '</span><div class="tl-h"><span class="t">' + esc(f.lugar) + '</span><span class="w">' + u.fmtDateTime(f.ts) + ' · ' + u.rel(f.ts) + '</span>' + (i === 0 && Date.now() - f.ts < 864e5 ? ui.badge('Nuevo', 'danger') : '') + '</div><div class="tl-b">' + esc(f.circunstancia) + '</div>' +
          '<div class="kv mt-8" style="font-size:var(--fs-sm)"><dt>Lesiones</dt><dd>' + esc(f.lesiones) + '</dd><dt>Acciones</dt><dd>' + esc(f.acciones) + '</dd><dt>Testigo</dt><dd>' + esc(f.testigo) + '</dd><dt>Registró</dt><dd>' + esc(f.autor) + '</dd></div><div class="row gap-6 mt-8">' + ui.badge(f.avisoFamilia ? 'Familia avisada' : 'Familia sin avisar', f.avisoFamilia ? 'ok' : 'warn', { icon: 'phone' }) + ui.badge(f.avisoMedico ? 'Médico avisado' : 'Médico sin avisar', f.avisoMedico ? 'ok' : 'warn', { icon: 'stethoscope' }) + '</div></div>').join('') + '</div>' : ui.empty({ ill: 'leaf', title: 'Sin caídas registradas', text: 'Este residente no tiene caídas en su historia.' }) }) + '</div></div>';
      ui.on(p, { fall: () => (BT.actions.newIncident ? BT.actions.newIncident(r.id, 'Caída', () => { SECTIONS.caidas(p, r); ui.enhance(p); }) : BT.go('cuidados', { residentId: r.id })) });
    },

    indicaciones(p, r) {
      logRead(r.id, 'Indicaciones médicas');
      const ind = u.sortBy(BT.db.indicaciones.filter((x) => x.residentId === r.id), 'ts', true);
      const agudos = BT.db.meds.filter((m) => m.residentId === r.id && m.agudo);
      const restr = u.sortBy(BT.db.restrictions.filter((x) => x.residentId === r.id), 'ts', true);
      const isMed = BT.can('clinical.indicate'); const canRestr = BT.isRole('medico', 'direccion');
      p.innerHTML = (isMed || canRestr ? '<div class="row wrap mb-16">' + (isMed ? '<button class="btn primary" data-act="ind">' + ic('stethoscope') + 'Nueva indicación</button><button class="btn" data-act="agudo">' + ic('pill') + 'Cambio de medicación por cuadro agudo</button>' : '') + (canRestr ? '<button class="btn" data-act="restr">' + ic('lock') + 'Restricción de visitas o salidas</button>' : '') + '</div>' : '') +
        '<div class="grid g-2">' + ui.card({ title: 'Indicaciones médicas', icon: 'stethoscope', bodyCls: 'flush', body: ind.length ? '<div class="list">' + ind.map((x) => '<div class="li"><span class="li-ic info">' + ic('notebook-pen', 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(x.tipo) + '</div><div class="d">' + esc(x.texto) + '</div><div class="au-meta mt-8">' + esc(x.autor) + ' · ' + u.fmtDateTime(x.ts) + '</div></div></div>').join('') + '</div>' : ui.empty({ title: 'Sin indicaciones' }) }) +
        '<div class="col gap-16">' + ui.card({ title: 'Medicación por cuadros agudos', icon: 'pill', sub: 'Constancia obligatoria de motivo, dosis y duración', bodyCls: 'flush', body: agudos.length ? '<div class="list">' + agudos.map((m) => '<div class="li"><span class="li-ic warn">' + ic('pill', 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(m.droga) + ' ' + esc(m.dosis) + '</div><div class="d"><b>Motivo:</b> ' + esc(m.agudo.motivo) + '<br><b>Dosis:</b> ' + esc(m.agudo.dosis) + ' · <b>Duración:</b> ' + esc(m.agudo.duracion) + ' (' + u.fmtDate(m.desde) + ' → ' + u.fmtDate(m.hasta) + ')</div></div>' + ui.badge(m.hasta >= u.todayIso() ? 'Vigente' : 'Finalizado', m.hasta >= u.todayIso() ? 'warn' : 'outline') + '</div>').join('') + '</div>' : ui.empty({ ill: 'leaf', title: 'Sin cuadros agudos', text: 'No hay cambios de medicación por cuadros agudos.' }) }) +
        ui.card({ title: 'Restricciones de visitas o salidas', icon: 'lock', sub: 'Con constancia del motivo y quién la indicó', bodyCls: 'flush', body: restr.length ? '<div class="list">' + restr.map((x) => '<div class="li"><span class="li-ic danger">' + ic('lock', 'ic-sm') + '</span><div class="grow"><div class="t">Restricción de ' + esc(x.tipo.toLowerCase()) + '</div><div class="d">' + esc(x.motivo) + '</div><div class="au-meta mt-8">Indicó ' + esc(x.indicadoPor) + ' · ' + u.fmtDate(x.desde) + ' → ' + u.fmtDate(x.hasta) + '</div></div>' + ui.badge(x.hasta >= u.todayIso() ? 'Vigente' : 'Finalizada', x.hasta >= u.todayIso() ? 'danger' : 'outline') + '</div>').join('') + '</div>' : ui.empty({ ill: 'leaf', title: 'Sin restricciones' }) }) + '</div></div>';
      const reload = () => { SECTIONS.indicaciones(p, r); ui.enhance(p); };
      ui.on(p, {
        ind: () => formModal({ title: 'Nueva indicación médica', icon: 'stethoscope', r, fields: [{ label: 'Tipo', name: 'tipo', type: 'select', required: true, options: ['Dieta', 'Movilización', 'Controles', 'Interconsulta', 'Estudios', 'Otra'] }, { label: 'Indicación', name: 'texto', type: 'textarea', required: true, full: true }], onSave: (f) => { BT.db.indicaciones.push({ id: u.uid('in'), residentId: r.id, ts: Date.now(), autor: BT.state.user.nombre, tipo: f.tipo, texto: f.texto }); BT.audit('Indicó', 'Indicación médica: ' + f.tipo, { residentId: r.id }); ui.toast('Indicación registrada'); reload(); } }),
        agudo: () => formModal({ title: 'Cambio de medicación por cuadro agudo', sub: 'La normativa exige dejar constancia de motivo, dosis y duración', icon: 'pill', r, req: true, fields: [{ label: 'Medicamento', name: 'droga', required: true, placeholder: 'Ej.: Amoxicilina/Ác. clavulánico' }, { label: 'Vía', name: 'via', type: 'select', required: true, options: ['VO', 'IM', 'SC', 'IV', 'Inhalatoria', 'Tópica'] }, { label: 'Motivo (cuadro agudo)', name: 'motivo', type: 'textarea', required: true, full: true, placeholder: 'Diagnóstico o síntoma que motiva el cambio' }, { label: 'Dosis', name: 'dosis', required: true, placeholder: 'Ej.: 875/125 mg cada 12 h' }, { label: 'Duración (días)', name: 'dias', type: 'number', required: true, attrs: 'min="1" max="60"' }, { label: 'Horarios', name: 'horarios', type: 'chips', multi: true, required: true, value: ['08:00', '20:00'], options: ['06:00', '08:00', '12:00', '16:00', '20:00', '22:00'], full: true }],
          onSave: (f) => { const dias = Math.max(1, parseInt(f.dias, 10) || 1); const hasta = u.iso(u.addDays(u.today(), dias - 1)); const m = { id: u.uid('md'), residentId: r.id, droga: f.droga, dosis: f.dosis.split(' cada')[0], via: f.via, horarios: f.horarios.sort(), indicacion: f.dosis, desde: u.todayIso(), hasta, stock: f.horarios.length * dias, recetaVence: hasta, prescriptor: BT.state.user.nombre, activo: true, agudo: { motivo: f.motivo, dosis: f.dosis, duracion: dias + ' días' } }; BT.db.meds.push(m); BT.db.evoluciones.push({ id: u.uid('ev'), residentId: r.id, ts: Date.now(), autor: BT.state.user.nombre, rol: BT.role(), tipo: 'Médica', texto: 'Se indica ' + f.droga + ' ' + f.dosis + ' (' + f.via + ') por ' + dias + ' días. Motivo: ' + f.motivo, enmiendas: [] }); BT.audit('Modificó', 'Plan de medicación (cuadro agudo)', { residentId: r.id, detail: f.droga + ' · ' + f.dosis + ' · ' + dias + ' días' }); ui.toast('Medicación indicada', { sub: f.droga + ' · se agregó a la planilla del turno' }); reload(); } }),
        restr: () => formModal({ title: 'Restricción de visitas o salidas', sub: 'Constancia obligatoria del motivo y período', icon: 'lock', r, req: true, fields: [{ label: 'Tipo', name: 'tipo', type: 'chips', required: true, options: ['Visitas', 'Salidas'], full: true }, { label: 'Motivo', name: 'motivo', type: 'textarea', required: true, full: true }, { label: 'Desde', name: 'desde', type: 'date', required: true, value: u.todayIso() }, { label: 'Hasta', name: 'hasta', type: 'date', required: true, value: u.iso(u.addDays(u.today(), 30)) }, { label: 'Indicada por', name: 'por', required: true, value: BT.state.user.nombre, full: true }],
          onSave: (f) => { BT.db.restrictions.push({ id: u.uid('rs'), residentId: r.id, tipo: f.tipo, motivo: f.motivo, desde: f.desde, hasta: f.hasta, indicadoPor: f.por, ts: Date.now() }); BT.db.evoluciones.push({ id: u.uid('ev'), residentId: r.id, ts: Date.now(), autor: BT.state.user.nombre, rol: BT.role(), tipo: 'Médica', texto: 'Se establece restricción de ' + f.tipo.toLowerCase() + ' desde ' + u.fmtDate(f.desde) + ' hasta ' + u.fmtDate(f.hasta) + '. Motivo: ' + f.motivo, enmiendas: [] }); BT.audit('Restringió', 'Restricción de ' + f.tipo.toLowerCase(), { residentId: r.id, detail: f.motivo }); ui.toast('Restricción registrada', { sub: 'Se notificó al equipo y queda en la historia clínica', icon: 'lock' }); reload(); BT.shell.updateNav(); } }),
      });
    },

    auditoria(p, r) {
      if (!BT.can('audit.read')) {
        p.innerHTML = '<div class="card">' + ui.empty({ ill: 'search', title: 'Acceso restringido', text: 'La auditoría de accesos solo la consultan la Dirección y la Dirección Técnica médica.' }) + '</div>'; return;
      }
      const all = u.sortBy(BT.db.audit.filter((a) => a.residentId === r.id), 'ts', true);
      const st = (BT.state.sub.auF = BT.state.sub.auF || 'all');
      const groups = { all: () => true, open: (a) => /Abrió|Leyó/.test(a.action), mod: (a) => /Creó|Modificó|Enmendó|Indicó|Restringió|Registró|Adjuntó/.test(a.action), med: (a) => a.action === 'Administró', exp: (a) => a.action === 'Exportó', deny: (a) => a.action === 'Acceso denegado' };
      const users = new Set(all.map((a) => a.userId));
      p.innerHTML = '<div class="lock-banner">' + ic('lock', 'ic-lg') + '<div class="grow"><div class="strong" style="color:#fff">Registro inalterable de accesos</div><div style="font-size:var(--fs-sm);opacity:.75">Cada apertura, lectura y modificación queda con usuario, fecha, hora y dispositivo. Nadie puede editar ni borrar estos registros (Ley 18.331).</div></div></div>' +
        '<div class="grid g-4 keep stagger mb-16">' + ui.kpi({ label: 'Eventos registrados', value: all.length, icon: 'history' }) + ui.kpi({ label: 'Personas con acceso', value: users.size, icon: 'users', tone: 'info' }) + ui.kpi({ label: 'Modificaciones', value: all.filter(groups.mod).length, icon: 'pen-line', tone: 'warn' }) + ui.kpi({ label: 'Accesos denegados', value: all.filter(groups.deny).length, icon: 'shield-alert', tone: all.filter(groups.deny).length ? 'danger' : 'ok' }) + '</div>' +
        '<div class="row between wrap mb-16">' + ui.seg('auF', [{ id: 'all', label: 'Todo' }, { id: 'open', label: 'Aperturas y lecturas' }, { id: 'mod', label: 'Modificaciones' }, { id: 'med', label: 'Medicación' }, { id: 'exp', label: 'Exportaciones' }, { id: 'deny', label: 'Denegados' }], st, 'sm') + '<button class="btn sm" data-act="exp">' + ic('file-text') + 'Informe de auditoría</button></div>' +
        '<div class="card"><div class="card-b" id="auBox"></div></div>';
      const draw = () => {
        const list = all.filter(groups[BT.state.sub.auF]).slice(0, 80);
        const byDay = u.groupBy(list, (a) => u.iso(a.ts));
        p.querySelector('#auBox').innerHTML = list.length ? Object.keys(byDay).sort().reverse().map((d) => '<div class="au-day">' + (d === u.todayIso() ? 'Hoy' : d === u.iso(u.addDays(u.today(), -1)) ? 'Ayer' : u.cap(u.fmtDateLong(d))) + '</div><div class="timeline">' + byDay[d].map((a) => { const [icn, tone] = ACT_STYLE[a.action] || ['circle-dot', '']; return '<div class="tl-item"><span class="tl-dot ' + tone + '">' + ic(icn) + '</span><div class="tl-h"><span class="t">' + esc(a.userName) + '</span><span class="badge outline" style="height:19px;font-size:10.5px">' + esc((BT.ROLES[a.role] || { label: a.role }).label) + '</span><span class="w">' + u.fmtTime(a.ts) + ' · ' + u.rel(a.ts) + '</span></div><div class="tl-b"><b>' + esc(a.action) + '</b> ' + esc(a.target) + (a.detail ? ' <span class="muted">— ' + esc(a.detail) + '</span>' : '') + '</div><div class="au-meta">' + esc(a.device || '') + ' · IP ' + esc(a.ip || '—') + ' · ID ' + esc(a.id.slice(-8)) + '</div></div>'; }).join('') + '</div>').join('') : ui.empty({ ill: 'search', title: 'Sin eventos', text: 'No hay registros con este filtro.' });
      };
      draw();
      p.addEventListener('segchange', (e) => { if (e.detail.name === 'auF') { BT.state.sub.auF = e.detail.value; draw(); } });
      ui.on(p, { exp: () => exportAudit(r) });
    },
  };

  /* ======================= Componentes ======================= */
  function vitNow(v) {
    const cell = (k, val, unit, bad) => '<div class="kv-card"' + (bad ? ' style="border-color:var(--danger-line);background:var(--danger-bg)"' : '') + '><div class="k">' + k + '</div><div class="v ' + (bad ? 't-danger' : '') + '">' + val + ' <small>' + unit + '</small></div></div>';
    return '<div class="vit-now">' + cell('Presión arterial', v.pas + '/' + v.pad, 'mmHg', v.pas >= 150) + cell('Frec. cardíaca', v.fc, 'lpm', v.fc > 100) + cell('Temperatura', u.fmtNum(v.temp, 1), '°C', v.temp >= 37.8) + cell('Saturación', v.sat, '%', v.sat < 92) + (v.hgt != null ? cell('HGT', v.hgt, 'mg/dl', v.hgt > 250 || v.hgt < 70) : cell('HGT', '—', '', false)) + '</div>';
  }
  function evoCard(e, compact, canAmend, isNew) {
    return '<div class="evo ' + (isNew ? 'new' : '') + '"><div class="eh">' + ui.avatar(e.autor, { size: 'sm' }) + '<div class="grow"><span class="strong" style="font-size:var(--fs-md)">' + esc(e.autor) + '</span> ' + ui.badge(e.tipo, TIPO_TONE[e.tipo] || '') + '<div class="muted" style="font-size:var(--fs-xs)">' + u.fmtDateTime(e.ts) + ' · ' + u.rel(e.ts) + '</div></div>' +
      (!compact && canAmend ? '<button class="btn ghost xs" data-act="amend" data-id="' + e.id + '" data-tip="La anotación original no se modifica">' + ic('pen-line') + 'Enmendar</button>' : '') + '</div>' +
      '<div class="eb ' + (e.enmiendas.length ? '' : '') + '">' + esc(e.texto) + '</div>' +
      e.enmiendas.map((a) => '<div class="amend"><div class="row gap-6" style="font-size:var(--fs-xs);color:var(--warn);font-weight:650">' + ic('pen-line', 'ic-xs') + 'Enmienda · ' + esc(a.motivo) + ' · ' + esc(a.autor) + ' · ' + u.fmtDateTime(a.ts) + '</div><div style="font-size:var(--fs-md);margin-top:3px">' + esc(a.texto) + '</div></div>').join('') + '</div>';
  }
  function amendModal(e, r, done) {
    ui.modal({
      title: 'Enmendar evolución', sub: 'La anotación original del ' + u.fmtDateTime(e.ts) + ' queda visible sin cambios', icon: 'pen-line', size: 'lg',
      body: '<div class="evo" style="background:var(--surface-2)"><div class="muted" style="font-size:var(--fs-xs)">Original · ' + esc(e.autor) + '</div><div class="eb">' + esc(e.texto) + '</div></div><div class="form-grid mt-16">' + ui.field({ label: 'Motivo de la enmienda', name: 'motivo', type: 'select', required: true, options: ['Corrección de dato', 'Información omitida', 'Error de residente', 'Aclaración'], placeholder: 'Elegí un motivo' }) + '<div></div>' + ui.field({ label: 'Texto de la enmienda', name: 'texto', type: 'textarea', required: true, full: true }) + '</div>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-ok>' + ic('check') + 'Agregar enmienda</button>',
      onMount: (m, close) => m.querySelector('[data-ok]').addEventListener('click', () => { if (!ui.validate(m)) return; const f = ui.formData(m); e.enmiendas.push({ ts: Date.now(), autor: BT.state.user.nombre, motivo: f.motivo, texto: f.texto }); BT.save(); BT.audit('Enmendó', 'Evolución del ' + u.fmtDate(e.ts), { residentId: r.id, detail: f.motivo }); close(); ui.toast('Enmienda agregada', { sub: 'La anotación original se conserva' }); done(); }),
    });
  }
  function formModal({ title, sub, icon, r, fields, onSave, req }) {
    ui.modal({
      title, sub: sub || BT.fullName(r), icon, size: 'lg',
      body: (req ? '<div class="req-box mb-16"><div class="t">' + ic('scale', 'ic-sm') + 'Campos obligatorios por normativa</div><div style="font-size:var(--fs-sm);color:#7d4c07;margin-top:2px">Sin completarlos no se puede guardar. Queda registrado en la historia clínica de ' + esc(BT.fullName(r)) + ' y en la auditoría.</div></div>' : '') + '<div class="form-grid">' + fields.map(ui.field).join('') + '</div>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-ok>' + ic('check') + 'Guardar</button>',
      onMount: (m, close) => m.querySelector('[data-ok]').addEventListener('click', () => { if (!ui.validate(m)) return; const f = ui.formData(m); onSave(f); BT.save(); close(); }),
    });
  }
  function vitalsModal(r, done) {
    formModal({ title: 'Registrar control de signos vitales', icon: 'activity', r, fields: [{ label: 'PA sistólica (mmHg)', name: 'pas', type: 'number', required: true }, { label: 'PA diastólica (mmHg)', name: 'pad', type: 'number', required: true }, { label: 'Frecuencia cardíaca (lpm)', name: 'fc', type: 'number', required: true }, { label: 'Temperatura (°C)', name: 'temp', type: 'number', required: true, attrs: 'step="0.1"' }, { label: 'Saturación O₂ (%)', name: 'sat', type: 'number', required: true }, { label: 'HGT (mg/dl)', name: 'hgt', type: 'number', hint: 'Solo si corresponde' }],
      onSave: (f) => { BT.db.vitals.push({ id: u.uid('vs'), residentId: r.id, ts: Date.now(), pas: +f.pas, pad: +f.pad, fc: +f.fc, temp: +f.temp, sat: +f.sat, hgt: f.hgt ? +f.hgt : null, autor: BT.state.user.nombre }); BT.audit('Creó', 'Control de signos vitales', { residentId: r.id }); ui.toast('Control registrado', { sub: 'PA ' + f.pas + '/' + f.pad + ' · Sat ' + f.sat + ' %' }); done(); } });
  }
  function bradenModal(r, done) {
    ui.modal({
      title: 'Evaluación de Braden', sub: BT.fullName(r), icon: 'gauge', size: 'lg',
      body: '<div class="b-total" style="display:flex;align-items:center;gap:16px;padding:12px 16px;border-radius:14px;background:var(--brand-50);border:1px solid var(--brand-100);margin-bottom:8px"><div id="bt" style="font-size:30px;font-weight:800;min-width:50px;font-variant-numeric:tabular-nums">—</div><div id="bg" class="strong">Completá las 6 subescalas</div></div>' + BRADEN.map(([n, opts], i) => '<div class="barthel-item"><div class="strong" style="font-size:var(--fs-md)">' + n + '</div>' + ui.field({ label: '', name: 'b' + i, type: 'chips', options: opts.map(([v, l]) => ({ v: String(v), l: l + ' · ' + v })) }).replace('<label', '<label class="sr-only"') + '</div>').join(''),
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-ok disabled>' + ic('check') + 'Guardar</button>',
      onMount: (m, close) => {
        let tot = 0;
        m.addEventListener('chipchange', () => { const f = ui.formData(m); const vals = BRADEN.map((_, i) => f['b' + i]).filter((x) => x !== ''); tot = u.sum(vals.map(Number)); m.querySelector('#bt').textContent = vals.length ? tot : '—'; m.querySelector('#bg').innerHTML = vals.length === 6 ? ui.badge(bradenRisk(tot).label, bradenRisk(tot).tone, { lg: true }) : 'Completá las 6 subescalas (' + vals.length + '/6)'; m.querySelector('[data-ok]').disabled = vals.length < 6; });
        m.querySelector('[data-ok]').addEventListener('click', () => { r.braden.push({ fecha: u.todayIso(), score: tot }); BT.save(); BT.audit('Modificó', 'Escala de Braden', { residentId: r.id, detail: String(tot) }); close(); ui.toast('Braden registrado', { sub: tot + ' · ' + bradenRisk(tot).label }); done(); });
      },
    });
  }

  /* ======================= Exportables ======================= */
  function exportHC(r) {
    const D = BT.doc; const g = BT.depGrade(BT.lastBarthel(r));
    const vs = u.sortBy(BT.db.vitals.filter((x) => x.residentId === r.id), 'ts');
    const ws = BT.db.weights.filter((x) => x.residentId === r.id).sort((a, b) => a.mes.localeCompare(b.mes));
    const meds = BT.db.meds.filter((m) => m.residentId === r.id && m.activo && (!m.hasta || m.hasta >= u.todayIso()));
    const evs = u.sortBy(BT.db.evoluciones.filter((e) => e.residentId === r.id), 'ts', true);
    const falls = u.sortBy(BT.db.falls.filter((f) => f.residentId === r.id), 'ts', true);
    const wounds = BT.db.wounds.filter((w) => w.residentId === r.id);
    const restr = BT.db.restrictions.filter((x) => x.residentId === r.id);
    let body = D.kpis([{ label: 'Edad', value: u.age(r.nacimiento) + ' años', sub: 'CI ' + u.fmtCI(r.ci) }, { label: 'Barthel', value: BT.lastBarthel(r) + '/100', sub: g.label }, { label: 'Braden', value: last(r.braden).score, sub: bradenRisk(last(r.braden).score).label }, { label: 'Downton', value: last(r.downton).score, sub: downtonRisk(last(r.downton).score).label }]);
    body += D.section('Datos del residente', D.kv([['Residente', '<b>' + esc(BT.fullName(r)) + '</b>'], ['Habitación', r.habitacion + r.cama + ' · ' + r.sede], ['Mutualista', esc(r.mutualista)], ['Emergencia móvil', esc(r.emergencia)], ['Alergias', r.alergias.length ? r.alergias.map((a) => D.badge(a, 'danger')).join(' ') : 'Sin alergias conocidas'], ['Dieta', esc(r.dieta)], ['Diagnósticos', r.diagnosticos.map(esc).join(' · ')], ['Referente', esc(r.referente.nombre) + ' · ' + esc(r.referente.tel)]], 2));
    body += D.section('Medicación activa', D.table([{ label: 'Medicamento', render: (m) => '<b>' + esc(m.droga) + '</b>' + (m.agudo ? ' ' + D.badge('Cuadro agudo', 'warn') : '') }, { label: 'Dosis', key: 'dosis' }, { label: 'Vía', key: 'via' }, { label: 'Horarios', render: (m) => m.horarios.join(' · ') }, { label: 'Indicación', render: (m) => esc(m.agudo ? 'Motivo: ' + m.agudo.motivo + ' · ' + m.agudo.duracion : m.indicacion || '—') }], meds, { compact: true }));
    body += D.section('Signos vitales (12 semanas)', D.chart({ type: 'line', data: { labels: vs.map((x) => u.fmtDateShort(x.ts)), datasets: [{ label: 'PA sistólica', data: vs.map((x) => x.pas), borderColor: '#297040', pointRadius: 2 }, { label: 'PA diastólica', data: vs.map((x) => x.pad), borderColor: '#8fc49f', pointRadius: 2 }, { label: 'FC', data: vs.map((x) => x.fc), borderColor: '#6b5ba8', pointRadius: 2 }] }, options: { scales: { y: { suggestedMin: 50, suggestedMax: 160 } } } }, { w: 680, h: 200 }) +
      D.twoCol(D.chart({ type: 'bar', data: { labels: ws.map((x) => u.cap(u.fmtMonthShort(x.mes))), datasets: [{ label: 'Peso (kg)', data: ws.map((x) => x.kg), backgroundColor: '#8fc49f' }] }, options: { scales: { y: { suggestedMin: Math.floor(Math.min(...ws.map((x) => x.kg)) - 4) } } } }, { w: 330, h: 170, caption: 'Peso mensual' }), D.chart({ type: 'line', data: { labels: r.barthel.map((x) => u.fmtDate(x.fecha).slice(3)), datasets: [{ label: 'Barthel', data: r.barthel.map((x) => x.score), borderColor: '#297040', backgroundColor: 'rgba(41,112,64,.12)', fill: true, pointRadius: 3 }] }, options: { scales: { y: { min: 0, max: 100 } } } }, { w: 330, h: 170, caption: 'Índice de Barthel' })));
    body += D.section('Evoluciones', '<div class="tl">' + evs.slice(0, 14).map((e) => '<div class="it"><b>' + u.fmtDateTime(e.ts) + '</b> · ' + esc(e.autor) + ' ' + D.badge(e.tipo, e.tipo === 'Médica' ? 'info' : 'ok') + '<div>' + esc(e.texto) + '</div>' + e.enmiendas.map((a) => '<div class="amend"><b>Enmienda</b> (' + esc(a.motivo) + ') · ' + esc(a.autor) + ' · ' + u.fmtDateTime(a.ts) + '<br>' + esc(a.texto) + '</div>').join('') + '</div>').join('') + '</div>');
    if (wounds.length) body += D.section('Úlceras por presión y curaciones', D.table([{ label: 'Zona', render: (w) => '<b>' + esc(w.zona) + '</b>' }, { label: 'Estadio', key: 'estadio' }, { label: 'Desde', render: (w) => u.fmtDate(w.inicio) }, { label: 'Estado', render: (w) => D.badge(w.estado, w.estado === 'Activa' ? 'danger' : 'ok') }, { label: 'Última curación', render: (w) => esc(last(w.curaciones).nota) + '<br><span class="muted small">' + u.fmtDateTime(last(w.curaciones).ts) + ' · ' + esc(last(w.curaciones).autor) + '</span>' }], wounds, { compact: true }));
    body += D.section('Caídas', D.table([{ label: 'Fecha', render: (f) => u.fmtDateTime(f.ts) }, { label: 'Lugar', key: 'lugar' }, { label: 'Circunstancia', key: 'circunstancia' }, { label: 'Lesiones', key: 'lesiones' }, { label: 'Registró', key: 'autor' }], falls, { compact: true, empty: 'Sin caídas registradas.' }));
    if (restr.length) body += D.section('Restricciones de visitas o salidas', D.table([{ label: 'Tipo', key: 'tipo' }, { label: 'Motivo', key: 'motivo' }, { label: 'Período', render: (x) => u.fmtDate(x.desde) + ' → ' + u.fmtDate(x.hasta) }, { label: 'Indicó', key: 'indicadoPor' }], restr, { compact: true }));
    body += D.note('Documento confidencial con datos de salud (Ley 18.331). Su emisión quedó registrada en la auditoría de accesos.', 'warn') + D.signatures(['Médico Director Técnico', 'Jefa de Enfermería']);
    D.open({ title: 'Historia clínica', subtitle: esc(BT.fullName(r)) + ' · Hab. ' + r.habitacion + r.cama, sede: r.sede, kicker: 'Confidencial', body, residentId: r.id, filename: 'Historia clínica - ' + BT.fullName(r) });
  }
  function exportAudit(r) {
    const D = BT.doc; const all = u.sortBy(BT.db.audit.filter((a) => a.residentId === r.id), 'ts', true);
    const byUser = u.groupBy(all, 'userName');
    let body = D.kpis([{ label: 'Eventos', value: all.length, sub: all.length ? u.fmtDate(last(all).ts) + ' → ' + u.fmtDate(all[0].ts) : '' }, { label: 'Usuarios', value: Object.keys(byUser).length }, { label: 'Modificaciones', value: all.filter((a) => /Creó|Modificó|Enmendó|Indicó|Restringió|Registró/.test(a.action)).length }, { label: 'Denegados', value: all.filter((a) => a.action === 'Acceso denegado').length }]);
    body += D.section('Accesos por usuario', D.table([{ label: 'Usuario', render: (x) => '<b>' + esc(x.n) + '</b>' }, { label: 'Rol', render: (x) => esc((BT.ROLES[x.role] || { label: x.role }).label) }, { label: 'Eventos', align: 'num', key: 'c' }, { label: 'Último acceso', render: (x) => u.fmtDateTime(x.lastTs) }], Object.entries(byUser).map(([n, arr]) => ({ n, role: arr[0].role, c: arr.length, lastTs: arr[0].ts })).sort((a, b) => b.c - a.c), { compact: true }));
    body += D.section('Detalle cronológico', D.table([{ label: 'Fecha y hora', render: (a) => '<span class="num">' + u.fmtDateTime(a.ts) + '</span>', width: '108px' }, { label: 'Usuario', render: (a) => esc(a.userName) + '<br><span class="muted small">' + esc((BT.ROLES[a.role] || { label: a.role }).label) + '</span>' }, { label: 'Acción', render: (a) => D.badge(a.action, a.action === 'Acceso denegado' ? 'danger' : /Modificó|Enmendó|Creó|Registró/.test(a.action) ? 'warn' : '') }, { label: 'Sección', render: (a) => esc(a.target) + (a.detail ? '<br><span class="muted small">' + esc(a.detail) + '</span>' : '') }, { label: 'Dispositivo', render: (a) => '<span class="small">' + esc(a.device || '') + '<br>IP ' + esc(a.ip || '') + '</span>' }], all.slice(0, 120), { compact: true }));
    body += D.note('Registro inalterable: los eventos de auditoría no pueden editarse ni eliminarse. Cada exportación de este informe también queda registrada.');
    D.open({ title: 'Informe de auditoría de accesos', subtitle: 'Historia clínica de ' + esc(BT.fullName(r)), sede: r.sede, kicker: 'Ley 18.331 · Trazabilidad', body, residentId: r.id, filename: 'Auditoría - ' + BT.fullName(r) });
  }
})();

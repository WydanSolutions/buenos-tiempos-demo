/* ==========================================================================
   Admisiones y ocupación
   Plano de camas · Lista de espera (pipeline) · Checklist de ingreso · Egresos
   ========================================================================== */
(function () {
  'use strict';
  const BT = window.BT; const u = BT.u; const ui = BT.ui; const ic = BT.ic; const esc = u.esc;

  const ESTADOS = [
    { id: 'Nuevo', icon: 'sparkles', tone: 'info' },
    { id: 'Visita agendada', icon: 'calendar-clock', tone: 'violet' },
    { id: 'Evaluación', icon: 'stethoscope', tone: 'warn' },
    { id: 'En espera de cama', icon: 'hourglass', tone: '' },
    { id: 'Listo para ingresar', icon: 'badge-check', tone: 'ok' },
  ];
  const CLOSED = ['Descartado', 'Ingresado'];
  const DOCS = ['Cédula de identidad', 'Consentimiento informado', 'Contrato de servicios', 'Ficha de usuario (Ord. 483/017)', 'Carné de vacunas', 'Certificado médico de ingreso'];
  const MOTIVOS = [{ v: 'Alta', l: 'Alta', icon: 'house' }, { v: 'Traslado', l: 'Traslado', icon: 'truck' }, { v: 'Fallecimiento', l: 'Fallecimiento', icon: 'flower-2' }];
  const MOT_TONE = { Alta: 'ok', Traslado: 'info', Fallecimiento: 'outline' };

  BT.addCSS('adm', `
    .bed.occ { position: relative; padding-left: 10px; }
    .bed.occ::before { content: ""; position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0; background: var(--brand-400); }
    .bed.occ.adm-danger { background: #fdf3f2; border-color: #f2d3cf; color: #6e2620; }
    .bed.occ.adm-danger::before { background: var(--danger); }
    .bed.occ.adm-warn { background: #fdf7ea; border-color: #f2e0b8; color: #6b4708; }
    .bed.occ.adm-warn::before { background: #d99a2b; }
    .bed.occ.adm-info { background: #f0f5fc; border-color: #d3e1f3; color: #1f4673; }
    .bed.occ.adm-info::before { background: var(--info); }
    .bed.occ.adm-ok { background: var(--brand-50); }
    .bed .adm-bn { font-weight: 600; font-size: 11px; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .bed .adm-bb { font-size: 10px; opacity: .75; font-variant-numeric: tabular-nums; }
    .bed.free { cursor: pointer; transition: all var(--d) var(--ease); }
    .bed.free:hover { border-color: var(--brand-400); color: var(--brand-700); background: var(--brand-50); transform: translateY(-2px); }
    .adm-sede .card-h { flex-wrap: wrap; }
    .adm-sede .card-h h3 { white-space: nowrap; }
    .room { transition: box-shadow var(--d) var(--ease); }
    .room:hover { box-shadow: var(--sh-2); }
    .room .rh .cnt { font-weight: 600; color: var(--ink-400); font-variant-numeric: tabular-nums; }
    .kb { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(248px, 1fr); gap: 12px; overflow-x: auto; padding-bottom: 6px; }
    .kb-col { background: var(--ink-50); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 10px; min-height: 340px; display: flex; flex-direction: column; gap: 8px; }
    .kb-col.over { background: var(--brand-50); border-color: var(--brand-300); box-shadow: inset 0 0 0 2px var(--brand-100); }
    .kb-h { display: flex; align-items: center; gap: 8px; padding: 4px 4px 6px; font-weight: 650; font-size: var(--fs-md); color: var(--ink-900); }
    .kb-h .n { margin-left: auto; font-size: 11px; font-weight: 700; background: #fff; border: 1px solid var(--line); border-radius: 99px; padding: 1px 8px; color: var(--ink-600); font-variant-numeric: tabular-nums; }
    .kb-card { background: #fff; border: 1px solid var(--line); border-radius: var(--r-md); padding: 12px; box-shadow: var(--sh-1); cursor: grab; transition: box-shadow var(--d) var(--ease), transform var(--d) var(--ease); animation: riseIn var(--d-slow) var(--ease-out) both; }
    .kb-card:hover { box-shadow: var(--sh-3); transform: translateY(-2px); }
    .kb-card:active { cursor: grabbing; }
    .kb-card .nm { font-weight: 650; color: var(--ink-950); font-size: var(--fs-md); }
    .kb-card .mt { font-size: var(--fs-xs); color: var(--ink-500); margin-top: 2px; }
    .kb-card .ft { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 11px; color: var(--ink-400); }
    .kb-empty { border: 1.5px dashed var(--line-strong); border-radius: var(--r-md); padding: 18px 10px; text-align: center; font-size: var(--fs-xs); color: var(--ink-400); }
    .adm-ck { display: flex; gap: 11px; align-items: center; width: 100%; text-align: left; padding: 9px 11px; border-radius: 10px; border: 1px solid var(--line); background: #fff; font-size: var(--fs-md); color: var(--ink-800); transition: all var(--d) var(--ease); }
    .adm-ck:hover { border-color: var(--brand-300); background: var(--brand-50); }
    .adm-ck .box { width: 22px; height: 22px; border-radius: 7px; flex: none; border: 2px solid var(--ink-300); display: grid; place-items: center; color: #fff; transition: all var(--d) var(--ease); }
    .adm-ck .box svg { width: 14px; height: 14px; }
    .adm-ck .box svg path { stroke-dasharray: 24; stroke-dashoffset: 24; }
    .adm-ck.on { border-color: var(--brand-200); background: var(--brand-50); color: var(--ink-600); }
    .adm-ck.on .box { background: var(--brand-600); border-color: var(--brand-600); animation: pop 380ms var(--ease-spring); }
    .adm-ck.on .box svg path { animation: draw 320ms 60ms var(--ease-out) forwards; }
    .adm-ck.on.static .box { animation: none; }
    .adm-ck.on.static .box svg path { animation: none; stroke-dashoffset: 0; }
    .adm-ck .nn { font-size: 11px; font-weight: 700; color: var(--ink-400); width: 18px; font-variant-numeric: tabular-nums; }
    .adm-legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: var(--fs-xs); color: var(--ink-600); }
    .adm-legend span { display: inline-flex; align-items: center; gap: 6px; }
    .adm-legend i { width: 12px; height: 12px; border-radius: 4px; border: 1px solid var(--line); }
  `);

  const sedes = () => (BT.state.sede === 'ALL' ? ['BT1', 'BT2'] : [BT.state.sede]);
  const waitActive = () => BT.db.waitlist.filter((w) => !CLOSED.includes(w.estado) && (BT.state.sede === 'ALL' || w.sedePref === BT.state.sede || w.sedePref === 'Indistinta'));
  const estadoTone = (e) => (ESTADOS.find((x) => x.id === e) || { tone: e === 'Ingresado' ? 'brand' : 'outline' }).tone;
  const depTone = (d) => ({ Leve: 'info', Moderada: 'warn', Severa: 'danger', Total: 'danger', Independiente: 'ok' }[d] || '');
  const reservaDe = (sede, bed) => BT.db.waitlist.find((w) => w.reserva === sede + '-' + bed) || BT.db.waitlist.find((w) => w.estado === 'Listo para ingresar' && w.sedePref === sede && !w.reserva);

  /** Camas libres de una sede (incluye reservadas marcadas) */
  BT.admFreeBeds = function (sede) {
    const s = BT.db.sedes.find((x) => x.id === sede); const out = [];
    s.habitaciones.forEach((h) => h.camas.forEach((c) => {
      const occ = BT.db.residents.some((r) => r.estado === 'activo' && r.sede === sede && r.habitacion === h.nro && r.cama === c);
      if (!occ) out.push({ sede, bed: h.nro + c, reservada: s.reservadas.includes(h.nro + c) });
    }));
    return out;
  };

  /** Ocupación mensual (6 meses) a partir de fechas de ingreso/egreso */
  function occSeries(sede) {
    const s = BT.db.sedes.find((x) => x.id === sede);
    return BT.finMonths().map((mes) => {
      const ini = mes + '-01'; const fin = u.iso(new Date(u.toDate(ini).getFullYear(), u.toDate(ini).getMonth() + 1, 0));
      const n = BT.db.residents.filter((r) => r.sede === sede && r.ingreso <= fin && (!r.egreso || r.egreso.fecha >= ini)).length;
      return { mes, n, pct: (n / s.camas) * 100 };
    });
  }

  /* ---------------- Render principal ---------------- */
  function render(el) {
    const S = sedes();
    const occ = S.map(BT.occupancy);
    const camas = u.sum(occ, 'camas'), ocup = u.sum(occ, 'ocupadas'), libres = u.sum(occ, 'libres'), resv = u.sum(occ, 'reservadas');
    const wl = waitActive();
    const egr6 = BT.db.residents.filter((r) => r.estado === 'egresado' && BT.inSede(r) && u.daysUntil(r.egreso.fecha) >= -183).length;
    el.innerHTML = ui.pageHeader({
      eyebrow: 'Admisiones y ocupación', icon: 'bed-double', title: 'Camas, ingresos y egresos',
      sub: BT.sedeName() + ' · ' + ocup + ' residentes en ' + camas + ' camas habilitadas',
      actions: '<button class="btn" data-act="new-wait">' + ic('user-plus') + 'Nuevo interesado</button><button class="btn" data-act="egreso">' + ic('user-minus') + 'Registrar egreso</button><button class="btn primary" data-act="ingreso-any">' + ic('log-in') + 'Iniciar ingreso</button>',
    }) +
      '<div class="grid g-5 stagger mb-16">' +
      ui.kpi({ label: 'Ocupación', value: camas ? (ocup / camas) * 100 : 0, decimals: 1, suffix: '%', icon: 'gauge', foot: ocup + ' de ' + camas + ' camas' }) +
      ui.kpi({ label: 'Camas libres', value: libres, icon: 'bed', tone: libres ? 'info' : 'ink', foot: libres ? 'Disponibles para ingreso' : 'Sin disponibilidad' }) +
      ui.kpi({ label: 'Reservadas', value: resv, icon: 'lock', tone: 'warn', foot: resv ? 'Con ingreso programado' : 'Sin reservas' }) +
      ui.kpi({ label: 'Lista de espera', value: wl.length, icon: 'list-checks', tone: 'ink', foot: wl.filter((w) => w.estado === 'Listo para ingresar').length + ' listos para ingresar' }) +
      ui.kpi({ label: 'Egresos (6 meses)', value: egr6, icon: 'log-out', tone: 'ink', foot: 'Altas, traslados y fallecimientos' }) +
      '</div><div id="admTabs"></div>';
    ui.on(el, {
      'new-wait': () => newWait(),
      'egreso': () => egresoFlow(),
      'ingreso-any': () => pickCandidate(),
    });
    ui.subtabs(el.querySelector('#admTabs'), 'adm', [
      { id: 'plano', label: 'Plano de camas', icon: 'layout-grid' },
      { id: 'espera', label: 'Lista de espera', icon: 'list-checks', count: wl.length },
      { id: 'egresos', label: 'Egresos', icon: 'log-out' },
    ], (p, id) => (id === 'plano' ? renderPlano(p) : id === 'espera' ? renderEspera(p) : renderEgresos(p)));
  }

  /* ---------------- Plano de camas ---------------- */
  function bedCell(sede, h, c) {
    const r = BT.db.residents.find((x) => x.estado === 'activo' && x.sede === sede.id && x.habitacion === h.nro && x.cama === c);
    const code = h.nro + c;
    if (r) {
      const b = BT.lastBarthel(r); const g = BT.depGrade(b);
      return '<div class="bed occ adm-' + g.tone + '" data-act="open-res" data-id="' + r.id + '" tabindex="0" data-tip="' + esc(BT.fullName(r)) + ' · Barthel ' + b + ' (' + g.label + ')"><span class="row between"><b>' + code + '</b><span class="adm-bb">B ' + b + '</span></span><span class="adm-bn">' + esc(BT.shortName(r)) + '</span></div>';
    }
    if (sede.reservadas.includes(code)) {
      const w = reservaDe(sede.id, code);
      return '<div class="bed res" ' + (w ? 'data-act="open-wait" data-id="' + w.id + '"' : '') + ' style="cursor:pointer" data-tip="' + (w ? 'Reservada para ' + esc(w.nombre) : 'Cama reservada') + '"><span class="row between"><b>' + code + '</b>' + ic('lock', 'ic-xs') + '</span><span class="adm-bn">' + (w ? esc(w.nombre.split(' ')[0] + ' ' + w.nombre.split(' ').slice(-1)[0]) : 'Reservada') + '</span></div>';
    }
    return '<div class="bed free" data-act="free-bed" data-sede="' + sede.id + '" data-bed="' + code + '" tabindex="0" data-tip="Cama libre · asignar ingreso"><span>' + ic('plus', 'ic-sm') + '<b>' + code + '</b><br>Libre</span></div>';
  }
  function renderPlano(p) {
    p.innerHTML = '<div class="row between wrap mb-16"><div class="adm-legend"><span><i style="background:var(--brand-50);border-color:var(--brand-200)"></i>Leve / independiente</span><span><i style="background:#fdf7ea;border-color:#f2e0b8"></i>Moderada</span><span><i style="background:#fdf3f2;border-color:#f2d3cf"></i>Severa / total (Barthel ≤ 35)</span><span><i style="background:var(--warn-bg);border-color:var(--warn-line)"></i>Reservada</span><span><i style="border-style:dashed"></i>Libre</span></div><span class="muted" style="font-size:var(--fs-xs)">' + ic('mouse-pointer-click', 'ic-xs') + ' Tocá una cama ocupada para ver la ficha</span></div>' +
      '<div class="grid ' + (sedes().length > 1 ? 'g-2' : '') + ' stagger">' + sedes().map((sid) => {
        const s = BT.db.sedes.find((x) => x.id === sid); const o = BT.occupancy(sid);
        return '<section class="card adm-sede"><div class="card-h"><div><h3>' + ic('building-2') + esc(s.nombre) + ' ' + BT.sedeTag(sid) + '</h3><div class="sub">' + esc(s.direccion) + ' · ' + esc(s.barrio) + '</div></div><div class="row gap-6">' + ui.badge(o.ocupadas + '/' + o.camas, 'brand') + (o.libres ? ui.badge(o.libres + ' libre' + (o.libres > 1 ? 's' : ''), 'ok', { dot: true }) : '') + (o.reservadas ? ui.badge(o.reservadas + ' reservada' + (o.reservadas > 1 ? 's' : ''), 'warn', { dot: true }) : '') + '</div></div>' +
          '<div class="card-b"><div class="row gap-16 mb-16"><div class="grow">' + ui.bar(o.pct, o.pct >= 85 ? '' : o.pct >= 70 ? 'info' : 'warn') + '</div><span class="strong num">' + u.fmtPct(o.pct, 1) + '</span></div><div class="floor">' +
          s.habitaciones.map((h) => { const n = h.camas.filter((c) => BT.db.residents.some((r) => r.estado === 'activo' && r.sede === sid && r.habitacion === h.nro && r.cama === c)).length; return '<div class="room"><div class="rh"><span class="row gap-4">' + ic('door-closed', 'ic-xs') + 'Hab. ' + h.nro + '</span><span class="cnt">' + n + '/' + h.camas.length + '</span></div><div class="beds">' + h.camas.map((c) => bedCell(s, h, c)).join('') + '</div></div>'; }).join('') +
          '</div></div></section>';
      }).join('') + '</div>' +
      '<div class="grid g-main mt-16"><section class="card"><div class="card-h"><div><h3>' + ic('chart-line') + 'Ocupación de los últimos 6 meses</h3><div class="sub">Porcentaje de camas ocupadas al cierre de cada mes</div></div><div class="legend">' + sedes().map((s) => '<span><i style="background:' + BT.COLORS[s] + '"></i>' + s + '</span>').join('') + '<span><i style="background:#c4bfb5"></i>Meta 90 %</span></div></div><div class="card-b"><div class="chart-box"><canvas id="admOcc"></canvas></div></div></section>' +
      '<section class="card"><div class="card-h"><div><h3>' + ic('repeat') + 'Movimientos</h3><div class="sub">Ingresos y egresos del período</div></div></div><div class="card-b flush"><div class="list">' + movimientos() + '</div></div></section></div>';
    ui.on(p, {
      'open-res': (t) => { if (BT.actions.openResident) BT.actions.openResident(t.dataset.id); else BT.go('residentes'); },
      'open-wait': (t) => openWait(t.dataset.id),
      'free-bed': (t) => pickCandidate({ sede: t.dataset.sede, bed: t.dataset.bed }),
    });
    const months = BT.finMonths();
    BT.chart(p.querySelector('#admOcc'), {
      type: 'line',
      data: {
        labels: months.map(u.fmtMonthShort),
        datasets: sedes().map((s) => ({ label: s, data: occSeries(s).map((x) => +x.pct.toFixed(1)), borderColor: BT.COLORS[s], backgroundColor: BT.alpha(BT.COLORS[s], 0.08), fill: true, pointRadius: 3, pointBackgroundColor: '#fff', pointBorderWidth: 2 }))
          .concat([{ label: 'Meta', data: months.map(() => 90), borderColor: '#c4bfb5', borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0, fill: false }]),
      },
      options: { scales: { y: { min: 60, max: 100, ticks: { callback: (v) => v + ' %' } }, x: { grid: { display: false } } }, plugins: { tooltip: { callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + u.fmtPct(c.parsed.y, 1) } } } },
    });
  }
  function movimientos() {
    const ev = [];
    BT.db.residents.filter(BT.inSede).forEach((r) => {
      if (u.daysUntil(r.ingreso) >= -183) ev.push({ ts: u.toDate(r.ingreso).getTime(), tone: 'ok', icon: 'log-in', t: 'Ingreso · ' + BT.shortName(r), d: r.sede + ' · Hab. ' + r.habitacion + r.cama, id: r.id });
      if (r.egreso && u.daysUntil(r.egreso.fecha) >= -183) ev.push({ ts: u.toDate(r.egreso.fecha).getTime(), tone: r.egreso.motivo === 'Fallecimiento' ? '' : r.egreso.motivo === 'Alta' ? 'brand' : 'info', icon: 'log-out', t: r.egreso.motivo + ' · ' + BT.shortName(r), d: r.sede + ' · ' + esc(r.egreso.nota).slice(0, 70) + (r.egreso.nota.length > 70 ? '…' : '') });
    });
    ev.sort((a, b) => b.ts - a.ts);
    if (!ev.length) return ui.empty({ ill: 'leaf', title: 'Sin movimientos', text: 'No hubo ingresos ni egresos en los últimos 6 meses.' });
    return ev.slice(0, 7).map((e) => '<div class="li"><span class="li-ic ' + e.tone + '">' + ic(e.icon, 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(e.t) + '</div><div class="d">' + e.d + '</div></div><span class="w">' + u.fmtDate(e.ts) + '</span></div>').join('');
  }

  /* ---------------- Lista de espera (pipeline) ---------------- */
  function renderEspera(p) {
    const list = waitActive();
    const closed = BT.db.waitlist.filter((w) => CLOSED.includes(w.estado));
    p.innerHTML = '<div class="row between wrap mb-16"><div class="muted" style="font-size:var(--fs-sm)">' + ic('grip-vertical', 'ic-xs') + ' Arrastrá las tarjetas para cambiar de etapa. Cada cambio queda en el seguimiento.</div><button class="btn sm" data-act="new-wait">' + ic('user-plus') + 'Nuevo interesado</button></div>' +
      '<div class="kb">' + ESTADOS.map((e) => {
        const items = list.filter((w) => w.estado === e.id).sort((a, b) => b.ts - a.ts);
        return '<div class="kb-col dz" data-estado="' + e.id + '"><div class="kb-h"><span class="badge ' + e.tone + '" style="width:26px;padding:0;justify-content:center">' + ic(e.icon) + '</span>' + e.id + '<span class="n">' + items.length + '</span></div>' +
          (items.length ? items.map(card).join('') : '<div class="kb-empty">Sin interesados en esta etapa</div>') + '</div>';
      }).join('') + '</div>' +
      (closed.length ? '<section class="card mt-16"><div class="card-h"><div><h3>' + ic('archive') + 'Cerrados</h3><div class="sub">Ingresados o descartados</div></div></div><div class="card-b flush">' + ui.table([
        { label: 'Interesado', render: (w) => ui.person(w.nombre, w.edad + ' años · ' + esc(w.contacto) + ' (' + esc(w.vinculo) + ')') },
        { label: 'Sede', render: (w) => (w.sedePref === 'Indistinta' ? ui.badge('Indistinta', 'outline') : BT.sedeTag(w.sedePref)) },
        { label: 'Estado', render: (w) => ui.badge(w.estado, w.estado === 'Ingresado' ? 'brand' : 'outline', { dot: true }) },
        { label: 'Notas', render: (w) => '<span class="muted">' + esc(w.notas || '—') + '</span>' },
        { label: 'Alta en lista', align: 'num', render: (w) => u.fmtDate(w.ts) },
      ], closed, { rowAttrs: (w) => 'class="click" data-act="open-wait" data-id="' + w.id + '"' }) + '</div></section>' : '');
    ui.on(p, { 'open-wait': (t) => openWait(t.dataset.id), 'new-wait': () => newWait() });
    // Arrastrar y soltar entre etapas
    p.querySelectorAll('.kb-card').forEach((c) => {
      c.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', c.dataset.id); e.dataTransfer.effectAllowed = 'move'; setTimeout(() => c.classList.add('dragging'), 0); });
      c.addEventListener('dragend', () => c.classList.remove('dragging'));
    });
    p.querySelectorAll('.kb-col').forEach((col) => {
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('over'); });
      col.addEventListener('dragleave', (e) => { if (!col.contains(e.relatedTarget)) col.classList.remove('over'); });
      col.addEventListener('drop', (e) => {
        e.preventDefault(); col.classList.remove('over');
        const w = BT.db.waitlist.find((x) => x.id === e.dataTransfer.getData('text/plain'));
        if (!w || w.estado === col.dataset.estado) return;
        setEstado(w, col.dataset.estado);
        renderEspera(p); ui.enhance(p);
        const moved = p.querySelector('.kb-card[data-id="' + w.id + '"]'); if (moved) ui.flash(moved);
      });
    });
  }
  function card(w) {
    const last = (w.seguimiento || []).slice(-1)[0];
    return '<div class="kb-card" draggable="true" data-id="' + w.id + '" data-act="open-wait" tabindex="0">' +
      '<div class="row between top"><div style="min-width:0"><div class="nm ellipsis">' + esc(w.nombre) + '</div><div class="mt">' + w.edad + ' años · ' + esc(w.contacto) + ' (' + esc(w.vinculo) + ')</div></div>' + (w.sedePref === 'Indistinta' ? ui.badge('BT1/BT2', 'outline') : BT.sedeTag(w.sedePref)) + '</div>' +
      '<div class="row gap-6 mt-8 wrap">' + ui.badge('Dep. ' + w.dependencia.toLowerCase(), depTone(w.dependencia)) + (w.reserva ? ui.badge('Cama ' + w.reserva.split('-')[1], 'warn', { icon: 'lock' }) : '') + '</div>' +
      (w.notas ? '<div class="muted mt-8" style="font-size:var(--fs-xs);line-height:1.4">' + esc(w.notas) + '</div>' : '') +
      '<div class="ft"><span>' + ic('history', 'ic-xs') + ' ' + (last ? u.rel(last.ts) : 'Sin seguimiento') + '</span><span>' + (w.seguimiento || []).length + ' ' + ic('message-circle', 'ic-xs') + '</span></div></div>';
  }
  function setEstado(w, estado) {
    const prev = w.estado; w.estado = estado;
    w.seguimiento = w.seguimiento || [];
    w.seguimiento.push({ ts: Date.now(), texto: 'Cambio de etapa: ' + prev + ' → ' + estado + '.', autor: BT.state.user.nombre });
    BT.audit('Modificó', 'Lista de espera', { detail: w.nombre + ': ' + prev + ' → ' + estado });
    BT.save();
    ui.toast('Etapa actualizada', { sub: w.nombre + ' · ' + estado, icon: 'arrow-left-right' });
  }

  function openWait(id) {
    const w = BT.db.waitlist.find((x) => x.id === id); if (!w) return;
    const closed = CLOSED.includes(w.estado);
    const tl = (w.seguimiento || []).slice().reverse();
    ui.drawer({
      width: 640,
      head: '<div class="row gap-16">' + ui.avatar(w.nombre, { size: 'lg' }) + '<div><div class="row gap-6 wrap"><h3 style="font-size:var(--fs-xl)">' + esc(w.nombre) + '</h3>' + ui.badge(w.estado, estadoTone(w.estado), { dot: true }) + '</div><div class="muted" style="font-size:var(--fs-sm)">' + w.edad + ' años · Dependencia ' + w.dependencia.toLowerCase() + ' · Sede preferida: ' + esc(w.sedePref) + '</div></div></div>',
      body: '<div class="col gap-16">' +
        '<section class="card"><div class="card-b">' + ui.kv([['Contacto', esc(w.contacto) + ' <span class="muted">(' + esc(w.vinculo) + ')</span>'], ['Teléfono', '<span class="num">' + esc(w.tel) + '</span>'], ['Sede preferida', w.sedePref === 'Indistinta' ? 'Indistinta' : BT.sedeTag(w.sedePref) + ' ' + esc(BT.sedeName(w.sedePref))], ['Dependencia estimada', ui.badge(w.dependencia, depTone(w.dependencia))], ['En lista desde', u.fmtDate(w.ts) + ' <span class="muted">· ' + u.rel(w.ts) + '</span>'], ['Notas', esc(w.notas || '—')]]) + '</div>' +
        (!closed ? '<div class="card-f row wrap gap-6"><button class="btn primary sm" data-ing>' + ic('log-in') + 'Iniciar ingreso</button><button class="btn sm" data-wa>' + ic('message-circle') + 'Escribir por WhatsApp</button><span class="grow"></span><button class="btn ghost sm" data-desc>' + ic('archive-x') + 'Descartar</button></div>' : '') + '</section>' +
        (!closed ? '<section class="card"><div class="card-h"><div><h3>' + ic('route') + 'Etapa</h3></div></div><div class="card-b">' + ui.seg('wstate', ESTADOS.map((e) => ({ id: e.id, label: e.id })), w.estado, 'sm') + '</div></section>' : '') +
        '<section class="card"><div class="card-h"><div><h3>' + ic('history') + 'Seguimiento</h3><div class="sub">' + tl.length + ' registro' + (tl.length === 1 ? '' : 's') + '</div></div></div><div class="card-b">' +
        (!closed ? '<div class="row top gap-6 mb-16"><textarea class="textarea" id="wsNote" placeholder="Registrá una llamada, visita o acuerdo…" style="min-height:64px"></textarea><button class="btn primary" data-add style="align-self:stretch;height:auto">' + ic('send') + '</button></div>' : '') +
        (tl.length ? '<div class="timeline">' + tl.map((s, i) => '<div class="tl-item"><span class="tl-dot ' + (i === 0 ? 'brand' : 'ok') + '">' + ic('check') + '</span><div class="tl-h"><span class="t">' + esc(s.texto) + '</span></div><div class="tl-h"><span class="w">' + esc(s.autor) + ' · ' + u.fmtDateTime(s.ts) + ' · ' + u.rel(s.ts) + '</span></div></div>').join('') + '</div>' : ui.empty({ ill: 'calendar', title: 'Sin seguimiento todavía', text: 'Registrá el primer contacto con la familia.' })) +
        '</div></section></div>',
      onMount: (d, close) => {
        const refresh = () => { close(); setTimeout(() => { BT.refresh(); openWait(id); }, 240); };
        const add = d.querySelector('[data-add]');
        if (add) add.addEventListener('click', () => {
          const t = d.querySelector('#wsNote'); if (!t.value.trim()) { t.classList.add('invalid'); return; }
          w.seguimiento = w.seguimiento || []; w.seguimiento.push({ ts: Date.now(), texto: t.value.trim(), autor: BT.state.user.nombre });
          BT.audit('Creó', 'Seguimiento de interesado', { detail: w.nombre }); BT.save();
          ui.toast('Seguimiento guardado', { sub: w.nombre }); refresh();
        });
        const sg = d.querySelector('.seg[data-seg="wstate"]');
        if (sg) sg.addEventListener('segchange', (e) => { setEstado(w, e.detail.value); BT.refresh(); });
        const ing = d.querySelector('[data-ing]'); if (ing) ing.addEventListener('click', () => { close(); setTimeout(() => ingresoFlow(w.id), 230); });
        const wa = d.querySelector('[data-wa]'); if (wa) wa.addEventListener('click', () => ui.toast('Mensaje enviado por WhatsApp (simulado)', { sub: 'A ' + w.contacto + ' · ' + w.tel, icon: 'message-circle' }));
        const ds = d.querySelector('[data-desc]'); if (ds) ds.addEventListener('click', async () => {
          const ok = await ui.confirm({ title: 'Descartar interesado', text: '¿Pasás a <b>' + esc(w.nombre) + '</b> a la lista de cerrados? Podés consultarlo igual más adelante.', ok: 'Descartar', tone: 'danger', icon: 'archive-x' });
          if (ok) { setEstado(w, 'Descartado'); close(); BT.refresh(); }
        });
      },
    });
  }

  function newWait() {
    ui.modal({
      title: 'Nuevo interesado', sub: 'Se suma a la lista de espera en la etapa «Nuevo»', icon: 'user-plus', size: 'lg',
      body: '<form class="form-grid" id="nwForm">' +
        ui.field({ label: 'Nombre completo de la persona mayor', name: 'nombre', required: true, full: true, placeholder: 'Ej.: Rosa Elena Martínez' }) +
        ui.field({ label: 'Edad', name: 'edad', type: 'number', required: true, attrs: 'min="50" max="110"' }) +
        ui.field({ label: 'Dependencia estimada', name: 'dependencia', type: 'select', options: ['Leve', 'Moderada', 'Severa', 'Total'], value: 'Moderada' }) +
        ui.field({ label: 'Familiar de contacto', name: 'contacto', required: true }) +
        ui.field({ label: 'Vínculo', name: 'vinculo', type: 'select', options: ['Hijo', 'Hija', 'Esposo/a', 'Nieto/a', 'Sobrino/a', 'Otro'], value: 'Hija' }) +
        ui.field({ label: 'Teléfono', name: 'tel', required: true, placeholder: '09X XXX XXX' }) +
        ui.field({ label: 'Sede preferida', name: 'sedePref', type: 'chips', options: [{ v: 'BT1', l: 'BT1 · Malvín' }, { v: 'BT2', l: 'BT2 · Unión' }, { v: 'Indistinta', l: 'Indistinta' }], value: BT.state.sede === 'ALL' ? 'Indistinta' : BT.state.sede }) +
        ui.field({ label: 'Notas', name: 'notas', type: 'textarea', full: true, placeholder: 'Cómo nos conoció, necesidades especiales, urgencia…' }) + '</form>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>' + ic('check') + 'Agregar a la lista</button>',
      onMount: (m, close) => m.querySelector('[data-save]').addEventListener('click', () => {
        const f = m.querySelector('#nwForm'); if (!ui.validate(f)) return;
        const d = ui.formData(f);
        BT.db.waitlist.push({ id: u.uid('wl'), nombre: d.nombre, edad: +d.edad, contacto: d.contacto, vinculo: d.vinculo, tel: d.tel, sedePref: d.sedePref || 'Indistinta', dependencia: d.dependencia, estado: 'Nuevo', ts: Date.now(), notas: d.notas, seguimiento: [{ ts: Date.now(), texto: 'Alta en la lista de espera.', autor: BT.state.user.nombre }] });
        BT.audit('Creó', 'Interesado en lista de espera', { detail: d.nombre }); BT.save();
        close(); BT.state.sub.adm = 'espera'; BT.refresh();
        ui.toast('Interesado agregado', { sub: d.nombre + ' · etapa «Nuevo»', icon: 'user-plus' });
      }),
    });
  }

  /** Elegir a quién ingresar (desde una cama libre o el botón general) */
  function pickCandidate(pre) {
    const list = BT.db.waitlist.filter((w) => !CLOSED.includes(w.estado) && (!pre || w.sedePref === pre.sede || w.sedePref === 'Indistinta'));
    const order = (w) => ESTADOS.findIndex((e) => e.id === w.estado);
    list.sort((a, b) => order(b) - order(a));
    ui.modal({
      title: pre ? 'Asignar cama ' + pre.bed + ' · ' + pre.sede : 'Iniciar ingreso', sub: 'Elegí a la persona de la lista de espera', icon: 'log-in',
      body: list.length ? '<div class="col gap-6">' + list.map((w) => '<button class="role-card" data-w="' + w.id + '">' + ui.avatar(w.nombre) + '<span class="grow"><span class="t">' + esc(w.nombre) + '</span><br><span class="d">' + w.edad + ' años · Dep. ' + w.dependencia.toLowerCase() + ' · ' + esc(w.sedePref) + '</span></span>' + ui.badge(w.estado, estadoTone(w.estado)) + '</button>').join('') + '</div>'
        : ui.empty({ ill: 'search', title: 'No hay interesados para esta sede', text: 'Agregá un interesado a la lista de espera para iniciar un ingreso.', action: '<button class="btn primary sm" data-nw>' + ic('user-plus') + 'Nuevo interesado</button>' }),
      onMount: (m, close) => {
        m.querySelectorAll('[data-w]').forEach((b) => b.addEventListener('click', () => { close(); setTimeout(() => ingresoFlow(b.dataset.w, pre), 230); }));
        const nw = m.querySelector('[data-nw]'); if (nw) nw.addEventListener('click', () => { close(); setTimeout(newWait, 230); });
      },
    });
  }

  /* ---------------- Checklist e ingreso ---------------- */
  function ingresoFlow(wid, pre) {
    const w = BT.db.waitlist.find((x) => x.id === wid); if (!w) return;
    const CL = BT.db.admissionChecklist;
    w.checklist = w.checklist && w.checklist.length === CL.length ? w.checklist : CL.map(() => false);
    let sede = pre ? pre.sede : (w.sedePref === 'BT1' || w.sedePref === 'BT2' ? w.sedePref : (BT.state.sede !== 'ALL' ? BT.state.sede : 'BT1'));
    const bOpts = (s) => BT.admFreeBeds(s).map((b) => ({ v: b.bed, l: 'Hab. ' + b.bed.slice(0, -1) + ' · cama ' + b.bed.slice(-1) + (b.reservada ? ' (reservada)' : '') }));
    const defB = { Leve: 70, Moderada: 50, Severa: 30, Total: 15 }[w.dependencia] || 50;
    const cuotaFor = (b) => (b >= 60 ? 54000 : b > 35 ? 60000 : 66500);
    const progress = () => { const n = w.checklist.filter(Boolean).length; return { n, pct: (n / CL.length) * 100 }; };
    const pr = progress();
    ui.modal({
      title: 'Ingreso de ' + esc(w.nombre), sub: 'Checklist de ingreso según Decreto 356/016 y Ordenanza 483/017', icon: 'clipboard-check', size: 'xl',
      body: '<div class="grid g-2" style="align-items:start">' +
        '<div><div class="row between mb-8"><span class="flabel">' + ic('list-checks', 'ic-sm') + 'Checklist</span><span class="strong num" id="ckN">' + pr.n + '/' + CL.length + '</span></div><div class="mb-16" id="ckBar">' + ui.bar(pr.pct) + '</div><div class="col gap-6" id="ckList">' +
        CL.map((t, i) => '<button type="button" class="adm-ck ' + (w.checklist[i] ? 'on static' : '') + '" data-i="' + i + '"><span class="nn">' + (i + 1) + '</span><span class="box">' + BT.check + '</span><span class="t grow">' + esc(t) + '</span></button>').join('') + '</div></div>' +
        '<div><form class="form-grid" id="ingForm">' +
        ui.field({ label: 'Sede', name: 'sede', type: 'chips', options: [{ v: 'BT1', l: 'BT1 · Malvín' }, { v: 'BT2', l: 'BT2 · Unión' }], value: sede, full: true, required: true }) +
        '<div class="field full" id="bedField">' + bedSelect(bOpts(sede), pre && pre.sede === sede ? pre.bed : null) + '</div>' +
        ui.field({ label: 'Fecha de ingreso', name: 'fecha', type: 'date', value: u.todayIso(), required: true }) +
        ui.field({ label: 'Sexo', name: 'sexo', type: 'select', options: [{ v: 'F', l: 'Femenino' }, { v: 'M', l: 'Masculino' }], value: /a$/.test(w.nombre.split(' ')[0]) ? 'F' : 'M' }) +
        ui.field({ label: 'Índice de Barthel inicial', name: 'barthel', type: 'number', value: defB, required: true, attrs: 'min="0" max="100" step="5"', tip: 'Barthel 0–40 = dependiente para el cálculo del ratio (Ord. 1032/2019)' }) +
        ui.field({ label: 'Cuota mensual ($U)', name: 'cuota', type: 'number', value: cuotaFor(defB), required: true, attrs: 'step="500"' }) +
        ui.field({ label: 'Mutualista', name: 'mutualista', type: 'select', options: ['CASMU', 'Médica Uruguaya', 'Asociación Española', 'SMI', 'Círculo Católico', 'ASSE', 'Hospital Evangélico', 'COSEM', 'Universal'], value: 'CASMU' }) +
        ui.field({ label: 'Emergencia móvil', name: 'emergencia', type: 'select', options: ['SEMM', 'UCM', 'Emergencia Uno', 'SUAT', 'Cardio-Móvil'], value: 'SEMM' }) +
        ui.field({ label: 'Dieta', name: 'dieta', type: 'select', options: Object.keys(BT.db.menu.variantes), value: 'Común' }) +
        ui.field({ label: 'Cédula de identidad', name: 'ci', placeholder: '1.234.567-8' }) +
        ui.field({ label: 'Diagnósticos (separados por coma)', name: 'dx', full: true, placeholder: 'Ej.: Hipertensión arterial, Artrosis' }) +
        '</form><div class="alert info mt-16">' + ic('info') + '<div>Al completar se crea la ficha del residente, se libera la reserva, se registran el <b>depósito de garantía</b> y la primera cuota (prorrateada) en Cobranzas.</div></div></div></div>',
      foot: '<span class="muted grow" style="font-size:var(--fs-sm)" id="ckHint">' + (pr.n === CL.length ? ic('circle-check', 'ic-xs') + ' Checklist completo' : 'Faltan ' + (CL.length - pr.n) + ' ítems del checklist') + '</span><button class="btn ghost" data-saveprog>Guardar avance</button><button class="btn primary" data-done>' + ic('log-in') + 'Completar ingreso</button>',
      onMount: (m, close) => {
        const upd = () => {
          const p = progress();
          m.querySelector('#ckN').textContent = p.n + '/' + CL.length;
          const bar = m.querySelector('#ckBar .bar > span'); bar.style.animation = 'none'; bar.style.width = p.pct + '%'; bar.style.transition = 'width 360ms var(--ease-out)';
          m.querySelector('#ckHint').innerHTML = p.n === CL.length ? ic('circle-check', 'ic-xs') + ' Checklist completo' : 'Faltan ' + (CL.length - p.n) + ' ítems del checklist';
        };
        m.querySelectorAll('.adm-ck').forEach((b) => b.addEventListener('click', () => { const i = +b.dataset.i; w.checklist[i] = !w.checklist[i]; b.classList.remove('static'); b.classList.toggle('on', w.checklist[i]); upd(); }));
        m.querySelector('[data-chips="sede"]').addEventListener('chipchange', () => { sede = ui.formData(m.querySelector('#ingForm')).sede; m.querySelector('#bedField').innerHTML = bedSelect(bOpts(sede)); });
        m.querySelector('input[name="barthel"]').addEventListener('input', (e) => { const c = m.querySelector('input[name="cuota"]'); c.value = cuotaFor(+e.target.value || 0); });
        m.querySelector('[data-saveprog]').addEventListener('click', () => { BT.save(); BT.audit('Modificó', 'Checklist de ingreso', { detail: w.nombre }); ui.toast('Avance guardado', { sub: progress().n + ' de ' + CL.length + ' ítems completos' }); close(); });
        m.querySelector('[data-done]').addEventListener('click', () => {
          const form = m.querySelector('#ingForm');
          if (progress().n < CL.length) {
            const list = m.querySelector('#ckList'); list.querySelectorAll('.adm-ck:not(.on)').forEach((b) => { b.classList.remove('invalid'); void b.offsetWidth; b.style.animation = 'shake 360ms var(--ease)'; b.style.borderColor = 'var(--warn-line)'; setTimeout(() => (b.style.animation = ''), 400); });
            ui.toast('Completá el checklist de ingreso', { type: 'warn', sub: 'Es requisito para habilitar la ficha del residente' }); return;
          }
          if (!ui.validate(form)) return;
          const d = ui.formData(form);
          if (!d.cama) { ui.toast('No hay camas libres en ' + d.sede, { type: 'warn', sub: 'Elegí la otra sede o registrá un egreso' }); return; }
          const r = completeIngreso(w, d);
          close();
          BT.state.sub.adm = 'plano';
          BT.refresh();
          ui.toast('¡Ingreso completado!', { sub: BT.fullName(r) + ' · ' + r.sede + ' · Hab. ' + r.habitacion + r.cama, icon: 'party-popper', ms: 4800 });
          setTimeout(() => { const bed = document.querySelector('.bed[data-id="' + r.id + '"]'); if (bed) { bed.scrollIntoView({ block: 'center', behavior: 'smooth' }); ui.flash(bed); } }, 380);
        });
      },
    });
  }
  function bedSelect(opts, pre) {
    if (!opts.length) return '<label class="flabel">Cama</label><div class="alert warn">' + ic('triangle-alert') + '<div>No hay camas libres en esta sede.</div></div><input type="hidden" name="cama" value="">';
    return ui.field({ label: 'Habitación y cama', name: 'cama', type: 'select', options: opts, value: pre || (opts.find((o) => /reservada/.test(o.l)) || opts[0]).v, required: true, full: true });
  }
  function completeIngreso(w, d) {
    const parts = w.nombre.trim().split(/\s+/);
    const nombre = parts.length >= 3 ? parts.slice(0, 2).join(' ') : parts[0];
    const apellido = parts.length >= 3 ? parts.slice(2).join(' ') : parts.slice(1).join(' ') || '—';
    const maxId = Math.max(0, ...BT.db.residents.map((r) => parseInt(String(r.id).slice(1), 10) || 0));
    const id = 'r' + (maxId + 1);
    const b = Math.max(0, Math.min(100, +d.barthel || 0));
    const f = d.fecha || u.todayIso();
    const sedeObj = BT.db.sedes.find((s) => s.id === d.sede);
    const r = {
      id, sede: d.sede, estado: 'activo', nombre, apellido, sexo: d.sexo || 'F',
      nacimiento: u.iso(u.addMonths(u.today(), -w.edad * 12 - 4)), ci: (d.ci || '').replace(/\D/g, '') || String(1000000 + (u.hash(w.nombre) % 4000000)),
      mutualista: d.mutualista, emergencia: d.emergencia, medico: 'Dr. Fernando Aguirre', dieta: d.dieta, alergias: [],
      diagnosticos: (d.dx || '').split(',').map((s) => s.trim()).filter(Boolean),
      habitacion: d.cama.slice(0, -1), cama: d.cama.slice(-1), ingreso: f,
      referente: { nombre: w.contacto, vinculo: w.vinculo, tel: w.tel, email: '', ci: '' }, curador: null,
      barthel: [{ fecha: f, score: b, evaluador: 'Dr. Fernando Aguirre' }],
      braden: [{ fecha: f, score: Math.min(23, Math.max(7, Math.round(9 + b / 9))) }],
      downton: [{ fecha: f, score: b >= 90 ? 1 : b >= 50 ? 3 : 5 }],
      cuota: +d.cuota, deposito: +d.cuota,
      plan: { objetivos: ['Adaptación progresiva al nuevo entorno', 'Valoración integral en los primeros 30 días'], cuidados: ['Según valoración de ingreso'], actividades: ['Integración gradual a los talleres'], revision: u.iso(u.addDays(u.today(), 30)), responsable: 'Lic. Mariana Castro Brum' },
      social: { adaptacion: 'En proceso', fecha: f, profesional: 'Lic. T.S. Andrea Pereira', texto: 'Ingreso reciente. Se acordó con la familia un plan de visitas frecuentes durante el primer mes para acompañar la adaptación.' },
      docs: DOCS.map((t) => Object.assign({ tipo: t, estado: 'ok', fecha: f }, t === 'Carné de vacunas' ? { vence: u.iso(u.addDays(u.today(), 365)) } : {})),
    };
    BT.db.residents.push(r);
    sedeObj.reservadas = sedeObj.reservadas.filter((x) => x !== d.cama);
    const mes = f.slice(0, 7);
    BT.db.charges.push({ id: u.uid('ch'), residentId: id, sede: d.sede, mes, concepto: 'Depósito de garantía', monto: r.deposito, garantia: true });
    BT.db.payments.push({ id: u.uid('pg'), residentId: id, sede: d.sede, fecha: f, monto: r.deposito, medio: 'Transferencia BROU', recibo: 'R-' + String(5000 + BT.db.payments.length).padStart(6, '0'), garantia: true });
    // Primera cuota prorrateada por los días que restan del mes; se abona junto con el depósito al ingresar
    const fd = u.toDate(f); const dim = new Date(fd.getFullYear(), fd.getMonth() + 1, 0).getDate();
    const prorr = Math.round((r.cuota * (dim - fd.getDate() + 1)) / dim / 10) * 10;
    BT.db.charges.push({ id: u.uid('ch'), residentId: id, sede: d.sede, mes, concepto: 'Cuota mensual', monto: prorr, nota: 'Prorrateo ' + (dim - fd.getDate() + 1) + '/' + dim + ' días' });
    BT.db.payments.push({ id: u.uid('pg'), residentId: id, sede: d.sede, fecha: f, monto: prorr, medio: 'Transferencia BROU', recibo: 'R-' + String(5001 + BT.db.payments.length).padStart(6, '0') });
    w.estado = 'Ingresado'; w.residentId = id; w.reserva = null;
    w.seguimiento = w.seguimiento || []; w.seguimiento.push({ ts: Date.now(), texto: 'Ingreso completado en ' + d.sede + ', habitación ' + d.cama + '.', autor: BT.state.user.nombre });
    BT.audit('Creó', 'Ingreso de residente', { residentId: id, detail: d.sede + ' · Hab. ' + d.cama + ' · Barthel ' + b });
    BT.save();
    return r;
  }

  /* ---------------- Egresos ---------------- */
  function renderEgresos(p) {
    const eg = BT.db.residents.filter((r) => r.estado === 'egresado' && BT.inSede(r)).sort((a, b) => b.egreso.fecha.localeCompare(a.egreso.fecha));
    const by = u.groupBy(eg, (r) => r.egreso.motivo);
    const avgStay = eg.length ? u.avg(eg, (r) => u.daysBetween(r.ingreso, r.egreso.fecha)) / 30.4 : 0;
    p.innerHTML = '<div class="grid g-4 keep stagger mb-16">' +
      ui.kpi({ label: 'Altas', value: (by.Alta || []).length, icon: 'house', foot: 'Regreso al domicilio' }) +
      ui.kpi({ label: 'Traslados', value: (by.Traslado || []).length, icon: 'truck', tone: 'info', foot: 'A otra institución' }) +
      ui.kpi({ label: 'Fallecimientos', value: (by.Fallecimiento || []).length, icon: 'flower-2', tone: 'ink', foot: 'Con acompañamiento' }) +
      ui.kpi({ label: 'Estadía promedio', value: avgStay, decimals: 1, suffix: 'meses', icon: 'hourglass', tone: 'ink', foot: 'De los egresos registrados' }) +
      '</div><section class="card"><div class="card-h"><div><h3>' + ic('log-out') + 'Historial de egresos</h3><div class="sub">La ficha y la historia clínica se conservan según la normativa</div></div><button class="btn sm" data-act="egreso">' + ic('user-minus') + 'Registrar egreso</button></div><div class="card-b flush">' +
      ui.table([
        { label: 'Residente', render: (r) => ui.person(BT.fullName(r), u.age(r.nacimiento) + ' años · Hab. ' + r.habitacion + r.cama) },
        { label: 'Sede', render: (r) => BT.sedeTag(r.sede) },
        { label: 'Motivo', render: (r) => ui.badge(r.egreso.motivo, MOT_TONE[r.egreso.motivo], { dot: true }) },
        { label: 'Ingreso', align: 'num', render: (r) => u.fmtDate(r.ingreso) },
        { label: 'Egreso', align: 'num', render: (r) => '<span class="strong">' + u.fmtDate(r.egreso.fecha) + '</span>' },
        { label: 'Estadía', align: 'num', render: (r) => u.fmtNum(u.daysBetween(r.ingreso, r.egreso.fecha) / 30.4, 1) + ' meses' },
        { label: 'Nota', render: (r) => '<span class="muted" style="display:block;max-width:340px;font-size:var(--fs-sm);line-height:1.4">' + esc(r.egreso.nota) + '</span>' },
      ], eg, { empty: { ill: 'leaf', title: 'Sin egresos registrados', text: 'Todavía no hay egresos en esta sede.' } }) + '</div></section>';
    ui.on(p, { egreso: () => egresoFlow() });
  }
  function egresoFlow(preId) {
    const act = BT.residentsInSede().sort((a, b) => BT.fullName(a).localeCompare(BT.fullName(b)));
    ui.modal({
      title: 'Registrar egreso', sub: 'La cama queda liberada y la medicación activa se suspende', icon: 'user-minus', size: 'lg',
      body: '<form class="form-grid" id="egForm">' +
        ui.field({ label: 'Residente', name: 'rid', type: 'select', required: true, full: true, placeholder: 'Elegí un residente…', value: preId || '', options: act.map((r) => ({ v: r.id, l: BT.fullName(r) + ' · ' + r.sede + ' · Hab. ' + r.habitacion + r.cama })) }) +
        ui.field({ label: 'Motivo del egreso', name: 'motivo', type: 'chips', options: MOTIVOS, required: true, full: true }) +
        ui.field({ label: 'Fecha', name: 'fecha', type: 'date', value: u.todayIso(), required: true }) +
        ui.field({ label: 'Destino / responsable', name: 'destino', placeholder: 'Ej.: domicilio de su hija, Residencial X…' }) +
        ui.field({ label: 'Nota (obligatoria)', name: 'nota', type: 'textarea', required: true, full: true, placeholder: 'Describí brevemente las circunstancias y la coordinación realizada.' }) +
        '<div class="full hidden" id="egFall"><div class="alert warn">' + ic('file-warning') + '<div>Adjuntá el <b>certificado de defunción</b> a la ficha y notificá a la mutualista y a la emergencia móvil.</div></div></div>' +
        '</form>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn dark" data-save>' + ic('check') + 'Registrar egreso</button>',
      onMount: (m, close) => {
        m.querySelector('[data-chips="motivo"]').addEventListener('chipchange', () => m.querySelector('#egFall').classList.toggle('hidden', ui.formData(m).motivo !== 'Fallecimiento'));
        m.querySelector('[data-save]').addEventListener('click', async () => {
          const f = m.querySelector('#egForm'); if (!ui.validate(f)) return;
          const d = ui.formData(f); const r = BT.resident(d.rid);
          const ok = await ui.confirm({ title: 'Confirmar egreso', text: 'Se registrará el egreso de <b>' + esc(BT.fullName(r)) + '</b> por <b>' + esc(d.motivo.toLowerCase()) + '</b> el ' + u.fmtDate(d.fecha) + '. La cama ' + r.habitacion + r.cama + ' de ' + r.sede + ' quedará libre.', ok: 'Registrar egreso', icon: 'user-minus' });
          if (!ok) return;
          r.estado = 'egresado';
          r.egreso = { fecha: d.fecha, motivo: d.motivo, nota: d.nota + (d.destino ? ' Destino: ' + d.destino + '.' : '') };
          BT.db.meds.filter((x) => x.residentId === r.id && x.activo).forEach((x) => { x.activo = false; x.hasta = d.fecha; });
          BT.audit('Registró egreso', 'Ficha del residente', { residentId: r.id, detail: d.motivo + ' · ' + u.fmtDate(d.fecha) });
          BT.save(); close();
          BT.state.sub.adm = 'egresos'; BT.refresh();
          ui.toast('Egreso registrado', { sub: BT.fullName(r) + ' · cama ' + r.habitacion + r.cama + ' liberada', icon: 'log-out' });
        });
      },
    });
  }
  BT.actions.registerEgreso = egresoFlow;
  BT.actions.startIngreso = (wid) => (wid ? ingresoFlow(wid) : pickCandidate());

  /* ---------------- Alertas ---------------- */
  BT.addAlerts(() => {
    const out = [];
    BT.db.waitlist.filter((w) => w.estado === 'Listo para ingresar').forEach((w) => out.push({ id: 'adm-' + w.id, tone: 'info', icon: 'log-in', title: 'Ingreso programado: ' + w.nombre, desc: 'Lista para ingresar' + (w.sedePref !== 'Indistinta' ? ' en ' + w.sedePref : '') + ' · completá el checklist', tab: 'admisiones', sede: w.sedePref === 'Indistinta' ? 'ALL' : w.sedePref, when: w.ts, roles: ['direccion', 'administracion'], action: () => { BT.go('admisiones'); setTimeout(() => ingresoFlow(w.id), 420); } }));
    return out;
  });

  BT.tab({ id: 'admisiones', label: 'Admisiones y ocupación', icon: 'bed-double', group: 'gestion', order: 9, roles: ['direccion', 'administracion'], badge: () => BT.db.waitlist.filter((w) => w.estado === 'Listo para ingresar').length, badgeSoft: true, render });
})();

/* ==========================================================================
   Actividades — calendario recreativo, asistencia, cumpleaños y participación
   ========================================================================== */
(function () {
  'use strict';
  const BT = window.BT, u = BT.u, ic = BT.ic, esc = u.esc, ui = BT.ui;
  const TIPOS = {
    Movimiento: { color: '#297040', icon: 'footprints' },
    Cognitiva: { color: '#6b5ba8', icon: 'brain' },
    'Música': { color: '#c98a2b', icon: 'music' },
    'Aire libre': { color: '#3f9d8f', icon: 'leaf' },
    Recreativa: { color: '#3f78b5', icon: 'star' },
    Espiritual: { color: '#8a857c', icon: 'book-open' },
    'Celebración': { color: '#b5677a', icon: 'party-popper' },
  };
  const tipoMeta = (t) => TIPOS[t] || { color: '#7b7770', icon: 'calendar' };
  const fresh = (host) => { host.innerHTML = ''; const d = document.createElement('div'); host.appendChild(d); return d; };
  const AS = () => (BT.state.actUI = BT.state.actUI || { ym: u.ym(new Date()) });
  const bdayThisYear = (r, year = new Date().getFullYear()) => { const b = u.toDate(r.nacimiento); return new Date(year, b.getMonth(), b.getDate()); };
  const turning = (r) => u.age(r.nacimiento) + (u.daysUntil(bdayThisYear(r)) > 0 ? 1 : 0);

  BT.addCSS('act', `
  .ach{display:block;width:100%;text-align:left;border:0;border-radius:7px;padding:3px 6px;font-size:11px;font-weight:600;line-height:1.25;background:color-mix(in srgb,var(--c) 12%,#fff);color:color-mix(in srgb,var(--c) 80%,#000);border-left:3px solid var(--c);transition:transform var(--d-fast),box-shadow var(--d-fast);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ach:hover{transform:translateX(2px);box-shadow:var(--sh-1)}
  .ach .h{font-variant-numeric:tabular-nums;opacity:.75;margin-right:3px}
  .ach.done::after{content:"✓";float:right;opacity:.7}
  .cal .day{cursor:pointer}
  .cal .day:hover{border-color:var(--brand-300)}
  .cal .bday{font-size:10.5px;color:#b5677a;font-weight:650;display:flex;gap:4px;align-items:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .att-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px}
  .att{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:12px;border:1px solid var(--line);background:var(--surface);text-align:left;font-size:var(--fs-sm);font-weight:550;transition:all var(--d) var(--ease)}
  .att:hover{border-color:var(--brand-300)}
  .att .ck{margin-left:auto;width:22px;height:22px;border-radius:50%;border:2px solid var(--ink-200);display:grid;place-items:center;color:transparent;transition:all var(--d) var(--ease-spring)}
  .att.on{background:var(--brand-50);border-color:var(--brand-300)}
  .att.on .ck{background:var(--brand-600);border-color:var(--brand-600);color:#fff;transform:scale(1.08)}
  .att .ck .ic{width:12px;height:12px;stroke-width:3}
  .bd-card{display:flex;align-items:center;gap:14px;padding:14px 16px;border-bottom:1px solid var(--ink-100)}
  .bd-card:last-child{border-bottom:0}
  .bd-date{width:54px;height:58px;border-radius:12px;background:var(--surface-2);border:1px solid var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none}
  .bd-date b{font-size:20px;line-height:1;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
  .bd-date span{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-500);font-weight:650}
  .bd-card.today{background:linear-gradient(90deg,#fbeef1,transparent 70%)}
  .bd-card.today .bd-date{background:#b5677a;border-color:#b5677a;color:#fff}
  .bd-card.today .bd-date span{color:rgba(255,255,255,.8)}
  `);

  /* Alertas de cumpleaños */
  BT.addAlerts(() => {
    const out = [];
    ['BT1', 'BT2'].forEach((s) => {
      const res = BT.db.residents.filter((r) => r.sede === s && r.estado === 'activo');
      res.filter((r) => u.daysUntil(bdayThisYear(r)) === 0).forEach((r) => out.push({ id: 'bday-' + r.id, tone: 'ok', icon: 'cake', sede: s, roles: ['direccion', 'enfermeria', 'cuidadora', 'medico', 'administracion'], title: '¡Hoy cumple ' + u.age(r.nacimiento) + ' años ' + BT.shortName(r) + '!', desc: s + ' · Hab. ' + r.habitacion + r.cama + ' · Organizá el festejo y saludá a la familia', tab: 'actividades', params: { sub: 'cumples' } }));
      const week = res.filter((r) => { const n = u.daysUntil(bdayThisYear(r)); return n > 0 && n <= 7; });
      if (week.length) out.push({ id: 'bday-week-' + s, tone: 'info', icon: 'cake', sede: s, roles: ['direccion', 'enfermeria', 'cuidadora', 'medico'], title: week.length + (week.length === 1 ? ' cumpleaños' : ' cumpleaños') + ' esta semana · ' + s, desc: week.map((r) => BT.shortName(r) + ' (' + u.relDay(bdayThisYear(r)) + ')').join(' · '), tab: 'actividades', params: { sub: 'cumples' } });
    });
    return out;
  });

  BT.tab({
    id: 'actividades', label: 'Actividades', icon: 'palette', group: 'dia', order: 14, roles: ['direccion', 'enfermeria', 'cuidadora', 'medico'],
    render(el, params) {
      if (params && params.sub && !params._applied) { params._applied = true; BT.state.sub.act = params.sub; }
      const acts = BT.bySede(BT.db.activities);
      const ym = u.ym(new Date());
      const month = acts.filter((a) => a.fecha.startsWith(ym));
      const past = acts.filter((a) => a.fecha < u.todayIso() && Date.now() - u.toDate(a.fecha).getTime() < 30 * 86400000);
      const avgAtt = past.length ? u.avg(past, (a) => a.asistentes.length) : 0;
      const bd = BT.residentsInSede().filter((r) => u.toDate(r.nacimiento).getMonth() === new Date().getMonth());
      const next = acts.filter((a) => a.fecha > u.todayIso() || (a.fecha === u.todayIso() && a.hora >= u.fmtTime(new Date()))).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))[0];
      el.innerHTML = ui.pageHeader({ eyebrow: 'Día a día · ' + BT.sedeName(), icon: 'palette', title: 'Actividades', sub: 'Calendario recreativo, asistencia y cumpleaños de los residentes.',
        actions: '<button class="btn primary" data-act="new">' + ic('plus') + 'Nueva actividad</button>' }) +
        '<div class="grid g-4 stagger">' +
        ui.kpi({ label: 'Actividades este mes', value: month.length, icon: 'calendar-days', tone: 'ink' }) +
        ui.kpi({ label: 'Asistencia promedio', value: avgAtt, decimals: 1, suffix: 'res.', icon: 'users', foot: 'Últimos 30 días' }) +
        ui.kpi({ label: 'Cumpleaños del mes', value: bd.length, icon: 'cake', tone: 'danger' }) +
        '<div class="card kpi hover"><div class="k-top"><span class="k-label">Próxima actividad</span><span class="k-ic info">' + ic(next ? tipoMeta(next.tipo).icon : 'calendar') + '</span></div>' + (next ? '<div class="strong" style="font-size:var(--fs-lg);line-height:1.2">' + esc(next.titulo) + '</div><div class="k-foot">' + u.cap(u.relDay(next.fecha)) + ' · ' + next.hora + ' · ' + BT.sedeTag(next.sede) + '</div>' : '<div class="muted">Sin actividades próximas</div>') + '</div>' +
        '</div><div id="actTabs" class="mt-16"></div>';
      ui.subtabs(el.querySelector('#actTabs'), 'act', [
        { id: 'calendario', label: 'Calendario', icon: 'calendar-days' },
        { id: 'cumples', label: 'Cumpleaños', icon: 'cake', count: bd.length || '' },
        { id: 'participacion', label: 'Participación', icon: 'chart-column' },
      ], (p, id) => (id === 'calendario' ? renderCal(p) : id === 'cumples' ? renderBdays(p) : renderPart(p)));
      ui.on(el, { new: () => newActivity() });
    },
  });

  /* ---------------- Calendario ---------------- */
  function renderCal(host) {
    const panel = fresh(host); const as = AS();
    const first = u.toDate(as.ym); const y = first.getFullYear(), m = first.getMonth();
    const start = u.addDays(first, -((first.getDay() + 6) % 7));
    const acts = BT.bySede(BT.db.activities);
    const res = BT.residentsInSede();
    const days = [];
    const cells = Math.ceil(((first.getDay() + 6) % 7 + new Date(y, m + 1, 0).getDate()) / 7) * 7;
    for (let k = 0; k < cells; k++) days.push(u.addDays(start, k));
    const todayIso = u.todayIso();
    panel.innerHTML = '<div class="card"><div class="card-h"><div class="row gap-6"><button class="icon-btn sm" data-nav="-1" aria-label="Mes anterior">' + ic('chevron-left', 'ic-sm') + '</button><h3 style="min-width:190px;justify-content:center">' + u.cap(u.MESES[m]) + ' ' + y + '</h3><button class="icon-btn sm" data-nav="1" aria-label="Mes siguiente">' + ic('chevron-right', 'ic-sm') + '</button>' + (as.ym !== u.ym(new Date()) ? '<button class="btn xs ghost" data-nav="0">Hoy</button>' : '') + '</div>' +
      '<div class="legend">' + Object.entries(TIPOS).map(([t, v]) => '<span><i style="background:' + v.color + '"></i>' + t + '</span>').join('') + '</div></div>' +
      '<div class="card-b"><div class="cal">' + ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => '<div class="dow">' + d + '</div>').join('') +
      days.map((d) => {
        const dIso = u.iso(d); const list = acts.filter((a) => a.fecha === dIso).sort((a, b) => a.hora.localeCompare(b.hora));
        const bds = d.getMonth() === m ? res.filter((r) => { const b = u.toDate(r.nacimiento); return b.getMonth() === m && b.getDate() === d.getDate(); }) : [];
        return '<div class="day ' + (d.getMonth() !== m ? 'out' : '') + (dIso === todayIso ? ' today' : '') + '" data-day="' + dIso + '"><div class="dn"><b>' + d.getDate() + '</b>' + (list.length > 2 ? '<span class="subtle">+' + (list.length - 2) + '</span>' : '') + '</div>' +
          bds.map((r) => '<div class="bday" data-tip="Cumple ' + (y - u.toDate(r.nacimiento).getFullYear()) + ' años">' + ic('cake', 'ic-xs') + esc(r.nombre.split(' ')[0]) + '</div>').join('') +
          list.slice(0, 2).map((a) => '<button class="ach ' + (a.asistentes.length ? 'done' : '') + '" style="--c:' + tipoMeta(a.tipo).color + '" data-actid="' + a.id + '"><span class="h">' + a.hora + '</span>' + (BT.state.sede === 'ALL' ? a.sede + ' · ' : '') + esc(a.titulo) + '</button>').join('') + '</div>';
      }).join('') + '</div></div></div>';
    panel.addEventListener('click', (e) => {
      const n = e.target.closest('[data-nav]'); if (n) { as.ym = n.dataset.nav === '0' ? u.ym(new Date()) : u.ym(u.addMonths(as.ym, +n.dataset.nav)); renderCal(host); ui.enhance(host); return; }
      const a = e.target.closest('[data-actid]'); if (a) return activityModal(BT.db.activities.find((x) => x.id === a.dataset.actid), () => { renderCal(host); });
      const d = e.target.closest('[data-day]'); if (d) { const list = acts.filter((x) => x.fecha === d.dataset.day); if (list.length > 2) dayList(d.dataset.day, list, () => renderCal(host)); else newActivity(d.dataset.day, () => renderCal(host)); }
    });
  }
  function dayList(dIso, list, after) {
    const m = ui.modal({ title: u.cap(u.fmtDateLong(dIso)), sub: list.length + ' actividades', icon: 'calendar-days',
      body: '<div class="list">' + list.map((a) => '<div class="li click" data-a="' + a.id + '"><span class="li-ic" style="background:' + BT.alpha(tipoMeta(a.tipo).color, 0.12) + ';color:' + tipoMeta(a.tipo).color + '">' + ic(tipoMeta(a.tipo).icon, 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(a.titulo) + '</div><div class="d">' + a.hora + ' · ' + a.sede + ' · ' + esc(a.lugar) + '</div></div>' + ic('chevron-right', 'ic-sm') + '</div>').join('') + '</div>',
      onMount: (el, close) => el.addEventListener('click', (e) => { const x = e.target.closest('[data-a]'); if (x) { close(); setTimeout(() => activityModal(BT.db.activities.find((y) => y.id === x.dataset.a), after), 230); } }) });
    return m;
  }
  function activityModal(a, after) {
    const T = tipoMeta(a.tipo); const isPast = a.fecha <= u.todayIso();
    const res = BT.db.residents.filter((r) => r.sede === a.sede && r.estado === 'activo').sort((x, y) => (x.habitacion.padStart(2, '0') + x.cama).localeCompare(y.habitacion.padStart(2, '0') + y.cama));
    const sel = new Set(a.asistentes);
    ui.modal({
      title: a.titulo, sub: u.cap(u.fmtDateLong(a.fecha)) + ' · ' + a.hora + ' · ' + esc(a.lugar) + ' · ' + a.sede, icon: T.icon, size: 'lg',
      body: '<div class="row wrap gap-6 mb-16">' + ui.badge(a.tipo, '', { icon: T.icon }) + ui.badge('Responsable: ' + a.responsable, 'outline') + '</div>' +
        (isPast ? '<div class="row between mb-8"><div class="sec-t" style="margin:0;flex:1">Asistencia · <span data-n>' + sel.size + '</span> de ' + res.length + '</div><button class="btn xs ghost" data-all>Marcar todos</button></div><div class="att-grid">' +
          res.map((r) => '<button class="att ' + (sel.has(r.id) ? 'on' : '') + '" data-r="' + r.id + '">' + ui.avatar(BT.fullName(r), { size: 'sm' }) + '<span class="ellipsis">' + esc(BT.shortName(r)) + '</span><span class="ck">' + ic('check') + '</span></button>').join('') + '</div>'
          : '<div class="alert info">' + ic('calendar-clock') + '<div>La asistencia se registra el día de la actividad. Podés avisar a las familias desde el portal.</div></div>'),
      foot: '<button class="btn ghost" data-close>Cerrar</button>' + (isPast ? '<button class="btn primary" data-save>' + ic('check') + 'Guardar asistencia</button>' : '<button class="btn" data-notify>' + ic('megaphone') + 'Publicar en el portal</button>'),
      onMount: (el, close) => {
        const cnt = () => { const n = el.querySelector('[data-n]'); if (n) n.textContent = sel.size; };
        el.addEventListener('click', (e) => {
          const b = e.target.closest('[data-r]'); if (b) { const id = b.dataset.r; if (sel.has(id)) sel.delete(id); else sel.add(id); b.classList.toggle('on', sel.has(id)); cnt(); }
          if (e.target.closest('[data-all]')) { res.forEach((r) => sel.add(r.id)); el.querySelectorAll('[data-r]').forEach((x) => x.classList.add('on')); cnt(); }
          if (e.target.closest('[data-save]')) {
            a.asistentes = [...sel]; BT.save(); BT.audit('Modificó', 'Asistencia a actividad', { sede: a.sede, detail: a.titulo + ' ' + u.fmtDate(a.fecha) + ' · ' + sel.size + ' asistentes' });
            close(); ui.toast('Asistencia guardada', { sub: a.titulo + ' · ' + sel.size + ' residentes' }); after && after();
          }
          if (e.target.closest('[data-notify]')) {
            BT.db.posts.push({ id: u.uid('po'), sede: a.sede, residentId: null, ts: Date.now(), autor: BT.state.user.nombre, tipo: 'Comunicado', titulo: a.titulo, texto: 'Los invitamos a acompañar la actividad «' + a.titulo + '» el ' + u.fmtDateLong(a.fecha) + ' a las ' + a.hora + ' (' + a.lugar + ').', foto: null });
            BT.save(); BT.audit('Creó', 'Comunicado a familias', { sede: a.sede, detail: a.titulo }); close(); ui.toast('Publicado en el portal de familias', { icon: 'megaphone', sub: a.titulo });
          }
        });
      },
    });
  }
  function newActivity(fecha, after) {
    const sedes = BT.state.sede === 'ALL' ? ['BT1', 'BT2'] : [BT.state.sede];
    ui.modal({
      title: 'Nueva actividad', sub: 'Se suma al calendario de la sede', icon: 'calendar-days',
      body: '<div class="form-grid">' + ui.field({ label: 'Título', name: 'titulo', required: true, full: true, placeholder: 'Ej.: Taller de cocina dulce' }) +
        ui.field({ label: 'Tipo', name: 'tipo', type: 'chips', required: true, full: true, value: 'Recreativa', options: Object.keys(TIPOS).map((t) => ({ v: t, l: t, icon: TIPOS[t].icon })) }) +
        ui.field({ label: 'Fecha', name: 'fecha', type: 'date', required: true, value: fecha || u.todayIso() }) +
        ui.field({ label: 'Hora', name: 'hora', type: 'time', required: true, value: '16:00' }) +
        ui.field({ label: 'Sede', name: 'sede', type: 'select', value: sedes[0], options: sedes }) +
        ui.field({ label: 'Lugar', name: 'lugar', value: 'Salón' }) +
        ui.field({ label: 'Responsable', name: 'responsable', full: true, value: BT.state.user.nombre }) + '</div>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>' + ic('check') + 'Agregar</button>',
      onMount: (el, close) => el.querySelector('[data-save]').addEventListener('click', () => {
        if (!ui.validate(el)) return; const f = ui.formData(el);
        const a = { id: u.uid('ac'), sede: f.sede, fecha: f.fecha, hora: f.hora, titulo: f.titulo, tipo: f.tipo, responsable: f.responsable, lugar: f.lugar, asistentes: [] };
        BT.db.activities.push(a); BT.save(); BT.audit('Creó', 'Actividad', { sede: f.sede, detail: f.titulo + ' ' + u.fmtDate(f.fecha) });
        close(); ui.toast('Actividad agregada', { sub: f.titulo + ' · ' + u.fmtDate(f.fecha) + ' ' + f.hora, icon: 'calendar-check' });
        AS().ym = f.fecha.slice(0, 7);
        if (after) after(); else if (BT.state.tab === 'actividades') BT.refresh();
      }),
    });
  }

  /* ---------------- Cumpleaños ---------------- */
  function renderBdays(host) {
    const panel = fresh(host); const now = new Date(); const mm = now.getMonth(); const y = now.getFullYear();
    const res = BT.residentsInSede();
    const thisM = res.filter((r) => u.toDate(r.nacimiento).getMonth() === mm).sort((a, b) => u.toDate(a.nacimiento).getDate() - u.toDate(b.nacimiento).getDate());
    const nextM = res.filter((r) => u.toDate(r.nacimiento).getMonth() === (mm + 1) % 12).sort((a, b) => u.toDate(a.nacimiento).getDate() - u.toDate(b.nacimiento).getDate());
    const row = (r, yy) => {
      const b = u.toDate(r.nacimiento); const when = new Date(yy, b.getMonth(), b.getDate()); const n = u.daysUntil(when); const age = yy - b.getFullYear();
      const greeted = r.saludo === yy;
      return '<div class="bd-card ' + (n === 0 ? 'today' : '') + '"><div class="bd-date"><b>' + b.getDate() + '</b><span>' + u.MESES_C[b.getMonth()] + '</span></div>' + ui.avatar(BT.fullName(r), { size: 'lg' }) +
        '<div class="grow"><div class="strong" style="font-size:var(--fs-lg)">' + esc(BT.fullName(r)) + '</div><div class="muted" style="font-size:var(--fs-sm)">' + (n < 0 ? 'Cumplió ' : n === 0 ? '¡Cumple hoy ' : 'Cumple ') + age + ' años' + (n === 0 ? '!' : '') + ' · ' + BT.sedeTag(r.sede) + ' Hab. ' + r.habitacion + r.cama + '</div></div>' +
        (n === 0 ? ui.badge('Hoy', 'danger', { icon: 'party-popper' }) : n > 0 ? ui.badge(u.relDay(when), 'outline') : '<span class="subtle" style="font-size:var(--fs-xs)">' + u.relDay(when) + '</span>') +
        (n <= 0 && n > -15 ? (greeted ? ui.badge('Saludo publicado', 'ok', { icon: 'check' }) : '<button class="btn sm soft" data-greet="' + r.id + '">' + ic('message-circle') + 'Saludar a la familia</button>') : '') + '</div>';
    };
    panel.innerHTML = '<div class="grid g-main">' + ui.card({ title: 'Cumpleaños de ' + u.MESES[mm], icon: 'cake', sub: thisM.length + ' residentes', bodyCls: 'flush', body: thisM.length ? thisM.map((r) => row(r, y)).join('') : ui.empty({ ill: 'calendar', title: 'Sin cumpleaños este mes' }) }) +
      ui.card({ title: 'Próximo mes', icon: 'calendar', sub: u.cap(u.MESES[(mm + 1) % 12]), bodyCls: 'flush', body: nextM.length ? '<div class="list">' + nextM.map((r) => { const b = u.toDate(r.nacimiento); return '<div class="li">' + ui.avatar(BT.fullName(r), { size: 'sm' }) + '<div class="grow"><div class="t">' + esc(BT.shortName(r)) + '</div><div class="d">' + b.getDate() + ' de ' + u.MESES[b.getMonth()] + ' · ' + (y + (mm === 11 ? 1 : 0) - b.getFullYear()) + ' años</div></div>' + BT.sedeTag(r.sede) + '</div>'; }).join('') + '</div>' : ui.empty({ ill: 'calendar', title: 'Sin cumpleaños' }) }) + '</div>';
    panel.addEventListener('click', (e) => {
      const g = e.target.closest('[data-greet]'); if (!g) return; const r = BT.resident(g.dataset.greet);
      BT.db.posts.push({ id: u.uid('po'), sede: r.sede, residentId: r.id, ts: Date.now(), autor: BT.state.user.nombre, tipo: 'Foto', titulo: '¡Feliz cumpleaños, ' + r.nombre.split(' ')[0] + '!', texto: 'Hoy festejamos los ' + u.age(r.nacimiento) + ' años de ' + r.nombre.split(' ')[0] + ' con torta casera, música y mucho cariño. ¡Gracias por compartir este día con nosotros!', foto: { grad: 'linear-gradient(135deg,#f2b8c6,#b5677a)', icon: 'cake', caption: 'Cumpleaños · ' + r.sede } });
      r.saludo = y; BT.save(); BT.audit('Creó', 'Saludo de cumpleaños (portal familiar)', { residentId: r.id });
      ui.toast('Saludo publicado en el portal', { icon: 'party-popper', sub: 'La familia de ' + r.nombre.split(' ')[0] + ' ya puede verlo' });
      renderBdays(host); ui.enhance(host);
    });
  }

  /* ---------------- Participación ---------------- */
  function renderPart(host) {
    const panel = fresh(host); const t = u.todayIso(); const from = u.iso(u.addDays(u.today(), -30));
    const acts = BT.bySede(BT.db.activities).filter((a) => a.fecha < t && a.fecha >= from);
    const res = BT.residentsInSede();
    const byTipo = {}; acts.forEach((a) => { const o = (byTipo[a.tipo] = byTipo[a.tipo] || { n: 0, att: 0 }); o.n++; o.att += a.asistentes.length; });
    const rows = res.map((r) => { const offered = acts.filter((a) => a.sede === r.sede).length; const att = acts.filter((a) => a.asistentes.includes(r.id)).length; const fav = Object.entries(u.groupBy(acts.filter((a) => a.asistentes.includes(r.id)), 'tipo')).sort((a, b) => b[1].length - a[1].length)[0]; return { r, offered, att, pct: offered ? (att / offered) * 100 : 0, fav: fav ? fav[0] : null }; }).sort((a, b) => a.pct - b.pct);
    const labels = Object.keys(byTipo);
    panel.innerHTML = '<div class="grid g-side">' + ui.card({ title: 'Asistencia por tipo', icon: 'chart-column', sub: 'Promedio de residentes por actividad · 30 días', body: labels.length ? '<div class="chart-box"><canvas id="actChart"></canvas></div>' : ui.empty({ ill: 'calendar', title: 'Sin actividades en el período' }) }) +
      ui.card({ title: 'Participación por residente', icon: 'users', sub: 'Últimos 30 días · los de menor participación primero', bodyCls: 'flush',
        body: ui.table([
          { label: 'Residente', render: (x) => ui.person(BT.fullName(x.r), x.r.sede + ' · Barthel ' + BT.lastBarthel(x.r)) },
          { label: 'Asistió', align: 'num', render: (x) => '<b class="num">' + x.att + '</b><span class="muted"> / ' + x.offered + '</span>' },
          { label: 'Participación', render: (x) => '<div class="row" style="min-width:140px"><div class="grow">' + ui.bar(x.pct, x.pct < 30 ? 'danger' : x.pct < 55 ? 'warn' : '', true) + '</div><b class="num" style="width:44px;text-align:right">' + Math.round(x.pct) + ' %</b></div>' },
          { label: 'Preferida', render: (x) => (x.fav ? ui.badge(x.fav, '', { icon: tipoMeta(x.fav).icon }) : '<span class="subtle">—</span>') },
          { label: '', render: (x) => (x.pct < 30 ? ui.badge('Baja participación', 'danger', { tip: 'Sugerencia: actividad individual o estimulación sensorial en sala' }) : '') },
        ], rows) }) + '</div>';
    if (labels.length) BT.chart(panel.querySelector('#actChart'), { type: 'bar', data: { labels, datasets: [{ data: labels.map((l) => +(byTipo[l].att / byTipo[l].n).toFixed(1)), backgroundColor: labels.map((l) => tipoMeta(l).color), maxBarThickness: 34 }] }, options: { indexAxis: 'y', scales: { x: { beginAtZero: true }, y: { grid: { display: false } } }, plugins: { tooltip: { callbacks: { label: (c) => c.parsed.x + ' residentes en promedio' } } } } });
  }
})();

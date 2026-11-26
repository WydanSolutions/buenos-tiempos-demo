/* ==========================================================================
   Personal — planificador de turnos 24/7, ratio de cuidadoras, legajos,
   marcas, licencias, faltas, rotación y exportación para sueldos.
   ========================================================================== */
(function () {
  'use strict';
  const BT = window.BT; const u = BT.u; const ic = BT.ic; const esc = u.esc; const ui = BT.ui;
  const SH = u.SHIFTS; const TURNOS = ['M', 'T', 'N'];
  const CARE = ['Cuidadora', 'Aux. de enfermería'];
  const SEDES = ['BT1', 'BT2'];

  /* Estado local del planificador */
  const P = { month: null, sede: null, view: 'mes', day: null, focus: null, applied: null, flash: null, root: null, tabs: null, payMonth: null, marcasMonth: null };

  /* ---------------- Feriados (Uruguay) ---------------- */
  const FER_PAGOS = { '01-01': 'Año Nuevo', '05-01': 'Día de los Trabajadores', '07-18': 'Jura de la Constitución', '08-25': 'Declaratoria de la Independencia', '12-25': 'Día de la Familia' };
  const FER_NOLAB = { '01-06': 'Día de Reyes', '04-19': 'Desembarco de los 33 Orientales', '05-18': 'Batalla de Las Piedras', '06-19': 'Natalicio de Artigas', '10-12': 'Día de la Diversidad Cultural', '11-02': 'Día de los Difuntos', '2026-02-16': 'Carnaval', '2026-02-17': 'Carnaval', '2027-02-08': 'Carnaval', '2027-02-09': 'Carnaval' };
  ['2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02', '2026-04-03', '2027-03-22', '2027-03-23', '2027-03-24', '2027-03-25', '2027-03-26'].forEach((d) => (FER_NOLAB[d] = 'Semana de Turismo'));
  function feriado(dIso) {
    const md = dIso.slice(5);
    if (FER_PAGOS[md]) return { tipo: 'pago', nombre: FER_PAGOS[md] };
    if (FER_NOLAB[dIso]) return { tipo: 'nolab', nombre: FER_NOLAB[dIso] };
    if (FER_NOLAB[md]) return { tipo: 'nolab', nombre: FER_NOLAB[md] };
    return null;
  }

  /* ---------------- Helpers ---------------- */
  const careStaff = () => BT.db.staff.filter((s) => CARE.includes(s.rol));
  const cleanName = (n) => n.replace(/^Lic\.\s*/, '');
  const firstName = (n) => cleanName(n).split(' ')[0];
  const shortName = (n) => { const p = cleanName(n).split(' '); return p[0] + ' ' + (p[1] || '').charAt(0) + '.'; };
  const sedesScope = () => (BT.state.sede === 'ALL' ? SEDES : [BT.state.sede]);
  const inScope = (s) => BT.state.sede === 'ALL' || s.sede === BT.state.sede || s.volante || s.rol === 'Lic. en Enfermería';
  const staffScope = () => BT.db.staff.filter(inScope);
  const slotIds = (d, s, t) => ((BT.db.shifts[d] || {})[s] || {})[t] || [];
  const key = (d, s, t) => d + '|' + s + '|' + t;
  const turnLabel = (t) => (SH[t] ? SH[t].label : 'Diurno');
  function ensureDay(d) { if (!BT.db.shifts[d]) BT.db.shifts[d] = { BT1: { M: [], T: [], N: [] }, BT2: { M: [], T: [], N: [] } }; return BT.db.shifts[d]; }
  function shiftStartTs(d, t) { const x = u.toDate(d); const [h, m] = SH[t].from.split(':').map(Number); x.setHours(h, m, 0, 0); return x.getTime(); }
  const shiftEndTs = (d, t) => shiftStartTs(d, t) + 8 * 3600000;
  const isPastShift = (d, t) => shiftEndTs(d, t) < Date.now();
  const isLiveShift = (d, t) => shiftStartTs(d, t) <= Date.now() && !isPastShift(d, t);
  const onLeave = (sid, d) => BT.db.leaves.find((l) => l.staffId === sid && l.estado === 'Aprobada' && l.desde <= d && l.hasta >= d);
  const absentOn = (sid, d) => BT.db.absences.find((a) => a.staffId === sid && a.fecha === d);
  const ymNow = () => u.ym(new Date());
  const monthHasData = (ym) => Object.keys(BT.db.shifts).some((k) => k.startsWith(ym));
  const daysInMonth = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
  const dayWord = (d) => { const n = u.daysBetween(u.shiftDate(), d); return n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : n === -1 ? 'Ayer' : u.cap(u.DIAS[u.toDate(d).getDay()]); };
  const canEdit = () => BT.can('shifts.edit');
  const canManage = () => BT.can('staff.manage') || BT.can('shifts.edit');
  const turnIc = (t) => ({ M: 'sunrise', T: 'sunset', N: 'moon' }[t] || 'sun');
  const yearsTxt = (d) => { const y = u.yearsSince(d); return y < 1 ? 'Menos de 1 año' : y === 1 ? '1 año' : y + ' años'; };
  const pct = (a, b) => (b ? (a / b) * 100 : 0);

  /** Motivo de un hueco: faltas y licencias de titulares de ese turno */
  function gapReason(d, s, t) {
    const abs = BT.db.absences.filter((a) => a.fecha === d && a.sede === s && a.turno === t).map((a) => cleanName(BT.staffById(a.staffId).nombre) + ' — ' + a.tipo.toLowerCase());
    const lv = careStaff().filter((x) => x.sede === s && x.turnoBase === t && onLeave(x.id, d)).map((x) => cleanName(x.nombre) + ' — de licencia');
    return abs.concat(lv);
  }
  /** Turnos por debajo del ratio desde el turno actual (sin turnos ya terminados) */
  function uncovered(days, sedes = sedesScope()) {
    const out = []; const base = u.shiftDate();
    for (let k = 0; k < days; k++) {
      const d = u.iso(u.addDays(base, k));
      sedes.forEach((s) => TURNOS.forEach((t) => { if (isPastShift(d, t)) return; const st = BT.ratioStatus(d, s, t); if (!st.ok) out.push(Object.assign({ fecha: d, sede: s, turno: t }, st)); }));
    }
    return out;
  }
  /** Aviso de descanso entre jornadas */
  function restIssue(sid, d, t) {
    const prev = u.iso(u.addDays(d, -1)), next = u.iso(u.addDays(d, 1));
    if (t === 'M' && SEDES.some((s) => slotIds(prev, s, 'N').includes(sid))) return 'Sale de noche: descanso menor a 12 h';
    if (t === 'N' && SEDES.some((s) => slotIds(next, s, 'M').includes(sid))) return 'Entra de mañana al día siguiente';
    return null;
  }
  const plannedHours = (sid, ym) => { let n = 0; Object.keys(BT.db.shifts).forEach((d) => { if (!d.startsWith(ym)) return; SEDES.forEach((s) => TURNOS.forEach((t) => { if (BT.db.shifts[d][s][t].includes(sid)) n++; })); }); return n * 8; };

  /** Candidatas para cubrir un turno, ordenadas (volante primero) */
  function candidates(d, s, t) {
    return careStaff().map((st) => {
      if (slotIds(d, s, t).includes(st.id)) return null;
      const av = BT.staffAvailability(st.id, d);
      const flags = []; let score = 0;
      if (!av.ok) score -= 100;
      if (st.volante) { flags.push({ t: 'Volante', tone: 'brand', icon: 'shuffle' }); score += 20; }
      if (av.ok && !av.libre) { flags.push({ t: 'Disponible', tone: 'ok', icon: 'circle-check' }); score += 6; }
      if (av.libre) { flags.push({ t: 'Franco · horas extra', tone: 'warn', icon: 'clock' }); score -= 6; }
      if (st.sede !== s && !st.volante) { flags.push({ t: 'Otra sede', tone: 'outline' }); score -= 2; }
      else if (st.sede === s) score += 4;
      const rest = av.ok ? restIssue(st.id, d, t) : null;
      if (rest) { flags.push({ t: rest, tone: 'warn', icon: 'triangle-alert' }); score -= 12; }
      const hrs = plannedHours(st.id, u.ym(d));
      score -= hrs / 200;
      return { st, av, flags, score, hrs };
    }).filter(Boolean).sort((a, b) => b.score - a.score);
  }

  /* ---------------- Mutaciones ---------------- */
  function assign(sid, d, s, t, from) {
    if (!canEdit()) { ui.toast('Sin permiso para editar turnos', { type: 'warn', sub: 'Solo Dirección y Enfermería pueden reasignar.' }); return false; }
    if (isPastShift(d, t)) { ui.toast('Ese turno ya terminó', { type: 'warn', sub: 'Los turnos pasados quedan como registro y no se modifican.' }); return false; }
    if (from && from.d === d && from.s === s && from.t === t) return false;
    const st = BT.staffById(sid); const nm = cleanName(st.nombre);
    const lv = onLeave(sid, d); if (lv) { ui.toast(nm + ' está de licencia', { type: 'danger', sub: 'Del ' + u.fmtDate(lv.desde) + ' al ' + u.fmtDate(lv.hasta) }); return false; }
    const ab = absentOn(sid, d); if (ab) { ui.toast(nm + ' tiene una falta registrada', { type: 'danger', sub: ab.tipo + ' · ' + u.fmtDate(d) }); return false; }
    const day = ensureDay(d);
    for (const ss of SEDES) for (const tt of TURNOS) {
      if (day[ss][tt].includes(sid) && !(from && from.d === d && from.s === ss && from.t === tt)) { ui.toast(nm + ' ya trabaja ese día', { type: 'warn', sub: 'Asignada a ' + ss + ' · ' + turnLabel(tt) + '. Arrastrá desde ese turno para moverla.' }); return false; }
    }
    const avBefore = BT.staffAvailability(sid, d);
    const before = BT.ratioStatus(d, s, t);
    if (from) { const fd = ensureDay(from.d); fd[from.s][from.t] = fd[from.s][from.t].filter((x) => x !== sid); }
    day[s][t].push(sid);
    BT.save();
    BT.audit(from ? 'Reasignó turno' : 'Asignó turno', 'Turno ' + turnLabel(t).toLowerCase() + ' ' + s + ' · ' + u.fmtDate(d), { sede: s, detail: st.nombre + (from ? ' (desde ' + from.s + ' · ' + turnLabel(from.t) + ' ' + u.fmtDate(from.d) + ')' : '') });
    const after = BT.ratioStatus(d, s, t);
    const fixed = !before.ok && after.ok;
    P.flash = { k: key(d, s, t), sid };
    if (fixed) {
      ui.toast('Ratio cubierto', { sub: turnLabel(t) + ' ' + s + ' · ' + u.fmtDate(d) + ' · ' + after.assigned + ' de ' + after.required + ' cuidadoras', icon: 'shield-check' });
      if (P.focus && key(P.focus.d, P.focus.s, P.focus.t) === key(d, s, t)) P.focus = null;
    } else ui.toast(firstName(st.nombre) + ' asignada', { sub: turnLabel(t) + ' ' + s + ' · ' + u.fmtDate(d), icon: 'user-check' });
    if (avBefore.libre) setTimeout(() => ui.toast('Día de franco', { type: 'info', sub: 'Se registrará como horas extra en la preliquidación.', icon: 'clock' }), 400);
    if (from && !isPastShift(from.d, from.t)) { const fs = BT.ratioStatus(from.d, from.s, from.t); if (!fs.ok) setTimeout(() => ui.toast('Atención: quedó un turno descubierto', { type: 'warn', sub: turnLabel(from.t) + ' ' + from.s + ' · ' + u.fmtDate(from.d) + ' (' + fs.assigned + ' de ' + fs.required + ')' }), 600); }
    afterChange(fixed ? key(d, s, t) : null);
    return true;
  }
  function unassign(sid, d, s, t) {
    if (!canEdit()) { ui.toast('Sin permiso para editar turnos', { type: 'warn' }); return; }
    if (isPastShift(d, t)) { ui.toast('Ese turno ya terminó', { type: 'warn' }); return; }
    const day = ensureDay(d); day[s][t] = day[s][t].filter((x) => x !== sid); BT.save();
    const st = BT.staffById(sid);
    BT.audit('Quitó de turno', 'Turno ' + turnLabel(t).toLowerCase() + ' ' + s + ' · ' + u.fmtDate(d), { sede: s, detail: st.nombre });
    const after = BT.ratioStatus(d, s, t);
    if (!after.ok) ui.toast('Turno por debajo del ratio', { type: 'warn', sub: turnLabel(t) + ' ' + s + ' · ' + after.assigned + ' de ' + after.required });
    else ui.toast(firstName(st.nombre) + ' quitada del turno', { icon: 'user-minus', type: 'info' });
    afterChange(null);
  }
  function afterChange(fixedKey) {
    const go = () => { redraw(); BT.shell.updateNav(); };
    if (fixedKey && P.root) {
      const al = P.root.querySelector('.alert[data-akey="' + fixedKey + '"]');
      if (al) { al.classList.add('leaving'); setTimeout(go, 400); return; }
    }
    go();
  }
  function redraw() {
    if (P.root && document.body.contains(P.root)) drawPlanner(P.root);
    const k = document.getElementById('plKpis'); if (k) { k.innerHTML = kpisHtml(); ui.enhance(k, { quiet: true }); }
    const c = document.querySelector('.tabs [data-st="ratio"] .count'); if (c) { const n = uncovered(14).length; c.textContent = n; c.style.display = n ? '' : 'none'; }
  }

  /** Genera un mes con una plantilla de rotación */
  function generateMonth(ym, sedes, tpl) {
    const [y, m] = ym.split('-').map(Number); const nd = daysInMonth(ym);
    const req = BT.ratioRequired(); const care = careStaff(); let n = 0;
    const firstOff = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    for (let k = 1; k <= nd; k++) {
      const dt = new Date(y, m - 1, k); const d = u.iso(dt); const dow = dt.getDay(); const day = ensureDay(d);
      sedes.forEach((s) => (day[s] = { M: [], T: [], N: [] }));
      const busy = new Set(); SEDES.forEach((s) => { if (!sedes.includes(s)) TURNOS.forEach((t) => day[s][t].forEach((x) => busy.add(x))); });
      const week = Math.floor((k - 1 + firstOff) / 7);
      const off = (st, i) => (tpl === '4x2' ? (k + i * 2) % 6 >= 4 : st.offDow === dow);
      const avail = (st, i) => !off(st, i) && !onLeave(st.id, d) && !absentOn(st.id, d) && !busy.has(st.id);
      sedes.forEach((s) => care.forEach((st, i) => {
        if (st.sede !== s || !TURNOS.includes(st.turnoBase) || !avail(st, i)) return;
        const t = tpl === 'rot' ? TURNOS[(TURNOS.indexOf(st.turnoBase) + week) % 3] : st.turnoBase;
        day[s][t].push(st.id); busy.add(st.id); n++;
      }));
      sedes.forEach((s) => ['N', 'M', 'T'].forEach((t) => {
        while (day[s][t].length < req[s][t]) {
          const i = care.findIndex((st, j) => avail(st, j) && ((st.turnoBase === 'X' && st.sede === s && t !== 'N') || st.volante));
          if (i < 0) break; day[s][t].push(care[i].id); busy.add(care[i].id); n++;
        }
      }));
      sedes.forEach((s) => care.forEach((st, i) => { if (st.turnoBase === 'X' && st.sede === s && avail(st, i)) { day[s].M.push(st.id); busy.add(st.id); n++; } }));
    }
    return n;
  }

  /* ---------------- CSS del módulo ---------------- */
  BT.addCSS('personal', `
  .pl-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;margin-bottom:14px}
  .pl-bar .mnav{display:flex;align-items:center;gap:2px;margin:0 auto}
  .pl-bar .mlabel{min-width:220px;text-align:center;font-weight:650;color:var(--ink-950);font-size:var(--fs-lg);letter-spacing:-.01em}
  .pl-bar .mlabel small{display:block;font-size:var(--fs-xs);color:var(--ink-500);font-weight:500;letter-spacing:0}
  .pl-pool{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:10px 12px;border:1px dashed var(--line-strong);border-radius:var(--r-md);background:var(--surface-2);margin-bottom:12px;min-height:50px;transition:all var(--d) var(--ease)}
  .pl-pool .pool-l{font-size:var(--fs-xs);font-weight:650;color:var(--ink-500);text-transform:uppercase;letter-spacing:.05em;margin-right:6px;display:inline-flex;gap:6px;align-items:center}
  .pl-root.is-dragging .pl-pool{border-color:var(--danger-line);background:var(--danger-bg)}
  .pl-root.is-dragging .pl-pool .pool-l{color:var(--danger)}
  .pl-pool .pool-drop{display:none;font-size:var(--fs-xs);font-weight:600;color:var(--danger);margin-left:auto}
  .pl-root.is-dragging .pl-pool .pool-drop{display:inline-flex;gap:5px;align-items:center}
  .pl-legend{display:flex;gap:14px;flex-wrap:wrap;align-items:center;font-size:var(--fs-xs);color:var(--ink-500);margin:0 0 10px}
  .pl-legend span{display:inline-flex;gap:6px;align-items:center}
  .pl-cal .day{min-height:0;padding:6px;gap:3px}
  .pl-cal .day .dn{margin-bottom:1px}
  .pl-cal .day .dn button{border:0;background:transparent;font:inherit;font-weight:700;color:var(--ink-600);padding:1px 7px;border-radius:99px;cursor:pointer;transition:background var(--d-fast)}
  .pl-cal .day .dn button:hover{background:var(--brand-50);color:var(--brand-800)}
  .pl-cal .day.today .dn button{background:var(--brand-600);color:#fff}
  .pl-cal .day .fer{font-size:9.5px;font-weight:700;color:var(--violet);background:var(--violet-bg);padding:0 6px;border-radius:99px;max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mslot{display:flex;align-items:flex-start;gap:4px;padding:3px 4px;border-radius:7px;border:1px solid transparent;background:var(--surface-2);min-height:26px;cursor:pointer;transition:background var(--d-fast),border-color var(--d-fast),box-shadow var(--d-fast)}
  .mslot:hover{border-color:var(--line-strong);background:#fff}
  .mslot .mt{flex:none;width:16px;height:16px;border-radius:5px;display:grid;place-items:center;font-size:9.5px;font-weight:800;margin-top:2px}
  .t-M{background:#fdf0d9;color:#8a5a0c}.t-T{background:#ece9f6;color:#55408a}.t-N{background:#2f3a44;color:#dfe7ee}
  .mslot .chips{display:flex;flex-wrap:wrap;gap:3px;flex:1;min-width:0}
  .mslot .cnt{flex:none;font-size:10px;font-weight:700;color:var(--ink-400);font-variant-numeric:tabular-nums;margin-top:3px}
  .mslot.bad{border-color:var(--danger-line);background:var(--danger-bg)}
  .mslot.bad .cnt{color:var(--danger)}
  .mslot .drag-chip{padding:1px 6px 1px 1px;font-size:10.5px;gap:4px;box-shadow:none;max-width:100%;min-width:0}
  .mslot .drag-chip > span:not(.avatar){overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
  .mslot .drag-chip .avatar{--av:16px;font-size:7.5px}
  .pl-cal .day{container-type:inline-size;min-width:0}
  @container (max-width:150px){.mslot .drag-chip > span:not(.avatar){display:none}.mslot .drag-chip{padding:1px;border-radius:50%}.mslot .chips{gap:2px}}
  .pl-day.past{opacity:.66}
  .pl-day.past .mslot{cursor:default}
  .pl-day.past .mslot.bad{background:var(--surface-2);border-color:transparent}
  .pl-day.past .mslot.bad .cnt{color:var(--ink-400)}
  .focus-pulse{animation:plFocus 1.6s ease-out infinite;border-color:var(--danger)!important}
  @keyframes plFocus{0%{box-shadow:0 0 0 0 rgba(180,53,43,.45)}70%{box-shadow:0 0 0 14px rgba(180,53,43,0)}100%{box-shadow:0 0 0 0 rgba(180,53,43,0)}}
  .just-ok{animation:plOk 1.2s var(--ease-out)}
  @keyframes plOk{0%{box-shadow:0 0 0 0 rgba(47,125,74,.55);transform:scale(1.01)}100%{box-shadow:0 0 0 18px rgba(47,125,74,0);transform:none}}
  .slot-card{display:flex;flex-direction:column;overflow:hidden}
  .slot-card.bad{border-color:var(--danger-line);background:linear-gradient(180deg,var(--danger-bg),#fff 60%)}
  .slot-card.good{border-color:var(--ok-line)}
  .slot-card.past{opacity:.7}
  .slot-card .sc-h{display:flex;align-items:center;gap:12px;padding:16px 18px 10px}
  .slot-card .sc-ic{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;flex:none}
  .slot-card .sc-ic.M{background:#fdf0d9;color:#8a5a0c}.slot-card .sc-ic.T{background:#ece9f6;color:#55408a}.slot-card .sc-ic.N{background:#2f3a44;color:#e7edf2}
  .slot-card .sc-t{font-weight:700;font-size:var(--fs-lg);color:var(--ink-950);line-height:1.2}
  .slot-card .sc-s{font-size:var(--fs-xs);color:var(--ink-500)}
  .slot-card .sc-count{margin-left:auto;text-align:right}
  .slot-card .sc-count b{font-size:26px;letter-spacing:-.03em;font-variant-numeric:tabular-nums;color:var(--ink-950);line-height:1}
  .slot-card .sc-count b small{font-size:14px;color:var(--ink-400);font-weight:600}
  .slot-card.bad .sc-count b{color:var(--danger)}
  .slot-card .sc-bar{padding:0 18px 10px}
  .slot-card .sc-b{padding:4px 14px 14px;display:flex;flex-direction:column;gap:8px;min-height:160px;flex:1}
  .slot-person{display:flex;align-items:center;gap:10px;padding:8px 8px 8px 10px;border:1px solid var(--line);border-radius:var(--r-md);background:#fff;box-shadow:var(--sh-1);transition:box-shadow var(--d-fast),transform var(--d-fast)}
  .slot-person[draggable="true"]{cursor:grab}
  .slot-person:hover{box-shadow:var(--sh-2);transform:translateY(-1px)}
  .slot-person.just-in{animation:pop 520ms var(--ease-spring)}
  .slot-empty{border:2px dashed var(--line-strong);border-radius:var(--r-md);display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center;text-align:center;color:var(--ink-400);font-size:var(--fs-sm);padding:16px;flex:1;min-height:56px}
  .slot-card.bad .slot-empty{border-color:var(--danger-line);color:var(--danger);background:rgba(255,255,255,.6)}
  .cand{display:flex;align-items:center;gap:12px;padding:11px 20px;border-bottom:1px solid var(--ink-100);transition:background var(--d-fast)}
  .cand[draggable="true"]{cursor:grab}
  .cand:hover{background:var(--ink-50)}
  .cand:last-child{border-bottom:0}
  .cand .grip{color:var(--ink-300);flex:none}
  .cand.off{opacity:.55}
  .cand.top{background:linear-gradient(90deg,var(--brand-50),transparent 70%)}
  .cand .flags{display:flex;gap:5px;flex-wrap:wrap;margin-top:3px}
  .mx-wrap{overflow:auto;border:1px solid var(--line);border-radius:var(--r-lg);background:#fff;box-shadow:var(--sh-1);max-height:70vh}
  .mx{border-collapse:separate;border-spacing:0;font-size:11.5px;min-width:100%}
  .mx th,.mx td{padding:0;text-align:center;border-bottom:1px solid var(--ink-100);border-right:1px solid var(--ink-100);height:34px;min-width:31px}
  .mx thead th{position:sticky;top:0;background:var(--surface-2);z-index:2;font-size:10.5px;color:var(--ink-500);font-weight:600;padding:4px 2px;line-height:1.2}
  .mx thead th b{display:block;font-size:11.5px;color:var(--ink-800)}
  .mx .who{position:sticky;left:0;background:#fff;z-index:1;text-align:left;padding:4px 12px;min-width:220px}
  .mx thead .who{z-index:3;background:var(--surface-2)}
  .mx .we{background:#fbfaf7}
  .mx th.tdy{background:var(--brand-50)}.mx th.tdy b{color:var(--brand-700)}
  .mx td.tdy{box-shadow:inset 1px 0 0 var(--brand-200),inset -1px 0 0 var(--brand-200)}
  .mx td.cl{cursor:pointer}.mx td.cl:hover{background:var(--brand-50)}
  .cx{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:6px;font-weight:750;font-size:10.5px}
  .cx.M{background:#fdf0d9;color:#8a5a0c}.cx.T{background:#ece9f6;color:#55408a}.cx.N{background:#2f3a44;color:#e7edf2}
  .cx.o2{outline:1.5px dashed var(--ink-300);outline-offset:-1px}
  .cx.L{background:var(--ok-bg);color:var(--ok);border:1px solid var(--ok-line)}.cx.F{background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger-line)}.cx.o{color:var(--ink-300)}
  .mx tr.cov td{background:var(--surface-2);font-weight:700;font-size:10.5px;color:var(--ink-500);font-variant-numeric:tabular-nums}
  .mx tr.cov td.who{background:var(--surface-2);font-size:11px;color:var(--ink-700)}
  .mx tr.cov td.bad{color:var(--danger);background:var(--danger-bg)}
  .mx tr.cov:first-of-type td{border-top:2px solid var(--line-strong)}
  .gt{border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden;background:#fff}
  .gt-row{display:grid;grid-template-columns:230px 1fr;align-items:center;border-bottom:1px solid var(--ink-100);min-height:44px}
  .gt-row:last-child{border-bottom:0}
  .gt-row .gt-who{padding:6px 14px;border-right:1px solid var(--ink-100)}
  .gt-months{display:grid;grid-template-columns:repeat(12,1fr);font-size:10.5px;font-weight:650;color:var(--ink-500);text-transform:uppercase;letter-spacing:.04em}
  .gt-months span{padding:9px 6px;border-left:1px solid var(--ink-100)}
  .gt-head{background:var(--surface-2);position:sticky;top:0}
  .gt-track{position:relative;height:44px;background-image:linear-gradient(90deg,var(--ink-100) 1px,transparent 1px);background-size:calc(100%/12) 100%}
  .gt-bar{position:absolute;top:12px;height:20px;border-radius:6px;background:linear-gradient(90deg,var(--brand-500),var(--brand-600));box-shadow:0 2px 6px -2px color-mix(in srgb, var(--brand-600) 50%, transparent);font-size:10px;font-weight:600;color:#fff;padding:0 6px;display:flex;align-items:center;white-space:nowrap;overflow:hidden;transform-origin:left;animation:barGrow .8s var(--ease-out) both;min-width:6px}
  .gt-bar.pend{background:repeating-linear-gradient(-45deg,#e7b35a,#e7b35a 6px,#efc77f 6px,#efc77f 12px);color:#5c3a05;box-shadow:none}
  .gt-bar.oth{background:linear-gradient(90deg,#8494a8,#66778c);box-shadow:none}
  .gt-today{position:absolute;top:0;bottom:0;width:2px;background:var(--danger);opacity:.55;z-index:2}
  .gt-heat{display:flex;height:16px;gap:1px;padding:0 0}
  .gt-heat i{flex:1;border-radius:2px;background:var(--ink-100)}
  .gt-heat i.h1{background:var(--brand-200)}.gt-heat i.h2{background:#f0c47a}.gt-heat i.h3{background:#e0796d}
  .tmpl{display:flex;gap:12px;align-items:flex-start;text-align:left;padding:14px;border-radius:var(--r-md);border:1px solid var(--line);background:#fff;transition:all var(--d) var(--ease);width:100%}
  .tmpl:hover{border-color:var(--brand-300);box-shadow:var(--sh-2)}
  .tmpl.on{border-color:var(--brand-500);box-shadow:0 0 0 3px var(--brand-50);background:linear-gradient(180deg,var(--brand-50),#fff)}
  .tmpl .pat{display:flex;gap:2px;margin-top:8px}
  .tmpl .pat i{width:14px;height:14px;border-radius:4px;font-style:normal;font-size:8.5px;font-weight:800;display:grid;place-items:center}
  .ratio-cell{display:inline-flex;align-items:center;gap:5px;font-weight:650;font-variant-numeric:tabular-nums;padding:3px 9px;border-radius:99px;font-size:var(--fs-sm);cursor:pointer;border:1px solid transparent;transition:transform var(--d-fast)}
  .ratio-cell:hover{transform:translateY(-1px)}
  .ratio-cell.ok{background:var(--ok-bg);color:var(--ok)}.ratio-cell.bad{background:var(--danger-bg);color:var(--danger);border-color:var(--danger-line)}.ratio-cell.past{background:var(--ink-100);color:var(--ink-400)}
  .formula{font-family:ui-monospace,"Cascadia Code",Consolas,monospace;font-size:12.5px;background:var(--ink-50);border:1px solid var(--line);border-radius:var(--r-md);padding:12px 14px;line-height:1.7}
  .num-in{width:76px;text-align:center;font-weight:650;font-variant-numeric:tabular-nums}
  @media (max-width:900px){.pl-bar .mnav{margin:0}}
  `);

  /* ---------------- Página ---------------- */
  BT.tab({
    id: 'personal', label: 'Personal', icon: 'id-card', group: 'gestion', order: 6, roles: ['direccion', 'administracion', 'enfermeria'],
    badge: () => { const d0 = u.shiftDate(); const d1 = u.iso(u.addDays(d0, 1)); return uncovered(2).filter((x) => x.fecha === d0 || x.fecha === d1).length; },
    render(el, params) {
      if (params && params !== P.applied && (params.fecha || params.sub || params.staffId)) {
        P.applied = params;
        if (params.fecha) {
          BT.state.sub.personal = 'planificador';
          if (params.sede) P.sede = params.sede;
          P.view = 'dia'; P.day = params.fecha; P.month = params.fecha.slice(0, 7);
          P.focus = params.turno ? { d: params.fecha, s: params.sede || P.sede, t: params.turno } : null;
        }
        if (params.sub) BT.state.sub.personal = params.sub;
        if (params.staffId) setTimeout(() => openStaff(params.staffId), 250);
      }
      initPlanner();
      const scope = staffScope();
      const exp = ui.exportMenu([
        { id: 'pdf-plan', label: 'Planificación de turnos y licencias', sub: 'PDF · A4 horizontal', icon: 'file-text' },
        { id: 'pdf-ratio', label: 'Informe de ratio de cuidadoras', sub: 'PDF · próximos 14 días', icon: 'file-text' },
        '-',
        { id: 'xlsx-sueldos', label: 'Exportación para sueldos', sub: 'Excel · preliquidación del mes', icon: 'file-spreadsheet' },
        { id: 'csv-sueldos', label: 'Exportación para sueldos', sub: 'CSV (separado por ;)', icon: 'file-down' },
      ]);
      el.innerHTML = ui.pageHeader({
        eyebrow: 'Recursos humanos', icon: 'id-card', title: 'Personal',
        sub: scope.length + ' funcionarias · ' + esc(BT.sedeName()) + ' · turnos rotativos 24/7',
        actions: (canManage() ? '<button class="btn" data-act="new-abs">' + ic('calendar-x') + 'Registrar falta</button>' : '') + exp,
      }) + '<div class="grid g-4 stagger" id="plKpis">' + kpisHtml() + '</div><div class="mt-24" id="plTabs"></div>';
      ui.on(el, {
        'new-abs': () => absenceModal(),
        export: (t) => doExport(t.dataset.id),
      });
      const n14 = uncovered(14).length;
      P.tabs = ui.subtabs(el.querySelector('#plTabs'), 'personal', [
        { id: 'planificador', label: 'Planificador', icon: 'calendar-days' },
        { id: 'ratio', label: 'Control del ratio', icon: 'gauge', count: n14 || '' },
        { id: 'legajo', label: 'Legajos', icon: 'folder-open' },
        { id: 'marcas', label: 'Marcas y horas', icon: 'clock' },
        { id: 'licencias', label: 'Licencias', icon: 'umbrella' },
        { id: 'faltas', label: 'Faltas', icon: 'calendar-x' },
        { id: 'rotacion', label: 'Rotación', icon: 'repeat' },
        { id: 'sueldos', label: 'Sueldos', icon: 'banknote' },
      ], (panel, id) => RENDER[id](panel));
    },
  });

  function initPlanner() {
    if (BT.state.sede !== 'ALL') P.sede = BT.state.sede;
    if (!P.sede || !SEDES.includes(P.sede)) { const unc = uncovered(1, SEDES); P.sede = unc.length ? unc[0].sede : 'BT1'; }
    if (!P.month) P.month = ymNow();
    if (!P.day) P.day = u.shiftDate();
  }

  function kpisHtml() {
    const sedes = sedesScope(); const d = u.shiftDate(); const cur = u.currentShift();
    const dot = staffScope().filter((s) => CARE.includes(s.rol)).length;
    const enTurno = sedes.reduce((n, s) => n + slotIds(d, s, cur).length, 0);
    let tot = 0, ok = 0; sedes.forEach((s) => TURNOS.forEach((t) => { if (isPastShift(d, t)) return; tot++; if (BT.ratioStatus(d, s, t).ok) ok++; }));
    const todayIso = u.todayIso();
    const lic = BT.db.leaves.filter((l) => l.estado === 'Aprobada' && l.desde <= todayIso && l.hasta >= todayIso && inScope(BT.staffById(l.staffId))).length;
    const carnes = staffScope().filter((s) => u.daysUntil(s.carneSalud.vence) <= 30).length;
    return ui.kpi({ label: 'Dotación de cuidado', value: dot, icon: 'users', foot: 'Cuidadoras y auxiliares' + (BT.state.sede !== 'ALL' ? ' (incluye volante)' : '') }) +
      ui.kpi({ label: 'En turno ahora', value: enTurno, icon: turnIc(cur), tone: 'info', foot: ui.live('Turno ' + turnLabel(cur).toLowerCase()) }) +
      ui.kpi({ label: 'Turnos de hoy en ratio', value: ok, suffix: '/ ' + tot, icon: ok < tot ? 'shield-alert' : 'shield-check', tone: ok < tot ? 'danger' : '', foot: ok < tot ? '<span class="t-danger strong">' + (tot - ok) + ' por debajo del mínimo</span>' : 'Todos cubiertos' }) +
      ui.kpi({ label: 'Carnés de salud por vencer', value: carnes, icon: 'badge-check', tone: carnes ? 'warn' : '', foot: lic + ' de licencia hoy' });
  }

  const RENDER = {};

  /* ==========================================================================
     1) PLANIFICADOR
     ========================================================================== */
  RENDER.planificador = function (panel) {
    initPlanner();
    panel.innerHTML = '<div class="pl-root"></div>';
    const root = panel.querySelector('.pl-root'); P.root = root;
    let drag = null;
    root.addEventListener('dragstart', (e) => {
      const c = e.target.closest('[draggable="true"][data-sid]'); if (!c) return;
      drag = { sid: c.dataset.sid, from: c.dataset.from ? (([d, s, t]) => ({ d, s, t }))(c.dataset.from.split('|')) : null };
      try { e.dataTransfer.setData('text/plain', c.dataset.sid); e.dataTransfer.effectAllowed = 'move'; } catch (er) { }
      c.classList.add('dragging'); root.classList.add('is-dragging');
    });
    root.addEventListener('dragend', (e) => {
      const c = e.target.closest('[data-sid]'); if (c) c.classList.remove('dragging');
      root.classList.remove('is-dragging'); root.querySelectorAll('.dz.over').forEach((z) => z.classList.remove('over')); drag = null;
    });
    root.addEventListener('dragover', (e) => {
      const z = e.target.closest('.dz'); if (!z || !drag) return;
      if (z.dataset.locked) return;
      e.preventDefault(); try { e.dataTransfer.dropEffect = 'move'; } catch (er) { }
      if (!z.classList.contains('over')) { root.querySelectorAll('.dz.over').forEach((x) => x.classList.remove('over')); z.classList.add('over'); }
    });
    root.addEventListener('dragleave', (e) => { const z = e.target.closest('.dz'); if (z && !z.contains(e.relatedTarget)) z.classList.remove('over'); });
    root.addEventListener('drop', (e) => {
      const z = e.target.closest('.dz'); if (!z || !drag) return; e.preventDefault();
      z.classList.remove('over'); root.classList.remove('is-dragging');
      const dd = drag; drag = null;
      if (z.dataset.pool) { if (dd.from) unassign(dd.sid, dd.from.d, dd.from.s, dd.from.t); return; }
      assign(dd.sid, z.dataset.d, z.dataset.s, z.dataset.t, dd.from);
    });
    root.addEventListener('keydown', (e) => { const t = e.target.closest('[data-act][tabindex]'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); t.click(); } });
    root.addEventListener('segchange', (e) => {
      if (e.detail.name === 'pl-sede') { P.sede = e.detail.value; P.focus = null; }
      if (e.detail.name === 'pl-view') { P.view = e.detail.value; if (P.view === 'dia' && !P.day.startsWith(P.month)) P.day = P.month === ymNow() ? u.shiftDate() : P.month + '-01'; }
      drawPlanner(root);
    });
    ui.on(root, {
      nav: (t) => {
        const dir = +t.dataset.dir;
        if (P.view === 'dia') { P.day = u.iso(u.addDays(P.day, dir)); P.month = P.day.slice(0, 7); }
        else { const nm = u.ym(u.addMonths(P.month, dir)); if (nm < minMonth() || nm > maxMonth()) { ui.toast(dir < 0 ? 'No hay planificación anterior' : 'Máximo 2 meses hacia adelante', { type: 'info' }); return; } P.month = nm; }
        drawPlanner(root);
      },
      today: () => { P.month = ymNow(); P.day = u.shiftDate(); drawPlanner(root); },
      'day-open': (t) => { P.view = 'dia'; P.day = t.dataset.d; P.month = P.day.slice(0, 7); drawPlanner(root); },
      slot: (t) => openSlot(t.dataset.d, t.dataset.s, t.dataset.t),
      assign: (t) => assign(t.dataset.sid, t.dataset.d, t.dataset.s, t.dataset.t, null),
      unassign: (t, e) => { e.stopPropagation(); unassign(t.dataset.sid, t.dataset.d, t.dataset.s, t.dataset.t); },
      templates: () => templatesModal(),
      swaps: () => swapsModal(),
      'focus-cands': () => { const c = root.querySelector('#plCands'); if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); ui.flash(c); } },
    });
    drawPlanner(root);
  };
  const minMonth = () => Object.keys(BT.db.shifts).sort()[0].slice(0, 7);
  const maxMonth = () => u.ym(u.addMonths(new Date(), 2));

  function drawPlanner(root) {
    const html = toolbar() + (P.view === 'dia' ? dayView() : P.view === 'planilla' ? matrixView() : monthView());
    root.innerHTML = html;
    root.querySelectorAll('.seg').forEach((s) => requestAnimationFrame(() => ui.moveInd(s)));
    if (P.flash) {
      const f = P.flash; P.flash = null;
      const el = root.querySelector('[data-slotkey="' + f.k + '"]');
      if (el) { el.classList.add('just-ok'); const c = el.querySelector('[data-sid="' + f.sid + '"]'); if (c) c.classList.add('just-in'); }
    }
    const fc = root.querySelector('.focus-pulse');
    if (fc && !root.dataset.scrolled) { root.dataset.scrolled = '1'; setTimeout(() => fc.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350); }
  }

  function toolbar() {
    const sedeSeg = BT.state.sede === 'ALL'
      ? ui.seg('pl-sede', [{ id: 'BT1', label: 'BT1', dot: BT.COLORS.BT1 }, { id: 'BT2', label: 'BT2', dot: BT.COLORS.BT2 }], P.sede, 'sm')
      : BT.sedeTag(P.sede);
    const viewSeg = ui.seg('pl-view', [{ id: 'mes', label: 'Mes', icon: 'calendar-days' }, { id: 'planilla', label: 'Planilla', icon: 'table' }, { id: 'dia', label: 'Día', icon: 'calendar-check' }], P.view, 'sm');
    const label = P.view === 'dia'
      ? u.cap(u.DIAS[u.toDate(P.day).getDay()]) + ' ' + u.toDate(P.day).getDate() + ' de ' + u.MESES[u.toDate(P.day).getMonth()] + '<small>' + dayWord(P.day) + ' · ' + BT.sedeName(P.sede) + '</small>'
      : u.cap(u.fmtMonth(P.month)) + '<small>' + BT.sedeName(P.sede) + '</small>';
    const pend = BT.db.swaps.filter((s) => s.estado === 'Pendiente' && (BT.state.sede === 'ALL' || s.sede === BT.state.sede)).length;
    return '<div class="card pl-bar">' + sedeSeg + viewSeg +
      '<div class="mnav"><button class="icon-btn ghost sm" data-act="nav" data-dir="-1" aria-label="Anterior">' + ic('chevron-left') + '</button><div class="mlabel">' + label + '</div><button class="icon-btn ghost sm" data-act="nav" data-dir="1" aria-label="Siguiente">' + ic('chevron-right') + '</button></div>' +
      '<button class="btn ghost sm" data-act="today">Hoy</button>' +
      '<button class="btn sm" data-act="templates">' + ic('layers') + 'Plantillas</button>' +
      '<button class="btn sm" data-act="swaps">' + ic('arrow-left-right') + 'Cambios' + (pend ? '<span class="badge warn" style="height:18px;padding:0 6px">' + pend + '</span>' : '') + '</button></div>';
  }

  function chip(st, from, editable) {
    return '<span class="drag-chip" ' + (editable ? 'draggable="true"' : '') + ' data-sid="' + st.id + '" data-from="' + (from || '') + '" data-tip="' + esc(cleanName(st.nombre) + ' · ' + st.rol + (st.volante ? ' (volante)' : '')) + '">' + ui.avatar(st.nombre, { size: 'xs' }) + '<span>' + esc(firstName(st.nombre)) + '</span></span>';
  }

  /* ---------- Vista mensual ---------- */
  function monthView() {
    const ym = P.month; const s = P.sede; const ed = canEdit();
    if (!monthHasData(ym)) {
      return '<div class="card"><div class="card-b">' + ui.empty({ ill: 'calendar', title: 'Todavía no hay planificación para ' + u.fmtMonth(ym), text: 'Aplicá una plantilla de rotación y el sistema arma el mes respetando francos, licencias y el ratio mínimo de cada turno.', action: ed ? '<button class="btn primary" data-act="templates">' + ic('sparkles') + 'Aplicar plantilla de rotación</button>' : '' }) + '</div></div>';
    }
    const [y, m] = ym.split('-').map(Number); const first = new Date(y, m - 1, 1); const off = (first.getDay() + 6) % 7;
    const nd = daysInMonth(ym); const cells = Math.ceil((off + nd) / 7) * 7; const today = u.todayIso();
    const pool = careStaff().filter((x) => x.sede === s || x.volante);
    const unc = []; for (let k = 1; k <= nd; k++) { const d = ym + '-' + u.pad(k); TURNOS.forEach((t) => { if (!isPastShift(d, t) && !BT.ratioStatus(d, s, t).ok) unc.push(d); }); }
    let h = (ed ? '<div class="pl-pool dz" data-pool="1"><span class="pool-l">' + ic('users', 'ic-xs') + 'Equipo ' + s + '</span>' + pool.map((x) => chip(x, '', true)).join('') + '<span class="pool-drop">' + ic('trash-2', 'ic-xs') + 'Soltá aquí para quitar del turno</span></div>' : '') +
      '<div class="pl-legend"><span><i class="mt t-M cx M" style="width:16px;height:16px;font-size:9px">M</i>Mañana 06–14</span><span><i class="cx T" style="width:16px;height:16px;font-size:9px">T</i>Tarde 14–22</span><span><i class="cx N" style="width:16px;height:16px;font-size:9px">N</i>Noche 22–06</span><span>' + ui.dot('danger') + 'Por debajo del ratio</span>' +
      (unc.length ? '<span class="badge danger" style="margin-left:auto">' + ic('triangle-alert') + unc.length + ' turno' + (unc.length > 1 ? 's' : '') + ' sin cubrir este mes</span>' : '<span class="badge ok" style="margin-left:auto">' + ic('shield-check') + 'Mes cubierto según ratio</span>') +
      (ed ? '<span class="subtle">' + ic('grip-vertical', 'ic-xs') + ' Arrastrá para reasignar · clic para editar</span>' : '') + '</div>' +
      '<div class="cal pl-cal">' + ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => '<div class="dow">' + d + '</div>').join('');
    for (let i = 0; i < cells; i++) {
      const dt = u.addDays(first, i - off); const d = u.iso(dt); const inM = dt.getMonth() === m - 1;
      if (!inM) { h += '<div class="day out"></div>'; continue; }
      const fer = feriado(d);
      const past = TURNOS.every((t) => isPastShift(d, t));
      h += '<div class="day pl-day ' + (d === today ? 'today ' : '') + (past ? 'past' : '') + '"><div class="dn"><button data-act="day-open" data-d="' + d + '" data-tip="Ver detalle del día">' + dt.getDate() + '</button>' + (fer ? '<span class="fer" data-tip="' + esc(fer.nombre + (fer.tipo === 'pago' ? ' (feriado pago)' : ' (no laborable)')) + '">' + esc(fer.nombre) + '</span>' : '') + '</div>';
      TURNOS.forEach((t) => {
        const st = BT.ratioStatus(d, s, t); const ids = slotIds(d, s, t); const pst = isPastShift(d, t);
        const focus = P.focus && P.focus.d === d && P.focus.s === s && P.focus.t === t && !st.ok;
        h += '<div class="mslot dz ' + (!st.ok && !pst ? 'bad ' : '') + (focus ? 'focus-pulse' : '') + '" ' + (pst ? 'data-locked="1"' : '') + ' role="button" tabindex="0" data-act="slot" data-slotkey="' + key(d, s, t) + '" data-d="' + d + '" data-s="' + s + '" data-t="' + t + '" aria-label="' + turnLabel(t) + ' ' + u.fmtDate(d) + ': ' + st.assigned + ' de ' + st.required + '">' +
          '<span class="mt t-' + t + '">' + t + '</span><span class="chips">' + ids.map((sid) => { const x = BT.staffById(sid); return x ? chip(x, key(d, s, t), ed && !pst) : ''; }).join('') + '</span><span class="cnt">' + st.assigned + '/' + st.required + '</span></div>';
      });
      h += '</div>';
    }
    return h + '</div>';
  }

  /* ---------- Vista planilla (funcionaria × días) ---------- */
  function matrixView() {
    const ym = P.month; const s = P.sede; const nd = daysInMonth(ym); const today = u.todayIso();
    if (!monthHasData(ym)) return monthView();
    const days = Array.from({ length: nd }, (_, i) => ym + '-' + u.pad(i + 1));
    const people = careStaff().filter((x) => x.sede === s || x.volante || days.some((d) => TURNOS.some((t) => slotIds(d, s, t).includes(x.id))));
    let h = '<div class="pl-legend"><span><i class="cx M" style="width:16px;height:16px;font-size:9px">M</i>Mañana</span><span><i class="cx T" style="width:16px;height:16px;font-size:9px">T</i>Tarde</span><span><i class="cx N" style="width:16px;height:16px;font-size:9px">N</i>Noche</span><span><i class="cx o2 M" style="width:16px;height:16px;font-size:9px">M</i>En la otra sede</span><span><i class="cx L" style="width:16px;height:16px;font-size:9px">L</i>Licencia</span><span><i class="cx F" style="width:16px;height:16px;font-size:9px">F</i>Falta</span><span><i class="cx o">·</i>Franco</span><span class="subtle" style="margin-left:auto">Clic en un día para ver el detalle</span></div>';
    h += '<div class="mx-wrap"><table class="mx"><thead><tr><th class="who">Funcionaria</th>' + days.map((d) => { const dt = u.toDate(d); const we = dt.getDay() === 0 || dt.getDay() === 6; return '<th class="' + (we ? 'we ' : '') + (d === today ? 'tdy' : '') + '">' + u.DIAS_C[dt.getDay()].slice(0, 2) + '<b>' + dt.getDate() + '</b></th>'; }).join('') + '<th>Hs</th></tr></thead><tbody>';
    people.forEach((p) => {
      let hrs = 0;
      h += '<tr><td class="who">' + ui.person(p.nombre, esc(p.rol) + (p.volante ? ' · Volante' : '') + (p.sede !== s ? ' · ' + p.sede : '')) + '</td>' + days.map((d) => {
        const dt = u.toDate(d); const we = dt.getDay() === 0 || dt.getDay() === 6; let c = '<span class="cx o">·</span>'; let tip = 'Franco';
        if (onLeave(p.id, d)) { c = '<span class="cx L">L</span>'; tip = 'Licencia'; }
        else if (absentOn(p.id, d)) { const a = absentOn(p.id, d); c = '<span class="cx F">F</span>'; tip = 'Falta · ' + a.tipo; }
        else for (const ss of SEDES) for (const t of TURNOS) if (slotIds(d, ss, t).includes(p.id)) { hrs += 8; c = '<span class="cx ' + t + (ss !== s ? ' o2' : '') + '">' + t + '</span>'; tip = turnLabel(t) + ' · ' + ss; }
        return '<td class="cl ' + (we ? 'we ' : '') + (d === today ? 'tdy' : '') + '" data-act="day-open" data-d="' + d + '" title="' + esc(cleanName(p.nombre) + ' · ' + u.fmtDate(d) + ' · ' + tip) + '">' + c + '</td>';
      }).join('') + '<td class="num strong">' + hrs + '</td></tr>';
    });
    TURNOS.forEach((t) => {
      h += '<tr class="cov"><td class="who">' + ic(turnIc(t), 'ic-xs') + ' Cobertura ' + turnLabel(t).toLowerCase() + '</td>' + days.map((d) => { const st = BT.ratioStatus(d, s, t); const bad = !st.ok && !isPastShift(d, t); return '<td class="' + (bad ? 'bad' : '') + '" title="' + st.assigned + ' de ' + st.required + ' requeridas">' + st.assigned + '/' + st.required + '</td>'; }).join('') + '<td></td></tr>';
    });
    return h + '</tbody></table></div>';
  }

  /* ---------- Vista de día ---------- */
  function dayView() {
    const d = P.day; const s = P.sede; const ed = canEdit(); const fer = feriado(d);
    if (!BT.db.shifts[d]) return '<div class="card"><div class="card-b">' + ui.empty({ ill: 'calendar', title: 'Sin planificación para este día', text: 'Aplicá una plantilla de rotación para generar el mes.', action: ed ? '<button class="btn primary" data-act="templates">' + ic('sparkles') + 'Plantillas de rotación</button>' : '' }) + '</div></div>';
    const gaps = TURNOS.filter((t) => !isPastShift(d, t) && !BT.ratioStatus(d, s, t).ok);
    let h = '<div class="col gap-6" style="margin-bottom:14px">';
    if (fer) h += '<div class="alert info">' + ic('party-popper') + '<div><b>' + esc(fer.nombre) + '</b> · ' + (fer.tipo === 'pago' ? 'Feriado pago: las horas trabajadas se liquidan dobles.' : 'Feriado no laborable.') + '</div></div>';
    gaps.forEach((t) => {
      const st = BT.ratioStatus(d, s, t); const why = gapReason(d, s, t);
      h += '<div class="alert danger" data-akey="' + key(d, s, t) + '">' + ic('shield-alert') + '<div class="grow"><b>Turno ' + turnLabel(t).toLowerCase() + ' ' + s + ' por debajo del ratio</b> · ' + st.assigned + ' de ' + st.required + ' cuidadoras asignadas (faltan ' + st.deficit + ').' + (why.length ? '<br><span style="opacity:.85">Motivo: ' + esc(why.join(' · ')) + '</span>' : '') + '</div>' + (ed ? '<button class="btn sm" data-act="focus-cands">' + ic('user-search') + 'Ver reemplazos</button>' : '') + '</div>';
    });
    if (!gaps.length) h += '<div class="alert ok">' + ic('shield-check') + '<div><b>Todos los turnos del día cumplen el ratio</b> · ' + BT.sedeName(s) + ' — Ord. 1032/2019 y Dto. 356/016 art. 19.</div></div>';
    h += '</div><div class="grid g-3 stagger">';
    TURNOS.forEach((t) => {
      const st = BT.ratioStatus(d, s, t); const ids = slotIds(d, s, t); const pst = isPastShift(d, t); const live = isLiveShift(d, t);
      const focus = P.focus && P.focus.d === d && P.focus.s === s && P.focus.t === t && !st.ok;
      const tone = st.ok ? '' : 'danger';
      h += '<section class="card slot-card dz ' + (!st.ok && !pst ? 'bad ' : st.ok ? 'good ' : '') + (pst ? 'past ' : '') + (focus ? 'focus-pulse' : '') + '" data-slotkey="' + key(d, s, t) + '" data-d="' + d + '" data-s="' + s + '" data-t="' + t + '" ' + (pst ? 'data-locked="1"' : '') + '>' +
        '<div class="sc-h"><span class="sc-ic ' + t + '">' + ic(turnIc(t)) + '</span><div><div class="sc-t">' + turnLabel(t) + '</div><div class="sc-s">' + SH[t].from + ' – ' + SH[t].to + (live ? ' · ' + ui.live('En curso') : pst ? ' · Finalizado' : '') + '</div></div>' +
        '<div class="sc-count"><b>' + st.assigned + '<small> / ' + st.required + '</small></b><div>' + (st.ok ? ui.badge('Cumple ratio', 'ok', { icon: 'check' }) : ui.badge('Faltan ' + st.deficit, 'danger', { icon: 'triangle-alert' })) + '</div></div></div>' +
        '<div class="sc-bar">' + ui.bar(pct(st.assigned, st.required), tone, true) + '</div><div class="sc-b">' +
        ids.map((sid) => { const x = BT.staffById(sid); if (!x) return ''; const ck = BT.db.clock.find((c) => c.staffId === sid && c.fecha === d && c.turno === t); return '<div class="slot-person" ' + (ed && !pst ? 'draggable="true"' : '') + ' data-sid="' + sid + '" data-from="' + key(d, s, t) + '">' + ui.avatar(x.nombre, { size: 'sm' }) + '<div class="grow" style="min-width:0"><div class="strong ellipsis" style="font-size:var(--fs-md)">' + esc(cleanName(x.nombre)) + '</div><div class="muted" style="font-size:var(--fs-xs)">' + esc(x.rol) + (x.volante ? ' · Volante' : '') + (ck ? ' · Entrada ' + ck.in + (ck.out ? ' · Salida ' + ck.out : '') : '') + '</div></div>' + (ed && !pst ? '<button class="icon-btn ghost sm" data-act="unassign" data-sid="' + sid + '" data-d="' + d + '" data-s="' + s + '" data-t="' + t + '" data-tip="Quitar del turno" aria-label="Quitar">' + ic('x', 'ic-sm') + '</button>' : '') + '</div>'; }).join('') +
        (st.ok ? '' : '<div class="slot-empty">' + ic(pst ? 'lock' : 'user-plus') + (pst ? 'Turno finalizado' : 'Arrastrá aquí una funcionaria') + '</div>') +
        (ed && !pst ? '<button class="btn ghost sm" style="align-self:flex-start" data-act="slot" data-d="' + d + '" data-s="' + s + '" data-t="' + t + '">' + ic('plus') + 'Agregar o quitar</button>' : '') +
        '</div></section>';
    });
    h += '</div>';
    // Reemplazos sugeridos + ausencias
    const target = P.focus && P.focus.d === d && P.focus.s === s && !BT.ratioStatus(d, s, P.focus.t).ok ? P.focus.t : gaps[0];
    let cands = '';
    if (target) {
      const cs = candidates(d, s, target); const okc = cs.filter((c) => c.av.ok); const no = cs.filter((c) => !c.av.ok);
      cands = ui.card({
        title: 'Reemplazos sugeridos', icon: 'user-search', sub: 'Para el turno ' + turnLabel(target).toLowerCase() + ' de ' + s + ' · ordenados por disponibilidad, volantes primero',
        bodyCls: 'flush', attrs: 'id="plCands"',
        body: (okc.length ? okc.map((c, i) => candRow(c, d, s, target, i === 0, ed)).join('') : ui.empty({ ill: 'search', title: 'No hay funcionarias disponibles', text: 'Considerá convocar una suplente o reorganizar turnos de otros días.' })) +
          (no.length ? '<details style="border-top:1px solid var(--line)"><summary class="muted" style="padding:10px 20px;cursor:pointer;font-size:var(--fs-sm)">No disponibles (' + no.length + ')</summary>' + no.map((c) => candRow(c, d, s, target, false, false)).join('') + '</details>' : ''),
      });
    } else {
      const free = careStaff().filter((x) => BT.staffAvailability(x.id, d).ok && (x.sede === s || x.volante));
      cands = ui.card({ title: 'Disponibles este día', icon: 'users', sub: 'Arrastrá a cualquier turno para reforzarlo', bodyCls: 'flush', attrs: 'id="plCands"',
        body: free.length ? free.map((x) => '<div class="cand" ' + (ed ? 'draggable="true"' : '') + ' data-sid="' + x.id + '" data-from="">' + (ed ? '<span class="grip">' + ic('grip-vertical', 'ic-sm') + '</span>' : '') + ui.person(x.nombre, esc(x.rol) + (x.volante ? ' · Volante' : '')) + '<span class="grow"></span>' + (BT.staffAvailability(x.id, d).libre ? ui.badge('Franco', 'warn') : ui.badge('Libre', 'ok')) + '</div>').join('') : ui.empty({ ill: 'leaf', title: 'Todo el equipo está asignado', text: 'No hay funcionarias libres para este día.' }) });
    }
    const lv = careStaff().filter((x) => onLeave(x.id, d) && (x.sede === s || x.volante));
    const ab = BT.db.absences.filter((a) => a.fecha === d && a.sede === s);
    const aus = ui.card({ title: 'Ausencias del día', icon: 'calendar-x', bodyCls: 'flush',
      body: (ab.length || lv.length) ? '<div class="list">' + ab.map((a) => { const x = BT.staffById(a.staffId); return '<div class="li"><span class="li-ic danger">' + ic('thermometer', 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(cleanName(x.nombre)) + '</div><div class="d">' + esc(a.tipo) + ' · turno ' + turnLabel(a.turno).toLowerCase() + '</div><div class="d">' + esc(a.nota || '') + '</div></div></div>'; }).join('') +
        lv.map((x) => { const l = onLeave(x.id, d); return '<div class="li"><span class="li-ic ok">' + ic('umbrella', 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(cleanName(x.nombre)) + '</div><div class="d">' + esc(l.tipo) + ' · hasta el ' + u.fmtDate(l.hasta) + '</div></div></div>'; }).join('') + '</div>'
        : ui.empty({ ill: 'leaf', title: 'Sin ausencias', text: 'Nadie de licencia ni con falta este día.' }) });
    return h + '<div class="grid g-main mt-16">' + cands + aus + '</div>';
  }
  function candRow(c, d, s, t, top, ed) {
    const x = c.st;
    return '<div class="cand ' + (top ? 'top ' : '') + (c.av.ok ? '' : 'off') + '" ' + (ed && c.av.ok ? 'draggable="true"' : '') + ' data-sid="' + x.id + '" data-from="">' +
      (ed && c.av.ok ? '<span class="grip" data-tip="Arrastrá hacia el turno">' + ic('grip-vertical', 'ic-sm') + '</span>' : '') +
      ui.avatar(x.nombre) + '<div class="grow" style="min-width:0"><div class="row gap-6"><span class="strong">' + esc(cleanName(x.nombre)) + '</span>' + BT.sedeTag(x.sede) + (top ? ui.badge('Sugerida', 'brand', { icon: 'sparkles' }) : '') + '</div>' +
      '<div class="muted" style="font-size:var(--fs-xs)">' + esc(x.rol) + ' · ' + c.hrs + ' h planificadas en el mes' + (c.av.ok ? '' : ' · <span class="t-danger">' + esc(c.av.why) + '</span>') + '</div>' +
      '<div class="flags">' + c.flags.map((f) => ui.badge(f.t, f.tone, { icon: f.icon })).join('') + '</div></div>' +
      (ed && c.av.ok ? '<button class="btn ' + (top ? 'primary' : '') + ' sm" data-act="assign" data-sid="' + x.id + '" data-d="' + d + '" data-s="' + s + '" data-t="' + t + '">' + ic('user-plus') + 'Asignar a ' + turnLabel(t).toLowerCase() + '</button>' : '') + '</div>';
  }

  /* ---------- Modal de turno (alternativa accesible al arrastre) ---------- */
  function openSlot(d, s, t) {
    const ed = canEdit() && !isPastShift(d, t);
    const draw = (el) => {
      const st = BT.ratioStatus(d, s, t); const ids = slotIds(d, s, t); const cs = candidates(d, s, t).slice(0, 8);
      el.querySelector('.modal-b').innerHTML =
        '<div class="alert ' + (st.ok ? 'ok' : 'danger') + '">' + ic(st.ok ? 'shield-check' : 'shield-alert') + '<div><b>' + st.assigned + ' de ' + st.required + ' cuidadoras</b> · ' + (st.ok ? 'el turno cumple el ratio mínimo.' : 'faltan ' + st.deficit + ' para cumplir el ratio.') + '</div></div>' +
        '<div class="sec-t mt-16">Asignadas</div>' + (ids.length ? '<div class="col gap-6">' + ids.map((sid) => { const x = BT.staffById(sid); return '<div class="slot-person">' + ui.avatar(x.nombre, { size: 'sm' }) + '<div class="grow"><div class="strong">' + esc(cleanName(x.nombre)) + '</div><div class="muted" style="font-size:var(--fs-xs)">' + esc(x.rol) + '</div></div>' + (ed ? '<button class="btn danger xs" data-rm="' + sid + '">' + ic('user-minus') + 'Quitar</button>' : '') + '</div>'; }).join('') + '</div>' : '<p class="muted">Nadie asignada.</p>') +
        (ed ? '<div class="sec-t mt-16">Agregar</div><div class="card" style="box-shadow:none">' + cs.map((c) => '<div class="cand ' + (c.av.ok ? '' : 'off') + '">' + ui.avatar(c.st.nombre, { size: 'sm' }) + '<div class="grow"><div class="strong" style="font-size:var(--fs-md)">' + esc(cleanName(c.st.nombre)) + ' ' + BT.sedeTag(c.st.sede) + '</div><div class="muted" style="font-size:var(--fs-xs)">' + esc(c.av.why) + '</div><div class="flags">' + c.flags.map((f) => ui.badge(f.t, f.tone)).join('') + '</div></div>' + (c.av.ok ? '<button class="btn sm" data-add="' + c.st.id + '">' + ic('plus') + 'Asignar</button>' : '') + '</div>').join('') + '</div>' : '');
    };
    ui.modal({
      title: 'Turno ' + turnLabel(t).toLowerCase() + ' · ' + s, sub: u.cap(u.fmtDateLong(d)) + ' · ' + SH[t].from + ' a ' + SH[t].to, icon: turnIc(t), size: 'lg',
      body: '', foot: '<button class="btn primary" data-close>Listo</button>',
      onMount: (el) => {
        draw(el);
        el.addEventListener('click', (e) => {
          const a = e.target.closest('[data-add]'); const r = e.target.closest('[data-rm]');
          if (a) { if (assign(a.dataset.add, d, s, t, null)) draw(el); }
          if (r) { unassign(r.dataset.rm, d, s, t); draw(el); }
        });
      },
    });
  }

  /* ---------- Plantillas de rotación ---------- */
  function templatesModal() {
    if (!canEdit()) { ui.toast('Solo Dirección y Enfermería aplican plantillas', { type: 'warn' }); return; }
    const TPL = [
      { id: '6x1', t: '6 × 1 · turno fijo', d: 'Cada funcionaria mantiene su turno y tiene un franco semanal fijo. La más estable para residentes con demencia.', pat: 'MMMMMM·' },
      { id: 'rot', t: 'Rotativo semanal M → T → N', d: 'El turno de cada funcionaria rota cada semana. Reparte equitativamente las noches.', pat: 'MMMTTTN' },
      { id: '4x2', t: '4 × 2', d: 'Cuatro días de trabajo y dos de descanso, con fases escalonadas para no dejar huecos.', pat: 'MMMM··M' },
    ];
    const months = [u.ym(u.addMonths(new Date(), 1)), u.ym(u.addMonths(new Date(), 2))];
    let tpl = '6x1';
    ui.modal({
      title: 'Plantillas de rotación', sub: 'Generá la planificación de un mes completo en un clic', icon: 'layers', size: 'lg',
      body: '<div class="col">' + TPL.map((x) => '<button class="tmpl ' + (x.id === tpl ? 'on' : '') + '" data-tpl="' + x.id + '"><span class="k-ic" style="width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:var(--brand-50);color:var(--brand-600);flex:none">' + ic(x.id === 'rot' ? 'repeat' : x.id === '4x2' ? 'calendar-range' : 'calendar-days') + '</span><span class="grow"><span class="strong">' + x.t + '</span><br><span class="muted" style="font-size:var(--fs-sm)">' + x.d + '</span><span class="pat">' + x.pat.split('').map((c) => c === '·' ? '<i style="background:var(--ink-100);color:var(--ink-400)">·</i>' : '<i class="t-' + c + '">' + c + '</i>').join('') + '</span></span></button>').join('') + '</div>' +
        '<div class="form-grid mt-16">' + ui.field({ label: 'Mes a planificar', name: 'mes', type: 'select', value: monthHasData(months[0]) ? months[1] : months[0], options: months.map((m) => ({ v: m, l: u.cap(u.fmtMonth(m)) + (monthHasData(m) ? ' (reemplaza la planificación actual)' : '') })) }) +
        ui.field({ label: 'Sedes', name: 'sedes', type: 'select', value: BT.state.sede === 'ALL' ? 'ALL' : BT.state.sede, options: (BT.state.sede === 'ALL' ? [{ v: 'ALL', l: 'BT1 y BT2' }] : []).concat(sedesScope().map((x) => ({ v: x, l: BT.sedeName(x) }))) }) + '</div>' +
        '<div class="alert info mt-16">' + ic('info') + '<div>Se respetan licencias aprobadas, faltas registradas y el <b>ratio mínimo</b> de cada turno. Los huecos se cubren primero con auxiliares de la sede y luego con la volante.</div></div>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-apply>' + ic('sparkles') + 'Generar planificación</button>',
      onMount: (el, close) => {
        el.addEventListener('click', (e) => { const b = e.target.closest('[data-tpl]'); if (b) { tpl = b.dataset.tpl; el.querySelectorAll('[data-tpl]').forEach((x) => x.classList.toggle('on', x === b)); } });
        el.querySelector('[data-apply]').addEventListener('click', async () => {
          const f = ui.formData(el); const sedes = f.sedes === 'ALL' ? SEDES : [f.sedes];
          if (monthHasData(f.mes)) { close(); const ok = await ui.confirm({ title: 'Reemplazar planificación', text: 'Ya existe una planificación para ' + u.fmtMonth(f.mes) + '. Se reemplazarán los turnos de ' + sedes.join(' y ') + '. ¿Continuar?', ok: 'Reemplazar', icon: 'layers' }); if (!ok) return; }
          else close();
          const n = generateMonth(f.mes, sedes, tpl); BT.save();
          BT.audit('Aplicó plantilla de rotación', 'Planificación ' + u.fmtMonth(f.mes), { detail: TPL.find((x) => x.id === tpl).t + ' · ' + sedes.join(', ') });
          let gaps = 0; const nd = daysInMonth(f.mes); for (let k = 1; k <= nd; k++) sedes.forEach((s) => TURNOS.forEach((t) => { if (!BT.ratioStatus(f.mes + '-' + u.pad(k), s, t).ok) gaps++; }));
          P.month = f.mes; P.view = 'mes'; if (!sedes.includes(P.sede)) P.sede = sedes[0];
          ui.toast('Planificación generada', { sub: n + ' turnos asignados · ' + (gaps ? gaps + ' quedan por debajo del ratio' : 'todos cumplen el ratio'), icon: 'calendar-check', type: gaps ? 'warn' : 'ok' });
          redraw(); BT.shell.updateNav();
        });
      },
    });
  }

  /* ---------- Solicitudes de cambio de turno ---------- */
  function swapPreview(sw) {
    const day = JSON.parse(JSON.stringify(BT.db.shifts[sw.fecha] || ensureDay(sw.fecha)));
    let other = null; SEDES.forEach((s) => TURNOS.forEach((t) => { if (!(s === sw.sede && t === sw.turno) && day[s][t].includes(sw.para)) other = { s, t }; }));
    const slot = day[sw.sede][sw.turno];
    const paraSame = slot.includes(sw.para);
    day[sw.sede][sw.turno] = slot.filter((x) => x !== sw.de).concat(paraSame ? [] : [sw.para]);
    if (other) day[other.s][other.t] = day[other.s][other.t].filter((x) => x !== sw.para).concat([sw.de]);
    const req = BT.ratioRequired();
    const res = [{ s: sw.sede, t: sw.turno, n: day[sw.sede][sw.turno].length, r: req[sw.sede][sw.turno] }];
    if (other) res.push({ s: other.s, t: other.t, n: day[other.s][other.t].length, r: req[other.s][other.t] });
    return { day, other, paraSame, res, ok: res.every((x) => x.n >= x.r) };
  }
  function swapsModal() {
    const draw = (el) => {
      const list = u.sortBy(BT.db.swaps.filter((s) => BT.state.sede === 'ALL' || s.sede === BT.state.sede), (s) => (s.estado === 'Pendiente' ? 0 : 1) + '|' + s.fecha);
      el.querySelector('.modal-b').innerHTML = list.length ? '<div class="col">' + list.map((sw) => {
        const de = BT.staffById(sw.de), pa = BT.staffById(sw.para); const pv = sw.estado === 'Pendiente' ? swapPreview(sw) : null;
        return '<div class="card" style="box-shadow:none"><div class="card-b"><div class="row between wrap"><div class="row gap-6">' + ui.avatar(de.nombre, { size: 'sm' }) + ic('arrow-right', 'ic-sm subtle') + ui.avatar(pa.nombre, { size: 'sm' }) + '<div style="margin-left:6px"><div class="strong">' + esc(firstName(de.nombre)) + ' pide que ' + esc(firstName(pa.nombre)) + ' la cubra</div><div class="muted" style="font-size:var(--fs-sm)">' + turnLabel(sw.turno) + ' ' + sw.sede + ' · ' + u.cap(u.fmtDateLong(sw.fecha)) + ' · «' + esc(sw.motivo) + '»</div></div></div>' +
          ui.badge(sw.estado, sw.estado === 'Aprobada' ? 'ok' : sw.estado === 'Rechazada' ? 'danger' : 'warn', { dot: true }) + '</div>' +
          (pv ? '<div class="alert ' + (pv.ok ? 'ok' : 'warn') + ' mt-12">' + ic(pv.ok ? 'shield-check' : 'triangle-alert') + '<div><b>Impacto en el ratio:</b> ' + pv.res.map((x) => turnLabel(x.t) + ' ' + x.s + ' quedaría con ' + x.n + ' de ' + x.r).join(' · ') + (pv.paraSame ? '. Ambas ya comparten ese turno: aprobarlo deja una cuidadora menos.' : pv.other ? '. ' + esc(firstName(de.nombre)) + ' pasa a cubrir el turno de ' + esc(firstName(pa.nombre)) + '.' : '.') + '</div></div>' +
            (canEdit() ? '<div class="row mt-12" style="justify-content:flex-end"><button class="btn ghost sm" data-rej="' + sw.id + '">' + ic('x') + 'Rechazar</button><button class="btn primary sm" data-ok="' + sw.id + '">' + ic('check') + 'Aprobar cambio</button></div>' : '') : '') +
          '<div class="subtle mt-8" style="font-size:var(--fs-xs)">Solicitado ' + u.rel(sw.ts) + (sw.resuelto ? ' · resuelto por ' + esc(sw.resuelto) : '') + '</div></div></div>';
      }).join('') + '</div>' : ui.empty({ ill: 'leaf', title: 'Sin solicitudes', text: 'Las cuidadoras pueden pedir cambios desde la tablet.' });
    };
    ui.modal({
      title: 'Solicitudes de cambio de turno', sub: 'Entre compañeras, con aprobación de Dirección o Enfermería', icon: 'arrow-left-right', size: 'lg', body: '',
      foot: '<button class="btn primary" data-close>Listo</button>',
      onMount: (el) => {
        draw(el);
        el.addEventListener('click', (e) => {
          const ok = e.target.closest('[data-ok]'), rej = e.target.closest('[data-rej]');
          const sw = BT.db.swaps.find((x) => x.id === (ok || rej || {}).dataset?.ok || x.id === (rej || {}).dataset?.rej);
          if (!sw) return;
          if (ok) { const pv = swapPreview(sw); BT.db.shifts[sw.fecha] = pv.day; sw.estado = 'Aprobada'; }
          else sw.estado = 'Rechazada';
          sw.resuelto = BT.state.user.nombre; BT.save();
          BT.audit(ok ? 'Aprobó cambio de turno' : 'Rechazó cambio de turno', 'Turno ' + turnLabel(sw.turno).toLowerCase() + ' ' + sw.sede + ' · ' + u.fmtDate(sw.fecha), { sede: sw.sede, detail: BT.staffById(sw.de).nombre + ' → ' + BT.staffById(sw.para).nombre });
          ui.toast(ok ? 'Cambio aprobado' : 'Cambio rechazado', { type: ok ? 'ok' : 'info', sub: 'Se notificó a ambas funcionarias', icon: ok ? 'check-check' : 'x' });
          draw(el); redraw(); BT.shell.updateNav();
        });
      },
    });
  }

  /* ==========================================================================
     2) CONTROL DEL RATIO
     ========================================================================== */
  function reqWith(p) {
    const out = {};
    SEDES.forEach((s) => {
      const res = BT.activeResidents().filter((r) => r.sede === s); const dep = res.filter(BT.isDependent).length; const ind = res.length - dep;
      out[s] = { dep, ind, total: res.length, dia: Math.max(1, Math.ceil(dep / p.diaDep + ind / p.diaInd - 1e-9)), noche: Math.max(1, Math.ceil(dep / p.nocheDep + ind / p.nocheInd - 1e-9)), rawD: dep / p.diaDep + ind / p.diaInd, rawN: dep / p.nocheDep + ind / p.nocheInd };
    });
    return out;
  }
  RENDER.ratio = function (panel) {
    const p = Object.assign({}, BT.db.settings.ratio); const isDir = BT.isRole('direccion');
    const sedes = sedesScope(); const base = u.shiftDate();
    const days = Array.from({ length: 14 }, (_, k) => u.iso(u.addDays(base, k)));
    const unc = uncovered(14);
    const sedeCards = (q) => sedes.map((s) => {
      const r = q[s];
      return '<div class="card hover"><div class="card-b"><div class="row between"><div class="row gap-6">' + BT.sedeTag(s) + '<span class="strong">' + esc(BT.sedeName(s)) + '</span></div>' + ui.badge(r.total + ' residentes', 'outline') + '</div>' +
        '<div class="grid g-2 keep mt-16"><div><div class="muted" style="font-size:var(--fs-xs)">Dependientes (Barthel ≤ 40)</div><div class="strong" style="font-size:22px">' + r.dep + '</div>' + ui.bar(pct(r.dep, r.total), 'danger', true) + '</div><div><div class="muted" style="font-size:var(--fs-xs)">No dependientes</div><div class="strong" style="font-size:22px">' + r.ind + '</div>' + ui.bar(pct(r.ind, r.total), '', true) + '</div></div>' +
        '<div class="hr"></div><div class="row between"><span class="row gap-6">' + ic('sun', 'ic-sm t-warn') + 'Mañana y tarde</span><span><span class="subtle" style="font-size:var(--fs-xs)">' + u.fmtNum(r.rawD, 2) + ' → </span><b style="font-size:18px">' + r.dia + '</b> <span class="muted">cuidadoras</span></span></div>' +
        '<div class="row between mt-8"><span class="row gap-6">' + ic('moon', 'ic-sm') + 'Noche</span><span><span class="subtle" style="font-size:var(--fs-xs)">' + u.fmtNum(r.rawN, 2) + ' → </span><b style="font-size:18px">' + r.noche + '</b> <span class="muted">cuidadoras</span></span></div></div></div>';
    }).join('');
    panel.innerHTML = '<div class="grid g-main">' +
      ui.card({ title: 'Cómo se calcula el ratio', icon: 'scale', sub: 'Ordenanza MSP 1032/2019 · Decreto 356/016, art. 19',
        body: '<p class="muted" style="font-size:var(--fs-md)">Para el cálculo del personal de cuidado se consideran <b class="strong">dependientes</b> los residentes con índice de Barthel de <b class="strong">0 a 40</b>. El sistema toma la última evaluación registrada en la ficha de cada residente y recalcula el mínimo en tiempo real.</p>' +
          '<div class="formula mt-12">Cuidadoras requeridas = ⌈ dependientes ÷ <b data-p="dep"></b> + no dependientes ÷ <b data-p="ind"></b> ⌉<br><span class="subtle">Mañana/tarde: 1 c/' + p.diaDep + ' dependientes + 1 c/' + p.diaInd + ' no dependientes · Noche: 1 c/' + p.nocheDep + ' + 1 c/' + p.nocheInd + '</span></div>' +
          '<div class="form-grid mt-16" style="grid-template-columns:repeat(4,minmax(0,1fr))">' +
          [['diaDep', 'Día · dependientes'], ['diaInd', 'Día · no dependientes'], ['nocheDep', 'Noche · dependientes'], ['nocheInd', 'Noche · no dependientes']].map(([k, l]) => '<div class="field"><label>' + l + '</label><div class="row gap-6"><span class="muted">1 c/</span><input class="input num-in" type="number" min="1" max="40" name="' + k + '" value="' + p[k] + '" ' + (isDir ? '' : 'disabled') + '></div></div>').join('') + '</div>' +
          '<div class="row between mt-16 wrap"><span class="subtle" style="font-size:var(--fs-xs)">' + ic('info', 'ic-xs') + ' Parámetros configurables: validar con la normativa vigente y la habilitación de cada sede.</span>' + (isDir ? '<button class="btn primary sm" data-act="save-ratio">' + ic('save') + 'Guardar parámetros</button>' : '<span class="badge outline">' + ic('lock') + 'Editable por Dirección</span>') + '</div>' }) +
      '<div class="col" id="rtCards" style="gap:16px">' + sedeCards(reqWith(p)) + '</div></div>' +
      ui.card({ cls: 'mt-16', title: 'Próximos 14 días', icon: 'calendar-range', sub: unc.length ? unc.length + ' turnos por debajo del mínimo · clic en una celda para resolverlo en el planificador' : 'Todos los turnos cumplen el ratio', actions: unc.length ? ui.badge(unc.length + ' sin cubrir', 'danger', { icon: 'triangle-alert' }) : ui.badge('Cubierto', 'ok', { icon: 'shield-check' }), bodyCls: 'flush',
        body: '<div class="table-wrap"><table class="table compact"><thead><tr><th>Día</th>' + sedes.map((s) => TURNOS.map((t) => '<th class="center">' + s + ' · ' + turnLabel(t) + '</th>').join('')).join('') + '</tr></thead><tbody>' +
          days.map((d) => '<tr><td><span class="strong">' + dayWord(d) + '</span> <span class="muted">' + u.fmtDateShort(d) + '</span>' + (feriado(d) ? ' ' + ui.badge(feriado(d).nombre, 'violet') : '') + '</td>' + sedes.map((s) => TURNOS.map((t) => { const st = BT.ratioStatus(d, s, t); const pst = isPastShift(d, t); return '<td class="center"><span class="ratio-cell ' + (pst ? 'past' : st.ok ? 'ok' : 'bad') + '" data-act="goto" data-d="' + d + '" data-s="' + s + '" data-t="' + t + '" data-tip="' + (pst ? 'Turno finalizado' : st.ok ? 'Cumple' : 'Faltan ' + st.deficit) + '">' + ic(pst ? 'check' : st.ok ? 'check' : 'triangle-alert', 'ic-xs') + st.assigned + '/' + st.required + '</span></td>'; }).join('')).join('') + '</tr>').join('') + '</tbody></table></div>' });
    const updFormula = () => { const q = {}; panel.querySelectorAll('input[name]').forEach((i) => (q[i.name] = Math.max(1, +i.value || 1))); const box = panel.querySelector('#rtCards'); box.innerHTML = sedeCards(reqWith(q)); return q; };
    panel.querySelectorAll('[data-p="dep"]').forEach((b) => (b.textContent = 'N'));
    panel.querySelectorAll('[data-p="ind"]').forEach((b) => (b.textContent = 'M'));
    panel.querySelectorAll('input[name]').forEach((i) => i.addEventListener('input', updFormula));
    ui.on(panel, {
      goto: (t) => { P.sede = t.dataset.s; P.view = 'dia'; P.day = t.dataset.d; P.month = P.day.slice(0, 7); P.focus = { d: t.dataset.d, s: t.dataset.s, t: t.dataset.t }; if (P.root) delete P.root.dataset.scrolled; P.tabs.show('planificador'); },
      'save-ratio': async () => {
        const q = updFormula();
        const ok = await ui.confirm({ title: 'Guardar parámetros del ratio', text: 'Los nuevos parámetros recalculan el mínimo de cuidadoras de todos los turnos de ambas sedes. Queda registrado en la auditoría.', ok: 'Guardar', icon: 'scale' });
        if (!ok) return;
        const old = JSON.stringify(BT.db.settings.ratio); BT.db.settings.ratio = q; BT.save();
        BT.audit('Modificó parámetros', 'Ratio de cuidadoras', { detail: old + ' → ' + JSON.stringify(q) });
        ui.toast('Parámetros guardados', { sub: 'El ratio se recalculó para todos los turnos', icon: 'scale' });
        BT.refresh();
      },
    });
  };

  /* ==========================================================================
     3) LEGAJOS
     ========================================================================== */
  const carneBadge = (s) => { const n = u.daysUntil(s.carneSalud.vence); return n < 0 ? ui.badge('Vencido hace ' + -n + ' d', 'danger', { icon: 'circle-x', tip: 'Venció el ' + u.fmtDate(s.carneSalud.vence) }) : n <= 30 ? ui.badge('Vence en ' + n + ' d', 'warn', { icon: 'clock', tip: u.fmtDate(s.carneSalud.vence) }) : ui.badge('Vigente', 'ok', { dot: true, tip: 'Hasta el ' + u.fmtDate(s.carneSalud.vence) }); };
  const cursoBadge = (s) => { const e = s.cursoCuidados.estado; return ui.badge(e, /Certificado|Título/.test(e) ? 'ok' : e === 'En curso' ? 'info' : 'warn', { dot: true }); };
  RENDER.legajo = function (panel) {
    let filt = 'Todas', q = '';
    const draw = () => {
      const list = staffScope().filter((s) => (filt === 'Todas' || (filt === 'Cuidadoras' ? s.rol === 'Cuidadora' : s.rol !== 'Cuidadora')) && (!q || u.norm(s.nombre).includes(u.norm(q))));
      panel.querySelector('#lgTable').innerHTML = ui.table([
        { label: 'Funcionaria', render: (s) => ui.person(s.nombre, esc(s.rol) + (s.volante ? ' · Volante' : '')) },
        { label: 'Sede', render: (s) => BT.sedeTag(s.sede) + (s.volante || s.rol === 'Lic. en Enfermería' ? ' <span class="subtle" style="font-size:var(--fs-xs)">+ ' + (s.sede === 'BT1' ? 'BT2' : 'BT1') + '</span>' : '') },
        { label: 'Antigüedad', render: (s) => '<span class="num">' + yearsTxt(s.ingreso) + '</span><div class="subtle" style="font-size:var(--fs-xs)">desde ' + u.fmtDate(s.ingreso) + '</div>' },
        { label: 'Turno base', render: (s) => ({ M: 'Mañana', T: 'Tarde', N: 'Noche', X: 'Mañana/Tarde', V: 'Volante', D: 'Diurno 08–16' }[s.turnoBase]) },
        { label: 'Carné de salud', render: carneBadge },
        { label: 'Curso de cuidados', render: cursoBadge },
        { label: 'Capacitaciones', align: 'center', render: (s) => '<span class="num">' + s.capacitaciones.length + '</span>' },
        { label: 'Licencia', align: 'num', render: (s) => { const g = BT.leaveDays(s), t = BT.leaveTaken(s.id); return '<span class="strong">' + (g - t) + '</span> <span class="subtle">/ ' + g + ' d</span>'; } },
      ], list, { rowAttrs: (s) => 'class="click" data-act="staff" data-id="' + s.id + '"', empty: { ill: 'search', title: 'Sin coincidencias', text: 'Probá con otro nombre.' } });
    };
    panel.innerHTML = ui.card({ title: 'Legajos del personal', icon: 'folder-open', sub: 'Documentación, capacitaciones y vencimientos', bodyCls: 'flush',
      actions: '<input class="input" style="width:200px;min-height:34px" placeholder="Buscar…" id="lgQ">' + ui.seg('lg-f', [{ id: 'Todas', label: 'Todas' }, { id: 'Cuidadoras', label: 'Cuidadoras' }, { id: 'Enf', label: 'Enfermería' }], 'Todas', 'sm'),
      body: '<div id="lgTable"></div>' });
    panel.addEventListener('segchange', (e) => { if (e.detail.name === 'lg-f') { filt = e.detail.value; draw(); } });
    panel.querySelector('#lgQ').addEventListener('input', u.debounce((e) => { q = e.target.value; draw(); }, 120));
    ui.on(panel, { staff: (t) => openStaff(t.dataset.id) });
    draw();
  };

  function openStaff(id) {
    const s = BT.staffById(id); if (!s) return;
    const g = BT.leaveDays(s), t = BT.leaveTaken(s.id);
    const lv = BT.db.leaves.filter((l) => l.staffId === id).sort((a, b) => b.desde.localeCompare(a.desde));
    const ab = BT.db.absences.filter((a) => a.staffId === id).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const ck = BT.db.clock.filter((c) => c.staffId === id).sort((a, b) => (b.fecha + b.in).localeCompare(a.fecha + a.in)).slice(0, 8);
    const next = []; for (let k = 0; k < 7; k++) { const d = u.iso(u.addDays(u.today(), k)); let a = null; SEDES.forEach((ss) => TURNOS.forEach((tt) => { if (slotIds(d, ss, tt).includes(id)) a = { ss, tt }; })); next.push({ d, a, lv: onLeave(id, d), ab: absentOn(id, d) }); }
    BT.audit('Abrió', 'Legajo de personal', { detail: s.nombre, sede: s.sede });
    ui.drawer({
      head: '<div class="row gap-16">' + ui.avatarEdit(s.nombre, BT.photoKey.staff(s), 'xl') + '<div><div class="row gap-6"><h3 style="font-size:var(--fs-xl)">' + esc(s.nombre) + '</h3>' + BT.sedeTag(s.sede) + (s.volante ? ui.badge('Volante', 'brand') : '') + '</div><div class="muted" style="font-size:var(--fs-sm)">' + esc(s.rol) + ' · ' + yearsTxt(s.ingreso) + ' de antigüedad</div></div></div>',
      body: '<div class="row" style="justify-content:flex-end;margin-bottom:12px"><button class="btn sm" data-pdf>' + ic('file-text') + 'Ficha de legajo (PDF)</button></div>' +
        '<div class="kv-cards stagger">' + [['id-card', 'Cédula', u.fmtCI(s.ci)], ['phone', 'Teléfono', esc(s.tel)], ['calendar', 'Ingreso', u.fmtDate(s.ingreso)], ['banknote', 'Salario nominal', u.fmtMoney(s.salario)], ['clock', 'Valor hora', u.fmtMoney(s.valorHora)], ['calendar-x', 'Franco semanal', u.cap(u.DIAS[s.offDow])]].map(([i, k, v]) => '<div class="kv-card"><div class="k">' + ic(i, 'ic-xs') + k + '</div><div class="v num">' + v + '</div></div>').join('') + '</div>' +
        '<div class="sec-t mt-24">Documentación habilitante</div><div class="card"><div class="list">' +
        '<div class="li"><span class="li-ic ' + (BT.files.get('stfdoc:' + s.id + ':ci') ? 'ok' : '') + '">' + ic('id-card', 'ic-sm') + '</span><div class="grow"><div class="t">Cédula de identidad</div><div class="d" id="ciTxt">' + (s.ciFile ? 'Foto adjunta el ' + u.fmtDate(s.ciFile.fecha) : 'Sin foto adjunta') + '</div></div><div class="row gap-6">' + (s.ciFile ? '<button class="btn xs ghost" data-ci-view>' + ic('eye') + 'Ver</button>' : '') + '<label class="btn xs soft">' + ic('camera') + (s.ciFile ? 'Reemplazar' : 'Adjuntar foto') + '<input type="file" accept="image/*,application/pdf" data-ci hidden></label></div></div>' +
        '<div class="li"><span class="li-ic ' + BT.dueTone(s.carneSalud.vence) + '">' + ic('heart-pulse', 'ic-sm') + '</span><div class="grow"><div class="t">Carné de salud</div><div class="d">Vence el ' + u.fmtDate(s.carneSalud.vence) + ' · ' + u.relDay(s.carneSalud.vence) + '</div></div>' + carneBadge(s) + '</div>' +
        '<div class="li"><span class="li-ic brand">' + ic('graduation-cap', 'ic-sm') + '</span><div class="grow"><div class="t">' + (s.rol === 'Cuidadora' ? 'Curso de cuidados (Sistema Nacional de Cuidados)' : 'Título habilitante') + '</div><div class="d">' + (s.cursoCuidados.fecha ? (s.cursoCuidados.estado === 'En curso' ? 'Finaliza el ' : 'Obtenido el ') + u.fmtDate(s.cursoCuidados.fecha) : 'Sin inscripción registrada') + '</div></div>' + cursoBadge(s) + '</div></div></div>' +
        '<div class="sec-t mt-24">Capacitaciones</div><div class="card"><div class="list">' + (s.capacitaciones.length ? s.capacitaciones.map((c) => '<div class="li"><span class="li-ic">' + ic('award', 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(c.nombre) + '</div><div class="d">' + u.fmtDate(c.fecha) + (c.vence ? ' · vence el ' + u.fmtDate(c.vence) : '') + '</div></div>' + (c.vence ? ui.badge(u.daysUntil(c.vence) < 0 ? 'Vencida' : 'Vigente', u.daysUntil(c.vence) < 0 ? 'danger' : 'ok', { dot: true }) : ui.badge('Sin vencimiento', 'outline')) + '</div>').join('') : '<div class="li"><span class="muted">Sin capacitaciones registradas.</span></div>') + '</div></div>' +
        '<div class="sec-t mt-24">Próximos 7 días</div><div class="grid g-4 keep" style="grid-template-columns:repeat(7,minmax(0,1fr));gap:6px">' + next.map((x) => { const dt = u.toDate(x.d); return '<div class="kv-card" style="padding:8px;text-align:center"><div class="k" style="justify-content:center">' + u.DIAS_C[dt.getDay()] + ' ' + dt.getDate() + '</div><div class="v">' + (x.lv ? '<span class="cx L">L</span>' : x.ab ? '<span class="cx F">F</span>' : x.a ? '<span class="cx ' + x.a.tt + '">' + x.a.tt + '</span><div class="subtle" style="font-size:10px">' + x.a.ss + '</div>' : '<span class="cx o">·</span>') + '</div></div>'; }).join('') + '</div>' +
        '<div class="sec-t mt-24">Licencia anual</div><div class="card"><div class="card-b"><div class="row between"><span>Generados por antigüedad <span class="subtle">(Ley 12.590)</span></span><b class="num">' + g + ' días</b></div><div class="row between mt-8"><span>Tomados en ' + new Date().getFullYear() + '</span><b class="num">' + t + ' días</b></div><div class="mt-8">' + ui.bar(pct(t, g), t > g ? 'danger' : '') + '</div><div class="row between mt-8"><span class="strong">Saldo</span><b class="num t-brand">' + (g - t) + ' días</b></div></div>' +
        (lv.length ? '<div class="list" style="border-top:1px solid var(--line)">' + lv.map((l) => '<div class="li"><span class="li-ic ok">' + ic('umbrella', 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(l.tipo) + '</div><div class="d">' + u.fmtDate(l.desde) + ' al ' + u.fmtDate(l.hasta) + ' · ' + l.dias + ' días</div></div>' + ui.badge(l.estado, l.estado === 'Aprobada' ? 'ok' : 'warn', { dot: true }) + '</div>').join('') + '</div>' : '') + '</div>' +
        '<div class="sec-t mt-24">Faltas</div><div class="card"><div class="list">' + (ab.length ? ab.map((a) => '<div class="li"><span class="li-ic ' + (a.tipo === 'Injustificada' ? 'danger' : a.tipo === 'Certificado médico' ? 'info' : 'warn') + '">' + ic(a.tipo === 'Certificado médico' ? 'thermometer' : 'calendar-x', 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(a.tipo) + '</div><div class="d">' + u.fmtDate(a.fecha) + ' · ' + turnLabel(a.turno) + ' · ' + esc(a.nota || '') + '</div></div></div>').join('') : '<div class="li"><span class="muted">Sin faltas registradas.</span></div>') + '</div></div>' +
        '<div class="sec-t mt-24">Últimas marcas</div><div class="card">' + ui.table([{ label: 'Fecha', render: (c) => u.fmtDate(c.fecha) }, { label: 'Turno', render: (c) => turnLabel(c.turno) + ' · ' + c.sede }, { label: 'Entrada', align: 'num', render: (c) => c.in }, { label: 'Salida', align: 'num', render: (c) => c.out || ui.live('En turno') }, { label: 'Extra', align: 'num', render: (c) => (c.extraMin ? '+' + c.extraMin + ' min' : '—') }], ck, { compact: true }) + '</div>',
      onMount: (el, close) => {
        el.querySelector('[data-pdf]').addEventListener('click', () => staffPdf(s));
        const key = 'stfdoc:' + s.id + ':ci';
        const view = () => BT.docPreview({ title: 'Cédula de identidad', sub: s.nombre, dataUrl: BT.files.get(key), type: s.ciFile && s.ciFile.type, onUsePhoto: (src) => BT.photoEditor({ title: 'Foto de perfil desde la cédula', name: s.nombre, key: BT.photoKey.staff(s), source: src, onSave: () => { BT.audit('Actualizó foto', 'Legajo de personal', { detail: s.nombre }); close(); setTimeout(() => openStaff(s.id), 260); BT.refresh(); } }) });
        const vb = el.querySelector('[data-ci-view]'); if (vb) vb.addEventListener('click', view);
        el.querySelector('[data-ci]').addEventListener('change', async (e) => {
          const f = e.target.files[0]; if (!f) return;
          const d = await BT.readFileAsDataURL(f); if (!BT.files.put(key, d)) return ui.toast('No hay espacio para guardar el archivo', { type: 'warn' });
          s.ciFile = { name: f.name, type: f.type, size: f.size, fecha: u.todayIso() }; BT.save();
          BT.audit('Adjuntó documento', 'Cédula de identidad', { detail: s.nombre, sede: s.sede });
          ui.toast('Cédula adjuntada', { icon: 'id-card', sub: s.nombre });
          close(); setTimeout(() => { openStaff(s.id); if (/^image\//.test(f.type) && !BT.photos.get(BT.photoKey.staff(s))) setTimeout(view, 350); }, 260);
        });
      },
    });
  }
  BT.actions.openStaff = openStaff;

  function staffPdf(s) {
    const D = BT.doc; const g = BT.leaveDays(s), t = BT.leaveTaken(s.id);
    D.open({
      title: 'Ficha de legajo', subtitle: esc(s.nombre) + ' · ' + esc(s.rol), sede: s.sede, kicker: 'Recursos humanos', filename: 'Legajo - ' + cleanName(s.nombre),
      body: D.section('Datos de la funcionaria', D.kv([['Nombre', esc(s.nombre)], ['Cédula', u.fmtCI(s.ci)], ['Cargo', esc(s.rol) + (s.volante ? ' (volante)' : '')], ['Sede', esc(BT.sedeName(s.sede))], ['Fecha de ingreso', u.fmtDate(s.ingreso)], ['Antigüedad', yearsTxt(s.ingreso)], ['Salario nominal', D.money(s.salario)], ['Teléfono', esc(s.tel)]], 2)) +
        D.section('Documentación habilitante', D.table([{ label: 'Documento', key: 'd' }, { label: 'Estado', render: (r) => r.e }, { label: 'Fecha', key: 'f' }], [
          { d: 'Carné de salud', e: D.badge(u.daysUntil(s.carneSalud.vence) < 0 ? 'Vencido' : u.daysUntil(s.carneSalud.vence) <= 30 ? 'Por vencer' : 'Vigente', BT.dueTone(s.carneSalud.vence)), f: 'Vence ' + u.fmtDate(s.carneSalud.vence) },
          { d: s.rol === 'Cuidadora' ? 'Curso de cuidados (SNC)' : 'Título habilitante', e: D.badge(s.cursoCuidados.estado, /Certificado|Título/.test(s.cursoCuidados.estado) ? 'ok' : 'warn'), f: s.cursoCuidados.fecha ? u.fmtDate(s.cursoCuidados.fecha) : '—' },
        ])) +
        D.section('Capacitaciones', D.table([{ label: 'Capacitación', render: (c) => esc(c.nombre) }, { label: 'Fecha', render: (c) => u.fmtDate(c.fecha) }, { label: 'Vencimiento', render: (c) => (c.vence ? u.fmtDate(c.vence) : 'No vence') }], s.capacitaciones)) +
        D.section('Licencia anual', D.kpis([{ label: 'Generados', value: g + ' d', sub: 'Ley 12.590' }, { label: 'Tomados', value: t + ' d', sub: String(new Date().getFullYear()) }, { label: 'Saldo', value: g - t + ' d' }])) +
        D.section('Faltas registradas', D.table([{ label: 'Fecha', render: (a) => u.fmtDate(a.fecha) }, { label: 'Turno', render: (a) => turnLabel(a.turno) }, { label: 'Tipo', render: (a) => D.badge(a.tipo, a.tipo === 'Injustificada' ? 'danger' : 'info') }, { label: 'Observaciones', render: (a) => esc(a.nota || '') }], BT.db.absences.filter((a) => a.staffId === s.id), { empty: 'Sin faltas registradas.' })) +
        D.signatures(['Firma de la funcionaria', 'Dirección']),
    });
  }

  /* ==========================================================================
     4) MARCAS Y HORAS
     ========================================================================== */
  const late = (c) => { const from = SH[c.turno] ? SH[c.turno].from : '08:00'; const [h, m] = from.split(':').map(Number); const [h2, m2] = c.in.split(':').map(Number); let diff = h2 * 60 + m2 - (h * 60 + m); if (diff < -600) diff += 1440; return diff > 5; };
  function payroll(ym) {
    const nd = daysInMonth(ym); const mStart = ym + '-01', mEnd = ym + '-' + u.pad(nd);
    return staffScope().map((s) => {
      const ck = BT.db.clock.filter((c) => c.staffId === s.id && c.fecha.startsWith(ym));
      const done = ck.filter((c) => c.out);
      const extraH = Math.round((u.sum(done, 'extraMin') / 60) * 10) / 10;
      const noct = done.filter((c) => c.turno === 'N').length * 8;
      const ferP = done.filter((c) => (feriado(c.fecha) || {}).tipo === 'pago').length;
      const ferN = done.filter((c) => (feriado(c.fecha) || {}).tipo === 'nolab').length;
      const tarde = ck.filter(late).length;
      const abs = BT.db.absences.filter((a) => a.staffId === s.id && a.fecha.startsWith(ym));
      const cert = abs.filter((a) => a.tipo === 'Certificado médico').length, just = abs.filter((a) => a.tipo === 'Justificada').length, inj = abs.filter((a) => a.tipo === 'Injustificada').length;
      const lic = u.sum(BT.db.leaves.filter((l) => l.staffId === s.id && l.estado === 'Aprobada' && l.desde <= mEnd && l.hasta >= mStart), (l) => u.daysBetween(l.desde > mStart ? l.desde : mStart, l.hasta < mEnd ? l.hasta : mEnd) + 1);
      const vh = s.valorHora;
      const adExtra = Math.round(extraH * vh * 2), adNoct = Math.round(noct * vh * 0.2), adFer = Math.round((ferP * s.salario) / 30), desc = Math.round((inj * s.salario) / 30);
      const obs = [];
      if (lic) obs.push('Licencia ' + lic + ' d');
      if (cert) obs.push('Certificación médica ' + cert + ' d (subsidio BPS desde el 4.º día)');
      if (inj) obs.push('Descuento por ' + inj + ' falta(s) injustificada(s)');
      if (tarde) obs.push(tarde + ' llegada(s) tarde');
      if (s.volante) obs.push('Volante: imputar 50 % por sede');
      return { s, id: s.id, ci: u.fmtCI(s.ci), nombre: s.nombre, sede: s.sede, cargo: s.rol, salario: s.salario, dias: new Set(ck.map((c) => c.fecha)).size, horas: done.length * 8, extraH, noct, ferP, ferN, tarde, cert, just, inj, lic, adExtra, adNoct, adFer, desc, total: s.salario + adExtra + adNoct + adFer - desc, obs: obs.join(' · '), last: ck.sort((a, b) => (b.fecha + b.in).localeCompare(a.fecha + a.in))[0] };
    });
  }
  RENDER.marcas = function (panel) {
    const months = [ymNow(), u.ym(u.addMonths(new Date(), -1))];
    if (!P.marcasMonth) P.marcasMonth = months[0];
    const draw = () => {
      const ym = P.marcasMonth; const rows = payroll(ym).filter((r) => CARE.includes(r.cargo) || r.cargo === 'Lic. en Enfermería');
      const td = u.todayIso(); const sd = u.shiftDate();
      const todayCk = BT.db.clock.filter((c) => (c.fecha === td || c.fecha === sd) && (BT.state.sede === 'ALL' || c.sede === BT.state.sede)).sort((a, b) => (b.fecha + b.in).localeCompare(a.fecha + a.in));
      const missing = []; sedesScope().forEach((s) => TURNOS.forEach((t) => { if (shiftStartTs(sd, t) + 15 * 60000 < Date.now() && !isPastShift(sd, t)) slotIds(sd, s, t).forEach((sid) => { if (!BT.db.clock.some((c) => c.staffId === sid && c.fecha === sd && c.turno === t)) missing.push({ sid, s, t }); }); }));
      const totExtra = u.sum(rows, 'extraH'), totNoct = u.sum(rows, 'noct'), totTarde = u.sum(rows, 'tarde');
      panel.innerHTML = '<div class="row between wrap mb-16">' + ui.seg('mc-m', months.map((m) => ({ id: m, label: u.cap(u.fmtMonth(m)) })), ym, 'sm') + '<span class="subtle" style="font-size:var(--fs-xs)">' + ic('fingerprint', 'ic-xs') + ' Marcas del reloj biométrico de cada sede</span></div>' +
        '<div class="grid g-4 stagger">' + ui.kpi({ label: 'Horas trabajadas', value: u.sum(rows, 'horas'), suffix: 'h', icon: 'clock' }) + ui.kpi({ label: 'Horas extra', value: totExtra, decimals: 1, suffix: 'h', icon: 'timer', tone: 'warn' }) + ui.kpi({ label: 'Horas nocturnas', value: totNoct, suffix: 'h', icon: 'moon', tone: 'ink', foot: '22:00 a 06:00 · Ley 19.313' }) + ui.kpi({ label: 'Llegadas tarde', value: totTarde, icon: 'alarm-clock', tone: totTarde ? 'danger' : '', foot: 'Tolerancia de 5 minutos' }) + '</div>' +
        '<div class="grid g-main mt-16">' + ui.card({ title: 'Resumen por funcionaria', icon: 'list-checks', sub: u.cap(u.fmtMonth(ym)), bodyCls: 'flush',
          body: ui.table([
            { label: 'Funcionaria', render: (r) => ui.person(r.nombre, esc(r.cargo)) },
            { label: 'Días', align: 'num', render: (r) => r.dias },
            { label: 'Horas', align: 'num', render: (r) => r.horas },
            { label: 'Extra', align: 'num', render: (r) => (r.extraH ? '<span class="t-warn strong">' + u.fmtNum(r.extraH, 1) + '</span>' : '<span class="subtle">0</span>') },
            { label: 'Nocturnas', align: 'num', render: (r) => r.noct || '<span class="subtle">0</span>' },
            { label: 'Feriados', align: 'num', render: (r) => (r.ferP + r.ferN ? '<span data-tip="' + r.ferP + ' pagos · ' + r.ferN + ' no laborables">' + (r.ferP + r.ferN) + '</span>' : '<span class="subtle">0</span>') },
            { label: 'Tarde', align: 'num', render: (r) => (r.tarde ? ui.badge(String(r.tarde), 'danger') : '<span class="subtle">0</span>') },
          ], rows, { compact: true }) }) +
        ui.card({ title: 'Marcas de hoy', icon: 'fingerprint', actions: ui.live(), bodyCls: 'flush',
          body: '<div class="list">' + missing.map((m) => { const x = BT.staffById(m.sid); return '<div class="li"><span class="li-ic warn">' + ic('triangle-alert', 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(cleanName(x.nombre)) + '</div><div class="d">Sin marca de entrada · ' + turnLabel(m.t) + ' ' + m.s + '</div></div>' + ui.badge('Sin marca', 'warn') + '</div>'; }).join('') +
            (todayCk.length ? todayCk.slice(0, 12).map((c) => { const x = BT.staffById(c.staffId); return '<div class="li"><span class="li-ic ' + (c.out ? '' : 'ok') + '">' + ic(c.out ? 'log-out' : 'log-in', 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(cleanName(x.nombre)) + '</div><div class="d">' + turnLabel(c.turno) + ' · ' + c.sede + ' · entrada ' + c.in + (c.out ? ' · salida ' + c.out : '') + '</div></div>' + (c.out ? (c.extraMin ? ui.badge('+' + c.extraMin + ' min', 'warn') : ui.badge('Completo', 'outline')) : ui.badge('En turno', 'ok', { dot: true })) + '</div>'; }).join('') : ui.empty({ ill: 'calendar', title: 'Sin marcas todavía' })) + '</div>' }) + '</div>' +
        ui.card({ cls: 'mt-16', title: 'Horas extra por funcionaria', icon: 'chart-column', sub: 'Incluye permanencias para cubrir el cambio de turno', body: '<div class="chart-box"><canvas id="mcChart"></canvas></div>' });
      ui.enhance(panel);
      const ex = rows.filter((r) => r.extraH > 0).sort((a, b) => b.extraH - a.extraH);
      BT.chart('#mcChart', { type: 'bar', data: { labels: ex.map((r) => shortName(r.nombre)), datasets: [{ label: 'Horas extra', data: ex.map((r) => r.extraH), backgroundColor: ex.map((r) => BT.alpha(BT.COLORS[r.sede] || BT.COLORS.brand, 0.85)), maxBarThickness: 34 }] }, options: { scales: { y: { beginAtZero: true, ticks: { callback: (v) => v + ' h' } }, x: { grid: { display: false } } }, plugins: { tooltip: { callbacks: { label: (c) => ' ' + u.fmtNum(c.raw, 1) + ' h extra' } } } } }, panel);
    };
    panel.addEventListener('segchange', (e) => { if (e.detail.name === 'mc-m') { P.marcasMonth = e.detail.value; BT._charts.forEach((c) => { if (c.canvas && panel.contains(c.canvas)) c.destroy(); }); draw(); } });
    draw();
  };

  /* ==========================================================================
     5) LICENCIAS
     ========================================================================== */
  function overlaps() {
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1); const out = [];
    SEDES.forEach((s) => {
      let cur = null;
      for (let k = 0; k < 366; k++) {
        const d = u.iso(u.addDays(start, k));
        const who = BT.db.leaves.filter((l) => l.estado !== 'Rechazada' && l.desde <= d && l.hasta >= d && (BT.staffById(l.staffId) || {}).sede === s && CARE.includes(BT.staffById(l.staffId).rol)).map((l) => l.staffId);
        if (who.length >= 2) { if (!cur) cur = { sede: s, desde: d, hasta: d, ids: new Set(who) }; else { cur.hasta = d; who.forEach((x) => cur.ids.add(x)); } }
        else if (cur) { out.push(cur); cur = null; }
      }
      if (cur) out.push(cur);
    });
    return out;
  }
  function approveLeave(l, ok) {
    l.estado = ok ? 'Aprobada' : 'Rechazada';
    let freed = 0; const gaps = new Set();
    if (ok) {
      for (let d = l.desde; d <= l.hasta; d = u.iso(u.addDays(d, 1))) {
        const day = BT.db.shifts[d]; if (!day) continue;
        SEDES.forEach((s) => TURNOS.forEach((t) => { if (day[s][t].includes(l.staffId)) { day[s][t] = day[s][t].filter((x) => x !== l.staffId); freed++; if (!BT.ratioStatus(d, s, t).ok) gaps.add(key(d, s, t)); } }));
      }
    }
    BT.save();
    const st = BT.staffById(l.staffId);
    BT.audit(ok ? 'Aprobó licencia' : 'Rechazó licencia', l.tipo, { detail: st.nombre + ' · ' + u.fmtDate(l.desde) + ' al ' + u.fmtDate(l.hasta), sede: st.sede });
    ui.toast(ok ? 'Licencia aprobada' : 'Licencia rechazada', { type: ok ? 'ok' : 'info', sub: ok ? (freed ? freed + ' turnos liberados · ' + (gaps.size ? gaps.size + ' quedan por debajo del ratio' : 'cobertura sin impacto') : 'Sin turnos afectados') : cleanName(st.nombre) });
    BT.shell.updateNav();
  }
  RENDER.licencias = function (panel) {
    const draw = () => {
      const staff = staffScope(); const yr = new Date().getFullYear(); const td = u.todayIso();
      const pend = BT.db.leaves.filter((l) => l.estado === 'Pendiente' && staff.some((s) => s.id === l.staffId));
      const ov = overlaps().filter((o) => BT.state.sede === 'ALL' || o.sede === BT.state.sede);
      const start = new Date(yr, new Date().getMonth(), 1); const end = u.addMonths(start, 12); const total = u.daysBetween(start, end);
      const todayPos = pct(u.daysBetween(start, new Date()), total);
      // calor semanal
      const weeks = Math.ceil(total / 7);
      const heat = Array.from({ length: weeks }, (_, w) => { const d = u.iso(u.addDays(start, w * 7 + 3)); return BT.db.leaves.filter((l) => l.estado !== 'Rechazada' && l.desde <= d && l.hasta >= d && staff.some((s) => s.id === l.staffId)).length; });
      panel.innerHTML = '<div class="grid g-4 stagger">' +
        ui.kpi({ label: 'Días generados ' + yr, value: u.sum(staff, (s) => BT.leaveDays(s)), icon: 'calendar-plus', foot: 'Según antigüedad (Ley 12.590)' }) +
        ui.kpi({ label: 'Días tomados', value: u.sum(staff, (s) => BT.leaveTaken(s.id, yr)), icon: 'umbrella', tone: 'info' }) +
        ui.kpi({ label: 'Pendientes de aprobación', value: pend.length, icon: 'hourglass', tone: pend.length ? 'warn' : '' }) +
        ui.kpi({ label: 'De licencia hoy', value: BT.db.leaves.filter((l) => l.estado === 'Aprobada' && l.desde <= td && l.hasta >= td && staff.some((s) => s.id === l.staffId)).length, icon: 'plane', tone: 'ink' }) + '</div>' +
        (ov.length ? '<div class="col gap-6 mt-16">' + ov.map((o) => '<div class="alert warn">' + ic('triangle-alert') + '<div><b>Licencias superpuestas en ' + o.sede + '</b> · ' + o.ids.size + ' funcionarias entre el ' + u.fmtDate(o.desde) + ' y el ' + u.fmtDate(o.hasta) + ': ' + esc([...o.ids].map((x) => cleanName(BT.staffById(x).nombre)).join(', ')) + '. Revisá la cobertura antes de aprobar.</div></div>').join('') + '</div>' : '') +
        (pend.length ? ui.card({ cls: 'mt-16', title: 'Solicitudes pendientes', icon: 'inbox', bodyCls: 'flush', body: '<div class="list">' + pend.map((l) => { const s = BT.staffById(l.staffId); const co = BT.db.leaves.filter((x) => x !== l && x.estado !== 'Rechazada' && x.desde <= l.hasta && x.hasta >= l.desde && (BT.staffById(x.staffId) || {}).sede === s.sede); return '<div class="li">' + ui.avatar(s.nombre) + '<div class="grow"><div class="t">' + esc(cleanName(s.nombre)) + ' · ' + esc(l.tipo) + '</div><div class="d">' + u.fmtDate(l.desde) + ' al ' + u.fmtDate(l.hasta) + ' · ' + l.dias + ' días · saldo ' + (BT.leaveDays(s) - BT.leaveTaken(s.id)) + ' d</div>' + (co.length ? '<div class="d t-warn">' + ic('triangle-alert', 'ic-xs') + ' Coincide con ' + esc(co.map((x) => cleanName(BT.staffById(x.staffId).nombre)).join(', ')) + '</div>' : '') + '</div>' + (BT.can('staff.manage') ? '<button class="btn ghost sm" data-act="lv-no" data-id="' + l.id + '">Rechazar</button><button class="btn primary sm" data-act="lv-ok" data-id="' + l.id + '">' + ic('check') + 'Aprobar</button>' : ui.badge('Pendiente', 'warn')) + '</div>'; }).join('') + '</div>' }) : '') +
        ui.card({ cls: 'mt-16', title: 'Planificador anual', icon: 'calendar-range', sub: 'Próximos 12 meses · las franjas rojas indican semanas con muchas licencias simultáneas', actions: '<div class="legend"><span><i style="background:var(--brand-600)"></i>Aprobada</span><span><i style="background:#e7b35a"></i>Pendiente</span><span><i style="background:#7a8aa0"></i>Otras</span></div>' + (BT.can('staff.manage') ? '<button class="btn sm" data-act="lv-new">' + ic('plus') + 'Nueva solicitud</button>' : ''), bodyCls: 'flush',
          body: '<div class="gt" style="border:0;border-radius:0"><div class="gt-row gt-head"><div class="gt-who muted" style="font-size:var(--fs-xs);font-weight:650">FUNCIONARIA</div><div><div class="gt-months">' + Array.from({ length: 12 }, (_, i) => '<span>' + u.MESES_C[u.addMonths(start, i).getMonth()] + ' ' + String(u.addMonths(start, i).getFullYear()).slice(2) + '</span>').join('') + '</div><div class="gt-heat" style="padding:0 0 6px">' + heat.map((n) => '<i class="' + (n >= 3 ? 'h3' : n === 2 ? 'h2' : n === 1 ? 'h1' : '') + '" title="' + n + ' de licencia"></i>').join('') + '</div></div></div>' +
            staff.map((s) => { const ls = BT.db.leaves.filter((l) => l.staffId === s.id && l.estado !== 'Rechazada' && l.hasta >= u.iso(start) && l.desde < u.iso(end)); return '<div class="gt-row"><div class="gt-who">' + ui.person(s.nombre, BT.leaveDays(s) - BT.leaveTaken(s.id) + ' d de saldo · ' + s.sede) + '</div><div class="gt-track"><span class="gt-today" style="left:' + todayPos + '%" title="Hoy"></span>' + ls.map((l, i) => { const a = Math.max(0, u.daysBetween(start, l.desde)); const b = Math.min(total, u.daysBetween(start, l.hasta) + 1); return '<span class="gt-bar ' + (l.estado === 'Pendiente' ? 'pend' : l.tipo !== 'Licencia anual' ? 'oth' : '') + '" style="left:' + pct(a, total) + '%;width:' + pct(b - a, total) + '%;animation-delay:' + i * 80 + 'ms" title="' + esc(l.tipo + ' · ' + u.fmtDate(l.desde) + ' al ' + u.fmtDate(l.hasta) + ' · ' + l.estado) + '">' + l.dias + ' d</span>'; }).join('') + '</div></div>'; }).join('') + '</div>' }) +
        ui.card({ cls: 'mt-16', title: 'Saldo de licencia por funcionaria', icon: 'scale', sub: 'Ley 12.590: 20 días + 1 día cada 4 años a partir del 5.º año de antigüedad', bodyCls: 'flush',
          body: ui.table([{ label: 'Funcionaria', render: (s) => ui.person(s.nombre, esc(s.rol)) }, { label: 'Antigüedad', render: (s) => yearsTxt(s.ingreso) }, { label: 'Generados', align: 'num', render: (s) => BT.leaveDays(s) }, { label: 'Tomados', align: 'num', render: (s) => BT.leaveTaken(s.id) }, { label: 'Programados', align: 'num', render: (s) => u.sum(BT.db.leaves.filter((l) => l.staffId === s.id && l.estado === 'Aprobada' && l.desde > td && l.tipo === 'Licencia anual'), 'dias') || '<span class="subtle">0</span>' }, { label: 'Saldo', align: 'num', render: (s) => { const v = BT.leaveDays(s) - BT.leaveTaken(s.id); return '<span class="strong ' + (v < 5 ? 't-warn' : 't-brand') + '">' + v + '</span>'; } }, { label: '', render: (s) => '<div style="width:110px">' + ui.bar(pct(BT.leaveTaken(s.id), BT.leaveDays(s)), '', true) + '</div>' }], staff, { compact: true }) });
      ui.enhance(panel);
    };
    ui.on(panel, {
      'lv-ok': (t) => { approveLeave(BT.db.leaves.find((l) => l.id === t.dataset.id), true); draw(); },
      'lv-no': (t) => { approveLeave(BT.db.leaves.find((l) => l.id === t.dataset.id), false); draw(); },
      'lv-new': () => leaveModal(draw),
    });
    draw();
  };
  function leaveModal(done) {
    ui.modal({
      title: 'Nueva solicitud de licencia', icon: 'umbrella',
      body: '<div class="form-grid">' + ui.field({ label: 'Funcionaria', name: 'sid', type: 'select', required: true, placeholder: 'Elegí…', options: staffScope().map((s) => ({ v: s.id, l: cleanName(s.nombre) + ' · ' + s.sede })), full: true }) +
        ui.field({ label: 'Tipo', name: 'tipo', type: 'chips', value: 'Licencia anual', options: ['Licencia anual', 'Licencia por estudio', 'Licencia especial'], full: true, required: true }) +
        ui.field({ label: 'Desde', name: 'desde', type: 'date', required: true, value: u.iso(u.addDays(new Date(), 14)) }) + ui.field({ label: 'Hasta', name: 'hasta', type: 'date', required: true, value: u.iso(u.addDays(new Date(), 23)) }) + '</div>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>' + ic('send') + 'Registrar solicitud</button>',
      onMount: (el, close) => el.querySelector('[data-save]').addEventListener('click', () => {
        if (!ui.validate(el)) return; const f = ui.formData(el);
        if (f.hasta < f.desde) { ui.toast('La fecha de fin es anterior al inicio', { type: 'warn' }); return; }
        const l = { id: u.uid('lv'), staffId: f.sid, tipo: f.tipo, desde: f.desde, hasta: f.hasta, estado: 'Pendiente', dias: u.daysBetween(f.desde, f.hasta) + 1 };
        BT.db.leaves.push(l); BT.save(); BT.audit('Registró solicitud de licencia', l.tipo, { detail: BT.staffById(f.sid).nombre + ' · ' + u.fmtDate(f.desde) + ' al ' + u.fmtDate(f.hasta) });
        close(); ui.toast('Solicitud registrada', { sub: l.dias + ' días · pendiente de aprobación', icon: 'send' }); done && done();
      }),
    });
  }

  /* ==========================================================================
     6) FALTAS
     ========================================================================== */
  function absenceModal(done) {
    if (!canManage()) return;
    const td = u.shiftDate();
    ui.modal({
      title: 'Registrar falta', sub: 'Si la funcionaria tenía turno asignado, se libera y se recalcula el ratio', icon: 'calendar-x',
      body: '<div class="form-grid">' + ui.field({ label: 'Funcionaria', name: 'sid', type: 'select', required: true, placeholder: 'Elegí…', options: staffScope().filter((s) => CARE.includes(s.rol)).map((s) => ({ v: s.id, l: cleanName(s.nombre) + ' · ' + s.sede })), full: true }) +
        ui.field({ label: 'Fecha', name: 'fecha', type: 'date', required: true, value: td }) + '<div class="field"><label>Turno afectado</label><div class="input" id="abTurn" style="display:flex;align-items:center;background:var(--surface-2)">—</div></div>' +
        ui.field({ label: 'Tipo', name: 'tipo', type: 'chips', required: true, options: [{ v: 'Certificado médico', l: 'Certificado médico', icon: 'thermometer' }, { v: 'Justificada', l: 'Justificada', icon: 'file-check-2' }, { v: 'Injustificada', l: 'Injustificada', icon: 'circle-x' }], full: true }) +
        ui.field({ label: 'Observaciones', name: 'nota', type: 'textarea', placeholder: 'Ej.: avisó por WhatsApp a las 15:10, certificación por 48 h', full: true }) + '</div>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>' + ic('save') + 'Guardar falta</button>',
      onMount: (el, close) => {
        const findSlot = () => { const f = ui.formData(el); let r = null; if (f.sid && f.fecha) SEDES.forEach((s) => TURNOS.forEach((t) => { if (slotIds(f.fecha, s, t).includes(f.sid)) r = { s, t }; })); el.querySelector('#abTurn').innerHTML = r ? BT.sedeTag(r.s) + '&nbsp;' + turnLabel(r.t) + ' ' + SH[r.t].from + '–' + SH[r.t].to : '<span class="muted">Sin turno asignado ese día</span>'; return r; };
        el.querySelectorAll('select,input').forEach((i) => i.addEventListener('change', findSlot));
        el.querySelector('[data-save]').addEventListener('click', () => {
          if (!ui.validate(el)) return; const f = ui.formData(el); const st = BT.staffById(f.sid); const r = findSlot();
          if (BT.db.absences.some((a) => a.staffId === f.sid && a.fecha === f.fecha)) { ui.toast('Ya hay una falta registrada ese día', { type: 'warn' }); return; }
          const a = { id: u.uid('ab'), staffId: f.sid, fecha: f.fecha, tipo: f.tipo, nota: f.nota, turno: r ? r.t : (TURNOS.includes(st.turnoBase) ? st.turnoBase : 'M'), sede: r ? r.s : st.sede };
          BT.db.absences.push(a);
          if (r) { const day = ensureDay(f.fecha); day[r.s][r.t] = day[r.s][r.t].filter((x) => x !== f.sid); }
          BT.save(); BT.audit('Registró falta', a.tipo, { detail: st.nombre + ' · ' + u.fmtDate(a.fecha) + ' · ' + turnLabel(a.turno), sede: a.sede });
          close();
          const rs = r ? BT.ratioStatus(f.fecha, r.s, r.t) : null;
          ui.toast('Falta registrada', { sub: cleanName(st.nombre) + ' · ' + a.tipo, icon: 'calendar-x' });
          if (rs && !rs.ok) setTimeout(() => ui.toast('Turno por debajo del ratio', { type: 'danger', sub: turnLabel(r.t) + ' ' + r.s + ' · ' + rs.assigned + ' de ' + rs.required + ' — buscá reemplazo en el planificador', icon: 'shield-alert', ms: 5200 }), 500);
          BT.shell.updateNav(); if (done) done(); else BT.refresh();
        });
      },
    });
  }
  RENDER.faltas = function (panel) {
    const draw = () => {
      const staff = staffScope(); const td = u.todayIso(); const from60 = u.iso(u.addDays(new Date(), -60)); const from30 = u.iso(u.addDays(new Date(), -30));
      const abs = BT.db.absences.filter((a) => staff.some((s) => s.id === a.staffId)).sort((a, b) => b.fecha.localeCompare(a.fecha));
      const a60 = abs.filter((a) => a.fecha >= from60 && a.fecha <= td);
      let sched = 0; Object.keys(BT.db.shifts).forEach((d) => { if (d < from30 || d > td) return; sedesScope().forEach((s) => TURNOS.forEach((t) => (sched += BT.db.shifts[d][s][t].length))); });
      const a30 = abs.filter((a) => a.fecha >= from30 && a.fecha <= td).length;
      const by = (t) => a60.filter((a) => a.tipo === t).length;
      panel.innerHTML = '<div class="grid g-4 stagger">' + ui.kpi({ label: 'Faltas (últimos 60 días)', value: a60.length, icon: 'calendar-x' }) + ui.kpi({ label: 'Con certificado médico', value: by('Certificado médico'), icon: 'thermometer', tone: 'info' }) + ui.kpi({ label: 'Injustificadas', value: by('Injustificada'), icon: 'circle-x', tone: by('Injustificada') ? 'danger' : '' }) + ui.kpi({ label: 'Ausentismo (30 días)', value: pct(a30, sched + a30), decimals: 1, suffix: '%', icon: 'activity', tone: 'warn', foot: a30 + ' faltas sobre ' + (sched + a30) + ' turnos programados' }) + '</div>' +
        '<div class="grid g-side mt-16">' + ui.card({ title: 'Por tipo', icon: 'chart-pie', body: '<div class="chart-box sm"><canvas id="abDon"></canvas></div><div class="legend mt-12" style="justify-content:center"><span><i style="background:' + BT.COLORS.info + '"></i>Certificado</span><span><i style="background:' + BT.COLORS.warn + '"></i>Justificada</span><span><i style="background:' + BT.COLORS.danger + '"></i>Injustificada</span></div>' }) +
        ui.card({ title: 'Registro de faltas', icon: 'list', actions: canManage() ? '<button class="btn primary sm" data-act="ab-new">' + ic('plus') + 'Registrar falta</button>' : '', bodyCls: 'flush',
          body: ui.table([{ label: 'Fecha', render: (a) => '<span class="num">' + u.fmtDate(a.fecha) + '</span><div class="subtle" style="font-size:var(--fs-xs)">' + u.relDay(a.fecha) + '</div>' }, { label: 'Funcionaria', render: (a) => ui.person(BT.staffById(a.staffId).nombre, BT.sedeTag(a.sede) + ' ' + turnLabel(a.turno)) }, { label: 'Tipo', render: (a) => ui.badge(a.tipo, a.tipo === 'Injustificada' ? 'danger' : a.tipo === 'Certificado médico' ? 'info' : 'warn', { dot: true }) }, { label: 'Observaciones', render: (a) => '<span class="muted" style="font-size:var(--fs-sm)">' + esc(a.nota || '—') + '</span>' }], abs, { compact: true, empty: { ill: 'leaf', title: 'Sin faltas', text: 'No hay faltas registradas.' } }) }) + '</div>';
      ui.enhance(panel);
      BT.chart('#abDon', { type: 'doughnut', data: { labels: ['Certificado médico', 'Justificada', 'Injustificada'], datasets: [{ data: [by('Certificado médico'), by('Justificada'), by('Injustificada')], backgroundColor: [BT.COLORS.info, BT.COLORS.warn, BT.COLORS.danger], borderWidth: 3, borderColor: '#fff', hoverOffset: 6 }] }, options: { cutout: '68%' } }, panel);
    };
    ui.on(panel, { 'ab-new': () => absenceModal(() => { BT._charts.forEach((c) => { if (c.canvas && panel.contains(c.canvas)) c.destroy(); }); draw(); }) });
    draw();
  };

  /* ==========================================================================
     7) ROTACIÓN
     ========================================================================== */
  const ROT = [
    { m: -11, sede: 'BT2', tipo: 'alta', nombre: 'Lorena Techera', motivo: 'Suplencia por licencia maternal' },
    { m: -10, sede: 'BT1', tipo: 'baja', nombre: 'Cecilia Morales', motivo: 'Renuncia · mejor oferta salarial' },
    { m: -10, sede: 'BT1', tipo: 'alta', nombre: 'Noelia Suárez', motivo: 'Reemplazo de vacante' },
    { m: -9, sede: 'BT2', tipo: 'alta', nombre: 'Sabrina Olmos', motivo: 'Ampliación de plantilla' },
    { m: -8, sede: 'BT2', tipo: 'baja', nombre: 'Lorena Techera', motivo: 'Fin de suplencia' },
    { m: -6, sede: 'BT2', tipo: 'alta', nombre: 'Daniela Prieto', motivo: 'Reemplazo de vacante' },
    { m: -5, sede: 'BT2', tipo: 'baja', nombre: 'Sabrina Olmos', motivo: 'Renuncia · mudanza al interior' },
    { m: -4, sede: 'BT1', tipo: 'baja', nombre: 'Noelia Suárez', motivo: 'Renuncia · carga de trabajo' },
    { m: -3, sede: 'BT2', tipo: 'baja', nombre: 'Daniela Prieto', motivo: 'Despido · período de prueba' },
  ];
  RENDER.rotacion = function (panel) {
    const months = Array.from({ length: 12 }, (_, i) => u.ym(u.addMonths(new Date(), i - 11)));
    const sedes = sedesScope(); const from30 = u.iso(u.addDays(new Date(), -30)); const td = u.todayIso();
    const stats = sedes.map((s) => {
      const st = careStaff().filter((x) => x.sede === s); const ev = ROT.filter((r) => r.sede === s);
      const bajas = ev.filter((r) => r.tipo === 'baja').length; const altas = ev.filter((r) => r.tipo === 'alta').length;
      let sched = 0; Object.keys(BT.db.shifts).forEach((d) => { if (d >= from30 && d <= td) TURNOS.forEach((t) => (sched += BT.db.shifts[d][s][t].length)); });
      const ab = BT.db.absences.filter((a) => a.sede === s && a.fecha >= from30 && a.fecha <= td).length;
      return { s, dot: st.length, bajas, altas, rot: pct(bajas, st.length + bajas / 2), ant: u.avg(st, (x) => u.daysBetween(x.ingreso, new Date()) / 365), aus: pct(ab, sched + ab) };
    });
    panel.innerHTML = '<div class="grid ' + (sedes.length > 1 ? 'g-2' : '') + ' stagger">' + stats.map((x) => '<div class="card hover"><div class="card-h"><h3>' + BT.sedeTag(x.s) + ' ' + esc(BT.sedeName(x.s)) + '</h3>' + ui.badge(u.fmtPct(x.rot, 0) + ' rotación anual', x.rot > 25 ? 'danger' : x.rot > 12 ? 'warn' : 'ok', { lg: true }) + '</div><div class="card-b"><div class="grid g-4 keep" style="gap:10px">' +
      [['Dotación actual', x.dot, 'users'], ['Altas 12 m', x.altas, 'user-plus'], ['Bajas 12 m', x.bajas, 'user-minus'], ['Antigüedad prom.', u.fmtNum(x.ant, 1) + ' años', 'hourglass']].map(([k, v, i]) => '<div class="kv-card"><div class="k">' + ic(i, 'ic-xs') + k + '</div><div class="v" style="font-size:18px">' + v + '</div></div>').join('') + '</div>' +
      '<div class="row between mt-16"><span class="muted">Ausentismo últimos 30 días</span><b class="num">' + u.fmtPct(x.aus) + '</b></div><div class="mt-8">' + ui.bar(Math.min(100, x.aus * 10), x.aus > 5 ? 'warn' : '', true) + '</div></div></div>').join('') + '</div>' +
      (sedes.length > 1 && stats[1].rot > stats[0].rot * 1.5 ? '<div class="alert info mt-16">' + ic('lightbulb') + '<div><b>Lectura:</b> BT2 rota ' + u.fmtNum(stats[1].rot / Math.max(1, stats[0].rot), 1) + ' veces más que BT1. Coincide con su mayor proporción de residentes dependientes (' + BT.ratioRequired().BT2.dep + ' de ' + BT.ratioRequired().BT2.total + '): conviene revisar la carga por turno y reforzar la noche.</div></div>' : '') +
      '<div class="grid g-main mt-16">' + ui.card({ title: 'Altas y bajas por mes', icon: 'chart-column', sub: 'Últimos 12 meses · bajas hacia abajo', body: '<div class="chart-box"><canvas id="rtChart"></canvas></div>' }) +
      ui.card({ title: 'Movimientos', icon: 'history', bodyCls: 'flush', body: '<div class="list">' + ROT.filter((r) => sedes.includes(r.sede)).slice().reverse().map((r) => '<div class="li"><span class="li-ic ' + (r.tipo === 'alta' ? 'ok' : 'danger') + '">' + ic(r.tipo === 'alta' ? 'user-plus' : 'user-minus', 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(r.nombre) + ' ' + BT.sedeTag(r.sede) + '</div><div class="d">' + esc(r.motivo) + '</div></div><span class="w">' + u.cap(u.fmtMonth(u.ym(u.addMonths(new Date(), r.m)))) + '</span></div>').join('') + '</div>' }) + '</div>';
    ui.enhance(panel);
    const ds = [];
    sedes.forEach((s) => {
      ds.push({ label: 'Altas ' + s, data: months.map((m, i) => ROT.filter((r) => r.sede === s && r.tipo === 'alta' && r.m === i - 11).length), backgroundColor: BT.alpha(BT.COLORS[s], 0.85), stack: 'x', maxBarThickness: 26 });
      ds.push({ label: 'Bajas ' + s, data: months.map((m, i) => -ROT.filter((r) => r.sede === s && r.tipo === 'baja' && r.m === i - 11).length), backgroundColor: BT.alpha(BT.COLORS[s], 0.35), stack: 'x', maxBarThickness: 26 });
    });
    BT.chart('#rtChart', { type: 'bar', data: { labels: months.map(u.fmtMonthShort), datasets: ds }, options: { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'rectRounded' } }, tooltip: { callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + Math.abs(c.raw) } } }, scales: { y: { ticks: { stepSize: 1, callback: (v) => Math.abs(v) } }, x: { grid: { display: false }, stacked: true } } } }, panel);
  };

  /* ==========================================================================
     8) SUELDOS
     ========================================================================== */
  RENDER.sueldos = function (panel) {
    const months = [ymNow(), u.ym(u.addMonths(new Date(), -1))];
    if (!P.payMonth) P.payMonth = months[0];
    const draw = () => {
      const rows = payroll(P.payMonth); const tot = (k) => u.sum(rows, k);
      panel.innerHTML = '<div class="row between wrap mb-16">' + ui.seg('py-m', months.map((m) => ({ id: m, label: u.cap(u.fmtMonth(m)) })), P.payMonth, 'sm') +
        '<div class="row gap-6"><button class="btn sm" data-act="csv">' + ic('file-down') + 'CSV</button><button class="btn primary sm" data-act="xlsx">' + ic('file-spreadsheet') + 'Exportar a Excel</button></div></div>' +
        '<div class="grid g-4 stagger">' + ui.kpi({ label: 'Nominal total', value: tot('salario'), money: true, icon: 'banknote' }) + ui.kpi({ label: 'Adicionales (extra, noct., feriados)', value: tot('adExtra') + tot('adNoct') + tot('adFer'), money: true, icon: 'plus', tone: 'warn' }) + ui.kpi({ label: 'Descuentos por faltas', value: tot('desc'), money: true, icon: 'minus', tone: tot('desc') ? 'danger' : 'ink' }) + ui.kpi({ label: 'Haberes estimados', value: tot('total'), money: true, icon: 'calculator', tone: 'info', foot: 'Antes de aportes y retenciones' }) + '</div>' +
        ui.card({ cls: 'mt-16', title: 'Preliquidación · ' + u.fmtMonth(P.payMonth), icon: 'calculator', sub: 'Lista para enviar al estudio contable', bodyCls: 'flush',
          body: ui.table([
            { label: 'Funcionaria', render: (r) => ui.person(r.nombre, r.ci + ' · ' + esc(r.cargo)) },
            { label: 'Nominal', align: 'num', render: (r) => u.fmtMoney(r.salario) },
            { label: 'Días', align: 'num', render: (r) => r.dias },
            { label: 'H. extra', align: 'num', render: (r) => u.fmtNum(r.extraH, 1) },
            { label: 'H. noct.', align: 'num', render: (r) => r.noct },
            { label: 'Feriados', align: 'num', render: (r) => r.ferP },
            { label: 'Faltas', align: 'center', render: (r) => (r.cert ? ui.badge(r.cert + ' cert.', 'info') + ' ' : '') + (r.just ? ui.badge(r.just + ' just.', 'warn') + ' ' : '') + (r.inj ? ui.badge(r.inj + ' injust.', 'danger') : '') || '<span class="subtle">—</span>' },
            { label: 'Licencia', align: 'num', render: (r) => (r.lic ? r.lic + ' d' : '<span class="subtle">—</span>') },
            { label: 'Adicionales', align: 'num', render: (r) => u.fmtMoney(r.adExtra + r.adNoct + r.adFer) },
            { label: 'Descuentos', align: 'num', render: (r) => (r.desc ? '<span class="t-danger">−' + u.fmtMoney(r.desc).replace('$U ', '$U ') + '</span>' : '<span class="subtle">—</span>') },
            { label: 'Total estimado', align: 'num', render: (r) => '<b>' + u.fmtMoney(r.total) + '</b>' },
          ], rows, { compact: true, foot: '<tr><td>Total · ' + rows.length + ' funcionarias</td><td class="num">' + u.fmtMoney(tot('salario')) + '</td><td class="num">' + tot('dias') + '</td><td class="num">' + u.fmtNum(tot('extraH'), 1) + '</td><td class="num">' + tot('noct') + '</td><td class="num">' + tot('ferP') + '</td><td></td><td class="num">' + tot('lic') + ' d</td><td class="num">' + u.fmtMoney(tot('adExtra') + tot('adNoct') + tot('adFer')) + '</td><td class="num">' + u.fmtMoney(tot('desc')) + '</td><td class="num">' + u.fmtMoney(tot('total')) + '</td></tr>' }),
          foot: '<span class="subtle" style="font-size:var(--fs-xs)">' + ic('info', 'ic-xs') + ' Horas extra con recargo del 100 % · nocturnidad 20 % (Ley 19.313) · feriado pago trabajado: jornal doble · valor hora = nominal ÷ 200. Validar con el estudio contable antes de liquidar.</span>' });
      ui.enhance(panel);
    };
    panel.addEventListener('segchange', (e) => { if (e.detail.name === 'py-m') { P.payMonth = e.detail.value; draw(); } });
    ui.on(panel, { xlsx: () => exportSueldos('xlsx', P.payMonth), csv: () => exportSueldos('csv', P.payMonth) });
    draw();
  };

  /* ---------------- Exportaciones ---------------- */
  const PAY_COLS = [
    { header: 'CI', key: 'ci', width: 13 }, { header: 'Nombre', key: 'nombre', width: 30 }, { header: 'Sede', key: 'sede', width: 7 }, { header: 'Cargo', key: 'cargo', width: 20 },
    { header: 'Salario nominal', key: 'salario', fmt: 'money', width: 15 }, { header: 'Días trabajados', key: 'dias', fmt: 'int', width: 10 }, { header: 'Horas comunes', key: 'horas', fmt: 'int', width: 10 },
    { header: 'Horas extra', key: 'extraH', fmt: 'dec', width: 10 }, { header: 'Horas nocturnas', key: 'noct', fmt: 'int', width: 11 }, { header: 'Feriados pagos trab.', key: 'ferP', fmt: 'int', width: 11 }, { header: 'Feriados no lab. trab.', key: 'ferN', fmt: 'int', width: 11 },
    { header: 'Faltas c/certificado', key: 'cert', fmt: 'int', width: 11 }, { header: 'Faltas justificadas', key: 'just', fmt: 'int', width: 11 }, { header: 'Faltas injustificadas', key: 'inj', fmt: 'int', width: 11 }, { header: 'Días de licencia', key: 'lic', fmt: 'int', width: 10 },
    { header: 'Adic. horas extra', key: 'adExtra', fmt: 'money', width: 14 }, { header: 'Adic. nocturnidad', key: 'adNoct', fmt: 'money', width: 14 }, { header: 'Adic. feriados', key: 'adFer', fmt: 'money', width: 13 }, { header: 'Descuento faltas', key: 'desc', fmt: 'money', width: 13 },
    { header: 'Total haberes estimado', key: 'total', fmt: 'money', width: 16 }, { header: 'Observaciones', key: 'obs', width: 48, wrap: true },
  ];
  function exportSueldos(kind, ym) {
    const rows = payroll(ym || ymNow()); const name = 'Sueldos ' + u.fmtMonth(ym || ymNow()) + ' - ' + BT.sedeLabel();
    if (kind === 'csv') return BT.csv(name, PAY_COLS, rows);
    const ck = BT.db.clock.filter((c) => c.fecha.startsWith(ym) && rows.some((r) => r.id === c.staffId)).sort((a, b) => (a.fecha + a.in).localeCompare(b.fecha + b.in));
    const lv = BT.db.leaves.filter((l) => rows.some((r) => r.id === l.staffId));
    BT.xlsx({
      filename: name, title: 'Exportación para liquidación de sueldos', subtitle: u.cap(u.fmtMonth(ym)),
      sheets: [
        { name: 'Preliquidación', columns: PAY_COLS, rows, freezeCols: 2, totals: { salario: 'sum', dias: 'sum', horas: 'sum', extraH: 'sum', noct: 'sum', ferP: 'sum', ferN: 'sum', cert: 'sum', just: 'sum', inj: 'sum', lic: 'sum', adExtra: 'sum', adNoct: 'sum', adFer: 'sum', desc: 'sum', total: 'sum' }, notes: 'Horas extra con recargo del 100 %; nocturnidad 20 % (Ley 19.313); feriado pago trabajado: jornal doble; valor hora = nominal ÷ 200. Preliquidación estimada: validar con el estudio contable.' },
        { name: 'Marcas', columns: [{ header: 'Fecha', key: 'fecha', fmt: 'date', width: 12 }, { header: 'Funcionaria', key: 'n', width: 30, value: (c) => BT.staffById(c.staffId).nombre }, { header: 'Sede', key: 'sede', width: 7 }, { header: 'Turno', key: 't', width: 10, value: (c) => turnLabel(c.turno) }, { header: 'Entrada', key: 'in', width: 9 }, { header: 'Salida', key: 'out', width: 9 }, { header: 'Minutos extra', key: 'extraMin', fmt: 'int', width: 12 }, { header: 'Feriado', key: 'f', width: 26, value: (c) => (feriado(c.fecha) || {}).nombre || '' }], rows: ck, totals: { extraMin: 'sum' } },
        { name: 'Licencias y faltas', columns: [{ header: 'Funcionaria', key: 'n', width: 30 }, { header: 'Tipo', key: 'tipo', width: 22 }, { header: 'Desde', key: 'desde', fmt: 'date', width: 12 }, { header: 'Hasta', key: 'hasta', fmt: 'date', width: 12 }, { header: 'Días', key: 'dias', fmt: 'int', width: 8 }, { header: 'Estado', key: 'estado', width: 12 }, { header: 'Observaciones', key: 'nota', width: 46, wrap: true }],
          rows: lv.map((l) => ({ n: BT.staffById(l.staffId).nombre, tipo: l.tipo, desde: l.desde, hasta: l.hasta, dias: l.dias, estado: l.estado, nota: '' })).concat(BT.db.absences.filter((a) => a.fecha.startsWith(ym) && rows.some((r) => r.id === a.staffId)).map((a) => ({ n: BT.staffById(a.staffId).nombre, tipo: 'Falta · ' + a.tipo, desde: a.fecha, hasta: a.fecha, dias: 1, estado: 'Registrada', nota: a.nota }))) },
      ],
    });
  }

  function planPdf(ym) {
    const D = BT.doc; ym = ym || P.month || ymNow(); const nd = daysInMonth(ym); const sedes = sedesScope();
    const days = Array.from({ length: nd }, (_, i) => ym + '-' + u.pad(i + 1));
    const CL = { M: 'background:#fdf0d9;color:#8a5a0c', T: 'background:#ece9f6;color:#55408a', N: 'background:#2f3a44;color:#e7edf2', L: 'background:#e7f3eb;color:#2f7d4a', F: 'background:#fbecea;color:#b4352b' };
    const cell = (c, extra = '') => '<span style="display:inline-block;width:15px;height:15px;line-height:15px;border-radius:4px;font-weight:750;font-size:6.5pt;' + (CL[c] || 'color:#c4bfb5') + extra + '">' + (CL[c] ? c : '·') + '</span>';
    let body = '<style>.mx th,.mx td{padding:2px 0!important;text-align:center;font-size:6.6pt}.mx th{font-size:6pt!important;letter-spacing:0!important}.mx td.w,.mx th.w{text-align:left;padding:2px 5px!important;white-space:nowrap;font-size:7pt}.mx tr.cv td{background:#f1f8f3;font-weight:700}.mx tr.cv td.bad{background:#fbecea;color:#b4352b}.mx .we{background:#f8f7f4}</style>';
    const unc = [];
    sedes.forEach((s, si) => {
      const people = careStaff().filter((x) => x.sede === s || x.volante || days.some((d) => TURNOS.some((t) => slotIds(d, s, t).includes(x.id))));
      body += (si ? '<div style="break-before:page"></div>' : '') + D.section(BT.sedeName(s) + ' · Planilla de turnos de ' + u.fmtMonth(ym),
        '<table class="mx"><thead><tr><th class="w">Funcionaria</th>' + days.map((d) => { const dt = u.toDate(d); return '<th>' + u.DIAS_C[dt.getDay()].slice(0, 2) + '<br>' + dt.getDate() + '</th>'; }).join('') + '<th>Hs</th></tr></thead><tbody>' +
        people.map((p) => { let h = 0; return '<tr><td class="w">' + esc(shortName(p.nombre)) + (p.volante ? ' (V)' : '') + '</td>' + days.map((d) => { const dt = u.toDate(d); const we = dt.getDay() === 0 || dt.getDay() === 6; let c = cell('·'); if (onLeave(p.id, d)) c = cell('L'); else if (absentOn(p.id, d)) c = cell('F'); else for (const ss of SEDES) for (const t of TURNOS) if (slotIds(d, ss, t).includes(p.id)) { h += 8; c = cell(t, ss !== s ? ';outline:1px dashed #9d988f' : ''); } return '<td class="' + (we ? 'we' : '') + '">' + c + '</td>'; }).join('') + '<td><b>' + h + '</b></td></tr>'; }).join('') +
        TURNOS.map((t) => '<tr class="cv"><td class="w">Cobertura ' + turnLabel(t).toLowerCase() + '</td>' + days.map((d) => { const st = BT.ratioStatus(d, s, t); if (!st.ok) unc.push({ d, s, t, st }); return '<td class="' + (st.ok ? '' : 'bad') + '">' + st.assigned + '/' + st.required + '</td>'; }).join('') + '<td></td></tr>').join('') +
        '</tbody></table><p class="small muted" style="margin-top:6px">M: Mañana 06–14 · T: Tarde 14–22 · N: Noche 22–06 · L: licencia · F: falta · (V): volante · recuadro punteado: turno en la otra sede. Cobertura: asignadas / requeridas según ratio (Ord. 1032/2019).</p>');
    });
    body += D.section('Turnos por debajo del ratio', unc.length ? D.table([{ label: 'Fecha', render: (x) => u.fmtDate(x.d) }, { label: 'Sede', render: (x) => x.s }, { label: 'Turno', render: (x) => turnLabel(x.t) }, { label: 'Asignadas', align: 'num', render: (x) => x.st.assigned }, { label: 'Requeridas', align: 'num', render: (x) => x.st.required }, { label: 'Estado', render: (x) => D.badge(isPastShift(x.d, x.t) ? 'Finalizado' : 'A cubrir', isPastShift(x.d, x.t) ? '' : 'danger') }], unc, { compact: true }) : D.note('Todos los turnos del mes cumplen el ratio mínimo de cuidadoras.'));
    const mS = ym + '-01', mE = ym + '-' + u.pad(nd);
    const lv = BT.db.leaves.filter((l) => l.estado !== 'Rechazada' && l.desde <= mE && l.hasta >= mS && staffScope().some((s) => s.id === l.staffId));
    body += D.section('Licencias del período', D.table([{ label: 'Funcionaria', render: (l) => esc(BT.staffById(l.staffId).nombre) }, { label: 'Sede', render: (l) => BT.staffById(l.staffId).sede }, { label: 'Tipo', render: (l) => esc(l.tipo) }, { label: 'Desde', render: (l) => u.fmtDate(l.desde) }, { label: 'Hasta', render: (l) => u.fmtDate(l.hasta) }, { label: 'Días', align: 'num', render: (l) => l.dias }, { label: 'Estado', render: (l) => D.badge(l.estado, l.estado === 'Aprobada' ? 'ok' : 'warn') }], lv, { empty: 'Sin licencias en el período.' }));
    body += D.signatures(['Dirección', 'Jefa de Enfermería']);
    D.open({ title: 'Planificación de turnos y licencias', subtitle: u.cap(u.fmtMonth(ym)) + ' · ' + esc(BT.sedeName()), landscape: true, kicker: 'Recursos humanos', filename: 'Planificación de turnos ' + u.fmtMonth(ym), body, sede: BT.state.sede });
  }
  function ratioPdf() {
    const D = BT.doc; const sedes = sedesScope(); const base = u.shiftDate(); const q = reqWith(BT.db.settings.ratio); const p = BT.db.settings.ratio;
    const days = Array.from({ length: 14 }, (_, k) => u.iso(u.addDays(base, k)));
    D.open({
      title: 'Informe de ratio de cuidadoras', subtitle: 'Próximos 14 días · ' + esc(BT.sedeName()), kicker: 'Cumplimiento normativo', filename: 'Ratio de cuidadoras ' + u.fmtDate(new Date()).replace(/\//g, '-'), sede: BT.state.sede,
      body: D.note('Criterio: Ordenanza MSP 1032/2019 (dependiente = índice de Barthel 0–40) y Decreto 356/016, art. 19. Parámetros vigentes: día 1 c/' + p.diaDep + ' dependientes + 1 c/' + p.diaInd + ' no dependientes; noche 1 c/' + p.nocheDep + ' + 1 c/' + p.nocheInd + '.') +
        D.section('Residentes y mínimo requerido', D.table([{ label: 'Sede', render: (s) => esc(BT.sedeName(s)) }, { label: 'Residentes', align: 'num', render: (s) => q[s].total }, { label: 'Dependientes', align: 'num', render: (s) => q[s].dep }, { label: 'No dependientes', align: 'num', render: (s) => q[s].ind }, { label: 'Mínimo mañana/tarde', align: 'num', render: (s) => q[s].dia }, { label: 'Mínimo noche', align: 'num', render: (s) => q[s].noche }], sedes)) +
        D.section('Cobertura por turno', D.table([{ label: 'Día', render: (d) => dayWord(d) + ' ' + u.fmtDate(d) }].concat(...sedes.map((s) => TURNOS.map((t) => ({ label: s + ' ' + turnLabel(t), align: 'center', render: (d) => { const st = BT.ratioStatus(d, s, t); return D.badge(st.assigned + '/' + st.required, st.ok ? 'ok' : 'danger'); } })))), days, { compact: true })) +
        D.signatures(['Dirección', 'Médico Director Técnico']),
    });
  }
  function doExport(id) {
    if (id === 'pdf-plan') planPdf(P.month);
    else if (id === 'pdf-ratio') ratioPdf();
    else if (id === 'xlsx-sueldos') exportSueldos('xlsx', P.payMonth || ymNow());
    else if (id === 'csv-sueldos') exportSueldos('csv', P.payMonth || ymNow());
  }

  /* ==========================================================================
     ALERTAS
     ========================================================================== */
  const ROLES_RRHH = ['direccion', 'administracion', 'enfermeria'];
  BT.addAlerts(() => {
    const out = []; const d0 = u.shiftDate(); const d1 = u.iso(u.addDays(d0, 1));
    const all = uncovered(14, SEDES);
    all.filter((x) => x.fecha === d0 || x.fecha === d1).forEach((x) => {
      const why = gapReason(x.fecha, x.sede, x.turno);
      out.push({ id: 'ratio-' + key(x.fecha, x.sede, x.turno), tone: 'danger', icon: 'shield-alert', sede: x.sede, roles: ROLES_RRHH,
        title: 'Turno ' + turnLabel(x.turno).toLowerCase() + ' ' + x.sede + ' por debajo del ratio',
        desc: dayWord(x.fecha) + ' ' + u.fmtDateShort(x.fecha) + ' · ' + x.assigned + ' de ' + x.required + ' cuidadoras' + (why.length ? ' · ' + why[0] : ''),
        tab: 'personal', params: { fecha: x.fecha, sede: x.sede, turno: x.turno }, when: shiftStartTs(x.fecha, x.turno) });
    });
    SEDES.forEach((s) => {
      const rest = all.filter((x) => x.sede === s && x.fecha !== d0 && x.fecha !== d1);
      if (rest.length) out.push({ id: 'ratio14-' + s, tone: 'warn', icon: 'calendar-range', sede: s, roles: ROLES_RRHH, title: rest.length + ' turno' + (rest.length > 1 ? 's' : '') + ' sin cubrir en ' + s, desc: 'Próximos 14 días · el primero: ' + turnLabel(rest[0].turno).toLowerCase() + ' del ' + u.fmtDate(rest[0].fecha), tab: 'personal', params: { fecha: rest[0].fecha, sede: s, turno: rest[0].turno } });
    });
    BT.db.staff.forEach((s) => {
      const n = u.daysUntil(s.carneSalud.vence);
      if (n <= 30) out.push({ id: 'carne-' + s.id, tone: n < 0 ? 'danger' : 'warn', icon: 'badge-check', sede: s.sede, roles: ROLES_RRHH, title: 'Carné de salud ' + (n < 0 ? 'vencido' : 'por vencer'), desc: cleanName(s.nombre) + ' · ' + (n < 0 ? 'venció hace ' + -n + ' días' : 'vence ' + u.relDay(s.carneSalud.vence)), action: () => openStaff(s.id), tab: 'personal' });
    });
    const sw = BT.db.swaps.filter((x) => x.estado === 'Pendiente');
    SEDES.forEach((s) => { const n = sw.filter((x) => x.sede === s).length; if (n) out.push({ id: 'swaps-' + s, tone: 'info', icon: 'arrow-left-right', sede: s, roles: ['direccion', 'enfermeria'], title: n + ' solicitud' + (n > 1 ? 'es' : '') + ' de cambio de turno', desc: 'Pendiente' + (n > 1 ? 's' : '') + ' de aprobación · ' + s, tab: 'personal', params: { sub: 'planificador' }, action: () => { BT.go('personal'); setTimeout(swapsModal, 350); } }); });
    overlaps().forEach((o) => out.push({ id: 'ovl-' + o.sede + o.desde, tone: 'warn', icon: 'umbrella', sede: o.sede, roles: ROLES_RRHH, title: 'Licencias superpuestas en ' + o.sede, desc: o.ids.size + ' funcionarias entre el ' + u.fmtDateShort(o.desde) + ' y el ' + u.fmtDateShort(o.hasta), tab: 'personal', params: { sub: 'licencias' } }));
    return out;
  });

  BT.personal = { assign, unassign, candidates, openSlot, uncovered, payroll, exportSueldos, planPdf };
})();

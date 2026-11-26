/* ==========================================================================
   Cuidados diarios y cambio de turno (pensado para tablet)
   Registro rápido por habitación/QR, parte de entrega de turno e incidentes
   ========================================================================== */
(function () {
  'use strict';
  const BT = window.BT, u = BT.u, ic = BT.ic, esc = u.esc, ui = BT.ui;

  BT.addCSS('cui', `
  .cui-wrap{display:grid;grid-template-columns:minmax(300px,380px) minmax(0,1fr);gap:16px;align-items:start}
  @media (max-width:1080px){.cui-wrap{grid-template-columns:1fr}}
  .rooms{display:grid;grid-template-columns:repeat(auto-fill,minmax(98px,1fr));gap:8px}
  .rm{border:1px solid var(--line);border-radius:12px;padding:6px;background:var(--surface-2)}
  .rm .rn{font-size:10.5px;font-weight:700;color:var(--ink-500);letter-spacing:.04em;margin:0 2px 5px;display:flex;justify-content:space-between}
  .rm .bd{display:grid;grid-template-columns:1fr 1fr;gap:5px}
  .bedbtn{position:relative;min-height:54px;border-radius:9px;border:1px solid var(--brand-200);background:var(--brand-50);color:var(--brand-900);font-size:11px;font-weight:650;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:4px;transition:transform var(--d) var(--ease-spring),box-shadow var(--d) var(--ease),background var(--d)}
  .bedbtn:hover{transform:translateY(-2px);box-shadow:var(--sh-2)}
  .bedbtn .ini{font-size:13px;letter-spacing:.02em}
  .bedbtn .cm{font-size:9.5px;font-weight:600;color:var(--brand-700);opacity:.8}
  .bedbtn.on{background:var(--brand-600);border-color:var(--brand-700);color:#fff;box-shadow:0 6px 16px -6px color-mix(in srgb, var(--brand-600) 60%, transparent)}
  .bedbtn.on .cm{color:#fff}
  .bedbtn.free{background:transparent;border-style:dashed;border-color:var(--line-strong);color:var(--ink-300);cursor:default}
  .bedbtn.res{background:var(--warn-bg);border-color:var(--warn-line);color:var(--warn);cursor:default}
  .bedbtn .alert-dot{position:absolute;top:4px;right:4px;width:7px;height:7px;border-radius:50%;background:var(--danger);box-shadow:0 0 0 2px #fff}
  .code-in{display:flex;gap:8px}
  .code-in .input{font-size:18px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;text-align:center;min-height:48px}
  .qa-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
  @media (max-width:640px){.qa-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  .qa{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:96px;border-radius:16px;border:1px solid var(--line);background:var(--surface);font-weight:650;font-size:var(--fs-md);color:var(--ink-800);box-shadow:var(--sh-1);transition:all var(--d) var(--ease)}
  .qa .qi{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:var(--brand-50);color:var(--brand-600);transition:transform var(--d) var(--ease-spring)}
  .qa:hover{box-shadow:var(--sh-3);transform:translateY(-2px);border-color:var(--brand-200)}
  .qa:hover .qi{transform:scale(1.08)}
  .qa.on{border-color:var(--brand-500);background:var(--brand-50);box-shadow:0 0 0 3px var(--brand-100)}
  .qa.on .qi{background:var(--brand-600);color:#fff}
  .qa small{font-size:11px;font-weight:500;color:var(--ink-500)}
  .composer{border:1px solid var(--brand-200);background:linear-gradient(180deg,var(--brand-50),#fff 60%);border-radius:var(--r-lg);padding:16px;animation:riseIn var(--d-slow) var(--ease-out) both}
  .postural .li .w b{font-variant-numeric:tabular-nums}
  .ok-burst{display:flex;flex-direction:column;align-items:center;text-align:center;padding:10px 0 4px}
  .ok-burst > svg{width:92px;height:92px}
  .const-list .ci > .ic{color:var(--ink-400)}
  .ok-burst .c1{stroke-dasharray:283;stroke-dashoffset:283;animation:drawc 700ms var(--ease-out) forwards}
  .ok-burst .c2{stroke-dasharray:60;stroke-dashoffset:60;animation:drawc 420ms 520ms var(--ease-out) forwards}
  .ok-burst .halo{transform-origin:center;animation:halo 900ms 300ms var(--ease-out) both}
  @keyframes drawc{to{stroke-dashoffset:0}}
  @keyframes halo{from{opacity:.6;transform:scale(.6)}to{opacity:0;transform:scale(1.5)}}
  .const-list{display:flex;flex-direction:column;gap:8px;margin-top:18px;width:100%;max-width:440px;text-align:left}
  .const-list .ci{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:var(--surface-2);border:1px solid var(--line);opacity:0;animation:riseIn var(--d-slow) var(--ease-out) forwards}
  .const-list .ci .ck{width:24px;height:24px;border-radius:50%;background:var(--brand-600);color:#fff;display:grid;place-items:center;flex:none}
  .const-list .ci .ck .ic{width:13px;height:13px;stroke-width:3}
  .inc-section{border-top:1px dashed var(--line-strong);padding-top:14px}
  .pend-ed{display:flex;flex-direction:column;gap:6px}
  .pend-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line);animation:riseIn var(--d) var(--ease-out) both}
  .pend-row label{display:flex;gap:10px;align-items:center;flex:1;cursor:pointer}
  .pend-row input[type=checkbox]{width:18px;height:18px;accent-color:var(--brand-600)}
  .pend-row .grow{display:flex;gap:7px;align-items:center}
  .pend-row.done span{text-decoration:line-through;color:var(--ink-400)}
  .clock-big{font-size:28px;font-weight:700;letter-spacing:-.03em;font-variant-numeric:tabular-nums;line-height:1}
  .qr-frame{position:relative;width:220px;height:220px;margin:6px auto 0;border-radius:22px;background:repeating-conic-gradient(#262625 0 25%,#fff 0 50%) 0 0/22px 22px;opacity:.9;overflow:hidden;box-shadow:inset 0 0 0 10px #fff,0 0 0 1px var(--line)}
  .qr-frame::after{content:"";position:absolute;left:8%;right:8%;height:3px;border-radius:3px;background:var(--brand-400);box-shadow:0 0 18px 4px color-mix(in srgb, var(--brand-400) 70%, transparent);animation:scan 1.2s ease-in-out infinite alternate}
  @keyframes scan{from{top:10%}to{top:88%}}
  `);

  /* ---------------- Estado ---------------- */
  const CS = () => (BT.state.cuiUI = BT.state.cuiUI || { rid: null, sede: 'BT1', tipo: null });
  const opSede = () => (BT.state.sede === 'ALL' ? CS().sede || 'BT1' : BT.state.sede);
  const fresh = (host) => { host.innerHTML = ''; const d = document.createElement('div'); host.appendChild(d); return d; };
  const roomSort = (a, b) => (a.habitacion.padStart(2, '0') + a.cama).localeCompare(b.habitacion.padStart(2, '0') + b.cama);
  const shortPerson = (n) => { const p = String(n || '').replace(/^(Dr\.|Dra\.|Lic\.)\s*/, '').split(/\s+/); return p[0] + (p[1] ? ' ' + p[1][0] + '.' : ''); };
  const CARE = [
    { id: 'Higiene', icon: 'bath', hint: 'Baño, higiene en cama', opts: ['Baño en ducha con asistencia', 'Higiene en cama', 'Higiene parcial y cambio de pañal', 'Higiene bucal y de prótesis', 'Cambio de pañal'] },
    { id: 'Ingesta', icon: 'soup', hint: 'Cuánto comió', comida: true, opts: ['Completa', 'Comió 3/4', 'Comió 1/2', 'Comió 1/4', 'Rechazó la comida'] },
    { id: 'Hidratación', icon: 'glass-water', hint: 'Líquidos ingeridos', opts: ['150 ml', '250 ml', '400 ml', '500 ml', 'Rechazó líquidos'] },
    { id: 'Cambio postural', icon: 'refresh-ccw', hint: 'Cada 2 horas', opts: ['Decúbito lateral derecho', 'Decúbito lateral izquierdo', 'Decúbito supino', 'Sedestación en sillón', 'Talones en descarga'] },
    { id: 'Deposición', icon: 'droplets', hint: 'Deposiciones y diuresis', opts: ['Deposición normal', 'Deposición blanda', 'Deposición líquida', 'Sin deposición en el turno', 'Diuresis en pañal'] },
    { id: 'Actividad', icon: 'music', hint: 'Recreación y vínculos', opts: ['Taller de memoria', 'Paseo acompañado', 'Musicoterapia', 'Visita familiar', 'Descanso en habitación'] },
  ];
  const careIcon = (t) => (CARE.find((c) => c.id === t) || { icon: 'notebook-pen' }).icon;
  const lastPostural = (rid) => { const l = BT.db.care.filter((c) => c.residentId === rid && c.tipo === 'Cambio postural'); return l.length ? Math.max(...l.map((c) => c.ts)) : null; };
  const shiftWindow = () => { const d = u.shiftDate(); const t = u.currentShift(); const s = u.toDate(d); const [h] = u.SHIFTS[t].from.split(':').map(Number); s.setHours(h, 0, 0, 0); return { fecha: d, turno: t, start: s.getTime(), end: s.getTime() + 8 * 3600000 }; };
  const nowLocal = () => { const d = new Date(); return u.iso(d) + 'T' + u.fmtTime(d); };

  /* Alerta: cambios posturales atrasados (residentes dependientes) */
  BT.addAlerts(() => ['BT1', 'BT2'].map((s) => {
    const dep = BT.db.residents.filter((r) => r.sede === s && r.estado === 'activo' && BT.isDependent(r));
    const late = dep.filter((r) => { const l = lastPostural(r.id); return !l || Date.now() - l > 3 * 3600000; });
    if (!late.length) return null;
    return { id: 'cui-post-' + s, tone: 'warn', icon: 'refresh-ccw', sede: s, roles: ['enfermeria', 'cuidadora', 'direccion'], title: late.length + ' cambios posturales atrasados · ' + s, desc: late.slice(0, 3).map(BT.shortName).join(', ') + (late.length > 3 ? '…' : '') + ' (más de 3 h)', tab: 'cuidados', params: { sub: 'registro', sede: s } };
  }).filter(Boolean));

  /* ==========================================================================
     Pestaña
     ========================================================================== */
  BT.tab({
    id: 'cuidados', label: 'Cuidados y turno', icon: 'hand-heart', group: 'dia', order: 5, roles: ['direccion', 'medico', 'enfermeria', 'cuidadora'],
    render(el, params) {
      const cs = CS();
      if (params && !params._applied) {
        params._applied = true;
        if (params.sub) BT.state.sub.cui = params.sub;
        if (params.residentId) { cs.rid = params.residentId; const r = BT.resident(params.residentId); if (r) cs.sede = r.sede; BT.state.sub.cui = params.sub || 'registro'; }
        if (params.sede) cs.sede = params.sede;
      }
      const usr = BT.state.user; const t = u.currentShift(); const SH = u.SHIFTS[t];
      const isCui = BT.isRole('cuidadora');
      const head = isCui
        ? '<div class="tablet-bar mt-16 mb-16">' + ui.avatar(usr.nombre, { size: 'lg' }) + '<div class="grow"><div style="font-weight:700;font-size:var(--fs-lg)">Hola, ' + esc(usr.nombre.split(' ')[0]) + '</div><div style="opacity:.7;font-size:var(--fs-sm)">' + esc(BT.sedeName(usr.sede)) + ' · Turno ' + SH.label.toLowerCase() + ' ' + SH.from + '–' + SH.to + '</div></div>' +
          '<div style="text-align:right;margin-right:6px"><div class="clock-big" data-clock>' + u.fmtTime(new Date()) + '</div><div style="opacity:.6;font-size:11px">' + u.cap(u.fmtDateLong(new Date()).split(' de ' + new Date().getFullYear())[0]) + '</div></div>' +
          '<button class="btn danger" data-act="incident" style="background:#fff">' + ic('siren') + 'Incidente</button></div>'
        : ui.pageHeader({ eyebrow: 'Día a día · ' + BT.sedeName(), icon: 'hand-heart', title: 'Cuidados y cambio de turno', sub: 'Registro de higiene, ingesta, cambios posturales y novedades, con entrega de turno.',
          actions: '<button class="btn" data-act="export-parte">' + ic('file-text') + 'Parte de turno</button><button class="btn primary" data-act="incident">' + ic('siren') + 'Registrar incidente</button>' });
      el.innerHTML = head + '<div id="cuiTabs"></div>';
      ui.subtabs(el.querySelector('#cuiTabs'), 'cui', [
        { id: 'registro', label: 'Registro rápido', icon: 'tablet' },
        { id: 'turno', label: 'Entrega de turno', icon: 'arrow-left-right' },
        { id: 'incidentes', label: 'Incidentes', icon: 'siren', count: BT.bySede(BT.db.incidents).filter((i) => Date.now() - i.ts < 30 * 86400000).length || '' },
      ], (panel, id) => (id === 'registro' ? renderRegistro(panel) : id === 'turno' ? renderTurno(panel) : renderIncidentes(panel)));
      ui.on(el, {
        incident: () => incidentModal(CS().rid),
        'export-parte': () => { const h = lastHandover(opSede()); exportParte(h || draftHandover(opSede(), '', [])); },
      });
      const clk = el.querySelector('[data-clock]');
      if (clk) { const iv = setInterval(() => { if (!document.body.contains(clk)) return clearInterval(iv); clk.textContent = u.fmtTime(new Date()); }, 15000); }
    },
  });

  /* ---------------- Registro rápido ---------------- */
  function renderRegistro(host) {
    const panel = fresh(host); const cs = CS(); const sede = opSede();
    const res = BT.db.residents.filter((r) => r.sede === sede && r.estado === 'activo');
    if (cs.rid && !res.some((r) => r.id === cs.rid)) cs.rid = null;
    const S = BT.db.sedes.find((x) => x.id === sede);
    const dep = res.filter(BT.isDependent).sort(roomSort);
    panel.innerHTML = '<div class="cui-wrap"><div class="col" style="gap:16px">' +
      ui.card({ title: 'Ingresá por habitación', icon: 'bed-double', sub: 'Tocá la cama, escribí el código o escaneá el QR de la puerta',
        actions: BT.state.sede === 'ALL' ? ui.seg('cuiSede', [{ id: 'BT1', label: 'BT1', dot: BT.COLORS.BT1 }, { id: 'BT2', label: 'BT2', dot: BT.COLORS.BT2 }], sede, 'sm') : '',
        body: '<div class="code-in mb-16"><input class="input" data-code maxlength="3" placeholder="Ej. 3B" aria-label="Código de habitación" inputmode="text"><button class="btn lg" data-qr data-tip="Escanear QR de la habitación">' + ic('qr-code') + '</button></div>' +
          '<div class="rooms">' + S.habitaciones.map((h) => '<div class="rm"><div class="rn"><span>HAB. ' + h.nro + '</span></div><div class="bd">' + h.camas.map((c) => {
            const r = res.find((x) => x.habitacion === h.nro && x.cama === c);
            if (!r) return S.reservadas.includes(h.nro + c) ? '<div class="bedbtn res" data-tip="Reservada">' + ic('lock', 'ic-xs') + '<span class="cm">' + c + '</span></div>' : '<div class="bedbtn free" data-tip="Cama libre"><span class="cm">' + c + ' · libre</span></div>';
            const lp = BT.isDependent(r) ? lastPostural(r.id) : Date.now();
            return '<button class="bedbtn ' + (r.id === cs.rid ? 'on' : '') + '" data-pick="' + r.id + '" data-tip="' + esc(BT.fullName(r)) + '"><span class="ini">' + esc(u.initials(BT.fullName(r)).toUpperCase()) + '</span><span class="cm">' + h.nro + c + '</span>' + (!lp || Date.now() - lp > 3 * 3600000 ? '<span class="alert-dot"></span>' : '') + '</button>';
          }).join('') + '</div></div>').join('') + '</div>',
      }) +
      ui.card({ title: 'Ronda de cambios posturales', icon: 'refresh-ccw', sub: 'Residentes dependientes · cada 2 horas', bodyCls: 'flush', cls: 'postural',
        body: '<div class="list">' + (dep.length ? dep.map((r) => {
          const l = lastPostural(r.id); const mins = l ? Math.round((Date.now() - l) / 60000) : null;
          const tone = mins == null || mins > 180 ? 'danger' : mins > 120 ? 'warn' : 'ok';
          return '<div class="li click" data-pick="' + r.id + '" data-postural="1"><span class="li-ic ' + tone + '">' + ic('refresh-ccw', 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(BT.shortName(r)) + '</div><div class="d">Hab. ' + r.habitacion + r.cama + ' · Barthel ' + BT.lastBarthel(r) + '</div></div><span class="w"><b class="t-' + tone + '">' + (mins == null ? 'Sin registro' : mins < 60 ? 'hace ' + mins + ' min' : 'hace ' + Math.floor(mins / 60) + ' h ' + u.pad(mins % 60) + ' min') + '</b></span></div>';
        }).join('') : ui.empty({ ill: 'leaf', title: 'Sin residentes dependientes' })) + '</div>' }) +
      '</div><div id="cuiDetail"></div></div>';
    const drawDetail = (flashNew) => { const d = panel.querySelector('#cuiDetail'); d.innerHTML = detailHtml(cs.rid ? BT.resident(cs.rid) : null); ui.enhance(d); if (flashNew) { const n = d.querySelector('.tl-item'); if (n) ui.flash(n); } };
    drawDetail();
    const pick = (rid, tipo) => {
      cs.rid = rid; cs.tipo = tipo || null;
      panel.querySelectorAll('.bedbtn[data-pick]').forEach((b) => b.classList.toggle('on', b.dataset.pick === rid));
      drawDetail();
      if (window.innerWidth < 1080) panel.querySelector('#cuiDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    panel.addEventListener('segchange', (e) => { if (e.detail.name === 'cuiSede') { cs.sede = e.detail.value; cs.rid = null; renderRegistro(host); ui.enhance(host); } });
    const codeIn = panel.querySelector('[data-code]');
    codeIn.addEventListener('input', () => {
      const v = codeIn.value.toUpperCase().replace(/\s/g, ''); const m = v.match(/^(\d{1,2})([AB])$/);
      if (!m) return; const r = res.find((x) => x.habitacion === m[1] && x.cama === m[2]);
      if (r) { pick(r.id); codeIn.value = ''; ui.toast('Habitación ' + v, { icon: 'bed-double', sub: BT.fullName(r) }); } else { codeIn.classList.add('invalid'); setTimeout(() => codeIn.classList.remove('invalid'), 500); }
    });
    panel.addEventListener('click', (e) => {
      const p = e.target.closest('[data-pick]'); if (p) return pick(p.dataset.pick, p.dataset.postural ? 'Cambio postural' : null);
      if (e.target.closest('[data-qr]')) return qrScan(res, (r) => pick(r.id));
      const qa = e.target.closest('[data-qa]'); if (qa) { cs.tipo = cs.tipo === qa.dataset.qa ? null : qa.dataset.qa; drawDetail(); const c = panel.querySelector('.composer'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
      if (e.target.closest('[data-cancel-care]')) { cs.tipo = null; drawDetail(); return; }
      const sv = e.target.closest('[data-save-care]'); if (sv) return saveCare(panel, drawDetail);
      if (e.target.closest('[data-res-inc]')) return incidentModal(cs.rid);
      if (e.target.closest('[data-res-med]')) { const r = BT.resident(cs.rid); BT.state.medUI = Object.assign(BT.state.medUI || {}, { q: r ? r.nombre.split(' ')[0] : '', fecha: u.shiftDate(), turno: u.currentShift() }); BT.go('medicacion', { sub: 'planilla' }); }
      if (e.target.closest('[data-res-hc]')) BT.go('historia', { residentId: cs.rid });
    });
  }
  function qrScan(res, done) {
    const sorted = [...res].sort(roomSort);
    const r = sorted[Math.floor(Math.random() * sorted.length)];
    const m = ui.modal({ title: 'Escaneando QR de la habitación', sub: 'Apuntá la cámara de la tablet al código de la puerta', icon: 'qr-code', body: '<div class="qr-frame"></div><p class="muted mt-16" style="text-align:center;font-size:var(--fs-sm)">Buscando código…</p>' });
    setTimeout(() => { m.close(); if (r) { done(r); ui.toast('QR leído · Habitación ' + r.habitacion + r.cama, { icon: 'qr-code', sub: BT.fullName(r) }); } }, 1300);
  }
  function detailHtml(r) {
    if (!r) return '<div class="card">' + ui.empty({ ill: 'leaf', title: 'Elegí un residente', text: 'Tocá una cama del plano, escribí el código de la habitación o escaneá el QR de la puerta para registrar cuidados.' }) + '</div>';
    const cs = CS(); const g = BT.depGrade(BT.lastBarthel(r));
    const rest = BT.db.restrictions.filter((x) => x.residentId === r.id && x.hasta >= u.todayIso());
    const since = Date.now() - 24 * 3600000;
    const items = [].concat(
      BT.db.care.filter((c) => c.residentId === r.id && c.ts >= since).map((c) => ({ ts: c.ts, icon: careIcon(c.tipo), tone: 'brand', t: c.tipo, d: c.detalle, a: c.autor })),
      BT.db.medAdmin.filter((a) => a.residentId === r.id && a.ts >= since).map((a) => { const m = BT.db.meds.find((x) => x.id === a.medId) || {}; return { ts: a.ts, icon: 'pill', tone: a.estado === 'administrada' ? 'ok' : 'warn', t: 'Medicación', d: (m.droga || '') + ' ' + (m.dosis || '') + ' · ' + a.hora + (a.estado !== 'administrada' ? ' (' + a.estado + ')' : ''), a: a.userName }; }),
      BT.db.incidents.filter((i) => i.residentId === r.id && i.ts >= since).map((i) => ({ ts: i.ts, icon: 'siren', tone: 'danger', t: 'Incidente: ' + i.tipo, d: i.descripcion, a: i.autor }))
    ).sort((a, b) => b.ts - a.ts);
    const C = CARE.find((c) => c.id === cs.tipo);
    return '<div class="col" style="gap:16px">' +
      '<div class="card"><div class="card-b"><div class="row between wrap gap-16"><div class="row gap-16">' + ui.avatar(BT.fullName(r), { size: 'xl' }) + '<div><div style="font-size:var(--fs-2xl);font-weight:700;letter-spacing:-.02em;line-height:1.1">' + esc(BT.fullName(r)) + '</div><div class="muted mt-8" style="font-size:var(--fs-md)">Hab. <b style="color:var(--ink-900)">' + r.habitacion + r.cama + '</b> · ' + u.age(r.nacimiento) + ' años · ' + BT.sedeTag(r.sede) + '</div>' +
      '<div class="row wrap gap-6 mt-8">' + ui.badge('Dependencia ' + g.label.toLowerCase(), g.tone, { dot: true }) + ui.badge('Dieta ' + r.dieta.toLowerCase(), 'brand', { icon: 'utensils-crossed' }) + (r.alergias.length ? ui.badge('Alergia: ' + r.alergias.join(', '), 'danger', { icon: 'triangle-alert' }) : '') + rest.map((x) => ui.badge('Restricción de ' + x.tipo.toLowerCase(), 'violet', { icon: 'lock', tip: x.motivo })).join('') + '</div></div></div>' +
      '<div class="row wrap gap-6"><button class="btn" data-res-med>' + ic('pill') + 'Medicación</button>' + (BT.can('clinical.read') ? '<button class="btn" data-res-hc>' + ic('clipboard-list') + 'Historia</button>' : '') + '<button class="btn danger" data-res-inc>' + ic('siren') + 'Incidente</button></div></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ic('notebook-pen') + '¿Qué querés registrar?</h3><span class="muted" style="font-size:var(--fs-sm)">Queda a nombre de ' + esc(shortPerson(BT.state.user.nombre)) + '</span></div><div class="card-b"><div class="qa-grid">' +
      CARE.map((c) => '<button class="qa ' + (cs.tipo === c.id ? 'on' : '') + '" data-qa="' + c.id + '"><span class="qi">' + ic(c.icon, 'ic-lg') + '</span>' + c.id + '<small>' + c.hint + '</small></button>').join('') + '</div>' +
      (C ? '<div class="composer mt-16"><div class="row between mb-16"><div class="row gap-6 strong" style="font-size:var(--fs-lg)">' + ic(C.icon, 'ic-sm') + C.id + '</div><button class="icon-btn ghost sm" data-cancel-care aria-label="Cancelar">' + ic('x', 'ic-sm') + '</button></div><div class="col gap-16">' +
        (C.comida ? ui.field({ label: 'Comida', name: 'comida', type: 'chips', lg: true, required: true, value: defaultMeal(), options: ['Desayuno', 'Almuerzo', 'Merienda', 'Cena'] }) : '') +
        ui.field({ label: C.comida ? 'Cuánto comió' : 'Detalle', name: 'det', type: 'chips', lg: true, required: true, options: C.opts }) +
        ui.field({ label: 'Observación (opcional)', name: 'obs', placeholder: 'Ej.: se lo nota más somnoliento que de costumbre' }) +
        '<button class="btn primary lg block" data-save-care>' + ic('check') + 'Guardar registro</button></div></div>' : '') +
      '</div></div>' +
      ui.card({ title: 'Últimas 24 horas', icon: 'history', sub: items.length + ' registros', body: items.length ? '<div class="timeline">' + items.slice(0, 14).map((x) => '<div class="tl-item"><span class="tl-dot ' + x.tone + '">' + ic(x.icon) + '</span><div class="tl-h"><span class="t">' + esc(x.t) + '</span><span class="w">' + ui.relTime(x.ts) + ' · ' + esc(shortPerson(x.a)) + '</span></div><div class="tl-b">' + esc(x.d) + '</div></div>').join('') + '</div>' : ui.empty({ ill: 'calendar', title: 'Sin registros todavía', text: 'Lo que registres aparece acá al instante.' }) }) +
      '</div>';
  }
  function defaultMeal() { const h = new Date().getHours(); return h < 10 ? 'Desayuno' : h < 15 ? 'Almuerzo' : h < 19 ? 'Merienda' : 'Cena'; }
  function saveCare(panel, redraw) {
    const cs = CS(); const comp = panel.querySelector('.composer'); if (!comp || !ui.validate(comp)) return;
    const f = ui.formData(comp); const r = BT.resident(cs.rid);
    let det = f.det;
    if (cs.tipo === 'Ingesta') det = f.comida + ': ' + f.det.charAt(0).toLowerCase() + f.det.slice(1);
    if (cs.tipo === 'Hidratación' && /ml/.test(f.det)) det = 'Ingiere ' + f.det + ' de líquidos';
    if (f.obs) det += '. ' + f.obs;
    BT.db.care.push({ id: u.uid('cr'), residentId: r.id, ts: Date.now(), tipo: cs.tipo, detalle: det, autor: BT.state.user.nombre });
    BT.save();
    BT.audit('Creó', 'Registro de cuidados', { residentId: r.id, detail: cs.tipo + ': ' + det });
    ui.toast(cs.tipo + ' registrado', { sub: BT.shortName(r) + ' · ' + det });
    const t = cs.tipo; cs.tipo = null; redraw(true);
    if (t === 'Cambio postural') { renderRegistro(panel.parentElement); ui.enhance(panel.parentElement); BT.shell.updateBell(); }
  }

  /* ---------------- Entrega de turno ---------------- */
  const lastHandover = (sede) => BT.db.handovers.filter((h) => h.sede === sede).sort((a, b) => b.ts - a.ts)[0];
  function shiftSummary(sede) {
    const w = shiftWindow();
    const doses = BT.dosesFor(w.fecha, w.turno, sede);
    const rids = new Set(BT.db.residents.filter((r) => r.sede === sede).map((r) => r.id));
    const care = BT.db.care.filter((c) => rids.has(c.residentId) && c.ts >= w.start && c.ts < w.end);
    const inc = BT.db.incidents.filter((i) => i.sede === sede && i.ts >= w.start && i.ts < w.end);
    return { w, doses, care, inc, adm: doses.filter((d) => d.estado === 'administrada').length, pend: doses.filter((d) => d.estado === 'pendiente' || d.estado === 'atrasada').length, no: doses.filter((d) => d.estado === 'rechazada' || d.estado === 'omitida').length };
  }
  function draftHandover(sede, novedades, pendientes) {
    const s = shiftSummary(sede);
    return { id: 'draft', sede, fecha: s.w.fecha, turno: s.w.turno, autor: BT.state.user.nombre, novedades, pendientes, hechos: [], ts: Date.now(), resumen: { adm: s.adm, pend: s.pend, no: s.no, cuidados: s.care.length, incidentes: s.inc.length } };
  }
  function renderTurno(host) {
    const panel = fresh(host); const sede = opSede();
    const prev = lastHandover(sede); const s = shiftSummary(sede); const SH = u.SHIFTS[s.w.turno];
    const pend = [];
    const hist = BT.db.handovers.filter((h) => h.sede === sede).sort((a, b) => b.ts - a.ts);
    panel.innerHTML = (BT.state.sede === 'ALL' ? '<div class="row mb-16">' + ui.seg('cuiSede2', [{ id: 'BT1', label: 'BT1', dot: BT.COLORS.BT1 }, { id: 'BT2', label: 'BT2', dot: BT.COLORS.BT2 }], sede, 'sm') + '</div>' : '') +
      '<div class="grid g-main">' +
      '<div class="col" style="gap:16px">' +
      (prev ? ui.card({ title: 'Recibís el turno', icon: 'log-in', sub: 'Parte del turno ' + u.SHIFTS[prev.turno].label.toLowerCase() + ' · ' + esc(prev.autor) + ' · ' + u.rel(prev.ts), cls: 'tint',
        actions: '<button class="btn sm" data-pdf="' + prev.id + '">' + ic('file-text') + 'PDF</button>',
        body: '<p style="font-size:var(--fs-md);line-height:1.6">' + esc(prev.novedades) + '</p>' + (prev.pendientes && prev.pendientes.length ? '<div class="sec-t mt-16">Pendientes que te dejaron</div><div class="pend-ed">' + prev.pendientes.map((p, i) => { const done = (prev.hechos || []).includes(i); return '<div class="pend-row ' + (done ? 'done' : '') + '"><label><input type="checkbox" data-hecho="' + i + '" ' + (done ? 'checked' : '') + '><span>' + esc(p) + '</span></label></div>'; }).join('') + '</div>' : '') }) : '') +
      ui.card({ title: 'Parte de entrega · turno ' + SH.label.toLowerCase(), icon: 'arrow-left-right', sub: u.fmtDate(s.w.fecha) + ' · ' + SH.from + '–' + SH.to + ' · ' + BT.sedeName(sede),
        body: '<div class="kv-cards"><div class="kv-card"><div class="k">' + ic('pill', 'ic-xs') + 'Dosis administradas</div><div class="v">' + s.adm + ' de ' + s.doses.length + '</div></div><div class="kv-card"><div class="k">' + ic('clock', 'ic-xs') + 'Pendientes</div><div class="v ' + (s.pend ? 't-warn' : '') + '">' + s.pend + '</div></div><div class="kv-card"><div class="k">' + ic('hand-heart', 'ic-xs') + 'Registros de cuidado</div><div class="v">' + s.care.length + '</div></div><div class="kv-card"><div class="k">' + ic('siren', 'ic-xs') + 'Incidentes</div><div class="v ' + (s.inc.length ? 't-danger' : '') + '">' + s.inc.length + '</div></div></div>' +
          '<div class="col gap-16 mt-16" id="hoForm">' + ui.field({ label: 'Novedades del turno', name: 'nov', type: 'textarea', required: true, placeholder: 'Cómo estuvieron los residentes, cambios en su estado, visitas, situaciones a tener en cuenta…', attrs: 'style="min-height:120px"' }) +
          '<div class="field"><span class="flabel">Pendientes para el turno siguiente</span><div class="row"><input class="input" data-pend-in placeholder="Ej.: control de HGT a María Elena a las 20:00"><button class="btn" data-pend-add>' + ic('plus') + 'Agregar</button></div><div class="pend-ed mt-8" data-pend-list></div></div>' +
          '<div class="row between wrap"><span class="muted" style="font-size:var(--fs-sm)">' + ic('lock', 'ic-xs') + ' Queda firmado por ' + esc(BT.state.user.nombre) + ' con fecha y hora.</span><div class="row gap-6"><button class="btn" data-preview>' + ic('eye') + 'Vista previa</button><button class="btn primary" data-save-ho>' + ic('check') + 'Entregar turno</button></div></div></div>' }) +
      '</div>' +
      ui.card({ title: 'Partes anteriores', icon: 'history', sub: BT.sedeName(sede), body: hist.length ? '<div class="timeline">' + hist.slice(0, 8).map((h) => '<div class="tl-item"><span class="tl-dot brand">' + ic(u.SHIFTS[h.turno].icon) + '</span><div class="tl-h"><span class="t">Turno ' + u.SHIFTS[h.turno].label.toLowerCase() + ' · ' + u.fmtDateShort(h.fecha) + '</span><span class="w">' + esc(shortPerson(h.autor)) + '</span></div><div class="tl-b" style="font-size:var(--fs-sm)">' + esc(h.novedades.length > 150 ? h.novedades.slice(0, 150) + '…' : h.novedades) + '</div><button class="btn xs ghost mt-8" data-pdf="' + h.id + '" style="margin-left:-8px">' + ic('file-text') + 'Ver parte</button></div>').join('') + '</div>' : ui.empty({ ill: 'calendar', title: 'Sin partes previos' }) }) +
      '</div>';
    const list = panel.querySelector('[data-pend-list]'); const inp = panel.querySelector('[data-pend-in]');
    const drawPend = () => { list.innerHTML = pend.map((p, i) => '<div class="pend-row"><span class="grow">' + ic('circle-alert', 'ic-xs') + ' ' + esc(p) + '</span><button class="icon-btn ghost sm" data-pend-del="' + i + '" aria-label="Quitar">' + ic('x', 'ic-sm') + '</button></div>').join(''); };
    const add = () => { const v = inp.value.trim(); if (!v) return; pend.push(v); inp.value = ''; drawPend(); inp.focus(); };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    panel.addEventListener('segchange', (e) => { if (e.detail.name === 'cuiSede2') { CS().sede = e.detail.value; renderTurno(host); ui.enhance(host); } });
    panel.addEventListener('change', (e) => {
      const c = e.target.closest('[data-hecho]'); if (!c || !prev) return;
      prev.hechos = prev.hechos || []; const i = +c.dataset.hecho;
      if (c.checked) { if (!prev.hechos.includes(i)) prev.hechos.push(i); } else prev.hechos = prev.hechos.filter((x) => x !== i);
      c.closest('.pend-row').classList.toggle('done', c.checked); BT.save();
      if (c.checked) ui.toast('Pendiente resuelto', { sub: prev.pendientes[i] });
    });
    panel.addEventListener('click', (e) => {
      if (e.target.closest('[data-pend-add]')) return add();
      const d = e.target.closest('[data-pend-del]'); if (d) { pend.splice(+d.dataset.pendDel, 1); drawPend(); return; }
      const p = e.target.closest('[data-pdf]'); if (p) { const h = BT.db.handovers.find((x) => x.id === p.dataset.pdf); if (h) exportParte(h); return; }
      if (e.target.closest('[data-preview]')) { exportParte(draftHandover(sede, panel.querySelector('[name="nov"]').value.trim() || '(sin novedades cargadas todavía)', pend.slice())); return; }
      if (e.target.closest('[data-save-ho]')) {
        const form = panel.querySelector('#hoForm'); if (!ui.validate(form)) return;
        const h = draftHandover(sede, ui.formData(form).nov, pend.slice()); h.id = u.uid('ho');
        BT.db.handovers.push(h); BT.save();
        BT.audit('Creó', 'Parte de entrega de turno', { sede, detail: 'Turno ' + u.SHIFTS[h.turno].label + ' ' + u.fmtDate(h.fecha) });
        ui.toast('Turno entregado', { sub: 'El parte quedó disponible para el turno siguiente', icon: 'arrow-left-right' });
        renderTurno(host); ui.enhance(host);
      }
    });
  }
  function exportParte(h) {
    const D = BT.doc; const sede = h.sede; const SH = u.SHIFTS[h.turno];
    const start = u.toDate(h.fecha); const [hh] = SH.from.split(':').map(Number); start.setHours(hh, 0, 0, 0); const s0 = start.getTime(), s1 = s0 + 8 * 3600000;
    const rids = new Set(BT.db.residents.filter((r) => r.sede === sede).map((r) => r.id));
    const care = BT.db.care.filter((c) => rids.has(c.residentId) && c.ts >= s0 && c.ts < s1).sort((a, b) => a.ts - b.ts);
    const inc = BT.db.incidents.filter((i) => i.sede === sede && i.ts >= s0 && i.ts < s1);
    const doses = BT.dosesFor(h.fecha, h.turno, sede);
    const noAdm = doses.filter((d) => d.estado !== 'administrada');
    const staff = BT.shiftStaff(h.fecha, sede, h.turno);
    const body = D.kv([['Sede', esc(BT.sedeName(sede))], ['Turno', SH.label + ' (' + SH.from + '–' + SH.to + ')'], ['Fecha', u.fmtDate(h.fecha)], ['Entrega', esc(h.autor) + ' · ' + u.fmtDateTime(h.ts)], ['Personal en turno', esc(staff.map((x) => x.nombre).join(', ') || '—')], ['Residentes', String(BT.db.residents.filter((r) => r.sede === sede && r.estado === 'activo').length)]], 2) +
      D.section('Resumen del turno', D.kpis([{ label: 'Dosis administradas', value: doses.filter((d) => d.estado === 'administrada').length + ' / ' + doses.length }, { label: 'Sin administrar', value: noAdm.length }, { label: 'Registros de cuidado', value: care.length }, { label: 'Incidentes', value: inc.length }])) +
      D.section('Novedades', D.note(esc(h.novedades).replace(/\n/g, '<br>'))) +
      D.section('Pendientes para el turno siguiente', h.pendientes && h.pendientes.length ? D.table([{ label: '', render: (x) => ((h.hechos || []).includes(x.i) ? '☑' : '☐'), width: '26px', align: 'center' }, { label: 'Pendiente', render: (x) => esc(x.p) }], h.pendientes.map((p, i) => ({ p, i }))) : '<p class="muted">Sin pendientes.</p>') +
      (noAdm.length ? D.section('Medicación no administrada o pendiente', D.table([{ label: 'Hora', key: 'hora' }, { label: 'Residente', render: (d) => esc(BT.fullName(d.resident)) + ' · ' + d.resident.habitacion + d.resident.cama }, { label: 'Medicamento', render: (d) => esc(d.med.droga + ' ' + d.med.dosis) }, { label: 'Estado', render: (d) => D.badge(u.cap(d.estado), d.estado === 'rechazada' ? 'warn' : 'danger') }], noAdm, { compact: true })) : '') +
      (inc.length ? D.section('Incidentes', D.table([{ label: 'Hora', render: (i) => u.fmtTime(i.ts) }, { label: 'Residente', render: (i) => esc(BT.fullName(BT.resident(i.residentId))) }, { label: 'Tipo', render: (i) => esc(i.tipo) }, { label: 'Gravedad', render: (i) => D.badge(i.gravedad, i.gravedad === 'Sin lesión' ? 'ok' : 'warn') }, { label: 'Descripción', render: (i) => esc(i.descripcion) }], inc)) : '') +
      D.section('Registros de cuidados del turno', D.table([{ label: 'Hora', render: (c) => u.fmtTime(c.ts), width: '48px' }, { label: 'Residente', render: (c) => esc(BT.shortName(BT.resident(c.residentId))) }, { label: 'Tipo', render: (c) => esc(c.tipo) }, { label: 'Detalle', render: (c) => esc(c.detalle) }, { label: 'Registró', render: (c) => esc(shortPerson(c.autor)) }], care, { compact: true, empty: 'Sin registros de cuidados en el turno.' })) +
      D.signatures(['Entrega: ' + h.autor, 'Recibe']);
    D.open({ title: 'Parte de entrega de turno', kicker: 'Cambio de turno', sede, subtitle: 'Turno ' + SH.label.toLowerCase() + ' · ' + u.fmtDate(h.fecha) + ' · ' + BT.sedeName(sede), filename: 'Parte de turno ' + sede + ' ' + u.fmtDate(h.fecha).replace(/\//g, '-') + ' ' + SH.label, body });
  }

  /* ---------------- Incidentes ---------------- */
  function renderIncidentes(host) {
    const panel = fresh(host);
    const inc = BT.bySede(BT.db.incidents).sort((a, b) => b.ts - a.ts);
    const d30 = inc.filter((i) => Date.now() - i.ts < 30 * 86400000);
    const falls = BT.bySede(BT.db.falls.map((f) => Object.assign({ sede: (BT.resident(f.residentId) || {}).sede }, f))).filter((f) => Date.now() - f.ts < 90 * 86400000);
    const rep = Object.values(u.groupBy(falls, 'residentId')).filter((a) => a.length > 1).length;
    const TONE = { 'Sin lesión': 'ok', Leve: 'info', Moderada: 'warn', Grave: 'danger' };
    panel.innerHTML = '<div class="grid g-4 stagger">' +
      ui.kpi({ label: 'Incidentes (30 días)', value: d30.length, icon: 'siren', tone: d30.length ? 'warn' : '' }) +
      ui.kpi({ label: 'Caídas (90 días)', value: falls.length, icon: 'footprints', tone: 'danger' }) +
      ui.kpi({ label: 'Con lesión', value: falls.filter((f) => !/^Sin lesi/.test(f.lesiones)).length, icon: 'bandage', tone: 'info' }) +
      ui.kpi({ label: 'Residentes con caídas repetidas', value: rep, icon: 'repeat', tone: rep ? 'danger' : '' }) + '</div>' +
      ui.card({ cls: 'mt-16', title: 'Registro de incidentes', icon: 'siren', sub: 'Caídas, conductas, atragantamientos y otros eventos', actions: '<button class="btn primary sm" data-new-inc>' + ic('plus') + 'Nuevo incidente</button>', bodyCls: 'flush',
        body: ui.table([
          { label: 'Fecha', render: (i) => '<div class="nowrap strong">' + u.fmtDate(i.ts) + '</div><div class="muted" style="font-size:var(--fs-xs)">' + u.fmtTime(i.ts) + ' · ' + u.rel(i.ts) + '</div>' },
          { label: 'Residente', render: (i) => { const r = BT.resident(i.residentId); return ui.person(BT.fullName(r), r.sede + ' · Hab. ' + r.habitacion + r.cama); } },
          { label: 'Tipo', render: (i) => ui.badge(i.tipo, i.tipo === 'Caída' ? 'danger' : 'outline', { icon: i.tipo === 'Caída' ? 'footprints' : 'siren' }) },
          { label: 'Gravedad', render: (i) => ui.badge(i.gravedad, TONE[i.gravedad] || '', { dot: true }) },
          { label: 'Descripción', render: (i) => '<div style="max-width:360px;font-size:var(--fs-sm)" class="muted">' + esc(i.descripcion) + '</div>' },
          { label: 'Registró', render: (i) => '<span style="font-size:var(--fs-sm)">' + esc(shortPerson(i.autor)) + '</span>' },
        ], inc, { rowAttrs: (i) => 'class="click" data-inc="' + i.id + '"', empty: { ill: 'leaf', title: 'Sin incidentes', text: 'No hay incidentes registrados en esta sede.' } }),
      });
    panel.addEventListener('click', (e) => {
      if (e.target.closest('[data-new-inc]')) return incidentModal(null);
      const tr = e.target.closest('[data-inc]'); if (tr) incidentDetail(BT.db.incidents.find((x) => x.id === tr.dataset.inc));
    });
  }
  function incidentDetail(i) {
    const r = BT.resident(i.residentId); const f = i.fallId ? BT.db.falls.find((x) => x.id === i.fallId) : null;
    ui.modal({ title: i.tipo + ' · ' + BT.fullName(r), sub: u.fmtDateTime(i.ts) + ' · registró ' + i.autor, icon: i.tipo === 'Caída' ? 'footprints' : 'siren',
      body: f ? ui.kv([['Lugar', esc(f.lugar)], ['Circunstancia', esc(f.circunstancia)], ['Lesiones', esc(f.lesiones)], ['Acciones', esc(f.acciones)], ['Testigo', esc(f.testigo)], ['Aviso a familia', f.avisoFamilia ? 'Sí' : 'No'], ['Aviso a médico', f.avisoMedico ? 'Sí' : 'No']]) : ui.kv([['Gravedad', esc(i.gravedad)], ['Descripción', esc(i.descripcion)], ['Acciones', esc(i.acciones || '')]]),
      foot: (BT.can('clinical.read') ? '<button class="btn" data-hc>' + ic('clipboard-list') + 'Ver historia clínica</button>' : '') + '<button class="btn primary" data-close>Cerrar</button>',
      onMount: (el, close) => { const b = el.querySelector('[data-hc]'); if (b) b.addEventListener('click', () => { close(); BT.go('historia', { residentId: r.id, sub: 'caidas' }); }); },
    });
  }

  /** Formulario de incidentes (BT.actions.newIncident) */
  function incidentModal(rid, tipo = 'Caída') {
    const usr = BT.state.user;
    const res = BT.residentsInSede().sort((a, b) => (a.sede + a.habitacion.padStart(2, '0') + a.cama).localeCompare(b.sede + b.habitacion.padStart(2, '0') + b.cama));
    const TIPOS = [{ v: 'Caída', l: 'Caída', icon: 'footprints' }, { v: 'Conducta', l: 'Conducta', icon: 'brain' }, { v: 'Atragantamiento', l: 'Atragantamiento', icon: 'wind' }, { v: 'Lesión de piel', l: 'Lesión de piel', icon: 'bandage' }, { v: 'Error de medicación', l: 'Error de medicación', icon: 'pill' }, { v: 'Otro', l: 'Otro', icon: 'circle-alert' }];
    ui.modal({
      title: 'Registrar incidente', sub: 'Queda constancia en la historia clínica y en la auditoría', icon: 'siren', size: 'lg',
      body: '<div class="col gap-16" id="incForm">' +
        ui.field({ label: 'Tipo de incidente', name: 'tipo', type: 'chips', lg: true, required: true, value: tipo, options: TIPOS }) +
        '<div class="form-grid">' +
        ui.field({ label: 'Residente', name: 'rid', type: 'select', required: true, value: rid || '', placeholder: 'Elegí un residente', options: res.map((r) => ({ v: r.id, l: BT.fullName(r) + ' · ' + r.sede + ' Hab. ' + r.habitacion + r.cama })) }) +
        ui.field({ label: 'Fecha y hora', name: 'ts', type: 'datetime-local', required: true, value: nowLocal() }) +
        ui.field({ label: 'Gravedad', name: 'grav', type: 'chips', required: true, full: true, options: [{ v: 'Sin lesión', l: 'Sin lesión' }, { v: 'Leve', l: 'Leve' }, { v: 'Moderada', l: 'Moderada' }, { v: 'Grave', l: 'Grave' }] }) +
        '</div>' +
        '<div class="inc-section" data-sec="fall"><div class="sec-t">Registro de caída</div><div class="form-grid">' +
        ui.field({ label: 'Lugar', name: 'lugar', type: 'chips', full: true, attrs: '', options: ['Habitación', 'Baño', 'Comedor', 'Pasillo', 'Patio', 'Sala de estar'] }) +
        ui.field({ label: 'Circunstancia', name: 'circ', type: 'textarea', full: true, placeholder: 'Qué estaba haciendo, cómo ocurrió, si pidió ayuda…' }) +
        ui.field({ label: 'Lesiones observadas', name: 'les', placeholder: 'Ej.: sin lesiones visibles / hematoma en rodilla' }) +
        ui.field({ label: 'Testigo', name: 'testigo', placeholder: 'Nombre o «Sin testigos»' }) +
        ui.field({ label: 'Acciones realizadas', name: 'acc', type: 'textarea', full: true, placeholder: 'Valoración, control de signos vitales, curación, a quién se avisó…' }) +
        '<div class="row between full" style="padding:10px 12px;border:1px solid var(--line);border-radius:12px"><span class="row gap-6">' + ic('message-circle', 'ic-sm') + '<span><b>Avisar a la familia</b><br><span class="muted" style="font-size:var(--fs-xs)">WhatsApp al referente</span></span></span><label class="switch"><input type="checkbox" name="avFam" checked><span></span></label></div>' +
        '<div class="row between full" style="padding:10px 12px;border:1px solid var(--line);border-radius:12px"><span class="row gap-6">' + ic('stethoscope', 'ic-sm') + '<span><b>Avisar al médico</b><br><span class="muted" style="font-size:var(--fs-xs)">Dr. Fernando Aguirre</span></span></span><label class="switch"><input type="checkbox" name="avMed" checked><span></span></label></div>' +
        '</div></div>' +
        '<div class="inc-section hidden" data-sec="other"><div class="form-grid">' +
        ui.field({ label: 'Descripción', name: 'desc', type: 'textarea', full: true, placeholder: 'Describí qué pasó…' }) +
        ui.field({ label: 'Acciones realizadas', name: 'acc2', type: 'textarea', full: true, placeholder: 'Qué se hizo y a quién se avisó…' }) +
        '</div></div></div>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>' + ic('check') + 'Registrar incidente</button>',
      onMount: (el, close) => {
        const REQ = { fall: ['lugar', 'circ', 'les', 'acc'], other: ['desc'] };
        const sync = () => {
          const isFall = ui.formData(el).tipo === 'Caída';
          el.querySelector('[data-sec="fall"]').classList.toggle('hidden', !isFall);
          el.querySelector('[data-sec="other"]').classList.toggle('hidden', isFall);
          Object.entries(REQ).forEach(([sec, names]) => names.forEach((n) => {
            const on = (sec === 'fall') === isFall;
            const f = el.querySelector('[name="' + n + '"]') || el.querySelector('[data-chips="' + n + '"]');
            if (!f) return;
            if (on) f.setAttribute('data-required', '1'); else { f.removeAttribute('data-required'); f.classList.remove('invalid'); f.style.outline = ''; }
            const lab = f.closest('.field').querySelector('label, .flabel'); const s = lab && lab.querySelector('.req');
            if (on && lab && !s) lab.insertAdjacentHTML('beforeend', '<span class="req">*</span>'); if (!on && s) s.remove();
          }));
        };
        el.addEventListener('chipchange', sync); sync();
        el.querySelector('[data-save]').addEventListener('click', () => {
          const form = el.querySelector('#incForm');
          if (!ui.validate(form)) return;
          const f = ui.formData(form); const r = BT.resident(f.rid); const ts = new Date(f.ts).getTime() || Date.now();
          const isFall = f.tipo === 'Caída';
          let fall = null;
          if (isFall) { fall = { id: u.uid('fl'), residentId: r.id, ts, lugar: f.lugar, circunstancia: f.circ, lesiones: f.les, acciones: f.acc, testigo: f.testigo || 'Sin testigos', autor: usr.nombre, avisoFamilia: f.avFam, avisoMedico: f.avMed }; BT.db.falls.push(fall); }
          const inc = { id: u.uid('ic'), residentId: r.id, sede: r.sede, ts, tipo: f.tipo, gravedad: f.grav, descripcion: isFall ? f.circ : f.desc, acciones: isFall ? f.acc : f.acc2, autor: usr.nombre, fallId: fall ? fall.id : undefined };
          BT.db.incidents.push(inc);
          const texto = isFall
            ? 'Registro de caída (' + f.grav.toLowerCase() + ') en ' + f.lugar.toLowerCase() + ', ' + u.fmtDateTime(ts) + '. ' + f.circ.replace(/\.?$/, '.') + ' Lesiones: ' + f.les.replace(/\.?$/, '.') + ' Acciones: ' + f.acc.replace(/\.?$/, '.') + ' Testigo: ' + (f.testigo || 'sin testigos') + '. Aviso a familia: ' + (f.avFam ? 'sí' : 'no') + '. Aviso a médico: ' + (f.avMed ? 'sí' : 'no') + '.'
            : 'Incidente: ' + f.tipo.toLowerCase() + ' (' + f.grav.toLowerCase() + '). ' + f.desc + (f.acc2 ? ' Acciones: ' + f.acc2 : '');
          BT.db.evoluciones.push({ id: u.uid('ev'), residentId: r.id, ts: Date.now(), autor: usr.nombre, rol: usr.role, tipo: usr.role === 'cuidadora' ? 'Cuidados' : 'Enfermería', texto, enmiendas: [], origen: 'incidente', incidentId: inc.id });
          BT.save();
          BT.audit(isFall ? 'Registró caída' : 'Registró incidente', 'Historia clínica', { residentId: r.id, detail: f.tipo + ' · ' + f.grav + (isFall ? ' · ' + f.lugar : '') });
          if (isFall && f.avFam) BT.audit('Notificó', 'Familia (WhatsApp)', { residentId: r.id, detail: 'Aviso de caída a ' + r.referente.nombre });
          // Estado de éxito animado
          const steps = [['clipboard-list', 'Evolución en la historia clínica', 'Visible para médico y enfermería'], [isFall ? 'footprints' : 'siren', isFall ? 'Registro de caídas del residente' : 'Registro de incidentes', u.fmtDateTime(ts)], ['shield-check', 'Auditoría de accesos', 'Firmado por ' + usr.nombre + ' (Ley 18.331)']];
          if (isFall && f.avFam) steps.push(['message-circle', 'Aviso a la familia', 'WhatsApp a ' + r.referente.nombre + ' (' + r.referente.vinculo.toLowerCase() + ')']);
          if (isFall && f.avMed) steps.push(['stethoscope', 'Aviso al médico', 'Dr. Fernando Aguirre']);
          el.querySelector('.modal-h').style.display = 'none';
          el.querySelector('.modal-b').innerHTML = '<div class="ok-burst"><svg viewBox="0 0 100 100"><circle class="halo" cx="50" cy="50" r="40" fill="rgba(41,112,64,.18)"/><circle class="c1" cx="50" cy="50" r="45" fill="none" stroke="#297040" stroke-width="5" stroke-linecap="round" transform="rotate(-90 50 50)"/><path class="c2" d="M31 51.5l12.5 12.5L70 37.5" fill="none" stroke="#297040" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '<h3 style="font-size:var(--fs-2xl);margin-top:12px">' + (isFall ? 'Caída registrada' : 'Incidente registrado') + '</h3><p class="muted mt-8">' + esc(BT.fullName(r)) + ' · Hab. ' + r.habitacion + r.cama + ' · ' + u.fmtTime(ts) + '</p>' +
            '<div class="const-list">' + steps.map((s, i) => '<div class="ci" style="animation-delay:' + (750 + i * 140) + 'ms"><span class="ck">' + ic('check') + '</span><div class="grow"><div class="strong" style="font-size:var(--fs-md)">' + s[1] + '</div><div class="muted" style="font-size:var(--fs-xs)">' + esc(s[2]) + '</div></div>' + ic(s[0], 'ic-sm') + '</div>').join('') + '</div></div>';
          el.querySelector('.modal-f').innerHTML = (BT.can('clinical.read') ? '<button class="btn" data-go-hc>' + ic('clipboard-list') + 'Ver en historia clínica</button>' : '') + '<button class="btn primary" data-close>Listo</button>';
          const g = el.querySelector('[data-go-hc]'); if (g) g.addEventListener('click', () => { close(); BT.go('historia', { residentId: r.id, sub: isFall ? 'caidas' : undefined }); });
          if (isFall && f.avFam) setTimeout(() => ui.toast('WhatsApp enviado a ' + r.referente.nombre, { icon: 'message-circle', sub: 'Aviso de caída · simulado' }), 1500);
          if (BT.state.tab === 'cuidados') BT.refresh();
          BT.shell.updateNav();
        });
      },
    });
  }
  BT.actions.newIncident = incidentModal;
})();

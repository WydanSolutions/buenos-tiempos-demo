/* ==========================================================================
   Inicio — panel del día (cabecera verde + grilla bento)
   ========================================================================== */
(function () {
  'use strict';
  const BT = window.BT; const u = BT.u; const ic = BT.ic; const ui = BT.ui; const esc = u.esc;

  BT.addCSS('inicio', `
    .hero2{position:relative;overflow:hidden;border-radius:26px;padding:26px 28px;margin:16px 0;color:#fff;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:center;
      background:radial-gradient(560px 260px at 92% -10%,color-mix(in srgb, var(--brand-300) 50%, transparent),transparent 60%),radial-gradient(420px 260px at -5% 120%,color-mix(in srgb, var(--brand-300) 18%, transparent),transparent 60%),linear-gradient(135deg,var(--brand-700) 0%,var(--brand-800) 50%,var(--brand-950) 100%);
      box-shadow:0 26px 50px -24px color-mix(in srgb, var(--brand-950) 75%, transparent)}
    .hero2::after{content:"";position:absolute;right:220px;bottom:-70px;width:200px;height:200px;border-radius:0 70% 0 70%;background:rgba(255,255,255,.05);transform:rotate(-12deg);pointer-events:none}
    .hero2 .live{color:var(--brand-200)}.hero2 .live::before{background:var(--brand-300)}
    .hero2 .hi{font-size:34px;font-weight:800;letter-spacing:-.04em;line-height:1.08;margin-top:8px}
    .hero2 .sum{color:var(--brand-200);font-size:15px;margin-top:8px;max-width:620px;line-height:1.5}
    .hero2 .sum b{color:#fff;font-weight:650}
    .hero2 .pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
    .hero2 .pills span{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:99px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14);font-size:12.5px;font-weight:600;color:var(--brand-50);backdrop-filter:blur(6px)}
    .hero2 .pills .ic{width:15px;height:15px}
    .hero2 .rings{display:flex;gap:18px;position:relative;z-index:1}
    .hero2 .ring{width:108px;height:108px}
    .hero2 .ring .track{stroke:rgba(255,255,255,.14)}
    .hero2 .ring .lbl b{color:#fff;font-size:22px}.hero2 .ring .lbl span{color:var(--brand-200)}
    .hero2 .rcap{text-align:center;font-size:12px;font-weight:700;color:var(--brand-100);margin-top:6px;letter-spacing:.02em}
    .hero2 .rcap small{display:block;font-weight:500;color:color-mix(in srgb, var(--brand-300) 60%, rgb(187,187,187))}

    .bento{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:minmax(138px,auto);gap:14px}
    .tile{position:relative;overflow:hidden;border-radius:24px;padding:18px 20px;display:flex;flex-direction:column;gap:6px;transition:transform var(--d) var(--ease),box-shadow var(--d) var(--ease);text-align:left;border:0;font:inherit;color:inherit}
    button.tile{cursor:pointer}
    button.tile:hover{transform:translateY(-3px);box-shadow:var(--sh-3)}
    .tile .tl{font-size:13px;font-weight:650;display:flex;align-items:center;gap:8px;opacity:.85}
    .tile .tl .ic{width:16px;height:16px}
    .tile .tv{font-size:40px;font-weight:800;letter-spacing:-.05em;line-height:1;font-variant-numeric:tabular-nums}
    .tile .tv small{font-size:18px;font-weight:700;opacity:.55;letter-spacing:-.02em}
    .tile .ts{font-size:12.5px;font-weight:600;opacity:.8}
    .tile .chip2{display:inline-flex;align-items:center;gap:6px;align-self:flex-start;font-size:12px;font-weight:700;background:rgba(255,255,255,.6);border-radius:99px;padding:4px 10px}
    .tile .go{position:absolute;right:14px;top:14px;width:30px;height:30px;border-radius:10px;display:grid;place-items:center;background:rgba(255,255,255,.5);opacity:0;transform:translate(-4px,4px);transition:all var(--d) var(--ease)}
    button.tile:hover .go{opacity:1;transform:none}
    .t-big{grid-column:span 2;grid-row:span 2;color:#fff;background:radial-gradient(320px 200px at 100% 0%,color-mix(in srgb, var(--brand-300) 35%, transparent),transparent 65%),linear-gradient(150deg,var(--brand-600),var(--brand-800));box-shadow:0 18px 36px -18px color-mix(in srgb, var(--brand-900) 70%, transparent)}
    .t-big .tv{font-size:72px}.t-big .chip2{background:rgba(255,255,255,.14);color:var(--brand-50)}.t-big .go{background:rgba(255,255,255,.16);color:#fff}
    .bedmap{display:flex;flex-direction:column;gap:10px;margin-top:auto}
    .bedmap .bm-row{display:flex;align-items:center;gap:10px}
    .bedmap .bm-s{font-size:11px;font-weight:800;letter-spacing:.04em;color:var(--brand-200);width:28px}
    .bedmap .bm{display:grid;grid-template-columns:repeat(18,minmax(0,1fr));gap:4px;flex:1}
    .bedmap .bm i{height:20px;border-radius:6px;background:rgba(255,255,255,.92);box-shadow:0 2px 6px -2px rgba(0,0,0,.25);animation:pop 420ms var(--ease-spring) both}
    .bedmap .bm i.f{background:rgba(255,255,255,.16);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
    .bedmap .bm i.r{background:#f4c46a}
    .bedmap .bm i.d{background:color-mix(in srgb, var(--brand-300) 55%, #fff)}
    .bm-leg{display:flex;gap:12px;font-size:11px;color:var(--brand-200);font-weight:600}
    .bm-leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
    .t-red{background:var(--tile-red);color:var(--tile-red-ink)}
    .t-mint{background:var(--tile-mint);color:var(--tile-mint-ink)}
    .t-yellow{background:var(--tile-yellow);color:var(--tile-yellow-ink)}
    .t-violet{background:var(--tile-violet);color:var(--tile-violet-ink)}
    .t-white{background:var(--surface);color:var(--ink-950);box-shadow:var(--sh-1)}
    .t-blue{background:var(--tile-blue);color:var(--tile-blue-ink)}
    .tile .pbar{height:8px;border-radius:99px;background:rgba(255,255,255,.65);overflow:hidden;margin-top:auto}
    .tile .pbar>span{display:block;height:100%;border-radius:inherit;background:currentColor;animation:barGrow 900ms var(--ease-out) both;transform-origin:left}
    .tile .av-stack .avatar{box-shadow:0 0 0 2.5px var(--tile-violet)}
    .tile .spark{margin:auto -20px -18px;width:calc(100% + 40px);height:54px}
    .t-red .pulse-dot{width:10px;height:10px;border-radius:50%;background:#c4473c;box-shadow:0 0 0 0 rgba(196,71,60,.5);animation:pulseR 1.6s infinite}
    @keyframes pulseR{0%{box-shadow:0 0 0 0 rgba(196,71,60,.5)}70%{box-shadow:0 0 0 10px rgba(196,71,60,0)}100%{box-shadow:0 0 0 0 rgba(196,71,60,0)}}

    .al2{display:flex;flex-direction:column;gap:6px;padding:8px 10px 12px}
    .al2 .ar{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:14px;cursor:pointer;transition:background var(--d-fast),transform var(--d-fast)}
    .al2 .ar:hover{background:#f4f6f2}
    .al2 .ar .st{width:4px;align-self:stretch;border-radius:4px;flex:none}
    .al2 .ar .st.danger{background:#d0574b}.al2 .ar .st.warn{background:#e0a83e}.al2 .ar .st.info{background:#5d8fcb}.al2 .ar .st.ok{background:var(--brand-400)}
    .al2 .ar .t{font-weight:650;font-size:14px;color:var(--ink-950);line-height:1.3}
    .al2 .ar .d{font-size:12.5px;color:var(--ink-500);line-height:1.35;margin-top:1px}
    .al2 .ar .act{margin-left:auto;flex:none;font-size:12px;font-weight:700;border-radius:9px;padding:6px 11px;background:var(--brand-50);color:var(--brand-700);transition:background var(--d-fast)}
    .al2 .ar:hover .act{background:var(--brand-100)}
    .al2 .ar .act.danger{background:#fde8e6;color:#9b2c22}

    .shift-now{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
    .sn{border-radius:14px;padding:10px 12px;background:#f4f6f2;transition:background var(--d)}
    .sn.cur{background:var(--tile-mint);box-shadow:inset 0 0 0 1.5px var(--brand-200)}
    .sn.bad{background:var(--tile-red);box-shadow:inset 0 0 0 1.5px #f2c2bc}
    .sn .h{display:flex;justify-content:space-between;align-items:center;font-size:var(--fs-xs);font-weight:650;color:var(--ink-600)}
    .sn .h .ic{width:14px;height:14px}
    .sn .v{font-size:20px;font-weight:800;letter-spacing:-.03em;margin-top:2px;font-variant-numeric:tabular-nums}
    .ho-card{border-radius:16px;padding:14px 16px;background:#f6f8f4}
    .ho-card + .ho-card{margin-top:10px}
    .pend{display:flex;align-items:center;gap:8px;font-size:var(--fs-sm);color:var(--ink-700);margin-top:6px}
    .pend .box{width:16px;height:16px;border-radius:5px;border:1.5px solid var(--ink-300);flex:none;background:#fff}

    .big-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
    .big-act{display:flex;flex-direction:column;align-items:flex-start;gap:14px;padding:22px;border-radius:24px;border:0;text-align:left;transition:all var(--d) var(--ease);min-height:160px;font:inherit}
    .big-act:hover{transform:translateY(-3px);box-shadow:var(--sh-3)}
    .big-act:active{transform:scale(.98)}
    .big-act .bi{width:54px;height:54px;border-radius:17px;display:grid;place-items:center;background:rgba(255,255,255,.65)}
    .big-act .bi .ic{width:26px;height:26px}
    .big-act .t{font-size:19px;font-weight:800;letter-spacing:-.02em}
    .big-act .d{font-size:var(--fs-sm);opacity:.8}
    .big-act.a1{background:var(--tile-mint);color:var(--tile-mint-ink)}
    .big-act.a2{background:var(--tile-violet);color:var(--tile-violet-ink)}
    .big-act.a3{background:var(--tile-red);color:var(--tile-red-ink)}
    .big-act .pbar{width:100%;height:8px;border-radius:99px;background:rgba(255,255,255,.7);overflow:hidden}
    .big-act .pbar>span{display:block;height:100%;background:currentColor;border-radius:inherit}
    .room-quick{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
    .rq{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:16px;border:0;background:#f4f6f2;text-align:left;transition:all var(--d) var(--ease);min-height:60px;font:inherit}
    .rq:hover{background:var(--tile-mint);transform:translateY(-1px)}
    .rq .hb{font-size:11px;font-weight:800;color:#fff;background:var(--brand-600);border-radius:9px;padding:5px 7px;flex:none}
    @media (max-width:1180px){.bento{grid-template-columns:repeat(2,minmax(0,1fr))}.hero2 .ring{width:92px;height:92px}.hero2 .rings{gap:12px}.hero2 .hi{font-size:30px}}
    @media (max-width:760px){.hero2{grid-template-columns:1fr}.hero2 .rings{justify-content:flex-start}}
    @media (max-width:640px){.hero2{padding:22px}.hero2 .hi{font-size:26px}.hero2 .ring{width:92px;height:92px}.bento{grid-template-columns:1fr}.t-big{grid-column:auto;grid-row:auto}.t-big .tv{font-size:56px}.big-actions{grid-template-columns:1fr}.big-act{min-height:0;flex-direction:row;align-items:center;padding:18px}.bedmap .bm{grid-template-columns:repeat(9,minmax(0,1fr))}}
  `);

  const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches'; };
  const firstName = (n) => n.replace(/^(Dr\.|Dra\.|Lic\.)\s*/, '').split(' ')[0];
  const sedesInScope = () => (BT.state.sede === 'ALL' ? ['BT1', 'BT2'] : [BT.state.sede]);
  const canSee = (id) => BT.visibleTabs().some((t) => t.id === id);
  const plural = (n, s, p) => n + ' ' + (n === 1 ? s : p);

  /* ---------- Alertas propias del módulo ---------- */
  BT.addAlerts(() => {
    const out = [];
    const res = BT.residentsInSede();
    const missing = res.filter((r) => r.docs.some((d) => d.estado !== 'ok'));
    if (missing.length) out.push({ id: 'docs-res', tone: 'warn', icon: 'file-warning', title: missing.length + ' legajos de residentes incompletos', desc: missing.slice(0, 3).map((r) => BT.shortName(r)).join(', ') + (missing.length > 3 ? '…' : '') + ' · documentación faltante o vencida', tab: 'residentes', params: { filtro: 'docs' }, roles: ['direccion', 'administracion', 'medico', 'enfermeria'] });
    // (los cumpleaños los aporta el módulo Actividades)
    const revisar = res.filter((r) => u.daysUntil(r.plan.revision) <= 14);
    if (revisar.length) out.push({ id: 'plan-rev', tone: 'info', icon: 'clipboard-check', title: revisar.length + ' planes de atención para revisar', desc: 'Revisión prevista en los próximos 14 días', tab: 'residentes', roles: ['direccion', 'medico', 'enfermeria'] });
    const oldB = res.filter((r) => u.daysBetween(r.barthel[r.barthel.length - 1].fecha, u.today()) > 150);
    if (oldB.length) out.push({ id: 'barthel-old', tone: 'info', icon: 'gauge', title: oldB.length + ' índices de Barthel desactualizados', desc: 'Más de 5 meses sin reevaluar · impacta en el cálculo del ratio', tab: 'residentes', roles: ['direccion', 'medico', 'enfermeria'] });
    return out;
  });

  BT.tab({
    id: 'inicio', label: 'Inicio', icon: 'house', group: 'dia', order: 1,
    roles: ['direccion', 'medico', 'enfermeria', 'cuidadora', 'administracion'],
    badge: () => BT.alerts().filter((a) => a.tone === 'danger').length,
    render(el) {
      if (BT.isRole('cuidadora')) return renderCuidadora(el);
      const usr = BT.state.user; const sedes = sedesInScope();
      const alerts = BT.alerts();
      const urgent = alerts.filter((a) => a.tone === 'danger');
      const now = new Date(); const curT = u.currentShift(now); const opDate = u.shiftDate(now);
      const res = BT.residentsInSede();
      const occ = sedes.map((s) => Object.assign({ sede: s }, BT.occupancy(s)));
      const tot = { camas: u.sum(occ, 'camas'), ocupadas: u.sum(occ, 'ocupadas'), libres: u.sum(occ, 'libres'), reservadas: u.sum(occ, 'reservadas') };

      // medicación del turno
      const doses = sedes.flatMap((s) => BT.dosesFor(opDate, curT, s));
      const given = doses.filter((d) => d.estado === 'administrada').length;
      const late = sedes.flatMap((s) => ['M', 'T', 'N'].flatMap((t) => BT.dosesFor(u.todayIso(), t, s))).filter((d) => d.estado === 'atrasada').length;
      const medPct = doses.length ? Math.round((given / doses.length) * 100) : 100;

      // ratio: peor turno de hoy (desde el turno actual)
      const order = ['M', 'T', 'N']; const fromIdx = order.indexOf(curT);
      const slots = sedes.flatMap((s) => order.slice(fromIdx).map((t) => Object.assign({ sede: s, turno: t }, BT.ratioStatus(opDate, s, t))));
      const bad = slots.filter((x) => !x.ok);
      const team = sedes.flatMap((s) => BT.shiftStaff(opDate, s, curT));

      // resumen en lenguaje natural
      const sum = '<b>' + plural(res.length, 'residente', 'residentes') + '</b>' + (sedes.length > 1 ? ' en las dos sedes' : ' en ' + BT.sedeName(sedes[0])) + ', <b>' + plural(tot.libres, 'cama libre', 'camas libres') + '</b> y ' +
        (urgent.length ? '<b>' + plural(urgent.length, 'tema urgente', 'temas urgentes') + '</b>' + (bad.length ? ': el turno ' + u.SHIFTS[bad[0].turno].label.toLowerCase() + ' de ' + bad[0].sede + ' necesita ' + plural(bad[0].deficit, 'cuidadora más', 'cuidadoras más') + '.' : '.') : '<b>nada urgente</b>. La casa está tranquila.');

      const rings = occ.map((o) => '<div>' + ui.ring(o.pct, Math.round(o.pct) + '%', o.ocupadas + ' de ' + o.camas, o.sede === 'BT1' ? '#8fd0a2' : '#c9bdf2') + '<div class="rcap">' + o.sede + ' · ' + esc(BT.db.sedes.find((x) => x.id === o.sede).barrio.split(',')[0]) + '<small>' + plural(o.libres, 'libre', 'libres') + (o.reservadas ? ' · ' + o.reservadas + ' reservada' : '') + '</small></div></div>').join('');

      // mapa de camas
      const bedRow = (s) => {
        const so = BT.db.sedes.find((x) => x.id === s); const occRes = BT.db.residents.filter((r) => r.sede === s && r.estado === 'activo');
        const cells = []; so.habitaciones.forEach((h) => h.camas.forEach((c) => { const code = h.nro + c; const r = occRes.find((x) => x.habitacion + x.cama === code); cells.push(r ? (BT.isDependent(r) ? 'd' : '') : so.reservadas.includes(code) ? 'r' : 'f'); }));
        return '<div class="bm-row"><span class="bm-s">' + s + '</span><div class="bm">' + cells.map((c, i) => '<i class="' + c + '" style="animation-delay:' + (i * 18) + 'ms"></i>').join('') + '</div></div>';
      };

      // tile financiero o de incidentes
      let tile4;
      if (BT.can('money.read')) {
        const months = BT.finMonths(); const resul = months.map((m) => BT.finTotal(m, BT.state.sede, 'ingreso') - BT.finTotal(m, BT.state.sede, 'gasto'));
        const cur = resul[resul.length - 1], prev = resul[resul.length - 2]; const dlt = prev ? ((cur - prev) / Math.abs(prev)) * 100 : 0;
        tile4 = '<button class="tile t-white" data-act="go" data-tab="finanzas"><span class="go">' + ic('arrow-up-right', 'ic-sm') + '</span><div class="tl">' + ic('chart-line') + 'Resultado de ' + u.fmtMonth(months[months.length - 1]).split(' ')[0] + '</div><div class="tv" style="font-size:30px"><span style="font-size:15px;opacity:.5;margin-right:4px">$U</span><span data-count="' + cur + '">' + u.fmtNum(cur) + '</span></div><div class="ts"><span class="delta ' + (dlt >= 0 ? 'up' : 'down') + '">' + ic(dlt >= 0 ? 'trending-up' : 'trending-down', 'ic-xs') + u.fmtNum(Math.abs(dlt), 1) + ' %</span> vs. mes anterior</div>' + ui.spark(resul, '#297040', 54) + '</button>';
      } else {
        const weeks = Array.from({ length: 8 }, (_, i) => BT.bySede(BT.db.incidents).filter((x) => { const age = (Date.now() - x.ts) / 864e5; return age >= (7 - i) * 7 && age < (8 - i) * 7; }).length);
        const inc7 = BT.bySede(BT.db.incidents).filter((i) => Date.now() - i.ts < 7 * 864e5).length;
        tile4 = '<button class="tile t-white" data-act="go" data-tab="' + (canSee('cuidados') ? 'cuidados' : 'historia') + '"><span class="go">' + ic('arrow-up-right', 'ic-sm') + '</span><div class="tl">' + ic('siren') + 'Incidentes · 7 días</div><div class="tv" data-count="' + inc7 + '">' + inc7 + '</div><div class="ts">Caídas, conductas y otros eventos</div>' + ui.spark(weeks, '#d98c5f', 54) + '</button>';
      }

      const ratioTile = bad.length
        ? '<button class="tile t-red" data-act="ratio"><span class="go">' + ic('arrow-up-right', 'ic-sm') + '</span><div class="tl"><span class="pulse-dot"></span>Turno ' + u.SHIFTS[bad[0].turno].label.toLowerCase() + ' · ' + bad[0].sede + '</div><div class="tv">' + bad[0].assigned + '<small>/' + bad[0].required + '</small></div><span class="chip2">' + ic('user-plus', 'ic-xs') + 'Falta ' + plural(bad[0].deficit, 'cuidadora', 'cuidadoras') + '</span></button>'
        : '<button class="tile t-mint" data-act="go" data-tab="' + (canSee('personal') ? 'personal' : 'inicio') + '"><span class="go">' + ic('arrow-up-right', 'ic-sm') + '</span><div class="tl">' + ic('shield-check') + 'Ratio de cuidadoras</div><div class="tv" style="font-size:30px">Cubierto</div><span class="chip2">' + ic('check', 'ic-xs') + 'Todos los turnos de hoy</span></button>';

      el.innerHTML =
        '<section class="hero2"><div style="position:relative;z-index:1">' + ui.live('En vivo · ' + esc(BT.sedeName())) +
        '<div class="hi">' + greet() + ', ' + esc(firstName(usr.nombre)) + '</div>' +
        '<div class="sum">' + sum + '</div>' +
        '<div class="pills"><span>' + ic('calendar') + u.cap(u.fmtDateLong(now).replace(/ de \d{4}$/, '')) + '</span><span>' + ic(u.SHIFTS[curT].icon) + 'Turno ' + u.SHIFTS[curT].label.toLowerCase() + ' · ' + u.SHIFTS[curT].from + '–' + u.SHIFTS[curT].to + '</span><span>' + ic('bell-ring') + plural(urgent.length, 'urgente', 'urgentes') + ' · ' + plural(alerts.length, 'aviso', 'avisos') + '</span></div>' +
        '</div><div class="rings">' + rings + '</div></section>' +

        '<div class="bento stagger">' +
        '<button class="tile t-big" data-act="go" data-tab="' + (canSee('admisiones') ? 'admisiones' : canSee('residentes') ? 'residentes' : 'inicio') + '"><span class="go">' + ic('arrow-up-right', 'ic-sm') + '</span><div class="tl">' + ic('bed-double') + 'Camas ocupadas</div><div class="tv"><span data-count="' + tot.ocupadas + '">' + tot.ocupadas + '</span><small>/' + tot.camas + '</small></div>' +
        '<span class="chip2">' + ic('users', 'ic-xs') + res.filter(BT.isDependent).length + ' dependientes · Barthel ≤ 40</span>' +
        '<div class="bedmap">' + sedes.map(bedRow).join('') + '<div class="bm-leg"><span><i style="background:#fff"></i>Ocupada</span><span><i style="background:color-mix(in srgb, var(--brand-300) 55%, #fff)"></i>Dependiente</span><span><i style="background:#f4c46a"></i>Reservada</span><span><i style="background:rgba(255,255,255,.2)"></i>Libre</span></div></div></button>' +
        ratioTile +
        '<button class="tile t-yellow" data-act="go" data-tab="' + (canSee('medicacion') ? 'medicacion' : 'inicio') + '"><span class="go">' + ic('arrow-up-right', 'ic-sm') + '</span><div class="tl">' + ic('pill') + 'Medicación del turno</div><div class="tv"><span data-count="' + medPct + '">' + medPct + '</span><small>%</small></div><div class="ts">' + given + ' de ' + doses.length + ' dosis' + (late ? ' · <b>' + plural(late, 'atrasada', 'atrasadas') + '</b>' : '') + '</div><div class="pbar"><span style="width:' + medPct + '%"></span></div></button>' +
        '<button class="tile t-violet" data-act="go" data-tab="' + (canSee('personal') ? 'personal' : 'inicio') + '"><span class="go">' + ic('arrow-up-right', 'ic-sm') + '</span><div class="tl">' + ic('users-round') + 'Equipo en turno</div><div class="tv">' + team.length + '<small> personas</small></div><div class="av-stack" style="margin-top:auto">' + team.slice(0, 6).map((p) => ui.avatar(p.nombre, { size: 'sm', tip: true })).join('') + (team.length > 6 ? '<span class="avatar sm" style="--av-bg:#fff;--av-fg:#3d2f73">+' + (team.length - 6) + '</span>' : '') + '</div></button>' +
        tile4 +
        '</div>' +

        '<div class="grid g-main mt-16">' +
        '<div class="col gap-16">' +
        ui.card({ title: 'Lo que necesita atención', icon: 'bell-ring', sub: 'Ordenado por prioridad', actions: alerts.length > 7 ? '<button class="btn ghost sm" data-act="all-alerts">Ver todas (' + alerts.length + ')</button>' : '', bodyCls: 'flush', body: alertList(alerts.slice(0, 7)) }) +
        ui.card({ title: 'Novedades del turno anterior', icon: 'notebook-pen', sub: 'Parte de entrega de turno', actions: canSee('cuidados') ? '<button class="btn ghost sm" data-act="go" data-tab="cuidados">Ver partes ' + ic('arrow-right', 'ic-xs') + '</button>' : '', body: handovers(sedes) }) +
        '</div>' +
        '<div class="col gap-16">' +
        ui.card({ title: 'Cobertura por turno', icon: 'users-round', sub: 'Presentes / mínimo según dependencia', body: shiftNow(sedes, opDate, curT), actions: canSee('personal') ? '<button class="icon-btn ghost sm" data-act="go" data-tab="personal" data-tip="Ir al planificador">' + ic('arrow-up-right', 'ic-sm') + '</button>' : '' }) +
        ui.card({ title: 'Hoy en la casa', icon: 'calendar-days', bodyCls: 'flush', body: agenda(sedes) }) +
        '</div></div>';

      ui.on(el, {
        alert: (t) => { const a = alerts[+t.dataset.i]; if (a.action) a.action(); else if (a.tab) BT.go(a.tab, a.params || {}); },
        'all-alerts': () => ui.modal({ title: 'Todos los avisos', sub: BT.sedeName(), icon: 'bell-ring', size: 'lg', body: alertList(alerts), onMount: (m, close) => m.addEventListener('click', (e) => { const r = e.target.closest('[data-act="alert"]'); if (!r) return; close(); const a = alerts[+r.dataset.i]; setTimeout(() => (a.action ? a.action() : a.tab && BT.go(a.tab, a.params || {})), 150); }) }),
        go: (t) => t.dataset.tab !== 'inicio' && BT.go(t.dataset.tab),
        ratio: () => (canSee('personal') ? BT.go('personal', { fecha: opDate, sede: bad[0].sede, turno: bad[0].turno }) : null),
        res: (t) => BT.actions.openResident && BT.actions.openResident(t.dataset.id),
      });
    },
  });

  function alertList(alerts) {
    if (!alerts.length) return ui.empty({ ill: 'leaf', title: 'Todo en orden', text: 'No hay avisos pendientes para esta sede.' });
    const label = (a) => (a.tone === 'danger' && a.tab === 'personal' ? 'Resolver' : a.tab === 'cobranzas' ? 'Cobrar' : a.tab === 'medicacion' ? 'Revisar' : 'Ver');
    return '<div class="al2">' + alerts.map((a, i) => '<div class="ar" data-act="alert" data-i="' + i + '"><span class="st ' + (a.tone || 'info') + '"></span><div style="min-width:0" class="grow"><div class="t">' + esc(a.title) + '</div>' + (a.desc ? '<div class="d">' + a.desc + '</div>' : '') + '</div>' + (a.sede && BT.state.sede === 'ALL' ? BT.sedeTag(a.sede) : '') + '<span class="act ' + (a.tone === 'danger' ? 'danger' : '') + '">' + label(a) + '</span></div>').join('') + '</div>';
  }

  function handovers(sedes) {
    const items = sedes.map((s) => u.sortBy(BT.db.handovers.filter((h) => h.sede === s), 'ts', true)[0]).filter(Boolean);
    if (!items.length) return ui.empty({ title: 'Sin partes registrados', text: 'Cuando el turno saliente complete su parte, lo vas a ver acá.' });
    return items.map((h) => '<div class="ho-card"><div class="row between"><div class="row">' + ui.avatar(h.autor, { size: 'sm' }) + '<div><div class="strong" style="font-size:var(--fs-md)">' + esc(h.autor) + '</div><div class="muted" style="font-size:var(--fs-xs)">Turno ' + u.SHIFTS[h.turno].label.toLowerCase() + ' · ' + u.fmtDate(h.fecha) + '</div></div></div><div class="row gap-6">' + BT.sedeTag(h.sede) + '<span class="subtle" style="font-size:var(--fs-xs)">' + ui.relTime(h.ts) + '</span></div></div>' +
      '<p style="margin-top:10px;font-size:var(--fs-md);color:var(--ink-800)">' + esc(h.novedades) + '</p>' +
      (h.pendientes && h.pendientes.length ? '<div class="mt-8">' + h.pendientes.map((p) => '<div class="pend"><span class="box"></span>' + esc(p) + '</div>').join('') + '</div>' : '') + '</div>').join('');
  }

  function shiftNow(sedes, opDate, curT) {
    return sedes.map((s) => {
      const cells = ['M', 'T', 'N'].map((t) => {
        const st = BT.ratioStatus(opDate, s, t);
        return '<div class="sn ' + (t === curT ? 'cur ' : '') + (st.ok ? '' : 'bad') + '" data-tip="' + (st.ok ? 'Ratio cumplido' : 'Faltan ' + st.deficit + ' para el mínimo') + '"><div class="h"><span class="row gap-4">' + ic(u.SHIFTS[t].icon) + u.SHIFTS[t].label + '</span>' + (t === curT ? '<span class="sdot ok"></span>' : '') + '</div><div class="v ' + (st.ok ? '' : 't-danger') + '">' + st.assigned + '<span class="subtle" style="font-size:12px;font-weight:600"> / ' + st.required + '</span></div></div>';
      }).join('');
      const team = BT.shiftStaff(opDate, s, curT);
      return '<div class="mb-16"><div class="row between mb-8">' + BT.sedeTag(s) + '<div class="av-stack">' + team.map((p) => ui.avatar(p.nombre, { size: 'xs', tip: true })).join('') + '</div></div><div class="shift-now">' + cells + '</div></div>';
    }).join('') + '<div class="muted" style="font-size:var(--fs-xs)">' + ic('info', 'ic-xs') + ' Dependiente = Barthel ≤ 40 (Ord. 1032/2019).</div>';
  }

  function agenda(sedes) {
    const today = u.todayIso(); const rows = [];
    BT.db.activities.filter((a) => a.fecha === today && sedes.includes(a.sede)).forEach((a) => rows.push({ hora: a.hora, icon: 'palette', tone: 'violet', t: a.titulo, d: a.lugar + ' · ' + a.responsable, sede: a.sede }));
    BT.db.visits.filter((v) => v.fecha === today && v.estado === 'Agendada' && sedes.includes(v.sede)).forEach((v) => { const r = BT.resident(v.residentId); rows.push({ hora: v.hora, icon: 'door-open', tone: 'info', t: 'Visita de ' + v.visitante, d: 'A ' + BT.shortName(r) + ' (' + v.vinculo.toLowerCase() + ')', sede: v.sede }); });
    BT.residentsInSede().forEach((r) => { const b = u.toDate(r.nacimiento); const n = new Date(); if (b.getDate() === n.getDate() && b.getMonth() === n.getMonth()) rows.push({ hora: '—', icon: 'cake', tone: 'ok', t: 'Cumpleaños de ' + BT.shortName(r), d: 'Cumple ' + u.age(r.nacimiento) + ' años', sede: r.sede, id: r.id }); });
    if (!rows.length) return ui.empty({ ill: 'calendar', title: 'Día tranquilo', text: 'No hay actividades ni visitas agendadas para hoy.' });
    return '<div class="list">' + u.sortBy(rows, 'hora').map((x) => '<div class="li ' + (x.id ? 'click' : '') + '" ' + (x.id ? 'data-act="res" data-id="' + x.id + '"' : '') + '><span class="li-ic ' + x.tone + '">' + ic(x.icon, 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(x.t) + '</div><div class="d">' + esc(x.d) + '</div></div><span class="num strong" style="font-size:var(--fs-sm)">' + x.hora + '</span>' + (BT.state.sede === 'ALL' ? BT.sedeTag(x.sede) : '') + '</div>').join('') + '</div>';
  }

  /* ---------- Vista tablet de la cuidadora ---------- */
  function renderCuidadora(el) {
    const usr = BT.state.user; const sede = usr.sede; const now = new Date();
    const curT = u.currentShift(now); const opDate = u.shiftDate(now);
    const doses = BT.dosesFor(opDate, curT, sede);
    const given = doses.filter((d) => d.estado === 'administrada').length;
    const pend = doses.length - given;
    const res = BT.db.residents.filter((r) => r.estado === 'activo' && r.sede === sede).sort((a, b) => (a.habitacion + a.cama).localeCompare(b.habitacion + b.cama, undefined, { numeric: true }));
    const team = BT.shiftStaff(opDate, sede, curT);
    const ho = u.sortBy(BT.db.handovers.filter((h) => h.sede === sede), 'ts', true)[0];
    el.innerHTML =
      '<div class="tablet-bar mt-16"><span class="avatar lg" style="--av-bg:rgba(255,255,255,.14);--av-fg:#fff">' + esc(u.initials(usr.nombre).toUpperCase()) + '</span><div class="grow"><div style="font-size:22px;font-weight:800;letter-spacing:-.02em">' + greet() + ', ' + esc(firstName(usr.nombre)) + '</div><div style="opacity:.75;font-size:var(--fs-sm)">' + esc(BT.sedeName(sede)) + ' · Turno ' + u.SHIFTS[curT].label.toLowerCase() + ' ' + u.SHIFTS[curT].from + '–' + u.SHIFTS[curT].to + '</div></div>' +
      '<div class="row gap-6">' + team.map((p) => '<span class="badge">' + esc(p.nombre.split(' ')[0]) + '</span>').join('') + '</div></div>' +
      '<div class="big-actions mt-16 stagger">' +
      '<button class="big-act a1" data-act="go" data-tab="medicacion"><span class="bi">' + ic('pill') + '</span><div><div class="t">Dar medicación</div><div class="d">' + (pend ? pend + ' dosis pendientes en tu turno' : 'Todas las dosis del turno registradas') + '</div></div><div class="pbar"><span style="width:' + (doses.length ? (given / doses.length) * 100 : 100) + '%"></span></div></button>' +
      '<button class="big-act a2" data-act="go" data-tab="cuidados"><span class="bi">' + ic('hand-heart') + '</span><div><div class="t">Registrar cuidados</div><div class="d">Higiene, ingesta, cambios posturales, deposiciones</div></div></button>' +
      '<button class="big-act a3" data-act="incident"><span class="bi">' + ic('siren') + '</span><div><div class="t">Caída o incidente</div><div class="d">Queda en la historia clínica y se avisa a enfermería</div></div></button>' +
      '</div>' +
      '<div class="grid g-main mt-16">' +
      ui.card({ title: 'Residentes de ' + sede, icon: 'bed-double', sub: 'Tocá una habitación para ver o registrar', body: '<div class="room-quick">' + res.map((r) => '<button class="rq" data-act="room" data-id="' + r.id + '"><span class="hb">' + r.habitacion + r.cama + '</span><span style="min-width:0"><span class="strong ellipsis" style="display:block;font-size:var(--fs-md)">' + esc(BT.shortName(r)) + '</span><span class="muted" style="font-size:11px">' + esc(BT.depGrade(BT.lastBarthel(r)).label) + (r.alergias.length ? ' · <span class="t-danger">Alergia</span>' : '') + '</span></span></button>').join('') + '</div>' }) +
      ui.card({ title: 'Lo que dejó el turno anterior', icon: 'notebook-pen', body: ho ? handovers([sede]) : ui.empty({ title: 'Sin parte', text: 'No hay un parte del turno anterior.' }) }) +
      '</div>';
    ui.on(el, {
      go: (t) => BT.go(t.dataset.tab),
      incident: () => (BT.actions.newIncident ? BT.actions.newIncident(null, 'Caída') : BT.go('cuidados')),
      room: (t) => BT.go('cuidados', { residentId: t.dataset.id }),
    });
  }
})();

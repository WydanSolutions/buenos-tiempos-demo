/* ==========================================================================
   Finanzas — resultados por sede y consolidado Galauru SAS
   ========================================================================== */
(function () {
  'use strict';
  const BT = window.BT; const u = BT.u; const ui = BT.ui; const ic = BT.ic; const esc = u.esc;
  const F = (BT.fin = {});

  BT.addCSS('finanzas', `
    .fin-sel{min-height:38px;height:38px;padding:0 34px 0 12px;width:auto;font-weight:600;border-radius:var(--r-sm)}
    .fin-sede-card{padding:18px 20px;display:flex;flex-direction:column;gap:12px}
    .fin-sede-card.sel{border-color:var(--brand-300);box-shadow:0 0 0 3px var(--brand-50),var(--sh-2)}
    .fin-sede-card .big{font-size:26px;font-weight:700;letter-spacing:-.03em;font-variant-numeric:tabular-nums;line-height:1.05}
    .fin-sede-card .rowm{display:flex;justify-content:space-between;font-size:var(--fs-sm);color:var(--ink-600)}
    .fin-sede-card .rowm b{color:var(--ink-950);font-variant-numeric:tabular-nums;font-weight:600}
    .fin-insight{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--ink-100)}
    .fin-insight:last-child{border-bottom:0}
    .fin-insight .ii{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;flex:none}
    .fin-insight .t{font-weight:600;font-size:var(--fs-md);color:var(--ink-950);line-height:1.35}
    .fin-insight .d{font-size:var(--fs-sm);color:var(--ink-500);margin-top:2px;line-height:1.45}
    .fin-donut{position:relative;height:250px}
    .fin-donut .ctr{position:absolute;inset:0;display:grid;place-items:center;text-align:center;pointer-events:none}
    .fin-donut .ctr b{display:block;font-size:20px;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
    .fin-donut .ctr span{font-size:var(--fs-xs);color:var(--ink-500)}
    .be-track{position:relative;height:44px;border-radius:12px;background:repeating-linear-gradient(90deg,var(--ink-100) 0,var(--ink-100) calc(var(--cell) - 3px),transparent calc(var(--cell) - 3px),transparent var(--cell));margin:34px 0 30px}
    .be-fill{position:absolute;left:0;top:0;bottom:0;border-radius:12px;background:linear-gradient(90deg,var(--brand-400),var(--brand-600));transform-origin:left;animation:barGrow 1100ms var(--ease-out) both;opacity:.92}
    .be-mark{position:absolute;top:-10px;bottom:-10px;width:2px;background:var(--ink-800);border-radius:2px}
    .be-mark span{position:absolute;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);white-space:nowrap;font-size:11px;font-weight:700;background:var(--ink-800);color:#fff;padding:3px 8px;border-radius:6px}
    .be-mark span::after{content:"";position:absolute;left:50%;top:100%;transform:translateX(-50%);border:5px solid transparent;border-top-color:var(--ink-800)}
    .be-cap{position:absolute;top:calc(100% + 6px);font-size:11px;color:var(--ink-500);font-variant-numeric:tabular-nums;transform:translateX(-50%);white-space:nowrap}
    .fin-tax td.num{font-weight:600}
    .fin-var{font-weight:600;font-variant-numeric:tabular-nums}
    .fin-cat-dot{width:10px;height:10px;border-radius:3px;display:inline-block;flex:none}
    .col-sel{background:var(--brand-50)!important}
    .fin-cash-k{display:flex;flex-direction:column;gap:2px}
    .fin-cash-k .v{font-size:20px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
  `);

  /* ---------------- Cálculos ---------------- */
  F.sedes = (s) => (s === 'ALL' ? ['BT1', 'BT2'] : [s]);
  F.tot = (mes, sede, tipo, cat) => BT.finTotal(mes, sede, tipo, cat);
  F.res = (mes, sede) => F.tot(mes, sede, 'ingreso') - F.tot(mes, sede, 'gasto');
  F.margin = (mes, sede) => { const i = F.tot(mes, sede, 'ingreso'); return i ? (F.res(mes, sede) / i) * 100 : 0; };
  F.daysIn = (mes) => { const d = u.toDate(mes); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); };
  F.residents = (mes, sede) => BT.db.residents.filter((r) => (sede === 'ALL' || r.sede === sede) && r.ingreso.slice(0, 7) <= mes && (!r.egreso || r.egreso.fecha.slice(0, 7) >= mes)).length;
  F.camas = (sede) => u.sum(BT.db.sedes.filter((x) => sede === 'ALL' || x.id === sede), 'camas');
  F.sueldos = (mes, sede) => F.tot(mes, sede, 'gasto', 'Sueldos y cargas sociales');
  F.costoDia = (mes, sede) => { const n = F.residents(mes, sede); return n ? F.tot(mes, sede, 'gasto') / (n * F.daysIn(mes)) : 0; };
  F.pctSueldos = (mes, sede) => { const i = F.tot(mes, sede, 'ingreso'); return i ? (F.sueldos(mes, sede) / i) * 100 : 0; };
  F.VARIABLE = ['Alimentación', 'Pañales e higiene', 'Medicamentos e insumos'];
  F.breakEven = (mes, sede) => {
    const n = F.residents(mes, sede) || 1;
    const ing = F.tot(mes, sede, 'ingreso'); const gas = F.tot(mes, sede, 'gasto');
    const variable = u.sum(F.VARIABLE, (c) => F.tot(mes, sede, 'gasto', c));
    const fixed = gas - variable;
    const contrib = ing / n - variable / n;
    const be = contrib > 0 ? fixed / contrib : n;
    const camas = F.camas(sede);
    return { be, beCeil: Math.ceil(be), camas, actual: n, pct: (be / camas) * 100, pctActual: (n / camas) * 100, fixed, variable, ingMedio: ing / n, varMedio: variable / n, margenSeg: n - be };
  };
  F.cats = (tipo) => { const seen = []; BT.db.finance.forEach((f) => { if (f.tipo === tipo && !seen.includes(f.categoria)) seen.push(f.categoria); }); return seen; };
  F.budget = (sede, cat, tipo = 'gasto') => u.sum(F.sedes(sede), (s) => (BT.db.budget[s] || {})[(tipo === 'ingreso' ? 'ING:' : '') + cat] || 0);
  F.delta = (a, b) => (b ? ((a - b) / Math.abs(b)) * 100 : 0);
  F.prev = (months, mes) => months[months.indexOf(mes) - 1] || null;
  F.color = (s) => BT.COLORS[s] || BT.COLORS.brand;
  F.ingColor = (s) => (s === 'ALL' ? BT.COLORS.brand : F.color(s));
  F.sedeTxt = (s) => (s === 'ALL' ? 'Consolidado' : s);
  F.monthLabel = (m) => u.cap(u.fmtMonthShort(m));

  /** Estimación de IVA y BPS del mes */
  F.taxes = (mes, sede) => {
    const ing = F.tot(mes, sede, 'ingreso');
    const ivaVentas = ing * (BT.db.settings.iva / (1 + BT.db.settings.iva));
    const g = (c) => F.tot(mes, sede, 'gasto', c);
    const ivaCompras = g('Alimentación') * (0.10 / 1.10) + (g('Medicamentos e insumos') + g('Pañales e higiene') + g('Limpieza') + g('Mantenimiento') + g('Servicios (UTE, OSE, Antel)')) * (0.22 / 1.22);
    const nominal = F.sueldos(mes, sede) / 1.32;
    const personales = nominal * 0.195; const patronales = nominal * 0.1263;
    return { ivaVentas, ivaCompras, ivaPagar: Math.max(0, ivaVentas - ivaCompras), nominal, personales, patronales, bps: personales + patronales };
  };

  /** Flujo de caja proyectado 90 días (simulación diaria) */
  F.SALDO_INICIAL = { BT1: 1185000, BT2: 548000 };
  F.cashflow = (sede) => {
    const months = BT.finMonths(); const last3 = months.slice(-3);
    const out = {}; const events = [];
    F.sedes(sede).forEach((s) => {
      const sueldosBase = Math.min(...last3.map((m) => F.sueldos(m, s)));
      const alquiler = F.tot(months[months.length - 1], s, 'gasto', 'Alquiler');
      const otros = u.avg(last3, (m) => F.tot(m, s, 'gasto')) - sueldosBase - alquiler;
      const ingProm = u.avg(last3, (m) => F.tot(m, s, 'ingreso'));
      const vencido = u.sum(BT.db.residents.filter((r) => r.sede === s && r.estado === 'activo'), (r) => BT.account(r.id).vencido);
      let saldo = F.SALDO_INICIAL[s]; const series = [];
      for (let k = 0; k <= 90; k++) {
        const d = u.addDays(u.today(), k); const dom = d.getDate(); const mm = d.getMonth();
        if (k > 0) {
          if (dom <= 10) saldo += (ingProm * 0.94) / 10;
          if (k <= 30) saldo += (vencido * 0.6) / 30;
          if (dom === 4) saldo -= sueldosBase * 0.76;
          if (dom === 15) saldo -= sueldosBase * 0.24;
          if (dom === 5) saldo -= alquiler;
          if ((mm === 11 || mm === 5) && dom === 18) saldo -= sueldosBase * 0.5;
          saldo -= otros / 30;
        }
        series.push({ date: d, saldo });
      }
      out[s] = { series, sueldosBase, alquiler, ingProm, vencido };
    });
    // eventos (para la tabla)
    const ss = F.sedes(sede); const sum = (k) => u.sum(ss, (s) => out[s][k]);
    for (let k = 1; k <= 90; k++) {
      const d = u.addDays(u.today(), k); const dom = d.getDate(); const mm = d.getMonth();
      if (dom === 1) events.push({ date: d, icon: 'banknote', tone: 'ok', t: 'Cobranza de cuotas (1 al 10)', m: sum('ingProm') * 0.94 });
      if (dom === 4) events.push({ date: d, icon: 'users', tone: 'danger', t: 'Pago de sueldos líquidos', m: -sum('sueldosBase') * 0.76 });
      if (dom === 5) events.push({ date: d, icon: 'house', tone: 'warn', t: 'Alquileres', m: -sum('alquiler') });
      if (dom === 15) events.push({ date: d, icon: 'landmark', tone: 'warn', t: 'Aportes BPS y FONASA', m: -sum('sueldosBase') * 0.24 });
      if ((mm === 11 || mm === 5) && dom === 18) events.push({ date: d, icon: 'gift', tone: 'danger', t: 'Aguinaldo (' + (mm === 11 ? 'segunda' : 'primera') + ' cuota)', m: -sum('sueldosBase') * 0.5 });
    }
    if (sum('vencido') > 0) events.unshift({ date: u.addDays(u.today(), 1), icon: 'receipt', tone: 'info', t: 'Recupero estimado de deuda vencida (60 % en 30 días)', m: sum('vencido') * 0.6 });
    const total = out[ss[0]].series.map((p, i) => ({ date: p.date, saldo: u.sum(ss, (s) => out[s].series[i].saldo) }));
    return { bySede: out, total, events: events.slice(0, 14) };
  };

  /** Lecturas automáticas */
  F.insights = (mes, sede, months) => {
    const L = [];
    const req = BT.ratioRequired();
    const p1 = F.pctSueldos(mes, 'BT1'), p2 = F.pctSueldos(mes, 'BT2');
    const hi = p2 > p1 ? 'BT2' : 'BT1'; const lo = hi === 'BT2' ? 'BT1' : 'BT2';
    L.push({ icon: 'users', tone: 'warn', t: hi + ' tiene mayor peso de sueldos (' + u.fmtPct(Math.max(p1, p2)) + ' vs. ' + u.fmtPct(Math.min(p1, p2)) + ')', d: 'Por mayor dependencia: ' + req[hi].dep + ' de ' + req[hi].total + ' residentes con Barthel ≤ 40 en ' + hi + ' (' + req[lo].dep + ' de ' + req[lo].total + ' en ' + lo + '), lo que exige más cuidadoras por turno.' });
    const m1 = F.margin(mes, 'BT1'), m2 = F.margin(mes, 'BT2');
    L.push({ icon: 'trending-up', tone: 'ok', t: (m1 >= m2 ? 'BT1' : 'BT2') + ' sostiene el mejor margen (' + u.fmtPct(Math.max(m1, m2)) + ')', d: 'El consolidado Galauru SAS cierra ' + F.monthLabel(mes).toLowerCase() + ' con ' + u.fmtMoney(F.res(mes, 'ALL')) + ' de resultado (' + u.fmtPct(F.margin(mes, 'ALL')) + ').' });
    const ag = months.find((m) => [5, 11].includes(u.toDate(m).getMonth()));
    if (ag) L.push({ icon: 'gift', tone: 'info', t: 'Aguinaldo en ' + u.fmtMonth(ag), d: 'Los sueldos de ese mes incluyen medio aguinaldo; por eso el resultado baja de forma puntual.' });
    const mant = months.map((m) => ({ m, v: F.tot(m, sede, 'gasto', 'Mantenimiento') })).sort((a, b) => b.v - a.v)[0];
    if (mant && mant.v > 30000) L.push({ icon: 'wrench', tone: 'warn', t: 'Mantenimiento extraordinario en ' + u.fmtMonth(mant.m), d: u.fmtMoney(mant.v) + ' (reparación puntual). Conviene provisionar un fondo mensual de mantenimiento.' });
    const over = F.cats('gasto').filter((c) => { const b = F.budget(sede, c); return b && F.tot(mes, sede, 'gasto', c) > b * 1.05; });
    if (over.length) L.push({ icon: 'target', tone: 'danger', t: over.length + (over.length === 1 ? ' rubro' : ' rubros') + ' por encima del presupuesto', d: over.slice(0, 3).join(', ') + (over.length > 3 ? '…' : '') + ' superan el presupuesto en más de 5 %.' });
    const be = F.breakEven(mes, sede);
    L.push({ icon: 'gauge', tone: be.margenSeg >= 2 ? 'ok' : 'warn', t: 'Punto de equilibrio: ' + u.fmtNum(be.be, 1) + ' residentes', d: 'Con ' + be.actual + ' residentes hay un margen de seguridad de ' + u.fmtNum(be.margenSeg, 1) + ' camas (ocupación mínima ' + u.fmtPct(be.pct, 0) + ').' });
    return L;
  };

  /* ---------------- Configuraciones de gráficos ---------------- */
  const moneyCb = { label: (c) => ' ' + c.dataset.label + ': ' + u.fmtMoney(c.parsed.y != null ? c.parsed.y : c.parsed) };
  const yMoney = () => ({ ticks: { callback: BT.moneyTick, padding: 8 }, grid: { color: 'rgba(38,34,28,.06)' } });
  const xPlain = () => ({ grid: { display: false }, ticks: { padding: 6 } });
  F.cfgMonthly = (sede, months) => {
    const ing = months.map((m) => F.tot(m, sede, 'ingreso')); const gas = months.map((m) => F.tot(m, sede, 'gasto'));
    return { type: 'bar', data: { labels: months.map(F.monthLabel), datasets: [
      { type: 'line', label: 'Resultado', data: ing.map((v, i) => v - gas[i]), borderColor: BT.COLORS.ink, backgroundColor: BT.COLORS.ink, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: '#fff', pointBorderWidth: 2, order: 0 },
      { label: 'Ingresos', data: ing, backgroundColor: F.ingColor(sede), maxBarThickness: 26, order: 1 },
      { label: 'Gastos', data: gas, backgroundColor: '#d9d4ca', maxBarThickness: 26, order: 2 },
    ] }, options: { interaction: { mode: 'index', intersect: false }, scales: { y: yMoney(), x: xPlain() }, plugins: { tooltip: { callbacks: moneyCb } } } };
  };
  F.cfgSedesResult = (months) => ({ type: 'bar', data: { labels: months.map(F.monthLabel), datasets: [
    { type: 'line', label: 'Consolidado', data: months.map((m) => F.res(m, 'ALL')), borderColor: BT.COLORS.ink, backgroundColor: BT.COLORS.ink, pointRadius: 4, pointBackgroundColor: '#fff', pointBorderWidth: 2, order: 0 },
    { label: 'BT1', data: months.map((m) => F.res(m, 'BT1')), backgroundColor: BT.COLORS.BT1, maxBarThickness: 24, order: 1 },
    { label: 'BT2', data: months.map((m) => F.res(m, 'BT2')), backgroundColor: BT.COLORS.BT2, maxBarThickness: 24, order: 2 },
  ] }, options: { interaction: { mode: 'index', intersect: false }, scales: { y: yMoney(), x: xPlain() }, plugins: { tooltip: { callbacks: moneyCb } } } });
  F.cfgSedesIng = (months) => ({ type: 'bar', data: { labels: months.map(F.monthLabel), datasets: [
    { label: 'Ingresos BT1', data: months.map((m) => F.tot(m, 'BT1', 'ingreso')), backgroundColor: BT.COLORS.BT1, stack: 'i', maxBarThickness: 26 },
    { label: 'Ingresos BT2', data: months.map((m) => F.tot(m, 'BT2', 'ingreso')), backgroundColor: BT.COLORS.BT2, stack: 'i', maxBarThickness: 26 },
    { label: 'Gastos BT1', data: months.map((m) => F.tot(m, 'BT1', 'gasto')), backgroundColor: BT.alpha(BT.COLORS.BT1, 0.35), stack: 'g', maxBarThickness: 26 },
    { label: 'Gastos BT2', data: months.map((m) => F.tot(m, 'BT2', 'gasto')), backgroundColor: BT.alpha(BT.COLORS.BT2, 0.35), stack: 'g', maxBarThickness: 26 },
  ] }, options: { interaction: { mode: 'index', intersect: false }, scales: { y: Object.assign(yMoney(), { stacked: true }), x: Object.assign(xPlain(), { stacked: true }) }, plugins: { tooltip: { callbacks: moneyCb } } } });
  F.cfgMargin = (months) => ({ type: 'line', data: { labels: months.map(F.monthLabel), datasets: ['BT1', 'BT2', 'ALL'].map((s) => ({ label: F.sedeTxt(s), data: months.map((m) => +F.margin(m, s).toFixed(1)), borderColor: F.color(s), backgroundColor: F.color(s), borderDash: s === 'ALL' ? [5, 4] : [], pointRadius: 3, pointBackgroundColor: '#fff', pointBorderWidth: 2 })) },
    options: { interaction: { mode: 'index', intersect: false }, scales: { y: { ticks: { callback: (v) => v + ' %' } }, x: xPlain() }, plugins: { tooltip: { callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + u.fmtPct(c.parsed.y) } } } } });
  F.cfgDonut = (mes, sede) => {
    const cats = F.cats('gasto').map((c) => ({ c, v: F.tot(mes, sede, 'gasto', c) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
    return { type: 'doughnut', data: { labels: cats.map((x) => x.c), datasets: [{ data: cats.map((x) => x.v), backgroundColor: cats.map((_, i) => BT.COLORS.cat[i % BT.COLORS.cat.length]), borderColor: '#fff', borderWidth: 3, hoverOffset: 8 }] },
      options: { cutout: '68%', plugins: { tooltip: { callbacks: { label: (c) => ' ' + c.label + ': ' + u.fmtMoney(c.parsed) } } } }, _cats: cats };
  };
  F.cfgBudget = (mes, sede) => {
    const cats = F.cats('gasto').filter((c) => F.budget(sede, c) > 0);
    const real = cats.map((c) => F.tot(mes, sede, 'gasto', c)); const bud = cats.map((c) => F.budget(sede, c));
    return { type: 'bar', data: { labels: cats.map((c) => c.replace(' (UTE, OSE, Antel)', '').replace(' y cargas sociales', '')), datasets: [
      { label: 'Presupuesto', data: bud, backgroundColor: '#e4e0d8', maxBarThickness: 14, borderRadius: 4 },
      { label: 'Real', data: real, backgroundColor: real.map((v, i) => (v > bud[i] * 1.05 ? BT.COLORS.danger : v > bud[i] ? BT.COLORS.warn : F.ingColor(sede))), maxBarThickness: 14, borderRadius: 4 },
    ] }, options: { indexAxis: 'y', interaction: { mode: 'index', intersect: false }, scales: { x: yMoney(), y: { grid: { display: false } } }, plugins: { tooltip: { callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + u.fmtMoney(c.parsed.x) } } } } };
  };
  F.cfgTrends = (months) => ({ type: 'line', data: { labels: months.map(F.monthLabel), datasets: ['BT1', 'BT2'].map((s) => ({ label: 'Costo/residente/día ' + s, data: months.map((m) => Math.round(F.costoDia(m, s))), borderColor: F.color(s), backgroundColor: F.color(s), pointRadius: 3, pointBackgroundColor: '#fff', pointBorderWidth: 2, yAxisID: 'y' })).concat(['BT1', 'BT2'].map((s) => ({ label: '% sueldos ' + s, data: months.map((m) => +F.pctSueldos(m, s).toFixed(1)), borderColor: BT.alpha(F.color(s), 0.55), backgroundColor: BT.alpha(F.color(s), 0.55), borderDash: [5, 4], pointRadius: 0, yAxisID: 'y1' }))) },
    options: { interaction: { mode: 'index', intersect: false }, scales: { y: { position: 'left', ticks: { callback: (v) => '$U ' + u.fmtNum(v) } }, y1: { position: 'right', grid: { display: false }, ticks: { callback: (v) => v + ' %' } }, x: xPlain() },
      plugins: { tooltip: { callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + (c.dataset.yAxisID === 'y1' ? u.fmtPct(c.parsed.y) : u.fmtMoney(c.parsed.y)) } } } } });
  F.cfgCash = (cf, sede) => {
    const pts = cf.total.filter((_, i) => i % 3 === 0 || i === cf.total.length - 1);
    const idx = cf.total.map((p, i) => i).filter((i) => i % 3 === 0 || i === cf.total.length - 1);
    const ds = [{ label: sede === 'ALL' ? 'Consolidado' : sede, data: pts.map((p) => Math.round(p.saldo)), borderColor: F.color(sede), backgroundColor: BT.alpha(F.color(sede === 'ALL' ? 'BT1' : sede), 0.10), fill: true, pointRadius: 0, borderWidth: 2.5 }];
    if (sede === 'ALL') ['BT1', 'BT2'].forEach((s) => ds.push({ label: s, data: idx.map((i) => Math.round(cf.bySede[s].series[i].saldo)), borderColor: F.color(s), backgroundColor: F.color(s), borderDash: [5, 4], borderWidth: 1.6, pointRadius: 0, fill: false }));
    return { type: 'line', data: { labels: pts.map((p) => u.fmtDateShort(p.date)), datasets: ds }, options: { interaction: { mode: 'index', intersect: false }, scales: { y: yMoney(), x: Object.assign(xPlain(), { ticks: { maxTicksLimit: 10 } }) }, plugins: { tooltip: { callbacks: moneyCb } } } };
  };
  const legend = (items) => '<div class="legend">' + items.map(([l, c, dashed]) => '<span><i style="background:' + (dashed ? 'repeating-linear-gradient(90deg,' + c + ' 0 4px,transparent 4px 6px)' : c) + (dashed ? ';height:3px;border-radius:2px' : '') + '"></i>' + esc(l) + '</span>').join('') + '</div>';

  /* ---------------- Render ---------------- */
  const cleanCharts = () => { BT._charts = BT._charts.filter((c) => { if (!c.canvas || !document.body.contains(c.canvas)) { try { c.destroy(); } catch (e) { } return false; } return true; }); };

  BT.tab({
    id: 'finanzas', label: 'Finanzas', icon: 'chart-line', group: 'admin', order: 8, roles: ['direccion', 'administracion'],
    render(el) {
      if (!BT.can('money.read')) { el.innerHTML = ui.empty({ title: 'Sin acceso', text: 'Tu rol no tiene acceso a la información financiera.' }); return; }
      const months = BT.finMonths();
      let mes = months.includes(BT.state.sub['fin-mes']) ? BT.state.sub['fin-mes'] : months[months.length - 1];
      const s = BT.state.sede; const other = s === 'BT1' ? 'BT2' : 'BT1';
      el.innerHTML = ui.pageHeader({
        eyebrow: 'Finanzas · ' + (s === 'ALL' ? 'Galauru SAS' : BT.sedeName(s)), icon: 'chart-line', title: 'Resultados y finanzas',
        sub: s === 'ALL' ? 'Consolidado Galauru SAS con apertura por sede · últimos 6 meses' : BT.sedeName(s) + ' · con ' + other + ' como referencia',
        actions: '<select class="select fin-sel" id="finMes" aria-label="Mes">' + months.map((m) => '<option value="' + m + '"' + (m === mes ? ' selected' : '') + '>' + u.cap(u.fmtMonth(m)) + '</option>').join('') + '</select>' +
          ui.exportMenu([{ id: 'pdf', label: 'Reporte financiero mensual', sub: 'PDF A4 con gráficos', icon: 'file-text' }, { id: 'xlsx', label: 'Planilla de finanzas', sub: 'Excel · 4 hojas', icon: 'file-spreadsheet' }]),
      }) + '<div id="finBody"></div>';
      const body = el.querySelector('#finBody');
      const draw = (first) => {
        cleanCharts();
        ui.subtabs(body, 'fin', [
          { id: 'resumen', label: 'Resumen', icon: 'layout-dashboard' },
          { id: 'sedes', label: 'BT1 vs. BT2', icon: 'building-2' },
          { id: 'categorias', label: 'Por categoría', icon: 'chart-pie' },
          { id: 'presupuesto', label: 'Presupuesto vs. real', icon: 'target' },
          { id: 'indicadores', label: 'Indicadores', icon: 'gauge' },
          { id: 'caja', label: 'Flujo de caja 90 días', icon: 'waves' },
        ], (panel, id) => PANELS[id](panel, { mes, months, s, other }));
        if (!first) ui.enhance(body);
      };
      draw(true);
      el.querySelector('#finMes').addEventListener('change', (e) => { mes = e.target.value; BT.state.sub['fin-mes'] = mes; draw(false); });
      ui.on(el, { export: (t) => (t.dataset.id === 'pdf' ? F.pdf(mes, s) : F.xlsx(mes, s)) });
    },
  });

  const PANELS = {
    resumen(p, { mes, months, s }) {
      const prev = F.prev(months, mes);
      const ing = F.tot(mes, s, 'ingreso'), gas = F.tot(mes, s, 'gasto'), res = ing - gas, mg = F.margin(mes, s);
      const pIng = prev ? F.tot(prev, s, 'ingreso') : 0, pGas = prev ? F.tot(prev, s, 'gasto') : 0, pRes = pIng - pGas, pMg = prev ? F.margin(prev, s) : mg;
      const dpp = mg - pMg;
      const ppFoot = prev ? '<span class="delta ' + (Math.abs(dpp) < 0.05 ? 'flat' : dpp > 0 ? 'up' : 'down') + '">' + ic(dpp >= 0 ? 'trending-up' : 'trending-down', 'ic-xs') + u.fmtNum(Math.abs(dpp), 1) + ' p.p.</span>vs. ' + u.fmtMonthShort(prev) : '';
      const vsTxt = prev ? 'vs. ' + u.fmtMonthShort(prev) : '';
      const ins = F.insights(mes, s, months);
      const upto = months.slice(0, months.indexOf(mes) + 1);
      const sIng = upto.map((m) => F.tot(m, s, 'ingreso')), sGas = upto.map((m) => F.tot(m, s, 'gasto'));
      const sRes = upto.map((m, i) => sIng[i] - sGas[i]), sMg = upto.map((m) => F.margin(m, s));
      p.innerHTML = '<div class="grid g-4 stagger">' +
        ui.kpi({ label: 'Resultado', value: res, money: true, icon: 'piggy-bank', variant: res >= 0 ? 'green' : 'red', delta: prev && pRes ? F.delta(res, pRes) : null, foot: vsTxt, spark: sRes }) +
        ui.kpi({ label: 'Ingresos del mes', value: ing, money: true, icon: 'trending-up', delta: prev ? F.delta(ing, pIng) : null, foot: vsTxt, spark: sIng }) +
        ui.kpi({ label: 'Gastos del mes', value: gas, money: true, icon: 'wallet', tone: 'ink', delta: prev ? F.delta(gas, pGas) : null, deltaGood: 'down', foot: vsTxt, spark: sGas, sparkColor: '#9a8f7a' }) +
        ui.kpi({ label: 'Margen', value: mg, decimals: 1, suffix: '%', icon: 'percent', variant: 'blue', foot: ppFoot, spark: sMg, sparkColor: '#3f78b5' }) +
        '</div>' +
        '<div class="grid g-main mt-16">' +
        ui.card({ title: 'Evolución mes a mes', icon: 'chart-column', sub: (s === 'ALL' ? 'Consolidado Galauru SAS' : BT.sedeName(s)) + ' · ingresos, gastos y resultado', actions: legend([['Ingresos', F.ingColor(s)], ['Gastos', '#d9d4ca'], ['Resultado', BT.COLORS.ink]]), body: '<div class="chart-box lg"><canvas id="fcMonthly"></canvas></div>' }) +
        ui.card({ title: 'Lectura rápida', icon: 'sparkles', sub: 'Generada a partir de los datos del mes', body: ins.map((x) => '<div class="fin-insight"><span class="ii" style="background:var(--' + (x.tone === 'ok' ? 'ok' : x.tone) + '-bg);color:var(--' + x.tone + ')">' + ic(x.icon, 'ic-sm') + '</span><div><div class="t">' + esc(x.t) + '</div><div class="d">' + esc(x.d) + '</div></div></div>').join(''), bodyCls: '' }) +
        '</div>' +
        ui.card({ cls: 'mt-16', title: 'Estado de resultados · 6 meses', icon: 'table-2', sub: s === 'ALL' ? 'Consolidado Galauru SAS' : BT.sedeName(s), bodyCls: 'flush', body: F.plTable(months, s, mes) });
      BT.chart(p.querySelector('#fcMonthly'), F.cfgMonthly(s, months));
    },
    sedes(p, { mes, months, s }) {
      const card = (sd) => {
        const ing = F.tot(mes, sd, 'ingreso'), gas = F.tot(mes, sd, 'gasto'), res = ing - gas, mg = F.margin(mes, sd);
        const occ = sd === 'ALL' ? { ocupadas: BT.occupancy('BT1').ocupadas + BT.occupancy('BT2').ocupadas, camas: F.camas('ALL') } : BT.occupancy(sd);
        return '<div class="card fin-sede-card hover ' + (sd === s ? 'sel' : '') + '"><div class="row between">' + (sd === 'ALL' ? '<span class="badge dark">' + ic('layers') + 'Consolidado Galauru SAS</span>' : BT.sedeTag(sd) + '<span class="muted" style="font-size:var(--fs-xs);margin-left:auto">' + esc(BT.sedeName(sd)) + '</span>') + '</div>' +
          '<div><div class="muted" style="font-size:var(--fs-sm)">Resultado de ' + u.fmtMonth(mes) + '</div><div class="big ' + (res < 0 ? 't-danger' : '') + '">' + u.fmtMoney(res) + '</div></div>' +
          ui.bar(Math.max(0, mg) * 4, sd === 'BT2' ? 'info' : '', true) +
          '<div class="rowm"><span>Ingresos</span><b>' + u.fmtMoney(ing) + '</b></div><div class="rowm"><span>Gastos</span><b>' + u.fmtMoney(gas) + '</b></div><div class="rowm"><span>Margen</span><b>' + u.fmtPct(mg) + '</b></div><div class="rowm"><span>Ocupación</span><b>' + occ.ocupadas + ' / ' + occ.camas + ' camas</b></div></div>';
      };
      const metrics = [
        ['Residentes (promedio del mes)', (sd) => u.fmtNum(F.residents(mes, sd))],
        ['Ingresos', (sd) => u.fmtMoney(F.tot(mes, sd, 'ingreso'))],
        ['Gastos', (sd) => u.fmtMoney(F.tot(mes, sd, 'gasto'))],
        ['Sueldos y cargas sociales', (sd) => u.fmtMoney(F.sueldos(mes, sd))],
        ['Resultado', (sd) => '<b>' + u.fmtMoney(F.res(mes, sd)) + '</b>'],
        ['Margen', (sd) => u.fmtPct(F.margin(mes, sd))],
        ['Costo por residente por día', (sd) => u.fmtMoney(F.costoDia(mes, sd))],
        ['% sueldos sobre ingresos', (sd) => u.fmtPct(F.pctSueldos(mes, sd))],
        ['Ingreso medio por residente', (sd) => u.fmtMoney(F.tot(mes, sd, 'ingreso') / Math.max(1, F.residents(mes, sd)))],
        ['Punto de equilibrio (residentes)', (sd) => u.fmtNum(F.breakEven(mes, sd).be, 1)],
      ];
      const cols = ['BT1', 'BT2', 'ALL'];
      p.innerHTML = '<div class="grid g-3 stagger">' + cols.map(card).join('') + '</div>' +
        '<div class="grid g-2 mt-16">' +
        ui.card({ title: 'Resultado mensual por sede', icon: 'chart-column', sub: 'BT1, BT2 y consolidado Galauru SAS', actions: legend([['BT1', BT.COLORS.BT1], ['BT2', BT.COLORS.BT2], ['Consolidado', BT.COLORS.ink]]), body: '<div class="chart-box"><canvas id="fcSR"></canvas></div>' }) +
        ui.card({ title: 'Margen por sede', icon: 'percent', sub: 'Resultado sobre ingresos, mes a mes', actions: legend([['BT1', BT.COLORS.BT1], ['BT2', BT.COLORS.BT2], ['Consolidado', BT.COLORS.ink, true]]), body: '<div class="chart-box"><canvas id="fcMg"></canvas></div>' }) +
        '</div>' +
        '<div class="grid g-main mt-16">' +
        ui.card({ title: 'Ingresos y gastos por sede', icon: 'chart-bar-stacked', sub: 'Barras apiladas: ingresos (sólido) y gastos (claro)', actions: legend([['BT1', BT.COLORS.BT1], ['BT2', BT.COLORS.BT2]]), body: '<div class="chart-box"><canvas id="fcIng"></canvas></div>' }) +
        ui.card({ title: 'Comparativo de ' + u.fmtMonth(mes), icon: 'scale', bodyCls: 'flush', body: '<div class="table-wrap"><table class="table compact"><thead><tr><th>Indicador</th>' + cols.map((c) => '<th class="num ' + (c === s ? 'col-sel' : '') + '">' + F.sedeTxt(c) + '</th>').join('') + '</tr></thead><tbody>' + metrics.map(([l, f]) => '<tr><td>' + l + '</td>' + cols.map((c) => '<td class="num ' + (c === s ? 'col-sel' : '') + '">' + f(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' }) +
        '</div>';
      BT.chart(p.querySelector('#fcSR'), F.cfgSedesResult(months));
      BT.chart(p.querySelector('#fcMg'), F.cfgMargin(months));
      BT.chart(p.querySelector('#fcIng'), F.cfgSedesIng(months));
    },
    categorias(p, { mes, months, s }) {
      const prev = F.prev(months, mes);
      const cfg = F.cfgDonut(mes, s); const cats = cfg._cats; delete cfg._cats;
      const tot = u.sum(cats, 'v');
      const ingCats = F.cats('ingreso').map((c) => ({ c, v: F.tot(mes, s, 'ingreso', c) }));
      const ingTot = u.sum(ingCats, 'v');
      p.innerHTML = '<div class="grid g-side">' +
        ui.card({ title: 'Composición del gasto', icon: 'chart-pie', sub: u.cap(u.fmtMonth(mes)) + ' · ' + (s === 'ALL' ? 'Consolidado' : s), body: '<div class="fin-donut"><canvas id="fcDonut"></canvas><div class="ctr"><div><b>' + u.fmtMoneyK(tot) + '</b><span>gasto total</span></div></div></div>' +
          '<div class="sec-t mt-16">Ingresos</div>' + ingCats.map((x) => '<div class="row between" style="font-size:var(--fs-md);padding:5px 0"><span>' + esc(x.c) + '</span><b class="num">' + u.fmtMoney(x.v) + '</b></div>' + ui.bar((x.v / ingTot) * 100, '', true)).join('') }) +
        ui.card({ title: 'Gastos por categoría', icon: 'list', sub: prev ? 'Variación contra ' + u.fmtMonth(prev) : '', bodyCls: 'flush', body: ui.table([
          { label: 'Categoría', render: (x) => '<div class="row gap-6"><span class="fin-cat-dot" style="background:' + BT.COLORS.cat[cats.indexOf(x) % BT.COLORS.cat.length] + '"></span>' + esc(x.c) + '</div>' },
          { label: 'Monto', align: 'num', render: (x) => u.fmtMoney(x.v) },
          { label: '% del total', align: 'num', render: (x) => '<div class="row gap-6" style="justify-content:flex-end"><span style="width:60px">' + ui.bar((x.v / tot) * 100, '', true) + '</span>' + u.fmtPct((x.v / tot) * 100) + '</div>' },
          { label: 'vs. mes ant.', align: 'num', render: (x) => { if (!prev) return '—'; const pv = F.tot(prev, s, 'gasto', x.c); const d = F.delta(x.v, pv); return '<span class="delta ' + (Math.abs(d) < 0.5 ? 'flat' : d > 0 ? 'down' : 'up') + '">' + (d > 0 ? '+' : d < 0 ? '−' : '') + u.fmtNum(Math.abs(d), 1) + ' %</span>'; } },
        ], cats, { foot: '<tr><td>Total</td><td class="num">' + u.fmtMoney(tot) + '</td><td class="num">100 %</td><td></td></tr>' }) }) +
        '</div>';
      BT.chart(p.querySelector('#fcDonut'), cfg);
    },
    presupuesto(p, { mes, s }) {
      const rows = F.cats('gasto').map((c) => { const b = F.budget(s, c), r = F.tot(mes, s, 'gasto', c); return { c, b, r, d: r - b, dp: b ? ((r - b) / b) * 100 : 0, tipo: 'gasto' }; }).filter((x) => x.b);
      const irows = F.cats('ingreso').map((c) => { const b = F.budget(s, c, 'ingreso'), r = F.tot(mes, s, 'ingreso', c); return { c, b, r, d: r - b, dp: b ? ((r - b) / b) * 100 : 0, tipo: 'ingreso' }; }).filter((x) => x.b);
      const tB = u.sum(rows, 'b'), tR = u.sum(rows, 'r'); const tIB = u.sum(irows, 'b'), tIR = u.sum(irows, 'r');
      const tone = (x) => (x.tipo === 'gasto' ? (x.dp > 5 ? 'danger' : x.dp > 0 ? 'warn' : 'ok') : (x.dp < -5 ? 'danger' : x.dp < 0 ? 'warn' : 'ok'));
      const cols = [
        { label: 'Rubro', render: (x) => esc(x.c) },
        { label: 'Presupuesto', align: 'num', render: (x) => u.fmtMoney(x.b) },
        { label: 'Real', align: 'num', render: (x) => u.fmtMoney(x.r) },
        { label: 'Desvío', align: 'num', render: (x) => '<span class="fin-var t-' + tone(x) + '">' + (x.d > 0 ? '+' : '') + u.fmtMoney(x.d) + '</span>' },
        { label: 'Desvío %', align: 'num', render: (x) => (x.dp > 0 ? '+' : '') + u.fmtPct(x.dp) },
        { label: 'Estado', align: 'center', render: (x) => ui.traffic(tone(x)) },
      ];
      p.innerHTML = '<div class="grid g-4 stagger">' +
        ui.kpi({ label: 'Presupuesto de gastos', value: tB, money: true, icon: 'target', tone: 'ink' }) +
        ui.kpi({ label: 'Gasto real', value: tR, money: true, icon: 'wallet', foot: (tR <= tB ? 'Dentro del presupuesto' : 'Por encima del presupuesto') }) +
        ui.kpi({ label: 'Desvío de gastos', value: ((tR - tB) / tB) * 100, decimals: 1, suffix: '%', icon: tR <= tB ? 'circle-check' : 'circle-alert', tone: tR <= tB ? '' : 'danger', foot: u.fmtMoney(tR - tB) }) +
        ui.kpi({ label: 'Ingresos vs. presupuesto', value: tIB ? (tIR / tIB) * 100 : 0, decimals: 1, suffix: '%', icon: 'banknote', tone: 'info', foot: u.fmtMoney(tIR) + ' de ' + u.fmtMoney(tIB) }) +
        '</div><div class="grid g-side mt-16">' +
        ui.card({ title: 'Gastos: presupuesto vs. real', icon: 'chart-bar', sub: u.cap(u.fmtMonth(mes)), actions: legend([['Presupuesto', '#e4e0d8'], ['Real', F.ingColor(s)], ['Excedido', BT.COLORS.danger]]), body: '<div class="chart-box" style="height:' + (rows.length * 34 + 40) + 'px"><canvas id="fcBud"></canvas></div>' }) +
        ui.card({ title: 'Detalle de desvíos', icon: 'list-checks', sub: 'Semáforo: verde dentro, amarillo hasta 5 %, rojo más de 5 %', bodyCls: 'flush', body: ui.table(cols, irows.concat(rows), { compact: true, rowAttrs: (x) => (tone(x) === 'danger' ? 'class="row-flag-danger"' : tone(x) === 'warn' ? 'class="row-flag-warn"' : ''), foot: '<tr><td>Total gastos</td><td class="num">' + u.fmtMoney(tB) + '</td><td class="num">' + u.fmtMoney(tR) + '</td><td class="num">' + u.fmtMoney(tR - tB) + '</td><td class="num">' + u.fmtPct(((tR - tB) / tB) * 100) + '</td><td></td></tr>' }) }) +
        '</div>';
      BT.chart(p.querySelector('#fcBud'), F.cfgBudget(mes, s));
    },
    indicadores(p, { mes, months, s }) {
      const prev = F.prev(months, mes);
      const be = F.breakEven(mes, s);
      const tx = F.taxes(mes, s);
      const cd = F.costoDia(mes, s), ps = F.pctSueldos(mes, s);
      const cell = 100 / be.camas;
      p.innerHTML = '<div class="grid g-4 stagger">' +
        ui.kpi({ label: 'Costo por residente por día', value: Math.round(cd), money: true, icon: 'calendar-days', delta: prev ? F.delta(cd, F.costoDia(prev, s)) : null, deltaGood: 'down', foot: 'vs. mes anterior' }) +
        ui.kpi({ label: 'Sueldos sobre ingresos', value: ps, decimals: 1, suffix: '%', icon: 'users', tone: ps > 45 ? 'warn' : '', foot: 'Referencia del sector: 40–50 %' }) +
        ui.kpi({ label: 'Punto de equilibrio', value: be.be, decimals: 1, suffix: 'residentes', icon: 'gauge', tone: 'info', foot: 'Ocupación mínima ' + u.fmtPct(be.pct, 0) }) +
        ui.kpi({ label: 'Ocupación actual', value: be.pctActual, decimals: 1, suffix: '%', icon: 'bed-double', tone: be.margenSeg >= 2 ? '' : 'warn', foot: be.actual + ' de ' + be.camas + ' camas' }) +
        '</div><div class="grid g-2 mt-16">' +
        ui.card({ title: 'Ocupación mínima para cubrir los gastos', icon: 'gauge', sub: (s === 'ALL' ? 'Consolidado' : BT.sedeName(s)) + ' · ' + u.fmtMonth(mes),
          body: '<div class="be-track" style="--cell:' + cell + '%"><div class="be-fill" style="width:' + be.pctActual + '%"></div><div class="be-mark" style="left:' + be.pct + '%"><span>Equilibrio ' + u.fmtNum(be.be, 1) + '</span></div><span class="be-cap" style="left:0;transform:none">0</span><span class="be-cap" style="left:' + be.pctActual + '%">' + be.actual + ' ocupadas</span><span class="be-cap" style="left:100%;transform:translateX(-100%)">' + be.camas + ' camas</span></div>' +
            ui.kv([['Costos fijos del mes', u.fmtMoney(be.fixed)], ['Ingreso medio por residente', u.fmtMoney(be.ingMedio)], ['Costo variable por residente', u.fmtMoney(be.varMedio) + ' <span class="subtle">(alimentación, pañales, insumos)</span>'], ['Contribución por residente', '<b>' + u.fmtMoney(be.ingMedio - be.varMedio) + '</b>'], ['Margen de seguridad', '<b class="t-' + (be.margenSeg >= 2 ? 'ok' : 'warn') + '">' + u.fmtNum(be.margenSeg, 1) + ' camas</b>']]) }) +
        ui.card({ title: 'Costo diario y peso de sueldos', icon: 'activity', sub: 'Por sede, últimos 6 meses', actions: legend([['BT1', BT.COLORS.BT1], ['BT2', BT.COLORS.BT2], ['% sueldos', BT.COLORS.ink, true]]), body: '<div class="chart-box"><canvas id="fcTr"></canvas></div>' }) +
        '</div>' +
        ui.card({ cls: 'mt-16', title: 'Obligaciones tributarias del mes', icon: 'landmark', sub: 'Estimación para planificación de caja · la liquidación definitiva la realiza el estudio contable', bodyCls: 'flush',
          body: '<div class="table-wrap"><table class="table fin-tax"><thead><tr><th>Concepto</th><th>Base de cálculo</th><th class="num">Estimación</th></tr></thead><tbody>' +
            '<tr><td>IVA ventas (tasa ' + Math.round(BT.db.settings.iva * 100) + ' %)</td><td class="muted">Facturación del mes, IVA incluido</td><td class="num">' + u.fmtMoney(tx.ivaVentas) + '</td></tr>' +
            '<tr><td>IVA compras (crédito)</td><td class="muted">Alimentación (10 %), insumos, limpieza y servicios (22 %)</td><td class="num">− ' + u.fmtMoney(tx.ivaCompras).replace('−', '') + '</td></tr>' +
            '<tr><td><b>IVA a pagar (DGI)</b></td><td class="muted">Vence según calendario DGI</td><td class="num"><b>' + u.fmtMoney(tx.ivaPagar) + '</b></td></tr>' +
            '<tr><td>Aportes personales (BPS + FONASA)</td><td class="muted">Sobre nominales ' + u.fmtMoney(tx.nominal) + '</td><td class="num">' + u.fmtMoney(tx.personales) + '</td></tr>' +
            '<tr><td>Aportes patronales (BPS + FONASA + FRL)</td><td class="muted">Sobre nominales</td><td class="num">' + u.fmtMoney(tx.patronales) + '</td></tr>' +
            '</tbody><tfoot><tr><td>Total BPS del mes</td><td></td><td class="num">' + u.fmtMoney(tx.bps) + '</td></tr></tfoot></table></div>' });
      BT.chart(p.querySelector('#fcTr'), F.cfgTrends(months));
    },
    caja(p, { s }) {
      const cf = F.cashflow(s);
      const start = cf.total[0].saldo, end = cf.total[cf.total.length - 1].saldo;
      const min = cf.total.reduce((a, b) => (b.saldo < a.saldo ? b : a));
      p.innerHTML = '<div class="grid g-4 stagger">' +
        ui.kpi({ label: 'Saldo disponible hoy', value: Math.round(start), money: true, icon: 'landmark', tone: 'ink', foot: 'Bancos (simulado) · ' + u.fmtDate(u.today()) }) +
        ui.kpi({ label: 'Saldo mínimo proyectado', value: Math.round(min.saldo), money: true, icon: min.saldo < 0 ? 'circle-alert' : 'shield-check', tone: min.saldo < 0 ? 'danger' : min.saldo < start * 0.4 ? 'warn' : '', foot: 'el ' + u.fmtDate(min.date) }) +
        ui.kpi({ label: 'Saldo a 90 días', value: Math.round(end), money: true, icon: 'calendar-range', delta: F.delta(end, start), foot: u.fmtDate(cf.total[cf.total.length - 1].date) }) +
        ui.kpi({ label: 'Deuda vencida a recuperar', value: Math.round(u.sum(F.sedes(s), (x) => cf.bySede[x].vencido)), money: true, icon: 'receipt', tone: 'warn', foot: 'Se estima recuperar el 60 %' }) +
        '</div><div class="grid g-main mt-16">' +
        ui.card({ title: 'Saldo de caja proyectado', icon: 'waves', sub: 'Próximos 90 días · cobranza en término del 94 %', actions: legend(s === 'ALL' ? [['Consolidado', BT.COLORS.ink], ['BT1', BT.COLORS.BT1, true], ['BT2', BT.COLORS.BT2, true]] : [[s, F.color(s)]]), body: '<div class="chart-box lg"><canvas id="fcCash"></canvas></div>' }) +
        ui.card({ title: 'Próximos movimientos', icon: 'calendar-clock', bodyCls: 'flush', body: '<div class="list">' + cf.events.map((e) => '<div class="li"><span class="li-ic ' + e.tone + '">' + ic(e.icon, 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(e.t) + '</div><div class="d">' + u.fmtDate(e.date) + ' · ' + u.relDay(e.date) + '</div></div><b class="num ' + (e.m < 0 ? 't-danger' : 't-ok') + '" style="font-size:var(--fs-md)">' + (e.m > 0 ? '+' : '') + u.fmtMoney(e.m) + '</b></div>').join('') + '</div>' }) +
        '</div>' + '<div class="alert info mt-16">' + ic('info') + '<div>Proyección basada en el promedio de los últimos 3 meses, el calendario de pagos de sueldos (día 4), aportes BPS (día 15), alquileres (día 5) y aguinaldo. Los saldos bancarios iniciales son de demostración.</div></div>';
      BT.chart(p.querySelector('#fcCash'), F.cfgCash(cf, s));
    },
  };

  F.plTable = (months, s, mesSel) => {
    const rows = [
      { l: 'Ingresos', f: (m) => F.tot(m, s, 'ingreso'), b: true },
      { l: '  Cuotas mensuales', f: (m) => F.tot(m, s, 'ingreso', 'Cuotas mensuales'), sub: true },
      { l: '  Extras (pañales, medicación, servicios)', f: (m) => F.tot(m, s, 'ingreso', 'Extras (pañales, medicación, servicios)'), sub: true },
      { l: 'Gastos', f: (m) => F.tot(m, s, 'gasto'), b: true },
      { l: '  Sueldos y cargas sociales', f: (m) => F.sueldos(m, s), sub: true },
      { l: '  Otros gastos operativos', f: (m) => F.tot(m, s, 'gasto') - F.sueldos(m, s), sub: true },
      { l: 'Resultado', f: (m) => F.res(m, s), b: true, res: true },
      { l: 'Margen', f: (m) => F.margin(m, s), pct: true },
    ];
    return '<div class="table-wrap"><table class="table compact"><thead><tr><th>Concepto</th>' + months.map((m) => '<th class="num ' + (m === mesSel ? 'col-sel' : '') + '">' + F.monthLabel(m) + '</th>').join('') + '<th class="num">Total 6 meses</th></tr></thead><tbody>' +
      rows.map((r) => '<tr><td style="' + (r.sub ? 'padding-left:34px;color:var(--ink-600)' : 'font-weight:600') + '">' + r.l.trim() + '</td>' + months.map((m) => { const v = r.f(m); return '<td class="num ' + (m === mesSel ? 'col-sel' : '') + '" style="' + (r.b ? 'font-weight:600;' : '') + (r.res && v < 0 ? 'color:var(--danger)' : '') + '">' + (r.pct ? u.fmtPct(v) : u.fmtMoney(v)) + '</td>'; }).join('') +
        '<td class="num" style="font-weight:600">' + (r.pct ? u.fmtPct((u.sum(months, (m) => F.res(m, s)) / u.sum(months, (m) => F.tot(m, s, 'ingreso'))) * 100) : u.fmtMoney(u.sum(months, r.f))) + '</td></tr>').join('') +
      '</tbody></table></div>';
  };

  /* ---------------- Exportables ---------------- */
  F.pdf = function (mes, s) {
    const D = BT.doc; const months = BT.finMonths(); const prev = F.prev(months, mes);
    const ing = F.tot(mes, s, 'ingreso'), gas = F.tot(mes, s, 'gasto');
    const be = F.breakEven(mes, s); const tx = F.taxes(mes, s);
    const dl = (a, b) => (b ? '<span class="' + (a >= b ? '' : '') + '">' + (a >= b ? '▲ ' : '▼ ') + u.fmtNum(Math.abs(F.delta(a, b)), 1) + ' % vs. mes ant.</span>' : '');
    const cmpCols = ['BT1', 'BT2', 'ALL'];
    const cmpRows = [
      ['Residentes', (sd) => u.fmtNum(F.residents(mes, sd))], ['Ingresos', (sd) => u.fmtMoney(F.tot(mes, sd, 'ingreso'))], ['Gastos', (sd) => u.fmtMoney(F.tot(mes, sd, 'gasto'))],
      ['Sueldos y cargas', (sd) => u.fmtMoney(F.sueldos(mes, sd))], ['Resultado', (sd) => '<b>' + u.fmtMoney(F.res(mes, sd)) + '</b>'], ['Margen', (sd) => u.fmtPct(F.margin(mes, sd))],
      ['Costo por residente/día', (sd) => u.fmtMoney(F.costoDia(mes, sd))], ['% sueldos / ingresos', (sd) => u.fmtPct(F.pctSueldos(mes, sd))], ['Punto de equilibrio', (sd) => u.fmtNum(F.breakEven(mes, sd).be, 1) + ' res.'],
    ];
    const cats = F.cats('gasto').map((c) => ({ c, v: F.tot(mes, s, 'gasto', c), b: F.budget(s, c) }));
    const ins = F.insights(mes, s, months);
    const body =
      D.kpis([
        { label: 'Ingresos', value: u.fmtMoney(ing), sub: prev ? dl(ing, F.tot(prev, s, 'ingreso')) : '' },
        { label: 'Gastos', value: u.fmtMoney(gas), sub: prev ? dl(gas, F.tot(prev, s, 'gasto')) : '' },
        { label: 'Resultado', value: u.fmtMoney(ing - gas), sub: 'Margen ' + u.fmtPct(F.margin(mes, s)) },
        { label: 'Costo residente/día', value: u.fmtMoney(F.costoDia(mes, s)), sub: '% sueldos ' + u.fmtPct(F.pctSueldos(mes, s)) },
      ]) +
      D.section('Evolución mes a mes', D.chart(F.cfgMonthly(s, months), { w: 700, h: 230, caption: (s === 'ALL' ? 'Consolidado Galauru SAS' : BT.sedeName(s)) + ' · ingresos, gastos y resultado' })) +
      D.section('Comparativo BT1, BT2 y consolidado', D.chart(F.cfgSedesResult(months), { w: 700, h: 210, caption: 'Resultado mensual por sede' }) +
        D.table([{ label: 'Indicador', key: 'l' }].concat(cmpCols.map((c, i) => ({ label: F.sedeTxt(c), align: 'num', render: (r) => r.f[i] }))), cmpRows.map(([l, f]) => ({ l, f: cmpCols.map(f) })), { compact: true })) +
      D.section('Gastos por categoría y presupuesto', D.table([
        { label: 'Categoría', key: 'c' }, { label: 'Real', align: 'num', render: (x) => u.fmtMoney(x.v) }, { label: '% total', align: 'num', render: (x) => u.fmtPct((x.v / gas) * 100) },
        { label: 'Presupuesto', align: 'num', render: (x) => u.fmtMoney(x.b) }, { label: 'Desvío', align: 'num', render: (x) => { const d = x.b ? ((x.v - x.b) / x.b) * 100 : 0; return D.badge((d > 0 ? '+' : '') + u.fmtPct(d), d > 5 ? 'danger' : d > 0 ? 'warn' : 'ok'); } },
      ], cats, { compact: true, foot: '<tr><td>Total</td><td class="num">' + u.fmtMoney(gas) + '</td><td class="num">100 %</td><td class="num">' + u.fmtMoney(u.sum(cats, 'b')) + '</td><td></td></tr>' })) +
      D.section('Indicadores de gestión', D.kv([
        ['Punto de equilibrio', u.fmtNum(be.be, 1) + ' residentes (ocupación mínima ' + u.fmtPct(be.pct, 0) + ')'], ['Ocupación actual', be.actual + ' de ' + be.camas + ' camas (' + u.fmtPct(be.pctActual, 0) + ')'],
        ['Margen de seguridad', u.fmtNum(be.margenSeg, 1) + ' camas'], ['Contribución por residente', u.fmtMoney(be.ingMedio - be.varMedio)],
        ['IVA a pagar (estimado)', u.fmtMoney(tx.ivaPagar)], ['Aportes BPS (estimado)', u.fmtMoney(tx.bps)],
      ], 2)) +
      D.section('Flujo de caja proyectado a 90 días', D.chart(F.cfgCash(F.cashflow(s), s), { w: 700, h: 200, caption: 'Saldo proyectado (simulación con promedios de los últimos 3 meses)' })) +
      D.section('Lectura del mes', ins.map((x) => D.note('<b>' + esc(x.t) + '.</b> ' + esc(x.d), x.tone === 'danger' ? 'danger' : x.tone === 'warn' ? 'warn' : '')).join(''));
    BT.doc.open({ title: 'Reporte financiero mensual', subtitle: u.cap(u.fmtMonth(mes)) + ' · ' + BT.sedeName(s), sede: s, kicker: 'Finanzas', code: 'FIN-' + mes.replace('-', '') + '-' + F.sedeTxt(s).slice(0, 3).toUpperCase(), body, filename: 'Reporte financiero ' + mes + ' ' + F.sedeTxt(s) });
  };

  F.xlsx = function (mes, s) {
    const months = BT.finMonths();
    const resumen = []; const sedesRows = [];
    months.forEach((m) => ['BT1', 'BT2', 'ALL'].forEach((sd) => {
      const i = F.tot(m, sd, 'ingreso'), g = F.tot(m, sd, 'gasto');
      resumen.push({ mes: u.toDate(m), sede: F.sedeTxt(sd), ing: i, gas: g, res: i - g, mg: i ? (i - g) / i : 0 });
      sedesRows.push({ mes: u.toDate(m), sede: F.sedeTxt(sd), resid: F.residents(m, sd), ing: i, gas: g, sue: F.sueldos(m, sd), res: i - g, mg: i ? (i - g) / i : 0, ps: i ? F.sueldos(m, sd) / i : 0, cd: Math.round(F.costoDia(m, sd)) });
    }));
    const cats = BT.db.finance.filter((f) => s === 'ALL' || f.sede === s).map((f) => ({ mes: u.toDate(f.mes), sede: f.sede, tipo: f.tipo === 'ingreso' ? 'Ingreso' : 'Gasto', cat: f.categoria, monto: f.monto }));
    const bud = [];
    F.sedes(s).forEach((sd) => F.cats('gasto').forEach((c) => { const b = F.budget(sd, c), r = F.tot(mes, sd, 'gasto', c); bud.push({ sede: sd, cat: c, b, r, d: r - b, dp: b ? (r - b) / b : 0 }); }));
    BT.xlsx({
      filename: 'Finanzas ' + F.sedeTxt(s) + ' ' + mes, title: 'Finanzas · ' + (s === 'ALL' ? 'Consolidado Galauru SAS' : BT.sedeName(s)), subtitle: 'Últimos 6 meses', sede: s,
      sheets: [
        { name: 'Resumen', columns: [{ header: 'Mes', key: 'mes', fmt: 'date', width: 12 }, { header: 'Sede', key: 'sede', width: 14 }, { header: 'Ingresos', key: 'ing', fmt: 'money', width: 16 }, { header: 'Gastos', key: 'gas', fmt: 'money', width: 16 }, { header: 'Resultado', key: 'res', fmt: 'money', width: 16 }, { header: 'Margen', key: 'mg', fmt: 'pct', width: 11 }], rows: resumen },
        { name: 'Por categoría', columns: [{ header: 'Mes', key: 'mes', fmt: 'date', width: 12 }, { header: 'Sede', key: 'sede', width: 8 }, { header: 'Tipo', key: 'tipo', width: 10 }, { header: 'Categoría', key: 'cat', width: 40 }, { header: 'Monto', key: 'monto', fmt: 'money', width: 16 }], rows: cats, totals: { monto: 'sum' } },
        { name: 'BT1 vs BT2', columns: [{ header: 'Mes', key: 'mes', fmt: 'date', width: 12 }, { header: 'Sede', key: 'sede', width: 13 }, { header: 'Residentes', key: 'resid', fmt: 'int', width: 11 }, { header: 'Ingresos', key: 'ing', fmt: 'money', width: 15 }, { header: 'Gastos', key: 'gas', fmt: 'money', width: 15 }, { header: 'Sueldos y cargas', key: 'sue', fmt: 'money', width: 16 }, { header: 'Resultado', key: 'res', fmt: 'money', width: 15 }, { header: 'Margen', key: 'mg', fmt: 'pct', width: 10 }, { header: '% sueldos', key: 'ps', fmt: 'pct', width: 11 }, { header: 'Costo residente/día', key: 'cd', fmt: 'money', width: 17 }], rows: sedesRows },
        { name: 'Presupuesto', columns: [{ header: 'Sede', key: 'sede', width: 8 }, { header: 'Rubro', key: 'cat', width: 36 }, { header: 'Presupuesto', key: 'b', fmt: 'money', width: 15 }, { header: 'Real ' + u.fmtMonthShort(mes), key: 'r', fmt: 'money', width: 15 }, { header: 'Desvío', key: 'd', fmt: 'money', width: 14 }, { header: 'Desvío %', key: 'dp', fmt: 'pct', width: 11 }], rows: bud, totals: { b: 'sum', r: 'sum', d: 'sum' } },
      ],
    });
  };
})();

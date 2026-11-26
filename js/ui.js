/* ==========================================================================
   Componentes de interfaz (BT.ui)
   Todos devuelven strings HTML salvo modal/drawer/toast/confirm.
   ========================================================================== */
(function () {
  'use strict';
  const BT = window.BT; const u = BT.u; const ic = BT.ic; const esc = u.esc;
  const ui = (BT.ui = {});
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion');

  /* ---------- Básicos ---------- */
  ui.pageHeader = function ({ eyebrow, icon, title, sub, actions = '' }) {
    return '<div class="page-head"><div>' +
      (eyebrow ? '<div class="eyebrow">' + (icon ? ic(icon, 'ic-xs') : '') + esc(eyebrow) + '</div>' : '') +
      '<h1>' + title + '</h1>' + (sub ? '<div class="sub">' + sub + '</div>' : '') +
      '</div><div class="actions">' + actions + '</div></div>';
  };
  ui.card = function ({ title, sub, icon, actions = '', body = '', foot = '', cls = '', bodyCls = '', attrs = '' }) {
    return '<section class="card ' + cls + '" ' + attrs + '>' +
      (title ? '<div class="card-h"><div><h3>' + (icon ? ic(icon) : '') + title + '</h3>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div><div class="row gap-6">' + actions + '</div></div>' : '') +
      '<div class="card-b ' + bodyCls + '">' + body + '</div>' + (foot ? '<div class="card-f">' + foot + '</div>' : '') + '</section>';
  };
  /** tone: ok | warn | danger | info | brand | violet | dark | outline */
  ui.badge = (text, tone = '', opts = {}) => '<span class="badge ' + tone + (opts.dot ? ' dot' : '') + (opts.lg ? ' lg' : '') + '"' + (opts.tip ? ' data-tip="' + esc(opts.tip) + '"' : '') + '>' + (opts.icon ? ic(opts.icon) : '') + esc(text) + '</span>';
  const AV_COLORS = [['#e2f0e6', '#1c4f2d'], ['#ece9f6', '#4b3a7e'], ['#fcefe0', '#8a4f0c'], ['#e5eef8', '#24527f'], ['#f6e6ea', '#86344a'], ['#e7f2f0', '#215e55'], ['#f1efea', '#4c4a47'], ['#f3ead9', '#6c5520']];
  ui.avatar = function (name, opts = {}) {
    const [bg, fg] = AV_COLORS[u.hash(name) % AV_COLORS.length];
    return '<span class="avatar ' + (opts.size || '') + (opts.sq ? ' sq' : '') + '" style="--av-bg:' + bg + ';--av-fg:' + fg + '"' + (opts.tip ? ' data-tip="' + esc(name) + '"' : '') + '>' + esc(u.initials(name).toUpperCase()) + '</span>';
  };
  ui.person = function (name, meta = '', opts = {}) {
    return '<div class="person">' + ui.avatar(name, { size: opts.size || 'sm' }) + '<div style="min-width:0"><div class="pn ellipsis">' + esc(name) + '</div>' + (meta ? '<div class="pm ellipsis">' + meta + '</div>' : '') + '</div></div>';
  };
  /** KPI animado. value numérico; money=true → $U; decimals; suffix */
  /** Mini gráfico de tendencia (SVG en línea). values: números; color opcional */
  ui.spark = function (values, color = '#297040', h = 42) {
    const v = (values || []).filter((x) => isFinite(x)); if (v.length < 2) return '';
    const min = Math.min(...v), max = Math.max(...v), rg = max - min || 1, W = 100;
    const pts = v.map((x, i) => [(i / (v.length - 1)) * W, h - 4 - ((x - min) / rg) * (h - 12)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const id = 'sg' + Math.random().toString(36).slice(2, 7); const last = pts[pts.length - 1];
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + color + '" stop-opacity=".28"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs><path class="area" d="' + d + ' L' + W + ' ' + h + ' L0 ' + h + 'Z" fill="url(#' + id + ')"/><path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="2.6" fill="#fff" stroke="' + color + '" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>';
  };
  ui.kpi = function ({ label, value, money, decimals = 0, prefix = '', suffix = '', icon, tone = '', foot = '', delta, deltaGood = 'up', tip, cls = '', spark, sparkColor, variant }) {
    if (variant) cls += ' v-' + variant;
    let d = '';
    if (delta != null && isFinite(delta)) {
      const dir = Math.abs(delta) < 0.05 ? 'flat' : delta > 0 ? 'up' : 'down';
      const good = dir === 'flat' ? 'flat' : (dir === deltaGood ? 'up' : 'down');
      d = '<span class="delta ' + good + '">' + ic(dir === 'up' ? 'trending-up' : dir === 'down' ? 'trending-down' : 'minus', 'ic-xs') + u.fmtNum(Math.abs(delta), 1) + ' %</span>';
    }
    const pre = money ? '$U ' : prefix;
    return '<div class="card kpi hover ' + cls + '"' + (tip ? ' data-tip="' + esc(tip) + '"' : '') + '><div class="k-top"><span class="k-label">' + label + '</span>' + (icon ? '<span class="k-ic ' + tone + '">' + ic(icon) + '</span>' : '') + '</div>' +
      '<div class="k-val"><span class="k-pre" style="font-size:.6em;color:var(--ink-500);font-weight:600;margin-right:5px;letter-spacing:0">' + esc(money ? '$U' : '') + '</span>' + (pre && !money ? esc(pre) : '') + '<span data-count="' + value + '" data-dec="' + decimals + '">' + u.fmtNum(value, decimals) + '</span>' + (suffix ? '<small>' + suffix + '</small>' : '') + '</div>' +
      '<div class="k-foot">' + d + foot + '</div>' + (spark ? ui.spark(spark, sparkColor || (variant === 'green' ? '#8fd0a2' : tone === 'danger' ? '#c4473c' : '#297040')) : '') + '</div>';
  };
  ui.bar = (pct, tone = '', thin) => '<div class="bar ' + tone + (thin ? ' thin' : '') + '"><span style="width:' + u.clamp(pct, 0, 100) + '%"></span></div>';
  ui.ring = function (pct, label, sub, color) {
    const r = 52, c = 2 * Math.PI * r;
    return '<div class="ring"><svg viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="' + r + '" fill="none" stroke-width="10"/><circle class="val" data-ring="' + pct + '" cx="60" cy="60" r="' + r + '" fill="none" stroke-width="10" stroke-dasharray="' + c + '" stroke-dashoffset="' + c + '"' + (color ? ' style="stroke:' + color + '"' : '') + '/></svg><div class="lbl"><div><b>' + label + '</b><span>' + (sub || '') + '</span></div></div></div>';
  };
  ui.dot = (tone) => '<span class="sdot ' + tone + '"></span>';
  ui.live = (t = 'En vivo') => '<span class="live">' + t + '</span>';
  ui.traffic = (tone) => '<span class="traffic ' + ({ danger: 'r', warn: 'y', ok: 'g' }[tone] || '') + '"><i></i><i></i><i></i></span>';
  ui.kv = (pairs) => '<dl class="kv">' + pairs.filter(Boolean).map(([k, v]) => '<dt>' + k + '</dt><dd>' + (v == null || v === '' ? '<span class="subtle">—</span>' : v) + '</dd>').join('') + '</dl>';
  ui.secTitle = (t) => '<div class="sec-t">' + t + '</div>';
  ui.relTime = (ts) => '<time data-tip="' + u.fmtDateTime(ts) + '" datetime="' + new Date(ts).toISOString() + '">' + u.rel(ts) + '</time>';

  /* ---------- Ilustraciones para estados vacíos ---------- */
  const ILL = {
    default: '<svg class="ill" viewBox="0 0 160 110" fill="none"><ellipse cx="80" cy="98" rx="56" ry="7" fill="#f1efea"/><rect x="38" y="18" width="84" height="70" rx="12" fill="#fff" stroke="#dfdbd3" stroke-width="2"/><rect x="50" y="34" width="44" height="6" rx="3" fill="#e2f0e6"/><rect x="50" y="48" width="60" height="6" rx="3" fill="#f1efea"/><rect x="50" y="62" width="36" height="6" rx="3" fill="#f1efea"/><circle cx="118" cy="22" r="14" fill="#297040"/><path d="M112 22.5l4 4 8-8.5" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    leaf: '<svg class="ill" viewBox="0 0 160 110" fill="none"><ellipse cx="80" cy="98" rx="50" ry="7" fill="#f1efea"/><path d="M80 92c0-26 6-48 30-64-4 30-14 48-30 64z" fill="#c2dfca"/><path d="M80 92c0-22-8-40-28-52 2 24 12 40 28 52z" fill="#8fc49f"/><path d="M80 92V54" stroke="#297040" stroke-width="3" stroke-linecap="round"/><circle cx="116" cy="24" r="4" fill="#e2f0e6"/><circle cx="44" cy="34" r="3" fill="#e2f0e6"/></svg>',
    search: '<svg class="ill" viewBox="0 0 160 110" fill="none"><ellipse cx="80" cy="98" rx="50" ry="7" fill="#f1efea"/><circle cx="72" cy="50" r="28" fill="#fff" stroke="#dfdbd3" stroke-width="3"/><circle cx="72" cy="50" r="18" fill="#f1f8f3"/><path d="M93 71l18 18" stroke="#393939" stroke-width="7" stroke-linecap="round"/></svg>',
    calendar: '<svg class="ill" viewBox="0 0 160 110" fill="none"><ellipse cx="80" cy="98" rx="52" ry="7" fill="#f1efea"/><rect x="42" y="22" width="76" height="66" rx="12" fill="#fff" stroke="#dfdbd3" stroke-width="2"/><rect x="42" y="22" width="76" height="18" rx="12" fill="#297040"/><rect x="42" y="32" width="76" height="8" fill="#297040"/><g fill="#f1efea"><rect x="52" y="50" width="12" height="10" rx="3"/><rect x="74" y="50" width="12" height="10" rx="3"/><rect x="96" y="50" width="12" height="10" rx="3"/><rect x="52" y="66" width="12" height="10" rx="3"/><rect x="96" y="66" width="12" height="10" rx="3"/></g><rect x="74" y="66" width="12" height="10" rx="3" fill="#8fc49f"/></svg>',
  };
  ui.empty = function ({ icon, ill = 'default', title = 'Nada por aquí', text = '', action = '' } = {}) {
    return '<div class="empty">' + (ILL[ill] || ILL.default) + '<div class="t">' + esc(title) + '</div>' + (text ? '<div class="d">' + text + '</div>' : '') + (action ? '<div class="mt-8">' + action + '</div>' : '') + '</div>';
  };
  ui.skeleton = (lines = 3) => '<div class="col gap-4">' + Array.from({ length: lines }, (_, i) => '<div class="skel line" style="width:' + (90 - i * 13) + '%"></div>').join('') + '</div>';
  /** Muestra un esqueleto y luego ejecuta fn (simula carga) */
  ui.withSkeleton = function (el, fn, ms = 380) { el.innerHTML = '<div class="card"><div class="card-b">' + ui.skeleton(5) + '</div></div>'; setTimeout(() => { fn(); ui.enhance(el); }, reduceMotion() ? 0 : ms); };

  /* ---------- Tabla ----------
     cols: [{ key, label, align:'num'|'center', render:(row)=>html, width, cls }]
     opts: { rowAttrs:(row)=>string, empty, compact, foot:html } */
  ui.table = function (cols, rows, opts = {}) {
    if (!rows.length) return ui.empty(opts.empty || { title: 'Sin registros', text: 'Todavía no hay datos para mostrar.' });
    return '<div class="table-wrap"><table class="table ' + (opts.compact ? 'compact' : '') + '"><thead><tr>' +
      cols.map((c) => '<th class="' + (c.align || '') + '"' + (c.width ? ' style="width:' + c.width + '"' : '') + '>' + c.label + '</th>').join('') +
      '</tr></thead><tbody>' +
      rows.map((r) => '<tr ' + (opts.rowAttrs ? opts.rowAttrs(r) : '') + '>' + cols.map((c) => '<td class="' + (c.align || '') + ' ' + (c.cls || '') + '">' + (c.render ? c.render(r) : esc(r[c.key])) + '</td>').join('') + '</tr>').join('') +
      '</tbody>' + (opts.foot ? '<tfoot>' + opts.foot + '</tfoot>' : '') + '</table></div>';
  };

  /* ---------- Segmentado y sub-pestañas ---------- */
  /** items: [{id,label,icon}] → botones con data-seg */
  ui.seg = (name, items, active, cls = '') => '<div class="seg ' + cls + '" data-seg="' + name + '"><span class="seg-ind"></span>' + items.map((i) => '<button type="button" data-val="' + i.id + '" class="' + (i.id === active ? 'on' : '') + '">' + (i.icon ? ic(i.icon, 'ic-sm') : '') + (i.dot ? '<span class="dot" style="background:' + i.dot + '"></span>' : '') + esc(i.label) + '</button>').join('') + '</div>';
  /**
   * Sub-pestañas con indicador deslizante y memoria.
   * ui.subtabs(container, key, items:[{id,label,icon,count}], renderFn(panelEl, id))
   */
  ui.subtabs = function (container, key, items, renderFn, initial) {
    const active = BT.state.sub[key] && items.some((i) => i.id === BT.state.sub[key]) ? BT.state.sub[key] : (initial || items[0].id);
    container.innerHTML = '<div class="tabs" role="tablist">' + items.map((i) => '<button role="tab" data-st="' + i.id + '" class="' + (i.id === active ? 'on' : '') + '">' + (i.icon ? ic(i.icon) : '') + esc(i.label) + (i.count != null && i.count !== '' ? '<span class="count">' + i.count + '</span>' : '') + '</button>').join('') + '<span class="tabs-ind"></span></div><div class="tab-panel"></div>';
    const bar = container.querySelector('.tabs'); let panel = container.querySelector('.tab-panel');
    const show = (id, first) => {
      BT.state.sub[key] = id;
      bar.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.st === id));
      ui.moveInd(bar);
      BT._charts = BT._charts.filter((c) => { if (c.canvas && panel.contains(c.canvas)) { try { c.destroy(); } catch (e) { } return false; } return true; });
      // panel nuevo en cada cambio: evita acumular listeners entre secciones
      const fresh = document.createElement('div'); fresh.className = 'tab-panel'; panel.replaceWith(fresh); panel = fresh;
      renderFn(panel, id);
      if (!first) ui.enhance(panel);
    };
    bar.addEventListener('click', (e) => { const b = e.target.closest('[data-st]'); if (b) show(b.dataset.st); });
    show(active, true);
    requestAnimationFrame(() => ui.moveInd(bar));
    return { show, panel };
  };
  ui.moveInd = function (bar) {
    const ind = bar.querySelector('.tabs-ind, .seg-ind'); const on = bar.querySelector('button.on');
    if (!ind || !on) { if (ind) ind.style.width = '0'; return; }
    ind.style.width = on.offsetWidth + 'px';
    ind.style.transform = 'translateX(' + (on.offsetLeft - (ind.classList.contains('seg-ind') ? 3 : 0)) + 'px)';
  };

  /* ---------- Mejoras post-render ---------- */
  ui.countUp = function (root) {
    root.querySelectorAll('[data-count]').forEach((el) => {
      if (el.dataset.counted) return; el.dataset.counted = '1';
      const target = parseFloat(el.dataset.count); const dec = parseInt(el.dataset.dec || '0', 10);
      if (!isFinite(target) || reduceMotion()) { el.textContent = u.fmtNum(target, dec); return; }
      const dur = 1000; const t0 = performance.now();
      const step = (t) => { const p = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - p, 4); el.textContent = u.fmtNum(target * e, dec); if (p < 1) requestAnimationFrame(step); };
      el.textContent = u.fmtNum(0, dec); requestAnimationFrame(step);
      // respaldo: si la pestaña está en segundo plano rAF no corre; asegurar el valor final
      setTimeout(() => { el.textContent = u.fmtNum(target, dec); }, dur + 150);
    });
  };
  ui.enhance = function (root, opts = {}) {
    if (!opts.quiet) ui.countUp(root); else root.querySelectorAll('[data-count]').forEach((el) => (el.dataset.counted = '1'));
    root.querySelectorAll('[data-ring]').forEach((c) => {
      const r = 52, C = 2 * Math.PI * r, p = parseFloat(c.dataset.ring) / 100;
      requestAnimationFrame(() => requestAnimationFrame(() => { c.style.strokeDashoffset = C * (1 - u.clamp(p, 0, 1)); }));
    });
    root.querySelectorAll('.seg, .tabs').forEach((bar) => requestAnimationFrame(() => ui.moveInd(bar)));
  };

  /* Efecto "ripple" en botones (global) */
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn'); if (!b || reduceMotion()) return;
    const r = b.getBoundingClientRect(); const s = Math.max(r.width, r.height);
    const sp = document.createElement('span'); sp.className = 'ripple';
    sp.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
    b.appendChild(sp); setTimeout(() => sp.remove(), 650);
  });
  /* Segmentados genéricos: mueven el indicador y emiten evento 'seg' */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.seg button'); if (!b) return;
    const seg = b.closest('.seg'); if (seg.dataset.manual) return;
    seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); ui.moveInd(seg);
    seg.dispatchEvent(new CustomEvent('segchange', { bubbles: true, detail: { name: seg.dataset.seg, value: b.dataset.val } }));
  });
  window.addEventListener('resize', u.debounce(() => document.querySelectorAll('.seg, .tabs').forEach(ui.moveInd), 100));

  /** Delegación de clics: ui.on(el, { 'open-res': (target, ev) => ... }) usando data-act="open-res" */
  ui.on = function (el, handlers) {
    // Idempotente: un solo listener por elemento; llamadas sucesivas actualizan los manejadores
    if (el._btHandlers) { Object.assign(el._btHandlers, handlers); return; }
    el._btHandlers = Object.assign({}, handlers);
    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]'); if (!t || !el.contains(t)) return;
      // si el data-act pertenece a un contenedor anidado con sus propios manejadores, que lo atienda ese
      const owner = t.parentElement && t.parentElement.closest('[data-bt-on]');
      if (owner && owner !== el && el.contains(owner) && owner._btHandlers && owner._btHandlers[t.dataset.act]) return;
      const fn = el._btHandlers[t.dataset.act]; if (fn) { e.preventDefault(); fn(t, e); }
    });
    el.setAttribute('data-bt-on', '');
  };

  /* ---------- Overlay base ---------- */
  function overlay(cls, html, onClose) {
    const ov = document.createElement('div');
    ov.className = 'overlay ' + cls;
    ov.innerHTML = html;
    document.body.appendChild(ov);
    const prevFocus = document.activeElement;
    let closed = false;
    const close = (val) => {
      if (closed) return; closed = true;
      ov.classList.add('closing');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => { ov.remove(); if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) { } }, reduceMotion() ? 0 : 220);
      onClose && onClose(val);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(); });
    ov.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    setTimeout(() => { const f = ov.querySelector('[autofocus], .input, .select, .textarea, .btn.primary'); if (f) try { f.focus({ preventScroll: true }); } catch (e) { } }, 60);
    return { el: ov, close };
  }
  /**
   * ui.modal({ title, sub, icon, body, foot, size:'lg'|'xl', onMount(el, close) })
   */
  ui.modal = function ({ title, sub, icon, body = '', foot, size = '', onMount, onClose }) {
    const html = '<div class="modal ' + size + '" role="dialog" aria-modal="true"><div class="modal-h"><div class="row top gap-16">' +
      (icon ? '<span class="k-ic" style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--brand-50);color:var(--brand-600);flex:none">' + ic(icon) + '</span>' : '') +
      '<div><h3>' + title + '</h3>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div></div><button class="icon-btn ghost sm" data-close aria-label="Cerrar">' + ic('x') + '</button></div>' +
      '<div class="modal-b">' + body + '</div>' + (foot !== undefined ? '<div class="modal-f">' + foot + '</div>' : '') + '</div>';
    const m = overlay('', html, onClose);
    ui.enhance(m.el);
    if (onMount) onMount(m.el.querySelector('.modal'), m.close);
    return m;
  };
  /** Panel lateral (ficha). head: html, body: html */
  ui.drawer = function ({ head = '', body = '', onMount, onClose, width }) {
    const html = '<aside class="drawer" role="dialog" aria-modal="true"' + (width ? ' style="width:min(' + width + 'px,100vw)"' : '') + '><div class="drawer-h"><div class="grow">' + head + '</div><button class="icon-btn ghost" data-close aria-label="Cerrar">' + ic('x') + '</button></div><div class="drawer-b">' + body + '</div></aside>';
    const d = overlay('drawer-ov', html, onClose);
    ui.enhance(d.el);
    if (onMount) onMount(d.el.querySelector('.drawer'), d.close);
    return d;
  };
  /** Confirmación → Promise<boolean> */
  ui.confirm = function ({ title, text, ok = 'Confirmar', cancel = 'Cancelar', icon = 'circle-help', tone = '' }) {
    return new Promise((res) => {
      let val = false;
      ui.modal({
        title, icon, body: '<p class="muted" style="font-size:var(--fs-md)">' + text + '</p>',
        foot: '<button class="btn ghost" data-close>' + esc(cancel) + '</button><button class="btn ' + (tone === 'danger' ? 'danger' : 'primary') + '" data-ok>' + esc(ok) + '</button>',
        onMount: (el, close) => el.querySelector('[data-ok]').addEventListener('click', () => { val = true; close(); }),
        onClose: () => res(val),
      });
    });
  };
  /** Aviso breve que se desliza. type: ok | warn | danger | info */
  ui.toast = function (msg, { sub = '', type = 'ok', icon, ms = 3600 } = {}) {
    let wrap = document.querySelector('.toasts');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toasts'; wrap.setAttribute('aria-live', 'polite'); document.body.appendChild(wrap); }
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    const icn = icon || { ok: 'check', warn: 'triangle-alert', danger: 'circle-x', info: 'info' }[type];
    t.innerHTML = '<span class="t-ic">' + ic(icn, 'ic-sm') + '</span><div class="grow"><div style="font-weight:600">' + esc(msg) + '</div>' + (sub ? '<div class="t-sub">' + esc(sub) + '</div>' : '') + '</div><div class="t-bar"><span style="animation-duration:' + ms + 'ms"></span></div>';
    wrap.appendChild(t);
    const kill = () => { t.classList.add('out'); setTimeout(() => t.remove(), 260); };
    const tm = setTimeout(kill, ms);
    t.addEventListener('click', () => { clearTimeout(tm); kill(); });
  };

  /* ---------- Formularios ---------- */
  /**
   * ui.field({ label, name, type:'text'|'number'|'date'|'time'|'select'|'textarea'|'chips', value, options:[{v,l}|string], required, hint, placeholder, full, attrs })
   */
  ui.field = function (f) {
    const id = 'f_' + f.name + '_' + Math.random().toString(36).slice(2, 6);
    const req = f.required ? ' required data-required="1"' : '';
    const val = f.value == null ? '' : f.value;
    let input;
    const opts = (f.options || []).map((o) => (typeof o === 'string' ? { v: o, l: o } : o));
    if (f.type === 'select') input = '<select class="select" id="' + id + '" name="' + f.name + '"' + req + ' ' + (f.attrs || '') + '>' + (f.placeholder ? '<option value="">' + esc(f.placeholder) + '</option>' : '') + opts.map((o) => '<option value="' + esc(o.v) + '"' + (String(o.v) === String(val) ? ' selected' : '') + '>' + esc(o.l) + '</option>').join('') + '</select>';
    else if (f.type === 'textarea') input = '<textarea class="textarea" id="' + id + '" name="' + f.name + '"' + req + ' placeholder="' + esc(f.placeholder || '') + '" ' + (f.attrs || '') + '>' + esc(val) + '</textarea>';
    else if (f.type === 'chips') input = '<div class="chips" data-chips="' + f.name + '"' + (f.multi ? ' data-multi="1"' : '') + req + '>' + opts.map((o) => '<button type="button" class="chip ' + (f.lg ? 'lg ' : '') + ((Array.isArray(val) ? val.includes(o.v) : String(o.v) === String(val)) ? 'on' : '') + '" data-v="' + esc(o.v) + '">' + (o.icon ? ic(o.icon, 'ic-sm') : '') + esc(o.l) + '</button>').join('') + '</div>';
    else input = '<input class="input" id="' + id + '" name="' + f.name + '" type="' + (f.type || 'text') + '" value="' + esc(val) + '"' + req + ' placeholder="' + esc(f.placeholder || '') + '" ' + (f.attrs || '') + '>';
    return '<div class="field ' + (f.full ? 'full' : '') + '"><label for="' + id + '">' + esc(f.label) + (f.required ? '<span class="req">*</span>' : '') + (f.tip ? '<span data-tip="' + esc(f.tip) + '" class="subtle">' + ic('info', 'ic-xs') + '</span>' : '') + '</label>' + input + (f.hint ? '<div class="hint">' + f.hint + '</div>' : '') + '</div>';
  };
  /* Chips seleccionables (global) */
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-chips] .chip'); if (!c) return;
    const g = c.closest('[data-chips]');
    if (g.dataset.multi) c.classList.toggle('on'); else g.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === c));
    g.classList.remove('invalid'); g.style.outline = '';
    g.dispatchEvent(new CustomEvent('chipchange', { bubbles: true }));
  });
  /** Lee un formulario (incluye chips). Devuelve objeto. */
  ui.formData = function (root) {
    const o = {};
    root.querySelectorAll('input[name], select[name], textarea[name]').forEach((el) => { if (el.type === 'checkbox') o[el.name] = el.checked; else o[el.name] = el.value.trim(); });
    root.querySelectorAll('[data-chips]').forEach((g) => { const on = [...g.querySelectorAll('.chip.on')].map((c) => c.dataset.v); o[g.dataset.chips] = g.dataset.multi ? on : (on[0] || ''); });
    return o;
  };
  /** Valida campos requeridos; marca y sacude los inválidos. Devuelve true si está ok. */
  ui.validate = function (root) {
    let ok = true; let first = null;
    root.querySelectorAll('[data-required]').forEach((el) => {
      const empty = el.matches('[data-chips]') ? !el.querySelector('.chip.on') : !String(el.value || '').trim();
      if (empty) {
        ok = false; first = first || el;
        if (el.matches('[data-chips]')) { el.style.outline = '2px solid var(--danger-line)'; el.style.borderRadius = '12px'; el.style.outlineOffset = '4px'; }
        else { el.classList.remove('invalid'); void el.offsetWidth; el.classList.add('invalid'); el.addEventListener('input', () => el.classList.remove('invalid'), { once: true }); }
      }
    });
    if (first) { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); ui.toast('Faltan campos obligatorios', { type: 'warn', sub: 'Completá los campos marcados para dejar constancia.' }); }
    return ok;
  };

  /* ---------- Menú de exportación ----------
     ui.exportMenu([{ id, label, sub, icon:'file-text'|'file-spreadsheet'|'printer' }]) → html; manejar con ui.on(el, {'export': t => t.dataset.id}) */
  ui.exportMenu = function (items, label = 'Exportar') {
    return '<div class="menu-wrap"><button class="btn" data-menu-toggle>' + ic('download') + label + ic('chevron-down', 'ic-xs') + '</button><div class="menu hidden">' +
      items.map((i) => (i === '-' ? '<hr>' : '<button data-act="export" data-id="' + i.id + '">' + ic(i.icon || 'file-text') + '<span>' + esc(i.label) + (i.sub ? '<small>' + esc(i.sub) + '</small>' : '') + '</span></button>')).join('') + '</div></div>';
  };
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-menu-toggle]');
    document.querySelectorAll('.menu-wrap .menu:not(.hidden)').forEach((m) => { if (!t || m.parentElement !== t.parentElement) m.classList.add('hidden'); });
    if (t) { const m = t.parentElement.querySelector('.menu'); m.classList.toggle('hidden'); }
    else if (e.target.closest('.menu button')) e.target.closest('.menu').classList.add('hidden');
  });

  /* ---------- Micro-interacción de guardado ---------- */
  ui.flash = (el) => { if (!el) return; el.classList.remove('flash-ok'); void el.offsetWidth; el.classList.add('flash-ok'); };
  /** Botón de dosis con check animado */
  ui.dose = (state = '', attrs = '', lg) => '<button class="dose ' + state + (lg ? ' lg' : '') + '" ' + attrs + '>' + (state === 'done' ? BT.check : state === 'miss' ? ic('x', 'ic-sm') : state === 'ref' ? ic('hand', 'ic-sm') : ic('plus', 'ic-sm')) + '</button>';
})();

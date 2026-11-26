/* ==========================================================================
   Residencial Buenos Tiempos — Núcleo
   Espacio de nombres global: window.BT
   ========================================================================== */
(function () {
  'use strict';
  const BT = (window.BT = window.BT || {});
  BT.VERSION = '1.0.0';
  BT.STORAGE_KEY = 'bt-demo-v1';

  /* ------------------------------------------------------------------
     Utilidades (BT.u)
     ------------------------------------------------------------------ */
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
  const MESES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const DIAS_C = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const pad = (n) => String(n).padStart(2, '0');

  const u = (BT.u = {
    MESES, MESES_C, DIAS, DIAS_C, pad,
    esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    uid(p = 'id') { return p + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); },
    /** Fecha → 'YYYY-MM-DD' (hora local) */
    iso(d) { d = u.toDate(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); },
    ym(d) { d = u.toDate(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1); },
    toDate(d) {
      if (d instanceof Date) return d;
      if (typeof d === 'number') return new Date(d);
      if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd); }
      if (typeof d === 'string' && /^\d{4}-\d{2}$/.test(d)) { const [y, m] = d.split('-').map(Number); return new Date(y, m - 1, 1); }
      return new Date(d);
    },
    today() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; },
    todayIso() { return u.iso(new Date()); },
    addDays(d, n) { d = new Date(u.toDate(d)); d.setDate(d.getDate() + n); return d; },
    addMonths(d, n) { d = new Date(u.toDate(d)); d.setDate(1); d.setMonth(d.getMonth() + n); return d; },
    daysBetween(a, b) { const A = u.toDate(a), B = u.toDate(b); const a0 = new Date(A.getFullYear(), A.getMonth(), A.getDate()); const b0 = new Date(B.getFullYear(), B.getMonth(), B.getDate()); return Math.round((b0 - a0) / 86400000); },
    daysUntil(d) { return u.daysBetween(u.today(), d); },
    /** dd/mm/aaaa */
    fmtDate(d) { if (!d) return '—'; d = u.toDate(d); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); },
    fmtDateShort(d) { d = u.toDate(d); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1); },
    fmtTime(d) { d = u.toDate(d); return pad(d.getHours()) + ':' + pad(d.getMinutes()); },
    fmtDateTime(d) { if (!d) return '—'; return u.fmtDate(d) + ' ' + u.fmtTime(d); },
    fmtDateLong(d) { d = u.toDate(d); return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear(); },
    fmtMonth(ym) { const d = u.toDate(ym); return MESES[d.getMonth()] + ' ' + d.getFullYear(); },
    fmtMonthShort(ym) { const d = u.toDate(ym); return MESES_C[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2); },
    cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); },
    /** Fechas relativas: "hace 2 horas", "en 3 días" */
    rel(ts) {
      const d = u.toDate(ts); const diff = (Date.now() - d.getTime()) / 1000; const a = Math.abs(diff); const fut = diff < 0;
      const f = (n, s, p) => (fut ? 'en ' : 'hace ') + n + ' ' + (n === 1 ? s : p);
      if (a < 45) return fut ? 'en instantes' : 'recién';
      if (a < 3600) return f(Math.round(a / 60), 'minuto', 'minutos');
      if (a < 86400) return f(Math.round(a / 3600), 'hora', 'horas');
      const days = Math.round(a / 86400);
      if (days === 1) return fut ? 'mañana' : 'ayer';
      if (days < 30) return f(days, 'día', 'días');
      const m = Math.round(days / 30);
      if (m < 12) return f(m, 'mes', 'meses');
      return f(Math.round(m / 12), 'año', 'años');
    },
    relDay(d) {
      const n = u.daysUntil(d);
      if (n === 0) return 'hoy'; if (n === 1) return 'mañana'; if (n === -1) return 'ayer';
      if (n > 0) return 'en ' + n + ' días'; return 'hace ' + -n + ' días';
    },
    /** Montos en pesos uruguayos: $U 12.345 */
    fmtMoney(n, dec = 0) {
      const v = Number(n || 0); const neg = v < 0;
      const s = Math.abs(v).toLocaleString('es-UY', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      return (neg ? '−' : '') + '$U ' + s;
    },
    fmtMoneyK(n) { const v = Number(n || 0); if (Math.abs(v) >= 1e6) return '$U ' + (v / 1e6).toLocaleString('es-UY', { maximumFractionDigits: 2 }) + ' M'; if (Math.abs(v) >= 1e3) return '$U ' + Math.round(v / 1e3).toLocaleString('es-UY') + ' k'; return u.fmtMoney(v); },
    fmtNum(n, dec = 0) { return Number(n || 0).toLocaleString('es-UY', { minimumFractionDigits: dec, maximumFractionDigits: dec }); },
    fmtPct(n, dec = 1) { return Number(n || 0).toLocaleString('es-UY', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + ' %'; },
    fmtCI(ci) { const s = String(ci).replace(/\D/g, '').padStart(8, '0'); return s[0] + '.' + s.slice(1, 4) + '.' + s.slice(4, 7) + '-' + s[7]; },
    initials(name) { const p = String(name || '').replace(/^(Dr\.|Dra\.|Lic\.|Cr\.|Cra\.)\s*/i, '').trim().split(/\s+/); return ((p[0] || '')[0] || '') + ((p[1] || '')[0] || ''); },
    age(birth) { const b = u.toDate(birth), t = new Date(); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; },
    yearsSince(d) { return Math.max(0, u.age(d)); },
    sum(arr, f) { return arr.reduce((s, x) => s + (f ? (typeof f === 'string' ? Number(x[f] || 0) : f(x)) : Number(x || 0)), 0); },
    avg(arr, f) { return arr.length ? u.sum(arr, f) / arr.length : 0; },
    groupBy(arr, f) { const o = {}; arr.forEach((x) => { const k = typeof f === 'string' ? x[f] : f(x); (o[k] = o[k] || []).push(x); }); return o; },
    sortBy(arr, f, desc) { const g = typeof f === 'string' ? (x) => x[f] : f; return [...arr].sort((a, b) => { const A = g(a), B = g(b); return (A > B ? 1 : A < B ? -1 : 0) * (desc ? -1 : 1); }); },
    clamp(v, a, b) { return Math.min(b, Math.max(a, v)); },
    cls(...a) { return a.filter(Boolean).join(' '); },
    norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); },
    debounce(fn, ms = 160) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; },
    hash(s) { let h = 0; s = String(s); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); },
    /** Turno actual según la hora: M 06–14, T 14–22, N 22–06 */
    currentShift(d = new Date()) { const h = d.getHours(); return h >= 6 && h < 14 ? 'M' : h >= 14 && h < 22 ? 'T' : 'N'; },
    /** Día "operativo" del turno noche: entre 00 y 06 pertenece al día anterior */
    shiftDate(d = new Date()) { const h = d.getHours(); return h < 6 ? u.iso(u.addDays(d, -1)) : u.iso(d); },
    SHIFTS: {
      M: { id: 'M', label: 'Mañana', short: 'Mañana', from: '06:00', to: '14:00', icon: 'sunrise', hours: ['06:00', '08:00', '10:00', '12:00'] },
      T: { id: 'T', label: 'Tarde', short: 'Tarde', from: '14:00', to: '22:00', icon: 'sunset', hours: ['14:00', '16:00', '18:00', '20:00'] },
      N: { id: 'N', label: 'Noche', short: 'Noche', from: '22:00', to: '06:00', icon: 'moon', hours: ['22:00', '00:00', '02:00', '04:00'] },
    },
    shiftOfHour(hhmm) { const h = parseInt(hhmm, 10); return h >= 6 && h < 14 ? 'M' : h >= 14 && h < 22 ? 'T' : 'N'; },
  });

  /* ------------------------------------------------------------------
     Íconos (Lucide → SVG en línea)
     ------------------------------------------------------------------ */
  const iconCache = {};
  const toPascal = (n) => n.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  /**
   * BT.ic('heart-pulse', 'ic-sm extra-class') → string <svg>
   */
  BT.ic = function (name, extra = '') {
    const key = name + '|' + extra;
    if (iconCache[key]) return iconCache[key];
    const L = window.lucide && (window.lucide.icons || window.lucide);
    let node = L && L[toPascal(name)];
    if (!node) { if (window.console) console.warn('[BT] ícono no encontrado:', name); node = L && L.Circle; }
    let children = node;
    if (Array.isArray(node) && node[0] === 'svg') children = node[2];
    const inner = (children || []).map(([tag, attrs]) => '<' + tag + ' ' + Object.entries(attrs).map(([k, v]) => k + '="' + v + '"').join(' ') + '/>').join('');
    const svg = '<svg class="ic ' + extra + '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
    iconCache[key] = svg;
    return svg;
  };
  BT.check = '<svg class="chk" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  /* ------------------------------------------------------------------
     Eventos simples
     ------------------------------------------------------------------ */
  const listeners = {};
  BT.on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
  BT.emit = (ev, data) => { (listeners[ev] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); };

  /* ------------------------------------------------------------------
     Estado y persistencia
     ------------------------------------------------------------------ */
  BT.state = { user: null, sede: 'ALL', tab: 'inicio', params: {}, sub: {} };

  BT.load = function () {
    try {
      const raw = localStorage.getItem(BT.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.meta && parsed.meta.version === BT.DATA_VERSION) {
          if (parsed.meta.seedDay === u.todayIso()) {
            BT.db = parsed;
            if (BT.simulateStaff) BT.simulateStaff(); // el resto del equipo "siguió trabajando" desde la última apertura
            BT.save();
            return true;
          }
          BT._reseededNewDay = true; // datos de otro día → se regeneran al día de hoy
        }
      }
    } catch (e) { /* almacenamiento no disponible */ }
    BT.db = BT.seed();
    BT.db.meta.seedDay = u.todayIso(); BT.db.meta.simAt = Date.now();
    BT.save();
    return false;
  };
  BT.save = function () {
    try { localStorage.setItem(BT.STORAGE_KEY, JSON.stringify(BT.db)); } catch (e) { /* sin persistencia */ }
    try { if (BT.state.user) sessionStorage.setItem('bt-session', JSON.stringify({ userId: BT.state.user.id, sede: BT.state.sede })); } catch (e) { }
  };
  BT.resetDemo = async function () {
    const ok = await BT.ui.confirm({
      title: 'Restablecer la demo',
      text: 'Se van a borrar todos los cambios hechos durante la presentación y se recargarán los datos originales. ¿Querés continuar?',
      ok: 'Restablecer', icon: 'rotate-ccw', tone: 'danger',
    });
    if (!ok) return;
    try { localStorage.removeItem(BT.STORAGE_KEY); } catch (e) { }
    BT.db = BT.seed(); BT.db.meta.seedDay = u.todayIso(); BT.db.meta.simAt = Date.now(); BT.save();
    BT.ui.toast('Demo restablecida', { sub: 'Los datos originales se cargaron de nuevo', icon: 'rotate-ccw' });
    BT.shell.render(); BT.render();
  };

  /** Filtra un array de objetos con .sede según la sede seleccionada */
  BT.inSede = function (x) { const s = BT.state.sede; return s === 'ALL' || !x.sede || x.sede === s || x.sede === 'ALL'; };
  BT.bySede = function (arr) { return arr.filter(BT.inSede); };
  BT.sedeLabel = function (s = BT.state.sede) { return s === 'ALL' ? 'Consolidado' : s; };
  BT.sedeName = function (s = BT.state.sede) { if (s === 'ALL') return 'Consolidado Galauru SAS'; const o = BT.db.sedes.find((x) => x.id === s); return o ? o.nombre : s; };
  BT.sedeTag = (s) => '<span class="sede-tag ' + s + '">' + s + '</span>';

  /* Accesos rápidos a datos */
  BT.resident = (id) => BT.db.residents.find((r) => r.id === id);
  BT.staffById = (id) => BT.db.staff.find((s) => s.id === id);
  BT.userById = (id) => BT.db.users.find((s) => s.id === id);
  BT.activeResidents = () => BT.db.residents.filter((r) => r.estado === 'activo');
  BT.residentsInSede = () => BT.bySede(BT.activeResidents());
  BT.fullName = (r) => r ? r.nombre + ' ' + r.apellido : '—';
  BT.shortName = (r) => r ? r.nombre.split(' ')[0] + ' ' + r.apellido.split(' ')[0] : '—';
  BT.lastBarthel = (r) => (r.barthel && r.barthel.length ? r.barthel[r.barthel.length - 1].score : 100);
  /** Clasificación de dependencia por índice de Barthel */
  BT.depGrade = function (score) {
    if (score < 20) return { label: 'Total', tone: 'danger' };
    if (score <= 35) return { label: 'Severa', tone: 'danger' };
    if (score <= 55) return { label: 'Moderada', tone: 'warn' };
    if (score < 100) return { label: 'Leve', tone: 'info' };
    return { label: 'Independiente', tone: 'ok' };
  };
  /** Ordenanza 1032/2019: dependiente para el ratio = Barthel 0–40 */
  BT.isDependent = (r) => BT.lastBarthel(r) <= 40;

  /* ------------------------------------------------------------------
     Roles y permisos
     ------------------------------------------------------------------ */
  BT.ROLES = {
    direccion: { label: 'Dirección', icon: 'building-2', desc: 'Visión completa de ambas sedes, personal y finanzas' },
    medico: { label: 'Médico Director Técnico', icon: 'stethoscope', desc: 'Historia clínica, indicaciones y medicación' },
    enfermeria: { label: 'Enfermería', icon: 'heart-pulse', desc: 'Medicación, curaciones, controles y turnos' },
    cuidadora: { label: 'Cuidadora', icon: 'hand-heart', desc: 'Ingreso con contraseña desde la tablet' },
    administracion: { label: 'Administración', icon: 'wallet', desc: 'Cobranzas, compras, sueldos y finanzas' },
    familiar: { label: 'Familiar', icon: 'users-round', desc: 'Portal de la familia: novedades y cuenta' },
  };
  BT.role = () => (BT.state.user ? BT.state.user.role : null);
  BT.isRole = (...r) => r.includes(BT.role());
  /** Permisos finos (Ley 18.331: acceso mínimo necesario) */
  const PERMS = {
    'clinical.read': ['direccion', 'medico', 'enfermeria', 'cuidadora'],
    'clinical.write': ['medico', 'enfermeria'],
    'clinical.indicate': ['medico'],
    'meds.administer': ['enfermeria', 'cuidadora'],
    'care.write': ['enfermeria', 'cuidadora', 'medico'],
    'staff.manage': ['direccion', 'administracion'],
    'shifts.edit': ['direccion', 'enfermeria'],
    'money.read': ['direccion', 'administracion'],
    'money.write': ['administracion', 'direccion'],
    'config': ['direccion'],
    'audit.read': ['direccion', 'medico'],
  };
  BT.can = (perm) => (PERMS[perm] || []).includes(BT.role());
  BT.PERMS = PERMS;

  /* ------------------------------------------------------------------
     Auditoría (inmutable: solo se agrega)
     ------------------------------------------------------------------ */
  BT.audit = function (action, target, opts = {}) {
    const usr = BT.state.user || { id: 'sistema', nombre: 'Sistema', role: 'sistema' };
    const entry = Object.freeze({
      id: u.uid('au'), ts: Date.now(), userId: usr.id, userName: usr.nombre, role: usr.role,
      action, target, residentId: opts.residentId || null, detail: opts.detail || '', sede: opts.sede || (opts.residentId && BT.resident(opts.residentId) ? BT.resident(opts.residentId).sede : BT.state.sede),
      ip: '192.168.1.' + (20 + (u.hash(usr.id) % 40)), device: ({ cuidadora: 'Tablet ' + (usr.sede || ''), medico: 'PC Consultorio', enfermeria: 'PC Enfermería', administracion: 'PC Administración', familiar: 'Portal web', direccion: 'PC Dirección' })[usr.role] || 'Sistema',
    });
    BT.db.audit.push(entry);
    BT.save();
    BT.emit('audit', entry);
    return entry;
  };

  /* ------------------------------------------------------------------
     Alertas (cada módulo puede aportar proveedores)
     alerta: { id, tone:'danger'|'warn'|'info'|'ok', icon, title, desc, tab, params, sede, when, roles? }
     ------------------------------------------------------------------ */
  BT.alertProviders = [];
  BT.addAlerts = (fn) => BT.alertProviders.push(fn);
  BT.alerts = function () {
    let out = [];
    BT.alertProviders.forEach((fn) => { try { out = out.concat(fn() || []); } catch (e) { console.error(e); } });
    const role = BT.role();
    out = out.filter((a) => (!a.roles || a.roles.includes(role)) && (!a.sede || BT.inSede(a)));
    // Privacidad (Ley 18.331): el familiar solo ve avisos de su propio portal
    if (role === 'familiar') out = out.filter((a) => String(a.id || '').startsWith('fam-'));
    const order = { danger: 0, warn: 1, info: 2, ok: 3 };
    return out.sort((a, b) => (order[a.tone] ?? 9) - (order[b.tone] ?? 9));
  };

  /* Acciones globales que registran los módulos (abrir ficha, etc.) */
  BT.actions = {};

  /** CSS propio de un módulo (se inyecta una sola vez). BT.addCSS('personal', '.x{...}') */
  BT.addCSS = function (key, css) {
    if (document.getElementById('css-' + key)) return;
    const s = document.createElement('style'); s.id = 'css-' + key; s.textContent = css; document.head.appendChild(s);
  };

  /* ------------------------------------------------------------------
     Pestañas y enrutador
     ------------------------------------------------------------------ */
  BT.tabs = [];
  /**
   * BT.tab({ id, label, icon, group, order, roles:[...], badge:()=>n, render(el, params) })
   */
  BT.tab = function (def) { BT.tabs.push(def); BT.tabs.sort((a, b) => (a.order || 0) - (b.order || 0)); };
  BT.visibleTabs = () => BT.tabs.filter((t) => !t.roles || t.roles.includes(BT.role()));
  BT.go = function (id, params = {}) {
    BT.state.params = params;
    const h = '#/' + id;
    if (location.hash !== h) { BT._pendingParams = params; location.hash = h; } else BT.render();
  };
  BT._charts = [];
  BT.render = function () {
    const root = document.getElementById('content');
    if (!root || !BT.state.user) return;
    BT._charts.forEach((c) => { try { c.destroy(); } catch (e) { } });
    BT._charts = [];
    let tab = BT.visibleTabs().find((t) => t.id === BT.state.tab) || BT.visibleTabs()[0];
    BT.state.tab = tab.id;
    root.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'page';
    page.dataset.tab = tab.id;
    root.appendChild(page);
    try { tab.render(page, BT.state.params || {}); }
    catch (e) { console.error(e); page.innerHTML = BT.ui.empty({ icon: 'bug', title: 'No se pudo mostrar esta sección', text: String(e.message || e) }); }
    BT.ui.enhance(page);
    BT.shell.updateNav();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  };
  /** Vuelve a dibujar la pestaña actual sin mover el scroll */
  BT.refresh = function () {
    const y = window.scrollY; const root = document.getElementById('content'); if (!root) return;
    BT._charts.forEach((c) => { try { c.destroy(); } catch (e) { } }); BT._charts = [];
    const tab = BT.visibleTabs().find((t) => t.id === BT.state.tab); if (!tab) return;
    const page = document.createElement('div'); page.className = 'page no-anim'; page.style.animation = 'none'; page.dataset.tab = tab.id;
    root.innerHTML = ''; root.appendChild(page);
    tab.render(page, BT.state.params || {});
    BT.ui.enhance(page, { quiet: true });
    BT.shell.updateNav();
    window.scrollTo(0, y);
  };
  window.addEventListener('hashchange', () => {
    const id = (location.hash.match(/^#\/([\w-]+)/) || [])[1];
    if (!id || !BT.state.user) return;
    BT.state.tab = id;
    BT.state.params = BT._pendingParams || {};
    BT._pendingParams = null;
    BT.render();
  });

  /* ------------------------------------------------------------------
     Gráficos (Chart.js con tema de la marca)
     ------------------------------------------------------------------ */
  BT.COLORS = {
    BT1: '#297040', BT2: '#6b5ba8', ALL: '#393939',
    brand: '#297040', brandLight: '#8fc49f', ink: '#393939', ok: '#2f7d4a', warn: '#d99a2b', danger: '#c4473c', info: '#3f78b5',
    cat: ['#297040', '#8fc49f', '#393939', '#c9a26b', '#6b5ba8', '#5d8fcb', '#d98c5f', '#a8a39a', '#3f9d8f', '#b5677a'],
  };
  BT.alpha = (hex, a) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };
  BT.chartDefaults = function () {
    if (!window.Chart || BT._chartDefaultsSet) return; BT._chartDefaultsSet = true;
    const C = window.Chart;
    C.defaults.font.family = getComputedStyle(document.body).fontFamily;
    C.defaults.font.size = 12;
    C.defaults.color = '#7b7770';
    C.defaults.borderColor = 'rgba(38,34,28,.07)';
    C.defaults.plugins.legend.display = false;
    C.defaults.plugins.tooltip.backgroundColor = '#262625';
    C.defaults.plugins.tooltip.padding = 10;
    C.defaults.plugins.tooltip.cornerRadius = 8;
    C.defaults.plugins.tooltip.titleFont = { weight: '600', size: 12 };
    C.defaults.plugins.tooltip.bodyFont = { size: 12 };
    C.defaults.plugins.tooltip.boxPadding = 4;
    C.defaults.plugins.tooltip.usePointStyle = true;
    C.defaults.elements.line.tension = 0.35;
    C.defaults.elements.line.borderWidth = 2.25;
    C.defaults.elements.point.radius = 0;
    C.defaults.elements.point.hoverRadius = 5;
    C.defaults.elements.point.hitRadius = 12;
    C.defaults.elements.bar.borderRadius = 6;
    C.defaults.elements.bar.borderSkipped = false;
    C.defaults.animation.duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900;
    C.defaults.animation.easing = 'easeOutQuart';
    C.defaults.maintainAspectRatio = false;
    C.defaults.scale.grid.drawTicks = false;
    C.defaults.scale.border = { display: false };
  };
  /** Dibuja un gráfico y lo registra para destruirlo al cambiar de pestaña. canvas: elemento o selector */
  BT.chart = function (canvas, config, root = document) {
    BT.chartDefaults();
    const el = typeof canvas === 'string' ? root.querySelector(canvas) : canvas;
    if (!el || !window.Chart) return null;
    const ch = new window.Chart(el, config);
    BT._charts.push(ch);
    return ch;
  };
  /** Formateador de ejes en $U */
  BT.moneyTick = (v) => (Math.abs(v) >= 1e6 ? (v / 1e6).toLocaleString('es-UY', { maximumFractionDigits: 1 }) + ' M' : Math.abs(v) >= 1e3 ? Math.round(v / 1e3) + ' k' : v);
})();

/* ==========================================================================
   Configuración: usuarios, roles y permisos, sedes, parámetros y registro de accesos
   ========================================================================== */
(function () {
  'use strict';
  const BT = window.BT; const u = BT.u; const ui = BT.ui; const ic = BT.ic; const esc = u.esc;
  const ROLE_KEYS = Object.keys(BT.ROLES);
  const PERM_LABELS = [
    ['clinical.read', 'Ver historia clínica', 'stethoscope'],
    ['clinical.write', 'Registrar evoluciones y curaciones', 'notebook-pen'],
    ['clinical.indicate', 'Indicar o modificar medicación', 'pill'],
    ['meds.administer', 'Registrar administración de dosis', 'circle-check'],
    ['care.write', 'Registrar cuidados e incidentes', 'hand-heart'],
    ['shifts.edit', 'Editar el planificador de turnos', 'calendar-days'],
    ['staff.manage', 'Gestionar legajos, licencias y faltas', 'id-card'],
    ['money.read', 'Ver cobranzas y finanzas', 'wallet'],
    ['money.write', 'Cargar facturas y registrar pagos', 'receipt'],
    ['audit.read', 'Consultar auditoría de accesos', 'history'],
    ['config', 'Configurar el sistema', 'settings'],
  ];
  const ACTION_TONE = { 'Abrió': 'info', 'Leyó': 'outline', 'Modificó': 'warn', 'Creó': 'brand', 'Enmendó': 'warn', 'Exportó': 'violet', 'Administró': 'ok', 'Acceso denegado': 'danger', 'Ingresó al sistema': '', 'Cerró sesión': '', 'Registró egreso': 'dark' };

  BT.addCSS('cfg', `
    .perm-grid th, .perm-grid td { text-align: center; }
    .perm-grid th:first-child, .perm-grid td:first-child { text-align: left; }
    .perm-yes { width: 24px; height: 24px; border-radius: 50%; display: inline-grid; place-items: center; background: var(--brand-600); color: #fff; box-shadow: 0 2px 6px -2px color-mix(in srgb, var(--brand-600) 60%, transparent); }
    .perm-yes svg { width: 13px; height: 13px; stroke-width: 3; }
    .perm-no { width: 8px; height: 8px; border-radius: 50%; display: inline-block; background: var(--ink-200); }
    .perm-grid tbody tr:hover .perm-yes { transform: scale(1.08); transition: transform var(--d) var(--ease-spring); }
    .perm-grid thead th .rl { display: flex; flex-direction: column; align-items: center; gap: 4px; text-transform: none; letter-spacing: 0; font-size: 11.5px; color: var(--ink-800); }
    .perm-grid thead th .rl span { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; background: var(--brand-50); color: var(--brand-600); }
    .cfg-sede .hero { border-radius: var(--r-md); padding: 18px; color: #fff; position: relative; overflow: hidden; }
    .cfg-sede .hero::after { content: ""; position: absolute; right: -40px; top: -40px; width: 160px; height: 160px; border-radius: 50%; background: rgba(255,255,255,.1); }
    .cfg-param { display: grid; grid-template-columns: 1fr 110px; gap: 12px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--ink-100); }
    .cfg-param:last-child { border-bottom: 0; }
    .cfg-prev { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .cfg-prev .c { border: 1px solid var(--line); border-radius: var(--r-md); padding: 10px; text-align: center; background: #fff; transition: all var(--d) var(--ease); }
    .cfg-prev .c b { display: block; font-size: 22px; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
    .cfg-prev .c.chg { border-color: var(--brand-400); background: var(--brand-50); animation: pop 380ms var(--ease-spring); }
    .lock-note { display: flex; gap: 12px; align-items: center; padding: 12px 16px; border-radius: var(--r-md); background: linear-gradient(90deg, var(--ink-800), var(--ink-950)); color: #fff; font-size: var(--fs-sm); }
    .lock-note .ic { color: var(--brand-300); }
  `);

  /** Permiso de un rol cualquiera (evalúa BT.can con el rol indicado) */
  function roleCan(role, perm) { const prev = BT.state.user; BT.state.user = Object.assign({}, prev || {}, { role }); try { return BT.can(perm); } finally { BT.state.user = prev; } }
  function roleTabs(role) { return BT.tabs.filter((t) => !t.roles || t.roles.includes(role)).map((t) => t.id); }
  const lastLogin = (uid) => { const a = BT.db.audit.filter((x) => x.userId === uid && x.action === 'Ingresó al sistema'); return a.length ? a[a.length - 1].ts : null; };

  function render(el) {
    const today = u.todayIso();
    const hoy = BT.db.audit.filter((a) => u.iso(a.ts) === today).length;
    const clin7 = BT.db.audit.filter((a) => a.residentId && Date.now() - a.ts < 7 * 864e5).length;
    const den = BT.db.audit.filter((a) => a.action === 'Acceso denegado').length;
    el.innerHTML = ui.pageHeader({
      eyebrow: 'Configuración', icon: 'settings', title: 'Usuarios, permisos y parámetros',
      sub: esc(BT.db.meta.company) + ' · RUT ' + esc(BT.db.meta.rut) + ' · 2 sedes',
      actions: '<button class="btn danger" data-act="reset">' + ic('rotate-ccw') + 'Restablecer demo</button>',
    }) +
      '<div class="grid g-4 stagger mb-16">' +
      ui.kpi({ label: 'Usuarios activos', value: BT.db.users.filter((x) => x.activo !== false).length, icon: 'users', foot: ROLE_KEYS.length + ' roles definidos' }) +
      ui.kpi({ label: 'Accesos hoy', value: hoy, icon: 'log-in', tone: 'info', foot: 'Registrados automáticamente' }) +
      ui.kpi({ label: 'Accesos clínicos (7 días)', value: clin7, icon: 'shield-check', tone: 'ink', foot: 'Historias clínicas auditadas' }) +
      ui.kpi({ label: 'Accesos denegados', value: den, icon: 'shield-x', tone: den ? 'danger' : 'ink', foot: 'Intentos fuera de permiso' }) +
      '</div><div id="cfgTabs"></div>';
    ui.on(el, { reset: () => BT.resetDemo() });
    ui.subtabs(el.querySelector('#cfgTabs'), 'cfg', [
      { id: 'users', label: 'Usuarios', icon: 'users' },
      { id: 'roles', label: 'Roles y permisos', icon: 'key-round' },
      { id: 'sedes', label: 'Sedes', icon: 'building-2' },
      { id: 'params', label: 'Parámetros', icon: 'sliders-horizontal' },
      { id: 'audit', label: 'Registro de accesos', icon: 'history' },
      { id: 'theme', label: 'Apariencia', icon: 'palette' },
    ], (p, id) => ({ users: renderUsers, roles: renderRoles, sedes: renderSedes, params: renderParams, audit: renderAudit, theme: renderTheme }[id](p)));
  }


  /* ---------------- Apariencia: paletas de color ---------------- */
  BT.addCSS('apariencia', `
    .pal-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
    .pal{position:relative;text-align:left;border:1.5px solid var(--line);border-radius:18px;background:var(--surface);padding:0;overflow:hidden;cursor:pointer;transition:transform var(--d-fast) var(--ease),box-shadow var(--d-fast) var(--ease),border-color var(--d-fast)}
    .pal:hover{transform:translateY(-3px);box-shadow:var(--sh-3)}
    .pal.on{border-color:var(--ink-900);box-shadow:0 0 0 3px var(--surface),0 0 0 5px var(--ink-900)}
    .pal-mock{display:grid;grid-template-columns:34% 1fr;height:104px}
    .pal-mock .sb{padding:10px 8px;display:flex;flex-direction:column;gap:6px}
    .pal-mock .sb i{display:block;height:7px;border-radius:4px;background:rgba(255,255,255,.22)}
    .pal-mock .sb i.a{background:rgba(255,255,255,.55);width:80%}
    .pal-mock .mn{padding:10px;display:flex;flex-direction:column;gap:7px;background:#f6f5f1}
    .pal-mock .hero{height:34px;border-radius:9px}
    .pal-mock .row2{display:flex;gap:6px}
    .pal-mock .row2 span{flex:1;height:22px;border-radius:7px}
    .pal-b{padding:12px 14px 14px}
    .pal-b b{display:block;font-size:var(--fs-md);color:var(--ink-950)}
    .pal-b small{color:var(--ink-500);font-size:var(--fs-xs)}
    .pal-sw{display:flex;gap:4px;margin-top:10px}
    .pal-sw i{flex:1;height:14px;border-radius:4px}
    .pal .on-badge{position:absolute;top:8px;right:8px;display:none}
    .pal.on .on-badge{display:inline-flex}
    .pal-prev{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
  `);
  function renderTheme(p) {
    const cur = BT.theme.current().id;
    p.innerHTML = '<section class="card"><div class="card-h"><div><h3>' + ic('palette') + 'Paleta de colores</h3><div class="sub">Elegí los colores de la interfaz. El cambio se aplica al instante en todas las pantallas y en los PDF.</div></div></div><div class="card-b"><div class="pal-grid">' +
      BT.PALETTES.map((x) => { const s = x.scale; return '<button type="button" class="pal' + (x.id === cur ? ' on' : '') + '" data-pal="' + x.id + '" aria-pressed="' + (x.id === cur) + '">' +
        '<span class="on-badge badge ok">' + ic('check', 'ic-xs') + 'En uso</span>' +
        '<div class="pal-mock"><div class="sb" style="background:linear-gradient(185deg,' + s[800] + ',' + s[950] + ')"><i class="a"></i><i></i><i></i><i></i></div><div class="mn"><div class="hero" style="background:linear-gradient(135deg,' + s[600] + ',' + s[900] + ')"></div><div class="row2"><span style="background:' + s[100] + '"></span><span style="background:' + s[300] + '"></span><span style="background:#fff;border:1px solid ' + s[200] + '"></span></div></div></div>' +
        '<div class="pal-b"><b>' + esc(x.name) + '</b><small>' + esc(x.desc) + '</small><div class="pal-sw">' + [950, 700, 600, 400, 200, 50].map((k) => '<i style="background:' + s[k] + '"></i>').join('') + '</div></div></button>'; }).join('') +
      '</div></div></section>' +
      '<section class="card mt-16"><div class="card-h"><div><h3>' + ic('eye') + 'Vista previa</h3><div class="sub">Así se ven los elementos principales con la paleta elegida</div></div></div><div class="card-b"><div class="pal-prev">' +
      '<button class="btn primary">' + ic('plus') + 'Botón principal</button><button class="btn soft">' + ic('check') + 'Botón suave</button>' + ui.badge('Etiqueta', 'brand', { icon: 'sparkles' }) + ui.badge('Al día', 'ok', { icon: 'circle-check' }) + ui.badge('Vencido', 'danger', { icon: 'circle-alert' }) +
      '<span class="switch"><input type="checkbox" checked aria-label="Ejemplo"><span></span></span></div>' +
      '<p class="muted mt-16" style="font-size:var(--fs-sm)">' + ic('info', 'ic-xs') + ' Los colores de estado (al día, pendiente, vencido) no cambian, para que siempre se lean igual.</p></div></section>';
    p.querySelectorAll('[data-pal]').forEach((b) => b.addEventListener('click', () => {
      const pal = BT.theme.apply(b.dataset.pal, { save: true });
      BT.audit('Cambió la paleta de colores', 'Configuración', { detail: pal.name });
      ui.toast('Paleta «' + pal.name + '» aplicada', { icon: 'palette', sub: 'Se ve en todas las pantallas y en los PDF' });
      BT.refresh();
    }));
  }

  /* ---------------- Usuarios ---------------- */
  function renderUsers(p) {
    const list = BT.db.users;
    p.innerHTML = '<section class="card"><div class="card-h"><div><h3>' + ic('users') + 'Usuarios del sistema</h3><div class="sub">Cada persona ingresa con su propio usuario: todo lo que hace queda registrado a su nombre</div></div><button class="btn sm primary" data-act="new">' + ic('user-plus') + 'Nuevo usuario</button></div><div class="card-b flush">' +
      ui.table([
        { label: 'Usuario', render: (x) => ui.person(x.nombre, esc(x.cargo || '') + (x.email ? ' · ' + esc(x.email) : '')) },
        { label: 'Rol', render: (x) => ui.badge(BT.ROLES[x.role].label, x.role === 'familiar' ? 'violet' : x.role === 'direccion' ? 'dark' : 'brand', { icon: BT.ROLES[x.role].icon }) },
        { label: 'Sede', render: (x) => (x.sede === 'ALL' ? ui.badge('Ambas', 'outline') : BT.sedeTag(x.sede)) },
        { label: 'Acceso', render: (x) => '<span class="muted" style="font-size:var(--fs-sm)">' + (x.role === 'cuidadora' ? ic('key-round', 'ic-xs') + ' Contraseña + QR' : x.role === 'familiar' ? ic('smartphone', 'ic-xs') + ' Portal web' : ic('fingerprint', 'ic-xs') + ' Usuario + 2FA') + '</span>' },
        { label: 'Último ingreso', render: (x) => { const t = lastLogin(x.id); return t ? ui.relTime(t) : '<span class="subtle">Nunca</span>'; } },
        { label: 'Activo', align: 'center', render: (x) => '<label class="switch" style="display:inline-block" data-tip="' + (x.id === BT.state.user.id ? 'No podés desactivar tu propio usuario' : 'Activar / desactivar') + '"><input type="checkbox" data-uid="' + x.id + '" ' + (x.activo !== false ? 'checked' : '') + (x.id === BT.state.user.id ? ' disabled' : '') + '><span></span></label>' },
      ], list, { rowAttrs: (x) => (x.activo === false ? 'style="opacity:.55"' : '') }) + '</div></section>';
    p.querySelectorAll('[data-uid]').forEach((c) => c.addEventListener('change', () => {
      const x = BT.userById(c.dataset.uid); x.activo = c.checked;
      BT.audit('Modificó', 'Usuario del sistema', { detail: x.nombre + (c.checked ? ' activado' : ' desactivado') }); BT.save();
      c.closest('tr').style.opacity = c.checked ? '' : '.55';
      ui.toast(c.checked ? 'Usuario activado' : 'Usuario desactivado', { sub: x.nombre, icon: c.checked ? 'user-check' : 'user-x' });
    }));
    ui.on(p, { new: () => newUser(p) });
  }
  function newUser(p) {
    ui.modal({
      title: 'Nuevo usuario', sub: 'Recibirá un correo para crear su contraseña (simulado)', icon: 'user-plus',
      body: '<form class="form-grid" id="nuForm">' + ui.field({ label: 'Nombre y apellido', name: 'nombre', required: true, full: true }) +
        ui.field({ label: 'Rol', name: 'role', type: 'select', required: true, options: ROLE_KEYS.map((k) => ({ v: k, l: BT.ROLES[k].label })), value: 'cuidadora' }) +
        ui.field({ label: 'Sede', name: 'sede', type: 'select', options: [{ v: 'BT1', l: 'BT1 · Malvín' }, { v: 'BT2', l: 'BT2 · Unión' }, { v: 'ALL', l: 'Ambas sedes' }], value: BT.state.sede === 'ALL' ? 'BT1' : BT.state.sede }) +
        ui.field({ label: 'Cargo', name: 'cargo', placeholder: 'Ej.: Cuidadora · BT1' }) + ui.field({ label: 'Correo electrónico', name: 'email', type: 'email' }) + '</form>' +
        '<div class="alert info mt-16">' + ic('shield-check') + '<div>El rol define qué ve. Para roles con acceso clínico se exige doble factor y cada apertura de historia clínica queda auditada (Ley 18.331).</div></div>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>' + ic('check') + 'Crear usuario</button>',
      onMount: (m, close) => m.querySelector('[data-save]').addEventListener('click', () => {
        const f = m.querySelector('#nuForm'); if (!ui.validate(f)) return; const d = ui.formData(f);
        const x = { id: u.uid('u'), nombre: d.nombre, role: d.role, sede: d.sede, cargo: d.cargo || BT.ROLES[d.role].label, email: d.email, activo: true };
        if (d.role === 'cuidadora') x.password = '1234';
        BT.db.users.push(x); BT.audit('Creó', 'Usuario del sistema', { detail: d.nombre + ' · ' + BT.ROLES[d.role].label }); BT.save();
        close(); renderUsers(p); ui.enhance(p);
        ui.toast('Usuario creado', { sub: d.nombre + (x.password ? ' · contraseña inicial ' + x.password : ''), icon: 'user-plus' });
      }),
    });
  }

  /* ---------------- Roles y permisos ---------------- */
  function renderRoles(p) {
    const head = '<tr><th>Sección</th>' + ROLE_KEYS.map((k) => '<th><div class="rl"><span>' + ic(BT.ROLES[k].icon, 'ic-sm') + '</span>' + BT.ROLES[k].label.replace('Médico Director Técnico', 'Médico D.T.') + '</div></th>').join('') + '</tr>';
    const yes = '<span class="perm-yes">' + ic('check') + '</span>'; const no = '<span class="perm-no"></span>';
    const tabsRows = BT.tabs.map((t) => '<tr><td><div class="row">' + ic(t.icon, 'ic-sm subtle') + '<span class="strong" style="font-size:var(--fs-md)">' + esc(t.label) + '</span></div></td>' + ROLE_KEYS.map((k) => '<td>' + (roleTabs(k).includes(t.id) ? yes : no) + '</td>').join('') + '</tr>').join('');
    const permRows = PERM_LABELS.map(([perm, label, icn]) => '<tr><td><div class="row">' + ic(icn, 'ic-sm subtle') + '<span style="font-size:var(--fs-md)">' + label + '</span></div></td>' + ROLE_KEYS.map((k) => '<td>' + (roleCan(k, perm) ? yes : no) + '</td>').join('') + '</tr>').join('');
    p.innerHTML = '<div class="alert info mb-16">' + ic('shield-check') + '<div><b>Principio de acceso mínimo (Ley 18.331).</b> Cada rol ve únicamente lo necesario para su tarea. Administración no accede a datos clínicos; la familia solo ve la información de su familiar.</div></div>' +
      '<div class="grid g-2"><section class="card"><div class="card-h"><div><h3>' + ic('layout-grid') + 'Secciones visibles por rol</h3><div class="sub">Lo que aparece en el menú de cada perfil</div></div></div><div class="card-b flush"><div class="table-wrap"><table class="table compact perm-grid"><thead>' + head + '</thead><tbody>' + tabsRows + '</tbody></table></div></div></section>' +
      '<section class="card"><div class="card-h"><div><h3>' + ic('key-round') + 'Permisos de acción</h3><div class="sub">Qué puede registrar o modificar cada rol</div></div></div><div class="card-b flush"><div class="table-wrap"><table class="table compact perm-grid"><thead>' + head.replace('Sección', 'Permiso') + '</thead><tbody>' + permRows + '</tbody></table></div></div></section></div>';
  }

  /* ---------------- Sedes ---------------- */
  function renderSedes(p) {
    p.innerHTML = '<div class="grid g-2 stagger">' + BT.db.sedes.map((s) => {
      const o = BT.occupancy(s.id); const req = BT.ratioRequired()[s.id];
      const staff = BT.db.staff.filter((x) => x.sede === s.id).length;
      const comp = BT.db.compliance.filter((c) => c.sede === s.id || c.sede === 'ALL');
      const venc = comp.filter((c) => u.daysUntil(c.vence) < 0).length;
      return '<section class="card cfg-sede"><div class="card-b"><div class="hero" style="background:linear-gradient(135deg,' + BT.COLORS[s.id] + ',' + BT.alpha(BT.COLORS[s.id], 0.75) + ')"><div class="row between"><div><div style="font-size:var(--fs-xs);opacity:.8;font-weight:600;letter-spacing:.06em;text-transform:uppercase">' + s.id + '</div><div style="font-size:var(--fs-2xl);font-weight:700;letter-spacing:-.02em">' + esc(s.nombre) + '</div><div style="opacity:.85;font-size:var(--fs-sm)">' + esc(s.direccion) + ' · ' + esc(s.barrio) + '</div></div>' + ic('building-2', 'ic-xl') + '</div></div>' +
        '<div class="kv-cards mt-16"><div class="kv-card"><div class="k">' + ic('bed-double', 'ic-xs') + 'Camas habilitadas</div><div class="v num">' + s.camas + ' · ' + s.habitaciones.length + ' habitaciones</div></div><div class="kv-card"><div class="k">' + ic('gauge', 'ic-xs') + 'Ocupación</div><div class="v num">' + o.ocupadas + '/' + o.camas + ' (' + u.fmtPct(o.pct, 0) + ')</div></div>' +
        '<div class="kv-card"><div class="k">' + ic('users', 'ic-xs') + 'Dependientes (Barthel ≤ 40)</div><div class="v num">' + req.dep + ' de ' + req.total + '</div></div><div class="kv-card"><div class="k">' + ic('scale', 'ic-xs') + 'Ratio requerido</div><div class="v num">Día ' + req.M + ' · Noche ' + req.N + '</div></div>' +
        '<div class="kv-card"><div class="k">' + ic('id-card', 'ic-xs') + 'Personal asignado</div><div class="v num">' + staff + ' funcionarias</div></div><div class="kv-card"><div class="k">' + ic('shield-check', 'ic-xs') + 'Habilitaciones</div><div class="v">' + (venc ? '<span class="t-danger">' + venc + ' vencida' + (venc > 1 ? 's' : '') + '</span>' : '<span class="t-ok">Al día</span>') + '</div></div></div>' +
        '<div class="mt-16">' + ui.kv([['Teléfono', '<span class="num">' + esc(s.tel) + '</span>'], ['Correo', esc(s.email)], ['Razón social', esc(BT.db.meta.company) + ' · RUT <span class="num">' + esc(BT.db.meta.rut) + '</span>'], ['Dirección técnica', 'Dr. Fernando Aguirre'], ['Reservas activas', s.reservadas.length ? s.reservadas.map((b) => ui.badge('Cama ' + b, 'warn', { icon: 'lock' })).join(' ') : 'Ninguna']]) + '</div></div></section>';
    }).join('') + '</div>';
  }

  /* ---------------- Parámetros ---------------- */
  function renderParams(p) {
    const R = Object.assign({}, BT.db.settings.ratio);
    const ratioFields = [
      ['diaDep', 'Turnos mañana y tarde · residentes dependientes', 'Una cuidadora cada N residentes con Barthel 0–40'],
      ['diaInd', 'Turnos mañana y tarde · residentes no dependientes', 'Una cuidadora cada N residentes con Barthel > 40'],
      ['nocheDep', 'Turno noche · residentes dependientes', 'Una cuidadora cada N residentes con Barthel 0–40'],
      ['nocheInd', 'Turno noche · residentes no dependientes', 'Una cuidadora cada N residentes con Barthel > 40'],
    ];
    p.innerHTML = '<div class="grid g-main"><section class="card"><div class="card-h"><div><h3>' + ic('scale') + 'Ratio de cuidadoras por turno</h3><div class="sub">Decreto 356/016 (art. 19) · Ordenanza 1032/2019 del MSP</div></div></div><div class="card-b">' +
      '<div class="alert warn mb-16">' + ic('info') + '<div>Valores configurables. Se precargan de referencia: <b>validalos con la normativa vigente</b> antes de usarlos en producción. La dependencia se calcula automáticamente con el último índice de Barthel de cada residente.</div></div>' +
      ratioFields.map(([k, t, h]) => '<div class="cfg-param"><div><div class="strong" style="font-size:var(--fs-md)">' + t + '</div><div class="muted" style="font-size:var(--fs-xs)">' + h + '</div></div><input class="input num" type="number" min="1" max="40" data-r="' + k + '" value="' + R[k] + '" style="text-align:right"></div>').join('') +
      '<div class="sec-t mt-16">Vista previa · cuidadoras requeridas</div><div class="grid g-2" id="cfgPrev"></div></div>' +
      '<div class="card-f row between"><span class="muted" style="font-size:var(--fs-sm)" id="cfgDirty">Sin cambios</span><button class="btn primary sm" data-act="save-ratio" disabled>' + ic('check') + 'Guardar parámetros</button></div></section>' +
      '<div class="col gap-16"><section class="card"><div class="card-h"><div><h3>' + ic('receipt') + 'Cobranzas y facturación</h3><div class="sub">Se aplican a cuotas y facturas</div></div></div><div class="card-b"><form class="form-grid" id="cfgBill">' +
      ui.field({ label: 'Día de vencimiento de la cuota', name: 'dueDay', type: 'number', value: BT.db.settings.dueDay, attrs: 'min="1" max="28"', hint: 'Pasado este día, el saldo se considera vencido' }) +
      ui.field({ label: 'IVA servicios (%)', name: 'iva', type: 'number', value: Math.round(BT.db.settings.iva * 100), attrs: 'min="0" max="22"', hint: 'Tasa mínima aplicada en la demo' }) +
      '</form></div><div class="card-f row" style="justify-content:flex-end"><button class="btn sm" data-act="save-bill">' + ic('check') + 'Guardar</button></div></section>' +
      '<section class="card tint"><div class="card-b"><div class="row top gap-16"><span class="k-ic" style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:#fff;color:var(--brand-600);flex:none;box-shadow:var(--sh-1)">' + ic('shield-check') + '</span><div><div class="strong">Protección de datos de salud</div><p class="muted mt-8" style="font-size:var(--fs-sm)">Los datos clínicos son <b>datos sensibles</b> (Ley 18.331). El sistema registra quién abre, lee o modifica cada historia clínica; las correcciones se hacen como enmienda y el registro original nunca se borra.</p></div></div></div></section></div></div>';
    const prev = (anim) => {
      const req = BT.ratioRequiredStatic({ settings: { ratio: R }, residents: BT.db.residents });
      const cur = BT.ratioRequired();
      p.querySelector('#cfgPrev').innerHTML = ['BT1', 'BT2'].map((s) => '<div><div class="row between mb-8"><span class="strong">' + BT.sedeTag(s) + ' ' + esc(BT.sedeName(s)) + '</span><span class="muted" style="font-size:var(--fs-xs)">' + req[s].dep + ' dep. · ' + req[s].ind + ' no dep.</span></div><div class="cfg-prev">' + ['M', 'T', 'N'].map((t) => '<div class="c ' + (anim && req[s][t] !== cur[s][t] ? 'chg' : '') + '"><span class="muted" style="font-size:var(--fs-xs)">' + u.SHIFTS[t].label + '</span><b>' + req[s][t] + '</b>' + (req[s][t] !== cur[s][t] ? '<span style="font-size:10.5px" class="t-brand strong">antes ' + cur[s][t] + '</span>' : '<span style="font-size:10.5px" class="subtle">cuidadora' + (req[s][t] > 1 ? 's' : '') + '</span>') + '</div>').join('') + '</div></div>').join('');
    };
    prev(false);
    const btn = p.querySelector('[data-act="save-ratio"]');
    p.querySelectorAll('[data-r]').forEach((i) => i.addEventListener('input', () => {
      R[i.dataset.r] = Math.max(1, +i.value || 1); prev(true);
      const dirty = ratioFields.some(([k]) => R[k] !== BT.db.settings.ratio[k]);
      btn.disabled = !dirty; p.querySelector('#cfgDirty').textContent = dirty ? 'Cambios sin guardar' : 'Sin cambios';
    }));
    ui.on(p, {
      'save-ratio': () => {
        const before = JSON.stringify(BT.db.settings.ratio);
        BT.db.settings.ratio = Object.assign({}, R);
        BT.audit('Modificó', 'Parámetros de ratio de cuidadoras', { detail: before + ' → ' + JSON.stringify(R) }); BT.save();
        btn.disabled = true; p.querySelector('#cfgDirty').textContent = 'Guardado ' + u.fmtTime(new Date()); prev(false);
        BT.shell.updateNav();
        ui.toast('Parámetros guardados', { sub: 'El control de ratio se recalculó en todas las pantallas', icon: 'scale' });
      },
      'save-bill': () => {
        const d = ui.formData(p.querySelector('#cfgBill'));
        BT.db.settings.dueDay = u.clamp(+d.dueDay || 10, 1, 28); BT.db.settings.iva = u.clamp(+d.iva || 0, 0, 22) / 100;
        BT.audit('Modificó', 'Parámetros de facturación', { detail: 'Vencimiento día ' + BT.db.settings.dueDay + ' · IVA ' + Math.round(BT.db.settings.iva * 100) + ' %' }); BT.save();
        ui.toast('Parámetros de facturación guardados', { icon: 'receipt' });
      },
    });
  }

  /* ---------------- Registro de accesos ---------------- */
  function filtered() {
    const f = BT.state.sub.cfgF || {};
    return BT.db.audit.filter((a) => (!f.user || a.userId === f.user) && (!f.action || a.action === f.action) && (!f.desde || u.iso(a.ts) >= f.desde) && (!f.hasta || u.iso(a.ts) <= f.hasta) && (!f.clin || a.residentId) && (!f.q || u.norm(a.userName + ' ' + a.target + ' ' + a.detail + ' ' + (a.residentId && BT.resident(a.residentId) ? BT.fullName(BT.resident(a.residentId)) : '')).includes(u.norm(f.q))) && BT.inSede(a)).sort((a, b) => b.ts - a.ts);
  }
  function renderAudit(p) {
    const f = BT.state.sub.cfgF = BT.state.sub.cfgF || {};
    const rows = filtered(); const LIM = 150;
    const users = BT.db.users; const actions = [...new Set(BT.db.audit.map((a) => a.action))].sort();
    p.innerHTML = '<div class="lock-note mb-16">' + ic('lock', 'ic-lg') + '<div class="grow"><b>Registro inmutable.</b> Los registros no se pueden editar ni borrar: cada acceso queda con usuario, fecha y hora, dispositivo e IP.</div>' + ui.badge(u.fmtNum(BT.db.audit.length) + ' registros', 'brand') + '</div>' +
      '<section class="card"><div class="card-h"><div><h3>' + ic('history') + 'Registro general de accesos</h3><div class="sub">' + (rows.length > LIM ? 'Mostrando los ' + LIM + ' más recientes de ' + u.fmtNum(rows.length) : u.fmtNum(rows.length) + ' registros') + ' · ' + esc(BT.sedeName()) + '</div></div><button class="btn sm" data-act="xls">' + ic('file-spreadsheet') + 'Exportar a Excel</button></div>' +
      '<div class="card-b" style="padding-bottom:8px"><div class="grid g-5" style="gap:10px">' +
      '<input class="input" id="afQ" placeholder="Buscar persona u objeto…" value="' + esc(f.q || '') + '">' +
      '<select class="select" id="afU"><option value="">Todos los usuarios</option>' + users.map((x) => '<option value="' + x.id + '"' + (f.user === x.id ? ' selected' : '') + '>' + esc(x.nombre) + '</option>').join('') + '</select>' +
      '<select class="select" id="afA"><option value="">Todas las acciones</option>' + actions.map((a) => '<option' + (f.action === a ? ' selected' : '') + '>' + esc(a) + '</option>').join('') + '</select>' +
      '<input class="input" type="date" id="afD" value="' + (f.desde || '') + '" data-tip="Desde">' +
      '<input class="input" type="date" id="afH" value="' + (f.hasta || '') + '" data-tip="Hasta">' +
      '</div><div class="row between mt-12"><label class="row" style="font-size:var(--fs-sm);cursor:pointer"><label class="switch"><input type="checkbox" id="afC" ' + (f.clin ? 'checked' : '') + '><span></span></label>Solo accesos a historias clínicas</label>' + (Object.values(f).some(Boolean) ? '<button class="btn ghost xs" data-act="clear">' + ic('x') + 'Limpiar filtros</button>' : '') + '</div></div>' +
      '<div class="card-b flush">' + ui.table([
        { label: 'Fecha y hora', render: (a) => '<div class="num strong" style="font-size:var(--fs-sm)">' + u.fmtDateTime(a.ts) + '</div><div class="muted" style="font-size:var(--fs-xs)">' + u.rel(a.ts) + '</div>' },
        { label: 'Usuario', render: (a) => ui.person(a.userName, BT.ROLES[a.role] ? BT.ROLES[a.role].label : esc(a.role)) },
        { label: 'Acción', render: (a) => ui.badge(a.action, ACTION_TONE[a.action] || '', { dot: true }) },
        { label: 'Objeto', render: (a) => '<div style="font-size:var(--fs-sm)" class="strong">' + esc(a.target) + '</div>' + (a.detail ? '<div class="muted ellipsis" style="font-size:var(--fs-xs);max-width:300px">' + esc(a.detail) + '</div>' : '') },
        { label: 'Residente', render: (a) => (a.residentId && BT.resident(a.residentId) ? '<span style="font-size:var(--fs-sm)">' + esc(BT.shortName(BT.resident(a.residentId))) + '</span>' : '<span class="subtle">—</span>') },
        { label: 'Sede', render: (a) => (a.sede && a.sede !== 'ALL' ? BT.sedeTag(a.sede) : '<span class="subtle">—</span>') },
        { label: 'Dispositivo', render: (a) => '<span class="muted num" style="font-size:var(--fs-xs)">' + esc(a.device || '—') + '<br>' + esc(a.ip || '') + '</span>' },
      ], rows.slice(0, LIM), { compact: true, rowAttrs: (a) => (a.action === 'Acceso denegado' ? 'class="row-flag-danger"' : ''), empty: { ill: 'search', title: 'Sin registros', text: 'No hay accesos que coincidan con los filtros.' } }) + '</div></section>';
    const set = (k, v) => { f[k] = v; renderAudit(p); ui.enhance(p, { quiet: true }); };
    p.querySelector('#afQ').addEventListener('input', u.debounce((e) => { const pos = e.target.selectionStart; set('q', e.target.value); const n = p.querySelector('#afQ'); n.focus(); n.setSelectionRange(pos, pos); }, 250));
    p.querySelector('#afU').addEventListener('change', (e) => set('user', e.target.value));
    p.querySelector('#afA').addEventListener('change', (e) => set('action', e.target.value));
    p.querySelector('#afD').addEventListener('change', (e) => set('desde', e.target.value));
    p.querySelector('#afH').addEventListener('change', (e) => set('hasta', e.target.value));
    p.querySelector('#afC').addEventListener('change', (e) => set('clin', e.target.checked));
    ui.on(p, {
      clear: () => { BT.state.sub.cfgF = {}; renderAudit(p); ui.enhance(p, { quiet: true }); },
      xls: () => BT.xlsx({ filename: 'Registro de accesos - ' + u.todayIso(), title: 'Registro general de accesos', subtitle: 'Registro inmutable · ' + filtered().length + ' entradas', sheets: [{ name: 'Accesos', columns: [
        { header: 'Fecha y hora', key: 'ts', width: 18, fmt: 'datetime' }, { header: 'Usuario', key: 'userName', width: 28 }, { header: 'Rol', key: 'rol', width: 22, value: (a) => (BT.ROLES[a.role] ? BT.ROLES[a.role].label : a.role) }, { header: 'Acción', key: 'action', width: 18 }, { header: 'Objeto', key: 'target', width: 30 },
        { header: 'Residente', key: 'res', width: 28, value: (a) => (a.residentId && BT.resident(a.residentId) ? BT.fullName(BT.resident(a.residentId)) : '') }, { header: 'Detalle', key: 'detail', width: 40 }, { header: 'Sede', key: 'sede', width: 8 }, { header: 'Dispositivo', key: 'device', width: 18 }, { header: 'IP', key: 'ip', width: 14 },
      ], rows: filtered(), notes: 'Registro inmutable conforme a la Ley 18.331 de Protección de Datos Personales. Los registros no se pueden editar ni borrar.' }] }),
    });
  }

  BT.tab({ id: 'configuracion', label: 'Configuración', icon: 'settings', group: 'sistema', order: 15, roles: ['direccion'], render });
})();

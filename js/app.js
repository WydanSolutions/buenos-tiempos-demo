/* ==========================================================================
   Estructura de la app: login, barra lateral, encabezado, búsqueda, avisos
   ========================================================================== */
(function () {
  'use strict';
  const BT = window.BT; const u = BT.u; const ic = BT.ic; const esc = u.esc; const ui = BT.ui;
  const shell = (BT.shell = {});
  const app = () => document.getElementById('app');

  const GROUPS = { dia: 'Día a día', clinica: 'Salud', gestion: 'Gestión', admin: 'Administración', sistema: 'Sistema' };

  /* ---------------- Login ---------------- */
  shell.login = function () {
    document.title = 'Ingresar · Residencial Buenos Tiempos';
    window.scrollTo(0, 0);
    app().className = '';
    app().innerHTML = '<div class="login">' +
      '<div class="login-art">' +
      '<span class="leaf" style="width:180px;height:180px;right:8%;top:12%;--r:18deg"></span><span class="leaf" style="width:90px;height:90px;left:6%;bottom:26%;--r:-30deg;animation-delay:-3s"></span><span class="leaf" style="width:120px;height:120px;right:30%;bottom:6%;--r:60deg;animation-delay:-6s"></span>' +
      '<div><span class="logo-plaque"><img class="logo-big" src="' + BT.LOGO + '" alt="Residencial Buenos Tiempos"></span></div>' +
      '<div><h2>Toda la gestión del residencial, con la calidez de siempre.</h2><p>Residentes, salud, personal, cobranzas y cumplimiento normativo de BT1 y BT2 en un solo lugar.</p>' +
      '<div class="feats"><span>' + ic('shield-check', 'ic-sm') + 'Ley 18.331</span><span>' + ic('file-check-2', 'ic-sm') + 'Decreto 356/016</span><span>' + ic('users', 'ic-sm') + 'Ratio Ord. 1032/2019</span><span>' + ic('receipt', 'ic-sm') + 'e-Factura</span></div></div></div>' +
      '<div class="login-panel"><div class="login-box" id="loginBox"></div></div></div>';
    shell.loginRoles();
  };
  shell.loginRoles = function () {
    const box = document.getElementById('loginBox');
    box.innerHTML = '<div class="eyebrow" style="display:inline-flex;gap:6px;align-items:center;font-size:var(--fs-xs);font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--brand-600)">' + ic('sparkles', 'ic-xs') + 'Demo interactiva</div>' +
      '<h1 class="mt-8">Hola, ¿con qué perfil ingresás?</h1><p class="muted mt-8">Cada rol ve solo lo que le corresponde. Elegí uno para recorrer el sistema.</p>' +
      '<div class="role-grid stagger">' + Object.entries(BT.ROLES).map(([k, r]) => '<button class="role-card" data-role="' + k + '"><span class="rc-ic">' + ic(r.icon) + '</span><span><span class="t">' + r.label + '</span><br><span class="d">' + r.desc + '</span></span></button>').join('') + '</div>' +
      '<div class="row between mt-24"><span class="subtle" style="font-size:var(--fs-xs)">Desarrollado por <b style="color:var(--ink-600)">Wydan Solutions</b></span><button class="btn ghost sm" data-reset>' + ic('rotate-ccw') + 'Restablecer demo</button></div>';
    box.querySelectorAll('[data-role]').forEach((b) => b.addEventListener('click', () => shell.loginUsers(b.dataset.role)));
    box.querySelector('[data-reset]').addEventListener('click', () => BT.resetDemo());
  };
  shell.loginUsers = function (role) {
    const box = document.getElementById('loginBox');
    const users = BT.db.users.filter((x) => x.role === role);
    const R = BT.ROLES[role];
    box.style.animation = 'none'; void box.offsetWidth; box.style.animation = '';
    if (role === 'cuidadora') return shell.loginPassword(users);
    box.innerHTML = '<button class="btn ghost sm" data-back style="margin-left:-10px">' + ic('arrow-left') + 'Volver</button>' +
      '<div class="row mt-16 gap-16"><span class="k-ic" style="width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:var(--brand-50);color:var(--brand-600)">' + ic(R.icon, 'ic-lg') + '</span><div><h1 style="font-size:24px">' + R.label + '</h1><p class="muted">' + R.desc + '</p></div></div>' +
      '<div class="col mt-24 stagger">' + users.map((x) => '<button class="role-card" data-user="' + x.id + '">' + ui.avatar(x.nombre, { size: 'lg' }) + '<span class="grow"><span class="t">' + esc(x.nombre) + '</span><br><span class="d">' + esc(x.cargo || '') + (x.sede !== 'ALL' ? ' · ' + x.sede : ' · Ambas sedes') + '</span></span>' + ic('arrow-right', 'ic-sm') + '</button>').join('') + '</div>' +
      '<p class="subtle mt-16" style="font-size:var(--fs-xs)">' + ic('lock', 'ic-xs') + ' En la versión real el ingreso es con usuario y contraseña, con doble factor para roles con acceso clínico.</p>';
    box.querySelector('[data-back]').addEventListener('click', shell.loginRoles);
    box.querySelectorAll('[data-user]').forEach((b) => b.addEventListener('click', () => shell.enter(b.dataset.user)));
  };
  shell.loginPassword = function (users) {
    const box = document.getElementById('loginBox');
    let sel = users[0]; let busy = false;
    const shiftNow = u.SHIFTS[u.currentShift()];
    const clock = () => { const n = new Date(); return '<b class="num">' + u.fmtTime(n) + '</b><span>' + u.cap(u.fmtDateLong(n).replace(/ de \d{4}$/, '')) + '</span>'; };
    const draw = () => {
      const staff = BT.staffById(sel.staffId);
      box.innerHTML = '<div class="pin-wrap">' +
        '<div class="row between"><button class="btn ghost sm" data-back style="margin-left:-10px">' + ic('arrow-left') + 'Otro perfil</button>' + ui.badge('Modo tablet', 'brand', { icon: 'tablet' }) + '</div>' +
        '<div class="pin-clock">' + clock() + '</div>' +
        '<form class="pin-card" autocomplete="off" novalidate>' +
        '<div class="pin-who"><div class="pin-av">' + ui.avatar(sel.nombre, { size: 'xl' }) + '<span class="pin-ok">' + BT.check + '</span></div>' +
        '<div class="pin-name">' + esc(staff ? staff.nombre : sel.nombre) + '</div>' +
        '<div class="pin-role">Cuidadora · ' + esc(BT.sedeName(sel.sede)) + '</div>' +
        '<span class="pin-shift">' + ic(shiftNow.icon, 'ic-xs') + 'Turno ' + shiftNow.label.toLowerCase() + ' · ' + shiftNow.from + '–' + shiftNow.to + '</span></div>' +
        '<div class="pin-users" role="radiogroup" aria-label="Elegí tu nombre">' + users.map((x) => '<button type="button" role="radio" aria-checked="' + (x.id === sel.id) + '" class="' + (x.id === sel.id ? 'on' : '') + '" data-u="' + x.id + '">' + ui.avatar(x.nombre, { size: 'xs' }) + esc(x.nombre.split(' ')[0]) + '<small>' + x.sede + '</small></button>').join('') + '</div>' +
        '<label class="pw-label" for="pwIn">Contraseña</label>' +
        '<div class="pw-field">' + ic('lock') + '<input id="pwIn" type="password" placeholder="Ingresá tu contraseña" autocomplete="current-password" spellcheck="false" autocapitalize="off" aria-describedby="pwMsg">' +
        '<button type="button" class="pw-eye" data-eye aria-label="Mostrar contraseña">' + ic('eye') + '</button></div>' +
        '<div class="pin-msg" id="pwMsg" aria-live="polite"></div>' +
        '<button type="submit" class="btn primary lg block pw-go" data-go>' + ic('log-in') + '<span>Ingresar</span></button>' +
        '<div class="pw-or"><span>o</span></div>' +
        '<button type="button" class="btn soft lg block" data-qr>' + ic('qr-code') + 'Ingresar con el QR del carné</button>' +
        '</form>' +
        '<p class="pin-hint">' + ic('info', 'ic-xs') + ' Contraseña de demostración: <b>' + esc(sel.password) + '</b></p></div>';
      const inp = box.querySelector('#pwIn');
      box.querySelector('[data-back]').addEventListener('click', () => { cleanup(); shell.loginRoles(); });
      box.querySelectorAll('[data-u]').forEach((b) => b.addEventListener('click', () => { if (busy) return; sel = users.find((x) => x.id === b.dataset.u); draw(); }));
      box.querySelector('[data-eye]').addEventListener('click', (e) => {
        const btn = e.currentTarget; const show = inp.type === 'password'; inp.type = show ? 'text' : 'password';
        btn.innerHTML = ic(show ? 'eye-off' : 'eye'); btn.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
        inp.focus();
      });
      inp.addEventListener('input', () => { card().classList.remove('err'); msg(''); });
      inp.addEventListener('keyup', (e) => { if (e.getModifierState && e.getModifierState('CapsLock')) msg('Tenés activadas las mayúsculas', 'warn'); else if (box.querySelector('.pin-msg.warn')) msg(''); });
      box.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); submit(); });
      box.querySelector('[data-qr]').addEventListener('click', () => { if (busy) return; inp.type = 'password'; inp.value = sel.password; ui.toast('QR del carné leído', { icon: 'qr-code', sub: staff ? staff.nombre : sel.nombre }); success(); });
      setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (er) { /* sin foco */ } }, 120);
    };
    const card = () => box.querySelector('.pin-card');
    const msg = (t, cls) => { const m = box.querySelector('.pin-msg'); if (!m) return; m.textContent = t; m.className = 'pin-msg ' + (cls || ''); };
    const shake = () => { const c = card(); c.classList.remove('err'); void c.offsetWidth; c.classList.add('err'); };
    const success = () => {
      busy = true; const c = card(); if (!c) return;
      c.classList.add('ok'); msg('¡Listo, ' + sel.nombre.split(' ')[0] + '! Abriendo tu turno…', 'ok');
      const go = c.querySelector('[data-go]'); go.innerHTML = BT.check + '<span>Bienvenida</span>'; go.classList.add('done');
      setTimeout(() => { cleanup(); shell.enter(sel.id); }, 800);
    };
    const submit = () => {
      if (busy) return; const inp = box.querySelector('#pwIn'); const go = card().querySelector('[data-go]');
      if (!inp.value) { msg('Ingresá tu contraseña', 'err'); shake(); inp.focus(); return; }
      busy = true; go.classList.add('loading'); go.innerHTML = '<span class="spin"></span><span>Verificando…</span>';
      setTimeout(() => {
        if (inp.value === sel.password) return success();
        busy = false; go.classList.remove('loading'); go.innerHTML = ic('log-in') + '<span>Ingresar</span>';
        shake(); msg('Contraseña incorrecta. Probá de nuevo.', 'err'); inp.select();
      }, 450);
    };
    const tick = setInterval(() => { const c = box.querySelector('.pin-clock'); if (c) c.innerHTML = clock(); else cleanup(); }, 20000);
    const cleanup = () => clearInterval(tick);
    if (shell._pinCleanup) shell._pinCleanup();
    shell._pinCleanup = cleanup;
    draw();
  };
  shell.enter = function (userId) {
    const usr = BT.userById(userId); if (!usr) return;
    BT.state.user = usr;
    BT.state.sede = usr.sede === 'ALL' ? (BT.state.sede || 'ALL') : usr.sede;
    if (usr.sede === 'ALL' && !['ALL', 'BT1', 'BT2'].includes(BT.state.sede)) BT.state.sede = 'ALL';
    BT.audit('Ingresó al sistema', 'Sesión', { detail: usr.role === 'cuidadora' ? 'Ingreso con contraseña (tablet)' : 'Ingreso con usuario' });
    BT.save();
    shell.render();
    const first = BT.visibleTabs()[0];
    const want = (location.hash.match(/^#\/([\w-]+)/) || [])[1];
    BT.state.tab = want && BT.visibleTabs().some((t) => t.id === want) ? want : first.id;
    if (location.hash !== '#/' + BT.state.tab) history.replaceState(null, '', '#/' + BT.state.tab);
    BT.render();
    ui.toast('¡Hola, ' + usr.nombre.replace(/^(Dr\.|Lic\.)\s*/, '').split(' ')[0] + '!', { sub: BT.ROLES[usr.role].label + ' · ' + (usr.sede === 'ALL' ? 'Ambas sedes' : BT.sedeName(usr.sede)), icon: 'hand' });
  };
  shell.logout = function () {
    BT.audit('Cerró sesión', 'Sesión', {});
    BT.state.user = null; try { sessionStorage.removeItem('bt-session'); } catch (e) { }
    history.replaceState(null, '', location.pathname);
    shell.login();
  };

  /* ---------------- Estructura principal ---------------- */
  shell.render = function () {
    const usr = BT.state.user; const R = BT.ROLES[usr.role];
    document.title = 'Residencial Buenos Tiempos';
    app().className = 'app';
    const sedeItems = usr.sede === 'ALL'
      ? [{ id: 'BT1', label: 'BT1', dot: BT.COLORS.BT1 }, { id: 'BT2', label: 'BT2', dot: BT.COLORS.BT2 }, { id: 'ALL', label: 'Consolidado', icon: 'layers' }]
      : [{ id: usr.sede, label: BT.sedeName(usr.sede), dot: BT.COLORS[usr.sede] }];
    app().innerHTML =
      '<aside class="sidebar" aria-label="Navegación">' +
      '<div class="sb-brand"><img src="' + BT.LOGO + '" alt=""><div><div class="t1">Buenos Tiempos</div><div class="t2">Residencial · ' + esc(BT.db.meta.company) + '</div></div></div>' +
      '<nav class="sb-nav" id="sbNav"></nav>' +
      '<div class="sb-foot"><div class="row between"><button class="btn ghost sm" data-reset style="padding:0 8px">' + ic('rotate-ccw') + 'Restablecer demo</button><button class="icon-btn ghost sm" data-logout data-tip="Cambiar de usuario">' + ic('log-out', 'ic-sm') + '</button></div><div class="wydan">' + ic('leaf', 'ic-xs') + 'Desarrollado por <b>Wydan Solutions</b></div></div>' +
      '</aside>' +
      '<div class="main"><header class="topbar" id="topbar">' +
      '<button class="icon-btn ghost menu-btn" data-menu aria-label="Menú">' + ic('menu') + '</button>' +
      ui.seg('sede', sedeItems, BT.state.sede, '') +
      (usr.role !== 'familiar' ? '<div class="search">' + ic('search') + '<input id="gsearch" type="search" placeholder="Buscar residentes o funcionarias…" autocomplete="off" aria-label="Búsqueda global"><kbd>Ctrl K</kbd><div id="gsPop"></div></div>' : '') +
      '<div class="spacer"></div>' +
      '<span class="live live-top" style="margin-right:4px" data-tip="Datos sincronizados" data-tip-pos="bottom">En línea</span>' +
      '<div style="position:relative"><button class="icon-btn" id="bellBtn" aria-label="Notificaciones">' + ic('bell') + '<span class="pip hidden"></span></button><div id="bellPop"></div></div>' +
      '<button class="user-chip" data-logout-menu>' + ui.avatar(usr.nombre, { size: 'sm' }) + '<span class="txt" style="text-align:left"><span class="n">' + esc(usr.nombre) + '</span><br><span class="r">' + R.label + '</span></span></button>' +
      '</header>' +
      '<main class="content" id="content"></main>' +
      '<footer class="app-foot"><span>Residencial Buenos Tiempos · ' + esc(BT.db.meta.company) + ' · Datos ficticios de demostración</span><span>Desarrollado por <b>Wydan Solutions</b></span></footer></div>';

    const root = app();
    root.querySelector('[data-reset]').addEventListener('click', () => BT.resetDemo());
    root.querySelector('[data-logout]').addEventListener('click', shell.logout);
    root.querySelector('[data-logout-menu]').addEventListener('click', shell.userMenu);
    root.querySelector('[data-menu]').addEventListener('click', () => root.classList.toggle('nav-open'));
    root.addEventListener('click', (e) => { if (root.classList.contains('nav-open') && !e.target.closest('.sidebar') && !e.target.closest('[data-menu]')) root.classList.remove('nav-open'); });
    root.querySelector('.seg[data-seg="sede"]').addEventListener('segchange', (e) => { BT.state.sede = e.detail.value; BT.save(); BT.render(); shell.updateBell(); });
    document.getElementById('bellBtn').addEventListener('click', shell.toggleBell);
    window.addEventListener('scroll', () => { const tb = document.getElementById('topbar'); if (tb) tb.classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });
    shell.initSearch();
    ui.enhance(root.querySelector('.topbar'));
    shell.updateNav();
  };

  shell.updateNav = function () {
    const nav = document.getElementById('sbNav'); if (!nav) return;
    const tabs = BT.visibleTabs(); const groups = {};
    tabs.forEach((t) => (groups[t.group || 'dia'] = groups[t.group || 'dia'] || []).push(t));
    nav.innerHTML = Object.keys(GROUPS).filter((g) => groups[g]).map((g) => '<div class="sb-group"><div class="sb-group-title">' + GROUPS[g] + '</div>' +
      groups[g].map((t) => { let b = ''; try { const n = t.badge ? t.badge() : 0; if (n) b = '<span class="count ' + (t.badgeSoft ? 'soft' : '') + '">' + n + '</span>'; } catch (e) { } return '<button class="sb-item ' + (t.id === BT.state.tab ? 'active' : '') + '" data-tab="' + t.id + '"><span class="sb-ic">' + ic(t.icon) + '</span><span>' + t.label + '</span>' + b + '</button>'; }).join('') + '</div>').join('');
    nav.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { app().classList.remove('nav-open'); BT.go(b.dataset.tab); }));
    shell.updateBell();
  };

  /* ---------------- Notificaciones ---------------- */
  shell.updateBell = function () {
    const pip = document.querySelector('#bellBtn .pip'); if (!pip) return;
    const a = BT.alerts().filter((x) => x.tone === 'danger' || x.tone === 'warn');
    pip.classList.toggle('hidden', !a.length);
  };
  shell.toggleBell = function (e) {
    e.stopPropagation();
    const pop = document.getElementById('bellPop');
    if (pop.innerHTML) { pop.innerHTML = ''; return; }
    const al = BT.alerts().slice(0, 12);
    pop.innerHTML = '<div class="pop"><div class="pop-h"><div><b>Notificaciones</b><div class="muted" style="font-size:var(--fs-xs)">' + BT.sedeName() + '</div></div>' + ui.badge(al.length + ' activas', al.length ? 'danger' : 'ok') + '</div><div class="pop-b">' +
      (al.length ? al.map((x, i) => '<div class="notif" data-i="' + i + '"><span class="li-ic ' + x.tone + '" style="width:32px;height:32px;border-radius:9px;display:grid;place-items:center;flex:none;background:var(--' + (x.tone === 'danger' ? 'danger-bg' : x.tone === 'warn' ? 'warn-bg' : x.tone === 'ok' ? 'ok-bg' : 'info-bg') + ');color:var(--' + (x.tone === 'danger' ? 'danger' : x.tone === 'warn' ? 'warn' : x.tone === 'ok' ? 'ok' : 'info') + ')">' + ic(x.icon || 'bell', 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(x.title) + '</div><div class="d">' + (x.desc || '') + '</div>' + (x.when ? '<div class="w">' + u.rel(x.when) + '</div>' : '') + '</div></div>').join('') : ui.empty({ ill: 'leaf', title: 'Todo en orden', text: 'No hay avisos pendientes.' })) + '</div></div>';
    pop.querySelectorAll('[data-i]').forEach((n) => n.addEventListener('click', () => { const x = al[+n.dataset.i]; pop.innerHTML = ''; if (x.action) x.action(); else if (x.tab) BT.go(x.tab, x.params || {}); }));
    const off = (ev) => { if (!ev.target.closest('#bellPop') && !ev.target.closest('#bellBtn')) { pop.innerHTML = ''; document.removeEventListener('click', off); } };
    setTimeout(() => document.addEventListener('click', off), 0);
  };
  shell.userMenu = function (e) {
    e.stopPropagation();
    const usr = BT.state.user;
    ui.modal({
      title: usr.nombre, sub: BT.ROLES[usr.role].label + ' · ' + (usr.sede === 'ALL' ? 'Ambas sedes' : BT.sedeName(usr.sede)), icon: BT.ROLES[usr.role].icon,
      body: '<div class="col">' + ui.kv([['Último ingreso', u.fmtDateTime(Date.now())], ['Dispositivo', usr.role === 'cuidadora' ? 'Tablet ' + usr.sede : 'PC Dirección'], ['Permisos', usr.role === 'familiar' ? 'Portal del familiar' : BT.can('clinical.read') ? 'Incluye acceso clínico (auditado)' : 'Sin acceso clínico']]) +
        '<div class="row between mt-16"><div><div class="strong">Reducir animaciones</div><div class="muted" style="font-size:var(--fs-sm)">Para presentaciones en equipos lentos</div></div><label class="switch"><input type="checkbox" id="rmSw" ' + (document.documentElement.classList.contains('reduce-motion') ? 'checked' : '') + '><span></span></label></div></div>',
      foot: '<button class="btn ghost" data-close>Cerrar</button><button class="btn dark" data-out>' + ic('log-out') + 'Cambiar de usuario</button>',
      onMount: (el, close) => {
        el.querySelector('[data-out]').addEventListener('click', () => { close(); shell.logout(); });
        el.querySelector('#rmSw').addEventListener('change', (ev) => { document.documentElement.classList.toggle('reduce-motion', ev.target.checked); try { localStorage.setItem('bt-rm', ev.target.checked ? '1' : ''); } catch (er) { } });
      },
    });
  };

  /* ---------------- Búsqueda global ---------------- */
  shell.initSearch = function () {
    const inp = document.getElementById('gsearch'); if (!inp) return;
    const pop = document.getElementById('gsPop'); let items = []; let kb = -1;
    const hl = (s, q) => { const i = u.norm(s).indexOf(u.norm(q)); return i < 0 ? esc(s) : esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length)); };
    const run = () => {
      const q = inp.value.trim(); kb = -1;
      if (q.length < 2) { pop.innerHTML = ''; return; }
      const nq = u.norm(q);
      const canClin = BT.can('clinical.read') || BT.isRole('administracion', 'direccion');
      const res = canClin ? BT.residentsInSede().filter((r) => u.norm(BT.fullName(r) + ' ' + r.habitacion + r.cama).includes(nq)).slice(0, 6) : [];
      const st = BT.can('staff.manage') || BT.isRole('enfermeria') ? BT.bySede(BT.db.staff).filter((s) => u.norm(s.nombre).includes(nq)).slice(0, 5) : [];
      items = res.map((r) => ({ type: 'r', id: r.id })).concat(st.map((s) => ({ type: 's', id: s.id })));
      pop.innerHTML = '<div class="search-pop">' + (!items.length ? ui.empty({ ill: 'search', title: 'Sin resultados', text: 'Probá con otro nombre o número de habitación.' }) :
        (res.length ? '<div class="sp-title">Residentes</div>' + res.map((r, i) => '<button class="sp-item" data-i="' + i + '">' + ui.avatar(BT.fullName(r), { size: 'sm' }) + '<span class="grow"><span class="strong">' + hl(BT.fullName(r), q) + '</span><br><span class="m">' + r.sede + ' · Hab. ' + r.habitacion + r.cama + ' · ' + u.age(r.nacimiento) + ' años</span></span>' + BT.sedeTag(r.sede) + '</button>').join('') : '') +
        (st.length ? '<div class="sp-title">Funcionarias</div>' + st.map((s, i) => '<button class="sp-item" data-i="' + (res.length + i) + '">' + ui.avatar(s.nombre, { size: 'sm' }) + '<span class="grow"><span class="strong">' + hl(s.nombre, q) + '</span><br><span class="m">' + esc(s.rol) + (s.volante ? ' · Volante' : '') + '</span></span>' + BT.sedeTag(s.sede) + '</button>').join('') : '')) + '</div>';
      pop.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('mousedown', (e) => { e.preventDefault(); open(items[+b.dataset.i]); }));
    };
    const open = (it) => {
      pop.innerHTML = ''; inp.value = ''; inp.blur();
      if (it.type === 'r') { if (BT.actions.openResident) BT.actions.openResident(it.id); else BT.go('residentes'); }
      else { if (BT.actions.openStaff) BT.actions.openStaff(it.id); else BT.go('personal'); }
    };
    inp.addEventListener('input', u.debounce(run, 90));
    inp.addEventListener('blur', () => setTimeout(() => (pop.innerHTML = ''), 120));
    inp.addEventListener('keydown', (e) => {
      const btns = pop.querySelectorAll('.sp-item'); if (!btns.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); kb = (kb + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length; btns.forEach((b, i) => b.classList.toggle('kb', i === kb)); }
      if (e.key === 'Enter' && kb >= 0) open(items[kb]); else if (e.key === 'Enter') open(items[0]);
      if (e.key === 'Escape') { pop.innerHTML = ''; inp.blur(); }
    });
    document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { const i = document.getElementById('gsearch'); if (i) { e.preventDefault(); i.focus(); } } });
  };

  /* ---------------- Arranque ---------------- */
  BT.boot = function () {
    try { if (localStorage.getItem('bt-rm')) document.documentElement.classList.add('reduce-motion'); } catch (e) { }
    BT.load();
    if (BT._reseededNewDay) setTimeout(() => ui.toast('Demo actualizada al día de hoy', { icon: 'calendar-check', sub: 'Los datos se regeneraron para ' + u.fmtDate(new Date()) }), 600);
    // restaurar sesión (recarga durante la presentación)
    try {
      const s = JSON.parse(sessionStorage.getItem('bt-session') || 'null');
      if (s && BT.userById(s.userId)) {
        BT.state.user = BT.userById(s.userId); BT.state.sede = s.sede || BT.state.user.sede;
        shell.render();
        const want = (location.hash.match(/^#\/([\w-]+)/) || [])[1];
        BT.state.tab = want && BT.visibleTabs().some((t) => t.id === want) ? want : BT.visibleTabs()[0].id;
        BT.render(); return;
      }
    } catch (e) { }
    shell.login();
  };
  document.addEventListener('DOMContentLoaded', BT.boot);
  // refresco de fechas relativas cada minuto
  setInterval(() => document.querySelectorAll('time[datetime]').forEach((t) => (t.textContent = u.rel(t.getAttribute('datetime')))), 60000);
})();

/* ==========================================================================
   Familias — portal del familiar, novedades, visitas y WhatsApp (simulado)
   ========================================================================== */
(function () {
  'use strict';
  const BT = window.BT; const u = BT.u; const ui = BT.ui; const ic = BT.ic; const esc = u.esc;
  const FM = (BT.fam = {});

  BT.addCSS('familias', `
    .fh-in{display:flex;gap:22px;align-items:center;flex-wrap:wrap;position:relative;z-index:1}
    .fam-hero .avatar.xl{--av-bg:#fff;--av-fg:var(--brand-700);box-shadow:0 0 0 4px rgba(255,255,255,.25)}
    .fam-hero h1{color:#fff;font-size:28px;letter-spacing:-.025em}
    .fam-hero .sub{color:rgba(255,255,255,.82);font-size:var(--fs-lg);margin-top:4px}
    .fam-hero .pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;position:relative;z-index:1}
    .fam-hero .pills span{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.18);padding:6px 11px;border-radius:99px;font-size:var(--fs-sm);font-weight:600;backdrop-filter:blur(6px)}
    .fam-hero .leafdeco{position:absolute;right:28px;bottom:-30px;width:190px;opacity:.13;pointer-events:none}
    .post{overflow:hidden;display:flex;flex-direction:column}
    .post .photo{border-radius:0;aspect-ratio:16/9}
    .post .photo .ic{width:54px;height:54px;stroke-width:1.5;filter:drop-shadow(0 6px 16px rgba(0,0,0,.18))}
    .post .pb{padding:14px 16px 16px;display:flex;flex-direction:column;gap:8px;flex:1}
    .post .pt{font-weight:650;font-size:var(--fs-lg);color:var(--ink-950);letter-spacing:-.01em;line-height:1.3}
    .post .px{font-size:var(--fs-md);color:var(--ink-700);line-height:1.55}
    .post .pm{display:flex;align-items:center;gap:8px;font-size:var(--fs-xs);color:var(--ink-500);margin-top:auto;padding-top:6px}
    .post.com{background:linear-gradient(180deg,var(--info-bg),#fff 60%);border-color:var(--info-line)}
    .post.com .pt::before{content:"";}
    .feed{display:flex;flex-direction:column;gap:16px}
    .feed .post .photo{aspect-ratio:21/9}
    .today-it{display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--ink-100)}
    .today-it:last-child{border-bottom:0}
    .today-it .ti{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;flex:none}
    .visit-day{font-size:var(--fs-xs);font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-500);padding:14px 20px 6px;background:var(--surface-2);border-bottom:1px solid var(--line)}
    .wa{background:#efeae2;border-radius:16px;padding:16px;min-height:180px;position:relative;overflow:hidden;background-image:radial-gradient(rgba(0,0,0,.035) 1px,transparent 1px);background-size:14px 14px}
    .wa-top{display:flex;align-items:center;gap:10px;background:#075e54;color:#fff;margin:-16px -16px 14px;padding:10px 14px}
    .wa-top .avatar{--av-bg:#fff;--av-fg:#075e54}
    .wa-b{max-width:88%;margin-left:auto;background:#d9fdd3;border-radius:10px 0 10px 10px;padding:8px 10px 6px;font-size:var(--fs-md);color:#111;box-shadow:0 1px 1px rgba(0,0,0,.08);white-space:pre-wrap;position:relative;animation:riseIn var(--d-slow) var(--ease-out)}
    .wa-b::after{content:"";position:absolute;right:-7px;top:0;border:8px solid transparent;border-top-color:#d9fdd3;border-left-color:#d9fdd3;border-width:0 0 9px 8px}
    .wa-meta{display:flex;justify-content:flex-end;align-items:center;gap:3px;font-size:10.5px;color:#667781;margin-top:2px}
    .wa-ticks{color:#8696a0;transition:color 300ms ease}
    .wa-ticks.read{color:#53bdeb}
    .preset{width:58px;height:42px;border-radius:10px;border:2px solid transparent;display:grid;place-items:center;color:#fff;cursor:pointer;transition:transform var(--d-fast) var(--ease),border-color var(--d-fast)}
    .preset:hover{transform:translateY(-2px)}
    .preset.on{border-color:var(--ink-900);box-shadow:0 0 0 3px #fff inset}
    .device{border:10px solid var(--ink-900);border-radius:28px;box-shadow:var(--sh-4);overflow:hidden;background:var(--bg);max-width:980px;margin:0 auto}
    .device .bar{height:30px;background:var(--ink-900);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.6);font-size:11px;gap:6px}
    .device .scr{padding:18px;max-height:720px;overflow:auto}
  `);

  const PRESETS = [
    { grad: 'linear-gradient(135deg,#8fc49f,#297040)', icon: 'sprout' }, { grad: 'linear-gradient(135deg,#f3c98b,#d98c5f)', icon: 'brain' },
    { grad: 'linear-gradient(135deg,#a9b8e8,#6b5ba8)', icon: 'music' }, { grad: 'linear-gradient(135deg,#9ed3e0,#3f78b5)', icon: 'sun' },
    { grad: 'linear-gradient(135deg,#f2b8c6,#b5677a)', icon: 'cake' }, { grad: 'linear-gradient(135deg,#d8d2a0,#8a7a2e)', icon: 'palette' },
  ];

  /* ---------------- Helpers ---------------- */
  FM.postsFor = (rid) => { const r = BT.resident(rid); return BT.db.posts.filter((p) => p.residentId === rid || (!p.residentId && (p.sede === 'ALL' || p.sede === r.sede))).sort((a, b) => b.ts - a.ts); };
  FM.postCard = (p, opts = {}) => {
    const r = p.residentId ? BT.resident(p.residentId) : null;
    const com = p.tipo === 'Comunicado';
    return '<article class="card post hover ' + (com ? 'com' : '') + '">' +
      (p.foto ? '<div class="photo" style="background:' + p.foto.grad + '">' + ic(p.foto.icon) + '<div class="cap">' + esc(p.foto.caption || '') + '</div></div>' : '') +
      '<div class="pb"><div class="row gap-6">' + (com ? ui.badge('Comunicado', 'info', { icon: 'megaphone' }) : p.tipo === 'Foto' ? ui.badge('Foto', 'violet', { icon: 'image' }) : ui.badge('Novedad', 'brand', { icon: 'sparkles' })) + (r && !opts.hideRes ? ui.badge(BT.shortName(r), 'outline', { icon: 'user-round' }) : '') + (!opts.hideRes && p.sede !== 'ALL' && !r ? BT.sedeTag(p.sede) : '') + '</div>' +
      '<div class="pt">' + esc(p.titulo) + '</div><div class="px">' + esc(p.texto) + '</div>' +
      '<div class="pm">' + ui.avatar(p.autor, { size: 'xs' }) + '<span>' + esc(p.autor) + '</span><span>·</span>' + ui.relTime(p.ts) + '</div></div></article>';
  };
  const restriccion = (rid) => BT.db.restrictions.find((x) => x.residentId === rid && x.tipo === 'Visitas' && x.desde <= u.todayIso() && x.hasta >= u.todayIso());
  const visitsUpcoming = (filter) => BT.db.visits.filter((v) => v.estado === 'Agendada' && v.fecha >= u.todayIso() && filter(v)).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));

  /* ---------------- WhatsApp (simulado) ---------------- */
  FM.whatsapp = function ({ to, text = '', title = 'Notificar por WhatsApp', after } = {}) {
    const sedes = BT.state.sede === 'ALL' ? ['BT1', 'BT2'] : [BT.state.sede];
    const res = BT.db.residents.filter((r) => r.estado === 'activo' && sedes.includes(r.sede));
    let aud = 'todas'; let rid = res[0] && res[0].id;
    const recipients = () => (to ? to : aud === 'todas' ? res.map((r) => r.referente.nombre) : [BT.resident(rid).referente.nombre]);
    const tpl = text || 'Hola, te escribimos de Residencial Buenos Tiempos 🌿\nTe contamos que este sábado a las 16:00 haremos la fiesta de fin de año con las familias en el patio. ¡Los esperamos!';
    const bubble = (t) => '<div class="wa-b" id="waB">' + esc(t) + '<div class="wa-meta">' + u.fmtTime(new Date()) + ' <span class="wa-ticks" id="waT">' + ic('check-check', 'ic-xs') + '</span></div></div>';
    ui.modal({
      title, icon: 'message-circle', size: 'lg', sub: 'Simulación · en producción se envía por la API oficial de WhatsApp Business',
      body: '<div class="grid g-2" style="align-items:start">' +
        '<div class="col">' + (to ? '<div class="field"><label>Destinatarios</label><div class="chips">' + to.map((x) => '<span class="chip on">' + ic('user-round', 'ic-sm') + esc(x) + '</span>').join('') + '</div></div>' :
          ui.field({ label: 'Destinatarios', name: 'aud', type: 'chips', value: 'todas', options: [{ v: 'todas', l: 'Todas las familias (' + res.length + ')', icon: 'users' }, { v: 'una', l: 'Una familia', icon: 'user-round' }] }) +
          '<div id="waOne" class="hidden">' + ui.field({ label: 'Residente', name: 'rid', type: 'select', value: rid, options: res.map((r) => ({ v: r.id, l: BT.fullName(r) + ' · ' + r.referente.nombre })) }) + '</div>') +
        ui.field({ label: 'Mensaje', name: 'msg', type: 'textarea', value: tpl, attrs: 'rows="7"' }) + '<div class="muted" style="font-size:var(--fs-xs)" id="waCount"></div></div>' +
        '<div><div class="flabel" style="margin-bottom:6px">Vista previa</div><div class="wa"><div class="wa-top">' + ui.avatar('Buenos Tiempos', { size: 'sm' }) + '<div><div style="font-weight:600;font-size:var(--fs-md)">Residencial Buenos Tiempos</div><div style="font-size:11px;opacity:.75">Cuenta de empresa</div></div></div><div id="waPrev">' + bubble(tpl) + '</div></div></div></div>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-send style="background:linear-gradient(180deg,#25d366,#1da851);border-color:#179443">' + ic('send') + 'Enviar</button>',
      onMount: (el, close) => {
        const upd = () => { const n = recipients().length; el.querySelector('#waCount').textContent = 'Se enviará a ' + n + (n === 1 ? ' familia' : ' familias') + ' · ' + el.querySelector('[name=msg]').value.length + ' caracteres'; };
        el.querySelector('[name=msg]').addEventListener('input', (e) => { el.querySelector('#waPrev').innerHTML = bubble(e.target.value); upd(); });
        el.addEventListener('chipchange', () => { const d = ui.formData(el); aud = d.aud || 'todas'; const one = el.querySelector('#waOne'); if (one) one.classList.toggle('hidden', aud !== 'una'); upd(); });
        el.addEventListener('change', (e) => { if (e.target.name === 'rid') { rid = e.target.value; upd(); } });
        upd();
        el.querySelector('[data-send]').addEventListener('click', (ev) => {
          ev.currentTarget.disabled = true; const n = recipients().length;
          const t = el.querySelector('#waT'); setTimeout(() => t && t.classList.add('read'), 450);
          BT.audit('Envió WhatsApp', 'Familias', { detail: n + ' destinatarios' });
          setTimeout(() => { close(); ui.toast('Enviado a ' + n + (n === 1 ? ' familia' : ' familias'), { sub: 'WhatsApp · entregado', icon: 'message-circle' }); after && after(); }, 1000);
        });
      },
    });
  };

  /* ---------------- Agendar visita ---------------- */
  FM.agendar = function (rid, onDone) {
    const r = BT.resident(rid); const rs = restriccion(rid);
    const isFam = BT.isRole('familiar');
    ui.modal({
      title: 'Agendar visita', sub: 'Para ' + BT.fullName(r) + ' · ' + BT.sedeName(r.sede), icon: 'calendar-plus',
      body: (rs ? '<div class="alert warn mb-16">' + ic('shield-alert') + '<div><b>Visitas con restricción vigente.</b> ' + esc(rs.motivo) + '</div></div>' : '') +
        '<div class="form-grid">' + ui.field({ label: 'Día', name: 'fecha', type: 'date', value: u.iso(u.addDays(u.today(), 1)), required: true, attrs: 'min="' + u.todayIso() + '"' }) +
        ui.field({ label: 'Visitante', name: 'visitante', value: isFam ? BT.state.user.nombre : r.referente.nombre, required: true }) +
        ui.field({ label: 'Horario', name: 'hora', type: 'chips', value: '17:00', options: ['10:30', '15:00', '16:30', '17:00', '18:00'], required: true, full: true }) +
        ui.field({ label: 'Comentario (opcional)', name: 'nota', placeholder: 'Ej.: vamos con los nietos', full: true }) + '</div>' +
        '<p class="muted mt-16" style="font-size:var(--fs-sm)">' + ic('info', 'ic-xs') + ' Horario de visitas: todos los días de 10:00 a 20:00. Te confirmamos por WhatsApp.</p>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-ok>' + ic('calendar-check') + 'Confirmar visita</button>',
      onMount: (el, close) => el.querySelector('[data-ok]').addEventListener('click', () => {
        const b = el.querySelector('.modal-b'); if (!ui.validate(b)) return; const d = ui.formData(b);
        BT.db.visits.push({ id: u.uid('vi'), residentId: rid, sede: r.sede, visitante: d.visitante, vinculo: isFam ? r.referente.vinculo : 'Familiar', fecha: d.fecha, hora: d.hora, estado: 'Agendada', nota: d.nota });
        BT.audit('Agendó visita', 'Visitas', { residentId: rid, detail: u.fmtDate(d.fecha) + ' ' + d.hora });
        BT.save(); close();
        ui.toast('Visita agendada', { sub: u.cap(u.fmtDateLong(d.fecha)) + ' a las ' + d.hora, icon: 'calendar-check' });
        onDone ? onDone() : BT.refresh();
      }),
    });
  };

  /* ---------------- Portal del familiar ---------------- */
  FM.portal = function (el, rid, opts = {}) {
    const r = BT.resident(rid); if (!r) { el.innerHTML = ui.empty({ title: 'Sin residente asociado' }); return; }
    const isFam = BT.isRole('familiar') && !opts.preview;
    const who = isFam ? BT.state.user.nombre.split(' ')[0] : r.referente.nombre.split(' ')[0];
    const today = BT.db.care.filter((c) => c.residentId === rid && Date.now() - c.ts < 24 * 3600000).sort((a, b) => b.ts - a.ts);
    const share = { Ingesta: ['utensils', 'ok'], Hidratación: ['glass-water', 'info'], Actividad: ['palette', 'violet'], Higiene: ['sparkles', 'brand'] };
    const shown = today.filter((c) => share[c.tipo]);
    const nice = (c) => (c.tipo === 'Higiene' ? 'Recibió su higiene y arreglo personal' : c.detalle);
    const acts = BT.db.activities.filter((a) => a.sede === r.sede && a.fecha >= u.todayIso()).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)).slice(0, 3);
    const posts = FM.postsFor(rid);
    const feed = posts.filter((p) => p.tipo !== 'Comunicado'); const coms = posts.filter((p) => p.tipo === 'Comunicado');
    const visits = visitsUpcoming((v) => v.residentId === rid);
    const a = BT.account(rid);
    const pays = BT.db.payments.filter((p) => p.residentId === rid && !p.garantia).sort((x, y) => y.fecha.localeCompare(x.fecha)).slice(0, 3);
    const sedeObj = BT.db.sedes.find((x) => x.id === r.sede);
    const last = BT.db.care.filter((c) => c.residentId === rid).sort((x, y) => y.ts - x.ts)[0];
    el.innerHTML =
      '<div class="fam-hero" style="display:block"><svg class="leafdeco" viewBox="0 0 100 100"><path d="M50 95C50 55 62 25 96 5 88 50 72 78 50 95z" fill="#fff"/><path d="M50 95C50 62 36 36 6 22c6 38 22 60 44 73z" fill="#fff"/></svg><div class="fh-in">' + ui.avatar(BT.fullName(r), { size: 'xl' }) +
      '<div><div style="font-size:var(--fs-sm);font-weight:600;opacity:.8;letter-spacing:.04em;text-transform:uppercase">Portal de la familia</div><h1>Hola, ' + esc(who) + '</h1><div class="sub">Así viene el día de ' + esc(r.nombre) + ' en ' + esc(BT.sedeName(r.sede)) + '</div>' +
      '<div class="pills"><span>' + ic('bed-double', 'ic-sm') + 'Habitación ' + r.habitacion + r.cama + '</span><span>' + ic('clock', 'ic-sm') + (last ? 'Último registro ' + u.rel(last.ts) : 'Sin registros hoy') + '</span>' + (visits[0] ? '<span>' + ic('calendar-check', 'ic-sm') + 'Próxima visita ' + u.relDay(visits[0].fecha) + ' ' + visits[0].hora + '</span>' : '') + '</div></div></div></div>' +
      '<div class="grid g-main mt-24" style="align-items:start"><div class="feed stagger">' +
      ui.card({ title: 'Hoy', icon: 'sun', sub: u.cap(u.fmtDateLong(u.today())), actions: ui.live('Actualizado'), body: shown.length ? shown.map((c) => { const [i, t] = share[c.tipo]; return '<div class="today-it"><span class="ti" style="background:var(--' + (t === 'brand' ? 'brand-50' : t + '-bg') + ');color:var(--' + (t === 'brand' ? 'brand-600' : t) + ')">' + ic(i, 'ic-sm') + '</span><div class="grow"><div class="strong" style="font-size:var(--fs-md)">' + esc(nice(c)) + '</div><div class="muted" style="font-size:var(--fs-xs)">' + esc(c.tipo) + ' · ' + ui.relTime(c.ts) + '</div></div></div>'; }).join('') : ui.empty({ ill: 'leaf', title: 'Todavía sin novedades hoy', text: 'Te avisamos apenas el equipo registre algo.' }) }) +
      feed.map((p) => FM.postCard(p, { hideRes: true })).join('') +
      '</div><div class="col gap-16 stagger">' +
      ui.card({ title: 'Visitas', icon: 'calendar-heart', actions: '<button class="btn sm primary" data-act="agendar">' + ic('plus') + 'Agendar</button>', bodyCls: 'flush', body: visits.length ? '<div class="list">' + visits.slice(0, 4).map((v) => '<div class="li"><span class="li-ic brand">' + ic('calendar-check', 'ic-sm') + '</span><div class="grow"><div class="t">' + u.cap(u.fmtDateLong(v.fecha).replace(/ de \d{4}$/, '')) + '</div><div class="d">' + v.hora + ' · ' + esc(v.visitante) + '</div></div>' + ui.badge(u.relDay(v.fecha), 'brand') + '</div>').join('') + '</div>' : '<div style="padding:4px 20px 18px">' + ui.empty({ ill: 'calendar', title: 'Sin visitas agendadas', text: 'Agendá tu próxima visita en un minuto.' }) + '</div>' }) +
      ui.card({ title: 'Estado de cuenta', icon: 'wallet', body: '<div class="row between"><div><div class="muted" style="font-size:var(--fs-sm)">Saldo actual</div><div class="num" style="font-size:24px;font-weight:700;letter-spacing:-.02em">' + u.fmtMoney(Math.max(0, a.saldo)) + '</div></div>' + (a.vencido ? ui.badge('Vencido ' + u.fmtMoney(a.vencido), 'danger', { icon: 'circle-alert' }) : a.saldo > 0 ? ui.badge('Vence el ' + u.fmtDate(BT.cob ? BT.cob.dueDate(u.ym(u.today())) : u.today()), 'warn', { icon: 'clock' }) : ui.badge('Al día', 'ok', { icon: 'circle-check' })) + '</div>' +
        (pays.length ? '<div class="sec-t mt-16">Últimos pagos</div>' + pays.map((p) => '<div class="row between" style="padding:6px 0;font-size:var(--fs-md)"><span><span class="num">' + u.fmtDate(p.fecha) + '</span> <span class="subtle">· ' + esc(p.recibo) + '</span></span><span class="row gap-6"><b class="num">' + u.fmtMoney(p.monto) + '</b><button class="btn xs ghost" data-act="rec" data-id="' + p.id + '" data-tip="Descargar recibo">' + ic('download') + '</button></span></div>').join('') : '') +
        '<button class="btn block mt-16" data-act="ec">' + ic('file-text') + 'Descargar estado de cuenta</button>' + '<p class="subtle mt-8" style="font-size:var(--fs-xs)">Transferencia BROU 001-234567-00001 · Galauru SAS</p>' }) +
      (coms.length ? ui.card({ title: 'Comunicados', icon: 'megaphone', bodyCls: 'flush', body: '<div class="list">' + coms.slice(0, 3).map((p) => '<div class="li"><span class="li-ic info">' + ic('megaphone', 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(p.titulo) + '</div><div class="d">' + esc(p.texto) + '</div><div class="w" style="margin-top:3px">' + u.rel(p.ts) + '</div></div></div>').join('') + '</div>' }) : '') +
      ui.card({ title: 'Próximas actividades', icon: 'palette', bodyCls: 'flush', body: '<div class="list">' + acts.map((x) => '<div class="li"><span class="li-ic violet">' + ic('calendar-days', 'ic-sm') + '</span><div class="grow"><div class="t">' + esc(x.titulo) + '</div><div class="d">' + u.cap(u.relDay(x.fecha)) + ' · ' + x.hora + ' · ' + esc(x.lugar) + '</div></div></div>').join('') + '</div>' }) +
      ui.card({ title: 'Contacto', icon: 'phone', body: ui.kv([['Teléfono', esc(sedeObj.tel)], ['Correo', esc(sedeObj.email)], ['Dirección', esc(sedeObj.direccion)], ['Médico', esc(r.medico)]]) + '<button class="btn block mt-16" data-act="wachat" style="color:#128c4a;border-color:#bfe6cf">' + ic('message-circle') + 'Escribir por WhatsApp</button>' }) +
      '</div></div>';
    ui.on(el, {
      agendar: () => FM.agendar(rid, () => { FM.portal(el, rid, opts); ui.enhance(el); }),
      ec: () => (BT.cob ? BT.cob.estadoCuentaPDF(rid) : null),
      rec: (t) => BT.cob && BT.cob.reciboPDF(t.dataset.id),
      wachat: () => ui.toast('Abriendo WhatsApp de ' + BT.sedeName(r.sede), { icon: 'message-circle', sub: 'Simulado en la demo · ' + sedeObj.tel }),
    });
  };

  /* ---------------- Publicar novedad ---------------- */
  FM.publicar = function () {
    const sedes = BT.state.sede === 'ALL' ? ['BT1', 'BT2'] : [BT.state.sede];
    const res = BT.db.residents.filter((r) => r.estado === 'activo' && sedes.includes(r.sede));
    let preset = 0;
    ui.modal({
      title: 'Publicar en el portal', sub: 'Las familias lo ven al instante en su portal', icon: 'megaphone', size: 'lg',
      body: '<div class="form-grid">' + ui.field({ label: 'Tipo', name: 'tipo', type: 'chips', value: 'Foto', options: [{ v: 'Novedad', l: 'Novedad', icon: 'sparkles' }, { v: 'Foto', l: 'Foto', icon: 'image' }, { v: 'Comunicado', l: 'Comunicado', icon: 'megaphone' }], full: true }) +
        ui.field({ label: 'Para', name: 'rid', type: 'select', value: '', options: [{ v: '', l: 'Todas las familias de ' + (sedes.length > 1 ? 'ambas sedes' : sedes[0]) }].concat(res.map((r) => ({ v: r.id, l: 'Familia de ' + BT.fullName(r) + ' (' + r.sede + ')' }))) }) +
        ui.field({ label: 'Título', name: 'titulo', required: true, placeholder: 'Ej.: Tarde de huerta' }) +
        ui.field({ label: 'Texto', name: 'texto', type: 'textarea', required: true, full: true, placeholder: 'Contales a las familias cómo estuvo el día…' }) +
        '<div class="field full" id="fotoF"><label>Foto</label><div class="row wrap gap-6">' + PRESETS.map((p, i) => '<button type="button" class="preset ' + (i === 0 ? 'on' : '') + '" data-p="' + i + '" style="background:' + p.grad + '">' + ic(p.icon) + '</button>').join('') + '<span class="muted" style="font-size:var(--fs-xs);margin-left:6px">En la versión real se sube desde la tablet o el celular</span></div></div>' +
        ui.field({ label: 'Epígrafe de la foto', name: 'cap', placeholder: 'Ej.: Huerta · BT1', full: true }) +
        '<label class="row full" style="gap:10px;font-size:var(--fs-md)"><span class="switch"><input type="checkbox" name="wa"><span></span></span>Avisar también por WhatsApp</label></div>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-pub>' + ic('send') + 'Publicar</button>',
      onMount: (el, close) => {
        const sync = () => { const t = ui.formData(el).tipo; el.querySelector('#fotoF').classList.toggle('hidden', t !== 'Foto'); el.querySelector('[name=cap]').closest('.field').classList.toggle('hidden', t !== 'Foto'); };
        el.addEventListener('chipchange', sync); sync();
        el.querySelectorAll('.preset').forEach((b) => b.addEventListener('click', () => { preset = +b.dataset.p; el.querySelectorAll('.preset').forEach((x) => x.classList.toggle('on', x === b)); }));
        el.querySelector('[data-pub]').addEventListener('click', () => {
          const b = el.querySelector('.modal-b'); if (!ui.validate(b)) return; const d = ui.formData(b);
          const r = d.rid ? BT.resident(d.rid) : null;
          const post = { id: u.uid('po'), sede: r ? r.sede : sedes.length > 1 ? 'ALL' : sedes[0], residentId: d.rid || null, ts: Date.now(), autor: BT.state.user.nombre, tipo: d.tipo, titulo: d.titulo, texto: d.texto, foto: d.tipo === 'Foto' ? Object.assign({}, PRESETS[preset], { caption: d.cap || d.titulo }) : null };
          BT.db.posts.unshift(post); BT.audit('Publicó', 'Portal de familias', { residentId: post.residentId, detail: post.tipo + ': ' + post.titulo }); BT.save();
          const n = r ? 1 : res.length;
          close(); ui.toast('Publicado en el portal', { sub: 'Visible para ' + n + (n === 1 ? ' familia' : ' familias'), icon: 'megaphone' });
          BT.refresh();
          if (d.wa) setTimeout(() => FM.whatsapp({ to: r ? [r.referente.nombre] : null, text: d.titulo + '\n' + d.texto + '\n\nMirá las fotos en el portal de Buenos Tiempos 🌿' }), 350);
        });
      },
    });
  };

  /* ---------------- Registrar ingreso de visita ---------------- */
  FM.ingreso = function () {
    const res = BT.residentsInSede();
    ui.modal({
      title: 'Registrar ingreso de visita', icon: 'log-in', sub: 'Libro de visitas · ' + u.fmtDateTime(Date.now()),
      body: '<div class="form-grid">' + ui.field({ label: 'Residente', name: 'rid', type: 'select', required: true, full: true, placeholder: 'Elegí un residente', options: res.map((r) => ({ v: r.id, l: BT.fullName(r) + ' · ' + r.sede + ' · Hab. ' + r.habitacion + r.cama })) }) +
        '<div class="full" id="rsBox"></div>' + ui.field({ label: 'Visitante', name: 'vis', required: true, placeholder: 'Nombre y apellido' }) + ui.field({ label: 'Vínculo', name: 'vin', type: 'select', value: 'Hijo/a', options: ['Hijo/a', 'Nieto/a', 'Esposo/a', 'Sobrino/a', 'Hermano/a', 'Amigo/a', 'Vecino/a', 'Otro'] }) + '</div>',
      foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-ok>' + ic('log-in') + 'Registrar ingreso</button>',
      onMount: (el, close) => {
        el.addEventListener('change', (e) => { if (e.target.name !== 'rid') return; const rs = restriccion(e.target.value); const r = BT.resident(e.target.value); el.querySelector('#rsBox').innerHTML = rs ? '<div class="alert danger">' + ic('shield-alert') + '<div><b>Restricción de visitas vigente</b> (indicada por ' + esc(rs.indicadoPor) + ' hasta el ' + u.fmtDate(rs.hasta) + '). ' + esc(rs.motivo) + '</div></div>' : ''; if (r && !el.querySelector('[name=vis]').value) el.querySelector('[name=vis]').value = r.referente.nombre; });
        el.querySelector('[data-ok]').addEventListener('click', () => {
          const b = el.querySelector('.modal-b'); if (!ui.validate(b)) return; const d = ui.formData(b); const r = BT.resident(d.rid);
          BT.db.visits.push({ id: u.uid('vi'), residentId: r.id, sede: r.sede, visitante: d.vis, vinculo: d.vin, fecha: u.todayIso(), hora: u.fmtTime(new Date()), estado: 'En curso' });
          BT.audit('Registró visita', 'Libro de visitas', { residentId: r.id, detail: d.vis + ' (' + d.vin + ')' + (restriccion(r.id) ? ' · con restricción vigente' : '') }); BT.save();
          close(); ui.toast('Ingreso registrado', { sub: d.vis + ' visita a ' + BT.shortName(r), icon: 'log-in' }); BT.state.sub.fam = 'libro'; BT.refresh();
        });
      },
    });
  };

  /* ---------------- Alertas ---------------- */
  /* Ley 18.331: el familiar solo recibe avisos de su propio portal (nunca de otros residentes) */
  const origAlerts = BT.alerts;
  BT.alerts = function () { const a = origAlerts.apply(this, arguments); return BT.isRole('familiar') ? a.filter((x) => String(x.id || '').startsWith('fam-')) : a; };
  BT.addAlerts(() => {
    const t = u.todayIso();
    if (BT.isRole('familiar')) {
      const rid = BT.state.user.residentId; const v = BT.db.visits.find((x) => x.residentId === rid && x.fecha === t && x.estado === 'Agendada');
      const nw = BT.db.posts.filter((p) => p.residentId === rid && Date.now() - p.ts < 36 * 3600000);
      return (v ? [{ id: 'fam-v', tone: 'info', icon: 'calendar-check', title: 'Tu visita de hoy a las ' + v.hora, desc: 'Te esperamos en ' + BT.sedeName(v.sede), tab: 'familias' }] : []).concat(nw.map((p) => ({ id: 'fam-p' + p.id, tone: 'ok', icon: 'sparkles', title: p.titulo, desc: 'Nueva publicación', when: p.ts, tab: 'familias' })));
    }
    if (!BT.isRole('direccion', 'administracion')) return [];
    const vs = BT.bySede(BT.db.visits.filter((v) => v.fecha === t && v.estado === 'Agendada'));
    return vs.length ? [{ id: 'fam-hoy', tone: 'info', icon: 'calendar-heart', title: vs.length + (vs.length === 1 ? ' visita agendada hoy' : ' visitas agendadas hoy'), desc: vs.slice(0, 3).map((v) => v.hora + ' ' + BT.shortName(BT.resident(v.residentId))).join(' · '), tab: 'familias', params: { sub: 'agenda' }, action: () => { BT.state.sub.fam = 'agenda'; BT.go('familias'); } }] : [];
  });

  /* ---------------- Pestaña ---------------- */
  BT.tab({
    id: 'familias', label: 'Familias', icon: 'heart', group: 'gestion', order: 10, roles: ['direccion', 'administracion', 'familiar'],
    render(el, params) {
      if (BT.isRole('familiar')) { const w = document.createElement('div'); el.appendChild(w); FM.portal(w, BT.state.user.residentId); return; }
      if (params && params.sub) { BT.state.sub.fam = params.sub; params.sub = null; }
      const res = BT.residentsInSede(); const t = u.todayIso();
      const vis = BT.bySede(BT.db.visits);
      const hoy = vis.filter((v) => v.fecha === t && v.estado !== 'Cancelada');
      const prox = vis.filter((v) => v.estado === 'Agendada' && v.fecha >= t && v.fecha <= u.iso(u.addDays(u.today(), 7)));
      const posts = BT.db.posts.filter((p) => BT.inSede(p) || p.sede === 'ALL').sort((a, b) => b.ts - a.ts);
      const mesPosts = posts.filter((p) => Date.now() - p.ts < 30 * 86400000);
      el.innerHTML = ui.pageHeader({ eyebrow: 'Familias · ' + BT.sedeName(), icon: 'heart', title: 'Familias y visitas', sub: 'Portal del familiar, novedades, comunicados y libro de visitas',
        actions: '<button class="btn" data-act="wa" style="color:#128c4a">' + ic('message-circle') + 'Notificar por WhatsApp</button><button class="btn primary" data-act="pub">' + ic('plus') + 'Publicar</button>' }) +
        '<div class="grid g-4 stagger">' +
        ui.kpi({ label: 'Familias con portal activo', value: res.length, icon: 'users-round', foot: '100 % de los residentes' }) +
        ui.kpi({ label: 'Visitas hoy', value: hoy.length, icon: 'calendar-heart', tone: 'info', foot: hoy.filter((v) => v.estado === 'En curso').length + ' en curso ahora' }) +
        ui.kpi({ label: 'Agendadas próximos 7 días', value: prox.length, icon: 'calendar-days', tone: 'ink' }) +
        ui.kpi({ label: 'Publicaciones del mes', value: mesPosts.length, icon: 'image', foot: mesPosts.filter((p) => p.tipo === 'Foto').length + ' con fotos' }) +
        '</div><div class="mt-24" id="famBody"></div>';
      ui.subtabs(el.querySelector('#famBody'), 'fam', [
        { id: 'novedades', label: 'Novedades y fotos', icon: 'image' },
        { id: 'agenda', label: 'Agenda de visitas', icon: 'calendar-days', count: prox.length || '' },
        { id: 'libro', label: 'Libro de visitas', icon: 'book-open' },
        { id: 'portal', label: 'Vista del familiar', icon: 'smartphone' },
      ], (p, id) => PANELS[id](p, { res, posts, vis }));
      ui.on(el, {
        wa: () => FM.whatsapp(), pub: () => FM.publicar(), ingreso: () => FM.ingreso(),
        salida: (b) => { const v = BT.db.visits.find((x) => x.id === b.dataset.id); v.estado = 'Realizada'; v.salida = u.fmtTime(new Date()); BT.audit('Registró salida', 'Libro de visitas', { residentId: v.residentId, detail: v.visitante }); BT.save(); ui.toast('Salida registrada', { sub: v.visitante + ' · ' + v.salida, icon: 'log-out' }); BT.refresh(); },
        llego: (b) => { const v = BT.db.visits.find((x) => x.id === b.dataset.id); v.estado = 'En curso'; v.hora = u.fmtTime(new Date()); v.fecha = u.todayIso(); BT.audit('Registró visita', 'Libro de visitas', { residentId: v.residentId, detail: v.visitante }); BT.save(); ui.toast('Llegada registrada', { sub: v.visitante, icon: 'log-in' }); BT.refresh(); },
        cancelar: (b) => { const v = BT.db.visits.find((x) => x.id === b.dataset.id); v.estado = 'Cancelada'; BT.save(); ui.toast('Visita cancelada', { type: 'warn', sub: v.visitante }); BT.refresh(); },
        nueva: () => { const r = BT.residentsInSede()[0]; FM.agendarPick(r && r.id); },
      });
    },
  });
  FM.agendarPick = function () {
    const res = BT.residentsInSede();
    ui.modal({ title: '¿Para qué residente?', icon: 'calendar-plus', body: ui.field({ label: 'Residente', name: 'rid', type: 'select', options: res.map((r) => ({ v: r.id, l: BT.fullName(r) + ' · ' + r.sede })) }), foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-ok>Continuar</button>',
      onMount: (el, close) => el.querySelector('[data-ok]').addEventListener('click', () => { const rid = el.querySelector('[name=rid]').value; close(); setTimeout(() => FM.agendar(rid), 240); }) });
  };

  const PANELS = {
    novedades(p, { posts }) {
      p.innerHTML = posts.length ? '<div class="grid g-3 stagger">' + posts.map((x) => FM.postCard(x)).join('') + '</div>' : ui.empty({ ill: 'leaf', title: 'Sin publicaciones', text: 'Compartí la primera novedad con las familias.', action: '<button class="btn primary" data-act="pub">' + ic('plus') + 'Publicar</button>' });
    },
    agenda(p, { vis }) {
      const t = u.todayIso();
      const list = vis.filter((v) => v.estado === 'Agendada' && v.fecha >= t).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
      const byDay = u.groupBy(list, 'fecha');
      p.innerHTML = ui.card({ title: 'Próximas visitas', icon: 'calendar-days', sub: list.length + ' agendadas', actions: '<button class="btn sm" data-act="nueva">' + ic('plus') + 'Agendar visita</button>', bodyCls: 'flush',
        body: list.length ? Object.keys(byDay).sort().map((d) => '<div class="visit-day">' + u.cap(u.relDay(d)) + ' · ' + u.cap(u.fmtDateLong(d).replace(/ de \d{4}$/, '')) + '</div><div class="list">' + byDay[d].map((v) => { const r = BT.resident(v.residentId); const rs = restriccion(v.residentId); return '<div class="li"><span class="badge outline num" style="min-width:56px;justify-content:center">' + v.hora + '</span>' + ui.person(v.visitante, esc(v.vinculo) + ' de ' + esc(BT.fullName(r)) + ' · ' + r.sede + ' Hab. ' + r.habitacion + r.cama) + '<div class="grow"></div>' + (rs ? ui.badge('Con restricción', 'danger', { icon: 'shield-alert', tip: rs.motivo }) : '') + (d === t ? '<button class="btn xs soft" data-act="llego" data-id="' + v.id + '">' + ic('log-in') + 'Llegó</button>' : '') + '<button class="btn xs ghost" data-act="cancelar" data-id="' + v.id + '" data-tip="Cancelar visita">' + ic('x') + '</button></div>'; }).join('') + '</div>').join('')
          : '<div style="padding:8px 20px 20px">' + ui.empty({ ill: 'calendar', title: 'Sin visitas agendadas', text: 'Las familias pueden agendar desde su portal.' }) + '</div>' });
    },
    libro(p, { vis }) {
      const desde = u.iso(u.addDays(u.today(), -20));
      const list = vis.filter((v) => (v.estado === 'Realizada' || v.estado === 'En curso') && v.fecha >= desde).sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
      p.innerHTML = ui.card({ title: 'Libro de visitas', icon: 'book-open', sub: 'Registro de entradas y salidas · últimos 20 días', actions: '<button class="btn sm primary" data-act="ingreso">' + ic('log-in') + 'Registrar ingreso</button>', bodyCls: 'flush',
        body: ui.table([
          { label: 'Fecha', render: (v) => '<span class="num">' + u.fmtDate(v.fecha) + '</span>' },
          { label: 'Entrada', render: (v) => '<span class="num">' + v.hora + '</span>' }, { label: 'Salida', render: (v) => (v.salida ? '<span class="num">' + v.salida + '</span>' : '<span class="subtle">—</span>') },
          { label: 'Visitante', render: (v) => '<div class="strong" style="font-size:var(--fs-md)">' + esc(v.visitante) + '</div><div class="muted" style="font-size:var(--fs-xs)">' + esc(v.vinculo) + '</div>' },
          { label: 'Residente', render: (v) => { const r = BT.resident(v.residentId); return esc(BT.fullName(r)) + ' <span class="subtle">· ' + r.sede + '</span>' + (restriccion(v.residentId) ? ' ' + ui.badge('Restricción', 'danger', { icon: 'shield-alert' }) : ''); } },
          { label: 'Estado', render: (v) => (v.estado === 'En curso' ? '<span class="live">En curso</span>' : ui.badge('Finalizada', 'outline')) },
          { label: '', align: 'num', render: (v) => (v.estado === 'En curso' ? '<button class="btn xs" data-act="salida" data-id="' + v.id + '">' + ic('log-out') + 'Registrar salida</button>' : '') },
        ], list, { compact: true, empty: { ill: 'default', title: 'Sin visitas registradas', text: 'Registrá el ingreso de la próxima visita.' } }) });
    },
    portal(p, { res }) {
      const sel = BT.state.sub.famPrev && res.some((r) => r.id === BT.state.sub.famPrev) ? BT.state.sub.famPrev : (res[0] && res[0].id);
      p.innerHTML = '<div class="row between wrap mb-16"><div class="muted" style="font-size:var(--fs-md)">' + ic('eye', 'ic-sm') + ' Así ve el portal la familia de cada residente (sin datos clínicos, según Ley 18.331).</div><select class="select" id="famPrev" style="width:auto;min-width:280px">' + res.map((r) => '<option value="' + r.id + '"' + (r.id === sel ? ' selected' : '') + '>' + esc(BT.fullName(r)) + ' · ' + esc(r.referente.nombre) + '</option>').join('') + '</select></div><div class="device"><div class="bar">' + ic('lock', 'ic-xs') + 'portal.buenostiempos.com.uy</div><div class="scr" id="famScr"></div></div>';
      const draw = () => { const scr = p.querySelector('#famScr'); FM.portal(scr, BT.state.sub.famPrev || sel, { preview: true }); ui.enhance(scr); };
      BT.state.sub.famPrev = sel; draw();
      p.querySelector('#famPrev').addEventListener('change', (e) => { BT.state.sub.famPrev = e.target.value; draw(); });
    },
  };
})();

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
    .wa-b.has-img{padding:4px 4px 6px;max-width:300px}
    .wa-b.has-img .wa-meta{padding-right:6px}
    .wa-b.has-img{white-space:pre-wrap}
    .wa-img{display:block;width:100%;border-radius:8px;margin-bottom:6px}
    .wa-b.has-img .wa-tx{padding:0 6px}
    .fly-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:16px;align-items:start}
    .fly-prev{position:sticky;top:84px}
    .fly-canvas{border-radius:18px;overflow:hidden;box-shadow:var(--sh-3);background:var(--surface-2);max-width:440px;margin:0 auto}
    .fly-canvas canvas{display:block;width:100%;height:auto;aspect-ratio:4/5}
    .fly-actions{display:flex;flex-direction:column;gap:10px;max-width:440px;margin:16px auto 0}
    .fly-themes,.fly-icons{display:flex;flex-wrap:wrap;gap:8px}
    .fly-th{width:46px;height:46px;border-radius:14px;border:3px solid #fff;box-shadow:0 0 0 1px var(--line);cursor:pointer;transition:transform var(--d-fast) var(--ease),box-shadow var(--d-fast)}
    .fly-th:hover{transform:translateY(-2px)}
    .fly-th.on{box-shadow:0 0 0 2px var(--ink-900)}
    .fly-ic{width:42px;height:42px;border-radius:12px;border:1px solid var(--line);background:var(--surface);display:grid;place-items:center;color:var(--ink-600);cursor:pointer;transition:all var(--d-fast) var(--ease)}
    .fly-ic:hover{border-color:var(--brand-300);color:var(--brand-700)}
    .fly-ic.on{background:var(--brand-600);border-color:var(--brand-600);color:#fff}
    @media (max-width:980px){.fly-grid{grid-template-columns:1fr}.fly-prev{position:static}}
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
  const waFmt = (t) => esc(t).replace(/\*([^*\n]+)\*/g, '<b>$1</b>');
  FM.whatsapp = function ({ to, text = '', title = 'Notificar por WhatsApp', after, image, sedes: only, audit } = {}) {
    const sedes = only || (BT.state.sede === 'ALL' ? ['BT1', 'BT2'] : [BT.state.sede]);
    const res = BT.db.residents.filter((r) => r.estado === 'activo' && sedes.includes(r.sede));
    let aud = 'todas'; let rid = res[0] && res[0].id;
    const recipients = () => (to ? to : aud === 'todas' ? res.map((r) => r.referente.nombre) : [BT.resident(rid).referente.nombre]);
    const tpl = text || 'Hola, te escribimos de Residencial Buenos Tiempos 🌿\nTe contamos que este sábado a las 16:00 haremos la fiesta de fin de año con las familias en el patio. ¡Los esperamos!';
    const bubble = (t) => '<div class="wa-b' + (image ? ' has-img' : '') + '" id="waB">' + (image ? '<img class="wa-img" src="' + image + '" alt="Flyer">' : '') + '<div class="wa-tx">' + waFmt(t) + '</div>' + '<div class="wa-meta">' + u.fmtTime(new Date()) + ' <span class="wa-ticks" id="waT">' + ic('check-check', 'ic-xs') + '</span></div></div>';
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
          BT.audit(audit || 'Envió WhatsApp', 'Familias', { detail: n + ' destinatarios' + (image ? ' · con imagen' : '') });
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
      el.innerHTML = ui.pageHeader({ eyebrow: 'Familias · ' + BT.sedeName(), icon: 'heart', title: 'Familias y visitas', sub: 'Novedades, flyers de actividades por WhatsApp, visitas y libro de visitas',
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
        { id: 'flyer', label: 'Flyer de actividades', icon: 'image-plus' },
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
  /* ---------------- Flyer de actividades (imagen para WhatsApp) ---------------- */
  const FLY = [
    { id: 'verde', name: 'Verde', c1: '#4a9a62', c2: '#153f26', acc: '#c9ecd3' },
    { id: 'atardecer', name: 'Atardecer', c1: '#f3a86b', c2: '#b04a35', acc: '#ffe3c9' },
    { id: 'lavanda', name: 'Lavanda', c1: '#a08fdc', c2: '#45378a', acc: '#e6dfff' },
    { id: 'celeste', name: 'Celeste', c1: '#63b4da', c2: '#1f5a8e', acc: '#d8f0ff' },
    { id: 'rosa', name: 'Rosa', c1: '#ea9fb3', c2: '#9c4258', acc: '#ffe1e9' },
  ];
  const FLY_TIPO = {
    Movimiento: ['verde', 'activity', 'Una mañana para movernos, estirar y sumar energía. ¡Vení a acompañar!'],
    Cognitiva: ['lavanda', 'brain', 'Juegos y ejercicios para mantener la mente activa, en un ambiente cálido y entre amigos.'],
    Música: ['lavanda', 'music', 'Una tarde de canciones, ritmo y recuerdos. ¡La música nos une!'],
    'Aire libre': ['verde', 'sprout', 'Plantamos, regamos y disfrutamos del patio juntos. Los esperamos con mate.'],
    Recreativa: ['celeste', 'popcorn', 'Una tarde distinta para compartir, reírnos y pasarla bien en familia.'],
    Celebración: ['rosa', 'party-popper', '¡Vení a celebrar con nosotros! Habrá música, merienda y mucha alegría.'],
  };
  const FLY_ICONS = ['party-popper', 'music', 'sprout', 'brain', 'activity', 'popcorn', 'cake', 'palette', 'heart', 'sun'];
  const svgImg = (name, color, sw) => new Promise((res) => {
    const svg = BT.ic(name).replace('class="ic "', 'width="240" height="240"').replace('stroke="currentColor"', 'stroke="' + color + '"').replace('stroke-width="2"', 'stroke-width="' + (sw || 2) + '"');
    const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
  const imgFrom = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  const rrect = (x, c, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  const wrap = (c, text, maxW, maxLines) => {
    const words = String(text || '').split(/\s+/).filter(Boolean); const lines = []; let line = '';
    words.forEach((w) => { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    if (lines.length > maxLines) { const cut = lines.slice(0, maxLines); let l = cut[maxLines - 1]; while (c.measureText(l + '…').width > maxW && l.length) l = l.slice(0, -1); cut[maxLines - 1] = l.trim() + '…'; return cut; }
    return lines;
  };
  const F = (w, s) => w + ' ' + s + 'px InterVar, Inter, "Segoe UI", sans-serif';

  /** Dibuja el flyer (1080 × 1350, formato 4:5 ideal para WhatsApp) */
  FM.drawFlyer = async function (canvas, d) {
    const W = 1080, H = 1350; canvas.width = W; canvas.height = H;
    const c = canvas.getContext('2d'); const th = FLY.find((x) => x.id === d.theme) || FLY[0];
    try { await Promise.all([document.fonts.load(F(800, 60)), document.fonts.load(F(500, 30)), document.fonts.load(F(700, 30))]); } catch (e) { /* sin fuente */ }
    const [logo, big, icCal, icClock, icPin] = await Promise.all([imgFrom(BT.LOGO), svgImg(d.icon || 'sparkles', 'rgba(255,255,255,.95)', 1.6), svgImg('calendar-days', th.c2, 2.2), svgImg('clock', th.c2, 2.2), svgImg('map-pin', th.c2, 2.2)]);
    // Fondo
    const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, th.c1); g.addColorStop(1, th.c2); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.08)'; c.beginPath(); c.arc(W - 90, 250, 330, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.06)'; c.beginPath(); c.arc(80, H - 120, 260, 0, Math.PI * 2); c.fill();
    // Hojas decorativas
    c.save(); c.translate(W - 40, 40); c.rotate(0.5); c.fillStyle = 'rgba(255,255,255,.07)'; c.beginPath(); c.ellipse(0, 0, 70, 180, 0, 0, Math.PI * 2); c.fill(); c.restore();
    // Encabezado: logo + nombre
    c.fillStyle = '#fff'; rrect(72, c, 72, 150, 150, 34); c.fill();
    if (logo) { const s = 124; const r = logo.width / logo.height; const lw = r >= 1 ? s : s * r; const lh = r >= 1 ? s / r : s; c.drawImage(logo, 72 + (150 - lw) / 2, 72 + (150 - lh) / 2, lw, lh); }
    c.fillStyle = '#fff'; c.font = F(800, 40); c.textBaseline = 'alphabetic'; c.fillText('Residencial Buenos Tiempos', 250, 136);
    c.fillStyle = th.acc; c.font = F(500, 30); c.fillText(d.sedeName || '', 250, 182);
    // Ícono grande
    if (big) { c.globalAlpha = 0.95; c.drawImage(big, W - 72 - 200, 300, 200, 200); c.globalAlpha = 1; }
    // Etiqueta
    const tag = (d.tag || 'Actividad').toUpperCase(); c.font = F(800, 26); const tw = c.measureText(tag).width + 56;
    c.fillStyle = 'rgba(255,255,255,.18)'; rrect(72, c, 320, tw, 58, 29); c.fill(); c.fillStyle = '#fff'; c.fillText(tag, 100, 359);
    // Título
    c.font = F(800, 92); const tl = wrap(c, d.titulo || 'Título de la actividad', W - 144 - (big ? 250 : 0), 3);
    let y = 400 + 92; tl.forEach((l) => { c.fillStyle = '#fff'; c.fillText(l, 72, y); y += 100; });
    // Texto
    c.font = F(500, 38); c.fillStyle = 'rgba(255,255,255,.92)'; const dl = wrap(c, d.texto || '', W - 144, 4);
    y += 6; dl.forEach((l) => { c.fillText(l, 72, y); y += 54; });
    // Tarjeta de datos
    const cardY = Math.max(y + 30, H - 72 - 330); const cardH = H - 72 - cardY - 96;
    c.save(); c.shadowColor = 'rgba(0,0,0,.22)'; c.shadowBlur = 40; c.shadowOffsetY = 14; c.fillStyle = '#fff'; rrect(72, c, cardY, W - 144, cardH, 36); c.fill(); c.restore();
    const rows = [[icCal, d.fechaTxt || ''], [icClock, d.hora ? d.hora + ' hs' : ''], [icPin, d.lugar || '']].filter((r) => r[1]);
    const rh = cardH / Math.max(rows.length, 1);
    rows.forEach(([im, txt], i) => {
      const cy = cardY + rh * i + rh / 2;
      c.fillStyle = th.acc; c.beginPath(); c.arc(72 + 64, cy, 34, 0, Math.PI * 2); c.fill();
      if (im) c.drawImage(im, 72 + 64 - 22, cy - 22, 44, 44);
      c.fillStyle = '#1f2a22'; c.font = F(700, 40); c.textBaseline = 'middle'; c.fillText(wrap(c, txt, W - 144 - 150, 1)[0] || '', 72 + 122, cy + 2); c.textBaseline = 'alphabetic';
      if (i < rows.length - 1) { c.fillStyle = '#ece8e0'; c.fillRect(72 + 40, cardY + rh * (i + 1), W - 144 - 80, 2); }
    });
    // Pie
    c.fillStyle = '#fff'; c.font = F(800, 40); c.fillText(d.cierre || '¡Los esperamos!', 72, H - 72);
    if (d.tel) { c.font = F(600, 30); c.fillStyle = th.acc; const t = 'Consultas: ' + d.tel; c.fillText(t, W - 72 - c.measureText(t).width, H - 72); }
    return canvas;
  };

  const canvasBlob = (cv) => new Promise((res) => cv.toBlob((b) => res(b), 'image/png'));

  PANELS.flyer = function (p) {
    const sedes = BT.state.sede === 'ALL' ? ['BT1', 'BT2'] : [BT.state.sede];
    const t = u.todayIso(); const lim = u.iso(u.addDays(u.today(), 45));
    const acts = BT.db.activities.filter((a) => sedes.includes(a.sede) && a.fecha >= t && a.fecha <= lim).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    const special = acts.filter((a) => ['Celebración', 'Recreativa'].includes(a.tipo) && a.responsable === 'Dirección');
    const first = special.find((a) => a.tipo === 'Celebración') || special[0] || acts[0];
    const S = BT.state.sub.flyer = Object.assign({ actId: first ? first.id : '' }, BT.state.sub.flyer && BT.state.sub.flyer.actId ? BT.state.sub.flyer : {});
    const fromAct = (a) => {
      const tp = FLY_TIPO[a.tipo] || ['verde', 'sparkles', 'Los esperamos para compartir una linda actividad juntos.'];
      const sObj = BT.db.sedes.find((x) => x.id === a.sede);
      const kw = u.norm(a.titulo); const icon = /coro|music|cant|guitar/.test(kw) ? 'music' : /cine|pelicul/.test(kw) ? 'popcorn' : /fiesta|cumple|celebr/.test(kw) ? 'party-popper' : tp[1];
      const texto = /coro/.test(kw) ? 'Nos visita el coro con un repertorio de canciones para disfrutar juntos. ¡Vení a cantar con nosotros!' : tp[2];
      return { actId: a.id, sede: a.sede, titulo: a.titulo, fecha: a.fecha, hora: a.hora, lugar: a.lugar + ' · ' + (sObj ? sObj.direccion : ''), texto, theme: tp[0], icon, tag: a.tipo === 'Celebración' ? 'Celebración' : 'Actividad · ' + a.tipo };
    };
    let D = S.titulo ? S : Object.assign(S, first ? fromAct(first) : { sede: sedes[0], titulo: '', fecha: t, hora: '16:00', lugar: '', texto: '', theme: 'verde', icon: 'sparkles', tag: 'Actividad' });
    const dataFor = () => { const sObj = BT.db.sedes.find((x) => x.id === D.sede); return Object.assign({}, D, { sedeName: sObj ? sObj.nombre : '', tel: sObj ? sObj.tel : '', fechaTxt: D.fecha ? u.cap(u.fmtDateLong(D.fecha).replace(/ de \d{4}$/, '')) : '' }); };
    const msgFor = () => { const x = dataFor(); return '🌿 *' + x.titulo + '*\n📅 ' + x.fechaTxt + (x.hora ? ' · ' + x.hora + ' hs' : '') + '\n📍 ' + x.lugar + '\n\n' + x.texto + '\n\n¡Los esperamos! Residencial Buenos Tiempos'; };
    const canShare = !!(navigator.canShare && window.File && (() => { try { return navigator.canShare({ files: [new File([''], 'a.png', { type: 'image/png' })] }); } catch (e) { return false; } })());
    p.innerHTML = '<div class="fly-grid">' +
      '<div class="card"><div class="card-h"><div><h3>' + ic('wand-sparkles') + 'Armá el flyer</h3><div class="sub">Elegí una actividad del calendario y ajustá los textos</div></div></div><div class="card-b"><div class="form-grid">' +
      ui.field({ label: 'Actividad', name: 'act', type: 'select', value: D.actId, full: true, options: [{ v: '', l: '— Flyer libre (sin actividad del calendario) —' }].concat(acts.map((a) => ({ v: a.id, l: u.cap(u.relDay(a.fecha)) + ' ' + u.fmtDate(a.fecha).slice(0, 5) + ' · ' + a.hora + ' · ' + a.titulo + ' (' + a.sede + ')' }))) }) +
      ui.field({ label: 'Título', name: 'titulo', value: D.titulo, full: true, attrs: 'maxlength="60"' }) +
      ui.field({ label: 'Fecha', name: 'fecha', type: 'date', value: D.fecha }) + ui.field({ label: 'Hora', name: 'hora', type: 'time', value: D.hora }) +
      ui.field({ label: 'Lugar', name: 'lugar', value: D.lugar, full: true }) +
      ui.field({ label: 'Texto para las familias', name: 'texto', type: 'textarea', value: D.texto, full: true, attrs: 'rows="3" maxlength="180"' }) +
      ui.field({ label: 'Etiqueta', name: 'tag', value: D.tag, attrs: 'maxlength="28"' }) +
      ui.field({ label: 'Sede', name: 'sede', type: 'select', value: D.sede, options: sedes.map((s) => ({ v: s, l: BT.sedeName(s) })) }) +
      '<div class="field full"><label>Diseño</label><div class="fly-themes">' + FLY.map((x) => '<button type="button" class="fly-th' + (x.id === D.theme ? ' on' : '') + '" data-th="' + x.id + '" style="background:linear-gradient(135deg,' + x.c1 + ',' + x.c2 + ')" aria-label="' + x.name + '" data-tip="' + x.name + '"></button>').join('') + '</div></div>' +
      '<div class="field full"><label>Ícono</label><div class="fly-icons">' + FLY_ICONS.map((n) => '<button type="button" class="fly-ic' + (n === D.icon ? ' on' : '') + '" data-ico="' + n + '" aria-label="' + n + '">' + ic(n) + '</button>').join('') + '</div></div>' +
      '</div></div></div>' +
      '<div class="card fly-prev"><div class="card-h"><div><h3>' + ic('image') + 'Vista previa</h3><div class="sub">Imagen 1080 × 1350 · lista para WhatsApp</div></div></div><div class="card-b"><div class="fly-canvas"><canvas id="flyCv" width="1080" height="1350" aria-label="Flyer de la actividad"></canvas></div>' +
      '<div class="fly-actions"><button class="btn primary lg block" data-fly="wa" style="background:linear-gradient(180deg,#25d366,#1da851);border-color:#179443">' + ic('message-circle') + 'Enviar por WhatsApp a las familias</button>' +
      '<div class="row gap-8"><button class="btn grow" data-fly="dl">' + ic('download') + 'Descargar imagen</button>' + (canShare ? '<button class="btn grow" data-fly="share">' + ic('share-2') + 'Compartir…</button>' : '') + '</div></div></div></div></div>';
    const cv = p.querySelector('#flyCv'); let busy = 0;
    const draw = () => { const k = ++busy; FM.drawFlyer(document.createElement('canvas'), dataFor()).then((off) => { if (k !== busy) return; cv.getContext('2d').drawImage(off, 0, 0); }); };
    const draw2 = u.debounce(draw, 120);
    const setField = (n, v) => { const f = p.querySelector('[name=' + n + ']'); if (f) f.value = v; };
    p.addEventListener('input', (e) => { const n = e.target.name; if (!n || n === 'act') return; D[n] = e.target.value; draw2(); });
    p.addEventListener('change', (e) => {
      const n = e.target.name;
      if (n === 'act') { const a = acts.find((x) => x.id === e.target.value); D = BT.state.sub.flyer = a ? fromAct(a) : Object.assign({}, D, { actId: '' }); ['titulo', 'fecha', 'hora', 'lugar', 'texto', 'tag', 'sede'].forEach((k) => setField(k, D[k] || '')); p.querySelectorAll('.fly-th').forEach((b) => b.classList.toggle('on', b.dataset.th === D.theme)); p.querySelectorAll('.fly-ic').forEach((b) => b.classList.toggle('on', b.dataset.ico === D.icon)); draw(); }
      else if (n === 'sede' || n === 'fecha' || n === 'hora') { D[n] = e.target.value; draw(); }
    });
    p.querySelectorAll('.fly-th').forEach((b) => b.addEventListener('click', () => { D.theme = b.dataset.th; p.querySelectorAll('.fly-th').forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
    p.querySelectorAll('.fly-ic').forEach((b) => b.addEventListener('click', () => { D.icon = b.dataset.ico; p.querySelectorAll('.fly-ic').forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
    const fname = () => 'Flyer ' + (D.titulo || 'actividad').replace(/[\\/:*?"<>|]+/g, '-') + (D.fecha ? ' ' + u.fmtDate(D.fecha).replace(/\//g, '-') : '') + '.png';
    p.querySelectorAll('[data-fly]').forEach((b) => b.addEventListener('click', async () => {
      const k = b.dataset.fly;
      if (!D.titulo) { ui.toast('Poné un título al flyer', { type: 'warn' }); p.querySelector('[name=titulo]').focus(); return; }
      const off = await FM.drawFlyer(document.createElement('canvas'), dataFor());
      if (k === 'dl') { const blob = await canvasBlob(off); BT.download(blob, fname()); BT.audit('Descargó flyer', 'Familias', { detail: D.titulo }); return; }
      if (k === 'share') { const blob = await canvasBlob(off); try { await navigator.share({ files: [new File([blob], fname(), { type: 'image/png' })], text: msgFor() }); BT.audit('Compartió flyer', 'Familias', { detail: D.titulo }); } catch (e) { /* cancelado */ } return; }
      FM.whatsapp({ title: 'Enviar flyer por WhatsApp', text: msgFor(), image: off.toDataURL('image/jpeg', 0.86), sedes: [D.sede], audit: 'Envió flyer «' + D.titulo + '»' });
    }));
    draw();
  };

})();

/* ==========================================================================
   Datos ficticios de la demo + reglas de negocio compartidas
   Todos los nombres son inventados.
   Las fechas se generan relativas a HOY para que la demo siempre esté "al día".
   --------------------------------------------------------------------------
   ESQUEMA (BT.db)
   meta        { version, company, rut, createdAt }
   sedes       [{ id:'BT1'|'BT2', nombre, direccion, barrio, tel, email, camas, habitaciones:[{nro, camas:['A','B']}], reservadas:['8B'] }]
   settings    { ratio:{ diaDep, diaInd, nocheDep, nocheInd }, dueDay, iva, precios:{...} }
   users       [{ id, nombre, role, sede:'BT1'|'BT2'|'ALL', pin?, staffId?, residentId?, email }]
   residents   [{ id, sede, estado:'activo'|'egresado', nombre, apellido, sexo, nacimiento, ci, ingreso, habitacion, cama,
                  mutualista, emergencia, alergias:[], dieta, diagnosticos:[], barthel:[{fecha,score,evaluador}], braden:[{fecha,score}],
                  downton:[{fecha,score}], referente:{nombre,vinculo,tel,email,ci}, curador:{nombre,tipo}|null, cuota, deposito,
                  plan:{objetivos:[],cuidados:[],actividades:[],revision}, social:{texto, fecha, profesional, adaptacion:'Buena'|...},
                  docs:[{tipo, estado:'ok'|'falta'|'vencido', fecha, vence}], medico, egreso?:{fecha,motivo,nota} }]
   staff       [{ id, nombre, rol:'Cuidadora'|'Aux. de enfermería'|'Lic. en Enfermería', sede, volante, turnoBase:'M'|'T'|'N'|'D', offDow,
                  ingreso, ci, tel, salario, carneSalud:{vence}, cursoCuidados:{estado, fecha}, capacitaciones:[{nombre,fecha,vence}], pin }]
   shifts      { 'YYYY-MM-DD': { BT1:{M:[staffId],T:[],N:[]}, BT2:{...} } }
   swaps       [{ id, fecha, sede, turno, de, para, motivo, estado:'Pendiente'|'Aprobada'|'Rechazada', ts }]
   leaves      [{ id, staffId, tipo, desde, hasta, estado:'Aprobada'|'Pendiente', dias }]
   absences    [{ id, staffId, fecha, tipo:'Certificado médico'|'Justificada'|'Injustificada', nota, turno, sede }]
   clock       [{ id, staffId, fecha, turno, sede, in:'HH:MM', out:'HH:MM'|null }]
   meds        [{ id, residentId, droga, dosis, via, horarios:['08:00'], indicacion, desde, hasta?, stock, recetaVence, prescriptor, activo, agudo?:{motivo,dosis,duracion} }]
   medAdmin    [{ id, medId, residentId, fecha, hora, turno, estado:'administrada'|'omitida'|'rechazada', userId, userName, ts, nota }]
   evoluciones [{ id, residentId, ts, autor, rol, tipo:'Médica'|'Enfermería'|'Cuidados'|'Social', texto, enmiendas:[{ts,autor,texto,motivo}] }]
   vitals      [{ id, residentId, ts, pas, pad, fc, temp, sat, hgt|null, autor }]
   weights     [{ residentId, mes:'YYYY-MM', kg }]
   wounds      [{ id, residentId, zona, estadio, inicio, estado:'Activa'|'Cicatrizada', curaciones:[{ts,autor,nota}] }]
   falls       [{ id, residentId, ts, lugar, circunstancia, lesiones, acciones, testigo, autor, avisoFamilia, avisoMedico }]
   incidents   [{ id, residentId, sede, ts, tipo, gravedad, descripcion, autor, fallId? }]
   care        [{ id, residentId, ts, tipo:'Higiene'|'Ingesta'|'Cambio postural'|'Deposición'|'Actividad'|'Hidratación', detalle, autor }]
   handovers   [{ id, sede, fecha, turno, autor, novedades, pendientes:[], ts }]
   restrictions[{ id, residentId, tipo:'Visitas'|'Salidas', motivo, desde, hasta, indicadoPor, ts }]
   indicaciones[{ id, residentId, ts, texto, autor, tipo }]
   audit       [{ id, ts, userId, userName, role, action, target, residentId, detail, sede, ip, device }]
   charges     [{ id, residentId, sede, mes, concepto:'Cuota mensual'|'Pañales'|'Medicación'|'Peluquería'|'Podología'|'Depósito de garantía', monto, cantidad? }]
   payments    [{ id, residentId, sede, fecha, monto, medio, recibo }]
   invoices    [{ id, nro, tipo:'e-Ticket'|'e-Factura', residentId, sede, mes, neto, iva, total, estado, fecha }]
   finance     [{ mes, sede, tipo:'ingreso'|'gasto', categoria, monto }]
   budget      { BT1:{categoria:monto}, BT2:{...} }
   waitlist    [{ id, nombre, edad, contacto, vinculo, tel, sedePref, dependencia, estado, ts, notas, seguimiento:[{ts,texto,autor}] }]
   admissionsChecklist [ 'texto' ]
   posts       [{ id, sede, residentId|null, ts, autor, tipo:'Novedad'|'Foto'|'Comunicado', titulo, texto, foto:{grad, icon, caption}|null }]
   visits      [{ id, residentId, sede, visitante, vinculo, fecha, hora, estado:'Agendada'|'Realizada'|'Cancelada', salida? }]
   menu        { semana:[{ dia, desayuno, almuerzo, merienda, cena }], variantes:{ Diabético:'...', ... } }
   stock       [{ id, sede, categoria, item, unidad, stock, minimo, costo, proveedorId, porResidente }]
   consumption [{ residentId, itemId, mes, cantidad }]
   suppliers   [{ id, nombre, rubro, contacto, tel, email, rut, plazo }]
   purchases   [{ id, proveedorId, sede, fecha, items, total, estado }]
   compliance  [{ id, sede, item, organismo, vence, doc, responsable }]
   activities  [{ id, sede, fecha, hora, titulo, tipo, responsable, asistentes:[residentId], lugar }]
   ========================================================================== */
(function () {
  'use strict';
  const BT = window.BT; const u = BT.u;
  BT.DATA_VERSION = 15;

  /* RNG determinístico (los mismos datos en cada restablecimiento) */
  function rngFactory(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  BT.seed = function () {
    const R = rngFactory(20261125);
    const rnd = (a, b) => a + R() * (b - a);
    const ri = (a, b) => Math.floor(rnd(a, b + 1));
    const pick = (arr) => arr[Math.floor(R() * arr.length)];
    const T = u.today();
    const NOW = new Date();
    const iso = u.iso;
    const D = (n) => iso(u.addDays(T, n));
    const at = (dateIso, hhmm, plusMin = 0) => { const d = u.toDate(dateIso); const [h, m] = hhmm.split(':').map(Number); d.setHours(h, m + plusMin, 0, 0); return d.getTime(); };
    let seq = 0; const id = (p) => p + (++seq).toString(36);
    const curYM = u.ym(T);
    const months = Array.from({ length: 6 }, (_, i) => u.ym(u.addMonths(T, i - 5)));

    const db = { meta: { version: BT.DATA_VERSION, company: 'Galauru SAS', rut: '21 845 672 0019', createdAt: Date.now() } };

    /* ---------------- Sedes ---------------- */
    db.sedes = [
      { id: 'BT1', nombre: 'Buenos Tiempos 1', direccion: 'Av. Gral. Rivera 3821', barrio: 'Malvín, Montevideo', tel: '2614 3390', email: 'bt1@buenostiempos.com.uy', camas: 18, habitaciones: Array.from({ length: 9 }, (_, i) => ({ nro: String(i + 1), camas: ['A', 'B'] })), reservadas: [] },
      { id: 'BT2', nombre: 'Buenos Tiempos 2', direccion: 'Cno. Carrasco 5140', barrio: 'Unión, Montevideo', tel: '2508 7712', email: 'bt2@buenostiempos.com.uy', camas: 16, habitaciones: Array.from({ length: 8 }, (_, i) => ({ nro: String(i + 1), camas: ['A', 'B'] })), reservadas: ['8B'] },
    ];
    db.settings = {
      ratio: { diaDep: 8, diaInd: 15, nocheDep: 12, nocheInd: 25 },
      dueDay: 10, iva: 0.10,
      precios: { panal: 42, peluqueria: 650, podologia: 900, apósito: 85 },
      reduceMotion: false,
    };

    /* ---------------- Residentes ---------------- */
    const MUT = ['CASMU', 'Médica Uruguaya', 'Asociación Española', 'SMI', 'Círculo Católico', 'ASSE', 'Hospital Evangélico', 'COSEM', 'Universal'];
    const EMER = ['SEMM', 'UCM', 'Emergencia Uno', 'SUAT', 'Cardio-Móvil'];
    // [nombre, apellido, sexo, edad, sede, barthel, dieta, alergias, diagnósticos, hab, mesesIngreso, referente, vínculo]
    const RES = [
      ['María Elena', 'Barreiro Sosa', 'F', 87, 'BT1', 55, 'Diabético', ['Penicilina'], ['Diabetes tipo 2', 'Hipertensión arterial', 'Deterioro cognitivo leve'], '1A', 38, 'Silvia Barreiro', 'Hija'],
      ['Juan Carlos', 'Pereyra Olivera', 'M', 82, 'BT1', 85, 'Hiposódico', [], ['Hipertensión arterial', 'EPOC'], '1B', 22, 'Gustavo Pereyra', 'Hijo'],
      ['Nélida Rosa', 'Fagúndez', 'F', 91, 'BT1', 30, 'Blanda', ['Dipirona'], ['Enfermedad de Alzheimer moderada', 'Hipertensión arterial'], '2A', 51, 'Ana Fagúndez', 'Sobrina'],
      ['Washington Rubén', 'Techera', 'M', 79, 'BT1', 90, 'Común', [], ['Enfermedad de Parkinson (inicial)', 'Hipotiroidismo'], '2B', 9, 'Laura Techera', 'Hija'],
      ['Blanca Iris', 'Castiglioni', 'F', 85, 'BT1', 60, 'Hiposódico', [], ['Insuficiencia cardíaca', 'Fibrilación auricular'], '3A', 30, 'Roberto Castiglioni', 'Hijo'],
      ['Olga Beatriz', 'Méndez Larrosa', 'F', 93, 'BT1', 15, 'Procesada (disfagia)', ['AINEs'], ['Demencia avanzada', 'Úlcera por presión sacra'], '3B', 64, 'Mario Méndez', 'Hijo'],
      ['Héctor Omar', 'Suárez Piriz', 'M', 88, 'BT1', 45, 'Diabético', [], ['Diabetes tipo 2', 'Secuela de ACV', 'Dislipemia'], '4A', 27, 'Cristina Suárez', 'Hija'],
      ['Gladys Margarita', 'Rivero', 'F', 84, 'BT1', 70, 'Común', ['Sulfas'], ['Artrosis', 'Depresión'], '4B', 15, 'Fernando Rivero', 'Hijo'],
      ['Teresa del Carmen', 'Acosta', 'F', 90, 'BT1', 35, 'Blanda', [], ['Fractura de cadera operada', 'Osteoporosis'], '5A', 7, 'Pablo Acosta', 'Nieto'],
      ['Ramón Eduardo', 'Silveira', 'M', 76, 'BT1', 95, 'Común', [], ['Hipertensión arterial', 'Hipotiroidismo'], '5B', 4, 'Graciela Silveira', 'Esposa'],
      ['Mirta Susana', 'Bentancor', 'F', 86, 'BT1', 40, 'Hiposódico', ['Látex'], ['Enfermedad de Alzheimer', 'Hipertensión arterial'], '6A', 33, 'Daniel Bentancor', 'Hijo'],
      ['Elsa Noemí', 'Quintana', 'F', 95, 'BT1', 20, 'Procesada (disfagia)', [], ['Demencia mixta', 'Disfagia orofaríngea'], '6B', 72, 'Beatriz Quintana', 'Hija'],
      ['Alberto José', 'Viera Lemos', 'M', 81, 'BT1', 75, 'Diabético', [], ['Diabetes tipo 2', 'Insuficiencia renal crónica leve'], '7A', 19, 'Sofía Viera', 'Hija'],
      ['Celia Ofelia', 'Duarte', 'F', 89, 'BT1', 50, 'Común', ['Penicilina'], ['Hipertensión arterial', 'Glaucoma'], '7B', 41, 'Jorge Duarte', 'Hijo'],
      ['Nilda Graciela', 'Arbelo', 'F', 83, 'BT1', 65, 'Hiposódico', [], ['Insuficiencia cardíaca', 'Insomnio'], '8A', 12, 'Verónica Arbelo', 'Hija'],
      ['Raúl Alfredo', 'Cabrera Núñez', 'M', 80, 'BT1', 25, 'Blanda', [], ['Enfermedad de Parkinson avanzada', 'Depresión'], '8B', 26, 'Mónica Cabrera', 'Hija'],
      ['Yolanda Esther', 'Pintos', 'F', 88, 'BT2', 30, 'Blanda', [], ['Enfermedad de Alzheimer', 'Osteoporosis'], '1A', 35, 'Ricardo Pintos', 'Hijo'],
      ['Julio César', 'Medina Rocha', 'M', 86, 'BT2', 35, 'Diabético', ['Iodo'], ['Diabetes tipo 2', 'Secuela de ACV', 'Hipertensión arterial'], '1B', 18, 'Martín Medina', 'Hijo'],
      ['Aurora Delia', 'Machín', 'F', 92, 'BT2', 10, 'Procesada (disfagia)', [], ['Demencia avanzada', 'Úlcera por presión en talón'], '2A', 58, 'Lourdes Machín', 'Hija'],
      ['Dora Haydée', 'Rodríguez Bonilla', 'F', 87, 'BT2', 40, 'Hiposódico', [], ['Insuficiencia cardíaca', 'Deterioro cognitivo moderado'], '2B', 24, 'Andrés Rodríguez', 'Hijo'],
      ['Edison Walter', 'Ferreira', 'M', 78, 'BT2', 60, 'Común', [], ['EPOC', 'Hipertensión arterial'], '3A', 11, 'Patricia Ferreira', 'Hija'],
      ['Irma Luz', 'Correa Sena', 'F', 94, 'BT2', 15, 'Procesada (disfagia)', ['Penicilina'], ['Demencia avanzada', 'Disfagia'], '3B', 66, 'Hugo Correa', 'Hijo'],
      ['Ana María', 'Lorenzo Paiva', 'F', 82, 'BT2', 55, 'Diabético', [], ['Diabetes tipo 2', 'Depresión'], '4A', 6, 'Carolina Lorenzo', 'Hija'],
      ['Hugo Daniel', 'Bermúdez', 'M', 85, 'BT2', 25, 'Blanda', [], ['Secuela de ACV', 'Fibrilación auricular'], '4B', 29, 'Natalia Bermúdez', 'Nieta'],
      ['Zulma Raquel', 'Gadea', 'F', 90, 'BT2', 35, 'Hiposódico', [], ['Enfermedad de Alzheimer', 'Hipertensión arterial'], '5A', 44, 'Alejandro Gadea', 'Hijo'],
      ['Carmen Rosa', 'Ibarra', 'F', 89, 'BT2', 20, 'Blanda', ['AINEs'], ['Demencia vascular', 'Artrosis'], '5B', 21, 'Lucía Ibarra', 'Hija'],
      ['Eduardo Mario', 'Clavijo', 'M', 83, 'BT2', 40, 'Diabético', [], ['Diabetes tipo 2', 'Amputación infracondílea derecha'], '6A', 16, 'Silvana Clavijo', 'Hija'],
      ['Marta Lilián', 'Ottonello', 'F', 96, 'BT2', 5, 'Procesada (disfagia)', [], ['Demencia avanzada', 'Postración'], '6B', 80, 'Rosana Ottonello', 'Hija'],
      ['Rosa Inés', 'Barboza', 'F', 84, 'BT2', 30, 'Común', ['Látex'], ['Enfermedad de Parkinson', 'Hipotiroidismo'], '7A', 13, 'Diego Barboza', 'Hijo'],
      ['Ángel Rubén', 'Lacuesta', 'M', 87, 'BT2', 70, 'Hiposódico', [], ['Hipertensión arterial', 'Hipoacusia'], '7B', 2, 'Inés Lacuesta', 'Hija'],
    ];
    const EGRESADOS = [
      ['Pedro Antonio', 'Lima', 'M', 91, 'BT1', 15, 'Fallecimiento', 3, '9A', 'Falleció en la residencia acompañado por su familia. Cuidados paliativos coordinados con su mutualista.'],
      ['Susana Beatriz', 'Ferrés', 'F', 84, 'BT2', 35, 'Traslado', 2, '8A', 'Traslado a residencial cercano al domicilio de su hija en Canelones.'],
      ['Omar Hugo', 'Larrañaga', 'M', 79, 'BT1', 80, 'Alta', 5, '9B', 'Recuperación completa post-fractura; regresa a su domicilio con apoyo familiar.'],
    ];
    const medicoNombre = 'Dr. Fernando Aguirre';
    db.residents = [];
    const mkResident = (row, i, egreso) => {
      const [nombre, apellido, sexo, edad, sede, bNow] = row;
      const nac = u.addDays(u.addMonths(T, -edad * 12 - ri(1, 11)), ri(0, 27));
      const r = {
        id: 'r' + (i + 1), sede, estado: egreso ? 'egresado' : 'activo', nombre, apellido, sexo, nacimiento: iso(nac),
        ci: String(ri(800000, 1999999)) + String(ri(0, 9)), mutualista: pick(MUT), emergencia: pick(EMER), medico: medicoNombre,
      };
      if (!egreso) {
        const [, , , , , , dieta, alergias, dx, hab, mesesIng, refN, refV] = row;
        Object.assign(r, { dieta, alergias, diagnosticos: dx, habitacion: hab.slice(0, -1), cama: hab.slice(-1), ingreso: iso(u.addDays(u.addMonths(T, -mesesIng), -ri(0, 20))) });
        const ape1 = refN.split(' ')[1];
        r.referente = { nombre: refN, vinculo: refV, tel: '09' + ri(1, 9) + ' ' + ri(100, 999) + ' ' + ri(100, 999), email: u.norm(refN.split(' ')[0]).slice(0, 1) + u.norm(ape1) + '@correo.com.uy', ci: String(ri(1500000, 5500000)) + ri(0, 9) };
        r.curador = bNow <= 20 ? { nombre: refN, tipo: 'Curador definitivo (Juzgado Ldo. de Familia)' } : bNow <= 35 && R() < 0.4 ? { nombre: refN, tipo: 'Curaduría en trámite' } : null;
      } else {
        const [, , , , , , motivo, mAgo, hab, nota] = row;
        const f = iso(u.addDays(u.addMonths(T, -mAgo), -ri(2, 12)));
        Object.assign(r, { dieta: 'Común', alergias: [], diagnosticos: [], habitacion: hab.slice(0, -1), cama: hab.slice(-1), ingreso: iso(u.addMonths(T, -mAgo - ri(10, 30))), egreso: { fecha: f, motivo, nota } });
        r.referente = { nombre: 'Familia ' + apellido.split(' ')[0], vinculo: 'Hijo/a', tel: '099 ' + ri(100, 999) + ' ' + ri(100, 999), email: '' };
        r.curador = null;
      }
      // Barthel histórico (descenso gradual) — cada ~4 meses
      const nB = 5; r.barthel = [];
      let start = Math.min(100, bNow + ri(1, 4) * 5);
      if (r.id === 'r6') start = 50;
      for (let k = 0; k < nB; k++) {
        const fecha = iso(u.addDays(T, -((nB - 1 - k) * 120 + ri(20, 40))));
        const sc = k === nB - 1 ? bNow : Math.max(bNow, Math.round((start - ((start - bNow) * k) / (nB - 1)) / 5) * 5);
        r.barthel.push({ fecha, score: sc, evaluador: k % 2 ? 'Lic. Mariana Castro Brum' : medicoNombre });
      }
      r.braden = [0, 1, 2].map((k) => ({ fecha: iso(u.addDays(T, -(2 - k) * 60 - ri(5, 20))), score: u.clamp(Math.round(9 + bNow / 9 + ri(-1, 1) + (k === 2 && bNow < 30 ? -1 : 0)), 7, 23) }));
      r.downton = [0, 1].map((k) => ({ fecha: iso(u.addDays(T, -(1 - k) * 90 - ri(5, 25))), score: u.clamp(bNow >= 90 ? ri(0, 1) : bNow >= 50 ? ri(2, 4) : ri(3, 6), 0, 10) }));
      const g = BT.depGrade(bNow).label;
      r.cuota = Math.round(((g === 'Independiente' || g === 'Leve') ? rnd(50000, 56000) : g === 'Moderada' ? rnd(56000, 62000) : rnd(62000, 69000)) / 500) * 500;
      r.deposito = r.cuota;
      r.plan = {
        objetivos: bNow > 60 ? ['Mantener autonomía en actividades básicas', 'Estimulación cognitiva semanal', 'Prevenir caídas'] : bNow > 35 ? ['Sostener movilidad asistida', 'Control de patologías crónicas', 'Favorecer vínculos familiares'] : ['Confort y prevención de úlceras por presión', 'Asegurar hidratación y nutrición', 'Control del dolor'],
        cuidados: bNow > 60 ? ['Supervisión en higiene', 'Control de PA semanal'] : bNow > 35 ? ['Asistencia parcial en higiene y vestido', 'Acompañamiento en traslados', 'Control glucémico si corresponde'] : ['Higiene en cama', 'Cambios posturales c/2 h', 'Colchón antiescaras', 'Dieta adaptada y espesantes'],
        actividades: bNow > 35 ? ['Taller de memoria', 'Gimnasia suave', 'Musicoterapia'] : ['Estimulación sensorial', 'Musicoterapia en sala'],
        revision: iso(u.addDays(T, ri(10, 80))),
        responsable: 'Lic. Mariana Castro Brum',
      };
      const adapt = pick(['Buena', 'Buena', 'Muy buena', 'En proceso', 'Con dificultades']);
      r.social = { adaptacion: adapt, fecha: iso(u.addDays(T, -ri(20, 120))), profesional: 'Lic. T.S. Andrea Pereira',
        texto: { 'Muy buena': 'Se integró rápidamente a la dinámica del hogar. Participa con entusiasmo de las actividades grupales y mantiene vínculo fluido con su familia, que la visita semanalmente.', 'Buena': 'Proceso de adaptación favorable. Muestra preferencia por actividades en pequeños grupos. La familia participa activamente y se mantiene informada a través del portal.', 'En proceso': 'Persisten momentos de añoranza del hogar, especialmente al atardecer. Se acordó con la familia aumentar la frecuencia de visitas y llamadas por videollamada.', 'Con dificultades': 'Presenta episodios de irritabilidad y rechazo a algunas rutinas. Se trabaja en conjunto con el equipo de enfermería para adaptar horarios y respetar sus hábitos previos.' }[adapt] };
      const DOCS = ['Cédula de identidad', 'Consentimiento informado', 'Contrato de servicios', 'Ficha de usuario (Ord. 483/017)', 'Carné de vacunas', 'Certificado médico de ingreso'];
      r.docs = DOCS.map((t) => ({ tipo: t, estado: 'ok', fecha: r.ingreso }));
      return r;
    };
    RES.forEach((row, i) => db.residents.push(mkResident(row, i)));
    EGRESADOS.forEach((row, i) => db.residents.push(mkResident(row, 30 + i, true)));
    // Documentación incompleta (para "Modo inspección")
    const setDoc = (rid, tipo, estado) => { const d = BT_find(rid).docs.find((x) => x.tipo === tipo); d.estado = estado; };
    const BT_find = (rid) => db.residents.find((r) => r.id === rid);
    setDoc('r30', 'Consentimiento informado', 'falta');
    setDoc('r30', 'Ficha de usuario (Ord. 483/017)', 'falta');
    setDoc('r10', 'Carné de vacunas', 'falta');
    setDoc('r23', 'Contrato de servicios', 'falta');
    setDoc('r19', 'Carné de vacunas', 'vencido');
    db.residents.forEach((r) => { const cv = r.docs.find((d) => d.tipo === 'Carné de vacunas'); if (cv) cv.vence = iso(u.addDays(T, ri(40, 300))); });
    BT_find('r19').docs.find((d) => d.tipo === 'Carné de vacunas').vence = D(-12);

    /* ---------------- Personal ---------------- */
    const todayDow = T.getDay();
    // [nombre, rol, sede, turnoBase, añosAnt, salario, volante]
    const STAFF = [
      ['Lucía Fernández Arrieta', 'Cuidadora', 'BT1', 'M', 7.7, 33800],
      ['Valeria Núñez Cardozo', 'Cuidadora', 'BT1', 'M', 4.3, 33200],
      ['Patricia Gómez Silva', 'Cuidadora', 'BT1', 'T', 10.5, 34600],
      ['Andrea Martínez Pou', 'Cuidadora', 'BT1', 'T', 2.8, 32900],
      ['Sandra Olivera Pazos', 'Cuidadora', 'BT1', 'N', 12.1, 35100],
      ['Mónica Píriz Delgado', 'Cuidadora', 'BT2', 'M', 8.4, 34000],
      ['Claudia Rosas Benítez', 'Cuidadora', 'BT2', 'M', 3.6, 33100],
      ['Silvana Rocha Trindade', 'Cuidadora', 'BT2', 'T', 6.9, 33700],
      ['Romina Cabrera Vidart', 'Cuidadora', 'BT2', 'T', 1.7, 32800],
      ['Natalia Sosa Ferrari', 'Cuidadora', 'BT2', 'N', 9.2, 34900],
      ['Jimena Acosta Rial', 'Cuidadora', 'BT2', 'N', 4.0, 33300],
      ['Karina Da Silva Long', 'Cuidadora', 'BT2', 'V', 5.4, 34200, true],
      ['Gabriela López Etchart', 'Aux. de enfermería', 'BT1', 'X', 11.8, 42500],
      ['Florencia Vidal Saravia', 'Aux. de enfermería', 'BT2', 'X', 7.2, 41800],
      ['Mariana Castro Brum', 'Lic. en Enfermería', 'BT1', 'D', 13.6, 86000],
    ];
    db.staff = STAFF.map((s, i) => {
      const [nombre, rol, sede, turnoBase, ant, salario, volante] = s;
      const ing = u.addDays(T, -Math.round(ant * 365));
      const carneV = i === 7 ? D(-4) : i === 3 ? D(12) : i === 10 ? D(25) : D(ri(60, 540));
      return {
        id: 's' + (i + 1), nombre: (rol === 'Lic. en Enfermería' ? 'Lic. ' : '') + nombre, rol, sede, volante: !!volante, turnoBase,
        offDow: (todayDow + 1 + (i % 6)) % 7,
        ingreso: iso(ing), ci: String(ri(2500000, 5900000)) + ri(0, 9), tel: '09' + ri(1, 9) + ' ' + ri(100, 999) + ' ' + ri(100, 999),
        salario, valorHora: Math.round(salario / 200),
        carneSalud: { vence: carneV },
        cursoCuidados: rol === 'Cuidadora' ? (i === 8 ? { estado: 'En curso', fecha: D(45) } : i === 3 ? { estado: 'Pendiente', fecha: null } : { estado: 'Certificado SNC', fecha: iso(u.addDays(ing, 200)) }) : { estado: 'Título habilitante', fecha: iso(u.addDays(ing, -300)) },
        capacitaciones: [
          { nombre: 'RCP básico y primeros auxilios', fecha: D(-ri(60, 700)), vence: null },
          { nombre: 'Prevención de caídas', fecha: D(-ri(30, 400)), vence: null },
          { nombre: 'Manejo de personas con demencia', fecha: D(-ri(30, 500)), vence: null },
          { nombre: 'Uso de extintores', fecha: D(-ri(30, 400)), vence: null },
        ].filter(() => R() > 0.18).map((c) => Object.assign(c, { vence: c.nombre.startsWith('RCP') ? iso(u.addDays(c.fecha, 730)) : null })),
        pin: i === 0 ? '1234' : i === 5 ? '2580' : String(ri(1000, 9999)),
      };
    });
    const staffBy = (pred) => db.staff.filter(pred);

    /* ---------------- Usuarios ---------------- */
    db.users = [
      { id: 'u_dir', nombre: 'Carolina Galarza', role: 'direccion', sede: 'ALL', cargo: 'Directora general', email: 'direccion@buenostiempos.com.uy' },
      { id: 'u_med', nombre: 'Dr. Fernando Aguirre', role: 'medico', sede: 'ALL', cargo: 'Médico Director Técnico', email: 'medico@buenostiempos.com.uy' },
      { id: 'u_enf', nombre: 'Lic. Mariana Castro Brum', role: 'enfermeria', sede: 'ALL', staffId: 's15', cargo: 'Jefa de Enfermería', email: 'enfermeria@buenostiempos.com.uy' },
      { id: 'u_cui1', nombre: 'Lucía Fernández', role: 'cuidadora', sede: 'BT1', staffId: 's1', password: 'lucia2026', cargo: 'Cuidadora · BT1' },
      { id: 'u_cui2', nombre: 'Mónica Píriz', role: 'cuidadora', sede: 'BT2', staffId: 's6', password: 'monica2026', cargo: 'Cuidadora · BT2' },
      { id: 'u_adm', nombre: 'Paula Benavídez', role: 'administracion', sede: 'ALL', cargo: 'Administración', email: 'administracion@buenostiempos.com.uy' },
      { id: 'u_fam1', nombre: 'Silvia Barreiro', role: 'familiar', sede: 'BT1', residentId: 'r1', cargo: 'Hija de María Elena' },
      { id: 'u_fam2', nombre: 'Martín Medina', role: 'familiar', sede: 'BT2', residentId: 'r18', cargo: 'Hijo de Julio César' },
    ];

    /* ---------------- Licencias, faltas ---------------- */
    db.leaves = [
      { id: id('lv'), staffId: 's2', tipo: 'Licencia anual', desde: D(-24), hasta: D(-15), estado: 'Aprobada' },
      { id: id('lv'), staffId: 's4', tipo: 'Licencia anual', desde: D(3), hasta: D(16), estado: 'Aprobada' },
      { id: id('lv'), staffId: 's9', tipo: 'Licencia por estudio', desde: D(8), hasta: D(9), estado: 'Pendiente' },
      { id: id('lv'), staffId: 's3', tipo: 'Licencia anual', desde: D(40), hasta: D(59), estado: 'Aprobada' },
      { id: id('lv'), staffId: 's7', tipo: 'Licencia anual', desde: D(44), hasta: D(58), estado: 'Aprobada' },
      { id: id('lv'), staffId: 's13', tipo: 'Licencia anual', desde: D(47), hasta: D(61), estado: 'Pendiente' },
      { id: id('lv'), staffId: 's10', tipo: 'Licencia anual', desde: D(-120), hasta: D(-101), estado: 'Aprobada' },
      { id: id('lv'), staffId: 's6', tipo: 'Licencia anual', desde: D(-80), hasta: D(-61), estado: 'Aprobada' },
      { id: id('lv'), staffId: 's15', tipo: 'Licencia anual', desde: D(75), hasta: D(95), estado: 'Aprobada' },
    ];
    db.leaves.forEach((l) => (l.dias = u.daysBetween(l.desde, l.hasta) + 1));
    const onLeave = (sid, dIso) => db.leaves.some((l) => l.staffId === sid && l.estado === 'Aprobada' && l.desde <= dIso && l.hasta >= dIso);
    db.absences = [
      { id: id('ab'), staffId: 's11', fecha: D(0), tipo: 'Certificado médico', nota: 'Certificación médica por 24 h (gastroenteritis). Avisó a las 15:10.', turno: 'N', sede: 'BT2' },
      { id: id('ab'), staffId: 's4', fecha: D(-9), tipo: 'Justificada', nota: 'Trámite judicial con constancia.', turno: 'T', sede: 'BT1' },
      { id: id('ab'), staffId: 's9', fecha: D(-14), tipo: 'Injustificada', nota: 'Sin aviso previo.', turno: 'T', sede: 'BT2' },
      { id: id('ab'), staffId: 's7', fecha: D(-21), tipo: 'Certificado médico', nota: 'Certificación 24 h.', turno: 'M', sede: 'BT2' },
      { id: id('ab'), staffId: 's2', fecha: D(-33), tipo: 'Justificada', nota: 'Fallecimiento de familiar (licencia especial).', turno: 'M', sede: 'BT1' },
      { id: id('ab'), staffId: 's9', fecha: D(-47), tipo: 'Injustificada', nota: 'Llegó 3 horas tarde, sin aviso.', turno: 'T', sede: 'BT2' },
    ];
    const absent = (sid, dIso) => db.absences.some((a) => a.staffId === sid && a.fecha === dIso);

    /* ---------------- Turnos ----------------
       Se genera desde el 1º del mes anterior hasta fin del mes siguiente. */
    db.shifts = {};
    const req = BT.ratioRequiredStatic(db);
    const start = new Date(T.getFullYear(), T.getMonth() - 1, 1);
    const end = new Date(T.getFullYear(), T.getMonth() + 2, 0);
    for (let d = new Date(start); d <= end; d = u.addDays(d, 1)) {
      const dIso = iso(d); const dow = d.getDay();
      const day = { BT1: { M: [], T: [], N: [] }, BT2: { M: [], T: [], N: [] } };
      const busy = new Set();
      const avail = (s) => s.offDow !== dow && !onLeave(s.id, dIso) && !busy.has(s.id);
      ['BT1', 'BT2'].forEach((sede) => ['M', 'T', 'N'].forEach((t) => {
        staffBy((s) => s.sede === sede && s.turnoBase === t && avail(s)).forEach((s) => { day[sede][t].push(s.id); busy.add(s.id); });
      }));
      // Cobertura de huecos: auxiliar de la sede (M/T) y luego volante
      [['BT2', 'N'], ['BT1', 'N'], ['BT2', 'M'], ['BT1', 'M'], ['BT2', 'T'], ['BT1', 'T']].forEach(([sede, t]) => {
        while (day[sede][t].length < req[sede][t]) {
          const cand = staffBy((s) => avail(s) && ((s.turnoBase === 'X' && s.sede === sede && t !== 'N') || s.volante));
          if (!cand.length) break;
          day[sede][t].push(cand[0].id); busy.add(cand[0].id);
        }
      });
      // Auxiliares libres refuerzan la mañana
      ['BT1', 'BT2'].forEach((sede) => staffBy((s) => s.turnoBase === 'X' && s.sede === sede && avail(s)).forEach((s) => { day[sede].M.push(s.id); busy.add(s.id); }));
      db.shifts[dIso] = day;
    }
    // Faltas: quitar del turno (la de hoy deja el turno noche de BT2 por debajo del ratio)
    db.absences.forEach((a) => { const day = db.shifts[a.fecha]; if (day && day[a.sede]) day[a.sede][a.turno] = day[a.sede][a.turno].filter((x) => x !== a.staffId); });
    // Asegurar que la volante esté libre hoy y mañana (recorrido de reasignación sin conflictos de descanso)
    const today = D(0);
    [D(0), D(1)].forEach((dd) => ['BT1', 'BT2'].forEach((s) => ['M', 'T', 'N'].forEach((t) => { db.shifts[dd][s][t] = db.shifts[dd][s][t].filter((x) => x !== 's12'); })));
    // Cobertura realista de los próximos 21 días: la coordinación ya resolvió casi todos los huecos.
    // Se dejan sin cubrir solo el turno noche de BT2 de hoy (recorrido de la demo) y un turno a futuro.
    const careStaff = db.staff.filter((s) => s.rol !== 'Lic. en Enfermería');
    const workedOn = (dIso, sid) => { const dd = db.shifts[dIso]; return !!dd && ['BT1', 'BT2'].some((s) => ['M', 'T', 'N'].some((t) => dd[s][t].includes(sid))); };
    const inShift = (dIso, t, sid) => { const dd = db.shifts[dIso]; return !!dd && ['BT1', 'BT2'].some((s) => dd[s][t].includes(sid)); };
    const keepGap = (dIso, s, t) => (dIso === today && s === 'BT2' && t === 'N') || (dIso === D(6) && s === 'BT1' && t === 'T');
    for (let k = 0; k <= 21; k++) {
      const dIso = D(k); const day = db.shifts[dIso]; if (!day) continue;
      ['BT2', 'BT1'].forEach((s) => ['N', 'M', 'T'].forEach((t) => {
        if (keepGap(dIso, s, t)) return;
        while (day[s][t].length < req[s][t]) {
          const cand = careStaff.filter((p) => !(p.volante && (k === 0 || (k === 1 && t !== 'N'))) && !workedOn(dIso, p.id) && !onLeave(p.id, dIso) && !absent(p.id, dIso) &&
            !(t === 'M' && inShift(D(k - 1), 'N', p.id)) && !(t === 'N' && inShift(D(k + 1), 'M', p.id)))
            .sort((a, b) => (a.offDow === u.toDate(dIso).getDay()) - (b.offDow === u.toDate(dIso).getDay()) || (a.sede === s ? -1 : 1) - (b.sede === s ? -1 : 1));
          if (!cand.length) break;
          day[s][t].push(cand[0].id);
        }
      }));
    }
    if (db.shifts[today].BT2.N.length > 1) db.shifts[today].BT2.N = db.shifts[today].BT2.N.slice(0, 1);

    db.swaps = [
      { id: id('sw'), fecha: D(4), sede: 'BT1', turno: 'M', de: 's2', para: 's1', motivo: 'Consulta médica programada', estado: 'Pendiente', ts: at(D(-1), '18:20') },
      { id: id('sw'), fecha: D(6), sede: 'BT2', turno: 'T', de: 's9', para: 's8', motivo: 'Examen en UTU', estado: 'Pendiente', ts: at(D(0), '09:05') },
      { id: id('sw'), fecha: D(-5), sede: 'BT2', turno: 'M', de: 's7', para: 's6', motivo: 'Acto escolar de su hijo', estado: 'Aprobada', ts: at(D(-8), '11:40') },
    ];

    /* ---------------- Marcas de reloj ---------------- */
    db.clock = [];
    const SH = u.SHIFTS;
    Object.keys(db.shifts).forEach((dIso) => {
      if (dIso > today) return;
      ['BT1', 'BT2'].forEach((sede) => ['M', 'T', 'N'].forEach((t) => {
        db.shifts[dIso][sede][t].forEach((sid) => {
          const startTs = at(dIso, SH[t].from); if (startTs > NOW.getTime()) return;
          const endTs = at(dIso, SH[t].from, 8 * 60);
          const inTs = startTs + ri(-12, 6) * 60000;
          const extra = R() < 0.12 ? ri(30, 120) : ri(0, 9);
          const outTs = endTs + extra * 60000;
          db.clock.push({ id: id('ck'), staffId: sid, fecha: dIso, turno: t, sede, in: u.fmtTime(inTs), out: outTs < NOW.getTime() ? u.fmtTime(outTs) : null, extraMin: extra >= 30 ? extra : 0 });
        });
      }));
    });
    // Lic. en Enfermería (horario diurno 08–16, lunes a viernes)
    Object.keys(db.shifts).forEach((dIso) => { const d = u.toDate(dIso); if (dIso > today || d.getDay() === 0 || d.getDay() === 6) return; if (at(dIso, '08:00') > NOW.getTime()) return; db.clock.push({ id: id('ck'), staffId: 's15', fecha: dIso, turno: 'D', sede: d.getDate() % 2 ? 'BT1' : 'BT2', in: '07:5' + ri(0, 9), out: at(dIso, '16:00') < NOW.getTime() ? '16:0' + ri(0, 9) : null, extraMin: 0 }); });

    /* ---------------- Medicación ---------------- */
    db.meds = [];
    const addMed = (rid, droga, dosis, via, horarios, extra = {}) => {
      const daily = horarios.length;
      db.meds.push(Object.assign({ id: id('md'), residentId: rid, droga, dosis, via, horarios, indicacion: extra.indicacion || '', desde: extra.desde || D(-ri(40, 400)), hasta: extra.hasta || null,
        stock: extra.stock != null ? extra.stock : daily * ri(8, 30), recetaVence: extra.recetaVence || D(ri(12, 120)), prescriptor: medicoNombre, activo: true }, extra.agudo ? { agudo: extra.agudo } : {}));
    };
    db.residents.filter((r) => r.estado === 'activo').forEach((r) => {
      const dx = r.diagnosticos.join(' | ');
      if (/Hipertensión/.test(dx)) R() < 0.5 ? addMed(r.id, 'Enalapril', '10 mg', 'VO', ['08:00', '20:00']) : addMed(r.id, 'Losartán', '50 mg', 'VO', ['08:00']);
      if (/Diabetes/.test(dx)) { addMed(r.id, 'Metformina', '850 mg', 'VO', ['08:00', '20:00'], { indicacion: 'Con las comidas' }); if (BT_lastB(r) < 50) addMed(r.id, 'Insulina NPH', '12 UI', 'SC', ['08:00'], { indicacion: 'Control de HGT previo' }); }
      if (/Alzheimer|Demencia|cognitivo/.test(dx)) { addMed(r.id, BT_lastB(r) > 30 ? 'Donepecilo' : 'Memantina', '10 mg', 'VO', ['20:00']); if (R() < 0.5) addMed(r.id, 'Quetiapina', '25 mg', 'VO', ['22:00'], { indicacion: 'Si agitación nocturna, avisar a enfermería' }); }
      if (/Parkinson/.test(dx)) addMed(r.id, 'Levodopa/Carbidopa', '250/25 mg', 'VO', ['08:00', '12:00', '16:00', '20:00'], { indicacion: 'Respetar horarios estrictamente' });
      if (/cardíaca/.test(dx)) { addMed(r.id, 'Furosemida', '40 mg', 'VO', ['08:00']); addMed(r.id, 'Bisoprolol', '2,5 mg', 'VO', ['08:00']); }
      if (/Fibrilación/.test(dx)) addMed(r.id, 'Apixabán', '2,5 mg', 'VO', ['08:00', '20:00']);
      if (/EPOC/.test(dx)) addMed(r.id, 'Budesonida/Formoterol', '160/4,5 mcg 2 inh', 'Inhalatoria', ['08:00', '20:00']);
      if (/Hipotiroidismo/.test(dx)) addMed(r.id, 'Levotiroxina', '50 mcg', 'VO', ['06:00'], { indicacion: 'En ayunas, 30 min antes del desayuno' });
      if (/Depresión/.test(dx)) addMed(r.id, 'Sertralina', '50 mg', 'VO', ['08:00']);
      if (/Osteoporosis|cadera/.test(dx)) addMed(r.id, 'Calcio + Vitamina D', '600 mg/400 UI', 'VO', ['12:00']);
      if (/ACV|Dislipemia/.test(dx)) { addMed(r.id, 'AAS', '100 mg', 'VO', ['12:00']); addMed(r.id, 'Atorvastatina', '20 mg', 'VO', ['22:00']); }
      if (/Artrosis|fractura|Úlcera|cadera/i.test(dx)) addMed(r.id, 'Paracetamol', '1 g', 'VO', ['08:00', '16:00', '22:00'], { indicacion: 'Dolor; máximo 3 g/día' });
      if (/Glaucoma/.test(dx)) addMed(r.id, 'Timolol 0,5 % colirio', '1 gota c/ojo', 'Oftálmica', ['08:00', '20:00']);
      if (/Insomnio/.test(dx)) addMed(r.id, 'Melatonina', '3 mg', 'VO', ['22:00']);
      if (BT_lastB(r) <= 40 && R() < 0.6) addMed(r.id, 'Omeprazol', '20 mg', 'VO', ['08:00'], { indicacion: 'En ayunas' });
    });
    function BT_lastB(r) { return r.barthel[r.barthel.length - 1].score; }
    // Medicación por cuadro agudo (constancia obligatoria)
    addMed('r2', 'Amoxicilina/Ác. clavulánico', '875/125 mg', 'VO', ['08:00', '20:00'], { desde: D(-3), hasta: D(3), indicacion: 'Cada 12 h por 7 días', agudo: { motivo: 'Infección respiratoria baja (bronquitis aguda), fiebre 38,2 °C', dosis: '875/125 mg c/12 h', duracion: '7 días' } });
    addMed('r24', 'Ceftriaxona', '1 g', 'IM', ['16:00'], { desde: D(-2), hasta: D(4), indicacion: 'Una vez al día por 7 días', agudo: { motivo: 'Infección urinaria con urocultivo positivo', dosis: '1 g IM día', duracion: '7 días' } });
    // Stock bajo y recetas por vencer (para alertas)
    const setMed = (rid, droga, patch) => { const m = db.meds.find((x) => x.residentId === rid && x.droga === droga); if (m) Object.assign(m, patch); };
    setMed('r1', 'Metformina', { stock: 6 });
    setMed('r16', 'Levodopa/Carbidopa', { stock: 9 });
    setMed('r22', 'Omeprazol', { stock: 2 });
    setMed('r5', 'Apixabán', { recetaVence: D(4) });
    setMed('r13', 'Metformina', { recetaVence: D(6) });
    setMed('r29', 'Levotiroxina', { recetaVence: D(2) });

    /* Administraciones (últimos 7 días + turnos ya transcurridos de hoy) */
    db.medAdmin = [];
    const whoGave = (dIso, sede, t) => { const day = db.shifts[dIso]; const ids = day ? day[sede][t] : []; const s = db.staff.find((x) => x.id === ids[0]) || db.staff.find((x) => x.sede === sede); return s; };
    const nowTs = NOW.getTime();
    for (let k = -7; k <= 0; k++) {
      const dIso = D(k);
      db.meds.forEach((m) => {
        if (m.desde > dIso || (m.hasta && m.hasta < dIso)) return;
        const r = BT_find(m.residentId);
        m.horarios.forEach((h) => {
          const t = u.shiftOfHour(h);
          const opDate = h < '06:00' ? D(k - 1) : dIso;
          const ts = at(dIso, h);
          // Las dosis de los últimos 45 min y las próximas quedan pendientes (las da la cuidadora en la demo)
          if (ts > nowTs - 45 * 60000) return;
          if (k === 0 && m.residentId === 'r7' && h === '08:00' && m.droga === 'Metformina') return; // dosis sin registrar (alerta)
          let estado = 'administrada', nota = '';
          if (R() < 0.006) { estado = 'rechazada'; nota = 'Rechaza la medicación. Se reintenta a los 30 min sin éxito. Se avisa a enfermería.'; }
          else if (R() < 0.004) { estado = 'omitida'; nota = 'Residente en consulta externa.'; }
          const s = whoGave(opDate, r.sede, t);
          const user = db.users.find((x) => x.staffId === (s && s.id));
          db.medAdmin.push({ id: id('ma'), medId: m.id, residentId: m.residentId, fecha: dIso, hora: h, turno: t, estado, userId: user ? user.id : 'st_' + (s && s.id), userName: s ? s.nombre : 'Cuidadora', ts: ts + ri(0, 22) * 60000, nota });
        });
      });
    }

    /* ---------------- Historia clínica ---------------- */
    const evoTpl = {
      'Médica': [
        'Control clínico. Hemodinámicamente estable, PA {pa} mmHg. Sin cambios en la medicación habitual. Se indica continuar plan.',
        'Paciente vigil, colaboradora dentro de sus posibilidades. Auscultación cardiopulmonar sin alteraciones. Buena tolerancia vía oral.',
        'Se revisan controles de la semana: glucemias en rango, sin episodios de hipoglucemia. Se mantiene esquema.',
        'Consulta por tos seca de 48 h, afebril. Sat 95 % VEA. Se indican medidas generales y control evolutivo.',
        'Revisión trimestral del plan de atención individual junto a enfermería. Se actualizan objetivos.',
      ],
      'Enfermería': [
        'Turno sin novedades. Se administra medicación en horario. Descansó bien durante la noche.',
        'Se realiza control de signos vitales dentro de parámetros. Hidratación adecuada (1,4 L).',
        'Se realiza curación según protocolo. Bordes de la lesión limpios, sin signos de infección.',
        'Se refuerzan cambios posturales cada 2 horas. Piel íntegra en zonas de apoyo.',
        'Se observa leve inapetencia en el almuerzo. Se ofrece suplemento y se acepta parcialmente. Se continúa vigilancia.',
      ],
      'Social': ['Entrevista con referente familiar. Se acuerda frecuencia de visitas y se actualizan datos de contacto.'],
    };
    db.evoluciones = []; db.vitals = []; db.weights = []; db.indicaciones = [];
    db.residents.filter((r) => r.estado === 'activo').forEach((r) => {
      const n = ri(4, 7);
      for (let k = 0; k < n; k++) {
        const tipo = k % 3 === 0 ? 'Médica' : 'Enfermería';
        const ts = at(D(-ri(1, 55)), pick(['09:30', '10:15', '11:40', '15:20', '17:05', '21:30']));
        db.evoluciones.push({ id: id('ev'), residentId: r.id, ts, autor: tipo === 'Médica' ? medicoNombre : pick(['Lic. Mariana Castro Brum', 'Gabriela López Etchart', 'Florencia Vidal Saravia']), rol: tipo === 'Médica' ? 'medico' : 'enfermeria', tipo,
          texto: pick(evoTpl[tipo].filter((t) => (!/glucemias/.test(t) || /Diabetes/.test(r.diagnosticos.join())) && (!/curación/.test(t) || /Úlcera/.test(r.diagnosticos.join())) && (!/cambios posturales/.test(t) || BT_lastB(r) <= 40))).replace('{pa}', ri(115, 145) + '/' + ri(65, 88)), enmiendas: [] });
      }
      if (R() < 0.3) db.evoluciones.push({ id: id('ev'), residentId: r.id, ts: at(D(-ri(10, 50)), '14:30'), autor: 'Lic. T.S. Andrea Pereira', rol: 'social', tipo: 'Social', texto: evoTpl.Social[0], enmiendas: [] });
      // signos vitales semanales (12 semanas)
      const baseS = ri(118, 140), baseD = ri(68, 84), baseFC = ri(64, 84);
      const diab = /Diabetes/.test(r.diagnosticos.join());
      for (let w = 11; w >= 0; w--) {
        db.vitals.push({ id: id('vs'), residentId: r.id, ts: at(D(-w * 7 - ri(0, 2)), '09:' + u.pad(ri(0, 50))), pas: baseS + ri(-10, 12), pad: baseD + ri(-6, 7), fc: baseFC + ri(-6, 8), temp: +(36.1 + R() * 0.8).toFixed(1), sat: ri(93, 98), hgt: diab ? ri(98, 182) : null, autor: pick(['Gabriela López Etchart', 'Florencia Vidal Saravia', 'Lic. Mariana Castro Brum']) });
      }
      // peso mensual (6 meses)
      let kg = r.sexo === 'F' ? rnd(48, 72) : rnd(60, 84);
      const trend = BT_lastB(r) < 30 ? -0.45 : rnd(-0.2, 0.25);
      months.forEach((mes) => { db.weights.push({ residentId: r.id, mes, kg: +kg.toFixed(1) }); kg += trend + rnd(-0.3, 0.3); });
      db.indicaciones.push({ id: id('in'), residentId: r.id, ts: at(D(-ri(20, 90)), '10:00'), autor: medicoNombre, tipo: 'Dieta', texto: 'Dieta ' + r.dieta.toLowerCase() + (r.dieta.startsWith('Procesada') ? ', líquidos con espesante (consistencia néctar).' : '.') });
      if (BT_lastB(r) <= 40) db.indicaciones.push({ id: id('in'), residentId: r.id, ts: at(D(-ri(20, 90)), '10:05'), autor: medicoNombre, tipo: 'Movilización', texto: 'Cambios posturales cada 2 horas. Colchón antiescaras. Control de zonas de apoyo en cada turno.' });
      if (diab) db.indicaciones.push({ id: id('in'), residentId: r.id, ts: at(D(-ri(20, 90)), '10:10'), autor: medicoNombre, tipo: 'Controles', texto: 'HGT en ayunas lunes, miércoles y viernes. Avisar si < 70 o > 250 mg/dl.' });
    });
    // Una evolución con enmienda (la original queda visible)
    const evA = db.evoluciones.find((e) => e.residentId === 'r5' && e.tipo === 'Enfermería');
    if (evA) evA.texto = 'Se realiza control de signos vitales dentro de parámetros. Hidratación adecuada (1,4 L).';
    if (evA) evA.enmiendas.push({ ts: evA.ts + 3600000 * 2, autor: 'Lic. Mariana Castro Brum', motivo: 'Corrección de dato', texto: 'Donde dice "Hidratación adecuada (1,4 L)" debe decir 1,1 L. Se refuerza indicación de hidratación.' });

    db.wounds = [
      { id: id('wd'), residentId: 'r6', zona: 'Sacro', estadio: 'Estadio III', inicio: D(-38), estado: 'Activa', curaciones: [0, 2, 4, 6, 8, 10].map((k) => ({ ts: at(D(-k * 3 - 1), '10:30'), autor: 'Lic. Mariana Castro Brum', nota: k === 0 ? 'Lecho con tejido de granulación 80 %. Reducción del área a 3,1 × 2,4 cm. Se aplica alginato y apósito hidrocoloide.' : 'Curación con suero fisiológico, desbridamiento enzimático y apósito. Evolución favorable.' })) },
      { id: id('wd'), residentId: 'r19', zona: 'Talón derecho', estadio: 'Estadio II', inicio: D(-17), estado: 'Activa', curaciones: [0, 1, 2, 3, 4].map((k) => ({ ts: at(D(-k * 3 - 2), '11:00'), autor: 'Florencia Vidal Saravia', nota: 'Flictena drenada, piel perilesional íntegra. Apósito de espuma y talonera de descarga.' })) },
      { id: id('wd'), residentId: 'r28', zona: 'Región trocantérea izquierda', estadio: 'Estadio I', inicio: D(-6), estado: 'Activa', curaciones: [{ ts: at(D(-1), '09:40'), autor: 'Florencia Vidal Saravia', nota: 'Eritema no blanqueable. Ácidos grasos hiperoxigenados y protección. Se refuerzan cambios posturales.' }] },
      { id: id('wd'), residentId: 'r12', zona: 'Sacro', estadio: 'Estadio II', inicio: D(-70), estado: 'Cicatrizada', curaciones: [{ ts: at(D(-22), '10:00'), autor: 'Gabriela López Etchart', nota: 'Lesión epitelizada. Alta de curaciones. Continuar prevención.' }] },
    ];
    db.falls = [
      { id: id('fl'), residentId: 'r8', ts: at(D(-12), '06:40'), lugar: 'Baño de la habitación', circunstancia: 'Se levantó sola al baño sin pedir asistencia; resbaló al salir de la ducha.', lesiones: 'Hematoma en antebrazo izquierdo', acciones: 'Valoración por enfermería, hielo local, control de signos vitales. Se avisa a médico.', testigo: 'Sin testigos', autor: 'Sandra Olivera Pazos', avisoFamilia: true, avisoMedico: true },
      { id: id('fl'), residentId: 'r27', ts: at(D(-28), '19:15'), lugar: 'Comedor', circunstancia: 'Pérdida de equilibrio al transferirse de la silla de ruedas a la silla del comedor.', lesiones: 'Sin lesiones visibles', acciones: 'Se reincorpora con dos personas. Control neurológico sin alteraciones.', testigo: 'Silvana Rocha Trindade', autor: 'Silvana Rocha Trindade', avisoFamilia: true, avisoMedico: true },
      { id: id('fl'), residentId: 'r3', ts: at(D(-47), '02:30'), lugar: 'Habitación', circunstancia: 'Deambulación nocturna desorientada; caída desde su altura.', lesiones: 'Excoriación en rodilla derecha', acciones: 'Curación local, se coloca sensor de cama y luz nocturna.', testigo: 'Sin testigos', autor: 'Sandra Olivera Pazos', avisoFamilia: true, avisoMedico: true },
      { id: id('fl'), residentId: 'r20', ts: at(D(-63), '15:50'), lugar: 'Pasillo', circunstancia: 'Tropezó con andador en la puerta del baño.', lesiones: 'Sin lesiones', acciones: 'Se revisa calzado y andador. Fisioterapia evalúa marcha.', testigo: 'Romina Cabrera Vidart', autor: 'Romina Cabrera Vidart', avisoFamilia: true, avisoMedico: false },
    ];
    db.incidents = db.falls.map((f) => ({ id: id('ic'), residentId: f.residentId, sede: BT_find(f.residentId).sede, ts: f.ts, tipo: 'Caída', gravedad: /Hematoma|Excoriación/.test(f.lesiones) ? 'Leve' : 'Sin lesión', descripcion: f.circunstancia, autor: f.autor, fallId: f.id }));
    db.incidents.push({ id: id('ic'), residentId: 'r11', sede: 'BT1', ts: at(D(-5), '17:30'), tipo: 'Conducta', gravedad: 'Leve', descripcion: 'Episodio de agitación al atardecer; intentó salir por la puerta principal. Se contiene verbalmente y se acompaña.', autor: 'Patricia Gómez Silva' });
    db.incidents.push({ id: id('ic'), residentId: 'r22', sede: 'BT2', ts: at(D(-2), '12:45'), tipo: 'Atragantamiento', gravedad: 'Moderada', descripcion: 'Tos y dificultad respiratoria durante el almuerzo. Maniobras de desobstrucción efectivas. Se revisa consistencia de la dieta.', autor: 'Claudia Rosas Benítez' });
    db.restrictions = [
      { id: id('rs'), residentId: 'r11', tipo: 'Salidas', motivo: 'Riesgo de fuga por desorientación (2 episodios en el mes). Salidas solo acompañada por referente.', desde: D(-5), hasta: D(25), indicadoPor: medicoNombre, ts: at(D(-5), '18:10') },
      { id: id('rs'), residentId: 'r26', tipo: 'Visitas', motivo: 'Por indicación judicial, visitas del Sr. A.I. solo con supervisión del equipo técnico.', desde: D(-40), hasta: D(140), indicadoPor: 'Dirección técnica', ts: at(D(-40), '10:00') },
    ];

    /* ---------------- Cuidados diarios y cambio de turno ---------------- */
    db.care = [];
    const careTipos = [['Higiene', ['Baño completo en ducha con asistencia', 'Higiene en cama', 'Higiene parcial y cambio de pañal', 'Higiene bucal y de prótesis']], ['Ingesta', ['Desayuno completo', 'Almuerzo: comió 3/4', 'Almuerzo: comió 1/2, se ofrece postre', 'Merienda completa']], ['Hidratación', ['Ingiere 400 ml de agua', 'Ingiere 250 ml de jugo espesado']], ['Cambio postural', ['Decúbito lateral derecho', 'Decúbito lateral izquierdo', 'Decúbito supino, talones en descarga']], ['Deposición', ['Deposición normal', 'Sin deposición en el turno', 'Diuresis en pañal, cambio']], ['Actividad', ['Participó del taller de memoria', 'Paseo por el jardín acompañado', 'Musicoterapia en sala']]];
    db.residents.filter((r) => r.estado === 'activo').forEach((r) => {
      for (let k = 0; k < ri(3, 6); k++) {
        const [tipo, dets] = pick(careTipos);
        const ts = nowTs - ri(20, 600) * 60000;
        const day = db.shifts[u.shiftDate(new Date(ts))]; const t = u.currentShift(new Date(ts));
        const sid = day && day[r.sede][t][0]; const s = db.staff.find((x) => x.id === sid);
        db.care.push({ id: id('cr'), residentId: r.id, ts, tipo, detalle: pick(dets), autor: s ? s.nombre : 'Cuidadora' });
      }
    });
    db.handovers = [];
    ['BT1', 'BT2'].forEach((sede) => {
      const prev = (dIso, t) => (t === 'M' ? [iso(u.addDays(dIso, -1)), 'N'] : t === 'T' ? [dIso, 'M'] : [dIso, 'T']);
      let [dIso, t] = prev(u.shiftDate(NOW), u.currentShift(NOW));
      for (let k = 0; k < 4; k++) {
        const ids = (db.shifts[dIso] || db.shifts[today])[sede][t];
        const s = db.staff.find((x) => x.id === ids[0]) || db.staff.find((x) => x.sede === sede);
        const nov = sede === 'BT1'
          ? ['Turno tranquilo. Nélida (2A) con deambulación nocturna, se acompañó y volvió a dormir a las 03:10. Olga (3B): se realizaron cambios posturales c/2 h, piel sin cambios.', 'Juan Carlos (1B) con tos, afebril; recibió antibiótico en horario. María Elena (1A) HGT 168 en ayunas, se informa a enfermería.', 'Héctor (4A) rechazó parte del almuerzo. Taller de memoria con buena participación (9 residentes).', 'Sin novedades relevantes. Se repuso stock de pañales en el office.'][k]
          : ['Hugo (4B) recibió ceftriaxona IM 16:00, sin reacciones. Aurora (2A) curación de talón realizada por la auxiliar.', 'Irma (3B) atragantamiento leve en la cena, se resolvió con tos efectiva; se informa a cocina para revisar textura.', 'Turno noche con una sola cuidadora entre 02:00 y 04:00 por cobertura; se priorizaron cambios posturales.', 'Visita de la familia de Julio César (1B). Se coordinó control de HGT con enfermería.'][k];
        db.handovers.push({ id: id('ho'), sede, fecha: dIso, turno: t, autor: s ? s.nombre : 'Cuidadora', novedades: nov, pendientes: k === 0 ? (sede === 'BT1' ? ['Control de HGT a María Elena a las 20:00', 'Reponer guantes talle M'] : ['Llamar a la familia de Irma por cita con fonoaudióloga', 'Revisar stock de espesante']) : [], ts: at(dIso, SH[t].from, 8 * 60 - 10) });
        [dIso, t] = prev(dIso, t);
      }
    });

    /* ---------------- Auditoría inicial ---------------- */
    db.audit = [];
    const auditUsers = db.users.filter((x) => x.role !== 'familiar');
    const ACTIONS = [['Abrió', 'Historia clínica'], ['Leyó', 'Evoluciones'], ['Leyó', 'Signos vitales'], ['Modificó', 'Plan de medicación'], ['Creó', 'Evolución de enfermería'], ['Administró', 'Medicación'], ['Exportó', 'Ficha del residente (PDF)']];
    for (let k = 0; k < 460; k++) {
      const usr = pick(auditUsers); const r = pick(db.residents.filter((x) => x.estado === 'activo'));
      if (usr.role === 'administracion') continue;
      let [action, target] = pick(ACTIONS);
      if (usr.role === 'cuidadora') [action, target] = pick([['Administró', 'Medicación'], ['Abrió', 'Historia clínica'], ['Creó', 'Registro de cuidados']]);
      if (usr.role === 'direccion' && action === 'Modificó') action = 'Leyó';
      db.audit.push({ id: id('au'), ts: nowTs - ri(10, 7 * 24 * 60) * 60000, userId: usr.id, userName: usr.nombre, role: usr.role, action, target, residentId: r.id, detail: '', sede: r.sede, ip: '192.168.1.' + (20 + (u.hash(usr.id) % 40)), device: usr.role === 'cuidadora' ? 'Tablet ' + usr.sede : 'PC ' + (usr.role === 'medico' ? 'Consultorio' : 'Dirección') });
    }
    db.audit.push({ id: id('au'), ts: at(D(-2), '23:12'), userId: 'u_adm', userName: 'Paula Benavídez', role: 'administracion', action: 'Acceso denegado', target: 'Historia clínica', residentId: 'r14', detail: 'Rol sin permiso clínico (Ley 18.331)', sede: 'BT1', ip: '192.168.1.44', device: 'PC Administración' });
    db.audit.sort((a, b) => a.ts - b.ts);

    /* ---------------- Insumos, proveedores y consumo ---------------- */
    db.suppliers = [
      { id: 'pv1', nombre: 'Distribuidora Andina Insumos Médicos', rubro: 'Material de enfermería', contacto: 'Germán Olivieri', tel: '2900 4471', email: 'ventas@andinainsumos.com.uy', rut: '21 488 301 0011', plazo: '30 días' },
      { id: 'pv2', nombre: 'Pañalera del Este', rubro: 'Pañales e higiene', contacto: 'Lorena Bica', tel: '2601 8820', email: 'pedidos@panaleradeleste.com.uy', rut: '21 667 120 0018', plazo: '15 días' },
      { id: 'pv3', nombre: 'Almacén Mayorista La Cumbre', rubro: 'Alimentos secos', contacto: 'Raúl Ifrán', tel: '2208 3315', email: 'mayorista@lacumbre.com.uy', rut: '21 300 551 0014', plazo: '15 días' },
      { id: 'pv4', nombre: 'Frutas y Verduras Don Ernesto', rubro: 'Frescos', contacto: 'Ernesto Viñas', tel: '099 455 210', email: 'donernesto.frescos@correo.com.uy', rut: '21 721 004 0019', plazo: 'Contado' },
      { id: 'pv5', nombre: 'Química Limpia Uruguay', rubro: 'Limpieza', contacto: 'Valentina Sanz', tel: '2309 1188', email: 'comercial@quimicalimpia.com.uy', rut: '21 554 870 0013', plazo: '30 días' },
      { id: 'pv6', nombre: 'Farmacia Central Unión', rubro: 'Medicamentos', contacto: 'Q.F. Sergio Abella', tel: '2506 2299', email: 'institucional@farmaciaunion.com.uy', rut: '21 116 902 0012', plazo: '30 días' },
    ];
    const ITEMS = [
      ['Pañales', 'Pañal adulto talle M', 'unidad', 'pv2', 26, true], ['Pañales', 'Pañal adulto talle G', 'unidad', 'pv2', 29, true], ['Pañales', 'Apósito urológico', 'unidad', 'pv2', 14, true], ['Pañales', 'Toallas húmedas x80', 'paquete', 'pv2', 120, false],
      ['Enfermería', 'Guantes de látex talle M (caja x100)', 'caja', 'pv1', 390, false], ['Enfermería', 'Guantes de nitrilo talle M (caja x100)', 'caja', 'pv1', 520, false], ['Enfermería', 'Gasas estériles 10×10', 'sobre', 'pv1', 12, false], ['Enfermería', 'Apósito hidrocoloide 10×10', 'unidad', 'pv1', 210, true], ['Enfermería', 'Tiras reactivas de glucemia (x50)', 'caja', 'pv1', 890, false], ['Enfermería', 'Espesante en polvo 400 g', 'lata', 'pv6', 680, true], ['Enfermería', 'Alcohol en gel 1 L', 'unidad', 'pv1', 230, false], ['Enfermería', 'Crema barrera con óxido de zinc', 'pomo', 'pv6', 260, true],
      ['Limpieza', 'Hipoclorito de sodio 5 L', 'bidón', 'pv5', 310, false], ['Limpieza', 'Detergente neutro 5 L', 'bidón', 'pv5', 420, false], ['Limpieza', 'Desinfectante de superficies 5 L', 'bidón', 'pv5', 560, false], ['Limpieza', 'Bolsas de residuos 90×110', 'paquete', 'pv5', 190, false], ['Limpieza', 'Papel higiénico x48', 'bulto', 'pv5', 690, false],
      ['Alimentos', 'Arroz 1 kg', 'kg', 'pv3', 48, false], ['Alimentos', 'Fideos 1 kg', 'kg', 'pv3', 62, false], ['Alimentos', 'Leche descremada 1 L', 'litro', 'pv3', 39, false], ['Alimentos', 'Harina de maíz 1 kg', 'kg', 'pv3', 55, false], ['Alimentos', 'Edulcorante líquido 200 ml', 'unidad', 'pv3', 140, false], ['Alimentos', 'Frutas y verduras de estación', 'kg', 'pv4', 45, false],
    ];
    db.stock = [];
    ['BT1', 'BT2'].forEach((sede) => ITEMS.forEach(([categoria, item, unidad, prov, costo, porRes], i) => {
      const nRes = sede === 'BT1' ? 16 : 14; const scale = categoria === 'Pañales' ? (sede === 'BT1' ? 1 : 1.5) : 1;
      const minimo = Math.round((categoria === 'Pañales' && unidad === 'unidad' ? 400 : categoria === 'Alimentos' ? 30 : 6) * scale);
      let stock = Math.round(minimo * rnd(1.1, 3.2));
      if ((sede === 'BT2' && item.includes('talle G')) || (sede === 'BT1' && item.includes('nitrilo')) || (sede === 'BT2' && item.startsWith('Espesante')) || (sede === 'BT1' && item.startsWith('Tiras'))) stock = Math.round(minimo * rnd(0.3, 0.8));
      db.stock.push({ id: 'it_' + sede + '_' + i, sede, categoria, item, unidad, stock, minimo, costo, proveedorId: prov, porResidente: porRes, nRes });
    }));
    db.consumption = [];
    db.residents.forEach((r) => {
      if (BT_lastB(r) > 55) return;
      const pan = db.stock.find((s) => s.sede === r.sede && s.item.includes(BT_lastB(r) < 25 ? 'talle G' : 'talle M'));
      months.forEach((mes) => {
        if (r.ingreso > mes + '-28' || (r.egreso && r.egreso.fecha < mes + '-01')) return;
        const perDay = BT_lastB(r) <= 20 ? 5 : BT_lastB(r) <= 40 ? 4 : 3;
        const daysIn = mes === curYM ? T.getDate() : 30;
        db.consumption.push({ residentId: r.id, itemId: pan.id, mes, cantidad: perDay * daysIn + ri(-6, 6) });
      });
      if (BT_lastB(r) <= 40) { const cb = db.stock.find((s) => s.sede === r.sede && s.item.startsWith('Crema barrera')); months.forEach((mes) => { if (r.ingreso > mes + '-28' || (r.egreso && r.egreso.fecha < mes + '-01')) return; db.consumption.push({ residentId: r.id, itemId: cb.id, mes, cantidad: ri(1, 3) }); }); }
    });
    db.purchases = [
      { id: id('oc'), proveedorId: 'pv2', sede: 'BT2', fecha: D(-2), items: 'Pañal adulto talle G × 1.200', total: 34800, estado: 'Pendiente de entrega' },
      { id: id('oc'), proveedorId: 'pv1', sede: 'BT1', fecha: D(-4), items: 'Guantes de nitrilo × 20 cajas, gasas × 300', total: 14000, estado: 'Recibida' },
      { id: id('oc'), proveedorId: 'pv3', sede: 'BT1', fecha: D(-6), items: 'Compra mensual de secos', total: 58600, estado: 'Recibida' },
      { id: id('oc'), proveedorId: 'pv3', sede: 'BT2', fecha: D(-6), items: 'Compra mensual de secos', total: 51200, estado: 'Recibida' },
      { id: id('oc'), proveedorId: 'pv5', sede: 'BT1', fecha: D(-9), items: 'Productos de limpieza (mensual)', total: 17900, estado: 'Recibida' },
      { id: id('oc'), proveedorId: 'pv6', sede: 'BT2', fecha: D(-1), items: 'Espesante × 12 latas', total: 8160, estado: 'Pendiente de entrega' },
      { id: id('oc'), proveedorId: 'pv4', sede: 'BT1', fecha: D(-1), items: 'Frescos semanales', total: 12400, estado: 'Recibida' },
    ];

    /* ---------------- Cobranzas ---------------- */
    db.charges = []; db.payments = []; db.invoices = [];
    let recibo = 4180, efact = 1520;
    const MEDIOS = ['Transferencia BROU', 'Transferencia Itaú', 'Depósito', 'Débito automático', 'Efectivo', 'Transferencia Santander'];
    const morosos = { r8: 2, r24: 1, r29: 1 };
    db.residents.forEach((r) => {
      db.charges.push({ id: id('ch'), residentId: r.id, sede: r.sede, mes: r.ingreso.slice(0, 7), concepto: 'Depósito de garantía', monto: r.deposito, garantia: true });
      months.forEach((mes, mi) => {
        if (r.ingreso.slice(0, 7) > mes) return;
        if (r.egreso && r.egreso.fecha.slice(0, 7) < mes) return;
        const ipc = mi >= 1 ? 1 : 0.955; // ajuste de cuota en el segundo mes de la serie
        const lines = [{ concepto: 'Cuota mensual', monto: Math.round((r.cuota * ipc) / 10) * 10 }];
        const cons = db.consumption.filter((c) => c.residentId === r.id && c.mes === mes);
        cons.forEach((c) => { const it = db.stock.find((s) => s.id === c.itemId); lines.push({ concepto: it.item.startsWith('Pañal') ? 'Pañales' : 'Insumos de enfermería', monto: Math.round(c.cantidad * it.costo * 1.1), cantidad: c.cantidad }); });
        if (R() < 0.45) lines.push({ concepto: 'Medicación', monto: ri(6, 32) * 100 });
        if (R() < 0.5) lines.push({ concepto: 'Peluquería', monto: 650 });
        if (R() < 0.3) lines.push({ concepto: 'Podología', monto: 900 });
        const totalMes = u.sum(lines, 'monto');
        lines.forEach((l) => db.charges.push(Object.assign({ id: id('ch'), residentId: r.id, sede: r.sede, mes }, l)));
        const neto = Math.round(totalMes / 1.1);
        db.invoices.push({ id: id('fe'), nro: 'A ' + String(++efact).padStart(7, '0'), tipo: 'e-Ticket', residentId: r.id, sede: r.sede, mes, neto, iva: totalMes - neto, total: totalMes, estado: 'Aceptada DGI', fecha: mes + '-01' });
        const isCur = mes === curYM;
        const owe = morosos[r.id] && mi >= 6 - morosos[r.id];
        const pendingCur = isCur && (T.getDate() <= 10 ? R() < 0.5 : ['r2', 'r21'].includes(r.id));
        if (!owe && !pendingCur) {
          const fecha = mes + '-' + u.pad(Math.min(ri(1, 10), isCur ? T.getDate() : 28));
          const partial = r.id === 'r13' && isCur ? Math.round(totalMes * 0.5) : totalMes;
          db.payments.push({ id: id('pg'), residentId: r.id, sede: r.sede, fecha, monto: partial, medio: pick(MEDIOS), recibo: 'R-' + String(++recibo).padStart(6, '0') });
        }
      });
      db.payments.push({ id: id('pg'), residentId: r.id, sede: r.sede, fecha: r.ingreso, monto: r.deposito, medio: 'Transferencia BROU', recibo: 'R-' + String(++recibo).padStart(6, '0'), garantia: true });
    });

    /* ---------------- Finanzas (6 meses, por sede) ---------------- */
    db.finance = [];
    const staffCost = (sede) => u.sum(db.staff, (s) => (s.volante || s.rol === 'Lic. en Enfermería' ? s.salario / 2 : s.sede === sede ? s.salario : 0));
    months.forEach((mes, mi) => {
      const mm = u.toDate(mes).getMonth();
      ['BT1', 'BT2'].forEach((sede) => {
        const ing = db.charges.filter((c) => c.sede === sede && c.mes === mes && !c.garantia);
        const byCat = u.groupBy(ing, (c) => (c.concepto === 'Cuota mensual' ? 'Cuotas mensuales' : 'Extras (pañales, medicación, servicios)'));
        Object.entries(byCat).forEach(([cat, arr]) => db.finance.push({ mes, sede, tipo: 'ingreso', categoria: cat, monto: u.sum(arr, 'monto') }));
        db.finance.push({ mes, sede, tipo: 'ingreso', categoria: 'Otros ingresos', monto: ri(4, 12) * 1000 });
        const nRes = db.residents.filter((r) => r.sede === sede && r.ingreso.slice(0, 7) <= mes && (!r.egreso || r.egreso.fecha.slice(0, 7) >= mes)).length;
        const nDep = db.residents.filter((r) => r.sede === sede && r.estado === 'activo' && BT_lastB(r) <= 40).length;
        const aguinaldo = mm === 5 || mm === 11 ? 1.5 : 1;
        const g = {
          'Sueldos y cargas sociales': Math.round(staffCost(sede) * 1.32 * aguinaldo * (1 + (mi >= 1 ? 0.035 : 0)) + ri(-6, 9) * 1000),
          'Alimentación': Math.round(nRes * rnd(8600, 9400)),
          'Pañales e higiene': Math.round(nDep * rnd(4200, 4900)),
          'Medicamentos e insumos': Math.round(rnd(21000, 29000) * (sede === 'BT2' ? 1.25 : 1)),
          'Limpieza': Math.round(rnd(15500, 19500)),
          'Alquiler': sede === 'BT1' ? 98000 : 86000,
          'Servicios (UTE, OSE, Antel)': Math.round((sede === 'BT1' ? 31000 : 27500) * (mm >= 4 && mm <= 7 ? 1.18 : 1) + ri(-2, 2) * 1000),
          'Honorarios profesionales': 54000,
          'Mantenimiento': mi === 2 && sede === 'BT2' ? 46500 : Math.round(rnd(8000, 14000)),
          'Seguros': 9500,
          'Impuestos y tasas': 0,
          'Otros gastos': Math.round(rnd(4500, 8500)),
        };
        const totIng = u.sum(db.finance.filter((f) => f.mes === mes && f.sede === sede && f.tipo === 'ingreso'), 'monto');
        g['Impuestos y tasas'] = Math.round(totIng * 0.038);
        Object.entries(g).forEach(([categoria, monto]) => db.finance.push({ mes, sede, tipo: 'gasto', categoria, monto }));
      });
    });
    db.budget = {};
    ['BT1', 'BT2'].forEach((sede) => {
      db.budget[sede] = {};
      const cats = u.groupBy(db.finance.filter((f) => f.sede === sede && f.tipo === 'gasto' && f.mes !== months[0]), 'categoria');
      Object.entries(cats).forEach(([c, arr]) => { const avg = u.avg(arr.filter((x) => !/Sueldos/.test(c) || x.monto < 1.3 * u.avg(arr, 'monto')), 'monto'); db.budget[sede][c] = Math.round((avg * rnd(0.93, 1.04)) / 500) * 500; });
      const ingCats = u.groupBy(db.finance.filter((f) => f.sede === sede && f.tipo === 'ingreso'), 'categoria');
      Object.entries(ingCats).forEach(([c, arr]) => { db.budget[sede]['ING:' + c] = Math.round((u.avg(arr, 'monto') * rnd(0.98, 1.05)) / 500) * 500; });
    });

    /* ---------------- Admisiones ---------------- */
    db.waitlist = [
      { id: id('wl'), nombre: 'Aída Teresa Ramos', edad: 89, contacto: 'Claudia Ramos', vinculo: 'Hija', tel: '099 312 455', sedePref: 'BT2', dependencia: 'Severa', estado: 'Listo para ingresar', ts: at(D(-21), '10:00'), notas: 'Reserva de cama 8B en BT2. Ingreso previsto para la próxima semana.', seguimiento: [{ ts: at(D(-21), '10:00'), texto: 'Primer contacto telefónico.', autor: 'Paula Benavídez' }, { ts: at(D(-15), '16:00'), texto: 'Visita a la sede con la familia.', autor: 'Carolina Galarza' }, { ts: at(D(-6), '11:30'), texto: 'Evaluación médica de ingreso realizada. Barthel 30.', autor: 'Dr. Fernando Aguirre' }, { ts: at(D(-2), '09:00'), texto: 'Firma de contrato y pago de depósito de garantía.', autor: 'Paula Benavídez' }] },
      { id: id('wl'), nombre: 'Héctor Luis Bentos', edad: 81, contacto: 'Marcelo Bentos', vinculo: 'Hijo', tel: '098 440 120', sedePref: 'BT1', dependencia: 'Leve', estado: 'Visita agendada', ts: at(D(-5), '15:20'), notas: 'Interesado en habitación compartida. Visita jueves 11:00.', seguimiento: [{ ts: at(D(-5), '15:20'), texto: 'Consulta por WhatsApp desde la web.', autor: 'Paula Benavídez' }] },
      { id: id('wl'), nombre: 'Elena María Sartori', edad: 92, contacto: 'Ana Sartori', vinculo: 'Nieta', tel: '091 877 233', sedePref: 'BT1', dependencia: 'Moderada', estado: 'Evaluación', ts: at(D(-9), '12:00'), notas: 'Pendiente informe de su médico tratante.', seguimiento: [{ ts: at(D(-9), '12:00'), texto: 'Visita realizada.', autor: 'Carolina Galarza' }] },
      { id: id('wl'), nombre: 'Juan José Ferrando', edad: 77, contacto: 'Laura Ferrando', vinculo: 'Esposa', tel: '094 655 908', sedePref: 'Indistinta', dependencia: 'Moderada', estado: 'Nuevo', ts: at(D(-1), '18:45'), notas: '', seguimiento: [] },
      { id: id('wl'), nombre: 'Gloria Estela Píriz', edad: 86, contacto: 'Fernando Píriz', vinculo: 'Hijo', tel: '099 102 774', sedePref: 'BT2', dependencia: 'Severa', estado: 'En espera de cama', ts: at(D(-34), '09:10'), notas: 'Prefiere BT2 por cercanía. Avisar ante vacante.', seguimiento: [{ ts: at(D(-34), '09:10'), texto: 'Visita y evaluación completa.', autor: 'Carolina Galarza' }] },
      { id: id('wl'), nombre: 'Mabel Cristina Ruiz', edad: 84, contacto: 'Sergio Ruiz', vinculo: 'Sobrino', tel: '092 311 650', sedePref: 'BT1', dependencia: 'Leve', estado: 'Descartado', ts: at(D(-50), '14:00'), notas: 'Optó por otra residencia por precio.', seguimiento: [] },
    ];
    db.admissionChecklist = ['Entrevista con la familia y visita a la sede', 'Evaluación médica de ingreso y escala de Barthel', 'Ficha de usuario (Ordenanza 483/017)', 'Copia de cédula del residente y del referente', 'Consentimiento informado firmado', 'Contrato de servicios y depósito de garantía', 'Indicaciones médicas y medicación vigente', 'Carné de vacunas', 'Datos de mutualista y emergencia móvil', 'Asignación de habitación y cama', 'Inventario de pertenencias', 'Alta en el portal del familiar'];

    /* ---------------- Familias ---------------- */
    const GR = ['linear-gradient(135deg,#8fc49f,#297040)', 'linear-gradient(135deg,#f3c98b,#d98c5f)', 'linear-gradient(135deg,#a9b8e8,#6b5ba8)', 'linear-gradient(135deg,#9ed3e0,#3f78b5)', 'linear-gradient(135deg,#f2b8c6,#b5677a)', 'linear-gradient(135deg,#d8d2a0,#8a7a2e)'];
    db.posts = [
      { id: id('po'), sede: 'BT1', residentId: null, ts: at(D(0), '11:20'), autor: 'Carolina Galarza', tipo: 'Foto', titulo: 'Mañana de huerta', texto: 'Hoy plantamos lechugas y albahaca en la huerta del fondo. ¡Gran participación!', foto: { grad: GR[0], icon: 'sprout', caption: 'Huerta · BT1' } },
      { id: id('po'), sede: 'BT1', residentId: 'r1', ts: at(D(-1), '17:40'), autor: 'Patricia Gómez Silva', tipo: 'Novedad', titulo: 'María Elena en el taller de memoria', texto: 'María Elena participó muy contenta del taller de memoria y nos contó anécdotas de su época de maestra.', foto: { grad: GR[1], icon: 'brain', caption: 'Taller de memoria' } },
      { id: id('po'), sede: 'ALL', residentId: null, ts: at(D(-2), '10:00'), autor: 'Dirección', tipo: 'Comunicado', titulo: 'Horario de visitas para las fiestas', texto: 'Durante diciembre ampliamos el horario de visitas de 10:00 a 20:00. Les pedimos agendar la visita desde el portal para organizar mejor los espacios.', foto: null },
      { id: id('po'), sede: 'BT2', residentId: null, ts: at(D(-3), '16:10'), autor: 'Silvana Rocha Trindade', tipo: 'Foto', titulo: 'Tarde de tango', texto: 'Musicoterapia con tangos y milongas. Julio César se animó a cantar "Mi Buenos Aires querido".', foto: { grad: GR[2], icon: 'music', caption: 'Musicoterapia · BT2' } },
      { id: id('po'), sede: 'BT2', residentId: 'r18', ts: at(D(-4), '12:30'), autor: 'Mónica Píriz Delgado', tipo: 'Novedad', titulo: 'Control mensual', texto: 'Julio César tuvo su control mensual con el Dr. Aguirre. Glucemias estables y buen ánimo.', foto: null },
      { id: id('po'), sede: 'ALL', residentId: null, ts: at(D(-7), '09:00'), autor: 'Dirección', tipo: 'Comunicado', titulo: 'Campaña de vacunación', texto: 'Se completó la vacunación antigripal y contra COVID-19 de todos los residentes que dieron su consentimiento.', foto: null },
      { id: id('po'), sede: 'BT1', residentId: null, ts: at(D(-8), '15:30'), autor: 'Andrea Martínez Pou', tipo: 'Foto', titulo: 'Cumpleaños del mes', texto: 'Festejamos a los cumpleañeros con torta casera y mucha música.', foto: { grad: GR[4], icon: 'cake', caption: 'Cumpleaños · BT1' } },
      { id: id('po'), sede: 'BT2', residentId: null, ts: at(D(-10), '11:00'), autor: 'Claudia Rosas Benítez', tipo: 'Foto', titulo: 'Gimnasia al aire libre', texto: 'Aprovechamos el sol para hacer la gimnasia suave en el patio.', foto: { grad: GR[3], icon: 'sun', caption: 'Patio · BT2' } },
    ];
    db.visits = [];
    const visitors = (r) => [r.referente.nombre, pick(['Nieta', 'Nieto', 'Vecina', 'Amiga', 'Sobrino'])];
    db.residents.filter((r) => r.estado === 'activo').forEach((r) => {
      for (let k = 0; k < ri(1, 3); k++) { const f = D(-ri(1, 20)); db.visits.push({ id: id('vi'), residentId: r.id, sede: r.sede, visitante: r.referente.nombre, vinculo: r.referente.vinculo, fecha: f, hora: pick(['10:30', '15:00', '16:30', '17:00', '18:00']), salida: pick(['11:30', '16:15', '17:40', '18:30', '19:00']), estado: 'Realizada' }); }
      if (R() < 0.45) db.visits.push({ id: id('vi'), residentId: r.id, sede: r.sede, visitante: r.referente.nombre, vinculo: r.referente.vinculo, fecha: D(ri(0, 6)), hora: pick(['10:30', '15:00', '16:30', '17:00']), estado: 'Agendada' });
      void visitors;
    });
    db.visits.push({ id: id('vi'), residentId: 'r1', sede: 'BT1', visitante: 'Silvia Barreiro', vinculo: 'Hija', fecha: D(2), hora: '17:00', estado: 'Agendada' });

    /* ---------------- Cocina ---------------- */
    db.menu = {
      semana: [
        { dia: 'Lunes', desayuno: 'Café con leche, pan con manteca y mermelada', almuerzo: 'Pollo al horno con puré de calabaza', merienda: 'Yogur con frutas', cena: 'Sopa de verduras y tortilla de espinaca' },
        { dia: 'Martes', desayuno: 'Té con leche, tostadas con queso', almuerzo: 'Guiso de lentejas con arroz', merienda: 'Budín casero', cena: 'Pescado al horno con papas' },
        { dia: 'Miércoles', desayuno: 'Café con leche, bizcochos', almuerzo: 'Milanesa al horno con ensalada mixta', merienda: 'Leche con cocoa y galletitas', cena: 'Tarta de zapallitos' },
        { dia: 'Jueves', desayuno: 'Té con leche, pan con dulce de membrillo', almuerzo: 'Ñoquis con salsa de tomate y carne picada', merienda: 'Fruta asada', cena: 'Caldo y croquetas de arroz' },
        { dia: 'Viernes', desayuno: 'Café con leche, pan con queso', almuerzo: 'Merluza a la plancha con puré de papas', merienda: 'Arroz con leche', cena: 'Zapallitos rellenos' },
        { dia: 'Sábado', desayuno: 'Té con leche, tostadas', almuerzo: 'Carne al horno con boniato', merienda: 'Torta de naranja', cena: 'Sopa de fideos y omelette' },
        { dia: 'Domingo', desayuno: 'Café con leche, medialunas', almuerzo: 'Pastel de carne', merienda: 'Ensalada de frutas', cena: 'Polenta con salsa' },
      ],
      variantes: {
        'Común': 'Menú general',
        'Diabético': 'Sin azúcar agregada, edulcorante, porciones controladas de harinas y postres dietéticos',
        'Hiposódico': 'Sin sal agregada, condimentos naturales, sin embutidos',
        'Blanda': 'Cocciones prolongadas, sin fibras duras, carnes picadas o desmenuzadas',
        'Procesada (disfagia)': 'Textura puré homogénea (IDDSI 4), líquidos espesados nivel néctar, supervisión permanente',
        'Hipograsa': 'Sin frituras ni grasas visibles, lácteos descremados',
      },
    };

    /* ---------------- Habilitaciones y vencimientos ---------------- */
    const C = (sede, item, organismo, dias, responsable = 'Carolina Galarza') => ({ id: id('hb'), sede, item, organismo, vence: D(dias), doc: item.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.pdf', responsable });
    db.compliance = [
      C('BT1', 'Habilitación del establecimiento', 'MSP', 410), C('BT2', 'Habilitación del establecimiento', 'MSP', 22),
      C('BT1', 'Inscripción en el Registro ELEPEM', 'MIDES', 260), C('BT2', 'Inscripción en el Registro ELEPEM', 'MIDES', 260),
      C('BT1', 'Habilitación de Bomberos', 'Dirección Nacional de Bomberos', 95), C('BT2', 'Habilitación de Bomberos', 'Dirección Nacional de Bomberos', 180),
      C('BT1', 'Recarga y control de extintores', 'Empresa habilitada DNB', 48), C('BT2', 'Recarga y control de extintores', 'Empresa habilitada DNB', 9),
      C('BT1', 'Control de plagas y fumigación', 'Empresa habilitada IM', 61), C('BT2', 'Control de plagas y fumigación', 'Empresa habilitada IM', -5),
      C('BT1', 'Limpieza y desinfección de tanque de agua', 'Empresa habilitada', 120), C('BT2', 'Limpieza y desinfección de tanque de agua', 'Empresa habilitada', 33),
      C('BT1', 'Seguro de responsabilidad civil', 'BSE', 200, 'Paula Benavídez'), C('BT2', 'Seguro de responsabilidad civil', 'BSE', 200, 'Paula Benavídez'),
      C('BT1', 'Seguro de incendio', 'BSE', 145, 'Paula Benavídez'), C('BT2', 'Seguro de incendio', 'BSE', 145, 'Paula Benavídez'),
      C('BT1', 'Contrato de alquiler', 'Inmobiliaria', 520, 'Paula Benavídez'), C('BT2', 'Contrato de alquiler', 'Inmobiliaria', 75, 'Paula Benavídez'),
      C('BT1', 'Habilitación bromatológica de cocina', 'Intendencia de Montevideo', 15), C('BT2', 'Habilitación bromatológica de cocina', 'Intendencia de Montevideo', 300),
      C('ALL', 'Certificado único DGI', 'DGI', 70, 'Paula Benavídez'), C('ALL', 'Certificado común BPS', 'BPS', 26, 'Paula Benavídez'),
    ];

    /* ---------------- Actividades ---------------- */
    db.activities = [];
    const WEEKLY = { 1: ['10:30', 'Gimnasia suave', 'Movimiento', 'Prof. Diego Laborde', 'Salón'], 2: ['16:00', 'Taller de memoria', 'Cognitiva', 'Lic. Andrea Pereira', 'Comedor'], 3: ['15:30', 'Musicoterapia', 'Música', 'Mtra. Sofía Cuadrado', 'Salón'], 4: ['10:30', 'Huerta y jardinería', 'Aire libre', 'Equipo de cuidados', 'Patio'], 5: ['16:00', 'Cine y merienda', 'Recreativa', 'Equipo de cuidados', 'Salón'], 6: ['11:00', 'Espacio espiritual', 'Espiritual', 'Voluntariado parroquial', 'Capilla'] };
    const mStart = new Date(T.getFullYear(), T.getMonth(), 1); const mEnd = new Date(T.getFullYear(), T.getMonth() + 2, 0);
    for (let d = new Date(mStart); d <= mEnd; d = u.addDays(d, 1)) {
      const w = WEEKLY[d.getDay()]; if (!w) continue;
      ['BT1', 'BT2'].forEach((sede) => {
        const dIso = iso(d); const past = dIso < today;
        const elig = db.residents.filter((r) => r.estado === 'activo' && r.sede === sede && BT_lastB(r) > (w[2] === 'Música' ? 0 : 25));
        db.activities.push({ id: id('ac'), sede, fecha: dIso, hora: w[0], titulo: w[1], tipo: w[2], responsable: w[3], lugar: w[4], asistentes: past ? elig.filter(() => R() < 0.7).map((r) => r.id) : [] });
      });
    }
    db.activities.push({ id: id('ac'), sede: 'BT1', fecha: D(9), hora: '15:00', titulo: 'Coro del liceo de Malvín', tipo: 'Recreativa', responsable: 'Dirección', lugar: 'Salón', asistentes: [] });
    db.activities.push({ id: id('ac'), sede: 'BT2', fecha: D(12), hora: '16:00', titulo: 'Fiesta de fin de año con familias', tipo: 'Celebración', responsable: 'Dirección', lugar: 'Patio', asistentes: [] });
    // cumpleaños cercanos: forzar dos residentes con cumpleaños esta semana
    const bd = (rid, days) => { const r = BT_find(rid); const d0 = u.toDate(r.nacimiento); const target = u.addDays(T, days); d0.setMonth(target.getMonth()); d0.setDate(target.getDate()); r.nacimiento = iso(d0); };
    bd('r12', 0); bd('r21', 3); bd('r4', 11);

    return db;
  };

  /* ==========================================================================
     Reglas de negocio compartidas
     ========================================================================== */

  /** Cuidadoras requeridas por turno según Barthel (Ord. 1032/2019 + Dto. 356/016 art. 19). */
  BT.ratioRequiredStatic = function (db) {
    const p = db.settings.ratio; const out = {};
    ['BT1', 'BT2'].forEach((sede) => {
      const res = db.residents.filter((r) => r.sede === sede && r.estado === 'activo');
      const dep = res.filter((r) => r.barthel[r.barthel.length - 1].score <= 40).length; const ind = res.length - dep;
      const day = Math.max(1, Math.ceil(dep / p.diaDep + ind / p.diaInd - 1e-9));
      const night = Math.max(1, Math.ceil(dep / p.nocheDep + ind / p.nocheInd - 1e-9));
      out[sede] = { M: day, T: day, N: night, dep, ind, total: res.length };
    });
    return out;
  };
  BT.ratioRequired = () => BT.ratioRequiredStatic(BT.db);
  /** Personal que cuenta para el ratio (cuidadoras y auxiliares) asignado a un turno */
  BT.shiftStaff = function (dIso, sede, turno) {
    const day = BT.db.shifts[dIso]; if (!day) return [];
    return (day[sede][turno] || []).map(BT.staffById).filter(Boolean);
  };
  /** Estado del ratio: { required, assigned, ok, deficit } */
  BT.ratioStatus = function (dIso, sede, turno) {
    const req = BT.ratioRequired()[sede][turno];
    const assigned = BT.shiftStaff(dIso, sede, turno).length;
    return { required: req, assigned, ok: assigned >= req, deficit: Math.max(0, req - assigned) };
  };
  /** Turnos por debajo del ratio entre hoy y N días */
  BT.uncoveredShifts = function (days = 14, sedes = ['BT1', 'BT2']) {
    const out = [];
    for (let k = 0; k < days; k++) {
      const dIso = BT.u.iso(BT.u.addDays(BT.u.today(), k));
      sedes.forEach((s) => ['M', 'T', 'N'].forEach((t) => { const st = BT.ratioStatus(dIso, s, t); if (!st.ok) out.push(Object.assign({ fecha: dIso, sede: s, turno: t }, st)); }));
    }
    return out;
  };
  /** ¿Está una funcionaria disponible esa fecha? (no asignada, sin licencia, sin falta) */
  BT.staffAvailability = function (sid, dIso) {
    const day = BT.db.shifts[dIso];
    if (BT.db.leaves.some((l) => l.staffId === sid && l.estado === 'Aprobada' && l.desde <= dIso && l.hasta >= dIso)) return { ok: false, why: 'De licencia' };
    if (BT.db.absences.some((a) => a.staffId === sid && a.fecha === dIso)) return { ok: false, why: 'Falta registrada' };
    if (day) for (const s of ['BT1', 'BT2']) for (const t of ['M', 'T', 'N']) if (day[s][t].includes(sid)) return { ok: false, why: 'Asignada a ' + s + ' · ' + BT.u.SHIFTS[t].label, sede: s, turno: t };
    const st = BT.staffById(sid); if (st && st.offDow === BT.u.toDate(dIso).getDay()) return { ok: true, why: 'Día libre (generaría hora extra)', libre: true };
    return { ok: true, why: 'Disponible' };
  };

  /** Días de licencia anual generados (Ley 12.590): 20 + 1 cada 4 años a partir del 5º */
  BT.leaveDays = function (staff) {
    const y = BT.u.yearsSince(staff.ingreso);
    return y >= 5 ? 20 + 1 + Math.floor((y - 5) / 4) : 20;
  };
  BT.leaveTaken = (sid, year = new Date().getFullYear()) => BT.u.sum(BT.db.leaves.filter((l) => l.staffId === sid && l.tipo === 'Licencia anual' && l.estado === 'Aprobada' && l.desde.startsWith(String(year))), 'dias');

  /** Dosis programadas de una sede/turno en una fecha: [{ med, resident, hora, admin|null, estado:'pendiente'|'administrada'|'omitida'|'rechazada'|'atrasada' }] */
  BT.dosesFor = function (dIso, turno, sede) {
    const out = []; const now = Date.now();
    BT.db.meds.filter((m) => m.activo && m.desde <= dIso && (!m.hasta || m.hasta >= dIso)).forEach((m) => {
      const r = BT.resident(m.residentId); if (!r || r.estado !== 'activo' || (sede && sede !== 'ALL' && r.sede !== sede)) return;
      m.horarios.forEach((h) => {
        if (BT.u.shiftOfHour(h) !== turno) return;
        const realDate = turno === 'N' && h < '06:00' ? BT.u.iso(BT.u.addDays(dIso, 1)) : dIso;
        const admin = BT.db.medAdmin.find((a) => a.medId === m.id && a.fecha === realDate && a.hora === h) || null;
        const [hh, mm] = h.split(':').map(Number); const due = BT.u.toDate(realDate); due.setHours(hh, mm, 0, 0);
        let estado = admin ? admin.estado : (now > due.getTime() + 60 * 60000 ? 'atrasada' : 'pendiente');
        out.push({ med: m, resident: r, hora: h, fecha: realDate, admin, estado, due: due.getTime() });
      });
    });
    return out.sort((a, b) => a.hora.localeCompare(b.hora) || (a.resident.habitacion + a.resident.cama).localeCompare(b.resident.habitacion + b.resident.cama, undefined, { numeric: true }));
  };
  /** Días de stock restante de una medicación */
  BT.medDaysLeft = (m) => (m.horarios.length ? Math.floor(m.stock / m.horarios.length) : 99);

  /** Estado de cuenta de un residente: { cargos, pagos, saldo, vencido, mesesAdeudados } (pagos imputados FIFO) */
  BT.account = function (rid) {
    const ch = BT.db.charges.filter((c) => c.residentId === rid && !c.garantia).sort((a, b) => a.mes.localeCompare(b.mes));
    const pg = BT.db.payments.filter((p) => p.residentId === rid && !p.garantia);
    const totalCh = BT.u.sum(ch, 'monto'), totalPg = BT.u.sum(pg, 'monto');
    let paid = totalPg; const byMonth = BT.u.groupBy(ch, 'mes'); const unpaid = [];
    Object.keys(byMonth).sort().forEach((mes) => { const t = BT.u.sum(byMonth[mes], 'monto'); if (paid >= t) paid -= t; else { unpaid.push({ mes, monto: t - paid }); paid = 0; } });
    const dueDay = BT.db.settings.dueDay; const todayIso = BT.u.todayIso();
    const vencidos = unpaid.filter((x) => x.mes + '-' + BT.u.pad(dueDay) < todayIso);
    return { cargos: totalCh, pagos: totalPg, saldo: totalCh - totalPg, vencido: BT.u.sum(vencidos, 'monto'), mesesAdeudados: vencidos.length, unpaid };
  };

  /** Ocupación por sede */
  BT.occupancy = function (sede) {
    const s = BT.db.sedes.find((x) => x.id === sede);
    const occ = BT.db.residents.filter((r) => r.sede === sede && r.estado === 'activo').length;
    return { camas: s.camas, ocupadas: occ, reservadas: s.reservadas.length, libres: s.camas - occ - s.reservadas.length, pct: (occ / s.camas) * 100 };
  };

  /** Meses de la serie financiera (6) */
  BT.finMonths = () => [...new Set(BT.db.finance.map((f) => f.mes))].sort();
  /** Total financiero filtrado. sede: 'BT1'|'BT2'|'ALL' */
  BT.finTotal = function (mes, sede, tipo, categoria) {
    return BT.u.sum(BT.db.finance.filter((f) => (!mes || f.mes === mes) && (sede === 'ALL' || f.sede === sede) && (!tipo || f.tipo === tipo) && (!categoria || f.categoria === categoria)), 'monto');
  };

  /** Días hasta un vencimiento → tono de semáforo */
  BT.dueTone = (dIso, warnDays = 30) => { const n = BT.u.daysUntil(dIso); return n < 0 ? 'danger' : n <= warnDays ? 'warn' : 'ok'; };

  /**
   * Simula el trabajo del resto del equipo desde la última vez que se abrió la demo (mismo día):
   * dosis administradas hasta hace 45 min, cambios posturales al día y marcas de reloj.
   * Así la demo se ve coherente aunque se abra de mañana y se presente de tarde.
   * Se respeta la dosis "sin registrar" intencional del recorrido y todo lo que el usuario cargó.
   */
  BT.simulateStaff = function () {
    const db = BT.db; const u = BT.u; const now = Date.now();
    const from = db.meta.simAt || now; if (now - from < 5 * 60000) return;
    const until = now - 45 * 60000;
    const SH = u.SHIFTS;
    const at = (dIso, hhmm) => { const d = u.toDate(dIso); const [h, m] = hhmm.split(':').map(Number); d.setHours(h, m, 0, 0); return d.getTime(); };
    const whoOn = (opDate, sede, t) => { const day = db.shifts[opDate]; const sid = day && day[sede][t][0]; return db.staff.find((s) => s.id === sid) || db.staff.find((s) => s.sede === sede); };
    const days = []; for (let d = u.toDate(u.iso(from)); d.getTime() <= now; d = u.addDays(d, 1)) days.push(u.iso(d));
    let seq = 0;
    // 1) Medicación
    days.forEach((dIso) => db.meds.forEach((m) => {
      if (!m.activo || m.desde > dIso || (m.hasta && m.hasta < dIso)) return;
      const r = db.residents.find((x) => x.id === m.residentId); if (!r || r.estado !== 'activo') return;
      m.horarios.forEach((h) => {
        const ts = at(dIso, h); if (ts <= from || ts > until) return;
        if (m.residentId === 'r7' && m.droga === 'Metformina' && h === '08:00' && dIso === db.meta.seedDay) return; // intencional
        if (db.medAdmin.some((a) => a.medId === m.id && a.fecha === dIso && a.hora === h)) return;
        const t = u.shiftOfHour(h); const opDate = h < '06:00' ? u.iso(u.addDays(dIso, -1)) : dIso;
        const s = whoOn(opDate, r.sede, t); const usr = db.users.find((x) => x.staffId === (s && s.id));
        db.medAdmin.push({ id: 'ma_sim' + now.toString(36) + (seq++), medId: m.id, residentId: m.residentId, fecha: dIso, hora: h, turno: t, estado: 'administrada', userId: usr ? usr.id : 'st_' + (s && s.id), userName: s ? s.nombre : 'Cuidadora', ts: ts + ((seq * 7) % 20) * 60000, nota: '' });
        m.stock = Math.max(0, m.stock - 1);
      });
    }));
    // 2) Cambios posturales de residentes dependientes (cada ~2 h)
    db.residents.filter((r) => r.estado === 'activo' && r.barthel[r.barthel.length - 1].score <= 40).forEach((r, i) => {
      const list = db.care.filter((c) => c.residentId === r.id && c.tipo === 'Cambio postural');
      const last = list.length ? Math.max(...list.map((c) => c.ts)) : 0;
      if (now - last < 2 * 3600000) return;
      const ts = now - (20 + (i * 13) % 70) * 60000; const s = whoOn(u.shiftDate(new Date(ts)), r.sede, u.currentShift(new Date(ts)));
      db.care.push({ id: 'cr_sim' + now.toString(36) + (seq++), residentId: r.id, ts, tipo: 'Cambio postural', detalle: ['Decúbito lateral derecho', 'Decúbito lateral izquierdo', 'Decúbito supino, talones en descarga'][i % 3], autor: s ? s.nombre : 'Cuidadora' });
    });
    // 3) Marcas de reloj de los turnos que empezaron o terminaron
    [u.iso(u.addDays(u.today(), -1))].concat(days).forEach((dIso) => ['BT1', 'BT2'].forEach((sede) => ['M', 'T', 'N'].forEach((t) => {
      const day = db.shifts[dIso]; if (!day) return;
      const start = at(dIso, SH[t].from); const end = start + 8 * 3600000;
      day[sede][t].forEach((sid, k) => {
        let ck = db.clock.find((c) => c.staffId === sid && c.fecha === dIso && c.turno === t);
        if (!ck && start <= now && start > from - 8 * 3600000) { ck = { id: 'ck_sim' + now.toString(36) + (seq++), staffId: sid, fecha: dIso, turno: t, sede, in: u.fmtTime(start - ((k * 5) % 11) * 60000), out: null, extraMin: 0 }; db.clock.push(ck); }
        if (ck && !ck.out && end <= now) ck.out = u.fmtTime(end + ((k * 3) % 9) * 60000);
      });
    })));
    db.meta.simAt = now;
  };
  // Durante una presentación larga, mantener el resto del equipo "trabajando"
  setInterval(() => { if (BT.db && BT.db.meta && BT.db.meta.seedDay === BT.u.todayIso()) { const before = BT.db.medAdmin.length; BT.simulateStaff(); if (BT.db.medAdmin.length !== before) { BT.save(); if (BT.shell && BT.state.user) BT.shell.updateNav(); } } }, 10 * 60000);
})();

// Flujo del juego: menú → misión 1 (cohete) → misión 2 (Luna) → misión 3 (Marte) → certificado.
import { nuevoEstado, REGLAS, SITIOS, energiaLibre } from "./estado.js";
import { terminarDia, pedirConsejo, proteccionDelDia } from "./turno.js";
import { MISIONES, CARGA, CAPACIDAD_COHETE, aplicarCarga, arrastreAMarte, estrellas } from "./misiones.js";
import { prepararOSDR } from "./textos.js";
import { reporteDelDia, reporteDeMision } from "./retro.js";
import { cargarSprites } from "./sprites.js";
import { crearMundo } from "./mundo.js";
import { fxNoche, fxAlertaCME, fxLlegaCME, fxSEP, fxGST, fxCosecha, fxTexto } from "./fx.js";
import { animarCohete } from "./cohete.js";
import { crearCertificado, descargarCertificado } from "./certificado.js";
import { sonido, alternarSonido } from "./audio.js";
import * as ui from "./ui.js";

const $ = (id) => document.getElementById(id);

async function cargar(ruta, porDefecto) {
  try {
    const r = await fetch(ruta);
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } catch (e) {
    console.warn(`No se pudo cargar ${ruta}`, e);
    return porDefecto;
  }
}

const [donki, osdrCrudo, fuentes, clima, radiacion] = await Promise.all([
  cargar("data/curado/donki.json", []),
  cargar("data/curado/osdr.json", []),
  cargar("data/fuentes.json", []),
  cargar("data/curado/clima_reciente.json", null),
  cargar("data/curado/radiacion.json", null),
  cargarSprites(),
]);
const datos = { donki, osdr: prepararOSDR(osdrCrudo) };
console.log(`Datos cargados: ${donki.length} eventos DONKI, ${datos.osdr.length} estudios OSDR`);

// El clima espacial real del último mes ajusta qué tan seguido hay eventos
const PROB_POR_NIVEL = { tranquilo: 0.2, activo: 0.3, extremo: 0.45 };
if (clima) REGLAS.probabilidadEvento = PROB_POR_NIVEL[clima.nivel] ?? 0.3;

// ---------- estado de la partida ----------
let nombre = "ASTRONAUTA";
let partida = { mods: {}, inicio: {} };
let mision = null, estado = null;
let ocupado = false;            // true mientras corre una animación
let elegidos = [];              // cajas subidas al cohete (misión 1)
let cajas = [];
let resumenLuna = null;

const mundo = crearMundo($("mapa"), {
  bloqueado: () => ui.modalAbierta() || ocupado || !mision || (estado && estado.terminado),
  estado: () => estado,
  alerta: (id) => ui.alertaModulo(id, estado),
  badge: (id) => ui.badgeModulo(id, estado),
  pista: (obj, llevando) => {
    if (mision.id === "tierra") {
      if (llevando) return obj?.id === "cohete" ? "E: SUBIR AL COHETE" : "E: SOLTAR CAJA";
      if (!obj) return null;
      if (obj.id === "cohete") return "E: DESPEGAR";
      return obj.cargada ? "E: BAJAR DEL COHETE" : "E: AGARRAR";
    }
    return obj ? (obj.id === "dormitorio" ? "E: DORMIR" : "E: USAR") : null;
  },
  onAccion: (obj) => (mision.id === "tierra" ? accionTierra(obj) : accionBase(obj)),
});

const pesoActual = () => CARGA.filter((c) => elegidos.includes(c.id)).reduce((s, c) => s + c.peso, 0);

function refrescar() {
  if (mision.id === "tierra") {
    ui.dibujarHUDCarga(pesoActual(), elegidos);
    ui.objetivo(mundo.llevando
      ? `Llevas ${mundo.llevando.nombre}. Camina frente al cohete y presiona E para subirla.`
      : elegidos.length ? `Peso: ${pesoActual()} de ${CAPACIDAD_COHETE}. Carga más cajas o ve al cohete y presiona E para despegar.`
      : "Acércate a una caja y presiona E o ESPACIO para agarrarla.");
  } else {
    ui.dibujarHUD(estado);
    const l = energiaLibre(estado), u = SITIOS[estado.sitio].unidadDia.toLowerCase();
    const llega = estado.pendientes.some((p) => p.tipo === "cme" && p.dia === estado.dia);
    ui.objetivo(llega && proteccionDelDia(estado) < 60 ? "⚠️ ¡La nube solar llega HOY! Lleva energía al REFUGIO."
      : l > 0 ? `Te quedan ${l} de energía. Camina a un módulo y presiona E para usarla.`
      : `¡Energía repartida! Ve al DORMITORIO para terminar el ${u}.`);
  }
}

// ---------- MISIÓN 1: cargar el cohete ----------
function iniciarTierra() {
  mision = MISIONES.tierra; estado = null; elegidos = [];
  cajas = CARGA.map((c) => ({ ...c, tipo: "caja", img: `carga_${c.id}`, tam: 62, radio: 26, solido: true, hx: c.x, hy: c.y, cargada: false }));
  const z = mision.zonaCarga;
  mundo.cargarEscena({
    fondo: mision.fondo, plano: mision.plano, objetos: cajas,
    zonas: [{ id: "cohete", nombre: "Cohete", x: z.x, y: z.y, radio: z.radio, radioUso: z.radio + 16, dibujar: dibujarZonaCarga }],
  });
  ui.limpiarBitacora(); ui.ocultarAviso();
  ui.anotar("🚀 Misión 1: Prepara el cohete");
  refrescar();
  ui.abrirModal("MISIÓN 1: PREPARA EL COHETE", [
    ...mision.intro,
    ui.bloque("ciencia-b", "¿SABÍAS QUE...?", ["En un cohete real cada kilo cuenta: mientras más pesa la carga, más combustible se necesita para despegar."]),
  ], [{ texto: "¡A CARGAR!", principal: true }], { cerrable: false });
}

function dibujarZonaCarga(ctx, t, z) {
  const a = 0.45 + 0.3 * Math.sin(t * 4);
  ctx.strokeStyle = `rgba(255,226,122,${a})`; ctx.lineWidth = 4; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 30;
  ctx.strokeRect(z.x - 84, z.y - 30, 168, 60);
  ctx.setLineDash([]);
  ctx.fillStyle = `rgba(255,226,122,${a * 0.18})`; ctx.fillRect(z.x - 84, z.y - 30, 168, 60);
  ctx.font = '12px "Press Start 2P", monospace'; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = `rgba(255,226,122,${0.6 + a * 0.4})`; ctx.fillText("ZONA DE CARGA", z.x, z.y);
}

function acomodarCargadas() {
  const lugares = mision.lugaresCargados;
  cajas.filter((c) => c.cargada).sort((a, b) => elegidos.indexOf(a.id) - elegidos.indexOf(b.id))
    .forEach((c, i) => { [c.x, c.y] = lugares[i % lugares.length]; });
}

function accionTierra(obj) {
  const llevando = mundo.llevando;
  if (llevando) {
    if (obj?.id === "cohete") {
      const libre = CAPACIDAD_COHETE - pesoActual();
      if (llevando.peso > libre) {
        sonido.error();
        ui.aviso("¡NO CABE!", `${llevando.nombre} pesa ${llevando.peso} y solo quedan ${libre} de espacio. Baja otra caja del cohete primero. En los cohetes reales también hay un límite de peso.`, { mal: true, segundos: 8 });
        ui.anotar(`⚠️ ${llevando.nombre} no cupo: pesa ${llevando.peso} y quedaban ${libre}.`, "mal-msg");
        return;
      }
      elegidos.push(llevando.id);
      llevando.cargada = true; llevando.solido = false;
      mundo.llevando = null;
      acomodarCargadas();
      sonido.soltar(); sonido.ok();
      fxTexto(mundo, llevando.x, llevando.y - 30, `+${llevando.peso} PESO`);
      ui.aviso(`¡${llevando.nombre.toUpperCase()} A BORDO!`, `${llevando.efecto}. ${llevando.dato}`, { segundos: 8 });
      ui.anotar(`✅ Subiste ${llevando.nombre}: ${llevando.efecto}.`, "bien-msg");
    } else {
      // soltar: la caja vuelve a su lugar
      llevando.x = llevando.hx; llevando.y = llevando.hy; llevando.solido = true;
      mundo.llevando = null;
      sonido.soltar();
      ui.aviso("CAJA DEVUELTA", `Dejaste ${llevando.nombre} en su lugar. Si la quieres llevar, agárrala y suéltala en la zona de carga, frente al cohete.`, { segundos: 5 });
    }
    refrescar();
    return;
  }
  if (!obj) return;
  if (obj.id === "cohete") { panelDespegue(); return; }
  if (obj.cargada) {
    elegidos = elegidos.filter((id) => id !== obj.id);
    obj.cargada = false;
    acomodarCargadas();
    ui.anotar(`↩️ Bajaste ${obj.nombre} del cohete.`);
  }
  mundo.llevando = obj;
  sonido.agarrar();
  ui.aviso(`${obj.nombre.toUpperCase()} · PESO ${obj.peso}`, `${obj.efecto}. Llévala a la zona de carga, frente al cohete, y presiona E.`, { segundos: 6 });
  refrescar();
}

function panelDespegue() {
  const peso = pesoActual(), libre = CAPACIDAD_COHETE - peso;
  const lista = ui.el("div", "lista-carga");
  for (const c of CARGA.filter((c) => elegidos.includes(c.id))) {
    const d = ui.el("div"), img = new Image();
    img.src = `img/carga_${c.id}.png`; img.alt = "";
    const t = ui.el("span", null, `${c.nombre} (${c.peso})`);
    t.append(ui.el("small", null, c.efecto));
    d.append(img, t); lista.append(d);
  }
  const cabe = CARGA.filter((c) => !elegidos.includes(c.id) && c.peso <= libre);
  const partes = [ui.parrafo(`Peso: ${peso} de ${CAPACIDAD_COHETE}`, "valor")];
  if (!elegidos.length) partes.push(ui.parrafo("⚠️ ¡El cohete está vacío! Sin carga, tu base empezará sin ninguna ayuda. Trae algunas cajas primero.", "aviso"));
  else partes.push(lista);
  if (cabe.length) partes.push(ui.bloque("mejorar-b", "TODAVÍA HAY ESPACIO", [`Te quedan ${libre} de peso libre: aún cabe ${cabe.map((c) => c.nombre).join(" o ")}. ¡No desperdicies espacio en el cohete!`]));
  else if (elegidos.length) partes.push(ui.bloque("bien-b", "¡COHETE BIEN CARGADO!", ["Aprovechaste muy bien el espacio. Los ingenieros de misión hacen lo mismo: eligen con cuidado qué llevar porque no cabe todo."]));
  ui.abrirModal("LISTO PARA DESPEGAR", partes, [
    { texto: "SEGUIR CARGANDO" },
    { texto: "¡DESPEGAR!", principal: true, accion: async () => {
      partida = aplicarCarga(elegidos);
      await viajar("tierra", "luna");
      iniciarBase("luna");
    } },
  ]);
}

async function viajar(origen, destino) {
  ocupado = true;
  ui.ocultarAviso();
  await animarCohete(origen, destino);
  ocupado = false;
}

// ---------- MISIONES 2 y 3: la base ----------
function iniciarBase(id, extra = []) {
  mision = MISIONES[id];
  estado = nuevoEstado(mision, partida.mods, partida.inicio);
  mundo.cargarEscena({
    fondo: mision.fondo, plano: mision.plano,
    objetos: mision.modulos.map((m) => ({ ...m, tipo: "modulo", img: m.id, radio: m.tam * 0.43, solido: true })),
  });
  ui.limpiarBitacora(); ui.ocultarAviso();
  ui.anotar(`🚀 ${mision.nombre}`);
  refrescar();
  const mejoras = [];
  const m = estado.mods;
  if (m.proteccionBase) mejoras.push(`🛡️ Placa de blindaje: +${m.proteccionBase}% de protección siempre.`);
  if (m.comidaPorPuntoExtra) mejoras.push("🌱 Semillas extra: el invernadero rinde más.");
  if (m.bateriaMaxExtra) mejoras.push(`🔋 Batería extra: guarda hasta ${REGLAS.bateriaMax + m.bateriaMaxExtra}.`);
  if (m.cienciaPorPuntoExtra) mejoras.push(`🔬 Instrumentos: +${m.cienciaPorPuntoExtra} de ciencia por punto.`);
  ui.abrirModal(mision.nombre.toUpperCase(), [
    ...mision.intro,
    mejoras.length || extra.length ? ui.bloque("bien-b", "LO QUE TRAES CONTIGO", [...extra, ...mejoras]) : null,
    ui.bloque("ciencia-b", "TU META", [`Sobrevive ${mision.dias} ${id === "marte" ? "soles" : "días"} y junta ${mision.metaCiencia} de ciencia. Cuida las 3 barras: 🫁 aire, 🥕 comida y ❤️ salud.`]),
  ], [{ texto: "¡A TRABAJAR!", principal: true }], { cerrable: false });
}

function accionBase(obj) {
  if (!obj || estado.terminado) return;
  ui.abrirModulo(obj.id, estado, {
    refrescar,
    pedirConsejo: () => {
      const r = pedirConsejo(estado);
      r.ok ? sonido.ok() : sonido.error();
      ui.anotar(r.texto, r.ok ? "bien-msg" : "mal-msg");
      ui.aviso("CONTROL DE MISIÓN", r.texto, { mal: !r.ok, segundos: 9 });
      refrescar();
    },
    dormir,
  });
}

const moduloPorId = (id) => mision.modulos.find((m) => m.id === id);

async function dormir() {
  ocupado = true;
  ui.ocultarAviso();
  const u = SITIOS[estado.sitio].unidadDia.toUpperCase();
  const proteccion = proteccionDelDia(estado);
  const res = terminarDia(estado, mision, datos);
  await fxNoche(mundo, u);
  // animación de cada cosa que pasó, en orden
  for (const g of res.golpes) {
    if (g.ev.tipo === "CME") await fxLlegaCME(mundo, proteccion);
    else await fxSEP(mundo, proteccion);
  }
  for (const ev of res.nuevos) {
    if (ev.tipo === "CME") await fxAlertaCME(mundo, ev);
    else if (ev.tipo === "GST") await fxGST(mundo, moduloPorId("antena"));
  }
  if (res.cosecha) await fxCosecha(mundo, moduloPorId("invernadero"), res.cosecha);
  ocupado = false;
  refrescar();
  mostrarReporte(res);
}

function elegirTarjeta(res) {
  let situacion = "fin_de_dia";
  if (res.golpes.length) situacion = "evento_radiacion";
  else if (res.estadoFinal.salud < 60) situacion = "salud_baja";
  else if (res.siembra || res.cosecha) situacion = "invernadero";
  const opciones = datos.osdr.filter((e) => e.aparece_cuando === situacion);
  const lista = opciones.length ? opciones : datos.osdr;
  return lista.length ? lista[Math.floor(Math.random() * lista.length)] : null;
}

function mostrarReporte(res) {
  const rep = reporteDelDia(res, estado, radiacion);
  const u = SITIOS[estado.sitio].unidadDia.toUpperCase();
  const partes = [];
  rep.eventos.forEach((e, i) => {
    const ev = res.nuevos[i];
    const lineas = [e.texto, e.cuando];
    if (ev.url) lineas.push(ui.parrafo("").appendChild(ui.enlace(ev.url, "Ver el registro real en NASA DONKI")).parentNode);
    partes.push(ui.bloque("evento-b", e.titulo, lineas));
    ui.anotar(`${e.titulo} ${e.texto}`, "alerta-msg");
  });
  if (rep.noticias.length) partes.push(ui.bloque("ciencia-b", "NOTICIAS DE LA BASE", rep.noticias));
  if (rep.bien.length) partes.push(ui.bloque("bien-b", "✔ LO QUE HICISTE BIEN", rep.bien));
  if (rep.mejorar.length) partes.push(ui.bloque("mejorar-b", "➜ PARA MEJORAR", rep.mejorar));
  const tarjeta = elegirTarjeta(res);
  if (tarjeta) {
    const p = ui.parrafo("");
    p.append(ui.enlace(tarjeta.url, `Estudio ${tarjeta.id} en NASA OSDR`));
    partes.push(ui.bloque("ciencia-b", "🧪 CIENCIA REAL DE LA NASA", [tarjeta.texto, p]));
  }
  rep.bien.forEach((t) => ui.anotar("✔ " + t.split(". ")[0] + ".", "bien-msg"));
  rep.mejorar.forEach((t) => ui.anotar("➜ " + t.split(". ")[0] + ".", "mal-msg"));
  rep.noticias.forEach((t) => ui.anotar(t));
  if (rep.mejorar.length && !rep.bien.length) sonido.error(); else if (rep.bien.length) sonido.ok();
  ui.abrirModal(`REPORTE DEL ${u} ${res.dia}`, partes, [
    { texto: estado.terminado ? "VER RESULTADO" : `EMPEZAR EL ${u} ${estado.dia}`, principal: true, accion: () => (estado.terminado ? finDeMision() : refrescar()) },
  ], { cerrable: false, silencio: true });
}

function estrellasTexto(n) { return "⭐".repeat(n) + "☆".repeat(3 - n); }

function finDeMision() {
  const r = estado.resultado, n = estrellas(estado);
  const lineas = reporteDeMision(estado);
  const tuDesempeno = ui.bloque(r === "derrota" ? "mejorar-b" : "bien-b", "TU DESEMPEÑO", lineas);
  if (r === "derrota") {
    sonido.derrota();
    ui.abrirModal(mision.id === "luna" ? "LA BASE LUNAR NO RESISTIÓ" : "LA BASE DE MARTE NO RESISTIÓ", [
      ui.bloque("evento-b", "¿QUÉ PASÓ?", [estado.causa]),
      tuDesempeno,
      "¡Los astronautas de verdad también practican muchas veces en simuladores! Inténtalo con otra estrategia.",
    ], [
      mision.id === "luna" ? { texto: "CAMBIAR LA CARGA", accion: iniciarTierra } : { texto: "VER MI CERTIFICADO", accion: () => mostrarCertificado() },
      { texto: "REINTENTAR", principal: true, accion: () => iniciarBase(mision.id) },
    ], { cerrable: false, silencio: true });
    return;
  }
  sonido.victoria();
  if (mision.id === "luna") {
    resumenLuna = { ciencia: estado.ciencia, danoEvitado: estado.historial.danoEvitado };
    const arrastre = arrastreAMarte(estado, partida.mods);
    ui.abrirModal(r === "victoria" ? "¡MISIÓN LUNAR CUMPLIDA!" : "¡SOBREVIVISTE EN LA LUNA!", [
      ui.parrafo(estrellasTexto(n), "estrellas"),
      estado.causa,
      tuDesempeno,
      ui.bloque("ciencia-b", "LO QUE VIAJA CONTIGO A MARTE", arrastre.mensajes),
    ], [
      { texto: "REPETIR LA LUNA", accion: () => iniciarBase("luna") },
      { texto: "¡VIAJAR A MARTE!", principal: true, accion: async () => {
        partida = { mods: arrastre.mods, inicio: arrastre.inicio };
        await viajar("luna", "marte");
        iniciarBase("marte", arrastre.mensajes);
      } },
    ], { cerrable: false, silencio: true });
    return;
  }
  ui.abrirModal(r === "victoria" ? "¡BASE EN MARTE FUNDADA!" : "¡SOBREVIVISTE EN MARTE!", [
    ui.parrafo(estrellasTexto(n), "estrellas"),
    r === "victoria" ? "🏠 ¡Fundaste la primera base permanente en Marte! Tu tripulación sobrevivió y cumplió su misión científica."
      : "🚀 La base resiste, pero necesita apoyo de la Tierra. Con más ciencia podrá ser permanente.",
    tuDesempeno,
  ], [
    { texto: "REPETIR MARTE", accion: () => iniciarBase("marte") },
    { texto: "VER MI CERTIFICADO", principal: true, accion: () => mostrarCertificado() },
  ], { cerrable: false, silencio: true });
}

function mostrarCertificado() {
  const canvas = crearCertificado({
    nombre, estrellas: estrellas(estado),
    cienciaLuna: resumenLuna?.ciencia ?? 0, cienciaMarte: estado.ciencia,
    diasMarte: estado.dia, danoEvitado: (resumenLuna?.danoEvitado ?? 0) + estado.historial.danoEvitado,
  });
  const img = new Image();
  img.className = "certificado"; img.alt = `Certificado de ${nombre}`;
  img.src = canvas.toDataURL("image/png");
  sonido.victoria();
  ui.abrirModal("CERTIFICADO DE ASTRONAUTA", [img], [
    { texto: "DESCARGAR", mantener: true, accion: () => { sonido.click(); descargarCertificado(canvas, nombre); } },
    { texto: "JUGAR DE NUEVO", principal: true, accion: iniciarTierra },
  ], { cerrable: false, silencio: true });
}

// ---------- menú de inicio ----------
function pedirNombre() {
  const input = ui.el("input", "nombre");
  input.maxLength = 18; input.placeholder = "TU NOMBRE"; input.autocomplete = "off";
  const partes = [
    "¡Hola! Vas a dirigir una misión de la Tierra a la Luna y luego a Marte. Tu tripulación cuenta contigo.",
    "¿Cómo te llamas, astronauta? (Tu nombre saldrá en tu certificado.)",
    input,
  ];
  if (clima) partes.push(ui.bloque("ciencia-b", "EL SOL DE VERDAD, ESTE MES", [
    `Del ${clima.desde} al ${clima.hasta}, la NASA registró ${clima.cme} nubes solares, ${clima.sep} lluvias de partículas y ${clima.gst} ${clima.gst === 1 ? "tormenta magnética" : "tormentas magnéticas"}. El Sol está ${clima.nivel}: eso cambia qué tan seguido habrá eventos en tu misión.`]));
  ui.abrirModal("NUEVA MISIÓN", partes, [
    { texto: "VOLVER", accion: () => {} },
    { texto: "¡COMENZAR!", principal: true, accion: () => {
      nombre = (input.value.trim() || "Astronauta").toUpperCase();
      $("menu").hidden = true; $("juego").hidden = false;
      iniciarTierra();
    } },
  ]);
}

function pintarSonido(on) {
  $("m-sonido").textContent = `SONIDO: ${on ? "SÍ" : "NO"}`;
  $("btn-sonido").textContent = on ? "🔊" : "🔇";
}
document.querySelectorAll("button").forEach((b) => b.addEventListener("mouseenter", () => sonido.hover()));
$("m-jugar").onclick = () => { sonido.click(); pedirNombre(); };
$("m-sonido").onclick = () => { pintarSonido(alternarSonido()); sonido.click(); };
$("btn-sonido").onclick = () => { pintarSonido(alternarSonido()); sonido.click(); };
$("m-datos").onclick = () => { sonido.click(); ui.mostrarDatosUsados(fuentes, clima); };
$("btn-datos").onclick = () => { if (!ui.modalAbierta() && !ocupado) ui.mostrarDatosUsados(fuentes, clima); };
$("m-creditos").onclick = () => {
  sonido.click();
  ui.abrirModal("CRÉDITOS", [
    "Misión Ares: Supervivencia fue creado por el equipo ARES4 para el NASA Space Apps Challenge 2026, reto \"Junior Astronaut Mission Trainer\".",
    "Datos: NASA DONKI (clima espacial), NASA OSDR (biología espacial) y RadLab (radiación en la Estación Espacial).",
    "Arte, diseño y programación: equipo ARES4",
    "Este juego no es un producto oficial de la NASA.",
  ]);
};

// Para depurar desde la consola del navegador: __juego.estado
window.__juego = { get estado() { return estado; }, get mision() { return mision; }, mundo, iniciarBase, iniciarTierra, mostrarCertificado, finDeMision, dormir };

mundo.iniciar();
$("m-jugar").focus();

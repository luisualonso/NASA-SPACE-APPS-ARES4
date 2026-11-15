// Interfaz fuera del mapa: estadísticas, bitácora, avisos y ventanas.
import { SITIOS, REGLAS, energiaDisponible, energiaLibre, bateriaMax } from "./estado.js";
import { proteccionDelDia } from "./turno.js";
import { DATOS_MODULO } from "./textos.js";
import { CAPACIDAD_COHETE, CARGA } from "./misiones.js";
import { sonido } from "./audio.js";

const $ = (id) => document.getElementById(id);
export const el = (tag, clase, texto) => {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (texto != null) e.textContent = texto;
  return e;
};
export const parrafo = (texto, clase) => el("p", clase, texto);
export function enlace(url, texto) {
  const a = el("a", null, texto);
  a.href = url; a.target = "_blank"; a.rel = "noopener";
  return a;
}
export function bloque(clase, titulo, lineas) {
  const b = el("div", `bloque ${clase}`);
  b.append(el("h3", null, titulo));
  for (const l of lineas) b.append(typeof l === "string" ? parrafo(l) : l);
  return b;
}

// ---------- estadísticas ----------
function barra(icono, nombre, valor) {
  const f = el("div", "recurso");
  f.append(el("span", null, `${icono} ${nombre}`));
  const b = el("div", "barra"), r = el("div", "relleno " + (valor > 60 ? "bien" : valor > 30 ? "medio" : "mal"));
  r.style.width = `${Math.max(0, Math.min(100, valor))}%`;
  b.append(r); f.append(b, el("b", null, String(valor)));
  return f;
}
function fila(...partes) {
  const f = el("div", "fila");
  for (const [texto, destaca] of partes) f.append(el("span", destaca ? "destaca" : null, texto));
  return f;
}

export function dibujarHUD(estado) {
  const sitio = SITIOS[estado.sitio];
  $("sitio").textContent = sitio.nombre;
  $("dia").textContent = `${sitio.unidadDia} ${estado.dia} de ${estado.diasMision}`;
  const hud = $("hud");
  hud.replaceChildren(
    barra("🫁", "Aire", estado.soporte),
    barra("🥕", "Comida", estado.comida),
    barra("❤️", "Salud", estado.salud),
    fila([`⚡ Energía: ${energiaLibre(estado)}/${energiaDisponible(estado)}`, true], [`🔋 ${estado.bateria}/${bateriaMax(estado)}`], [`🛡️ ${proteccionDelDia(estado)}%`]),
    fila([`🔬 Ciencia: ${estado.ciencia}/${estado.metaCiencia}`], [estado.antenaBloqueadaDias > 0 ? "📵 Falla" : "📡 OK"]),
  );
}

export function dibujarHUDCarga(peso, elegidos) {
  $("sitio").textContent = SITIOS.tierra.nombre;
  $("dia").textContent = "";
  const hud = $("hud");
  const f = el("div", "recurso");
  f.append(el("span", null, "🚀 Peso"));
  const b = el("div", "barra"), r = el("div", "relleno " + (peso >= CAPACIDAD_COHETE ? "medio" : "bien"));
  r.style.width = `${(peso / CAPACIDAD_COHETE) * 100}%`;
  b.append(r); f.append(b, el("b", null, `${peso}`));
  const lineas = [fila([`Capacidad: ${CAPACIDAD_COHETE}`, true], [`Libre: ${CAPACIDAD_COHETE - peso}`])];
  const nombres = CARGA.filter((c) => elegidos.includes(c.id)).map((c) => c.nombre);
  lineas.push(el("div", "fila envuelve", nombres.length ? "A bordo: " + nombres.join(", ") : "El cohete está vacío. ¡Trae cajas!"));
  hud.replaceChildren(f, ...lineas);
}

export function objetivo(texto) { $("objetivo").textContent = texto; }

// ---------- bitácora y avisos ----------
export function limpiarBitacora() { $("mensajes").replaceChildren(); }
export function anotar(texto, clase) { $("mensajes").prepend(parrafo(texto, clase)); }

let relojToast = null;
export function aviso(titulo, texto, { mal = false, segundos = 6 } = {}) {
  const t = $("toast");
  t.className = "toast" + (mal ? " mal" : "");
  $("toast-titulo").textContent = titulo;
  $("toast-texto").textContent = texto;
  t.hidden = false;
  // reinicia la animación
  t.style.animation = "none"; void t.offsetWidth; t.style.animation = "";
  clearTimeout(relojToast);
  relojToast = setTimeout(() => { t.hidden = true; }, segundos * 1000);
}
export function ocultarAviso() { clearTimeout(relojToast); $("toast").hidden = true; }

// ---------- ventana genérica con el marco "panel" ----------
let abierta = false, cerrable = true, abiertaEn = 0, botonesActuales = [], alCerrar = null;
export const modalAbierta = () => abierta;

// botones: [{ texto, accion, principal, mantener, deshabilitado, teclas: ["a", "arrowleft"] }]
export function abrirModal(titulo, partes, botones = [{ texto: "CERRAR", principal: true }], opciones = {}) {
  abierta = true; abiertaEn = performance.now();
  cerrable = opciones.cerrable ?? true;
  alCerrar = opciones.alCerrar || null;
  botonesActuales = botones;
  $("modal-titulo").textContent = titulo;
  const cuerpo = $("modal-cuerpo");
  cuerpo.replaceChildren(...partes.filter(Boolean).map((p) => (typeof p === "string" ? parrafo(p) : p)));
  cuerpo.scrollTop = 0;
  const zona = $("modal-botones");
  zona.replaceChildren();
  for (const b of botones) {
    const btn = el("button", b.principal ? "principal" : null, b.texto);
    btn.disabled = !!b.deshabilitado;
    btn.onmouseenter = () => sonido.hover();
    btn.onclick = () => pulsar(b);
    b.nodo = btn;
    zona.append(btn);
  }
  $("modal").hidden = false;
  if (!opciones.silencio) sonido.abrir();
  const foco = cuerpo.querySelector("input");
  if (foco) setTimeout(() => foco.focus(), 30);
}

function pulsar(b) {
  if (b.nodo?.disabled) return;
  if (b.mantener) { b.accion?.(); return; }
  sonido.click();
  cerrarModal(true);
  b.accion?.();
}

export function cerrarModal(silencio) {
  if (!abierta) return;
  abierta = false;
  $("modal").hidden = true;
  if (!silencio) sonido.cerrar();
  const f = alCerrar; alCerrar = null;
  if (!silencio) f?.();
}

window.addEventListener("keydown", (e) => {
  if (!abierta || e.repeat && !["a", "d", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) return;
  if (performance.now() - abiertaEn < 250) { e.preventDefault(); return; }   // evita que la misma tecla que abrió la ventana la accione
  const k = e.key.toLowerCase();
  const enInput = e.target.tagName === "INPUT";
  if (k === "escape") { if (cerrable) cerrarModal(); e.preventDefault(); return; }
  const porTecla = botonesActuales.find((b) => b.teclas?.includes(k));
  if (porTecla && !enInput) { pulsar(porTecla); e.preventDefault(); return; }
  if (k === "enter" || ((k === "e" || k === " ") && !enInput)) {
    const p = botonesActuales.find((b) => b.principal && !b.nodo?.disabled) || (botonesActuales.length === 1 ? botonesActuales[0] : null);
    if (p) { pulsar(p); e.preventDefault(); }
  }
});

// ---------- paneles de los módulos ----------
const DESTINOS = {
  soporte: { destino: "soporte", titulo: "SOPORTE VITAL",
    texto: "Aquí se produce el aire y el agua que tu tripulación usa todos los días.",
    efecto: (e) => `Hoy producirás ${e.reparto.soporte * REGLAS.soportePorPunto} de aire y agua. La tripulación usa ${REGLAS.consumoSoporte} al día.` },
  invernadero: { destino: "invernadero", titulo: "INVERNADERO",
    texto: "Las plantas dan comida, pero tardan 2 días en crecer. ¡Siembra antes de que falte!",
    efecto: (e) => `Cosecharás +${e.reparto.invernadero * (REGLAS.comidaPorPunto + e.mods.comidaPorPuntoExtra)} de comida en 2 días. La tripulación come ${REGLAS.consumoComida} al día.` },
  refugio: { destino: "blindaje", titulo: "REFUGIO",
    texto: "El blindaje protege de la radiación del Sol. Cada punto de energía detiene 20% del daño.",
    efecto: (e) => `Protección de hoy: ${proteccionDelDia(e)}%${e.mods.proteccionBase ? ` (incluye ${e.mods.proteccionBase}% de la placa del cohete)` : ""}.` },
  laboratorio: { destino: "investigacion", titulo: "LABORATORIO",
    texto: "¡La ciencia es tu misión! Cada punto de energía aquí suma descubrimientos.",
    efecto: (e) => `Hoy ganarás +${e.reparto.investigacion * (REGLAS.cienciaPorPunto + e.mods.cienciaPorPuntoExtra)} de ciencia. Llevas ${e.ciencia} de ${e.metaCiencia}.` },
};

export function abrirModulo(id, estado, acciones) {
  // acciones: { refrescar(), pedirConsejo(), dormir() }
  const dato = bloque("ciencia-b", "¿SABÍAS QUE...?", [DATOS_MODULO[id]]);
  const u = SITIOS[estado.sitio].unidadDia.toLowerCase();

  if (DESTINOS[id]) {
    const conf = DESTINOS[id];
    const pips = parrafo("", "energia-pips"), efecto = parrafo("", "efecto"), libre = parrafo("", "libre");
    const pintar = () => {
      const n = estado.reparto[conf.destino], l = energiaLibre(estado);
      pips.textContent = "⚡".repeat(n) + "▫".repeat(Math.max(0, Math.min(10 - n, l)));
      efecto.textContent = conf.efecto(estado);
      libre.textContent = `Energía asignada aquí: ${n}  ·  Energía libre: ${l}`;
      acciones.refrescar();
    };
    const cambiar = (d) => {
      const actual = estado.reparto[conf.destino];
      if ((d > 0 && energiaLibre(estado) <= 0) || (d < 0 && actual <= 0)) { sonido.error(); return; }
      estado.reparto[conf.destino] = actual + d;
      d > 0 ? sonido.mas() : sonido.menos();
      pintar();
    };
    const extra = id === "refugio" && estado.pendientes.some((p) => p.tipo === "cme")
      ? parrafo(`⚠️ Hay una nube solar en camino: llega el ${u} ${Math.min(...estado.pendientes.filter((p) => p.tipo === "cme").map((p) => p.dia))}.`, "aviso") : null;
    abrirModal(conf.titulo, [conf.texto, pips, libre, efecto, extra, dato], [
      { texto: "◀ A  QUITAR", accion: () => cambiar(-1), mantener: true, teclas: ["a", "arrowleft"] },
      { texto: "D  AGREGAR ▶", accion: () => cambiar(+1), mantener: true, teclas: ["d", "arrowright"] },
      { texto: "LISTO", principal: true },
    ]);
    pintar();
    return;
  }

  if (id === "solar") {
    const sitio = SITIOS[estado.sitio];
    abrirModal("PLANTA SOLAR", [
      `Los paneles producen ${sitio.energiaDia} puntos de energía cada ${u}. ${estado.sitio === "marte" ? "Marte está más lejos del Sol y el polvo cubre los paneles: hay menos energía que en la Luna." : ""}`,
      `🔋 Batería: ${estado.bateria} de ${bateriaMax(estado)}. Lo que no uses hoy se guarda; si la batería se llena, lo que sobra se pierde.`,
      parrafo(`⚡ Energía libre ahora: ${energiaLibre(estado)}`, "valor"),
      dato,
    ]);
    return;
  }

  if (id === "antena") {
    const bloqueada = estado.antenaBloqueadaDias > 0;
    abrirModal("ANTENA", [
      bloqueada ? parrafo("📵 Una tormenta magnética dejó la antena sin señal. ¡Hoy decides tú, como un astronauta de verdad!", "aviso")
        : "Desde aquí puedes pedir consejo a Control de Misión, en la Tierra.",
      SITIOS[estado.sitio].textoRetraso,
      dato,
    ], [
      { texto: "PEDIR CONSEJO", principal: true, deshabilitado: bloqueada, accion: acciones.pedirConsejo },
      { texto: "CERRAR" },
    ]);
    return;
  }

  if (id === "dormitorio") {
    const r = estado.reparto, libre = energiaLibre(estado), tope = bateriaMax(estado);
    const partes = [`Tu reparto de hoy:  🫁 ${r.soporte}   🌱 ${r.invernadero}   🛡️ ${r.blindaje}   🔬 ${r.investigacion}`];
    if (r.soporte * REGLAS.soportePorPunto < REGLAS.consumoSoporte) partes.push(parrafo(`⚠️ El soporte vital producirá ${r.soporte * REGLAS.soportePorPunto} y se gastan ${REGLAS.consumoSoporte}: el aire bajará.`, "aviso"));
    if (estado.pendientes.some((p) => p.tipo === "cme" && p.dia === estado.dia) && proteccionDelDia(estado) < 60) partes.push(parrafo(`⚠️ ¡La nube solar llega hoy y tu protección es de ${proteccionDelDia(estado)}%! Refuerza el refugio.`, "aviso"));
    if (libre > tope) partes.push(parrafo(`⚠️ Te sobran ${libre} de energía y la batería solo guarda ${tope}: se perderán ${libre - tope}.`, "aviso"));
    else if (libre > 0) partes.push(parrafo(`🔋 Se guardarán ${libre} de energía en la batería.`, "efecto"));
    partes.push(dato);
    abrirModal("DORMITORIO", partes, [
      { texto: "SEGUIR TRABAJANDO" },
      { texto: `DORMIR: TERMINAR EL ${u.toUpperCase()}`, principal: true, accion: acciones.dormir },
    ]);
  }
}

// alertas y energía asignada que se dibujan sobre cada módulo en el mapa
export function alertaModulo(id, e) {
  if (!e || e.terminado) return false;
  if (id === "soporte") return e.soporte <= 30;
  if (id === "invernadero") return e.comida <= 30;
  if (id === "refugio") return e.salud <= 30 || (e.pendientes.some((p) => p.tipo === "cme" && p.dia === e.dia) && proteccionDelDia(e) < 60);
  return false;
}
export function badgeModulo(id, e) {
  if (!e) return "";
  const mapa = { soporte: "soporte", invernadero: "invernadero", refugio: "blindaje", laboratorio: "investigacion" };
  const n = mapa[id] ? e.reparto[mapa[id]] : 0;
  return n ? `+${n}` : "";
}

export function mostrarDatosUsados(fuentes, clima, alCerrar) {
  const lista = el("ul", "fuentes");
  for (const f of fuentes) {
    const li = el("li");
    li.append(enlace(f.url, f.fuente));
    if (f.consultado && f.consultado !== "manual") li.append(` (consultado: ${f.consultado.slice(0, 10)})`);
    lista.append(li);
  }
  abrirModal("DATOS REALES DE LA NASA", [
    bloque("ciencia-b", "QUÉ ES REAL", [
      "Las fechas, velocidades y tipos de los eventos solares vienen de NASA DONKI. El aviso de cada nube solar se calcula con su velocidad real: distancia del Sol entre velocidad.",
      "La semana final de la misión lunar repite la gran tormenta solar de mayo de 2024, en su orden real.",
      "Las tarjetas de ciencia vienen de estudios de NASA OSDR, y la radiación de la Estación Espacial, de RadLab.",
      clima ? `Clima espacial del ${clima.desde} al ${clima.hasta}: ${clima.cme} nubes solares, ${clima.sep} lluvias de partículas y ${clima.gst} tormentas magnéticas. Con eso se ajusta qué tan seguido hay eventos.` : null,
    ].filter(Boolean)),
    bloque("mejorar-b", "QUÉ ESTÁ AJUSTADO PARA JUGAR", [
      "Los puntos de energía, el daño a la salud y la duración de los días son números del juego.",
      "En Marte usamos eventos solares reales medidos desde la Tierra como ejemplo de lo que podría llegar allá.",
    ]),
    fuentes.length ? bloque("bien-b", "FUENTES", [lista]) : null,
  ], [{ texto: "CERRAR", principal: true, accion: alCerrar }], { cerrable: !alCerrar });
}

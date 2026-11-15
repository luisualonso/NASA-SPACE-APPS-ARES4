// Todo lo que se dibuja en pantalla. La lógica vive en turno.js.
import { SITIOS, REGLAS, energiaDisponible } from "./estado.js";

const $ = (id) => document.getElementById(id);
const DESTINOS = ["soporte", "invernadero", "blindaje", "investigacion"];

export function leerReparto() {
  const r = {};
  for (const d of DESTINOS) r[d] = Number($(`r-${d}`).value);
  return r;
}

// Los 4 deslizadores nunca pueden sumar más que la energía disponible
export function prepararDeslizadores(estado, alCambiar) {
  for (const d of DESTINOS) {
    $(`r-${d}`).oninput = () => {
      const total = energiaDisponible(estado);
      const r = leerReparto();
      const suma = DESTINOS.reduce((s, k) => s + r[k], 0);
      if (suma > total) $(`r-${d}`).value = r[d] - (suma - total);
      alCambiar();
    };
  }
}

export function reiniciarDeslizadores() {
  for (const d of DESTINOS) $(`r-${d}`).value = 0;
}

export function dibujar(estado) {
  barra("soporte", estado.soporte);
  barra("comida", estado.comida);
  barra("salud", estado.salud);
  $("dia").textContent = `Día ${estado.dia} de ${REGLAS.diasMision}`;
  $("sitio").textContent = SITIOS[estado.sitio].nombre;
  $("ciencia").textContent = `🔬 Ciencia: ${estado.ciencia} / ${SITIOS[estado.sitio].metaCiencia}`;
  $("bateria").textContent = `🔋 Batería: ${estado.bateria}`;
  $("antena").textContent = estado.antenaBloqueadaDias > 0 ? "📵 Antena bloqueada" : "📡 Antena lista";

  const r = leerReparto();
  for (const d of DESTINOS) $(`v-${d}`).textContent = r[d];
  const usados = DESTINOS.reduce((s, k) => s + r[k], 0);
  $("energia").textContent = `⚡ Energía de hoy: ${energiaDisponible(estado) - usados} libres de ${energiaDisponible(estado)}`;

  const avisos = estado.pendientes.filter((p) => p.tipo === "cme");
  $("alerta").textContent = avisos.length
    ? `⚠️ Nube solar en camino: llega el día ${avisos[0].dia}`
    : "";
}

function barra(nombre, valor) {
  const el = $(`b-${nombre}`);
  el.style.width = `${valor}%`;
  el.className = "relleno " + (valor > 60 ? "bien" : valor > 30 ? "medio" : "mal");
  $(`n-${nombre}`).textContent = valor;
}

export function agregarMensajes(lista) {
  const log = $("mensajes");
  for (const m of lista) {
    const p = document.createElement("p");
    p.textContent = m;
    log.prepend(p);
  }
}

export function mostrarEvento(evento) {
  const caja = $("evento");
  if (!evento) { caja.hidden = true; return; }
  caja.hidden = false;
  caja.innerHTML = "";
  const t = document.createElement("p");
  t.textContent = evento.texto;
  caja.append(t);
  if (evento.url) caja.append(enlace(evento.url, "Ver el registro en NASA DONKI"));
}

export function mostrarTarjeta(tarjeta) {
  const caja = $("tarjeta");
  if (!tarjeta) { caja.hidden = true; return; }
  caja.hidden = false;
  caja.innerHTML = "<h3>🧪 Ciencia real de la NASA</h3>";
  const p = document.createElement("p");
  p.textContent = tarjeta.texto_nino?.trim() ? tarjeta.texto_nino : tarjeta.titulo;
  caja.append(p);
  if (tarjeta.url) caja.append(enlace(tarjeta.url, `Estudio ${tarjeta.id} en NASA OSDR`));
}

export function mostrarFin(estado) {
  const titulos = { victoria: "🚀 ¡Misión cumplida!", parcial: "🌙 Misión terminada", derrota: "💔 La misión falló" };
  $("fin-titulo").textContent = titulos[estado.resultado];
  $("fin-causa").textContent = estado.causa;
  $("fin").hidden = false;
}

export function mostrarDatosUsados(fuentes) {
  const lista = $("lista-fuentes");
  lista.innerHTML = "";
  for (const f of fuentes) {
    const li = document.createElement("li");
    li.append(enlace(f.url, f.fuente));
    if (f.consultado && f.consultado !== "manual") li.append(` (consultado: ${f.consultado.slice(0, 10)})`);
    lista.append(li);
  }
  $("datos").hidden = false;
}

function enlace(url, texto) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = texto;
  return a;
}

// Punto de entrada: carga los datos curados y conecta los botones.
import { nuevoEstado } from "./estado.js";
import { terminarDia, pedirConsejo } from "./turno.js";
import * as ui from "./ui.js";

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

const datos = {
  donki: await cargar("data/curado/donki.json", []),
  osdr: await cargar("data/curado/osdr.json", []),
  fuentes: await cargar("data/fuentes.json", []),
};
console.log(`Datos cargados: ${datos.donki.length} eventos DONKI, ${datos.osdr.length} estudios OSDR`);

let estado = nuevoEstado("luna");

function refrescar() { ui.dibujar(estado); }

function iniciar(sitio) {
  estado = nuevoEstado(sitio);
  document.getElementById("mensajes").innerHTML = "";
  ui.reiniciarDeslizadores();
  ui.mostrarEvento(null);
  ui.mostrarTarjeta(null);
  document.getElementById("fin").hidden = true;
  ui.prepararDeslizadores(estado, refrescar);
  ui.agregarMensajes(["👋 ¡Bienvenida, comandante! Reparte la energía de hoy y termina el día."]);
  refrescar();
}

document.getElementById("btn-terminar").onclick = () => {
  if (estado.terminado) return;
  const { mensajes, evento, tarjeta } = terminarDia(estado, ui.leerReparto(), datos);
  ui.agregarMensajes(mensajes);
  ui.mostrarEvento(evento);
  ui.mostrarTarjeta(tarjeta);
  ui.reiniciarDeslizadores();
  refrescar();
  if (estado.terminado) ui.mostrarFin(estado);
};

document.getElementById("btn-consejo").onclick = () => {
  ui.agregarMensajes([pedirConsejo(estado)]);
  refrescar();
};

document.getElementById("btn-datos").onclick = () => ui.mostrarDatosUsados(datos.fuentes);
document.getElementById("btn-cerrar-datos").onclick = () => { document.getElementById("datos").hidden = true; };
document.getElementById("btn-luna").onclick = () => iniciar("luna");
document.getElementById("btn-marte").onclick = () => iniciar("marte");
document.getElementById("btn-reintentar").onclick = () => iniciar(estado.sitio);

iniciar("luna");

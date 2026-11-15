// Lógica de un día de juego. No toca la pantalla: devuelve un resumen de lo que pasó.
import { REGLAS, SITIOS, energiaDisponible, bateriaMax } from "./estado.js";
import { eventosDelDia, danoRadiacion } from "./eventos.js";

const limitar = (x) => Math.max(0, Math.min(100, Math.round(x)));

export const proteccionDelDia = (e) => Math.min(100, e.mods.proteccionBase + e.reparto.blindaje * REGLAS.proteccionPorPunto);

export function terminarDia(estado, mision, datos) {
  const R = REGLAS, r = { ...estado.reparto }, h = estado.historial;
  const proteccion = proteccionDelDia(estado);
  const res = {
    dia: estado.dia, reparto: r, proteccion,
    produccionSoporte: r.soporte * R.soportePorPunto, consumoSoporte: R.consumoSoporte,
    siembra: 0, cosecha: 0, cienciaGanada: 0, desperdicio: 0, guardado: 0,
    golpes: [],       // radiación recibida hoy: { ev, dano, danoTotal, proteccion, conAviso }
    nuevos: [],       // eventos que empezaron hoy (CME detectadas, SEP, GST)
    consejos: [], inicioSecuencia: false, recuperacion: 0,
  };

  // 1) Soporte vital
  estado.soporte = limitar(estado.soporte + res.produccionSoporte - R.consumoSoporte);

  // 2) Invernadero: la cosecha llega días después
  if (r.invernadero > 0) {
    res.siembra = r.invernadero * (R.comidaPorPunto + estado.mods.comidaPorPuntoExtra);
    estado.pendientes.push({ dia: estado.dia + R.diasCrecimiento, tipo: "cosecha", cantidad: res.siembra });
    h.diasSembrados++;
  }
  estado.comida = limitar(estado.comida - R.consumoComida);

  // 3) Investigación
  res.cienciaGanada = r.investigacion * (R.cienciaPorPunto + estado.mods.cienciaPorPuntoExtra);
  estado.ciencia += res.cienciaGanada;

  // 4) Batería
  const usados = r.soporte + r.invernadero + r.blindaje + r.investigacion;
  const sobrante = Math.max(0, energiaDisponible(estado) - usados);
  const tope = bateriaMax(estado);
  estado.bateria = Math.min(tope, sobrante);
  res.guardado = estado.bateria;
  res.desperdicio = Math.max(0, sobrante - tope);
  h.desperdicio += res.desperdicio;

  const golpear = (ev, conAviso) => {
    const dano = danoRadiacion(ev, proteccion);
    estado.salud = limitar(estado.salud - dano);
    res.golpes.push({ ev, dano, danoTotal: ev.dano, proteccion, conAviso });
    h.danoRecibido += dano; h.danoEvitado += ev.dano - dano; h.golpes++;
    if (proteccion >= 60) h.golpesBienProtegidos++;
  };

  // 5) Lo pendiente para hoy
  const hoy = estado.pendientes.filter((p) => p.dia === estado.dia);
  estado.pendientes = estado.pendientes.filter((p) => p.dia !== estado.dia);
  for (const p of hoy) {
    if (p.tipo === "cosecha") { estado.comida = limitar(estado.comida + p.cantidad); res.cosecha += p.cantidad; }
    else if (p.tipo === "cme") golpear(p.evento, true);
    else if (p.tipo === "consejo") res.consejos.push(p.texto);
  }

  // 6) Eventos de clima espacial reales (DONKI)
  const diasSec = Object.keys(mision.secuencia || {}).map(Number);
  res.inicioSecuencia = diasSec.length > 0 && estado.dia === Math.min(...diasSec);
  let huboGST = false;
  for (const ev of eventosDelDia(estado, mision, datos.donki, R.probabilidadEvento)) {
    res.nuevos.push(ev);
    if (ev.tipo === "CME") estado.pendientes.push({ dia: estado.dia + ev.diasAviso, tipo: "cme", evento: ev });
    else if (ev.tipo === "SEP") golpear(ev, false);
    else if (ev.tipo === "GST") { huboGST = true; estado.antenaBloqueadaDias = ev.diasBloqueo + 1; }
  }

  // 7) Recuperación si la base está bien
  if (estado.soporte > 50 && estado.comida > 50 && !res.golpes.length && estado.salud < 100) {
    res.recuperacion = Math.min(R.recuperacionSalud, 100 - estado.salud);
    estado.salud += res.recuperacion;
  }

  // 8) ¿Terminó la misión? Si no, nuevo día con reparto en cero
  revisarFin(estado);
  if (estado.antenaBloqueadaDias > 0) estado.antenaBloqueadaDias -= 1;
  res.estadoFinal = { soporte: estado.soporte, comida: estado.comida, salud: estado.salud, ciencia: estado.ciencia };
  if (!estado.terminado) {
    estado.dia += 1;
    estado.reparto = { soporte: 0, invernadero: 0, blindaje: 0, investigacion: 0 };
  }
  return res;
}

function revisarFin(estado) {
  const causas = [
    [estado.soporte <= 0, "La base se quedó sin aire y agua. El soporte vital necesita energía todos los días: la tripulación usa 12 y cada punto de energía produce 3."],
    [estado.comida <= 0, "La tripulación se quedó sin comida. Las plantas tardan 2 días en crecer: hay que sembrar antes de que falte."],
    [estado.salud <= 0, "La radiación del Sol enfermó a la tripulación. El blindaje del refugio protege 20% por cada punto de energía."],
  ];
  for (const [cond, causa] of causas) {
    if (cond) { estado.terminado = true; estado.resultado = "derrota"; estado.causa = causa; return; }
  }
  if (estado.dia >= estado.diasMision) {
    estado.terminado = true;
    estado.resultado = estado.ciencia >= estado.metaCiencia ? "victoria" : "parcial";
    estado.causa = estado.resultado === "victoria"
      ? "¡La tripulación sobrevivió y cumplió la meta científica!"
      : `La tripulación sobrevivió, pero juntó ${estado.ciencia} de ciencia y la meta era ${estado.metaCiencia}.`;
  }
}

// Pedir consejo a Control de Misión (con retraso según el sitio)
export function pedirConsejo(estado) {
  if (estado.antenaBloqueadaDias > 0) return { ok: false, texto: "📵 La antena no funciona por la tormenta magnética. ¡Hoy decides tú!" };
  const sitio = SITIOS[estado.sitio];
  const texto = consejo(estado);
  estado.historial.consejos++;
  if (sitio.retrasoConsejoDias === 0) return { ok: true, texto: `📡 Control de Misión: "${texto}"` };
  estado.pendientes.push({ dia: estado.dia + sitio.retrasoConsejoDias, tipo: "consejo", texto });
  return { ok: true, texto: `📡 Mensaje enviado. ${sitio.textoRetraso}` };
}

function consejo(e) {
  const cme = e.pendientes.filter((p) => p.tipo === "cme").sort((a, b) => a.dia - b.dia)[0];
  const u = SITIOS[e.sitio].unidadDia.toLowerCase();
  if (cme) return `Viene una nube solar el ${u} ${cme.dia}. Ese ${u} pon energía en el refugio, y guarda batería antes.`;
  if (e.soporte < 40) return "El aire se está acabando: dale 4 o más de energía al soporte vital.";
  if (e.comida < 50) return "Siembra ya en el invernadero: la cosecha tarda 2 días en llegar.";
  if (e.ciencia < e.dia * (e.metaCiencia / e.diasMision)) return "La base está estable. ¡Buen momento para investigar en el laboratorio!";
  return "Todo va bien. Guarda algo de energía en la batería por si el Sol se enoja.";
}

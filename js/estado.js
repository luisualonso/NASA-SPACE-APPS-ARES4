// Valores del juego. Son decisiones de diseño (no datos de la NASA): se explica en "Datos NASA".
export const SITIOS = {
  tierra: { nombre: "Centro de lanzamiento, Tierra", unidadDia: "Día" },
  luna: {
    nombre: "Polo sur lunar", energiaDia: 10, retrasoConsejoDias: 0, unidadDia: "Día",
    textoRetraso: "Desde la Luna, tu mensaje llega a la Tierra en poco más de 1 segundo.",
  },
  marte: {
    nombre: "Cráter Gale, Marte", energiaDia: 8, retrasoConsejoDias: 2, unidadDia: "Sol",
    textoRetraso: "Desde Marte, un mensaje tarda de 3 a 22 minutos en llegar. ¡La respuesta llegará en 2 soles!",
  },
};

export const REGLAS = {
  bateriaMax: 5,
  probabilidadEvento: 0.3,
  soportePorPunto: 3, consumoSoporte: 12,
  comidaPorPunto: 4, diasCrecimiento: 2, consumoComida: 8,
  cienciaPorPunto: 8,
  proteccionPorPunto: 20,
  recuperacionSalud: 2,
};

export function nuevoEstado(mision, mods = {}, inicio = {}) {
  return {
    mision: mision.id, sitio: mision.sitio, diasMision: mision.dias, metaCiencia: mision.metaCiencia,
    dia: 1,
    soporte: inicio.soporte ?? 80, comida: inicio.comida ?? 80, salud: inicio.salud ?? 100,
    ciencia: 0, bateria: 0, antenaBloqueadaDias: 0,
    pendientes: [],
    reparto: { soporte: 0, invernadero: 0, blindaje: 0, investigacion: 0 },
    mods: {
      proteccionBase: mods.proteccionBase ?? 0, comidaPorPuntoExtra: mods.comidaPorPuntoExtra ?? 0,
      bateriaMaxExtra: mods.bateriaMaxExtra ?? 0, cienciaPorPuntoExtra: mods.cienciaPorPuntoExtra ?? 0,
    },
    // para la retroalimentación del final de la misión
    historial: { danoEvitado: 0, danoRecibido: 0, desperdicio: 0, diasSembrados: 0, consejos: 0, golpes: 0, golpesBienProtegidos: 0 },
    terminado: false, resultado: null, causa: "",
  };
}

export const energiaDisponible = (e) => SITIOS[e.sitio].energiaDia + e.bateria;
export function energiaLibre(e) {
  const r = e.reparto;
  return energiaDisponible(e) - (r.soporte + r.invernadero + r.blindaje + r.investigacion);
}
export const bateriaMax = (e) => REGLAS.bateriaMax + e.mods.bateriaMaxExtra;

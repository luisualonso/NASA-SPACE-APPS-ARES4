// Valores del juego. Cambien estos números para balancear la dificultad.
// Son decisiones de diseño (no datos de la NASA): díganlo en la pantalla "Datos usados".

export const SITIOS = {
  luna: {
    nombre: "Polo sur lunar",
    energiaDia: 10,          // los picos del borde de Shackleton reciben luz casi todo el tiempo
    metaCiencia: 250,
    retrasoConsejoDias: 0,   // la señal tarda ~1.3 s: Control de Misión responde el mismo día
    textoRetraso: "Desde la Luna, tu mensaje llega a la Tierra en poco más de un segundo.",
  },
  marte: {
    nombre: "Cráter Gale, Marte",
    energiaDia: 8,           // menos luz solar y polvo sobre los paneles
    metaCiencia: 100,
    retrasoConsejoDias: 2,   // la señal tarda de 3 a 22 minutos: la respuesta llega tarde
    textoRetraso: "Desde Marte, tu mensaje tarda minutos en llegar. ¡La respuesta llegará en unos días!",
  },
};

export const REGLAS = {
  diasMision: 14,
  bateriaMax: 5,
  probabilidadEvento: 0.3,
  soportePorPunto: 3,      // cada punto de energía en soporte vital
  consumoSoporte: 12,      // lo que respira y bebe la tripulación cada día
  comidaPorPunto: 4,       // cosecha por punto de energía en el invernadero...
  diasCrecimiento: 2,      // ...que llega 2 días después
  consumoComida: 8,
  cienciaPorPunto: 8,
  proteccionPorPunto: 20,  // % de daño evitado por punto de blindaje (máximo 100 %)
  recuperacionSalud: 2,    // si aire y comida están bien, la tripulación se recupera un poco
};

export function nuevoEstado(sitio = "luna") {
  return {
    sitio,
    dia: 1,
    soporte: 80,
    comida: 80,
    salud: 100,
    ciencia: 0,
    bateria: 0,
    antenaBloqueadaDias: 0,
    pendientes: [],   // { dia, tipo: "cosecha" | "cme" | "consejo", ... }
    terminado: false,
    resultado: null,  // "victoria" | "parcial" | "derrota"
    causa: "",
  };
}

export function energiaDisponible(estado) {
  return SITIOS[estado.sitio].energiaDia + estado.bateria;
}

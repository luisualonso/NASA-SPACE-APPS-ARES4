// Las misiones son configuraciones: agregar una nueva no requiere tocar el motor.
// Coordenadas en píxeles del lienzo (1376 x 768).

const MODULOS_BASE = [
  { id: "solar",       nombre: "Planta solar",  x: 255,  y: 280, tam: 112 },
  { id: "laboratorio", nombre: "Laboratorio",   x: 600,  y: 232, tam: 112 },
  { id: "antena",      nombre: "Antena",        x: 790,  y: 232, tam: 112 },
  { id: "invernadero", nombre: "Invernadero",   x: 1120, y: 262, tam: 112 },
  { id: "dormitorio",  nombre: "Dormitorio",    x: 300,  y: 642, tam: 112 },
  { id: "soporte",     nombre: "Soporte vital", x: 688,  y: 658, tam: 96 },
  { id: "refugio",     nombre: "Refugio",       x: 1080, y: 642, tam: 112 },
];
// Plano compartido por la Luna y Marte: zonas por donde se puede caminar y obstáculos
const PLANO_BASE = {
  zonas: [[135, 142, 1240, 428], [652, 420, 724, 560], [135, 552, 1240, 728], [192, 420, 268, 560], [1108, 420, 1184, 560]],
  muros: [[372, 142, 480, 386], [896, 142, 1004, 382], [452, 634, 556, 728], [820, 634, 924, 728]],
  inicio: { x: 688, y: 500 },
  npcs: [{ img: "tripulante1", x: 520, y: 410 }, { img: "tripulante2", x: 860, y: 410 }],
};

export const MISIONES = {
  tierra: {
    id: "tierra", numero: 1, nombre: "Misión 1: Prepara el cohete", sitio: "tierra", fondo: "fondo_tierra",
    plano: {
      zonas: [[48, 140, 388, 428], [988, 140, 1330, 428], [48, 362, 1330, 428], [462, 318, 918, 428],
              [652, 420, 724, 560], [556, 552, 822, 728], [192, 420, 268, 560], [1108, 420, 1184, 560],
              [48, 552, 486, 728], [890, 552, 1330, 728]],
      muros: [[456, 640, 486, 728], [890, 640, 950, 728]],
      inicio: { x: 688, y: 610 },
      npcs: [{ img: "tripulante1", x: 600, y: 400 }, { img: "tripulante2", x: 780, y: 400 }],
    },
    zonaCarga: { x: 688, y: 352, radio: 78 },           // frente al cohete
    lugaresCargados: [[598, 338], [778, 338], [538, 338], [838, 338], [482, 338], [894, 338]],   // junto al cohete
    intro: [
      "¡Bienvenido al centro de lanzamiento! Antes de despegar hay que cargar el cohete.",
      "Camina con W A S D. Acércate a una caja y presiona E o ESPACIO para agarrarla. Llévala frente al cohete y suéltala con E.",
      "Cuidado: el cohete solo aguanta 20 de peso. ¡No cabe todo! Elige lo que más ayude a tu base en la Luna.",
    ],
  },
  luna: {
    id: "luna", numero: 2, nombre: "Misión 2: Base lunar Artemis", sitio: "luna", fondo: "fondo_luna",
    plano: PLANO_BASE, modulos: MODULOS_BASE,
    dias: 10, metaCiencia: 150, diasTutorial: 2, tiposEventos: ["CME", "SEP", "GST"],
    // Clímax: la gran tormenta solar de mayo de 2024, en el orden real (ids de NASA DONKI)
    secuencia: {
      7: ["2024-05-08T22:24:00-CME-001"],
      8: ["2024-05-09T13:59:00-SEP-001"],
      9: ["2024-05-10T15:00:00-GST-001", "2024-05-10T12:59:00-SEP-001"],
      10: ["2024-05-13T12:44:00-SEP-001"],
    },
    textoSecuencia: "⚡ ¡Empieza la gran tormenta solar de mayo de 2024! Lo que viene pasó de verdad.",
    intro: [
      "¡Llegaste al polo sur de la Luna! Tu tripulación depende de ti durante 10 días.",
      "Cada día tienes energía para repartir. Camina a cada módulo y presiona E para darle energía.",
      "Cuando termines, ve al DORMITORIO para dormir. ¡Los dos primeros días son de práctica!",
    ],
  },
  marte: {
    id: "marte", numero: 3, nombre: "Misión 3: Primera base en Marte", sitio: "marte", fondo: "fondo_marte",
    plano: PLANO_BASE, modulos: MODULOS_BASE,
    dias: 14, metaCiencia: 150, diasTutorial: 1,
    tiposEventos: ["CME", "SEP"],   // las tormentas geomagnéticas son de la Tierra: Marte no tiene campo magnético global
    secuencia: {},
    intro: [
      "¡Llegaron a Marte! Aquí el Sol está más lejos: tendrás menos energía cada sol (así se llaman los días marcianos).",
      "Control de Misión está lejísimos: sus respuestas tardan 2 soles en llegar. ¡Tendrás que decidir tú!",
      "Sobrevive 14 soles y junta ciencia para fundar la primera base en Marte.",
    ],
  },
};

// Misión 1: carga del cohete
export const CAPACIDAD_COHETE = 20;
export const CARGA = [
  { id: "oxigeno", nombre: "Oxígeno", peso: 4, x: 215, y: 250, efecto: "+15 de aire y agua al llegar",
    dato: "Cada astronauta necesita unos 0.84 kg de oxígeno al día. ¡En la Luna no hay aire para respirar!" },
  { id: "comida", nombre: "Comida", peso: 4, x: 215, y: 345, efecto: "+15 de comida al llegar",
    dato: "Un astronauta necesita unas 3,000 kilocalorías al día: ¡trabajar en el espacio da mucha hambre!" },
  { id: "semillas", nombre: "Semillas", peso: 3, x: 1160, y: 250, efecto: "El invernadero da +1 de comida por punto",
    dato: "En la Estación Espacial ya se han cultivado lechugas y chiles. Las semillas pesan poco y dan comida fresca." },
  { id: "blindaje", nombre: "Blindaje", peso: 5, x: 1160, y: 345, efecto: "+20% de protección todos los días",
    dato: "En la Luna se recibe unas 2.6 veces más radiación que en la Estación Espacial. ¡El blindaje cuida a tu tripulación!" },
  { id: "bateria", nombre: "Batería", peso: 3, x: 270, y: 640, efecto: "La batería guarda 2 puntos más",
    dato: "Guardar energía sirve para los días difíciles, como cuando llega una tormenta solar." },
  { id: "instrumento", nombre: "Instrumentos", peso: 4, x: 1110, y: 640, efecto: "+2 de ciencia por punto",
    dato: "Artemis quiere estudiar el hielo de agua escondido en cráteres que nunca reciben luz del Sol." },
];

export function aplicarCarga(elegidos) {
  const tiene = (id) => elegidos.includes(id);
  return {
    mods: {
      proteccionBase: tiene("blindaje") ? 20 : 0, comidaPorPuntoExtra: tiene("semillas") ? 1 : 0,
      bateriaMaxExtra: tiene("bateria") ? 2 : 0, cienciaPorPuntoExtra: tiene("instrumento") ? 2 : 0,
    },
    inicio: { soporte: tiene("oxigeno") ? 95 : 80, comida: tiene("comida") ? 95 : 80 },
  };
}

// Lo que la Luna deja para Marte (el desempeño se arrastra)
export function arrastreAMarte(estadoLuna, mods) {
  const nuevosMods = { ...mods };
  const mensajes = [];
  const inicio = { salud: 85 };
  if (estadoLuna.salud > 60) { inicio.salud = 100; mensajes.push("❤️ Tu tripulación llegó sana: empieza con salud completa en Marte."); }
  else mensajes.push("❤️ La tripulación llegó cansada de la Luna: empieza con 85 de salud.");
  if (estadoLuna.ciencia >= 200) {
    nuevosMods.cienciaPorPuntoExtra = (nuevosMods.cienciaPorPuntoExtra || 0) + 2;
    mensajes.push("🔬 Tu gran ciencia en la Luna mejoró los instrumentos: +2 de ciencia por punto.");
  }
  return { mods: nuevosMods, inicio, mensajes };
}

export function estrellas(estado) {
  if (estado.resultado === "derrota") return 1;
  return estado.resultado === "victoria" ? 3 : 2;
}

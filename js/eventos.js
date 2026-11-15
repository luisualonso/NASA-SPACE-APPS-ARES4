// Eventos de clima espacial tomados de data/curado/donki.json (NASA DONKI).
const UA_KM = 1.496e8;   // distancia del Sol a la Tierra y la Luna
const DANO_CME = { baja: 10, media: 20, alta: 35 };

// Calcula el efecto en el juego a partir de los datos reales (velocidad, índice Kp)
export function normalizar(ev) {
  const e = { ...ev };
  if (e.tipo === "CME") {
    const v = e.velocidad_km_s;
    e.intensidad = v >= 1000 ? "alta" : v >= 500 ? "media" : "baja";
    e.diasAviso = v ? Math.max(1, Math.min(4, Math.round(UA_KM / v / 86400))) : 2;   // distancia / velocidad
    e.dano = DANO_CME[e.intensidad];
  } else if (e.tipo === "SEP") {
    e.diasAviso = 0; e.dano = 25;
  } else if (e.tipo === "GST") {
    e.diasBloqueo = e.kp_max >= 8 ? 2 : 1;
  }
  return e;
}

const fechaBonita = (f) => {
  const [a, m, d] = (f || "").split("-");
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return a ? `${Number(d)} de ${meses[Number(m) - 1]} de ${a}` : "";
};

export function describir(ev) {
  const cuando = `Evento real del ${fechaBonita(ev.fecha)} (NASA DONKI).`;
  if (ev.tipo === "CME") return { titulo: "☀️ ¡NUBE SOLAR EN CAMINO!", texto: `El Sol lanzó una nube gigante de partículas que viaja a ${Math.round(ev.velocidad_km_s)} km por segundo. Llegará en ${ev.diasAviso} ${ev.diasAviso === 1 ? "día" : "días"}.`, cuando };
  if (ev.tipo === "SEP") return { titulo: "💥 ¡LLUVIA DE PARTÍCULAS!", texto: "Partículas del Sol llegaron casi a la velocidad de la luz. ¡No hubo tiempo de aviso!", cuando };
  return { titulo: "🌀 ¡TORMENTA MAGNÉTICA!", texto: `Una tormenta de nivel Kp ${ev.kp_max} (el máximo es 9) alteró las comunicaciones. La antena no funcionará ${ev.diasBloqueo} ${ev.diasBloqueo === 1 ? "día" : "días"}.`, cuando };
}

// Eventos del día: primero la secuencia real de la misión; si no hay, uno al azar
export function eventosDelDia(estado, mision, donki, probabilidad) {
  const ids = mision.secuencia?.[estado.dia];
  if (ids) return ids.map((id) => donki.find((e) => e.id === id)).filter(Boolean).map(normalizar);
  if (estado.dia <= mision.diasTutorial) return [];
  // en los días previos a la secuencia real no se lanzan nubes que choquen con ella
  const posibles = donki.filter((e) => mision.tiposEventos.includes(e.tipo));
  if (!posibles.length || Math.random() > probabilidad) return [];
  return [normalizar(posibles[Math.floor(Math.random() * posibles.length)])];
}

export const danoRadiacion = (ev, proteccion) => Math.round(ev.dano * (1 - proteccion / 100));

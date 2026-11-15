// Eventos de clima espacial tomados de data/curado/donki.json (NASA DONKI).

const TEXTO_GENERICO = {
  CME: "El Sol lanzó una nube gigante de partículas (eyección de masa coronal). ¡Viene hacia la base!",
  SEP: "¡Una lluvia de partículas del Sol llegó de golpe! Sin aviso, solo el blindaje protege.",
  GST: "Una tormenta magnética alteró las comunicaciones. La antena no funcionará por un tiempo.",
};

export function textoEvento(ev) {
  const base = ev.texto_nino && ev.texto_nino.trim() ? ev.texto_nino : TEXTO_GENERICO[ev.tipo];
  return `${base} (Evento real del ${ev.fecha}, fuente: ${ev.fuente})`;
}

export function sortearEvento(donki, probabilidad) {
  if (!donki.length || Math.random() > probabilidad) return null;
  return donki[Math.floor(Math.random() * donki.length)];
}

// Daño de radiación reducido por el blindaje del día (0 a 100 %)
export function danoRadiacion(ev, proteccion) {
  const dano = Math.abs(ev.efecto_juego?.salud ?? 10);
  return Math.round(dano * (1 - proteccion / 100));
}

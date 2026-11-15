// Carga todas las imágenes de img/. Si falta alguna, el juego dibuja un sustituto simple.
const ARCHIVOS = {
  fondo_tierra: "img/fondo_tierra.jpg", fondo_luna: "img/fondo_luna.jpg", fondo_marte: "img/fondo_marte.jpg",
  jugador: "img/jugador.png", tripulante1: "img/tripulante1.png", tripulante2: "img/tripulante2.png",
  solar: "img/solar.png", soporte: "img/soporte.png", invernadero: "img/invernadero.png", refugio: "img/refugio.png",
  laboratorio: "img/laboratorio.png", antena: "img/antena.png", dormitorio: "img/dormitorio.png",
  carga_oxigeno: "img/carga_oxigeno.png", carga_comida: "img/carga_comida.png", carga_semillas: "img/carga_semillas.png",
  carga_blindaje: "img/carga_blindaje.png", carga_bateria: "img/carga_bateria.png", carga_instrumento: "img/carga_instrumento.png",
};
export const IMG = {};
export function cargarSprites() {
  return Promise.all(Object.entries(ARCHIVOS).map(([clave, ruta]) => new Promise((ok) => {
    const img = new Image();
    img.onload = () => { IMG[clave] = img; ok(); };
    img.onerror = () => { console.warn("Falta la imagen", ruta); ok(); };
    img.src = ruta;
  })));
}

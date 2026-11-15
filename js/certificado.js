// Certificado de felicitación para el pequeño astronauta (se puede descargar como imagen).
import { IMG } from "./sprites.js";

const W = 1400, H = 990;
const PIXEL = '"Press Start 2P", "Courier New", monospace';
const TEXTO = '"VT323", "Courier New", monospace';

const RANGOS = {
  3: { rango: "COMANDANTE DE MARTE", frase: "por fundar la primera base permanente en Marte" },
  2: { rango: "EXPLORADOR DE MARTE", frase: "por llevar a su tripulación sana y salva hasta Marte" },
  1: { rango: "CADETE ESPACIAL", frase: "por atreverse a viajar a la Luna y a Marte, y aprender de cada misión" },
};

export function crearCertificado({ nombre, estrellas, cienciaLuna, cienciaMarte, diasMarte, danoEvitado }) {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const r = RANGOS[estrellas] || RANGOS[1];

  // fondo espacial
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#070b22"); g.addColorStop(1, "#1a1038");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) {
    const t = rnd() > 0.85 ? 4 : 2;
    ctx.fillStyle = rnd() > 0.5 ? "#ffffff" : "#8fa0e8";
    ctx.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * H), t, t);
  }
  // Marte y la Luna
  const disco = (x, y, R, c1, c2) => {
    for (let py = -R; py <= R; py += 6) for (let px = -R; px <= R; px += 6) {
      if (Math.hypot(px, py) > R) continue;
      ctx.fillStyle = px + py < R * 0.4 ? c1 : c2; ctx.fillRect(x + px, y + py, 6, 6);
    }
  };
  disco(W - 190, 200, 96, "#d2603a", "#8f3a22");
  disco(190, 190, 54, "#c9ccd6", "#8c90a1");

  // marco con franjas de peligro
  ctx.save();
  ctx.beginPath(); ctx.rect(30, 30, W - 60, H - 60); ctx.rect(54, 54, W - 108, H - 108); ctx.clip("evenodd");
  ctx.fillStyle = "#1c1c22"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#ffcc33";
  for (let i = -H; i < W + H; i += 56) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 28, 0); ctx.lineTo(i + 28 - H, H); ctx.lineTo(i - H, H); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = "#3ad6c5"; ctx.lineWidth = 4; ctx.strokeRect(62, 62, W - 124, H - 124);

  const centro = (texto, y, fuente, color) => {
    ctx.font = fuente; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillText(texto, W / 2 + 3, y + 3);
    ctx.fillStyle = color; ctx.fillText(texto, W / 2, y);
  };
  centro("MISIÓN ARES: SUPERVIVENCIA", 130, `30px ${PIXEL}`, "#7fe7ff");
  centro("CERTIFICADO DE MISIÓN CUMPLIDA", 196, `22px ${PIXEL}`, "#ffe27a");
  centro("Se otorga con orgullo a", 268, `44px ${TEXTO}`, "#dfe6ff");

  // nombre (se ajusta si es largo)
  let tam = 58;
  ctx.font = `${tam}px ${PIXEL}`;
  while (ctx.measureText(nombre).width > W - 420 && tam > 22) { tam -= 4; ctx.font = `${tam}px ${PIXEL}`; }
  centro(nombre, 356, `${tam}px ${PIXEL}`, "#ffffff");
  ctx.fillStyle = "#3ad6c5"; ctx.fillRect(W / 2 - 360, 404, 720, 4);

  centro(r.frase + ".", 452, `40px ${TEXTO}`, "#dfe6ff");
  centro(`RANGO: ${r.rango}`, 520, `24px ${PIXEL}`, "#ffb347");

  // estrellas
  const estrella = (x, y, R, llena) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? R * 0.45 : R;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = llena ? "#ffd23a" : "#2c3358"; ctx.fill();
    ctx.strokeStyle = "#1b1230"; ctx.lineWidth = 5; ctx.stroke();
  };
  for (let i = 0; i < 3; i++) estrella(W / 2 - 100 + i * 100, 606, 40, i < estrellas);

  // logros
  const logros = [
    `Ciencia en la Luna: ${cienciaLuna}`,
    `Ciencia en Marte: ${cienciaMarte}`,
    `Soles en Marte: ${diasMarte}`,
    `Radiación evitada: ${danoEvitado}`,
  ];
  ctx.font = `30px ${TEXTO}`; ctx.textAlign = "center";
  logros.forEach((l, i) => {
    const x = W / 2 + (i % 2 ? 225 : -225), y = 694 + Math.floor(i / 2) * 44;
    ctx.fillStyle = "#9dffb0"; ctx.fillText("✔ " + l, x, y);
  });

  // astronauta
  const a = IMG.jugador;
  if (a) { ctx.imageSmoothingEnabled = true; ctx.drawImage(a, 96, 640, 124, 124 * (a.height / a.width)); }
  const b = IMG.tripulante2;
  if (b) ctx.drawImage(b, W - 220, 644, 122, 122 * (b.height / b.width));

  const hoy = new Date();
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  centro(`${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`, 826, `34px ${TEXTO}`, "#dfe6ff");
  centro("Aprendió con datos reales de NASA DONKI, OSDR y RadLab", 864, `28px ${TEXTO}`, "#7fe7ff");
  centro("Juego del equipo ARES4 para el NASA Space Apps Challenge 2026.", 900, `22px ${TEXTO}`, "#8f98c4");
  centro("No es un documento oficial de la NASA.", 922, `22px ${TEXTO}`, "#8f98c4");
  return c;
}

export function descargarCertificado(canvas, nombre) {
  const a = document.createElement("a");
  a.download = `certificado-mision-ares-${nombre.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, "-") || "astronauta"}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
}

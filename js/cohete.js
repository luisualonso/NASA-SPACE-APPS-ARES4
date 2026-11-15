// Animación del cohete entre misiones (pixel art dibujado por código a 480 x 270 y escalado nítido).
import { sonido } from "./audio.js";

const W = 480, H = 270;
const CUERPOS = {
  tierra: { color: "#2f7de0", sombra: "#1b4f9c", manchas: "#3fbf6a", nombre: "LA TIERRA" },
  luna: { color: "#c9ccd6", sombra: "#8c90a1", manchas: "#a3a7b8", nombre: "LA LUNA" },
  marte: { color: "#d2603a", sombra: "#8f3a22", manchas: "#b04a2a", nombre: "MARTE" },
};
const VIAJES = {
  "tierra-luna": { titulo: "RUMBO A LA LUNA", dato: "La Luna está a unos 384,400 km: ¡unos 3 días de viaje!" },
  "luna-marte": { titulo: "RUMBO A MARTE", dato: "Viajar a Marte toma varios meses. ¡Es el viaje más largo de la humanidad!" },
};

function planeta(ctx, c, x, y, r) {
  for (let py = -r; py <= r; py += 3) for (let px = -r; px <= r; px += 3) {
    const d = Math.hypot(px, py);
    if (d > r) continue;
    const luz = px + py < r * 0.5;
    const mancha = (Math.sin(px * 0.21 + c.color.length) + Math.cos(py * 0.17 + px * 0.05)) > 1.05;
    ctx.fillStyle = mancha ? c.manchas : luz ? c.color : c.sombra;
    ctx.fillRect(Math.round(x + px), Math.round(y + py), 3, 3);
  }
}

function cohete(ctx, x, y, ang, t) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(ang);
  const px = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(a, b, w, h); };
  // llama
  const l = 10 + Math.sin(t * 40) * 4;
  px("#ff7a1a", -4, 14, 8, l); px("#ffd23a", -2, 14, 4, l - 4); px("#fff", -1, 14, 2, 4);
  // cuerpo
  px("#e8ecf4", -5, -12, 10, 26); px("#b8bfd0", 2, -12, 3, 26);
  px("#e8ecf4", -3, -17, 6, 5); px("#d9412f", -2, -21, 4, 4); px("#d9412f", -1, -23, 2, 2);
  px("#2b3350", -5, -2, 10, 3); px("#2b3350", -5, 6, 10, 2);
  px("#49c3f2", -2, -9, 4, 4); px("#bfeaff", -2, -9, 2, 2);
  px("#d9412f", -9, 6, 4, 9); px("#d9412f", 5, 6, 4, 9); px("#8f2a1f", -9, 12, 4, 3); px("#8f2a1f", 5, 12, 4, 3);
  ctx.restore();
}

export function animarCohete(origen, destino) {
  const lienzo = document.getElementById("transicion");
  const ctx = lienzo.getContext("2d");
  lienzo.width = W; lienzo.height = H; lienzo.hidden = false;
  ctx.imageSmoothingEnabled = false;
  const viaje = VIAJES[`${origen}-${destino}`];
  const estrellas = Array.from({ length: 90 }, () => [Math.random() * W, Math.random() * H, 0.3 + Math.random() * 1.5]);
  const humo = [];
  const DUR = 5.2;
  sonido.cohete(DUR - 0.6);

  return new Promise((fin) => {
    let t0 = null, terminado = false;
    const terminar = () => {
      if (terminado) return;
      terminado = true;
      lienzo.hidden = true;
      lienzo.removeEventListener("pointerdown", saltar);
      window.removeEventListener("keydown", tecla);
      fin();
    };
    const saltar = () => { if (t0 !== null && performance.now() - t0 > 900) terminar(); };
    const tecla = (e) => { if (["e", " ", "enter", "escape"].includes(e.key.toLowerCase())) saltar(); };
    lienzo.addEventListener("pointerdown", saltar);
    window.addEventListener("keydown", tecla);

    function cuadro(ms) {
      if (terminado) return;
      if (t0 === null) t0 = ms;
      const t = (ms - t0) / 1000, p = Math.min(1, t / DUR);
      ctx.fillStyle = "#050818"; ctx.fillRect(0, 0, W, H);
      for (const s of estrellas) {
        const x = (s[0] - t * 30 * s[2] + W * 10) % W;
        ctx.fillStyle = s[2] > 1.2 ? "#fff" : "#8a94c8";
        ctx.fillRect(Math.round(x), Math.round((s[1] + t * 12 * s[2]) % H), s[2] > 1.2 ? 2 : 1, s[2] > 1.2 ? 2 : 1);
      }
      // origen (se aleja) y destino (se acerca)
      planeta(ctx, CUERPOS[origen], 70 - p * 60, H - 20 + p * 70, 78 - p * 26);
      planeta(ctx, CUERPOS[destino], W - 86 + (1 - p) * 60, 64 - (1 - p) * 40, 22 + p * 34);
      // trayectoria curva
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const x = 80 + e * (W - 200), y = H - 76 - Math.sin(e * Math.PI * 0.5) * (H - 150);
      const e2 = Math.min(1, e + 0.02);
      const ang = Math.atan2((H - 76 - Math.sin(e2 * Math.PI * 0.5) * (H - 150)) - y, (80 + e2 * (W - 200)) - x) + Math.PI / 2;
      if (Math.random() < 0.9) humo.push({ x: x - Math.sin(ang) * 18, y: y + Math.cos(ang) * 18, t });
      for (const h of humo) {
        const k = (t - h.t) / 1.2;
        if (k > 1) continue;
        ctx.fillStyle = `rgba(${220 - k * 120},${200 - k * 120},${200 - k * 80},${0.7 * (1 - k)})`;
        const s = 3 + k * 7;
        ctx.fillRect(Math.round(h.x - s / 2), Math.round(h.y - s / 2), s, s);
      }
      cohete(ctx, x, y, ang, t);
      // textos
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.fillStyle = "#000"; ctx.fillText(viaje.titulo, W / 2 + 2, 28 + 2);
      ctx.fillStyle = "#ffe27a"; ctx.fillText(viaje.titulo, W / 2, 28);
      ctx.font = '13px "VT323", monospace';
      ctx.fillStyle = "#cfe8ff"; ctx.fillText(viaje.dato.slice(0, Math.floor(t * 28)), W / 2, H - 16);
      // fundidos de entrada y salida
      const a = t < 0.4 ? 1 - t / 0.4 : p > 0.92 ? (p - 0.92) / 0.08 : 0;
      if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
      if (p >= 1) terminar(); else requestAnimationFrame(cuadro);
    }
    requestAnimationFrame(cuadro);
  });
}

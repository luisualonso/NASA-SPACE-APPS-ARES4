// Animaciones de los eventos: noche, alerta, nube solar, lluvia de partículas, tormenta magnética, cosecha.
import { ANCHO as W, ALTO as H } from "./mundo.js";
import { sonido } from "./audio.js";

const FUENTE = '"Press Start 2P", "Courier New", monospace';
const azar = (n, f) => Array.from({ length: n }, (_, i) => f(i));

function titulo(ctx, texto, color, y = H / 2, tam = 26) {
  ctx.font = `${tam}px ${FUENTE}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0,0,0,.75)"; ctx.fillText(texto, W / 2 + 3, y + 3);
  ctx.fillStyle = color; ctx.fillText(texto, W / 2, y);
}

// luces rojas de emergencia girando en el borde
function lucesDeAlerta(ctx, t, color = "255,50,60") {
  const a = 0.35 + 0.35 * Math.sin(t * 12);
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
  g.addColorStop(0, `rgba(${color},0)`); g.addColorStop(1, `rgba(${color},${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 4; i++) {
    const x = i % 2 ? W - 50 : 50, y = i < 2 ? 50 : H - 50;
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 7 + i);
    ctx.fillStyle = `rgba(${color},.5)`;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 260, -0.2, 0.2); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = `rgba(${color},${0.6 + 0.4 * Math.sin(t * 12)})`;
    ctx.fillRect(x - 10, y - 10, 20, 20);
  }
}

// cúpula azul del blindaje cuando hay protección
function escudo(ctx, p, proteccion) {
  if (proteccion <= 0) return;
  const a = Math.sin(p * Math.PI) * (0.25 + proteccion / 250);
  ctx.strokeStyle = `rgba(90,200,255,${a + 0.2})`; ctx.lineWidth = 6;
  ctx.fillStyle = `rgba(60,160,255,${a * 0.5})`;
  ctx.beginPath(); ctx.ellipse(W / 2, H / 2, W * 0.46, H * 0.46, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = `rgba(160,230,255,${a * 0.6})`; ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(W / 2, H / 2, W * 0.46 * (i / 9), H * 0.46, 0, 0, Math.PI * 2); ctx.stroke(); }
}

export function fxNoche(mundo, unidad = "DIA") {
  sonido.dormir();
  const estrellas = azar(90, () => [Math.random() * W, Math.random() * H, Math.random() * 6]);
  return mundo.efecto((ctx, p, t) => {
    const a = Math.min(1, Math.sin(p * Math.PI) * 1.6);
    ctx.fillStyle = `rgba(4,6,24,${0.92 * a})`; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    for (const [x, y, f] of estrellas) if (Math.sin(t * 3 + f) > -0.3) ctx.fillRect(Math.round(x), Math.round(y), 3, 3);
    ctx.globalAlpha = a;
    titulo(ctx, "Z z z . . .", "#bcd0ff", H / 2 - 20 - p * 20, 40);
    titulo(ctx, `FIN DEL ${unidad}`, "#7f93d9", H / 2 + 50, 20);
    ctx.globalAlpha = 1;
  }, 1.5);
}

export function fxAlertaCME(mundo, ev) {
  sonido.alerta();
  return mundo.efecto((ctx, p, t) => {
    lucesDeAlerta(ctx, t, "255,140,30");
    // el Sol lanzando la nube
    const sx = W - 130, sy = 130, r = 70 + Math.sin(t * 10) * 5;
    const g = ctx.createRadialGradient(sx, sy, 10, sx, sy, r * 2.2);
    g.addColorStop(0, "rgba(255,240,160,1)"); g.addColorStop(0.4, "rgba(255,160,40,.9)"); g.addColorStop(1, "rgba(255,90,0,0)");
    ctx.fillStyle = g; ctx.fillRect(sx - r * 2.2, sy - r * 2.2, r * 4.4, r * 4.4);
    for (let i = 0; i < 26; i++) {
      const k = (p * 1.4 + i / 26) % 1, ang = Math.PI * (0.62 + (i % 9) * 0.045);
      ctx.fillStyle = `rgba(255,${150 + (i % 4) * 25},50,${1 - k})`;
      ctx.fillRect(sx + Math.cos(ang) * k * 520, sy + Math.sin(ang) * k * 520, 10, 10);
    }
    if (Math.sin(t * 9) > -0.2) titulo(ctx, "¡ALERTA! NUBE SOLAR DETECTADA", "#ffd27a", H / 2 - 22, 28);
    titulo(ctx, `VELOCIDAD: ${Math.round(ev.velocidad_km_s)} KM/S  ·  LLEGA EN ${ev.diasAviso} ${ev.diasAviso === 1 ? "DIA" : "DIAS"}`, "#fff", H / 2 + 34, 16);
  }, 2.6);
}

export function fxLlegaCME(mundo, proteccion) {
  sonido.impacto(); if (proteccion > 0) sonido.escudo();
  mundo.sacudir(proteccion >= 60 ? 5 : 14, 1.6);
  const chispas = azar(140, () => [Math.random(), Math.random() * H, 6 + Math.random() * 12, Math.random()]);
  return mundo.efecto((ctx, p, t) => {
    lucesDeAlerta(ctx, t);
    const frente = -500 + p * (W + 1000);
    const g = ctx.createLinearGradient(frente - 520, 0, frente, 0);
    g.addColorStop(0, "rgba(255,90,0,0)"); g.addColorStop(0.6, "rgba(255,140,30,.5)"); g.addColorStop(0.92, "rgba(255,220,120,.8)"); g.addColorStop(1, "rgba(255,255,220,0)");
    ctx.fillStyle = g; ctx.fillRect(frente - 520, 0, 540, H);
    for (const [fx, y, s, f] of chispas) {
      const x = frente - fx * 480;
      ctx.fillStyle = f > 0.5 ? "rgba(255,240,170,.9)" : "rgba(255,150,40,.9)";
      ctx.fillRect(Math.round(x), Math.round(y + Math.sin(t * 8 + f * 9) * 14), s, s);
    }
    escudo(ctx, p, proteccion);
    if (p < 0.75) titulo(ctx, proteccion >= 60 ? "¡EL BLINDAJE RESISTE!" : "¡LA NUBE SOLAR GOLPEA LA BASE!", proteccion >= 60 ? "#8fe3ff" : "#ffe27a", 110, 28);
  }, 2.8);
}

export function fxSEP(mundo, proteccion) {
  sonido.alerta(); sonido.chispas();
  mundo.sacudir(proteccion >= 60 ? 3 : 9, 1.2);
  const rayos = azar(110, () => [Math.random() * (W + 400), Math.random(), 40 + Math.random() * 90, 900 + Math.random() * 900]);
  return mundo.efecto((ctx, p, t) => {
    lucesDeAlerta(ctx, t, "255,230,90");
    if (t < 0.12 || (t > 0.5 && t < 0.58)) { ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fillRect(0, 0, W, H); }
    ctx.lineWidth = 4; ctx.lineCap = "square";
    for (const [x0, f, largo, v] of rayos) {
      const y = ((f * H + t * v) % (H + 200)) - 100, x = x0 - y * 0.45;
      ctx.strokeStyle = f > 0.5 ? "rgba(255,255,200,.85)" : "rgba(255,200,60,.75)";
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + largo * 0.45, y - largo); ctx.stroke();
    }
    escudo(ctx, p, proteccion);
    if (Math.sin(t * 10) > -0.3) titulo(ctx, "¡LLUVIA DE PARTICULAS SOLARES!", "#fff3a0", 106, 28);
    titulo(ctx, "LLEGAN CASI A LA VELOCIDAD DE LA LUZ: SIN AVISO", "#fff", 156, 15);
  }, 2.6);
}

export function fxGST(mundo, antena) {
  sonido.estatica();
  return mundo.efecto((ctx, p, t) => {
    const a = Math.sin(p * Math.PI);
    // auroras
    for (let b = 0; b < 5; b++) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 16) {
        const y = 120 + b * 110 + Math.sin(x / 140 + t * 2 + b) * 50 + Math.sin(x / 60 - t * 3) * 14;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = b % 2 ? `rgba(190,90,255,${0.5 * a})` : `rgba(60,255,170,${0.5 * a})`;
      ctx.lineWidth = 46; ctx.stroke();
    }
    // interferencia
    for (let i = 0; i < 14; i++) {
      const y = (Math.sin(i * 91.7 + Math.floor(t * 14)) * 0.5 + 0.5) * H;
      ctx.fillStyle = `rgba(255,255,255,${0.16 * a})`; ctx.fillRect(0, y, W, 5);
    }
    // la antena pierde la señal
    if (antena) {
      for (let i = 0; i < 3; i++) {
        const r = ((t * 70 + i * 40) % 120);
        ctx.strokeStyle = `rgba(255,70,90,${(1 - r / 120) * a})`; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(antena.x, antena.y - 20, r, 0, Math.PI * 2); ctx.stroke();
      }
    }
    if (Math.sin(t * 9) > -0.3) titulo(ctx, "¡TORMENTA MAGNETICA!", "#d9a8ff", 106, 30);
    titulo(ctx, "LAS COMUNICACIONES FALLAN: ANTENA SIN SEÑAL", "#fff", 156, 15);
  }, 2.6);
}

export function fxCosecha(mundo, inv, cantidad) {
  sonido.cosecha();
  const hojas = azar(26, () => [(Math.random() - 0.5) * 130, Math.random() * 0.5, 8 + Math.random() * 8]);
  return mundo.efecto((ctx, p) => {
    for (const [dx, d, s] of hojas) {
      const k = Math.max(0, (p - d) / (1 - d));
      if (k <= 0) continue;
      ctx.fillStyle = `rgba(110,255,140,${1 - k})`;
      ctx.fillRect(Math.round(inv.x + dx), Math.round(inv.y - k * 120), s, s);
    }
    ctx.globalAlpha = Math.sin(p * Math.PI);
    ctx.font = `20px ${FUENTE}`; ctx.textAlign = "center";
    ctx.fillStyle = "#0a2a12"; ctx.fillText(`+${cantidad} COMIDA`, inv.x + 2, inv.y - 78 - p * 30 + 2);
    ctx.fillStyle = "#9dffb0"; ctx.fillText(`+${cantidad} COMIDA`, inv.x, inv.y - 78 - p * 30);
    ctx.globalAlpha = 1;
  }, 1.4);
}

// texto flotante breve (por ejemplo al cargar una caja)
export function fxTexto(mundo, x, y, texto, color = "#ffe27a") {
  return mundo.efecto((ctx, p) => {
    ctx.globalAlpha = 1 - p * p;
    ctx.font = `17px ${FUENTE}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#000"; ctx.fillText(texto, x + 2, y - p * 46 + 2);
    ctx.fillStyle = color; ctx.fillText(texto, x, y - p * 46);
    ctx.globalAlpha = 1;
  }, 1.1);
}

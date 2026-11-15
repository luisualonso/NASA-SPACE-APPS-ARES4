// Sonidos generados con Web Audio (sin archivos). Se activan con el primer clic o tecla.
let ctx = null, maestro = null, activo = true;

function listo() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    maestro = ctx.createGain();
    maestro.gain.value = 0.5;
    maestro.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return activo;
}
["pointerdown", "keydown"].forEach((ev) => window.addEventListener(ev, () => listo(), { once: false, passive: true }));

function tono(frec, dur, { tipo = "square", vol = 0.15, hasta = null, retraso = 0 } = {}) {
  if (!listo()) return;
  const t = ctx.currentTime + retraso;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(frec, t);
  if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(maestro);
  o.start(t); o.stop(t + dur + 0.02);
}

function ruido(dur, { vol = 0.2, filtro = 800, hasta = null, retraso = 0, tipo = "lowpass" } = {}) {
  if (!listo()) return;
  const t = ctx.currentTime + retraso;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.setValueAtTime(filtro, t);
  if (hasta) f.frequency.exponentialRampToValueAtTime(hasta, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(maestro);
  src.start(t);
}

let pie = 0;
export const sonido = {
  paso() { pie ^= 1; tono(pie ? 150 : 120, 0.05, { tipo: "triangle", vol: 0.1, hasta: 70 }); },
  pasoNpc() { tono(95, 0.04, { tipo: "triangle", vol: 0.025, hasta: 60 }); },
  hover() { tono(660, 0.03, { vol: 0.04 }); },
  click() { tono(520, 0.05, { vol: 0.1 }); tono(780, 0.06, { vol: 0.08, retraso: 0.04 }); },
  abrir() { tono(330, 0.06, { vol: 0.08 }); tono(495, 0.08, { vol: 0.08, retraso: 0.05 }); },
  cerrar() { tono(495, 0.05, { vol: 0.07 }); tono(330, 0.07, { vol: 0.07, retraso: 0.04 }); },
  mas() { tono(700, 0.05, { vol: 0.09, hasta: 900 }); },
  menos() { tono(500, 0.05, { vol: 0.09, hasta: 380 }); },
  agarrar() { tono(300, 0.08, { tipo: "triangle", vol: 0.16, hasta: 600 }); },
  soltar() { tono(420, 0.1, { tipo: "triangle", vol: 0.16, hasta: 160 }); ruido(0.08, { vol: 0.12, filtro: 500 }); },
  error() { tono(160, 0.16, { tipo: "sawtooth", vol: 0.12 }); tono(120, 0.2, { tipo: "sawtooth", vol: 0.12, retraso: 0.14 }); },
  ok() { [523, 659, 784].forEach((f, i) => tono(f, 0.1, { vol: 0.1, retraso: i * 0.08 })); },
  cosecha() { [659, 784, 988].forEach((f, i) => tono(f, 0.08, { tipo: "triangle", vol: 0.12, retraso: i * 0.06 })); },
  dormir() { [392, 330, 262].forEach((f, i) => tono(f, 0.22, { tipo: "triangle", vol: 0.1, retraso: i * 0.2 })); },
  alerta() { for (let i = 0; i < 4; i++) { tono(880, 0.14, { vol: 0.1, retraso: i * 0.3 }); tono(587, 0.14, { vol: 0.1, retraso: i * 0.3 + 0.15 }); } },
  impacto() { ruido(0.6, { vol: 0.35, filtro: 1800, hasta: 120 }); tono(90, 0.5, { tipo: "sawtooth", vol: 0.18, hasta: 40 }); },
  chispas() { for (let i = 0; i < 8; i++) ruido(0.05, { vol: 0.15, filtro: 3000 + Math.random() * 3000, tipo: "highpass", retraso: i * 0.11 + Math.random() * 0.05 }); },
  estatica() { ruido(1.4, { vol: 0.12, filtro: 2500, tipo: "bandpass" }); tono(200, 1.2, { tipo: "sine", vol: 0.06, hasta: 420 }); },
  escudo() { tono(440, 0.5, { tipo: "sine", vol: 0.14, hasta: 880 }); },
  cohete(dur = 4) { ruido(dur, { vol: 0.4, filtro: 300, hasta: 1400 }); tono(60, dur, { tipo: "sawtooth", vol: 0.1, hasta: 140 }); },
  victoria() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tono(f, 0.16, { vol: 0.12, retraso: i * 0.13 })); },
  derrota() { [392, 349, 311, 262].forEach((f, i) => tono(f, 0.25, { tipo: "triangle", vol: 0.12, retraso: i * 0.2 })); },
};

export function alternarSonido() { activo = !activo; if (activo) listo(); return activo; }
export const sonidoActivo = () => activo;

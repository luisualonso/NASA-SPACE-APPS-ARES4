// El mundo visto desde arriba: escenario, colisiones, jugador, tripulación, objetos y efectos.
import { IMG } from "./sprites.js";
import { sonido } from "./audio.js";

export const ANCHO = 1376, ALTO = 768;
const CELDA = 16, COLS = ANCHO / CELDA, FILAS = ALTO / CELDA;
const VEL = 250;                     // píxeles por segundo
const ALTO_PJ = 66;                  // altura con la que se dibujan los personajes
const FUENTE = '"Press Start 2P", "Courier New", monospace';

export function crearMundo(canvas, op) {
  // op: { bloqueado(), onAccion(objetivo), estado(), alerta(id), badge(id), pista(objetivo) }
  const ctx = canvas.getContext("2d");
  canvas.width = ANCHO; canvas.height = ALTO;

  let escena = null;                 // { fondo, plano, objetos: [], zonas: [] }
  const teclas = new Set();
  const jugador = personaje("jugador", 0, 0);
  let npcs = [];
  let ruta = null, objetivoRuta = null;
  let llevando = null;               // objeto (caja) que carga el jugador
  let reloj = 0, ultimo = 0, anim = null;
  let efectos = [], polvo = [], sacudida = { fuerza: 0, hasta: 0 };

  function personaje(img, x, y) {
    return { img, x, y, mira: 1, fase: Math.random() * 6, moviendo: false, ruta: null, espera: 1 + Math.random() * 2, pasoT: 0 };
  }

  // ---------- colisiones ----------
  const dentro = (r, x, y) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
  function puntoLibre(x, y, ignorar) {
    const p = escena.plano;
    if (!p.zonas.some((r) => dentro(r, x, y))) return false;
    if (p.muros.some((r) => dentro(r, x, y))) return false;
    for (const o of escena.objetos) {
      if (!o.solido || o === ignorar || o === llevando) continue;
      if (Math.hypot(x - o.x, y - o.y) < o.radio) return false;
    }
    return true;
  }
  // caja de colisión a la altura de los pies
  const libre = (x, y) => puntoLibre(x - 13, y - 8) && puntoLibre(x + 13, y - 8) && puntoLibre(x - 13, y + 4) && puntoLibre(x + 13, y + 4);

  function mover(p, dx, dy) {
    let ok = false;
    if (dx && libre(p.x + dx, p.y)) { p.x += dx; ok = true; }
    if (dy && libre(p.x, p.y + dy)) { p.y += dy; ok = true; }
    if (Math.abs(dx) > 0.01) p.mira = dx > 0 ? 1 : -1;
    return ok;
  }

  // ---------- búsqueda de camino (para el clic y la tripulación) ----------
  function buscarRuta(desde, meta) {
    // meta(cx, cy) => true cuando esa celda sirve. Devuelve lista de puntos o null.
    const idx = (c, f) => f * COLS + c;
    const c0 = Math.floor(desde.x / CELDA), f0 = Math.floor(desde.y / CELDA);
    const previo = new Int32Array(COLS * FILAS).fill(-2);
    const cola = [idx(c0, f0)];
    previo[idx(c0, f0)] = -1;
    let fin = -1;
    for (let i = 0; i < cola.length; i++) {
      const k = cola[i], c = k % COLS, f = (k - c) / COLS;
      const cx = c * CELDA + CELDA / 2, cy = f * CELDA + CELDA / 2;
      if (meta(cx, cy)) { fin = k; break; }
      for (const [dc, df] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nf = f + df;
        if (nc < 0 || nf < 0 || nc >= COLS || nf >= FILAS) continue;
        const nk = idx(nc, nf);
        if (previo[nk] !== -2) continue;
        if (!libre(nc * CELDA + CELDA / 2, nf * CELDA + CELDA / 2)) continue;
        previo[nk] = k; cola.push(nk);
      }
    }
    if (fin < 0) return null;
    const puntos = [];
    for (let k = fin; k !== -1; k = previo[k]) puntos.push({ x: (k % COLS) * CELDA + CELDA / 2, y: Math.floor(k / COLS) * CELDA + CELDA / 2 });
    puntos.reverse();
    return puntos.slice(1);
  }
  function rutaAPunto(desde, x, y) {
    // la celda alcanzable más cercana al punto
    let mejor = null, dmin = Infinity;
    buscarRuta(desde, (cx, cy) => { const d = Math.hypot(cx - x, cy - y); if (d < dmin) { dmin = d; mejor = { x: cx, y: cy }; } return false; });
    return mejor ? buscarRuta(desde, (cx, cy) => cx === mejor.x && cy === mejor.y) : null;
  }

  // ---------- interacción ----------
  const alcance = (o) => (o.radioUso ?? o.tam / 2 + 48);
  function interactuables() {
    const lista = [];
    for (const o of escena.objetos) if (o !== llevando && !o.oculto && (!llevando || o.siempre)) lista.push(o);
    for (const z of escena.zonas) lista.push(z);
    return lista;
  }
  function cercano() {
    if (!escena) return null;
    let mejor = null, dmin = Infinity;
    for (const o of interactuables()) {
      const d = Math.hypot(o.x - jugador.x, o.y - (jugador.y - 6));
      if (d < alcance(o) && d < dmin) { dmin = d; mejor = o; }
    }
    return mejor;
  }
  function accion() {
    ruta = null; objetivoRuta = null;
    op.onAccion(cercano());
  }

  // ---------- entrada ----------
  const DIRS = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };
  window.addEventListener("keydown", (e) => {
    // si una ventana ya usó esta tecla (por ejemplo E para cerrarla), no se repite la acción en el mapa
    if (!escena || e.defaultPrevented || op.bloqueado() || e.target.tagName === "INPUT") return;
    const k = e.key.toLowerCase();
    if (DIRS[k]) { teclas.add(k); ruta = null; objetivoRuta = null; e.preventDefault(); }
    else if ((k === "e" || k === " " || k === "enter") && !e.repeat) { accion(); e.preventDefault(); }
  });
  window.addEventListener("keyup", (e) => teclas.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => teclas.clear());
  canvas.addEventListener("pointerdown", (e) => {
    if (!escena || op.bloqueado()) return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (ANCHO / r.width), y = (e.clientY - r.top) * (ALTO / r.height);
    const obj = interactuables().find((o) => Math.hypot(o.x - x, o.y - y) < (o.tam ? o.tam / 2 + 8 : o.radio));
    if (obj) {
      if (cercano() === obj) { accion(); return; }
      objetivoRuta = obj;
      ruta = buscarRuta(jugador, (cx, cy) => Math.hypot(obj.x - cx, obj.y - (cy - 6)) < alcance(obj) - 14);
    } else {
      objetivoRuta = null;
      ruta = rutaAPunto(jugador, x, y);
    }
  });

  // ---------- actualización ----------
  function seguirRuta(p, vel, dt) {
    if (!p.ruta || !p.ruta.length) return false;
    const m = p.ruta[0], ex = m.x - p.x, ey = m.y - p.y, d = Math.hypot(ex, ey);
    const paso = vel * dt;
    if (d <= paso) { p.x = m.x; p.y = m.y; p.ruta.shift(); if (Math.abs(ex) > 0.5) p.mira = ex > 0 ? 1 : -1; return true; }
    p.x += (ex / d) * paso; p.y += (ey / d) * paso;
    if (Math.abs(ex) > 1) p.mira = ex > 0 ? 1 : -1;
    return true;
  }

  function actualizar(dt) {
    reloj += dt;
    const parado = op.bloqueado();
    if (parado) { teclas.clear(); ruta = null; }
    let dx = 0, dy = 0;
    for (const k of teclas) { dx += DIRS[k][0]; dy += DIRS[k][1]; }
    dx = Math.sign(dx); dy = Math.sign(dy);
    const antes = { x: jugador.x, y: jugador.y };
    if (dx || dy) {
      const n = Math.hypot(dx, dy);
      mover(jugador, (dx / n) * VEL * dt, (dy / n) * VEL * dt);
    } else if (ruta) {
      jugador.ruta = ruta;
      if (!seguirRuta(jugador, VEL, dt) || !ruta.length) {
        ruta = null;
        if (objetivoRuta && cercano() === objetivoRuta) { objetivoRuta = null; accion(); }
      }
    }
    jugador.moviendo = Math.hypot(jugador.x - antes.x, jugador.y - antes.y) > 0.3;
    animar(jugador, dt, true);

    for (const p of npcs) {
      if (parado) { p.moviendo = false; continue; }
      if (p.espera > 0) { p.espera -= dt; p.moviendo = false; animar(p, dt, false); continue; }
      if (!p.ruta || !p.ruta.length) {
        const z = escena.plano.zonas[Math.floor(Math.random() * escena.plano.zonas.length)];
        p.ruta = rutaAPunto(p, z[0] + Math.random() * (z[2] - z[0]), z[1] + Math.random() * (z[3] - z[1]));
        if (!p.ruta || !p.ruta.length) { p.espera = 1; continue; }
      }
      p.moviendo = seguirRuta(p, VEL * 0.42, dt);
      if (!p.ruta.length) p.espera = 1.5 + Math.random() * 3;
      animar(p, dt, false);
    }
    polvo = polvo.filter((d) => (d.t += dt) < d.vida);
    efectos = efectos.filter((f) => {
      if (reloj - f.t0 >= f.dur) { f.fin(); return false; }
      return true;
    });
  }

  function animar(p, dt, esJugador) {
    if (p.moviendo) {
      p.fase += dt * 13;
      p.pasoT -= dt;
      if (p.pasoT <= 0) {
        p.pasoT = esJugador ? 0.26 : 0.6;
        esJugador ? sonido.paso() : (Math.hypot(p.x - jugador.x, p.y - jugador.y) < 220 && sonido.pasoNpc());
        polvo.push({ x: p.x - p.mira * 8, y: p.y + 2, t: 0, vida: 0.35 });
      }
    } else {
      p.fase += dt * 2.2;      // respiración
    }
  }

  // ---------- dibujo ----------
  function dibujarPersonaje(p) {
    const img = IMG[p.img];
    const bote = p.moviendo ? Math.abs(Math.sin(p.fase)) * 5 : 0;
    const giro = p.moviendo ? Math.sin(p.fase) * 0.09 : 0;
    const respira = p.moviendo ? 1 : 1 + Math.sin(p.fase) * 0.015;
    // sombra
    ctx.fillStyle = "rgba(0,0,0,.32)";
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 17 - bote * 0.8, 6 - bote * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y - bote));
    ctx.rotate(giro);
    ctx.scale(p.mira, respira);
    if (img) {
      const w = ALTO_PJ * (img.width / img.height);
      ctx.drawImage(img, -w / 2, -ALTO_PJ, w, ALTO_PJ);
    } else {
      ctx.fillStyle = "#e0557a"; ctx.fillRect(-12, -40, 24, 40);
      ctx.fillStyle = "#eef"; ctx.fillRect(-13, -62, 26, 24);
    }
    ctx.restore();
    if (p === jugador && llevando) {
      const im = IMG[llevando.img], t = 50;
      const y = p.y - bote - ALTO_PJ - t + 12 + Math.sin(reloj * 6) * 1.5;
      if (im) ctx.drawImage(im, p.x - t / 2, y, t, t * (im.height / im.width));
    }
  }

  function dibujarObjeto(o) {
    const img = IMG[o.img];
    const w = o.tam, h = img ? o.tam * (img.height / img.width) : o.tam;
    if (o.tipo === "caja") {
      ctx.fillStyle = "rgba(0,0,0,.3)";
      ctx.beginPath(); ctx.ellipse(o.x, o.y + h / 2 - 4, w / 2.2, 8, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (img) ctx.drawImage(img, Math.round(o.x - w / 2), Math.round(o.y - h / 2), w, h);
    else { ctx.fillStyle = "#555c7a"; ctx.beginPath(); ctx.arc(o.x, o.y, w / 2, 0, Math.PI * 2); ctx.fill(); }
  }

  function etiqueta(texto, x, y, { fondo = "rgba(8,14,28,.86)", color = "#dff6ff", tam = 10, borde = "#3ad6c5" } = {}) {
    ctx.font = `${tam}px ${FUENTE}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const w = Math.ceil(ctx.measureText(texto).width) + 14, h = tam + 12;
    ctx.fillStyle = fondo; ctx.fillRect(Math.round(x - w / 2), Math.round(y - h / 2), w, h);
    ctx.strokeStyle = borde; ctx.lineWidth = 2; ctx.strokeRect(Math.round(x - w / 2) + 1, Math.round(y - h / 2) + 1, w - 2, h - 2);
    ctx.fillStyle = color; ctx.fillText(texto, Math.round(x), Math.round(y) + 1);
    return { w, h };
  }

  function dibujarAdornos(o, esCercano) {
    const r = o.tam / 2;
    if (o.tipo === "modulo") {
      if (op.alerta(o.id)) {
        const a = 0.45 + 0.45 * Math.sin(reloj * 8);
        ctx.strokeStyle = `rgba(255,60,80,${a})`; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(o.x, o.y, r + 4, 0, Math.PI * 2); ctx.stroke();
        if (Math.sin(reloj * 8) > 0) etiqueta("!", o.x + r - 8, o.y - r + 8, { fondo: "#ff3b4e", color: "#fff", borde: "#fff", tam: 12 });
      }
      etiqueta(o.nombre.toUpperCase(), o.x, o.y + r + 18, { tam: 14, borde: esCercano ? "#ffe27a" : "#2b7f8c", color: esCercano ? "#ffe27a" : "#bfeaf2" });
      const b = op.badge(o.id);
      if (b) etiqueta(b, o.x + r - 6, o.y + r - 16, { fondo: "#ffe27a", color: "#1b2147", borde: "#1b2147", tam: 14 });
    } else if (o.tipo === "caja" && !o.cargada) {
      etiqueta(`${o.nombre.toUpperCase()} ${o.peso}`, o.x, o.y + r + 16, { tam: 13, borde: esCercano ? "#ffe27a" : "#2b7f8c", color: esCercano ? "#ffe27a" : "#bfeaf2" });
    }
    if (esCercano) {
      const a = 0.5 + 0.4 * Math.sin(reloj * 6);
      ctx.strokeStyle = `rgba(255,226,122,${a})`; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -reloj * 30;
      ctx.beginPath(); ctx.arc(o.x, o.y, (o.tam ? r : o.radio) + 9, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function dibujarAlertaSolar(estado) {
    const cme = estado?.pendientes?.filter((p) => p.tipo === "cme").sort((a, b) => a.dia - b.dia)[0];
    if (!cme) return;
    const faltan = cme.dia - estado.dia, hoy = faltan <= 0;
    const pulso = 0.5 + 0.5 * Math.sin(reloj * (hoy ? 9 : 4));
    // luces giratorias en las esquinas
    for (const [x, y] of [[40, 40], [ANCHO - 40, 40], [40, ALTO - 40], [ANCHO - 40, ALTO - 40]]) {
      const g = ctx.createRadialGradient(x, y, 4, x, y, 150);
      g.addColorStop(0, `rgba(255,${hoy ? 70 : 150},30,${0.55 * pulso})`); g.addColorStop(1, "rgba(255,120,30,0)");
      ctx.fillStyle = g; ctx.fillRect(x - 150, y - 150, 300, 300);
      ctx.save(); ctx.translate(x, y); ctx.rotate(reloj * 4);
      ctx.fillStyle = `rgba(255,200,80,${0.25 + 0.2 * pulso})`;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 120, -0.25, 0.25); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = `rgba(255,110,30,${0.05 + 0.06 * pulso})`; ctx.fillRect(0, 0, ANCHO, ALTO);
    // letrero con franjas de peligro
    const w = 860, x = ANCHO / 2 - w / 2, y = 6, h = 50;
    ctx.fillStyle = "#1a1206"; ctx.fillRect(x, y, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, 8); ctx.rect(x, y + h - 8, w, 8); ctx.clip();
    for (let i = -40; i < w + 40; i += 28) {
      ctx.fillStyle = "#ffcc33";
      const o = (reloj * 40) % 28;
      ctx.beginPath(); ctx.moveTo(x + i + o, y); ctx.lineTo(x + i + 14 + o, y); ctx.lineTo(x + i + o, y + h); ctx.lineTo(x + i - 14 + o, y + h); ctx.fill();
    }
    ctx.restore();
    ctx.font = `17px ${FUENTE}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = hoy ? (pulso > 0.5 ? "#ff5a4e" : "#ffd27a") : "#ffd27a";
    ctx.fillText(hoy ? "¡LA NUBE SOLAR LLEGA HOY! VE AL REFUGIO" : `NUBE SOLAR: LLEGA EN ${faltan} ${faltan === 1 ? "DIA" : "DIAS"}`, ANCHO / 2, y + h / 2 + 1);
  }

  function dibujar() {
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.save();
    if (reloj < sacudida.hasta) ctx.translate((Math.random() - 0.5) * sacudida.fuerza, (Math.random() - 0.5) * sacudida.fuerza);
    const fondo = escena && IMG[escena.fondo];
    if (fondo) ctx.drawImage(fondo, 0, 0, ANCHO, ALTO);
    else { ctx.fillStyle = "#20263f"; ctx.fillRect(0, 0, ANCHO, ALTO); }
    if (!escena) { ctx.restore(); return; }

    for (const z of escena.zonas) if (z.dibujar) z.dibujar(ctx, reloj, z);
    for (const d of polvo) {
      const k = d.t / d.vida;
      ctx.fillStyle = `rgba(220,225,235,${0.4 * (1 - k)})`;
      ctx.fillRect(Math.round(d.x - 3 - k * 4), Math.round(d.y - 3 - k * 6), 6 + k * 6, 6 + k * 6);
    }
    const cerca = op.bloqueado() ? null : cercano();
    // objetos y personajes ordenados por altura para que se tapen bien
    const capas = [];
    for (const o of escena.objetos) if (o !== llevando && !o.oculto) capas.push({ y: o.y + (o.tipo === "caja" ? o.tam / 2 - 8 : o.tam * 0.36), f: () => dibujarObjeto(o) });
    for (const p of [...npcs, jugador]) capas.push({ y: p.y, f: () => dibujarPersonaje(p) });
    capas.sort((a, b) => a.y - b.y).forEach((c) => c.f());
    for (const o of escena.objetos) if (o !== llevando && !o.oculto) dibujarAdornos(o, o === cerca);
    if (cerca && !cerca.tam) dibujarAdornos(cerca, true);

    // pista de la tecla
    const texto = op.bloqueado() ? null : op.pista(cerca, llevando);
    if (texto) {
      const bx = cerca ? cerca.x : jugador.x;
      const by = cerca ? cerca.y - (cerca.tam ? cerca.tam / 2 : cerca.radio) - 26 : jugador.y - ALTO_PJ - (llevando ? 62 : 24);
      etiqueta(texto, Math.max(160, Math.min(ANCHO - 160, bx)), Math.max(60, by + Math.sin(reloj * 5) * 2), { fondo: "#ffe27a", color: "#1b2147", borde: "#1b2147", tam: 15 });
    }
    if (!efectos.length) dibujarAlertaSolar(op.estado());
    for (const f of efectos) f.dibujar(ctx, Math.min(1, (reloj - f.t0) / f.dur), reloj - f.t0);
    ctx.restore();
  }

  function ciclo(ms) {
    const dt = Math.min(0.05, (ms - ultimo) / 1000 || 0.016);
    ultimo = ms;
    if (escena) actualizar(dt);
    dibujar();
    anim = requestAnimationFrame(ciclo);
  }

  return {
    iniciar() { if (!anim) anim = requestAnimationFrame(ciclo); },
    cargarEscena(e) {
      escena = { zonas: [], objetos: [], ...e };
      llevando = null; ruta = null; efectos = []; polvo = [];
      jugador.x = e.plano.inicio.x; jugador.y = e.plano.inicio.y; jugador.mira = 1;
      npcs = (e.plano.npcs || []).map((n) => personaje(n.img, n.x, n.y));
    },
    get jugador() { return jugador; },
    get llevando() { return llevando; },
    set llevando(o) { llevando = o; },
    cercano,
    sacudir(fuerza, dur) { sacudida = { fuerza, hasta: reloj + dur }; },
    // reproduce un efecto visual: dibujar(ctx, progreso 0..1, segundos) durante dur segundos
    efecto(dibujarFx, dur) {
      return new Promise((fin) => efectos.push({ t0: reloj, dur, dibujar: dibujarFx, fin }));
    },
    depurar() {   // dibuja las zonas caminables (para revisar el plano)
      ctx.fillStyle = "rgba(0,255,120,.35)";
      for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) if (libre(c * CELDA + 8, f * CELDA + 8)) ctx.fillRect(c * CELDA, f * CELDA, CELDA, CELDA);
    },
  };
}

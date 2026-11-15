// Lógica de un día de juego. No toca la pantalla: recibe datos y devuelve mensajes.
import { REGLAS, SITIOS, energiaDisponible } from "./estado.js";
import { sortearEvento, textoEvento, danoRadiacion } from "./eventos.js";

const limitar = (x) => Math.max(0, Math.min(100, Math.round(x)));

// reparto = { soporte, invernadero, blindaje, investigacion } en puntos de energía
export function terminarDia(estado, reparto, datos) {
  const R = REGLAS;
  const mensajes = [];
  let huboRadiacion = false;

  const usados = reparto.soporte + reparto.invernadero + reparto.blindaje + reparto.investigacion;
  const sobrante = Math.max(0, energiaDisponible(estado) - usados);
  const proteccion = Math.min(100, reparto.blindaje * R.proteccionPorPunto);

  // 1) Soporte vital: lo que se produce menos lo que se consume
  estado.soporte = limitar(estado.soporte + reparto.soporte * R.soportePorPunto - R.consumoSoporte);

  // 2) Invernadero: la cosecha llega días después
  if (reparto.invernadero > 0) {
    estado.pendientes.push({
      dia: estado.dia + R.diasCrecimiento,
      tipo: "cosecha",
      cantidad: reparto.invernadero * R.comidaPorPunto,
    });
  }
  estado.comida = limitar(estado.comida - R.consumoComida);

  // 3) Investigación
  estado.ciencia += reparto.investigacion * R.cienciaPorPunto;

  // 4) Batería: lo que no se usó se guarda, con tope
  estado.bateria = Math.min(R.bateriaMax, sobrante);
  if (sobrante > R.bateriaMax) {
    mensajes.push(`Se desperdiciaron ${sobrante - R.bateriaMax} puntos de energía: la batería estaba llena.`);
  }

  // 5) Lo que estaba pendiente para hoy (cosechas, CME que llegan, respuestas de la Tierra)
  const hoy = estado.pendientes.filter((p) => p.dia === estado.dia);
  estado.pendientes = estado.pendientes.filter((p) => p.dia !== estado.dia);
  for (const p of hoy) {
    if (p.tipo === "cosecha") {
      estado.comida = limitar(estado.comida + p.cantidad);
      mensajes.push(`🌱 Cosecha lista: +${p.cantidad} de comida.`);
    } else if (p.tipo === "cme") {
      const dano = danoRadiacion(p.evento, proteccion);
      estado.salud = limitar(estado.salud - dano);
      huboRadiacion = true;
      mensajes.push(dano === 0
        ? "☀️ Llegó la nube del Sol, ¡pero el blindaje protegió a todos!"
        : `☀️ Llegó la nube del Sol. Con ${proteccion}% de blindaje, la tripulación perdió ${dano} de salud.`);
    } else if (p.tipo === "consejo") {
      mensajes.push(`📡 Control de Misión responde: "${p.texto}"`);
    }
  }

  // 6) Evento de clima espacial real (DONKI)
  const ev = sortearEvento(datos.donki, R.probabilidadEvento);
  let evento = null;
  if (ev) {
    evento = { ...ev, texto: textoEvento(ev) };
    if (ev.tipo === "CME") {
      const aviso = ev.efecto_juego?.dias_aviso ?? 2;
      estado.pendientes.push({ dia: estado.dia + aviso, tipo: "cme", evento: ev });
      mensajes.push(`⚠️ ¡Alerta! Una nube del Sol llegará en ${aviso} días. Prepara el blindaje.`);
    } else if (ev.tipo === "SEP") {
      const dano = danoRadiacion(ev, proteccion);
      estado.salud = limitar(estado.salud - dano);
      huboRadiacion = true;
      mensajes.push(`💥 Partículas solares: −${dano} de salud (blindaje: ${proteccion}%).`);
    } else if (ev.tipo === "GST") {
      estado.antenaBloqueadaDias = ev.efecto_juego?.comunicacion_bloqueada_dias ?? 1;
      mensajes.push("📵 Tormenta magnética: la antena no funciona mañana.");
    }
  }

  // 7) Recuperación si la base está bien
  if (estado.soporte > 50 && estado.comida > 50 && !huboRadiacion) {
    estado.salud = limitar(estado.salud + R.recuperacionSalud);
  }

  // 8) Tarjeta de ciencia real (OSDR) según lo que pasó hoy
  let situacion = "fin_de_dia";
  if (huboRadiacion) situacion = "evento_radiacion";
  else if (estado.salud < 60) situacion = "salud_baja";
  else if (reparto.invernadero > 0) situacion = "invernadero";
  const tarjeta = elegirTarjeta(datos.osdr, situacion);

  // 9) ¿Terminó la misión?
  revisarFin(estado);
  if (!estado.terminado) estado.dia += 1;
  if (ev?.tipo !== "GST" && estado.antenaBloqueadaDias > 0) estado.antenaBloqueadaDias -= 1;

  return { mensajes, evento, tarjeta };
}

function elegirTarjeta(osdr, situacion) {
  const opciones = osdr.filter((e) => e.aparece_cuando === situacion);
  const lista = opciones.length ? opciones : osdr;
  return lista.length ? lista[Math.floor(Math.random() * lista.length)] : null;
}

function revisarFin(estado) {
  const causas = [
    [estado.soporte <= 0, "La base se quedó sin aire y agua. El soporte vital necesita energía todos los días."],
    [estado.comida <= 0, "La tripulación se quedó sin comida. Las plantas tardan días en crecer: hay que sembrar antes de que falte."],
    [estado.salud <= 0, "La radiación enfermó a la tripulación. El blindaje protege, pero cuesta energía."],
  ];
  for (const [cond, causa] of causas) {
    if (cond) {
      estado.terminado = true;
      estado.resultado = "derrota";
      estado.causa = causa;
      return;
    }
  }
  if (estado.dia >= REGLAS.diasMision) {
    estado.terminado = true;
    estado.resultado = estado.ciencia >= SITIOS[estado.sitio].metaCiencia ? "victoria" : "parcial";
    estado.causa = estado.resultado === "victoria"
      ? "¡La tripulación sobrevivió y cumplió la meta científica!"
      : "La tripulación sobrevivió, pero no reunió suficiente ciencia. ¿Puedes investigar más sin descuidar la base?";
  }
}

// Pedir consejo a Control de Misión (con retraso según el sitio)
export function pedirConsejo(estado) {
  if (estado.antenaBloqueadaDias > 0) {
    return "📵 La antena no funciona por la tormenta magnética. Tendrás que decidir solo.";
  }
  const sitio = SITIOS[estado.sitio];
  const texto = consejo(estado);
  if (sitio.retrasoConsejoDias === 0) return `📡 Control de Misión: "${texto}"`;
  estado.pendientes.push({ dia: estado.dia + sitio.retrasoConsejoDias, tipo: "consejo", texto });
  return `📡 Mensaje enviado. ${sitio.textoRetraso}`;
}

function consejo(estado) {
  if (estado.pendientes.some((p) => p.tipo === "cme")) return "Viene una nube del Sol: pon energía en el blindaje el día que llegue.";
  if (estado.soporte < 40) return "El aire se está acabando: dale más energía al soporte vital.";
  if (estado.comida < 50) return "Siembra ya en el invernadero: la cosecha tarda en llegar.";
  if (estado.ciencia < estado.dia * 7) return "La base está estable. ¡Buen momento para investigar!";
  return "Todo va bien. Guarda algo de energía en la batería por si acaso.";
}

// Retroalimentación con datos: qué hizo bien el jugador, qué puede mejorar y por qué.
import { REGLAS, SITIOS } from "./estado.js";
import { describir } from "./eventos.js";

// Devuelve { bien: [...], mejorar: [...], noticias: [...] } para el reporte del día
export function reporteDelDia(res, estado, radiacion) {
  const bien = [], mejorar = [], noticias = [];
  const u = SITIOS[estado.sitio].unidadDia.toLowerCase();
  const f = res.estadoFinal;

  // Soporte vital
  if (res.produccionSoporte >= res.consumoSoporte) {
    bien.push(`Produjiste ${res.produccionSoporte} de aire y agua, y tu tripulación usa ${res.consumoSoporte} al día. Dato real: cada astronauta necesita unos 0.84 kg de oxígeno diarios.`);
  } else if (f.soporte < 60) {
    mejorar.push(`Produjiste ${res.produccionSoporte} de aire y agua, pero se gastan ${res.consumoSoporte} cada ${u}: bajó a ${f.soporte}. Con 4 de energía en Soporte vital se mantiene estable.`);
  }

  // Invernadero
  if (res.cosecha) noticias.push(`🌱 ¡Cosecha lista! +${res.cosecha} de comida.`);
  if (res.siembra) {
    bien.push(`Sembraste: en 2 ${u === "sol" ? "soles" : "días"} tendrás +${res.siembra} de comida. Dato real: en la Estación Espacial se han cultivado lechugas y chiles.`);
  } else if (f.comida < 60) {
    mejorar.push(`Hoy no sembraste y la comida está en ${f.comida}. La tripulación come ${REGLAS.consumoComida} al día y las plantas tardan 2 en crecer: ¡siembra antes de que falte!`);
  }

  // Radiación
  for (const g of res.golpes) {
    const evitado = g.danoTotal - g.dano;
    if (g.dano === 0) {
      bien.push(`¡Protección total! Tu blindaje de ${g.proteccion}% detuvo toda la radiación. Dato real: unos 80 cm de suelo lunar sobre el hábitat protegerían a los astronautas.`);
    } else if (g.proteccion >= 60) {
      bien.push(`Tu blindaje de ${g.proteccion}% evitó ${evitado} de daño; solo perdiste ${g.dano} de salud. ¡Prepararse funciona!`);
    } else if (g.conAviso) {
      mejorar.push(`La nube solar llegó y solo tenías ${g.proteccion}% de protección: −${g.dano} de salud. La NASA la vio salir del Sol a ${Math.round(g.ev.velocidad_km_s)} km/s y avisó con tiempo. La próxima vez, lleva energía al Refugio el día que llegue.`);
    } else {
      mejorar.push(`La lluvia de partículas llegó sin aviso y tenías ${g.proteccion}% de protección: −${g.dano} de salud. Estas partículas viajan casi a la velocidad de la luz. Guardar batería y tener algo de blindaje ayuda en días de tormenta.`);
    }
  }
  if (!res.golpes.length && res.reparto.blindaje > 0) {
    mejorar.push(`Hoy no llegó radiación y el blindaje usó ${res.reparto.blindaje} de energía. Es mejor reforzarlo el ${u} que llegue la nube solar.`);
  }

  // Energía y ciencia
  if (res.desperdicio > 0) {
    mejorar.push(`Se perdieron ${res.desperdicio} puntos de energía porque la batería estaba llena. ¡Úsalos en el laboratorio!`);
  } else if (res.guardado > 0 && !res.golpes.length) {
    bien.push(`Guardaste ${res.guardado} de energía en la batería para un ${u} difícil.`);
  }
  if (res.cienciaGanada > 0) bien.push(`Ganaste ${res.cienciaGanada} de ciencia. ¡Para eso viajamos al espacio!`);
  if (res.recuperacion) noticias.push(`❤️ Con aire y comida suficientes, la tripulación recuperó ${res.recuperacion} de salud.`);
  for (const c of res.consejos) noticias.push(`📡 Llegó la respuesta de Control de Misión: "${c}"`);
  if (res.inicioSecuencia) noticias.unshift("⚡ ¡Empieza la gran tormenta solar de mayo de 2024! Los eventos que vienen pasaron de verdad.");
  if (res.golpes.length && radiacion) {
    noticias.push(`📊 Dato real (RadLab): en la Estación Espacial la radiación cambió de ${radiacion.minimo ?? "1.7"} a ${radiacion.maximo.toFixed(1)} µGy por hora en una sola vuelta a la Tierra.`);
  }
  return { bien: bien.slice(0, 3), mejorar: mejorar.slice(0, 3), noticias, eventos: res.nuevos.map(describir) };
}

// Retroalimentación del final de la misión según el desempeño
export function reporteDeMision(estado) {
  const h = estado.historial, lineas = [];
  if (h.golpes > 0) {
    lineas.push(h.danoEvitado >= h.danoRecibido
      ? `🛡️ Tu blindaje evitó ${h.danoEvitado} de daño por radiación en ${h.golpes} ${h.golpes === 1 ? "evento" : "eventos"} solares. ¡Así se cuida a una tripulación!`
      : `🛡️ La radiación quitó ${h.danoRecibido} de salud y tu blindaje solo evitó ${h.danoEvitado}. Vigila la alerta de nube solar y refuerza el refugio ese día.`);
  }
  lineas.push(h.diasSembrados >= estado.dia / 2
    ? `🌱 Sembraste ${h.diasSembrados} veces: tu tripulación nunca pasó hambre.`
    : h.diasSembrados === 0 ? "🌱 No sembraste en el invernadero. Sembrar un poco cada día mantiene la comida estable."
    : `🌱 Sembraste solo ${h.diasSembrados} ${h.diasSembrados === 1 ? "vez" : "veces"}. Sembrar un poco cada día mantiene la comida estable.`);
  if (h.desperdicio > 0) lineas.push(`🔋 Se desperdiciaron ${h.desperdicio} puntos de energía con la batería llena. ¡Cada punto podía ser ciencia!`);
  else lineas.push("🔋 ¡No desperdiciaste nada de energía! Excelente administración.");
  lineas.push(estado.ciencia >= estado.metaCiencia
    ? `🔬 Lograste ${estado.ciencia} de ciencia (la meta era ${estado.metaCiencia}).`
    : `🔬 Lograste ${estado.ciencia} de ciencia de ${estado.metaCiencia}. Cuando la base esté estable, lleva la energía que sobre al laboratorio.`);
  return lineas;
}

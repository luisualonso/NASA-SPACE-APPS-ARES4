// Textos para niños de los estudios reales de NASA OSDR (escritos a partir de la descripción de cada estudio).
// Si data/curado/osdr.json trae "texto_nino", se usa ese; si no, se usa el de aquí.
export const TEXTOS_OSDR = {
  "OSD-772": "En la Estación Espacial cultivaron chiles. La NASA quiere que los astronautas coman verduras frescas cultivadas en el espacio.",
  "OSD-177": "En la Estación Espacial crecieron flores llamadas zinnias y algunas se enfermaron por un hongo. ¡En el invernadero hay que cuidar que las plantas estén sanas!",
  "OSD-594": "Científicos crearon un método para descubrir rápido si una planta está enferma en el espacio. ¡Así se protege la cosecha!",
  "OSD-342": "Unos ratones viajaron 33 días a la Estación Espacial y perdieron músculo y hueso. Sin gravedad, el cuerpo casi no hace esfuerzo.",
  "OSD-18": "Sin gravedad, los astronautas pueden perder entre 10 y 15% de la masa de sus huesos. Por eso hacen ejercicio todos los días.",
  "OSD-195": "Unas personas pasaron 21 días acostadas en cama para imitar la falta de gravedad. Así se estudia qué les pasa a los músculos.",
  "OSD-417": "En ratones que viajaron al espacio cambiaron las bacterias de su pancita, y eso podría estar relacionado con la pérdida de hueso.",
  "OSD-32": "Sin gravedad, los líquidos del cuerpo suben hacia la cabeza. Los científicos estudian cómo afecta eso al cerebro.",
  "OSD-253": "Unos ratones viajaron a la Estación Espacial para estudiar cómo el espacio cambia sus ritmos diarios, como la hora de dormir.",
  "OSD-278": "En el espacio, algunas bacterias se vuelven más peligrosas. ¡Por eso cuidar la salud de la tripulación es tan importante!",
  "OSD-54": "Sin gravedad, las defensas del cuerpo reaccionan distinto ante los microbios. Los científicos lo estudian para cuidar a los astronautas.",
  "OSD-73": "Científicos estudiaron cómo las partículas del espacio afectan a las células de los pulmones. Por eso el blindaje es tan importante.",
};

// Devuelve solo estudios con texto apto para niños
export function prepararOSDR(osdr) {
  const vistos = new Set();
  return osdr.map((e) => ({ ...e, texto: (e.texto_nino && e.texto_nino.trim()) || TEXTOS_OSDR[e.id] }))
    .filter((e) => e.texto && !vistos.has(e.id) && vistos.add(e.id));
}

// "¿Sabías que...?" de cada módulo (datos reales con su fuente)
export const DATOS_MODULO = {
  solar: "En el borde del cráter Shackleton, en el polo sur de la Luna, hay luz del Sol entre 80 y 90% del tiempo. ¡Por eso es un gran lugar para paneles solares!",
  soporte: "Cada astronauta necesita unos 0.84 kg de oxígeno y al menos 2.5 litros de agua al día (NASA).",
  invernadero: "En la Estación Espacial ya se cultivaron lechugas y chiles. ¡Las plantas tardan en crecer, igual que aquí!",
  refugio: "En la superficie de la Luna se midieron 1,369 microsieverts de radiación al día: unas 2.6 veces más que en la Estación Espacial.",
  laboratorio: "Los astronautas hacen ciencia que los robots no pueden: observan, piensan y resuelven problemas en el momento.",
  antena: "Una señal de radio tarda 1.3 segundos en llegar de la Luna a la Tierra, y entre 3 y 22 minutos desde Marte.",
  dormitorio: "Dormir bien es parte de la misión: el espacio cambia los ritmos de sueño y los científicos lo estudian.",
};

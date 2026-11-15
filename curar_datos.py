"""
Convierte los archivos de data/crudo/ en archivos pequeños y listos para el juego en data/curado/.
Uso:
    python curar_datos.py

Genera:
    data/curado/donki.json      eventos de clima espacial (CME, SEP y GST) con campos para el juego
    data/curado/imagenes.json   imágenes de APOD sin copyright, para fondos
    data/curado/osdr.json       los 3 estudios más relevantes por tema
    data/curado/radiacion.json  promedio y máximo de dosis en la ISS (RadLab)

Después de correrlo, el equipo debe:
    - escribir "texto_nino" en cada evento y estudio (lenguaje sencillo)
    - ajustar "efecto_juego" (es decisión de diseño, no dato de la NASA)
    - borrar lo que no se use; mejor 10 eventos buenos que 50 sin revisar
"""
import json
from pathlib import Path
from statistics import mean

CRUDO = Path("data/crudo")
CURADO = Path("data/curado")
CURADO.mkdir(parents=True, exist_ok=True)


def leer(nombre):
    ruta = CRUDO / nombre
    if not ruta.exists():
        print(f"  (no existe {nombre}, se omite)")
        return None
    return json.loads(ruta.read_text(encoding="utf-8"))


def escribir(nombre, datos):
    (CURADO / nombre).write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  OK  curado/{nombre}: {len(datos) if isinstance(datos, list) else 1} registros")


def velocidad_cme(ev):
    for analisis in ev.get("cmeAnalyses") or []:
        if analisis.get("speed"):
            return analisis["speed"]
    return None


UA_KM = 1.496e8          # distancia Sol-Tierra/Luna
DANO = {"baja": -10, "media": -20, "alta": -35}


def dias_de_aviso(vel):
    """Tiempo de viaje de la CME = distancia / velocidad (aprox.; las CME se frenan en el camino)."""
    if not vel:
        return 2
    return max(1, min(4, round(UA_KM / vel / 86400)))


def curar_donki():
    eventos = []
    for ev in leer("donki_cme_historico.json") or []:
        vel = velocidad_cme(ev)
        eventos.append({
            "id": ev.get("activityID"),
            "tipo": "CME",
            "fecha": (ev.get("startTime") or "")[:10],
            "velocidad_km_s": vel,
            "intensidad": (inten := "alta" if vel and vel >= 1000 else "media" if vel and vel >= 500 else "baja"),
            "efecto_juego": {"salud": DANO[inten], "dias_aviso": dias_de_aviso(vel)},
            "texto_nino": "",
            "fuente": "NASA DONKI (CCMC)",
            "url": ev.get("link"),
        })
    for ev in leer("donki_sep_historico.json") or []:
        eventos.append({
            "id": ev.get("sepID"),
            "tipo": "SEP",
            "fecha": (ev.get("eventTime") or "")[:10],
            "intensidad": "alta",
            "efecto_juego": {"salud": -25, "dias_aviso": 0},
            "texto_nino": "",
            "fuente": "NASA DONKI (CCMC)",
            "url": ev.get("link"),
        })
    for ev in leer("donki_gst_historico.json") or []:
        kps = [k.get("kpIndex") for k in ev.get("allKpIndex") or [] if k.get("kpIndex") is not None]
        kp = max(kps) if kps else None
        eventos.append({
            "id": ev.get("gstID"),
            "tipo": "GST",
            "fecha": (ev.get("startTime") or "")[:10],
            "kp_max": kp,
            "intensidad": "alta" if kp and kp >= 8 else "media" if kp and kp >= 6 else "baja",
            "efecto_juego": {"comunicacion_bloqueada_dias": 2 if kp and kp >= 8 else 1},
            "texto_nino": "",
            "fuente": "NASA DONKI (CCMC)",
            "url": ev.get("link"),
        })
    eventos.sort(key=lambda e: e["fecha"])
    escribir("donki.json", eventos)


def curar_clima_reciente():
    """Resumen de los últimos 30 días para la pantalla de inicio (NO es en vivo: tiene fecha de descarga)."""
    cme = leer("donki_cme_ultimos30dias.json") or []
    sep = leer("donki_sep_ultimos30dias.json") or []
    gst = leer("donki_gst_ultimos30dias.json") or []
    vels = [v for v in (velocidad_cme(e) for e in cme) if v]
    rapidas = sum(v >= 1000 for v in vels)
    nivel = "extremo" if sep or rapidas >= 5 else "activo" if rapidas or gst else "tranquilo"
    fechas = sorted((e.get("startTime") or "")[:10] for e in cme if e.get("startTime"))
    escribir("clima_reciente.json", {
        "desde": fechas[0] if fechas else None,
        "hasta": fechas[-1] if fechas else None,
        "cme": len(cme),
        "cme_rapidas": rapidas,
        "velocidad_media_km_s": round(sum(vels) / len(vels)) if vels else None,
        "sep": len(sep),
        "gst": len(gst),
        "nivel": nivel,
        "fuente": "NASA DONKI (CCMC)",
    })


def curar_apod():
    imagenes = []
    for img in leer("apod.json") or []:
        # Solo imágenes sin "copyright": esas son de la NASA y de uso libre.
        if img.get("media_type") != "image" or img.get("copyright"):
            continue
        imagenes.append({
            "titulo": img.get("title"),
            "fecha": img.get("date"),
            "url": img.get("url"),
            "uso": "",
            "fuente": "NASA APOD",
        })
    escribir("imagenes.json", imagenes)


def curar_osdr():
    temas = {
        "bone_loss": ("huesos", "salud_baja"),
        "muscle": ("músculos", "salud_baja"),
        "radiation": ("radiación", "evento_radiacion"),
        "plant": ("plantas", "invernadero"),
        "sleep": ("sueño", "fin_de_dia"),
        "immune": ("defensas", "salud_baja"),
    }
    estudios = []
    vistos = set()
    for archivo, (tema, cuando) in temas.items():
        datos = leer(f"osdr_{archivo}.json")
        if not datos:
            continue
        hits = datos.get("hits", {}).get("hits", [])[:3]
        for hit in hits:
            s = hit.get("_source", {})
            acc = s.get("Accession", "")
            if acc in vistos:
                continue
            vistos.add(acc)
            mision = s.get("Mission") or {}
            estudios.append({
                "id": acc,
                "tema": tema,
                "titulo": s.get("Study Title", ""),
                "organismo": s.get("Organism", ""),
                "mision": mision.get("Name", "") if isinstance(mision, dict) else str(mision),
                "descripcion_original": (s.get("Study Description") or "")[:600],
                "texto_nino": "",
                "aparece_cuando": cuando,
                "fuente": "NASA OSDR",
                "url": f"https://osdr.nasa.gov/bio/repo/data/studies/{acc}" if acc else "",
            })
    escribir("osdr.json", estudios)


CLAVE_DOSIS = "absorbed_dose_rate"


def a_numero(v, destino):
    try:
        x = float(v)
        if x == x:  # descarta NaN
            destino.append(x)
    except (TypeError, ValueError):
        pass


def buscar_dosis(obj, destino):
    """Busca la columna de dosis sin importar el formato del JSON (filas, columnas o tabla)."""
    if isinstance(obj, dict):
        # Formato tabla: {"columns": [...], "data": [[...], ...]}
        if "columns" in obj and "data" in obj and isinstance(obj["data"], list):
            idx = [i for i, c in enumerate(obj["columns"]) if CLAVE_DOSIS in str(c).lower()]
            for fila in obj["data"]:
                if idx and isinstance(fila, list) and len(fila) > idx[0]:
                    a_numero(fila[idx[0]], destino)
            if destino:
                return
        for k, v in obj.items():
            if CLAVE_DOSIS in str(k).lower():
                if isinstance(v, list):
                    for x in v:
                        a_numero(x, destino)
                elif isinstance(v, dict):
                    for x in v.values():
                        a_numero(x, destino)
                else:
                    a_numero(v, destino)
            elif isinstance(v, (dict, list)):
                buscar_dosis(v, destino)
    elif isinstance(obj, list) and obj:
        # Formato tabla con encabezado en la primera fila
        if isinstance(obj[0], list):
            idx = [i for i, c in enumerate(obj[0]) if CLAVE_DOSIS in str(c).lower()]
            if idx:
                for fila in obj[1:]:
                    if len(fila) > idx[0]:
                        a_numero(fila[idx[0]], destino)
                return
        for x in obj:
            buscar_dosis(x, destino)


def curar_radlab():
    datos = leer("radlab_iss_dostel.json")
    if datos is None:
        return
    valores = []
    buscar_dosis(datos, valores)
    if not valores:
        print("  RadLab: no encontré valores de dosis. Así empieza el archivo:")
        print("  " + json.dumps(datos, ensure_ascii=False)[:600])
        return
    escribir("radiacion.json", {
        "lugar": "Estación Espacial Internacional (instrumento DosTel)",
        "unidad": "µGy/hora",
        "promedio": round(mean(valores), 3),
        "maximo": round(max(valores), 3),
        "mediciones": len(valores),
        "texto_nino": "",
        "fuente": "NASA OSDR RadLab",
        "url": "https://visualization.osdr.nasa.gov/radlab/gui/data-api/",
    })


if __name__ == "__main__":
    print("DONKI");     curar_donki(); curar_clima_reciente()
    print("OSDR");      curar_osdr()
    print("RadLab");    curar_radlab()
    print("APOD");      curar_apod()
    print("\nListo. Ahora escriban 'texto_nino' en data/curado/ y revisen 'efecto_juego'.")
"""
Descarga los datos de la NASA para "Base Artemis Junior" y los deja en data/crudo/.
Uso:
    pip install requests
    set NASA_API_KEY=tu_llave        (Windows)   |   export NASA_API_KEY=tu_llave  (Mac/Linux)
    python descargar_datos.py

Genera:
    data/crudo/*.json        respuestas tal cual de cada API (no se editan)
    data/fuentes.json        lista de fuentes: URL (sin llave), fecha de consulta, archivo
    data/crudo/donki_resumen.csv   tabla corta de eventos para elegir cuáles usar en el juego
"""
import csv
import json
import os
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import requests

API_KEY = os.environ.get("NASA_API_KEY", "DEMO_KEY")
CRUDO = Path("data/crudo")
CRUDO.mkdir(parents=True, exist_ok=True)
FUENTES = []

# Periodo histórico con mucha actividad solar (ajústenlo si quieren otros eventos)
HIST_INICIO, HIST_FIN = "2024-05-01", "2024-05-31"
HOY = date.today()
RECIENTE_INICIO, RECIENTE_FIN = (HOY - timedelta(days=30)).isoformat(), HOY.isoformat()

OSDR_TEMAS = ["bone loss", "muscle", "radiation", "plant", "sleep", "immune"]


def guardar(nombre, datos, url, fuente):
    ruta = CRUDO / f"{nombre}.json"
    ruta.write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8")
    FUENTES.append({
        "fuente": fuente,
        "url": url.replace(API_KEY, "TU_LLAVE"),
        "consultado": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "archivo": str(ruta),
    })
    n = len(datos) if isinstance(datos, list) else 1
    print(f"  OK  {nombre}: {n} registros")


def pedir(url, intentos=3):
    for i in range(intentos):
        try:
            r = requests.get(url, timeout=60)
            if r.status_code == 200:
                return r.json() if r.text.strip() else []
            print(f"  ... {r.status_code} en {url.split('?')[0]}, reintento {i + 1}")
        except (requests.RequestException, ValueError) as e:
            print(f"  ... error {type(e).__name__}, reintento {i + 1}")
        time.sleep(3)
    return None


def donki(tipo, inicio, fin, etiqueta):
    """Intenta api.nasa.gov y, si falla, el servidor directo de CCMC (sin llave)."""
    urls = [
        f"https://api.nasa.gov/DONKI/{tipo}?startDate={inicio}&endDate={fin}&api_key={API_KEY}",
        f"https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/{tipo}?startDate={inicio}&endDate={fin}",
    ]
    for url in urls:
        datos = pedir(url)
        if datos is not None:
            guardar(f"donki_{tipo.lower()}_{etiqueta}", datos, url, "NASA DONKI (CCMC)")
            return datos
    print(f"  FALLO DONKI {tipo} {etiqueta}")
    return []


def resumen_donki(eventos):
    filas = []
    for tipo, lista in eventos.items():
        for ev in lista or []:
            filas.append({
                "tipo": tipo,
                "fecha": ev.get("startTime") or ev.get("beginTime") or ev.get("eventTime") or "",
                "clase": ev.get("classType", ""),
                "id": ev.get("activityID") or ev.get("flrID") or ev.get("sepID") or ev.get("gstID") or "",
                "enlace": ev.get("link", ""),
            })
    filas.sort(key=lambda f: f["fecha"])
    with open(CRUDO / "donki_resumen.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["tipo", "fecha", "clase", "id", "enlace"])
        w.writeheader()
        w.writerows(filas)
    print(f"  OK  donki_resumen.csv: {len(filas)} eventos")


def main():
    print("1) DONKI histórico y reciente")
    historico = {}
    for tipo in ["CME", "FLR", "SEP", "GST"]:
        historico[tipo] = donki(tipo, HIST_INICIO, HIST_FIN, "historico")
        donki(tipo, RECIENTE_INICIO, RECIENTE_FIN, "ultimos30dias")
    resumen_donki(historico)

    print("2) OSDR: estudios por tema")
    for tema in OSDR_TEMAS:
        url = f"https://osdr.nasa.gov/osdr/data/search?term={tema.replace(' ', '%20')}&type=cgene&size=10"
        datos = pedir(url)
        if datos is not None:
            guardar(f"osdr_{tema.replace(' ', '_')}", datos, url, "NASA OSDR")

    print("3) RadLab: dosis de radiación en la ISS")
    url = ("https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel"
           "&timestamp%3E=2022-04-01T23%3A00&timestamp%3C2022-04-02T01%3A05"
           "&absorbed_dose_rate&format=json")
    datos = pedir(url)
    if datos is not None:
        guardar("radlab_iss_dostel", datos, url, "NASA OSDR RadLab")

    print("4) APOD: imágenes reales para fondos")
    url = f"https://api.nasa.gov/planetary/apod?count=8&api_key={API_KEY}"
    datos = pedir(url)
    if datos is not None:
        guardar("apod", datos, url, "NASA APOD")

    # Fuentes que se consultan a mano (no se descargan): se registran para citarlas
    for nombre, url in [
        ("NASA Mars Trek", "https://trek.nasa.gov/mars/"),
        ("CSA: Producción de alimentos en la Luna", "https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/"),
        ("CSA: Recursos STEM", "https://www.asc-csa.gc.ca/eng/youth-educators/resources-stem-and-youth-organizations.asp"),
    ]:
        FUENTES.append({"fuente": nombre, "url": url, "consultado": "manual", "archivo": None})

    Path("data/fuentes.json").write_text(json.dumps(FUENTES, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nListo: {len(FUENTES)} fuentes registradas en data/fuentes.json")


if __name__ == "__main__":
    main()
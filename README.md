# Base Ares Junior
Juego educativo para niños de 7 a 12 años: administra una base lunar con datos reales de la NASA.

## Datos
- data/crudo/: respuestas originales de las APIs de la NASA (no editar)
- data/curado/: datos listos para el juego
- data/fuentes.json: lista de fuentes

## Cómo actualizar los datos
1. $env:NASA_API_KEY="GNF6zjKW8czgN9QHggNHLQHn9pwQMhPtNGdQrBth"
2. python data.py
3. python curar_datos.py

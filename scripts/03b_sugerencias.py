"""
Sugerencias de calles para el autocompletado (el navegador las carga al enfocar la dirección).

Entrada:  data/processed/geocoder.sqlite (scripts/03_callejero.py) y seccion_barrio.json
Salida:   data/processed/viales_sugerencias.json   [[«Calle Alcala», «044»], …]
          ordenado de más a menos portales; el segundo valor es el código del barrio donde la vía
          tiene más secciones (empate: la primera).
Los nombres son los oficiales de CartoCiudad (sin tildes). No lleva ids ni portales.
"""
import json
import sqlite3
from collections import Counter

from comun import PROCESSED

con = sqlite3.connect(PROCESSED / "geocoder.sqlite")
secciones = json.loads((PROCESSED / "seccion_barrio.json").read_text(encoding="utf-8"))["secciones"]

salida = []
sin_barrio = 0
for visible, cusecs in con.execute("SELECT visible, cusecs FROM viales ORDER BY n_portales DESC, id"):
    cuenta = Counter(secciones[c] for c in json.loads(cusecs) if c in secciones)
    if not cuenta:
        sin_barrio += 1
        continue
    # most_common respeta el orden de inserción en los empates: la primera sección gana
    salida.append([visible, cuenta.most_common(1)[0][0]])

ruta = PROCESSED / "viales_sugerencias.json"
ruta.write_text(json.dumps(salida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"{len(salida)} vías → {ruta} ({ruta.stat().st_size / 1e3:.0f} kB); sin barrio: {sin_barrio}")

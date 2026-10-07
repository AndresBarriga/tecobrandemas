"""
Sugerencias de calles para el autocompletado (el navegador las carga al enfocar la dirección).

Entrada:  data/processed/geocoder.sqlite (scripts/03_callejero.py), seccion_barrio.json y, para el código
          postal, data/raw/cartociudad/madrid.gpkg (capa portalpk_publi; lleva cod_postal en todos los portales)
Salida:   data/processed/viales_sugerencias.json   [[«Calle Alcala», «044», «28009», «28028,28027»], …]
          ordenado de más a menos portales; el segundo valor es el código del barrio donde la vía
          tiene más secciones (empate: la primera); el tercero, el código postal más frecuente de
          sus portales y el cuarto (solo si los hay) los demás, para buscar una calle por código postal.
          data/processed/viales_portales.json       {«Calle Alcala»: [[«044», «28009», «2-100,1-99»], …], …}
          por vía, los grupos (barrio, código postal) de sus portales con sus números en rangos
          (a-b = del a al b de dos en dos); el primer grupo es el más numeroso. Solo se descarga al
          escribir un número de portal. Sirve para decir si existe el portal y qué código postal tiene.
          data/processed/viales_zonas.json          {«Calle Alcala»: [cusec, …], …}
          las zonas por las que pasa cada vía; solo la carga /mapa, al elegir una calle.
Los nombres son los oficiales de CartoCiudad (sin tildes). No lleva ids ni portales.
"""
import json
import sqlite3
from collections import Counter, defaultdict

from comun import CARTOCIUDAD_DIR, PROCESSED


def rangos(numeros) -> str:
    """Números en rangos «a-b» de dos en dos (misma paridad), pares e impares por separado: [1, 3, 5, 8] → «8,1-5»"""
    salida = []
    for paridad in (0, 1):
        n = sorted({x for x in numeros if x % 2 == paridad})
        i = 0
        while i < len(n):
            j = i
            while j + 1 < len(n) and n[j + 1] == n[j] + 2:
                j += 1
            salida.append(str(n[i]) if i == j else f"{n[i]}-{n[j]}")
            i = j + 1
    return ",".join(salida)


gpkg = CARTOCIUDAD_DIR / "madrid.gpkg"
if not gpkg.exists():
    raise SystemExit(f"Falta {gpkg}: hace falta para el código postal (ver scripts/00_descargar.py)")
# El GeoPackage es SQLite: no hace falta geopandas para leer una columna
postal: dict[tuple[str, str, int, str], str] = {}
for tv, nv, num, ext, cp in sqlite3.connect(gpkg).execute(
    "SELECT tipo_vial, nombre_via, numero, extension, cod_postal FROM portalpk_publi WHERE ine_mun='28079' AND tipo='Portal'"
):
    try:
        postal.setdefault((tv, nv, int(num), (ext or "").strip().upper()), cp)
    except (TypeError, ValueError):
        pass

con = sqlite3.connect(PROCESSED / "geocoder.sqlite")
secciones = json.loads((PROCESSED / "seccion_barrio.json").read_text(encoding="utf-8"))["secciones"]

salida = []
portales_por_via: dict[str, list] = {}
zonas_por_via: dict[str, list[str]] = {}
sin_barrio = 0
sin_cp = 0
for vid, tipo, nombre, visible, cusecs in con.execute("SELECT id, tipo, nombre, visible, cusecs FROM viales ORDER BY n_portales DESC, id").fetchall():
    cuenta = Counter(secciones[c] for c in json.loads(cusecs) if c in secciones)
    if not cuenta:
        sin_barrio += 1
        continue
    # Grupos (barrio, código postal) con sus números de portal
    grupos: dict[tuple[str, str], list[int]] = defaultdict(list)
    for numero, extension, cusec in con.execute("SELECT numero, extension, cusec FROM portales WHERE vial_id = ?", (vid,)):
        cp = postal.get((tipo, nombre, numero, extension))
        if cp and cusec in secciones:
            grupos[(secciones[cusec], cp)].append(numero)
    ordenados = sorted(grupos.items(), key=lambda kv: -len(kv[1]))
    cps = Counter()
    for (_, cp), nums in grupos.items():
        cps[cp] += len(nums)
    if not cps:
        sin_cp += 1
    cps_orden = [c for c, _ in cps.most_common()]
    # most_common respeta el orden de inserción en los empates: la primera sección gana
    fila = [visible, cuenta.most_common(1)[0][0], cps_orden[0] if cps_orden else ""]
    if len(cps_orden) > 1:
        fila.append(",".join(cps_orden[1:]))
    salida.append(fila)
    if ordenados:
        portales_por_via[visible] = [[b, cp, rangos(nums)] for (b, cp), nums in ordenados]
    propias = zonas_por_via.setdefault(visible, [])
    propias.extend(c for c in json.loads(cusecs) if c in secciones and c not in propias)

ruta = PROCESSED / "viales_sugerencias.json"
ruta.write_text(json.dumps(salida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"{len(salida)} vías → {ruta} ({ruta.stat().st_size / 1e3:.0f} kB); sin barrio: {sin_barrio}; sin código postal: {sin_cp}")

ruta_portales = PROCESSED / "viales_portales.json"
ruta_portales.write_text(json.dumps(portales_por_via, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"{len(portales_por_via)} vías → {ruta_portales} ({ruta_portales.stat().st_size / 1e3:.0f} kB)")

ruta_zonas = PROCESSED / "viales_zonas.json"
ruta_zonas.write_text(json.dumps(zonas_por_via, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"{len(zonas_por_via)} vías → {ruta_zonas} ({ruta_zonas.stat().st_size / 1e3:.0f} kB)")

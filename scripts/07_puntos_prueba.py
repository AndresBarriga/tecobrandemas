"""Genera tests/fixtures/puntos_pip.csv: 1.000 puntos aleatorios en el entorno de Madrid con
la sección que los contiene y las secciones a ≤150 m, calculadas con los polígonos a
precisión completa (EPSG:25830). Sirven para validar el punto-en-polígono y las distancias
que hace el navegador sobre el TopoJSON cuantizado.

Columnas: id, lon, lat, cusec (vacío si cae fuera del municipio),
          cercanas («cusec:metros|…», ordenadas por distancia)
Semilla fija. Uso: .venv/bin/python scripts/07_puntos_prueba.py
"""

import csv
import random

import geopandas as gpd
from shapely.geometry import Point

from comun import CRS_METRICO, FIXTURES, leer_secciones

random.seed(2026)
N = 1000
RADIO_M = 150


def main():
    secciones = leer_secciones()
    madrid = secciones.union_all()
    minx, miny, maxx, maxy = madrid.bounds

    # 90 % dentro del municipio, 10 % en cualquier punto del rectángulo (prueba «fuera»)
    puntos = []
    while len(puntos) < N:
        p = Point(random.uniform(minx, maxx), random.uniform(miny, maxy))
        if len(puntos) < N * 0.9 and not madrid.contains(p):
            continue
        puntos.append(p)

    gdf = gpd.GeoDataFrame(geometry=puntos, crs=CRS_METRICO)
    contiene = gpd.sjoin(gdf, secciones, how="left", predicate="within")
    contiene = contiene[~contiene.index.duplicated()]
    wgs = gdf.to_crs("EPSG:4326")
    sindex = secciones.sindex

    filas = []
    for i, p in enumerate(puntos):
        idx = sindex.query(p, predicate="dwithin", distance=RADIO_M)
        cerca = sorted(
            ((secciones.iloc[j]["CUSEC"], secciones.geometry.iloc[j].distance(p)) for j in idx),
            key=lambda x: x[1],
        )
        cusec = contiene.loc[i, "CUSEC"]
        filas.append({
            "id": f"P{i + 1:04d}",
            "lon": round(wgs.geometry.iloc[i].x, 7),
            "lat": round(wgs.geometry.iloc[i].y, 7),
            "cusec": "" if isinstance(cusec, float) else cusec,
            "cercanas": "|".join(f"{c}:{d:.1f}" for c, d in cerca),
        })

    destino = FIXTURES / "puntos_pip.csv"
    with open(destino, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0]), lineterminator="\n")
        w.writeheader()
        w.writerows(filas)
    fuera = sum(1 for f in filas if not f["cusec"])
    print(f"  → {destino} ({len(filas)} puntos, {fuera} fuera de polígono)")


if __name__ == "__main__":
    main()

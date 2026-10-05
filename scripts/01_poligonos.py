"""Polígonos de las secciones censales de Madrid (Censo 2021) y su relación con los barrios.

Salidas en data/processed/:
  secciones_madrid.topo.json  polígonos en EPSG:4326 (TopoJSON cuantizado) con cusec y
                              centroide; los usan el pin, «Tu zona» y «Aquí estarías dentro»
  seccion_barrio.json         cusec → código de barrio (mayor área de intersección) y
                              catálogo de los 131 barrios
  vecinas.json                por sección, las secciones a ≤150 m (distancia entre
                              polígonos, en metros) para la horquilla del pin

Uso: .venv/bin/python scripts/01_poligonos.py
"""

import subprocess
import tempfile
from pathlib import Path

import geopandas as gpd

from comun import BARRIOS_ZIP, CRS_METRICO, PROCESSED, RAIZ, escribir_json, leer_secciones

RADIO_VECINAS_M = 150


def leer_barrios() -> gpd.GeoDataFrame:
    b = gpd.read_file(f"zip://{BARRIOS_ZIP}!BARRIOS.shp").to_crs(CRS_METRICO)
    b["geometry"] = b.geometry.make_valid()
    return b[["COD_BAR", "NOMBRE", "CODDIS", "NOMDIS", "geometry"]]


def asignar_barrios(secciones, barrios):
    """Cada sección va al barrio con el que comparte más superficie."""
    cruce = gpd.overlay(
        secciones[["CUSEC", "geometry"]], barrios[["COD_BAR", "geometry"]], how="intersection",
        keep_geom_type=True,
    )
    cruce["area"] = cruce.geometry.area
    cruce = cruce.sort_values("area", ascending=False).drop_duplicates("CUSEC")
    area_seccion = secciones.set_index("CUSEC").geometry.area
    cruce["cuota"] = cruce["area"] / cruce["CUSEC"].map(area_seccion)

    dudosas = cruce[cruce["cuota"] < 0.9]
    print(f"  secciones repartidas entre barrios (<90% en el principal): {len(dudosas)}")

    catalogo = {
        str(r.COD_BAR): {"nombre": r.NOMBRE, "cod_distrito": str(r.CODDIS).zfill(2), "distrito": r.NOMDIS}
        for r in barrios.itertuples()
    }
    asignacion = dict(zip(cruce["CUSEC"], cruce["COD_BAR"].astype(str)))
    sin_barrio = set(secciones["CUSEC"]) - set(asignacion)
    if sin_barrio:
        raise SystemExit(f"Secciones sin barrio: {sorted(sin_barrio)}")
    return {"barrios": catalogo, "secciones": dict(sorted(asignacion.items()))}


def calcular_vecinas(secciones):
    geoms = secciones.geometry.values
    cusecs = secciones["CUSEC"].values
    izq, der = secciones.sindex.query(geoms, predicate="dwithin", distance=RADIO_VECINAS_M)
    vecinas = {c: {} for c in cusecs}
    for i, j in zip(izq, der):
        if i == j:
            continue
        vecinas[cusecs[i]][cusecs[j]] = round(float(geoms[i].distance(geoms[j])))
    return {c: dict(sorted(v.items(), key=lambda kv: kv[1])) for c, v in sorted(vecinas.items())}


def exportar_topojson(secciones):
    wgs = secciones[["CUSEC", "geometry"]].copy()
    # Centroide calculado en metros y pasado a grados: lo usan las distancias de «Tu zona»
    centroides = secciones.geometry.representative_point().to_crs("EPSG:4326")
    wgs["cx"] = centroides.x.round(5)
    wgs["cy"] = centroides.y.round(5)
    wgs = wgs.rename(columns={"CUSEC": "cusec"}).to_crs("EPSG:4326")

    destino = PROCESSED / "secciones_madrid.topo.json"
    with tempfile.TemporaryDirectory() as tmp:
        geojson = Path(tmp) / "secciones.geojson"
        wgs.to_file(geojson, driver="GeoJSON")
        subprocess.run(
            [
                "npx", "--yes", "mapshaper@0.6", str(geojson),
                "-rename-layers", "secciones",
                "-o", str(destino), "format=topojson", "quantization=100000",
            ],
            check=True, cwd=RAIZ,
        )
    print(f"  → {destino.relative_to(RAIZ)} ({destino.stat().st_size / 1024:.0f} KB)")


def main():
    secciones = leer_secciones()
    barrios = leer_barrios()
    print(f"Secciones de Madrid: {len(secciones)} · barrios: {len(barrios)}")

    escribir_json(PROCESSED / "seccion_barrio.json", asignar_barrios(secciones, barrios))
    escribir_json(PROCESSED / "vecinas.json", calcular_vecinas(secciones))
    exportar_topojson(secciones)


if __name__ == "__main__":
    main()

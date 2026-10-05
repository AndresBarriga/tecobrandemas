"""Callejero de Madrid para el geocodificador propio, a partir del GeoPackage de CartoCiudad.

El GeoPackage provincial trae portales (capa portalpk_publi) pero no viales: los viales
se derivan agrupando los portales por tipo y nombre de vía. La sección censal de cada
portal se calcula aquí, con los polígonos a precisión completa, para que el Worker no
tenga que hacer punto-en-polígono.

Salidas en data/processed/:
  geocoder.sqlite             viales(id, tipo, nombre, nombre_norm, n_portales, num_min,
                              num_max, cusecs) y portales(vial_id, numero, extension,
                              lon, lat, cusec). Se sube a D1; no va a git
  viales_autocompletar.json   [[id, «Calle Peña Pintada»], …] para las sugerencias

Requiere data/raw/cartociudad/madrid.gpkg (paso manual, ver scripts/00_descargar.py).
Uso: .venv/bin/python scripts/03_callejero.py
"""

import json
import re
import sqlite3
import unicodedata

import geopandas as gpd
import pandas as pd

from comun import CARTOCIUDAD_DIR, CRS_METRICO, CUMUN_MADRID, PROCESSED, escribir_json, leer_secciones

# Portales que caen fuera de todo polígono (bordes, ríos) se asignan a la sección más
# cercana si está a menos de esta distancia
TOLERANCIA_FUERA_M = 50

PARTICULAS = {"de", "del", "la", "las", "los", "el", "y"}


def normalizar(texto: str) -> str:
    """Minúsculas, sin tildes (ñ → n), sin signos y sin partículas.

    El geocodificador del Worker aplica la misma normalización a lo que teclea el usuario.
    """
    t = unicodedata.normalize("NFD", texto.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    t = re.sub(r"[^a-z0-9 ]", " ", t)
    return " ".join(p for p in t.split() if p not in PARTICULAS)


def nombre_visible(tipo: str, nombre: str) -> str:
    palabras = f"{tipo} {nombre}".lower().split()
    return " ".join(p if p in PARTICULAS and i > 0 else p.capitalize() for i, p in enumerate(palabras))


def leer_portales() -> gpd.GeoDataFrame:
    gpkg = CARTOCIUDAD_DIR / "madrid.gpkg"
    if not gpkg.exists():
        raise SystemExit(f"Falta {gpkg}: ver las instrucciones de scripts/00_descargar.py")
    p = gpd.read_file(
        gpkg, layer="portalpk_publi", where=f"ine_mun='{CUMUN_MADRID}' AND tipo='Portal'",
        columns=["tipo_vial", "nombre_via", "numero", "extension"],
    )
    p["numero"] = pd.to_numeric(p["numero"], errors="coerce")
    sin_numero = p["numero"].isna().sum()
    if sin_numero:
        print(f"  portales con número no numérico (descartados): {sin_numero}")
    p = p.dropna(subset=["numero", "nombre_via", "tipo_vial"])
    p["numero"] = p["numero"].astype(int)
    p["extension"] = p["extension"].fillna("").str.strip().str.upper()
    return p.to_crs(CRS_METRICO)


def asignar_seccion(portales, secciones):
    dentro = gpd.sjoin(portales, secciones, how="left", predicate="within")
    dentro = dentro[~dentro.index.duplicated()]
    portales["cusec"] = dentro["CUSEC"]

    fuera = portales[portales["cusec"].isna()]
    if len(fuera):
        cercanas = gpd.sjoin_nearest(fuera[["geometry"]], secciones, how="left", max_distance=TOLERANCIA_FUERA_M)
        cercanas = cercanas[~cercanas.index.duplicated()]
        portales.loc[cercanas.index, "cusec"] = cercanas["CUSEC"]
        print(f"  portales fuera de polígono: {len(fuera)} · recuperados a ≤{TOLERANCIA_FUERA_M} m: {cercanas['CUSEC'].notna().sum()}")
    return portales


def construir_viales(portales):
    portales["tipo"] = portales["tipo_vial"].str.strip().str.upper()
    portales["nombre"] = portales["nombre_via"].str.strip().str.upper()
    claves = portales[["tipo", "nombre"]].drop_duplicates().sort_values(["nombre", "tipo"]).reset_index(drop=True)
    claves["id"] = claves.index + 1
    portales = portales.merge(claves, on=["tipo", "nombre"])

    agregados = portales.groupby("id").agg(
        n_portales=("numero", "size"),
        num_min=("numero", "min"),
        num_max=("numero", "max"),
        cusecs=("cusec", lambda s: json.dumps(sorted(s.dropna().unique().tolist()))),
    )
    viales = claves.merge(agregados, left_on="id", right_index=True)
    viales["nombre_norm"] = viales["nombre"].map(normalizar)
    viales["visible"] = [nombre_visible(t, n) for t, n in zip(viales["tipo"], viales["nombre"])]
    return viales, portales


def escribir_sqlite(viales, portales):
    ruta = PROCESSED / "geocoder.sqlite"
    ruta.unlink(missing_ok=True)
    con = sqlite3.connect(ruta)
    con.executescript(
        """
        CREATE TABLE viales (
            id INTEGER PRIMARY KEY, tipo TEXT NOT NULL, nombre TEXT NOT NULL,
            nombre_norm TEXT NOT NULL, visible TEXT NOT NULL, n_portales INTEGER NOT NULL,
            num_min INTEGER, num_max INTEGER, cusecs TEXT NOT NULL
        );
        CREATE TABLE portales (
            vial_id INTEGER NOT NULL REFERENCES viales(id), numero INTEGER NOT NULL,
            extension TEXT NOT NULL, lon REAL NOT NULL, lat REAL NOT NULL, cusec TEXT
        );
        """
    )
    con.executemany(
        "INSERT INTO viales VALUES (?,?,?,?,?,?,?,?,?)",
        viales[["id", "tipo", "nombre", "nombre_norm", "visible", "n_portales", "num_min", "num_max", "cusecs"]]
        .itertuples(index=False, name=None),
    )
    wgs = portales.to_crs("EPSG:4326")
    filas = zip(
        wgs["id"], wgs["numero"], wgs["extension"],
        wgs.geometry.x.round(6), wgs.geometry.y.round(6), wgs["cusec"].where(wgs["cusec"].notna(), None),
    )
    con.executemany("INSERT INTO portales VALUES (?,?,?,?,?,?)", filas)
    con.execute("CREATE INDEX portales_vial_numero ON portales(vial_id, numero)")
    con.execute("CREATE INDEX viales_nombre_norm ON viales(nombre_norm)")
    con.commit()
    con.execute("VACUUM")
    con.close()
    print(f"  → {ruta.relative_to(PROCESSED.parent.parent)} ({ruta.stat().st_size / 1e6:.1f} MB)")


def main():
    portales = leer_portales()
    print(f"Portales de Madrid: {len(portales)}")
    portales = asignar_seccion(portales, leer_secciones())
    viales, portales = construir_viales(portales)
    print(f"Viales: {len(viales)}")

    escribir_sqlite(viales, portales)
    escribir_json(
        PROCESSED / "viales_autocompletar.json",
        viales.sort_values("n_portales", ascending=False)[["id", "visible"]].values.tolist(),
    )


if __name__ == "__main__":
    main()

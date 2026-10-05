"""Descarga las fuentes oficiales a data/raw/.

Automático: seccionado censal 2021 (INE), barrios (Ayuntamiento de Madrid) e IPC del
alquiler de vivienda principal (INE, tabla 76128, serie IPC291807).

Manual: el callejero de CartoCiudad se descarga del Centro de Descargas del CNIG, que
exige aceptar la licencia en la web. Este script solo comprueba que esté en su sitio.

Uso: .venv/bin/python scripts/00_descargar.py [--forzar]
"""

import sys
import urllib.request

from comun import BARRIOS_ZIP, CARTOCIUDAD_DIR, IPC_JSON, RAW, SECCIONADO_ZIP, SERPAVI_XLSX

FUENTES = [
    (
        SECCIONADO_ZIP,
        "https://www.ine.es/prodyser/cartografia/seccionado_2021.zip",
        "Seccionado censal 2021 (INE, SECC_CE_20210101)",
    ),
    (
        BARRIOS_ZIP,
        "https://geoportal.madrid.es/fsdescargas/IDEAM_WBGEOPORTAL/LIMITES_ADMINISTRATIVOS/Barrios/Barrios.zip",
        "Barrios municipales (Ayuntamiento de Madrid)",
    ),
    (
        IPC_JSON,
        # Alquiler de vivienda principal, índice nacional, desde enero de 2024
        "https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/IPC291807?date=20240101:20991231",
        "IPC alquiler de vivienda principal (INE, serie IPC291807)",
    ),
]

INSTRUCCIONES_CARTOCIUDAD = f"""
  Falta el callejero de CartoCiudad (paso manual, el CNIG exige aceptar la licencia):
    1. Abre https://centrodedescargas.cnig.es/CentroDescargas/ → «CartoCiudad».
    2. Descarga la provincia de Madrid (28).
    3. Descomprímelo en {CARTOCIUDAD_DIR.relative_to(RAW.parent.parent)}/
  Sin este paso funciona todo menos scripts/03_callejero.py.
"""


def descargar(ruta, url, nombre, forzar):
    # El IPC se refresca siempre: cambia cada mes
    if ruta.exists() and not forzar and ruta != IPC_JSON:
        print(f"✓ {nombre}: ya existe")
        return
    print(f"↓ {nombre}…")
    peticion = urllib.request.Request(url, headers={"User-Agent": "tiene-sentido-etl"})
    with urllib.request.urlopen(peticion, timeout=300) as r, open(ruta, "wb") as f:
        while bloque := r.read(1 << 20):
            f.write(bloque)
    print(f"  → {ruta.name} ({ruta.stat().st_size / 1e6:.1f} MB)")


def main():
    forzar = "--forzar" in sys.argv
    RAW.mkdir(parents=True, exist_ok=True)

    if not SERPAVI_XLSX.exists():
        sys.exit(f"Falta la base SERPAVI en {SERPAVI_XLSX}")
    print("✓ Base SERPAVI 2011-2024: ya existe")

    for ruta, url, nombre in FUENTES:
        descargar(ruta, url, nombre, forzar)

    if CARTOCIUDAD_DIR.exists() and any(CARTOCIUDAD_DIR.rglob("*")):
        print("✓ CartoCiudad: ya existe")
    else:
        print(INSTRUCCIONES_CARTOCIUDAD)


if __name__ == "__main__":
    main()

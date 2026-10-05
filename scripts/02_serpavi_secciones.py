"""Extrae de la base SERPAVI los datos de las secciones censales de Madrid.

Salidas en data/processed/:
  secciones_madrid.json        {cusec: {cdis, barrio, smed, p25, p75, n, n_vu, med2015, med2024}}
                               (vivienda colectiva, 2024, a precisión completa; null si falta)
  serie_secciones/<cdis>.json  serie 2011-2024 por sección: {cusec: {año: [p25, med, p75, n]}}
                               para el gráfico de evolución (R12, P1)

Requiere scripts/01_poligonos.py (barrio de cada sección).
Uso: .venv/bin/python scripts/02_serpavi_secciones.py
"""

import json
from collections import defaultdict

from comun import CUMUN_MADRID, PROCESSED, SERPAVI_XLSX, escribir_json, filas_xlsx

HOJA = "Secciones censales"
AÑOS = range(2011, 2025)


def num(valor):
    if valor in (None, ""):
        return None
    return float(valor)


def entero(valor):
    v = num(valor)
    return None if v is None else int(v)


def main():
    seccion_barrio = json.loads((PROCESSED / "seccion_barrio.json").read_text())["secciones"]

    secciones = {}
    serie = defaultdict(dict)
    for fila in filas_xlsx(SERPAVI_XLSX, HOJA):
        if str(fila.get("CUMUN")) != CUMUN_MADRID:
            continue
        cusec = str(fila["CUSEC"]).zfill(10)
        cdis = cusec[5:7]

        secciones[cusec] = {
            "cdis": cdis,
            "barrio": seccion_barrio.get(cusec),
            "smed": num(fila.get("SLVM2_M_VC_24")),
            "p25": num(fila.get("ALQM2_LV_25_VC_24")),
            "p75": num(fila.get("ALQM2_LV_75_VC_24")),
            "n": entero(fila.get("BI_ALVHEPCO_TVC_24")),
            "n_vu": entero(fila.get("BI_ALVHEPCO_TVU_24")),
            "med2015": num(fila.get("ALQM2_LV_M_VC_15")),
            "med2024": num(fila.get("ALQM2_LV_M_VC_24")),
        }

        años = {}
        for año in AÑOS:
            aa = f"{año % 100:02d}"
            valores = [
                num(fila.get(f"ALQM2_LV_25_VC_{aa}")),
                num(fila.get(f"ALQM2_LV_M_VC_{aa}")),
                num(fila.get(f"ALQM2_LV_75_VC_{aa}")),
                entero(fila.get(f"BI_ALVHEPCO_TVC_{aa}")),
            ]
            if any(v is not None for v in valores[:3]):
                años[str(año)] = valores
        serie[cdis][cusec] = años

    print(f"Secciones de Madrid en SERPAVI: {len(secciones)}")
    sin_barrio = [c for c, s in secciones.items() if s["barrio"] is None]
    if sin_barrio:
        print(f"  ⚠ secciones SERPAVI sin polígono 2021: {sin_barrio}")

    escribir_json(PROCESSED / "secciones_madrid.json", dict(sorted(secciones.items())))
    for cdis, datos in sorted(serie.items()):
        escribir_json(PROCESSED / "serie_secciones" / f"{cdis}.json", dict(sorted(datos.items())))


if __name__ == "__main__":
    main()

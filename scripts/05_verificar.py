"""Verifica data/processed/ frente a las fuentes y al fixture de validación.

Sale con código 1 si algún criterio de aceptación del Hito 1 no se cumple.
Uso: .venv/bin/python scripts/05_verificar.py
"""

import csv
import json
import sqlite3
import sys
from datetime import date

from comun import FIXTURES, PROCESSED

errores = []
avisos = []


def comprobar(condicion, mensaje):
    print(("  ✓ " if condicion else "  ✗ ") + mensaje)
    if not condicion:
        errores.append(mensaje)


def cargar(nombre):
    return json.loads((PROCESSED / nombre).read_text())


def verificar_secciones(secciones, barrios, topo):
    print("Secciones y polígonos")
    cusecs_poligono = {g["properties"]["cusec"] for g in topo["objects"]["secciones"]["geometries"]}
    sin_poligono = set(secciones) - cusecs_poligono
    comprobar(not sin_poligono, f"las {len(secciones)} secciones SERPAVI tienen polígono 2021 {sorted(sin_poligono) or ''}")
    solo_poligono = cusecs_poligono - set(secciones)
    if solo_poligono:
        avisos.append(f"secciones con polígono pero sin fila SERPAVI (sin dato): {sorted(solo_poligono)}")

    comprobar(all(s["barrio"] in barrios["barrios"] for s in secciones.values()), "todas las secciones tienen barrio")
    comprobar(len(barrios["barrios"]) == 131, f"131 barrios ({len(barrios['barrios'])})")

    con_rango = [s for s in secciones.values() if None not in (s["smed"], s["p25"], s["p75"])]
    elegibles = [s for s in con_rango if (s["n"] or 0) > 20]
    print(f"  · con Smed, P25 y P75: {len(con_rango)} · además con >20 testigos: {len(elegibles)}")
    sin_2015 = sum(1 for s in secciones.values() if s["med2024"] is not None and s["med2015"] is None)
    print(f"  · con mediana 2024 pero sin 2015 (se omite la línea de evolución): {sin_2015}")


def verificar_fixture(secciones):
    print("Cruce con tests/fixtures/tests_motor_serpavi.csv")
    filas = list(csv.DictReader(open(FIXTURES / "tests_motor_serpavi.csv", encoding="utf-8")))
    distintos = []
    for f in filas:
        s = secciones.get(f["seccion"])
        if s is None:
            distintos.append(f"{f['caso']}: sección {f['seccion']} no existe")
            continue
        for campo, csv_campo in (("p25", "P25"), ("p75", "P75"), ("smed", "Smed")):
            if round(s[campo], 4) != round(float(f[csv_campo]), 4):
                distintos.append(f"{f['caso']}: {campo} {s[campo]} ≠ {f[csv_campo]}")
        if s["n"] != int(f["testigos"]):
            distintos.append(f"{f['caso']}: testigos {s['n']} ≠ {f['testigos']}")
    comprobar(not distintos, f"los {len(filas)} casos coinciden en Smed, P25, P75 (4 decimales) y testigos")
    for d in distintos:
        print(f"      {d}")


def verificar_vecinas(vecinas, secciones):
    print("Vecinas (≤150 m)")
    asimetricas = [(a, b) for a, vs in vecinas.items() for b in vs if a not in vecinas.get(b, {})]
    comprobar(not asimetricas, "la relación de vecindad es simétrica")
    aisladas = [c for c, vs in vecinas.items() if not vs]
    comprobar(not aisladas, f"ninguna sección sin vecinas {aisladas[:5] or ''}")
    medias = sum(len(v) for v in vecinas.values()) / len(vecinas)
    print(f"  · vecinas por sección: {medias:.1f} de media")


def verificar_ipc(ipc):
    print("IPC del alquiler")
    comprobar(1.0 < ipc["factor"] < 1.3, f"factor plausible ({ipc['factor']})")
    año, mes = map(int, ipc["ultimo_mes"].split("-"))
    meses = (date.today().year - año) * 12 + date.today().month - mes
    comprobar(meses <= 3, f"último mes publicado reciente ({ipc['ultimo_mes']})")
    if ipc["ultimo_mes"] == "2026-08":
        comprobar(round(ipc["factor"], 3) == 1.054, "factor = 1,054 a agosto de 2026 (PRD)")


def verificar_callejero():
    print("Callejero (CartoCiudad)")
    ruta = PROCESSED / "geocoder.sqlite"
    if not ruta.exists():
        avisos.append("geocoder.sqlite no existe: falta el paso manual de CartoCiudad y scripts/03_callejero.py")
        print("  · pendiente")
        return
    con = sqlite3.connect(ruta)
    total, con_seccion = con.execute("SELECT count(*), count(cusec) FROM portales").fetchone()
    viales = con.execute("SELECT count(*) FROM viales").fetchone()[0]
    print(f"  · viales: {viales} · portales: {total}")
    comprobar(total > 0 and con_seccion / total >= 0.98, f"≥98% de portales con sección ({con_seccion / max(total, 1):.2%})")


def main():
    secciones = cargar("secciones_madrid.json")
    barrios = cargar("seccion_barrio.json")
    topo = cargar("secciones_madrid.topo.json")

    verificar_secciones(secciones, barrios, topo)
    verificar_fixture(secciones)
    verificar_vecinas(cargar("vecinas.json"), secciones)
    verificar_ipc(cargar("ipc_alquiler.json"))
    verificar_callejero()

    for a in avisos:
        print(f"⚠ {a}")
    if errores:
        print(f"\n{len(errores)} error(es)")
        sys.exit(1)
    print("\nTodo correcto")


if __name__ == "__main__":
    main()

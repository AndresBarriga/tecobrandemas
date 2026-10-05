"""Genera tests/fixtures/direcciones_gate.csv: las direcciones de los 50 anuncios del gate.

Validación del geocodificador independiente de nuestro callejero: en 30 anuncios la
sección la dio la app oficial (serpavi.mivau.gob.es) al introducir la dirección.

Columnas:
  entrada           dirección del anuncio, tal como se escribiría (columna AJ del gate)
  calidad           exacta (calle y número del anuncio) o aproximada (columna AK)
  direccion_app     dirección introducida en la app oficial (AG), vacía si no se consultó
  cusec_app         sección según la app oficial (AH): la referencia independiente
  cusec_gate        sección calculada en el gate sobre el seccionado INE 2021 (F)

El Excel (data/raw/gate/) no va a git: solo las direcciones y secciones, sin precios.
Uso: .venv/bin/python scripts/08_direcciones_gate.py
"""

import csv

from comun import FIXTURES, RAW, filas_xlsx

GATE_XLSX = RAW / "gate" / "gate_50_anuncios_madrid_relleno.xlsx"


def main():
    filas = []
    for f in filas_xlsx(GATE_XLSX, "Anuncios", fila_cabecera=4):
        n = int(f.get("ID") or 0)
        if n == 0:  # fila 5: ejemplo inventado
            continue
        calidad_txt = f.get("Calidad de la dirección", "")
        filas.append({
            "caso": f"A{n:02d}",
            "entrada": f["Dirección del anuncio (exacta o aproximada)"],
            "calidad": "aproximada" if calidad_txt.startswith("aprox") else "exacta",
            "direccion_app": f.get("Dirección introducida en la app", ""),
            "cusec_app": f.get("Sección según app", ""),
            "cusec_gate": f["Sección censal (código)"],
        })

    if len(filas) != 50:
        raise SystemExit(f"Se esperaban 50 anuncios y hay {len(filas)}")
    con_app = sum(1 for f in filas if f["cusec_app"])
    if con_app != 30:
        raise SystemExit(f"Se esperaban 30 anuncios con sección de la app y hay {con_app}")

    destino = FIXTURES / "direcciones_gate.csv"
    with open(destino, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(filas[0]))
        w.writeheader()
        w.writerows(filas)
    distintas = sum(1 for f in filas if f["cusec_app"] and f["cusec_app"] != f["cusec_gate"])
    exactas = sum(1 for f in filas if f["calidad"] == "exacta")
    print(f"  → {destino} (50 direcciones, {exactas} exactas, {con_app} con sección de la app, "
          f"{distintas} donde la app da otra sección)")


if __name__ == "__main__":
    main()

"""Factor de ajuste por el IPC del alquiler de vivienda principal.

f = índice del último mes publicado / media de los 12 meses de 2024.
Se usa la media de 2024, y no diciembre, porque SERPAVI recoge las rentas de todo el año
(docs/decisiones.md). Fuente: INE, subclase 04.1.1.0, nacional, tabla 76128 (IPC291807).

Entrada: data/raw/ipc_alquiler_serie.json (scripts/00_descargar.py la refresca)
Salida:  data/processed/ipc_alquiler.json
Uso: .venv/bin/python scripts/04_ipc.py
"""

import json
from datetime import date

from comun import IPC_JSON, PROCESSED, escribir_json


def main():
    serie = json.loads(IPC_JSON.read_text())
    if "Alquiler de vivienda principal" not in serie["Nombre"]:
        raise SystemExit(f"Serie inesperada: {serie['Nombre']}")

    datos = sorted((d["Anyo"], d["FK_Periodo"], d["Valor"]) for d in serie["Data"])
    meses_2024 = [v for a, m, v in datos if a == 2024]
    if len(meses_2024) != 12:
        raise SystemExit(f"La serie trae {len(meses_2024)} meses de 2024, se esperaban 12")

    media_2024 = round(sum(meses_2024) / 12, 3)
    año, mes, valor = datos[-1]
    factor = valor / media_2024

    salida = {
        "media_2024": media_2024,
        "ultimo_mes": f"{año}-{mes:02d}",
        "valor": valor,
        "factor": round(factor, 6),
        "variacion_pct": round((factor - 1) * 100, 1),
        "fuente": "INE, IPC base 2025, subclase 04.1.1.0 «Alquiler de vivienda principal», "
        "nacional (tabla 76128, serie IPC291807)",
        "atribucion": "Elaboración propia con datos extraídos del sitio web del INE: www.ine.es",
        "fecha_extraccion": date.today().isoformat(),
    }
    print(f"Factor IPC alquiler: {factor:.4f} (media 2024 = {media_2024} → {año}-{mes:02d} = {valor})")
    escribir_json(PROCESSED / "ipc_alquiler.json", salida, compacto=False)


if __name__ == "__main__":
    main()

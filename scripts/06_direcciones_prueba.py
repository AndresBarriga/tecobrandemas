"""Genera tests/fixtures/direcciones_100.csv: 100 direcciones de prueba para el geocodificador.

Salen de portales reales del callejero, escritas como las teclearía alguien: tipo de vía
abreviado u omitido, «de», minúsculas, piso y puerta, código postal, erratas. La sección
esperada es la del portal (punto-en-polígono hecho en Python por 03_callejero.py, con los
polígonos a precisión completa).

  exacta (55)               dirección con número que existe
  errata (10)               ídem con una letra cambiada o de menos
  conocida (10)             direcciones conocidas escritas a mano, con tildes y partículas
  calle (10)                sin número, calle con 2-6 secciones → horquilla con esas secciones
  numero_inexistente (10)   número por encima del último de su acera → portal más cercano
  larga (5)                 sin número, calle con más de 6 secciones → pedir número o mapa

Semilla fija: el fichero es reproducible. Requiere scripts/03_callejero.py.
Uso: .venv/bin/python scripts/06_direcciones_prueba.py
"""

import csv
import json
import random
import sqlite3

from comun import FIXTURES, PROCESSED

random.seed(2026)

ABREVIATURAS = {
    "CALLE": ["Calle", "C/", "c/", "Cl."], "AVENIDA": ["Avenida", "Avda.", "Av."],
    "PASEO": ["Paseo", "Pº", "P.º"], "PLAZA": ["Plaza", "Pza.", "Pl."],
    "CAMINO": ["Camino"], "CARRETERA": ["Carretera", "Ctra."], "RONDA": ["Ronda"],
    "TRAVESIA": ["Travesía", "Trv."], "PASAJE": ["Pasaje"], "GLORIETA": ["Glorieta", "Gta."],
}
SUFIJOS = ["", "", "", ", 3º B", " 2ºA", ", bajo izq.", ", Madrid", ", 28{cp} Madrid", " 1º dcha"]

CONOCIDAS = [
    ("CALLE", "ALCALA", 45, "Calle de Alcalá 45"),
    ("PASEO", "CASTELLANA", 100, "Paseo de la Castellana, 100"),
    ("CALLE", "GRAN VIA", 28, "Gran Vía 28"),
    ("CALLE", "BRAVO MURILLO", 150, "C/ Bravo Murillo nº 150, 4º izq"),
    ("PLAZA", "MAYOR", 1, "Plaza Mayor 1"),
    ("CALLE", "ATOCHA", 70, "calle atocha 70"),
    ("CALLE", "FUENCARRAL", 45, "Fuencarral 45, 28004 Madrid"),
    ("AVENIDA", "ALBUFERA", 112, "Avda. de la Albufera 112"),
    ("CALLE", "TOLEDO", 80, "Calle de Toledo, 80"),
    ("CALLE", "PRINCESA", 25, "C/ Princesa 25 2ºA"),
]


def bonito(nombre):
    return " ".join(p.capitalize() for p in nombre.lower().split())


def escribir(tipo, nombre, numero=None, extension=""):
    partes = []
    forma = random.random()
    if forma < 0.75 and tipo in ABREVIATURAS:
        partes.append(random.choice(ABREVIATURAS[tipo]))
        if tipo == "CALLE" and random.random() < 0.4:
            partes.append("de")
    nombre_txt = bonito(nombre)
    if random.random() < 0.3:
        nombre_txt = nombre_txt.lower()
    partes.append(nombre_txt)
    texto = " ".join(partes)
    if numero is not None:
        sep = random.choice([" ", ", ", " nº ", ", nº "])
        texto += f"{sep}{numero}{extension}"
        texto += random.choice(SUFIJOS).replace("{cp}", f"{random.randint(0, 55):03d}")
    return texto


def errata(nombre):
    letras = list(nombre)
    i = random.randrange(1, len(letras) - 2)
    if letras[i] == " " or letras[i + 1] == " ":
        return errata(nombre)
    if random.random() < 0.5:
        letras[i], letras[i + 1] = letras[i + 1], letras[i]
    else:
        del letras[i]
    return "".join(letras)


def main():
    con = sqlite3.connect(PROCESSED / "geocoder.sqlite")
    con.row_factory = sqlite3.Row

    # Viales sin ambigüedad: nombre normalizado único en todo el callejero
    unicos = con.execute(
        "SELECT * FROM viales WHERE nombre_norm IN "
        "(SELECT nombre_norm FROM viales GROUP BY nombre_norm HAVING count(*) = 1)"
    ).fetchall()
    portales_inequivocos = """
        SELECT p.vial_id, p.numero, p.extension, min(p.cusec) AS cusec FROM portales p
        WHERE p.vial_id = ? AND p.cusec IS NOT NULL
        GROUP BY p.numero, p.extension HAVING count(DISTINCT p.cusec) = 1
    """
    filas = []

    def anadir(categoria, entrada, estado, cusecs):
        filas.append({"id": f"D{len(filas) + 1:03d}", "categoria": categoria, "entrada": entrada,
                      "estado_esperado": estado, "cusecs_esperados": "|".join(sorted(cusecs))})

    candidatos = [v for v in unicos if v["n_portales"] >= 5]
    random.shuffle(candidatos)

    for categoria, n in (("exacta", 55), ("errata", 10)):
        hechos = 0
        while hechos < n:
            v = candidatos.pop()
            if categoria == "errata" and len(v["nombre"]) < 8:
                continue
            portales = con.execute(portales_inequivocos, (v["id"],)).fetchall()
            p = random.choice(portales)
            nombre = errata(v["nombre"]) if categoria == "errata" else v["nombre"]
            anadir(categoria, escribir(v["tipo"], nombre, p["numero"], p["extension"].lower()), "exacta", [p["cusec"]])
            hechos += 1

    for tipo, nombre, numero, texto in CONOCIDAS:
        r = con.execute(
            "SELECT DISTINCT p.cusec FROM portales p JOIN viales v ON v.id = p.vial_id "
            "WHERE v.tipo = ? AND v.nombre = ? AND p.numero = ? AND p.extension = ''",
            (tipo, nombre, numero),
        ).fetchall()
        if len(r) != 1:
            raise SystemExit(f"{texto}: {len(r)} secciones en el callejero")
        anadir("conocida", texto, "exacta", [r[0]["cusec"]])

    cortas = [v for v in candidatos if 2 <= len(json.loads(v["cusecs"])) <= 6]
    for v in cortas[:10]:
        anadir("calle", escribir(v["tipo"], v["nombre"]), "calle", json.loads(v["cusecs"]))
        candidatos.remove(v)

    hechos = 0
    for v in candidatos:
        if hechos == 10:
            break
        paridad = random.choice([0, 1])
        ultimo = con.execute(
            "SELECT numero, group_concat(DISTINCT cusec) AS cusecs FROM portales "
            "WHERE vial_id = ? AND numero % 2 = ? AND cusec IS NOT NULL "
            "GROUP BY numero ORDER BY numero DESC LIMIT 1",
            (v["id"], paridad),
        ).fetchone()
        if not ultimo or "," in ultimo["cusecs"]:
            continue
        anadir("numero_inexistente", escribir(v["tipo"], v["nombre"], ultimo["numero"] + 2),
               "aproximada", [ultimo["cusecs"]])
        hechos += 1

    largas = [v for v in unicos if len(json.loads(v["cusecs"])) > 6]
    for v in random.sample(largas, 5):
        anadir("larga", escribir(v["tipo"], v["nombre"]), "demasiadas_secciones", [])

    destino = FIXTURES / "direcciones_100.csv"
    with open(destino, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0]))
        w.writeheader()
        w.writerows(filas)
    print(f"  → {destino} ({len(filas)} direcciones)")


if __name__ == "__main__":
    main()

"""Rutas y utilidades compartidas por los scripts de datos."""

import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
RAW = RAIZ / "data" / "raw"
PROCESSED = RAIZ / "data" / "processed"
FIXTURES = RAIZ / "tests" / "fixtures"

CUMUN_MADRID = "28079"
CRS_METRICO = "EPSG:25830"  # ETRS89 / UTM 30N, el del seccionado y los barrios

SERPAVI_XLSX = RAW / "2026-03_09_bd_SERPAVI_2011-2024 - DEFINITIVO WEB_v2.xlsx"
SECCIONADO_ZIP = RAW / "seccionado_2021.zip"
BARRIOS_ZIP = RAW / "barrios_madrid.zip"
IPC_JSON = RAW / "ipc_alquiler_serie.json"
CARTOCIUDAD_DIR = RAW / "cartociudad"


def escribir_json(ruta: Path, datos, compacto: bool = True) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    with open(ruta, "w", encoding="utf-8") as f:
        if compacto:
            json.dump(datos, f, ensure_ascii=False, separators=(",", ":"))
        else:
            json.dump(datos, f, ensure_ascii=False, indent=2)
    print(f"  → {ruta.relative_to(RAIZ)} ({ruta.stat().st_size / 1024:.0f} KB)")


def filas_xlsx(ruta: Path, hoja: str):
    """Lee una hoja de un .xlsx en streaming y devuelve dicts {cabecera: valor_texto}.

    openpyxl tarda minutos con la hoja de secciones (211 MB de XML); iterparse, ~20 s.
    """
    import re
    import zipfile
    import xml.etree.ElementTree as ET

    ns = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    nsr = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
    z = zipfile.ZipFile(ruta)

    # Nombre de hoja → fichero XML
    libro = ET.parse(z.open("xl/workbook.xml")).getroot()
    rels = ET.parse(z.open("xl/_rels/workbook.xml.rels")).getroot()
    destino = {r.get("Id"): r.get("Target") for r in rels}
    rid = next(s.get(nsr + "id") for s in libro.iter(ns + "sheet") if s.get("name") == hoja)
    xml_hoja = "xl/" + destino[rid].lstrip("/").removeprefix("xl/")

    compartidas = []
    for _, el in ET.iterparse(z.open("xl/sharedStrings.xml")):
        if el.tag == ns + "si":
            compartidas.append("".join(t.text or "" for t in el.iter(ns + "t")))
            el.clear()

    cabecera = None
    for _, el in ET.iterparse(z.open(xml_hoja)):
        if el.tag != ns + "row":
            continue
        fila = {}
        for c in el.findall(ns + "c"):
            v = c.find(ns + "v")
            if v is None:
                continue
            col = re.match(r"[A-Z]+", c.get("r")).group()
            fila[col] = compartidas[int(v.text)] if c.get("t") == "s" else v.text
        el.clear()
        if cabecera is None:
            cabecera = fila
            continue
        yield {cabecera[k]: v for k, v in fila.items() if k in cabecera}


def leer_secciones():
    """Polígonos de las secciones de Madrid (seccionado INE 2021) en EPSG:25830."""
    import geopandas as gpd

    ruta = f"zip://{SECCIONADO_ZIP}!Seccionado_2021/SECC_CE_20210101.shp"
    s = gpd.read_file(ruta, where=f"CUMUN='{CUMUN_MADRID}'", columns=["CUSEC", "CUMUN"])
    if len(s) < 2000:
        raise SystemExit(f"Solo {len(s)} secciones de Madrid en el seccionado: revisa el filtro")
    s = s.to_crs(CRS_METRICO)
    # Algunas secciones vienen como varias partes en el shapefile; una fila por cusec
    s = s.dissolve(by="CUSEC", as_index=False)[["CUSEC", "geometry"]]
    s["geometry"] = s.geometry.make_valid()
    return s

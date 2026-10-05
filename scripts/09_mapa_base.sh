#!/bin/sh
# Mapa base de Madrid: extracto de Protomaps (OpenStreetMap, ODbL) → data/processed/madrid.pmtiles (~36 MB).
# Necesita la CLI de pmtiles (https://github.com/protomaps/go-pmtiles/releases) en el PATH.
# Después, subirlo a R2 (el Worker lo sirve en /mapa/madrid.pmtiles):
#   npx wrangler r2 object put a-su-precio-mapa/madrid.pmtiles --file data/processed/madrid.pmtiles \
#     --content-type application/octet-stream --remote
# Atribución obligatoria en pantalla: «© OpenStreetMap contributors».
set -e
cd "$(dirname "$0")/.."
FECHA=${1:-$(date -v-1d +%Y%m%d 2>/dev/null || date -d yesterday +%Y%m%d)}
pmtiles extract "https://build.protomaps.com/$FECHA.pmtiles" data/processed/madrid.pmtiles \
	--bbox=-3.89,40.31,-3.51,40.65 --maxzoom=15 2>&1 | tail -3
ls -lh data/processed/madrid.pmtiles

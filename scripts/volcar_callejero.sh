#!/bin/sh
# Vuelca data/processed/geocoder.sqlite a SQL para importarlo en D1:
#   npx wrangler d1 execute a-su-precio-callejero --remote --file=data/processed/callejero.sql
set -e
cd "$(dirname "$0")/.."
sqlite3 data/processed/geocoder.sqlite .dump | grep -v -e '^BEGIN TRANSACTION' -e '^COMMIT' -e 'sqlite_sequence' > data/processed/callejero.sql
ls -lh data/processed/callejero.sql

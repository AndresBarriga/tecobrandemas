# Calibración del ajuste por tamaño de la oferta

Fecha: octubre de 2026 (muestras del 4 y del 11 de octubre).

## Qué se calibró
La referencia de oferta ya no es `€/m² × m²`, sino

    referencia = eurM2Serie × m2 × (m2 / 78) ^ −0,40

con `eurM2Serie` el €/m² del barrio (o del distrito) de la serie 4.3.21.D del Ayuntamiento. Los parámetros están en `config/oferta.json`
(`size_exp` = −0,40, `s_ref_m2` = 78) y la función en `src/lib/motor/oferta.ts` (`referenciaOferta`, `factorTamano`).

## Muestra
- 145 anuncios reales de alquiler de Idealista y Fotocasa, en los 20 distritos de Madrid.
- Dos tandas: una de Fotocasa de zonas variadas (4/10/2026) y otra de zonas más baratas (11/10/2026).
- Solo se anotaron a mano el precio y los m² (lectura manual, sin scraping) junto con el €/m² de la serie de su barrio o distrito.
- El CSV no se sube a git (repositorio público: son anuncios de terceros). Lo guarda quien hizo la calibración.

## Resultado
- Error típico: 14 % → 10 %.
- Anuncios normales dentro de ±15 %: 52 % → 68 %.
- Sesgo de 30–50 m²: +34 % → +12 %. De 51–150 m²: ≈ 0.
- Barrios sin dato propio (se usa el distrito, n = 29): sin sesgo (+4 %); no se aplica ninguna corrección extra.
- Un solo exponente para toda la ciudad: la diferencia entre zonas baratas y caras no fue significativa.

## Límites
- No tiene en cuenta el estado, la planta ni la reforma.
- Los estudios de menos de 50 m² aún salen ~12 % altos.
- La banda «en línea» pasa de ±10 % a ±15 % (lo que se desvía un anuncio corriente de la estimación).
- Muestra pequeña y de un solo mes: recalibrar cuando haya más datos (la analítica lleva `metodo_oferta: "tamano_v1"` para comparar antes y después).

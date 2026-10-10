// A su precio · lógica de referencia del resultado «costura» y sus tarjetas.
// Datos de ejemplo + reglas de veredicto, escala, textos y meses. Sustituir CASOS por el motor real.
(function () {
  const NB = '\u00a0';
  const miles = n => { const s = String(Math.round(Math.abs(n))); return s.length >= 4 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : s; };
  const eur = n => miles(n) + NB + '€';
  const sg = v => v > 0 ? '+' : v < 0 ? '−' : '';
  const pct = x => { const v = Math.round(x * 100); return sg(v) + Math.abs(v) + NB + '%'; };
  const dec = (x, d) => x.toFixed(d).replace('.', ',');

  // principal = caso real del enunciado (salvo lo = 742, valor de boceto). El resto: EJEMPLO.
  const CASOS = {
    principal: { zona: 'Vinateros', distrito: 'Moratalaz', m2: 90, precio: 1400, lo: 742, hi: 1074, techo: 1138, m2oferta: 17.14, n: 118 },
    dentro:    { zona: 'San Cristóbal', distrito: 'Villaverde', m2: 90, precio: 760, lo: 610, hi: 880, techo: 940, m2oferta: 13.30, n: 64, ejemplo: true },
    algo:      { zona: 'Ventas', distrito: 'Ciudad Lineal', m2: 90, precio: 1000, lo: 700, hi: 960, techo: 1030, m2oferta: 10.79, n: 91, ejemplo: true },
    ambos:     { zona: 'Goya', distrito: 'Salamanca', m2: 90, precio: 2900, lo: 1300, hi: 2037, techo: 2188, m2oferta: 28.78, n: 143, ejemplo: true },
    sinoferta: { zona: 'Vinateros', distrito: 'Moratalaz', m2: 90, precio: 1400, lo: 742, hi: 1074, techo: 1138, m2oferta: null, n: 118, ejemplo: true },
    antiguo:   { zona: 'Vinateros', distrito: 'Moratalaz', m2: 90, precio: 1050, lo: 742, hi: 1074, techo: 1138, m2oferta: 17.14, n: 118, firma: 2021, ejemplo: true },
    justo:     { zona: 'Palomeras Bajas', distrito: 'Puente de Vallecas', m2: 90, precio: 900, lo: 700, hi: 1000, techo: 1070, m2oferta: 10.50, n: 77, ejemplo: true },
    horquilla: { zona: 'Vinateros', distrito: 'Moratalaz', m2: 90, precio: 1400, lo: 742, hi: 1040, hiMax: 1100, techo: 1150, techoMax: 1180, m2oferta: 17.14, n: 118, aprox: true, ejemplo: true }
  };
  const UMBRAL_EN_LINEA = 0.10; // SUPUESTO: confirmar con el umbral del motor

  function calc(id, modo) {
    const c = CASOS[id] || CASOS.principal;
    const anuncio = modo === 'anuncio';
    const p = c.precio, hiMax = c.hiMax || c.hi, techoMax = c.techoMax || c.techo;
    const oferta = c.m2oferta ? Math.round(c.m2oferta * c.m2) : null;

    let vC;
    if (p < c.lo) vC = { key: 'debajo', word: 'POR DEBAJO', num: '', txt: 'de lo habitual en tu zona', card: 'por debajo de lo habitual' };
    else if (p <= hiMax) {
      const t = (p - c.lo) / (c.hi - c.lo); const parte = t < 1 / 3 ? 'baja' : t < 2 / 3 ? 'media' : 'alta';
      vC = { key: 'dentro', word: 'DENTRO', num: '', txt: 'en la parte ' + parte + ' de lo habitual', card: 'en la parte ' + parte + ' de lo habitual' };
    } else {
      const num = c.aprox ? '+' + Math.round((p - hiMax) / hiMax * 100) + ' a +' + Math.round((p - c.hi) / c.hi * 100) + NB + '%' : pct((p - c.hi) / c.hi);
      vC = p <= c.techo
        ? { key: 'algo', word: 'ALGO POR ENCIMA', num, txt: 'sobre lo más alto de lo habitual. Puede cuadrar si el piso es excelente.', card: 'sobre lo más alto de lo habitual' }
        : { key: 'encima', word: 'POR ENCIMA', num, txt: 'sobre lo más alto de lo habitual', card: 'sobre lo más alto de lo habitual' };
    }

    let vO = null;
    if (oferta) {
      const d = (p - oferta) / oferta;
      const key = Math.abs(d) <= UMBRAL_EN_LINEA ? 'enlinea' : d > 0 ? 'encima' : 'debajo';
      vO = { key, d, word: { enlinea: 'EN LÍNEA', encima: 'POR ENCIMA', debajo: 'POR DEBAJO' }[key], low: { enlinea: 'en línea', encima: 'por encima', debajo: 'por debajo' }[key], num: pct(d), txt: 'frente a lo que se pide en anuncios', card: 'frente a la oferta estimada del distrito' };
      vO.cifra = vO.low + ' (' + vO.num + ')';
      // Mi alquiler por debajo de la oferta: no se celebra; se cuenta cuánto se pide hoy por entrar.
      if (!anuncio && key === 'debajo') {
        const mas = (oferta - p) / p;
        vO = { key: 'hoymas', d, word: 'HOY PIDEN MÁS', num: pct(mas), txt: 'de lo que pagas, en anuncios del distrito para ' + c.m2 + NB + 'm²', card: 'de lo que pago, en anuncios del distrito', low: 'hoy piden más', cifra: 'hoy se pide un ' + Math.round(mas * 100) + NB + '% más' };
      }
    }

    const frC = (anuncio
      ? { debajo: 'Menos de lo que pagan quienes ya viven aquí.', dentro: 'Lo habitual entre quienes ya viven aquí.', algo: 'Algo más de lo que pagan quienes ya viven aquí.', encima: 'Más de lo que pagan quienes ya viven aquí.' }
      : { debajo: 'Pagas menos que tus vecinos.', dentro: 'Pagas lo habitual en tu zona.', algo: 'Pagas algo más que tus vecinos.', encima: 'Pagas más que tus vecinos.' })[vC.key];
    const frO = vO ? (anuncio
      ? { enlinea: 'En línea con lo que se pide hoy en el distrito.', encima: 'Por encima de lo que se pide hoy en el distrito.', debajo: 'Por debajo de lo que se pide hoy en el distrito.' }
      : { enlinea: 'En línea con lo que se pide hoy por entrar.', encima: 'Más de lo que se pide hoy por entrar.', hoymas: 'Si buscaras piso hoy, te pedirían más.' })[vO.key] : '';
    // Fecha de firma (solo Mi alquiler): contexto, nunca juicio.
    const ANO_ACTUAL = 2026, viejo = !anuncio && c.firma && c.firma <= ANO_ACTUAL - 2;
    const notaFirmaC = !anuncio && c.firma ? 'Contrato de ' + c.firma + ': lo habitual mezcla contratos de distintos años.' : '';
    const notaFirmaO = viejo && oferta ? 'Firmaste en ' + c.firma + '. Esto no valora tu contrato: indica cuánto costaría entrar hoy.' : '';

    // Escala común: 85 % del menor valor → 110 % del mayor, redondeada a 100 €.
    const vals = [c.lo, p, techoMax].concat(oferta ? [oferta * (1 - UMBRAL_EN_LINEA), oferta * (1 + UMBRAL_EN_LINEA)] : []);
    const min = Math.max(0, Math.floor(Math.min(...vals) * 0.85 / 100) * 100);
    const max = Math.ceil(Math.max(...vals) * 1.10 / 100) * 100;

    // Meses: solo por encima de lo más alto de lo habitual.
    let anio = null;
    if (p > hiMax) {
      const mes = p - hiMax, ano = mes * 12, m = ano / p, fl = Math.floor(m), ce = Math.ceil(m);
      const frase = m - fl >= 0.5 ? 'casi ' + ce + (ce === 1 ? ' mes' : ' meses') : (fl < 1 ? 'menos de un mes' : 'más de ' + fl + (fl === 1 ? ' mes' : ' meses'));
      anio = { mes: '+' + eur(mes), ano: '+' + eur(ano), meses: m, frase, label: '+' + dec(Math.floor(m * 10) / 10, 1) + ' meses' };
    }
    const rango = (a, b) => miles(a) + '–' + eur(b);
    // «A su precio»: la referencia principal del modo dice que el precio es el que toca.
    // Mi alquiler → contratos DENTRO. Un anuncio → oferta EN LÍNEA.
    const asuPrecio = anuncio ? (!!vO && vO.key === 'enlinea') : vC.key === 'dentro';
    return { U: UMBRAL_EN_LINEA, c, anuncio, p, oferta, notaFirmaC, notaFirmaO, asuPrecio, hiMax, techoMax, vC, vO, frC, frO, min, max, anio, m2o: c.m2oferta ? dec(c.m2oferta, 2) : '',
      tHi: c.hiMax ? rango(c.hi, c.hiMax) : eur(c.hi), tTecho: c.techoMax ? rango(c.techo, c.techoMax) : eur(c.techo) };
  }
  window.Costura = { CASOS, calc, eur, pct, dec, NB };
})();

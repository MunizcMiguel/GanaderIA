import { extraerNumeroCorto, normalizarCrotal } from './crotales';
import { hoyIso, parsearFechaFlexible } from './fechas';
import type { EstadoGanaderia, SexoAnimal, UnidadGanadera } from './types';

export type TipoDocumentoOcr = 'RECETA_PRESVET' | 'DIB' | 'DESCONOCIDO';

export interface ResultadoOcrReceta {
  tipo: 'RECETA_PRESVET';
  recetaPresvet: string;
  crotal: string;
  animalEncontrado?: UnidadGanadera;
  medicamento: string;
  diasLeche: number;
  diasCarne: number;
  fechaEmision: string;
  veterinario?: string;
  textoCrudo: string;
}

export interface ResultadoOcrDib {
  tipo: 'DIB';
  crotal: string;
  animalExistente?: UnidadGanadera;
  crotalMadre: string;
  fechaNacimiento: string;
  sexo: SexoAnimal;
  raza: string;
  codigoRegaOrigen?: string;
  textoCrudo: string;
}

export type ResultadoOcrDocumento = ResultadoOcrReceta | ResultadoOcrDib;

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Extrae todos los códigos ES + 12 dígitos tolerando espacios, guiones o errores típicos de OCR (O por 0).
 */
export function extraerCrotalesDeTextoOcr(texto: string): string[] {
  const matches = texto.match(/E\s*S[\s-]?[0-9OoIl]{2}[\s-]?[0-9OoIl]{2,4}[\s-]?[0-9OoIl]{2,4}[\s-]?[0-9OoIl]{2,4}/gi) || [];
  const resultados: string[] = [];

  for (const m of matches) {
    const limpio = m
      .replace(/[\s-]/g, '')
      .toUpperCase()
      .replace(/^ES/, '@@')
      .replace(/O/g, '0')
      .replace(/[IL]/g, '1')
      .replace(/^@@/, 'ES');
    if (/^ES\d{12}$/.test(limpio) && !resultados.includes(limpio)) {
      resultados.push(limpio);
    }
  }

  return resultados;
}

function extraerDiasEspera(textoNorm: string, palabrasClave: string[]): number | undefined {
  for (const clave of palabrasClave) {
    // Ej: "leche: 5 dias", "tiempo de espera leche 96 horas", "supresion en carne: 18 d"
    const reHoras = new RegExp(`${clave}[^\\n\\r0-9]{0,28}(\\d{1,3})\\s*(?:h|hs|hora|horas)\\b`, 'i');
    const mH = reHoras.exec(textoNorm);
    if (mH) {
      return Math.ceil(Number(mH[1]) / 24);
    }

    const reDias = new RegExp(`${clave}[^\\n\\r0-9]{0,28}(\\d{1,3})\\s*(?:d|dia|dias)\\b`, 'i');
    const mD = reDias.exec(textoNorm);
    if (mD) {
      return Number(mD[1]);
    }

    // Caso "leche: 0" o "leche: cero"
    const reCero = new RegExp(`${clave}[^\\n\\r0-9a-z]{0,16}(?:0|cero|ninguno|no procede)\\b`, 'i');
    if (reCero.test(textoNorm)) {
      return 0;
    }
  }
  return undefined;
}

const MEDICAMENTOS_CONOCIDOS = [
  'amoxicilina',
  'clavulanico',
  'cefalexina',
  'ceftiofur',
  'cefquinoma',
  'enrofloxacina',
  'oxitetraciclina',
  'penicilina',
  'estreptomicina',
  'florfenicol',
  'tulatromicina',
  'tilosina',
  'marbofloxacina',
  'meloxicam',
  'ketoprofeno',
  'flunixin',
  'synulox',
  'cobactan',
  'excenel',
  'ubrosin',
  'mamyzin',
  'metacam',
];

function extraerMedicamento(textoOriginal: string): string {
  const lineas = textoOriginal.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const linea of lineas) {
    const m = /^(?:medicamento|especialidad|producto|principio\s+activo|farmaco)\s*[:\-]\s*(.+)$/i.exec(
      linea,
    );
    if (m && m[1].trim().length >= 3) {
      return m[1].trim();
    }
  }

  for (const linea of lineas) {
    const lNorm = norm(linea);
    if (MEDICAMENTOS_CONOCIDOS.some((med) => lNorm.includes(med))) {
      return linea.slice(0, 70);
    }
  }

  return '';
}

function extraerRaza(textoNorm: string): string {
  if (textoNorm.includes('asturiana de los valles') || textoNorm.includes('avalles')) {
    return 'Asturiana de los Valles';
  }
  if (textoNorm.includes('casina') || textoNorm.includes('montana')) {
    return 'Asturiana de la Montaña (Casina)';
  }
  if (textoNorm.includes('parda')) return 'Parda Alpina';
  if (textoNorm.includes('fleckvieh')) return 'Fleckvieh';
  if (textoNorm.includes('cruce') || textoNorm.includes('limusin') || textoNorm.includes('azul belga')) {
    return 'Cruce cárnico (Azul Belga / Limusín)';
  }
  if (textoNorm.includes('frison') || textoNorm.includes('holstein')) {
    return 'Frisona (Holstein)';
  }
  return 'Frisona (Holstein)';
}

function extraerFechaPorEtiqueta(textoOriginal: string, etiquetas: string[]): string | undefined {
  for (const et of etiquetas) {
    const re = new RegExp(`${et}[^\\n\\r0-9]{0,20}(\\d{1,4}[-/]\\d{1,2}[-/]\\d{2,4})`, 'i');
    const m = re.exec(norm(textoOriginal));
    if (m) {
      const parsed = parsearFechaFlexible(m[1]);
      if (parsed) return parsed;
    }
  }
  // Primera fecha que aparezca en el documento
  const anyDate = /\b(\d{1,2}[-/]\d{1,2}[-/]\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/.exec(textoOriginal);
  return anyDate ? parsearFechaFlexible(anyDate[1]) : undefined;
}

export function detectarTipoDocumentoOcr(texto: string): TipoDocumentoOcr {
  const t = norm(texto);
  let puntosReceta = 0;
  let puntosDib = 0;

  if (t.includes('presvet') || t.includes('receta veterinaria') || t.includes('prescripcion')) {
    puntosReceta += 3;
  }
  if (t.includes('tiempo de espera') || t.includes('supresion') || t.includes('medicamento')) {
    puntosReceta += 2;
  }
  if (MEDICAMENTOS_CONOCIDOS.some((m) => t.includes(m))) {
    puntosReceta += 2;
  }

  if (
    t.includes('documento de identificacion bovina') ||
    t.includes('pasaporte bovino') ||
    /\bdib\b/.test(t)
  ) {
    puntosDib += 4;
  }
  if (t.includes('fecha de nacimiento') || t.includes('codigo de la madre') || t.includes('crotal madre')) {
    puntosDib += 2;
  }

  if (puntosReceta === 0 && puntosDib === 0) return 'DESCONOCIDO';
  return puntosReceta >= puntosDib ? 'RECETA_PRESVET' : 'DIB';
}

function buscarAnimalPorCrotalOTexto(
  crotales: string[],
  textoOriginal: string,
  animales: UnidadGanadera[],
): UnidadGanadera | undefined {
  for (const c of crotales) {
    const found = animales.find((a) => normalizarCrotal(a.crotal) === c);
    if (found) return found;
  }
  const cortoMatch = /(?:#|vaca|animal|collar)\s*[:\-]?\s*(\d{3,4})\b/i.exec(textoOriginal);
  if (cortoMatch) {
    const corto = cortoMatch[1];
    return animales.find((a) => a.numeroCorto === corto || a.crotal.endsWith(corto));
  }
  return undefined;
}

export function analizarTextoOcrDocumento(
  textoOriginal: string,
  estado: EstadoGanaderia,
  tipoForzado?: 'RECETA_PRESVET' | 'DIB',
  fechaRefIso: string = hoyIso(),
): ResultadoOcrDocumento {
  const textoNorm = norm(textoOriginal);
  const detectado = detectarTipoDocumentoOcr(textoOriginal);
  const tipoFinal: 'RECETA_PRESVET' | 'DIB' =
    tipoForzado ?? (detectado === 'DIB' ? 'DIB' : 'RECETA_PRESVET');

  const regaExplotacion = normalizarCrotal(estado.explotacion.codigoRega);
  const codigosEnLineasRega = new Set(
    extraerCrotalesDeTextoOcr(
      textoOriginal
        .split(/\r?\n/)
        .filter((l) => /\brega\b|explotacion/i.test(norm(l)))
        .join('\n'),
    ),
  );
  const crotales = extraerCrotalesDeTextoOcr(textoOriginal).filter(
    (c) => c !== regaExplotacion && !codigosEnLineasRega.has(c),
  );

  if (tipoFinal === 'DIB') {
    const crotalPrincipal = crotales[0] || '';
    let crotalMadre = crotales[1] || '';

    // Si hay línea específica de madre, priorizar ese crotal
    const lineaMadre = textoOriginal
      .split(/\r?\n/)
      .find((l) => /madre|dam/i.test(l));
    if (lineaMadre) {
      const enMadre = extraerCrotalesDeTextoOcr(lineaMadre)[0];
      if (enMadre) crotalMadre = enMadre;
    }

    const animalExistente = crotalPrincipal
      ? estado.animales.find((a) => normalizarCrotal(a.crotal) === crotalPrincipal)
      : undefined;

    const fechaNacimiento =
      extraerFechaPorEtiqueta(textoOriginal, ['fecha de nacimiento', 'nacimiento', 'f\\.\\s*nac']) ||
      fechaRefIso;

    const sexoMatch = /sexo\s*[:\-]?\s*(hembra|macho|h\b|m\b|f\b)/i.exec(textoNorm);
    const sexo: SexoAnimal =
      sexoMatch && (sexoMatch[1].startsWith('m')) ? 'M' : textoNorm.includes('macho') ? 'M' : 'H';

    const regaMatch = /\bES\d{12}\b/i.exec(
      textoOriginal
        .split(/\r?\n/)
        .filter((l) => /rega|explotacion/i.test(l))
        .join(' '),
    );

    return {
      tipo: 'DIB',
      crotal: crotalPrincipal,
      animalExistente,
      crotalMadre,
      fechaNacimiento,
      sexo,
      raza: extraerRaza(textoNorm),
      codigoRegaOrigen: regaMatch ? regaMatch[0].toUpperCase() : undefined,
      textoCrudo: textoOriginal,
    };
  }

  // RECETA_PRESVET
  const recetaMatch =
    /\b(PRESVET[-\s/]?[A-Z0-9-]{4,24})\b/i.exec(textoOriginal) ||
    /(?:n[º°o.]?\s*receta|codigo\s*receta|referencia)\s*[:\-]\s*([A-Z0-9-/]{4,28})/i.exec(
      textoOriginal,
    );

  const animalEncontrado = buscarAnimalPorCrotalOTexto(crotales, textoOriginal, estado.animales);
  const crotalResuelto = animalEncontrado?.crotal || crotales[0] || '';

  const diasLeche = extraerDiasEspera(textoNorm, ['leche', 'ordeno', 'ordeño']) ?? 0;
  const diasCarne = extraerDiasEspera(textoNorm, ['carne', 'sacrificio', 'matadero']) ?? 0;

  const fechaEmision =
    extraerFechaPorEtiqueta(textoOriginal, ['fecha prescripcion', 'fecha emision', 'fecha']) ||
    fechaRefIso;

  const vetMatch = /(?:veterinario|colegiado)\s*[:\-]\s*([^\n\r]{3,50})/i.exec(textoOriginal);

  return {
    tipo: 'RECETA_PRESVET',
    recetaPresvet: recetaMatch ? recetaMatch[1].trim().toUpperCase() : `PRESVET-${fechaRefIso.slice(0, 4)}-33-${extraerNumeroCorto(crotalResuelto || '0000')}`,
    crotal: crotalResuelto,
    animalEncontrado,
    medicamento: extraerMedicamento(textoOriginal),
    diasLeche,
    diasCarne,
    fechaEmision,
    veterinario: vetMatch ? vetMatch[1].trim() : undefined,
    textoCrudo: textoOriginal,
  };
}

export function generarTextoEjemploRecetaPresvet(fechaRefIso: string = hoyIso()): string {
  const [y, m, d] = fechaRefIso.split('-');
  return [
    'RECETA VETERINARIA OFICIAL — SISTEMA PRESVET (MAPA)',
    `Nº Receta: PRESVET-${y}-33-09514`,
    `Fecha prescripción: ${d}/${m}/${y}`,
    'Explotación REGA: ES330110001234 — Ganadería Casa El Robledal',
    'Animal identificado (crotal): ES030041204521 (Vaca #4521 Pinta)',
    'Medicamento: Synulox LC (Amoxicilina + Ácido Clavulánico intramamario)',
    'Posología: 3 jeringas cada 12 horas',
    'Tiempo de espera leche: 96 horas',
    'Tiempo de espera carne: 14 días',
    'Veterinario: Dra. Laura Álvarez (Col. AST-1482)',
  ].join('\n');
}

export function generarTextoEjemploDib(): string {
  return [
    'PRINCIPADO DE ASTURIAS — DOCUMENTO DE IDENTIFICACIÓN BOVINA (DIB)',
    'Código de identificación: ES030045120009',
    'Código de la madre: ES030041205772',
    'Fecha de nacimiento: 15/11/2026',
    'Sexo: Hembra',
    'Raza: Asturiana de los Valles',
    'Explotación de nacimiento REGA: ES330110001234',
  ].join('\n');
}

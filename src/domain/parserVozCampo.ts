import { normalizarCrotal, sugerirSiguienteCrotal } from './crotales';
import { hoyIso, sumarDiasIso } from './fechas';
import type {
  CuarteronUbre,
  EstadoCrotalFisico,
  EstadoGanaderia,
  SexoAnimal,
  TipoIncidenciaClinica,
  UnidadGanadera,
} from './types';

export type AccionVozInterpretada =
  | {
      tipo: 'NACIMIENTO';
      confianza: 'ALTA' | 'MEDIA';
      resumen: string;
      crotalMadre?: string;
      madreEncontrada?: UnidadGanadera;
      crotalTernero: string;
      sexo: SexoAnimal;
      raza: string;
      fecha: string;
      crotalColocado: boolean;
    }
  | {
      tipo: 'CROTAL_CAIDO';
      confianza: 'ALTA' | 'MEDIA';
      resumen: string;
      animal?: UnidadGanadera;
      estadoCrotal: EstadoCrotalFisico;
    }
  | {
      tipo: 'BAJA_MUERTE';
      confianza: 'ALTA' | 'MEDIA';
      resumen: string;
      animal?: UnidadGanadera;
      fecha: string;
      motivo: string;
    }
  | {
      tipo: 'INSEMINACION';
      confianza: 'ALTA' | 'MEDIA';
      resumen: string;
      animal?: UnidadGanadera;
      fecha: string;
      toro?: string;
    }
  | {
      tipo: 'INCIDENCIA';
      confianza: 'ALTA' | 'MEDIA';
      resumen: string;
      animal?: UnidadGanadera;
      tipoIncidencia: TipoIncidenciaClinica;
      cuarteron?: CuarteronUbre;
      fecha: string;
    }
  | {
      tipo: 'NO_RECONOCIDA';
      confianza: 'BAJA';
      resumen: string;
    };

function normalizarTexto(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function detectarFechaEnFrase(textoNorm: string, fechaRefIso: string): string {
  if (textoNorm.includes('anteayer')) return sumarDiasIso(fechaRefIso, -2);
  if (textoNorm.includes('ayer')) return sumarDiasIso(fechaRefIso, -1);
  const haceMatch = /hace\s+(\d{1,2})\s+dias?/.exec(textoNorm);
  if (haceMatch) {
    return sumarDiasIso(fechaRefIso, -Number(haceMatch[1]));
  }
  return fechaRefIso;
}

function buscarAnimalEnFrase(
  textoNorm: string,
  animales: UnidadGanadera[],
): UnidadGanadera | undefined {
  // 1. Buscar código oficial ES + 12 dígitos
  const crotalMatch = /\bes\d{12}\b/i.exec(textoNorm);
  if (crotalMatch) {
    const norm = normalizarCrotal(crotalMatch[0]);
    const found = animales.find((a) => normalizarCrotal(a.crotal) === norm);
    if (found) return found;
  }

  // 2. Buscar por número corto de 4 dígitos o transpondedor
  const numeros = textoNorm.match(/\b\d{3,4}\b/g) || [];
  for (const num of numeros) {
    const found = animales.find(
      (a) =>
        a.estado === 'ACTIVO' &&
        (a.numeroCorto === num || a.transpondedorRobot === num || a.crotal.endsWith(num)),
    );
    if (found) return found;
  }

  // 3. Buscar por nombre propio de la vaca (ej. "Pinta", "Estrella", "Nube")
  for (const a of animales) {
    if (a.estado === 'ACTIVO' && a.nombre) {
      const nomNorm = normalizarTexto(a.nombre);
      if (nomNorm.length >= 3 && textoNorm.includes(nomNorm)) {
        return a;
      }
    }
  }

  return undefined;
}

function detectarRaza(textoNorm: string, razaMadre?: string): string {
  if (textoNorm.includes('asturiana de los valles') || textoNorm.includes('valles')) {
    return 'Asturiana de los Valles';
  }
  if (textoNorm.includes('casina') || textoNorm.includes('montana')) {
    return 'Asturiana de la Montaña (Casina)';
  }
  if (textoNorm.includes('cruce') || textoNorm.includes('azul belga') || textoNorm.includes('limusin')) {
    return 'Cruce cárnico (Azul Belga / Limusín)';
  }
  if (textoNorm.includes('parda')) return 'Parda Alpina';
  if (textoNorm.includes('fleckvieh')) return 'Fleckvieh';
  if (textoNorm.includes('frison') || textoNorm.includes('holstein')) {
    return 'Frisona (Holstein)';
  }
  return razaMadre || 'Frisona (Holstein)';
}

/**
 * Parser offline de notas de voz o mensajes cortos dictados desde la cuadra (#8).
 * Ejemplos soportados:
 * - "Hoy parió la 4521, ternera hembra frisona"
 * - "Ayer parió Estrella un macho cruce sin crotal"
 * - "Se le cayó el crotal izquierdo a la 5772"
 * - "Baja por muerte de la 3901 hoy"
 * - "Inseminada la 4521 con toro Capitán"
 */
export function interpretarNotaCampo(
  textoOriginal: string,
  estado: EstadoGanaderia,
  fechaRefIso: string = hoyIso(),
): AccionVozInterpretada {
  const textoNorm = normalizarTexto(textoOriginal);
  if (!textoNorm) {
    return {
      tipo: 'NO_RECONOCIDA',
      confianza: 'BAJA',
      resumen: 'Dicta o escribe una frase como "Hoy parió la 4521, ternera hembra".',
    };
  }

  const fecha = detectarFechaEnFrase(textoNorm, fechaRefIso);
  const animal = buscarAnimalEnFrase(textoNorm, estado.animales);

  // 1. Crotal caído / perdido / roto
  if (
    (textoNorm.includes('crotal') || textoNorm.includes('chapa') || textoNorm.includes('pendiente')) &&
    (textoNorm.includes('cayo') ||
      textoNorm.includes('perdio') ||
      textoNorm.includes('roto') ||
      textoNorm.includes('falta') ||
      textoNorm.includes('duplicado'))
  ) {
    let estadoCrotal: EstadoCrotalFisico = 'FALTA_IZQUIERDO';
    if (textoNorm.includes('ambos') || textoNorm.includes('dos')) {
      estadoCrotal = 'FALTAN_AMBOS';
    } else if (textoNorm.includes('derech')) {
      estadoCrotal = 'FALTA_DERECHO';
    }
    return {
      tipo: 'CROTAL_CAIDO',
      confianza: animal ? 'ALTA' : 'MEDIA',
      resumen: animal
        ? `Marcar crotal perdido (${estadoCrotal}) en #${animal.numeroCorto} ${animal.nombre || ''} y añadir a duplicados AZASA.`
        : `Detectado aviso de crotal perdido (${estadoCrotal}), selecciona el animal.`,
      animal,
      estadoCrotal,
    };
  }

  // 2. Baja por muerte
  if (
    textoNorm.includes('murio') ||
    textoNorm.includes('muerte') ||
    textoNorm.includes('baja') ||
    textoNorm.includes('cadaver')
  ) {
    return {
      tipo: 'BAJA_MUERTE',
      confianza: animal ? 'ALTA' : 'MEDIA',
      resumen: animal
        ? `Registrar baja por muerte de #${animal.numeroCorto} (${animal.crotal}) con fecha ${fecha}.`
        : `Detectada baja por muerte (${fecha}), selecciona el animal.`,
      animal,
      fecha,
      motivo: 'Muerte en explotación (registrada por voz)',
    };
  }

  // 3. Inseminación / Cubrición
  if (
    textoNorm.includes('insemin') ||
    textoNorm.includes('cubri') ||
    textoNorm.includes('toro') ||
    textoNorm.includes('dosis')
  ) {
    const toroMatch =
      /(?:toro|dosis)(?:\s+de)?\s+([a-z0-9áéíóúñ-]{2,24})/i.exec(textoOriginal) ||
      /\bcon\s+(?:el\s+)?([a-z0-9áéíóúñ-]{3,24})/i.exec(textoOriginal);
    const toro = toroMatch ? toroMatch[1] : undefined;
    return {
      tipo: 'INSEMINACION',
      confianza: animal ? 'ALTA' : 'MEDIA',
      resumen: animal
        ? `Registrar inseminación en #${animal.numeroCorto}${toro ? ` (toro ${toro})` : ''} — calculará secado y parto previsto.`
        : 'Detectada inseminación, selecciona la vaca.',
      animal,
      fecha,
      toro,
    };
  }

  // 3b. Incidencia clínica rápida (Mamitis con cuarterón, Cojera, Cetosis, Metritis)
  if (
    textoNorm.includes('mamitis') ||
    textoNorm.includes('mastitis') ||
    textoNorm.includes('cojera') ||
    textoNorm.includes('coja') ||
    textoNorm.includes('pezuna') ||
    textoNorm.includes('cetosis') ||
    textoNorm.includes('metritis')
  ) {
    const tipoIncidencia: TipoIncidenciaClinica =
      textoNorm.includes('mamitis') || textoNorm.includes('mastitis')
        ? 'MAMITIS'
        : textoNorm.includes('cojer') || textoNorm.includes('coja') || textoNorm.includes('pezuna')
          ? 'COJERA'
          : textoNorm.includes('cetosis')
            ? 'CETOSIS'
            : 'METRITIS';

    let cuarteron: CuarteronUbre | undefined;
    if (tipoIncidencia === 'MAMITIS') {
      const trasero = textoNorm.includes('traser') || textoNorm.includes('posterior') || textoNorm.includes('atras');
      const derecho = textoNorm.includes('derech');
      const izquierdo = textoNorm.includes('izquierd');
      const delantero = textoNorm.includes('delanter') || textoNorm.includes('anterior');
      if (trasero && izquierdo) cuarteron = 'PI';
      else if (trasero && derecho) cuarteron = 'PD';
      else if (delantero && derecho) cuarteron = 'AD';
      else if (delantero && izquierdo) cuarteron = 'AI';
      else if (derecho) cuarteron = 'PD';
      else if (izquierdo) cuarteron = 'PI';
    }

    return {
      tipo: 'INCIDENCIA',
      confianza: animal ? 'ALTA' : 'MEDIA',
      resumen: animal
        ? `Registrar ${tipoIncidencia}${cuarteron ? ` (cuarterón ${cuarteron})` : ''} en #${animal.numeroCorto} ${animal.nombre || ''} el ${fecha}.`
        : `Detectada incidencia (${tipoIncidencia}), selecciona la vaca.`,
      animal,
      tipoIncidencia,
      cuarteron,
      fecha,
    };
  }

  // 4. Nacimiento / Parto
  if (
    textoNorm.includes('pario') ||
    textoNorm.includes('parto') ||
    textoNorm.includes('nacio') ||
    textoNorm.includes('nacimiento') ||
    textoNorm.includes('terner') ||
    textoNorm.includes('xat')
  ) {
    const esMacho =
      textoNorm.includes('macho') ||
      textoNorm.includes('ternero') ||
      textoNorm.includes('xatu') ||
      textoNorm.includes('becerro');
    const sexo: SexoAnimal = esMacho ? 'M' : 'H';

    // Si la frase menciona un crotal explícito para el ternero ("crotal 0005") distinto al de la madre
    let crotalTernero =
      sugerirSiguienteCrotal(estado.lotesCrotales, estado.explotacion.especiePrincipal) || '';
    const crotalExplicito = /crotal\s+(es\d{12}|\d{4})\b/i.exec(textoNorm);
    if (crotalExplicito) {
      const val = crotalExplicito[1].toUpperCase();
      if (val.startsWith('ES')) {
        crotalTernero = val;
      } else if (estado.lotesCrotales[0]) {
        crotalTernero = `${estado.lotesCrotales[0].prefijo}${val.padStart(4, '0')}`;
      }
    }

    const sinCrotal =
      textoNorm.includes('sin crotal') ||
      textoNorm.includes('pendiente crotal') ||
      textoNorm.includes('sin poner');
    const raza = detectarRaza(textoNorm, animal?.raza);

    return {
      tipo: 'NACIMIENTO',
      confianza: animal ? 'ALTA' : 'MEDIA',
      resumen: `Nacimiento (${sexo === 'H' ? 'Hembra' : 'Macho'}, ${raza}) el ${fecha}${
        animal ? ` de madre #${animal.numeroCorto}` : ''
      } · Crotal sugerido: ${crotalTernero || 'pendiente'}.`,
      crotalMadre: animal?.crotal,
      madreEncontrada: animal,
      crotalTernero,
      sexo,
      raza,
      fecha,
      crotalColocado: !sinCrotal,
    };
  }

  return {
    tipo: 'NO_RECONOCIDA',
    confianza: 'BAJA',
    resumen:
      'No pude identificar la acción. Prueba con: "Hoy parió la 4521, ternera hembra", "Se le cayó el crotal derecho a la 5772" o "Inseminada la 4521 con toro Capitán".',
  };
}

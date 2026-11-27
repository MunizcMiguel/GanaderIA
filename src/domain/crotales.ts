import type { EspecieCodigo, LoteCrotales, UnidadGanadera } from './types';

export function normalizarCrotal(codigo: string): string {
  return codigo.replace(/[\s-]/g, '').toUpperCase();
}

export function validarCrotalOficial(codigo: string): boolean {
  const norm = normalizarCrotal(codigo);
  // Estándar español/UE: 2 letras país (ES) + 12 dígitos (bovino/ovino oficial)
  return /^[A-Z]{2}\d{12}$/.test(norm);
}

/**
 * Desde el 01/01/2026 RemoWeb Asturias rechaza nacimientos bovinos con codificación antigua:
 * debe comenzar por ES2203 seguido de exactamente 8 dígitos numéricos (14 caracteres).
 */
export function validarCrotalBovinoAsturias2026(
  codigo: string,
  fechaNacimiento?: string,
): { valido: boolean; esSerieNueva2026: boolean; requiereSerie2026: boolean; motivo?: string } {
  const norm = normalizarCrotal(codigo);
  const esSerieNueva2026 = /^ES2203\d{8}$/.test(norm);
  const requiereSerie2026 = !fechaNacimiento || fechaNacimiento >= '2026-01-01';

  if (!validarCrotalOficial(norm)) {
    return {
      valido: false,
      esSerieNueva2026: false,
      requiereSerie2026,
      motivo: 'El crotal debe tener 2 letras de país y 12 dígitos (ej. ES220300000001).',
    };
  }

  if (requiereSerie2026 && !esSerieNueva2026) {
    return {
      valido: false,
      esSerieNueva2026: false,
      requiereSerie2026,
      motivo:
        'Desde 01/01/2026 RemoWeb Asturias exige codificación nueva ES2203 + 8 dígitos para nacimientos.',
    };
  }

  return {
    valido: true,
    esSerieNueva2026,
    requiereSerie2026,
  };
}

export function extraerNumeroCorto(codigo: string): string {
  const norm = normalizarCrotal(codigo);
  if (norm.length <= 4) return norm;
  return norm.slice(-4);
}

export function construirCodigoEnLote(lote: LoteCrotales, numero: number): string {
  return `${normalizarCrotal(lote.prefijo)}${String(numero).padStart(lote.digitosSecuencia, '0')}`;
}

export function listarCrotalesDisponiblesEnLote(lote: LoteCrotales): string[] {
  const usadosSet = new Set(lote.usados.map(normalizarCrotal));
  const disponibles: string[] = [];
  for (let n = lote.desde; n <= lote.hasta; n++) {
    const code = construirCodigoEnLote(lote, n);
    if (!usadosSet.has(code)) {
      disponibles.push(code);
    }
  }
  return disponibles;
}

export function contarCrotalesDisponibles(
  lotes: LoteCrotales[],
  especie?: EspecieCodigo,
): number {
  return lotes
    .filter((l) => !especie || l.especie === especie)
    .reduce((acc, lote) => acc + listarCrotalesDisponiblesEnLote(lote).length, 0);
}

export function sugerirSiguienteCrotal(
  lotes: LoteCrotales[],
  especie: EspecieCodigo,
  excluir: string[] = [],
): string | undefined {
  const excluidos = new Set(excluir.map(normalizarCrotal));
  for (const lote of lotes.filter((l) => l.especie === especie)) {
    const disponibles = listarCrotalesDisponiblesEnLote(lote);
    const candidato = disponibles.find((c) => !excluidos.has(c));
    if (candidato) return candidato;
  }
  return undefined;
}

export function marcarCrotalComoUsado(
  lotes: LoteCrotales[],
  codigo: string,
): LoteCrotales[] {
  const norm = normalizarCrotal(codigo);
  return lotes.map((lote) => {
    const prefijoNorm = normalizarCrotal(lote.prefijo);
    if (!norm.startsWith(prefijoNorm)) return lote;
    const sufijo = norm.slice(prefijoNorm.length);
    const num = Number(sufijo);
    if (!Number.isInteger(num) || num < lote.desde || num > lote.hasta) {
      return lote;
    }
    if (lote.usados.map(normalizarCrotal).includes(norm)) {
      return lote;
    }
    return {
      ...lote,
      usados: [...lote.usados, norm],
    };
  });
}

export function obtenerAnimalesConCrotalFaltante(animales: UnidadGanadera[]): UnidadGanadera[] {
  return animales.filter(
    (a) =>
      a.estado === 'ACTIVO' &&
      (a.estadoCrotal === 'FALTA_IZQUIERDO' ||
        a.estadoCrotal === 'FALTA_DERECHO' ||
        a.estadoCrotal === 'FALTAN_AMBOS'),
  );
}

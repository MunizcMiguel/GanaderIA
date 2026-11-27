import { calcularDEL } from './analiticaGanadero';
import { diferenciaDias, hoyIso, sumarDiasIso } from './fechas';
import type { EspecieCodigo, NivelAlerta, RegistroInseminacion, UnidadGanadera } from './types';

export const GESTACION_DIAS: Record<
  EspecieCodigo,
  { gestacion: number; secadoAntesParto: number; diagnosticoDias: number }
> = {
  BOVINO: { gestacion: 283, secadoAntesParto: 60, diagnosticoDias: 35 },
  OVINO: { gestacion: 150, secadoAntesParto: 45, diagnosticoDias: 35 },
  CAPRINO: { gestacion: 150, secadoAntesParto: 45, diagnosticoDias: 35 },
  EQUINO: { gestacion: 340, secadoAntesParto: 60, diagnosticoDias: 18 },
  PORCINO: { gestacion: 114, secadoAntesParto: 0, diagnosticoDias: 28 },
};

export interface HitoReproductivo {
  inseminacionId: string;
  animalId: string;
  especie: EspecieCodigo;
  crotal: string;
  numeroCorto: string;
  nombre?: string;
  toro?: string;
  fechaInseminacion: string;
  fechaDiagnostico: string;
  fechaSecado?: string;
  fechaSecadoReal?: string;
  fechaPartoPrevisto: string;
  diasTranscurridos: number;
  diasHastaParto: number;
  diasHastaSecado?: number;
  enVentanaCelo21d: boolean;
  proximoHito: 'DIAGNOSTICO' | 'SECADO' | 'PARTO' | 'PARTO_ATRASADO';
  nivel: NivelAlerta;
  etiquetaHito: string;
  confirmadaGestacion: boolean;
}

export interface VacaAbierta {
  animal: UnidadGanadera;
  diasEnLeche: number;
  ultimaFechaParto: string;
}

export function calcularCalendarioReproductivo(
  inseminaciones: RegistroInseminacion[] = [],
  animales: UnidadGanadera[],
  fechaRefIso: string = hoyIso(),
): HitoReproductivo[] {
  const mapaAnimales = new Map(animales.map((a) => [a.id, a]));
  const hitos: HitoReproductivo[] = [];

  for (const ins of inseminaciones) {
    if (ins.estado !== 'ACTIVA') continue;
    const animal = mapaAnimales.get(ins.animalId);
    if (animal && animal.estado !== 'ACTIVO') continue;

    const params = GESTACION_DIAS[ins.especie];
    const fechaDiagnostico = sumarDiasIso(ins.fechaInseminacion, params.diagnosticoDias);
    const fechaPartoPrevisto = sumarDiasIso(ins.fechaInseminacion, params.gestacion);
    const fechaSecado =
      params.secadoAntesParto > 0
        ? sumarDiasIso(fechaPartoPrevisto, -params.secadoAntesParto)
        : undefined;

    const diasTranscurridos = Math.max(0, diferenciaDias(fechaRefIso, ins.fechaInseminacion));
    const diasHastaParto = diferenciaDias(fechaPartoPrevisto, fechaRefIso);
    const diasHastaSecado = fechaSecado ? diferenciaDias(fechaSecado, fechaRefIso) : undefined;
    const diasHastaDiag = diferenciaDias(fechaDiagnostico, fechaRefIso);
    const enVentanaCelo21d =
      !ins.confirmadaGestacion && diasTranscurridos >= 18 && diasTranscurridos <= 24;

    let proximoHito: HitoReproductivo['proximoHito'] = 'PARTO';
    let nivel: NivelAlerta = 'OK';
    let etiquetaHito = `Parto previsto en ${diasHastaParto} días`;

    if (diasHastaParto < 0) {
      proximoHito = 'PARTO_ATRASADO';
      nivel = 'CRITICA';
      etiquetaHito = `Parto pasado de cuentas hace ${Math.abs(diasHastaParto)} día(s)`;
    } else if (diasHastaParto <= 14) {
      proximoHito = 'PARTO';
      nivel = diasHastaParto <= 5 ? 'CRITICA' : 'ATENCION';
      etiquetaHito =
        diasHastaParto === 0
          ? 'Parto previsto HOY — vigilar box de partos'
          : `Parto inminente en ${diasHastaParto} día(s)`;
    } else if (enVentanaCelo21d) {
      proximoHito = 'DIAGNOSTICO';
      nivel = 'ATENCION';
      etiquetaHito = `Vigilar posible retorno a celo (día ${diasTranscurridos})`;
    } else if (!ins.confirmadaGestacion && diasHastaDiag <= 7) {
      proximoHito = 'DIAGNOSTICO';
      nivel = diasHastaDiag <= 0 ? 'ATENCION' : 'OK';
      etiquetaHito =
        diasHastaDiag <= 0
          ? 'Toca diagnóstico de gestación (veterinario)'
          : `Diagnóstico de gestación en ${diasHastaDiag} día(s)`;
    } else if (
      !ins.fechaSecadoReal &&
      diasHastaSecado !== undefined &&
      diasHastaSecado >= -7 &&
      diasHastaSecado <= 15
    ) {
      proximoHito = 'SECADO';
      nivel = diasHastaSecado <= 3 ? 'ATENCION' : 'OK';
      etiquetaHito =
        diasHastaSecado < 0
          ? `Secado pendiente desde hace ${Math.abs(diasHastaSecado)} día(s)`
          : diasHastaSecado === 0
            ? 'Toca SECAR hoy'
            : `Secar en ${diasHastaSecado} día(s)`;
    }

    hitos.push({
      inseminacionId: ins.id,
      animalId: ins.animalId,
      especie: ins.especie,
      crotal: ins.crotal,
      numeroCorto: animal?.numeroCorto || ins.crotal.slice(-4),
      nombre: animal?.nombre,
      toro: ins.toro,
      fechaInseminacion: ins.fechaInseminacion,
      fechaDiagnostico,
      fechaSecado,
      fechaSecadoReal: ins.fechaSecadoReal,
      fechaPartoPrevisto,
      diasTranscurridos,
      diasHastaParto,
      diasHastaSecado,
      enVentanaCelo21d,
      proximoHito,
      nivel,
      etiquetaHito,
      confirmadaGestacion: ins.confirmadaGestacion,
    });
  }

  return hitos.sort((a, b) => a.diasHastaParto - b.diasHastaParto);
}

/**
 * Hembras activas paridas hace >= umbralDias (por defecto 60d) sin inseminación activa.
 */
export function detectarVacasAbiertas(
  animales: UnidadGanadera[],
  inseminaciones: RegistroInseminacion[] = [],
  fechaRefIso: string = hoyIso(),
  umbralDias: number = 60,
): VacaAbierta[] {
  const activasInsIds = new Set(
    inseminaciones.filter((i) => i.estado === 'ACTIVA').map((i) => i.animalId),
  );
  const abiertas: VacaAbierta[] = [];

  for (const a of animales) {
    if (a.estado !== 'ACTIVO' || a.sexo !== 'H') continue;
    if (activasInsIds.has(a.id)) continue;
    if (!a.fechaUltimoParto) continue;
    const del = calcularDEL(a, fechaRefIso);
    if (del !== undefined && del >= umbralDias) {
      abiertas.push({
        animal: a,
        diasEnLeche: del,
        ultimaFechaParto: a.fechaUltimoParto,
      });
    }
  }

  return abiertas.sort((a, b) => b.diasEnLeche - a.diasEnLeche);
}

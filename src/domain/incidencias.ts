import { normalizarCrotal } from './crotales';
import { diferenciaDias, hoyIso } from './fechas';
import type {
  CorralExplotacion,
  CuarteronUbre,
  EstadoGanaderia,
  TipoIncidenciaClinica,
  UnidadGanadera,
} from './types';

export const CORRALES_PREDEFINIDOS: CorralExplotacion[] = [
  { id: 'corral-alta', nombre: 'Producción Alta', color: '#15803d', esPredefinido: true },
  { id: 'corral-baja', nombre: 'Producción Baja', color: '#0d9488', esPredefinido: true },
  { id: 'corral-secas', nombre: 'Secas', color: '#d97706', esPredefinido: true },
  { id: 'corral-preparto', nombre: 'Preparto', color: '#e11d48', esPredefinido: true },
  { id: 'corral-recria', nombre: 'Recría / Novillas', color: '#0284c7', esPredefinido: true },
  { id: 'corral-enfermeria', nombre: 'Enfermería', color: '#dc2626', esPredefinido: true },
  { id: 'corral-pastos', nombre: 'Pastos / Prao', color: '#65a30d', esPredefinido: true },
];

export const PALETA_CORRALES_PERSONALIZADOS = [
  '#7c3aed',
  '#0369a1',
  '#b45309',
  '#be123c',
  '#0f766e',
  '#4f46e5',
];

export function obtenerCorralesActivos(estado: EstadoGanaderia): CorralExplotacion[] {
  return estado.corrales && estado.corrales.length > 0
    ? estado.corrales
    : CORRALES_PREDEFINIDOS;
}

export function anadirCorralPersonalizado(
  corralesActuales: CorralExplotacion[],
  nombre: string,
): CorralExplotacion[] {
  const limpio = nombre.trim();
  if (!limpio) return corralesActuales;
  const color =
    PALETA_CORRALES_PERSONALIZADOS[
      corralesActuales.length % PALETA_CORRALES_PERSONALIZADOS.length
    ];
  return [
    ...corralesActuales,
    {
      id: `corral-custom-${Date.now()}`,
      nombre: limpio,
      color,
      esPredefinido: false,
    },
  ];
}

export function eliminarCorralPersonalizado(
  estado: EstadoGanaderia,
  corralId: string,
): EstadoGanaderia {
  const corrales = obtenerCorralesActivos(estado);
  const objetivo = corrales.find((c) => c.id === corralId);
  if (!objetivo || objetivo.esPredefinido) return estado;
  return {
    ...estado,
    corrales: corrales.filter((c) => c.id !== corralId),
    animales: estado.animales.map((a) =>
      a.corralId === corralId ? { ...a, corralId: undefined } : a,
    ),
  };
}

export const INCIDENCIAS_META: Record<
  TipoIncidenciaClinica,
  { etiqueta: string; soloLeche?: boolean; colorBg: string; colorText: string }
> = {
  MAMITIS: {
    etiqueta: 'Mamitis',
    soloLeche: true,
    colorBg: 'bg-purple-100',
    colorText: 'text-purple-950',
  },
  COJERA: {
    etiqueta: 'Cojera / Pezuña',
    colorBg: 'bg-amber-100',
    colorText: 'text-amber-950',
  },
  PARTO_DIFICIL: {
    etiqueta: 'Parto difícil',
    colorBg: 'bg-rose-100',
    colorText: 'text-rose-950',
  },
  CETOSIS: {
    etiqueta: 'Cetosis',
    soloLeche: true,
    colorBg: 'bg-orange-100',
    colorText: 'text-orange-950',
  },
  METRITIS: {
    etiqueta: 'Metritis / Retención',
    colorBg: 'bg-red-100',
    colorText: 'text-red-950',
  },
  VACUNACION_LOTE: {
    etiqueta: 'Vacunación / Desparasitación',
    colorBg: 'bg-sky-100',
    colorText: 'text-sky-950',
  },
  OTRA: {
    etiqueta: 'Otra incidencia',
    colorBg: 'bg-slate-100',
    colorText: 'text-slate-800',
  },
};

export const CUARTERONES_META: Record<CuarteronUbre, string> = {
  AI: 'Anterior Izquierdo (AI)',
  AD: 'Anterior Derecho (AD)',
  PI: 'Posterior Izquierdo (PI)',
  PD: 'Posterior Derecho (PD)',
};

export interface AlertaVacaProblema {
  animal: UnidadGanadera;
  severidad: 'ALTA' | 'MEDIA';
  motivos: string[];
  puntuacionRiesgo: number;
}

/**
 * Detector automático de "Vacas Problema / Candidatas a Desvieje" en lenguaje ganadero.
 */
export function detectarVacasProblema(
  estado: EstadoGanaderia,
  fechaRefIso: string = hoyIso(),
): AlertaVacaProblema[] {
  const incidencias = estado.incidencias || [];
  const controles = estado.controlesLecheros || [];
  const inseminaciones = estado.inseminaciones || [];
  const esCarne = estado.explotacion.orientacionProductiva === 'CARNE';

  const alertas: AlertaVacaProblema[] = [];

  for (const animal of estado.animales) {
    if (animal.estado !== 'ACTIVO') continue;
    const normC = normalizarCrotal(animal.crotal);
    const motivos: string[] = [];
    let puntos = 0;

    // Incidencias en los últimos 180 días
    const incRecientes = incidencias.filter(
      (i) =>
        (i.animalId === animal.id || normalizarCrotal(i.crotal) === normC) &&
        diferenciaDias(fechaRefIso, i.fecha) <= 180,
    );

    const mamitis = incRecientes.filter((i) => i.tipo === 'MAMITIS').length;
    const cojeras = incRecientes.filter((i) => i.tipo === 'COJERA').length;

    if (!esCarne && mamitis >= 2) {
      motivos.push(`${mamitis} mamitis en los últimos 6 meses`);
      puntos += 3;
    }
    if (cojeras >= 2) {
      motivos.push(`${cojeras} episodios de cojera recientes`);
      puntos += 2;
    }

    // Último control lechero con RCS > 200.000 cél/ml
    if (!esCarne) {
      const controlesAnimal = controles
        .filter((c) => c.animalId === animal.id || normalizarCrotal(c.crotal) === normC)
        .sort((a, b) => b.fechaControl.localeCompare(a.fechaControl));
      const ultimo = controlesAnimal[0];
      if (ultimo && ultimo.rcsMiles >= 250) {
        motivos.push(`RCS elevado (${ultimo.rcsMiles}.000 cél/ml en último control)`);
        puntos += ultimo.rcsMiles >= 400 ? 3 : 2;
      }
    }

    // Días abiertos > 150 sin gestación confirmada
    if (animal.sexo === 'H' && animal.fechaUltimoParto) {
      const del = diferenciaDias(fechaRefIso, animal.fechaUltimoParto);
      const preñada = inseminaciones.some(
        (ins) =>
          (ins.animalId === animal.id || normalizarCrotal(ins.crotal) === normC) &&
          ins.estado === 'ACTIVA' &&
          ins.confirmadaGestacion,
      );
      if (del > 150 && !preñada) {
        motivos.push(`${del} días desde parto sin gestación confirmada`);
        puntos += del > 200 ? 3 : 2;
      }
    }

    if (motivos.length > 0) {
      alertas.push({
        animal,
        severidad: puntos >= 3 ? 'ALTA' : 'MEDIA',
        motivos,
        puntuacionRiesgo: puntos,
      });
    }
  }

  return alertas.sort((a, b) => b.puntuacionRiesgo - a.puntuacionRiesgo);
}

import { normalizarCrotal } from './crotales';
import { diferenciaDias, formatearFechaEs, hoyIso, parsearFechaFlexible } from './fechas';
import { detectarVacasProblema } from './incidencias';
import { calcularCalendarioReproductivo } from './reproduccion';
import type {
  ControlLecheroRegistro,
  EstadoGanaderia,
  UnidadGanadera,
} from './types';

export function calcularDEL(animal: UnidadGanadera, fechaRefIso: string = hoyIso()): number | undefined {
  if (!animal.fechaUltimoParto) return undefined;
  const dias = diferenciaDias(fechaRefIso, animal.fechaUltimoParto);
  return dias >= 0 ? dias : undefined;
}

export interface VacaVaciaAlerta {
  animal: UnidadGanadera;
  diasDesdeParto: number;
  tieneInseminacionSinConfirmar: boolean;
}

export interface MetricasRebanoGanadero {
  delMedio: number | null;
  diasAbiertosMedio: number | null;
  iepEstimadoDias: number | null;
  tasaConcepcionPct: number | null;
  pr21DiasPct: number | null;
  litrosMediosUltimoControl: number | null;
  rcsAltoCount: number;
  vacasVaciasMas100d: VacaVaciaAlerta[];
  totalHembrasAdultas: number;
}

export function calcularMetricasRebano(
  estado: EstadoGanaderia,
  fechaRefIso: string = hoyIso(),
): MetricasRebanoGanadero {
  const hembrasActivas = estado.animales.filter(
    (a) => a.estado === 'ACTIVO' && a.sexo === 'H' && Boolean(a.fechaUltimoParto),
  );
  const inseminaciones = estado.inseminaciones || [];
  const controles = estado.controlesLecheros || [];

  const dels: number[] = [];
  const diasAbiertosConfirmados: number[] = [];
  const vacasVaciasMas100d: VacaVaciaAlerta[] = [];

  for (const vaca of hembrasActivas) {
    const del = calcularDEL(vaca, fechaRefIso);
    if (del !== undefined) dels.push(del);

    const normC = normalizarCrotal(vaca.crotal);
    const insActiva = inseminaciones.find(
      (i) =>
        (i.animalId === vaca.id || normalizarCrotal(i.crotal) === normC) &&
        i.estado === 'ACTIVA',
    );

    if (insActiva && insActiva.confirmadaGestacion && vaca.fechaUltimoParto) {
      const da = diferenciaDias(insActiva.fechaInseminacion, vaca.fechaUltimoParto);
      if (da >= 20 && da <= 400) {
        diasAbiertosConfirmados.push(da);
      }
    } else if (del !== undefined && del >= 100) {
      vacasVaciasMas100d.push({
        animal: vaca,
        diasDesdeParto: del,
        tieneInseminacionSinConfirmar: Boolean(insActiva),
      });
    }
  }

  const delMedio =
    dels.length > 0 ? Math.round(dels.reduce((a, b) => a + b, 0) / dels.length) : null;

  const diasAbiertosMedio =
    diasAbiertosConfirmados.length > 0
      ? Math.round(
          diasAbiertosConfirmados.reduce((a, b) => a + b, 0) / diasAbiertosConfirmados.length,
        )
      : null;

  // Intervalo entre partos estimado = Días abiertos medios + 283 días de gestación
  const iepEstimadoDias = diasAbiertosMedio !== null ? diasAbiertosMedio + 283 : null;

  // Tasa de concepción simple: confirmadas / inseminaciones evaluables
  const evaluables = inseminaciones.filter((i) => i.estado !== 'PARIDA');
  const confirmadas = evaluables.filter((i) => i.confirmadaGestacion).length;
  const tasaConcepcionPct =
    evaluables.length > 0 ? Math.round((confirmadas / evaluables.length) * 100) : null;

  // PR 21 días aproximada (para el informe del veterinario):
  // proporción de vacas elegibles (>60 DEL) que quedan preñadas por ciclo de 21 días
  const elegibles = hembrasActivas.filter((v) => (calcularDEL(v, fechaRefIso) ?? 0) >= 60);
  let pr21DiasPct: number | null = null;
  if (elegibles.length > 0) {
    const ciclosTotales = elegibles.reduce((acc, v) => {
      const del = calcularDEL(v, fechaRefIso) ?? 60;
      const ciclos = Math.max(1, (Math.min(del, 240) - 50) / 21);
      return acc + ciclos;
    }, 0);
    const gestantes = elegibles.filter((v) => {
      const nc = normalizarCrotal(v.crotal);
      return inseminaciones.some(
        (i) =>
          (i.animalId === v.id || normalizarCrotal(i.crotal) === nc) &&
          i.estado === 'ACTIVA' &&
          i.confirmadaGestacion,
      );
    }).length;
    pr21DiasPct = Math.min(60, Math.round((gestantes / ciclosTotales) * 100));
  }

  // Último control lechero por vaca
  const ultimosPorVaca = new Map<string, ControlLecheroRegistro>();
  for (const c of [...controles].sort((a, b) => a.fechaControl.localeCompare(b.fechaControl))) {
    ultimosPorVaca.set(normalizarCrotal(c.crotal), c);
  }
  const ultimosList = Array.from(ultimosPorVaca.values());
  const litrosMediosUltimoControl =
    ultimosList.length > 0
      ? Number(
          (
            ultimosList.reduce((acc, x) => acc + x.litrosDia, 0) / ultimosList.length
          ).toFixed(1),
        )
      : null;
  const rcsAltoCount = ultimosList.filter((x) => x.rcsMiles >= 200).length;

  vacasVaciasMas100d.sort((a, b) => b.diasDesdeParto - a.diasDesdeParto);

  return {
    delMedio,
    diasAbiertosMedio,
    iepEstimadoDias,
    tasaConcepcionPct,
    pr21DiasPct,
    litrosMediosUltimoControl,
    rcsAltoCount,
    vacasVaciasMas100d,
    totalHembrasAdultas: hembrasActivas.length,
  };
}

function parseNumeroDecimalEs(val: string): number {
  const limpio = val.replace(',', '.').replace(/[^0-9.]/g, '');
  const n = Number(limpio);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Importa informes mensuales CSV de Control Lechero (ASCOL / CONAFE / LILA).
 */
export function parsearCsvControlLechero(
  contenido: string,
  animales: UnidadGanadera[],
  fechaRefIso: string = hoyIso(),
): ControlLecheroRegistro[] {
  const lineas = contenido
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lineas.length < 2) return [];
  const sep = (lineas[0].match(/;/g) || []).length >= (lineas[0].match(/,/g) || []).length ? ';' : ',';
  const cabeceras = lineas[0]
    .split(sep)
    .map((h) =>
      h
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''),
    );

  const findCol = (claves: string[]) =>
    cabeceras.findIndex((h) => claves.some((c) => h === c || h.includes(c)));

  const iCrotal = findCol(['crotal', 'dib', 'identif', 'cib']);
  const iFecha = findCol(['fecha', 'control', 'date']);
  const iLitros = findCol(['litro', 'kg_leche', 'leche', 'prod']);
  const iGrasa = findCol(['grasa', 'fat']);
  const iProt = findCol(['proteina', 'prot']);
  const iRcs = findCol(['rcs', 'celula', 'scc', 'somatica']);

  const mapaAnimales = new Map(animales.map((a) => [normalizarCrotal(a.crotal), a]));
  const resultados: ControlLecheroRegistro[] = [];

  for (let i = 1; i < lineas.length; i++) {
    const cols = lineas[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
    const crotalRaw = iCrotal >= 0 ? cols[iCrotal] : '';
    if (!crotalRaw) continue;
    const crotal = normalizarCrotal(crotalRaw);
    const animal = mapaAnimales.get(crotal);
    const fechaControl =
      (iFecha >= 0 ? parsearFechaFlexible(cols[iFecha]) : undefined) || fechaRefIso;

    let rcsVal = iRcs >= 0 ? parseNumeroDecimalEs(cols[iRcs]) : 0;
    // Si viene en células absolutas (ej. 380000) convertir a miles (380)
    if (rcsVal > 5000) rcsVal = Math.round(rcsVal / 1000);

    resultados.push({
      id: `ctrl-${crotal}-${fechaControl}-${i}`,
      animalId: animal?.id,
      crotal,
      fechaControl,
      litrosDia: iLitros >= 0 ? parseNumeroDecimalEs(cols[iLitros]) : 0,
      grasaPct: iGrasa >= 0 ? parseNumeroDecimalEs(cols[iGrasa]) : 0,
      proteinaPct: iProt >= 0 ? parseNumeroDecimalEs(cols[iProt]) : 0,
      rcsMiles: Math.round(rcsVal),
    });
  }

  return resultados;
}

/**
 * Genera el Parte resumido en 1 página listo para imprimir o enviar por WhatsApp al Veterinario.
 */
export function generarTextoParteVeterinario(
  estado: EstadoGanaderia,
  fechaRefIso: string = hoyIso(),
): string {
  const metricas = calcularMetricasRebano(estado, fechaRefIso);
  const hitosRepro = calcularCalendarioReproductivo(
    estado.inseminaciones,
    estado.animales,
    fechaRefIso,
  );
  const ecografiasPend = hitosRepro.filter((h) => !h.confirmadaGestacion);
  const problemas = detectarVacasProblema(estado, fechaRefIso);
  const esCarne = estado.explotacion.orientacionProductiva === 'CARNE';

  const lineas: string[] = [
    `PARTE PARA VISITA VETERINARIA — ${estado.explotacion.nombre}`,
    `REGA: ${estado.explotacion.codigoRega} · Titular: ${estado.explotacion.titular} · Fecha: ${formatearFechaEs(fechaRefIso)}`,
    '------------------------------------------------------------',
    '1. INDICADORES DEL REBAÑO:',
    `   • Hembras en seguimiento: ${metricas.totalHembrasAdultas}`,
    ...(!esCarne && metricas.delMedio !== null ? [`   • Días en Leche medios (DEL): ${metricas.delMedio} días`] : []),
    `   • Días Abiertos medios: ${metricas.diasAbiertosMedio ?? '—'} días | IEP estimado: ${metricas.iepEstimadoDias ?? '—'} días`,
    `   • Tasa de Concepción: ${metricas.tasaConcepcionPct !== null ? `${metricas.tasaConcepcionPct}%` : '—'} | PR 21 días aprox.: ${metricas.pr21DiasPct !== null ? `${metricas.pr21DiasPct}%` : '—'}`,
    ...(!esCarne && metricas.litrosMediosUltimoControl !== null
      ? [`   • Último control lechero: ${metricas.litrosMediosUltimoControl} L/día · Vacas RCS >= 200k: ${metricas.rcsAltoCount}`]
      : []),
    '',
    `2. ECOGRAFÍAS / DIAGNÓSTICOS DE GESTACIÓN PENDIENTES (${ecografiasPend.length}):`,
    ...(ecografiasPend.length === 0
      ? ['   • Ninguna pendiente.']
      : ecografiasPend.map(
          (h) =>
            `   • #${h.numeroCorto} ${h.nombre || ''} (${h.crotal}) — Insem. ${formatearFechaEs(h.fechaInseminacion)}${h.toro ? ` · Toro ${h.toro}` : ''}`,
        )),
    '',
    `3. VACAS VACÍAS CON >100 DÍAS DESDE PARTO (${metricas.vacasVaciasMas100d.length}):`,
    ...(metricas.vacasVaciasMas100d.length === 0
      ? ['   • Ninguna.']
      : metricas.vacasVaciasMas100d.map(
          (v) =>
            `   • #${v.animal.numeroCorto} ${v.animal.nombre || ''} — ${v.diasDesdeParto} días desde parto (${v.tieneInseminacionSinConfirmar ? 'Inseminada sin confirmar' : 'Sin inseminar'})`,
        )),
    '',
    `4. VACAS CON INCIDENCIAS RECIENTES O RCS ELEVADO (${problemas.length}):`,
    ...(problemas.length === 0
      ? ['   • Sin incidencias críticas.']
      : problemas.map(
          (p) => `   • #${p.animal.numeroCorto} ${p.animal.nombre || ''} (${p.severidad}): ${p.motivos.join('; ')}`,
        )),
  ];

  return lineas.join('\n');
}

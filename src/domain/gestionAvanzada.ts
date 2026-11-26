import { diferenciaDias, hoyIso } from './fechas';
import { ESPECIES_META } from './reglasNormativas';
import type {
  CampanaSaneamiento,
  CategoriaEconomica,
  DificultadParto,
  EspecieCodigo,
  EstadoGanaderia,
  MedicamentoBotiquin,
  PesajeAnimal,
  TipoCampanaSaneamiento,
  UnidadGanadera,
} from './types';

export const DIFICULTAD_PARTO_META: Record<
  DificultadParto,
  { codigo: DificultadParto; etiqueta: string; corta: string; color: string; barClass: string }
> = {
  1: { codigo: 1, etiqueta: '1 · Sin ayuda (Normal)', corta: 'Sin ayuda', color: '#16a34a', barClass: 'bg-emerald-500' },
  2: { codigo: 2, etiqueta: '2 · Asistencia leve', corta: 'Asist. leve', color: '#84cc16', barClass: 'bg-lime-500' },
  3: { codigo: 3, etiqueta: '3 · Asistencia mayor', corta: 'Asist. mayor', color: '#f59e0b', barClass: 'bg-amber-500' },
  4: { codigo: 4, etiqueta: '4 · Cesárea', corta: 'Cesárea', color: '#ef4444', barClass: 'bg-red-500' },
  5: { codigo: 5, etiqueta: '5 · Mala presentación', corta: 'Mala pres.', color: '#dc2626', barClass: 'bg-rose-600' },
};

export const BOTIQUIN_INICIAL: MedicamentoBotiquin[] = [
  {
    id: 'med-amoxi',
    nombre: 'Amoxicilina LA 150 mg/ml',
    principioActivo: 'Amoxicilina trihidrato',
    dosisHabitual: '1 ml / 10 kg PV (IM)',
    diasSupresionCarne: 18,
    diasSupresionLeche: 3,
    proveedor: 'Cooperativa Asturiana Agrovet',
  },
  {
    id: 'med-ceftiofur',
    nombre: 'Ceftiofur 50 mg/ml',
    principioActivo: 'Ceftiofur hidrocloruro',
    dosisHabitual: '1 ml / 50 kg PV (SC)',
    diasSupresionCarne: 8,
    diasSupresionLeche: 0,
    proveedor: 'Cooperativa Asturiana Agrovet',
  },
  {
    id: 'med-mamitis-jeringa',
    nombre: 'Synulox LC (Intramamario)',
    principioActivo: 'Amoxicilina + Clavulánico + Prednisolona',
    dosisHabitual: '1 jeringa / cuarterón cada 12h (3 dosis)',
    diasSupresionCarne: 7,
    diasSupresionLeche: 4,
    proveedor: 'VetAstur Suministros',
  },
  {
    id: 'med-meloxicam',
    nombre: 'Metacam 20 mg/ml (Antiinflamatorio)',
    principioActivo: 'Meloxicam',
    dosisHabitual: '2,5 ml / 100 kg PV',
    diasSupresionCarne: 15,
    diasSupresionLeche: 5,
    proveedor: 'VetAstur Suministros',
  },
  {
    id: 'med-desparasitante',
    nombre: 'Ivermectina Pour-On',
    principioActivo: 'Ivermectina',
    dosisHabitual: '1 ml / 10 kg PV (tópico)',
    diasSupresionCarne: 28,
    diasSupresionLeche: 0,
    proveedor: 'Cooperativa Asturiana Agrovet',
    notas: 'No usar en vacas en lactación para consumo humano.',
  },
  {
    id: 'med-vacuna-ibr',
    nombre: 'Vacuna Polivalente IBR / BVD',
    principioActivo: 'Vacuna inactivada',
    dosisHabitual: '2 ml / animal (IM)',
    diasSupresionCarne: 0,
    diasSupresionLeche: 0,
    proveedor: 'Servicios Veterinarios del Narcea',
  },
];

export const VETERINARIOS_INICIALES = [
  'Dra. Laura Fernández (Col. 33-0842)',
  'Dr. Javier Álvarez (ADS Narcea)',
  'Servicios Veterinarios del Principado',
];

export const PROVEEDORES_INICIALES = [
  'Cooperativa Asturiana Agrovet',
  'VetAstur Suministros',
  'Servicios Veterinarios del Narcea',
];

export const CAMPANAS_SANEAMIENTO_META: Record<
  TipoCampanaSaneamiento,
  { etiqueta: string; mesesVigencia: number }
> = {
  TUBERCULOSIS: { etiqueta: 'Tuberculosis bovina (IDTB)', mesesVigencia: 12 },
  BRUCELOSIS: { etiqueta: 'Brucelosis', mesesVigencia: 12 },
  IBR: { etiqueta: 'IBR (Rinotraqueítis)', mesesVigencia: 12 },
  BVD: { etiqueta: 'BVD (Diarrea Vírica)', mesesVigencia: 12 },
  LENGUA_AZUL: { etiqueta: 'Lengua Azul (Vacunación/Control)', mesesVigencia: 12 },
  PARATUBERCULOSIS: { etiqueta: 'Paratuberculosis', mesesVigencia: 12 },
  OTRA: { etiqueta: 'Otra campaña sanitaria', mesesVigencia: 12 },
};

export const CATEGORIAS_ECONOMICAS_META: Record<
  CategoriaEconomica,
  { etiqueta: string; tipoDefecto: 'INGRESO' | 'GASTO' }
> = {
  VENTA_ANIMAL: { etiqueta: 'Venta de animales / cebadero', tipoDefecto: 'INGRESO' },
  VENTA_LECHE: { etiqueta: 'Liquidación de leche', tipoDefecto: 'INGRESO' },
  AYUDA_PAC: { etiqueta: 'Ayudas PAC / Eco-regímenes', tipoDefecto: 'INGRESO' },
  COMPRA_ANIMAL: { etiqueta: 'Compra de ganado / reposición', tipoDefecto: 'GASTO' },
  VETERINARIO: { etiqueta: 'Honorarios veterinario / repro', tipoDefecto: 'GASTO' },
  MEDICAMENTOS: { etiqueta: 'Medicamentos / botiquín', tipoDefecto: 'GASTO' },
  ALIMENTACION: { etiqueta: 'Pienso / forraje / carro', tipoDefecto: 'GASTO' },
  OTRO: { etiqueta: 'Otros ingresos o gastos', tipoDefecto: 'GASTO' },
};

// ============================================================================
// EDAD EXACTA, ETAPAS Y CÁLCULO OFICIAL DE UGM (PAC / ESPAÑA)
// ============================================================================

export function calcularEdadDias(fechaNacimiento: string, fechaRefIso: string = hoyIso()): number {
  return Math.max(0, diferenciaDias(fechaRefIso, fechaNacimiento));
}

export function formatearEdadExacta(
  fechaNacimiento: string,
  fechaRefIso: string = hoyIso(),
  compacto = false,
): string {
  const diasTotales = calcularEdadDias(fechaNacimiento, fechaRefIso);
  if (diasTotales < 30) {
    return compacto ? `${diasTotales}d` : `${diasTotales} día${diasTotales === 1 ? '' : 's'}`;
  }
  const anios = Math.floor(diasTotales / 365.25);
  const restoTrasAnios = Math.floor(diasTotales - anios * 365.25);
  const meses = Math.floor(restoTrasAnios / 30.44);
  const dias = Math.max(0, Math.round(restoTrasAnios - meses * 30.44));

  if (compacto) {
    if (anios >= 1) return `${anios}a ${meses}m`;
    return `${meses}m ${dias}d`;
  }
  const partes: string[] = [];
  if (anios > 0) partes.push(`${anios} año${anios === 1 ? '' : 's'}`);
  if (meses > 0) partes.push(`${meses} mes${meses === 1 ? '' : 'es'}`);
  if (anios === 0 && dias > 0) partes.push(`${dias} día${dias === 1 ? '' : 's'}`);
  return partes.join(', ') || '0 días';
}

export type EtapaAnimal = 'VACA' | 'NOVILLA' | 'TORO' | 'TERNERO';

export function clasificarEtapaAnimal(
  animal: UnidadGanadera,
  fechaRefIso: string = hoyIso(),
): EtapaAnimal {
  const meses = calcularEdadDias(animal.fechaNacimiento, fechaRefIso) / 30.44;
  if (meses < 12) return 'TERNERO';
  if (animal.sexo === 'M') return 'TORO';
  if (animal.fechaUltimoParto || (animal.numeroLactacion ?? 0) > 0 || meses >= 24) return 'VACA';
  return 'NOVILLA';
}

/**
 * Tabla oficial UGM (Unidades de Ganado Mayor) usada en PAC y normativas autonómicas:
 * - Bovino: <6m = 0.2, 6-24m = 0.6, >=24m = 1.0
 * - Ovino / Caprino: <6m = 0.05, >=6m = 0.15
 * - Equino: <6m = 0.3, 6-24m = 0.6, >=24m = 0.9
 * - Porcino: 0.3
 */
export function calcularUGMAnimal(
  animal: UnidadGanadera,
  fechaRefIso: string = hoyIso(),
): number {
  if (animal.estado !== 'ACTIVO') return 0;
  const meses = calcularEdadDias(animal.fechaNacimiento, fechaRefIso) / 30.44;
  const cant = Math.max(1, animal.cantidadEnLote || 1);
  let unit = 1.0;

  switch (animal.especie) {
    case 'BOVINO':
      unit = meses < 6 ? 0.2 : meses < 24 ? 0.6 : 1.0;
      break;
    case 'OVINO':
    case 'CAPRINO':
      unit = meses < 6 ? 0.05 : 0.15;
      break;
    case 'EQUINO':
      unit = meses < 6 ? 0.3 : meses < 24 ? 0.6 : 0.9;
      break;
    case 'PORCINO':
      unit = 0.3;
      break;
  }
  return Number((unit * cant).toFixed(2));
}

export function calcularUGMRebano(
  animales: UnidadGanadera[],
  fechaRefIso: string = hoyIso(),
): { totalUgm: number; vacas: number; novillas: number; toros: number; terneros: number } {
  let totalUgm = 0;
  let vacas = 0;
  let novillas = 0;
  let toros = 0;
  let terneros = 0;

  for (const a of animales) {
    if (a.estado !== 'ACTIVO') continue;
    totalUgm += calcularUGMAnimal(a, fechaRefIso);
    const etapa = clasificarEtapaAnimal(a, fechaRefIso);
    if (etapa === 'VACA') vacas += 1;
    else if (etapa === 'NOVILLA') novillas += 1;
    else if (etapa === 'TORO') toros += 1;
    else terneros += 1;
  }

  return {
    totalUgm: Number(totalUgm.toFixed(2)),
    vacas,
    novillas,
    toros,
    terneros,
  };
}

// ============================================================================
// RAZAS PERSONALIZADAS Y CRUCE AUTOMÁTICO PADRE × MADRE
// ============================================================================

export function obtenerTodasLasRazas(
  especie: EspecieCodigo,
  personalizadas: string[] = [],
): string[] {
  const base = ESPECIES_META[especie]?.razasComunes || [];
  const combinadas = [...base, ...personalizadas];
  return Array.from(new Set(combinadas.filter(Boolean)));
}

export function sugerirRazaCruce(razaMadre?: string, razaPadre?: string): string | null {
  const m = razaMadre?.trim();
  const p = razaPadre?.trim();
  if (!m || !p) return null;
  const mBase = m.split('(')[0].trim();
  const pBase = p.split('(')[0].trim();
  if (mBase.toLowerCase() === pBase.toLowerCase()) return m;
  return `Cruce ${mBase} × ${pBase} (F1)`;
}

// ============================================================================
// PESOS, DESTETES Y GANANCIA MEDIA DIARIA (GMD kg/día)
// ============================================================================

export interface ResumenGmdAnimal {
  pesajesOrdenados: PesajeAnimal[];
  pesoInicialKg?: number;
  pesoActualKg?: number;
  pesoDesteteKg?: number;
  gananciaTotalKg?: number;
  diasMedidos?: number;
  gmdKgDia?: number;
}

export function calcularGmdAnimal(
  animalId: string,
  pesajes: PesajeAnimal[] = [],
): ResumenGmdAnimal {
  const delAnimal = pesajes
    .filter((p) => p.animalId === animalId && p.pesoKg > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  if (delAnimal.length === 0) {
    return { pesajesOrdenados: [] };
  }

  const primero = delAnimal[0];
  const ultimo = delAnimal[delAnimal.length - 1];
  const destete = delAnimal.find((p) => p.tipo === 'DESTETE');

  if (delAnimal.length === 1) {
    return {
      pesajesOrdenados: delAnimal,
      pesoInicialKg: primero.pesoKg,
      pesoActualKg: ultimo.pesoKg,
      pesoDesteteKg: destete?.pesoKg,
    };
  }

  const dias = Math.max(1, diferenciaDias(ultimo.fecha, primero.fecha));
  const ganancia = Number((ultimo.pesoKg - primero.pesoKg).toFixed(1));
  const gmd = Number((ganancia / dias).toFixed(3));

  return {
    pesajesOrdenados: delAnimal,
    pesoInicialKg: primero.pesoKg,
    pesoActualKg: ultimo.pesoKg,
    pesoDesteteKg: destete?.pesoKg,
    gananciaTotalKg: ganancia,
    diasMedidos: dias,
    gmdKgDia: gmd,
  };
}

export function calcularResumenCrecimientoRebano(
  animales: UnidadGanadera[],
  pesajes: PesajeAnimal[] = [],
): {
  gmdMediaRebano: number | null;
  animalesConPesaje: number;
  pesoMedioDesteteKg: number | null;
} {
  const gmds: number[] = [];
  const destetes: number[] = [];
  let conPesaje = 0;

  for (const a of animales) {
    const res = calcularGmdAnimal(a.id, pesajes);
    if (res.pesajesOrdenados.length > 0) conPesaje += 1;
    if (typeof res.gmdKgDia === 'number' && res.gmdKgDia > 0) gmds.push(res.gmdKgDia);
    if (typeof res.pesoDesteteKg === 'number') destetes.push(res.pesoDesteteKg);
  }

  return {
    gmdMediaRebano:
      gmds.length > 0 ? Number((gmds.reduce((s, x) => s + x, 0) / gmds.length).toFixed(2)) : null,
    animalesConPesaje: conPesaje,
    pesoMedioDesteteKg:
      destetes.length > 0
        ? Math.round(destetes.reduce((s, x) => s + x, 0) / destetes.length)
        : null,
  };
}

// ============================================================================
// ÁRBOL GENEALÓGICO (3 GENERACIONES) E ÍNDICE DE CONSANGUINIDAD (WRIGHT)
// ============================================================================

export interface NodoPedigri {
  clave: string;
  etiqueta: string;
  crotal?: string;
  animalId?: string;
  sexo?: 'H' | 'M';
  raza?: string;
  madre?: NodoPedigri;
  padre?: NodoPedigri;
}

function normalizarClaveAncestro(raw?: string): string {
  return (raw || '').trim().toUpperCase();
}

function buscarAnimalPorReferencia(
  ref: string | undefined,
  animales: UnidadGanadera[],
): UnidadGanadera | undefined {
  const clave = normalizarClaveAncestro(ref);
  if (!clave) return undefined;
  return animales.find(
    (a) =>
      normalizarClaveAncestro(a.crotal) === clave ||
      normalizarClaveAncestro(a.numeroCorto) === clave ||
      normalizarClaveAncestro(a.nombre) === clave,
  );
}

export function construirArbolGenealogico(
  animal: UnidadGanadera,
  animales: UnidadGanadera[],
  profundidadMax = 3,
): NodoPedigri {
  const construir = (
    refAnimal: UnidadGanadera | undefined,
    etiquetaFallback: string,
    sexoFallback: 'H' | 'M' | undefined,
    nivel: number,
    visitados: Set<string>,
  ): NodoPedigri => {
    const clave = normalizarClaveAncestro(refAnimal?.crotal || etiquetaFallback);
    const nodo: NodoPedigri = {
      clave,
      etiqueta: refAnimal
        ? `${refAnimal.nombre ? `${refAnimal.nombre} ` : ''}#${refAnimal.numeroCorto}`
        : etiquetaFallback,
      crotal: refAnimal?.crotal,
      animalId: refAnimal?.id,
      sexo: refAnimal?.sexo || sexoFallback,
      raza: refAnimal?.raza,
    };

    if (!refAnimal || nivel >= profundidadMax || visitados.has(clave)) {
      return nodo;
    }

    const sigVisitados = new Set(visitados);
    sigVisitados.add(clave);

    if (refAnimal.crotalMadre) {
      const m = buscarAnimalPorReferencia(refAnimal.crotalMadre, animales);
      nodo.madre = construir(m, refAnimal.crotalMadre, 'H', nivel + 1, sigVisitados);
    }
    const refPadre = refAnimal.crotalPadre || refAnimal.padreNombre;
    if (refPadre) {
      const p = buscarAnimalPorReferencia(refPadre, animales);
      nodo.padre = construir(p, refPadre, 'M', nivel + 1, sigVisitados);
    }
    return nodo;
  };

  return construir(animal, animal.crotal, animal.sexo, 0, new Set());
}

/**
 * Recolecta todos los ancestros (y sus distancias generacionales n) de una referencia.
 */
function recolectarAncestrosConDistancia(
  refInicial: string,
  animales: UnidadGanadera[],
  maxGen = 4,
): Map<string, { etiqueta: string; distancias: number[] }> {
  const mapa = new Map<string, { etiqueta: string; distancias: number[] }>();

  const visitar = (ref: string, dist: number, camino: Set<string>) => {
    const clave = normalizarClaveAncestro(ref);
    if (!clave || dist > maxGen || camino.has(clave)) return;

    const a = buscarAnimalPorReferencia(ref, animales);
    const etiqueta = a
      ? `${a.nombre ? `${a.nombre} ` : ''}(#${a.numeroCorto})`
      : ref.trim();

    const actual = mapa.get(clave);
    if (actual) {
      actual.distancias.push(dist);
    } else {
      mapa.set(clave, { etiqueta, distancias: [dist] });
    }

    if (!a) return;
    const nuevoCamino = new Set(camino);
    nuevoCamino.add(clave);

    if (a.crotalMadre) visitar(a.crotalMadre, dist + 1, nuevoCamino);
    const refPadre = a.crotalPadre || a.padreNombre;
    if (refPadre) visitar(refPadre, dist + 1, nuevoCamino);
  };

  visitar(refInicial, 0, new Set());
  return mapa;
}

export interface ResultadoConsanguinidad {
  coeficientePct: number; // ej. 12.5 (%)
  nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO';
  antepasadosComunes: string[];
  mensaje: string;
}

/**
 * Calcula el coeficiente de consanguinidad potencial F (método de caminos de Wright)
 * si se cruza `madreRef` (crotal o nombre) con `padreRef` (toro o semen).
 */
export function calcularConsanguinidadPotencial(
  madreRef: string | undefined,
  padreRef: string | undefined,
  animales: UnidadGanadera[],
): ResultadoConsanguinidad {
  if (!madreRef?.trim() || !padreRef?.trim()) {
    return {
      coeficientePct: 0,
      nivelRiesgo: 'BAJO',
      antepasadosComunes: [],
      mensaje: 'Sin datos de ambos progenitores para estimar consanguinidad.',
    };
  }

  const ancestrosMadre = recolectarAncestrosConDistancia(madreRef, animales);
  const ancestrosPadre = recolectarAncestrosConDistancia(padreRef, animales);

  let sumaF = 0;
  const comunes: string[] = [];

  for (const [clave, infoM] of ancestrosMadre.entries()) {
    const infoP = ancestrosPadre.get(clave);
    if (!infoP) continue;
    comunes.push(infoM.etiqueta);
    // Usamos la distancia más corta en cada rama para evitar doble conteo de subcaminos triviales
    const n1 = Math.min(...infoM.distancias);
    const n2 = Math.min(...infoP.distancias);
    sumaF += Math.pow(0.5, n1 + n2 + 1);
  }

  const pct = Number(Math.min(50, sumaF * 100).toFixed(1));
  const nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO' =
    pct >= 12.5 ? 'ALTO' : pct >= 6.25 ? 'MEDIO' : 'BAJO';

  let mensaje = 'Cruce seguro (0 % de consanguinidad detectada).';
  if (pct >= 12.5) {
    mensaje = `Riesgo ALTO (${pct} %): parentesco estrecho por ${comunes.join(', ')}. Evita este cruce.`;
  } else if (pct >= 6.25) {
    mensaje = `Precaución (${pct} %): comparten ancestro (${comunes.join(', ')}). Valora otro toro.`;
  } else if (pct > 0) {
    mensaje = `Consanguinidad baja (${pct} %) vía ${comunes.join(', ')}. Aceptable.`;
  }

  return {
    coeficientePct: pct,
    nivelRiesgo,
    antepasadosComunes: comunes,
    mensaje,
  };
}

// ============================================================================
// RANKING VISUAL DE MADRES (SUPERANDO "MOTHER CALVING" DE VACAPP)
// ============================================================================

export interface MetricaMadreRanking {
  animal: UnidadGanadera;
  numeroPartos: number;
  iepMedioDias: number | null;
  diasDesdeUltimoParto: number | null;
  distribucionDificultad: [number, number, number, number, number]; // índices 0..4 => dificultad 1..5
  gmdMediaCrias: number | null;
  ultimoRcsMiles: number | null;
  ultimosLitros: number | null;
  puntuacion: number; // 0..100
  etiquetaEstado: 'Top Madre' | 'Estable' | 'Revisar';
}

export function calcularRankingMadres(
  estado: EstadoGanaderia,
  fechaRefIso: string = hoyIso(),
): MetricaMadreRanking[] {
  const madresActivas = estado.animales.filter(
    (a) =>
      a.estado === 'ACTIVO' &&
      a.sexo === 'H' &&
      (clasificarEtapaAnimal(a, fechaRefIso) === 'VACA' || Boolean(a.fechaUltimoParto)),
  );

  const resultados: MetricaMadreRanking[] = [];

  for (const madre of madresActivas) {
    // Recopilamos fechas de partos desde eventos NACIMIENTO, crías en censo y fechaUltimoParto
    const fechasPartoSet = new Set<string>();
    const dist: [number, number, number, number, number] = [0, 0, 0, 0, 0];

    const eventosParto = estado.eventos.filter(
      (e) => e.tipo === 'NACIMIENTO' && e.crotalMadre === madre.crotal,
    );
    for (const ev of eventosParto) {
      fechasPartoSet.add(ev.fechaEvento);
      const d = ev.dificultadParto || 1;
      dist[d - 1] += 1;
    }

    const crias = estado.animales.filter((a) => a.crotalMadre === madre.crotal);
    for (const c of crias) {
      if (!fechasPartoSet.has(c.fechaNacimiento)) {
        fechasPartoSet.add(c.fechaNacimiento);
        const d = c.dificultadPartoNacimiento || 1;
        dist[d - 1] += 1;
      }
    }

    if (madre.fechaUltimoParto && !fechasPartoSet.has(madre.fechaUltimoParto)) {
      fechasPartoSet.add(madre.fechaUltimoParto);
      dist[0] += 1;
    }

    // Incidencias de parto difícil
    const incParto = (estado.incidencias || []).filter(
      (i) => i.animalId === madre.id && i.tipo === 'PARTO_DIFICIL',
    );
    if (incParto.length > 0 && dist[2] + dist[3] + dist[4] === 0) {
      dist[2] += incParto.length;
    }

    const fechasOrdenadas = Array.from(fechasPartoSet).sort();
    const numPartos = Math.max(fechasOrdenadas.length, madre.numeroLactacion || 0);

    let iepMedioDias: number | null = null;
    if (fechasOrdenadas.length >= 2) {
      const intervalos: number[] = [];
      for (let i = 1; i < fechasOrdenadas.length; i++) {
        const diff = diferenciaDias(fechasOrdenadas[i], fechasOrdenadas[i - 1]);
        if (diff >= 260 && diff <= 900) intervalos.push(diff);
      }
      if (intervalos.length > 0) {
        iepMedioDias = Math.round(intervalos.reduce((s, x) => s + x, 0) / intervalos.length);
      }
    }

    const ultimaFechaParto =
      fechasOrdenadas.length > 0
        ? fechasOrdenadas[fechasOrdenadas.length - 1]
        : madre.fechaUltimoParto;
    const diasDesdeUltimoParto = ultimaFechaParto
      ? Math.max(0, diferenciaDias(fechaRefIso, ultimaFechaParto))
      : null;

    // GMD media de sus crías
    const gmdsCrias: number[] = [];
    for (const c of crias) {
      const g = calcularGmdAnimal(c.id, estado.pesajes);
      if (typeof g.gmdKgDia === 'number' && g.gmdKgDia > 0) gmdsCrias.push(g.gmdKgDia);
    }
    const gmdMediaCrias =
      gmdsCrias.length > 0
        ? Number((gmdsCrias.reduce((s, x) => s + x, 0) / gmdsCrias.length).toFixed(2))
        : null;

    // Último control lechero
    const controles = (estado.controlesLecheros || [])
      .filter((c) => c.crotal === madre.crotal || c.animalId === madre.id)
      .sort((a, b) => b.fechaControl.localeCompare(a.fechaControl));
    const ultControl = controles[0];

    // Puntuación práctica 0..100
    let score = 80;
    if (iepMedioDias !== null) {
      if (iepMedioDias <= 390) score += 12;
      else if (iepMedioDias > 430) score -= 22;
      else if (iepMedioDias > 405) score -= 10;
    }
    if (diasDesdeUltimoParto !== null) {
      if (diasDesdeUltimoParto > 420) score -= 25;
      else if (diasDesdeUltimoParto > 365) score -= 10;
    }
    const partosComplicados = dist[2] + dist[3] + dist[4];
    score -= partosComplicados * 12;
    if (ultControl && ultControl.rcsMiles >= 200) score -= 14;
    if (gmdMediaCrias !== null && gmdMediaCrias >= 1.0) score += 8;

    score = Math.max(10, Math.min(100, Math.round(score)));
    const etiquetaEstado: 'Top Madre' | 'Estable' | 'Revisar' =
      score >= 82 ? 'Top Madre' : score >= 62 ? 'Estable' : 'Revisar';

    resultados.push({
      animal: madre,
      numeroPartos: numPartos,
      iepMedioDias,
      diasDesdeUltimoParto,
      distribucionDificultad: dist,
      gmdMediaCrias,
      ultimoRcsMiles: ultControl ? ultControl.rcsMiles : null,
      ultimosLitros: ultControl ? ultControl.litrosDia : null,
      puntuacion: score,
      etiquetaEstado,
    });
  }

  return resultados.sort((a, b) => b.puntuacion - a.puntuacion);
}

// ============================================================================
// EVOLUCIÓN MENSUAL Y ECONOMÍA BÁSICA (€)
// ============================================================================

export interface PuntoEvolucionMensual {
  mesKey: string; // YYYY-MM
  etiqueta: string; // Ene, Feb...
  nacimientos: number;
  bajas: number;
  ventas: number;
  compras: number;
  ingresosEur: number;
  gastosEur: number;
}

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function calcularEvolucionMensual(
  estado: EstadoGanaderia,
  meses = 6,
  fechaRefIso: string = hoyIso(),
): PuntoEvolucionMensual[] {
  const [yRef, mRef] = fechaRefIso.split('-').map(Number);
  const puntos: PuntoEvolucionMensual[] = [];
  const mapa = new Map<string, PuntoEvolucionMensual>();

  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(yRef, mRef - 1 - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const p: PuntoEvolucionMensual = {
      mesKey: key,
      etiqueta: MESES_CORTOS[m - 1],
      nacimientos: 0,
      bajas: 0,
      ventas: 0,
      compras: 0,
      ingresosEur: 0,
      gastosEur: 0,
    };
    puntos.push(p);
    mapa.set(key, p);
  }

  for (const ev of estado.eventos) {
    const key = ev.fechaEvento?.slice(0, 7);
    const p = key ? mapa.get(key) : undefined;
    if (!p) continue;
    if (ev.tipo === 'NACIMIENTO') p.nacimientos += 1;
    else if (ev.tipo === 'BAJA_MUERTE') p.bajas += 1;
    else if (ev.tipo === 'VENTA' || ev.tipo === 'SALIDA_MATADERO') p.ventas += 1;
    else if (ev.tipo === 'COMPRA') p.compras += 1;
  }

  for (const mov of estado.movimientosEconomicos || []) {
    const key = mov.fecha?.slice(0, 7);
    const p = key ? mapa.get(key) : undefined;
    if (!p) continue;
    if (mov.tipo === 'INGRESO') p.ingresosEur += mov.importeEur;
    else p.gastosEur += mov.importeEur;
  }

  return puntos;
}

export function calcularResumenEconomico(estado: EstadoGanaderia): {
  totalIngresosEur: number;
  totalGastosEur: number;
  saldoNetoEur: number;
  totalMovimientos: number;
} {
  const movs = estado.movimientosEconomicos || [];
  let ing = 0;
  let gas = 0;
  for (const m of movs) {
    if (m.tipo === 'INGRESO') ing += m.importeEur;
    else gas += m.importeEur;
  }
  return {
    totalIngresosEur: Number(ing.toFixed(2)),
    totalGastosEur: Number(gas.toFixed(2)),
    saldoNetoEur: Number((ing - gas).toFixed(2)),
    totalMovimientos: movs.length,
  };
}

export function obtenerSaneamientosProximos(
  saneamientos: CampanaSaneamiento[] = [],
  fechaRefIso: string = hoyIso(),
): Array<CampanaSaneamiento & { diasRestantes: number }> {
  return saneamientos
    .filter((s) => Boolean(s.fechaProxima))
    .map((s) => ({
      ...s,
      diasRestantes: diferenciaDias(s.fechaProxima!, fechaRefIso),
    }))
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}

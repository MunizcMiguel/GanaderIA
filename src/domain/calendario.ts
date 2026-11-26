import { normalizarCrotal } from './crotales';
import { hoyIso, sumarDiasIso } from './fechas';
import { obtenerReglasNormativas } from './reglasNormativas';
import { calcularCalendarioReproductivo } from './reproduccion';
import type { EstadoGanaderia } from './types';

export type CategoriaCalendario =
  | 'NACIMIENTO'
  | 'BAJA'
  | 'REGISTRO_PRINCIPADO'
  | 'RECETA_SUPRESION'
  | 'SALIDA_GUIA'
  | 'REPRODUCCION';

export type NaturalezaHito = 'REALIZADO' | 'PREVISTO';

export interface MetaCategoriaCalendario {
  id: CategoriaCalendario;
  etiqueta: string;
  etiquetaCorta: string;
  colorHex: string;
  bgSoftClass: string;
  textClass: string;
  borderClass: string;
}

export const CATEGORIAS_CALENDARIO: MetaCategoriaCalendario[] = [
  {
    id: 'NACIMIENTO',
    etiqueta: 'Nacimiento',
    etiquetaCorta: 'Nacim.',
    colorHex: '#16a34a',
    bgSoftClass: 'bg-emerald-50',
    textClass: 'text-emerald-900',
    borderClass: 'border-emerald-200',
  },
  {
    id: 'BAJA',
    etiqueta: 'Baja / Muerte',
    etiquetaCorta: 'Baja',
    colorHex: '#dc2626',
    bgSoftClass: 'bg-red-50',
    textClass: 'text-red-900',
    borderClass: 'border-red-200',
  },
  {
    id: 'REGISTRO_PRINCIPADO',
    etiqueta: 'Registro / Plazo Principado',
    etiquetaCorta: 'Principado',
    colorHex: '#d97706',
    bgSoftClass: 'bg-amber-50',
    textClass: 'text-amber-950',
    borderClass: 'border-amber-200',
  },
  {
    id: 'RECETA_SUPRESION',
    etiqueta: 'Receta / Supresión',
    etiquetaCorta: 'Receta',
    colorHex: '#9333ea',
    bgSoftClass: 'bg-purple-50',
    textClass: 'text-purple-950',
    borderClass: 'border-purple-200',
  },
  {
    id: 'SALIDA_GUIA',
    etiqueta: 'Salida / Guía',
    etiquetaCorta: 'Salida',
    colorHex: '#0284c7',
    bgSoftClass: 'bg-sky-50',
    textClass: 'text-sky-950',
    borderClass: 'border-sky-200',
  },
  {
    id: 'REPRODUCCION',
    etiqueta: 'Reproducción',
    etiquetaCorta: 'Reprod.',
    colorHex: '#e11d48',
    bgSoftClass: 'bg-rose-50',
    textClass: 'text-rose-950',
    borderClass: 'border-rose-200',
  },
];

export const MAPA_CATEGORIAS_CALENDARIO: Record<CategoriaCalendario, MetaCategoriaCalendario> =
  Object.fromEntries(CATEGORIAS_CALENDARIO.map((c) => [c.id, c])) as Record<
    CategoriaCalendario,
    MetaCategoriaCalendario
  >;

export interface EventoCalendario {
  id: string;
  fecha: string; // YYYY-MM-DD
  categoria: CategoriaCalendario;
  naturaleza: NaturalezaHito;
  titulo: string;
  detalle: string;
  crotal?: string;
  numeroCorto?: string;
  animalId?: string;
  animalNombre?: string;
  accionDestino?: 'FICHA_ANIMAL' | 'COLA_REMOWEB' | 'SALIDAS_DOCS';
}

export interface ResumenDiaCalendario {
  fecha: string;
  eventos: EventoCalendario[];
  categoriasUnicas: CategoriaCalendario[];
  tieneRealizados: boolean;
  tienePrevistos: boolean;
}

export interface CeldaMesCalendario {
  fecha: string; // YYYY-MM-DD
  diaNumero: number;
  esDelMesActual: boolean;
  esHoy: boolean;
}

/**
 * Recopila todas las operaciones realizadas y los hitos/vencimientos futuros de la explotación
 * en una línea temporal unificada para el calendario mensual.
 */
export function construirEventosCalendario(
  estado: EstadoGanaderia,
  fechaRefIso: string = hoyIso(),
): EventoCalendario[] {
  const items: EventoCalendario[] = [];
  const mapaPorId = new Map(estado.animales.map((a) => [a.id, a]));
  const mapaPorCrotal = new Map(
    estado.animales.map((a) => [normalizarCrotal(a.crotal), a]),
  );

  const resolverAnimal = (animalId?: string, crotal?: string) => {
    if (animalId && mapaPorId.has(animalId)) return mapaPorId.get(animalId);
    if (crotal) return mapaPorCrotal.get(normalizarCrotal(crotal));
    return undefined;
  };

  // 1. Eventos registrados (nacimientos, bajas, salidas, tratamientos, registros en Principado y sus plazos)
  for (const ev of estado.eventos) {
    const animal = resolverAnimal(ev.animalId, ev.crotal);
    const reglas = obtenerReglasNormativas(estado.explotacion.comunidad, ev.especie);
    const metaAnimal = {
      crotal: animal?.crotal || ev.crotal,
      numeroCorto: animal?.numeroCorto || (ev.crotal ? ev.crotal.slice(-4) : undefined),
      animalId: animal?.id,
      animalNombre: animal?.nombre,
    };

    if (ev.tipo === 'NACIMIENTO') {
      items.push({
        id: `cal-ev-${ev.id}`,
        fecha: ev.fechaEvento,
        categoria: 'NACIMIENTO',
        naturaleza: 'REALIZADO',
        titulo: `Nacimiento ${metaAnimal.crotal || '(sin crotal)'}`,
        detalle: `${ev.sexo === 'M' ? 'Macho' : 'Hembra'}${ev.raza ? ` · ${ev.raza}` : ''}${
          ev.crotalMadre ? ` · Madre #${ev.crotalMadre.slice(-4)}` : ''
        }`,
        ...metaAnimal,
        accionDestino: animal ? 'FICHA_ANIMAL' : 'COLA_REMOWEB',
      });

      if (ev.estadoTramite === 'PENDIENTE') {
        const fechaLimiteNotif = sumarDiasIso(
          ev.fechaEvento,
          reglas.plazoNotificacionNacimientoDias,
        );
        items.push({
          id: `cal-plazo-nac-${ev.id}`,
          fecha: fechaLimiteNotif,
          categoria: 'REGISTRO_PRINCIPADO',
          naturaleza: 'PREVISTO',
          titulo: `Límite ${reglas.plazoNotificacionNacimientoDias}d comunicar nacimiento ${metaAnimal.crotal}`,
          detalle: `Plazo legal máximo en ${reglas.portalNombre}.`,
          ...metaAnimal,
          accionDestino: 'COLA_REMOWEB',
        });

        if (ev.crotalColocado === false) {
          const fechaLimiteCrotal = sumarDiasIso(
            ev.fechaEvento,
            reglas.plazoIdentificacionFisicaDias,
          );
          items.push({
            id: `cal-plazo-crotal-${ev.id}`,
            fecha: fechaLimiteCrotal,
            categoria: 'REGISTRO_PRINCIPADO',
            naturaleza: 'PREVISTO',
            titulo: `Límite ${reglas.plazoIdentificacionFisicaDias}d colocar crotal físico`,
            detalle: `Identificación auricular obligatoria de ${metaAnimal.crotal}.`,
            ...metaAnimal,
            accionDestino: 'COLA_REMOWEB',
          });
        }
      }
    } else if (ev.tipo === 'BAJA_MUERTE') {
      items.push({
        id: `cal-ev-${ev.id}`,
        fecha: ev.fechaEvento,
        categoria: 'BAJA',
        naturaleza: 'REALIZADO',
        titulo: `Baja por muerte #${metaAnimal.numeroCorto || ev.crotal}`,
        detalle: ev.motivo || 'Baja registrada en explotación.',
        ...metaAnimal,
        accionDestino: animal ? 'FICHA_ANIMAL' : 'COLA_REMOWEB',
      });

      if (ev.estadoTramite === 'PENDIENTE') {
        items.push({
          id: `cal-plazo-baja-${ev.id}`,
          fecha: sumarDiasIso(ev.fechaEvento, reglas.plazoNotificacionBajaDias),
          categoria: 'REGISTRO_PRINCIPADO',
          naturaleza: 'PREVISTO',
          titulo: `Límite ${reglas.plazoNotificacionBajaDias}d comunicar baja ${metaAnimal.crotal}`,
          detalle: `Plazo legal máximo en ${reglas.portalNombre}.`,
          ...metaAnimal,
          accionDestino: 'COLA_REMOWEB',
        });
      }
    } else if (
      ev.tipo === 'SALIDA_MATADERO' ||
      ev.tipo === 'SALIDA_MERCADO' ||
      ev.tipo === 'SALIDA_PASTOS' ||
      ev.tipo === 'VENTA'
    ) {
      items.push({
        id: `cal-ev-${ev.id}`,
        fecha: ev.fechaEvento,
        categoria: 'SALIDA_GUIA',
        naturaleza: ev.fechaEvento > fechaRefIso ? 'PREVISTO' : 'REALIZADO',
        titulo: `Salida #${metaAnimal.numeroCorto || ev.crotal} · ${ev.destino || ev.tipo}`,
        detalle: `${ev.tipo}${ev.codigoRegaDestino ? ` · REGA ${ev.codigoRegaDestino}` : ''}`,
        ...metaAnimal,
        accionDestino: 'COLA_REMOWEB',
      });
    } else if (ev.tipo === 'COMPRA') {
      items.push({
        id: `cal-ev-${ev.id}`,
        fecha: ev.fechaEvento,
        categoria: 'NACIMIENTO',
        naturaleza: 'REALIZADO',
        titulo: `Compra / Alta #${metaAnimal.numeroCorto || ev.crotal}`,
        detalle: `${ev.raza || 'Animal comprado'}${ev.codigoRegaOrigen ? ` · Origen ${ev.codigoRegaOrigen}` : ''}${ev.importeEur ? ` · ${ev.importeEur} €` : ''}`,
        ...metaAnimal,
        accionDestino: animal ? 'FICHA_ANIMAL' : 'SALIDAS_DOCS',
      });
    } else if (ev.tipo === 'TRATAMIENTO') {
      items.push({
        id: `cal-ev-${ev.id}`,
        fecha: ev.fechaEvento,
        categoria: 'RECETA_SUPRESION',
        naturaleza: 'REALIZADO',
        titulo: `Receta / Tratamiento #${metaAnimal.numeroCorto || ev.crotal}`,
        detalle: ev.motivo || 'Tratamiento veterinario registrado.',
        ...metaAnimal,
        accionDestino: animal ? 'FICHA_ANIMAL' : 'SALIDAS_DOCS',
      });
    }

    // Registro oficial confirmado en Agroficina / RemoWeb
    if (ev.estadoTramite === 'TRAMITADO' && ev.fechaTramitado && ev.tipo !== 'TRATAMIENTO') {
      items.push({
        id: `cal-tram-${ev.id}`,
        fecha: ev.fechaTramitado,
        categoria: 'REGISTRO_PRINCIPADO',
        naturaleza: 'REALIZADO',
        titulo: `Registrado en Principado (${ev.tipo})`,
        detalle: `${metaAnimal.crotal}${ev.numeroJustificante ? ` · Ref: ${ev.numeroJustificante}` : ''}`,
        ...metaAnimal,
        accionDestino: animal ? 'FICHA_ANIMAL' : 'COLA_REMOWEB',
      });
    }
  }

  // 2. Periodos de supresión activos en animales (fin de supresión leche y carne)
  for (const animal of estado.animales) {
    const sup = animal.supresionActiva;
    if (!sup) continue;

    if (sup.finSupresionLeche) {
      items.push({
        id: `cal-sup-leche-${animal.id}-${sup.finSupresionLeche}`,
        fecha: sup.finSupresionLeche,
        categoria: 'RECETA_SUPRESION',
        naturaleza: 'PREVISTO',
        titulo: `Fin supresión leche — #${animal.numeroCorto} ${animal.nombre || ''}`.trim(),
        detalle: `${sup.medicamento}${sup.recetaPresvet ? ` (${sup.recetaPresvet})` : ''}. A partir del día siguiente puede volver al tanque.`,
        crotal: animal.crotal,
        numeroCorto: animal.numeroCorto,
        animalId: animal.id,
        animalNombre: animal.nombre,
        accionDestino: 'FICHA_ANIMAL',
      });
    }

    if (sup.finSupresionCarne) {
      items.push({
        id: `cal-sup-carne-${animal.id}-${sup.finSupresionCarne}`,
        fecha: sup.finSupresionCarne,
        categoria: 'RECETA_SUPRESION',
        naturaleza: 'PREVISTO',
        titulo: `Fin supresión carne — #${animal.numeroCorto} ${animal.nombre || ''}`.trim(),
        detalle: `${sup.medicamento}. Fin del bloqueo sanitario para matadero.`,
        crotal: animal.crotal,
        numeroCorto: animal.numeroCorto,
        animalId: animal.id,
        animalNombre: animal.nombre,
        accionDestino: 'FICHA_ANIMAL',
      });
    }
  }

  // 3. Reproducción: inseminaciones realizadas + diagnóstico, secado y parto previsto
  const hitosRepro = calcularCalendarioReproductivo(
    estado.inseminaciones,
    estado.animales,
    fechaRefIso,
  );
  for (const h of hitosRepro) {
    const base = {
      crotal: h.crotal,
      numeroCorto: h.numeroCorto,
      animalId: h.animalId,
      animalNombre: h.nombre,
      accionDestino: 'FICHA_ANIMAL' as const,
    };

    items.push({
      id: `cal-insem-${h.inseminacionId}`,
      fecha: h.fechaInseminacion,
      categoria: 'REPRODUCCION',
      naturaleza: 'REALIZADO',
      titulo: `Inseminación #${h.numeroCorto} ${h.nombre || ''}`.trim(),
      detalle: h.toro ? `Toro / Dosis: ${h.toro}` : 'Cubrición registrada.',
      ...base,
    });

    if (!h.confirmadaGestacion) {
      items.push({
        id: `cal-eco-${h.inseminacionId}`,
        fecha: h.fechaDiagnostico,
        categoria: 'REPRODUCCION',
        naturaleza: 'PREVISTO',
        titulo: `Ecografía / Diagnóstico gestación #${h.numeroCorto}`,
        detalle: `Revisión veterinaria (+35d desde inseminación).`,
        ...base,
      });
    }

    if (h.fechaSecado) {
      items.push({
        id: `cal-secado-${h.inseminacionId}`,
        fecha: h.fechaSecado,
        categoria: 'REPRODUCCION',
        naturaleza: 'PREVISTO',
        titulo: `Secado previsto (-60d) — #${h.numeroCorto} ${h.nombre || ''}`.trim(),
        detalle: `Preparar secado de ${h.nombre || h.crotal} antes del parto.`,
        ...base,
      });
    }

    items.push({
      id: `cal-parto-prev-${h.inseminacionId}`,
      fecha: h.fechaPartoPrevisto,
      categoria: 'REPRODUCCION',
      naturaleza: 'PREVISTO',
      titulo: `Parto previsto — #${h.numeroCorto} ${h.nombre || ''}`.trim(),
      detalle: `${h.toro ? `Padre: ${h.toro} · ` : ''}Preparar box de partos.`,
      ...base,
    });
  }

  // 4. Incidencias clínicas de cuadra (Mamitis, Cojeras, Vacunaciones en lote)
  for (const inc of estado.incidencias || []) {
    const animal = resolverAnimal(inc.animalId, inc.crotal);
    items.push({
      id: `cal-inc-${inc.id}`,
      fecha: inc.fecha,
      categoria: 'RECETA_SUPRESION',
      naturaleza: 'REALIZADO',
      titulo: `Incidencia ${inc.tipo}${inc.cuarteron ? ` (${inc.cuarteron})` : ''} — #${animal?.numeroCorto || inc.crotal.slice(-4)}`,
      detalle: inc.notas || 'Incidencia registrada en cuadra.',
      crotal: animal?.crotal || inc.crotal,
      numeroCorto: animal?.numeroCorto || inc.crotal.slice(-4),
      animalId: animal?.id,
      animalNombre: animal?.nombre,
      accionDestino: animal ? 'FICHA_ANIMAL' : 'SALIDAS_DOCS',
    });
  }

  // 5. Documentos de saneamiento / PSI (caducidades como avisos de Registro/Principado)
  for (const doc of estado.documentos) {
    if (doc.fechaCaducidad && doc.estado !== 'ARCHIVADO') {
      items.push({
        id: `cal-doc-cad-${doc.id}`,
        fecha: doc.fechaCaducidad,
        categoria: 'REGISTRO_PRINCIPADO',
        naturaleza: 'PREVISTO',
        titulo: `Caducidad: ${doc.titulo}`,
        detalle: `${doc.categoria}${doc.referencia ? ` · Ref: ${doc.referencia}` : ''}`,
        crotal: doc.animalCrotal,
        accionDestino: 'SALIDAS_DOCS',
      });
    }
  }

  return items.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function filtrarEventosCalendario(
  eventos: EventoCalendario[],
  categoriasActivas: Set<CategoriaCalendario>,
  filtroCrotal: string,
): EventoCalendario[] {
  const q = filtroCrotal.trim().toLowerCase();
  return eventos.filter((ev) => {
    if (!categoriasActivas.has(ev.categoria)) return false;
    if (!q) return true;
    return (
      (ev.crotal || '').toLowerCase().includes(q) ||
      (ev.numeroCorto || '').toLowerCase().includes(q) ||
      (ev.animalNombre || '').toLowerCase().includes(q) ||
      ev.titulo.toLowerCase().includes(q)
    );
  });
}

export function agruparEventosPorDia(
  eventos: EventoCalendario[],
): Map<string, ResumenDiaCalendario> {
  const mapa = new Map<string, ResumenDiaCalendario>();
  const ordenCats = CATEGORIAS_CALENDARIO.map((c) => c.id);

  for (const ev of eventos) {
    const actual = mapa.get(ev.fecha) ?? {
      fecha: ev.fecha,
      eventos: [],
      categoriasUnicas: [],
      tieneRealizados: false,
      tienePrevistos: false,
    };
    actual.eventos.push(ev);
    if (!actual.categoriasUnicas.includes(ev.categoria)) {
      actual.categoriasUnicas.push(ev.categoria);
      actual.categoriasUnicas.sort(
        (a, b) => ordenCats.indexOf(a) - ordenCats.indexOf(b),
      );
    }
    if (ev.naturaleza === 'REALIZADO') actual.tieneRealizados = true;
    else actual.tienePrevistos = true;
    mapa.set(ev.fecha, actual);
  }

  return mapa;
}

/**
 * Construye la cuadrícula mensual comenzando en Lunes (estándar España: L M X J V S D).
 * @param anio Año completo (ej. 2026)
 * @param mesIndex Índice de mes 0..11 (0 = Enero, 10 = Noviembre)
 */
export function generarCuadriculaMes(
  anio: number,
  mesIndex: number,
  hoy: string = hoyIso(),
): CeldaMesCalendario[] {
  const primero = new Date(Date.UTC(anio, mesIndex, 1));
  const ultimoDiaMes = new Date(Date.UTC(anio, mesIndex + 1, 0)).getUTCDate();
  // getUTCDay(): 0 = Domingo, 1 = Lunes ... 6 = Sábado -> convertir a 0 = Lunes .. 6 = Domingo
  const offsetInicio = (primero.getUTCDay() + 6) % 7;

  const celdas: CeldaMesCalendario[] = [];
  const totalCeldas = Math.ceil((offsetInicio + ultimoDiaMes) / 7) * 7;

  for (let i = 0; i < totalCeldas; i++) {
    const dt = new Date(Date.UTC(anio, mesIndex, 1 - offsetInicio + i));
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dt.getUTCDate()).padStart(2, '0');
    const fecha = `${y}-${m}-${d}`;
    celdas.push({
      fecha,
      diaNumero: dt.getUTCDate(),
      esDelMesActual: dt.getUTCMonth() === mesIndex,
      esHoy: fecha === hoy,
    });
  }

  return celdas;
}

export const NOMBRES_MESES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

import { extraerNumeroCorto, normalizarCrotal, sugerirSiguienteCrotal } from './crotales';
import { diferenciaDias, hoyIso, parsearFechaFlexible, sumarDiasIso } from './fechas';
import { obtenerReglasNormativas } from './reglasNormativas';
import type {
  DiscrepanciaCuadre,
  EstadoGanaderia,
  RegistroRobotImportado,
  SexoAnimal,
  UnidadGanadera,
} from './types';

function detectarSeparador(primeraLinea: string): string {
  const puntosYComa = (primeraLinea.match(/;/g) || []).length;
  const comas = (primeraLinea.match(/,/g) || []).length;
  const tabs = (primeraLinea.match(/\t/g) || []).length;
  if (tabs >= puntosYComa && tabs >= comas && tabs > 0) return '\t';
  return puntosYComa >= comas ? ';' : ',';
}

function dividirLineaCsv(linea: string, sep: string): string[] {
  const resultado: string[] = [];
  let actual = '';
  let enComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i];
    if (ch === '"') {
      enComillas = !enComillas;
    } else if (ch === sep && !enComillas) {
      resultado.push(actual.trim());
      actual = '';
    } else {
      actual += ch;
    }
  }
  resultado.push(actual.trim());
  return resultado;
}

function normalizarCabecera(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function buscarColumna(
  cabeceras: string[],
  sinonimos: string[],
  excluirSubcadenas: string[] = [],
): number {
  // 1. Priorizar coincidencia exacta
  for (const sin of sinonimos) {
    const idxExacto = cabeceras.findIndex((h) => h === sin);
    if (idxExacto !== -1) return idxExacto;
  }
  // 2. Fallback por subcadena evitando columnas de otro campo (ej. madre)
  for (const sin of sinonimos) {
    const idx = cabeceras.findIndex(
      (h) => h.includes(sin) && !excluirSubcadenas.some((ex) => h.includes(ex)),
    );
    if (idx !== -1) return idx;
  }
  return -1;
}

function detectarSexo(valor?: string): SexoAnimal | undefined {
  if (!valor) return undefined;
  const v = valor.trim().toUpperCase();
  if (['H', 'HEMBRA', 'F', 'FEMALE', 'COW', 'HEIFER', 'VACA', 'TERNERA'].includes(v)) return 'H';
  if (['M', 'MACHO', 'MALE', 'BULL', 'CALF_M', 'TERNERO', 'TORO'].includes(v)) return 'M';
  return undefined;
}

function detectarTipoEventoRobot(valor?: string): 'NACIMIENTO' | 'BAJA_MUERTE' | 'CENSO_ACTIVO' {
  if (!valor) return 'CENSO_ACTIVO';
  const v = valor
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (v.includes('parto') || v.includes('calving') || v.includes('nacim')) return 'NACIMIENTO';
  if (
    v.includes('baja') ||
    v.includes('muert') ||
    v.includes('dead') ||
    v.includes('cull') ||
    v.includes('sacrif') ||
    v.includes('desvieje')
  ) {
    return 'BAJA_MUERTE';
  }
  return 'CENSO_ACTIVO';
}

export interface ResultadoParseoRobot {
  fuenteDetectada: 'ROBOT_LELY' | 'ROBOT_DELAVAL' | 'ROBOT_CSV';
  registros: RegistroRobotImportado[];
  advertencias: string[];
}

/**
 * Parsea exportaciones CSV de Lely Horizon / T4C, DeLaval DelPro o plantillas genéricas.
 */
export function parsearCsvRobot(contenido: string): ResultadoParseoRobot {
  const lineas = contenido
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lineas.length < 2) {
    return {
      fuenteDetectada: 'ROBOT_CSV',
      registros: [],
      advertencias: ['El archivo está vacío o solo contiene cabeceras.'],
    };
  }

  const sep = detectarSeparador(lineas[0]);
  const cabecerasRaw = dividirLineaCsv(lineas[0], sep);
  const cabeceras = cabecerasRaw.map(normalizarCabecera);

  const textoCabecera = cabeceras.join(' ');
  let fuenteDetectada: 'ROBOT_LELY' | 'ROBOT_DELAVAL' | 'ROBOT_CSV' = 'ROBOT_CSV';
  if (
    textoCabecera.includes('lely') ||
    textoCabecera.includes('calving_date') ||
    textoCabecera.includes('dam_eartag') ||
    textoCabecera.includes('cow_number')
  ) {
    fuenteDetectada = 'ROBOT_LELY';
  } else if (
    textoCabecera.includes('delpro') ||
    textoCabecera.includes('delaval') ||
    textoCabecera.includes('animal_number') ||
    textoCabecera.includes('event_type')
  ) {
    fuenteDetectada = 'ROBOT_DELAVAL';
  }

  const idxTipo = buscarColumna(cabeceras, ['tipo_evento', 'event_type', 'evento', 'event', 'tipo']);
  const idxCrotal = buscarColumna(
    cabeceras,
    [
      'crotal_ternero',
      'calf_eartag',
      'crotal',
      'eartag',
      'ear_tag',
      'official_id',
      'dib',
    ],
    ['madre', 'dam', 'mother'],
  );
  const idxMadre = buscarColumna(cabeceras, [
    'crotal_madre',
    'dam_eartag',
    'madre',
    'dam_id',
    'mother',
    'vaca_crotal',
  ]);
  const idxNumeroCorto = buscarColumna(cabeceras, [
    'cow_number',
    'animal_number',
    'collar',
    'numero',
    'transpondedor',
  ]);
  const idxSexo = buscarColumna(cabeceras, ['sexo', 'sex', 'gender', 'calf_sex']);
  const idxRaza = buscarColumna(cabeceras, ['raza', 'breed']);
  const idxFecha = buscarColumna(cabeceras, [
    'fecha_evento',
    'fecha_parto',
    'calving_date',
    'event_date',
    'fecha',
    'date',
  ]);
  const idxMotivo = buscarColumna(cabeceras, ['motivo', 'reason', 'observaciones', 'notes']);

  const registros: RegistroRobotImportado[] = [];
  const advertencias: string[] = [];

  for (let i = 1; i < lineas.length; i++) {
    const cols = dividirLineaCsv(lineas[i], sep);
    const tipo =
      idxTipo >= 0
        ? detectarTipoEventoRobot(cols[idxTipo])
        : idxMadre >= 0 && cols[idxMadre]
          ? 'NACIMIENTO'
          : 'CENSO_ACTIVO';

    const crotalRaw = idxCrotal >= 0 ? cols[idxCrotal] : '';
    const madreRaw = idxMadre >= 0 ? cols[idxMadre] : '';
    const numCorto = idxNumeroCorto >= 0 ? cols[idxNumeroCorto] : undefined;
    const fechaRaw = idxFecha >= 0 ? cols[idxFecha] : '';
    const fecha = parsearFechaFlexible(fechaRaw);

    if (tipo !== 'CENSO_ACTIVO' && fechaRaw && !fecha) {
      advertencias.push(`Fila ${i + 1}: fecha no reconocida "${fechaRaw}".`);
    }

    registros.push({
      fuente: fuenteDetectada,
      tipo,
      crotal: crotalRaw ? normalizarCrotal(crotalRaw) : undefined,
      numeroCorto: numCorto || (crotalRaw ? extraerNumeroCorto(crotalRaw) : undefined),
      crotalMadre: madreRaw ? normalizarCrotal(madreRaw) : undefined,
      sexo: detectarSexo(idxSexo >= 0 ? cols[idxSexo] : undefined),
      raza: idxRaza >= 0 && cols[idxRaza] ? cols[idxRaza] : undefined,
      fecha,
      motivo: idxMotivo >= 0 && cols[idxMotivo] ? cols[idxMotivo] : undefined,
      filaOriginal: i + 1,
    });
  }

  return { fuenteDetectada, registros, advertencias };
}

/**
 * Motor de Cuadre 360° (#7): compara registros importados del robot con el censo oficial y eventos ya registrados.
 */
export function ejecutarCuadreRobotPrincipado(
  estado: EstadoGanaderia,
  registrosRobot: RegistroRobotImportado[],
  fechaRefIso: string = hoyIso(),
): DiscrepanciaCuadre[] {
  const discrepancias: DiscrepanciaCuadre[] = [];
  const reglas = obtenerReglasNormativas(
    estado.explotacion.comunidad,
    estado.explotacion.especiePrincipal,
  );

  const animalesPorCrotal = new Map<string, UnidadGanadera>();
  const animalesPorCorto = new Map<string, UnidadGanadera>();
  for (const a of estado.animales) {
    animalesPorCrotal.set(normalizarCrotal(a.crotal), a);
    if (a.numeroCorto) animalesPorCorto.set(a.numeroCorto, a);
    if (a.transpondedorRobot) animalesPorCorto.set(a.transpondedorRobot, a);
  }

  const crotalesSugeridosReservados: string[] = [];
  const crotalesVistosEnRobot = new Set<string>();

  for (const reg of registrosRobot) {
    if (reg.crotal) crotalesVistosEnRobot.add(reg.crotal);

    if (reg.tipo === 'NACIMIENTO') {
      const fechaEv = reg.fecha || fechaRefIso;
      // Comprobar si ya existe el nacimiento en animales o eventos (por crotal o por madre + fecha)
      const yaEnAnimales =
        (reg.crotal && animalesPorCrotal.has(reg.crotal)) ||
        estado.animales.some(
          (a) =>
            reg.crotalMadre &&
            a.crotalMadre &&
            normalizarCrotal(a.crotalMadre) === reg.crotalMadre &&
            a.fechaNacimiento === fechaEv,
        );

      const yaEnEventos = estado.eventos.some(
        (ev) =>
          ev.tipo === 'NACIMIENTO' &&
          ((reg.crotal && normalizarCrotal(ev.crotal) === reg.crotal) ||
            (reg.crotalMadre &&
              ev.crotalMadre &&
              normalizarCrotal(ev.crotalMadre) === reg.crotalMadre &&
              ev.fechaEvento === fechaEv)),
      );

      if (!yaEnAnimales && !yaEnEventos) {
        const limite = sumarDiasIso(fechaEv, reglas.plazoNotificacionNacimientoDias);
        const diasRest = diferenciaDias(limite, fechaRefIso);
        let crotalSugerido = reg.crotal;
        if (!crotalSugerido) {
          crotalSugerido = sugerirSiguienteCrotal(
            estado.lotesCrotales,
            estado.explotacion.especiePrincipal,
            crotalesSugeridosReservados,
          );
          if (crotalSugerido) crotalesSugeridosReservados.push(crotalSugerido);
        }

        discrepancias.push({
          id: `disc-nac-${reg.filaOriginal}-${fechaEv}`,
          tipo: 'NACIMIENTO_ROBOT_NO_COMUNICADO',
          severidad: diasRest <= 1 ? 'CRITICA' : diasRest <= 3 ? 'ATENCION' : 'OK',
          titulo: `Nacimiento en robot sin alta en ${reglas.portalNombre}`,
          descripcion: `Parto de madre ${reg.crotalMadre || '#' + (reg.numeroCorto || '?')} (${reg.sexo === 'M' ? 'Macho' : 'Hembra'}) el ${fechaEv}. ${
            diasRest < 0
              ? `¡Plazo de 7 días vencido hace ${Math.abs(diasRest)} día(s)!`
              : `Quedan ${diasRest} día(s) de plazo legal.`
          }`,
          crotal: reg.crotal,
          crotalSugerido,
          crotalMadre: reg.crotalMadre,
          sexo: reg.sexo || 'H',
          raza: reg.raza || 'Frisona (Holstein)',
          fechaEvento: fechaEv,
          diasRestantesPlazo: diasRest,
          origen: reg.fuente,
        });
      }
    }

    if (reg.tipo === 'BAJA_MUERTE') {
      const fechaEv = reg.fecha || fechaRefIso;
      const animal: UnidadGanadera | undefined =
        (reg.crotal ? animalesPorCrotal.get(reg.crotal) : undefined) ??
        (reg.numeroCorto ? animalesPorCorto.get(reg.numeroCorto) : undefined);

      const yaRegistradaBaja = estado.eventos.some(
        (ev) =>
          ev.tipo === 'BAJA_MUERTE' &&
          ((reg.crotal && normalizarCrotal(ev.crotal) === reg.crotal) ||
            (animal && ev.animalId === animal.id)),
      );

      if ((!animal || animal.estado === 'ACTIVO') && !yaRegistradaBaja) {
        const limite = sumarDiasIso(fechaEv, reglas.plazoNotificacionBajaDias);
        const diasRest = diferenciaDias(limite, fechaRefIso);
        const crotalResuelto = animal?.crotal || reg.crotal || `#${reg.numeroCorto || '?'}`;

        discrepancias.push({
          id: `disc-baja-${reg.filaOriginal}-${crotalResuelto}`,
          tipo: 'BAJA_ROBOT_ACTIVA_PRINCIPADO',
          severidad: diasRest <= 1 ? 'CRITICA' : 'ATENCION',
          titulo: `Baja en robot aún ACTIVA en ${reglas.portalNombre}`,
          descripcion: `La res ${crotalResuelto} figura como baja en el robot (${reg.motivo || 'muerte/desvieje'}) el ${fechaEv}, pero sigue activa en el censo oficial.`,
          crotal: crotalResuelto,
          fechaEvento: fechaEv,
          diasRestantesPlazo: diasRest,
          origen: reg.fuente,
        });
      }
    }
  }

  // Si el CSV traía un listado de censo activo del robot, detectar vacas activas en Principado que faltan en el robot
  const tieneCensoActivo = registrosRobot.some((r) => r.tipo === 'CENSO_ACTIVO');
  if (tieneCensoActivo) {
    for (const animal of estado.animales) {
      if (animal.estado === 'ACTIVO' && animal.enRobotOrdene && animal.enCensoOficial) {
        const norm = normalizarCrotal(animal.crotal);
        if (!crotalesVistosEnRobot.has(norm)) {
          discrepancias.push({
            id: `disc-ausente-${animal.id}`,
            tipo: 'ACTIVA_PRINCIPADO_AUSENTE_ROBOT',
            severidad: 'ATENCION',
            titulo: `Vaca #${animal.numeroCorto} activa en Principado pero ausente en el robot`,
            descripcion: `${animal.crotal} consta en el censo oficial pero no aparece en el archivo actual del robot. Verifica si está seca, trasladada o pendiente de dar de baja.`,
            crotal: animal.crotal,
          });
        }
      }
    }
  }

  return discrepancias;
}

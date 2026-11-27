import { normalizarCrotal, validarCrotalBovinoAsturias2026 } from './crotales';
import { diferenciaDias, hoyIso } from './fechas';
import type {
  EstadoGanaderia,
  ModalidadMuerteRemoWeb,
  UnidadGanadera,
} from './types';

export interface AvisoValidacionRemoWeb {
  nivel: 'ERROR' | 'AVISO';
  codigo: string;
  mensaje: string;
}

function mesesEntre(fechaInicio: string, fechaFin: string): number {
  const dias = diferenciaDias(fechaFin, fechaInicio);
  return dias / 30.4375;
}

/**
 * Pre-validaciones oficiales del Manual RemoWeb Asturias (pp. 135-136 + Anexo S20713 Ago 2026)
 * antes de enviar un alta de nacimiento bovino.
 */
export function validarPrecondicionesNacimientoRemoWeb(
  estado: EstadoGanaderia,
  datos: {
    crotal: string;
    crotalMadre?: string;
    raza: string;
    fechaNacimiento: string;
  },
): AvisoValidacionRemoWeb[] {
  const avisos: AvisoValidacionRemoWeb[] = [];
  const especie = estado.explotacion.especiePrincipal;
  const esAsturiasBovino =
    estado.explotacion.comunidad === 'ASTURIAS' && especie === 'BOVINO';

  if (esAsturiasBovino) {
    const checkCrotal = validarCrotalBovinoAsturias2026(datos.crotal, datos.fechaNacimiento);
    if (!checkCrotal.valido && checkCrotal.motivo) {
      avisos.push({
        nivel: 'ERROR',
        codigo: 'CROTAL_ES2203_2026',
        mensaje: checkCrotal.motivo,
      });
    }
  }

  // Ventana máxima de 3 meses (90 días) para alta online de nacimiento en RemoWeb
  const diasDesdeNacimiento = diferenciaDias(hoyIso(), datos.fechaNacimiento);
  if (diasDesdeNacimiento > 90) {
    avisos.push({
      nivel: 'ERROR',
      codigo: 'NACIMIENTO_FUERA_90_DIAS',
      mensaje: `Han pasado ${diasDesdeNacimiento} días desde el nacimiento. RemoWeb solo admite altas online de los últimos 3 meses (90 días).`,
    });
  } else if (diasDesdeNacimiento < 0) {
    avisos.push({
      nivel: 'ERROR',
      codigo: 'NACIMIENTO_FUTURO',
      mensaje: 'La fecha de nacimiento no puede ser posterior al día de hoy.',
    });
  }

  if (datos.crotalMadre) {
    const madreNorm = normalizarCrotal(datos.crotalMadre);
    const madre = estado.animales.find(
      (a) => normalizarCrotal(a.crotal) === madreNorm,
    );

    if (!madre) {
      avisos.push({
        nivel: 'AVISO',
        codigo: 'MADRE_NO_EN_CENSO',
        mensaje: 'La madre indicada no figura en el censo local de la explotación.',
      });
    } else {
      if (madre.estado !== 'ACTIVO') {
        avisos.push({
          nivel: 'ERROR',
          codigo: 'MADRE_INACTIVA',
          mensaje: 'La madre debe figurar activa en la explotación para registrar el nacimiento en RemoWeb.',
        });
      }

      if (madre.fechaNacimiento) {
        const edadMeses = mesesEntre(madre.fechaNacimiento, datos.fechaNacimiento);
        if (edadMeses < 16) {
          avisos.push({
            nivel: 'ERROR',
            codigo: 'MADRE_MENOR_16_MESES',
            mensaje: `La madre tenía ${edadMeses.toFixed(1)} meses en la fecha del parto. RemoWeb exige que tenga más de 16 meses.`,
          });
        }
      }

      // Comprobar si la madre ha parido en los últimos 8 meses (otros hijos o fechaUltimoParto)
      const otrosHijos = estado.animales.filter(
        (a) =>
          a.crotalMadre &&
          normalizarCrotal(a.crotalMadre) === madreNorm &&
          normalizarCrotal(a.crotal) !== normalizarCrotal(datos.crotal),
      );
      const partoPrevio = otrosHijos.find((h) => {
        const dias = Math.abs(diferenciaDias(h.fechaNacimiento, datos.fechaNacimiento));
        return dias < 240; // ~8 meses
      });

      if (partoPrevio) {
        const diasEntre = Math.abs(
          diferenciaDias(partoPrevio.fechaNacimiento, datos.fechaNacimiento),
        );
        avisos.push({
          nivel: diasEntre <= 2 ? 'AVISO' : 'ERROR',
          codigo: diasEntre <= 2 ? 'PARTO_GEMELAR_REMOWEB' : 'MADRE_PARTO_MENOS_8_MESES',
          mensaje:
            diasEntre <= 2
              ? 'Posible parto gemelar: RemoWeb online bloquea dos crías de la misma madre en menos de 8 meses (requiere gestión con OCA).'
              : `La madre ya tuvo otro parto hace ${Math.round(diasEntre / 30)} meses (${partoPrevio.crotal}). RemoWeb exige 8 meses entre partos.`,
        });
      }

      // Coherencia de raza: igual a la madre o Conjunto Mestizo / Cruce
      const razaNorm = datos.raza.toLowerCase();
      const madreRazaNorm = madre.raza.toLowerCase();
      const esMestizo =
        razaNorm.includes('mestiz') ||
        razaNorm.includes('cruce') ||
        razaNorm.includes('limus') ||
        razaNorm.includes('azul belga');
      if (madreRazaNorm && razaNorm !== madreRazaNorm && !esMestizo) {
        avisos.push({
          nivel: 'AVISO',
          codigo: 'RAZA_DIFERENTE_MADRE',
          mensaje: `RemoWeb requiere que la cría tenga la misma raza que la madre (${madre.raza}) o "Conjunto Mestizo".`,
        });
      }
    }
  }

  if (estado.explotacion.focoSanitarioActivo === 'T3_RESTRICCION_RC') {
    avisos.push({
      nivel: 'AVISO',
      codigo: 'FOCO_T3_RC',
      mensaje:
        'Explotación con foco T3 activo (Anexo S20713): la cría recibirá calificación sanitaria RC automática hasta saneamiento.',
    });
  }

  return avisos;
}

/**
 * Validaciones de las 4 modalidades oficiales de Confirmación de Baja por Muerte en RemoWeb (pp. 160-166).
 */
export function validarModalidadMuerteRemoWeb(
  estado: EstadoGanaderia,
  animal: UnidadGanadera | undefined,
  datos: {
    modalidadMuerte: ModalidadMuerteRemoWeb;
    fechaBaja: string;
    numeroDamer?: string;
    fechaValidezDamer?: string;
    ceaMatadero?: string;
    concejo?: string;
    lugarMuerte?: string;
    declaracionEnterramiento?: boolean;
  },
): AvisoValidacionRemoWeb[] {
  const avisos: AvisoValidacionRemoWeb[] = [];

  if (datos.modalidadMuerte === 'DAMER') {
    const damer = (datos.numeroDamer || '').trim();
    if (!damer) {
      avisos.push({
        nivel: 'ERROR',
        codigo: 'DAMER_OBLIGATORIO',
        mensaje: 'El Nº DAMER es obligatorio para entregas en planta de transformación.',
      });
    } else if (!/^\d{1,9}$/.test(damer)) {
      avisos.push({
        nivel: 'ERROR',
        codigo: 'DAMER_FORMATO',
        mensaje: 'El Nº DAMER debe ser numérico de hasta 9 dígitos.',
      });
    } else {
      const usadosMismoDamer = estado.eventos.filter(
        (ev) => ev.numeroDamer === damer && ev.tipo === 'BAJA_MUERTE',
      ).length;
      if (usadosMismoDamer >= 5) {
        avisos.push({
          nivel: 'ERROR',
          codigo: 'DAMER_MAX_5_ANIMALES',
          mensaje: `El DAMER ${damer} ya tiene ${usadosMismoDamer} animales asociados (máximo 5 por documento en RemoWeb).`,
        });
      }
    }
    if (!datos.fechaValidezDamer) {
      avisos.push({
        nivel: 'AVISO',
        codigo: 'DAMER_SIN_VALIDEZ',
        mensaje: 'Indica la fecha de validez del DAMER para autorrellenar RemoWeb sin errores.',
      });
    }
  }

  if (datos.modalidadMuerte === 'INACCESIBLE') {
    if (!datos.declaracionEnterramiento) {
      avisos.push({
        nivel: 'ERROR',
        codigo: 'DECLARACION_ENTERRAMIENTO',
        mensaje: 'Debes confirmar la declaración responsable de enterramiento o imposibilidad de recogida.',
      });
    }
    if (!datos.concejo?.trim() || !datos.lugarMuerte?.trim()) {
      avisos.push({
        nivel: 'ERROR',
        codigo: 'INACCESIBLE_UBICACION',
        mensaje: 'Concejo y lugar de la muerte son obligatorios en lugar inaccesible.',
      });
    }
  }

  if (datos.modalidadMuerte === 'SACRIFICIO_URGENCIA') {
    const cea = (datos.ceaMatadero || '').trim().toUpperCase();
    if (!cea) {
      avisos.push({
        nivel: 'ERROR',
        codigo: 'CEA_MATADERO_OBLIGATORIO',
        mensaje: 'El C.E.A. del matadero (ej. ES330400000123) es obligatorio para sacrificio de urgencia.',
      });
    } else if (!/^ES\d{12}$/.test(cea)) {
      avisos.push({
        nivel: 'AVISO',
        codigo: 'CEA_MATADERO_FORMATO',
        mensaje: 'El C.E.A. del matadero suele seguir el formato ES + 12 dígitos (ES33... en Asturias).',
      });
    }
  }

  if (datos.modalidadMuerte === 'NECROFAGAS') {
    if (!datos.declaracionEnterramiento) {
      avisos.push({
        nivel: 'ERROR',
        codigo: 'NECROFAGAS_DECLARACION',
        mensaje: 'Debes marcar la declaración obligatoria para zona de protección de necrófagas.',
      });
    }
    if (!datos.concejo?.trim() || !datos.lugarMuerte?.trim()) {
      avisos.push({
        nivel: 'ERROR',
        codigo: 'NECROFAGAS_UBICACION',
        mensaje: 'Concejo y lugar de la muerte son obligatorios.',
      });
    }
    if (animal?.fechaNacimiento) {
      const edadMeses = mesesEntre(animal.fechaNacimiento, datos.fechaBaja);
      if (edadMeses >= 4) {
        avisos.push({
          nivel: 'ERROR',
          codigo: 'NECROFAGAS_MAYOR_4_MESES',
          mensaje: `El animal tiene ${edadMeses.toFixed(1)} meses. RemoWeb solo admite necrófagas para terneros menores de 4 meses con licencia de pasto.`,
        });
      }
    }
  }

  return avisos;
}

/**
 * Validaciones de Solicitud de Guía de Salida / Movimiento en RemoWeb (pp. 147-178, 208-250).
 */
export function validarGuiaSalidaRemoWeb(
  estado: EstadoGanaderia,
  animales: UnidadGanadera[],
  datos: {
    fechaSalida: string;
    codigoRegaDestino?: string;
    destino?: string;
    codigoSirentra?: string;
    esMatadero?: boolean;
  },
): AvisoValidacionRemoWeb[] {
  const avisos: AvisoValidacionRemoWeb[] = [];

  if (estado.explotacion.focoSanitarioActivo === 'TOTAL') {
    avisos.push({
      nivel: 'ERROR',
      codigo: 'FOCO_TOTAL_BLOQUEO',
      mensaje:
        'Explotación con foco sanitario TOTAL activo: RemoWeb bloquea la emisión de guías de movimiento.',
    });
  }

  const hoy = hoyIso();
  const diasAntelacion = diferenciaDias(datos.fechaSalida, hoy);
  const regaDest = (datos.codigoRegaDestino || '').trim().toUpperCase();
  const esDestinoAsturias = !regaDest || regaDest.startsWith('ES33');
  const maxDias = esDestinoAsturias ? 8 : 5;

  if (diasAntelacion < 0) {
    avisos.push({
      nivel: 'ERROR',
      codigo: 'GUIA_FECHA_PASADA',
      mensaje: 'La fecha prevista de salida no puede ser anterior a hoy.',
    });
  } else if (diasAntelacion > maxDias) {
    avisos.push({
      nivel: 'ERROR',
      codigo: 'GUIA_ANTELACION_EXCEDIDA',
      mensaje: `La salida es en ${diasAntelacion} días. RemoWeb limita la antelación a +${maxDias} días (${esDestinoAsturias ? 'dentro de Asturias' : 'fuera de Asturias'}).`,
    });
  }

  if (datos.codigoSirentra?.trim()) {
    const sirentra = datos.codigoSirentra.trim().toUpperCase();
    if (!/^ATES\d{11}$/.test(sirentra)) {
      avisos.push({
        nivel: 'AVISO',
        codigo: 'SIRENTRA_FORMATO',
        mensaje: 'El código SIRENTRA del vehículo suele tener formato ATES + 11 dígitos (ej. ATES33000012345).',
      });
    }
  }

  const destLower = (datos.destino || '').toLowerCase();
  const esMataderoOSiero =
    Boolean(datos.esMatadero) ||
    destLower.includes('matadero') ||
    destLower.includes('siero');

  if (!esMataderoOSiero && animales.length > 0) {
    const campanasLA = (estado.saneamientos || []).filter(
      (s) => s.tipo === 'LENGUA_AZUL',
    );
    const animalesSinVacunaLA = animales.filter((a) => {
      const edadMeses = mesesEntre(a.fechaNacimiento, datos.fechaSalida);
      if (edadMeses < 4) return false;
      const vacunado = campanasLA.some((c) => {
        const diasDesdeVacuna = diferenciaDias(datos.fechaSalida, c.fecha);
        if (diasDesdeVacuna < 0 || diasDesdeVacuna > 365) return false;
        return (
          c.resultados.length === 0 ||
          c.resultados.some((r) => r.animalId === a.id || r.crotal === a.crotal)
        );
      });
      return !vacunado;
    });

    if (animalesSinVacunaLA.length > 0) {
      avisos.push({
        nivel: 'AVISO',
        codigo: 'LENGUA_AZUL_SIN_VACUNA',
        mensaje: `${animalesSinVacunaLA.length} res(es) mayores de 4 meses no tienen vacunación de Lengua Azul registrada en el último año (requisito RemoWeb fuera de matadero/Siero).`,
      });
    }
  }

  return avisos;
}

import { contarCrotalesDisponibles } from './crotales';
import { diferenciaDias, formatearFechaEs, hoyIso, sumarDiasIso } from './fechas';
import { obtenerReglasNormativas } from './reglasNormativas';
import type {
  AlertaPlazo,
  EstadoGanaderia,
  NivelAlerta,
  UnidadGanadera,
} from './types';

function clasificarNivelPorDias(diasRestantes: number): NivelAlerta {
  if (diasRestantes <= 1) return 'CRITICA';
  if (diasRestantes <= 3) return 'ATENCION';
  return 'OK';
}

export function estaEnSupresionCarne(
  animal: UnidadGanadera,
  fechaRefIso: string = hoyIso(),
): boolean {
  if (!animal.supresionActiva?.finSupresionCarne) return false;
  return diferenciaDias(animal.supresionActiva.finSupresionCarne, fechaRefIso) >= 0;
}

export function estaEnSupresionLeche(
  animal: UnidadGanadera,
  fechaRefIso: string = hoyIso(),
): boolean {
  if (!animal.supresionActiva?.finSupresionLeche) return false;
  return diferenciaDias(animal.supresionActiva.finSupresionLeche, fechaRefIso) >= 0;
}

export interface ValidacionSalidaAnimal {
  animalId: string;
  crotal: string;
  apto: boolean;
  bloqueos: string[];
  advertencias: string[];
}

export function validarAnimalesParaSalida(
  animales: UnidadGanadera[],
  destinoTipo: 'SALIDA_MATADERO' | 'SALIDA_MERCADO' | 'SALIDA_PASTOS' | 'VENTA',
  fechaSalidaIso: string = hoyIso(),
): ValidacionSalidaAnimal[] {
  return animales.map((animal) => {
    const bloqueos: string[] = [];
    const advertencias: string[] = [];

    if (animal.estado !== 'ACTIVO') {
      bloqueos.push(`El animal no está activo (${animal.estado}).`);
    }

    if (
      (destinoTipo === 'SALIDA_MATADERO' || destinoTipo === 'VENTA') &&
      estaEnSupresionCarne(animal, fechaSalidaIso)
    ) {
      bloqueos.push(
        `BLOQUEO SANITARIO: en supresión de carne por ${animal.supresionActiva?.medicamento} hasta el ${formatearFechaEs(animal.supresionActiva?.finSupresionCarne)}.`,
      );
    }

    if (animal.estadoCrotal === 'FALTAN_AMBOS' || animal.estadoCrotal === 'PENDIENTE_COLOCAR') {
      bloqueos.push('Sin crotal oficial colocado: no puede salir de la explotación.');
    } else if (
      animal.estadoCrotal === 'FALTA_IZQUIERDO' ||
      animal.estadoCrotal === 'FALTA_DERECHO'
    ) {
      advertencias.push('Le falta un crotal auricular: conviene solicitar duplicado antes del traslado.');
    }

    if (animal.especie === 'BOVINO' && !animal.dibImpreso) {
      advertencias.push('DIB no marcado como impreso: recuerda llevar el Documento de Identificación Bovina.');
    }

    if (!animal.enCensoOficial) {
      bloqueos.push('Aún no consta como dado de alta en el censo oficial del Principado.');
    }

    return {
      animalId: animal.id,
      crotal: animal.crotal,
      apto: bloqueos.length === 0,
      bloqueos,
      advertencias,
    };
  });
}

export function calcularAlertasPlazos(
  estado: EstadoGanaderia,
  fechaRefIso: string = hoyIso(),
): AlertaPlazo[] {
  const alertas: AlertaPlazo[] = [];
  const { explotacion, eventos, animales, lotesCrotales, documentos } = estado;

  // 1. Plazos legales de eventos pendientes de comunicar en Agroficina / RemoWeb
  for (const ev of eventos) {
    if (ev.estadoTramite !== 'PENDIENTE') continue;
    const reglas = obtenerReglasNormativas(explotacion.comunidad, ev.especie);

    if (ev.tipo === 'NACIMIENTO') {
      const limiteNotif = sumarDiasIso(ev.fechaEvento, reglas.plazoNotificacionNacimientoDias);
      const diasNotif = diferenciaDias(limiteNotif, fechaRefIso);
      alertas.push({
        id: `notif-nac-${ev.id}`,
        nivel: clasificarNivelPorDias(diasNotif),
        categoria: 'NOTIFICACION_NACIMIENTO',
        titulo: `Comunicar nacimiento ${ev.crotal || '(sin crotal)'}`,
        detalle:
          diasNotif < 0
            ? `Plazo de ${reglas.plazoNotificacionNacimientoDias} días VENCIDO hace ${Math.abs(diasNotif)} día(s). Tramitar hoy en ${reglas.portalNombre}.`
            : diasNotif === 0
              ? `Vence HOY el plazo de ${reglas.plazoNotificacionNacimientoDias} días en ${reglas.portalNombre}.`
              : `Quedan ${diasNotif} día(s) para notificar en ${reglas.portalNombre} (límite ${formatearFechaEs(limiteNotif)}).`,
        crotal: ev.crotal,
        eventoId: ev.id,
        fechaLimite: limiteNotif,
        diasRestantes: diasNotif,
      });

      if (ev.crotalColocado === false) {
        const limiteCrotal = sumarDiasIso(ev.fechaEvento, reglas.plazoIdentificacionFisicaDias);
        const diasCrotal = diferenciaDias(limiteCrotal, fechaRefIso);
        alertas.push({
          id: `crotal-fisico-${ev.id}`,
          nivel: diasCrotal <= 3 ? 'CRITICA' : diasCrotal <= 7 ? 'ATENCION' : 'OK',
          categoria: 'COLOCACION_CROTAL',
          titulo: `Colocar crotal físico a ternero de madre ${ev.crotalMadre || '—'}`,
          detalle:
            diasCrotal < 0
              ? `Plazo físico de ${reglas.plazoIdentificacionFisicaDias} días vencido hace ${Math.abs(diasCrotal)} día(s).`
              : `Quedan ${diasCrotal} día(s) para colocar el crotal físico (límite ${formatearFechaEs(limiteCrotal)}).`,
          crotal: ev.crotal,
          eventoId: ev.id,
          fechaLimite: limiteCrotal,
          diasRestantes: diasCrotal,
        });
      }
    }

    if (ev.tipo === 'BAJA_MUERTE') {
      const limiteBaja = sumarDiasIso(ev.fechaEvento, reglas.plazoNotificacionBajaDias);
      const diasBaja = diferenciaDias(limiteBaja, fechaRefIso);
      alertas.push({
        id: `notif-baja-${ev.id}`,
        nivel: clasificarNivelPorDias(diasBaja),
        categoria: 'NOTIFICACION_BAJA',
        titulo: `Comunicar baja por muerte ${ev.crotal}`,
        detalle:
          diasBaja < 0
            ? `Plazo de ${reglas.plazoNotificacionBajaDias} días VENCIDO hace ${Math.abs(diasBaja)} día(s).`
            : diasBaja === 0
              ? `Vence HOY el plazo para comunicar baja en ${reglas.portalNombre}.`
              : `Quedan ${diasBaja} día(s) para notificar la baja (límite ${formatearFechaEs(limiteBaja)}).`,
        crotal: ev.crotal,
        eventoId: ev.id,
        fechaLimite: limiteBaja,
        diasRestantes: diasBaja,
      });
    }
  }

  // 2. Periodos de supresión activos (leche / carne)
  for (const animal of animales) {
    if (animal.estado !== 'ACTIVO' || !animal.supresionActiva) continue;
    const enLeche = estaEnSupresionLeche(animal, fechaRefIso);
    const enCarne = estaEnSupresionCarne(animal, fechaRefIso);
    if (enLeche || enCarne) {
      const partes: string[] = [];
      if (enLeche && animal.supresionActiva.finSupresionLeche) {
        const d = diferenciaDias(animal.supresionActiva.finSupresionLeche, fechaRefIso);
        partes.push(`Leche hasta ${formatearFechaEs(animal.supresionActiva.finSupresionLeche)} (${d}d)`);
      }
      if (enCarne && animal.supresionActiva.finSupresionCarne) {
        const d = diferenciaDias(animal.supresionActiva.finSupresionCarne, fechaRefIso);
        partes.push(`Carne hasta ${formatearFechaEs(animal.supresionActiva.finSupresionCarne)} (${d}d)`);
      }
      alertas.push({
        id: `supresion-${animal.id}`,
        nivel: enLeche ? 'CRITICA' : 'ATENCION',
        categoria: 'SUPRESION',
        titulo: `Supresión activa — #${animal.numeroCorto} (${animal.supresionActiva.medicamento})`,
        detalle: `${partes.join(' · ')}. No mezclar leche ni enviar a matadero.`,
        crotal: animal.crotal,
        animalId: animal.id,
      });
    }
  }

  // 3. Stock bajo de crotales
  const disponibles = contarCrotalesDisponibles(lotesCrotales, explotacion.especiePrincipal);
  if (disponibles <= explotacion.umbralAlertaCrotales) {
    alertas.push({
      id: 'stock-crotales-bajo',
      nivel: disponibles <= 3 ? 'CRITICA' : 'ATENCION',
      categoria: 'STOCK_CROTALES',
      titulo: `Stock bajo de crotales (${disponibles} disponibles)`,
      detalle: `Quedan ${disponibles} crotales libres (umbral configurado: ${explotacion.umbralAlertaCrotales}). Solicita nueva remesa en la OCA / Agroficina.`,
    });
  }

  // 4. Documentos de saneamiento próximos a caducar o caducados
  for (const doc of documentos) {
    if (!doc.fechaCaducidad || doc.estado === 'ARCHIVADO') continue;
    const dias = diferenciaDias(doc.fechaCaducidad, fechaRefIso);
    if (dias <= 30) {
      alertas.push({
        id: `doc-${doc.id}`,
        nivel: dias <= 0 ? 'CRITICA' : 'ATENCION',
        categoria: 'SANEAMIENTO',
        titulo: `Documento próximo a caducar: ${doc.titulo}`,
        detalle:
          dias < 0
            ? `Caducado hace ${Math.abs(dias)} día(s) (${formatearFechaEs(doc.fechaCaducidad)}).`
            : `Caduca en ${dias} día(s) (${formatearFechaEs(doc.fechaCaducidad)}).`,
        fechaLimite: doc.fechaCaducidad,
        diasRestantes: dias,
      });
    }
  }

  // 5. Campañas de saneamiento oficiales próximas o con resultados dudosos/positivos
  for (const san of estado.saneamientos || []) {
    const positivos = san.resultados.filter((r) => r.resultado === 'POSITIVO').length;
    const dudosos = san.resultados.filter((r) => r.resultado === 'DUDOSO').length;
    if (positivos > 0 || dudosos > 0) {
      alertas.push({
        id: `san-res-${san.id}`,
        nivel: positivos > 0 ? 'CRITICA' : 'ATENCION',
        categoria: 'SANEAMIENTO',
        titulo: `Saneamiento ${san.nombre}: ${positivos > 0 ? `${positivos} positivo(s)` : ''}${positivos > 0 && dudosos > 0 ? ' · ' : ''}${dudosos > 0 ? `${dudosos} dudoso(s)` : ''}`,
        detalle: `Campaña del ${formatearFechaEs(san.fecha)}. Contactar con ADS / Veterinario oficial para repetir prueba o aislar.`,
        fechaLimite: san.fechaProxima,
      });
    }
    if (san.fechaProxima) {
      const dias = diferenciaDias(san.fechaProxima, fechaRefIso);
      if (dias <= 30) {
        alertas.push({
          id: `san-prox-${san.id}`,
          nivel: dias <= 0 ? 'CRITICA' : 'ATENCION',
          categoria: 'SANEAMIENTO',
          titulo: `Próxima campaña de saneamiento: ${san.nombre}`,
          detalle:
            dias < 0
              ? `Vencida hace ${Math.abs(dias)} día(s) (${formatearFechaEs(san.fechaProxima)}).`
              : `Programada en ${dias} día(s) (${formatearFechaEs(san.fechaProxima)}).`,
          fechaLimite: san.fechaProxima,
          diasRestantes: dias,
        });
      }
    }
  }

  // Ordenar: CRITICA -> ATENCION -> OK, y luego por menor días restantes
  const peso: Record<NivelAlerta, number> = { CRITICA: 0, ATENCION: 1, OK: 2 };
  return alertas.sort((a, b) => {
    if (peso[a.nivel] !== peso[b.nivel]) return peso[a.nivel] - peso[b.nivel];
    const da = a.diasRestantes ?? 999;
    const db = b.diasRestantes ?? 999;
    return da - db;
  });
}

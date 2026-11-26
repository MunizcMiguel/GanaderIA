import { obtenerAnimalesConCrotalFaltante } from './crotales';
import { formatearFechaEs, hoyIso } from './fechas';
import type { EstadoGanaderia, EventoTramite, UnidadGanadera } from './types';

function escaparCsv(valor: string | number | undefined): string {
  const s = String(valor ?? '');
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function generarCsvLibroRegistro(estado: EstadoGanaderia): string {
  const cabeceras = [
    'REGA',
    'Especie',
    'Crotal_Oficial',
    'Num_Corto',
    'Nombre',
    'Raza',
    'Sexo',
    'Fecha_Nacimiento',
    'Crotal_Madre',
    'Estado',
    'Fecha_Baja',
    'Motivo_Baja',
    'Estado_Crotal',
    'DIB_Impreso',
    'En_Censo_Oficial',
  ];

  const filas = estado.animales.map((a) =>
    [
      estado.explotacion.codigoRega,
      a.especie,
      a.crotal,
      a.numeroCorto,
      a.nombre || '',
      a.raza,
      a.sexo,
      formatearFechaEs(a.fechaNacimiento),
      a.crotalMadre || '',
      a.estado,
      formatearFechaEs(a.fechaBaja),
      a.motivoBaja || '',
      a.estadoCrotal,
      a.dibImpreso ? 'SI' : 'NO',
      a.enCensoOficial ? 'SI' : 'NO',
    ]
      .map(escaparCsv)
      .join(';'),
  );

  return '\uFEFF' + [cabeceras.join(';'), ...filas].join('\r\n');
}

export function generarCsvSolicitudDuplicados(estado: EstadoGanaderia): string {
  const faltantes = obtenerAnimalesConCrotalFaltante(estado.animales);
  const cabeceras = [
    'REGA',
    'Titular',
    'Crotal_A_Duplicar',
    'Num_Corto',
    'Detalle_Perdida',
    'Cantidad_Duplicados',
    'Fecha_Solicitud',
  ];

  const hoy = formatearFechaEs(hoyIso());
  const filas = faltantes.map((a) =>
    [
      estado.explotacion.codigoRega,
      estado.explotacion.titular,
      a.crotal,
      a.numeroCorto,
      a.estadoCrotal,
      a.estadoCrotal === 'FALTAN_AMBOS' ? 2 : 1,
      hoy,
    ]
      .map(escaparCsv)
      .join(';'),
  );

  return '\uFEFF' + [cabeceras.join(';'), ...filas].join('\r\n');
}

/**
 * Paquete estructurado JSON preparado para la futura Extensión de Navegador (#11)
 * que autorrellenará los formularios de Agroficina Virtual / RemoWeb en 1 clic.
 */
export function generarPaqueteRemoWebJson(estado: EstadoGanaderia): string {
  const pendientes: EventoTramite[] = estado.eventos.filter((e) => e.estadoTramite === 'PENDIENTE');
  const paquete = {
    schemaVersion: 'ganaderia-remoweb-v1',
    generadoEn: new Date().toISOString(),
    explotacion: {
      rega: estado.explotacion.codigoRega,
      nombre: estado.explotacion.nombre,
      titular: estado.explotacion.titular,
      comunidad: estado.explotacion.comunidad,
    },
    tramitesPendientes: pendientes.map((ev) => ({
      id: ev.id,
      tipo: ev.tipo,
      especie: ev.especie,
      crotal: ev.crotal,
      crotalMadre: ev.crotalMadre ?? null,
      sexo: ev.sexo ?? null,
      raza: ev.raza ?? null,
      fechaEvento: ev.fechaEvento,
      destino: ev.destino ?? null,
      codigoRegaDestino: ev.codigoRegaDestino ?? null,
      motivo: ev.motivo ?? null,
    })),
  };
  return JSON.stringify(paquete, null, 2);
}

export function generarResumenTextoGuiaSalida(
  estado: EstadoGanaderia,
  animales: UnidadGanadera[],
  destino: string,
  codigoRegaDestino: string,
  fechaSalida: string,
): string {
  const lineas = [
    `BORRADOR GUÍA DE ORIGEN Y SANIDAD PECUARIA — ${estado.explotacion.comunidad}`,
    `Explotación origen: ${estado.explotacion.nombre} (REGA: ${estado.explotacion.codigoRega})`,
    `Titular: ${estado.explotacion.titular} — ${estado.explotacion.municipio}`,
    `Destino: ${destino}${codigoRegaDestino ? ` (REGA: ${codigoRegaDestino})` : ''}`,
    `Fecha prevista de salida: ${formatearFechaEs(fechaSalida)}`,
    `Total animales: ${animales.length}`,
    '',
    'LISTADO DE RESES (verificar DIBs adjuntos):',
    ...animales.map(
      (a, idx) =>
        `${idx + 1}. ${a.crotal} (#${a.numeroCorto}) | ${a.raza} | Sexo: ${a.sexo} | Nac: ${formatearFechaEs(a.fechaNacimiento)} | DIB: ${a.dibImpreso ? 'Listo' : 'IMPRIMIR EN REMOWEB'}`,
    ),
  ];
  return lineas.join('\n');
}

export function descargarArchivo(nombreArchivo: string, contenido: string, tipoMime: string): void {
  const blob = new Blob([contenido], { type: tipoMime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

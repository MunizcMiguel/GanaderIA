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
    schemaVersion: 'ganaderia-remoweb-v2',
    generadoEn: new Date().toISOString(),
    explotacion: {
      rega: estado.explotacion.codigoRega,
      nombre: estado.explotacion.nombre,
      titular: estado.explotacion.titular,
      comunidad: estado.explotacion.comunidad,
      municipio: estado.explotacion.municipio,
      telefonoContacto: estado.explotacion.telefonoContacto ?? null,
      codigoSirentraHabitual: estado.explotacion.codigoSirentraHabitual ?? null,
      proveedorCrotalHabitual: estado.explotacion.proveedorCrotalHabitual ?? 'AZASA',
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
      modalidadMuerte: ev.modalidadMuerte ?? null,
      numeroDamer: ev.numeroDamer ?? null,
      fechaValidezDamer: ev.fechaValidezDamer ?? null,
      ceaMatadero: ev.ceaMatadero ?? null,
      concejo: ev.concejo ?? null,
      lugarMuerte: ev.lugarMuerte ?? null,
      declaracionEnterramiento: ev.declaracionEnterramiento ?? null,
      presentaDenuncia: ev.presentaDenuncia ?? null,
      numeroDenuncia: ev.numeroDenuncia ?? null,
      medioTransporte: ev.medioTransporte ?? null,
      codigoSirentra: ev.codigoSirentra ?? null,
      matriculaVehiculo: ev.matriculaVehiculo ?? null,
      horaSalida: ev.horaSalida ?? null,
      proveedorCrotal: ev.proveedorCrotal ?? estado.explotacion.proveedorCrotalHabitual ?? null,
      formaEnvio: ev.formaEnvio ?? null,
      telefonoContacto: ev.telefonoContacto ?? estado.explotacion.telefonoContacto ?? null,
    })),
  };
  return JSON.stringify(paquete, null, 2);
}

function escaparXml(valor: string | number | boolean | undefined | null): string {
  const s = String(valor ?? '');
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Borrador XML estructurado según el modelo de mensajería SITRAN / SIMOGAN / REMO (MAPA),
 * preparado para integración por Web Services / pasarela con el Principado de Asturias.
 */
export function generarXmlSitranBorrador(estado: EstadoGanaderia): string {
  const pendientes = estado.eventos.filter((e) => e.estadoTramite === 'PENDIENTE');
  const nacimientos = pendientes.filter((e) => e.tipo === 'NACIMIENTO');
  const bajasMuerte = pendientes.filter((e) => e.tipo === 'BAJA_MUERTE');
  const desapariciones = pendientes.filter((e) => e.tipo === 'DESAPARICION');
  const movimientos = pendientes.filter(
    (e) =>
      e.tipo === 'SALIDA_MATADERO' ||
      e.tipo === 'SALIDA_MERCADO' ||
      e.tipo === 'SALIDA_PASTOS' ||
      e.tipo === 'VENTA',
  );
  const duplicados = pendientes.filter((e) => e.tipo === 'DUPLICADO_CROTAL');

  const lineas: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<SITRAN_BORRADOR_COMUNICACION xmlns="urn:mapa:sitran:borrador:v1">',
    '  <Cabecera>',
    `    <CodigoREGA>${escaparXml(estado.explotacion.codigoRega)}</CodigoREGA>`,
    `    <Explotacion>${escaparXml(estado.explotacion.nombre)}</Explotacion>`,
    `    <Titular>${escaparXml(estado.explotacion.titular)}</Titular>`,
    `    <ComunidadAutonoma>${escaparXml(estado.explotacion.comunidad)}</ComunidadAutonoma>`,
    `    <FechaGeneracion>${escaparXml(new Date().toISOString())}</FechaGeneracion>`,
    '  </Cabecera>',
    '  <Nacimientos>',
    ...nacimientos.map(
      (n) =>
        `    <Nacimiento id="${escaparXml(n.id)}">\n` +
        `      <Especie>${escaparXml(n.especie)}</Especie>\n` +
        `      <CrotalCria>${escaparXml(n.crotal)}</CrotalCria>\n` +
        `      <CrotalMadre>${escaparXml(n.crotalMadre)}</CrotalMadre>\n` +
        `      <Sexo>${escaparXml(n.sexo)}</Sexo>\n` +
        `      <Raza>${escaparXml(n.raza)}</Raza>\n` +
        `      <FechaNacimiento>${escaparXml(n.fechaEvento)}</FechaNacimiento>\n` +
        '    </Nacimiento>',
    ),
    '  </Nacimientos>',
    '  <BajasMuerte>',
    ...bajasMuerte.map(
      (b) =>
        `    <BajaMuerte id="${escaparXml(b.id)}">\n` +
        `      <Crotal>${escaparXml(b.crotal)}</Crotal>\n` +
        `      <FechaBaja>${escaparXml(b.fechaEvento)}</FechaBaja>\n` +
        `      <ModalidadRemoWeb>${escaparXml(b.modalidadMuerte || 'DAMER')}</ModalidadRemoWeb>\n` +
        (b.numeroDamer ? `      <NumeroDAMER>${escaparXml(b.numeroDamer)}</NumeroDAMER>\n` : '') +
        (b.ceaMatadero ? `      <CEAMatadero>${escaparXml(b.ceaMatadero)}</CEAMatadero>\n` : '') +
        (b.concejo ? `      <Concejo>${escaparXml(b.concejo)}</Concejo>\n` : '') +
        `      <Motivo>${escaparXml(b.motivo)}</Motivo>\n` +
        '    </BajaMuerte>',
    ),
    '  </BajasMuerte>',
    '  <Desapariciones>',
    ...desapariciones.map(
      (d) =>
        `    <Desaparicion id="${escaparXml(d.id)}">\n` +
        `      <Crotal>${escaparXml(d.crotal)}</Crotal>\n` +
        `      <FechaDesaparicion>${escaparXml(d.fechaEvento)}</FechaDesaparicion>\n` +
        `      <Concejo>${escaparXml(d.concejo)}</Concejo>\n` +
        `      <Lugar>${escaparXml(d.lugarMuerte)}</Lugar>\n` +
        `      <PresentaDenuncia>${d.presentaDenuncia ? 'SI' : 'NO'}</PresentaDenuncia>\n` +
        (d.numeroDenuncia ? `      <NumeroDenuncia>${escaparXml(d.numeroDenuncia)}</NumeroDenuncia>\n` : '') +
        '    </Desaparicion>',
    ),
    '  </Desapariciones>',
    '  <MovimientosSalida>',
    ...movimientos.map(
      (m) =>
        `    <Movimiento id="${escaparXml(m.id)}">\n` +
        `      <Tipo>${escaparXml(m.tipo)}</Tipo>\n` +
        `      <Crotal>${escaparXml(m.crotal)}</Crotal>\n` +
        `      <FechaSalida>${escaparXml(m.fechaEvento)}</FechaSalida>\n` +
        `      <Destino>${escaparXml(m.destino)}</Destino>\n` +
        `      <REGADestino>${escaparXml(m.codigoRegaDestino)}</REGADestino>\n` +
        `      <MedioTransporte>${escaparXml(m.medioTransporte || 'CAMION')}</MedioTransporte>\n` +
        `      <CodigoSIRENTRA>${escaparXml(m.codigoSirentra)}</CodigoSIRENTRA>\n` +
        `      <Matricula>${escaparXml(m.matriculaVehiculo)}</Matricula>\n` +
        '    </Movimiento>',
    ),
    '  </MovimientosSalida>',
    '  <DuplicadosCrotal>',
    ...duplicados.map(
      (dup) =>
        `    <SolicitudDuplicado id="${escaparXml(dup.id)}">\n` +
        `      <Crotal>${escaparXml(dup.crotal)}</Crotal>\n` +
        `      <Proveedor>${escaparXml(dup.proveedorCrotal || estado.explotacion.proveedorCrotalHabitual || 'AZASA')}</Proveedor>\n` +
        `      <FormaEnvio>${escaparXml(dup.formaEnvio || 'CORREO_ORDINARIO')}</FormaEnvio>\n` +
        '    </SolicitudDuplicado>',
    ),
    '  </DuplicadosCrotal>',
    '</SITRAN_BORRADOR_COMUNICACION>',
  ];

  return lineas.join('\n');
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

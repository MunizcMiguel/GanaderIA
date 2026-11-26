import { formatearFechaEs } from './fechas';
import type { EstadoGanaderia } from './types';

function fechaAdis(iso?: string): string {
  if (!iso) return '00000000';
  return iso.replace(/-/g, '').slice(0, 8);
}

/**
 * Genera archivo estándar europeo ADIS (ISO 11787) para importar eventos (partos,
 * inseminaciones y bajas) desde GanaderIA hacia el software del robot (DeLaval DelPro / Lely / GEA).
 */
export function generarArchivoAdisParaRobot(estado: EstadoGanaderia): string {
  const lineas: string[] = [
    'DH0000010000001400000020',
    `VH${estado.explotacion.codigoRega.padEnd(14, ' ')}GANADERIA_ASTURIAS  `,
  ];

  // Bloque Partos / Nacimientos (Entidad ADIS 810001)
  const partos = estado.eventos.filter((e) => e.tipo === 'NACIMIENTO');
  if (partos.length > 0) {
    lineas.push('DN81000100900014009000150090000800900001');
    for (const p of partos) {
      const madre = (p.crotalMadre || '').padEnd(14, ' ').slice(0, 14);
      const cria = (p.crotal || '').padEnd(15, ' ').slice(0, 15);
      const fecha = fechaAdis(p.fechaEvento);
      const sexo = p.sexo === 'M' ? '1' : '2';
      lineas.push(`VN${madre}${cria}${fecha}${sexo}`);
    }
  }

  // Bloque Inseminaciones (Entidad ADIS 820001)
  const insems = estado.inseminaciones || [];
  if (insems.length > 0) {
    lineas.push('DN820001009000140090000800900020');
    for (const ins of insems) {
      const vaca = (ins.crotal || '').padEnd(14, ' ').slice(0, 14);
      const fecha = fechaAdis(ins.fechaInseminacion);
      const toro = (ins.toro || 'SIN_TORO').padEnd(20, ' ').slice(0, 20);
      lineas.push(`VN${vaca}${fecha}${toro}`);
    }
  }

  // Bloque Bajas / Salidas (Entidad ADIS 830001)
  const bajas = estado.eventos.filter(
    (e) => e.tipo === 'BAJA_MUERTE' || e.tipo === 'SALIDA_MATADERO' || e.tipo === 'VENTA',
  );
  if (bajas.length > 0) {
    lineas.push('DN830001009000140090000800900015');
    for (const b of bajas) {
      const vaca = (b.crotal || '').padEnd(14, ' ').slice(0, 14);
      const fecha = fechaAdis(b.fechaEvento);
      const tipo = b.tipo.padEnd(15, ' ').slice(0, 15);
      lineas.push(`VN${vaca}${fecha}${tipo}`);
    }
  }

  lineas.push('ZN');
  return lineas.join('\r\n');
}

/**
 * Genera exportación CSV limpia compatible con hojas de importación de Lely Horizon / DeLaval DelPro.
 */
export function generarCsvExportacionParaRobot(estado: EstadoGanaderia): string {
  const filas: string[] = [
    'Event_Type;Cow_Eartag;Calf_Eartag;Event_Date;Sex;Sire_Or_Reason;REGA',
  ];

  for (const ev of estado.eventos) {
    if (ev.tipo === 'NACIMIENTO') {
      filas.push(
        `Calving;${ev.crotalMadre || ''};${ev.crotal};${formatearFechaEs(ev.fechaEvento)};${ev.sexo || 'H'};${ev.raza || ''};${estado.explotacion.codigoRega}`,
      );
    } else if (ev.tipo === 'BAJA_MUERTE' || ev.tipo === 'SALIDA_MATADERO') {
      filas.push(
        `Exit;${ev.crotal};;${formatearFechaEs(ev.fechaEvento)};;${ev.motivo || ev.destino || ev.tipo};${estado.explotacion.codigoRega}`,
      );
    }
  }

  for (const ins of estado.inseminaciones || []) {
    filas.push(
      `Insemination;${ins.crotal};;${formatearFechaEs(ins.fechaInseminacion)};;${ins.toro || ''};${estado.explotacion.codigoRega}`,
    );
  }

  return '\uFEFF' + filas.join('\r\n');
}

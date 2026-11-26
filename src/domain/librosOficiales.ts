import { extraerNumeroCorto, normalizarCrotal } from './crotales';
import { formatearFechaEs, hoyIso } from './fechas';
import { calcularUGMRebano } from './gestionAvanzada';
import type {
  EspecieCodigo,
  EstadoGanaderia,
  RegistroTratamiento,
  SexoAnimal,
  UnidadGanadera,
} from './types';

export interface FilaLibroExplotacion {
  fecha: string;
  movimiento: 'A' | 'B'; // A = Entrada (Alta), B = Salida (Baja)
  causa: string;
  crotal: string;
  sexo: SexoAnimal;
  raza: string;
  fechaNacimiento: string;
  regaContraparte: string;
  documentoSanitario: string;
  balanceMachos: number;
  balanceHembras: number;
}

/**
 * Construye el Libro Oficial de Registro de Explotación (Entradas A / Salidas B)
 * con recuento acumulado de machos y hembras.
 */
export function generarFilasLibroExplotacion(estado: EstadoGanaderia): FilaLibroExplotacion[] {
  const mapaAnimales = new Map(estado.animales.map((a) => [a.crotal, a]));
  const filasBase: Array<Omit<FilaLibroExplotacion, 'balanceMachos' | 'balanceHembras'>> = [];
  const crotalesConAltaEvento = new Set<string>();

  for (const ev of estado.eventos) {
    if (ev.tipo === 'TRATAMIENTO' || ev.tipo === 'DUPLICADO_CROTAL') continue;
    const ani = (ev.animalId && estado.animales.find((a) => a.id === ev.animalId)) || mapaAnimales.get(ev.crotal);
    const sexo: SexoAnimal = ev.sexo || ani?.sexo || 'H';
    const raza = ev.raza || ani?.raza || '—';
    const fechaNac = ani?.fechaNacimientoOficial || ani?.fechaNacimiento || ev.fechaEvento;

    if (ev.tipo === 'NACIMIENTO' || ev.tipo === 'COMPRA') {
      crotalesConAltaEvento.add(ev.crotal);
      filasBase.push({
        fecha: ev.fechaEvento,
        movimiento: 'A',
        causa: ev.tipo === 'NACIMIENTO' ? 'Nacimiento' : 'Compra',
        crotal: ev.crotal,
        sexo,
        raza,
        fechaNacimiento: fechaNac,
        regaContraparte:
          ev.tipo === 'COMPRA'
            ? ev.codigoRegaOrigen || ani?.regaOrigen || 'Otra explotación'
            : estado.explotacion.codigoRega,
        documentoSanitario: ev.documentoSanitario || ev.numeroJustificante || '—',
      });
    } else if (
      ev.tipo === 'BAJA_MUERTE' ||
      ev.tipo === 'SALIDA_MATADERO' ||
      ev.tipo === 'SALIDA_MERCADO' ||
      ev.tipo === 'SALIDA_PASTOS' ||
      ev.tipo === 'VENTA'
    ) {
      const mapaCausas: Record<string, string> = {
        BAJA_MUERTE: 'Muerte',
        SALIDA_MATADERO: 'Matadero',
        SALIDA_MERCADO: 'Mercado',
        SALIDA_PASTOS: 'Traslado pastos',
        VENTA: 'Venta',
      };
      filasBase.push({
        fecha: ev.fechaEvento,
        movimiento: 'B',
        causa: mapaCausas[ev.tipo] || ev.tipo,
        crotal: ev.crotal,
        sexo,
        raza,
        fechaNacimiento: fechaNac,
        regaContraparte: ev.codigoRegaDestino || ev.destino || '—',
        documentoSanitario: ev.documentoSanitario || ev.numeroJustificante || '—',
      });
    }
  }

  // Asegurar que animales ya presentes en censo inicial constan como entrada histórica en el libro
  for (const ani of estado.animales) {
    if (crotalesConAltaEvento.has(ani.crotal)) continue;
    filasBase.push({
      fecha: ani.fechaNacimientoOficial || ani.fechaNacimiento,
      movimiento: 'A',
      causa: ani.regaOrigen ? 'Compra' : 'Nacimiento / Censo base',
      crotal: ani.crotal,
      sexo: ani.sexo,
      raza: ani.raza,
      fechaNacimiento: ani.fechaNacimientoOficial || ani.fechaNacimiento,
      regaContraparte: ani.regaOrigen || estado.explotacion.codigoRega,
      documentoSanitario: ani.dibImpreso ? 'DIB oficial' : '—',
    });
  }

  filasBase.sort((a, b) => a.fecha.localeCompare(b.fecha));

  let machos = 0;
  let hembras = 0;

  return filasBase.map((f) => {
    const delta = f.movimiento === 'A' ? 1 : -1;
    if (f.sexo === 'M') machos = Math.max(0, machos + delta);
    else hembras = Math.max(0, hembras + delta);
    return {
      ...f,
      balanceMachos: machos,
      balanceHembras: hembras,
    };
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generarHtmlLibroExplotacion(
  estado: EstadoGanaderia,
  fechaRefIso: string = hoyIso(),
): string {
  const filas = generarFilasLibroExplotacion(estado);
  const ugm = calcularUGMRebano(estado.animales, fechaRefIso);
  const activos = estado.animales.filter((a) => a.estado === 'ACTIVO');

  const rowsHtml = filas
    .map(
      (f, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(formatearFechaEs(f.fecha))}</td>
        <td style="font-weight:700;color:${f.movimiento === 'A' ? '#065f46' : '#991b1b'}">${f.movimiento} (${escapeHtml(f.causa)})</td>
        <td style="font-family:monospace;font-weight:700">${escapeHtml(f.crotal)}</td>
        <td>${f.sexo === 'M' ? 'Macho' : 'Hembra'}</td>
        <td>${escapeHtml(f.raza)}</td>
        <td>${escapeHtml(formatearFechaEs(f.fechaNacimiento))}</td>
        <td>${escapeHtml(f.regaContraparte)}</td>
        <td>${escapeHtml(f.documentoSanitario)}</td>
        <td style="text-align:center">${f.balanceHembras} H / ${f.balanceMachos} M</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Libro de Registro de Explotación — ${escapeHtml(estado.explotacion.codigoRega)}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; margin: 24px; font-size: 11px; }
    h1 { font-size: 16px; margin: 0 0 4px 0; color: #0f3d2e; }
    .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; margin: 12px 0; background: #f8fafc; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; }
    th { background: #0f3d2e; color: #fff; font-size: 10px; text-transform: uppercase; }
    tr:nth-child(even) td { background: #f8faf6; }
    .foot { margin-top: 18px; display: flex; justify-content: space-between; font-size: 10px; color: #475569; }
    @media print { body { margin: 10mm; } }
  </style>
</head>
<body>
  <h1>LIBRO OFICIAL DE REGISTRO DE EXPLOTACIÓN GANADERA (ENTRADAS A / SALIDAS B)</h1>
  <div>Emitido por GanaderIA el ${escapeHtml(formatearFechaEs(fechaRefIso))} · Formato SITRAN / Libro de Registro Bovino</div>
  <div class="meta">
    <div><strong>Explotación:</strong> ${escapeHtml(estado.explotacion.nombre)}</div>
    <div><strong>Titular:</strong> ${escapeHtml(estado.explotacion.titular)}</div>
    <div><strong>Código REGA:</strong> <span style="font-family:monospace">${escapeHtml(estado.explotacion.codigoRega)}</span></div>
    <div><strong>Municipio:</strong> ${escapeHtml(estado.explotacion.municipio)}</div>
    <div><strong>Especie:</strong> ${escapeHtml(estado.explotacion.especiePrincipal)} (${escapeHtml(estado.explotacion.orientacionProductiva || 'LECHE')})</div>
    <div><strong>Censo activo:</strong> ${activos.length} cabezas · <strong>${ugm.totalUgm} UGM</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Nº</th>
        <th>Fecha</th>
        <th>Mov. (A/B) y Causa</th>
        <th>Identificación (Crotal)</th>
        <th>Sexo</th>
        <th>Raza</th>
        <th>Fecha Nac.</th>
        <th>REGA Origen / Destino</th>
        <th>Doc. Sanitario / Ref.</th>
        <th>Recuento (H / M)</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="foot">
    <span>Total apuntes: ${filas.length} · Resumen activo: ${ugm.vacas} vacas, ${ugm.novillas} novillas, ${ugm.toros} toros, ${ugm.terneros} terneros</span>
    <span>Firma del titular: ___________________________</span>
  </div>
</body>
</html>`;
}

export function generarHtmlLibroTratamientos(
  estado: EstadoGanaderia,
  fechaRefIso: string = hoyIso(),
): string {
  const tratamientos: RegistroTratamiento[] = [...(estado.tratamientos || [])].sort((a, b) =>
    b.fechaAdministracion.localeCompare(a.fechaAdministracion),
  );

  const rowsHtml = tratamientos
    .map(
      (t, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(formatearFechaEs(t.fechaPrescripcion))}<br/><small>Admin: ${escapeHtml(formatearFechaEs(t.fechaAdministracion))}</small></td>
        <td style="font-family:monospace">${escapeHtml(t.recetaPresvet || '—')}</td>
        <td><strong>${escapeHtml(t.medicamento)}</strong>${t.dosis ? `<br/><small>Dosis: ${escapeHtml(t.dosis)}</small>` : ''}</td>
        <td>${escapeHtml(t.afeccion || '—')}${t.duracionDias ? ` (${t.duracionDias}d)` : ''}</td>
        <td style="font-family:monospace">${escapeHtml(t.crotales.join(', '))}</td>
        <td>${escapeHtml(t.veterinario || '—')}<br/><small>Aplica: ${t.aplicadoPor === 'VETERINARIO' ? 'Veterinario' : 'Ganadero'}</small></td>
        <td>${escapeHtml(t.proveedor || '—')}</td>
        <td>Carne: <strong>${t.diasSupresionCarne}d</strong>${t.finSupresionCarne ? ` (${escapeHtml(formatearFechaEs(t.finSupresionCarne))})` : ''}<br/>Leche: <strong>${t.diasSupresionLeche}d</strong>${t.finSupresionLeche ? ` (${escapeHtml(formatearFechaEs(t.finSupresionLeche))})` : ''}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Libro de Tratamientos Veterinarios — ${escapeHtml(estado.explotacion.codigoRega)}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; margin: 24px; font-size: 11px; }
    h1 { font-size: 16px; margin: 0 0 4px 0; color: #0f3d2e; }
    .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; margin: 12px 0; background: #f8fafc; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; vertical-align: top; }
    th { background: #1e3a5f; color: #fff; font-size: 10px; text-transform: uppercase; }
    tr:nth-child(even) td { background: #f8fafc; }
    .foot { margin-top: 18px; display: flex; justify-content: space-between; font-size: 10px; color: #475569; }
    @media print { body { margin: 10mm; } }
  </style>
</head>
<body>
  <h1>REGISTRO OFICIAL DE TRATAMIENTOS VETERINARIOS (PRESVET / RD 1749/1998)</h1>
  <div>Emitido por GanaderIA el ${escapeHtml(formatearFechaEs(fechaRefIso))}</div>
  <div class="meta">
    <div><strong>Explotación:</strong> ${escapeHtml(estado.explotacion.nombre)}</div>
    <div><strong>Titular:</strong> ${escapeHtml(estado.explotacion.titular)}</div>
    <div><strong>Código REGA:</strong> <span style="font-family:monospace">${escapeHtml(estado.explotacion.codigoRega)}</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Nº</th>
        <th>Prescripción / Admin.</th>
        <th>Nº Receta</th>
        <th>Medicamento y Dosis</th>
        <th>Afección / Duración</th>
        <th>Animales Tratados</th>
        <th>Veterinario / Aplicador</th>
        <th>Proveedor</th>
        <th>Tiempo de Espera</th>
      </tr>
    </thead>
    <tbody>${rowsHtml || '<tr><td colspan="9" style="text-align:center;padding:16px">No hay tratamientos registrados aún.</td></tr>'}</tbody>
  </table>
  <div class="foot">
    <span>Total registros: ${tratamientos.length} · Conservar durante al menos 5 años para inspección oficial.</span>
    <span>Firma titular / veterinario: ___________________________</span>
  </div>
</body>
</html>`;
}

export function abrirVentanaImpresionHtml(html: string): boolean {
  const win = window.open('', '_blank', 'width=1024,height=760');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  window.setTimeout(() => {
    try {
      win.print();
    } catch {
      // ignora bloqueo de impresión en modo headless
    }
  }, 250);
  return true;
}

// ============================================================================
// EXPORTAR E IMPORTAR CENSO COMPATIBLE CON EXCEL ESPAÑA / VACAPP / AGROFICINA
// ============================================================================

function escaparCsv(valor: string | number | undefined | null): string {
  const s = String(valor ?? '');
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportarCensoExcelCsv(estado: EstadoGanaderia): string {
  const mapaCorrales = new Map((estado.corrales || []).map((c) => [c.id, c.nombre]));
  const cabeceras = [
    'Crotal',
    'Numero_Corto',
    'Nombre',
    'Especie',
    'Sexo',
    'Raza',
    'Fecha_Nacimiento',
    'Fecha_Nacimiento_Oficial',
    'Crotal_Madre',
    'Padre',
    'Estado',
    'Corral_Rebano',
    'Estado_Crotal',
    'Ultimo_Parto',
    'Lactacion',
    'REGA_Origen',
    'Notas',
  ];

  const lineas = [cabeceras.join(';')];
  for (const a of estado.animales) {
    lineas.push(
      [
        a.crotal,
        a.numeroCorto,
        a.nombre || '',
        a.especie,
        a.sexo,
        a.raza,
        a.fechaNacimiento,
        a.fechaNacimientoOficial || '',
        a.crotalMadre || '',
        a.crotalPadre || a.padreNombre || '',
        a.estado,
        a.corralId ? mapaCorrales.get(a.corralId) || a.corralId : '',
        a.estadoCrotal,
        a.fechaUltimoParto || '',
        a.numeroLactacion ?? '',
        a.regaOrigen || '',
        a.notas || '',
      ]
        .map(escaparCsv)
        .join(';'),
    );
  }
  // BOM UTF-8 para apertura directa con tildes perfectas en Excel España
  return '\uFEFF' + lineas.join('\n');
}

function parsearFechaFlexible(raw: string): string {
  const limpia = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpia)) return limpia;
  const dmy = limpia.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const d = dmy[1].padStart(2, '0');
    const m = dmy[2].padStart(2, '0');
    let y = dmy[3];
    if (y.length === 2) y = Number(y) > 50 ? `19${y}` : `20${y}`;
    return `${y}-${m}-${d}`;
  }
  return hoyIso();
}

export interface ResultadoImportacionCenso {
  nuevos: UnidadGanadera[];
  actualizados: number;
  ignorados: number;
  errores: string[];
}

/**
 * Importa un CSV/Excel (formato GanaderIA, VacApp o Agroficina Virtual) al censo.
 */
export function importarCensoDesdeCsv(
  textoCsv: string,
  estadoActual: EstadoGanaderia,
): ResultadoImportacionCenso {
  const limpio = textoCsv.replace(/^\uFEFF/, '').trim();
  const lineas = limpio.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lineas.length < 2) {
    return {
      nuevos: [],
      actualizados: 0,
      ignorados: 0,
      errores: ['El archivo debe tener al menos cabecera y una fila de animales.'],
    };
  }

  const sep = (lineas[0].match(/;/g)?.length || 0) >= (lineas[0].match(/,/g)?.length || 0) ? ';' : ',';
  const headers = lineas[0]
    .split(sep)
    .map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());

  const buscarCol = (candidatos: string[]): number => {
    for (const c of candidatos) {
      const exacto = headers.findIndex((h) => h === c);
      if (exacto >= 0) return exacto;
    }
    for (const c of candidatos) {
      const parcial = headers.findIndex((h) => h.includes(c));
      if (parcial >= 0) return parcial;
    }
    return -1;
  };

  const idxCrotal = buscarCol(['crotal', 'cib', 'identificacion', 'identificación', 'eartag', 'id_animal', 'codigo']);
  if (idxCrotal < 0) {
    return {
      nuevos: [],
      actualizados: 0,
      ignorados: 0,
      errores: ['No se encontró ninguna columna de crotal/identificación (ej: Crotal, CIB, Eartag).'],
    };
  }

  const idxNombre = buscarCol(['nombre', 'name', 'apodo']);
  const idxSexo = buscarCol(['sexo', 'sex']);
  const idxRaza = buscarCol(['raza', 'breed', 'race']);
  const idxFechaNac = buscarCol(['fecha_nacimiento', 'fecha nac', 'nacimiento', 'birth', 'fechanac']);
  const idxMadre = buscarCol(['crotal_madre', 'madre', 'mother', 'dam']);
  const idxPadre = buscarCol(['padre', 'crotal_padre', 'father', 'sire', 'toro']);
  const idxEspecie = buscarCol(['especie', 'species']);
  const idxNotas = buscarCol(['notas', 'observaciones', 'descripcion', 'notes']);

  const existentes = new Set(estadoActual.animales.map((a) => normalizarCrotal(a.crotal)));
  const nuevos: UnidadGanadera[] = [];
  let actualizados = 0;
  let ignorados = 0;
  const errores: string[] = [];

  for (let i = 1; i < lineas.length; i++) {
    const cols = lineas[i].split(sep).map((c) => c.replace(/^"|"$/g, '').trim());
    const crotalRaw = cols[idxCrotal];
    if (!crotalRaw) {
      ignorados += 1;
      continue;
    }
    const crotal = normalizarCrotal(crotalRaw);
    if (existentes.has(crotal)) {
      actualizados += 1;
      continue;
    }
    existentes.add(crotal);

    const sexoRaw = idxSexo >= 0 ? cols[idxSexo].toUpperCase() : 'H';
    const sexo: SexoAnimal =
      sexoRaw.startsWith('M') && !sexoRaw.startsWith('MA')
        ? 'M'
        : sexoRaw.includes('MACHO') || sexoRaw === 'M' || sexoRaw === 'MALE'
          ? 'M'
          : 'H';

    const espRaw = idxEspecie >= 0 ? cols[idxEspecie].toUpperCase() : '';
    const especie: EspecieCodigo =
      espRaw.includes('OVIN') || espRaw.includes('OVEJ')
        ? 'OVINO'
        : espRaw.includes('CAPR') || espRaw.includes('CABR')
          ? 'CAPRINO'
          : espRaw.includes('EQUI') || espRaw.includes('CABALL')
            ? 'EQUINO'
            : estadoActual.explotacion.especiePrincipal;

    nuevos.push({
      id: `ani-imp-${Date.now()}-${i}`,
      especie,
      esLote: false,
      cantidadEnLote: 1,
      crotal,
      numeroCorto: extraerNumeroCorto(crotal),
      nombre: idxNombre >= 0 && cols[idxNombre] ? cols[idxNombre] : undefined,
      raza: idxRaza >= 0 && cols[idxRaza] ? cols[idxRaza] : 'Frisona (Holstein)',
      sexo,
      fechaNacimiento: idxFechaNac >= 0 && cols[idxFechaNac] ? parsearFechaFlexible(cols[idxFechaNac]) : hoyIso(),
      crotalMadre: idxMadre >= 0 && cols[idxMadre] ? normalizarCrotal(cols[idxMadre]) : undefined,
      padreNombre: idxPadre >= 0 && cols[idxPadre] ? cols[idxPadre] : undefined,
      estado: 'ACTIVO',
      estadoCrotal: 'OK',
      dibImpreso: true,
      enCensoOficial: true,
      enRobotOrdene: false,
      notas: idxNotas >= 0 && cols[idxNotas] ? cols[idxNotas] : 'Importado desde Excel/CSV.',
    });
  }

  return { nuevos, actualizados, ignorados, errores };
}

export function hoyIso(ahora: Date = new Date()): string {
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, '0');
  const d = String(ahora.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function sumarDiasIso(fechaIso: string, dias: number): string {
  const [y, m, d] = fechaIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + dias);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Diferencia en días completos: (fechaDestino - fechaReferencia).
 * Positivo = días restantes; 0 = vence hoy; Negativo = días de retraso.
 */
export function diferenciaDias(fechaDestinoIso: string, fechaReferenciaIso: string): number {
  const [y1, m1, d1] = fechaDestinoIso.split('-').map(Number);
  const [y2, m2, d2] = fechaReferenciaIso.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t1 - t2) / (1000 * 60 * 60 * 24));
}

export function formatearFechaEs(fechaIso?: string): string {
  if (!fechaIso) return '—';
  const partes = fechaIso.split('-');
  if (partes.length !== 3) return fechaIso;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

/**
 * Normaliza fechas habituales de robots y portales (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, YYYY/MM/DD) a YYYY-MM-DD.
 */
export function parsearFechaFlexible(valor: string): string | undefined {
  const limpio = valor.trim().split(' ')[0];
  if (!limpio) return undefined;

  // YYYY-MM-DD o YYYY/MM/DD
  const isoMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(limpio);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD/MM/YYYY o DD-MM-YYYY
  const esMatch = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(limpio);
  if (esMatch) {
    const [, d, m, y] = esMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return undefined;
}

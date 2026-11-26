import type { EspecieCodigo, EstadoCrotalFisico } from '../domain/types';

function formatearPrefijoCrotal(crotal: string): { prefijo: string; ultimos4: string } {
  const limpio = crotal.replace(/\s+/g, '').toUpperCase();
  if (limpio.length <= 4) return { prefijo: 'ES', ultimos4: limpio };
  const ultimos4 = limpio.slice(-4);
  const inicio = limpio.slice(0, -4);
  // Agrupar visualmente ES 03 0045 12
  const prefijo = inicio.replace(/([A-Z]{2})(\d{2})(\d{4})(\d+)/, '$1 $2 $3 $4');
  return { prefijo, ultimos4 };
}

/**
 * Representación visual icónica de un crotal auricular ganadero oficial.
 * - variante="badge": compacto para tarjetas del Censo y listas (destaca el #4521).
 * - variante="tarjeta": vista realista de crotal oficial para Crotales y Ficha Animal.
 */
export function CrotalVisual({
  crotal,
  numeroCorto,
  especie = 'BOVINO',
  estadoCrotal = 'OK',
  variante = 'badge',
}: {
  crotal: string;
  numeroCorto?: string;
  especie?: EspecieCodigo;
  estadoCrotal?: EstadoCrotalFisico;
  variante?: 'badge' | 'tarjeta';
}) {
  const { prefijo, ultimos4 } = formatearPrefijoCrotal(crotal);
  const corto = numeroCorto || ultimos4;
  const hayIncidencia =
    estadoCrotal === 'FALTA_IZQUIERDO' ||
    estadoCrotal === 'FALTA_DERECHO' ||
    estadoCrotal === 'FALTAN_AMBOS';
  const pendiente = estadoCrotal === 'PENDIENTE_COLOCAR';

  if (variante === 'tarjeta') {
    return (
      <div className="relative inline-flex w-full max-w-[240px] flex-col items-center rounded-2xl border-2 border-amber-500/80 bg-gradient-to-b from-amber-200 via-amber-300 to-amber-400 px-5 pb-4 pt-3 text-amber-950 shadow-sm">
        {/* Orificio superior característico del crotal auricular */}
        <div className="mb-1.5 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border-2 border-amber-700/60 bg-[#f4f6f1] shadow-inner" />
        </div>
        <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-900/80">
          ESPAÑA · {especie}
        </span>
        <span className="mt-0.5 font-mono text-xs font-semibold tracking-wider text-amber-950/90">
          {prefijo}
        </span>
        <span className="mt-1 font-mono text-4xl font-extrabold leading-none tracking-tight text-amber-950">
          {corto}
        </span>
      </div>
    );
  }

  // Variante compacta "badge" para tarjetas de animales
  const estilosFondo = pendiente
    ? 'border-dashed border-amber-400 bg-amber-50 text-amber-900'
    : hayIncidencia
      ? 'border-amber-500 bg-gradient-to-b from-amber-100 to-amber-200 text-amber-950'
      : 'border-amber-400/90 bg-gradient-to-b from-amber-200 to-amber-300 text-amber-950';

  return (
    <div
      className={`relative flex h-14 w-16 shrink-0 flex-col items-center justify-center rounded-xl border-2 px-1 shadow-xs ${estilosFondo}`}
      title={`Crotal oficial: ${crotal}`}
    >
      <span className="mb-0.5 h-1.5 w-1.5 rounded-full bg-amber-900/40" />
      <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-900/75">
        {especie.slice(0, 3)}
      </span>
      <span className="font-mono text-base font-extrabold leading-none tracking-tight">
        {corto}
      </span>
      {hayIncidencia && (
        <span
          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[10px] font-black text-white shadow-xs"
          title="Falta algún crotal auricular"
        >
          !
        </span>
      )}
    </div>
  );
}

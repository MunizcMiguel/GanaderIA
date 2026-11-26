import {
  ArrowRight,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Filter,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  agruparEventosPorDia,
  CATEGORIAS_CALENDARIO,
  construirEventosCalendario,
  filtrarEventosCalendario,
  generarCuadriculaMes,
  MAPA_CATEGORIAS_CALENDARIO,
  NOMBRES_MESES_ES,
  type CategoriaCalendario,
  type EventoCalendario,
  type ResumenDiaCalendario,
} from '../domain/calendario';
import { formatearFechaEs, hoyIso } from '../domain/fechas';
import type { EstadoGanaderia, UnidadGanadera } from '../domain/types';

interface Props {
  estado: EstadoGanaderia;
  onAbrirFichaAnimal: (animal: UnidadGanadera) => void;
  onIrA: (pestana: 'panel' | 'robot' | 'censo' | 'crotales' | 'reproduccion' | 'salidas') => void;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describirGajoPie(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
}

function describirArcoAnillo(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

/**
 * Círculo de día en el calendario:
 * - Si hay 1 operación: círculo completo de su color.
 * - Si hay varias categorías distintas: círculo partido en N gajos iguales con sus colores.
 * - Realizado = círculo sólido; Solo Previsto/Plazo = anillo con borde en gajos; Mixto = sólido + halo exterior.
 */
function CirculoGajosDia({
  diaNumero,
  resumen,
  esHoy,
  esDelMesActual,
}: {
  diaNumero: number;
  resumen?: ResumenDiaCalendario;
  esHoy: boolean;
  esDelMesActual: boolean;
}) {
  if (!resumen || resumen.categoriasUnicas.length === 0) {
    return (
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full font-mono text-sm font-bold transition sm:h-12 sm:w-12 ${
          esHoy
            ? 'border-2 border-[#0f3d2e] bg-emerald-50 text-[#0f3d2e]'
            : esDelMesActual
              ? 'text-[#1f3329]'
              : 'text-[#a0b0a7]'
        }`}
      >
        {diaNumero}
      </div>
    );
  }

  const colores = resumen.categoriasUnicas.map((c) => MAPA_CATEGORIAS_CALENDARIO[c].colorHex);
  const n = colores.length;
  const soloPrevisto = !resumen.tieneRealizados && resumen.tienePrevistos;
  const mixto = resumen.tieneRealizados && resumen.tienePrevistos;
  const total = resumen.eventos.length;

  return (
    <div className="relative flex h-11 w-11 items-center justify-center sm:h-12 sm:w-12">
      <svg className="h-full w-full" viewBox="0 0 48 48" aria-hidden="true">
        {mixto && (
          <circle
            cx="24"
            cy="24"
            r="22.5"
            fill="none"
            stroke="#0f3d2e"
            strokeWidth="1.4"
            strokeDasharray="3 2.5"
            opacity="0.55"
          />
        )}

        {soloPrevisto ? (
          // Anillo en gajos (Previsto / Plazo legal futuro)
          <>
            <circle cx="24" cy="24" r="19" fill="#ffffff" />
            {n === 1 ? (
              <circle
                cx="24"
                cy="24"
                r="17.5"
                fill="none"
                stroke={colores[0]}
                strokeWidth="5"
              />
            ) : (
              colores.map((color, idx) => {
                const paso = 360 / n;
                const gap = 5;
                const a0 = idx * paso + gap / 2;
                const a1 = (idx + 1) * paso - gap / 2;
                return (
                  <path
                    key={idx}
                    d={describirArcoAnillo(24, 24, 17.5, a0, a1)}
                    fill="none"
                    stroke={color}
                    strokeWidth="5.2"
                    strokeLinecap="butt"
                  />
                );
              })
            )}
          </>
        ) : (
          // Círculo sólido en gajos (Realizado o Mixto)
          <>
            {n === 1 ? (
              <circle cx="24" cy="24" r="20" fill={colores[0]} />
            ) : (
              <>
                {colores.map((color, idx) => {
                  const paso = 360 / n;
                  const a0 = idx * paso;
                  const a1 = (idx + 1) * paso;
                  return (
                    <path
                      key={idx}
                      d={describirGajoPie(24, 24, 20, a0, a1)}
                      fill={color}
                      stroke="#ffffff"
                      strokeWidth="1.4"
                    />
                  );
                })}
                {/* Centro suave translúcido para legibilidad perfecta del número sobre varios colores */}
                <circle cx="24" cy="24" r="11" fill="rgba(15, 31, 24, 0.72)" />
              </>
            )}
          </>
        )}
      </svg>

      {/* Número de día */}
      <span
        className={`pointer-events-none absolute font-mono text-xs font-extrabold sm:text-sm ${
          soloPrevisto ? 'text-[#0f1f18]' : 'text-white'
        }`}
      >
        {diaNumero}
      </span>

      {/* Contador si hay más de 1 operación en ese día */}
      {total > 1 && (
        <span className="pointer-events-none absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border border-white bg-[#0f1f18] px-1 font-mono text-[10px] font-extrabold text-amber-300 shadow-xs">
          {total}
        </span>
      )}
    </div>
  );
}

function formatearFechaLargaEs(fechaIso: string): string {
  const [y, m, d] = fechaIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const diasSemana = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
  ];
  return `${diasSemana[dt.getUTCDay()]}, ${d} de ${NOMBRES_MESES_ES[m - 1].toLowerCase()} de ${y}`;
}

const ABREV_3_LETRAS: Record<CategoriaCalendario, string> = {
  NACIMIENTO: 'Nac.',
  BAJA: 'Baj.',
  REGISTRO_PRINCIPADO: 'Reg.',
  RECETA_SUPRESION: 'Rec.',
  SALIDA_GUIA: 'Sal.',
  REPRODUCCION: 'Rep.',
};

export function VistaCalendario({ estado, onAbrirFichaAnimal, onIrA }: Props) {
  const hoy = hoyIso();
  const [anioInicial, mesInicial] = hoy.split('-').map(Number);

  const [anio, setAnio] = useState(anioInicial);
  const [mesIndex, setMesIndex] = useState(mesInicial - 1); // 0..11
  const [diaSeleccionado, setDiaSeleccionado] = useState<string>(hoy);
  const [filtroCrotal, setFiltroCrotal] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [categoriasActivas, setCategoriasActivas] = useState<Set<CategoriaCalendario>>(
    () => new Set(CATEGORIAS_CALENDARIO.map((c) => c.id)),
  );

  const todosEventos = useMemo(
    () => construirEventosCalendario(estado, hoy),
    [estado, hoy],
  );

  const eventosFiltrados = useMemo(
    () => filtrarEventosCalendario(todosEventos, categoriasActivas, filtroCrotal),
    [todosEventos, categoriasActivas, filtroCrotal],
  );

  const mapaPorDia = useMemo(
    () => agruparEventosPorDia(eventosFiltrados),
    [eventosFiltrados],
  );

  const celdasMes = useMemo(
    () => generarCuadriculaMes(anio, mesIndex, hoy),
    [anio, mesIndex, hoy],
  );

  const prefijoMes = `${anio}-${String(mesIndex + 1).padStart(2, '0')}`;
  const eventosDelMes = useMemo(
    () => eventosFiltrados.filter((e) => e.fecha.startsWith(prefijoMes)),
    [eventosFiltrados, prefijoMes],
  );

  const conteoPorCategoriaMes = useMemo(() => {
    const counts: Record<CategoriaCalendario, number> = {
      NACIMIENTO: 0,
      BAJA: 0,
      REGISTRO_PRINCIPADO: 0,
      RECETA_SUPRESION: 0,
      SALIDA_GUIA: 0,
      REPRODUCCION: 0,
    };
    const sinFiltroCat = todosEventos.filter(
      (e) =>
        e.fecha.startsWith(prefijoMes) &&
        (!filtroCrotal.trim() ||
          (e.crotal || '').toLowerCase().includes(filtroCrotal.trim().toLowerCase()) ||
          (e.numeroCorto || '').toLowerCase().includes(filtroCrotal.trim().toLowerCase()) ||
          (e.animalNombre || '').toLowerCase().includes(filtroCrotal.trim().toLowerCase())),
    );
    for (const ev of sinFiltroCat) {
      counts[ev.categoria]++;
    }
    return counts;
  }, [todosEventos, prefijoMes, filtroCrotal]);

  const resumenDiaSeleccionado = mapaPorDia.get(diaSeleccionado);

  const cambiarMes = (delta: number) => {
    const dt = new Date(Date.UTC(anio, mesIndex + delta, 1));
    setAnio(dt.getUTCFullYear());
    setMesIndex(dt.getUTCMonth());
  };

  const irAHoy = () => {
    const [y, m] = hoy.split('-').map(Number);
    setAnio(y);
    setMesIndex(m - 1);
    setDiaSeleccionado(hoy);
  };

  const toggleCategoria = (cat: CategoriaCalendario) => {
    setCategoriasActivas((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size === 1) return prev; // mantener al menos 1 activa
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const todasActivas = categoriasActivas.size === CATEGORIAS_CALENDARIO.length;

  const abrirAccionEvento = (ev: EventoCalendario) => {
    if (ev.animalId) {
      const animal = estado.animales.find((a) => a.id === ev.animalId);
      if (animal) {
        onAbrirFichaAnimal(animal);
        return;
      }
    }
    if (ev.accionDestino === 'COLA_REMOWEB') onIrA('robot');
    else if (ev.accionDestino === 'SALIDAS_DOCS') onIrA('salidas');
  };

  return (
    <div className="animate-fade-up space-y-4">
      {/* Cabecera compacta + Buscador + Botón desplegable "Filtros" */}
      <section className="card-surface space-y-3 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900">
              <CalendarIcon className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#0f1f18] sm:text-lg">
                Agenda y Plazos
              </h2>
              <p className="text-[11px] text-[#52655c]">
                Pulsa cualquier día para ver el detalle abajo.
              </p>
            </div>
          </div>

          {/* Buscador por crotal + Botón "Filtros" */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#70857a]" />
              <input
                type="text"
                value={filtroCrotal}
                onChange={(e) => setFiltroCrotal(e.target.value)}
                placeholder="Crotal o nombre (#5115...)"
                className="w-full rounded-xl border border-[#dce4d6] bg-[#f8faf6] py-2 pl-9 pr-8 text-xs font-medium text-[#0f1f18] focus:border-emerald-600 focus:bg-white focus:outline-none"
              />
              {filtroCrotal && (
                <button
                  type="button"
                  onClick={() => setFiltroCrotal('')}
                  aria-label="Limpiar filtro de crotal"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#70857a] hover:bg-[#edf1e9]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMostrarFiltros((v) => !v)}
              aria-expanded={mostrarFiltros}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                mostrarFiltros || !todasActivas
                  ? 'border-[#0f3d2e] bg-[#0f3d2e] text-white'
                  : 'border-[#dce4d6] bg-white text-[#1f3329] hover:bg-[#f4f6f1]'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filtros</span>
              {!todasActivas && (
                <span className="rounded-full bg-amber-300 px-1.5 font-mono text-[10px] font-extrabold text-[#0f3d2e]">
                  {categoriasActivas.size}
                </span>
              )}
              {mostrarFiltros ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Filtros desplegables por tipo de operación */}
        {mostrarFiltros && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#edf1e9] pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {CATEGORIAS_CALENDARIO.map((cat) => {
                const activa = categoriasActivas.has(cat.id);
                const count = conteoPorCategoriaMes[cat.id];
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategoria(cat.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition ${
                      activa
                        ? 'border-[#cfd9c8] bg-white text-[#0f1f18] shadow-2xs'
                        : 'border-transparent bg-[#f4f6f1] text-[#8fa197] opacity-60 hover:opacity-90'
                    }`}
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.colorHex }}
                    />
                    <span>{cat.etiqueta}</span>
                    {count > 0 && (
                      <span className="rounded-full bg-[#edf1e9] px-1.5 font-mono text-[10px] font-extrabold text-[#2b4036]">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
              {!todasActivas && (
                <button
                  type="button"
                  onClick={() =>
                    setCategoriasActivas(new Set(CATEGORIAS_CALENDARIO.map((c) => c.id)))
                  }
                  className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Ver todas
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px] font-semibold text-[#52655c]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-600" />
                Realizado
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border-2 border-amber-600 bg-white" />
                Previsto / Plazo
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Cuadrícula Mensual */}
      <section className="card-surface overflow-hidden rounded-2xl">
        {/* Navegación del mes */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf1e9] bg-[#fafbf8] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => cambiarMes(-1)}
              aria-label="Mes anterior"
              className="rounded-xl border border-[#dce4d6] bg-white p-2 text-[#31453b] hover:bg-[#edf1e9]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="min-w-[175px] text-center text-base font-extrabold text-[#0f1f18]">
              {NOMBRES_MESES_ES[mesIndex]} {anio}
            </h3>
            <button
              type="button"
              onClick={() => cambiarMes(1)}
              aria-label="Mes siguiente"
              className="rounded-xl border border-[#dce4d6] bg-white p-2 text-[#31453b] hover:bg-[#edf1e9]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={irAHoy}
              className="ml-1 rounded-xl border border-[#dce4d6] bg-white px-3 py-1.5 text-xs font-bold text-[#0f3d2e] hover:bg-emerald-50"
            >
              Hoy
            </button>
          </div>

          <span className="rounded-full bg-[#edf1e9] px-3 py-1 text-xs font-bold text-[#2b4036]">
            {eventosDelMes.length} operación(es) este mes
          </span>
        </div>

        {/* Cabecera días de la semana (España: Lunes a Domingo) */}
        <div className="grid grid-cols-7 border-b border-[#edf1e9] bg-[#f8faf6] py-2 text-center text-[11px] font-extrabold uppercase tracking-wider text-[#52655c]">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Días del mes */}
        <div className="grid grid-cols-7 divide-x divide-y divide-[#eef2eb]">
          {celdasMes.map((celda) => {
            const resumen = mapaPorDia.get(celda.fecha);
            const seleccionado = diaSeleccionado === celda.fecha;
            return (
              <button
                key={celda.fecha}
                type="button"
                onClick={() => {
                  setDiaSeleccionado(celda.fecha);
                  if (!celda.esDelMesActual) {
                    const [ny, nm] = celda.fecha.split('-').map(Number);
                    setAnio(ny);
                    setMesIndex(nm - 1);
                  }
                }}
                className={`flex min-h-[70px] flex-col items-center justify-center gap-1 p-1.5 transition sm:min-h-[84px] sm:p-2 ${
                  seleccionado
                    ? 'bg-emerald-50/90 ring-2 ring-inset ring-[#0f3d2e]'
                    : celda.esDelMesActual
                      ? 'bg-white hover:bg-[#f8faf6]'
                      : 'bg-[#fafbf9] opacity-55 hover:opacity-85'
                }`}
              >
                <CirculoGajosDia
                  diaNumero={celda.diaNumero}
                  resumen={resumen}
                  esHoy={celda.esHoy}
                  esDelMesActual={celda.esDelMesActual}
                />
                {resumen && resumen.categoriasUnicas.length > 0 && (
                  <span className="max-w-full truncate font-mono text-[8.5px] font-extrabold leading-tight tracking-tighter text-[#31453b] sm:text-[10px]">
                    {resumen.categoriasUnicas.length === 1
                      ? ABREV_3_LETRAS[resumen.categoriasUnicas[0]]
                      : resumen.categoriasUnicas
                          .slice(0, 2)
                          .map((cat) => ABREV_3_LETRAS[cat].replace('.', ''))
                          .join('·')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Panel Desplegable Debajo del Calendario: Operaciones del Día Seleccionado */}
      <section className="card-surface overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf1e9] bg-[#fafbf8] px-5 py-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
              Detalle del día seleccionado
            </span>
            <h3 className="text-base font-extrabold text-[#0f1f18]">
              {formatearFechaLargaEs(diaSeleccionado)}{' '}
              <span className="font-mono text-xs font-semibold text-[#52655c]">
                ({formatearFechaEs(diaSeleccionado)})
              </span>
            </h3>
          </div>
          <span className="rounded-full bg-[#edf1e9] px-3 py-1 text-xs font-bold text-[#2b4036]">
            {resumenDiaSeleccionado?.eventos.length ?? 0} operación(es)
          </span>
        </div>

        <div className="divide-y divide-[#eef2eb]">
          {!resumenDiaSeleccionado || resumenDiaSeleccionado.eventos.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-bold text-[#31453b]">
                No hay operaciones registradas ni previstas para este día con los filtros actuales.
              </p>
              <p className="mt-1 text-xs text-[#52655c]">
                Pulsa en cualquier día resaltado con círculo o anillo de color en el calendario para
                ver sus operaciones.
              </p>
            </div>
          ) : (
            resumenDiaSeleccionado.eventos.map((ev) => {
              const meta = MAPA_CATEGORIAS_CALENDARIO[ev.categoria];
              const tieneFicha = Boolean(ev.animalId);
              return (
                <div
                  key={ev.id}
                  className="flex flex-col gap-3 border-l-4 px-5 py-4 transition hover:bg-[#fafbf8] sm:flex-row sm:items-center sm:justify-between"
                  style={{ borderLeftColor: meta.colorHex }}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold text-white"
                        style={{ backgroundColor: meta.colorHex }}
                      >
                        {meta.etiqueta}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          ev.naturaleza === 'REALIZADO'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                            : 'border-amber-200 bg-amber-50 text-amber-950'
                        }`}
                      >
                        {ev.naturaleza === 'REALIZADO' ? 'Realizado' : 'Previsto / Plazo'}
                      </span>
                      {ev.numeroCorto && (
                        <span className="rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 font-mono text-[11px] font-extrabold text-amber-950">
                          #{ev.numeroCorto}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-extrabold text-[#0f1f18]">{ev.titulo}</h4>
                    <p className="text-xs text-[#4a5d54]">{ev.detalle}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => abrirAccionEvento(ev)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce4d6] bg-white px-3.5 py-2 text-xs font-bold text-[#0f3d2e] transition hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      {tieneFicha
                        ? 'Ver ficha vaca'
                        : ev.accionDestino === 'COLA_REMOWEB'
                          ? 'Ir a Cola RemoWeb'
                          : 'Ver Carpeta Docs'}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

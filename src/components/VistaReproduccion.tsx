import {
  AlertTriangle,
  Award,
  Baby,
  CalendarHeart,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Droplets,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatearFechaEs, hoyIso } from '../domain/fechas';
import { calcularConsanguinidadPotencial } from '../domain/gestionAvanzada';
import {
  calcularCalendarioReproductivo,
  detectarVacasAbiertas,
  GESTACION_DIAS,
} from '../domain/reproduccion';
import type { EstadoGanaderia, UnidadGanadera } from '../domain/types';
import { BadgeNivel } from './BadgeNivel';
import { CrotalVisual } from './CrotalVisual';
import { SubVistaRankingMadres } from './SubVistaRankingMadres';

interface Props {
  estado: EstadoGanaderia;
  onAnadirInseminacion: (datos: {
    animalId: string;
    fechaInseminacion: string;
    toro: string;
    confirmadaGestacion: boolean;
  }) => void;
  onConfirmarGestacion: (inseminacionId: string) => void;
  onEditarInseminacion?: (
    inseminacionId: string,
    datos: { fechaInseminacion: string; toro: string },
  ) => void;
  onEliminarInseminacion?: (inseminacionId: string) => void;
  onMarcarFallida?: (inseminacionId: string) => void;
  onMarcarSecada?: (inseminacionId: string) => void;
  onDeshacerSecada?: (inseminacionId: string) => void;
  onReabrirInseminacion?: (inseminacionId: string) => void;
  onMarcarParida: (inseminacionId: string) => void;
  onAbrirFichaAnimal?: (animal: UnidadGanadera) => void;
}

type FiltroIcono = 'TODAS' | 'PEND_ECO' | 'SECAR' | 'PARTOS' | 'MADRES';
type VistaTab = 'EN_CURSO' | 'ABIERTAS' | 'HISTORIAL';

export function VistaReproduccion({
  estado,
  onAnadirInseminacion,
  onConfirmarGestacion,
  onEditarInseminacion,
  onEliminarInseminacion,
  onMarcarFallida,
  onMarcarSecada,
  onDeshacerSecada,
  onReabrirInseminacion,
  onMarcarParida,
  onAbrirFichaAnimal,
}: Props) {
  const hoy = hoyIso();
  const hembras = useMemo(
    () => estado.animales.filter((a) => a.estado === 'ACTIVO' && a.sexo === 'H'),
    [estado.animales],
  );
  const [animalId, setAnimalId] = useState(hembras[0]?.id || '');
  const [fecha, setFecha] = useState(hoy);
  const [toro, setToro] = useState('');
  const [confirmada, setConfirmada] = useState(false);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroIcono, setFiltroIcono] = useState<FiltroIcono>('TODAS');
  const [vistaTab, setVistaTab] = useState<VistaTab>('EN_CURSO');
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editFecha, setEditFecha] = useState('');
  const [editToro, setEditToro] = useState('');

  const hitos = useMemo(
    () => calcularCalendarioReproductivo(estado.inseminaciones, estado.animales, hoy),
    [estado.inseminaciones, estado.animales, hoy],
  );

  const vacasAbiertas = useMemo(
    () => detectarVacasAbiertas(estado.animales, estado.inseminaciones, hoy, 60),
    [estado.animales, estado.inseminaciones, hoy],
  );

  const historial = useMemo(
    () =>
      (estado.inseminaciones || [])
        .filter((i) => i.estado === 'PARIDA' || i.estado === 'FALLIDA')
        .sort((a, b) => b.fechaInseminacion.localeCompare(a.fechaInseminacion)),
    [estado.inseminaciones],
  );

  const contadores = useMemo(() => {
    const pendEco = hitos.filter((h) => !h.confirmadaGestacion).length;
    const secar = hitos.filter(
      (h) =>
        !h.fechaSecadoReal &&
        h.diasHastaSecado !== undefined &&
        h.diasHastaSecado >= -7 &&
        h.diasHastaSecado <= 15,
    ).length;
    const partos = hitos.filter((h) => h.diasHastaParto <= 15).length;
    return { todas: hitos.length, pendEco, secar, partos };
  }, [hitos]);

  const hitosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return hitos.filter((h) => {
      if (filtroIcono === 'PEND_ECO' && h.confirmadaGestacion) return false;
      if (
        filtroIcono === 'SECAR' &&
        (Boolean(h.fechaSecadoReal) ||
          h.diasHastaSecado === undefined ||
          h.diasHastaSecado < -7 ||
          h.diasHastaSecado > 15)
      ) {
        return false;
      }
      if (filtroIcono === 'PARTOS' && h.diasHastaParto > 15) return false;
      if (!q) return true;
      return (
        h.crotal.toLowerCase().includes(q) ||
        h.numeroCorto.toLowerCase().includes(q) ||
        (h.nombre || '').toLowerCase().includes(q) ||
        (h.toro || '').toLowerCase().includes(q)
      );
    });
  }, [hitos, filtroIcono, busqueda]);

  const abiertasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return vacasAbiertas;
    return vacasAbiertas.filter(
      (v) =>
        v.animal.crotal.toLowerCase().includes(q) ||
        v.animal.numeroCorto.toLowerCase().includes(q) ||
        (v.animal.nombre || '').toLowerCase().includes(q),
    );
  }, [vacasAbiertas, busqueda]);

  const historialFiltrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return historial;
    return historial.filter(
      (i) =>
        i.crotal.toLowerCase().includes(q) ||
        (i.toro || '').toLowerCase().includes(q),
    );
  }, [historial, busqueda]);

  const hembraSeleccionada = useMemo(
    () => hembras.find((h) => h.id === animalId),
    [hembras, animalId],
  );

  const alertaConsanguinidad = useMemo(
    () =>
      toro.trim() && hembraSeleccionada
        ? calcularConsanguinidadPotencial(hembraSeleccionada.crotal, toro, estado.animales)
        : null,
    [hembraSeleccionada, toro, estado.animales],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!animalId || !fecha) return;
    onAnadirInseminacion({
      animalId,
      fechaInseminacion: fecha,
      toro: toro.trim(),
      confirmadaGestacion: confirmada,
    });
    setToro('');
    setConfirmada(false);
    setMostrarForm(false);
  };

  return (
    <div className="animate-fade-up space-y-4">
      {/* Cabecera: 4 iconos circulares de resumen/filtro + botón desplegable "+ Registrar Cubrición" */}
      <div className="card-surface space-y-4 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#0f1f18]">
            <CalendarHeart className="h-5 w-5 text-rose-700" />
            Reproducción
          </h2>
          <button
            type="button"
            onClick={() => setMostrarForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f3d2e] px-3.5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#16523e]"
          >
            <Plus className="h-4 w-4 text-amber-300" />
            Registrar cubrición
          </button>
        </div>

        {/* 5 Iconos circulares en fila con filtro en 1 toque (incluye Madres) */}
        <div className="grid grid-cols-5 gap-1.5">
          {(
            [
              {
                id: 'TODAS' as FiltroIcono,
                label: 'Activas',
                count: contadores.todas,
                colorBadge: 'bg-emerald-600',
                Icono: CalendarHeart,
              },
              {
                id: 'PEND_ECO' as FiltroIcono,
                label: 'Pend. Eco',
                count: contadores.pendEco,
                colorBadge: contadores.pendEco > 0 ? 'bg-sky-600' : 'bg-emerald-600',
                Icono: Search,
              },
              {
                id: 'SECAR' as FiltroIcono,
                label: 'Secar',
                count: contadores.secar,
                colorBadge: contadores.secar > 0 ? 'bg-orange-500' : 'bg-emerald-600',
                Icono: Droplets,
              },
              {
                id: 'PARTOS' as FiltroIcono,
                label: 'Partos',
                count: contadores.partos,
                colorBadge: contadores.partos > 0 ? 'bg-red-600' : 'bg-emerald-600',
                Icono: Baby,
              },
              {
                id: 'MADRES' as FiltroIcono,
                label: 'Madres',
                count: hembras.length,
                colorBadge: 'bg-amber-600',
                Icono: Award,
              },
            ] as const
          ).map((item) => {
            const activo =
              item.id === 'MADRES'
                ? filtroIcono === 'MADRES'
                : vistaTab === 'EN_CURSO' && filtroIcono === item.id;
            const Icono = item.Icono;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'MADRES') {
                    setFiltroIcono(filtroIcono === 'MADRES' ? 'TODAS' : 'MADRES');
                  } else {
                    setVistaTab('EN_CURSO');
                    setFiltroIcono(activo && item.id !== 'TODAS' ? 'TODAS' : item.id);
                  }
                }}
                className="group flex flex-col items-center gap-1 text-center"
              >
                <div
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 bg-[#f8faf6] text-[#0f3d2e] shadow-xs transition group-hover:scale-105 sm:h-14 sm:w-14 ${
                    activo
                      ? 'border-[#0f3d2e] ring-2 ring-emerald-300'
                      : 'border-[#dce4d6]'
                  }`}
                >
                  <Icono className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span
                    className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white px-1 font-mono text-[10px] font-extrabold text-white shadow-xs sm:h-6 sm:min-w-6 sm:text-[11px] ${item.colorBadge}`}
                  >
                    {item.count}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold leading-tight sm:text-[11px] ${
                    activo ? 'text-[#0f3d2e]' : 'text-[#4a5d54]'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Formulario desplegable de alta rápida */}
        {mostrarForm && (
          <form
            onSubmit={handleSubmit}
            className="grid gap-3 rounded-2xl border border-emerald-200 bg-[#f8faf6] p-4 sm:grid-cols-4"
          >
            <label className="text-xs font-bold text-[#31453b]">
              Hembra
              <select
                value={animalId}
                onChange={(e) => setAnimalId(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2.5 py-2 text-xs focus:border-emerald-600 focus:outline-none"
              >
                {hembras.map((h) => (
                  <option key={h.id} value={h.id}>
                    #{h.numeroCorto} {h.nombre ? `(${h.nombre})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-[#31453b]">
              Fecha inseminación
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2.5 py-2 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </label>
            <label className="text-xs font-bold text-[#31453b]">
              Toro / Dosis (opcional)
              <input
                type="text"
                placeholder="Ej: ASCOL Capitán"
                value={toro}
                onChange={(e) => setToro(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2.5 py-2 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </label>
            <div className="flex flex-col justify-between gap-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#31453b]">
                <input
                  type="checkbox"
                  checked={confirmada}
                  onChange={(e) => setConfirmada(e.target.checked)}
                  className="h-3.5 w-3.5 accent-emerald-700"
                />
                Gestación ya confirmada
              </label>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0f3d2e] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#16523e]"
              >
                <Plus className="h-4 w-4 text-amber-300" />
                Guardar cubrición
              </button>
            </div>

            {alertaConsanguinidad && (
              <div
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold sm:col-span-4 ${
                  alertaConsanguinidad.nivelRiesgo === 'ALTO'
                    ? 'border-red-300 bg-red-50 text-red-900'
                    : alertaConsanguinidad.nivelRiesgo === 'MEDIO'
                      ? 'border-amber-300 bg-amber-50 text-amber-950'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                }`}
              >
                {alertaConsanguinidad.nivelRiesgo === 'BAJO' ? (
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                )}
                <span>
                  <strong>Consanguinidad:</strong> {alertaConsanguinidad.mensaje}
                </span>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Si está seleccionado el 5º icono circular "Madres", mostrar Ranking de Madres */}
      {filtroIcono === 'MADRES' ? (
        <SubVistaRankingMadres
          estado={estado}
          hoy={hoy}
          onAbrirFichaAnimal={(a) => onAbrirFichaAnimal?.(a)}
        />
      ) : (
        <>
      {/* Buscador + Selector de bloque (En curso / Vacías >60d / Historial) */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#70857a]" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar vaca, crotal o toro..."
            className="w-full rounded-xl border border-[#dce4d6] bg-white py-2.5 pl-10 pr-3 text-sm text-[#0f1f18] shadow-2xs focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-[#e1e7dc] bg-white p-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setVistaTab('EN_CURSO')}
            className={`rounded-xl py-2 transition ${
              vistaTab === 'EN_CURSO'
                ? 'bg-[#0f3d2e] text-white'
                : 'text-[#4a5d54] hover:bg-[#f8faf6]'
            }`}
          >
            En curso ({hitos.length})
          </button>
          <button
            type="button"
            onClick={() => setVistaTab('ABIERTAS')}
            className={`rounded-xl py-2 transition ${
              vistaTab === 'ABIERTAS'
                ? 'bg-amber-600 text-white'
                : 'text-[#4a5d54] hover:bg-[#f8faf6]'
            }`}
          >
            Vacías &gt;60d ({vacasAbiertas.length})
          </button>
          <button
            type="button"
            onClick={() => setVistaTab('HISTORIAL')}
            className={`rounded-xl py-2 transition ${
              vistaTab === 'HISTORIAL'
                ? 'bg-slate-800 text-white'
                : 'text-[#4a5d54] hover:bg-[#f8faf6]'
            }`}
          >
            Historial ({historial.length})
          </button>
        </div>
      </div>

      {/* Contenido según pestaña */}
      {vistaTab === 'EN_CURSO' && (
        <section className="card-surface overflow-hidden rounded-2xl">
          <div className="divide-y divide-[#eef2eb]">
            {hitosFiltrados.length === 0 ? (
              <div className="py-10 text-center text-sm text-[#52655c]">
                No hay cubriciones activas con ese filtro.
              </div>
            ) : (
              hitosFiltrados.map((h) => {
                const abierto = expandidoId === h.inseminacionId;
                const params = GESTACION_DIAS[h.especie];
                const totalDias = params.gestacion;
                const pctHoy = Math.min(
                  100,
                  Math.max(2, Math.round((h.diasTranscurridos / totalDias) * 100)),
                );
                const pctEco = Math.round((params.diagnosticoDias / totalDias) * 100);
                const pctSecado =
                  params.secadoAntesParto > 0
                    ? Math.round(((totalDias - params.secadoAntesParto) / totalDias) * 100)
                    : null;

                return (
                  <div key={h.inseminacionId} className="transition hover:bg-[#fafbf8]">
                    {/* Fila compacta */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandidoId(abierto ? null : h.inseminacionId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setExpandidoId(abierto ? null : h.inseminacionId);
                        }
                      }}
                      className="flex cursor-pointer flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <CrotalVisual
                          crotal={h.crotal}
                          numeroCorto={h.numeroCorto}
                          variante="badge"
                        />
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-extrabold text-[#0f1f18]">
                              {h.nombre || `#${h.numeroCorto}`}
                            </span>
                            <span className="rounded-md bg-[#edf1e9] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#1f3329]">
                              Día {h.diasTranscurridos}/{totalDias}
                            </span>
                            {h.confirmadaGestacion && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                Preñada
                              </span>
                            )}
                            {h.fechaSecadoReal && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                                Secada
                              </span>
                            )}
                            {abierto ? (
                              <ChevronUp className="h-4 w-4 text-[#52655c]" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-[#52655c]" />
                            )}
                          </div>
                          <BadgeNivel nivel={h.nivel} texto={h.etiquetaHito} />
                        </div>
                      </div>

                      <div
                        className="flex flex-wrap gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onConfirmarGestacion(h.inseminacionId)}
                          title={
                            h.confirmadaGestacion
                              ? 'Pulsar para quitar confirmación de preñada'
                              : 'Confirmar preñada'
                          }
                          className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition ${
                            h.confirmadaGestacion
                              ? 'border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-red-50 hover:text-red-800 hover:border-red-200'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {h.confirmadaGestacion ? 'Quitar preñada' : 'Preñada'}
                        </button>
                        {!h.fechaSecadoReal &&
                          h.diasHastaSecado !== undefined &&
                          h.diasHastaSecado <= 15 &&
                          onMarcarSecada && (
                            <button
                              type="button"
                              onClick={() => onMarcarSecada(h.inseminacionId)}
                              className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-100"
                            >
                              <Droplets className="h-3.5 w-3.5" />
                              Ya secada
                            </button>
                          )}
                        <button
                          type="button"
                          onClick={() => onMarcarParida(h.inseminacionId)}
                          className="inline-flex items-center gap-1 rounded-xl bg-[#0f3d2e] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#16523e]"
                        >
                          <Baby className="h-3.5 w-3.5 text-amber-300" />
                          Ya parió
                        </button>
                      </div>
                    </div>

                    {/* Detalle expandible: barra dinámica + fechas + botón Vacía/Fallida */}
                    {abierto && (
                      <div className="space-y-3 border-t border-[#eef2eb] bg-[#f8faf6] p-4">
                        <div className="relative h-3 w-full rounded-full bg-[#e1e7dc]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-400 transition-all"
                            style={{ width: `${pctHoy}%` }}
                          />
                          <span
                            className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-sky-500"
                            style={{ left: `${pctEco}%` }}
                          />
                          {pctSecado !== null && (
                            <span
                              className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-amber-600"
                              style={{ left: `${pctSecado}%` }}
                            />
                          )}
                          <span
                            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#0f3d2e] shadow-sm"
                            style={{ left: `${pctHoy}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-[#52655c] sm:grid-cols-4">
                          <span>
                            Insem.: <strong className="text-[#0f1f18]">{formatearFechaEs(h.fechaInseminacion)}</strong>
                          </span>
                          <span className="text-sky-800">
                            Eco (+{params.diagnosticoDias}d): <strong>{formatearFechaEs(h.fechaDiagnostico)}</strong>
                          </span>
                          {h.fechaSecado && (
                            <span className="text-amber-900">
                              Secado (-{params.secadoAntesParto}d):{' '}
                              <strong>
                                {formatearFechaEs(h.fechaSecadoReal || h.fechaSecado)}
                              </strong>
                            </span>
                          )}
                          <span className="text-emerald-900">
                            Parto: <strong>{formatearFechaEs(h.fechaPartoPrevisto)}</strong>
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e6ece2] pt-2.5 text-xs">
                          <span className="text-[#52655c]">
                            Toro: <strong className="text-[#0f1f18]">{h.toro || 'Sin indicar'}</strong>
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {onEditarInseminacion && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (editandoId === h.inseminacionId) {
                                    setEditandoId(null);
                                  } else {
                                    setEditandoId(h.inseminacionId);
                                    setEditFecha(h.fechaInseminacion);
                                    setEditToro(h.toro || '');
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-xl border border-[#dce4d6] bg-white px-2.5 py-1.5 text-xs font-bold text-[#1f3329] hover:bg-[#f4f6f1]"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Editar
                              </button>
                            )}
                            {h.fechaSecadoReal && onDeshacerSecada && (
                              <button
                                type="button"
                                onClick={() => onDeshacerSecada(h.inseminacionId)}
                                className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Deshacer secado
                              </button>
                            )}
                            {onMarcarFallida && (
                              <button
                                type="button"
                                onClick={() => onMarcarFallida(h.inseminacionId)}
                                className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-100"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Vacía / Repite celo
                              </button>
                            )}
                            {onEliminarInseminacion && (
                              <button
                                type="button"
                                onClick={() => {
                                  onEliminarInseminacion(h.inseminacionId);
                                  setExpandidoId(null);
                                }}
                                className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-800 hover:bg-red-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Quitar (error)
                              </button>
                            )}
                          </div>
                        </div>

                        {editandoId === h.inseminacionId && onEditarInseminacion && (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              onEditarInseminacion(h.inseminacionId, {
                                fechaInseminacion: editFecha,
                                toro: editToro.trim(),
                              });
                              setEditandoId(null);
                            }}
                            className="grid gap-2 rounded-xl border border-emerald-200 bg-white p-3 text-xs sm:grid-cols-3"
                          >
                            <label className="font-bold text-[#31453b]">
                              Fecha cubrición
                              <input
                                type="date"
                                value={editFecha}
                                onChange={(e) => setEditFecha(e.target.value)}
                                required
                                className="mt-1 w-full rounded-lg border border-[#dce4d6] px-2 py-1.5"
                              />
                            </label>
                            <label className="font-bold text-[#31453b]">
                              Toro / Dosis
                              <input
                                type="text"
                                value={editToro}
                                onChange={(e) => setEditToro(e.target.value)}
                                placeholder="Nombre toro"
                                className="mt-1 w-full rounded-lg border border-[#dce4d6] px-2 py-1.5"
                              />
                            </label>
                            <div className="flex items-end gap-1.5">
                              <button
                                type="submit"
                                className="flex-1 rounded-lg bg-[#0f3d2e] px-3 py-1.5 font-bold text-white"
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditandoId(null)}
                                className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-600"
                              >
                                Cancelar
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {vistaTab === 'ABIERTAS' && (
        <section className="card-surface overflow-hidden rounded-2xl">
          <div className="divide-y divide-[#eef2eb]">
            {abiertasFiltradas.length === 0 ? (
              <div className="py-10 text-center text-sm font-semibold text-emerald-800">
                No hay vacas paridas hace más de 60 días sin cubrir.
              </div>
            ) : (
              abiertasFiltradas.map((v) => (
                <div
                  key={v.animal.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="flex items-center gap-3">
                    <CrotalVisual
                      crotal={v.animal.crotal}
                      numeroCorto={v.animal.numeroCorto}
                      variante="badge"
                    />
                    <div>
                      <p className="text-sm font-extrabold text-[#0f1f18]">
                        {v.animal.nombre || `#${v.animal.numeroCorto}`}
                      </p>
                      <p className="text-xs text-amber-800">
                        <strong>{v.diasEnLeche} DEL</strong> · Último parto{' '}
                        {formatearFechaEs(v.ultimaFechaParto)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAnimalId(v.animal.id);
                      setMostrarForm(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#0f3d2e] px-3 py-2 text-xs font-bold text-white"
                  >
                    <Plus className="h-3.5 w-3.5 text-amber-300" />
                    Cubrir ahora
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {vistaTab === 'HISTORIAL' && (
        <section className="card-surface overflow-hidden rounded-2xl">
          <div className="divide-y divide-[#eef2eb]">
            {historialFiltrado.length === 0 ? (
              <div className="py-10 text-center text-sm text-[#52655c]">
                Todavía no hay cubriciones cerradas (paridas o fallidas).
              </div>
            ) : (
              historialFiltrado.map((ins) => (
                <div
                  key={ins.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-4 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-[#0f1f18]">{ins.crotal}</span>
                    <span className="ml-2 text-[#52655c]">
                      Cubrición {formatearFechaEs(ins.fechaInseminacion)}
                      {ins.toro ? ` · Toro: ${ins.toro}` : ''}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                        ins.estado === 'PARIDA'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {ins.estado === 'PARIDA' ? 'Parida' : 'Vacía / Fallida'}
                    </span>
                    {onReabrirInseminacion && (
                      <button
                        type="button"
                        onClick={() => onReabrirInseminacion(ins.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#dce4d6] bg-white px-2 py-1 text-[11px] font-bold text-[#1f3329] hover:bg-[#f4f6f1]"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Devolver a En curso
                      </button>
                    )}
                    {onEliminarInseminacion && (
                      <button
                        type="button"
                        onClick={() => onEliminarInseminacion(ins.id)}
                        aria-label="Eliminar registro"
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-800 hover:bg-red-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}
        </>
      )}
    </div>
  );
}

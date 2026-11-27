import {
  Activity,
  AlertTriangle,
  Baby,
  BarChart3,
  BookOpenCheck,
  Calendar,
  CalendarHeart,
  ChevronRight,
  ClipboardList,
  GitCompare,
  Home,
  LayoutGrid,
  Mic,
  Monitor,
  Plus,
  QrCode,
  Search,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Sprout,
  Tag,
  Truck,
  UserMinus,
  WifiOff,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { estaEnSupresionCarne, estaEnSupresionLeche } from '../domain/alertas';
import { calcularDEL } from '../domain/analiticaGanadero';
import { hoyIso } from '../domain/fechas';
import { calcularUGMRebano, formatearEdadExacta } from '../domain/gestionAvanzada';
import {
  detectarVacasProblema,
  INCIDENCIAS_META,
  obtenerCorralesActivos,
} from '../domain/incidencias';
import type {
  AlertaPlazo,
  CuarteronUbre,
  EstadoGanaderia,
  TipoIncidenciaClinica,
  UnidadGanadera,
} from '../domain/types';
import { AvatarVacaFoto } from './AvatarVacaFoto';
import { CrotalVisual } from './CrotalVisual';
import { ModalBase } from './ModalBase';
import { VistaCalendario } from './VistaCalendario';

type TabCuadra = 'hoy' | 'vacas' | 'agenda' | 'mas';

interface Props {
  estado: EstadoGanaderia;
  alertas: AlertaPlazo[];
  numPendientes: number;
  onAbrirFichaAnimal: (animal: UnidadGanadera) => void;
  onAbrirVoz: () => void;
  onAbrirOcr: () => void;
  onAbrirNacimiento: () => void;
  onAbrirCompra: () => void;
  onAbrirBaja: () => void;
  onAbrirLibros: () => void;
  onAbrirConfig: () => void;
  onRegistrarIncidencia: (datos: {
    animalId: string;
    tipo: TipoIncidenciaClinica;
    cuarteron?: CuarteronUbre;
    notas?: string;
  }) => void;
  onCambiarAModoOficina: (
    destinoPestana?:
      | 'panel'
      | 'calendario'
      | 'robot'
      | 'censo'
      | 'crotales'
      | 'reproduccion'
      | 'salidas'
      | 'analitica'
      | 'gestion',
  ) => void;
  tabExterno?: TabCuadra;
  ocultarNavInferior?: boolean;
}

export function ModoCuadraMovil({
  estado,
  alertas,
  numPendientes,
  onAbrirFichaAnimal,
  onAbrirVoz,
  onAbrirOcr,
  onAbrirNacimiento,
  onAbrirCompra,
  onAbrirBaja,
  onAbrirLibros,
  onAbrirConfig,
  onRegistrarIncidencia,
  onCambiarAModoOficina,
  tabExterno,
  ocultarNavInferior,
}: Props) {
  const [tabInterno, setTab] = useState<TabCuadra>('hoy');
  const tab = tabExterno ?? tabInterno;
  const [busquedaRapida, setBusquedaRapida] = useState('');
  const [filtroVacas, setFiltroVacas] = useState<'ACTIVAS' | 'SUPRESION' | 'CROTAL' | 'REVISAR'>(
    'ACTIVAS',
  );
  const [corralFiltro, setCorralFiltro] = useState<string>('TODOS');

  // Hoja rápida de Incidencia / Mamitis en 2 toques
  const [modalIncidenciaRapida, setModalIncidenciaRapida] = useState(false);
  const [incAnimalId, setIncAnimalId] = useState(
    () => estado.animales.find((a) => a.estado === 'ACTIVO')?.id || '',
  );
  const [incTipo, setIncTipo] = useState<TipoIncidenciaClinica>(
    estado.explotacion.orientacionProductiva === 'CARNE' ? 'COJERA' : 'MAMITIS',
  );
  const [incCuarteron, setIncCuarteron] = useState<CuarteronUbre>('PI');
  const [incNotas, setIncNotas] = useState('');

  const hoy = hoyIso();
  const esCarne = estado.explotacion.orientacionProductiva === 'CARNE';
  const activos = useMemo(
    () => estado.animales.filter((a) => a.estado === 'ACTIVO'),
    [estado.animales],
  );
  const corrales = useMemo(() => obtenerCorralesActivos(estado), [estado]);
  const mapaCorrales = useMemo(() => new Map(corrales.map((c) => [c.id, c])), [corrales]);
  const ugm = useMemo(() => calcularUGMRebano(estado.animales, hoy), [estado.animales, hoy]);
  const problemasIds = useMemo(
    () => new Set(detectarVacasProblema(estado, hoy).map((p) => p.animal.id)),
    [estado, hoy],
  );

  // Búsqueda instantánea por los últimos 4 dígitos o nombre desde "Hoy"
  const coincidenciasHoy = useMemo(() => {
    const q = busquedaRapida.trim().toLowerCase();
    if (!q) return [];
    return activos
      .filter(
        (a) =>
          a.numeroCorto.toLowerCase().includes(q) ||
          a.crotal.toLowerCase().includes(q) ||
          (a.nombre || '').toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [activos, busquedaRapida]);

  const vacasFiltradas = useMemo(() => {
    const q = busquedaRapida.trim().toLowerCase();
    return activos.filter((a) => {
      if (
        filtroVacas === 'SUPRESION' &&
        !(estaEnSupresionCarne(a, hoy) || estaEnSupresionLeche(a, hoy))
      ) {
        return false;
      }
      if (filtroVacas === 'CROTAL' && a.estadoCrotal === 'OK') return false;
      if (filtroVacas === 'REVISAR' && !problemasIds.has(a.id)) return false;
      if (corralFiltro !== 'TODOS' && a.corralId !== corralFiltro) return false;
      if (!q) return true;
      return (
        a.numeroCorto.toLowerCase().includes(q) ||
        a.crotal.toLowerCase().includes(q) ||
        (a.nombre || '').toLowerCase().includes(q) ||
        a.raza.toLowerCase().includes(q)
      );
    });
  }, [activos, busquedaRapida, filtroVacas, corralFiltro, hoy, problemasIds]);

  const alertasUrgentes = useMemo(
    () => alertas.filter((a) => a.nivel === 'CRITICA' || a.nivel === 'ATENCION').slice(0, 5),
    [alertas],
  );

  const handleGuardarIncidenciaRapida = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incAnimalId) return;
    onRegistrarIncidencia({
      animalId: incAnimalId,
      tipo: incTipo,
      cuarteron: incTipo === 'MAMITIS' ? incCuarteron : undefined,
      notas: incNotas.trim() || undefined,
    });
    setIncNotas('');
    setModalIncidenciaRapida(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f6f1] pb-24">
      {/* Cabecera compacta móvil optimizada para una mano */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-[#dce4d6] bg-[#0f3d2e] px-4 py-3 text-white shadow-sm">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-amber-300">
            <Sprout className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold tracking-tight">GanaderIA</span>
              <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-extrabold text-[#0f3d2e]">
                CUADRA
              </span>
            </div>
            <p className="truncate text-[11px] text-emerald-100">
              {estado.explotacion.nombre} · {activos.length} reses ({ugm.totalUgm} UGM)
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onCambiarAModoOficina()}
            title="Cambiar a Modo Oficina completo"
            className="inline-flex items-center gap-1 rounded-xl bg-white/15 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-white/25"
          >
            <Monitor className="h-3.5 w-3.5" />
            Oficina
          </button>
          <button
            type="button"
            onClick={onAbrirConfig}
            aria-label="Configuración"
            className="rounded-xl bg-white/15 p-2 text-white hover:bg-white/25"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 p-4">
        {/* ================= PESTAÑA 1: HOY (INICIO CUADRA) ================= */}
        {tab === 'hoy' && (
          <div className="animate-fade-up space-y-4">
            {/* Buscador gigante por últimos 4 dígitos del crotal */}
            <div className="rounded-2xl border border-[#dce4d6] bg-white p-3.5 shadow-xs">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#52655c]">
                Buscar vaca rápida (4 dígitos o nombre)
              </label>
              <div className="relative mt-1.5">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#70857a]" />
                <input
                  type="text"
                  inputMode="search"
                  value={busquedaRapida}
                  onChange={(e) => setBusquedaRapida(e.target.value)}
                  placeholder="Ej: 4521, 5115, Pinta..."
                  className="w-full rounded-xl border-2 border-[#dce4d6] bg-[#f8faf6] py-3 pl-11 pr-10 font-mono text-base font-bold text-[#0f1f18] focus:border-[#0f3d2e] focus:bg-white focus:outline-none"
                />
                {busquedaRapida && (
                  <button
                    type="button"
                    onClick={() => setBusquedaRapida('')}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#52655c]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {coincidenciasHoy.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  {coincidenciasHoy.map((a) => {
                    const enSup = estaEnSupresionCarne(a, hoy) || estaEnSupresionLeche(a, hoy);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => onAbrirFichaAnimal(a)}
                        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#e1e7dc] bg-[#f8faf6] px-3 py-2.5 text-left active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="rounded-lg bg-[#facc15] px-2.5 py-1 font-mono text-sm font-black text-amber-950">
                            #{a.numeroCorto}
                          </span>
                          <div>
                            <p className="text-sm font-extrabold text-[#0f1f18]">
                              {a.nombre || a.raza}
                            </p>
                            <p className="text-[11px] text-[#52655c]">
                              {formatearEdadExacta(a.fechaNacimiento, hoy, true)}
                              {enSup ? ' · ⛔ En supresión' : ''}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-[#52655c]" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4 Botones Gigantes de Cuadra (pensados para pulgar / guantes) */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onAbrirVoz}
                className="flex flex-col items-start justify-between gap-3 rounded-2xl bg-[#0f3d2e] p-4 text-left text-white shadow-sm active:scale-[0.98]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-amber-300">
                  <Mic className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-extrabold">Dictar por Voz</p>
                  <p className="text-[11px] text-emerald-100">Parto, mamitis, baja...</p>
                </div>
              </button>

              <button
                type="button"
                onClick={onAbrirOcr}
                className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-left text-sky-950 shadow-xs active:scale-[0.98]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-600 text-white">
                  <QrCode className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-extrabold">DIB / Receta / RFID</p>
                  <p className="text-[11px] text-sky-800">Cámara, código barras</p>
                </div>
              </button>

              <button
                type="button"
                onClick={onAbrirNacimiento}
                className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left text-emerald-950 shadow-xs active:scale-[0.98]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700 text-amber-300">
                  <Baby className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-extrabold">Nuevo Parto</p>
                  <p className="text-[11px] text-emerald-800">Crotal + Cola 7 días</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setModalIncidenciaRapida(true)}
                className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-purple-200 bg-purple-50 p-4 text-left text-purple-950 shadow-xs active:scale-[0.98]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-700 text-white">
                  <Activity className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-extrabold">
                    {esCarne ? 'Incidencia / Cojera' : 'Mamitis / Cojera'}
                  </p>
                  <p className="text-[11px] text-purple-800">
                    {esCarne ? 'Apuntar en 2 toques' : '4 cuarterones en 2 toques'}
                  </p>
                </div>
              </button>
            </div>

            {/* Alertas urgentes de hoy */}
            <section className="rounded-2xl border border-[#dce4d6] bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-[#0f1f18]">
                  Avisos urgentes de hoy ({alertasUrgentes.length})
                </h2>
                {numPendientes > 0 && (
                  <button
                    type="button"
                    onClick={() => onCambiarAModoOficina('robot')}
                    className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-950"
                  >
                    {numPendientes} en Cola RemoWeb
                  </button>
                )}
              </div>

              {alertasUrgentes.length === 0 ? (
                <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">
                  Todo al día. No hay plazos críticos ni supresiones pendientes hoy.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {alertasUrgentes.map((al) => {
                    const animalRel = al.animalId
                      ? activos.find((x) => x.id === al.animalId)
                      : al.crotal
                        ? activos.find((x) => x.crotal === al.crotal)
                        : undefined;
                    return (
                      <div
                        key={al.id}
                        onClick={() => animalRel && onAbrirFichaAnimal(animalRel)}
                        className={`rounded-xl border-l-4 p-3 text-xs ${
                          al.nivel === 'CRITICA'
                            ? 'border-l-red-600 bg-red-50/70 text-red-950'
                            : 'border-l-amber-500 bg-amber-50/70 text-amber-950'
                        } ${animalRel ? 'cursor-pointer active:scale-[0.99]' : ''}`}
                      >
                        <p className="font-extrabold">{al.titulo}</p>
                        <p className="mt-0.5 text-[11px] opacity-90">{al.detalle}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Indicador Offline tranquilo */}
            <div className="flex items-center justify-center gap-2 py-1 text-[11px] font-semibold text-[#52655c]">
              <WifiOff className="h-3.5 w-3.5 text-emerald-700" />
              <span>Modo Cuadra listo sin cobertura · Todo se guarda en el teléfono</span>
            </div>
          </div>
        )}

        {/* ================= PESTAÑA 2: VACAS (CENSO COMPACTO) ================= */}
        {tab === 'vacas' && (
          <div className="animate-fade-up space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#70857a]" />
              <input
                type="text"
                value={busquedaRapida}
                onChange={(e) => setBusquedaRapida(e.target.value)}
                placeholder="Buscar vaca (#4521, Pinta, Frisona...)"
                className="w-full rounded-xl border border-[#dce4d6] bg-white py-3 pl-10 pr-9 text-sm font-semibold text-[#0f1f18] shadow-2xs focus:border-[#0f3d2e] focus:outline-none"
              />
              {busquedaRapida && (
                <button
                  type="button"
                  onClick={() => setBusquedaRapida('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52655c]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {(
                [
                  ['ACTIVAS', `Todas (${activos.length})`],
                  ['SUPRESION', 'En supresión'],
                  ['CROTAL', 'Crotal caído'],
                  ['REVISAR', 'Revisar'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFiltroVacas(id)}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold ${
                    filtroVacas === id
                      ? 'bg-[#0f3d2e] text-white'
                      : 'border border-[#dce4d6] bg-white text-[#31453b]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <select
              aria-label="Filtrar por corral"
              value={corralFiltro}
              onChange={(e) => setCorralFiltro(e.target.value)}
              className="w-full rounded-xl border border-[#dce4d6] bg-white px-3 py-2 text-xs font-bold text-[#1f3329]"
            >
              <option value="TODOS">Todos los corrales</option>
              {corrales.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <div className="space-y-2.5">
              {vacasFiltradas.map((a) => {
                const enSup = estaEnSupresionCarne(a, hoy) || estaEnSupresionLeche(a, hoy);
                const del = !esCarne ? calcularDEL(a, hoy) : undefined;
                const corral = a.corralId ? mapaCorrales.get(a.corralId) : undefined;
                const esProb = problemasIds.has(a.id);

                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onAbrirFichaAnimal(a)}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border bg-white p-3.5 text-left shadow-2xs active:scale-[0.99] ${
                      enSup ? 'border-red-300 bg-red-50/30' : 'border-[#e1e7dc]'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {a.fotoDataUrl ? (
                        <AvatarVacaFoto
                          fotoDataUrl={a.fotoDataUrl}
                          numeroCorto={a.numeroCorto}
                          nombre={a.nombre}
                          tamano="sm"
                        />
                      ) : (
                        <CrotalVisual
                          crotal={a.crotal}
                          numeroCorto={a.numeroCorto}
                          especie={a.especie}
                          estadoCrotal={a.estadoCrotal}
                          variante="badge"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-extrabold text-[#0f1f18]">
                            {a.nombre || `Res #${a.numeroCorto}`}
                          </span>
                          {del !== undefined && (
                            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-emerald-900">
                              {del}d
                            </span>
                          )}
                          {esProb && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-extrabold text-red-800">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Rev.
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-[#52655c]">
                          {corral ? `${corral.nombre} · ` : ''}
                          {a.raza} · {formatearEdadExacta(a.fechaNacimiento, hoy, true)}
                        </p>
                        {enSup && (
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-extrabold text-red-700">
                            <ShieldAlert className="h-3 w-3" />
                            En supresión ({a.supresionActiva?.medicamento})
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#70857a]" />
                  </button>
                );
              })}

              {vacasFiltradas.length === 0 && (
                <div className="rounded-2xl border border-[#e1e7dc] bg-white p-8 text-center text-xs text-[#52655c]">
                  No hay animales que coincidan con este filtro.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= PESTAÑA 3: AGENDA (CALENDARIO MENSUAL) ================= */}
        {tab === 'agenda' && (
          <VistaCalendario
            estado={estado}
            onAbrirFichaAnimal={onAbrirFichaAnimal}
            onIrA={(dest) => onCambiarAModoOficina(dest)}
          />
        )}

        {/* ================= PESTAÑA 4: MÁS HERRAMIENTAS ================= */}
        {tab === 'mas' && (
          <div className="animate-fade-up space-y-4">
            <div className="rounded-2xl border border-[#dce4d6] bg-white p-4 shadow-xs">
              <h2 className="text-sm font-extrabold text-[#0f1f18]">
                Acciones y Gestión Completa
              </h2>
              <p className="mt-0.5 text-xs text-[#52655c]">
                Accede a compras, bajas, libros PDF o abre cualquier módulo completo de oficina.
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2.5 text-xs">
                <button
                  type="button"
                  onClick={onAbrirCompra}
                  className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 font-bold text-sky-950"
                >
                  <ShoppingCart className="h-4 w-4 shrink-0" />
                  Alta Compra
                </button>
                <button
                  type="button"
                  onClick={onAbrirBaja}
                  className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 font-bold text-red-900"
                >
                  <UserMinus className="h-4 w-4 shrink-0" />
                  Baja / Venta
                </button>
                <button
                  type="button"
                  onClick={onAbrirLibros}
                  className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 font-bold text-emerald-950"
                >
                  <BookOpenCheck className="h-4 w-4 shrink-0" />
                  Libros PDF
                </button>
                <button
                  type="button"
                  onClick={() => onCambiarAModoOficina('robot')}
                  className="flex items-center gap-2 rounded-xl border border-[#dce4d6] bg-[#f8faf6] p-3 font-bold text-[#0f1f18]"
                >
                  <GitCompare className="h-4 w-4 shrink-0 text-emerald-700" />
                  Robot / RemoWeb
                </button>
                <button
                  type="button"
                  onClick={() => onCambiarAModoOficina('reproduccion')}
                  className="flex items-center gap-2 rounded-xl border border-[#dce4d6] bg-[#f8faf6] p-3 font-bold text-[#0f1f18]"
                >
                  <CalendarHeart className="h-4 w-4 shrink-0 text-rose-600" />
                  Reproducción
                </button>
                <button
                  type="button"
                  onClick={() => onCambiarAModoOficina('analitica')}
                  className="flex items-center gap-2 rounded-xl border border-[#dce4d6] bg-[#f8faf6] p-3 font-bold text-[#0f1f18]"
                >
                  <BarChart3 className="h-4 w-4 shrink-0 text-emerald-700" />
                  Analítica y Vet
                </button>
                <button
                  type="button"
                  onClick={() => onCambiarAModoOficina('crotales')}
                  className="flex items-center gap-2 rounded-xl border border-[#dce4d6] bg-[#f8faf6] p-3 font-bold text-[#0f1f18]"
                >
                  <Tag className="h-4 w-4 shrink-0 text-amber-600" />
                  Stock Crotales
                </button>
                <button
                  type="button"
                  onClick={() => onCambiarAModoOficina('salidas')}
                  className="flex items-center gap-2 rounded-xl border border-[#dce4d6] bg-[#f8faf6] p-3 font-bold text-[#0f1f18]"
                >
                  <Truck className="h-4 w-4 shrink-0 text-sky-700" />
                  Salidas y Guías
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onCambiarAModoOficina('panel')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f3d2e] py-3.5 text-sm font-extrabold text-white shadow-sm"
            >
              <Monitor className="h-4 w-4 text-amber-300" />
              Abrir Modo Oficina completo
            </button>
          </div>
        )}
      </main>

      {/* Barra inferior de 4 pestañas solo si no se usa el menú unificado externo */}
      {!ocultarNavInferior && (
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[#dce4d6] bg-white/95 backdrop-blur-xs">
          {(
            [
              ['hoy', 'Hoy', Home, alertasUrgentes.length || undefined],
              ['vacas', 'Vacas', ClipboardList, undefined],
              ['agenda', 'Agenda', Calendar, undefined],
              ['mas', 'Más', LayoutGrid, numPendientes || undefined],
            ] as const
          ).map(([id, label, Icono, badge]) => {
            const activo = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold transition ${
                  activo ? 'text-[#0f3d2e]' : 'text-[#6e8277]'
                }`}
              >
                <span
                  className={`flex h-7 w-11 items-center justify-center rounded-xl transition ${
                    activo ? 'bg-emerald-100 text-[#0f3d2e]' : ''
                  }`}
                >
                  <Icono className="h-4 w-4" />
                </span>
                <span>{label}</span>
                {badge !== undefined && (
                  <span className="absolute right-4 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 font-mono text-[9px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}

      {/* Hoja inferior rápida de Incidencia / Mamitis 4 cuarterones */}
      {modalIncidenciaRapida && (
        <ModalBase onCerrar={() => setModalIncidenciaRapida(false)} maxWidthClass="max-w-md">
          <form onSubmit={handleGuardarIncidenciaRapida} className="space-y-3.5 p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-base font-extrabold text-[#0f1f18]">
                Incidencia Rápida en Cuadra
              </h3>
              <button
                type="button"
                onClick={() => setModalIncidenciaRapida(false)}
                className="rounded-lg p-1 text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="block text-xs font-bold text-[#31453b]">
              Vaca / Animal
              <select
                value={incAnimalId}
                onChange={(e) => setIncAnimalId(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-[#f8faf6] px-3 py-2.5 text-sm font-bold text-[#0f1f18]"
              >
                {activos.map((a) => (
                  <option key={a.id} value={a.id}>
                    #{a.numeroCorto} {a.nombre ? `(${a.nombre})` : ''} — {a.raza}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <p className="text-xs font-bold text-[#31453b]">Tipo de incidencia</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(Object.keys(INCIDENCIAS_META) as TipoIncidenciaClinica[])
                  .filter(
                    (k) =>
                      k !== 'VACUNACION_LOTE' && (!esCarne || !INCIDENCIAS_META[k].soloLeche),
                  )
                  .map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setIncTipo(k)}
                      className={`rounded-xl px-3 py-2 text-xs font-bold ${
                        incTipo === k
                          ? 'bg-purple-800 text-white'
                          : 'border border-purple-200 bg-purple-50 text-purple-950'
                      }`}
                    >
                      {INCIDENCIAS_META[k].etiqueta}
                    </button>
                  ))}
              </div>
            </div>

            {incTipo === 'MAMITIS' && !esCarne && (
              <div>
                <p className="text-xs font-bold text-purple-950">Cuarterón afectado:</p>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {(['AI', 'AD', 'PI', 'PD'] as CuarteronUbre[]).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setIncCuarteron(q)}
                      className={`rounded-xl border py-2.5 font-mono text-xs font-extrabold ${
                        incCuarteron === q
                          ? 'border-purple-700 bg-purple-700 text-white'
                          : 'border-purple-200 bg-white text-purple-950'
                      }`}
                    >
                      {q} ·{' '}
                      {q === 'AI'
                        ? 'Del. Izq'
                        : q === 'AD'
                          ? 'Del. Der'
                          : q === 'PI'
                            ? 'Tras. Izq'
                            : 'Tras. Der'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <input
              type="text"
              value={incNotas}
              onChange={(e) => setIncNotas(e.target.value)}
              placeholder="Nota rápida (opcional)..."
              className="w-full rounded-xl border border-[#dce4d6] px-3 py-2.5 text-xs"
            />

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-purple-800 py-3 text-sm font-extrabold text-white"
            >
              <Plus className="h-4 w-4" />
              Guardar incidencia
            </button>
          </form>
        </ModalBase>
      )}
    </div>
  );
}

import {
  AlertTriangle,
  ArrowUpDown,
  Baby,
  BookOpenCheck,
  CheckSquare,
  ChevronRight,
  Download,
  FileCheck2,
  FolderPlus,
  Layers,
  Plus,
  Scale,
  Search,
  ShieldAlert,
  ShoppingCart,
  Syringe,
  Tag,
  Upload,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { estaEnSupresionCarne, estaEnSupresionLeche } from '../domain/alertas';
import { calcularDEL } from '../domain/analiticaGanadero';
import { normalizarCrotal } from '../domain/crotales';
import { descargarArchivo } from '../domain/exportadores';
import { formatearFechaEs, hoyIso } from '../domain/fechas';
import {
  calcularGmdAnimal,
  calcularUGMRebano,
  clasificarEtapaAnimal,
  formatearEdadExacta,
  type EtapaAnimal,
} from '../domain/gestionAvanzada';
import { detectarVacasProblema, obtenerCorralesActivos } from '../domain/incidencias';
import { exportarCensoExcelCsv, importarCensoDesdeCsv } from '../domain/librosOficiales';
import type {
  CuarteronUbre,
  EstadoCrotalFisico,
  EstadoGanaderia,
  SexoAnimal,
  TipoIncidenciaClinica,
  TipoPesaje,
  UnidadGanadera,
} from '../domain/types';
import { BotonCopiar } from './BadgeNivel';
import { CrotalVisual } from './CrotalVisual';
import { DrawerFichaAnimal } from './DrawerFichaAnimal';

interface Props {
  estado: EstadoGanaderia;
  onCambiarEstadoCrotal: (animalId: string, nuevo: EstadoCrotalFisico) => void;
  onCambiarCorral: (animalId: string, corralId: string | undefined) => void;
  onMoverLoteCorral: (animalIds: string[], corralId: string | undefined) => void;
  onVacunarLote: (animalIds: string[], motivo: string) => void;
  onAnadirCorral: (nombre: string) => void;
  onEliminarCorral: (corralId: string) => void;
  onRegistrarIncidencia: (datos: {
    animalId: string;
    tipo: TipoIncidenciaClinica;
    cuarteron?: CuarteronUbre;
    notas?: string;
  }) => void;
  onRegistrarPesaje: (datos: {
    animalId: string;
    fecha: string;
    pesoKg: number;
    tipo: TipoPesaje;
    notas?: string;
  }) => void;
  onActualizarFoto: (animalId: string, fotoDataUrl: string | undefined) => void;
  onActualizarFechaOficial: (animalId: string, fechaOficial: string | undefined) => void;
  onImportarAnimalesCenso: (nuevos: UnidadGanadera[]) => void;
  onToggleDib: (animalId: string) => void;
  onAbrirNacimiento: () => void;
  onAbrirCompra: () => void;
  onAbrirLibrosOficiales: (libro?: 'EXPLOTACION' | 'TRATAMIENTOS') => void;
  onAbrirTratamiento: (animal: UnidadGanadera) => void;
  onAbrirBajaAnimal: (animal: UnidadGanadera) => void;
}

type OrdenCenso = 'CROTAL' | 'NOMBRE' | 'EDAD' | 'DEL' | 'ULTIMO_PARTO';

export function VistaCenso({
  estado,
  onCambiarEstadoCrotal,
  onCambiarCorral,
  onMoverLoteCorral,
  onVacunarLote,
  onAnadirCorral,
  onEliminarCorral,
  onRegistrarIncidencia,
  onRegistrarPesaje,
  onActualizarFoto,
  onActualizarFechaOficial,
  onImportarAnimalesCenso,
  onToggleDib,
  onAbrirNacimiento,
  onAbrirCompra,
  onAbrirLibrosOficiales,
  onAbrirTratamiento,
  onAbrirBajaAnimal,
}: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'ACTIVOS' | 'CROTAL_CAIDO' | 'SUPRESION' | 'TODOS'>(
    'ACTIVOS',
  );
  const [corralFiltro, setCorralFiltro] = useState<string>('TODOS');
  const [etapaFiltro, setEtapaFiltro] = useState<'TODAS' | EtapaAnimal>('TODAS');
  const [sexoFiltro, setSexoFiltro] = useState<'TODOS' | SexoAnimal>('TODOS');
  const [razaFiltro, setRazaFiltro] = useState<string>('TODAS');
  const [orden, setOrden] = useState<OrdenCenso>('CROTAL');
  const [agruparCrias, setAgruparCrias] = useState(true);

  const [nuevoCorralNombre, setNuevoCorralNombre] = useState('');
  const [mostrarFormCorral, setMostrarFormCorral] = useState(false);
  const [mensajeImport, setMensajeImport] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // Selección múltiple para acciones masivas (100-300 vacas)
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [corralDestinoLote, setCorralDestinoLote] = useState('');
  const [notaVacunaLote, setNotaVacunaLote] = useState('Vacunación IBR / BVD en lote');

  const [animalDrawerId, setAnimalDrawerId] = useState<string | null>(null);

  const hoy = hoyIso();
  const esCarne = estado.explotacion.orientacionProductiva === 'CARNE';
  const corrales = useMemo(() => obtenerCorralesActivos(estado), [estado]);
  const mapaCorrales = useMemo(() => new Map(corrales.map((c) => [c.id, c])), [corrales]);
  const ugmRebano = useMemo(() => calcularUGMRebano(estado.animales, hoy), [estado.animales, hoy]);
  const problemasIds = useMemo(
    () => new Set(detectarVacasProblema(estado, hoy).map((p) => p.animal.id)),
    [estado, hoy],
  );

  const razasDisponibles = useMemo(
    () => Array.from(new Set(estado.animales.map((a) => a.raza).filter(Boolean))).sort(),
    [estado.animales],
  );

  const contadores = useMemo(() => {
    const activos = estado.animales.filter((a) => a.estado === 'ACTIVO');
    const crotalCaido = activos.filter(
      (a) =>
        a.estadoCrotal === 'FALTA_IZQUIERDO' ||
        a.estadoCrotal === 'FALTA_DERECHO' ||
        a.estadoCrotal === 'FALTAN_AMBOS',
    ).length;
    const supresion = activos.filter(
      (a) => estaEnSupresionCarne(a, hoy) || estaEnSupresionLeche(a, hoy),
    ).length;
    return {
      activos: activos.length,
      crotalCaido,
      supresion,
      todos: estado.animales.length,
    };
  }, [estado.animales, hoy]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = estado.animales.filter((a) => {
      if (filtro === 'ACTIVOS' && a.estado !== 'ACTIVO') return false;
      if (
        filtro === 'CROTAL_CAIDO' &&
        !(
          a.estado === 'ACTIVO' &&
          (a.estadoCrotal === 'FALTA_IZQUIERDO' ||
            a.estadoCrotal === 'FALTA_DERECHO' ||
            a.estadoCrotal === 'FALTAN_AMBOS')
        )
      ) {
        return false;
      }
      if (
        filtro === 'SUPRESION' &&
        !(estaEnSupresionCarne(a, hoy) || estaEnSupresionLeche(a, hoy))
      ) {
        return false;
      }
      if (corralFiltro !== 'TODOS' && a.corralId !== corralFiltro) return false;
      if (etapaFiltro !== 'TODAS' && clasificarEtapaAnimal(a, hoy) !== etapaFiltro) return false;
      if (sexoFiltro !== 'TODOS' && a.sexo !== sexoFiltro) return false;
      if (razaFiltro !== 'TODAS' && a.raza !== razaFiltro) return false;
      if (!q) return true;
      return (
        a.crotal.toLowerCase().includes(q) ||
        a.numeroCorto.toLowerCase().includes(q) ||
        (a.nombre || '').toLowerCase().includes(q) ||
        a.raza.toLowerCase().includes(q)
      );
    });

    return [...lista].sort((a, b) => {
      if (orden === 'NOMBRE') return (a.nombre || a.numeroCorto).localeCompare(b.nombre || b.numeroCorto);
      if (orden === 'EDAD') return a.fechaNacimiento.localeCompare(b.fechaNacimiento);
      if (orden === 'DEL') {
        const da = calcularDEL(a, hoy) ?? -1;
        const db = calcularDEL(b, hoy) ?? -1;
        return db - da;
      }
      if (orden === 'ULTIMO_PARTO') {
        return (b.fechaUltimoParto || '').localeCompare(a.fechaUltimoParto || '');
      }
      return a.numeroCorto.localeCompare(b.numeroCorto);
    });
  }, [estado.animales, busqueda, filtro, corralFiltro, etapaFiltro, sexoFiltro, razaFiltro, orden, hoy]);

  // Agrupación visual estilo VacApp v4: crías jóvenes anidadas justo bajo su madre si ambas están visibles
  const filasConAgrupacion = useMemo(() => {
    if (!agruparCrias) {
      return filtrados.map((animal) => ({ animal, esCriaAnidada: false, madreEtiqueta: '' }));
    }
    const mapaVisiblePorCrotal = new Map(filtrados.map((a) => [normalizarCrotal(a.crotal), a]));
    const criasPorMadre = new Map<string, UnidadGanadera[]>();
    const idsAnidados = new Set<string>();

    for (const a of filtrados) {
      if (clasificarEtapaAnimal(a, hoy) !== 'TERNERO' || !a.crotalMadre) continue;
      const keyMadre = normalizarCrotal(a.crotalMadre);
      if (mapaVisiblePorCrotal.has(keyMadre)) {
        const arr = criasPorMadre.get(keyMadre) || [];
        arr.push(a);
        criasPorMadre.set(keyMadre, arr);
        idsAnidados.add(a.id);
      }
    }

    const out: Array<{ animal: UnidadGanadera; esCriaAnidada: boolean; madreEtiqueta: string }> = [];
    for (const a of filtrados) {
      if (idsAnidados.has(a.id)) continue;
      out.push({ animal: a, esCriaAnidada: false, madreEtiqueta: '' });
      const hijos = criasPorMadre.get(normalizarCrotal(a.crotal));
      if (hijos) {
        for (const h of hijos) {
          out.push({
            animal: h,
            esCriaAnidada: true,
            madreEtiqueta: a.nombre ? `${a.nombre} (#${a.numeroCorto})` : `#${a.numeroCorto}`,
          });
        }
      }
    }
    return out;
  }, [filtrados, agruparCrias, hoy]);

  const animalDrawer = useMemo(
    () => (animalDrawerId ? estado.animales.find((a) => a.id === animalDrawerId) : undefined),
    [estado.animales, animalDrawerId],
  );

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleExportarExcelCsv = () => {
    const csv = exportarCensoExcelCsv(estado);
    descargarArchivo(
      `censo_excel_${estado.explotacion.codigoRega}_${hoy}.csv`,
      csv,
      'text/csv;charset=utf-8',
    );
  };

  const handleImportarCsv = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = importarCensoDesdeCsv(String(reader.result || ''), estado);
      if (res.errores.length > 0) {
        setMensajeImport(res.errores[0]);
      } else if (res.nuevos.length === 0) {
        setMensajeImport(
          `Sin animales nuevos (${res.actualizados} ya existían en el censo).`,
        );
      } else {
        onImportarAnimalesCenso(res.nuevos);
        setMensajeImport(
          `Importados ${res.nuevos.length} animales nuevos desde ${file.name}${res.actualizados ? ` (${res.actualizados} ya existentes)` : ''}.`,
        );
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleCrearCorral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoCorralNombre.trim()) return;
    onAnadirCorral(nuevoCorralNombre.trim());
    setNuevoCorralNombre('');
    setMostrarFormCorral(false);
  };

  return (
    <div className="animate-fade-up space-y-5">
      {/* Cabecera */}
      <div className="card-surface flex flex-col gap-3 rounded-2xl p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold text-[#0f1f18]">
              Censo Unificado, Corrales y Libro Registro
            </h2>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-mono text-xs font-extrabold text-emerald-900">
              {ugmRebano.totalUgm} UGM
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#52655c]">
            {ugmRebano.vacas} vacas · {ugmRebano.novillas} novillas · {ugmRebano.toros} toros ·{' '}
            {ugmRebano.terneros} terneros — pulsa en cualquier res para abrir fotos, pesos, árbol
            genealógico y gestión rápida.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setModoSeleccion((v) => !v);
              setSeleccionados([]);
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
              modoSeleccion
                ? 'border-[#0f3d2e] bg-emerald-50 text-[#0f3d2e]'
                : 'border-[#dce4d6] bg-white text-[#1f3329] hover:bg-[#f4f6f1]'
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            {modoSeleccion ? 'Salir lote' : 'Acciones lote'}
          </button>
          <button
            type="button"
            onClick={() => onAbrirLibrosOficiales('EXPLOTACION')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-950 hover:bg-emerald-100"
          >
            <BookOpenCheck className="h-4 w-4" />
            Libros PDF
          </button>
          <button
            type="button"
            onClick={handleExportarExcelCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce4d6] bg-white px-3 py-2 text-xs font-bold text-[#1f3329] hover:bg-[#f4f6f1]"
          >
            <Download className="h-4 w-4" />
            Excel CSV
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => {
              handleImportarCsv(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce4d6] bg-white px-3 py-2 text-xs font-bold text-[#1f3329] hover:bg-[#f4f6f1]"
          >
            <Upload className="h-4 w-4" />
            Importar CSV
          </button>
          <button
            type="button"
            onClick={onAbrirCompra}
            className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-950 hover:bg-sky-100"
          >
            <ShoppingCart className="h-4 w-4" />
            Compra
          </button>
          <button
            type="button"
            onClick={onAbrirNacimiento}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f3d2e] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#16523e]"
          >
            <Plus className="h-4 w-4 text-amber-300" />
            Nacimiento
          </button>
        </div>
      </div>

      {mensajeImport && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-950">
          <span>{mensajeImport}</span>
          <button type="button" onClick={() => setMensajeImport(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Barra de Corrales / Lotes con desglose rápido Vacas · Toros · Terneros */}
      <div className="card-surface space-y-2.5 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#31453b]">
            <Layers className="h-4 w-4 text-emerald-700" />
            <span>Corrales / Lotes y Fincas</span>
          </div>
          <button
            type="button"
            onClick={() => setMostrarFormCorral((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-[#dce4d6] bg-[#f8faf6] px-2.5 py-1 text-[11px] font-bold text-[#0f3d2e] hover:bg-emerald-50"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            + Nuevo corral / finca
          </button>
        </div>

        {mostrarFormCorral && (
          <form onSubmit={handleCrearCorral} className="flex flex-wrap gap-2 pt-1">
            <input
              type="text"
              value={nuevoCorralNombre}
              onChange={(e) => setNuevoCorralNombre(e.target.value)}
              placeholder="Ej: Nave Norte, Braña de Arriba, Novillas Cubiertas..."
              required
              className="flex-1 rounded-xl border border-[#dce4d6] bg-[#f8faf6] px-3 py-1.5 text-xs focus:border-emerald-600 focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-[#0f3d2e] px-3.5 py-1.5 text-xs font-bold text-white"
            >
              Crear corral
            </button>
          </form>
        )}

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCorralFiltro('TODOS')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              corralFiltro === 'TODOS'
                ? 'bg-[#0f3d2e] text-white'
                : 'border border-[#e1e7dc] bg-[#f8faf6] text-[#4a5d54] hover:bg-[#edf1e9]'
            }`}
          >
            Todos los corrales
          </button>
          {corrales.map((c) => {
            const enCorral = estado.animales.filter(
              (a) => a.estado === 'ACTIVO' && a.corralId === c.id,
            );
            const nVacas = enCorral.filter((a) => {
              const e = clasificarEtapaAnimal(a, hoy);
              return e === 'VACA' || e === 'NOVILLA';
            }).length;
            const nTerneros = enCorral.filter(
              (a) => clasificarEtapaAnimal(a, hoy) === 'TERNERO',
            ).length;
            const activo = corralFiltro === c.id;
            return (
              <div
                key={c.id}
                className={`inline-flex items-center rounded-xl border text-xs font-bold transition ${
                  activo
                    ? 'border-[#0f3d2e] bg-emerald-50 text-[#0f3d2e]'
                    : 'border-[#e1e7dc] bg-white text-[#31453b] hover:bg-[#f8faf6]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setCorralFiltro(activo ? 'TODOS' : c.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  <span>{c.nombre}</span>
                  <span className="rounded-full bg-[#edf1e9] px-1.5 font-mono text-[10px]">
                    {enCorral.length}
                  </span>
                  {enCorral.length > 0 && (
                    <span className="hidden font-mono text-[10px] font-medium text-[#64786e] sm:inline">
                      ({nVacas}V·{nTerneros}T)
                    </span>
                  )}
                </button>
                {!c.esPredefinido && (
                  <button
                    type="button"
                    aria-label={`Eliminar corral ${c.nombre}`}
                    onClick={() => {
                      if (corralFiltro === c.id) setCorralFiltro('TODOS');
                      onEliminarCorral(c.id);
                    }}
                    className="pr-2 text-[#70857a] hover:text-red-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Barra contextual de Acciones Masivas */}
      {modoSeleccion && (
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-[#0f3d2e] bg-emerald-50/90 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold text-[#0f3d2e]">
            <span>{seleccionados.length} animal(es) seleccionado(s)</span>
            <button
              type="button"
              onClick={() => setSeleccionados(filtrados.map((a) => a.id))}
              className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-[#0f3d2e] underline"
            >
              Seleccionar visibles ({filtrados.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={corralDestinoLote}
              onChange={(e) => setCorralDestinoLote(e.target.value)}
              className="rounded-xl border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-bold"
            >
              <option value="">Elegir corral destino...</option>
              {corrales.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={seleccionados.length === 0 || !corralDestinoLote}
              onClick={() => {
                onMoverLoteCorral(seleccionados, corralDestinoLote);
                setSeleccionados([]);
              }}
              className="rounded-xl bg-[#0f3d2e] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
            >
              Mover corral
            </button>

            <input
              type="text"
              value={notaVacunaLote}
              onChange={(e) => setNotaVacunaLote(e.target.value)}
              className="rounded-xl border border-sky-300 bg-white px-2.5 py-1.5 text-xs sm:w-48"
            />
            <button
              type="button"
              disabled={seleccionados.length === 0}
              onClick={() => {
                onVacunarLote(seleccionados, notaVacunaLote);
                setSeleccionados([]);
              }}
              className="inline-flex items-center gap-1 rounded-xl bg-sky-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
            >
              <Syringe className="h-3.5 w-3.5" />
              Vacunar / Tratar lote
            </button>
          </div>
        </div>
      )}

      {/* Buscador + Filtros de estado + Filtros multifaceta + Ordenación */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#70857a]" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar vaca (#4521, Pinta, ES0300...)"
              className="w-full rounded-xl border border-[#dce4d6] bg-white py-2.5 pl-10 pr-3 text-sm text-[#0f1f18] shadow-2xs focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['ACTIVOS', 'Activos', contadores.activos],
                ['CROTAL_CAIDO', 'Crotal caído', contadores.crotalCaido],
                ['SUPRESION', 'En supresión', contadores.supresion],
                ['TODOS', 'Todos', contadores.todos],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFiltro(id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  filtro === id
                    ? 'bg-[#0f3d2e] text-white shadow-xs'
                    : 'border border-[#dce4d6] bg-white text-[#4a5d54] hover:bg-[#edf1e9]'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`rounded-full px-1.5 font-mono text-[10px] ${
                    filtro === id ? 'bg-white/20 text-white' : 'bg-[#edf1e9] text-[#2b4036]'
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Filtros multifaceta combinables + Ordenación + Agrupar crías */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#e1e7dc] bg-white px-3.5 py-2.5 text-xs">
          <select
            aria-label="Filtrar por etapa"
            value={etapaFiltro}
            onChange={(e) => setEtapaFiltro(e.target.value as 'TODAS' | EtapaAnimal)}
            className="rounded-lg border border-[#dce4d6] bg-[#f8faf6] px-2.5 py-1.5 font-bold text-[#1f3329]"
          >
            <option value="TODAS">Etapa: Todas</option>
            <option value="VACA">Vacas adultas</option>
            <option value="NOVILLA">Novillas</option>
            <option value="TORO">Toros</option>
            <option value="TERNERO">Terneros (&lt;12m)</option>
          </select>

          <select
            aria-label="Filtrar por sexo"
            value={sexoFiltro}
            onChange={(e) => setSexoFiltro(e.target.value as 'TODOS' | SexoAnimal)}
            className="rounded-lg border border-[#dce4d6] bg-[#f8faf6] px-2.5 py-1.5 font-bold text-[#1f3329]"
          >
            <option value="TODOS">Sexo: Todos</option>
            <option value="H">Hembras</option>
            <option value="M">Machos</option>
          </select>

          <select
            aria-label="Filtrar por raza"
            value={razaFiltro}
            onChange={(e) => setRazaFiltro(e.target.value)}
            className="rounded-lg border border-[#dce4d6] bg-[#f8faf6] px-2.5 py-1.5 font-bold text-[#1f3329]"
          >
            <option value="TODAS">Raza: Todas</option>
            {razasDisponibles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <div className="inline-flex items-center gap-1 rounded-lg border border-[#dce4d6] bg-[#f8faf6] px-2.5 py-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-[#52655c]" />
            <select
              aria-label="Ordenar censo"
              value={orden}
              onChange={(e) => setOrden(e.target.value as OrdenCenso)}
              className="bg-transparent font-bold text-[#1f3329] focus:outline-none"
            >
              <option value="CROTAL">Orden: Crotal</option>
              <option value="NOMBRE">Orden: Nombre</option>
              <option value="EDAD">Orden: Mayor edad</option>
              {!esCarne && <option value="DEL">Orden: Mayor DEL</option>}
              <option value="ULTIMO_PARTO">Orden: Último parto</option>
            </select>
          </div>

          <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#f8faf6] px-2.5 py-1.5 font-bold text-[#31453b]">
            <input
              type="checkbox"
              checked={agruparCrias}
              onChange={(e) => setAgruparCrias(e.target.checked)}
              className="accent-[#0f3d2e]"
            />
            <Baby className="h-3.5 w-3.5 text-amber-700" />
            Agrupar crías bajo madre
          </label>
        </div>
      </div>

      {/* Tarjetas limpias con Crotal Amarillo Realista, Foto, DEL, Peso/GMD y Corral */}
      <div className="grid gap-3.5 md:grid-cols-2">
        {filasConAgrupacion.map(({ animal, esCriaAnidada, madreEtiqueta }) => {
          const supLeche = estaEnSupresionLeche(animal, hoy);
          const supCarne = estaEnSupresionCarne(animal, hoy);
          const faltaCrotal =
            animal.estadoCrotal === 'FALTA_IZQUIERDO' ||
            animal.estadoCrotal === 'FALTA_DERECHO' ||
            animal.estadoCrotal === 'FALTAN_AMBOS';
          const corral = animal.corralId ? mapaCorrales.get(animal.corralId) : undefined;
          const del = !esCarne ? calcularDEL(animal, hoy) : undefined;
          const esProblema = problemasIds.has(animal.id);
          const marcada = seleccionados.includes(animal.id);
          const gmd = calcularGmdAnimal(animal.id, estado.pesajes);
          const prefijoCrotal = animal.crotal.slice(0, Math.max(0, animal.crotal.length - 4));
          const ultimos4 = animal.crotal.slice(-4);

          return (
            <div
              key={animal.id}
              onClick={() =>
                modoSeleccion ? toggleSeleccion(animal.id) : setAnimalDrawerId(animal.id)
              }
              className={`card-interactive group cursor-pointer rounded-2xl border bg-white p-4 shadow-xs ${
                esCriaAnidada ? 'ml-4 border-l-4 border-l-amber-400 bg-amber-50/20' : ''
              } ${
                marcada
                  ? 'border-[#0f3d2e] bg-emerald-50/50 ring-2 ring-[#0f3d2e]/20'
                  : supLeche || supCarne
                    ? 'border-red-300 bg-gradient-to-br from-white to-red-50/35'
                    : faltaCrotal
                      ? 'border-amber-300 bg-gradient-to-br from-white to-amber-50/35'
                      : 'border-[#e1e7dc]'
              }`}
            >
              {esCriaAnidada && (
                <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-amber-100/90 px-2 py-0.5 text-[10px] font-extrabold text-amber-950">
                  <Baby className="h-3 w-3" />
                  Cría de {madreEtiqueta} · {formatearEdadExacta(animal.fechaNacimiento, hoy, true)}
                </div>
              )}

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  {modoSeleccion && (
                    <input
                      type="checkbox"
                      checked={marcada}
                      onChange={() => toggleSeleccion(animal.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 accent-[#0f3d2e]"
                    />
                  )}
                  {animal.fotoDataUrl ? (
                    <img
                      src={animal.fotoDataUrl}
                      alt={animal.nombre || animal.crotal}
                      className="h-12 w-12 shrink-0 rounded-xl border border-[#dce4d6] object-cover shadow-2xs"
                    />
                  ) : (
                    <CrotalVisual
                      crotal={animal.crotal}
                      numeroCorto={animal.numeroCorto}
                      especie={animal.especie}
                      estadoCrotal={animal.estadoCrotal}
                      variante="badge"
                    />
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-base font-extrabold text-[#0f1f18] group-hover:text-emerald-900">
                        {animal.nombre || `Res #${animal.numeroCorto}`}
                      </span>
                      <span className="rounded-md bg-[#f4f6f1] px-1.5 py-0.5 text-[10px] font-bold text-[#52655c]">
                        {animal.sexo === 'H' ? '♀' : '♂'}{' '}
                        {formatearEdadExacta(animal.fechaNacimiento, hoy, true)}
                      </span>
                      {del !== undefined && (
                        <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-emerald-900">
                          {del} DEL
                        </span>
                      )}
                      {gmd.pesoActualKg !== undefined && (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-sky-100 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-sky-900">
                          <Scale className="h-2.5 w-2.5" />
                          {gmd.pesoActualKg}kg
                          {gmd.gmdKgDia ? ` (${gmd.gmdKgDia.toFixed(2)}/d)` : ''}
                        </span>
                      )}
                      {esProblema && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-800">
                          <AlertTriangle className="h-3 w-3" />
                          Revisar
                        </span>
                      )}
                      {!animal.enCensoOficial && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                          Pend. Principado
                        </span>
                      )}
                    </div>
                    <div
                      className="mt-1 flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <code className="text-xs text-[#52655c]">
                        {prefijoCrotal}
                        <strong className="font-extrabold text-[#0f1f18]">{ultimos4}</strong>
                      </code>
                      <BotonCopiar valor={animal.crotal} etiqueta="Copiar" compacto />
                    </div>
                  </div>
                </div>

                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f4f6f1] text-[#52655c] transition group-hover:bg-emerald-100 group-hover:text-emerald-900">
                  <ChevronRight className="h-4 w-4" />
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#52655c]">
                {corral && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#f4f6f1] px-2 py-0.5 text-[11px] font-bold text-[#1f3329]">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: corral.color }}
                    />
                    {corral.nombre}
                  </span>
                )}
                <span>
                  <strong className="text-[#0f1f18]">{animal.raza}</strong>
                </span>
                <span>Nac. {formatearFechaEs(animal.fechaNacimiento)}</span>
              </div>

              {(supLeche || supCarne) && animal.supresionActiva && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
                  <span>
                    <strong>Supresión:</strong> {animal.supresionActiva.medicamento}
                    {supLeche &&
                      ` · Leche ${formatearFechaEs(animal.supresionActiva.finSupresionLeche)}`}
                    {supCarne &&
                      ` · Carne ${formatearFechaEs(animal.supresionActiva.finSupresionCarne)}`}
                  </span>
                </div>
              )}

              {animal.estado === 'ACTIVO' && (
                <div
                  className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#eef2eb] pt-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${
                        faltaCrotal
                          ? 'bg-amber-100 text-amber-950'
                          : animal.estadoCrotal === 'PENDIENTE_COLOCAR'
                            ? 'bg-amber-50 text-amber-900'
                            : 'bg-[#f4f6f1] text-[#3f5349]'
                      }`}
                    >
                      <Tag className="h-3 w-3" />
                      {animal.estadoCrotal === 'OK'
                        ? 'Crotales OK'
                        : animal.estadoCrotal === 'FALTA_IZQUIERDO'
                          ? 'Falta crotal izq.'
                          : animal.estadoCrotal === 'FALTA_DERECHO'
                            ? 'Falta crotal der.'
                            : animal.estadoCrotal === 'FALTAN_AMBOS'
                              ? 'Faltan ambos'
                              : 'Pend. colocar'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${
                        animal.dibImpreso
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-[#f4f6f1] text-[#52655c]'
                      }`}
                    >
                      <FileCheck2 className="h-3 w-3" />
                      {animal.dibImpreso ? 'DIB OK' : 'DIB Pend.'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAnimalDrawerId(animal.id)}
                    className="rounded-lg px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                  >
                    Ver ficha →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filasConAgrupacion.length === 0 && (
        <div className="card-surface rounded-2xl p-10 text-center text-sm text-[#52655c]">
          No hay animales que coincidan con el filtro o corral actual.
        </div>
      )}

      {animalDrawer && (
        <DrawerFichaAnimal
          animal={animalDrawer}
          estado={estado}
          onCerrar={() => setAnimalDrawerId(null)}
          onCambiarEstadoCrotal={onCambiarEstadoCrotal}
          onCambiarCorral={onCambiarCorral}
          onRegistrarIncidencia={onRegistrarIncidencia}
          onRegistrarPesaje={onRegistrarPesaje}
          onActualizarFoto={onActualizarFoto}
          onActualizarFechaOficial={onActualizarFechaOficial}
          onToggleDib={onToggleDib}
          onAbrirTratamiento={onAbrirTratamiento}
          onAbrirBajaAnimal={onAbrirBajaAnimal}
          onSeleccionarOtroAnimal={(otro) => setAnimalDrawerId(otro.id)}
        />
      )}
    </div>
  );
}

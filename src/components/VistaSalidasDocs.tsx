import {
  AlertOctagon,
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Euro,
  FileCheck2,
  FileScan,
  FileText,
  FolderCheck,
  Mountain,
  Pill,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { estaEnSupresionCarne, validarAnimalesParaSalida } from '../domain/alertas';
import { generarResumenTextoGuiaSalida } from '../domain/exportadores';
import { formatearFechaEs, hoyIso } from '../domain/fechas';
import { obtenerCorralesActivos } from '../domain/incidencias';
import { validarGuiaSalidaRemoWeb } from '../domain/reglasRemoWeb';
import type {
  DocumentoExplotacion,
  EstadoGanaderia,
  MedioTransporteRemoWeb,
} from '../domain/types';
import { BotonCopiar } from './BadgeNivel';

interface Props {
  estado: EstadoGanaderia;
  onRegistrarSalidaLote: (payload: {
    animalIds: string[];
    tipo: 'SALIDA_MATADERO' | 'SALIDA_MERCADO' | 'SALIDA_PASTOS' | 'VENTA';
    destino: string;
    codigoRegaDestino: string;
    fechaSalida: string;
    importeTotalEur?: number;
    medioTransporte?: MedioTransporteRemoWeb;
    codigoSirentra?: string;
    matriculaVehiculo?: string;
    horaSalida?: string;
  }) => void;
  onAnadirDocumento: (doc: DocumentoExplotacion) => void;
  onAbrirEscanerOcr: () => void;
  onAbrirLibrosOficiales: (libro?: 'EXPLOTACION' | 'TRATAMIENTOS') => void;
}

type TipoSalida = 'SALIDA_MATADERO' | 'SALIDA_MERCADO' | 'SALIDA_PASTOS' | 'VENTA';

export function VistaSalidasDocs({
  estado,
  onRegistrarSalidaLote,
  onAnadirDocumento,
  onAbrirEscanerOcr,
  onAbrirLibrosOficiales,
}: Props) {
  const [subTab, setSubTab] = useState<'GUIAS' | 'DOCS'>('GUIAS');

  // Estado Guías de Salida
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [tipoSalida, setTipoSalida] = useState<TipoSalida>('SALIDA_MATADERO');
  const [destino, setDestino] = useState('Matadero Central de Asturias (Noreña)');
  const [regaDestino, setRegaDestino] = useState('');
  const [fechaSalida, setFechaSalida] = useState(hoyIso());
  const [importeTotalEur, setImporteTotalEur] = useState('');
  const [mostrarTransporte, setMostrarTransporte] = useState(false);
  const [medioTransporte, setMedioTransporte] = useState<MedioTransporteRemoWeb>('CAMION');
  const [codigoSirentra, setCodigoSirentra] = useState(
    estado.explotacion.codigoSirentraHabitual || '',
  );
  const [matriculaVehiculo, setMatriculaVehiculo] = useState('');
  const [horaSalida, setHoraSalida] = useState('08:00');
  const [busquedaAnimal, setBusquedaAnimal] = useState('');
  const [corralFiltro, setCorralFiltro] = useState('TODOS');

  // Estado Documentos / Libros
  const [busquedaDoc, setBusquedaDoc] = useState('');
  const [catFiltro, setCatFiltro] = useState<'TODAS' | DocumentoExplotacion['categoria']>('TODAS');
  const [mostrarFormDoc, setMostrarFormDoc] = useState(false);
  const [docTitulo, setDocTitulo] = useState('');
  const [docCat, setDocCat] = useState<DocumentoExplotacion['categoria']>('SANEAMIENTO');
  const [docRef, setDocRef] = useState('');
  const [docCaducidad, setDocCaducidad] = useState('');

  const corrales = useMemo(() => obtenerCorralesActivos(estado), [estado]);

  const activos = useMemo(
    () => estado.animales.filter((a) => a.estado === 'ACTIVO'),
    [estado.animales],
  );

  const animalesFiltrados = useMemo(() => {
    const q = busquedaAnimal.trim().toLowerCase();
    return activos.filter((a) => {
      if (corralFiltro !== 'TODOS' && a.corralId !== corralFiltro) return false;
      if (!q) return true;
      return (
        a.crotal.toLowerCase().includes(q) ||
        a.numeroCorto.toLowerCase().includes(q) ||
        (a.nombre || '').toLowerCase().includes(q) ||
        a.raza.toLowerCase().includes(q)
      );
    });
  }, [activos, corralFiltro, busquedaAnimal]);

  const animalesElegidos = useMemo(
    () => activos.filter((a) => seleccionados.includes(a.id)),
    [activos, seleccionados],
  );

  const validaciones = useMemo(
    () => validarAnimalesParaSalida(animalesElegidos, tipoSalida, fechaSalida),
    [animalesElegidos, tipoSalida, fechaSalida],
  );

  const avisosRemoWebGuia = useMemo(
    () =>
      validarGuiaSalidaRemoWeb(estado, animalesElegidos, {
        fechaSalida,
        codigoRegaDestino: regaDestino,
        destino,
        codigoSirentra,
        esMatadero: tipoSalida === 'SALIDA_MATADERO',
      }),
    [estado, animalesElegidos, fechaSalida, regaDestino, destino, codigoSirentra, tipoSalida],
  );

  const hayBloqueos =
    validaciones.some((v) => !v.apto) ||
    avisosRemoWebGuia.some((a) => a.nivel === 'ERROR');

  const resumenGuia = useMemo(() => {
    if (animalesElegidos.length === 0) return '';
    return generarResumenTextoGuiaSalida(
      estado,
      animalesElegidos,
      destino,
      regaDestino,
      fechaSalida,
    );
  }, [estado, animalesElegidos, destino, regaDestino, fechaSalida]);

  const historialSalidas = useMemo(
    () =>
      estado.eventos
        .filter(
          (e) =>
            e.tipo === 'SALIDA_MATADERO' ||
            e.tipo === 'SALIDA_MERCADO' ||
            e.tipo === 'SALIDA_PASTOS' ||
            e.tipo === 'VENTA',
        )
        .slice(0, 8),
    [estado.eventos],
  );

  const docsFiltrados = useMemo(() => {
    const q = busquedaDoc.trim().toLowerCase();
    return estado.documentos.filter((d) => {
      if (catFiltro !== 'TODAS' && d.categoria !== catFiltro) return false;
      if (!q) return true;
      return (
        d.titulo.toLowerCase().includes(q) ||
        (d.referencia || '').toLowerCase().includes(q) ||
        (d.animalCrotal || '').toLowerCase().includes(q)
      );
    });
  }, [estado.documentos, catFiltro, busquedaDoc]);

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const cambiarDestinoPreset = (nuevoTipo: TipoSalida) => {
    setTipoSalida(nuevoTipo);
    if (nuevoTipo === 'SALIDA_MATADERO') setDestino('Matadero Central de Asturias (Noreña)');
    if (nuevoTipo === 'SALIDA_MERCADO') setDestino('Mercado Nacional de Ganados de Pola de Siero');
    if (nuevoTipo === 'SALIDA_PASTOS') setDestino('Puerto / Pastos de Montaña');
    if (nuevoTipo === 'VENTA') setDestino('Explotación compradora');
  };

  const handleConfirmarSalida = () => {
    if (animalesElegidos.length === 0 || hayBloqueos) return;
    const imp = importeTotalEur ? Number(importeTotalEur.replace(',', '.')) : undefined;
    onRegistrarSalidaLote({
      animalIds: seleccionados,
      tipo: tipoSalida,
      destino,
      codigoRegaDestino: regaDestino,
      fechaSalida,
      importeTotalEur: imp && imp > 0 ? imp : undefined,
      medioTransporte,
      codigoSirentra: codigoSirentra.trim().toUpperCase() || undefined,
      matriculaVehiculo: matriculaVehiculo.trim().toUpperCase() || undefined,
      horaSalida: horaSalida || undefined,
    });
    setSeleccionados([]);
    setImporteTotalEur('');
  };

  const handleCrearDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitulo.trim()) return;
    onAnadirDocumento({
      id: `doc-${Date.now()}`,
      categoria: docCat,
      titulo: docTitulo.trim(),
      fechaEmision: hoyIso(),
      fechaCaducidad: docCaducidad || undefined,
      referencia: docRef.trim() || undefined,
      estado: 'VIGENTE',
    });
    setDocTitulo('');
    setDocRef('');
    setDocCaducidad('');
    setMostrarFormDoc(false);
  };

  const estiloDoc = (cat: DocumentoExplotacion['categoria']) => {
    switch (cat) {
      case 'SANEAMIENTO':
        return { Icon: ShieldCheck, bg: 'bg-emerald-100 text-emerald-800', pill: 'bg-emerald-50 text-emerald-900' };
      case 'PSI':
        return { Icon: FileCheck2, bg: 'bg-sky-100 text-sky-800', pill: 'bg-sky-50 text-sky-900' };
      case 'RECETA_PRESVET':
        return { Icon: Pill, bg: 'bg-purple-100 text-purple-800', pill: 'bg-purple-50 text-purple-900' };
      default:
        return { Icon: FileText, bg: 'bg-amber-100 text-amber-800', pill: 'bg-amber-50 text-amber-900' };
    }
  };

  return (
    <div className="animate-fade-up space-y-4">
      {/* Selector superior de 2 sub-pestañas limpias */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#e1e7dc] bg-white p-1.5 text-xs font-extrabold shadow-2xs">
        <button
          type="button"
          onClick={() => setSubTab('GUIAS')}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 transition ${
            subTab === 'GUIAS'
              ? 'bg-[#0f3d2e] text-white shadow-xs'
              : 'text-[#4a5d54] hover:bg-[#f8faf6]'
          }`}
        >
          <Truck className="h-4 w-4" />
          Guías de Salida
        </button>
        <button
          type="button"
          onClick={() => setSubTab('DOCS')}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 transition ${
            subTab === 'DOCS'
              ? 'bg-[#0f3d2e] text-white shadow-xs'
              : 'text-[#4a5d54] hover:bg-[#f8faf6]'
          }`}
        >
          <FolderCheck className="h-4 w-4" />
          Documentos y Libros ({estado.documentos.length})
        </button>
      </div>

      {subTab === 'GUIAS' && (
        <div className="space-y-4">
          {/* Paso 1: 4 iconos circulares de tipo de salida + datos compactos */}
          <section className="card-surface space-y-4 rounded-2xl p-4 sm:p-5">
            <h2 className="text-base font-extrabold text-[#0f1f18]">
              Nueva Guía / Salida de Ganado
            </h2>

            {/* 4 Iconos circulares */}
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { id: 'SALIDA_MATADERO' as TipoSalida, label: 'Matadero', Icono: Truck, color: 'border-red-600 text-red-800 bg-red-50' },
                  { id: 'SALIDA_MERCADO' as TipoSalida, label: 'Mercado', Icono: Store, color: 'border-sky-600 text-sky-800 bg-sky-50' },
                  { id: 'SALIDA_PASTOS' as TipoSalida, label: 'Pastos', Icono: Mountain, color: 'border-emerald-700 text-emerald-800 bg-emerald-50' },
                  { id: 'VENTA' as TipoSalida, label: 'Venta', Icono: Euro, color: 'border-amber-600 text-amber-900 bg-amber-50' },
                ] as const
              ).map((item) => {
                const activo = tipoSalida === item.id;
                const Icono = item.Icono;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => cambiarDestinoPreset(item.id)}
                    className="group flex flex-col items-center gap-1.5 text-center"
                  >
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-full border-2 shadow-xs transition group-hover:scale-105 ${
                        activo
                          ? `${item.color} ring-2 ring-emerald-300`
                          : 'border-[#dce4d6] bg-[#f8faf6] text-[#4a5d54]'
                      }`}
                    >
                      <Icono className="h-6 w-6" />
                    </div>
                    <span
                      className={`text-[11px] font-extrabold ${
                        activo ? 'text-[#0f1f18]' : 'text-[#52655c]'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Datos de destino y fecha */}
            <div className="grid gap-2.5 rounded-2xl border border-[#e6ece2] bg-[#f8faf6] p-3.5 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-bold text-[#31453b] sm:col-span-2">
                Destino
                <input
                  type="text"
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </label>
              <label className="text-xs font-bold text-[#31453b]">
                Fecha salida
                <input
                  type="date"
                  value={fechaSalida}
                  onChange={(e) => setFechaSalida(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </label>
              <label className="text-xs font-bold text-[#31453b]">
                REGA destino (opc.)
                <input
                  type="text"
                  placeholder="ES330440009999"
                  value={regaDestino}
                  onChange={(e) => setRegaDestino(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-3 py-2 font-mono text-xs focus:border-emerald-600 focus:outline-none"
                />
              </label>
              {(tipoSalida === 'SALIDA_MATADERO' || tipoSalida === 'VENTA') && (
                <label className="text-xs font-bold text-[#31453b] sm:col-span-2">
                  Importe total venta (€, opc.)
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="Ej: 1450"
                    value={importeTotalEur}
                    onChange={(e) => setImporteTotalEur(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-3 py-2 font-mono text-xs focus:border-emerald-600 focus:outline-none"
                  />
                </label>
              )}

              <div className="flex items-end sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setMostrarTransporte((v) => !v)}
                  className="inline-flex w-full items-center justify-between rounded-xl border border-[#dce4d6] bg-white px-3 py-2 text-xs font-bold text-[#1f3329] hover:bg-[#f4f6f1]"
                >
                  <span>Transporte (SIRENTRA / Matrícula / Hora)</span>
                  {mostrarTransporte ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>

              {mostrarTransporte && (
                <div className="grid gap-2.5 border-t border-[#e1e7dc] pt-2.5 sm:col-span-2 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-4">
                  <label className="text-xs font-bold text-[#31453b]">
                    Medio transporte
                    <select
                      value={medioTransporte}
                      onChange={(e) => setMedioTransporte(e.target.value as MedioTransporteRemoWeb)}
                      className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2.5 py-1.5 text-xs font-semibold"
                    >
                      <option value="CAMION">Camión</option>
                      <option value="CONDUCCION_A_PIE">Conducción a pie</option>
                      <option value="BARCO">Barco</option>
                      <option value="TREN">Tren</option>
                      <option value="AVION">Avión</option>
                      <option value="OTROS">Otros</option>
                    </select>
                  </label>
                  <label className="text-xs font-bold text-[#31453b]">
                    Código SIRENTRA
                    <input
                      type="text"
                      placeholder="ATES33000012345"
                      value={codigoSirentra}
                      onChange={(e) => setCodigoSirentra(e.target.value.toUpperCase())}
                      className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2.5 py-1.5 font-mono text-xs"
                    />
                  </label>
                  <label className="text-xs font-bold text-[#31453b]">
                    Matrícula / Bastidor
                    <input
                      type="text"
                      placeholder="1234-LMN"
                      value={matriculaVehiculo}
                      onChange={(e) => setMatriculaVehiculo(e.target.value.toUpperCase())}
                      className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2.5 py-1.5 font-mono text-xs"
                    />
                  </label>
                  <label className="text-xs font-bold text-[#31453b]">
                    Hora salida
                    <input
                      type="time"
                      value={horaSalida}
                      onChange={(e) => setHoraSalida(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2.5 py-1.5 text-xs"
                    />
                  </label>
                </div>
              )}
            </div>

            {avisosRemoWebGuia.length > 0 && (
              <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs">
                <p className="font-extrabold text-amber-950">
                  Pre-chequeo RemoWeb (+8d/+5d, SIRENTRA y Lengua Azul):
                </p>
                {avisosRemoWebGuia.map((av) => (
                  <p
                    key={av.codigo}
                    className={av.nivel === 'ERROR' ? 'font-bold text-red-700' : 'text-amber-900'}
                  >
                    • {av.mensaje}
                  </p>
                ))}
              </div>
            )}

            {/* Selector de animales con buscador + filtro por corral (listo para 200+ vacas) */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-extrabold text-[#0f1f18]">
                  Seleccionar animales ({seleccionados.length} elegido(s))
                </p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setSeleccionados((prev) =>
                        Array.from(new Set([...prev, ...animalesFiltrados.map((a) => a.id)])),
                      )
                    }
                    className="rounded-lg border border-[#dce4d6] bg-[#f8faf6] px-2.5 py-1 text-[11px] font-bold text-[#0f3d2e]"
                  >
                    Marcar visibles ({animalesFiltrados.length})
                  </button>
                  {seleccionados.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSeleccionados([])}
                      className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-800"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#70857a]" />
                  <input
                    type="text"
                    value={busquedaAnimal}
                    onChange={(e) => setBusquedaAnimal(e.target.value)}
                    placeholder="Buscar vaca (#4521, Pinta...)"
                    className="w-full rounded-xl border border-[#dce4d6] bg-white py-2 pl-8 pr-3 text-xs focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <select
                  aria-label="Filtrar por corral"
                  value={corralFiltro}
                  onChange={(e) => setCorralFiltro(e.target.value)}
                  className="rounded-xl border border-[#dce4d6] bg-white px-3 py-2 text-xs font-bold text-[#1f3329]"
                >
                  <option value="TODOS">Todos los corrales ({activos.length})</option>
                  {corrales.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                {animalesFiltrados.map((a) => {
                  const checked = seleccionados.includes(a.id);
                  const enSupCarne = estaEnSupresionCarne(a, fechaSalida);
                  const faltaCrotal = a.estadoCrotal !== 'OK';
                  const sinAltaOficial = !a.enCensoOficial;

                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleSeleccion(a.id)}
                      className={`flex flex-col gap-1.5 rounded-xl border p-2.5 text-left text-xs transition ${
                        checked
                          ? enSupCarne
                            ? 'border-red-500 bg-red-50/80 text-red-950'
                            : 'border-[#0f3d2e] bg-emerald-50/80 text-emerald-950'
                          : 'border-[#dce4d6] bg-white text-[#1f3329] hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="min-w-0 truncate">
                          <span className="rounded bg-amber-200 px-1.5 py-0.5 font-mono text-[11px] font-extrabold text-amber-950">
                            #{a.numeroCorto}
                          </span>{' '}
                          <span className="font-bold">{a.nombre || a.raza}</span>
                        </div>
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            checked
                              ? enSupCarne
                                ? 'border-red-600 bg-red-600 text-white'
                                : 'border-[#0f3d2e] bg-[#0f3d2e] text-white'
                              : 'border-[#c5d0be] bg-white'
                          }`}
                        >
                          {checked && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                      </div>
                      {(enSupCarne || sinAltaOficial || faltaCrotal) && (
                        <div className="flex flex-wrap gap-1">
                          {enSupCarne && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-extrabold text-red-800">
                              <ShieldAlert className="h-3 w-3" />
                              Supresión
                            </span>
                          )}
                          {sinAltaOficial && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                              <AlertTriangle className="h-3 w-3" />
                              Sin alta SITRAN
                            </span>
                          )}
                          {faltaCrotal && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                              Falta crotal
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resultado de validación y confirmación */}
            {validaciones.length > 0 && (
              <div className="space-y-3 rounded-2xl border border-[#dce4d6] bg-[#f8faf6] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold">
                    {hayBloqueos ? (
                      <>
                        <AlertOctagon className="h-4 w-4 text-red-600" />
                        <span className="text-red-800">
                          Salida bloqueada: revisa las incidencias sanitarias
                        </span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4 text-emerald-700" />
                        <span className="text-emerald-900">
                          Lote apto para salida ({animalesElegidos.length} reses)
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <BotonCopiar valor={resumenGuia} etiqueta="Copiar borrador" />
                    <button
                      type="button"
                      disabled={hayBloqueos}
                      onClick={handleConfirmarSalida}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f3d2e] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#16523e] disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Registrar salida y pasar a SITRAN
                    </button>
                  </div>
                </div>

                {validaciones.some((v) => !v.apto || v.advertencias.length > 0) && (
                  <div className="space-y-1.5">
                    {validaciones
                      .filter((v) => !v.apto || v.advertencias.length > 0)
                      .map((v) => (
                        <div
                          key={v.animalId}
                          className={`rounded-xl border p-2.5 text-xs ${
                            v.apto
                              ? 'border-amber-200 bg-amber-50/60'
                              : 'border-red-300 bg-red-50 text-red-950'
                          }`}
                        >
                          <span className="font-mono font-extrabold">{v.crotal}</span>
                          {v.bloqueos.map((b, i) => (
                            <p key={i} className="font-bold text-red-800">
                              • {b}
                            </p>
                          ))}
                          {v.advertencias.map((adv, i) => (
                            <p key={i} className="font-medium text-amber-900">
                              • {adv}
                            </p>
                          ))}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Historial reciente de salidas / guías */}
          {historialSalidas.length > 0 && (
            <section className="card-surface overflow-hidden rounded-2xl">
              <div className="border-b border-[#edf1e9] bg-[#fafbf8] px-4 py-3">
                <h3 className="text-sm font-extrabold text-[#0f1f18]">
                  Últimas salidas y guías registradas
                </h3>
              </div>
              <div className="divide-y divide-[#eef2eb]">
                {historialSalidas.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-[#0f1f18]">{ev.crotal}</span>
                      <span className="ml-2 text-[#52655c]">
                        {formatearFechaEs(ev.fechaEvento)} · {ev.destino || ev.tipo}
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                        ev.estadoTramite === 'TRAMITADO'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-amber-100 text-amber-950'
                      }`}
                    >
                      {ev.estadoTramite === 'TRAMITADO' ? 'En SITRAN' : 'Pendiente SITRAN'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {subTab === 'DOCS' && (
        <section className="card-surface space-y-4 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-[#0f1f18]">
              Carpeta de Inspección y Libros Oficiales
            </h2>
            <button
              type="button"
              onClick={() => setMostrarFormDoc((v) => !v)}
              className="inline-flex items-center gap-1 rounded-xl bg-[#0f3d2e] px-3 py-2 text-xs font-extrabold text-white"
            >
              <Plus className="h-4 w-4 text-amber-300" />
              Añadir documento
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => onAbrirLibrosOficiales('EXPLOTACION')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0f3d2e] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#175742]"
            >
              <BookOpenCheck className="h-4 w-4 text-amber-300" />
              Libro Explotación PDF
            </button>
            <button
              type="button"
              onClick={() => onAbrirLibrosOficiales('TRATAMIENTOS')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-950 hover:bg-emerald-100"
            >
              <Pill className="h-4 w-4" />
              Libro Tratamientos PDF
            </button>
            <button
              type="button"
              onClick={onAbrirEscanerOcr}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-700 px-3 py-2.5 text-xs font-bold text-white hover:bg-sky-800"
            >
              <FileScan className="h-4 w-4" />
              Escanear Receta / DIB (OCR)
            </button>
          </div>

          {mostrarFormDoc && (
            <form
              onSubmit={handleCrearDoc}
              className="grid gap-2.5 rounded-2xl border border-emerald-200 bg-[#f8faf6] p-4 sm:grid-cols-4"
            >
              <select
                value={docCat}
                onChange={(e) => setDocCat(e.target.value as DocumentoExplotacion['categoria'])}
                className="rounded-xl border border-[#dce4d6] bg-white px-2.5 py-2 text-xs font-bold"
              >
                <option value="SANEAMIENTO">Saneamiento</option>
                <option value="PSI">Plan Sanitario (PSI)</option>
                <option value="RECETA_PRESVET">Receta PRESVET</option>
                <option value="DIB">DIB Bovino</option>
                <option value="GUIA_MOVIMIENTO">Guía Movimiento</option>
                <option value="OTRO">Otro</option>
              </select>
              <input
                type="text"
                placeholder="Título del documento..."
                value={docTitulo}
                onChange={(e) => setDocTitulo(e.target.value)}
                required
                className="rounded-xl border border-[#dce4d6] bg-white px-2.5 py-2 text-xs sm:col-span-2"
              />
              <input
                type="date"
                value={docCaducidad}
                onChange={(e) => setDocCaducidad(e.target.value)}
                title="Fecha caducidad (opcional)"
                className="rounded-xl border border-[#dce4d6] bg-white px-2.5 py-2 text-xs"
              />
              <input
                type="text"
                placeholder="Nº Referencia / Lote (opcional)"
                value={docRef}
                onChange={(e) => setDocRef(e.target.value)}
                className="rounded-xl border border-[#dce4d6] bg-white px-2.5 py-2 text-xs sm:col-span-3"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#0f3d2e] px-3 py-2 text-xs font-bold text-white"
              >
                <Plus className="h-4 w-4 text-amber-300" />
                Archivar
              </button>
            </form>
          )}

          {/* Buscador + filtro de documentos */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#70857a]" />
              <input
                type="text"
                value={busquedaDoc}
                onChange={(e) => setBusquedaDoc(e.target.value)}
                placeholder="Buscar documento o referencia..."
                className="w-full rounded-xl border border-[#dce4d6] bg-white py-2 pl-8 pr-3 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <select
              value={catFiltro}
              onChange={(e) =>
                setCatFiltro(e.target.value as 'TODAS' | DocumentoExplotacion['categoria'])
              }
              className="rounded-xl border border-[#dce4d6] bg-white px-3 py-2 text-xs font-bold text-[#1f3329]"
            >
              <option value="TODAS">Todas las categorías</option>
              <option value="SANEAMIENTO">Saneamiento</option>
              <option value="PSI">Plan Sanitario (PSI)</option>
              <option value="RECETA_PRESVET">Receta PRESVET</option>
              <option value="DIB">DIB Bovino</option>
              <option value="GUIA_MOVIMIENTO">Guía Movimiento</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {docsFiltrados.map((doc) => {
              const st = estiloDoc(doc.categoria);
              const Icono = st.Icon;
              return (
                <div
                  key={doc.id}
                  className="flex items-start gap-3 rounded-xl border border-[#e6ece2] bg-[#fafbf8] p-3.5"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${st.bg}`}
                  >
                    <Icono className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${st.pill}`}
                    >
                      {doc.categoria}
                    </span>
                    <h4 className="mt-1 text-sm font-extrabold text-[#0f1f18]">{doc.titulo}</h4>
                    <p className="mt-0.5 text-xs text-[#52655c]">
                      Emisión: {formatearFechaEs(doc.fechaEmision)}
                      {doc.fechaCaducidad ? ` · Caduca: ${formatearFechaEs(doc.fechaCaducidad)}` : ''}
                    </p>
                    {doc.referencia && (
                      <p className="mt-0.5 font-mono text-[11px] font-semibold text-[#31453b]">
                        Ref: {doc.referencia}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Euro,
  FileCheck2,
  FileText,
  FolderCheck,
  GitCompare,
  Pencil,
  Pill,
  Plus,
  Search,
  ShieldCheck,
  Tag,
  Trash2,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { formatearFechaEs, hoyIso, sumarDiasIso } from '../domain/fechas';
import type {
  DocumentoExplotacion,
  EstadoGanaderia,
  MovimientoEconomico,
} from '../domain/types';
import { SubVistaEconomiaEvolucion } from './SubVistaSaneamientoEconomia';

export type SubTabGestion = 'ECONOMIA' | 'DOCS' | 'ROBOT' | 'CROTALES';

interface Props {
  estado: EstadoGanaderia;
  subTab: SubTabGestion;
  onCambiarSubTab: (tab: SubTabGestion) => void;
  numPendientesSitran: number;
  sitranBadgeColor: 'green' | 'orange' | 'red';
  crotalesDisponibles: number;
  robotContent: ReactNode;
  crotalesContent: ReactNode;
  onAnadirMovimientoEconomico: (mov: MovimientoEconomico) => void;
  onEditarMovimientoEconomico?: (mov: MovimientoEconomico) => void;
  onEliminarMovimientoEconomico?: (movId: string) => void;
  onAnadirDocumento: (doc: DocumentoExplotacion) => void;
  onEditarDocumento?: (doc: DocumentoExplotacion) => void;
  onEliminarDocumento?: (docId: string) => void;
  onAbrirEscanerOcr: () => void;
  onAbrirLibrosOficiales: (libro?: 'EXPLOTACION' | 'TRATAMIENTOS') => void;
}

export function VistaGestionEconomiaDocs({
  estado,
  subTab,
  onCambiarSubTab,
  numPendientesSitran,
  sitranBadgeColor,
  crotalesDisponibles,
  robotContent,
  crotalesContent,
  onAnadirMovimientoEconomico,
  onEditarMovimientoEconomico,
  onEliminarMovimientoEconomico,
  onAnadirDocumento,
  onEditarDocumento,
  onEliminarDocumento,
  onAbrirLibrosOficiales,
}: Props) {
  const hoy = hoyIso();
  const limiteProximo = useMemo(() => sumarDiasIso(hoy, 30), [hoy]);
  const [busquedaDoc, setBusquedaDoc] = useState('');
  const [catFiltro, setCatFiltro] = useState<'TODAS' | DocumentoExplotacion['categoria']>('TODAS');
  const [estadoFiltroDoc, setEstadoFiltroDoc] = useState<'TODOS' | 'ALERTAS' | 'VIGENTES'>('TODOS');
  const [mostrarFormDoc, setMostrarFormDoc] = useState(false);
  const [editandoDocId, setEditandoDocId] = useState<string | null>(null);
  const [docTitulo, setDocTitulo] = useState('');
  const [docCat, setDocCat] = useState<DocumentoExplotacion['categoria']>('SANEAMIENTO');
  const [docRef, setDocRef] = useState('');
  const [docCaducidad, setDocCaducidad] = useState('');

  const obtenerEstadoCaducidad = (doc: DocumentoExplotacion) => {
    if (!doc.fechaCaducidad) return 'VIGENTE' as const;
    if (doc.fechaCaducidad < hoy) return 'CADUCADO' as const;
    if (doc.fechaCaducidad <= limiteProximo) return 'CADUCA_PRONTO' as const;
    return 'VIGENTE' as const;
  };

  const alertasDocsCount = useMemo(
    () => estado.documentos.filter((d) => obtenerEstadoCaducidad(d) !== 'VIGENTE').length,
    [estado.documentos, hoy, limiteProximo],
  );

  const docsFiltrados = useMemo(() => {
    const q = busquedaDoc.trim().toLowerCase();
    return estado.documentos.filter((d) => {
      if (catFiltro !== 'TODAS' && d.categoria !== catFiltro) return false;
      const stCad = obtenerEstadoCaducidad(d);
      if (estadoFiltroDoc === 'ALERTAS' && stCad === 'VIGENTE') return false;
      if (estadoFiltroDoc === 'VIGENTES' && stCad !== 'VIGENTE') return false;
      if (!q) return true;
      return (
        d.titulo.toLowerCase().includes(q) ||
        (d.referencia || '').toLowerCase().includes(q) ||
        (d.animalCrotal || '').toLowerCase().includes(q)
      );
    });
  }, [estado.documentos, catFiltro, estadoFiltroDoc, busquedaDoc, hoy, limiteProximo]);

  const limpiarFormDoc = () => {
    setEditandoDocId(null);
    setDocTitulo('');
    setDocRef('');
    setDocCaducidad('');
    setMostrarFormDoc(false);
  };

  const iniciarEdicionDoc = (doc: DocumentoExplotacion) => {
    setEditandoDocId(doc.id);
    setDocCat(doc.categoria);
    setDocTitulo(doc.titulo);
    setDocRef(doc.referencia || '');
    setDocCaducidad(doc.fechaCaducidad || '');
    setMostrarFormDoc(true);
  };

  const handleGuardarDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitulo.trim()) return;
    if (editandoDocId && onEditarDocumento) {
      const original = estado.documentos.find((d) => d.id === editandoDocId);
      onEditarDocumento({
        id: editandoDocId,
        categoria: docCat,
        titulo: docTitulo.trim(),
        fechaEmision: original?.fechaEmision || hoy,
        fechaCaducidad: docCaducidad || undefined,
        referencia: docRef.trim() || undefined,
        animalCrotal: original?.animalCrotal,
        estado: docCaducidad && docCaducidad < hoy ? 'CADUCADO' : 'VIGENTE',
      });
    } else {
      onAnadirDocumento({
        id: `doc-${Date.now()}`,
        categoria: docCat,
        titulo: docTitulo.trim(),
        fechaEmision: hoy,
        fechaCaducidad: docCaducidad || undefined,
        referencia: docRef.trim() || undefined,
        estado: docCaducidad && docCaducidad < hoy ? 'CADUCADO' : 'VIGENTE',
      });
    }
    limpiarFormDoc();
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
      {/* Cabecera compacta + 4 iconos circulares */}
      <section className="card-surface space-y-4 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold text-[#0f1f18]">Gestión</h2>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {(
            [
              {
                id: 'ECONOMIA' as const,
                label: 'Economía',
                Icon: Euro,
                badge: estado.movimientosEconomicos?.length || 0,
                badgeClass: 'bg-emerald-600',
              },
              {
                id: 'DOCS' as const,
                label: 'Docs / Libros',
                Icon: FolderCheck,
                badge: estado.documentos.length,
                badgeClass: 'bg-emerald-600',
              },
              {
                id: 'ROBOT' as const,
                label: 'Robot / SITRAN',
                Icon: GitCompare,
                badge: numPendientesSitran,
                badgeClass:
                  sitranBadgeColor === 'red'
                    ? 'bg-red-600'
                    : sitranBadgeColor === 'orange'
                      ? 'bg-amber-500'
                      : 'bg-emerald-600',
              },
              {
                id: 'CROTALES' as const,
                label: 'Crotales',
                Icon: Tag,
                badge: crotalesDisponibles,
                badgeClass: crotalesDisponibles > 0 ? 'bg-emerald-600' : 'bg-red-600',
              },
            ] as const
          ).map((item) => {
            const activo = subTab === item.id;
            const Icono = item.Icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onCambiarSubTab(item.id)}
                className="group flex flex-col items-center gap-1.5 text-center"
              >
                <div
                  className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 bg-[#f8faf6] text-[#0f3d2e] shadow-xs transition group-hover:scale-105 ${
                    activo
                      ? 'border-[#0f3d2e] ring-2 ring-emerald-300'
                      : 'border-[#dce4d6]'
                  }`}
                >
                  <Icono className="h-6 w-6" />
                  <span
                    className={`absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white px-1 font-mono text-[11px] font-extrabold text-white shadow-xs ${item.badgeClass}`}
                  >
                    {item.badge}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-bold leading-tight ${
                    activo ? 'text-[#0f3d2e]' : 'text-[#4a5d54]'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {subTab === 'ROBOT' && robotContent}
      {subTab === 'CROTALES' && crotalesContent}

      {subTab === 'ECONOMIA' && (
        <SubVistaEconomiaEvolucion
          estado={estado}
          hoy={hoy}
          onAnadirMovimientoEconomico={onAnadirMovimientoEconomico}
          onEditarMovimientoEconomico={onEditarMovimientoEconomico}
          onEliminarMovimientoEconomico={onEliminarMovimientoEconomico}
        />
      )}

      {subTab === 'DOCS' && (
        <div className="space-y-4">
          {/* Tarjetas grandes de Libros Oficiales + Checklist de Inspección */}
          <section className="card-surface space-y-4 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-[#0f1f18]">
                  Libros Oficiales y Carpeta de Inspección
                </h3>
                <p className="text-xs text-[#52655c]">
                  Exportación directa en PDF oficial y control de caducidades
                </p>
              </div>
              {alertasDocsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setEstadoFiltroDoc(estadoFiltroDoc === 'ALERTAS' ? 'TODOS' : 'ALERTAS')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-950"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  {alertasDocsCount} por revisar / caducado(s)
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onAbrirLibrosOficiales('EXPLOTACION')}
                className="flex items-center justify-between gap-3 rounded-2xl bg-[#0f3d2e] p-4 text-left text-white shadow-xs transition hover:bg-[#175742]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <BookOpenCheck className="h-6 w-6 text-amber-300" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold">Libro de Explotación PDF</p>
                    <p className="text-[11px] text-emerald-100">
                      {estado.animales.filter((a) => a.estado === 'ACTIVO').length} reses activas ·{' '}
                      {estado.eventos.length} movimientos
                    </p>
                  </div>
                </div>
                <span className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-bold">
                  Abrir
                </span>
              </button>

              <button
                type="button"
                onClick={() => onAbrirLibrosOficiales('TRATAMIENTOS')}
                className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left text-emerald-950 shadow-xs transition hover:bg-emerald-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-200/80 text-emerald-900">
                    <Pill className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold">Libro de Tratamientos PDF</p>
                    <p className="text-[11px] text-emerald-800">
                      {(estado.tratamientos || []).length} tratamientos · Conservar 5 años
                    </p>
                  </div>
                </div>
                <span className="rounded-lg bg-emerald-200/70 px-2.5 py-1 text-[11px] font-bold">
                  Abrir
                </span>
              </button>
            </div>

            {/* Checklist rápido de inspección */}
            <div className="flex flex-wrap gap-2 rounded-xl bg-[#f8faf6] p-3 text-[11px] font-bold">
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-emerald-900">
                <CheckCircle2 className="h-3.5 w-3.5" /> Libro Explotación
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-emerald-900">
                <CheckCircle2 className="h-3.5 w-3.5" /> Libro Tratamientos
              </span>
              {(
                [
                  { cat: 'SANEAMIENTO', label: 'Saneamiento' },
                  { cat: 'PSI', label: 'Plan Sanitario (PSI)' },
                  { cat: 'RECETA_PRESVET', label: 'Recetas PRESVET' },
                ] as const
              ).map((chk) => {
                const tiene = estado.documentos.some(
                  (d) => d.categoria === chk.cat && obtenerEstadoCaducidad(d) !== 'CADUCADO',
                );
                return (
                  <span
                    key={chk.cat}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 ${
                      tiene ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {tiene ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    )}
                    {chk.label}
                  </span>
                );
              })}
            </div>
          </section>

          {/* Archivo documental con caducidad y edición */}
          <section className="card-surface space-y-4 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-extrabold text-[#0f1f18]">
                Documentos Archivados ({docsFiltrados.length})
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (mostrarFormDoc) limpiarFormDoc();
                  else setMostrarFormDoc(true);
                }}
                className="inline-flex items-center gap-1 rounded-xl bg-[#0f3d2e] px-3 py-2 text-xs font-extrabold text-white"
              >
                <Plus className="h-4 w-4 text-amber-300" />
                {mostrarFormDoc ? 'Cerrar' : 'Añadir documento'}
              </button>
            </div>

            {mostrarFormDoc && (
              <form
                onSubmit={handleGuardarDoc}
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
                  placeholder="Título del documento *"
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
                  {editandoDocId ? 'Guardar cambios' : 'Archivar'}
                </button>
              </form>
            )}

            {/* Buscador + filtros por categoría y estado */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#70857a]" />
                <input
                  type="text"
                  value={busquedaDoc}
                  onChange={(e) => setBusquedaDoc(e.target.value)}
                  placeholder="Buscar documento, crotal o referencia..."
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
              <select
                value={estadoFiltroDoc}
                onChange={(e) =>
                  setEstadoFiltroDoc(e.target.value as 'TODOS' | 'ALERTAS' | 'VIGENTES')
                }
                className="rounded-xl border border-[#dce4d6] bg-white px-3 py-2 text-xs font-bold text-[#1f3329]"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="ALERTAS">Caducan / Caducados</option>
                <option value="VIGENTES">Solo vigentes</option>
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {docsFiltrados.length === 0 ? (
                <p className="rounded-xl bg-[#f8faf6] py-6 text-center text-xs text-[#52655c] md:col-span-2">
                  No hay documentos que coincidan con este filtro.
                </p>
              ) : (
                docsFiltrados.map((doc) => {
                  const st = estiloDoc(doc.categoria);
                  const Icono = st.Icon;
                  const cad = obtenerEstadoCaducidad(doc);
                  return (
                    <div
                      key={doc.id}
                      className={`flex items-start gap-3 rounded-xl border p-3.5 ${
                        cad === 'CADUCADO'
                          ? 'border-red-300 bg-red-50/50'
                          : cad === 'CADUCA_PRONTO'
                            ? 'border-amber-300 bg-amber-50/50'
                            : 'border-[#e6ece2] bg-[#fafbf8]'
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${st.bg}`}
                      >
                        <Icono className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${st.pill}`}
                          >
                            {doc.categoria}
                          </span>
                          {cad === 'CADUCADO' && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-800">
                              <AlertTriangle className="h-3 w-3" /> CADUCADO
                            </span>
                          )}
                          {cad === 'CADUCA_PRONTO' && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
                              <Clock className="h-3 w-3" /> CADUCA PRONTO
                            </span>
                          )}
                        </div>
                        <h4 className="mt-1 text-sm font-extrabold text-[#0f1f18]">{doc.titulo}</h4>
                        <p className="mt-0.5 text-xs text-[#52655c]">
                          Emisión: {formatearFechaEs(doc.fechaEmision)}
                          {doc.fechaCaducidad
                            ? ` · Caduca: ${formatearFechaEs(doc.fechaCaducidad)}`
                            : ''}
                        </p>
                        {doc.referencia && (
                          <p className="mt-0.5 font-mono text-[11px] font-semibold text-[#31453b]">
                            Ref: {doc.referencia}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        {onEditarDocumento && (
                          <button
                            type="button"
                            aria-label={`Editar ${doc.titulo}`}
                            onClick={() => iniciarEdicionDoc(doc)}
                            className="rounded-lg p-1.5 text-[#52655c] hover:bg-emerald-100 hover:text-[#0f3d2e]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {onEliminarDocumento && (
                          <button
                            type="button"
                            aria-label={`Eliminar ${doc.titulo}`}
                            onClick={() => onEliminarDocumento(doc.id)}
                            className="rounded-lg p-1.5 text-[#70857a] hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

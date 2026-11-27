import {
  BookOpenCheck,
  Euro,
  FileCheck2,
  FileScan,
  FileText,
  FolderCheck,
  Pill,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatearFechaEs, hoyIso } from '../domain/fechas';
import type {
  DocumentoExplotacion,
  EstadoGanaderia,
  MovimientoEconomico,
} from '../domain/types';
import { SubVistaEconomiaEvolucion } from './SubVistaSaneamientoEconomia';

interface Props {
  estado: EstadoGanaderia;
  onAnadirMovimientoEconomico: (mov: MovimientoEconomico) => void;
  onAnadirDocumento: (doc: DocumentoExplotacion) => void;
  onAbrirEscanerOcr: () => void;
  onAbrirLibrosOficiales: (libro?: 'EXPLOTACION' | 'TRATAMIENTOS') => void;
}

export function VistaGestionEconomiaDocs({
  estado,
  onAnadirMovimientoEconomico,
  onAnadirDocumento,
  onAbrirEscanerOcr,
  onAbrirLibrosOficiales,
}: Props) {
  const hoy = hoyIso();
  const [subTab, setSubTab] = useState<'ECONOMIA' | 'DOCS'>('ECONOMIA');
  const [busquedaDoc, setBusquedaDoc] = useState('');
  const [catFiltro, setCatFiltro] = useState<'TODAS' | DocumentoExplotacion['categoria']>('TODAS');
  const [mostrarFormDoc, setMostrarFormDoc] = useState(false);
  const [docTitulo, setDocTitulo] = useState('');
  const [docCat, setDocCat] = useState<DocumentoExplotacion['categoria']>('SANEAMIENTO');
  const [docRef, setDocRef] = useState('');
  const [docCaducidad, setDocCaducidad] = useState('');

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

  const handleCrearDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitulo.trim()) return;
    onAnadirDocumento({
      id: `doc-${Date.now()}`,
      categoria: docCat,
      titulo: docTitulo.trim(),
      fechaEmision: hoy,
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
      {/* Cabecera compacta + 2 iconos circulares */}
      <section className="card-surface space-y-4 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold text-[#0f1f18]">Gestión</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(
            [
              {
                id: 'ECONOMIA' as const,
                label: 'Economía',
                Icon: Euro,
                badge: estado.movimientosEconomicos?.length || 0,
              },
              {
                id: 'DOCS' as const,
                label: 'Documentos / Libros',
                Icon: FolderCheck,
                badge: estado.documentos.length,
              },
            ] as const
          ).map((item) => {
            const activo = subTab === item.id;
            const Icono = item.Icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSubTab(item.id)}
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
                  <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-600 px-1 font-mono text-[11px] font-extrabold text-white shadow-xs">
                    {item.badge}
                  </span>
                </div>
                <span
                  className={`text-xs font-bold ${
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

      {subTab === 'ECONOMIA' && (
        <SubVistaEconomiaEvolucion
          estado={estado}
          hoy={hoy}
          onAnadirMovimientoEconomico={onAnadirMovimientoEconomico}
        />
      )}

      {subTab === 'DOCS' && (
        <section className="card-surface space-y-4 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-extrabold text-[#0f1f18]">
              Carpeta de Inspección y Libros Oficiales
            </h3>
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

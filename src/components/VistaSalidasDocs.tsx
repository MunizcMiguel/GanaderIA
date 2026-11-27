import {
  AlertOctagon,
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  FileCheck2,
  FileScan,
  FileText,
  FolderCheck,
  Pill,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { estaEnSupresionCarne, validarAnimalesParaSalida } from '../domain/alertas';
import { generarResumenTextoGuiaSalida } from '../domain/exportadores';
import { formatearFechaEs, hoyIso } from '../domain/fechas';
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

export function VistaSalidasDocs({
  estado,
  onRegistrarSalidaLote,
  onAnadirDocumento,
  onAbrirEscanerOcr,
  onAbrirLibrosOficiales,
}: Props) {
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [tipoSalida, setTipoSalida] = useState<
    'SALIDA_MATADERO' | 'SALIDA_MERCADO' | 'SALIDA_PASTOS' | 'VENTA'
  >('SALIDA_MATADERO');
  const [destino, setDestino] = useState('Matadero Central de Asturias (Noreña)');
  const [regaDestino, setRegaDestino] = useState('');
  const [fechaSalida, setFechaSalida] = useState(hoyIso());
  const [importeTotalEur, setImporteTotalEur] = useState('');
  const [medioTransporte, setMedioTransporte] = useState<MedioTransporteRemoWeb>('CAMION');
  const [codigoSirentra, setCodigoSirentra] = useState(
    estado.explotacion.codigoSirentraHabitual || '',
  );
  const [matriculaVehiculo, setMatriculaVehiculo] = useState('');
  const [horaSalida, setHoraSalida] = useState('08:00');

  const [docTitulo, setDocTitulo] = useState('');
  const [docCat, setDocCat] = useState<DocumentoExplotacion['categoria']>('SANEAMIENTO');
  const [docRef, setDocRef] = useState('');
  const [docCaducidad, setDocCaducidad] = useState('');

  const activos = useMemo(
    () => estado.animales.filter((a) => a.estado === 'ACTIVO'),
    [estado.animales],
  );

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

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const cambiarDestinoPreset = (
    nuevoTipo: 'SALIDA_MATADERO' | 'SALIDA_MERCADO' | 'SALIDA_PASTOS' | 'VENTA',
  ) => {
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
  };

  const estiloDoc = (cat: DocumentoExplotacion['categoria']) => {
    switch (cat) {
      case 'SANEAMIENTO':
        return { bg: 'bg-emerald-100 text-emerald-900', pill: 'bg-emerald-50 text-emerald-900', Icon: ShieldCheck };
      case 'RECETA_PRESVET':
        return { bg: 'bg-sky-100 text-sky-900', pill: 'bg-sky-50 text-sky-900', Icon: Pill };
      case 'DIB':
        return { bg: 'bg-amber-100 text-amber-900', pill: 'bg-amber-50 text-amber-900', Icon: FileCheck2 };
      default:
        return { bg: 'bg-[#edf1e9] text-[#2b4036]', pill: 'bg-[#f4f6f1] text-[#31453b]', Icon: FileText };
    }
  };

  return (
    <div className="animate-fade-up space-y-6">
      {/* Preparador de Lotes de Salida en 3 pasos claros */}
      <section className="card-surface space-y-5 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-900">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#0f1f18]">
              Preparador de Salidas (Matadero / Mercado / Pastos) con Bloqueo Sanitario
            </h2>
            <p className="mt-0.5 text-xs text-[#52655c]">
              Verificación automática de supresión de medicamentos, crotales y alta oficial antes de
              generar el borrador de la Guía de Origen y Sanidad Pecuaria.
            </p>
          </div>
        </div>

        {/* Paso 1: Destino y fecha */}
        <div className="rounded-2xl border border-[#e6ece2] bg-[#f8faf6] p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900">
            Paso 1 · Destino y fecha de salida
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-bold text-[#31453b]">
              Tipo de movimiento
              <select
                value={tipoSalida}
                onChange={(e) =>
                  cambiarDestinoPreset(
                    e.target.value as
                      | 'SALIDA_MATADERO'
                      | 'SALIDA_MERCADO'
                      | 'SALIDA_PASTOS'
                      | 'VENTA',
                  )
                }
                className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-3 py-2 text-xs font-semibold focus:border-emerald-600 focus:outline-none"
              >
                <option value="SALIDA_MATADERO">Salida a Matadero</option>
                <option value="SALIDA_MERCADO">Mercado (ej. Pola de Siero)</option>
                <option value="SALIDA_PASTOS">Subida a Pastos / Puerto</option>
                <option value="VENTA">Venta a otra explotación</option>
              </select>
            </label>
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
            <label className="text-xs font-bold text-[#31453b] sm:col-span-2">
              Código REGA destino (opcional)
              <input
                type="text"
                placeholder="Ej: ES330440009999"
                value={regaDestino}
                onChange={(e) => setRegaDestino(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-3 py-2 font-mono text-xs focus:border-emerald-600 focus:outline-none"
              />
            </label>
            {(tipoSalida === 'SALIDA_MATADERO' || tipoSalida === 'VENTA') && (
              <label className="text-xs font-bold text-[#31453b] sm:col-span-2">
                Importe total venta (€, opcional — apunta ingreso en Economía)
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
            <label className="text-xs font-bold text-[#31453b]">
              Medio de transporte
              <select
                value={medioTransporte}
                onChange={(e) => setMedioTransporte(e.target.value as MedioTransporteRemoWeb)}
                className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-3 py-2 text-xs font-semibold"
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
              Código SIRENTRA vehículo
              <input
                type="text"
                placeholder="ATES33000012345"
                value={codigoSirentra}
                onChange={(e) => setCodigoSirentra(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-3 py-2 font-mono text-xs"
              />
            </label>
            <label className="text-xs font-bold text-[#31453b]">
              Matrícula / Bastidor
              <input
                type="text"
                placeholder="1234-LMN"
                value={matriculaVehiculo}
                onChange={(e) => setMatriculaVehiculo(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-3 py-2 font-mono text-xs"
              />
            </label>
            <label className="text-xs font-bold text-[#31453b]">
              Hora prevista salida
              <input
                type="time"
                value={horaSalida}
                onChange={(e) => setHoraSalida(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-3 py-2 text-xs"
              />
            </label>
          </div>

          {avisosRemoWebGuia.length > 0 && (
            <div className="mt-3 space-y-1 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs">
              <p className="font-extrabold text-amber-950">
                Pre-chequeo RemoWeb (plazos +8d/+5d, SIRENTRA y Lengua Azul):
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
        </div>

        {/* Paso 2: Selector de animales con etiquetas preventivas */}
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900">
            Paso 2 · Selecciona los animales del lote ({seleccionados.length} marcado(s))
          </p>
          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {activos.map((a) => {
              const checked = seleccionados.includes(a.id);
              const enSupCarne = estaEnSupresionCarne(a, fechaSalida);
              const faltaCrotal =
                a.estadoCrotal !== 'OK';
              const sinAltaOficial = !a.enCensoOficial;

              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleSeleccion(a.id)}
                  className={`flex flex-col gap-2 rounded-xl border p-3 text-left text-xs transition ${
                    checked
                      ? enSupCarne
                        ? 'border-red-500 bg-red-50/80 text-red-950'
                        : 'border-[#0f3d2e] bg-emerald-50/80 text-emerald-950'
                      : 'border-[#dce4d6] bg-white text-[#1f3329] hover:border-emerald-300 hover:bg-[#f8faf6]'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <div>
                      <span className="rounded-md bg-amber-200 px-1.5 py-0.5 font-mono text-xs font-extrabold text-amber-950">
                        #{a.numeroCorto}
                      </span>{' '}
                      <span className="font-bold">{a.nombre || a.raza}</span>
                      <p className="mt-0.5 font-mono text-[11px] text-[#52655c]">{a.crotal}</p>
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

                  {/* Badges preventivos visibles ANTES de seleccionar */}
                  {(enSupCarne || sinAltaOficial || faltaCrotal) && (
                    <div className="flex flex-wrap gap-1">
                      {enSupCarne && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-extrabold text-red-800">
                          <ShieldAlert className="h-3 w-3" />
                          Supresión carne
                        </span>
                      )}
                      {sinAltaOficial && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                          <AlertTriangle className="h-3 w-3" />
                          Sin alta Principado
                        </span>
                      )}
                      {faltaCrotal && (
                        <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                          {a.estadoCrotal === 'PENDIENTE_COLOCAR'
                            ? 'Sin crotal'
                            : 'Falta crotal'}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Paso 3: Resultado de validación automática */}
        {validaciones.length > 0 && (
          <div className="space-y-3 rounded-2xl border border-[#dce4d6] bg-[#f8faf6] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-extrabold">
                {hayBloqueos ? (
                  <>
                    <AlertOctagon className="h-5 w-5 text-red-600" />
                    <span className="text-red-800">
                      Paso 3 · Salida bloqueada: revisa las incidencias sanitarias o de registro
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5 text-emerald-700" />
                    <span className="text-emerald-900">
                      Paso 3 · Lote apto para salida — sin bloqueos sanitarios ni de identificación
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <BotonCopiar valor={resumenGuia} etiqueta="Copiar borrador guía" />
                <button
                  type="button"
                  disabled={hayBloqueos}
                  onClick={handleConfirmarSalida}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f3d2e] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#16523e] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Registrar salida y enviar a Cola RemoWeb
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {validaciones.map((v) => (
                <div
                  key={v.animalId}
                  className={`rounded-xl border p-3 text-xs ${
                    v.apto
                      ? 'border-emerald-200 bg-white text-[#1f3329]'
                      : 'border-red-300 bg-red-50 text-red-950'
                  }`}
                >
                  <div className="font-mono font-extrabold">{v.crotal}</div>
                  {v.bloqueos.map((b, i) => (
                    <p key={i} className="mt-1 font-bold text-red-800">
                      • {b}
                    </p>
                  ))}
                  {v.advertencias.map((adv, i) => (
                    <p key={i} className="mt-1 font-medium text-amber-900">
                      • Aviso: {adv}
                    </p>
                  ))}
                  {v.apto && v.advertencias.length === 0 && (
                    <p className="mt-0.5 font-semibold text-emerald-800">
                      • Verificado OK (sin supresión, alta oficial y DIB listo).
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Gestor Documental de Inspección */}
      <section className="card-surface rounded-2xl p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900">
              <FolderCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#0f1f18]">
                Carpeta de Inspección (Saneamiento, PSI, Recetas PRESVET y DIBs)
              </h2>
              <p className="text-xs text-[#52655c]">
                Todo ordenado por categoría y caducidad para mostrarlo en 5 segundos ante una
                inspección.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onAbrirLibrosOficiales('EXPLOTACION')}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#0f3d2e] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#175742]"
            >
              <BookOpenCheck className="h-4 w-4 text-amber-300" />
              Libro Explotación PDF
            </button>
            <button
              type="button"
              onClick={() => onAbrirLibrosOficiales('TRATAMIENTOS')}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-950 hover:bg-emerald-100"
            >
              <Pill className="h-4 w-4" />
              Libro Tratamientos PDF
            </button>
            <button
              type="button"
              onClick={onAbrirEscanerOcr}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-sky-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-sky-800"
            >
              <FileScan className="h-4 w-4" />
              Escanear Receta / DIB (OCR)
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {estado.documentos.map((doc) => {
            const st = estiloDoc(doc.categoria);
            const Icono = st.Icon;
            return (
              <div
                key={doc.id}
                className="flex items-start gap-3 rounded-xl border border-[#e6ece2] bg-[#fafbf8] p-4"
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

        <form
          onSubmit={handleCrearDoc}
          className="mt-4 grid gap-2.5 rounded-2xl border border-dashed border-[#cfd9c8] bg-[#f8faf6] p-4 sm:grid-cols-4"
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
            placeholder="Referencia / Código (opcional)"
            value={docRef}
            onChange={(e) => setDocRef(e.target.value)}
            className="rounded-xl border border-[#dce4d6] bg-white px-2.5 py-2 text-xs sm:col-span-3"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#0f3d2e] px-3 py-2 text-xs font-bold text-white hover:bg-[#16523e]"
          >
            <Plus className="h-4 w-4 text-amber-300" />
            Añadir documento
          </button>
        </form>
      </section>
    </div>
  );
}

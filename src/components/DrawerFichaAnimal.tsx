import {
  Activity,
  Baby,
  CalendarHeart,
  Camera,
  Droplets,
  FileCheck2,
  FileText,
  GitBranch,
  Pill,
  Plus,
  Scale,
  ShieldAlert,
  Tag,
  Trash2,
  UserMinus,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { estaEnSupresionCarne, estaEnSupresionLeche } from '../domain/alertas';
import { calcularDEL } from '../domain/analiticaGanadero';
import { normalizarCrotal } from '../domain/crotales';
import { diferenciaDias, formatearFechaEs, hoyIso } from '../domain/fechas';
import {
  calcularConsanguinidadPotencial,
  calcularGmdAnimal,
  calcularUGMAnimal,
  construirArbolGenealogico,
  formatearEdadExacta,
} from '../domain/gestionAvanzada';
import { INCIDENCIAS_META, obtenerCorralesActivos } from '../domain/incidencias';
import type {
  CuarteronUbre,
  EstadoCrotalFisico,
  EstadoGanaderia,
  TipoIncidenciaClinica,
  TipoPesaje,
  UnidadGanadera,
} from '../domain/types';
import { BotonCopiar } from './BadgeNivel';
import { CrotalVisual } from './CrotalVisual';

interface Props {
  animal: UnidadGanadera;
  estado: EstadoGanaderia;
  onCerrar: () => void;
  onCambiarEstadoCrotal: (animalId: string, nuevo: EstadoCrotalFisico) => void;
  onCambiarCorral: (animalId: string, corralId: string | undefined) => void;
  onRegistrarIncidencia: (datos: {
    animalId: string;
    tipo: TipoIncidenciaClinica;
    cuarteron?: CuarteronUbre;
    notas?: string;
  }) => void;
  onRegistrarPesaje?: (datos: {
    animalId: string;
    fecha: string;
    pesoKg: number;
    tipo: TipoPesaje;
    notas?: string;
  }) => void;
  onActualizarFoto?: (animalId: string, fotoDataUrl: string | undefined) => void;
  onActualizarFechaOficial?: (animalId: string, fechaOficial: string | undefined) => void;
  onToggleDib: (animalId: string) => void;
  onAbrirTratamiento: (animal: UnidadGanadera) => void;
  onAbrirBajaAnimal: (animal: UnidadGanadera) => void;
  onSeleccionarOtroAnimal: (animal: UnidadGanadera) => void;
}

function comprimirImagenADataUrl(file: File, maxSide = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function DrawerFichaAnimal({
  animal,
  estado,
  onCerrar,
  onCambiarEstadoCrotal,
  onCambiarCorral,
  onRegistrarIncidencia,
  onRegistrarPesaje,
  onActualizarFoto,
  onActualizarFechaOficial,
  onToggleDib,
  onAbrirTratamiento,
  onAbrirBajaAnimal,
  onSeleccionarOtroAnimal,
}: Props) {
  const hoy = hoyIso();
  const esCarne = estado.explotacion.orientacionProductiva === 'CARNE';
  const supLeche = estaEnSupresionLeche(animal, hoy);
  const supCarne = estaEnSupresionCarne(animal, hoy);
  const crotalNorm = normalizarCrotal(animal.crotal);
  const del = !esCarne ? calcularDEL(animal, hoy) : undefined;
  const corrales = obtenerCorralesActivos(estado);
  const ugmAnimal = calcularUGMAnimal(animal, hoy);
  const fotoInputRef = useRef<HTMLInputElement | null>(null);

  const [mostrarFormInc, setMostrarFormInc] = useState(false);
  const [tipoInc, setTipoInc] = useState<TipoIncidenciaClinica>(esCarne ? 'COJERA' : 'MAMITIS');
  const [cuarteron, setCuarteron] = useState<CuarteronUbre>('PI');
  const [notasInc, setNotasInc] = useState('');

  const [mostrarFormPeso, setMostrarFormPeso] = useState(false);
  const [pesoKg, setPesoKg] = useState('');
  const [fechaPeso, setFechaPeso] = useState(hoy);
  const [tipoPeso, setTipoPeso] = useState<TipoPesaje>('CONTROL');
  const [notasPeso, setNotasPeso] = useState('');

  const [editFechaOficial, setEditFechaOficial] = useState(false);
  const [fechaOficialVal, setFechaOficialVal] = useState(animal.fechaNacimientoOficial || '');

  useEffect(() => {
    setFechaOficialVal(animal.fechaNacimientoOficial || '');
    setEditFechaOficial(false);
  }, [animal.id, animal.fechaNacimientoOficial]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCerrar]);

  const madre = animal.crotalMadre
    ? estado.animales.find((a) => normalizarCrotal(a.crotal) === normalizarCrotal(animal.crotalMadre!))
    : undefined;

  const crias = estado.animales.filter(
    (a) => a.crotalMadre && normalizarCrotal(a.crotalMadre) === crotalNorm,
  );

  const resumenPesos = useMemo(
    () => calcularGmdAnimal(animal.id, estado.pesajes),
    [animal.id, estado.pesajes],
  );

  const pedigri = useMemo(
    () => construirArbolGenealogico(animal, estado.animales, 3),
    [animal, estado.animales],
  );

  const consanguinidadPropia = useMemo(
    () =>
      calcularConsanguinidadPotencial(
        animal.crotalMadre,
        animal.crotalPadre || animal.padreNombre,
        estado.animales,
      ),
    [animal.crotalMadre, animal.crotalPadre, animal.padreNombre, estado.animales],
  );

  const eventosAnimal = estado.eventos
    .filter((e) => e.animalId === animal.id || normalizarCrotal(e.crotal) === crotalNorm)
    .sort((a, b) => b.fechaEvento.localeCompare(a.fechaEvento));

  const incidenciasAnimal = (estado.incidencias || [])
    .filter((i) => i.animalId === animal.id || normalizarCrotal(i.crotal) === crotalNorm)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const ultimoControl = !esCarne
    ? [...(estado.controlesLecheros || [])]
        .filter((c) => c.animalId === animal.id || normalizarCrotal(c.crotal) === crotalNorm)
        .sort((a, b) => b.fechaControl.localeCompare(a.fechaControl))[0]
    : undefined;

  const inseminacionesAnimal = (estado.inseminaciones || []).filter(
    (i) => i.animalId === animal.id || normalizarCrotal(i.crotal) === crotalNorm,
  );

  const docsAnimal = estado.documentos.filter(
    (d) => d.animalCrotal && normalizarCrotal(d.animalCrotal) === crotalNorm,
  );

  const handleGuardarIncidencia = (e: React.FormEvent) => {
    e.preventDefault();
    onRegistrarIncidencia({
      animalId: animal.id,
      tipo: tipoInc,
      cuarteron: tipoInc === 'MAMITIS' ? cuarteron : undefined,
      notas: notasInc.trim() || undefined,
    });
    setNotasInc('');
    setMostrarFormInc(false);
  };

  const handleGuardarPeso = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(pesoKg.replace(',', '.'));
    if (!onRegistrarPesaje || Number.isNaN(num) || num <= 0) return;
    onRegistrarPesaje({
      animalId: animal.id,
      fecha: fechaPeso,
      pesoKg: num,
      tipo: tipoPeso,
      notas: notasPeso.trim() || undefined,
    });
    setPesoKg('');
    setNotasPeso('');
    setMostrarFormPeso(false);
  };

  const handleSubirFoto = async (file: File | undefined) => {
    if (!file || !onActualizarFoto) return;
    try {
      const dataUrl = await comprimirImagenADataUrl(file);
      onActualizarFoto(animal.id, dataUrl);
    } catch {
      // ignora errores de lectura de imagen
    }
  };

  const prefijoCrotal = animal.crotal.slice(0, Math.max(0, animal.crotal.length - 4));
  const ultimos4 = animal.crotal.slice(-4);

  // Gráfica SVG de crecimiento si hay >= 2 pesajes
  const puntosCurvaPeso = useMemo(() => {
    const lista = resumenPesos.pesajesOrdenados;
    if (lista.length < 2) return null;
    const minP = Math.min(...lista.map((p) => p.pesoKg));
    const maxP = Math.max(...lista.map((p) => p.pesoKg));
    const rango = Math.max(1, maxP - minP);
    const w = 280;
    const h = 74;
    const padX = 12;
    const padY = 10;
    const coords = lista.map((p, idx) => {
      const x = padX + (idx / (lista.length - 1)) * (w - padX * 2);
      const y = h - padY - ((p.pesoKg - minP) / rango) * (h - padY * 2);
      return { x, y, pesoKg: p.pesoKg, fecha: p.fecha };
    });
    const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
    return { w, h, coords, path };
  }, [resumenPesos.pesajesOrdenados]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ficha de ${animal.nombre || animal.crotal}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
      className="fixed inset-0 z-50 flex justify-end bg-[#0b1f17]/45 backdrop-blur-[2px]"
    >
      <div className="animate-drawer-in flex h-full w-full max-w-lg flex-col bg-[#f7f9f5] shadow-2xl">
        {/* Cabecera fija */}
        <div className="flex items-center justify-between border-b border-[#e1e7dc] bg-white px-5 py-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Ficha Individual SITRAN · {animal.especie}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-extrabold text-[#0f1f18]">
                {animal.nombre || `Res #${animal.numeroCorto}`}
              </h3>
              {del !== undefined && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-extrabold text-emerald-900">
                  {del} DEL
                </span>
              )}
              {ugmAnimal > 0 && (
                <span className="rounded-full bg-[#edf1e9] px-2 py-0.5 font-mono text-[11px] font-bold text-[#31453b]">
                  {ugmAnimal} UGM
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar ficha"
            className="rounded-xl border border-[#e1e7dc] p-2 text-[#52655c] hover:bg-[#f4f6f1]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido desplazable */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Crotal oficial + Foto del animal + resumen */}
          <div className="card-surface flex flex-col items-center gap-4 rounded-2xl p-5 sm:flex-row">
            <div className="flex flex-col items-center gap-2">
              {animal.fotoDataUrl ? (
                <div className="relative">
                  <img
                    src={animal.fotoDataUrl}
                    alt={animal.nombre || animal.crotal}
                    className="h-24 w-24 rounded-2xl border-2 border-[#dce4d6] object-cover shadow-xs"
                  />
                  {onActualizarFoto && (
                    <button
                      type="button"
                      onClick={() => onActualizarFoto(animal.id, undefined)}
                      title="Quitar foto"
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-1 text-red-600 shadow hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ) : (
                <CrotalVisual
                  crotal={animal.crotal}
                  numeroCorto={animal.numeroCorto}
                  especie={animal.especie}
                  estadoCrotal={animal.estadoCrotal}
                  variante="tarjeta"
                />
              )}

              {onActualizarFoto && (
                <>
                  <input
                    ref={fotoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleSubirFoto(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    onClick={() => fotoInputRef.current?.click()}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#dce4d6] bg-[#f8faf6] px-2.5 py-1 text-[11px] font-bold text-[#31453b] hover:bg-[#edf1e9]"
                  >
                    <Camera className="h-3 w-3" />
                    {animal.fotoDataUrl ? 'Cambiar foto' : 'Añadir foto'}
                  </button>
                </>
              )}
            </div>

            <div className="w-full space-y-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    animal.estado === 'ACTIVO'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {animal.estado === 'ACTIVO' ? 'Activa en granja' : animal.estado}
                </span>
                {!animal.enCensoOficial && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                    Pendiente Principado
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <code className="text-xs text-[#4a5d54]">
                  {prefijoCrotal}
                  <strong className="font-extrabold text-[#0f1f18]">{ultimos4}</strong>
                </code>
                <BotonCopiar valor={animal.crotal} etiqueta="Copiar" compacto />
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1 text-[#4a5d54]">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider">Raza</dt>
                  <dd className="font-bold text-[#0f1f18]">{animal.raza}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider">Sexo</dt>
                  <dd className="font-bold text-[#0f1f18]">
                    {animal.sexo === 'H' ? 'Hembra' : 'Macho'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider">Nacimiento real</dt>
                  <dd className="font-bold text-[#0f1f18]">
                    {formatearFechaEs(animal.fechaNacimiento)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider">Edad exacta</dt>
                  <dd className="font-bold text-[#0f1f18]">
                    {formatearEdadExacta(animal.fechaNacimiento, hoy)}
                  </dd>
                </div>
              </dl>

              {/* Fecha oficial si difiere */}
              <div className="pt-1 text-[11px] text-[#52655c]">
                {editFechaOficial && onActualizarFechaOficial ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={fechaOficialVal}
                      onChange={(e) => setFechaOficialVal(e.target.value)}
                      className="rounded-lg border border-[#dce4d6] bg-white px-2 py-1 text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onActualizarFechaOficial(animal.id, fechaOficialVal || undefined);
                        setEditFechaOficial(false);
                      }}
                      className="rounded-lg bg-[#0f3d2e] px-2 py-1 font-bold text-white"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span>
                      Fecha oficial DIB:{' '}
                      <strong className="text-[#0f1f18]">
                        {animal.fechaNacimientoOficial
                          ? formatearFechaEs(animal.fechaNacimientoOficial)
                          : 'Igual que real'}
                      </strong>
                    </span>
                    {onActualizarFechaOficial && (
                      <button
                        type="button"
                        onClick={() => setEditFechaOficial(true)}
                        className="font-bold text-emerald-800 hover:underline"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Último Control Lechero ASCOL (solo Leche/Mixta) */}
          {ultimoControl && (
            <div className="card-surface flex items-center justify-between gap-3 rounded-2xl bg-sky-50/50 p-4 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-900">
                  <Droplets className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-extrabold text-[#0f1f18]">
                    Último Control Lechero ({formatearFechaEs(ultimoControl.fechaControl)})
                  </p>
                  <p className="text-[#4a5d54]">
                    <strong>{ultimoControl.litrosDia.toFixed(1)} L/d</strong> · Grasa{' '}
                    {ultimoControl.grasaPct}% · Prot {ultimoControl.proteinaPct}%
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-extrabold ${
                  ultimoControl.rcsMiles >= 200
                    ? 'bg-red-100 text-red-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                RCS {ultimoControl.rcsMiles}k
              </span>
            </div>
          )}

          {/* Alerta de supresión activa */}
          {(supLeche || supCarne) && animal.supresionActiva && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-950">
              <div className="flex items-center gap-2 font-extrabold text-red-800">
                <ShieldAlert className="h-4 w-4" />
                SUPRESIÓN SANITARIA ACTIVA
              </div>
              <p className="mt-1 font-semibold">{animal.supresionActiva.medicamento}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {supLeche && animal.supresionActiva.finSupresionLeche && (
                  <span className="rounded-lg bg-red-600 px-2.5 py-1 font-mono text-[11px] font-bold text-white">
                    Leche hasta {formatearFechaEs(animal.supresionActiva.finSupresionLeche)} (
                    {diferenciaDias(animal.supresionActiva.finSupresionLeche, hoy)}d)
                  </span>
                )}
                {supCarne && animal.supresionActiva.finSupresionCarne && (
                  <span className="rounded-lg bg-red-100 px-2.5 py-1 font-mono text-[11px] font-bold text-red-900">
                    Carne hasta {formatearFechaEs(animal.supresionActiva.finSupresionCarne)} (
                    {diferenciaDias(animal.supresionActiva.finSupresionCarne, hoy)}d)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Pesos, Destete y Curva de Crecimiento (GMD) */}
          <div className="card-surface space-y-3 rounded-2xl p-4 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-[#52655c]">
                <Scale className="h-4 w-4 text-emerald-700" />
                <span>Pesos, Destete y GMD</span>
              </div>
              {onRegistrarPesaje && animal.estado === 'ACTIVO' && (
                <button
                  type="button"
                  onClick={() => setMostrarFormPeso((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-900 hover:bg-emerald-100"
                >
                  <Plus className="h-3 w-3" />
                  Nuevo pesaje
                </button>
              )}
            </div>

            {mostrarFormPeso && onRegistrarPesaje && (
              <form
                onSubmit={handleGuardarPeso}
                className="space-y-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3"
              >
                <div className="grid grid-cols-3 gap-2">
                  <label className="text-[11px] font-bold text-[#31453b]">
                    Peso (kg) *
                    <input
                      type="number"
                      step="0.1"
                      min="5"
                      required
                      value={pesoKg}
                      onChange={(e) => setPesoKg(e.target.value)}
                      placeholder="Ej: 185"
                      className="mt-1 w-full rounded-lg border border-[#dce4d6] bg-white px-2.5 py-1.5 font-mono text-xs"
                    />
                  </label>
                  <label className="text-[11px] font-bold text-[#31453b]">
                    Fecha
                    <input
                      type="date"
                      value={fechaPeso}
                      onChange={(e) => setFechaPeso(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#dce4d6] bg-white px-2 py-1.5 text-xs"
                    />
                  </label>
                  <label className="text-[11px] font-bold text-[#31453b]">
                    Etapa
                    <select
                      value={tipoPeso}
                      onChange={(e) => setTipoPeso(e.target.value as TipoPesaje)}
                      className="mt-1 w-full rounded-lg border border-[#dce4d6] bg-white px-2 py-1.5 text-xs"
                    >
                      <option value="CONTROL">Control</option>
                      <option value="NACIMIENTO">Nacimiento</option>
                      <option value="DESTETE">Destete</option>
                      <option value="CEBADERO">Cebadero</option>
                      <option value="VENTA">Venta</option>
                    </select>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={notasPeso}
                    onChange={(e) => setNotasPeso(e.target.value)}
                    placeholder="Nota rápida (opcional)..."
                    className="flex-1 rounded-lg border border-[#dce4d6] bg-white px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-[#0f3d2e] px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            )}

            {resumenPesos.pesajesOrdenados.length === 0 ? (
              <p className="text-[#52655c]">
                Sin pesajes registrados. Añade 2 pesos para calcular la Ganancia Media Diaria (GMD).
              </p>
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-[#f8faf6] p-2.5">
                    <span className="text-[10px] uppercase text-[#52655c]">Último peso</span>
                    <p className="font-mono text-sm font-extrabold text-[#0f1f18]">
                      {resumenPesos.pesoActualKg} kg
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f8faf6] p-2.5">
                    <span className="text-[10px] uppercase text-[#52655c]">GMD</span>
                    <p className="font-mono text-sm font-extrabold text-emerald-800">
                      {resumenPesos.gmdKgDia !== undefined
                        ? `${resumenPesos.gmdKgDia.toFixed(2)} kg/d`
                        : '—'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f8faf6] p-2.5">
                    <span className="text-[10px] uppercase text-[#52655c]">Ganancia</span>
                    <p className="font-mono text-sm font-extrabold text-[#0f1f18]">
                      {resumenPesos.gananciaTotalKg !== undefined
                        ? `+${resumenPesos.gananciaTotalKg} kg`
                        : '—'}
                    </p>
                  </div>
                </div>

                {puntosCurvaPeso && (
                  <div className="rounded-xl border border-[#e6ece2] bg-white p-2.5">
                    <svg
                      viewBox={`0 0 ${puntosCurvaPeso.w} ${puntosCurvaPeso.h}`}
                      className="h-20 w-full overflow-visible"
                      aria-label="Curva de crecimiento de peso"
                    >
                      <path
                        d={puntosCurvaPeso.path}
                        fill="none"
                        stroke="#0f3d2e"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {puntosCurvaPeso.coords.map((c, idx) => (
                        <g key={idx}>
                          <circle cx={c.x} cy={c.y} r="3.5" fill="#16a34a" stroke="#fff" strokeWidth="1.5" />
                          <text
                            x={c.x}
                            y={Math.max(9, c.y - 6)}
                            textAnchor="middle"
                            fontSize="8.5"
                            fontWeight="700"
                            fill="#0f1f18"
                          >
                            {c.pesoKg}kg
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {resumenPesos.pesajesOrdenados.map((p) => (
                    <span
                      key={p.id}
                      className="rounded-lg border border-[#e1e7dc] bg-[#f8faf6] px-2 py-0.5 font-mono text-[11px] text-[#31453b]"
                    >
                      {formatearFechaEs(p.fecha)}: <strong>{p.pesoKg} kg</strong> ({p.tipo})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Controles rápidos de cuadra + Corral + Incidencia (Mamitis 4 cuarterones / Cojera) */}
          {animal.estado === 'ACTIVO' && (
            <div className="card-surface space-y-3 rounded-2xl p-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#52655c]">
                Gestión rápida y corral
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] font-bold text-[#4a5d54]">
                  Corral / Lote
                  <select
                    value={animal.corralId || ''}
                    onChange={(e) => onCambiarCorral(animal.id, e.target.value || undefined)}
                    className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-[#f8faf6] px-2.5 py-1.5 text-xs font-bold text-[#0f1f18]"
                  >
                    <option value="">Sin corral asignado</option>
                    {corrales.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-[11px] font-bold text-[#4a5d54]">
                  Estado Crotal
                  <select
                    aria-label={`Estado crotal de ${animal.crotal}`}
                    value={animal.estadoCrotal}
                    onChange={(e) =>
                      onCambiarEstadoCrotal(animal.id, e.target.value as EstadoCrotalFisico)
                    }
                    className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-[#f8faf6] px-2.5 py-1.5 text-xs font-bold text-[#0f1f18]"
                  >
                    <option value="OK">Crotales OK</option>
                    <option value="FALTA_IZQUIERDO">Falta crotal izq.</option>
                    <option value="FALTA_DERECHO">Falta crotal der.</option>
                    <option value="FALTAN_AMBOS">Faltan ambos</option>
                    <option value="PENDIENTE_COLOCAR">Pendiente colocar</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onToggleDib(animal.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${
                    animal.dibImpreso
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : 'border-[#dce4d6] bg-white text-[#4a5d54]'
                  }`}
                >
                  <FileCheck2 className="h-3.5 w-3.5" />
                  {animal.dibImpreso ? 'DIB OK' : 'Marcar DIB'}
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarFormInc((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-950 hover:bg-purple-100"
                >
                  <Activity className="h-3.5 w-3.5" />
                  {esCarne ? '+ Incidencia (Cojera...)' : '+ Mamitis / Cojera'}
                </button>
              </div>

              {/* Mini-formulario táctil de incidencia + 4 cuarterones */}
              {mostrarFormInc && (
                <form
                  onSubmit={handleGuardarIncidencia}
                  className="space-y-3 rounded-xl border border-purple-200 bg-purple-50/60 p-3.5"
                >
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(INCIDENCIAS_META) as TipoIncidenciaClinica[])
                      .filter(
                        (k) =>
                          k !== 'VACUNACION_LOTE' && (!esCarne || !INCIDENCIAS_META[k].soloLeche),
                      )
                      .map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setTipoInc(k)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                            tipoInc === k
                              ? 'bg-purple-800 text-white'
                              : 'border border-purple-200 bg-white text-purple-950'
                          }`}
                        >
                          {INCIDENCIAS_META[k].etiqueta}
                        </button>
                      ))}
                  </div>

                  {tipoInc === 'MAMITIS' && !esCarne && (
                    <div>
                      <p className="text-[11px] font-bold text-purple-950">
                        Selecciona el cuarterón afectado (vista ubre):
                      </p>
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        {(['AI', 'AD', 'PI', 'PD'] as CuarteronUbre[]).map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setCuarteron(q)}
                            className={`rounded-lg border py-2 font-mono text-xs font-extrabold transition ${
                              cuarteron === q
                                ? 'border-purple-700 bg-purple-700 text-white'
                                : 'border-purple-200 bg-white text-purple-950 hover:bg-purple-100'
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
                    value={notasInc}
                    onChange={(e) => setNotasInc(e.target.value)}
                    placeholder="Observación rápida (opcional)..."
                    className="w-full rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs focus:border-purple-600 focus:outline-none"
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setMostrarFormInc(false)}
                      className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#52655c]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-xl bg-purple-800 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-900"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Guardar incidencia
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onCerrar();
                    onAbrirTratamiento(animal);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900 hover:bg-sky-100"
                >
                  <Pill className="h-4 w-4" />
                  Añadir Receta PRESVET
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onCerrar();
                    onAbrirBajaAnimal(animal);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800 hover:bg-red-100"
                >
                  <UserMinus className="h-4 w-4" />
                  Registrar Baja / Venta
                </button>
              </div>
            </div>
          )}

          {/* Árbol Genealógico Visual (3 generaciones) + Consanguinidad */}
          <div className="card-surface space-y-3 rounded-2xl p-4 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-[#52655c]">
                <GitBranch className="h-4 w-4 text-emerald-700" />
                <span>Árbol Genealógico y Consanguinidad</span>
              </div>
              {consanguinidadPropia.coeficientePct > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-extrabold ${
                    consanguinidadPropia.nivelRiesgo === 'ALTO'
                      ? 'bg-red-100 text-red-800'
                      : consanguinidadPropia.nivelRiesgo === 'MEDIO'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  F = {consanguinidadPropia.coeficientePct}%
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Rama Materna */}
              <div className="space-y-1.5 rounded-xl border border-rose-200/80 bg-rose-50/40 p-2.5">
                <span className="text-[10px] font-extrabold uppercase text-rose-800">Madre</span>
                {madre ? (
                  <button
                    type="button"
                    onClick={() => onSeleccionarOtroAnimal(madre)}
                    className="block text-left font-bold text-emerald-900 hover:underline"
                  >
                    #{madre.numeroCorto} {madre.nombre ? `(${madre.nombre})` : ''} →
                  </button>
                ) : (
                  <p className="font-mono font-semibold text-[#0f1f18]">
                    {animal.crotalMadre || 'No registrada'}
                  </p>
                )}
                {(pedigri.madre?.madre || pedigri.madre?.padre) && (
                  <div className="border-t border-rose-200/60 pt-1.5 text-[10px] text-[#52655c]">
                    {pedigri.madre.madre && <p>Abuela M: {pedigri.madre.madre.etiqueta}</p>}
                    {pedigri.madre.padre && <p>Abuelo M: {pedigri.madre.padre.etiqueta}</p>}
                  </div>
                )}
              </div>

              {/* Rama Paterna */}
              <div className="space-y-1.5 rounded-xl border border-sky-200/80 bg-sky-50/40 p-2.5">
                <span className="text-[10px] font-extrabold uppercase text-sky-900">
                  Padre / Toro
                </span>
                <p className="font-bold text-[#0f1f18]">
                  {animal.padreNombre || animal.crotalPadre || 'No registrado'}
                </p>
                {(pedigri.padre?.madre || pedigri.padre?.padre) && (
                  <div className="border-t border-sky-200/60 pt-1.5 text-[10px] text-[#52655c]">
                    {pedigri.padre.madre && <p>Abuela P: {pedigri.padre.madre.etiqueta}</p>}
                    {pedigri.padre.padre && <p>Abuelo P: {pedigri.padre.padre.etiqueta}</p>}
                  </div>
                )}
              </div>
            </div>

            {crias.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[#52655c]">Crías registradas ({crias.length}):</span>
                <div className="flex flex-wrap gap-1.5">
                  {crias.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSeleccionarOtroAnimal(c)}
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 font-mono text-xs font-bold text-amber-950 hover:bg-amber-100"
                    >
                      <Baby className="h-3 w-3" />#{c.numeroCorto} (
                      {formatearEdadExacta(c.fechaNacimiento, hoy, true)})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Historial unificado (Incidencias + Eventos + Reproducción + Documentos) */}
          <div className="card-surface space-y-3 rounded-2xl p-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#52655c]">
              Historial Clínico, Eventos y Documentos
            </h4>
            {incidenciasAnimal.length === 0 &&
            eventosAnimal.length === 0 &&
            inseminacionesAnimal.length === 0 &&
            docsAnimal.length === 0 ? (
              <p className="text-xs text-[#52655c]">
                Sin eventos o incidencias registradas todavía.
              </p>
            ) : (
              <div className="space-y-2">
                {incidenciasAnimal.map((inc) => (
                  <div
                    key={inc.id}
                    className="flex items-start gap-2.5 rounded-xl bg-purple-50/70 p-2.5 text-xs"
                  >
                    <Tag className="mt-0.5 h-4 w-4 shrink-0 text-purple-700" />
                    <div>
                      <p className="font-bold text-[#0f1f18]">
                        {INCIDENCIAS_META[inc.tipo].etiqueta}
                        {inc.cuarteron ? ` · Cuarterón ${inc.cuarteron}` : ''}
                      </p>
                      <p className="text-[11px] text-[#52655c]">
                        {formatearFechaEs(inc.fecha)}
                        {inc.notas ? ` · ${inc.notas}` : ''}
                      </p>
                    </div>
                  </div>
                ))}

                {inseminacionesAnimal.map((ins) => (
                  <div
                    key={ins.id}
                    className="flex items-start gap-2.5 rounded-xl bg-rose-50/70 p-2.5 text-xs"
                  >
                    <CalendarHeart className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
                    <div>
                      <p className="font-bold text-[#0f1f18]">
                        Inseminación ({ins.estado}){ins.toro ? ` · Toro ${ins.toro}` : ''}
                      </p>
                      <p className="text-[11px] text-[#52655c]">
                        Fecha: {formatearFechaEs(ins.fechaInseminacion)} ·{' '}
                        {ins.confirmadaGestacion ? 'Gestación confirmada' : 'Pendiente ecografía'}
                      </p>
                    </div>
                  </div>
                ))}

                {eventosAnimal.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-start justify-between gap-2 rounded-xl bg-[#f8faf6] p-2.5 text-xs"
                  >
                    <div>
                      <p className="font-bold text-[#0f1f18]">{ev.tipo}</p>
                      <p className="text-[11px] text-[#52655c]">
                        {formatearFechaEs(ev.fechaEvento)}
                        {ev.motivo ? ` · ${ev.motivo}` : ''}
                        {ev.destino ? ` · ${ev.destino}` : ''}
                        {ev.importeEur ? ` · ${ev.importeEur} €` : ''}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        ev.estadoTramite === 'TRAMITADO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {ev.estadoTramite}
                    </span>
                  </div>
                ))}

                {docsAnimal.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start gap-2.5 rounded-xl bg-sky-50/70 p-2.5 text-xs"
                  >
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
                    <div>
                      <p className="font-bold text-[#0f1f18]">{doc.titulo}</p>
                      <p className="text-[11px] text-[#52655c]">
                        {formatearFechaEs(doc.fechaEmision)}
                        {doc.referencia ? ` · Ref: ${doc.referencia}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {animal.notas && (
            <div className="rounded-xl border border-[#dce4d6] bg-white p-3.5 text-xs text-[#4a5d54]">
              <strong className="text-[#0f1f18]">Notas de cuadra:</strong> {animal.notas}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

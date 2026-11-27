import {
  Camera,
  CheckCircle2,
  FileScan,
  Loader2,
  Pill,
  ScanBarcode,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { normalizarCrotal } from '../domain/crotales';
import { hoyIso, sumarDiasIso } from '../domain/fechas';
import {
  analizarTextoOcrDocumento,
  generarTextoEjemploDib,
  generarTextoEjemploRecetaPresvet,
  type ResultadoOcrDib,
  type ResultadoOcrReceta,
} from '../domain/parserOcrDocumentos';
import { ESPECIES_META } from '../domain/reglasNormativas';
import type { EstadoGanaderia, SexoAnimal } from '../domain/types';
import { ModalBase } from './ModalBase';

export interface AccionGuardarRecetaOcr {
  animalIds: string[];
  medicamento: string;
  dosisHabitual?: string;
  recetaPresvet: string;
  diasLeche: number;
  diasCarne: number;
  fechaEmision: string;
  veterinario?: string;
  anadirABotiquin?: boolean;
}

export interface AccionGuardarDibOcr {
  crotal: string;
  crotalMadre: string;
  fechaNacimiento: string;
  sexo: SexoAnimal;
  raza: string;
  animalExistenteId?: string;
}

export function ModalEscanerOcr({
  estado,
  modoInicial = 'AUTO',
  desdeBotiquin = false,
  onCerrar,
  onGuardarReceta,
  onGuardarDib,
}: {
  estado: EstadoGanaderia;
  modoInicial?: 'AUTO' | 'RECETA_PRESVET' | 'DIB';
  desdeBotiquin?: boolean;
  onCerrar: () => void;
  onGuardarReceta: (datos: AccionGuardarRecetaOcr) => void;
  onGuardarDib: (datos: AccionGuardarDibOcr) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const camRef = useRef<HTMLInputElement | null>(null);

  const [modo, setModo] = useState<'AUTO' | 'RECETA_PRESVET' | 'DIB'>(modoInicial);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [procesandoOcr, setProcesandoOcr] = useState(false);
  const [progresoOcr, setProgresoOcr] = useState(0);
  const [estadoOcrTexto, setEstadoOcrTexto] = useState('');
  const [errorOcr, setErrorOcr] = useState<string | null>(null);
  const [textoOcr, setTextoOcr] = useState('');
  const [codigoBarrasInput, setCodigoBarrasInput] = useState('');
  const [avisoBarcode, setAvisoBarcode] = useState<string | null>(null);

  // Campos editables para Receta PRESVET
  const [tipoDetectado, setTipoDetectado] = useState<'RECETA_PRESVET' | 'DIB' | null>(null);
  const [recetaAnimalIds, setRecetaAnimalIds] = useState<string[]>([]);
  const [busquedaVacaReceta, setBusquedaVacaReceta] = useState('');
  const [anadirABotiquin, setAnadirABotiquin] = useState<boolean>(desdeBotiquin);
  const [recetaDosis, setRecetaDosis] = useState('');
  const [recetaCodigo, setRecetaCodigo] = useState('');
  const [recetaMedicamento, setRecetaMedicamento] = useState('');
  const [recetaDiasLeche, setRecetaDiasLeche] = useState('0');
  const [recetaDiasCarne, setRecetaDiasCarne] = useState('0');
  const [recetaFecha, setRecetaFecha] = useState(hoyIso());
  const [recetaVet, setRecetaVet] = useState('');

  // Campos editables para DIB
  const [dibCrotal, setDibCrotal] = useState('');
  const [dibMadre, setDibMadre] = useState('');
  const [dibFechaNac, setDibFechaNac] = useState(hoyIso());
  const [dibSexo, setDibSexo] = useState<SexoAnimal>('H');
  const [dibRaza, setDibRaza] = useState(ESPECIES_META.BOVINO.razasComunes[0]);
  const [dibAnimalExistenteId, setDibAnimalExistenteId] = useState<string | undefined>(undefined);

  const activos = estado.animales.filter((a) => a.estado === 'ACTIVO');

  const poblarDesdeResultado = (texto: string, forzar?: 'RECETA_PRESVET' | 'DIB') => {
    if (!texto.trim()) {
      setTipoDetectado(null);
      return;
    }
    const res = analizarTextoOcrDocumento(texto, estado, forzar);
    setTipoDetectado(res.tipo);

    if (res.tipo === 'RECETA_PRESVET') {
      const r: ResultadoOcrReceta = res;
      setRecetaAnimalIds(r.animalEncontrado ? [r.animalEncontrado.id] : []);
      setRecetaCodigo(r.recetaPresvet);
      setRecetaMedicamento(r.medicamento);
      setRecetaDiasLeche(String(r.diasLeche));
      setRecetaDiasCarne(String(r.diasCarne));
      setRecetaFecha(r.fechaEmision);
      setRecetaVet(r.veterinario || '');
    } else {
      const d: ResultadoOcrDib = res;
      setDibCrotal(d.crotal);
      setDibMadre(d.crotalMadre);
      setDibFechaNac(d.fechaNacimiento);
      setDibSexo(d.sexo);
      setDibRaza(d.raza);
      setDibAnimalExistenteId(d.animalExistente?.id);
    }
  };

  useEffect(() => {
    return () => {
      if (imagenPreview) URL.revokeObjectURL(imagenPreview);
    };
  }, [imagenPreview]);

  const aplicarCodigoBarrasDib = (raw: string) => {
    const limpio = normalizarCrotal(raw);
    if (!limpio || limpio.length < 4) return;
    const existente = estado.animales.find(
      (a) => normalizarCrotal(a.crotal) === limpio || a.numeroCorto === limpio.slice(-4),
    );
    setModo('DIB');
    setTipoDetectado('DIB');
    setDibCrotal(existente ? existente.crotal : limpio);
    setDibMadre(existente?.crotalMadre || '');
    setDibFechaNac(existente?.fechaNacimiento || hoyIso());
    setDibSexo(existente?.sexo || 'H');
    setDibRaza(existente?.raza || ESPECIES_META.BOVINO.razasComunes[0]);
    setDibAnimalExistenteId(existente?.id);
    setAvisoBarcode(
      existente
        ? `Código de barras detectado: animal #${existente.numeroCorto} ya en censo (marcar DIB como impreso).`
        : `Código de barras DIB leído (${limpio}): listo para dar de alta en el censo.`,
    );
  };

  const intentarLeerCodigoBarrasDeImagen = async (archivo: File): Promise<string | null> => {
    const DetectorCtor = (
      window as unknown as {
        BarcodeDetector?: new (opts: { formats: string[] }) => {
          detect: (src: ImageBitmap) => Promise<Array<{ rawValue: string }>>;
        };
      }
    ).BarcodeDetector;
    if (!DetectorCtor || typeof createImageBitmap !== 'function') return null;
    try {
      const detector = new DetectorCtor({
        formats: ['code_128', 'code_39', 'qr_code', 'ean_13', 'itf'],
      });
      const bmp = await createImageBitmap(archivo);
      const encontrados = await detector.detect(bmp);
      bmp.close();
      const candidato = encontrados.find((e) => /[A-Z]{2}\d{8,}|\d{10,}/.test(e.rawValue));
      return candidato ? candidato.rawValue : null;
    } catch {
      return null;
    }
  };

  const ejecutarOcrEnImagen = async (archivo: File) => {
    setErrorOcr(null);
    setAvisoBarcode(null);
    setProcesandoOcr(true);
    setProgresoOcr(5);
    setEstadoOcrTexto('Comprobando código de barras DIB y cargando OCR español...');

    if (imagenPreview) URL.revokeObjectURL(imagenPreview);
    const url = URL.createObjectURL(archivo);
    setImagenPreview(url);

    // Intento instantáneo de lectura de código de barras DIB si estamos en modo AUTO o DIB
    if (modo !== 'RECETA_PRESVET') {
      const barcode = await intentarLeerCodigoBarrasDeImagen(archivo);
      if (barcode) {
        aplicarCodigoBarrasDib(barcode);
        setProcesandoOcr(false);
        setEstadoOcrTexto('');
        return;
      }
    }

    try {
      const Tesseract = await import('tesseract.js');
      const result = await Tesseract.recognize(archivo, 'spa', {
        logger: (m) => {
          if (typeof m.progress === 'number') {
            setProgresoOcr(Math.max(10, Math.round(m.progress * 100)));
          }
          if (m.status === 'loading language traineddata') {
            setEstadoOcrTexto('Descargando diccionario español (solo la primera vez)...');
          } else if (m.status === 'recognizing text') {
            setEstadoOcrTexto('Leyendo texto del documento...');
          }
        },
      });

      const textoExtraido = result.data.text || '';
      setTextoOcr(textoExtraido);
      poblarDesdeResultado(textoExtraido, modo === 'AUTO' ? undefined : modo);
    } catch {
      setErrorOcr(
        'No se pudo procesar la imagen con OCR. Comprueba tu conexión la primera vez o pega el texto manualmente debajo.',
      );
    } finally {
      setProcesandoOcr(false);
      setEstadoOcrTexto('');
    }
  };

  const handleArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await ejecutarOcrEnImagen(file);
    e.target.value = '';
  };

  const handleTextoManual = (nuevoTexto: string) => {
    setTextoOcr(nuevoTexto);
    poblarDesdeResultado(nuevoTexto, modo === 'AUTO' ? undefined : modo);
  };

  const handleCambiarModo = (nuevoModo: 'AUTO' | 'RECETA_PRESVET' | 'DIB') => {
    setModo(nuevoModo);
    if (textoOcr.trim()) {
      poblarDesdeResultado(textoOcr, nuevoModo === 'AUTO' ? undefined : nuevoModo);
    }
  };

  const toggleVacaReceta = (id: string) => {
    setRecetaAnimalIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tipoDetectado === 'RECETA_PRESVET') {
      if (!recetaMedicamento.trim()) return;
      onGuardarReceta({
        animalIds: recetaAnimalIds,
        medicamento: recetaMedicamento.trim(),
        dosisHabitual: recetaDosis.trim() || undefined,
        recetaPresvet: recetaCodigo.trim(),
        diasLeche: Math.max(0, Number(recetaDiasLeche) || 0),
        diasCarne: Math.max(0, Number(recetaDiasCarne) || 0),
        fechaEmision: recetaFecha,
        veterinario: recetaVet.trim() || undefined,
        anadirABotiquin,
      });
    } else if (tipoDetectado === 'DIB') {
      if (!dibCrotal.trim()) return;
      onGuardarDib({
        crotal: dibCrotal.trim().toUpperCase(),
        crotalMadre: dibMadre.trim().toUpperCase(),
        fechaNacimiento: dibFechaNac,
        sexo: dibSexo,
        raza: dibRaza,
        animalExistenteId: dibAnimalExistenteId,
      });
    }
  };

  return (
    <ModalBase onCerrar={onCerrar} maxWidthClass="max-w-2xl">
      <div className="p-5">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
              <FileScan className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Escáner OCR + Código de Barras DIB / Lector RFID
              </h3>
              <p className="text-xs text-slate-500">
                Lee códigos de barras de DIBs, bastones RFID Bluetooth/USB o haz foto a Recetas
                PRESVET en tu navegador (100% privado).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Selector de modo + botones de captura */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {(
              [
                ['AUTO', 'Auto-detectar'],
                ['RECETA_PRESVET', 'Receta PRESVET'],
                ['DIB', 'DIB Bovino'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => handleCambiarModo(id)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  modo === id
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={camRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleArchivo}
              className="hidden"
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleArchivo}
              className="hidden"
            />
            <button
              type="button"
              disabled={procesandoOcr}
              onClick={() => camRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              Hacer foto
            </button>
            <button
              type="button"
              disabled={procesandoOcr}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              Subir imagen
            </button>
          </div>
        </div>

        {/* Simulación rápida sin papel delante */}
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
          <span className="font-medium text-slate-600">Probar al instante sin foto:</span>
          <button
            type="button"
            onClick={() => handleTextoManual(generarTextoEjemploRecetaPresvet())}
            className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-900 hover:bg-sky-100"
          >
            Ejemplo Receta PRESVET
          </button>
          <button
            type="button"
            onClick={() => handleTextoManual(generarTextoEjemploDib())}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100"
          >
            Ejemplo DIB Bovino
          </button>
        </div>

        {/* Lectura rápida Código de Barras DIB o Bastón RFID Bluetooth (HID) */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/40 px-3 py-2 text-xs">
          <ScanBarcode className="h-4 w-4 shrink-0 text-emerald-800" />
          <input
            type="text"
            value={codigoBarrasInput}
            onChange={(e) => setCodigoBarrasInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                aplicarCodigoBarrasDib(codigoBarrasInput);
              }
            }}
            placeholder="Escanea código barras DIB o pasa bastón RFID Bluetooth aquí..."
            className="min-w-[200px] flex-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1 font-mono text-xs focus:border-emerald-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => aplicarCodigoBarrasDib(codigoBarrasInput)}
            className="rounded-lg bg-[#0f3d2e] px-3 py-1 text-[11px] font-bold text-white hover:bg-[#175742]"
          >
            Leer DIB / RFID
          </button>
        </div>

        {avisoBarcode && (
          <div className="mt-2.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-950">
            {avisoBarcode}
          </div>
        )}

        {/* Barra de progreso OCR */}
        {procesandoOcr && (
          <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-900">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{estadoOcrTexto || 'Procesando OCR...'}</span>
              <span className="ml-auto font-mono">{progresoOcr}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-sky-200">
              <div
                className="h-full rounded-full bg-sky-700 transition-all"
                style={{ width: `${progresoOcr}%` }}
              />
            </div>
          </div>
        )}

        {errorOcr && (
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{errorOcr}</div>
        )}

        {/* Vista previa de imagen + texto OCR */}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {imagenPreview && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <img
                src={imagenPreview}
                alt="Documento escaneado"
                className="h-32 w-full object-cover"
              />
            </div>
          )}
          <div className={imagenPreview ? 'sm:col-span-2' : 'sm:col-span-3'}>
            <label className="block text-[11px] font-semibold text-slate-600">
              Texto reconocido por OCR (o pegado de PDF/WhatsApp del veterinario):
              <textarea
                rows={4}
                value={textoOcr}
                onChange={(e) => handleTextoManual(e.target.value)}
                placeholder="Aquí aparecerá el texto leído de la foto. También puedes pegar texto directamente..."
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-mono text-[11px] focus:border-emerald-500 focus:outline-none"
              />
            </label>
          </div>
        </div>

        {/* Formulario estructurado resultante */}
        {tipoDetectado && (
          <form
            onSubmit={handleSubmit}
            className="mt-4 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-950">
                <Pill className="h-4 w-4 text-emerald-700" />
                {tipoDetectado === 'RECETA_PRESVET'
                  ? 'Datos extraídos — Receta Veterinaria PRESVET'
                  : 'Datos extraídos — Documento de Identificación Bovina (DIB)'}
              </div>
              <span className="text-[11px] font-semibold text-emerald-800">
                Revisa antes de guardar
              </span>
            </div>

            {tipoDetectado === 'RECETA_PRESVET' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50/80 px-3 py-2.5 text-xs font-bold text-sky-950 sm:col-span-2">
                  <span>Añadir medicamento al Botiquín de la Granja</span>
                  <input
                    type="checkbox"
                    checked={anadirABotiquin}
                    onChange={(e) => setAnadirABotiquin(e.target.checked)}
                    className="h-4 w-4 accent-emerald-700"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  Medicamento / Especialidad *
                  <input
                    type="text"
                    required
                    value={recetaMedicamento}
                    onChange={(e) => setRecetaMedicamento(e.target.value)}
                    placeholder="Ej: Amoxicilina + Clavulánico"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  Dosis habitual (opcional)
                  <input
                    type="text"
                    value={recetaDosis}
                    onChange={(e) => setRecetaDosis(e.target.value)}
                    placeholder="Ej: 10 ml / 24h"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                  />
                </label>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 sm:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Asignar ahora a vacas (opcional · {recetaAnimalIds.length} seleccionadas)
                    </span>
                    {recetaAnimalIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setRecetaAnimalIds([])}
                        className="text-[11px] font-bold text-slate-500 underline hover:text-slate-800"
                      >
                        Ninguna (solo botiquín)
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={busquedaVacaReceta}
                    onChange={(e) => setBusquedaVacaReceta(e.target.value)}
                    placeholder="Buscar vaca por número o nombre..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs"
                  />
                  <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto pt-1">
                    {activos
                      .filter((a) => {
                        const q = busquedaVacaReceta.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          a.numeroCorto.toLowerCase().includes(q) ||
                          (a.nombre || '').toLowerCase().includes(q) ||
                          a.crotal.toLowerCase().includes(q)
                        );
                      })
                      .map((a) => {
                        const sel = recetaAnimalIds.includes(a.id);
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => toggleVacaReceta(a.id)}
                            className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                              sel
                                ? 'border-emerald-700 bg-emerald-700 text-white'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-400'
                            }`}
                          >
                            #{a.numeroCorto}
                            {a.nombre ? ` ${a.nombre}` : ''}
                          </button>
                        );
                      })}
                  </div>
                </div>

                <label className="text-xs font-semibold text-slate-700">
                  Nº Receta PRESVET
                  <input
                    type="text"
                    value={recetaCodigo}
                    onChange={(e) => setRecetaCodigo(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  Fecha prescripción
                  <input
                    type="date"
                    value={recetaFecha}
                    onChange={(e) => setRecetaFecha(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  Supresión Leche (días)
                  <input
                    type="number"
                    min={0}
                    value={recetaDiasLeche}
                    onChange={(e) => setRecetaDiasLeche(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                  />
                  <span className="mt-0.5 block text-[11px] font-normal text-slate-600">
                    Fin leche: {sumarDiasIso(recetaFecha, Number(recetaDiasLeche) || 0)}
                  </span>
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  Supresión Carne (días)
                  <input
                    type="number"
                    min={0}
                    value={recetaDiasCarne}
                    onChange={(e) => setRecetaDiasCarne(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                  />
                  <span className="mt-0.5 block text-[11px] font-normal text-slate-600">
                    Fin carne (bloqueo matadero):{' '}
                    {sumarDiasIso(recetaFecha, Number(recetaDiasCarne) || 0)}
                  </span>
                </label>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {dibAnimalExistenteId && (
                  <div className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-900 sm:col-span-2">
                    ✓ Esta res ya existe en tu censo: al guardar se marcará su DIB como verificado y
                    archivado en la Carpeta de Inspección.
                  </div>
                )}
                <label className="text-xs font-semibold text-slate-700">
                  Crotal oficial (DIB)
                  <input
                    type="text"
                    required
                    value={dibCrotal}
                    onChange={(e) => setDibCrotal(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Crotal de la madre
                  <input
                    type="text"
                    value={dibMadre}
                    onChange={(e) => setDibMadre(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Fecha nacimiento
                  <input
                    type="date"
                    value={dibFechaNac}
                    onChange={(e) => setDibFechaNac(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Sexo
                  <select
                    value={dibSexo}
                    onChange={(e) => setDibSexo(e.target.value as SexoAnimal)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <option value="H">Hembra</option>
                    <option value="M">Macho</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                  Raza
                  <input
                    type="text"
                    value={dibRaza}
                    onChange={(e) => setDibRaza(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                  />
                </label>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onCerrar}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900"
              >
                <CheckCircle2 className="h-4 w-4" />
                {tipoDetectado === 'RECETA_PRESVET'
                  ? anadirABotiquin && recetaAnimalIds.length > 0
                    ? `Añadir al botiquín y aplicar (${recetaAnimalIds.length})`
                    : anadirABotiquin
                      ? 'Añadir al botiquín y archivar receta'
                      : recetaAnimalIds.length > 0
                        ? `Activar supresión (${recetaAnimalIds.length}) y archivar`
                        : 'Archivar receta en documentos'
                  : dibAnimalExistenteId
                    ? 'Verificar DIB y archivar'
                    : 'Dar de alta en Censo y archivar DIB'}
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalBase>
  );
}

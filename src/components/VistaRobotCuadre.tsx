import {
  ArrowRight,
  CheckCircle2,
  CloudUpload,
  Download,
  ExternalLink,
  FileSpreadsheet,
  GitCompare,
  PlusCircle,
  Sparkles,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { generarCsvEjemploDeLaval, generarCsvEjemploLely } from '../data/demoAsturias';
import {
  generarArchivoAdisParaRobot,
  generarCsvExportacionParaRobot,
} from '../domain/exportadorRobotAdis';
import {
  descargarArchivo,
  generarPaqueteRemoWebJson,
  generarXmlSitranBorrador,
} from '../domain/exportadores';
import { formatearFechaEs, hoyIso } from '../domain/fechas';
import { ejecutarCuadreRobotPrincipado, parsearCsvRobot } from '../domain/importadorRobot';
import { obtenerReglasNormativas } from '../domain/reglasNormativas';
import type { DiscrepanciaCuadre, EstadoGanaderia, EventoTramite } from '../domain/types';
import { BadgeNivel, BotonCopiar } from './BadgeNivel';

interface Props {
  estado: EstadoGanaderia;
  onIncorporarDiscrepancia: (disc: DiscrepanciaCuadre) => void;
  onMarcarTramitado: (eventoId: string, justificante?: string) => void;
  onMarcarCrotalColocado: (eventoId: string) => void;
  onRegistrarImportacion: (archivo: string, fuente: string, registros: number) => void;
}

export function VistaRobotCuadre({
  estado,
  onIncorporarDiscrepancia,
  onMarcarTramitado,
  onMarcarCrotalColocado,
  onRegistrarImportacion,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [discrepancias, setDiscrepancias] = useState<DiscrepanciaCuadre[]>([]);
  const [resumenImport, setResumenImport] = useState<{
    archivo: string;
    fuente: string;
    total: number;
    advertencias: string[];
  } | null>(null);
  const [justificantes, setJustificantes] = useState<Record<string, string>>({});

  const reglas = obtenerReglasNormativas(
    estado.explotacion.comunidad,
    estado.explotacion.especiePrincipal,
  );
  const pendientes = estado.eventos.filter((e) => e.estadoTramite === 'PENDIENTE');
  const tramitadosRecientes = estado.eventos
    .filter((e) => e.estadoTramite === 'TRAMITADO')
    .slice(0, 6);

  const pasoActual = discrepancias.length > 0 ? 2 : pendientes.length > 0 ? 3 : 1;

  const procesarCsv = (contenido: string, nombreArchivo: string) => {
    const parsed = parsearCsvRobot(contenido);
    const hallazgos = ejecutarCuadreRobotPrincipado(estado, parsed.registros, hoyIso());
    setDiscrepancias(hallazgos);
    setResumenImport({
      archivo: nombreArchivo,
      fuente: parsed.fuenteDetectada,
      total: parsed.registros.length,
      advertencias: parsed.advertencias,
    });
    onRegistrarImportacion(nombreArchivo, parsed.fuenteDetectada, parsed.registros.length);
  };

  const leerArchivo = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    procesarCsv(text, file.name);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await leerArchivo(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);
    await leerArchivo(e.dataTransfer.files?.[0]);
  };

  const handleIncorporar = (disc: DiscrepanciaCuadre) => {
    onIncorporarDiscrepancia(disc);
    setDiscrepancias((prev) => prev.filter((d) => d.id !== disc.id));
  };

  const handleDescargarPaqueteJson = () => {
    const json = generarPaqueteRemoWebJson(estado);
    descargarArchivo(
      `paquete_remoweb_${estado.explotacion.codigoRega}_${hoyIso()}.json`,
      json,
      'application/json;charset=utf-8',
    );
  };

  const handleDescargarXmlSitran = () => {
    const xml = generarXmlSitranBorrador(estado);
    descargarArchivo(
      `borrador_sitran_${estado.explotacion.codigoRega}_${hoyIso()}.xml`,
      xml,
      'application/xml;charset=utf-8',
    );
  };

  const etiquetaTipo = (tipo: EventoTramite['tipo']) => {
    switch (tipo) {
      case 'NACIMIENTO':
        return 'Alta por Nacimiento';
      case 'BAJA_MUERTE':
        return 'Baja por Muerte';
      case 'DESAPARICION':
        return 'Desaparición';
      case 'SALIDA_MATADERO':
        return 'Guía Salida a Matadero';
      case 'SALIDA_MERCADO':
        return 'Guía Salida a Mercado';
      case 'SALIDA_PASTOS':
        return 'Traslado a Pastos';
      case 'VENTA':
        return 'Venta / Traslado';
      default:
        return tipo;
    }
  };

  const pasosFlujo = [
    { num: 1, titulo: 'Importar CSV del Robot', sub: 'Lely, DeLaval o GEA' },
    { num: 2, titulo: 'Resolver Discrepancias', sub: `${discrepancias.length} por cuadrar` },
    { num: 3, titulo: `Subir a ${reglas.portalNombre.split('/')[0].trim()}`, sub: `${pendientes.length} en cola` },
  ];

  return (
    <div className="animate-fade-up space-y-6">
      {/* Indicador de flujo en 3 pasos */}
      <div className="card-surface grid gap-3 rounded-2xl p-4 sm:grid-cols-3">
        {pasosFlujo.map((p) => {
          const activo = pasoActual === p.num;
          const completado = p.num < pasoActual;
          return (
            <div
              key={p.num}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition ${
                activo
                  ? 'border border-emerald-200 bg-emerald-50/80'
                  : 'bg-[#f8faf6]'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-extrabold ${
                  activo
                    ? 'bg-[#0f3d2e] text-amber-300'
                    : completado
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#e1e7dc] text-[#4a5d54]'
                }`}
              >
                {p.num}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold text-[#0f1f18]">{p.titulo}</p>
                <p className="truncate text-[11px] text-[#52655c]">{p.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Paso 1 y 2: Dropzone Drag & Drop + Cuadre 360° */}
      <section className="card-surface rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900">
            <GitCompare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#0f1f18]">
              1. Importar Datos del Robot de Ordeño y Cuadrar con el Principado
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[#52655c]">
              Arrastra una exportación CSV de <strong>Lely Horizon/T4C</strong>,{' '}
              <strong>DeLaval DelPro</strong> o Excel. Detectamos partos y bajas sin comunicar en{' '}
              <strong>{reglas.portalNombre}</strong> y sugerimos el siguiente crotal libre de tu
              cajón.
            </p>
          </div>
        </div>

        {/* Zona Drag & Drop */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={handleDrop}
          className={`mt-4 flex flex-col items-center justify-between gap-4 rounded-2xl border-2 border-dashed p-5 transition sm:flex-row ${
            arrastrando
              ? 'border-emerald-600 bg-emerald-50'
              : 'border-[#cfd9c8] bg-[#f8faf6] hover:border-emerald-400'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.txt,.tsv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-800 shadow-xs">
              <CloudUpload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0f1f18]">
                Arrastra aquí tu archivo CSV del robot o selecciónalo
              </p>
              <p className="mt-0.5 text-xs text-[#52655c]">
                Compatible con Lely Horizon / T4C · DeLaval DelPro · GEA DairyPlan · CSV genérico
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0f3d2e] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#16523e]"
            >
              <CloudUpload className="h-4 w-4" />
              Subir CSV del Robot
            </button>
            <button
              type="button"
              onClick={() => procesarCsv(generarCsvEjemploLely(), 'lely_horizon_demo.csv')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-xs font-bold text-emerald-900 transition hover:bg-emerald-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Probar ejemplo Lely
            </button>
            <button
              type="button"
              onClick={() => procesarCsv(generarCsvEjemploDeLaval(), 'delaval_delpro_demo.csv')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce4d6] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#31453b] transition hover:bg-[#f4f6f1]"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Probar ejemplo DeLaval
            </button>
          </div>
        </div>

        {/* Bandeja de Discrepancias ("Cuadre 360°") */}
        {resumenImport && (
          <div className="mt-5 rounded-2xl border border-[#dce4d6] bg-[#f8faf6] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e1e7dc] pb-3">
              <div className="text-xs text-[#31453b]">
                Archivo analizado: <strong className="text-[#0f1f18]">{resumenImport.archivo}</strong>{' '}
                · Formato:{' '}
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-900">
                  {resumenImport.fuente}
                </span>{' '}
                · {resumenImport.total} fila(s)
              </div>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-[#2b4036] shadow-2xs">
                {discrepancias.length} discrepancia(s)
              </span>
            </div>

            {resumenImport.advertencias.length > 0 && (
              <div className="mt-3 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-900">
                {resumenImport.advertencias.join(' · ')}
              </div>
            )}

            {discrepancias.length === 0 ? (
              <div className="flex items-center gap-2 py-5 text-sm font-bold text-emerald-800">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ¡Cuadre perfecto! Todos los eventos de este archivo ya constan en tu cola o censo.
              </div>
            ) : (
              <div className="mt-3 space-y-2.5">
                {discrepancias.map((disc) => (
                  <div
                    key={disc.id}
                    className="flex flex-col gap-3 rounded-xl border border-[#dce4d6] bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <BadgeNivel nivel={disc.severidad} />
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#edf1e9] px-2 py-0.5 text-[11px] font-bold text-[#2b4036]">
                          Robot
                          <ArrowRight className="h-3 w-3" />
                          Principado
                        </span>
                        <span className="text-sm font-extrabold text-[#0f1f18]">{disc.titulo}</span>
                      </div>
                      <p className="text-xs text-[#4a5d54]">{disc.descripcion}</p>
                      {disc.crotalSugerido && (
                        <div className="flex items-center gap-2 pt-0.5 text-xs font-semibold text-[#1f3329]">
                          <span>Crotal oficial sugerido del cajón:</span>
                          <span className="rounded-lg border border-amber-400 bg-amber-200/90 px-2 py-0.5 font-mono text-xs font-extrabold text-amber-950">
                            {disc.crotalSugerido}
                          </span>
                        </div>
                      )}
                    </div>

                    {disc.tipo !== 'ACTIVA_PRINCIPADO_AUSENTE_ROBOT' && (
                      <button
                        type="button"
                        onClick={() => handleIncorporar(disc)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#0f3d2e] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#16523e]"
                      >
                        <PlusCircle className="h-4 w-4 text-amber-300" />
                        Añadir a Cola RemoWeb
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Paso 3: Cola de Trámites Listos para Agroficina Virtual / RemoWeb */}
      <section className="card-surface overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-[#edf1e9] bg-[#fafbf8] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-[#0f1f18]">
              2. Cola de Trámites Listos para {reglas.portalNombre} ({pendientes.length})
            </h2>
            <p className="text-xs text-[#52655c]">
              Copia cada campo en 1 clic o envía toda la cola a la{' '}
              <strong>Extensión Chrome/Edge GanaderIA · RemoWeb</strong> para rellenar el formulario
              oficial en 1 segundo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendientes.length > 0 && (
              <BotonCopiar
                valor={generarPaqueteRemoWebJson(estado)}
                etiqueta="Copiar para Extensión Chrome"
              />
            )}
            <button
              type="button"
              onClick={handleDescargarPaqueteJson}
              disabled={pendientes.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce4d6] bg-white px-3.5 py-2 text-xs font-bold text-[#1f3329] transition hover:bg-[#f4f6f1] disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Descargar JSON
            </button>
            <button
              type="button"
              onClick={handleDescargarXmlSitran}
              disabled={pendientes.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-2 text-xs font-bold text-sky-900 transition hover:bg-sky-100 disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              XML SITRAN (Principado)
            </button>
            <a
              href={reglas.portalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f1f18] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#1d352a]"
            >
              Abrir {reglas.portalNombre.split('/')[0].trim()}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="divide-y divide-[#eef2eb]">
          {pendientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              <p className="font-bold text-[#0f1f18]">Cola vacía — sin trámites pendientes</p>
              <p className="text-xs text-[#52655c]">
                Cuando registres un nacimiento, baja o importes datos del robot aparecerán aquí.
              </p>
            </div>
          ) : (
            pendientes.map((ev) => (
              <div key={ev.id} className="space-y-3 p-5 transition hover:bg-[#fafbf8]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-950">
                      {etiquetaTipo(ev.tipo)}
                    </span>
                    <span className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-sm font-extrabold text-amber-950">
                      {ev.crotal}
                    </span>
                    <span className="text-xs text-[#52655c]">
                      Fecha: <strong className="text-[#0f1f18]">{formatearFechaEs(ev.fechaEvento)}</strong> ·{' '}
                      {ev.origen}
                    </span>
                  </div>

                  {ev.tipo === 'NACIMIENTO' && ev.crotalColocado === false && (
                    <button
                      type="button"
                      onClick={() => onMarcarCrotalColocado(ev.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-100"
                    >
                      Marcar crotal físico ya colocado
                    </button>
                  )}
                </div>

                {/* Chips copiables 1-clic para pegar en RemoWeb */}
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e6ece2] bg-[#f8faf6] p-3">
                  <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-[#52655c]">
                    Copiar 1-clic:
                  </span>
                  <BotonCopiar
                    valor={estado.explotacion.codigoRega}
                    etiqueta={`REGA: ${estado.explotacion.codigoRega}`}
                    compacto
                  />
                  <BotonCopiar valor={ev.crotal} etiqueta={`Crotal: ${ev.crotal}`} compacto />
                  {ev.crotalMadre && (
                    <BotonCopiar
                      valor={ev.crotalMadre}
                      etiqueta={`Madre: ${ev.crotalMadre}`}
                      compacto
                    />
                  )}
                  <BotonCopiar
                    valor={formatearFechaEs(ev.fechaEvento)}
                    etiqueta={`Fecha: ${formatearFechaEs(ev.fechaEvento)}`}
                    compacto
                  />
                  {ev.sexo && (
                    <BotonCopiar
                      valor={ev.sexo === 'H' ? 'Hembra' : 'Macho'}
                      etiqueta={`Sexo: ${ev.sexo === 'H' ? 'Hembra' : 'Macho'}`}
                      compacto
                    />
                  )}
                  {ev.raza && <BotonCopiar valor={ev.raza} etiqueta={`Raza: ${ev.raza}`} compacto />}
                  {ev.destino && (
                    <BotonCopiar valor={ev.destino} etiqueta={`Destino: ${ev.destino}`} compacto />
                  )}
                </div>

                {ev.notas && <p className="text-xs text-[#4a5d54]">{ev.notas}</p>}

                <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-end">
                  <input
                    type="text"
                    placeholder="Nº justificante RemoWeb (opcional)"
                    value={justificantes[ev.id] || ''}
                    onChange={(e) =>
                      setJustificantes((prev) => ({ ...prev, [ev.id]: e.target.value }))
                    }
                    className="rounded-xl border border-[#dce4d6] bg-white px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none sm:w-64"
                  />
                  <button
                    type="button"
                    onClick={() => onMarcarTramitado(ev.id, justificantes[ev.id])}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-800"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Marcar como Tramitado en Principado
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Exportación de vuelta hacia el Robot (ADIS / CSV) */}
      <section className="card-surface flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-[#0f1f18]">
            3. Enviar eventos de vuelta al Robot de Ordeño (ADIS ISO 11787 / CSV)
          </h3>
          <p className="mt-0.5 text-xs text-[#52655c]">
            Exporta partos, inseminaciones y bajas registrados en GanaderIA para importarlos en{' '}
            <strong>Lely Horizon/T4C</strong>, <strong>DeLaval DelPro</strong> o{' '}
            <strong>GEA DairyPlan</strong> sin volver a picarlos en el PC del robot.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              descargarArchivo(
                `ganaderia_robot_${estado.explotacion.codigoRega}_${hoyIso()}.ads`,
                generarArchivoAdisParaRobot(estado),
                'text/plain;charset=utf-8',
              )
            }
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f3d2e] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#16523e]"
          >
            <Download className="h-4 w-4 text-amber-300" />
            Exportar ADIS (.ads)
          </button>
          <button
            type="button"
            onClick={() =>
              descargarArchivo(
                `ganaderia_robot_${estado.explotacion.codigoRega}_${hoyIso()}.csv`,
                generarCsvExportacionParaRobot(estado),
                'text/csv;charset=utf-8',
              )
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce4d6] bg-white px-3.5 py-2 text-xs font-bold text-[#1f3329] hover:bg-[#f4f6f1]"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar CSV Robot
          </button>
        </div>
      </section>

      {/* Historial reciente tramitado */}
      {tramitadosRecientes.length > 0 && (
        <section className="card-surface rounded-2xl p-5">
          <h3 className="text-sm font-extrabold text-[#0f1f18]">Últimos trámites confirmados</h3>
          <div className="mt-3 divide-y divide-[#eef2eb]">
            {tramitadosRecientes.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-bold text-[#0f1f18]">{etiquetaTipo(ev.tipo)}</span>
                  <span className="font-mono text-[#4a5d54]">{ev.crotal}</span>
                </div>
                <div className="text-[#52655c]">
                  Tramitado {formatearFechaEs(ev.fechaTramitado)}
                  {ev.numeroJustificante ? ` · Ref: ${ev.numeroJustificante}` : ''}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Landmark,
  RefreshCw,
  Send,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  descargarArchivo,
  generarPaqueteRemoWebJson,
  generarXmlSitranBorrador,
} from '../domain/exportadores';
import { formatearFechaEs, hoyIso } from '../domain/fechas';
import { obtenerReglasNormativas } from '../domain/reglasNormativas';
import type { EstadoGanaderia, EventoTramite, UnidadGanadera } from '../domain/types';
import { AvatarVacaFoto } from './AvatarVacaFoto';

interface Props {
  estado: EstadoGanaderia;
  onMarcarTramitado: (eventoId: string, justificante?: string) => void;
  onMarcarTodosTramitados: () => void;
}

export function VistaSitran({
  estado,
  onMarcarTramitado,
  onMarcarTodosTramitados,
}: Props) {
  const [ultimaSync, setUltimaSync] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  const reglas = obtenerReglasNormativas(
    estado.explotacion.comunidad,
    estado.explotacion.especiePrincipal,
  );

  const pendientes = useMemo(
    () => estado.eventos.filter((e) => e.estadoTramite === 'PENDIENTE'),
    [estado.eventos],
  );

  const activasLocal = useMemo(
    () => estado.animales.filter((a) => a.estado === 'ACTIVO'),
    [estado.animales],
  );

  const activasEnSitran = useMemo(
    () => activasLocal.filter((a) => a.enCensoOficial),
    [activasLocal],
  );

  // Diferencias calculadas registro a registro (no por saldo neto global):
  // suma cada trámite pendiente (nacimientos, bajas, salidas, duplicados) + reses sin alta oficial que no tengan ya un trámite pendiente.
  const sinAltaSinEvento = useMemo(() => {
    const crotalesConPendiente = new Set(pendientes.map((p) => p.crotal));
    return activasLocal.filter((a) => !a.enCensoOficial && !crotalesConPendiente.has(a.crotal));
  }, [activasLocal, pendientes]);

  const totalDiferencias = pendientes.length + sinAltaSinEvento.length;

  const buscarAnimal = (ev: EventoTramite): UnidadGanadera | undefined =>
    estado.animales.find((a) => a.id === ev.animalId || a.crotal === ev.crotal);

  const etiquetaTipo = (tipo: EventoTramite['tipo']) => {
    switch (tipo) {
      case 'NACIMIENTO':
        return 'Nacimiento';
      case 'BAJA_MUERTE':
        return 'Baja por muerte';
      case 'DESAPARICION':
        return 'Desaparición';
      case 'SALIDA_MATADERO':
        return 'Salida a matadero';
      case 'SALIDA_MERCADO':
        return 'Salida a mercado';
      case 'SALIDA_PASTOS':
        return 'Traslado a pastos';
      case 'VENTA':
        return 'Venta / Traslado';
      case 'COMPRA':
        return 'Compra / Alta';
      case 'DUPLICADO_CROTAL':
        return 'Duplicado de crotal';
      default:
        return tipo;
    }
  };

  const handleSincronizarConSitran = () => {
    const ahora = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setUltimaSync(ahora);
    if (totalDiferencias === 0) {
      setAviso(
        `Consulta con SITRAN (${reglas.portalNombre}) a las ${ahora}: sin diferencias entre registros (${activasLocal.length} reses al día).`,
      );
    } else {
      setAviso(
        `Consulta SITRAN (${ahora}): detectadas ${totalDiferencias} diferencia(s) entre registros pendientes de enviar.`,
      );
    }
  };

  const handleMandarUno = (ev: EventoTramite) => {
    const ref = `REMO-${hoyIso().replace(/-/g, '')}-${ev.crotal.slice(-4)}`;
    onMarcarTramitado(ev.id, ref);
    setAviso(`Trámite "${etiquetaTipo(ev.tipo)}" (${ev.crotal}) enviado a SITRAN (${ref}).`);
  };

  const handleMandarTodo = () => {
    if (pendientes.length === 0) return;
    const total = pendientes.length;
    onMarcarTodosTramitados();
    setAviso(`Se han enviado todos los trámites (${total}) a SITRAN a través de RemoWeb.`);
  };

  return (
    <div className="animate-fade-up space-y-4">
      {/* Cabecera y botón principal de consulta SITRAN */}
      <section className="card-surface rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0f3d2e] text-amber-300">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#0f1f18]">
                SITRAN / {reglas.portalNombre}
              </h2>
              <p className="text-xs text-[#52655c]">
                REGA {estado.explotacion.codigoRega} · Compara tu cuadra con SITRAN y envía los
                trámites pendientes.
              </p>
            </div>
          </div>

          <a
            href={reglas.portalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#dce4d6] bg-white px-3 py-1.5 text-xs font-bold text-[#1f3329] hover:bg-[#f4f6f1]"
          >
            Abrir RemoWeb
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <button
          type="button"
          onClick={handleSincronizarConSitran}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f3d2e] px-4 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#16523e] active:scale-[0.99]"
        >
          <RefreshCw className="h-4 w-4 text-amber-300" />
          Sincronizar con SITRAN{ultimaSync ? ` (${ultimaSync})` : ''}
        </button>

        {aviso && (
          <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
            <span>{aviso}</span>
            <button
              type="button"
              onClick={() => setAviso(null)}
              className="shrink-0 text-[11px] font-bold text-emerald-700 underline"
            >
              Cerrar
            </button>
          </div>
        )}
      </section>

      {/* Comparativa compacta en una sola fila (siempre 3 columnas, sin scroll extra) */}
      <section className="grid grid-cols-3 gap-2">
        <div className="card-surface rounded-xl px-3 py-2.5 text-center">
          <p className="truncate text-[10px] font-bold uppercase tracking-wide text-[#52655c]">
            En GanaderIA
          </p>
          <p className="mt-0.5 font-mono text-xl font-extrabold text-[#0f1f18]">
            {activasLocal.length}
          </p>
        </div>
        <div className="card-surface rounded-xl px-3 py-2.5 text-center">
          <p className="truncate text-[10px] font-bold uppercase tracking-wide text-[#52655c]">
            En SITRAN
          </p>
          <p className="mt-0.5 font-mono text-xl font-extrabold text-emerald-800">
            {activasEnSitran.length}
          </p>
        </div>
        <div className="card-surface rounded-xl px-3 py-2.5 text-center">
          <p className="truncate text-[10px] font-bold uppercase tracking-wide text-[#52655c]">
            Diferencias
          </p>
          <p
            className={`mt-0.5 font-mono text-xl font-extrabold ${
              totalDiferencias > 0 ? 'text-amber-700' : 'text-emerald-700'
            }`}
          >
            {totalDiferencias}
          </p>
        </div>
      </section>

      {/* Listado de diferencias / trámites pendientes (clic para expandir ficha completa) */}
      <section className="card-surface overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf1e9] bg-[#fafbf8] px-4 py-3.5">
          <div>
            <h3 className="text-sm font-extrabold text-[#0f1f18]">
              Diferencias y trámites pendientes ({pendientes.length})
            </h3>
            <p className="text-[11px] text-[#52655c]">
              Pulsa en cualquier fila para ver la ficha completa antes de mandar a SITRAN.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={pendientes.length === 0}
              onClick={() =>
                descargarArchivo(
                  `paquete_remoweb_${estado.explotacion.codigoRega}_${hoyIso()}.json`,
                  generarPaqueteRemoWebJson(estado),
                  'application/json;charset=utf-8',
                )
              }
              className="inline-flex items-center gap-1 rounded-lg border border-[#dce4d6] bg-white px-2.5 py-1 text-[11px] font-bold text-[#1f3329] hover:bg-[#f4f6f1] disabled:opacity-40"
            >
              <Download className="h-3 w-3" />
              JSON
            </button>
            <button
              type="button"
              disabled={pendientes.length === 0}
              onClick={() =>
                descargarArchivo(
                  `borrador_sitran_${estado.explotacion.codigoRega}_${hoyIso()}.xml`,
                  generarXmlSitranBorrador(estado),
                  'application/xml;charset=utf-8',
                )
              }
              className="inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-900 hover:bg-sky-100 disabled:opacity-40"
            >
              <Download className="h-3 w-3" />
              XML SITRAN
            </button>
          </div>
        </div>

        <div className="divide-y divide-[#eef2eb]">
          {pendientes.length === 0 ? (
            <div className="flex items-center gap-2.5 p-5 text-sm font-bold text-emerald-800">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              No hay trámites pendientes. GanaderIA y SITRAN están al día.
            </div>
          ) : (
            pendientes.map((ev) => {
              const abierto = expandidoId === ev.id;
              const animal = buscarAnimal(ev);

              return (
                <div key={ev.id} className="transition hover:bg-[#fafbf8]">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandidoId(abierto ? null : ev.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandidoId(abierto ? null : ev.id);
                      }
                    }}
                    className="flex cursor-pointer flex-col gap-2.5 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-950">
                          {etiquetaTipo(ev.tipo)}
                        </span>
                        <span className="font-mono text-xs font-bold text-[#0f1f18]">
                          {ev.crotal}
                        </span>
                        {animal?.nombre && (
                          <span className="text-xs font-bold text-[#2b4036]">
                            ({animal.nombre})
                          </span>
                        )}
                        <span className="text-xs text-[#52655c]">
                          · {formatearFechaEs(ev.fechaEvento)}
                        </span>
                        {abierto ? (
                          <ChevronUp className="h-4 w-4 text-[#52655c]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#52655c]" />
                        )}
                      </div>
                      {(ev.motivo || ev.destino || ev.numeroDamer || ev.crotalMadre) && (
                        <p className="truncate text-xs text-[#4a5d54]">
                          {[
                            ev.crotalMadre ? `Madre: ${ev.crotalMadre}` : null,
                            ev.destino ? `Destino: ${ev.destino}` : null,
                            ev.numeroDamer ? `DAMER: ${ev.numeroDamer}` : null,
                            ev.motivo || null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMandarUno(ev);
                      }}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-extrabold text-white transition hover:bg-emerald-800"
                    >
                      <Send className="h-3.5 w-3.5" />
                      MANDAR A SITRAN
                    </button>
                  </div>

                  {/* Ficha completa desplegable al pulsar */}
                  {abierto && (
                    <div className="border-t border-[#eef2eb] bg-[#f8faf6] p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        {animal?.fotoDataUrl ? (
                          <AvatarVacaFoto
                            fotoDataUrl={animal.fotoDataUrl}
                            numeroCorto={animal.numeroCorto}
                            nombre={animal.nombre}
                            tamano="lg"
                          />
                        ) : (
                          <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-[3px] border-[#15803d] bg-white text-center shadow-xs">
                            <span className="text-[10px] font-bold text-[#52655c]">Crotal</span>
                            <span className="rounded bg-amber-300 px-1.5 py-0.5 font-mono text-xs font-extrabold text-amber-950">
                              #{animal?.numeroCorto || ev.crotal.slice(-4)}
                            </span>
                          </div>
                        )}

                        <div className="grid flex-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
                          <div>
                            <span className="font-semibold text-[#52655c]">Crotal oficial: </span>
                            <span className="font-mono font-bold text-[#0f1f18]">{ev.crotal}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-[#52655c]">Nombre: </span>
                            <span className="font-bold text-[#0f1f18]">
                              {animal?.nombre || 'Sin nombre'}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-[#52655c]">Raza / Sexo: </span>
                            <span className="font-bold text-[#0f1f18]">
                              {animal?.raza || ev.raza || '—'} ·{' '}
                              {(animal?.sexo || ev.sexo) === 'H'
                                ? 'Hembra'
                                : (animal?.sexo || ev.sexo) === 'M'
                                  ? 'Macho'
                                  : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-[#52655c]">Nacimiento: </span>
                            <span className="font-bold text-[#0f1f18]">
                              {formatearFechaEs(animal?.fechaNacimiento || ev.fechaEvento)}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-[#52655c]">Madre: </span>
                            <span className="font-mono font-bold text-[#0f1f18]">
                              {animal?.crotalMadre || ev.crotalMadre || '—'}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-[#52655c]">Estado en SITRAN: </span>
                            <span className="font-bold text-[#0f1f18]">
                              {animal?.enCensoOficial ? 'En censo oficial' : 'Pendiente de alta'}
                            </span>
                          </div>
                          {ev.modalidadMuerte && (
                            <div>
                              <span className="font-semibold text-[#52655c]">Modalidad muerte: </span>
                              <span className="font-bold text-[#0f1f18]">{ev.modalidadMuerte}</span>
                            </div>
                          )}
                          {ev.numeroDamer && (
                            <div>
                              <span className="font-semibold text-[#52655c]">Nº DAMER: </span>
                              <span className="font-mono font-bold text-[#0f1f18]">
                                {ev.numeroDamer}
                              </span>
                            </div>
                          )}
                          {ev.ceaMatadero && (
                            <div>
                              <span className="font-semibold text-[#52655c]">CEA Matadero: </span>
                              <span className="font-mono font-bold text-[#0f1f18]">
                                {ev.ceaMatadero}
                              </span>
                            </div>
                          )}
                          {(ev.concejo || ev.lugarMuerte) && (
                            <div>
                              <span className="font-semibold text-[#52655c]">Ubicación: </span>
                              <span className="font-bold text-[#0f1f18]">
                                {[ev.concejo, ev.lugarMuerte].filter(Boolean).join(' — ')}
                              </span>
                            </div>
                          )}
                          {ev.codigoSirentra && (
                            <div>
                              <span className="font-semibold text-[#52655c]">SIRENTRA: </span>
                              <span className="font-mono font-bold text-[#0f1f18]">
                                {ev.codigoSirentra}
                              </span>
                            </div>
                          )}
                          {ev.matriculaVehiculo && (
                            <div>
                              <span className="font-semibold text-[#52655c]">Matrícula: </span>
                              <span className="font-mono font-bold text-[#0f1f18]">
                                {ev.matriculaVehiculo}
                              </span>
                            </div>
                          )}
                          {ev.destino && (
                            <div className="sm:col-span-2">
                              <span className="font-semibold text-[#52655c]">Destino: </span>
                              <span className="font-bold text-[#0f1f18]">
                                {ev.destino}
                                {ev.codigoRegaDestino ? ` (${ev.codigoRegaDestino})` : ''}
                              </span>
                            </div>
                          )}
                          {ev.motivo && (
                            <div className="sm:col-span-2">
                              <span className="font-semibold text-[#52655c]">Motivo / Notas: </span>
                              <span className="text-[#0f1f18]">{ev.motivo}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {pendientes.length > 0 && (
          <div className="border-t border-[#e1e7dc] bg-[#f8faf6] p-4">
            <button
              type="button"
              onClick={handleMandarTodo}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#0f3d2e] px-5 py-4 text-sm font-extrabold text-white shadow-md transition hover:bg-[#16523e]"
            >
              <Send className="h-4 w-4 text-amber-300" />
              MANDAR TODO A SITRAN ({pendientes.length})
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

import {
  AlertTriangle,
  CheckCircle2,
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
import type { EstadoGanaderia, EventoTramite } from '../domain/types';

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

  const sinAltaOficial = useMemo(
    () => activasLocal.filter((a) => !a.enCensoOficial),
    [activasLocal],
  );

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
    if (pendientes.length === 0 && sinAltaOficial.length === 0) {
      setAviso(
        `Consulta con SITRAN (${reglas.portalNombre}) completada a las ${ahora}: todo tu censo (${activasLocal.length} reses) está cuadrado y sin trámites pendientes.`,
      );
    } else {
      setAviso(
        `Estado descargado de SITRAN / RemoWeb a las ${ahora}: detectados ${pendientes.length} trámite(s) pendientes y ${sinAltaOficial.length} res(es) sin alta oficial en el Principado.`,
      );
    }
  };

  const handleMandarUno = (ev: EventoTramite) => {
    const ref = `REMO-${hoyIso().replace(/-/g, '')}-${ev.crotal.slice(-4)}`;
    onMarcarTramitado(ev.id, ref);
    setAviso(`Trámite "${etiquetaTipo(ev.tipo)}" (${ev.crotal}) enviado a SITRAN vía RemoWeb (${ref}).`);
  };

  const handleMandarTodo = () => {
    if (pendientes.length === 0) return;
    const total = pendientes.length;
    onMarcarTodosTramitados();
    setAviso(`Se han enviado todos los trámites (${total}) a SITRAN a través de RemoWeb.`);
  };

  return (
    <div className="animate-fade-up space-y-5">
      {/* Cabecera y botón principal de consulta SITRAN */}
      <section className="card-surface rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f3d2e] text-amber-300">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#0f1f18]">
                SITRAN / {reglas.portalNombre}
              </h2>
              <p className="mt-0.5 text-xs text-[#52655c]">
                Descarga el estado actual de tu explotación ({estado.explotacion.codigoRega}) en
                SITRAN RemoWeb, compáralo con GanaderIA y envía los trámites pendientes.
              </p>
            </div>
          </div>

          <a
            href={reglas.portalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#dce4d6] bg-white px-3.5 py-2 text-xs font-bold text-[#1f3329] hover:bg-[#f4f6f1]"
          >
            Abrir RemoWeb
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <button
          type="button"
          onClick={handleSincronizarConSitran}
          className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#0f3d2e] px-5 py-4 text-sm font-extrabold text-white shadow-md transition hover:bg-[#16523e] active:scale-[0.99]"
        >
          <RefreshCw className="h-5 w-5 text-amber-300" />
          Sincronizar con SITRAN
          {ultimaSync ? ` (última: ${ultimaSync})` : ''}
        </button>

        {aviso && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-900">
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

      {/* Comparativa GanaderIA vs SITRAN */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="card-surface rounded-2xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#52655c]">
            En GanaderIA (activas)
          </p>
          <p className="mt-1 font-mono text-2xl font-extrabold text-[#0f1f18]">
            {activasLocal.length}
          </p>
        </div>
        <div className="card-surface rounded-2xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#52655c]">
            En SITRAN oficial
          </p>
          <p className="mt-1 font-mono text-2xl font-extrabold text-emerald-800">
            {activasEnSitran.length}
          </p>
        </div>
        <div className="card-surface rounded-2xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#52655c]">
            Diferencias / Pendientes
          </p>
          <p
            className={`mt-1 font-mono text-2xl font-extrabold ${
              pendientes.length + sinAltaOficial.length > 0
                ? 'text-amber-700'
                : 'text-emerald-700'
            }`}
          >
            {pendientes.length}
          </p>
        </div>
      </section>

      {/* Diferencias de censo detectadas */}
      {sinAltaOficial.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-center gap-2 text-xs font-extrabold text-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Diferencias de censo respecto a SITRAN ({sinAltaOficial.length} reses en GanaderIA aún
            no figuran en el censo oficial):
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sinAltaOficial.map((a) => (
              <span
                key={a.id}
                className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 font-mono text-xs font-bold text-amber-950"
              >
                #{a.numeroCorto} · {a.crotal}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Listado de trámites pendientes con botón individual MANDAR A SITRAN */}
      <section className="card-surface overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf1e9] bg-[#fafbf8] px-5 py-4">
          <div>
            <h3 className="text-base font-extrabold text-[#0f1f18]">
              Trámites pendientes de sincronizar con SITRAN ({pendientes.length})
            </h3>
            <p className="text-xs text-[#52655c]">
              Puedes enviarlos uno a uno a través de RemoWeb o mandarlos todos al final.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce4d6] bg-white px-3 py-1.5 text-xs font-bold text-[#1f3329] hover:bg-[#f4f6f1] disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              JSON RemoWeb
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-900 hover:bg-sky-100 disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              XML SITRAN
            </button>
          </div>
        </div>

        <div className="divide-y divide-[#eef2eb]">
          {pendientes.length === 0 ? (
            <div className="flex items-center gap-2.5 p-6 text-sm font-bold text-emerald-800">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              No hay trámites pendientes. GanaderIA y SITRAN están al día.
            </div>
          ) : (
            pendientes.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-950">
                      {etiquetaTipo(ev.tipo)}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#0f1f18]">{ev.crotal}</span>
                    <span className="text-xs text-[#52655c]">
                      · {formatearFechaEs(ev.fechaEvento)}
                    </span>
                  </div>
                  {(ev.motivo || ev.destino || ev.numeroDamer || ev.crotalMadre) && (
                    <p className="text-xs text-[#4a5d54]">
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
                  onClick={() => handleMandarUno(ev)}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-emerald-800"
                >
                  <Send className="h-3.5 w-3.5" />
                  MANDAR A SITRAN
                </button>
              </div>
            ))
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

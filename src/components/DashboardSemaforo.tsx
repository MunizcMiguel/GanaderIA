import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Tag,
} from 'lucide-react';
import { useRef } from 'react';
import { estaEnSupresionCarne, estaEnSupresionLeche } from '../domain/alertas';
import { contarCrotalesDisponibles } from '../domain/crotales';
import { hoyIso } from '../domain/fechas';
import { detectarVacasProblema } from '../domain/incidencias';
import { obtenerReglasNormativas, obtenerSimboloGanado } from '../domain/reglasNormativas';
import { calcularCalendarioReproductivo } from '../domain/reproduccion';
import type { AlertaPlazo, EstadoGanaderia } from '../domain/types';
import { BadgeNivel } from './BadgeNivel';

interface Props {
  estado: EstadoGanaderia;
  alertas: AlertaPlazo[];
  onIrA: (
    pestana:
      | 'panel'
      | 'calendario'
      | 'robot'
      | 'censo'
      | 'crotales'
      | 'reproduccion'
      | 'salidas'
      | 'analitica',
  ) => void;
  onAbrirNacimiento: () => void;
}

export function DashboardSemaforo({
  estado,
  alertas,
  onIrA,
}: Props) {
  const hoy = hoyIso();
  const semaforoRef = useRef<HTMLElement | null>(null);
  const reglas = obtenerReglasNormativas(
    estado.explotacion.comunidad,
    estado.explotacion.especiePrincipal,
  );

  const activosList = estado.animales.filter((a) => a.estado === 'ACTIVO');
  const activos = activosList.length;
  const simboloGanado = obtenerSimboloGanado(
    estado.animales,
    estado.explotacion.especiePrincipal,
  );
  const enSupresion = activosList.filter(
    (a) => estaEnSupresionCarne(a, hoy) || estaEnSupresionLeche(a, hoy),
  ).length;

  const tramitesPendientes = estado.eventos.filter((e) => e.estadoTramite === 'PENDIENTE').length;
  const crotalesDisponibles = contarCrotalesDisponibles(
    estado.lotesCrotales,
    estado.explotacion.especiePrincipal,
  );
  const alertasCriticas = alertas.filter((a) => a.nivel === 'CRITICA').length;
  const diasMinSitran = alertas
    .filter(
      (a) =>
        (a.categoria === 'NOTIFICACION_NACIMIENTO' ||
          a.categoria === 'NOTIFICACION_BAJA' ||
          a.categoria === 'COLOCACION_CROTAL') &&
        typeof a.diasRestantes === 'number',
    )
    .map((a) => a.diasRestantes as number)
    .sort((a, b) => a - b)[0];
  const colorBadgeSitran =
    tramitesPendientes > 0 && diasMinSitran !== undefined && diasMinSitran <= 2
      ? 'bg-red-600'
      : tramitesPendientes > 0 && diasMinSitran !== undefined && diasMinSitran <= 5
        ? 'bg-orange-500'
        : 'bg-emerald-600';

  const hitosRepro = calcularCalendarioReproductivo(estado.inseminaciones, estado.animales, hoy);
  const partosInminentes = hitosRepro.filter((h) => h.diasHastaParto <= 10);
  const secadosProximos = hitosRepro.filter(
    (h) => h.diasHastaSecado !== undefined && h.diasHastaSecado >= -3 && h.diasHastaSecado <= 10,
  );
  const vacasProblemaCount = detectarVacasProblema(estado, hoy).length;

  const formatearCuentaAtras = (dias?: number) => {
    if (dias === undefined) return null;
    if (dias < 0) return `Vencido ${Math.abs(dias)}d`;
    if (dias === 0) return 'Vence HOY';
    if (dias === 1) return 'Queda 1 día';
    return `${dias} días`;
  };

  return (
    <div className="animate-fade-up space-y-6">
      {/* Cabecera minimalista: solo nombre de la ganadería */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d3528] via-[#124735] to-[#175942] px-5 py-4 text-white shadow-sm">
        <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
          {estado.explotacion.nombre}
        </h1>
      </div>

      {/* Fila única de 4 iconos circulares de estado y acceso rápido */}
      <div className="card-surface grid grid-cols-4 gap-2 rounded-2xl p-3.5 sm:p-4">
        <button
          type="button"
          onClick={() => onIrA('censo')}
          className="group flex flex-col items-center gap-1.5 text-center"
        >
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#0f3d2e] bg-[#f8faf6] text-2xl shadow-xs transition group-hover:scale-105">
            <span aria-hidden="true">{simboloGanado}</span>
            <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-[#0f3d2e] px-1 font-mono text-[11px] font-extrabold text-white shadow-xs">
              {activos}
            </span>
          </div>
          <span className="text-[11px] font-extrabold text-[#0f1f18]">MiGanado</span>
        </button>

        <button
          type="button"
          onClick={() => onIrA('robot')}
          className="group flex flex-col items-center gap-1.5 text-center"
        >
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#0f3d2e] bg-[#f8faf6] text-[#0f3d2e] shadow-xs transition group-hover:scale-105">
            <RefreshCw className="h-6 w-6" />
            <span
              className={`absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white px-1 font-mono text-[11px] font-extrabold text-white shadow-xs ${colorBadgeSitran}`}
            >
              {tramitesPendientes}
            </span>
          </div>
          <span className="text-[11px] font-extrabold text-[#0f1f18]">SITRAN</span>
        </button>

        <button
          type="button"
          onClick={() => onIrA('crotales')}
          className="group flex flex-col items-center gap-1.5 text-center"
        >
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#0f3d2e] bg-[#f8faf6] text-[#0f3d2e] shadow-xs transition group-hover:scale-105">
            <Tag className="h-6 w-6" />
            <span
              className={`absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white px-1 font-mono text-[11px] font-extrabold text-white shadow-xs ${
                crotalesDisponibles > 0 ? 'bg-emerald-600' : 'bg-red-600'
              }`}
            >
              {crotalesDisponibles}
            </span>
          </div>
          <span className="text-[11px] font-extrabold text-[#0f1f18]">Crotales</span>
        </button>

        <button
          type="button"
          onClick={() => semaforoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="group flex flex-col items-center gap-1.5 text-center"
        >
          <div
            className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 bg-[#f8faf6] shadow-xs transition group-hover:scale-105 ${
              alertasCriticas > 0
                ? 'border-red-600 text-red-700'
                : 'border-emerald-700 text-emerald-700'
            }`}
          >
            {alertasCriticas > 0 ? (
              <ShieldAlert className="h-6 w-6" />
            ) : (
              <ShieldCheck className="h-6 w-6" />
            )}
            <span
              className={`absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white px-1 font-mono text-[11px] font-extrabold text-white shadow-xs ${
                alertasCriticas > 0 ? 'bg-red-600' : 'bg-emerald-600'
              }`}
            >
              {alertasCriticas}
            </span>
          </div>
          <span className="text-[11px] font-extrabold text-[#0f1f18]">Alertas</span>
        </button>
      </div>

      {/* Hoy en la cuadra (compacto 2x2) */}
      <section className="card-surface rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
              <Sun className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-extrabold text-[#0f1f18]">Hoy en la cuadra</h2>
          </div>
          <button
            type="button"
            onClick={() => onIrA('analitica')}
            className="inline-flex items-center gap-1 rounded-xl border border-[#dce4d6] bg-[#f8faf6] px-3 py-1.5 text-xs font-bold text-[#0f3d2e] hover:bg-emerald-50"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Analítica y Vet
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => onIrA('reproduccion')}
            className="rounded-xl border border-[#e6ece2] bg-[#f8faf6] p-3 text-left transition hover:border-rose-300 hover:bg-rose-50/40"
          >
            <p className="text-[11px] font-bold text-rose-900">Partos inminentes (≤10d)</p>
            <p className="mt-1 font-mono text-lg font-extrabold text-[#0f1f18]">
              {partosInminentes.length}
            </p>
            <p className="truncate text-[11px] text-[#52655c]">
              {partosInminentes[0]
                ? `#${partosInminentes[0].numeroCorto} en ${partosInminentes[0].diasHastaParto}d`
                : 'Ninguno esta semana'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => onIrA('reproduccion')}
            className="rounded-xl border border-[#e6ece2] bg-[#f8faf6] p-3 text-left transition hover:border-amber-300 hover:bg-amber-50/40"
          >
            <p className="text-[11px] font-bold text-amber-900">Vacas para secar pronto</p>
            <p className="mt-1 font-mono text-lg font-extrabold text-[#0f1f18]">
              {secadosProximos.length}
            </p>
            <p className="truncate text-[11px] text-[#52655c]">
              {secadosProximos[0]
                ? `#${secadosProximos[0].numeroCorto} (${secadosProximos[0].diasHastaSecado}d)`
                : 'Al día'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => onIrA('censo')}
            className="rounded-xl border border-[#e6ece2] bg-[#f8faf6] p-3 text-left transition hover:border-red-300 hover:bg-red-50/40"
          >
            <p className="text-[11px] font-bold text-red-800">Apartar leche / Supresión</p>
            <p className="mt-1 font-mono text-lg font-extrabold text-[#0f1f18]">{enSupresion}</p>
            <p className="truncate text-[11px] text-[#52655c]">
              {enSupresion > 0 ? 'Separar antes de ordeño' : 'Tanque libre de antibióticos'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => onIrA('analitica')}
            className="rounded-xl border border-[#e6ece2] bg-[#f8faf6] p-3 text-left transition hover:border-purple-300 hover:bg-purple-50/40"
          >
            <p className="text-[11px] font-bold text-purple-900">Vacas a revisar / Desvieje</p>
            <p className="mt-1 font-mono text-lg font-extrabold text-[#0f1f18]">
              {vacasProblemaCount}
            </p>
            <p className="truncate text-[11px] text-[#52655c]">
              {vacasProblemaCount > 0 ? 'Mamitis, RCS o >150d abiertas' : 'Rebaño sano'}
            </p>
          </button>
        </div>
      </section>

      {/* Semáforo de Plazos Legales y Seguridad Sanitaria */}
      <section ref={semaforoRef} className="card-surface overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-2 border-b border-[#edf1e9] bg-[#fafbf8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#0f1f18]">
                Semáforo de Plazos Legales y Seguridad Sanitaria
              </h2>
              <p className="text-xs text-[#52655c]">
                {reglas.comunidadNombre}: notificación{' '}
                <strong>{reglas.plazoNotificacionNacimientoDias}d</strong> · crotal físico{' '}
                <strong>{reglas.plazoIdentificacionFisicaDias}d</strong> · supresión PRESVET
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onIrA('calendario')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce4d6] bg-white px-3 py-1.5 text-xs font-bold text-[#0f3d2e] transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              <Calendar className="h-3.5 w-3.5" />
              Ver Calendario
            </button>
            <span className="inline-flex items-center rounded-full bg-[#edf1e9] px-3 py-1 text-xs font-bold text-[#2b4036]">
              {alertas.length} aviso(s) activo(s)
            </span>
          </div>
        </div>

        <div className="divide-y divide-[#eef2eb]">
          {alertas.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <CheckCircle2 className="h-11 w-11 text-emerald-600" />
              <p className="text-base font-bold text-[#0f1f18]">
                ¡Todo al día sin riesgos de sanción!
              </p>
              <p className="max-w-md text-xs text-[#52655c]">
                No tienes plazos de 7/20 días pendientes ni animales en periodo de supresión.
              </p>
            </div>
          ) : (
            alertas.map((alerta) => {
              const borde =
                alerta.nivel === 'CRITICA'
                  ? 'border-l-red-500'
                  : alerta.nivel === 'ATENCION'
                    ? 'border-l-amber-400'
                    : 'border-l-emerald-500';
              const cuentaAtras = formatearCuentaAtras(alerta.diasRestantes);

              return (
                <div
                  key={alerta.id}
                  className={`flex flex-col gap-3 border-l-4 ${borde} px-5 py-4 transition hover:bg-[#f9faf7] sm:flex-row sm:items-center sm:justify-between`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        alerta.nivel === 'CRITICA'
                          ? 'bg-red-100 text-red-700'
                          : alerta.nivel === 'ATENCION'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <BadgeNivel nivel={alerta.nivel} />
                        {cuentaAtras && (
                          <span
                            className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ${
                              alerta.nivel === 'CRITICA'
                                ? 'bg-red-600 text-white'
                                : alerta.nivel === 'ATENCION'
                                  ? 'bg-amber-200 text-amber-950'
                                  : 'bg-[#edf1e9] text-[#2b4036]'
                            }`}
                          >
                            {cuentaAtras}
                          </span>
                        )}
                        <h3 className="text-sm font-bold text-[#0f1f18]">{alerta.titulo}</h3>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-[#4a5d54]">
                        {alerta.detalle}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">
                    {(alerta.categoria === 'NOTIFICACION_NACIMIENTO' ||
                      alerta.categoria === 'NOTIFICACION_BAJA' ||
                      alerta.categoria === 'COLOCACION_CROTAL') && (
                      <button
                        type="button"
                        onClick={() => onIrA('robot')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f3d2e] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#16523e]"
                      >
                        Ir a Cola RemoWeb
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {alerta.categoria === 'STOCK_CROTALES' && (
                      <button
                        type="button"
                        onClick={() => onIrA('crotales')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce4d6] bg-white px-3.5 py-2 text-xs font-bold text-[#1f3329] hover:bg-[#f4f6f1]"
                      >
                        <Tag className="h-3.5 w-3.5" />
                        Ver Crotales
                      </button>
                    )}
                    {alerta.categoria === 'SUPRESION' && (
                      <button
                        type="button"
                        onClick={() => onIrA('censo')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-bold text-red-800 hover:bg-red-50"
                      >
                        Ver ficha animal
                      </button>
                    )}
                    {alerta.categoria === 'SANEAMIENTO' && (
                      <button
                        type="button"
                        onClick={() => onIrA('salidas')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce4d6] bg-white px-3.5 py-2 text-xs font-bold text-[#1f3329] hover:bg-[#f4f6f1]"
                      >
                        Carpeta inspección
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
  );
}

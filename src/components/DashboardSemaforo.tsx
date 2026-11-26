import {
  AlertTriangle,
  ArrowRight,
  Baby,
  BarChart3,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Tag,
  Truck,
} from 'lucide-react';
import { estaEnSupresionCarne, estaEnSupresionLeche } from '../domain/alertas';
import {
  contarCrotalesDisponibles,
  obtenerAnimalesConCrotalFaltante,
  sugerirSiguienteCrotal,
} from '../domain/crotales';
import { hoyIso } from '../domain/fechas';
import { detectarVacasProblema } from '../domain/incidencias';
import { obtenerReglasNormativas } from '../domain/reglasNormativas';
import { calcularCalendarioReproductivo } from '../domain/reproduccion';
import { calcularUGMRebano } from '../domain/gestionAvanzada';
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

function AnilloSaludDocumental({ porcentaje }: { porcentaje: number }) {
  const radio = 30;
  const circunferencia = 2 * Math.PI * radio;
  const dashOffset = circunferencia * (1 - porcentaje / 100);
  const strokeColor =
    porcentaje >= 85 ? '#4ade80' : porcentaje >= 65 ? '#facc15' : '#f87171';

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 backdrop-blur-xs">
      <div className="relative h-16 w-16 shrink-0">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 72 72" aria-hidden="true">
          <circle
            cx="36"
            cy="36"
            r={radio}
            fill="none"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="6"
          />
          <circle
            cx="36"
            cy="36"
            r={radio}
            fill="none"
            stroke={strokeColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circunferencia}
            strokeDashoffset={dashOffset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-sm font-extrabold text-white">{porcentaje}%</span>
        </div>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
          Salud Documental
        </p>
        <p className="text-xs font-medium text-white/90">
          {porcentaje >= 85
            ? 'Explotación casi al día'
            : porcentaje >= 65
              ? 'Trámites próximos a vencer'
              : 'Atención urgente requerida'}
        </p>
      </div>
    </div>
  );
}

export function DashboardSemaforo({
  estado,
  alertas,
  onIrA,
  onAbrirNacimiento,
}: Props) {
  const hoy = hoyIso();
  const reglas = obtenerReglasNormativas(
    estado.explotacion.comunidad,
    estado.explotacion.especiePrincipal,
  );

  const activosList = estado.animales.filter((a) => a.estado === 'ACTIVO');
  const activos = activosList.length;
  const ugmTotal = calcularUGMRebano(estado.animales, hoy).totalUgm;
  const enSupresion = activosList.filter(
    (a) => estaEnSupresionCarne(a, hoy) || estaEnSupresionLeche(a, hoy),
  ).length;
  const pendPrincipado = activosList.filter((a) => !a.enCensoOficial).length;
  const okCenso = Math.max(0, activos - enSupresion - pendPrincipado);

  const tramitesPendientes = estado.eventos.filter((e) => e.estadoTramite === 'PENDIENTE').length;
  const crotalesDisponibles = contarCrotalesDisponibles(
    estado.lotesCrotales,
    estado.explotacion.especiePrincipal,
  );
  const totalCapacidadCrotales = estado.lotesCrotales
    .filter((l) => l.especie === estado.explotacion.especiePrincipal)
    .reduce((acc, l) => acc + (l.hasta - l.desde + 1), 0);
  const pctStockCrotales =
    totalCapacidadCrotales > 0
      ? Math.round((crotalesDisponibles / totalCapacidadCrotales) * 100)
      : 0;
  const siguienteCrotal = sugerirSiguienteCrotal(
    estado.lotesCrotales,
    estado.explotacion.especiePrincipal,
  );
  const duplicadosPendientes = obtenerAnimalesConCrotalFaltante(estado.animales).length;
  const alertasCriticas = alertas.filter((a) => a.nivel === 'CRITICA').length;
  const alertasAtencion = alertas.filter((a) => a.nivel === 'ATENCION').length;

  // Cálculo transparente de Salud Documental (0-100%)
  const penalizacion = alertasCriticas * 14 + alertasAtencion * 6 + tramitesPendientes * 4;
  const saludPct = Math.max(30, Math.min(100, 100 - penalizacion));

  const proximoPlazoDias = alertas
    .filter((a) => typeof a.diasRestantes === 'number')
    .map((a) => a.diasRestantes as number)
    .sort((a, b) => a - b)[0];

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
      {/* Cabecera Hero limpia y arquitectónica */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d3528] via-[#124735] to-[#175942] p-6 text-white shadow-md sm:p-7">
        {/* Textura topográfica sutil */}
        <svg
          className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 opacity-[0.07]"
          viewBox="0 0 200 200"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="100" cy="100" r="90" stroke="white" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="68" stroke="white" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="46" stroke="white" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="24" stroke="white" strokeWidth="1.5" />
        </svg>

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-emerald-100">
              <span>{reglas.comunidadNombre}</span>
              <span className="opacity-50">•</span>
              <span className="font-mono">REGA {estado.explotacion.codigoRega}</span>
              <span className="opacity-50">•</span>
              <span>{estado.explotacion.marcaRobot}</span>
            </div>
            <h1 className="mt-2.5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {estado.explotacion.nombre}
            </h1>
            <p className="mt-1 text-sm text-emerald-100/85">
              {estado.explotacion.titular} · {estado.explotacion.municipio}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <AnilloSaludDocumental porcentaje={saludPct} />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onIrA('robot')}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-extrabold text-amber-950 shadow-sm transition hover:bg-amber-200 active:scale-[0.98]"
              >
                <RefreshCw className="h-4 w-4" />
                Importar Robot
              </button>
              <button
                type="button"
                onClick={onAbrirNacimiento}
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/12 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/20 active:scale-[0.98]"
              >
                <Baby className="h-4 w-4" />
                Nacimiento
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4 KPIs con mini-visualizaciones integradas */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {/* KPI 1: Censo Activo + barra segmentada */}
        <button
          type="button"
          onClick={() => onIrA('censo')}
          className="card-surface card-interactive flex flex-col justify-between rounded-2xl p-4 text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#52655c]">
              Censo activo
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <ClipboardList className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold text-[#0f1f18]">{activos}</span>
            <span className="text-xs font-medium text-[#52655c]">reses</span>
            <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-extrabold text-emerald-900">
              {ugmTotal} UGM
            </span>
          </div>
          {/* Barra proporcional del rebaño */}
          <div className="mt-3 space-y-1.5">
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#edf1e9]">
              {activos > 0 && (
                <>
                  <div
                    className="bg-emerald-600"
                    style={{ width: `${(okCenso / activos) * 100}%` }}
                  />
                  <div
                    className="bg-amber-400"
                    style={{ width: `${(pendPrincipado / activos) * 100}%` }}
                  />
                  <div
                    className="bg-red-500"
                    style={{ width: `${(enSupresion / activos) * 100}%` }}
                  />
                </>
              )}
            </div>
            <p className="text-[11px] text-[#52655c]">
              {okCenso} OK · {pendPrincipado} pend. · {enSupresion} supresión
            </p>
          </div>
        </button>

        {/* KPI 2: Cola Agroficina Virtual */}
        <button
          type="button"
          onClick={() => onIrA('robot')}
          className={`card-interactive flex flex-col justify-between rounded-2xl border p-4 text-left ${
            tramitesPendientes > 0
              ? 'border-amber-200 bg-amber-50/65 shadow-xs'
              : 'card-surface'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900/80">
              Cola {reglas.portalNombre.split('/')[0].trim()}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold text-amber-950">
              {tramitesPendientes}
            </span>
            <span className="text-xs font-semibold text-amber-800">pendiente(s)</span>
          </div>
          <div className="mt-3">
            <span className="inline-flex items-center rounded-lg bg-white/90 px-2 py-0.5 text-[11px] font-bold text-amber-900 shadow-2xs">
              {proximoPlazoDias !== undefined
                ? `Próximo límite: ${formatearCuentaAtras(proximoPlazoDias)}`
                : 'Sin vencimientos'}
            </span>
          </div>
        </button>

        {/* KPI 3: Crotales en Cajón */}
        <button
          type="button"
          onClick={() => onIrA('crotales')}
          className="card-surface card-interactive flex flex-col justify-between rounded-2xl p-4 text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#52655c]">
              Crotales en cajón
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
              <Tag className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold text-[#0f3d2e]">
              {crotalesDisponibles}
            </span>
            {siguienteCrotal && (
              <span className="rounded-md bg-amber-200/80 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-950">
                #{siguienteCrotal.slice(-4)}
              </span>
            )}
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#edf1e9]">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{ width: `${pctStockCrotales}%` }}
              />
            </div>
            <p className="text-[11px] text-[#52655c]">
              {duplicadosPendientes > 0
                ? `${duplicadosPendientes} duplicado(s) por pedir`
                : 'Sin duplicados pendientes'}
            </p>
          </div>
        </button>

        {/* KPI 4: Semáforo Legal */}
        <div
          className={`flex flex-col justify-between rounded-2xl border p-4 shadow-xs ${
            alertasCriticas > 0
              ? 'border-red-200 bg-red-50/75'
              : 'border-emerald-200 bg-emerald-50/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#42554c]">
              Semáforo legal
            </span>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                alertasCriticas > 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {alertasCriticas > 0 ? (
                <ShieldAlert className="h-4 w-4" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`font-mono text-3xl font-extrabold ${
                alertasCriticas > 0 ? 'text-red-700' : 'text-emerald-800'
              }`}
            >
              {alertasCriticas}
            </span>
            <span className="text-xs font-semibold text-[#42554c]">
              {alertasCriticas === 1 ? 'urgente' : 'urgentes'}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                alertasCriticas > 0 ? 'bg-red-600' : 'bg-slate-300'
              }`}
            />
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                alertasAtencion > 0 ? 'bg-amber-400' : 'bg-slate-300'
              }`}
            />
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                alertasCriticas === 0 ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            />
            <span className="ml-1 text-[11px] font-medium text-[#52655c]">
              {alertasCriticas > 0 ? 'Requiere atención hoy' : 'Bajo control'}
            </span>
          </div>
        </div>
      </div>

      {/* Hoy en la cuadra (Agenda operativa 6:00 sin ruido estadístico) */}
      <section className="card-surface rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
              <Sun className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-[#0f1f18]">
                Hoy en la cuadra — Agenda de manejo rápido
              </h2>
              <p className="text-[11px] text-[#52655c]">
                Lo concreto que conviene atender hoy sin abrir pantallas técnicas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onIrA('analitica')}
            className="inline-flex items-center gap-1 rounded-xl border border-[#dce4d6] bg-[#f8faf6] px-3 py-1.5 text-xs font-bold text-[#0f3d2e] hover:bg-emerald-50"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Analítica y Parte Vet
          </button>
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
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
      <section className="card-surface overflow-hidden rounded-2xl">
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

      {/* Accesos rápidos ordenados */}
      <div className="grid gap-3.5 md:grid-cols-3">
        <button
          type="button"
          onClick={() => onIrA('robot')}
          className="card-surface card-interactive group flex items-start gap-3.5 rounded-2xl p-4 text-left"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#0f1f18] group-hover:text-emerald-800">
              Cuadre Robot ↔ Principado
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#52655c]">
              Arrastra tu CSV de Lely o DeLaval y detecta partos o bajas sin subir a RemoWeb.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onIrA('crotales')}
          className="card-surface card-interactive group flex items-start gap-3.5 rounded-2xl p-4 text-left"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#0f1f18] group-hover:text-emerald-800">
              Crotales y Duplicados ({duplicadosPendientes})
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#52655c]">
              Visualiza el próximo crotal del cajón y genera el pedido para AZASA / OCA.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onIrA('salidas')}
          className="card-surface card-interactive group flex items-start gap-3.5 rounded-2xl p-4 text-left"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-900">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#0f1f18] group-hover:text-emerald-800">
              Salidas Matadero / Pastos
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#52655c]">
              Comprueba supresión sanitaria y DIBs antes de sacar ganado y prepara tu guía.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}

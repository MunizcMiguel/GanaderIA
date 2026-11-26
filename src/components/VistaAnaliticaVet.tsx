import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Droplets,
  Euro,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Upload,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { generarCsvEjemploAscol } from '../data/demoAsturias';
import {
  calcularMetricasRebano,
  generarTextoParteVeterinario,
  parsearCsvControlLechero,
} from '../domain/analiticaGanadero';
import { normalizarCrotal } from '../domain/crotales';
import { formatearFechaEs, hoyIso } from '../domain/fechas';
import {
  calcularResumenCrecimientoRebano,
  calcularUGMRebano,
} from '../domain/gestionAvanzada';
import { detectarVacasProblema } from '../domain/incidencias';
import type {
  CampanaSaneamiento,
  ControlLecheroRegistro,
  EstadoGanaderia,
  MedicamentoBotiquin,
  MovimientoEconomico,
  UnidadGanadera,
} from '../domain/types';
import { BotonCopiar } from './BadgeNivel';
import { CrotalVisual } from './CrotalVisual';
import { ModalBase } from './ModalBase';
import { SubVistaRankingMadres } from './SubVistaRankingMadres';
import {
  SubVistaEconomiaEvolucion,
  SubVistaSaneamientoBotiquin,
} from './SubVistaSaneamientoEconomia';

interface Props {
  estado: EstadoGanaderia;
  onImportarControlesLecheros: (registros: ControlLecheroRegistro[]) => void;
  onRegistrarSaneamiento: (campana: CampanaSaneamiento) => void;
  onAnadirMedicamentoBotiquin: (med: MedicamentoBotiquin) => void;
  onEliminarMedicamentoBotiquin: (medId: string) => void;
  onAnadirMovimientoEconomico: (mov: MovimientoEconomico) => void;
  onAbrirLibrosOficiales: (libro?: 'EXPLOTACION' | 'TRATAMIENTOS') => void;
  onAbrirFichaAnimal: (animal: UnidadGanadera) => void;
}

type SubTabAnalitica = 'RESUMEN' | 'MADRES' | 'SANEAMIENTO' | 'ECONOMIA';

export function VistaAnaliticaVet({
  estado,
  onImportarControlesLecheros,
  onRegistrarSaneamiento,
  onAnadirMedicamentoBotiquin,
  onEliminarMedicamentoBotiquin,
  onAnadirMovimientoEconomico,
  onAbrirLibrosOficiales,
  onAbrirFichaAnimal,
}: Props) {
  const hoy = hoyIso();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [verParteVet, setVerParteVet] = useState(false);
  const [subTab, setSubTab] = useState<SubTabAnalitica>('RESUMEN');

  const esCarne = estado.explotacion.orientacionProductiva === 'CARNE';
  const metricas = useMemo(() => calcularMetricasRebano(estado, hoy), [estado, hoy]);
  const vacasProblema = useMemo(() => detectarVacasProblema(estado, hoy), [estado, hoy]);
  const crecimiento = useMemo(
    () => calcularResumenCrecimientoRebano(estado.animales, estado.pesajes),
    [estado.animales, estado.pesajes],
  );
  const ugm = useMemo(() => calcularUGMRebano(estado.animales, hoy), [estado.animales, hoy]);
  const textoParteVet = useMemo(() => generarTextoParteVeterinario(estado, hoy), [estado, hoy]);

  // Último control lechero por vaca para la tabla ASCOL
  const ultimosControles = useMemo(() => {
    const mapa = new Map<string, ControlLecheroRegistro>();
    for (const c of [...(estado.controlesLecheros || [])].sort((a, b) =>
      a.fechaControl.localeCompare(b.fechaControl),
    )) {
      mapa.set(normalizarCrotal(c.crotal), c);
    }
    return Array.from(mapa.values()).sort((a, b) => b.rcsMiles - a.rcsMiles);
  }, [estado.controlesLecheros]);

  const procesarCsvAscol = (contenido: string) => {
    const registros = parsearCsvControlLechero(contenido, estado.animales, hoy);
    if (registros.length > 0) {
      onImportarControlesLecheros(registros);
    }
  };

  const handleArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    procesarCsvAscol(await file.text());
    e.target.value = '';
  };

  return (
    <div className="animate-fade-up space-y-6">
      {/* Cabecera + Botón Parte Veterinario */}
      <section className="card-surface flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-900">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold text-[#0f1f18]">
                Analítica del Rebaño y Parte Veterinario
              </h2>
              <span className="rounded-full bg-[#edf1e9] px-2.5 py-0.5 text-[11px] font-bold text-[#2b4036]">
                Orientación: {estado.explotacion.orientacionProductiva || 'LECHE'}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[#52655c]">
              Indicadores clave en lenguaje claro de ganadero, detector de vacas problema
              {!esCarne ? ', control lechero ASCOL/CONAFE' : ''} y resumen en 1 clic para tu
              veterinario.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onAbrirLibrosOficiales('TRATAMIENTOS')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-950 hover:bg-emerald-100"
          >
            <BookOpenCheck className="h-4 w-4" />
            Libros PDF
          </button>
          <BotonCopiar valor={textoParteVet} etiqueta="Copiar para WhatsApp Vet" />
          <button
            type="button"
            onClick={() => setVerParteVet(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f3d2e] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#16523e]"
          >
            <Stethoscope className="h-4 w-4 text-amber-300" />
            Parte para Visita Veterinario
          </button>
        </div>
      </section>

      {/* Navegación interna de Analítica y Vet */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['RESUMEN', 'Resumen y Control', BarChart3],
            ['MADRES', 'Ranking Madres', Award],
            ['SANEAMIENTO', 'Saneamientos y Botiquín', ShieldCheck],
            ['ECONOMIA', 'Economía y Evolución', Euro],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              subTab === id
                ? 'bg-[#0f3d2e] text-white shadow-xs'
                : 'border border-[#dce4d6] bg-white text-[#31453b] hover:bg-[#edf1e9]'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
        <span className="ml-auto hidden items-center rounded-xl bg-[#edf1e9] px-3 py-1.5 font-mono text-xs font-extrabold text-[#0f3d2e] md:inline-flex">
          {ugm.totalUgm} UGM · GMD:{' '}
          {crecimiento.gmdMediaRebano ? `${crecimiento.gmdMediaRebano} kg/d` : '—'}
        </span>
      </div>

      {subTab === 'MADRES' && (
        <SubVistaRankingMadres
          estado={estado}
          hoy={hoy}
          onAbrirFichaAnimal={onAbrirFichaAnimal}
        />
      )}

      {subTab === 'SANEAMIENTO' && (
        <SubVistaSaneamientoBotiquin
          estado={estado}
          hoy={hoy}
          onRegistrarSaneamiento={onRegistrarSaneamiento}
          onAnadirMedicamentoBotiquin={onAnadirMedicamentoBotiquin}
          onEliminarMedicamentoBotiquin={onEliminarMedicamentoBotiquin}
        />
      )}

      {subTab === 'ECONOMIA' && (
        <SubVistaEconomiaEvolucion
          estado={estado}
          hoy={hoy}
          onAnadirMovimientoEconomico={onAnadirMovimientoEconomico}
        />
      )}

      {subTab === 'RESUMEN' && (
        <>
      {/* KPIs Reproductivos y Productivos en lenguaje ganadero */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {!esCarne && (
          <div className="card-surface rounded-2xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#52655c]">
              DEL Medio (Días en Leche)
            </p>
            <p className="mt-2 font-mono text-3xl font-extrabold text-[#0f3d2e]">
              {metricas.delMedio ?? '—'}
              {metricas.delMedio !== null && <span className="ml-1 text-sm font-semibold">d</span>}
            </p>
            <p className="mt-1 text-[11px] text-[#52655c]">
              Objetivo rebaño estable: 150–185 días
            </p>
          </div>
        )}

        <div className="card-surface rounded-2xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#52655c]">
            Días Abiertos / IEP
          </p>
          <p className="mt-2 font-mono text-3xl font-extrabold text-[#0f1f18]">
            {metricas.diasAbiertosMedio ?? '—'}
            {metricas.diasAbiertosMedio !== null && (
              <span className="ml-1 text-sm font-semibold text-[#52655c]">d</span>
            )}
          </p>
          <p className="mt-1 text-[11px] text-[#52655c]">
            IEP estimado:{' '}
            <strong className="font-mono text-[#0f1f18]">
              {metricas.iepEstimadoDias ? `${metricas.iepEstimadoDias} d` : '—'}
            </strong>{' '}
            (ideal &lt;410d)
          </p>
        </div>

        <div className="card-surface rounded-2xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#52655c]">
            Concepción · PR 21d
          </p>
          <p className="mt-2 font-mono text-3xl font-extrabold text-emerald-800">
            {metricas.tasaConcepcionPct !== null ? `${metricas.tasaConcepcionPct}%` : '—'}
          </p>
          <p className="mt-1 text-[11px] text-[#52655c]">
            PR 21 días (vet):{' '}
            <strong className="font-mono text-[#0f1f18]">
              {metricas.pr21DiasPct !== null ? `${metricas.pr21DiasPct}%` : '—'}
            </strong>
          </p>
        </div>

        {!esCarne ? (
          <div className="card-surface rounded-2xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#52655c]">
              Control Lechero ASCOL
            </p>
            <p className="mt-2 font-mono text-3xl font-extrabold text-sky-900">
              {metricas.litrosMediosUltimoControl !== null
                ? `${metricas.litrosMediosUltimoControl}`
                : '—'}
              {metricas.litrosMediosUltimoControl !== null && (
                <span className="ml-1 text-sm font-semibold text-[#52655c]">L/d</span>
              )}
            </p>
            <p className="mt-1 text-[11px] text-[#52655c]">
              <strong className={metricas.rcsAltoCount > 0 ? 'text-red-700' : 'text-emerald-700'}>
                {metricas.rcsAltoCount} vaca(s)
              </strong>{' '}
              con RCS ≥ 200k
            </p>
          </div>
        ) : (
          <div className="card-surface rounded-2xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#52655c]">
              Vacas Vacías &gt;100d
            </p>
            <p className="mt-2 font-mono text-3xl font-extrabold text-amber-800">
              {metricas.vacasVaciasMas100d.length}
            </p>
            <p className="mt-1 text-[11px] text-[#52655c]">Nodrizas pendientes de preñez</p>
          </div>
        )}
      </div>

      {/* Bloque doble: Detector de Vacas Problema + Vacas Vacías >100 días */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Detector de Vacas Problema / Desvieje */}
        <section className="card-surface overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-[#edf1e9] bg-[#fafbf8] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-[#0f1f18]">
                  Vacas Problema / Candidatas a Desvieje ({vacasProblema.length})
                </h3>
                <p className="text-[11px] text-[#52655c]">
                  Cruza mamitis repetidas, cojeras, RCS elevado y &gt;150 días abiertas
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-[#eef2eb]">
            {vacasProblema.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-10 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Sin vacas problema detectadas en este momento.
              </div>
            ) : (
              vacasProblema.map((item) => (
                <div
                  key={item.animal.id}
                  className="flex flex-col gap-3 p-4 transition hover:bg-[#fafbf8] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CrotalVisual
                      crotal={item.animal.crotal}
                      numeroCorto={item.animal.numeroCorto}
                      estadoCrotal={item.animal.estadoCrotal}
                      variante="badge"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-extrabold text-[#0f1f18]">
                          {item.animal.nombre || `Res #${item.animal.numeroCorto}`}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                            item.severidad === 'ALTA'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-950'
                          }`}
                        >
                          Prioridad {item.severidad}
                        </span>
                      </div>
                      <ul className="mt-1 space-y-0.5 text-xs text-[#4a5d54]">
                        {item.motivos.map((m, idx) => (
                          <li key={idx}>• {m}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAbrirFichaAnimal(item.animal)}
                    className="shrink-0 rounded-xl border border-[#dce4d6] bg-white px-3 py-1.5 text-xs font-bold text-[#0f3d2e] hover:bg-emerald-50"
                  >
                    Ver ficha →
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Lista accionable: Vacas vacías >100 días desde parto */}
        <section className="card-surface overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-[#edf1e9] bg-[#fafbf8] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                <Activity className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-[#0f1f18]">
                  Vacas Vacías con &gt;100 Días desde Parto ({metricas.vacasVaciasMas100d.length})
                </h3>
                <p className="text-[11px] text-[#52655c]">
                  Prioridad para vigilar celo, inseminar o revisar con veterinario
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-[#eef2eb]">
            {metricas.vacasVaciasMas100d.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-10 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Todas las vacas de más de 100 días tienen gestación confirmada.
              </div>
            ) : (
              metricas.vacasVaciasMas100d.map((v) => (
                <div
                  key={v.animal.id}
                  className="flex items-center justify-between gap-3 p-4 transition hover:bg-[#fafbf8]"
                >
                  <div className="flex items-center gap-3">
                    <CrotalVisual
                      crotal={v.animal.crotal}
                      numeroCorto={v.animal.numeroCorto}
                      variante="badge"
                    />
                    <div>
                      <p className="text-sm font-extrabold text-[#0f1f18]">
                        {v.animal.nombre || `Res #${v.animal.numeroCorto}`}
                      </p>
                      <p className="text-xs text-[#52655c]">
                        <strong className="font-mono text-amber-900">{v.diasDesdeParto} días</strong>{' '}
                        desde parto ·{' '}
                        {v.tieneInseminacionSinConfirmar
                          ? 'Inseminada (pendiente ecografía)'
                          : 'Sin inseminar aún'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAbrirFichaAnimal(v.animal)}
                    className="shrink-0 rounded-xl border border-[#dce4d6] bg-white px-3 py-1.5 text-xs font-bold text-[#0f3d2e] hover:bg-emerald-50"
                  >
                    Abrir →
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Importador de Control Lechero ASCOL / CONAFE / LILA (oculto en orientación Carne) */}
      {!esCarne && (
        <section className="card-surface overflow-hidden rounded-2xl">
          <div className="flex flex-col gap-3 border-b border-[#edf1e9] bg-[#fafbf8] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-900">
                <Droplets className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-[#0f1f18]">
                  Control Lechero Oficial (ASCOL / CONAFE / LILA)
                </h3>
                <p className="text-xs text-[#52655c]">
                  Importa el CSV mensual de control lechero para cruzar litros, grasa, proteína y
                  alertas de células somáticas (RCS ≥ 200.000 cél/ml).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleArchivo}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-sky-800"
              >
                <Upload className="h-4 w-4" />
                Subir CSV ASCOL
              </button>
              <button
                type="button"
                onClick={() => procesarCsvAscol(generarCsvEjemploAscol(hoy))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-xs font-bold text-sky-900 hover:bg-sky-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Probar ejemplo ASCOL
              </button>
            </div>
          </div>

          {ultimosControles.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-xs text-[#52655c]">
              <FileSpreadsheet className="h-8 w-8 text-[#9db097]" />
              <p>Aún no has cargado ningún archivo de control lechero.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#edf1e9] bg-[#f8faf6] text-[11px] font-extrabold uppercase tracking-wider text-[#52655c]">
                  <tr>
                    <th className="px-5 py-3">Vaca</th>
                    <th className="px-4 py-3">Fecha control</th>
                    <th className="px-4 py-3">Litros / día</th>
                    <th className="px-4 py-3">Grasa %</th>
                    <th className="px-4 py-3">Proteína %</th>
                    <th className="px-4 py-3">Células Somáticas (RCS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef2eb]">
                  {ultimosControles.map((c) => {
                    const animal = estado.animales.find(
                      (a) => normalizarCrotal(a.crotal) === normalizarCrotal(c.crotal),
                    );
                    const alertaRcs = c.rcsMiles >= 200;
                    return (
                      <tr key={c.id} className="hover:bg-[#fafbf8]">
                        <td className="px-5 py-3 font-bold text-[#0f1f18]">
                          {animal ? (
                            <button
                              type="button"
                              onClick={() => onAbrirFichaAnimal(animal)}
                              className="inline-flex items-center gap-2 text-left hover:text-emerald-800 hover:underline"
                            >
                              <span className="rounded bg-amber-200 px-1.5 py-0.5 font-mono text-[11px] font-extrabold text-amber-950">
                                #{animal.numeroCorto}
                              </span>
                              <span>{animal.nombre || animal.crotal}</span>
                            </button>
                          ) : (
                            <span className="font-mono">{c.crotal}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#52655c]">
                          {formatearFechaEs(c.fechaControl)}
                        </td>
                        <td className="px-4 py-3 font-mono font-extrabold text-[#0f3d2e]">
                          {c.litrosDia.toFixed(1)} L
                        </td>
                        <td className="px-4 py-3 font-mono">{c.grasaPct.toFixed(2)}%</td>
                        <td className="px-4 py-3 font-mono">{c.proteinaPct.toFixed(2)}%</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[11px] font-extrabold ${
                              c.rcsMiles >= 400
                                ? 'bg-red-100 text-red-800'
                                : alertaRcs
                                  ? 'bg-amber-100 text-amber-950'
                                  : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {c.rcsMiles}.000 cél/ml{alertaRcs ? ' · Alerta' : ''}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      </>
      )}

      {/* Modal Vista Imprimible: Parte para la Visita del Veterinario */}
      {verParteVet && (
        <ModalBase onCerrar={() => setVerParteVet(false)} maxWidthClass="max-w-2xl">
          <div className="p-5">
            <div className="flex items-center justify-between border-b border-[#edf1e9] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#0f1f18]">
                  Parte Imprimible para la Visita del Veterinario
                </h3>
                <p className="text-xs text-[#52655c]">
                  Resumen de 1 página con ecografías pendientes, vacías &gt;100d, mamitis/RCS y KPIs
                  técnicos (IEP y PR 21d).
                </p>
              </div>
              <div className="flex gap-2">
                <BotonCopiar valor={textoParteVet} etiqueta="Copiar texto" />
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f3d2e] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#16523e]"
                >
                  <Printer className="h-4 w-4 text-amber-300" />
                  Imprimir / PDF
                </button>
              </div>
            </div>

            <pre className="mt-4 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl border border-[#e1e7dc] bg-[#f8faf6] p-4 font-mono text-xs leading-relaxed text-[#0f1f18]">
              {textoParteVet}
            </pre>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setVerParteVet(false)}
                className="rounded-xl border border-[#dce4d6] px-4 py-2 text-xs font-bold text-[#31453b] hover:bg-[#f4f6f1]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </ModalBase>
      )}
    </div>
  );
}

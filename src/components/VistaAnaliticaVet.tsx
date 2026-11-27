import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  FileSpreadsheet,
  Printer,
  Search,
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
import { calcularResumenCrecimientoRebano } from '../domain/gestionAvanzada';
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
import { SubVistaSaneamientoBotiquin } from './SubVistaSaneamientoEconomia';

interface Props {
  estado: EstadoGanaderia;
  onImportarControlesLecheros: (registros: ControlLecheroRegistro[]) => void;
  onRegistrarSaneamiento: (campana: CampanaSaneamiento) => void;
  onAnadirMedicamentoBotiquin: (med: MedicamentoBotiquin) => void;
  onEliminarMedicamentoBotiquin: (medId: string) => void;
  onAnadirMovimientoEconomico?: (mov: MovimientoEconomico) => void;
  onAbrirLibrosOficiales?: (libro?: 'EXPLOTACION' | 'TRATAMIENTOS') => void;
  onAbrirFichaAnimal: (animal: UnidadGanadera) => void;
}

type SubTabVet = 'PROBLEMA' | 'ASCOL' | 'SANIDAD';

export function VistaAnaliticaVet({
  estado,
  onImportarControlesLecheros,
  onRegistrarSaneamiento,
  onAnadirMedicamentoBotiquin,
  onEliminarMedicamentoBotiquin,
  onAbrirFichaAnimal,
}: Props) {
  const hoy = hoyIso();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [verParteVet, setVerParteVet] = useState(false);
  const [subTab, setSubTab] = useState<SubTabVet>('PROBLEMA');
  const [busquedaControl, setBusquedaControl] = useState('');
  const [soloRcsAlto, setSoloRcsAlto] = useState(false);

  const esCarne = estado.explotacion.orientacionProductiva === 'CARNE';
  const metricas = useMemo(() => calcularMetricasRebano(estado, hoy), [estado, hoy]);
  const vacasProblema = useMemo(() => detectarVacasProblema(estado, hoy), [estado, hoy]);
  const crecimiento = useMemo(
    () => calcularResumenCrecimientoRebano(estado.animales, estado.pesajes),
    [estado.animales, estado.pesajes],
  );
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

  const controlesFiltrados = useMemo(() => {
    const q = busquedaControl.trim().toLowerCase();
    return ultimosControles.filter((c) => {
      if (soloRcsAlto && c.rcsMiles < 200) return false;
      if (!q) return true;
      const animal = estado.animales.find(
        (a) => normalizarCrotal(a.crotal) === normalizarCrotal(c.crotal),
      );
      return (
        c.crotal.toLowerCase().includes(q) ||
        (animal?.numeroCorto || '').toLowerCase().includes(q) ||
        (animal?.nombre || '').toLowerCase().includes(q)
      );
    });
  }, [ultimosControles, soloRcsAlto, busquedaControl, estado.animales]);

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

  const totalSanidad = (estado.saneamientos?.length || 0) + (estado.botiquin?.length || 0);

  return (
    <div className="animate-fade-up space-y-4">
      {/* Cabecera compacta + 3 iconos circulares de Veterinario */}
      <section className="card-surface space-y-4 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-[#0f3d2e]" />
            <h2 className="text-lg font-extrabold text-[#0f1f18]">Veterinario</h2>
          </div>

          <button
            type="button"
            onClick={() => setVerParteVet(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f3d2e] px-3.5 py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-[#16523e]"
          >
            <Stethoscope className="h-4 w-4 text-amber-300" />
            Parte Veterinario
          </button>
        </div>

        {/* 3 iconos circulares en fila */}
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              {
                id: 'PROBLEMA' as SubTabVet,
                label: 'Vacas Problema',
                Icon: AlertTriangle,
                badge: vacasProblema.length,
                badgeColor: vacasProblema.length > 0 ? 'bg-red-600' : 'bg-emerald-600',
              },
              {
                id: 'ASCOL' as SubTabVet,
                label: 'Control ASCOL',
                Icon: Droplets,
                badge: metricas.rcsAltoCount,
                badgeColor: metricas.rcsAltoCount > 0 ? 'bg-red-600' : 'bg-emerald-600',
              },
              {
                id: 'SANIDAD' as SubTabVet,
                label: 'Sanidad / Botiquín',
                Icon: ShieldCheck,
                badge: totalSanidad,
                badgeColor: 'bg-emerald-600',
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
                  <span
                    className={`absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white px-1 font-mono text-[11px] font-extrabold text-white shadow-xs ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-bold ${
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

      {subTab === 'SANIDAD' && (
        <SubVistaSaneamientoBotiquin
          estado={estado}
          hoy={hoy}
          onRegistrarSaneamiento={onRegistrarSaneamiento}
          onAnadirMedicamentoBotiquin={onAnadirMedicamentoBotiquin}
          onEliminarMedicamentoBotiquin={onEliminarMedicamentoBotiquin}
        />
      )}

      {subTab === 'PROBLEMA' && (
        <>
          {/* KPIs compactos 2x2 */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {!esCarne ? (
              <div className="card-surface rounded-2xl p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#52655c]">
                  DEL Medio
                </p>
                <p className="mt-1 font-mono text-2xl font-extrabold text-[#0f3d2e]">
                  {metricas.delMedio ?? '—'}
                  {metricas.delMedio !== null && (
                    <span className="ml-0.5 text-xs font-semibold">d</span>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-[#52655c]">Objetivo 150–185d</p>
              </div>
            ) : (
              <div className="card-surface rounded-2xl p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#52655c]">
                  GMD Media
                </p>
                <p className="mt-1 font-mono text-2xl font-extrabold text-[#0f3d2e]">
                  {crecimiento.gmdMediaRebano ? `${crecimiento.gmdMediaRebano}` : '—'}
                  {crecimiento.gmdMediaRebano ? (
                    <span className="ml-0.5 text-xs font-semibold">kg/d</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[11px] text-[#52655c]">Crecimiento recría</p>
              </div>
            )}

            <div className="card-surface rounded-2xl p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#52655c]">
                Días Abiertos / IEP
              </p>
              <p className="mt-1 font-mono text-2xl font-extrabold text-[#0f1f18]">
                {metricas.diasAbiertosMedio ?? '—'}
                {metricas.diasAbiertosMedio !== null && (
                  <span className="ml-0.5 text-xs font-semibold text-[#52655c]">d</span>
                )}
              </p>
              <p className="mt-0.5 text-[11px] text-[#52655c]">
                IEP: <strong>{metricas.iepEstimadoDias ? `${metricas.iepEstimadoDias}d` : '—'}</strong>
              </p>
            </div>

            <div className="card-surface rounded-2xl p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#52655c]">
                Concepción · PR 21d
              </p>
              <p className="mt-1 font-mono text-2xl font-extrabold text-emerald-800">
                {metricas.tasaConcepcionPct !== null ? `${metricas.tasaConcepcionPct}%` : '—'}
              </p>
              <p className="mt-0.5 text-[11px] text-[#52655c]">
                PR 21d: <strong>{metricas.pr21DiasPct !== null ? `${metricas.pr21DiasPct}%` : '—'}</strong>
              </p>
            </div>

            {!esCarne ? (
              <div className="card-surface rounded-2xl p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#52655c]">
                  Control ASCOL
                </p>
                <p className="mt-1 font-mono text-2xl font-extrabold text-sky-900">
                  {metricas.litrosMediosUltimoControl !== null
                    ? `${metricas.litrosMediosUltimoControl}`
                    : '—'}
                  {metricas.litrosMediosUltimoControl !== null && (
                    <span className="ml-0.5 text-xs font-semibold text-[#52655c]">L/d</span>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-[#52655c]">
                  <strong className={metricas.rcsAltoCount > 0 ? 'text-red-700' : 'text-emerald-700'}>
                    {metricas.rcsAltoCount} vaca(s)
                  </strong>{' '}
                  RCS ≥ 200k
                </p>
              </div>
            ) : (
              <div className="card-surface rounded-2xl p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#52655c]">
                  Vacías &gt;100d
                </p>
                <p className="mt-1 font-mono text-2xl font-extrabold text-amber-800">
                  {metricas.vacasVaciasMas100d.length}
                </p>
                <p className="mt-0.5 text-[11px] text-[#52655c]">Revisar en Reproducción</p>
              </div>
            )}
          </div>

          {/* Detector de Vacas Problema / Desvieje */}
          <section className="card-surface overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-[#edf1e9] bg-[#fafbf8] px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-[#0f1f18]">
                    Vacas Problema / Desvieje ({vacasProblema.length})
                  </h3>
                  <p className="text-[11px] text-[#52655c]">
                    Mamitis repetidas, cojeras, RCS alto o &gt;150d abiertas
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-[#eef2eb]">
              {vacasProblema.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Sin vacas problema detectadas en este momento.
                </div>
              ) : (
                vacasProblema.map((item) => (
                  <div
                    key={item.animal.id}
                    className="flex flex-col gap-2.5 p-4 transition hover:bg-[#fafbf8] sm:flex-row sm:items-center sm:justify-between"
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
        </>
      )}

      {/* Control Lechero ASCOL con buscador y filtro RCS >= 200k */}
      {subTab === 'ASCOL' && (
        <>
          {esCarne ? (
            <div className="card-surface rounded-2xl p-6 text-center text-xs text-[#52655c]">
              La explotación está configurada en orientación Carne. El control lechero ASCOL aplica a orientación Leche o Mixta.
            </div>
          ) : (
            <section className="card-surface overflow-hidden rounded-2xl">
              <div className="flex flex-col gap-3 border-b border-[#edf1e9] bg-[#fafbf8] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-900">
                    <Droplets className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#0f1f18]">
                      Control Lechero Oficial (ASCOL / CONAFE)
                    </h3>
                    <p className="text-[11px] text-[#52655c]">
                      Litros, grasa, proteína y células somáticas (RCS)
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
                    className="inline-flex items-center gap-1.5 rounded-xl bg-sky-700 px-3 py-2 text-xs font-bold text-white hover:bg-sky-800"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Subir CSV ASCOL
                  </button>
                  <button
                    type="button"
                    onClick={() => procesarCsvAscol(generarCsvEjemploAscol(hoy))}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-900 hover:bg-sky-50"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Ejemplo ASCOL
                  </button>
                </div>
              </div>

              {ultimosControles.length > 0 && (
                <div className="flex flex-col gap-2 border-b border-[#eef2eb] bg-white p-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#70857a]" />
                    <input
                      type="text"
                      value={busquedaControl}
                      onChange={(e) => setBusquedaControl(e.target.value)}
                      placeholder="Buscar vaca (#4521, Pinta...)"
                      className="w-full rounded-xl border border-[#dce4d6] bg-[#f8faf6] py-1.5 pl-8 pr-3 text-xs focus:border-emerald-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSoloRcsAlto((v) => !v)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                      soloRcsAlto
                        ? 'border-red-600 bg-red-600 text-white'
                        : 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100'
                    }`}
                  >
                    Solo RCS ≥ 200k ({metricas.rcsAltoCount})
                  </button>
                </div>
              )}

              {controlesFiltrados.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-xs text-[#52655c]">
                  <FileSpreadsheet className="h-7 w-7 text-[#9db097]" />
                  <p>
                    {ultimosControles.length === 0
                      ? 'Aún no has cargado ningún archivo de control lechero.'
                      : 'Ninguna vaca coincide con el filtro actual.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#edf1e9] bg-[#f8faf6] text-[11px] font-extrabold uppercase tracking-wider text-[#52655c]">
                      <tr>
                        <th className="px-4 py-2.5">Vaca</th>
                        <th className="px-3 py-2.5">Fecha</th>
                        <th className="px-3 py-2.5">Litros</th>
                        <th className="px-3 py-2.5">Grasa</th>
                        <th className="px-3 py-2.5">Prot.</th>
                        <th className="px-3 py-2.5">RCS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef2eb]">
                      {controlesFiltrados.map((c) => {
                        const animal = estado.animales.find(
                          (a) => normalizarCrotal(a.crotal) === normalizarCrotal(c.crotal),
                        );
                        const alertaRcs = c.rcsMiles >= 200;
                        return (
                          <tr key={c.id} className="hover:bg-[#fafbf8]">
                            <td className="px-4 py-2.5 font-bold text-[#0f1f18]">
                              {animal ? (
                                <button
                                  type="button"
                                  onClick={() => onAbrirFichaAnimal(animal)}
                                  className="inline-flex items-center gap-1.5 text-left hover:text-emerald-800 hover:underline"
                                >
                                  <span className="rounded bg-amber-200 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-amber-950">
                                    #{animal.numeroCorto}
                                  </span>
                                  <span>{animal.nombre || animal.crotal}</span>
                                </button>
                              ) : (
                                <span className="font-mono">{c.crotal}</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-[#52655c]">
                              {formatearFechaEs(c.fechaControl)}
                            </td>
                            <td className="px-3 py-2.5 font-mono font-extrabold text-[#0f3d2e]">
                              {c.litrosDia.toFixed(1)} L
                            </td>
                            <td className="px-3 py-2.5 font-mono">{c.grasaPct.toFixed(2)}%</td>
                            <td className="px-3 py-2.5 font-mono">{c.proteinaPct.toFixed(2)}%</td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-extrabold ${
                                  c.rcsMiles >= 400
                                    ? 'bg-red-100 text-red-800'
                                    : alertaRcs
                                      ? 'bg-amber-100 text-amber-950'
                                      : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {c.rcsMiles}k{alertaRcs ? ' · Alerta' : ''}
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
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf1e9] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#0f1f18]">
                  Parte Imprimible para la Visita del Veterinario
                </h3>
                <p className="text-xs text-[#52655c]">
                  Resumen de 1 página con ecografías pendientes, vacías &gt;100d, mamitis/RCS y KPIs.
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

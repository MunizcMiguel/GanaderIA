import {
  Euro,
  FileScan,
  Pill,
  Plus,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatearFechaEs, hoyIso, sumarDiasIso } from '../domain/fechas';
import {
  calcularEvolucionMensual,
  calcularResumenEconomico,
  CAMPANAS_SANEAMIENTO_META,
  CATEGORIAS_ECONOMICAS_META,
} from '../domain/gestionAvanzada';
import type {
  CampanaSaneamiento,
  CategoriaEconomica,
  EstadoGanaderia,
  MedicamentoBotiquin,
  MovimientoEconomico,
  ResultadoSaneamiento,
  TipoCampanaSaneamiento,
  TipoMovimientoEconomico,
} from '../domain/types';

export function SubVistaSaneamientoBotiquin({
  estado,
  hoy,
  onRegistrarSaneamiento,
  onAnadirMedicamentoBotiquin,
  onEliminarMedicamentoBotiquin,
  onEscanearRecetaBotiquin,
}: {
  estado: EstadoGanaderia;
  hoy: string;
  onRegistrarSaneamiento: (campana: CampanaSaneamiento) => void;
  onAnadirMedicamentoBotiquin: (med: MedicamentoBotiquin) => void;
  onEliminarMedicamentoBotiquin: (medId: string) => void;
  onEscanearRecetaBotiquin?: () => void;
}) {
  const activos = useMemo(
    () => estado.animales.filter((a) => a.estado === 'ACTIVO'),
    [estado.animales],
  );

  // Form nueva campaña saneamiento
  const [mostrarFormSan, setMostrarFormSan] = useState(false);
  const [tipoSan, setTipoSan] = useState<TipoCampanaSaneamiento>('TUBERCULOSIS');
  const [nombreSan, setNombreSan] = useState('Campaña Oficial Tuberculosis y Brucelosis');
  const [fechaSan, setFechaSan] = useState(hoy);
  const [fechaProximaSan, setFechaProximaSan] = useState(sumarDiasIso(hoy, 365));
  const [vetSan, setVetSan] = useState(estado.veterinarios?.[0] || '');
  const [vacunaNombre, setVacunaNombre] = useState('');
  const [serotipo, setSerotipo] = useState('');
  const [loteVacuna, setLoteVacuna] = useState('');
  const [resultadosMap, setResultadosMap] = useState<Record<string, ResultadoSaneamiento>>({});
  const [notasSan, setNotasSan] = useState('');

  // Form nuevo medicamento botiquín
  const [medNombre, setMedNombre] = useState('');
  const [medDosis, setMedDosis] = useState('');
  const [medCarne, setMedCarne] = useState('14');
  const [medLeche, setMedLeche] = useState('4');
  const medProv = estado.proveedores?.[0] || '';

  const handleGuardarSan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreSan.trim() || activos.length === 0) return;
    onRegistrarSaneamiento({
      id: `san-${Date.now()}`,
      tipo: tipoSan,
      nombre: nombreSan.trim(),
      fecha: fechaSan,
      fechaProxima: fechaProximaSan || undefined,
      veterinario: vetSan.trim() || undefined,
      vacunaNombre: vacunaNombre.trim() || undefined,
      serotipo: serotipo.trim() || undefined,
      loteVacuna: loteVacuna.trim() || undefined,
      resultados: activos.map((a) => ({
        animalId: a.id,
        crotal: a.crotal,
        resultado: resultadosMap[a.id] || 'NEGATIVO',
      })),
      notas: notasSan.trim() || undefined,
    });
    setMostrarFormSan(false);
    setResultadosMap({});
    setNotasSan('');
  };

  const handleCrearMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medNombre.trim()) return;
    onAnadirMedicamentoBotiquin({
      id: `med-${Date.now()}`,
      nombre: medNombre.trim(),
      dosisHabitual: medDosis.trim() || undefined,
      diasSupresionCarne: Math.max(0, Number(medCarne) || 0),
      diasSupresionLeche: Math.max(0, Number(medLeche) || 0),
      proveedor: medProv.trim() || undefined,
    });
    setMedNombre('');
    setMedDosis('');
  };

  const botiquin = estado.botiquin || [];
  const saneamientos = [...(estado.saneamientos || [])].sort((a, b) =>
    b.fecha.localeCompare(a.fecha),
  );

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Módulo de Saneamientos Oficiales de Campaña */}
      <section className="card-surface space-y-4 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0f1f18]">
                Campañas de Saneamiento Oficial
              </h3>
              <p className="text-xs text-[#52655c]">
                Tuberculosis, Brucelosis, IBR, BVD y Lengua Azul en lote con alertas automáticas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMostrarFormSan((v) => !v)}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#0f3d2e] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#175742]"
          >
            <Plus className="h-3.5 w-3.5 text-amber-300" />
            Nueva campaña
          </button>
        </div>

        {mostrarFormSan && (
          <form
            onSubmit={handleGuardarSan}
            className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 text-xs"
          >
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className="font-bold text-[#31453b]">
                Tipo de campaña
                <select
                  value={tipoSan}
                  onChange={(e) => {
                    const t = e.target.value as TipoCampanaSaneamiento;
                    setTipoSan(t);
                    setNombreSan(`Campaña ${CAMPANAS_SANEAMIENTO_META[t].etiqueta}`);
                  }}
                  className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2.5 py-1.5"
                >
                  {(Object.keys(CAMPANAS_SANEAMIENTO_META) as TipoCampanaSaneamiento[]).map((k) => (
                    <option key={k} value={k}>
                      {CAMPANAS_SANEAMIENTO_META[k].etiqueta}
                    </option>
                  ))}
                </select>
              </label>
              <label className="font-bold text-[#31453b]">
                Veterinario / ADS
                <input
                  type="text"
                  value={vetSan}
                  onChange={(e) => setVetSan(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2.5 py-1.5"
                />
              </label>
              <label className="font-bold text-[#31453b]">
                Fecha realización
                <input
                  type="date"
                  value={fechaSan}
                  onChange={(e) => {
                    setFechaSan(e.target.value);
                    setFechaProximaSan(sumarDiasIso(e.target.value, 365));
                  }}
                  className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2.5 py-1.5"
                />
              </label>
              <label className="font-bold text-[#31453b]">
                Próxima renovación
                <input
                  type="date"
                  value={fechaProximaSan}
                  onChange={(e) => setFechaProximaSan(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2.5 py-1.5"
                />
              </label>
            </div>

            {(tipoSan === 'LENGUA_AZUL' || tipoSan === 'IBR' || tipoSan === 'BVD') && (
              <div className="grid gap-2.5 rounded-xl border border-emerald-200 bg-white p-2.5 sm:grid-cols-3">
                <label className="font-bold text-[#31453b]">
                  Vacuna / Marca (RemoWeb)
                  <input
                    type="text"
                    placeholder="Ej: Syvazul / BTVPUR"
                    value={vacunaNombre}
                    onChange={(e) => setVacunaNombre(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#dce4d6] px-2 py-1"
                  />
                </label>
                <label className="font-bold text-[#31453b]">
                  Serotipo
                  <input
                    type="text"
                    placeholder="Ej: 1, 4, 8"
                    value={serotipo}
                    onChange={(e) => setSerotipo(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#dce4d6] px-2 py-1 font-mono"
                  />
                </label>
                <label className="font-bold text-[#31453b]">
                  Nº Lote vacuna
                  <input
                    type="text"
                    placeholder="Ej: L-2026-98A"
                    value={loteVacuna}
                    onChange={(e) => setLoteVacuna(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#dce4d6] px-2 py-1 font-mono"
                  />
                </label>
              </div>
            )}

            <div>
              <p className="mb-1.5 font-bold text-[#31453b]">
                Resultado por animal ({activos.length} activos — por defecto Negativo):
              </p>
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-[#dce4d6] bg-white p-2">
                {activos.map((a) => {
                  const res = resultadosMap[a.id] || 'NEGATIVO';
                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-[#f8faf6] px-2.5 py-1.5"
                    >
                      <span className="font-bold text-[#0f1f18]">
                        #{a.numeroCorto} {a.nombre || ''}
                      </span>
                      <div className="flex gap-1">
                        {(['NEGATIVO', 'DUDOSO', 'POSITIVO'] as ResultadoSaneamiento[]).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() =>
                              setResultadosMap((prev) => ({ ...prev, [a.id]: r }))
                            }
                            className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                              res === r
                                ? r === 'NEGATIVO'
                                  ? 'bg-emerald-600 text-white'
                                  : r === 'DUDOSO'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-red-600 text-white'
                                : 'border border-[#dce4d6] bg-white text-[#52655c]'
                            }`}
                          >
                            {r === 'NEGATIVO' ? 'Neg.' : r === 'DUDOSO' ? 'Dud.' : 'Pos.'}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMostrarFormSan(false)}
                className="rounded-lg px-3 py-1.5 font-bold text-[#52655c]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#0f3d2e] px-4 py-1.5 font-bold text-white"
              >
                Guardar campaña
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2.5">
          {saneamientos.length === 0 ? (
            <p className="text-xs text-[#52655c]">Sin campañas de saneamiento registradas.</p>
          ) : (
            saneamientos.map((s) => {
              const neg = s.resultados.filter((r) => r.resultado === 'NEGATIVO').length;
              const dud = s.resultados.filter((r) => r.resultado === 'DUDOSO').length;
              const pos = s.resultados.filter((r) => r.resultado === 'POSITIVO').length;
              return (
                <div
                  key={s.id}
                  className="rounded-xl border border-[#e1e7dc] bg-[#f8faf6] p-3.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-extrabold text-[#0f1f18]">{s.nombre}</p>
                    <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-[#31453b]">
                      {formatearFechaEs(s.fecha)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-bold text-emerald-900">
                      {neg} Negativos
                    </span>
                    {dud > 0 && (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 font-bold text-amber-900">
                        {dud} Dudosos
                      </span>
                    )}
                    {pos > 0 && (
                      <span className="rounded-md bg-red-100 px-2 py-0.5 font-bold text-red-900">
                        {pos} Positivos
                      </span>
                    )}
                    {s.fechaProxima && (
                      <span className="text-[#52655c]">
                        · Próxima: <strong>{formatearFechaEs(s.fechaProxima)}</strong>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Botiquín de la Granja (Catálogo reutilizable de fármacos con supresión) */}
      <section className="card-surface space-y-4 rounded-2xl p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-900">
            <Pill className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#0f1f18]">
              Botiquín de la Granja (Catálogo rápido)
            </h3>
            <p className="text-xs text-[#52655c]">
              Al elegir un medicamento en una receta, rellena automáticamente dosis y días de espera
              carne/leche.
            </p>
          </div>
        </div>

        {onEscanearRecetaBotiquin && (
          <button
            type="button"
            onClick={onEscanearRecetaBotiquin}
            className="flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50/70 p-4 text-left transition hover:border-emerald-600 hover:bg-emerald-50"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0f3d2e] text-white shadow-sm">
              <FileScan className="h-7 w-7 text-amber-300" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-[#0f1f18]">
                Escanear Receta para añadir al Botiquín
              </p>
              <p className="mt-0.5 text-xs text-[#4a5d54]">
                Foto o texto OCR de receta PRESVET · Guarda el fármaco y permite asignarlo (o no) a
                varias vacas a la vez.
              </p>
            </div>
          </button>
        )}

        <form onSubmit={handleCrearMed} className="grid gap-2 rounded-xl bg-[#f8faf6] p-3 text-xs sm:grid-cols-6">
          <input
            type="text"
            required
            placeholder="Nombre medicamento *"
            value={medNombre}
            onChange={(e) => setMedNombre(e.target.value)}
            className="rounded-lg border border-[#dce4d6] bg-white px-2.5 py-1.5 sm:col-span-3"
          />
          <input
            type="text"
            placeholder="Dosis (ej. 10 ml)"
            value={medDosis}
            onChange={(e) => setMedDosis(e.target.value)}
            className="rounded-lg border border-[#dce4d6] bg-white px-2.5 py-1.5 sm:col-span-3"
          />
          <label className="font-bold text-[#4a5d54] sm:col-span-2">
            Espera Carne (d)
            <input
              type="number"
              min="0"
              value={medCarne}
              onChange={(e) => setMedCarne(e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-[#dce4d6] bg-white px-2 py-1 font-mono"
            />
          </label>
          <label className="font-bold text-[#4a5d54] sm:col-span-2">
            Espera Leche (d)
            <input
              type="number"
              min="0"
              value={medLeche}
              onChange={(e) => setMedLeche(e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-[#dce4d6] bg-white px-2 py-1 font-mono"
            />
          </label>
          <div className="flex items-end sm:col-span-2">
            <button
              type="submit"
              className="w-full rounded-xl bg-[#0f3d2e] py-1.5 font-bold text-white hover:bg-[#175742]"
            >
              + Guardar fármaco
            </button>
          </div>
        </form>

        <div className="max-h-72 space-y-2 overflow-y-auto">
          {botiquin.map((med) => (
            <div
              key={med.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-[#e6ece2] bg-white px-3 py-2.5 text-xs"
            >
              <div>
                <p className="font-bold text-[#0f1f18]">{med.nombre}</p>
                <p className="text-[11px] text-[#52655c]">
                  Carne: <strong>{med.diasSupresionCarne}d</strong> · Leche:{' '}
                  <strong>{med.diasSupresionLeche}d</strong>
                  {med.dosisHabitual ? ` · ${med.dosisHabitual}` : ''}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Eliminar ${med.nombre}`}
                onClick={() => onEliminarMedicamentoBotiquin(med.id)}
                className="rounded-lg p-1.5 text-[#70857a] hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function SubVistaEconomiaEvolucion({
  estado,
  hoy,
  onAnadirMovimientoEconomico,
}: {
  estado: EstadoGanaderia;
  hoy: string;
  onAnadirMovimientoEconomico: (mov: MovimientoEconomico) => void;
}) {
  const evolucion = useMemo(() => calcularEvolucionMensual(estado, 6, hoy), [estado, hoy]);
  const resumen = useMemo(() => calcularResumenEconomico(estado), [estado]);

  const [tipo, setTipo] = useState<TipoMovimientoEconomico>('GASTO');
  const [categoria, setCategoria] = useState<CategoriaEconomica>('ALIMENTACION');
  const [concepto, setConcepto] = useState('');
  const [importe, setImporte] = useState('');
  const [fecha, setFecha] = useState(hoyIso());
  const [contraparte, setContraparte] = useState('');

  const handleCrear = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(importe.replace(',', '.'));
    if (!concepto.trim() || Number.isNaN(num) || num <= 0) return;
    onAnadirMovimientoEconomico({
      id: `eco-${Date.now()}`,
      fecha,
      tipo,
      categoria,
      concepto: concepto.trim(),
      importeEur: num,
      contraparte: contraparte.trim() || undefined,
    });
    setConcepto('');
    setImporte('');
    setContraparte('');
  };

  const maxEventosMes = Math.max(
    1,
    ...evolucion.map((p) => Math.max(p.nacimientos, p.bajas + p.ventas)),
  );
  const maxEurMes = Math.max(100, ...evolucion.map((p) => Math.max(p.ingresosEur, p.gastosEur)));
  const movsOrdenados = [...(estado.movimientosEconomicos || [])].sort((a, b) =>
    b.fecha.localeCompare(a.fecha),
  );

  return (
    <div className="space-y-5">
      {/* KPIs Económicos */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div className="card-surface rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-emerald-800">
            <TrendingUp className="h-4 w-4" />
            Ingresos registrados
          </div>
          <p className="mt-1.5 font-mono text-2xl font-extrabold text-emerald-800">
            +{resumen.totalIngresosEur.toLocaleString('es-ES')} €
          </p>
        </div>
        <div className="card-surface rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-red-700">
            <TrendingDown className="h-4 w-4" />
            Gastos registrados
          </div>
          <p className="mt-1.5 font-mono text-2xl font-extrabold text-red-700">
            -{resumen.totalGastosEur.toLocaleString('es-ES')} €
          </p>
        </div>
        <div className="card-surface rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-[#52655c]">
            <Euro className="h-4 w-4" />
            Balance neto
          </div>
          <p
            className={`mt-1.5 font-mono text-2xl font-extrabold ${
              resumen.saldoNetoEur >= 0 ? 'text-[#0f3d2e]' : 'text-red-700'
            }`}
          >
            {resumen.saldoNetoEur >= 0 ? '+' : ''}
            {resumen.saldoNetoEur.toLocaleString('es-ES')} €
          </p>
        </div>
      </div>

      {/* Gráficos Mensuales (Nacimientos/Bajas-Ventas y Balance €) */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card-surface space-y-3 rounded-2xl p-5">
          <h4 className="text-sm font-extrabold text-[#0f1f18]">
            Evolución del Rebaño (Últimos 6 meses)
          </h4>
          <div className="flex items-end justify-between gap-2 pt-3">
            {evolucion.map((p) => (
              <div key={p.mesKey} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-28 w-full items-end justify-center gap-1">
                  <div
                    title={`Nacimientos: ${p.nacimientos}`}
                    className="w-4 rounded-t-md bg-emerald-600 transition-all"
                    style={{
                      height: `${Math.max(6, Math.round((p.nacimientos / maxEventosMes) * 100))}%`,
                    }}
                  />
                  <div
                    title={`Bajas/Ventas: ${p.bajas + p.ventas}`}
                    className="w-4 rounded-t-md bg-amber-500 transition-all"
                    style={{
                      height: `${Math.max(6, Math.round(((p.bajas + p.ventas) / maxEventosMes) * 100))}%`,
                    }}
                  />
                </div>
                <span className="font-mono text-[11px] font-bold text-[#52655c]">{p.etiqueta}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 text-[11px] font-semibold text-[#52655c]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" /> Nacimientos
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Bajas y Ventas
            </span>
          </div>
        </div>

        <div className="card-surface space-y-3 rounded-2xl p-5">
          <h4 className="text-sm font-extrabold text-[#0f1f18]">
            Ingresos vs Gastos Mensuales (€)
          </h4>
          <div className="flex items-end justify-between gap-2 pt-3">
            {evolucion.map((p) => (
              <div key={p.mesKey} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-28 w-full items-end justify-center gap-1">
                  <div
                    title={`Ingresos: ${p.ingresosEur} €`}
                    className="w-4 rounded-t-md bg-[#0f3d2e] transition-all"
                    style={{
                      height: `${Math.max(6, Math.round((p.ingresosEur / maxEurMes) * 100))}%`,
                    }}
                  />
                  <div
                    title={`Gastos: ${p.gastosEur} €`}
                    className="w-4 rounded-t-md bg-rose-500 transition-all"
                    style={{
                      height: `${Math.max(6, Math.round((p.gastosEur / maxEurMes) * 100))}%`,
                    }}
                  />
                </div>
                <span className="font-mono text-[11px] font-bold text-[#52655c]">{p.etiqueta}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 text-[11px] font-semibold text-[#52655c]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#0f3d2e]" /> Ingresos (€)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> Gastos (€)
            </span>
          </div>
        </div>
      </div>

      {/* Formulario rápido + Listado de apuntes económicos */}
      <section className="card-surface space-y-4 rounded-2xl p-5">
        <h4 className="text-sm font-extrabold text-[#0f1f18]">
          Registrar Ingreso o Gasto de Explotación
        </h4>
        <form onSubmit={handleCrear} className="grid gap-2.5 text-xs sm:grid-cols-6">
          <select
            value={categoria}
            onChange={(e) => {
              const cat = e.target.value as CategoriaEconomica;
              setCategoria(cat);
              setTipo(CATEGORIAS_ECONOMICAS_META[cat].tipoDefecto);
            }}
            className="rounded-xl border border-[#dce4d6] bg-[#f8faf6] px-2.5 py-2 font-bold sm:col-span-2"
          >
            {(Object.keys(CATEGORIAS_ECONOMICAS_META) as CategoriaEconomica[]).map((k) => (
              <option key={k} value={k}>
                {CATEGORIAS_ECONOMICAS_META[k].etiqueta}
              </option>
            ))}
          </select>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoMovimientoEconomico)}
            className="rounded-xl border border-[#dce4d6] bg-[#f8faf6] px-2.5 py-2 font-bold"
          >
            <option value="INGRESO">Ingreso (+)</option>
            <option value="GASTO">Gasto (-)</option>
          </select>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="Importe € *"
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            className="rounded-xl border border-[#dce4d6] bg-white px-3 py-2 font-mono font-bold"
          />
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-xl border border-[#dce4d6] bg-white px-2.5 py-2 sm:col-span-2"
          />
          <input
            type="text"
            required
            placeholder="Concepto (ej. Factura pienso abril, Liquidación leche...)"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            className="rounded-xl border border-[#dce4d6] bg-white px-3 py-2 sm:col-span-3"
          />
          <input
            type="text"
            placeholder="Proveedor / Comprador (opcional)"
            value={contraparte}
            onChange={(e) => setContraparte(e.target.value)}
            className="rounded-xl border border-[#dce4d6] bg-white px-3 py-2 sm:col-span-2"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#0f3d2e] px-3 py-2 font-bold text-white hover:bg-[#175742]"
          >
            <Plus className="h-3.5 w-3.5 text-amber-300" />
            Apuntar
          </button>
        </form>

        <div className="space-y-1.5">
          {movsOrdenados.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e6ece2] bg-[#f8faf6] px-3.5 py-2.5 text-xs"
            >
              <div>
                <p className="font-bold text-[#0f1f18]">{m.concepto}</p>
                <p className="text-[11px] text-[#52655c]">
                  {formatearFechaEs(m.fecha)} · {CATEGORIAS_ECONOMICAS_META[m.categoria].etiqueta}
                  {m.contraparte ? ` · ${m.contraparte}` : ''}
                </p>
              </div>
              <span
                className={`font-mono text-sm font-extrabold ${
                  m.tipo === 'INGRESO' ? 'text-emerald-800' : 'text-red-700'
                }`}
              >
                {m.tipo === 'INGRESO' ? '+' : '-'}
                {m.importeEur.toLocaleString('es-ES')} €
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

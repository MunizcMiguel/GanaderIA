import { AlertTriangle, Baby, CalendarHeart, CheckCircle2, Plus, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { diferenciaDias, formatearFechaEs, hoyIso } from '../domain/fechas';
import { calcularConsanguinidadPotencial } from '../domain/gestionAvanzada';
import { calcularCalendarioReproductivo, GESTACION_DIAS } from '../domain/reproduccion';
import type { EstadoGanaderia } from '../domain/types';
import { BadgeNivel } from './BadgeNivel';
import { CrotalVisual } from './CrotalVisual';

interface Props {
  estado: EstadoGanaderia;
  onAnadirInseminacion: (datos: {
    animalId: string;
    fechaInseminacion: string;
    toro: string;
    confirmadaGestacion: boolean;
  }) => void;
  onConfirmarGestacion: (inseminacionId: string) => void;
  onMarcarParida: (inseminacionId: string) => void;
}

export function VistaReproduccion({
  estado,
  onAnadirInseminacion,
  onConfirmarGestacion,
  onMarcarParida,
}: Props) {
  const hoy = hoyIso();
  const hembras = useMemo(
    () => estado.animales.filter((a) => a.estado === 'ACTIVO' && a.sexo === 'H'),
    [estado.animales],
  );
  const [animalId, setAnimalId] = useState(hembras[0]?.id || '');
  const [fecha, setFecha] = useState(hoy);
  const [toro, setToro] = useState('');
  const [confirmada, setConfirmada] = useState(false);

  const hitos = useMemo(
    () => calcularCalendarioReproductivo(estado.inseminaciones, estado.animales, hoy),
    [estado.inseminaciones, estado.animales, hoy],
  );

  const hembraSeleccionada = useMemo(
    () => hembras.find((h) => h.id === animalId),
    [hembras, animalId],
  );

  const alertaConsanguinidad = useMemo(
    () =>
      toro.trim() && hembraSeleccionada
        ? calcularConsanguinidadPotencial(hembraSeleccionada.crotal, toro, estado.animales)
        : null,
    [hembraSeleccionada, toro, estado.animales],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!animalId || !fecha) return;
    onAnadirInseminacion({
      animalId,
      fechaInseminacion: fecha,
      toro: toro.trim(),
      confirmadaGestacion: confirmada,
    });
    setToro('');
    setConfirmada(false);
  };

  return (
    <div className="animate-fade-up space-y-6">
      <div className="card-surface rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-800">
            <CalendarHeart className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#0f1f18]">
              Calendario Reproductivo Automático (Inseminaciones, Secados y Partos)
            </h2>
            <p className="mt-0.5 text-xs text-[#52655c]">
              A partir de cada inseminación trazamos la línea completa de gestación: diagnóstico
              (+35d), secado (-60d antes del parto) y parto previsto (+283d en vacuno).
            </p>
          </div>
        </div>

        {/* Alta rápida inseminación */}
        <form
          onSubmit={handleSubmit}
          className="mt-4 grid gap-3 rounded-2xl border border-[#e6ece2] bg-[#f8faf6] p-4 sm:grid-cols-4"
        >
          <label className="text-xs font-bold text-[#31453b]">
            Hembra
            <select
              value={animalId}
              onChange={(e) => setAnimalId(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2.5 py-2 text-xs focus:border-emerald-600 focus:outline-none"
            >
              {hembras.map((h) => (
                <option key={h.id} value={h.id}>
                  #{h.numeroCorto} {h.nombre ? `(${h.nombre})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-[#31453b]">
            Fecha inseminación
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2.5 py-2 text-xs focus:border-emerald-600 focus:outline-none"
            />
          </label>
          <label className="text-xs font-bold text-[#31453b]">
            Toro / Dosis (opcional)
            <input
              type="text"
              placeholder="Ej: ASCOL Capitán"
              value={toro}
              onChange={(e) => setToro(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2.5 py-2 text-xs focus:border-emerald-600 focus:outline-none"
            />
          </label>
          <div className="flex flex-col justify-between gap-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#31453b]">
              <input
                type="checkbox"
                checked={confirmada}
                onChange={(e) => setConfirmada(e.target.checked)}
                className="h-3.5 w-3.5 accent-emerald-700"
              />
              Gestación ya confirmada
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0f3d2e] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#16523e]"
            >
              <Plus className="h-4 w-4 text-amber-300" />
              Registrar cubrición
            </button>
          </div>
        </form>

        {/* Verificación automática de consanguinidad en vivo al elegir toro */}
        {alertaConsanguinidad && (
          <div
            className={`mt-3 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${
              alertaConsanguinidad.nivelRiesgo === 'ALTO'
                ? 'border-red-300 bg-red-50 text-red-900'
                : alertaConsanguinidad.nivelRiesgo === 'MEDIO'
                  ? 'border-amber-300 bg-amber-50 text-amber-950'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-900'
            }`}
          >
            {alertaConsanguinidad.nivelRiesgo === 'BAJO' ? (
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
            )}
            <span>
              <strong>Consanguinidad estimada:</strong> {alertaConsanguinidad.mensaje}
            </span>
          </div>
        )}
      </div>

      {/* Listado con barra visual de gestación de 283 días */}
      <section className="card-surface overflow-hidden rounded-2xl">
        <div className="border-b border-[#edf1e9] bg-[#fafbf8] px-5 py-4">
          <h3 className="text-base font-extrabold text-[#0f1f18]">
            Próximos hitos reproductivos ({hitos.length})
          </h3>
        </div>

        <div className="divide-y divide-[#eef2eb]">
          {hitos.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#52655c]">
              Sin inseminaciones activas registradas.
            </div>
          ) : (
            hitos.map((h) => {
              const totalDias = GESTACION_DIAS[estado.explotacion.especiePrincipal].gestacion;
              const diasTranscurridos = Math.max(0, diferenciaDias(hoy, h.fechaInseminacion));
              const pctHoy = Math.min(100, Math.max(2, Math.round((diasTranscurridos / totalDias) * 100)));
              const pctEco = Math.round((35 / totalDias) * 100);
              const pctSecado = Math.round(((totalDias - 60) / totalDias) * 100);

              return (
                <div key={h.inseminacionId} className="space-y-4 p-5 transition hover:bg-[#fafbf8]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3.5">
                      <CrotalVisual
                        crotal={h.crotal}
                        numeroCorto={h.numeroCorto}
                        variante="badge"
                      />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-extrabold text-[#0f1f18]">
                            {h.nombre || h.crotal}
                          </span>
                          <BadgeNivel nivel={h.nivel} texto={h.etiquetaHito} />
                          {h.confirmadaGestacion ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                              Gestación confirmada
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#edf1e9] px-2.5 py-0.5 text-[11px] font-bold text-[#4a5d54]">
                              Pend. ecografía
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#52655c]">
                          <span>
                            Día <strong className="font-mono text-[#0f1f18]">{diasTranscurridos}</strong> /{' '}
                            {totalDias}
                          </span>
                          {h.toro && (
                            <span>
                              Toro: <strong className="text-[#0f1f18]">{h.toro}</strong>
                            </span>
                          )}
                          <span>
                            Parto previsto:{' '}
                            <strong className="text-[#0f1f18]">
                              {formatearFechaEs(h.fechaPartoPrevisto)}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!h.confirmadaGestacion && (
                        <button
                          type="button"
                          onClick={() => onConfirmarGestacion(h.inseminacionId)}
                          className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Confirmar preñada
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onMarcarParida(h.inseminacionId)}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#dce4d6] bg-white px-3 py-1.5 text-xs font-bold text-[#1f3329] hover:bg-[#f4f6f1]"
                      >
                        <Baby className="h-3.5 w-3.5 text-emerald-700" />
                        Ya parió (abrir alta)
                      </button>
                    </div>
                  </div>

                  {/* Barra visual de gestación de 283 días */}
                  <div className="rounded-xl border border-[#e6ece2] bg-[#f8faf6] px-4 py-3">
                    <div className="relative h-3 w-full rounded-full bg-[#e1e7dc]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-400 transition-all"
                        style={{ width: `${pctHoy}%` }}
                      />
                      {/* Marcador Ecografía +35d */}
                      <span
                        className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-sky-500"
                        style={{ left: `${pctEco}%` }}
                        title={`Ecografía (+35d): ${formatearFechaEs(h.fechaDiagnostico)}`}
                      />
                      {/* Marcador Secado -60d */}
                      {h.fechaSecado && (
                        <span
                          className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-amber-600"
                          style={{ left: `${pctSecado}%` }}
                          title={`Secado (-60d): ${formatearFechaEs(h.fechaSecado)}`}
                        />
                      )}
                      {/* Pin de HOY */}
                      <span
                        className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#0f3d2e] shadow-sm"
                        style={{ left: `${pctHoy}%` }}
                        title={`Hoy: día ${diasTranscurridos}`}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#52655c]">
                      <span>
                        Insem. <strong className="text-[#0f1f18]">{formatearFechaEs(h.fechaInseminacion)}</strong>
                      </span>
                      <span className="text-sky-800">
                        Eco (+35d): <strong>{formatearFechaEs(h.fechaDiagnostico)}</strong>
                      </span>
                      {h.fechaSecado && (
                        <span className="text-amber-900">
                          Secado (-60d): <strong>{formatearFechaEs(h.fechaSecado)}</strong>
                        </span>
                      )}
                      <span className="text-emerald-900">
                        Parto: <strong>{formatearFechaEs(h.fechaPartoPrevisto)}</strong>
                      </span>
                    </div>
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

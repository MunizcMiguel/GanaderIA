import { Award, Scale } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  calcularRankingMadres,
  DIFICULTAD_PARTO_META,
  type MetricaMadreRanking,
} from '../domain/gestionAvanzada';
import type { EstadoGanaderia, UnidadGanadera } from '../domain/types';

function AnilloMetrica({
  valor,
  unidad,
  porcentaje,
  color,
  etiqueta,
}: {
  valor: string;
  unidad?: string;
  porcentaje: number;
  color: string;
  etiqueta: string;
}) {
  const r = 24;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, porcentaje));
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r={r} fill="none" stroke="#e6ece2" strokeWidth="5.5" />
          <circle
            cx="30"
            cy="30"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-tight">
          <span className="font-mono text-xs font-extrabold text-[#0f1f18]">{valor}</span>
          {unidad && <span className="text-[9px] font-semibold text-[#52655c]">{unidad}</span>}
        </div>
      </div>
      <span className="text-center text-[10px] font-bold text-[#52655c]">{etiqueta}</span>
    </div>
  );
}

export function SubVistaRankingMadres({
  estado,
  hoy,
  onAbrirFichaAnimal,
}: {
  estado: EstadoGanaderia;
  hoy: string;
  onAbrirFichaAnimal: (animal: UnidadGanadera) => void;
}) {
  const [orden, setOrden] = useState<'PUNTUACION' | 'PARTOS' | 'DIAS_PARTO' | 'IEP'>('PUNTUACION');
  const esCarne = estado.explotacion.orientacionProductiva === 'CARNE';

  const madres = useMemo(() => {
    const base = calcularRankingMadres(estado, hoy);
    return [...base].sort((a, b) => {
      if (orden === 'PARTOS') return b.numeroPartos - a.numeroPartos;
      if (orden === 'DIAS_PARTO') {
        return (b.diasDesdeUltimoParto ?? -1) - (a.diasDesdeUltimoParto ?? -1);
      }
      if (orden === 'IEP') {
        return (a.iepMedioDias ?? 9999) - (b.iepMedioDias ?? 9999);
      }
      return b.puntuacion - a.puntuacion;
    });
  }, [estado, hoy, orden]);

  const colorIep = (iep: number | null) => {
    if (iep === null) return '#94a3b8';
    if (iep <= 390) return '#16a34a';
    if (iep <= 425) return '#d97706';
    return '#dc2626';
  };

  const colorDiasParto = (dias: number | null) => {
    if (dias === null) return '#94a3b8';
    if (dias <= 300) return '#16a34a';
    if (dias <= 390) return '#d97706';
    return '#dc2626';
  };

  const renderTarjeta = (m: MetricaMadreRanking) => {
    const maxBar = Math.max(1, ...m.distribucionDificultad);
    return (
      <div
        key={m.animal.id}
        onClick={() => onAbrirFichaAnimal(m.animal)}
        className="card-interactive cursor-pointer rounded-2xl border border-[#e1e7dc] bg-white p-4 shadow-xs"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-amber-200 px-2 py-0.5 font-mono text-xs font-extrabold text-amber-950">
                #{m.animal.numeroCorto}
              </span>
              <span className="text-sm font-extrabold text-[#0f1f18]">
                {m.animal.nombre || m.animal.raza}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  m.etiquetaEstado === 'Top Madre'
                    ? 'bg-emerald-100 text-emerald-900'
                    : m.etiquetaEstado === 'Estable'
                      ? 'bg-sky-100 text-sky-900'
                      : 'bg-red-100 text-red-800'
                }`}
              >
                {m.etiquetaEstado} ({m.puntuacion}/100)
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-[#52655c]">
              {m.animal.crotal} · {m.animal.raza}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {m.gmdMediaCrias !== null && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-0.5 font-mono font-bold text-sky-900">
                <Scale className="h-3 w-3" />
                GMD crías: {m.gmdMediaCrias} kg/d
              </span>
            )}
            {!esCarne && m.ultimosLitros !== null && (
              <span className="rounded-lg bg-emerald-50 px-2 py-0.5 font-mono font-bold text-emerald-900">
                {m.ultimosLitros.toFixed(1)} L/d
              </span>
            )}
            {!esCarne && m.ultimoRcsMiles !== null && (
              <span
                className={`rounded-lg px-2 py-0.5 font-mono font-bold ${
                  m.ultimoRcsMiles >= 200
                    ? 'bg-red-100 text-red-800'
                    : 'bg-[#f4f6f1] text-[#31453b]'
                }`}
              >
                RCS {m.ultimoRcsMiles}k
              </span>
            )}
          </div>
        </div>

        {/* 3 Anillos SVG + Mini-barras de dificultad de parto 1..5 */}
        <div className="mt-4 grid grid-cols-2 items-center gap-3 sm:grid-cols-4">
          <AnilloMetrica
            valor={m.iepMedioDias !== null ? String(m.iepMedioDias) : '—'}
            unidad={m.iepMedioDias !== null ? 'días' : undefined}
            porcentaje={m.iepMedioDias !== null ? Math.min(100, (m.iepMedioDias / 450) * 100) : 0}
            color={colorIep(m.iepMedioDias)}
            etiqueta="IEP medio"
          />
          <AnilloMetrica
            valor={m.diasDesdeUltimoParto !== null ? String(m.diasDesdeUltimoParto) : '—'}
            unidad={m.diasDesdeUltimoParto !== null ? 'días' : undefined}
            porcentaje={
              m.diasDesdeUltimoParto !== null
                ? Math.min(100, (m.diasDesdeUltimoParto / 450) * 100)
                : 0
            }
            color={colorDiasParto(m.diasDesdeUltimoParto)}
            etiqueta="Desde último parto"
          />
          <AnilloMetrica
            valor={String(m.numeroPartos)}
            unidad={m.numeroPartos === 1 ? 'parto' : 'partos'}
            porcentaje={Math.min(100, m.numeroPartos * 18)}
            color="#0f3d2e"
            etiqueta="Nº partos"
          />

          {/* Mini-barras de dificultad de parto */}
          <div className="flex flex-col items-center gap-1 rounded-xl bg-[#f8faf6] p-2.5">
            <div className="flex h-12 items-end gap-1.5">
              {([1, 2, 3, 4, 5] as const).map((nivel) => {
                const count = m.distribucionDificultad[nivel - 1];
                const hPct = count > 0 ? Math.max(24, Math.round((count / maxBar) * 100)) : 8;
                return (
                  <div
                    key={nivel}
                    title={`${DIFICULTAD_PARTO_META[nivel].etiqueta}: ${count}`}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <div
                      className={`w-3 rounded-t-sm transition-all ${
                        count > 0 ? DIFICULTAD_PARTO_META[nivel].barClass : 'bg-[#dce4d6]'
                      }`}
                      style={{ height: `${Math.round((hPct / 100) * 38)}px` }}
                    />
                    <span className="font-mono text-[9px] font-bold text-[#52655c]">{nivel}</span>
                  </div>
                );
              })}
            </div>
            <span className="text-center text-[10px] font-bold text-[#52655c]">
              Dificultad (1-5)
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-4">
      <div className="card-surface flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#0f1f18]">
              Ranking Visual de Madres (Partos, IEP, Dificultad y Crías)
            </h3>
            <p className="text-xs text-[#52655c]">
              Identifica en segundos qué vacas paren sin ayuda todos los años y crían mejor frente a
              las que conviene revisar.
            </p>
          </div>
        </div>

        <select
          aria-label="Ordenar ranking de madres"
          value={orden}
          onChange={(e) => setOrden(e.target.value as typeof orden)}
          className="rounded-xl border border-[#dce4d6] bg-[#f8faf6] px-3 py-2 text-xs font-bold text-[#0f1f18]"
        >
          <option value="PUNTUACION">Orden: Mejor puntuación</option>
          <option value="PARTOS">Orden: Más partos</option>
          <option value="DIAS_PARTO">Orden: Más días sin parir</option>
          <option value="IEP">Orden: Mejor IEP</option>
        </select>
      </div>

      {madres.length === 0 ? (
        <div className="card-surface rounded-2xl p-8 text-center text-xs text-[#52655c]">
          No hay vacas adultas activas para calcular el ranking.
        </div>
      ) : (
        <div className="grid gap-3.5 lg:grid-cols-2">{madres.map(renderTarjeta)}</div>
      )}
    </section>
  );
}

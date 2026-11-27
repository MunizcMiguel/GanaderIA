import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Plus,
  Tag,
} from 'lucide-react';
import { useRef, useState } from 'react';
import {
  contarCrotalesDisponibles,
  listarCrotalesDisponiblesEnLote,
  obtenerAnimalesConCrotalFaltante,
  sugerirSiguienteCrotal,
} from '../domain/crotales';
import { descargarArchivo, generarCsvSolicitudDuplicados } from '../domain/exportadores';
import { hoyIso } from '../domain/fechas';
import { obtenerReglasNormativas } from '../domain/reglasNormativas';
import type { EstadoGanaderia, LoteCrotales } from '../domain/types';
import { BotonCopiar } from './BadgeNivel';
import { CrotalVisual } from './CrotalVisual';

interface Props {
  estado: EstadoGanaderia;
  onAnadirLote: (lote: LoteCrotales) => void;
  onResolverDuplicado: (animalId: string) => void;
}

export function VistaCrotales({ estado, onAnadirLote, onResolverDuplicado }: Props) {
  const [prefijo, setPrefijo] = useState('ES22030001');
  const [desde, setDesde] = useState('21');
  const [hasta, setHasta] = useState('50');
  const [origen, setOrigen] = useState('OCA / Agroficina Virtual');
  const [copiado, setCopiado] = useState(false);
  const [mostrarCajonDetalle, setMostrarCajonDetalle] = useState(false);
  const formRemesaRef = useRef<HTMLFormElement | null>(null);
  const [margenAviso, setMargenAviso] = useState<number>(() => {
    try {
      const saved = window.localStorage.getItem('ganaderia_margen_crotales');
      if (saved !== null) {
        const n = Number(saved);
        if (Number.isInteger(n) && n >= 0 && n <= 5) return n;
      }
    } catch {
      // ignora
    }
    return 5;
  });

  const cambiarMargenAviso = (nuevo: number) => {
    const clamped = Math.max(0, Math.min(5, nuevo));
    setMargenAviso(clamped);
    try {
      window.localStorage.setItem('ganaderia_margen_crotales', String(clamped));
    } catch {
      // ignora
    }
  };

  const handleCopiarCrotal = async (codigo: string) => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      // ignora
    }
  };

  const reglas = obtenerReglasNormativas(
    estado.explotacion.comunidad,
    estado.explotacion.especiePrincipal,
  );
  const totalDisponibles = contarCrotalesDisponibles(
    estado.lotesCrotales,
    estado.explotacion.especiePrincipal,
  );
  const siguiente = sugerirSiguienteCrotal(
    estado.lotesCrotales,
    estado.explotacion.especiePrincipal,
  );
  const duplicados = obtenerAnimalesConCrotalFaltante(estado.animales);

  const handleCrearLote = (e: React.FormEvent) => {
    e.preventDefault();
    const d = Number(desde);
    const h = Number(hasta);
    if (!prefijo.trim() || !Number.isInteger(d) || !Number.isInteger(h) || h < d) return;
    const digitos = Math.max(4, 14 - prefijo.trim().replace(/\s/g, '').length);
    onAnadirLote({
      id: `lote-${Date.now()}`,
      especie: estado.explotacion.especiePrincipal,
      prefijo: prefijo.trim().toUpperCase(),
      desde: d,
      hasta: h,
      digitosSecuencia: digitos,
      usados: [],
      fechaRecepcion: hoyIso(),
      origen: origen.trim() || 'OCA',
    });
  };

  const textoDuplicados = duplicados
    .map(
      (a) =>
        `${a.crotal} (#${a.numeroCorto}) — ${a.estadoCrotal} (${
          a.estadoCrotal === 'FALTAN_AMBOS' ? '2 uds.' : '1 ud.'
        })`,
    )
    .join('\n');

  const handleExportarDuplicados = () => {
    const csv = generarCsvSolicitudDuplicados(estado);
    descargarArchivo(
      `duplicados_crotales_${estado.explotacion.codigoRega}_${hoyIso()}.csv`,
      csv,
      'text/csv;charset=utf-8',
    );
  };

  const mostrarAlertaStockBajo = totalDisponibles < margenAviso;

  return (
    <div className="animate-fade-up space-y-5">
      {/* Alerta de stock bajo de crotales (si quedan menos del margen 0..5) */}
      {mostrarAlertaStockBajo && (
        <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-xs text-red-950 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-extrabold text-red-900">
                ¡Pide crotales nuevos! Quedan {totalDisponibles} en el cajón
              </p>
              <p className="text-xs text-red-800">
                Tienes activado el aviso cuando quedan menos de <strong>{margenAviso}</strong>{' '}
                crotales. Puedes posponer el aviso bajando el margen:
              </p>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="font-bold text-red-900">Posponer aviso a &lt;</span>
                {[5, 4, 3, 2, 1, 0].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => cambiarMargenAviso(m)}
                    className={`rounded-lg px-2.5 py-1 font-mono text-xs font-extrabold transition ${
                      margenAviso === m
                        ? 'bg-red-700 text-white'
                        : 'border border-red-200 bg-white text-red-900 hover:bg-red-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock en cajón (icono circular) + Siguiente crotal (con copiar integrado) en paralelo */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="card-surface rounded-2xl p-4 sm:p-5 lg:col-span-7">
          <div className="grid grid-cols-2 items-center gap-3">
            {/* Izquierda: Icono circular de crotales disponibles en el cajón (clic para desplegar remesas) */}
            <div className="flex flex-col items-center gap-2 text-center">
              <button
                type="button"
                onClick={() => setMostrarCajonDetalle((v) => !v)}
                className="group flex flex-col items-center gap-1.5 text-center"
              >
                <div
                  className={`relative flex h-20 w-20 items-center justify-center rounded-full border-2 bg-[#f8faf6] shadow-xs transition group-hover:scale-105 ${
                    mostrarCajonDetalle
                      ? 'border-[#0f3d2e] ring-2 ring-emerald-300'
                      : 'border-[#0f3d2e]'
                  }`}
                >
                  <Tag className="h-9 w-9 text-[#0f3d2e]" />
                  <span className="absolute -right-1 -top-1 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1.5 font-mono text-xs font-extrabold text-white shadow-xs">
                    {totalDisponibles}
                  </span>
                </div>
                <span className="text-xs font-extrabold text-[#0f1f18] underline decoration-emerald-400/70 underline-offset-2">
                  Crotales en cajón
                </span>
              </button>
              <div className="flex items-center justify-center gap-1 text-[10px] text-[#52655c]">
                <span>Aviso &lt;</span>
                <select
                  aria-label="Margen de aviso de crotales"
                  value={margenAviso}
                  onChange={(e) => cambiarMargenAviso(Number(e.target.value))}
                  className="rounded border border-[#dce4d6] bg-white px-1 py-0.5 font-mono text-[10px] font-bold text-[#0f1f18]"
                >
                  {[5, 4, 3, 2, 1, 0].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Derecha: Siguiente crotal libre con botón de copiar integrado */}
            <div className="flex flex-col items-center gap-1.5 text-center">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#52655c]">
                Siguiente crotal
              </span>
              {siguiente ? (
                <div className="relative inline-block">
                  <CrotalVisual
                    crotal={siguiente}
                    especie={estado.explotacion.especiePrincipal}
                    variante="tarjeta"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopiarCrotal(siguiente)}
                    title={`Copiar ${siguiente}`}
                    aria-label={`Copiar ${siguiente}`}
                    className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-lg border border-amber-500/60 bg-white/90 px-1.5 py-1 text-[10px] font-extrabold text-amber-950 shadow-xs transition hover:bg-white"
                  >
                    {copiado ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-700" />
                        <span className="text-emerald-800">OK</span>
                      </>
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs font-bold text-red-800">
                  Sin crotales libres.
                </div>
              )}
            </div>
          </div>

          {/* Desplegable al pulsar en el cajón: remesas pedidas + crotales libres + solicitar nueva remesa */}
          {mostrarCajonDetalle && (
            <div className="mt-4 space-y-3 border-t border-[#e6ece2] pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0f3d2e]">
                  Remesas pedidas y crotales sin asignar ({estado.lotesCrotales.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setMostrarCajonDetalle(false)}
                  className="text-[11px] font-bold text-[#52655c] underline"
                >
                  Cerrar
                </button>
              </div>

              {estado.lotesCrotales.length === 0 ? (
                <p className="rounded-xl bg-[#f8faf6] p-3 text-xs text-[#52655c]">
                  No hay remesas registradas todavía.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {estado.lotesCrotales.map((lote) => {
                    const libres = listarCrotalesDisponiblesEnLote(lote);
                    return (
                      <div
                        key={lote.id}
                        className="rounded-xl border border-[#dce4d6] bg-[#f8faf6] p-3 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-mono font-extrabold text-[#0f1f18]">
                              {lote.prefijo} ({String(lote.desde).padStart(lote.digitosSecuencia, '0')}–
                              {String(lote.hasta).padStart(lote.digitosSecuencia, '0')})
                            </span>
                            <p className="text-[11px] text-[#52655c]">
                              {lote.origen} · Recibida {lote.fechaRecepcion}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-extrabold ${
                              libres.length > 0
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {libres.length} libre(s)
                          </span>
                        </div>

                        {libres.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {libres.map((cod) => (
                              <button
                                key={cod}
                                type="button"
                                onClick={() => handleCopiarCrotal(cod)}
                                title={`Copiar ${cod}`}
                                className="rounded-md border border-amber-300 bg-amber-100/80 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-950 hover:bg-amber-200"
                              >
                                {cod}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1.5 text-[11px] italic text-[#6e8277]">
                            Remesa agotada (todos asignados).
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    formRemesaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0f3d2e] px-3.5 py-2.5 text-xs font-extrabold text-white hover:bg-[#16523e]"
                >
                  <Plus className="h-4 w-4 text-amber-300" />
                  Solicitar nueva remesa de crotales
                </button>
                <a
                  href={reglas.portalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#dce4d6] bg-white px-3 py-2.5 text-xs font-bold text-[#1f3329] hover:bg-[#f4f6f1]"
                >
                  RemoWeb
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Alta rápida de nueva remesa */}
        <form
          ref={formRemesaRef}
          onSubmit={handleCrearLote}
          className="card-surface flex flex-col justify-between rounded-2xl p-5 lg:col-span-5"
        >
          <div>
            <h3 className="text-sm font-extrabold text-[#0f1f18]">
              Añadir nueva remesa de crotales
            </h3>
            <p className="mt-0.5 text-xs text-[#52655c]">
              Registra el rango entregado por la OCA para control automático del cajón.
            </p>
            <div className="mt-3.5 grid grid-cols-3 gap-2.5">
              <label className="col-span-3 text-xs font-semibold text-[#31453b] sm:col-span-1">
                Prefijo
                <input
                  type="text"
                  value={prefijo}
                  onChange={(e) => setPrefijo(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-[#f8faf6] px-2.5 py-2 font-mono text-xs focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-[#31453b]">
                Desde nº
                <input
                  type="number"
                  min={1}
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-[#f8faf6] px-2.5 py-2 font-mono text-xs focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-[#31453b]">
                Hasta nº
                <input
                  type="number"
                  min={1}
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-[#f8faf6] px-2.5 py-2 font-mono text-xs focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </label>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex-1 text-xs font-semibold text-[#31453b]">
              Origen / Entrega
              <input
                type="text"
                value={origen}
                onChange={(e) => setOrigen(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-[#f8faf6] px-2.5 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#0f3d2e] px-4 py-2 text-xs font-bold text-white hover:bg-[#16523e]"
            >
              <Plus className="h-4 w-4 text-amber-300" />
              Guardar remesa
            </button>
          </div>
        </form>
      </div>

      {/* Remesas registradas */}
      <section className="card-surface rounded-2xl p-5">
        <h3 className="text-sm font-extrabold text-[#0f1f18]">Remesas registradas en cajón</h3>
        <div className="mt-3 space-y-3">
          {estado.lotesCrotales.map((lote) => {
            const total = lote.hasta - lote.desde + 1;
            const disponibles = listarCrotalesDisponiblesEnLote(lote);
            const porcentajeLibre = Math.round((disponibles.length / total) * 100);
            return (
              <div
                key={lote.id}
                className="rounded-xl border border-[#e6ece2] bg-[#f8faf6] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-sm font-extrabold text-[#0f1f18]">
                      {lote.prefijo}
                      {String(lote.desde).padStart(lote.digitosSecuencia, '0')} —{' '}
                      {String(lote.hasta).padStart(lote.digitosSecuencia, '0')}
                    </span>
                    <p className="text-xs text-[#52655c]">{lote.origen}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 font-mono text-xs font-extrabold text-emerald-900">
                    {disponibles.length} / {total} libres ({porcentajeLibre}%)
                  </span>
                </div>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#e1e7dc]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#14532d] to-emerald-500 transition-all"
                    style={{ width: `${porcentajeLibre}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Lista de duplicados por pérdida o deterioro (AZASA / OCA) */}
      <section className="overflow-hidden rounded-2xl border border-amber-300/80 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-amber-200/80 bg-amber-50/75 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-800" />
            <div>
              <h3 className="text-base font-extrabold text-[#0f1f18]">
                Lista de Duplicados de Crotales por Pedir ({duplicados.length})
              </h3>
              <p className="text-xs text-[#4a5d54]">
                Animales marcados en la cuadra con crotal caído o roto. Listado listo para{' '}
                <strong>{reglas.proveedorDuplicados}</strong>.
              </p>
            </div>
          </div>

          {duplicados.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <BotonCopiar valor={textoDuplicados} etiqueta="Copiar lista completa" />
              <button
                type="button"
                onClick={handleExportarDuplicados}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-800"
              >
                <Download className="h-4 w-4" />
                Exportar pedido CSV
              </button>
            </div>
          )}
        </div>

        <div className="divide-y divide-[#eef2eb]">
          {duplicados.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Ninguna res tiene crotales caídos o pendientes de duplicado.
            </div>
          ) : (
            duplicados.map((animal) => (
              <div
                key={animal.id}
                className="flex flex-col gap-3 p-4 transition hover:bg-[#fafbf8] sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="flex items-center gap-3">
                  <CrotalVisual
                    crotal={animal.crotal}
                    numeroCorto={animal.numeroCorto}
                    especie={animal.especie}
                    estadoCrotal={animal.estadoCrotal}
                    variante="badge"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-extrabold text-[#0f1f18]">
                        {animal.crotal}
                      </span>
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-950">
                        {animal.estadoCrotal === 'FALTAN_AMBOS'
                          ? 'Faltan ambos (2 uds.)'
                          : animal.estadoCrotal === 'FALTA_IZQUIERDO'
                            ? 'Falta izquierdo (1 ud.)'
                            : 'Falta derecho (1 ud.)'}
                      </span>
                    </div>
                    {animal.notas && (
                      <p className="mt-1 text-xs text-[#52655c]">{animal.notas}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <BotonCopiar valor={animal.crotal} etiqueta="Copiar" compacto />
                  <button
                    type="button"
                    onClick={() => onResolverDuplicado(animal.id)}
                    className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Ya colocado
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

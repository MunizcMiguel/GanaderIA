import { AlertCircle, CheckCircle2, Download, Plus, Tag } from 'lucide-react';
import { useState } from 'react';
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
  const [prefijo, setPrefijo] = useState('ES03004512');
  const [desde, setDesde] = useState('21');
  const [hasta, setHasta] = useState('50');
  const [origen, setOrigen] = useState('OCA / Agroficina Virtual');

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

  return (
    <div className="animate-fade-up space-y-6">
      {/* Stock + Ilustración realista del próximo crotal */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="card-surface flex flex-col justify-between gap-4 rounded-2xl p-5 sm:flex-row sm:items-center lg:col-span-7">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-900">
              <Tag className="h-3.5 w-3.5" />
              Stock en cajón ({estado.explotacion.especiePrincipal})
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono text-5xl font-extrabold text-[#0f3d2e]">
                {totalDisponibles}
              </span>
              <span className="text-sm font-medium text-[#52655c]">crotales libres</span>
            </div>
            <p className="max-w-xs text-xs leading-relaxed text-[#52655c]">
              Al registrar un nacimiento o cuadrar el robot, GanaderIA sugiere el próximo código
              libre para evitar errores de tecleo.
            </p>
            {siguiente && (
              <div className="pt-1">
                <BotonCopiar valor={siguiente} etiqueta={`Copiar ${siguiente}`} />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#52655c]">
              Próximo crotal libre
            </span>
            {siguiente ? (
              <CrotalVisual
                crotal={siguiente}
                especie={estado.explotacion.especiePrincipal}
                variante="tarjeta"
              />
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-xs font-bold text-red-800">
                Sin crotales libres en stock. Añade una nueva remesa.
              </div>
            )}
          </div>
        </div>

        {/* Alta rápida de nueva remesa */}
        <form
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

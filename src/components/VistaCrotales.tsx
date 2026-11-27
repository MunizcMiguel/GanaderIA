import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Mail,
  Plus,
  Tag,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import {
  contarCrotalesDisponibles,
  listarCrotalesDisponiblesEnLote,
  obtenerAnimalesConCrotalFaltante,
  sugerirSiguienteCrotal,
} from '../domain/crotales';
import { descargarArchivo, generarCsvSolicitudDuplicados } from '../domain/exportadores';
import { formatearFechaEs, hoyIso } from '../domain/fechas';
import { obtenerReglasNormativas } from '../domain/reglasNormativas';
import type {
  EstadoCrotalFisico,
  EstadoGanaderia,
  FormaEnvioDuplicado,
  LoteCrotales,
  PedidoDuplicadoItem,
} from '../domain/types';
import { BotonCopiar } from './BadgeNivel';
import { CrotalVisual } from './CrotalVisual';

interface Props {
  estado: EstadoGanaderia;
  onAnadirLote: (lote: LoteCrotales) => void;
  onResolverDuplicado: (animalId: string) => void;
  onSolicitarCrotales?: (datos: {
    cantidad: number;
    proveedor: string;
    formaEnvio: FormaEnvioDuplicado;
  }) => void;
  onAplazarPedidoCrotales?: () => void;
  onAnularPedidoCrotales?: () => void;
  onRegistrarPerdidaCrotal?: (animalId: string, nuevoEstado: EstadoCrotalFisico) => void;
  onCrearPedidoDuplicados?: (datos: {
    proveedor: string;
    formaEnvio: FormaEnvioDuplicado;
    items: Array<Omit<PedidoDuplicadoItem, 'colocado'>>;
  }) => void;
  onConfirmarRecepcionPedidoDuplicados?: (pedidoId: string) => void;
  onMarcarDuplicadoColocado?: (pedidoId: string, animalId: string) => void;
}

export function VistaCrotales({
  estado,
  onAnadirLote,
  onResolverDuplicado,
  onSolicitarCrotales,
  onAplazarPedidoCrotales,
  onAnularPedidoCrotales,
  onRegistrarPerdidaCrotal,
  onCrearPedidoDuplicados,
  onConfirmarRecepcionPedidoDuplicados,
  onMarcarDuplicadoColocado,
}: Props) {
  const [prefijo, setPrefijo] = useState('ES22030001');
  const [desde, setDesde] = useState('21');
  const [hasta, setHasta] = useState('50');
  const [origen, setOrigen] = useState('OCA / Agroficina Virtual');
  const [copiado, setCopiado] = useState(false);
  const [mostrarCajonDetalle, setMostrarCajonDetalle] = useState(false);
  const [mostrarFormNuevaRemesa, setMostrarFormNuevaRemesa] = useState(false);
  const [mostrarFormSolicitar, setMostrarFormSolicitar] = useState(false);
  const [cantidadPedido, setCantidadPedido] = useState('20');
  const [proveedorPedido, setProveedorPedido] = useState<string>(
    estado.explotacion.proveedorCrotalHabitual || 'AZASA',
  );
  const [envioPedido, setEnvioPedido] = useState<FormaEnvioDuplicado>('CORREO_ORDINARIO');
  const [mostrarDuplicadosDetalle, setMostrarDuplicadosDetalle] = useState(false);
  const [mostrarFormPerdida, setMostrarFormPerdida] = useState(false);
  const activosParaPerdida = estado.animales.filter(
    (a) => a.estado === 'ACTIVO' && a.estadoCrotal === 'OK',
  );
  const [animalPerdidaId, setAnimalPerdidaId] = useState(activosParaPerdida[0]?.id || '');
  const [orejaPerdida, setOrejaPerdida] = useState<EstadoCrotalFisico>('FALTA_IZQUIERDO');
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
      <div className="card-surface rounded-2xl p-4 sm:p-5">
        <div className="grid grid-cols-2 items-center gap-3">
            {/* Izquierda: Icono circular de crotales disponibles en el cajón (clic para desplegar remesas) */}
            <div className="flex flex-col items-center gap-2 text-center">
              {estado.pedidoCrotalesActivo && (
                <button
                  type="button"
                  onClick={() => setMostrarCajonDetalle(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2.5 py-1 text-[10px] font-extrabold text-sky-900 shadow-2xs"
                >
                  <Mail className="h-3 w-3 text-sky-700" />
                  Pedido realizado · {formatearFechaEs(estado.pedidoCrotalesActivo.fechaPedido)}
                </button>
              )}
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

              {estado.pedidoCrotalesActivo && (
                <div className="space-y-2 rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-xs">
                  <div className="flex items-center gap-1.5 font-extrabold text-sky-950">
                    <Mail className="h-4 w-4 text-sky-700" />
                    Pedido realizado el {formatearFechaEs(estado.pedidoCrotalesActivo.fechaPedido)} (
                    {estado.pedidoCrotalesActivo.cantidad} uds. ·{' '}
                    {estado.pedidoCrotalesActivo.proveedor})
                  </div>
                  <p className="text-[11px] text-sky-900">
                    Aviso en Agenda:{' '}
                    <strong>
                      {formatearFechaEs(estado.pedidoCrotalesActivo.fechaAvisoCalendario)}
                    </strong>{' '}
                    — Confirmar Recepción Crotales y Añadir a Cajón Virtual.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarFormNuevaRemesa(true);
                        setMostrarFormSolicitar(false);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#0f3d2e] px-2.5 py-1.5 text-[11px] font-bold text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-300" />
                      Confirmar recepción
                    </button>
                    {onAplazarPedidoCrotales && (
                      <button
                        type="button"
                        onClick={onAplazarPedidoCrotales}
                        className="inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-sky-900"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        Aplazar 1 semana
                      </button>
                    )}
                    {onAnularPedidoCrotales && (
                      <button
                        type="button"
                        onClick={onAnularPedidoCrotales}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-800"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Se ha anulado el pedido
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarFormSolicitar((v) => !v);
                    setMostrarFormNuevaRemesa(false);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0f3d2e] px-3 py-2.5 text-xs font-extrabold text-white hover:bg-[#16523e]"
                >
                  <Mail className="h-4 w-4 text-amber-300" />
                  Solicitar crotales
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarFormNuevaRemesa((v) => !v);
                    setMostrarFormSolicitar(false);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-xs font-extrabold text-emerald-950 hover:bg-emerald-100"
                >
                  <Plus className="h-4 w-4" />
                  Añadir remesa recibida
                </button>
              </div>

              {mostrarFormSolicitar && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onSolicitarCrotales?.({
                      cantidad: Math.max(1, Number(cantidadPedido) || 20),
                      proveedor: proveedorPedido,
                      formaEnvio: envioPedido,
                    });
                    setMostrarFormSolicitar(false);
                  }}
                  className="mt-2 space-y-3 rounded-xl border border-sky-200 bg-sky-50/50 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-extrabold text-[#0f1f18]">
                      Solicitar crotales (crea aviso en Agenda en 1 semana)
                    </h4>
                    <a
                      href={reglas.portalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-800 underline"
                    >
                      RemoWeb
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="text-xs font-semibold text-[#31453b]">
                      Cantidad
                      <input
                        type="number"
                        min={1}
                        value={cantidadPedido}
                        onChange={(e) => setCantidadPedido(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2.5 py-1.5 font-mono text-xs"
                      />
                    </label>
                    <label className="text-xs font-semibold text-[#31453b]">
                      Proveedor
                      <select
                        value={proveedorPedido}
                        onChange={(e) => setProveedorPedido(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2 py-1.5 text-xs"
                      >
                        <option value="AZASA">AZASA</option>
                        <option value="DATAMARS">DATAMARS</option>
                        <option value="OCA">OCA</option>
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-[#31453b]">
                      Envío
                      <select
                        value={envioPedido}
                        onChange={(e) => setEnvioPedido(e.target.value as FormaEnvioDuplicado)}
                        className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2 py-1.5 text-xs"
                      >
                        <option value="CORREO_ORDINARIO">Ordinario</option>
                        <option value="CORREO_CERTIFICADO">Certificado</option>
                      </select>
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-800 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-sky-900"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Finalizar solicitud de crotales
                  </button>
                </form>
              )}

              {mostrarFormNuevaRemesa && (
                <form
                  onSubmit={(e) => {
                    handleCrearLote(e);
                    setMostrarFormNuevaRemesa(false);
                  }}
                  className="mt-2 space-y-3 rounded-xl border border-emerald-200 bg-[#f8faf6] p-4"
                >
                  <h4 className="text-xs font-extrabold text-[#0f1f18]">
                    Registrar o añadir nueva remesa
                  </h4>
                  <div className="grid grid-cols-3 gap-2.5">
                    <label className="col-span-3 text-xs font-semibold text-[#31453b] sm:col-span-1">
                      Prefijo
                      <input
                        type="text"
                        value={prefijo}
                        onChange={(e) => setPrefijo(e.target.value)}
                        required
                        className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2.5 py-2 font-mono text-xs focus:border-emerald-600 focus:outline-none"
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
                        className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2.5 py-2 font-mono text-xs focus:border-emerald-600 focus:outline-none"
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
                        className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2.5 py-2 font-mono text-xs focus:border-emerald-600 focus:outline-none"
                      />
                    </label>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="flex-1 text-xs font-semibold text-[#31453b]">
                      Origen / Entrega
                      <input
                        type="text"
                        value={origen}
                        onChange={(e) => setOrigen(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2.5 py-2 text-xs focus:border-emerald-600 focus:outline-none"
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
              )}
            </div>
          )}
      </div>

      {/* Botón / Icono inferior de Duplicados + Desplegable completo */}
      {(() => {
        const pedidosDup = estado.pedidosDuplicados || [];
        const ultimoSinRecibir = pedidosDup.find((p) => !p.recibido);
        const idsEnPedidosActivos = new Set(
          pedidosDup.flatMap((p) => p.items.filter((i) => !i.colocado).map((i) => i.animalId)),
        );
        const yaSolicitadosCount = pedidosDup.reduce(
          (acc, p) => acc + p.items.filter((i) => !i.colocado).length,
          0,
        );
        const faltanPorSolicitar = duplicados.filter((a) => !idsEnPedidosActivos.has(a.id));
        const pedidosNoRecibidos = pedidosDup.filter((p) => !p.recibido);
        const pedidosRecibidos = pedidosDup.filter((p) => p.recibido);

        return (
          <section className="card-surface rounded-2xl p-4 sm:p-5">
            {/* Icono centrado de Duplicados */}
            <div className="flex flex-col items-center gap-2 text-center">
              {ultimoSinRecibir && (
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2.5 py-0.5 text-[10px] font-extrabold text-sky-900">
                  <Mail className="h-3 w-3 text-sky-700" />
                  Último pedido: {formatearFechaEs(ultimoSinRecibir.fechaPedido)}
                </span>
              )}

              <button
                type="button"
                onClick={() => setMostrarDuplicadosDetalle((v) => !v)}
                className="group flex flex-col items-center gap-1.5 text-center"
              >
                <div
                  className={`relative flex h-20 w-20 items-center justify-center rounded-full border-2 bg-[#f8faf6] shadow-xs transition group-hover:scale-105 ${
                    mostrarDuplicadosDetalle
                      ? 'border-[#0f3d2e] ring-2 ring-emerald-300'
                      : 'border-[#0f3d2e]'
                  }`}
                >
                  <Copy className="h-8 w-8 text-[#0f3d2e]" />
                  {/* Parte baja del icono: círculo verde (Pedidos) y círculo rojo (Sin pedir) con texto corto */}
                  <span
                    title="Duplicados ya solicitados (pendientes de colocar)"
                    className="absolute -bottom-1.5 -left-1.5 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-600 px-1.5 font-mono text-xs font-extrabold text-white shadow-xs"
                  >
                    {yaSolicitadosCount}
                  </span>
                  <span className="absolute -bottom-0.5 right-[calc(100%+10px)] whitespace-nowrap text-[11px] font-extrabold text-emerald-800">
                    Pedidos
                  </span>
                  <span
                    title="Crotales perdidos que faltan por solicitar"
                    className="absolute -bottom-1.5 -right-1.5 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1.5 font-mono text-xs font-extrabold text-white shadow-xs"
                  >
                    {faltanPorSolicitar.length}
                  </span>
                  <span className="absolute -bottom-0.5 left-[calc(100%+10px)] whitespace-nowrap text-[11px] font-extrabold text-red-700">
                    Sin pedir
                  </span>
                </div>
                <span className="mt-1 text-xs font-extrabold text-[#0f1f18] underline decoration-emerald-400/70 underline-offset-2">
                  Duplicados
                </span>
              </button>
            </div>

            {/* Desplegable al pulsar en Duplicados */}
            {mostrarDuplicadosDetalle && (
              <div className="mt-4 space-y-4 border-t border-[#e6ece2] pt-4">
                {/* Botón con icono: Registrar pérdida crotal */}
                <button
                  type="button"
                  onClick={() => {
                    if (!animalPerdidaId && activosParaPerdida[0]) {
                      setAnimalPerdidaId(activosParaPerdida[0].id);
                    }
                    setMostrarFormPerdida((v) => !v);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-red-800"
                >
                  <AlertCircle className="h-4 w-4" />
                  Registrar pérdida crotal
                </button>

                {mostrarFormPerdida && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const targetId = animalPerdidaId || activosParaPerdida[0]?.id;
                      if (!targetId) return;
                      onRegistrarPerdidaCrotal?.(targetId, orejaPerdida);
                      setMostrarFormPerdida(false);
                    }}
                    className="space-y-2.5 rounded-xl border border-red-200 bg-red-50/50 p-3.5 text-xs"
                  >
                    <label className="block font-bold text-[#0f1f18]">
                      Animal que ha perdido el crotal
                      <select
                        value={animalPerdidaId || activosParaPerdida[0]?.id || ''}
                        onChange={(e) => setAnimalPerdidaId(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2.5 py-2 text-xs font-semibold"
                      >
                        {activosParaPerdida.length === 0 ? (
                          <option value="">Todas las reses tienen incidencia ya registrada</option>
                        ) : (
                          activosParaPerdida.map((a) => (
                            <option key={a.id} value={a.id}>
                              #{a.numeroCorto} {a.nombre ? `(${a.nombre})` : ''} — {a.crotal}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                    <label className="block font-bold text-[#0f1f18]">
                      Crotal perdido
                      <select
                        value={orejaPerdida}
                        onChange={(e) => setOrejaPerdida(e.target.value as EstadoCrotalFisico)}
                        className="mt-1 w-full rounded-xl border border-[#dce4d6] bg-white px-2.5 py-2 text-xs font-semibold"
                      >
                        <option value="FALTA_IZQUIERDO">Falta izquierdo (1 ud.)</option>
                        <option value="FALTA_DERECHO">Falta derecho (1 ud.)</option>
                        <option value="FALTAN_AMBOS">Faltan ambos (2 uds.)</option>
                      </select>
                    </label>
                    <button
                      type="submit"
                      disabled={activosParaPerdida.length === 0}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0f3d2e] px-4 py-2 text-xs font-extrabold text-white disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4 text-amber-300" />
                      Añadir a pendientes de solicitud
                    </button>
                  </form>
                )}

                {/* Lista: Duplicados de crotales pendientes de solicitud */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-red-800">
                      Duplicados de crotales pendientes de solicitud ({faltanPorSolicitar.length})
                    </h3>
                    {duplicados.length > 0 && (
                      <div className="flex gap-1.5">
                        <BotonCopiar valor={textoDuplicados} etiqueta="Copiar" compacto />
                        <button
                          type="button"
                          onClick={handleExportarDuplicados}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-700 px-2.5 py-1 text-[11px] font-bold text-white"
                        >
                          <Download className="h-3 w-3" />
                          CSV
                        </button>
                      </div>
                    )}
                  </div>

                  {faltanPorSolicitar.length === 0 ? (
                    <p className="rounded-xl bg-[#f8faf6] p-3 text-xs font-semibold text-emerald-800">
                      No hay crotales pendientes de solicitar.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {faltanPorSolicitar.map((animal) => (
                        <div
                          key={animal.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50/30 p-3 text-xs"
                        >
                          <div>
                            <span className="font-mono font-extrabold text-[#0f1f18]">
                              #{animal.numeroCorto} · {animal.crotal}
                            </span>
                            <p className="text-[11px] text-[#52655c]">
                              {animal.estadoCrotal === 'FALTAN_AMBOS'
                                ? 'Faltan ambos (2 uds.)'
                                : animal.estadoCrotal === 'FALTA_IZQUIERDO'
                                  ? 'Falta izquierdo (1 ud.)'
                                  : 'Falta derecho (1 ud.)'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onResolverDuplicado(animal.id)}
                            className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-900"
                          >
                            Ya colocado
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() =>
                          onCrearPedidoDuplicados?.({
                            proveedor: estado.explotacion.proveedorCrotalHabitual || 'AZASA',
                            formaEnvio: envioPedido,
                            items: faltanPorSolicitar.map((a) => ({
                              animalId: a.id,
                              crotal: a.crotal,
                              numeroCorto: a.numeroCorto,
                              detalle: a.estadoCrotal,
                            })),
                          })
                        }
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0f3d2e] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-[#16523e]"
                      >
                        <Mail className="h-4 w-4 text-amber-300" />
                        Solicitar duplicados pendientes ({faltanPorSolicitar.length})
                      </button>
                    </div>
                  )}
                </div>

                {/* Lista de pedidos realizados (No recibidos vs Recibidos) */}
                <div className="space-y-3 border-t border-[#e6ece2] pt-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0f1f18]">
                    Pedidos de duplicados realizados ({pedidosDup.length})
                  </h3>

                  {pedidosDup.length === 0 ? (
                    <p className="rounded-xl bg-[#f8faf6] p-3 text-xs text-[#52655c]">
                      Todavía no se ha realizado ningún pedido de duplicados.
                    </p>
                  ) : (
                    <>
                      {pedidosNoRecibidos.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[11px] font-extrabold text-amber-800">
                            No recibidos ({pedidosNoRecibidos.length})
                          </p>
                          {pedidosNoRecibidos.map((ped) => (
                            <div
                              key={ped.id}
                              className="space-y-2 rounded-xl border border-amber-300 bg-amber-50/50 p-3 text-xs"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <span className="font-bold text-[#0f1f18]">
                                    Pedido del {formatearFechaEs(ped.fechaPedido)} · {ped.proveedor}
                                  </span>
                                  <p className="text-[11px] text-[#52655c]">
                                    {ped.items.length} crotal(es) · Pendiente de recepción
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onConfirmarRecepcionPedidoDuplicados?.(ped.id)}
                                  className="rounded-lg bg-amber-700 px-3 py-1.5 text-[11px] font-extrabold text-white hover:bg-amber-800"
                                >
                                  Confirmar recepción
                                </button>
                              </div>
                              <div className="space-y-1">
                                {ped.items.map((it) => (
                                  <div
                                    key={it.animalId}
                                    className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-[11px]"
                                  >
                                    <span className="font-mono font-bold">
                                      #{it.numeroCorto} · {it.crotal}
                                    </span>
                                    <span className="text-amber-800">Esperando entrega</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {pedidosRecibidos.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[11px] font-extrabold text-emerald-900">
                            Recibidos ({pedidosRecibidos.length})
                          </p>
                          {pedidosRecibidos.map((ped) => (
                            <div
                              key={ped.id}
                              className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 text-xs"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-bold text-[#0f1f18]">
                                  Pedido {formatearFechaEs(ped.fechaPedido)} · Recibido{' '}
                                  {formatearFechaEs(ped.fechaRecepcion)}
                                </span>
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900">
                                  Recibido
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {ped.items.map((it) => (
                                  <div
                                    key={it.animalId}
                                    className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-[11px]"
                                  >
                                    <span className="font-mono font-bold text-[#0f1f18]">
                                      #{it.numeroCorto} · {it.crotal}
                                    </span>
                                    {it.colocado ? (
                                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Colocado
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onMarcarDuplicadoColocado?.(ped.id, it.animalId)
                                        }
                                        className="rounded-lg bg-[#0f3d2e] px-2.5 py-1 text-[11px] font-extrabold text-white hover:bg-[#16523e]"
                                      >
                                        Marcar colocado
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        );
      })()}
    </div>
  );
}

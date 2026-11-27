import { Building2, Download, Pill, Plus, ShoppingCart, Upload, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { sugerirSiguienteCrotal } from '../domain/crotales';
import { descargarArchivo } from '../domain/exportadores';
import { hoyIso, sumarDiasIso } from '../domain/fechas';
import {
  DIFICULTAD_PARTO_META,
  obtenerTodasLasRazas,
  sugerirRazaCruce,
} from '../domain/gestionAvanzada';
import { ESPECIES_META, PORTALES_CCAA } from '../domain/reglasNormativas';
import {
  validarModalidadMuerteRemoWeb,
  validarPrecondicionesNacimientoRemoWeb,
} from '../domain/reglasRemoWeb';
import type {
  ComunidadCodigo,
  DatosExplotacion,
  DificultadParto,
  EspecieCodigo,
  EstadoFocoSanitario,
  EstadoGanaderia,
  ModalidadMuerteRemoWeb,
  OrientacionProductiva,
  ProveedorCrotalRemoWeb,
  SexoAnimal,
  UnidadGanadera,
} from '../domain/types';
import { ModalBase } from './ModalBase';

export function ModalNacimiento({
  estado,
  madrePreseleccionada,
  padrePreseleccionado,
  onCerrar,
  onGuardar,
}: {
  estado: EstadoGanaderia;
  madrePreseleccionada?: string;
  padrePreseleccionado?: string;
  onCerrar: () => void;
  onGuardar: (datos: {
    crotal: string;
    crotalMadre: string;
    padreNombre?: string;
    sexo: SexoAnimal;
    raza: string;
    fechaNacimiento: string;
    crotalColocado: boolean;
    dificultadParto: DificultadParto;
    pesoNacimientoKg?: number;
    notas: string;
  }) => void;
}) {
  const sugerido =
    sugerirSiguienteCrotal(estado.lotesCrotales, estado.explotacion.especiePrincipal) || '';
  const razas = obtenerTodasLasRazas(
    estado.explotacion.especiePrincipal,
    estado.razasPersonalizadas,
  );
  const madres = estado.animales.filter((a) => a.estado === 'ACTIVO' && a.sexo === 'H');
  const machos = estado.animales.filter((a) => a.estado === 'ACTIVO' && a.sexo === 'M');

  const [crotal, setCrotal] = useState(sugerido);
  const [crotalMadre, setCrotalMadre] = useState(madrePreseleccionada || madres[0]?.crotal || '');
  const [padreNombre, setPadreNombre] = useState(padrePreseleccionado || '');
  const [sexo, setSexo] = useState<SexoAnimal>('H');
  const [raza, setRaza] = useState(razas[0] || 'Frisona (Holstein)');
  const [razaLibre, setRazaLibre] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState(hoyIso());
  const [dificultadParto, setDificultadParto] = useState<DificultadParto>(1);
  const [pesoNacimientoKg, setPesoNacimientoKg] = useState('');
  const [crotalColocado, setCrotalColocado] = useState(true);
  const [notas, setNotas] = useState('');

  const madreSeleccionada = madres.find((m) => m.crotal === crotalMadre);
  const padreEnCenso = machos.find(
    (m) =>
      m.crotal.toLowerCase() === padreNombre.trim().toLowerCase() ||
      (m.nombre || '').toLowerCase() === padreNombre.trim().toLowerCase(),
  );
  const sugerenciaCruce = sugerirRazaCruce(madreSeleccionada?.raza, padreEnCenso?.raza);

  const razaEvaluada = raza === '__OTRA__' && razaLibre.trim() ? razaLibre.trim() : raza;
  const avisosRemoWeb = useMemo(
    () =>
      validarPrecondicionesNacimientoRemoWeb(estado, {
        crotal,
        crotalMadre,
        raza: razaEvaluada,
        fechaNacimiento,
      }),
    [estado, crotal, crotalMadre, razaEvaluada, fechaNacimiento],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!crotal.trim()) return;
    const razaFinal = raza === '__OTRA__' && razaLibre.trim() ? razaLibre.trim() : raza;
    const pesoNum = pesoNacimientoKg ? Number(pesoNacimientoKg.replace(',', '.')) : undefined;
    onGuardar({
      crotal: crotal.trim().toUpperCase(),
      crotalMadre: crotalMadre.trim().toUpperCase(),
      padreNombre: padreNombre.trim() || undefined,
      sexo,
      raza: razaFinal,
      fechaNacimiento,
      crotalColocado,
      dificultadParto,
      pesoNacimientoKg: pesoNum && pesoNum > 0 ? pesoNum : undefined,
      notas: notas.trim(),
    });
  };

  return (
    <ModalBase onCerrar={onCerrar} maxWidthClass="max-w-lg">
      <form onSubmit={handleSubmit} className="max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900">Registrar Nacimiento</h3>
          <button type="button" onClick={onCerrar} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-slate-700">
            Crotal oficial asignado (sugerido de tu stock)
            <input
              type="text"
              value={crotal}
              onChange={(e) => setCrotal(e.target.value)}
              required
              placeholder="ES030045120003"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm focus:border-emerald-500 focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-slate-700">
              Vaca madre
              <select
                value={crotalMadre}
                onChange={(e) => setCrotalMadre(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Sin seleccionar</option>
                {madres.map((m) => (
                  <option key={m.id} value={m.crotal}>
                    #{m.numeroCorto} {m.nombre ? `(${m.nombre})` : ''} — {m.crotal}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Padre / Toro (opcional)
              <input
                type="text"
                value={padreNombre}
                onChange={(e) => setPadreNombre(e.target.value)}
                placeholder="Ej: ASCOL Llanes o crotal"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <label className="block text-xs font-semibold text-slate-700">
              Fecha nacimiento
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs focus:border-emerald-500 focus:outline-none"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Sexo
              <select
                value={sexo}
                onChange={(e) => setSexo(e.target.value as SexoAnimal)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs focus:border-emerald-500 focus:outline-none"
              >
                <option value="H">Hembra</option>
                <option value="M">Macho</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Peso nacer (kg)
              <input
                type="number"
                step="0.5"
                min="1"
                value={pesoNacimientoKg}
                onChange={(e) => setPesoNacimientoKg(e.target.value)}
                placeholder="Ej: 42"
                className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-2 font-mono text-xs focus:border-emerald-500 focus:outline-none"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-slate-700">
              Raza
              <select
                value={raza}
                onChange={(e) => setRaza(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
              >
                {razas.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                {sugerenciaCruce && !razas.includes(sugerenciaCruce) && (
                  <option value={sugerenciaCruce}>{sugerenciaCruce}</option>
                )}
                <option value="__OTRA__">+ Escribir otra raza / cruce...</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Dificultad del parto (1-5)
              <select
                value={dificultadParto}
                onChange={(e) => setDificultadParto(Number(e.target.value) as DificultadParto)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
              >
                {([1, 2, 3, 4, 5] as DificultadParto[]).map((d) => (
                  <option key={d} value={d}>
                    {DIFICULTAD_PARTO_META[d].etiqueta}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {raza === '__OTRA__' && (
            <input
              type="text"
              required
              value={razaLibre}
              onChange={(e) => setRazaLibre(e.target.value)}
              placeholder="Escribe la raza o cruce (se guardará para próximas veces)"
              className="w-full rounded-xl border border-emerald-300 bg-emerald-50/40 px-3 py-2 text-xs focus:outline-none"
            />
          )}

          <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={crotalColocado}
              onChange={(e) => setCrotalColocado(e.target.checked)}
              className="h-4 w-4 accent-emerald-700"
            />
            El crotal físico ya está colocado en las orejas (si no, activará cuenta atrás de 20 días)
          </label>

          <label className="block text-xs font-semibold text-slate-700">
            Notas (opcional)
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Parto sin ayuda, en box 2"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
            />
          </label>

          {avisosRemoWeb.length > 0 ? (
            <div className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-[11px]">
              <p className="font-bold text-amber-950">
                Pre-validación RemoWeb Asturias:
              </p>
              {avisosRemoWeb.map((av) => (
                <p
                  key={av.codigo}
                  className={
                    av.nivel === 'ERROR'
                      ? 'font-semibold text-red-700'
                      : 'text-amber-900'
                  }
                >
                  • {av.nivel === 'ERROR' ? 'Bloqueo RemoWeb: ' : 'Aviso: '}
                  {av.mensaje}
                </p>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[11px] font-semibold text-emerald-900">
              ✓ Cumple pre-validaciones RemoWeb 2026 (crotal ES2203, madre &gt; 16m, plazo 90d).
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-xl bg-[#0f3d2e] px-4 py-2 text-xs font-bold text-white hover:bg-[#16523e]"
          >
            Guardar y añadir a Cola RemoWeb
          </button>
        </div>
      </form>
    </ModalBase>
  );
}

export function ModalCompra({
  estado,
  onCerrar,
  onGuardar,
}: {
  estado: EstadoGanaderia;
  onCerrar: () => void;
  onGuardar: (datos: {
    crotal: string;
    especie: EspecieCodigo;
    nombre?: string;
    sexo: SexoAnimal;
    raza: string;
    fechaNacimiento: string;
    fechaCompra: string;
    regaOrigen: string;
    documentoSanitario?: string;
    precioCompraEur?: number;
    pesoKg?: number;
    notas?: string;
  }) => void;
}) {
  const [especie, setEspecie] = useState<EspecieCodigo>(estado.explotacion.especiePrincipal);
  const razas = obtenerTodasLasRazas(especie, estado.razasPersonalizadas);
  const [crotal, setCrotal] = useState('');
  const [nombre, setNombre] = useState('');
  const [sexo, setSexo] = useState<SexoAnimal>('H');
  const [raza, setRaza] = useState(razas[0] || 'Frisona (Holstein)');
  const [fechaNacimiento, setFechaNacimiento] = useState(sumarDiasIso(hoyIso(), -550));
  const [fechaCompra, setFechaCompra] = useState(hoyIso());
  const [regaOrigen, setRegaOrigen] = useState('');
  const [documentoSanitario, setDocumentoSanitario] = useState('');
  const [precioCompraEur, setPrecioCompraEur] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const [notas, setNotas] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!crotal.trim()) return;
    const precio = precioCompraEur ? Number(precioCompraEur.replace(',', '.')) : undefined;
    const peso = pesoKg ? Number(pesoKg.replace(',', '.')) : undefined;
    onGuardar({
      crotal: crotal.trim().toUpperCase(),
      especie,
      nombre: nombre.trim() || undefined,
      sexo,
      raza,
      fechaNacimiento,
      fechaCompra,
      regaOrigen: regaOrigen.trim().toUpperCase(),
      documentoSanitario: documentoSanitario.trim() || undefined,
      precioCompraEur: precio && precio > 0 ? precio : undefined,
      pesoKg: peso && peso > 0 ? peso : undefined,
      notas: notas.trim() || undefined,
    });
  };

  return (
    <ModalBase onCerrar={onCerrar} maxWidthClass="max-w-lg">
      <form onSubmit={handleSubmit} className="max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-sky-700" />
            <h3 className="text-base font-bold text-slate-900">
              Alta de Animal por Compra (Entrada Libro A)
            </h3>
          </div>
          <button type="button" onClick={onCerrar} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-700">
              Crotal oficial *
              <input
                type="text"
                required
                placeholder="ES030099881122"
                value={crotal}
                onChange={(e) => setCrotal(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Nombre / Apodo (opcional)
              <input
                type="text"
                placeholder="Ej: Gallega"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <label className="text-xs font-semibold text-slate-700">
              Especie
              <select
                value={especie}
                onChange={(e) => {
                  const esp = e.target.value as EspecieCodigo;
                  setEspecie(esp);
                  setRaza(obtenerTodasLasRazas(esp, estado.razasPersonalizadas)[0] || '');
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs"
              >
                {estado.explotacion.especiesActivas.map((esp) => (
                  <option key={esp} value={esp}>
                    {ESPECIES_META[esp].nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Sexo
              <select
                value={sexo}
                onChange={(e) => setSexo(e.target.value as SexoAnimal)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs"
              >
                <option value="H">Hembra</option>
                <option value="M">Macho</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Raza
              <select
                value={raza}
                onChange={(e) => setRaza(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs"
              >
                {razas.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-700">
              Fecha nacimiento
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Fecha compra / entrada
              <input
                type="date"
                value={fechaCompra}
                onChange={(e) => setFechaCompra(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-700">
              REGA explotación origen
              <input
                type="text"
                placeholder="ES330200004455"
                value={regaOrigen}
                onChange={(e) => setRegaOrigen(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Nº Guía sanitaria
              <input
                type="text"
                placeholder="GUIA-2026-..."
                value={documentoSanitario}
                onChange={(e) => setDocumentoSanitario(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-700">
              Precio compra (€) (opcional)
              <input
                type="number"
                step="1"
                min="0"
                placeholder="Ej: 1850"
                value={precioCompraEur}
                onChange={(e) => setPrecioCompraEur(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Peso entrada (kg) (opcional)
              <input
                type="number"
                step="0.5"
                min="1"
                placeholder="Ej: 520"
                value={pesoKg}
                onChange={(e) => setPesoKg(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
              />
            </label>
          </div>

          <label className="block text-xs font-semibold text-slate-700">
            Notas (opcional)
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Novilla primeriza preñada de 6 meses..."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-xl bg-[#0f3d2e] px-4 py-2 text-xs font-bold text-white hover:bg-[#16523e]"
          >
            Registrar Compra en Censo y Libro
          </button>
        </div>
      </form>
    </ModalBase>
  );
}

export function ModalBaja({
  estado,
  animalPreseleccionado,
  tipoBajaInicial,
  onCerrar,
  onGuardar,
}: {
  estado: EstadoGanaderia;
  animalPreseleccionado?: UnidadGanadera;
  tipoBajaInicial?: 'BAJA_MUERTE' | 'DESAPARICION' | 'BAJA_VENTA' | 'BAJA_MATADERO';
  onCerrar: () => void;
  onGuardar: (datos: {
    animalId: string;
    tipoBaja: 'BAJA_MUERTE' | 'DESAPARICION' | 'BAJA_VENTA' | 'BAJA_MATADERO';
    fechaBaja: string;
    motivo: string;
    importeVentaEur?: number;
    pesoKg?: number;
    destino?: string;
    modalidadMuerte?: ModalidadMuerteRemoWeb;
    numeroDamer?: string;
    fechaValidezDamer?: string;
    ceaMatadero?: string;
    concejo?: string;
    lugarMuerte?: string;
    declaracionEnterramiento?: boolean;
    presentaDenuncia?: boolean;
    numeroDenuncia?: string;
  }) => void;
}) {
  const activos = estado.animales.filter((a) => a.estado === 'ACTIVO');
  const [animalId, setAnimalId] = useState(animalPreseleccionado?.id || activos[0]?.id || '');
  const [tipoBaja, setTipoBaja] = useState<
    'BAJA_MUERTE' | 'DESAPARICION' | 'BAJA_VENTA' | 'BAJA_MATADERO'
  >(tipoBajaInicial || 'BAJA_MUERTE');
  const [fechaBaja, setFechaBaja] = useState(hoyIso());
  const [motivo, setMotivo] = useState(() => {
    if (tipoBajaInicial === 'DESAPARICION') return 'Animal desaparecido en explotación o pasto';
    if (tipoBajaInicial === 'BAJA_VENTA') return 'Venta de vida / cebadero';
    if (tipoBajaInicial === 'BAJA_MATADERO') return 'Desvieje a matadero';
    return 'Muerte en explotación (recogida cadáver)';
  });
  const [importeVentaEur, setImporteVentaEur] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const [destino, setDestino] = useState('');

  // Campos oficiales RemoWeb para Baja por muerte y Desaparición
  const [modalidadMuerte, setModalidadMuerte] = useState<ModalidadMuerteRemoWeb>('DAMER');
  const [numeroDamer, setNumeroDamer] = useState('');
  const [fechaValidezDamer, setFechaValidezDamer] = useState(hoyIso());
  const [ceaMatadero, setCeaMatadero] = useState('ES33');
  const [concejo, setConcejo] = useState(estado.explotacion.municipio || '');
  const [lugarMuerte, setLugarMuerte] = useState('');
  const [declaracionEnterramiento, setDeclaracionEnterramiento] = useState(false);
  const [presentaDenuncia, setPresentaDenuncia] = useState(false);
  const [numeroDenuncia, setNumeroDenuncia] = useState('');

  const animalSeleccionado = activos.find((a) => a.id === animalId);
  const avisosMuerte = useMemo(() => {
    if (tipoBaja !== 'BAJA_MUERTE') return [];
    return validarModalidadMuerteRemoWeb(estado, animalSeleccionado, {
      modalidadMuerte,
      fechaBaja,
      numeroDamer,
      fechaValidezDamer,
      ceaMatadero,
      concejo,
      lugarMuerte,
      declaracionEnterramiento,
    });
  }, [
    tipoBaja,
    estado,
    animalSeleccionado,
    modalidadMuerte,
    fechaBaja,
    numeroDamer,
    fechaValidezDamer,
    ceaMatadero,
    concejo,
    lugarMuerte,
    declaracionEnterramiento,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!animalId) return;
    const imp = importeVentaEur ? Number(importeVentaEur.replace(',', '.')) : undefined;
    const peso = pesoKg ? Number(pesoKg.replace(',', '.')) : undefined;
    onGuardar({
      animalId,
      tipoBaja,
      fechaBaja,
      motivo: motivo.trim(),
      importeVentaEur: imp && imp > 0 ? imp : undefined,
      pesoKg: peso && peso > 0 ? peso : undefined,
      destino: destino.trim() || undefined,
      ...(tipoBaja === 'BAJA_MUERTE'
        ? {
            modalidadMuerte,
            numeroDamer: modalidadMuerte === 'DAMER' ? numeroDamer.trim() || undefined : undefined,
            fechaValidezDamer:
              modalidadMuerte === 'DAMER' ? fechaValidezDamer || undefined : undefined,
            ceaMatadero:
              modalidadMuerte === 'SACRIFICIO_URGENCIA'
                ? ceaMatadero.trim().toUpperCase() || undefined
                : undefined,
            concejo:
              modalidadMuerte === 'INACCESIBLE' || modalidadMuerte === 'NECROFAGAS'
                ? concejo.trim() || undefined
                : undefined,
            lugarMuerte:
              modalidadMuerte === 'INACCESIBLE' || modalidadMuerte === 'NECROFAGAS'
                ? lugarMuerte.trim() || undefined
                : undefined,
            declaracionEnterramiento:
              modalidadMuerte === 'INACCESIBLE' || modalidadMuerte === 'NECROFAGAS'
                ? declaracionEnterramiento
                : undefined,
          }
        : {}),
      ...(tipoBaja === 'DESAPARICION'
        ? {
            concejo: concejo.trim() || undefined,
            lugarMuerte: lugarMuerte.trim() || undefined,
            presentaDenuncia,
            numeroDenuncia: presentaDenuncia ? numeroDenuncia.trim() || undefined : undefined,
          }
        : {}),
    });
  };

  return (
    <ModalBase onCerrar={onCerrar} maxWidthClass="max-w-lg">
      <form onSubmit={handleSubmit} className="max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900">Registrar Baja / Venta / Desaparición</h3>
          <button type="button" onClick={onCerrar} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-slate-700">
            Tipo de salida / baja
            <select
              value={tipoBaja}
              onChange={(e) => {
                const t = e.target.value as typeof tipoBaja;
                setTipoBaja(t);
                if (t === 'BAJA_MUERTE') setMotivo('Muerte en explotación (recogida cadáver)');
                if (t === 'DESAPARICION') setMotivo('Animal desaparecido en explotación o pasto');
                if (t === 'BAJA_VENTA') setMotivo('Venta de vida / cebadero');
                if (t === 'BAJA_MATADERO') setMotivo('Desvieje a matadero');
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
            >
              <option value="BAJA_MUERTE">Baja por muerte (plazo 7 días)</option>
              <option value="DESAPARICION">Comunicación de animal desaparecido</option>
              <option value="BAJA_VENTA">Venta a comprador / cebadero</option>
              <option value="BAJA_MATADERO">Venta a matadero</option>
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-700">
            Animal
            <select
              value={animalId}
              onChange={(e) => setAnimalId(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              {activos.map((a) => (
                <option key={a.id} value={a.id}>
                  #{a.numeroCorto} {a.nombre ? `(${a.nombre})` : ''} — {a.crotal}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-700">
            Fecha de la baja
            <input
              type="date"
              value={fechaBaja}
              onChange={(e) => setFechaBaja(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
          </label>

          {tipoBaja === 'BAJA_MUERTE' && (
            <div className="space-y-2.5 rounded-xl border border-red-200 bg-red-50/40 p-3">
              <label className="block text-xs font-semibold text-slate-800">
                Modalidad oficial RemoWeb
                <select
                  value={modalidadMuerte}
                  onChange={(e) => setModalidadMuerte(e.target.value as ModalidadMuerteRemoWeb)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold"
                >
                  <option value="DAMER">Entregado en planta (Nº DAMER)</option>
                  <option value="INACCESIBLE">Muerto en lugar inaccesible</option>
                  <option value="SACRIFICIO_URGENCIA">Sacrificio de urgencia (matadero)</option>
                  <option value="NECROFAGAS">Zona de protección de necrófagas (&lt; 4 meses)</option>
                </select>
              </label>

              {modalidadMuerte === 'DAMER' && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Nº DAMER (máx. 9 dígitos)
                    <input
                      type="text"
                      maxLength={9}
                      placeholder="Ej: 123456789"
                      value={numeroDamer}
                      onChange={(e) => setNumeroDamer(e.target.value.replace(/\D/g, ''))}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Fecha validez DAMER
                    <input
                      type="date"
                      value={fechaValidezDamer}
                      onChange={(e) => setFechaValidezDamer(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </label>
                </div>
              )}

              {modalidadMuerte === 'SACRIFICIO_URGENCIA' && (
                <label className="block text-xs font-semibold text-slate-700">
                  C.E.A. Matadero (ES33 + municipio + secuencia)
                  <input
                    type="text"
                    placeholder="ES330440000123"
                    value={ceaMatadero}
                    onChange={(e) => setCeaMatadero(e.target.value.toUpperCase())}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs"
                  />
                </label>
              )}

              {(modalidadMuerte === 'INACCESIBLE' || modalidadMuerte === 'NECROFAGAS') && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs font-semibold text-slate-700">
                      Concejo
                      <input
                        type="text"
                        placeholder="Ej: Carreño"
                        value={concejo}
                        onChange={(e) => setConcejo(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-700">
                      Lugar / Paraje
                      <input
                        type="text"
                        placeholder="Ej: Monte Areo"
                        value={lugarMuerte}
                        onChange={(e) => setLugarMuerte(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </label>
                  </div>
                  <label className="flex items-start gap-2 text-[11px] font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={declaracionEnterramiento}
                      onChange={(e) => setDeclaracionEnterramiento(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-red-700"
                    />
                    Declaro bajo responsabilidad la imposibilidad de recogida / cumplimiento de normativa de enterramiento o zona necrófagas.
                  </label>
                </div>
              )}

              {avisosMuerte.length > 0 && (
                <div className="space-y-1 rounded-lg bg-white/80 p-2 text-[11px]">
                  {avisosMuerte.map((av) => (
                    <p
                      key={av.codigo}
                      className={av.nivel === 'ERROR' ? 'font-semibold text-red-700' : 'text-amber-800'}
                    >
                      • {av.mensaje}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {tipoBaja === 'DESAPARICION' && (
            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold text-slate-700">
                  Concejo
                  <input
                    type="text"
                    placeholder="Ej: Carreño"
                    value={concejo}
                    onChange={(e) => setConcejo(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Lugar / Pasto
                  <input
                    type="text"
                    placeholder="Ej: Puerto / Braña"
                    value={lugarMuerte}
                    onChange={(e) => setLugarMuerte(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={presentaDenuncia}
                  onChange={(e) => setPresentaDenuncia(e.target.checked)}
                  className="h-4 w-4 accent-amber-700"
                />
                Presenta denuncia oficial
              </label>
              {presentaDenuncia && (
                <label className="block text-xs font-semibold text-slate-700">
                  Nº de denuncia
                  <input
                    type="text"
                    placeholder="Ej: DEN-2026-00412"
                    value={numeroDenuncia}
                    onChange={(e) => setNumeroDenuncia(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs"
                  />
                </label>
              )}
            </div>
          )}

          {(tipoBaja === 'BAJA_VENTA' || tipoBaja === 'BAJA_MATADERO') && (
            <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-emerald-50/50 p-3">
              <label className="text-xs font-semibold text-slate-700">
                Importe venta (€)
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="Ej: 1250"
                  value={importeVentaEur}
                  onChange={(e) => setImporteVentaEur(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs"
                />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Peso vivo / canal (kg)
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  placeholder="Ej: 340"
                  value={pesoKg}
                  onChange={(e) => setPesoKg(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs"
                />
              </label>
              <label className="col-span-2 text-xs font-semibold text-slate-700">
                Comprador / Matadero
                <input
                  type="text"
                  placeholder="Ej: Matadero Central Noreña"
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                />
              </label>
            </div>
          )}

          <label className="block text-xs font-semibold text-slate-700">
            Motivo
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800"
          >
            Registrar y enviar a Cola
          </button>
        </div>
      </form>
    </ModalBase>
  );
}

export function ModalTratamiento({
  animal,
  estado,
  onCerrar,
  onGuardar,
}: {
  animal?: UnidadGanadera | null;
  estado: EstadoGanaderia;
  onCerrar: () => void;
  onGuardar: (datos: {
    animalIds: string[];
    fecha?: string;
    medicamento: string;
    dosis?: string;
    afeccion?: string;
    recetaPresvet: string;
    veterinario?: string;
    proveedor?: string;
    aplicadoPor: 'GANADERO' | 'VETERINARIO';
    duracionDias?: number;
    diasLeche: number;
    diasCarne: number;
    costeEur?: number;
  }) => void;
}) {
  const botiquin = estado.botiquin || [];
  const veterinarios = estado.veterinarios || [];
  const activos = estado.animales.filter((a) => a.estado === 'ACTIVO');

  const [animalIds, setAnimalIds] = useState<string[]>(() => (animal ? [animal.id] : []));
  const [busquedaVaca, setBusquedaVaca] = useState('');
  const [fecha, setFecha] = useState(hoyIso());
  const [medBotiquinId, setMedBotiquinId] = useState('');
  const [medicamento, setMedicamento] = useState('');
  const [dosis, setDosis] = useState('');
  const [afeccion, setAfeccion] = useState('');
  const [recetaPresvet, setRecetaPresvet] = useState('');
  const [veterinario, setVeterinario] = useState(veterinarios[0] || '');
  const [proveedor, setProveedor] = useState(estado.proveedores?.[0] || '');
  const [aplicadoPor, setAplicadoPor] = useState<'GANADERO' | 'VETERINARIO'>('GANADERO');
  const [duracionDias, setDuracionDias] = useState('3');
  const [diasLeche, setDiasLeche] = useState('5');
  const [diasCarne, setDiasCarne] = useState('14');
  const [costeEur, setCosteEur] = useState('');

  const toggleVaca = (id: string) => {
    setAnimalIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const seleccionarDelBotiquin = (id: string) => {
    setMedBotiquinId(id);
    const med = botiquin.find((m) => m.id === id);
    if (!med) return;
    setMedicamento(med.nombre);
    setDosis(med.dosisHabitual || '');
    setDiasCarne(String(med.diasSupresionCarne));
    setDiasLeche(String(med.diasSupresionLeche));
    if (med.proveedor) setProveedor(med.proveedor);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicamento.trim() || animalIds.length === 0) return;
    const coste = costeEur ? Number(costeEur.replace(',', '.')) : undefined;
    onGuardar({
      animalIds,
      fecha,
      medicamento: medicamento.trim(),
      dosis: dosis.trim() || undefined,
      afeccion: afeccion.trim() || undefined,
      recetaPresvet: recetaPresvet.trim(),
      veterinario: veterinario.trim() || undefined,
      proveedor: proveedor.trim() || undefined,
      aplicadoPor,
      duracionDias: Number(duracionDias) || undefined,
      diasLeche: Math.max(0, Number(diasLeche) || 0),
      diasCarne: Math.max(0, Number(diasCarne) || 0),
      costeEur: coste && coste > 0 ? coste : undefined,
    });
  };

  return (
    <ModalBase onCerrar={onCerrar} maxWidthClass="max-w-lg">
      <form onSubmit={handleSubmit} className="max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-sky-700" />
            <h3 className="text-base font-bold text-slate-900">
              {animal
                ? `Tratamiento y Receta PRESVET — #${animal.numeroCorto}`
                : 'Registrar Tratamiento Veterinario'}
            </h3>
          </div>
          <button type="button" onClick={onCerrar} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {/* Selector multi-vaca */}
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800">
                Vacas tratadas * ({animalIds.length} seleccionadas)
              </span>
              <div className="flex items-center gap-2">
                {animalIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAnimalIds([])}
                    className="text-[11px] font-bold text-slate-500 underline hover:text-slate-800"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
            <input
              type="text"
              value={busquedaVaca}
              onChange={(e) => setBusquedaVaca(e.target.value)}
              placeholder="Buscar vaca por número o nombre..."
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
            />
            <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto pt-0.5">
              {activos
                .filter((a) => {
                  const q = busquedaVaca.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    a.numeroCorto.toLowerCase().includes(q) ||
                    (a.nombre || '').toLowerCase().includes(q) ||
                    a.crotal.toLowerCase().includes(q)
                  );
                })
                .map((a) => {
                  const sel = animalIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleVaca(a.id)}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                        sel
                          ? 'border-sky-700 bg-sky-700 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-sky-400'
                      }`}
                    >
                      #{a.numeroCorto}
                      {a.nombre ? ` ${a.nombre}` : ''}
                    </button>
                  );
                })}
            </div>
            {animalIds.length === 0 && (
              <p className="text-[11px] font-semibold text-amber-700">
                Selecciona al menos una vaca tratada.
              </p>
            )}
          </div>

          <label className="block text-xs font-semibold text-slate-700">
            Fecha de administración *
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
          </label>
          {botiquin.length > 0 && (
            <label className="block rounded-xl border border-sky-200 bg-sky-50/60 p-3 text-xs font-bold text-sky-950">
              Elegir rápido del Botiquín (auto-rellena supresión y dosis)
              <select
                value={medBotiquinId}
                onChange={(e) => seleccionarDelBotiquin(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-sky-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900"
              >
                <option value="">-- Seleccionar del botiquín o escribir abajo --</option>
                {botiquin.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre} (Carne {m.diasSupresionCarne}d · Leche {m.diasSupresionLeche}d)
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-700">
              Medicamento / Antibiótico *
              <input
                type="text"
                required
                placeholder="Ej: Cefalexina intramamaria"
                value={medicamento}
                onChange={(e) => setMedicamento(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Dosis / Pauta
              <input
                type="text"
                placeholder="Ej: 1 jeringa / 12h"
                value={dosis}
                onChange={(e) => setDosis(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-700">
              Nº Receta PRESVET
              <input
                type="text"
                placeholder="Ej: PRESVET-2026-33-09120"
                value={recetaPresvet}
                onChange={(e) => setRecetaPresvet(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Afección tratada
              <input
                type="text"
                placeholder="Ej: Mamitis, Cojera, Metritis..."
                value={afeccion}
                onChange={(e) => setAfeccion(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-700">
              Veterinario prescriptor
              <input
                type="text"
                value={veterinario}
                onChange={(e) => setVeterinario(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Aplicado por
              <select
                value={aplicadoPor}
                onChange={(e) => setAplicadoPor(e.target.value as 'GANADERO' | 'VETERINARIO')}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <option value="GANADERO">Ganadero</option>
                <option value="VETERINARIO">Veterinario</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <label className="text-xs font-semibold text-slate-700">
              Espera leche (d)
              <input
                type="number"
                min={0}
                value={diasLeche}
                onChange={(e) => setDiasLeche(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-2 font-mono text-xs"
              />
              <span className="mt-0.5 block text-[10px] font-normal text-slate-500">
                Hasta {sumarDiasIso(fecha, Number(diasLeche) || 0)}
              </span>
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Espera carne (d)
              <input
                type="number"
                min={0}
                value={diasCarne}
                onChange={(e) => setDiasCarne(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-2 font-mono text-xs"
              />
              <span className="mt-0.5 block text-[10px] font-normal text-slate-500">
                Hasta {sumarDiasIso(fecha, Number(diasCarne) || 0)}
              </span>
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Coste (€)
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="Opcional"
                value={costeEur}
                onChange={(e) => setCosteEur(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-2 font-mono text-xs"
              />
              <span className="mt-0.5 block text-[10px] font-normal text-slate-500">
                Duración: {duracionDias}d
              </span>
            </label>
          </div>
          <input type="hidden" value={duracionDias} onChange={(e) => setDuracionDias(e.target.value)} />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={animalIds.length === 0 || !medicamento.trim()}
            className="rounded-xl bg-sky-700 px-4 py-2 text-xs font-bold text-white hover:bg-sky-800 disabled:opacity-40"
          >
            Guardar en Libro{animalIds.length > 1 ? ` (${animalIds.length} vacas)` : ''}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}

export function ModalConfiguracion({
  estadoCompleto,
  explotacion,
  listaExplotaciones,
  explotacionActivaId,
  onCambiarExplotacion,
  onCrearExplotacion,
  onAnadirRazaPersonalizada,
  onCerrar,
  onGuardar,
  onRestaurarDemo,
  onImportarBackup,
}: {
  estadoCompleto: EstadoGanaderia;
  explotacion: DatosExplotacion;
  listaExplotaciones?: Array<{ id: string; nombre: string; codigoRega: string }>;
  explotacionActivaId?: string;
  onCambiarExplotacion?: (id: string) => void;
  onCrearExplotacion?: (datos: {
    nombre: string;
    codigoRega: string;
    especiePrincipal: EspecieCodigo;
    orientacionProductiva: OrientacionProductiva;
  }) => void;
  onAnadirRazaPersonalizada?: (raza: string) => void;
  onCerrar: () => void;
  onGuardar: (nueva: DatosExplotacion) => void;
  onRestaurarDemo: () => void;
  onImportarBackup: (nuevoEstado: EstadoGanaderia) => void;
}) {
  const [form, setForm] = useState<DatosExplotacion>(explotacion);
  const [errorBackup, setErrorBackup] = useState<string | null>(null);
  const [nuevaRaza, setNuevaRaza] = useState('');
  const [mostrarNuevaExp, setMostrarNuevaExp] = useState(false);
  const [nuevaExpNombre, setNuevaExpNombre] = useState('');
  const [nuevaExpRega, setNuevaExpRega] = useState('ES330');
  const [nuevaExpEspecie, setNuevaExpEspecie] = useState<EspecieCodigo>('BOVINO');
  const [nuevaExpOrient, setNuevaExpOrient] = useState<OrientacionProductiva>('CARNE');
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  const handleDescargarBackup = () => {
    descargarArchivo(
      `backup_ganaderia_${explotacion.codigoRega}_${hoyIso()}.json`,
      JSON.stringify(estadoCompleto, null, 2),
      'application/json;charset=utf-8',
    );
  };

  const handleRestaurarBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorBackup(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as EstadoGanaderia;
      if (!parsed || !parsed.explotacion || !Array.isArray(parsed.animales)) {
        setErrorBackup('El archivo no es una copia de seguridad válida de GanaderIA.');
        return;
      }
      onImportarBackup(parsed);
    } catch {
      setErrorBackup('No se pudo leer el archivo JSON de copia de seguridad.');
    }
    e.target.value = '';
  };

  const toggleEspecie = (esp: EspecieCodigo) => {
    const existe = form.especiesActivas.includes(esp);
    if (existe && form.especiesActivas.length === 1) return;
    const nuevas = existe
      ? form.especiesActivas.filter((e) => e !== esp)
      : [...form.especiesActivas, esp];
    setForm({
      ...form,
      especiesActivas: nuevas,
      especiePrincipal: nuevas.includes(form.especiePrincipal) ? form.especiePrincipal : nuevas[0],
    });
  };

  return (
    <ModalBase onCerrar={onCerrar} maxWidthClass="max-w-xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onGuardar(form);
        }}
        className="max-h-[90vh] overflow-y-auto p-5"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900">
            Configuración, Multi-Explotación (REGA) y Copias
          </h3>
          <button type="button" onClick={onCerrar} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3.5">
          {/* Gestor Multi-REGA */}
          {listaExplotaciones && onCambiarExplotacion && onCrearExplotacion && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-950">
                  <Building2 className="h-4 w-4 text-emerald-700" />
                  Mis Explotaciones (Multi-REGA)
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarNuevaExp((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#0f3d2e] px-2.5 py-1 text-[11px] font-bold text-white"
                >
                  <Plus className="h-3 w-3" />
                  Nueva explotación
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {listaExplotaciones.map((exp) => (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => onCambiarExplotacion(exp.id)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                      exp.id === explotacionActivaId
                        ? 'border-[#0f3d2e] bg-[#0f3d2e] text-white'
                        : 'border-[#dce4d6] bg-white text-[#1f3329] hover:bg-[#edf1e9]'
                    }`}
                  >
                    {exp.nombre} ({exp.codigoRega})
                  </button>
                ))}
              </div>

              {mostrarNuevaExp && (
                <div className="mt-2.5 grid gap-2 rounded-lg border border-emerald-200 bg-white p-2.5 text-xs sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Nombre (ej. Finca La Braña)"
                    value={nuevaExpNombre}
                    onChange={(e) => setNuevaExpNombre(e.target.value)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5"
                  />
                  <input
                    type="text"
                    placeholder="Código REGA"
                    value={nuevaExpRega}
                    onChange={(e) => setNuevaExpRega(e.target.value.toUpperCase())}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono"
                  />
                  <select
                    value={nuevaExpEspecie}
                    onChange={(e) => setNuevaExpEspecie(e.target.value as EspecieCodigo)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5"
                  >
                    {(Object.keys(ESPECIES_META) as EspecieCodigo[]).map((esp) => (
                      <option key={esp} value={esp}>
                        {ESPECIES_META[esp].nombre}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-1.5">
                    <select
                      value={nuevaExpOrient}
                      onChange={(e) => setNuevaExpOrient(e.target.value as OrientacionProductiva)}
                      className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5"
                    >
                      <option value="LECHE">Leche</option>
                      <option value="CARNE">Carne</option>
                      <option value="MIXTA">Mixta</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (!nuevaExpNombre.trim() || !nuevaExpRega.trim()) return;
                        onCrearExplotacion({
                          nombre: nuevaExpNombre.trim(),
                          codigoRega: nuevaExpRega.trim(),
                          especiePrincipal: nuevaExpEspecie,
                          orientacionProductiva: nuevaExpOrient,
                        });
                        setNuevaExpNombre('');
                        setMostrarNuevaExp(false);
                      }}
                      className="rounded-lg bg-emerald-700 px-3 py-1.5 font-bold text-white"
                    >
                      Crear
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-700">
              Nombre ganadería
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Código REGA
              <input
                type="text"
                value={form.codigoRega}
                onChange={(e) => setForm({ ...form, codigoRega: e.target.value.toUpperCase() })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-700">
              Comunidad Autónoma (Portal)
              <select
                value={form.comunidad}
                onChange={(e) =>
                  setForm({ ...form, comunidad: e.target.value as ComunidadCodigo })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                {(Object.keys(PORTALES_CCAA) as ComunidadCodigo[]).map((c) => (
                  <option key={c} value={c}>
                    {PORTALES_CCAA[c].nombre} ({PORTALES_CCAA[c].portalNombre})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Robot de ordeño
              <select
                value={form.marcaRobot}
                onChange={(e) =>
                  setForm({
                    ...form,
                    marcaRobot: e.target.value as DatosExplotacion['marcaRobot'],
                  })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <option value="Lely Horizon/T4C">Lely Horizon/T4C</option>
                <option value="DeLaval DelPro">DeLaval DelPro</option>
                <option value="GEA DairyPlan">GEA DairyPlan</option>
                <option value="Sin robot / Manual">Sin robot / Manual</option>
              </select>
            </label>
          </div>

          <label className="block text-xs font-semibold text-slate-700">
            Orientación productiva (adapta campos de leche y control lechero)
            <select
              value={form.orientacionProductiva || 'LECHE'}
              onChange={(e) =>
                setForm({
                  ...form,
                  orientacionProductiva: e.target.value as OrientacionProductiva,
                })
              }
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
            >
              <option value="LECHE">Vacuno de Leche (DEL, Mamitis 4 cuarterones, ASCOL)</option>
              <option value="CARNE">
                Vacuno de Carne / Nodrizas (oculta módulos exclusivos de ordeño)
              </option>
              <option value="MIXTA">Mixta (Leche + Carne)</option>
            </select>
          </label>

          <div>
            <p className="text-xs font-semibold text-slate-700">
              Especies habilitadas (pulsa para activar; principal:{' '}
              <strong>{ESPECIES_META[form.especiePrincipal].nombre}</strong>):
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(Object.keys(ESPECIES_META) as EspecieCodigo[]).map((esp) => {
                const activa = form.especiesActivas.includes(esp);
                return (
                  <button
                    key={esp}
                    type="button"
                    onClick={() => toggleEspecie(esp)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                      activa
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    {ESPECIES_META[esp].nombre}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-2.5">
            <p className="text-xs font-bold text-emerald-950">
              Datos SITRAN / RemoWeb Asturias (guías, duplicados y pasarela)
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="text-xs font-semibold text-slate-700">
                Código SIRENTRA habitual
                <input
                  type="text"
                  placeholder="ATES33000012345"
                  value={form.codigoSirentraHabitual || ''}
                  onChange={(e) =>
                    setForm({ ...form, codigoSirentraHabitual: e.target.value.toUpperCase() })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs"
                />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Teléfono notificaciones
                <input
                  type="text"
                  placeholder="600123456"
                  value={form.telefonoContacto || ''}
                  onChange={(e) => setForm({ ...form, telefonoContacto: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs"
                />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Proveedor duplicados crotal
                <select
                  value={form.proveedorCrotalHabitual || 'AZASA'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      proveedorCrotalHabitual: e.target.value as ProveedorCrotalRemoWeb,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                >
                  <option value="AZASA">AZASA (Asturias)</option>
                  <option value="DATAMARS">DATAMARS</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Foco sanitario activo
                <select
                  value={form.focoSanitarioActivo || 'NINGUNO'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      focoSanitarioActivo: e.target.value as EstadoFocoSanitario,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                >
                  <option value="NINGUNO">Sin foco activo</option>
                  <option value="T3_RESTRICCION_RC">Foco T3 (nacimientos con RC - S20713)</option>
                  <option value="TOTAL">Foco TOTAL (bloquea guías de salida)</option>
                </select>
              </label>
            </div>
          </div>

          {/* Razas personalizadas */}
          {onAnadirRazaPersonalizada && (
            <div className="rounded-xl border border-[#e1e7dc] bg-white p-3">
              <p className="text-xs font-bold text-[#0f1f18]">Razas personalizadas / cruces</p>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: Salers, Fleckvieh, Saanen, Cruce Asturiana × Charolés..."
                  value={nuevaRaza}
                  onChange={(e) => setNuevaRaza(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!nuevaRaza.trim()) return;
                    onAnadirRazaPersonalizada(nuevaRaza.trim());
                    setNuevaRaza('');
                  }}
                  className="rounded-lg bg-[#0f3d2e] px-3 py-1.5 text-xs font-bold text-white"
                >
                  Añadir
                </button>
              </div>
              {(estadoCompleto.razasPersonalizadas || []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(estadoCompleto.razasPersonalizadas || []).map((r) => (
                    <span
                      key={r}
                      className="rounded-full bg-[#edf1e9] px-2 py-0.5 text-[11px] font-bold text-[#31453b]"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Copia de seguridad y sincronización PC <-> Móvil */}
          <div className="rounded-xl border border-[#e1e7dc] bg-[#f8faf6] p-3">
            <p className="text-xs font-bold text-[#0f1f18]">
              Copia de seguridad local (100% Offline · PC ↔ Móvil)
            </p>
            <p className="mt-0.5 text-[11px] text-[#52655c]">
              Descarga tus datos en JSON para guardarlos en Drive/WhatsApp o pasarlos a otro
              dispositivo.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDescargarBackup}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce4d6] bg-white px-3 py-1.5 text-xs font-bold text-[#0f3d2e] hover:bg-emerald-50"
              >
                <Download className="h-3.5 w-3.5" />
                Descargar Backup (.json)
              </button>
              <input
                ref={backupInputRef}
                type="file"
                accept=".json"
                onChange={handleRestaurarBackup}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => backupInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce4d6] bg-white px-3 py-1.5 text-xs font-bold text-[#31453b] hover:bg-[#edf1e9]"
              >
                <Upload className="h-3.5 w-3.5" />
                Restaurar Backup (.json)
              </button>
            </div>
            {errorBackup && <p className="mt-2 text-xs font-semibold text-red-700">{errorBackup}</p>}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onRestaurarDemo}
            className="text-xs font-semibold text-amber-700 hover:underline"
          >
            Restaurar datos demo Asturias
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#0f3d2e] px-4 py-2 text-xs font-bold text-white hover:bg-[#16523e]"
            >
              Guardar configuración
            </button>
          </div>
        </div>
      </form>
    </ModalBase>
  );
}

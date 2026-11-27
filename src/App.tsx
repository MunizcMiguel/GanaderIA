import {
  Briefcase,
  Calendar,
  CalendarHeart,
  CheckCircle2,
  GitCompare,
  LayoutDashboard,
  Settings,
  Smartphone,
  Sprout,
  Stethoscope,
  Tag,
  Truck,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DashboardSemaforo } from './components/DashboardSemaforo';
import { DrawerFichaAnimal } from './components/DrawerFichaAnimal';
import { FabAccionesCuadra } from './components/FabAccionesCuadra';
import { ModalDictadoVoz } from './components/ModalDictadoVoz';
import {
  ModalEscanerOcr,
  type AccionGuardarDibOcr,
  type AccionGuardarRecetaOcr,
} from './components/ModalEscanerOcr';
import {
  ModalBaja,
  ModalCompra,
  ModalConfiguracion,
  ModalNacimiento,
  ModalTratamiento,
} from './components/ModalesRegistro';
import { ModalLibrosOficiales } from './components/ModalLibrosOficiales';
import { ModoCuadraMovil } from './components/ModoCuadraMovil';
import { VistaAnaliticaVet } from './components/VistaAnaliticaVet';
import { VistaCalendario } from './components/VistaCalendario';
import { VistaCenso } from './components/VistaCenso';
import { VistaCrotales } from './components/VistaCrotales';
import { VistaGestionEconomiaDocs } from './components/VistaGestionEconomiaDocs';
import { VistaReproduccion } from './components/VistaReproduccion';
import { VistaRobotCuadre } from './components/VistaRobotCuadre';
import { VistaSalidasDocs } from './components/VistaSalidasDocs';
import { VistaSitran } from './components/VistaSitran';
import {
  cargarAlmacenExplotaciones,
  guardarAlmacenExplotaciones,
  restaurarDemo,
} from './data/storage';
import { calcularAlertasPlazos } from './domain/alertas';
import {
  contarCrotalesDisponibles,
  extraerNumeroCorto,
  marcarCrotalComoUsado,
  normalizarCrotal,
} from './domain/crotales';
import { hoyIso, sumarDiasIso } from './domain/fechas';
import {
  BOTIQUIN_INICIAL,
  PROVEEDORES_INICIALES,
  VETERINARIOS_INICIALES,
} from './domain/gestionAvanzada';
import {
  anadirCorralPersonalizado,
  CORRALES_PREDEFINIDOS,
  eliminarCorralPersonalizado,
  obtenerCorralesActivos,
} from './domain/incidencias';
import { obtenerSimboloGanado } from './domain/reglasNormativas';
import { calcularCalendarioReproductivo } from './domain/reproduccion';
import type { AccionVozInterpretada } from './domain/parserVozCampo';
import type {
  AlmacenMultiExplotacion,
  CampanaSaneamiento,
  ControlLecheroRegistro,
  CuarteronUbre,
  DatosExplotacion,
  DificultadParto,
  DiscrepanciaCuadre,
  DocumentoExplotacion,
  EspecieCodigo,
  EstadoCrotalFisico,
  EstadoGanaderia,
  LoteCrotales,
  MedicamentoBotiquin,
  MovimientoEconomico,
  OrientacionProductiva,
  SexoAnimal,
  TipoIncidenciaClinica,
  TipoPesaje,
  UnidadGanadera,
} from './domain/types';

type Pestana =
  | 'panel'
  | 'calendario'
  | 'robot'
  | 'censo'
  | 'crotales'
  | 'reproduccion'
  | 'salidas'
  | 'analitica'
  | 'gestion';

export default function App() {
  const [almacen, setAlmacen] = useState<AlmacenMultiExplotacion>(() =>
    cargarAlmacenExplotaciones(),
  );
  const estado = useMemo(
    () =>
      (
        almacen.explotaciones.find((e) => e.id === almacen.explotacionActivaId) ||
        almacen.explotaciones[0]
      ).estado,
    [almacen],
  );
  const setEstado = (
    updater: EstadoGanaderia | ((prev: EstadoGanaderia) => EstadoGanaderia),
  ) => {
    setAlmacen((prevAlmacen) => {
      const idx = prevAlmacen.explotaciones.findIndex(
        (e) => e.id === prevAlmacen.explotacionActivaId,
      );
      const targetIdx = idx >= 0 ? idx : 0;
      const prevEstado = prevAlmacen.explotaciones[targetIdx].estado;
      const nextEstado = typeof updater === 'function' ? updater(prevEstado) : updater;
      const nuevasExp = prevAlmacen.explotaciones.map((e, i) =>
        i === targetIdx ? { ...e, estado: nextEstado } : e,
      );
      return { ...prevAlmacen, explotaciones: nuevasExp };
    });
  };

  const [pestana, setPestana] = useState<Pestana>('panel');
  const [modoPreferido, setModoPreferido] = useState<'AUTO' | 'CUADRA' | 'OFICINA'>(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('modo');
      if (p === 'cuadra') return 'CUADRA';
      if (p === 'oficina') return 'OFICINA';
      const saved = window.localStorage.getItem('ganaderia_modo_ui');
      if (saved === 'CUADRA' || saved === 'OFICINA') return saved;
    } catch {
      // ignora
    }
    return 'AUTO';
  });
  const [esPantallaMovil, setEsPantallaMovil] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
  );

  useEffect(() => {
    const onResize = () => setEsPantallaMovil(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const usarModoCuadra =
    modoPreferido === 'CUADRA' || (modoPreferido === 'AUTO' && esPantallaMovil);

  const cambiarModoPreferido = (nuevo: 'AUTO' | 'CUADRA' | 'OFICINA') => {
    setModoPreferido(nuevo);
    try {
      if (nuevo === 'AUTO') window.localStorage.removeItem('ganaderia_modo_ui');
      else window.localStorage.setItem('ganaderia_modo_ui', nuevo);
    } catch {
      // ignora
    }
  };
  const [toast, setToast] = useState<string | null>(null);
  const [drawerAnimalGlobalId, setDrawerAnimalGlobalId] = useState<string | null>(null);

  const [modalNacimiento, setModalNacimiento] = useState(false);
  const [datosPreNacimiento, setDatosPreNacimiento] = useState<
    { crotalMadre?: string; padreNombre?: string } | undefined
  >(undefined);
  const [modalCompra, setModalCompra] = useState(false);
  const [modalLibros, setModalLibros] = useState<'EXPLOTACION' | 'TRATAMIENTOS' | null>(null);
  const [modalVoz, setModalVoz] = useState(false);
  const [modalOcr, setModalOcr] = useState(false);
  const [modalBajaAnimal, setModalBajaAnimal] = useState<UnidadGanadera | 'SIN_PRESELECCION' | null>(
    null,
  );
  const [tipoBajaInicial, setTipoBajaInicial] = useState<
    'BAJA_MUERTE' | 'DESAPARICION' | 'BAJA_VENTA' | 'BAJA_MATADERO' | undefined
  >(undefined);
  const [modalTratamiento, setModalTratamiento] = useState<UnidadGanadera | null>(null);
  const [modalConfig, setModalConfig] = useState(false);

  useEffect(() => {
    guardarAlmacenExplotaciones(almacen);
  }, [almacen]);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };

  const alertas = useMemo(() => calcularAlertasPlazos(estado, hoyIso()), [estado]);
  const numPendientes = useMemo(
    () => estado.eventos.filter((e) => e.estadoTramite === 'PENDIENTE').length,
    [estado.eventos],
  );

  // --- Acciones de dominio ---
  const registrarNacimiento = (datos: {
    crotal: string;
    crotalMadre: string;
    padreNombre?: string;
    sexo: SexoAnimal;
    raza: string;
    fechaNacimiento: string;
    crotalColocado: boolean;
    dificultadParto?: DificultadParto;
    pesoNacimientoKg?: number;
    notas: string;
  }) => {
    const crotalNorm = normalizarCrotal(datos.crotal);
    const idAnimal = `ani-${Date.now()}`;
    const idEvento = `ev-${Date.now()}`;
    const nuevoAnimal: UnidadGanadera = {
      id: idAnimal,
      especie: estado.explotacion.especiePrincipal,
      esLote: false,
      cantidadEnLote: 1,
      crotal: crotalNorm,
      numeroCorto: extraerNumeroCorto(crotalNorm),
      raza: datos.raza,
      sexo: datos.sexo,
      fechaNacimiento: datos.fechaNacimiento,
      crotalMadre: datos.crotalMadre ? normalizarCrotal(datos.crotalMadre) : undefined,
      padreNombre: datos.padreNombre,
      dificultadPartoNacimiento: datos.dificultadParto || 1,
      estado: 'ACTIVO',
      estadoCrotal: datos.crotalColocado ? 'OK' : 'PENDIENTE_COLOCAR',
      dibImpreso: false,
      enCensoOficial: false,
      enRobotOrdene: false,
      notas: datos.notas || undefined,
    };

    setEstado((prev) => {
      const razasPrev = prev.razasPersonalizadas || [];
      const razasNext =
        datos.raza && !razasPrev.includes(datos.raza) ? [...razasPrev, datos.raza] : razasPrev;
      const pesajesNext = datos.pesoNacimientoKg
        ? [
            {
              id: `pes-nac-${Date.now()}`,
              animalId: idAnimal,
              crotal: crotalNorm,
              fecha: datos.fechaNacimiento,
              pesoKg: datos.pesoNacimientoKg,
              tipo: 'NACIMIENTO' as const,
              notas: 'Peso al nacimiento',
            },
            ...(prev.pesajes || []),
          ]
        : prev.pesajes;

      return {
        ...prev,
        animales: [nuevoAnimal, ...prev.animales],
        lotesCrotales: marcarCrotalComoUsado(prev.lotesCrotales, crotalNorm),
        pesajes: pesajesNext,
        razasPersonalizadas: razasNext,
        eventos: [
          {
            id: idEvento,
            tipo: 'NACIMIENTO',
            especie: prev.explotacion.especiePrincipal,
            animalId: idAnimal,
            crotal: crotalNorm,
            crotalMadre: nuevoAnimal.crotalMadre,
            crotalPadre: datos.padreNombre,
            sexo: datos.sexo,
            raza: datos.raza,
            fechaEvento: datos.fechaNacimiento,
            dificultadParto: datos.dificultadParto || 1,
            pesoNacimientoKg: datos.pesoNacimientoKg,
            origen: 'MANUAL',
            estadoTramite: 'PENDIENTE',
            crotalColocado: datos.crotalColocado,
            notas: datos.notas || undefined,
          },
          ...prev.eventos,
        ],
      };
    });
    setModalNacimiento(false);
    mostrarToast(`Nacimiento ${crotalNorm} añadido al censo y a la Cola RemoWeb.`);
  };

  const registrarCompra = (datos: {
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
  }) => {
    const crotalNorm = normalizarCrotal(datos.crotal);
    const idAnimal = `ani-comp-${Date.now()}`;
    const nuevoAnimal: UnidadGanadera = {
      id: idAnimal,
      especie: datos.especie,
      esLote: false,
      cantidadEnLote: 1,
      crotal: crotalNorm,
      numeroCorto: extraerNumeroCorto(crotalNorm),
      nombre: datos.nombre,
      raza: datos.raza,
      sexo: datos.sexo,
      fechaNacimiento: datos.fechaNacimiento,
      estado: 'ACTIVO',
      estadoCrotal: 'OK',
      dibImpreso: true,
      enCensoOficial: true,
      enRobotOrdene: false,
      regaOrigen: datos.regaOrigen || undefined,
      precioCompraEur: datos.precioCompraEur,
      notas: datos.notas,
    };

    setEstado((prev) => ({
      ...prev,
      animales: [nuevoAnimal, ...prev.animales],
      eventos: [
        {
          id: `ev-comp-${Date.now()}`,
          tipo: 'COMPRA',
          especie: datos.especie,
          animalId: idAnimal,
          crotal: crotalNorm,
          sexo: datos.sexo,
          raza: datos.raza,
          fechaEvento: datos.fechaCompra,
          codigoRegaOrigen: datos.regaOrigen || undefined,
          documentoSanitario: datos.documentoSanitario,
          importeEur: datos.precioCompraEur,
          pesoKg: datos.pesoKg,
          origen: 'MANUAL',
          estadoTramite: 'TRAMITADO',
          fechaTramitado: datos.fechaCompra,
          numeroJustificante: datos.documentoSanitario,
          notas: datos.notas,
        },
        ...prev.eventos,
      ],
      pesajes: datos.pesoKg
        ? [
            {
              id: `pes-comp-${Date.now()}`,
              animalId: idAnimal,
              crotal: crotalNorm,
              fecha: datos.fechaCompra,
              pesoKg: datos.pesoKg,
              tipo: 'CONTROL' as const,
              notas: 'Peso a la compra',
            },
            ...(prev.pesajes || []),
          ]
        : prev.pesajes,
      movimientosEconomicos: datos.precioCompraEur
        ? [
            {
              id: `eco-comp-${Date.now()}`,
              fecha: datos.fechaCompra,
              tipo: 'GASTO',
              categoria: 'COMPRA_ANIMAL',
              concepto: `Compra animal #${nuevoAnimal.numeroCorto} (${datos.raza})`,
              importeEur: datos.precioCompraEur,
              animalId: idAnimal,
              crotal: crotalNorm,
              pesoKg: datos.pesoKg,
              contraparte: datos.regaOrigen || undefined,
            },
            ...(prev.movimientosEconomicos || []),
          ]
        : prev.movimientosEconomicos,
    }));
    setModalCompra(false);
    mostrarToast(`Compra de ${crotalNorm} registrada en el censo y Libro Oficial.`);
  };

  const registrarBaja = (datos: {
    animalId: string;
    tipoBaja?: 'BAJA_MUERTE' | 'DESAPARICION' | 'BAJA_VENTA' | 'BAJA_MATADERO';
    fechaBaja: string;
    motivo: string;
    importeVentaEur?: number;
    pesoKg?: number;
    destino?: string;
    modalidadMuerte?: 'DAMER' | 'INACCESIBLE' | 'SACRIFICIO_URGENCIA' | 'NECROFAGAS';
    numeroDamer?: string;
    fechaValidezDamer?: string;
    ceaMatadero?: string;
    concejo?: string;
    lugarMuerte?: string;
    declaracionEnterramiento?: boolean;
    presentaDenuncia?: boolean;
    numeroDenuncia?: string;
  }) => {
    const animal = estado.animales.find((a) => a.id === datos.animalId);
    if (!animal) return;
    const tipoBaja = datos.tipoBaja || 'BAJA_MUERTE';
    const estadoAnimalFinal = tipoBaja === 'DESAPARICION' ? 'BAJA_MUERTE' : tipoBaja;
    const tipoEvento =
      tipoBaja === 'BAJA_VENTA'
        ? 'VENTA'
        : tipoBaja === 'BAJA_MATADERO'
          ? 'SALIDA_MATADERO'
          : tipoBaja === 'DESAPARICION'
            ? 'DESAPARICION'
            : 'BAJA_MUERTE';

    setEstado((prev) => ({
      ...prev,
      animales: prev.animales.map((a) =>
        a.id === datos.animalId
          ? {
              ...a,
              estado: estadoAnimalFinal,
              fechaBaja: datos.fechaBaja,
              motivoBaja: datos.motivo,
              precioVentaEur: datos.importeVentaEur ?? a.precioVentaEur,
            }
          : a,
      ),
      eventos: [
        {
          id: `ev-${Date.now()}`,
          tipo: tipoEvento,
          especie: animal.especie,
          animalId: animal.id,
          crotal: animal.crotal,
          fechaEvento: datos.fechaBaja,
          destino: datos.destino,
          motivo: datos.motivo,
          importeEur: datos.importeVentaEur,
          pesoKg: datos.pesoKg,
          modalidadMuerte: datos.modalidadMuerte,
          numeroDamer: datos.numeroDamer,
          fechaValidezDamer: datos.fechaValidezDamer,
          ceaMatadero: datos.ceaMatadero,
          concejo: datos.concejo,
          lugarMuerte: datos.lugarMuerte,
          declaracionEnterramiento: datos.declaracionEnterramiento,
          presentaDenuncia: datos.presentaDenuncia,
          numeroDenuncia: datos.numeroDenuncia,
          origen: 'MANUAL',
          estadoTramite: 'PENDIENTE',
        },
        ...prev.eventos,
      ],
      movimientosEconomicos: datos.importeVentaEur
        ? [
            {
              id: `eco-ven-${Date.now()}`,
              fecha: datos.fechaBaja,
              tipo: 'INGRESO',
              categoria: 'VENTA_ANIMAL',
              concepto: `${tipoBaja === 'BAJA_MATADERO' ? 'Matadero' : 'Venta'} #${animal.numeroCorto}${datos.destino ? ` (${datos.destino})` : ''}`,
              importeEur: datos.importeVentaEur,
              animalId: animal.id,
              crotal: animal.crotal,
              pesoKg: datos.pesoKg,
              contraparte: datos.destino,
            },
            ...(prev.movimientosEconomicos || []),
          ]
        : prev.movimientosEconomicos,
    }));
    setModalBajaAnimal(null);
    mostrarToast(`Salida/Baja de #${animal.numeroCorto} registrada y añadida a la Cola RemoWeb.`);
  };

  const incorporarDiscrepanciaRobot = (disc: DiscrepanciaCuadre) => {
    const fechaEv = disc.fechaEvento || hoyIso();

    if (disc.tipo === 'NACIMIENTO_ROBOT_NO_COMUNICADO') {
      const crotal = normalizarCrotal(disc.crotalSugerido || disc.crotal || `PEND-${Date.now()}`);
      const idAnimal = `ani-rob-${Date.now()}`;
      const nuevoAnimal: UnidadGanadera = {
        id: idAnimal,
        especie: estado.explotacion.especiePrincipal,
        esLote: false,
        cantidadEnLote: 1,
        crotal,
        numeroCorto: extraerNumeroCorto(crotal),
        raza: disc.raza || 'Frisona (Holstein)',
        sexo: disc.sexo || 'H',
        fechaNacimiento: fechaEv,
        crotalMadre: disc.crotalMadre,
        estado: 'ACTIVO',
        estadoCrotal: disc.crotal ? 'OK' : 'PENDIENTE_COLOCAR',
        dibImpreso: false,
        enCensoOficial: false,
        enRobotOrdene: true,
        notas: 'Incorporado desde archivo del robot de ordeño.',
      };

      setEstado((prev) => ({
        ...prev,
        animales: [nuevoAnimal, ...prev.animales],
        lotesCrotales: marcarCrotalComoUsado(prev.lotesCrotales, crotal),
        eventos: [
          {
            id: `ev-rob-${Date.now()}`,
            tipo: 'NACIMIENTO',
            especie: prev.explotacion.especiePrincipal,
            animalId: idAnimal,
            crotal,
            crotalMadre: disc.crotalMadre,
            sexo: disc.sexo || 'H',
            raza: disc.raza || 'Frisona (Holstein)',
            fechaEvento: fechaEv,
            origen: disc.origen || 'ROBOT_CSV',
            estadoTramite: 'PENDIENTE',
            crotalColocado: Boolean(disc.crotal),
            notas: disc.descripcion,
          },
          ...prev.eventos,
        ],
      }));
      mostrarToast(`Parto del robot incorporado con crotal ${crotal} en Cola RemoWeb.`);
      return;
    }

    if (disc.tipo === 'BAJA_ROBOT_ACTIVA_PRINCIPADO' && disc.crotal) {
      const norm = normalizarCrotal(disc.crotal);
      const animal = estado.animales.find((a) => normalizarCrotal(a.crotal) === norm);
      setEstado((prev) => ({
        ...prev,
        animales: prev.animales.map((a) =>
          normalizarCrotal(a.crotal) === norm
            ? {
                ...a,
                estado: 'BAJA_MUERTE',
                fechaBaja: fechaEv,
                motivoBaja: 'Baja importada desde robot de ordeño',
              }
            : a,
        ),
        eventos: [
          {
            id: `ev-rob-baja-${Date.now()}`,
            tipo: 'BAJA_MUERTE',
            especie: animal?.especie || prev.explotacion.especiePrincipal,
            animalId: animal?.id,
            crotal: norm,
            fechaEvento: fechaEv,
            motivo: 'Baja detectada en robot — pendiente de comunicar en Principado',
            origen: disc.origen || 'ROBOT_CSV',
            estadoTramite: 'PENDIENTE',
          },
          ...prev.eventos,
        ],
      }));
      mostrarToast(`Baja de ${norm} añadida a la Cola RemoWeb.`);
    }
  };

  const marcarTramitado = (eventoId: string, justificante?: string) => {
    const ev = estado.eventos.find((e) => e.id === eventoId);
    if (!ev) return;
    setEstado((prev) => ({
      ...prev,
      eventos: prev.eventos.map((e) =>
        e.id === eventoId
          ? {
              ...e,
              estadoTramite: 'TRAMITADO',
              fechaTramitado: hoyIso(),
              numeroJustificante: justificante?.trim() || undefined,
            }
          : e,
      ),
      animales: prev.animales.map((a) => {
        if (ev.tipo === 'NACIMIENTO' && (a.id === ev.animalId || a.crotal === ev.crotal)) {
          return { ...a, enCensoOficial: true };
        }
        return a;
      }),
    }));
    mostrarToast(`Trámite ${ev.crotal} marcado como confirmado en el Principado.`);
  };

  const marcarTodosTramitados = () => {
    const hoy = hoyIso();
    const pendientesIds = new Set(
      estado.eventos.filter((e) => e.estadoTramite === 'PENDIENTE').map((e) => e.id),
    );
    if (pendientesIds.size === 0) return;

    setEstado((prev) => ({
      ...prev,
      eventos: prev.eventos.map((e) =>
        pendientesIds.has(e.id)
          ? {
              ...e,
              estadoTramite: 'TRAMITADO',
              fechaTramitado: hoy,
              numeroJustificante: `REMO-${hoy.replace(/-/g, '')}-${e.crotal.slice(-4)}`,
            }
          : e,
      ),
      animales: prev.animales.map((a) =>
        a.estado === 'ACTIVO' && !a.enCensoOficial ? { ...a, enCensoOficial: true } : a,
      ),
    }));
    mostrarToast(`${pendientesIds.size} trámite(s) enviados y confirmados en SITRAN / RemoWeb.`);
  };

  const marcarCrotalColocado = (eventoId: string) => {
    const ev = estado.eventos.find((e) => e.id === eventoId);
    if (!ev) return;
    setEstado((prev) => ({
      ...prev,
      eventos: prev.eventos.map((e) =>
        e.id === eventoId ? { ...e, crotalColocado: true } : e,
      ),
      animales: prev.animales.map((a) =>
        a.id === ev.animalId || a.crotal === ev.crotal ? { ...a, estadoCrotal: 'OK' } : a,
      ),
    }));
    mostrarToast(`Crotal físico de ${ev.crotal} marcado como colocado.`);
  };

  const cambiarEstadoCrotal = (animalId: string, nuevo: EstadoCrotalFisico) => {
    setEstado((prev) => ({
      ...prev,
      animales: prev.animales.map((a) => (a.id === animalId ? { ...a, estadoCrotal: nuevo } : a)),
    }));
    if (nuevo !== 'OK' && nuevo !== 'PENDIENTE_COLOCAR') {
      mostrarToast('Añadido automáticamente a la Lista de Duplicados (AZASA / OCA).');
    }
  };

  const toggleDib = (animalId: string) => {
    setEstado((prev) => ({
      ...prev,
      animales: prev.animales.map((a) =>
        a.id === animalId ? { ...a, dibImpreso: !a.dibImpreso } : a,
      ),
    }));
  };

  const guardarTratamiento = (datos: {
    animalId: string;
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
  }) => {
    const hoy = hoyIso();
    const animal = estado.animales.find((a) => a.id === datos.animalId);
    if (!animal) return;
    const finLeche = datos.diasLeche > 0 ? sumarDiasIso(hoy, datos.diasLeche) : undefined;
    const finCarne = datos.diasCarne > 0 ? sumarDiasIso(hoy, datos.diasCarne) : undefined;

    setEstado((prev) => ({
      ...prev,
      animales: prev.animales.map((a) =>
        a.id === datos.animalId
          ? {
              ...a,
              supresionActiva: {
                medicamento: datos.medicamento,
                recetaPresvet: datos.recetaPresvet || undefined,
                fechaInicio: hoy,
                finSupresionLeche: finLeche,
                finSupresionCarne: finCarne,
              },
            }
          : a,
      ),
      tratamientos: [
        {
          id: `trat-${Date.now()}`,
          animalIds: [animal.id],
          crotales: [animal.crotal],
          fechaPrescripcion: hoy,
          fechaAdministracion: hoy,
          recetaPresvet: datos.recetaPresvet || undefined,
          veterinario: datos.veterinario,
          aplicadoPor: datos.aplicadoPor,
          medicamento: datos.medicamento,
          dosis: datos.dosis,
          proveedor: datos.proveedor,
          afeccion: datos.afeccion,
          duracionDias: datos.duracionDias,
          diasSupresionCarne: datos.diasCarne,
          diasSupresionLeche: datos.diasLeche,
          finSupresionCarne: finCarne,
          finSupresionLeche: finLeche,
          costeEur: datos.costeEur,
        },
        ...(prev.tratamientos || []),
      ],
      documentos: datos.recetaPresvet
        ? [
            {
              id: `doc-rec-${Date.now()}`,
              categoria: 'RECETA_PRESVET',
              titulo: `Receta PRESVET — #${animal.numeroCorto} (${datos.medicamento})`,
              fechaEmision: hoy,
              animalCrotal: animal.crotal,
              referencia: datos.recetaPresvet,
              estado: 'VIGENTE',
            },
            ...prev.documentos,
          ]
        : prev.documentos,
      movimientosEconomicos: datos.costeEur
        ? [
            {
              id: `eco-trat-${Date.now()}`,
              fecha: hoy,
              tipo: 'GASTO',
              categoria: 'MEDICAMENTOS',
              concepto: `${datos.medicamento} — #${animal.numeroCorto}`,
              importeEur: datos.costeEur,
              animalId: animal.id,
              crotal: animal.crotal,
              contraparte: datos.proveedor,
            },
            ...(prev.movimientosEconomicos || []),
          ]
        : prev.movimientosEconomicos,
    }));
    setModalTratamiento(null);
    mostrarToast(`Tratamiento guardado en Libro Oficial y bloqueo activado en #${animal.numeroCorto}.`);
  };

  const registrarSalidaLote = (payload: {
    animalIds: string[];
    tipo: 'SALIDA_MATADERO' | 'SALIDA_MERCADO' | 'SALIDA_PASTOS' | 'VENTA';
    destino: string;
    codigoRegaDestino: string;
    fechaSalida: string;
    importeTotalEur?: number;
    medioTransporte?: 'CAMION' | 'BARCO' | 'TREN' | 'AVION' | 'CONDUCCION_A_PIE' | 'OTROS';
    codigoSirentra?: string;
    matriculaVehiculo?: string;
    horaSalida?: string;
  }) => {
    const elegidos = estado.animales.filter((a) => payload.animalIds.includes(a.id));
    const nuevoEstadoAnimal =
      payload.tipo === 'SALIDA_MATADERO'
        ? 'BAJA_MATADERO'
        : payload.tipo === 'VENTA'
          ? 'BAJA_VENTA'
          : 'BAJA_TRASLADO';

    const nuevosEventos = elegidos.map((a, idx) => ({
      id: `ev-sal-${Date.now()}-${idx}`,
      tipo: payload.tipo,
      especie: a.especie,
      animalId: a.id,
      crotal: a.crotal,
      fechaEvento: payload.fechaSalida,
      destino: payload.destino,
      codigoRegaDestino: payload.codigoRegaDestino || undefined,
      medioTransporte: payload.medioTransporte,
      codigoSirentra: payload.codigoSirentra || undefined,
      matriculaVehiculo: payload.matriculaVehiculo || undefined,
      horaSalida: payload.horaSalida || undefined,
      importeEur:
        payload.importeTotalEur && elegidos.length > 0
          ? Number((payload.importeTotalEur / elegidos.length).toFixed(2))
          : undefined,
      origen: 'MANUAL' as const,
      estadoTramite: 'PENDIENTE' as const,
    }));

    setEstado((prev) => ({
      ...prev,
      animales: prev.animales.map((a) =>
        payload.animalIds.includes(a.id)
          ? {
              ...a,
              estado: payload.tipo === 'SALIDA_PASTOS' ? 'ACTIVO' : nuevoEstadoAnimal,
              fechaBaja: payload.tipo === 'SALIDA_PASTOS' ? undefined : payload.fechaSalida,
              motivoBaja: payload.destino,
            }
          : a,
      ),
      eventos: [...nuevosEventos, ...prev.eventos],
      movimientosEconomicos: payload.importeTotalEur
        ? [
            {
              id: `eco-sal-${Date.now()}`,
              fecha: payload.fechaSalida,
              tipo: 'INGRESO',
              categoria: 'VENTA_ANIMAL',
              concepto: `Salida ${elegidos.length} animal(es) · ${payload.destino}`,
              importeEur: payload.importeTotalEur,
              contraparte: payload.destino,
            },
            ...(prev.movimientosEconomicos || []),
          ]
        : prev.movimientosEconomicos,
    }));
    mostrarToast(`Salida de ${elegidos.length} animal(es) registrada y enviada a Cola RemoWeb.`);
  };

  const anadirInseminacion = (datos: {
    animalId: string;
    fechaInseminacion: string;
    toro: string;
    confirmadaGestacion: boolean;
  }) => {
    const animal = estado.animales.find((a) => a.id === datos.animalId);
    if (!animal) return;
    setEstado((prev) => ({
      ...prev,
      inseminaciones: [
        {
          id: `ins-${Date.now()}`,
          animalId: animal.id,
          crotal: animal.crotal,
          especie: animal.especie,
          fechaInseminacion: datos.fechaInseminacion,
          toro: datos.toro || undefined,
          confirmadaGestacion: datos.confirmadaGestacion,
          estado: 'ACTIVA',
        },
        ...(prev.inseminaciones || []),
      ],
    }));
    mostrarToast(`Inseminación registrada en #${animal.numeroCorto}. Fechas de secado y parto calculadas.`);
  };

  const aplicarAccionVoz = (accion: AccionVozInterpretada) => {
    if (accion.tipo === 'NACIMIENTO') {
      registrarNacimiento({
        crotal: accion.crotalTernero || `PEND-${Date.now()}`,
        crotalMadre: accion.crotalMadre || '',
        sexo: accion.sexo,
        raza: accion.raza,
        fechaNacimiento: accion.fecha,
        crotalColocado: accion.crotalColocado,
        notas: 'Registrado por dictado rápido de cuadra.',
      });
      setModalVoz(false);
      return;
    }
    if (accion.tipo === 'CROTAL_CAIDO' && accion.animal) {
      cambiarEstadoCrotal(accion.animal.id, accion.estadoCrotal);
      setModalVoz(false);
      return;
    }
    if (accion.tipo === 'BAJA_MUERTE' && accion.animal) {
      registrarBaja({
        animalId: accion.animal.id,
        fechaBaja: accion.fecha,
        motivo: accion.motivo,
      });
      setModalVoz(false);
      return;
    }
    if (accion.tipo === 'INSEMINACION' && accion.animal) {
      anadirInseminacion({
        animalId: accion.animal.id,
        fechaInseminacion: accion.fecha,
        toro: accion.toro || '',
        confirmadaGestacion: false,
      });
      setModalVoz(false);
      return;
    }
    if (accion.tipo === 'INCIDENCIA' && accion.animal) {
      registrarIncidencia({
        animalId: accion.animal.id,
        tipo: accion.tipoIncidencia,
        cuarteron: accion.cuarteron,
        notas: 'Registrada por dictado rápido de cuadra.',
      });
      setModalVoz(false);
    }
  };

  const cambiarCorralAnimal = (animalId: string, corralId: string | undefined) => {
    setEstado((prev) => ({
      ...prev,
      animales: prev.animales.map((a) => (a.id === animalId ? { ...a, corralId } : a)),
    }));
    mostrarToast('Corral del animal actualizado.');
  };

  const moverLoteCorral = (animalIds: string[], corralId: string | undefined) => {
    const idsSet = new Set(animalIds);
    setEstado((prev) => ({
      ...prev,
      animales: prev.animales.map((a) => (idsSet.has(a.id) ? { ...a, corralId } : a)),
    }));
    mostrarToast(`${animalIds.length} animal(es) movidos al nuevo corral.`);
  };

  const vacunarLoteAnimales = (animalIds: string[], motivo: string) => {
    const hoy = hoyIso();
    const elegidos = estado.animales.filter((a) => animalIds.includes(a.id));
    const nuevasInc = elegidos.map((a, idx) => ({
      id: `inc-lote-${Date.now()}-${idx}`,
      animalId: a.id,
      crotal: a.crotal,
      tipo: 'VACUNACION_LOTE' as const,
      fecha: hoy,
      notas: motivo.trim() || 'Vacunación / tratamiento en lote',
    }));
    setEstado((prev) => ({
      ...prev,
      incidencias: [...nuevasInc, ...(prev.incidencias || [])],
    }));
    mostrarToast(`Registrada actuación en lote sobre ${elegidos.length} animal(es).`);
  };

  const registrarIncidencia = (datos: {
    animalId: string;
    tipo: TipoIncidenciaClinica;
    cuarteron?: CuarteronUbre;
    notas?: string;
  }) => {
    const animal = estado.animales.find((a) => a.id === datos.animalId);
    if (!animal) return;
    setEstado((prev) => ({
      ...prev,
      incidencias: [
        {
          id: `inc-${Date.now()}`,
          animalId: animal.id,
          crotal: animal.crotal,
          tipo: datos.tipo,
          cuarteron: datos.cuarteron,
          fecha: hoyIso(),
          notas: datos.notas,
        },
        ...(prev.incidencias || []),
      ],
    }));
    mostrarToast(
      `Incidencia ${datos.tipo}${datos.cuarteron ? ` (${datos.cuarteron})` : ''} guardada en #${animal.numeroCorto}.`,
    );
  };

  const importarControlesLecheros = (registros: ControlLecheroRegistro[]) => {
    setEstado((prev) => ({
      ...prev,
      controlesLecheros: [...registros, ...(prev.controlesLecheros || [])],
    }));
    const rcsAltos = registros.filter((r) => r.rcsMiles >= 200).length;
    mostrarToast(
      `Importados ${registros.length} registros de Control Lechero ASCOL (${rcsAltos} con RCS ≥ 200k).`,
    );
  };

  const registrarPesaje = (datos: {
    animalId: string;
    fecha: string;
    pesoKg: number;
    tipo: TipoPesaje;
    notas?: string;
  }) => {
    const animal = estado.animales.find((a) => a.id === datos.animalId);
    if (!animal) return;
    setEstado((prev) => ({
      ...prev,
      pesajes: [
        {
          id: `pes-${Date.now()}`,
          animalId: animal.id,
          crotal: animal.crotal,
          fecha: datos.fecha,
          pesoKg: datos.pesoKg,
          tipo: datos.tipo,
          notas: datos.notas,
        },
        ...(prev.pesajes || []),
      ],
    }));
    mostrarToast(`Pesaje (${datos.pesoKg} kg) registrado en #${animal.numeroCorto}.`);
  };

  const actualizarFotoAnimal = (animalId: string, fotoDataUrl: string | undefined) => {
    setEstado((prev) => ({
      ...prev,
      animales: prev.animales.map((a) => (a.id === animalId ? { ...a, fotoDataUrl } : a)),
    }));
    mostrarToast(fotoDataUrl ? 'Foto del animal guardada.' : 'Foto eliminada.');
  };

  const actualizarFechaOficialAnimal = (
    animalId: string,
    fechaOficial: string | undefined,
  ) => {
    setEstado((prev) => ({
      ...prev,
      animales: prev.animales.map((a) =>
        a.id === animalId ? { ...a, fechaNacimientoOficial: fechaOficial } : a,
      ),
    }));
    mostrarToast('Fecha de nacimiento oficial actualizada.');
  };

  const actualizarGenealogiaAnimal = (
    animalId: string,
    datos: { crotalMadre?: string; crotalPadre?: string; padreNombre?: string },
  ) => {
    setEstado((prev) => ({
      ...prev,
      animales: prev.animales.map((a) =>
        a.id === animalId
          ? {
              ...a,
              crotalMadre: datos.crotalMadre,
              crotalPadre: datos.crotalPadre,
              padreNombre: datos.padreNombre,
            }
          : a,
      ),
    }));
    mostrarToast('Genealogía (madre / padre) actualizada.');
  };

  const importarAnimalesCenso = (nuevos: UnidadGanadera[]) => {
    setEstado((prev) => ({
      ...prev,
      animales: [...nuevos, ...prev.animales],
    }));
    mostrarToast(`Importados ${nuevos.length} animales al censo.`);
  };

  const registrarSaneamiento = (campana: CampanaSaneamiento) => {
    setEstado((prev) => ({
      ...prev,
      saneamientos: [campana, ...(prev.saneamientos || [])],
    }));
    mostrarToast(`Campaña de saneamiento "${campana.nombre}" registrada.`);
  };

  const anadirMedicamentoBotiquin = (med: MedicamentoBotiquin) => {
    setEstado((prev) => ({
      ...prev,
      botiquin: [med, ...(prev.botiquin || [])],
    }));
    mostrarToast(`"${med.nombre}" añadido al botiquín.`);
  };

  const eliminarMedicamentoBotiquin = (medId: string) => {
    setEstado((prev) => ({
      ...prev,
      botiquin: (prev.botiquin || []).filter((m) => m.id !== medId),
    }));
  };

  const anadirMovimientoEconomico = (mov: MovimientoEconomico) => {
    setEstado((prev) => ({
      ...prev,
      movimientosEconomicos: [mov, ...(prev.movimientosEconomicos || [])],
    }));
    mostrarToast(`Apunte económico (${mov.importeEur} €) guardado.`);
  };

  const crearNuevaExplotacion = (datos: {
    nombre: string;
    codigoRega: string;
    especiePrincipal: EspecieCodigo;
    orientacionProductiva: OrientacionProductiva;
  }) => {
    const nuevaId = `exp-${Date.now()}`;
    const nuevoEstado: EstadoGanaderia = {
      explotacion: {
        nombre: datos.nombre,
        titular: estado.explotacion.titular,
        codigoRega: datos.codigoRega,
        municipio: estado.explotacion.municipio,
        comunidad: estado.explotacion.comunidad,
        especiePrincipal: datos.especiePrincipal,
        especiesActivas: [datos.especiePrincipal],
        orientacionProductiva: datos.orientacionProductiva,
        marcaRobot: 'Sin robot / Manual',
        umbralAlertaCrotales: 10,
      },
      animales: [],
      eventos: [],
      lotesCrotales: [],
      documentos: [],
      corrales: [...CORRALES_PREDEFINIDOS],
      botiquin: [...BOTIQUIN_INICIAL],
      veterinarios: [...VETERINARIOS_INICIALES],
      proveedores: [...PROVEEDORES_INICIALES],
    };
    setAlmacen((prev) => ({
      explotacionActivaId: nuevaId,
      explotaciones: [...prev.explotaciones, { id: nuevaId, estado: nuevoEstado }],
    }));
    setModalConfig(false);
    mostrarToast(`Explotación "${datos.nombre}" creada y activada.`);
  };

  const guardarRecetaOcr = (datos: AccionGuardarRecetaOcr) => {
    const animal = estado.animales.find((a) => a.id === datos.animalId);
    if (!animal) return;
    setEstado((prev) => ({
      ...prev,
      animales: prev.animales.map((a) =>
        a.id === datos.animalId
          ? {
              ...a,
              supresionActiva: {
                medicamento: datos.medicamento,
                recetaPresvet: datos.recetaPresvet || undefined,
                fechaInicio: datos.fechaEmision,
                finSupresionLeche:
                  datos.diasLeche > 0 ? sumarDiasIso(datos.fechaEmision, datos.diasLeche) : undefined,
                finSupresionCarne:
                  datos.diasCarne > 0 ? sumarDiasIso(datos.fechaEmision, datos.diasCarne) : undefined,
              },
            }
          : a,
      ),
      documentos: [
        {
          id: `doc-ocr-rec-${Date.now()}`,
          categoria: 'RECETA_PRESVET',
          titulo: `Receta PRESVET (OCR) — #${animal.numeroCorto} (${datos.medicamento})`,
          fechaEmision: datos.fechaEmision,
          animalCrotal: animal.crotal,
          referencia: datos.recetaPresvet || undefined,
          estado: 'VIGENTE',
          notas: `Leche: ${datos.diasLeche}d · Carne: ${datos.diasCarne}d${
            datos.veterinario ? ` · ${datos.veterinario}` : ''
          }`,
        },
        ...prev.documentos,
      ],
      eventos: [
        {
          id: `ev-ocr-trat-${Date.now()}`,
          tipo: 'TRATAMIENTO',
          especie: animal.especie,
          animalId: animal.id,
          crotal: animal.crotal,
          fechaEvento: datos.fechaEmision,
          motivo: `${datos.medicamento}${datos.recetaPresvet ? ` (${datos.recetaPresvet})` : ''}`,
          origen: 'MANUAL',
          estadoTramite: 'TRAMITADO',
          fechaTramitado: datos.fechaEmision,
          numeroJustificante: datos.recetaPresvet || undefined,
        },
        ...prev.eventos,
      ],
    }));
    setModalOcr(false);
    mostrarToast(
      `Receta PRESVET guardada y supresión activada en #${animal.numeroCorto} (leche ${datos.diasLeche}d / carne ${datos.diasCarne}d).`,
    );
  };

  const guardarDibOcr = (datos: AccionGuardarDibOcr) => {
    const crotalNorm = normalizarCrotal(datos.crotal);
    const hoy = hoyIso();

    if (datos.animalExistenteId) {
      setEstado((prev) => ({
        ...prev,
        animales: prev.animales.map((a) =>
          a.id === datos.animalExistenteId
            ? { ...a, dibImpreso: true, enCensoOficial: true }
            : a,
        ),
        documentos: [
          {
            id: `doc-ocr-dib-${Date.now()}`,
            categoria: 'DIB',
            titulo: `DIB Bovino Verificado (OCR) — ${crotalNorm}`,
            fechaEmision: hoy,
            animalCrotal: crotalNorm,
            estado: 'VIGENTE',
            notas: `Raza: ${datos.raza} · Sexo: ${datos.sexo} · Madre: ${datos.crotalMadre || '—'}`,
          },
          ...prev.documentos,
        ],
      }));
      setModalOcr(false);
      mostrarToast(`DIB de ${crotalNorm} verificado y archivado en la Carpeta de Inspección.`);
      return;
    }

    const nuevoAnimal: UnidadGanadera = {
      id: `ani-dib-${Date.now()}`,
      especie: 'BOVINO',
      esLote: false,
      cantidadEnLote: 1,
      crotal: crotalNorm,
      numeroCorto: extraerNumeroCorto(crotalNorm),
      raza: datos.raza,
      sexo: datos.sexo,
      fechaNacimiento: datos.fechaNacimiento,
      crotalMadre: datos.crotalMadre ? normalizarCrotal(datos.crotalMadre) : undefined,
      estado: 'ACTIVO',
      estadoCrotal: 'OK',
      dibImpreso: true,
      enCensoOficial: true,
      enRobotOrdene: false,
      notas: 'Dado de alta escaneando su DIB oficial con OCR.',
    };

    setEstado((prev) => ({
      ...prev,
      animales: [nuevoAnimal, ...prev.animales],
      lotesCrotales: marcarCrotalComoUsado(prev.lotesCrotales, crotalNorm),
      documentos: [
        {
          id: `doc-ocr-dib-${Date.now()}`,
          categoria: 'DIB',
          titulo: `DIB Bovino (OCR) — ${crotalNorm}`,
          fechaEmision: hoy,
          animalCrotal: crotalNorm,
          estado: 'VIGENTE',
          notas: `Raza: ${datos.raza} · Sexo: ${datos.sexo} · Madre: ${datos.crotalMadre || '—'}`,
        },
        ...prev.documentos,
      ],
    }));
    setModalOcr(false);
    mostrarToast(`Animal ${crotalNorm} dado de alta desde su DIB y archivado en Documentos.`);
  };

  const simboloMiGanado = useMemo(
    () => obtenerSimboloGanado(estado.animales, estado.explotacion.especiePrincipal),
    [estado.animales, estado.explotacion.especiePrincipal],
  );

  const IconoMiGanado = ({ className }: { className?: string }) => (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center leading-none ${
        simboloMiGanado.length > 2 ? 'text-[13px] tracking-tighter' : 'text-base'
      } ${className || ''}`}
    >
      {simboloMiGanado}
    </span>
  );

  const activosCount = useMemo(
    () => estado.animales.filter((a) => a.estado === 'ACTIVO').length,
    [estado.animales],
  );
  const crotalesDisponiblesNav = useMemo(
    () => contarCrotalesDisponibles(estado.lotesCrotales, estado.explotacion.especiePrincipal),
    [estado.lotesCrotales, estado.explotacion.especiePrincipal],
  );
  const reproActivasNav = useMemo(
    () => calcularCalendarioReproductivo(estado.inseminaciones, estado.animales, hoyIso()).length,
    [estado.inseminaciones, estado.animales],
  );
  const diasMinSitranNav = useMemo(
    () =>
      alertas
        .filter(
          (a) =>
            (a.categoria === 'NOTIFICACION_NACIMIENTO' ||
              a.categoria === 'NOTIFICACION_BAJA' ||
              a.categoria === 'COLOCACION_CROTAL') &&
            typeof a.diasRestantes === 'number',
        )
        .map((a) => a.diasRestantes as number)
        .sort((a, b) => a - b)[0],
    [alertas],
  );
  const sitranBadgeColor: 'red' | 'orange' | 'green' =
    numPendientes > 0 && diasMinSitranNav !== undefined && diasMinSitranNav <= 2
      ? 'red'
      : numPendientes > 0 && diasMinSitranNav !== undefined && diasMinSitranNav <= 5
        ? 'orange'
        : 'green';

  const navItems: {
    id: Pestana;
    label: string;
    corto: string;
    grupo: 'operacion' | 'gestion';
    icono: typeof LayoutDashboard | typeof IconoMiGanado;
    badge?: number;
    badgeColor?: 'red' | 'orange' | 'green';
  }[] = [
    {
      id: 'panel',
      label: 'Semáforo',
      corto: 'Inicio',
      grupo: 'operacion',
      icono: LayoutDashboard,
    },
    {
      id: 'censo',
      label: 'MiGanado',
      corto: 'MiGanado',
      grupo: 'operacion',
      icono: IconoMiGanado,
      badge: activosCount,
      badgeColor: 'green',
    },
    { id: 'calendario', label: 'Calendario', corto: 'Agenda', grupo: 'operacion', icono: Calendar },
    {
      id: 'robot',
      label: 'Sincronizar Robot/SITRAN',
      corto: 'Robot/SITRAN',
      grupo: 'operacion',
      icono: GitCompare,
      badge: numPendientes,
      badgeColor: sitranBadgeColor,
    },
    {
      id: 'crotales',
      label: 'Crotales',
      corto: 'Crotales',
      grupo: 'gestion',
      icono: Tag,
      badge: crotalesDisponiblesNav,
      badgeColor: crotalesDisponiblesNav > 0 ? 'green' : 'red',
    },
    {
      id: 'reproduccion',
      label: 'Reproducción',
      corto: 'Reprod.',
      grupo: 'gestion',
      icono: CalendarHeart,
      badge: reproActivasNav,
      badgeColor: 'green',
    },
    { id: 'salidas', label: 'Salidas y Guías', corto: 'Salidas', grupo: 'gestion', icono: Truck },
    { id: 'analitica', label: 'Veterinario', corto: 'Vet', grupo: 'gestion', icono: Stethoscope },
    { id: 'gestion', label: 'Gestión y Economía', corto: 'Gestión', grupo: 'gestion', icono: Briefcase },
  ];

  const navOperacion = navItems.filter((i) => i.grupo === 'operacion');
  const navGestion = navItems.filter((i) => i.grupo === 'gestion');

  const renderSidebarItem = (item: (typeof navItems)[number]) => {
    const Icono = item.icono;
    const activo = pestana === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setPestana(item.id)}
        className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-bold transition ${
          activo
            ? 'bg-[#0f3d2e] text-white shadow-xs'
            : 'text-[#3f5349] hover:bg-[#edf1e9] hover:text-[#0f1f18]'
        }`}
      >
        <span className="flex items-center gap-2.5">
          <Icono className={`h-4 w-4 ${activo ? 'text-amber-300' : 'text-[#6e8277]'}`} />
          {item.label}
        </span>
        {item.badge !== undefined && (
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-extrabold ${
              activo
                ? 'bg-white/20 text-white'
                : item.id === 'panel'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-950'
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f6f1]">
      {usarModoCuadra ? (
        <ModoCuadraMovil
          estado={estado}
          alertas={alertas}
          numPendientes={numPendientes}
          onAbrirFichaAnimal={(a) => setDrawerAnimalGlobalId(a.id)}
          onAbrirVoz={() => setModalVoz(true)}
          onAbrirOcr={() => setModalOcr(true)}
          onAbrirNacimiento={() => setModalNacimiento(true)}
          onAbrirCompra={() => setModalCompra(true)}
          onAbrirBaja={() => setModalBajaAnimal('SIN_PRESELECCION')}
          onAbrirLibros={() => setModalLibros('EXPLOTACION')}
          onAbrirConfig={() => setModalConfig(true)}
          onRegistrarIncidencia={registrarIncidencia}
          onCambiarAModoOficina={(destino) => {
            if (destino) setPestana(destino);
            cambiarModoPreferido('OFICINA');
          }}
          tabExterno={
            pestana === 'censo' ? 'vacas' : pestana === 'calendario' ? 'agenda' : 'hoy'
          }
          ocultarNavInferior
        />
      ) : (
        <div className="min-h-screen bg-[#f4f6f1] pb-24 lg:flex lg:pb-0">
          {/* Sidebar escritorio limpia y agrupada */}
      <aside className="no-print sticky top-0 hidden h-screen w-68 shrink-0 flex-col border-r border-[#e1e7dc] bg-white lg:flex">
        <div className="border-b border-[#edf1e9] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f3d2e] to-[#166534] text-amber-300 shadow-xs">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-[#0f1f18]">
                Ganader<span className="text-emerald-700">IA</span>
              </span>
              <p className="text-[11px] font-semibold text-[#52655c]">Asturias · SITRAN</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalConfig(true)}
            className="mt-3.5 w-full rounded-xl border border-[#e6ece2] bg-[#f8faf6] px-3 py-2 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40"
          >
            <p className="truncate text-xs font-extrabold text-[#0f1f18]">
              {estado.explotacion.nombre}
            </p>
            <p className="mt-0.5 font-mono text-[10px] font-semibold text-[#52655c]">
              {estado.explotacion.codigoRega} · {estado.explotacion.marcaRobot.split(' ')[0]}
            </p>
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto p-3.5">
          <div>
            <p className="mb-1.5 px-3 text-[10px] font-extrabold uppercase tracking-widest text-[#70857a]">
              Operación diaria
            </p>
            <div className="space-y-1">{navOperacion.map(renderSidebarItem)}</div>
          </div>

          <div>
            <p className="mb-1.5 px-3 text-[10px] font-extrabold uppercase tracking-widest text-[#70857a]">
              Gestión de granja
            </p>
            <div className="space-y-1">{navGestion.map(renderSidebarItem)}</div>
          </div>
        </nav>

        <div className="space-y-1 border-t border-[#edf1e9] p-3.5">
          <button
            type="button"
            onClick={() => cambiarModoPreferido('CUADRA')}
            className="flex w-full items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-[#0f3d2e] transition hover:bg-emerald-100"
          >
            <Smartphone className="h-4 w-4 text-emerald-700" />
            Probar Modo Cuadra (Móvil)
          </button>
          <button
            type="button"
            onClick={() => setModalConfig(true)}
            className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#4a5d54] transition hover:bg-[#edf1e9] hover:text-[#0f1f18]"
          >
            <Settings className="h-4 w-4 text-[#70857a]" />
            Explotación y Especies
          </button>
        </div>
      </aside>

      {/* Cabecera móvil minimalista */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-[#e1e7dc] bg-white/95 px-4 py-3 backdrop-blur-xs lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0f3d2e] text-amber-300">
            <Sprout className="h-4 w-4" />
          </div>
          <div>
            <span className="text-base font-extrabold leading-none text-[#0f1f18]">
              Ganader<span className="text-emerald-700">IA</span>
            </span>
            <p className="text-[10px] font-semibold text-[#52655c]">
              {estado.explotacion.nombre}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => cambiarModoPreferido('CUADRA')}
            className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-[#0f3d2e]"
          >
            <Smartphone className="h-3.5 w-3.5" />
            Cuadra
          </button>
          <button
            type="button"
            onClick={() => setModalConfig(true)}
            className="rounded-xl border border-[#dce4d6] bg-[#f8faf6] p-2 text-[#4a5d54]"
            aria-label="Configuración"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8 lg:pb-24">
        {pestana === 'panel' && (
          <DashboardSemaforo
            estado={estado}
            alertas={alertas}
            onIrA={setPestana}
            onAbrirNacimiento={() => setModalNacimiento(true)}
          />
        )}

        {pestana === 'calendario' && (
          <VistaCalendario
            estado={estado}
            onAbrirFichaAnimal={(a) => setDrawerAnimalGlobalId(a.id)}
            onIrA={setPestana}
          />
        )}

        {pestana === 'robot' && (
          <div className="space-y-5">
            <VistaRobotCuadre
              estado={estado}
              onIncorporarDiscrepancia={incorporarDiscrepanciaRobot}
              onMarcarTramitado={marcarTramitado}
              onMarcarCrotalColocado={marcarCrotalColocado}
              onRegistrarImportacion={(archivo, fuente, registrosLeidos) =>
                setEstado((prev) => ({
                  ...prev,
                  ultimaImportacionRobot: {
                    fechaIso: new Date().toISOString(),
                    archivo,
                    fuente,
                    registrosLeidos,
                  },
                }))
              }
            />
            <VistaSitran
              estado={estado}
              onMarcarTramitado={marcarTramitado}
              onMarcarTodosTramitados={marcarTodosTramitados}
            />
          </div>
        )}

        {pestana === 'censo' && (
          <VistaCenso
            estado={estado}
            onCambiarEstadoCrotal={cambiarEstadoCrotal}
            onCambiarCorral={cambiarCorralAnimal}
            onMoverLoteCorral={moverLoteCorral}
            onVacunarLote={vacunarLoteAnimales}
            onAnadirCorral={(nombre) => {
              setEstado((prev) => ({
                ...prev,
                corrales: anadirCorralPersonalizado(obtenerCorralesActivos(prev), nombre),
              }));
              mostrarToast(`Corral personalizado "${nombre}" creado.`);
            }}
            onEliminarCorral={(corralId) => {
              setEstado((prev) => eliminarCorralPersonalizado(prev, corralId));
              mostrarToast('Corral personalizado eliminado.');
            }}
            onRegistrarIncidencia={registrarIncidencia}
            onRegistrarPesaje={registrarPesaje}
            onActualizarFoto={actualizarFotoAnimal}
            onActualizarFechaOficial={actualizarFechaOficialAnimal}
            onActualizarGenealogia={actualizarGenealogiaAnimal}
            onImportarAnimalesCenso={importarAnimalesCenso}
            onToggleDib={toggleDib}
            onAbrirNacimiento={() => setModalNacimiento(true)}
            onAbrirCompra={() => setModalCompra(true)}
            onAbrirLibrosOficiales={(libro = 'EXPLOTACION') => setModalLibros(libro)}
            onAbrirTratamiento={(a) => setModalTratamiento(a)}
            onAbrirBajaAnimal={(a, tipo) => {
              setTipoBajaInicial(tipo);
              setModalBajaAnimal(a ?? 'SIN_PRESELECCION');
            }}
          />
        )}

        {pestana === 'crotales' && (
          <VistaCrotales
            estado={estado}
            onAnadirLote={(lote: LoteCrotales) => {
              setEstado((prev) => ({
                ...prev,
                lotesCrotales: [...prev.lotesCrotales, lote],
                pedidoCrotalesActivo: undefined,
              }));
              mostrarToast('Remesa recibida añadida al cajón virtual.');
            }}
            onResolverDuplicado={(animalId) => {
              cambiarEstadoCrotal(animalId, 'OK');
              mostrarToast('Duplicado marcado como colocado.');
            }}
            onSolicitarCrotales={(datos) => {
              const hoy = hoyIso();
              setEstado((prev) => ({
                ...prev,
                pedidoCrotalesActivo: {
                  id: `ped-${Date.now()}`,
                  fechaPedido: hoy,
                  fechaAvisoCalendario: sumarDiasIso(hoy, 7),
                  cantidad: datos.cantidad,
                  proveedor: datos.proveedor,
                  formaEnvio: datos.formaEnvio,
                },
              }));
              mostrarToast(
                'Pedido registrado. Aviso en la Agenda en 1 semana para confirmar recepción.',
              );
            }}
            onAplazarPedidoCrotales={() => {
              setEstado((prev) =>
                prev.pedidoCrotalesActivo
                  ? {
                      ...prev,
                      pedidoCrotalesActivo: {
                        ...prev.pedidoCrotalesActivo,
                        fechaAvisoCalendario: sumarDiasIso(
                          prev.pedidoCrotalesActivo.fechaAvisoCalendario,
                          7,
                        ),
                      },
                    }
                  : prev,
              );
              mostrarToast('Aviso de recepción de crotales aplazado 1 semana.');
            }}
            onAnularPedidoCrotales={() => {
              setEstado((prev) => ({
                ...prev,
                pedidoCrotalesActivo: undefined,
              }));
              mostrarToast('Pedido de crotales anulado y aviso eliminado de la Agenda.');
            }}
            onRegistrarPerdidaCrotal={(animalId, nuevoEstado) => {
              cambiarEstadoCrotal(animalId, nuevoEstado);
              mostrarToast('Pérdida de crotal registrada en pendientes de solicitud.');
            }}
            onCrearPedidoDuplicados={(datos) => {
              const hoy = hoyIso();
              setEstado((prev) => ({
                ...prev,
                pedidosDuplicados: [
                  {
                    id: `pdup-${Date.now()}`,
                    fechaPedido: hoy,
                    proveedor: datos.proveedor,
                    formaEnvio: datos.formaEnvio,
                    recibido: false,
                    items: datos.items.map((it) => ({ ...it, colocado: false })),
                  },
                  ...(prev.pedidosDuplicados || []),
                ],
              }));
              mostrarToast(`Pedido de ${datos.items.length} duplicado(s) registrado.`);
            }}
            onConfirmarRecepcionPedidoDuplicados={(pedidoId) => {
              const hoy = hoyIso();
              setEstado((prev) => ({
                ...prev,
                pedidosDuplicados: (prev.pedidosDuplicados || []).map((p) =>
                  p.id === pedidoId ? { ...p, recibido: true, fechaRecepcion: hoy } : p,
                ),
              }));
              mostrarToast('Recepción de duplicados confirmada. Ahora puedes marcarlos al colocarlos.');
            }}
            onMarcarDuplicadoColocado={(pedidoId, animalId) => {
              setEstado((prev) => ({
                ...prev,
                pedidosDuplicados: (prev.pedidosDuplicados || []).map((p) =>
                  p.id === pedidoId
                    ? {
                        ...p,
                        items: p.items.map((it) =>
                          it.animalId === animalId ? { ...it, colocado: true } : it,
                        ),
                      }
                    : p,
                ),
                animales: prev.animales.map((a) =>
                  a.id === animalId ? { ...a, estadoCrotal: 'OK' } : a,
                ),
              }));
              mostrarToast('Duplicado marcado como colocado y crotal restaurado a OK.');
            }}
          />
        )}

        {pestana === 'reproduccion' && (
          <VistaReproduccion
            estado={estado}
            onAnadirInseminacion={anadirInseminacion}
            onConfirmarGestacion={(insId) => {
              const actual = (estado.inseminaciones || []).find((i) => i.id === insId);
              const nuevoValor = !(actual?.confirmadaGestacion);
              setEstado((prev) => ({
                ...prev,
                inseminaciones: (prev.inseminaciones || []).map((i) =>
                  i.id === insId ? { ...i, confirmadaGestacion: nuevoValor } : i,
                ),
              }));
              mostrarToast(
                nuevoValor
                  ? 'Gestación marcada como confirmada.'
                  : 'Confirmación de preñez retirada (pendiente de ecografía).',
              );
            }}
            onEditarInseminacion={(insId, datos) => {
              setEstado((prev) => ({
                ...prev,
                inseminaciones: (prev.inseminaciones || []).map((i) =>
                  i.id === insId
                    ? {
                        ...i,
                        fechaInseminacion: datos.fechaInseminacion,
                        toro: datos.toro || undefined,
                      }
                    : i,
                ),
              }));
              mostrarToast('Cubrición actualizada.');
            }}
            onEliminarInseminacion={(insId) => {
              setEstado((prev) => ({
                ...prev,
                inseminaciones: (prev.inseminaciones || []).filter((i) => i.id !== insId),
              }));
              mostrarToast('Registro de cubrición eliminado.');
            }}
            onDeshacerSecada={(insId) => {
              setEstado((prev) => ({
                ...prev,
                inseminaciones: (prev.inseminaciones || []).map((i) =>
                  i.id === insId ? { ...i, fechaSecadoReal: undefined } : i,
                ),
              }));
              mostrarToast('Marca de secado retirada.');
            }}
            onReabrirInseminacion={(insId) => {
              setEstado((prev) => ({
                ...prev,
                inseminaciones: (prev.inseminaciones || []).map((i) =>
                  i.id === insId ? { ...i, estado: 'ACTIVA' } : i,
                ),
              }));
              mostrarToast('Cubrición devuelta a "En curso".');
            }}
            onMarcarFallida={(insId) => {
              setEstado((prev) => ({
                ...prev,
                inseminaciones: (prev.inseminaciones || []).map((i) =>
                  i.id === insId ? { ...i, estado: 'FALLIDA' } : i,
                ),
              }));
              mostrarToast('Cubrición marcada como vacía / fallida.');
            }}
            onMarcarSecada={(insId) => {
              const hoy = hoyIso();
              const ins = (estado.inseminaciones || []).find((i) => i.id === insId);
              setEstado((prev) => {
                const corralSecas = obtenerCorralesActivos(prev).find((c) =>
                  c.nombre.toLowerCase().includes('seca'),
                );
                return {
                  ...prev,
                  inseminaciones: (prev.inseminaciones || []).map((i) =>
                    i.id === insId ? { ...i, fechaSecadoReal: hoy } : i,
                  ),
                  animales:
                    ins && corralSecas
                      ? prev.animales.map((a) =>
                          a.id === ins.animalId ? { ...a, corralId: corralSecas.id } : a,
                        )
                      : prev.animales,
                };
              });
              mostrarToast('Vaca marcada como secada.');
            }}
            onMarcarParida={(insId) => {
              const ins = (estado.inseminaciones || []).find((i) => i.id === insId);
              setEstado((prev) => ({
                ...prev,
                inseminaciones: (prev.inseminaciones || []).map((i) =>
                  i.id === insId ? { ...i, estado: 'PARIDA' } : i,
                ),
              }));
              setDatosPreNacimiento(
                ins ? { crotalMadre: ins.crotal, padreNombre: ins.toro } : undefined,
              );
              setModalNacimiento(true);
            }}
            onAbrirFichaAnimal={(a) => setDrawerAnimalGlobalId(a.id)}
          />
        )}

        {pestana === 'salidas' && (
          <VistaSalidasDocs
            estado={estado}
            onRegistrarSalidaLote={registrarSalidaLote}
            onAnadirDocumento={(doc: DocumentoExplotacion) => {
              setEstado((prev) => ({ ...prev, documentos: [doc, ...prev.documentos] }));
              mostrarToast('Documento guardado en la Carpeta de Inspección.');
            }}
            onAbrirEscanerOcr={() => setModalOcr(true)}
            onAbrirLibrosOficiales={(libro = 'EXPLOTACION') => setModalLibros(libro)}
          />
        )}

        {pestana === 'analitica' && (
          <VistaAnaliticaVet
            estado={estado}
            onImportarControlesLecheros={importarControlesLecheros}
            onRegistrarSaneamiento={registrarSaneamiento}
            onAnadirMedicamentoBotiquin={anadirMedicamentoBotiquin}
            onEliminarMedicamentoBotiquin={eliminarMedicamentoBotiquin}
            onAnadirMovimientoEconomico={anadirMovimientoEconomico}
            onAbrirLibrosOficiales={(libro = 'TRATAMIENTOS') => setModalLibros(libro)}
            onAbrirFichaAnimal={(a) => setDrawerAnimalGlobalId(a.id)}
          />
        )}

        {pestana === 'gestion' && (
          <VistaGestionEconomiaDocs
            estado={estado}
            onAnadirMovimientoEconomico={anadirMovimientoEconomico}
            onAnadirDocumento={(doc: DocumentoExplotacion) => {
              setEstado((prev) => ({ ...prev, documentos: [doc, ...prev.documentos] }));
              mostrarToast('Documento guardado en la Carpeta de Inspección.');
            }}
            onAbrirEscanerOcr={() => setModalOcr(true)}
            onAbrirLibrosOficiales={(libro = 'EXPLOTACION') => setModalLibros(libro)}
          />
        )}
      </main>

      {/* Botón flotante persistente (FAB) para Dictar / OCR / Nacimiento / Baja */}
      <FabAccionesCuadra
        onDictarVoz={() => setModalVoz(true)}
        onEscanerOcr={() => setModalOcr(true)}
        onRegistrarNacimiento={() => setModalNacimiento(true)}
        onRegistrarBaja={() => setModalBajaAnimal('SIN_PRESELECCION')}
      />
        </div>
      )}

      {/* Menú inferior unificado en móvil (tanto en Modo Cuadra como en Modo Oficina) */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-[#e1e7dc] bg-white/95 backdrop-blur-xs lg:hidden">
        {navItems.map((item) => {
          const Icono = item.icono;
          const activo = pestana === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setPestana(item.id);
                if (
                  usarModoCuadra &&
                  item.id !== 'panel' &&
                  item.id !== 'censo' &&
                  item.id !== 'calendario'
                ) {
                  cambiarModoPreferido('OFICINA');
                }
              }}
              className={`relative flex min-w-[66px] flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold transition ${
                activo ? 'text-[#0f3d2e]' : 'text-[#6e8277]'
              }`}
            >
              <span
                className={`flex h-7 w-10 items-center justify-center rounded-xl transition ${
                  activo ? 'bg-emerald-100 text-[#0f3d2e]' : ''
                }`}
              >
                <Icono className="h-4 w-4" />
              </span>
              <span>{item.corto}</span>
              {item.badge !== undefined && (
                <span
                  className={`absolute right-2 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[9px] font-bold text-white ${
                    item.badgeColor === 'orange'
                      ? 'bg-orange-500'
                      : item.badgeColor === 'green'
                        ? 'bg-emerald-600'
                        : 'bg-red-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Modales y Drawer global (desde Calendario) */}
      {drawerAnimalGlobalId &&
        (() => {
          const animalSel = estado.animales.find((a) => a.id === drawerAnimalGlobalId);
          if (!animalSel) return null;
          return (
            <DrawerFichaAnimal
              animal={animalSel}
              estado={estado}
              onCerrar={() => setDrawerAnimalGlobalId(null)}
              onCambiarEstadoCrotal={cambiarEstadoCrotal}
              onCambiarCorral={cambiarCorralAnimal}
              onRegistrarIncidencia={registrarIncidencia}
              onRegistrarPesaje={registrarPesaje}
              onActualizarFoto={actualizarFotoAnimal}
              onActualizarFechaOficial={actualizarFechaOficialAnimal}
              onActualizarGenealogia={actualizarGenealogiaAnimal}
              onToggleDib={toggleDib}
              onAbrirTratamiento={(a) => setModalTratamiento(a)}
              onAbrirBajaAnimal={(a) => setModalBajaAnimal(a)}
              onSeleccionarOtroAnimal={(otro) => setDrawerAnimalGlobalId(otro.id)}
            />
          );
        })()}

      {modalOcr && (
        <ModalEscanerOcr
          estado={estado}
          onCerrar={() => setModalOcr(false)}
          onGuardarReceta={guardarRecetaOcr}
          onGuardarDib={guardarDibOcr}
        />
      )}

      {modalVoz && (
        <ModalDictadoVoz
          estado={estado}
          onCerrar={() => setModalVoz(false)}
          onConfirmarAccion={aplicarAccionVoz}
        />
      )}

      {modalNacimiento && (
        <ModalNacimiento
          estado={estado}
          madrePreseleccionada={datosPreNacimiento?.crotalMadre}
          padrePreseleccionado={datosPreNacimiento?.padreNombre}
          onCerrar={() => {
            setModalNacimiento(false);
            setDatosPreNacimiento(undefined);
          }}
          onGuardar={(datos) => {
            registrarNacimiento(datos);
            setDatosPreNacimiento(undefined);
          }}
        />
      )}

      {modalBajaAnimal && (
        <ModalBaja
          estado={estado}
          animalPreseleccionado={
            modalBajaAnimal === 'SIN_PRESELECCION' ? undefined : modalBajaAnimal
          }
          tipoBajaInicial={tipoBajaInicial}
          onCerrar={() => {
            setModalBajaAnimal(null);
            setTipoBajaInicial(undefined);
          }}
          onGuardar={registrarBaja}
        />
      )}

      {modalCompra && (
        <ModalCompra
          estado={estado}
          onCerrar={() => setModalCompra(false)}
          onGuardar={registrarCompra}
        />
      )}

      {modalLibros && (
        <ModalLibrosOficiales
          estado={estado}
          libroInicial={modalLibros}
          onCerrar={() => setModalLibros(null)}
        />
      )}

      {modalTratamiento && (
        <ModalTratamiento
          animal={modalTratamiento}
          estado={estado}
          onCerrar={() => setModalTratamiento(null)}
          onGuardar={guardarTratamiento}
        />
      )}

      {modalConfig && (
        <ModalConfiguracion
          estadoCompleto={estado}
          explotacion={estado.explotacion}
          listaExplotaciones={almacen.explotaciones.map((e) => ({
            id: e.id,
            nombre: e.estado.explotacion.nombre,
            codigoRega: e.estado.explotacion.codigoRega,
          }))}
          explotacionActivaId={almacen.explotacionActivaId}
          onCambiarExplotacion={(id) => {
            setAlmacen((prev) => ({ ...prev, explotacionActivaId: id }));
            setModalConfig(false);
            mostrarToast('Explotación activa cambiada.');
          }}
          onCrearExplotacion={crearNuevaExplotacion}
          onAnadirRazaPersonalizada={(raza) => {
            setEstado((prev) => ({
              ...prev,
              razasPersonalizadas: Array.from(
                new Set([...(prev.razasPersonalizadas || []), raza]),
              ),
            }));
            mostrarToast(`Raza "${raza}" añadida.`);
          }}
          onCerrar={() => setModalConfig(false)}
          onGuardar={(nueva: DatosExplotacion) => {
            setEstado((prev) => ({ ...prev, explotacion: nueva }));
            setModalConfig(false);
            mostrarToast('Configuración de explotación actualizada.');
          }}
          onRestaurarDemo={() => {
            setEstado(restaurarDemo());
            setModalConfig(false);
            mostrarToast('Datos de demostración de Asturias restaurados.');
          }}
          onImportarBackup={(nuevoEstado) => {
            setEstado(nuevoEstado);
            setModalConfig(false);
            mostrarToast('Copia de seguridad restaurada correctamente.');
          }}
        />
      )}

      {/* Notificación flotante con icono de estado */}
      {toast && (
        <div className="no-print animate-fade-up fixed bottom-20 left-4 right-4 z-50 flex items-center gap-2.5 rounded-2xl border border-emerald-700/30 bg-[#0f3d2e] px-4 py-3 text-xs font-bold text-white shadow-2xl sm:left-auto sm:right-6 sm:max-w-md lg:bottom-24">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
          <span className="flex-1">{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Cerrar notificación"
            className="rounded-lg p-0.5 text-emerald-200 hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

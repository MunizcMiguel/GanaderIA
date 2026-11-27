export type EspecieCodigo = 'BOVINO' | 'OVINO' | 'CAPRINO' | 'EQUINO' | 'PORCINO';

export type OrientacionProductiva = 'LECHE' | 'CARNE' | 'MIXTA';

export type ComunidadCodigo = 'ASTURIAS' | 'GALICIA' | 'CANTABRIA' | 'CASTILLA_Y_LEON';

export type ModoRegistroEspecie = 'INDIVIDUAL' | 'LOTE';

export interface ReglasNormativas {
  comunidad: ComunidadCodigo;
  comunidadNombre: string;
  portalNombre: string;
  portalUrl: string;
  proveedorDuplicados: string;
  especie: EspecieCodigo;
  modoRegistro: ModoRegistroEspecie;
  plazoNotificacionNacimientoDias: number;
  plazoIdentificacionFisicaDias: number;
  plazoNotificacionBajaDias: number;
  requiereDIB: boolean;
  prefijoCrotal: string;
}

export type SexoAnimal = 'H' | 'M';

export type EstadoAnimal =
  | 'ACTIVO'
  | 'BAJA_MUERTE'
  | 'BAJA_MATADERO'
  | 'BAJA_VENTA'
  | 'BAJA_TRASLADO';

export type EstadoCrotalFisico = 'OK' | 'FALTA_IZQUIERDO' | 'FALTA_DERECHO' | 'FALTAN_AMBOS' | 'PENDIENTE_COLOCAR';

export type EstadoTramiteOficial = 'PENDIENTE' | 'TRAMITADO' | 'NO_APLICA';

export interface PeriodoSupresion {
  medicamento: string;
  recetaPresvet?: string;
  fechaInicio: string; // YYYY-MM-DD
  finSupresionLeche?: string; // YYYY-MM-DD
  finSupresionCarne?: string; // YYYY-MM-DD
}

export type DificultadParto = 1 | 2 | 3 | 4 | 5;

export type TipoPesaje = 'NACIMIENTO' | 'DESTETE' | 'CONTROL' | 'CEBADERO' | 'VENTA';

export interface PesajeAnimal {
  id: string;
  animalId: string;
  crotal: string;
  fecha: string; // YYYY-MM-DD
  pesoKg: number;
  tipo: TipoPesaje;
  notas?: string;
}

export interface MedicamentoBotiquin {
  id: string;
  nombre: string;
  principioActivo?: string;
  dosisHabitual?: string;
  diasSupresionCarne: number;
  diasSupresionLeche: number;
  proveedor?: string;
  notas?: string;
}

export interface RegistroTratamiento {
  id: string;
  animalIds: string[];
  crotales: string[];
  fechaPrescripcion: string; // YYYY-MM-DD
  fechaAdministracion: string; // YYYY-MM-DD
  recetaPresvet?: string;
  veterinario?: string;
  aplicadoPor: 'GANADERO' | 'VETERINARIO';
  medicamento: string;
  dosis?: string;
  proveedor?: string;
  afeccion?: string;
  duracionDias?: number;
  diasSupresionCarne: number;
  diasSupresionLeche: number;
  finSupresionCarne?: string;
  finSupresionLeche?: string;
  costeEur?: number;
  notas?: string;
}

export type TipoCampanaSaneamiento =
  | 'TUBERCULOSIS'
  | 'BRUCELOSIS'
  | 'IBR'
  | 'BVD'
  | 'LENGUA_AZUL'
  | 'PARATUBERCULOSIS'
  | 'OTRA';

export type ResultadoSaneamiento = 'NEGATIVO' | 'DUDOSO' | 'POSITIVO';

export interface CampanaSaneamiento {
  id: string;
  tipo: TipoCampanaSaneamiento;
  nombre: string;
  fecha: string; // YYYY-MM-DD
  fechaProxima?: string; // YYYY-MM-DD
  veterinario?: string;
  numeroColegiadoVet?: string;
  vacunaNombre?: string;
  serotipo?: string;
  marcaComercial?: string;
  loteVacuna?: string;
  resultados: Array<{
    animalId: string;
    crotal: string;
    resultado: ResultadoSaneamiento;
  }>;
  notas?: string;
}

export type TipoMovimientoEconomico = 'INGRESO' | 'GASTO';

export type CategoriaEconomica =
  | 'VENTA_ANIMAL'
  | 'VENTA_LECHE'
  | 'COMPRA_ANIMAL'
  | 'VETERINARIO'
  | 'MEDICAMENTOS'
  | 'ALIMENTACION'
  | 'AYUDA_PAC'
  | 'OTRO';

export interface MovimientoEconomico {
  id: string;
  fecha: string; // YYYY-MM-DD
  tipo: TipoMovimientoEconomico;
  categoria: CategoriaEconomica;
  concepto: string;
  importeEur: number;
  animalId?: string;
  crotal?: string;
  pesoKg?: number;
  contraparte?: string;
  notas?: string;
}

export interface UnidadGanadera {
  id: string;
  especie: EspecieCodigo;
  esLote: boolean;
  cantidadEnLote: number;
  crotal: string; // Ej: ES030045120001 (o código temporal si pendiente)
  numeroCorto: string; // Últimos 4 dígitos o número de collar (ej. 4521)
  transpondedorRobot?: string; // ID interno en Lely/DeLaval/GEA
  nombre?: string;
  raza: string;
  sexo: SexoAnimal;
  fechaNacimiento: string; // YYYY-MM-DD (real en cuadra)
  fechaNacimientoOficial?: string; // YYYY-MM-DD (si difiere en DIB/registro oficial)
  crotalMadre?: string;
  crotalPadre?: string;
  padreNombre?: string;
  estado: EstadoAnimal;
  fechaBaja?: string;
  motivoBaja?: string;
  estadoCrotal: EstadoCrotalFisico;
  dibImpreso: boolean;
  enCensoOficial: boolean;
  enRobotOrdene: boolean;
  corralId?: string;
  fechaUltimoParto?: string; // YYYY-MM-DD (para calcular DEL / Días en Leche)
  numeroLactacion?: number;
  dificultadPartoNacimiento?: DificultadParto;
  fechaDestete?: string;
  regaOrigen?: string;
  precioCompraEur?: number;
  precioVentaEur?: number;
  pesoCanalKg?: number;
  fotoDataUrl?: string;
  supresionActiva?: PeriodoSupresion;
  notas?: string;
}

export interface CorralExplotacion {
  id: string;
  nombre: string;
  color: string;
  esPredefinido: boolean;
}

export type TipoIncidenciaClinica =
  | 'MAMITIS'
  | 'COJERA'
  | 'PARTO_DIFICIL'
  | 'CETOSIS'
  | 'METRITIS'
  | 'VACUNACION_LOTE'
  | 'OTRA';

export type CuarteronUbre = 'AI' | 'AD' | 'PI' | 'PD';

export interface IncidenciaClinica {
  id: string;
  animalId: string;
  crotal: string;
  tipo: TipoIncidenciaClinica;
  cuarteron?: CuarteronUbre;
  fecha: string; // YYYY-MM-DD
  notas?: string;
}

export interface ControlLecheroRegistro {
  id: string;
  animalId?: string;
  crotal: string;
  fechaControl: string; // YYYY-MM-DD
  litrosDia: number;
  grasaPct: number;
  proteinaPct: number;
  rcsMiles: number; // Recuento células somáticas en miles/ml (ej. 180 = 180.000 cél/ml)
}

export type TipoEvento =
  | 'NACIMIENTO'
  | 'COMPRA'
  | 'BAJA_MUERTE'
  | 'DESAPARICION'
  | 'SALIDA_MATADERO'
  | 'SALIDA_MERCADO'
  | 'SALIDA_PASTOS'
  | 'VENTA'
  | 'DUPLICADO_CROTAL'
  | 'TRATAMIENTO';

export type ModalidadMuerteRemoWeb =
  | 'DAMER'
  | 'INACCESIBLE'
  | 'SACRIFICIO_URGENCIA'
  | 'NECROFAGAS';

export type MedioTransporteRemoWeb =
  | 'CAMION'
  | 'BARCO'
  | 'TREN'
  | 'AVION'
  | 'CONDUCCION_A_PIE'
  | 'OTROS';

export type ProveedorCrotalRemoWeb = 'AZASA' | 'DATAMARS';

export type FormaEnvioDuplicado = 'CORREO_ORDINARIO' | 'CORREO_CERTIFICADO';

export type EstadoFocoSanitario = 'NINGUNO' | 'T3_RESTRICCION_RC' | 'TOTAL';

export type OrigenEvento = 'MANUAL' | 'ROBOT_LELY' | 'ROBOT_DELAVAL' | 'ROBOT_CSV' | 'AGROFICINA_CSV';

export interface EventoTramite {
  id: string;
  tipo: TipoEvento;
  especie: EspecieCodigo;
  animalId?: string;
  crotal: string;
  crotalMadre?: string;
  crotalPadre?: string;
  sexo?: SexoAnimal;
  raza?: string;
  fechaEvento: string; // YYYY-MM-DD
  destino?: string; // Ej: Matadero Central de Asturias, Mercado Pola de Siero
  codigoRegaDestino?: string;
  codigoRegaOrigen?: string;
  documentoSanitario?: string;
  motivo?: string;
  dificultadParto?: DificultadParto;
  pesoNacimientoKg?: number;
  importeEur?: number;
  pesoKg?: number;
  origen: OrigenEvento;
  estadoTramite: EstadoTramiteOficial;
  fechaTramitado?: string;
  numeroJustificante?: string;
  crotalColocado?: boolean;
  // Campos específicos RemoWeb Asturias (bajas, desapariciones, guías y duplicados)
  modalidadMuerte?: ModalidadMuerteRemoWeb;
  numeroDamer?: string;
  fechaValidezDamer?: string;
  ceaMatadero?: string;
  concejo?: string;
  lugarMuerte?: string;
  tipoJustificacion?: string;
  declaracionEnterramiento?: boolean;
  presentaDenuncia?: boolean;
  numeroDenuncia?: string;
  medioTransporte?: MedioTransporteRemoWeb;
  codigoSirentra?: string;
  matriculaVehiculo?: string;
  horaSalida?: string;
  horaLlegada?: string;
  proveedorCrotal?: ProveedorCrotalRemoWeb;
  formaEnvio?: FormaEnvioDuplicado;
  telefonoContacto?: string;
  notas?: string;
}

export interface LoteCrotales {
  id: string;
  especie: EspecieCodigo;
  prefijo: string; // Ej: ES03004512
  desde: number; // Ej: 1
  hasta: number; // Ej: 50
  digitosSecuencia: number; // Ej: 4 -> 0001..0050
  usados: string[]; // Lista de códigos completos usados
  fechaRecepcion: string;
  origen: string; // Ej: OCA Cangas del Narcea / AZASA
}

export interface DocumentoExplotacion {
  id: string;
  categoria: 'SANEAMIENTO' | 'PSI' | 'DIB' | 'RECETA_PRESVET' | 'GUIA_MOVIMIENTO' | 'OTRO';
  titulo: string;
  fechaEmision: string;
  fechaCaducidad?: string;
  animalCrotal?: string;
  estado: 'VIGENTE' | 'PROXIMO_CADUCAR' | 'CADUCADO' | 'ARCHIVADO';
  referencia?: string;
  notas?: string;
}

export interface DatosExplotacion {
  nombre: string;
  titular: string;
  codigoRega: string;
  municipio: string;
  comunidad: ComunidadCodigo;
  especiePrincipal: EspecieCodigo;
  especiesActivas: EspecieCodigo[];
  orientacionProductiva?: OrientacionProductiva;
  marcaRobot: 'Lely Horizon/T4C' | 'DeLaval DelPro' | 'GEA DairyPlan' | 'Sin robot / Manual';
  umbralAlertaCrotales: number;
  // Campos SITRAN / RemoWeb Asturias
  telefonoContacto?: string;
  codigoSirentraHabitual?: string;
  codigoLetraQ?: string;
  proveedorCrotalHabitual?: ProveedorCrotalRemoWeb;
  calificacionSanitariaIbr?: string;
  focoSanitarioActivo?: EstadoFocoSanitario;
}

export type NivelAlerta = 'CRITICA' | 'ATENCION' | 'OK';

export interface AlertaPlazo {
  id: string;
  nivel: NivelAlerta;
  categoria: 'NOTIFICACION_NACIMIENTO' | 'COLOCACION_CROTAL' | 'NOTIFICACION_BAJA' | 'SUPRESION' | 'STOCK_CROTALES' | 'SANEAMIENTO';
  titulo: string;
  detalle: string;
  crotal?: string;
  eventoId?: string;
  animalId?: string;
  fechaLimite?: string;
  diasRestantes?: number;
}

export interface RegistroRobotImportado {
  fuente: 'ROBOT_LELY' | 'ROBOT_DELAVAL' | 'ROBOT_CSV';
  tipo: 'NACIMIENTO' | 'BAJA_MUERTE' | 'CENSO_ACTIVO';
  crotal?: string;
  numeroCorto?: string;
  crotalMadre?: string;
  sexo?: SexoAnimal;
  raza?: string;
  fecha?: string;
  motivo?: string;
  filaOriginal: number;
}

export interface DiscrepanciaCuadre {
  id: string;
  tipo:
    | 'NACIMIENTO_ROBOT_NO_COMUNICADO'
    | 'BAJA_ROBOT_ACTIVA_PRINCIPADO'
    | 'ACTIVA_PRINCIPADO_AUSENTE_ROBOT'
    | 'TERNERO_SIN_CROTAL';
  severidad: NivelAlerta;
  titulo: string;
  descripcion: string;
  crotalSugerido?: string;
  crotal?: string;
  crotalMadre?: string;
  sexo?: SexoAnimal;
  raza?: string;
  fechaEvento?: string;
  diasRestantesPlazo?: number;
  origen?: OrigenEvento;
  resuelta?: boolean;
}

export interface RegistroInseminacion {
  id: string;
  animalId: string;
  crotal: string;
  especie: EspecieCodigo;
  fechaInseminacion: string; // YYYY-MM-DD
  toro?: string;
  confirmadaGestacion: boolean;
  estado: 'ACTIVA' | 'PARIDA' | 'FALLIDA';
  notas?: string;
}

export interface EstadoGanaderia {
  explotacion: DatosExplotacion;
  animales: UnidadGanadera[];
  eventos: EventoTramite[];
  lotesCrotales: LoteCrotales[];
  documentos: DocumentoExplotacion[];
  inseminaciones?: RegistroInseminacion[];
  corrales?: CorralExplotacion[];
  incidencias?: IncidenciaClinica[];
  controlesLecheros?: ControlLecheroRegistro[];
  botiquin?: MedicamentoBotiquin[];
  veterinarios?: string[];
  proveedores?: string[];
  tratamientos?: RegistroTratamiento[];
  saneamientos?: CampanaSaneamiento[];
  pesajes?: PesajeAnimal[];
  movimientosEconomicos?: MovimientoEconomico[];
  razasPersonalizadas?: string[];
  ultimaImportacionRobot?: {
    fechaIso: string;
    archivo: string;
    fuente: string;
    registrosLeidos: number;
  };
}

export interface AlmacenMultiExplotacion {
  explotacionActivaId: string;
  explotaciones: Array<{
    id: string;
    estado: EstadoGanaderia;
  }>;
}

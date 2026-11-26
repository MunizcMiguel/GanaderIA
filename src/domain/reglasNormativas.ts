import type { ComunidadCodigo, EspecieCodigo, ReglasNormativas } from './types';

export const PORTALES_CCAA: Record<
  ComunidadCodigo,
  { nombre: string; portalNombre: string; portalUrl: string; proveedorDuplicados: string }
> = {
  ASTURIAS: {
    nombre: 'Principado de Asturias',
    portalNombre: 'Agroficina Virtual / RemoWeb',
    portalUrl: 'https://www.asturias.es/agroficina-virtual',
    proveedorDuplicados: 'AZASA / Oficina Comarcal Agraria (OCA)',
  },
  GALICIA: {
    nombre: 'Galicia',
    portalNombre: 'Oficina Agraria Virtual (OGV)',
    portalUrl: 'https://oficinaagraria.xunta.gal',
    proveedorDuplicados: 'Oficina Agraria Comarcal (Xunta)',
  },
  CANTABRIA: {
    nombre: 'Cantabria',
    portalNombre: 'Oficina Virtual Ganadera Cantabria',
    portalUrl: 'https://www.cantabria.es',
    proveedorDuplicados: 'Consejería de Desarrollo Rural',
  },
  CASTILLA_Y_LEON: {
    nombre: 'Castilla y León',
    portalNombre: 'Módulo Ganadero / SITRAN CyL',
    portalUrl: 'https://www.jcyl.es',
    proveedorDuplicados: 'Unidad Veterinaria Local',
  },
};

export const ESPECIES_META: Record<
  EspecieCodigo,
  {
    nombre: string;
    modoRegistro: 'INDIVIDUAL' | 'LOTE';
    plazoNotificacionNacimientoDias: number;
    plazoIdentificacionFisicaDias: number;
    plazoNotificacionBajaDias: number;
    requiereDIB: boolean;
    razasComunes: string[];
  }
> = {
  BOVINO: {
    nombre: 'Vacuno (Bovino)',
    modoRegistro: 'INDIVIDUAL',
    plazoNotificacionNacimientoDias: 7,
    plazoIdentificacionFisicaDias: 20,
    plazoNotificacionBajaDias: 7,
    requiereDIB: true,
    razasComunes: [
      'Frisona (Holstein)',
      'Asturiana de los Valles',
      'Asturiana de la Montaña (Casina)',
      'Parda Alpina',
      'Fleckvieh',
      'Cruce cárnico (Azul Belga / Limusín)',
    ],
  },
  OVINO: {
    nombre: 'Ovino',
    modoRegistro: 'LOTE',
    plazoNotificacionNacimientoDias: 7,
    plazoIdentificacionFisicaDias: 180,
    plazoNotificacionBajaDias: 7,
    requiereDIB: false,
    razasComunes: ['Xalda', 'Latxa', 'Assaf', 'Cruce'],
  },
  CAPRINO: {
    nombre: 'Caprino',
    modoRegistro: 'LOTE',
    plazoNotificacionNacimientoDias: 7,
    plazoIdentificacionFisicaDias: 180,
    plazoNotificacionBajaDias: 7,
    requiereDIB: false,
    razasComunes: ['Bermeya', 'Murciano-Granadina', 'Alpina'],
  },
  EQUINO: {
    nombre: 'Equino',
    modoRegistro: 'INDIVIDUAL',
    plazoNotificacionNacimientoDias: 30,
    plazoIdentificacionFisicaDias: 180,
    plazoNotificacionBajaDias: 7,
    requiereDIB: false,
    razasComunes: ['Asturcón', 'Hispano-Bretón', 'Cruce'],
  },
  PORCINO: {
    nombre: 'Porcino',
    modoRegistro: 'LOTE',
    plazoNotificacionNacimientoDias: 7,
    plazoIdentificacionFisicaDias: 30,
    plazoNotificacionBajaDias: 7,
    requiereDIB: false,
    razasComunes: ['Gochu Asturcelta', 'Duroc', 'Cruce'],
  },
};

export function obtenerReglasNormativas(
  comunidad: ComunidadCodigo,
  especie: EspecieCodigo,
): ReglasNormativas {
  const portal = PORTALES_CCAA[comunidad];
  const esp = ESPECIES_META[especie];
  return {
    comunidad,
    comunidadNombre: portal.nombre,
    portalNombre: portal.portalNombre,
    portalUrl: portal.portalUrl,
    proveedorDuplicados: portal.proveedorDuplicados,
    especie,
    modoRegistro: esp.modoRegistro,
    plazoNotificacionNacimientoDias: esp.plazoNotificacionNacimientoDias,
    plazoIdentificacionFisicaDias: esp.plazoIdentificacionFisicaDias,
    plazoNotificacionBajaDias: esp.plazoNotificacionBajaDias,
    requiereDIB: esp.requiereDIB,
    prefijoCrotal: 'ES',
  };
}

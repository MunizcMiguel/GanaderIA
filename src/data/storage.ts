import type { AlmacenMultiExplotacion, EstadoGanaderia } from '../domain/types';
import { crearDatosDemoAsturias } from './demoAsturias';

const STORAGE_KEY = 'ganaderia_asturias_state_v1';
const MULTI_STORAGE_KEY = 'ganaderia_multi_explotaciones_v2';

export function cargarAlmacenExplotaciones(): AlmacenMultiExplotacion {
  try {
    const rawMulti = window.localStorage.getItem(MULTI_STORAGE_KEY);
    if (rawMulti) {
      const parsed = JSON.parse(rawMulti) as AlmacenMultiExplotacion;
      if (parsed && Array.isArray(parsed.explotaciones) && parsed.explotaciones.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback a v1
  }

  // Migración automática transparente desde v1 (una sola explotación)
  const estadoV1 = cargarEstadoInicial();
  const almacen: AlmacenMultiExplotacion = {
    explotacionActivaId: 'exp-principal',
    explotaciones: [{ id: 'exp-principal', estado: estadoV1 }],
  };
  guardarAlmacenExplotaciones(almacen);
  return almacen;
}

export function guardarAlmacenExplotaciones(almacen: AlmacenMultiExplotacion): void {
  try {
    window.localStorage.setItem(MULTI_STORAGE_KEY, JSON.stringify(almacen));
    const activa =
      almacen.explotaciones.find((e) => e.id === almacen.explotacionActivaId) ||
      almacen.explotaciones[0];
    if (activa) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(activa.estado));
    }
  } catch {
    // Si el almacenamiento está lleno o bloqueado, no romper la UI
  }
}

export function cargarEstadoInicial(): EstadoGanaderia {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return crearDatosDemoAsturias();
    const parsed = JSON.parse(raw) as EstadoGanaderia;
    if (!parsed || !parsed.explotacion || !Array.isArray(parsed.animales)) {
      return crearDatosDemoAsturias();
    }
    return parsed;
  } catch {
    return crearDatosDemoAsturias();
  }
}

export function guardarEstado(estado: EstadoGanaderia): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  } catch {
    // Si el almacenamiento está lleno o bloqueado, no romper la UI
  }
}

export function restaurarDemo(): EstadoGanaderia {
  const demo = crearDatosDemoAsturias();
  const almacen: AlmacenMultiExplotacion = {
    explotacionActivaId: 'exp-principal',
    explotaciones: [{ id: 'exp-principal', estado: demo }],
  };
  guardarAlmacenExplotaciones(almacen);
  return demo;
}

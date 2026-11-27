import { describe, expect, it } from 'vitest';
import { crearDatosDemoAsturias } from '../../data/demoAsturias';
import { validarCrotalBovinoAsturias2026 } from '../crotales';
import { generarPaqueteRemoWebJson, generarXmlSitranBorrador } from '../exportadores';
import { hoyIso, sumarDiasIso } from '../fechas';
import {
  calcularCalendarioReproductivo,
  detectarVacasAbiertas,
} from '../reproduccion';
import {
  validarGuiaSalidaRemoWeb,
  validarModalidadMuerteRemoWeb,
  validarPrecondicionesNacimientoRemoWeb,
} from '../reglasRemoWeb';

describe('Normativa RemoWeb Asturias 2026 y SITRAN', () => {
  it('exige codificación ES2203 + 8 dígitos para nacimientos bovinos desde 2026', () => {
    const ok2026 = validarCrotalBovinoAsturias2026('ES220300001234', '2026-06-15');
    expect(ok2026.valido).toBe(true);
    expect(ok2026.esSerieNueva2026).toBe(true);

    const antiguo2026 = validarCrotalBovinoAsturias2026('ES030045120001', '2026-06-15');
    expect(antiguo2026.valido).toBe(false);
    expect(antiguo2026.motivo).toContain('ES2203');
  });

  it('valida precondiciones de nacimiento RemoWeb (90 días, madre > 16 meses y foco T3)', () => {
    const demo = crearDatosDemoAsturias();
    const hoy = hoyIso();
    const madre = demo.animales.find((a) => a.estado === 'ACTIVO' && a.sexo === 'H')!;

    // Nacimiento de hace 100 días (> 90 días)
    const avisosAntiguo = validarPrecondicionesNacimientoRemoWeb(demo, {
      crotal: 'ES220399990001',
      crotalMadre: madre.crotal,
      raza: madre.raza,
      fechaNacimiento: sumarDiasIso(hoy, -100),
    });
    expect(avisosAntiguo.some((a) => a.codigo === 'NACIMIENTO_FUERA_90_DIAS')).toBe(true);

    // Foco T3 genera aviso de restricción RC
    demo.explotacion.focoSanitarioActivo = 'T3_RESTRICCION_RC';
    const avisosT3 = validarPrecondicionesNacimientoRemoWeb(demo, {
      crotal: 'ES220399990002',
      crotalMadre: madre.crotal,
      raza: madre.raza,
      fechaNacimiento: hoy,
    });
    expect(avisosT3.some((a) => a.codigo === 'FOCO_T3_RC')).toBe(true);
  });

  it('valida modalidades de baja por muerte (DAMER y Necrófagas < 4 meses)', () => {
    const demo = crearDatosDemoAsturias();
    const vacaAdulta = demo.animales.find(
      (a) => a.estado === 'ACTIVO' && a.fechaNacimiento < '2024-01-01',
    )!;

    const sinDamer = validarModalidadMuerteRemoWeb(demo, vacaAdulta, {
      modalidadMuerte: 'DAMER',
      fechaBaja: hoyIso(),
      numeroDamer: '',
    });
    expect(sinDamer.some((a) => a.codigo === 'DAMER_OBLIGATORIO')).toBe(true);

    const necrofagasAdulta = validarModalidadMuerteRemoWeb(demo, vacaAdulta, {
      modalidadMuerte: 'NECROFAGAS',
      fechaBaja: hoyIso(),
      concejo: 'Carreño',
      lugarMuerte: 'Monte Areo',
      declaracionEnterramiento: true,
    });
    expect(necrofagasAdulta.some((a) => a.codigo === 'NECROFAGAS_MAYOR_4_MESES')).toBe(true);
  });

  it('valida guías de salida (+8d Asturias / +5d fuera y foco TOTAL)', () => {
    const demo = crearDatosDemoAsturias();
    const hoy = hoyIso();
    const vaca = demo.animales.find((a) => a.estado === 'ACTIVO')!;

    const fueraAsturias = validarGuiaSalidaRemoWeb(demo, [vaca], {
      fechaSalida: sumarDiasIso(hoy, 7),
      codigoRegaDestino: 'ES390100001234', // Cantabria: máx 5 días
    });
    expect(fueraAsturias.some((a) => a.codigo === 'GUIA_ANTELACION_EXCEDIDA')).toBe(true);

    const dentroAsturias = validarGuiaSalidaRemoWeb(demo, [vaca], {
      fechaSalida: sumarDiasIso(hoy, 7),
      codigoRegaDestino: 'ES330440009999', // Asturias: máx 8 días
      esMatadero: true,
    });
    expect(dentroAsturias.some((a) => a.codigo === 'GUIA_ANTELACION_EXCEDIDA')).toBe(false);
  });

  it('genera paquete JSON v2 y borrador XML SITRAN válido', () => {
    const demo = crearDatosDemoAsturias();
    const json = JSON.parse(generarPaqueteRemoWebJson(demo));
    expect(json.schemaVersion).toBe('ganaderia-remoweb-v2');

    const xml = generarXmlSitranBorrador(demo);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<SITRAN_BORRADOR_COMUNICACION');
    expect(xml).toContain(`<CodigoREGA>${demo.explotacion.codigoRega}</CodigoREGA>`);
  });

  it('detecta ventana de retorno a celo (18-24d) y vacas abiertas (>60d sin cubrir)', () => {
    const demo = crearDatosDemoAsturias();
    const hoy = hoyIso();
    const vaca = demo.animales.find((a) => a.estado === 'ACTIVO' && a.sexo === 'H')!;

    const hitos = calcularCalendarioReproductivo(
      [
        {
          id: 'ins-celo-test',
          animalId: vaca.id,
          crotal: vaca.crotal,
          especie: 'BOVINO',
          fechaInseminacion: sumarDiasIso(hoy, -21),
          confirmadaGestacion: false,
          estado: 'ACTIVA',
        },
      ],
      demo.animales,
      hoy,
    );
    expect(hitos[0]?.enVentanaCelo21d).toBe(true);

    const abiertas = detectarVacasAbiertas(
      [
        {
          ...vaca,
          id: 'vaca-abierta-test',
          fechaUltimoParto: sumarDiasIso(hoy, -75),
        },
      ],
      [],
      hoy,
      60,
    );
    expect(abiertas.length).toBe(1);
    expect(abiertas[0]?.diasEnLeche).toBe(75);
  });
});

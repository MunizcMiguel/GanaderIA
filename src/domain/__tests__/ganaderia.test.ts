import { describe, expect, it } from 'vitest';
import {
  crearDatosDemoAsturias,
  generarCsvEjemploAscol,
  generarCsvEjemploDeLaval,
  generarCsvEjemploLely,
} from '../../data/demoAsturias';
import { calcularAlertasPlazos, validarAnimalesParaSalida } from '../alertas';
import {
  calcularMetricasRebano,
  generarTextoParteVeterinario,
  parsearCsvControlLechero,
} from '../analiticaGanadero';
import {
  agruparEventosPorDia,
  CATEGORIAS_CALENDARIO,
  construirEventosCalendario,
  filtrarEventosCalendario,
  generarCuadriculaMes,
} from '../calendario';
import {
  contarCrotalesDisponibles,
  marcarCrotalComoUsado,
  obtenerAnimalesConCrotalFaltante,
  sugerirSiguienteCrotal,
  validarCrotalOficial,
} from '../crotales';
import { generarArchivoAdisParaRobot } from '../exportadorRobotAdis';
import { generarPaqueteRemoWebJson } from '../exportadores';
import {
  calcularConsanguinidadPotencial,
  calcularGmdAnimal,
  calcularRankingMadres,
  calcularUGMRebano,
  construirArbolGenealogico,
  formatearEdadExacta,
  sugerirRazaCruce,
} from '../gestionAvanzada';
import { ejecutarCuadreRobotPrincipado, parsearCsvRobot } from '../importadorRobot';
import {
  exportarCensoExcelCsv,
  generarFilasLibroExplotacion,
  generarHtmlLibroExplotacion,
  generarHtmlLibroTratamientos,
  importarCensoDesdeCsv,
} from '../librosOficiales';
import { segmentarSiluetaBuffer } from '../recorteSilueta';
import {
  anadirCorralPersonalizado,
  detectarVacasProblema,
  eliminarCorralPersonalizado,
  obtenerCorralesActivos,
} from '../incidencias';
import {
  analizarTextoOcrDocumento,
  extraerCrotalesDeTextoOcr,
  generarTextoEjemploDib,
  generarTextoEjemploRecetaPresvet,
} from '../parserOcrDocumentos';
import { interpretarNotaCampo } from '../parserVozCampo';
import { calcularCalendarioReproductivo } from '../reproduccion';

describe('GanaderIA — Motor de Dominio SITRAN (Asturias)', () => {
  const FECHA_REF = '2026-11-24';

  it('valida crotales oficiales y sugiere el siguiente libre del stock', () => {
    const demo = crearDatosDemoAsturias(FECHA_REF);
    expect(validarCrotalOficial('ES030045120003')).toBe(true);
    expect(validarCrotalOficial('1234')).toBe(false);

    // El lote demo tiene 1..20 con 0001 y 0002 usados -> 18 libres, siguiente 0003
    expect(contarCrotalesDisponibles(demo.lotesCrotales, 'BOVINO')).toBe(18);
    expect(sugerirSiguienteCrotal(demo.lotesCrotales, 'BOVINO')).toBe('ES030045120003');

    const actualizados = marcarCrotalComoUsado(demo.lotesCrotales, 'ES030045120003');
    expect(contarCrotalesDisponibles(actualizados, 'BOVINO')).toBe(17);
    expect(sugerirSiguienteCrotal(actualizados, 'BOVINO')).toBe('ES030045120004');
  });

  it('detecta correctamente duplicados pendientes por crotal caído', () => {
    const demo = crearDatosDemoAsturias(FECHA_REF);
    const faltantes = obtenerAnimalesConCrotalFaltante(demo.animales);
    expect(faltantes.map((a) => a.numeroCorto)).toEqual(['4890', '5340']);
  });

  it('calcula el Semáforo de Plazos Legales (7 días notificación, 20 días crotal, supresión)', () => {
    const demo = crearDatosDemoAsturias(FECHA_REF);
    const alertas = calcularAlertasPlazos(demo, FECHA_REF);

    // Debe detectar nacimiento que vence en 1 día como CRITICA
    const criticaNac = alertas.find((a) => a.categoria === 'NOTIFICACION_NACIMIENTO' && a.nivel === 'CRITICA');
    expect(criticaNac).toBeDefined();
    expect(criticaNac?.diasRestantes).toBe(1);

    // Debe detectar alerta de supresión activa de la vaca #5115
    const supresion = alertas.find((a) => a.categoria === 'SUPRESION');
    expect(supresion).toBeDefined();
    expect(supresion?.crotal).toBe('ES030041205115');

    // Debe detectar documento de saneamiento próximo a caducar (25 días <= 30)
    const saneamiento = alertas.find((a) => a.categoria === 'SANEAMIENTO');
    expect(saneamiento).toBeDefined();
  });

  it('bloquea la salida a matadero de vacas en periodo de supresión de carne', () => {
    const demo = crearDatosDemoAsturias(FECHA_REF);
    const vacaConAntibiotico = demo.animales.find((a) => a.numeroCorto === '5115')!;
    const vacaSana = demo.animales.find((a) => a.numeroCorto === '3901')!;

    const res = validarAnimalesParaSalida(
      [vacaConAntibiotico, vacaSana],
      'SALIDA_MATADERO',
      FECHA_REF,
    );

    expect(res[0].apto).toBe(false);
    expect(res[0].bloqueos[0]).toContain('BLOQUEO SANITARIO');
    expect(res[1].apto).toBe(true);
  });

  it('parsea CSV de Lely Horizon y ejecuta Cuadre 360° detectando partos y bajas pendientes', () => {
    const demo = crearDatosDemoAsturias(FECHA_REF);
    const csvLely = generarCsvEjemploLely(FECHA_REF);
    const parsed = parsearCsvRobot(csvLely);

    expect(parsed.fuenteDetectada).toBe('ROBOT_LELY');
    expect(parsed.registros).toHaveLength(4);

    const discrepancias = ejecutarCuadreRobotPrincipado(demo, parsed.registros, FECHA_REF);
    // El parto de la 4521 ya estaba registrado -> no debe duplicarse
    // Deben detectarse 2 partos nuevos + 1 baja de #3901 = 3 discrepancias
    expect(discrepancias).toHaveLength(3);
    const partosNuevos = discrepancias.filter((d) => d.tipo === 'NACIMIENTO_ROBOT_NO_COMUNICADO');
    const bajasPendientes = discrepancias.filter((d) => d.tipo === 'BAJA_ROBOT_ACTIVA_PRINCIPADO');
    expect(partosNuevos).toHaveLength(2);
    expect(bajasPendientes).toHaveLength(1);
    // Crotales sugeridos distintos de la reserva libre (0003 y 0004)
    expect(partosNuevos[0].crotalSugerido).toBe('ES030045120003');
    expect(partosNuevos[1].crotalSugerido).toBe('ES030045120004');
  });

  it('parsea CSV de DeLaval DelPro y genera paquete JSON para RemoWeb', () => {
    const demo = crearDatosDemoAsturias(FECHA_REF);
    const csvDeLaval = generarCsvEjemploDeLaval(FECHA_REF);
    const parsed = parsearCsvRobot(csvDeLaval);

    expect(parsed.fuenteDetectada).toBe('ROBOT_DELAVAL');
    const discrepancias = ejecutarCuadreRobotPrincipado(demo, parsed.registros, FECHA_REF);
    expect(discrepancias).toHaveLength(2);

    const json = JSON.parse(generarPaqueteRemoWebJson(demo));
    expect(json.schemaVersion).toBe('ganaderia-remoweb-v2');
    expect(json.explotacion.rega).toBe('ES330110001234');
    expect(json.tramitesPendientes.length).toBeGreaterThanOrEqual(2);
  });

  it('interpreta comandos de voz/texto de cuadra (partos, crotal caído, inseminación)', () => {
    const demo = crearDatosDemoAsturias(FECHA_REF);

    const parto = interpretarNotaCampo('Hoy parió la 4521, ternera hembra frisona', demo, FECHA_REF);
    expect(parto.tipo).toBe('NACIMIENTO');
    if (parto.tipo === 'NACIMIENTO') {
      expect(parto.crotalMadre).toBe('ES030041204521');
      expect(parto.sexo).toBe('H');
      expect(parto.crotalTernero).toBe('ES030045120003');
      expect(parto.crotalColocado).toBe(true);
    }

    const crotal = interpretarNotaCampo('Se le cayó el crotal derecho a la 5772', demo, FECHA_REF);
    expect(crotal.tipo).toBe('CROTAL_CAIDO');
    if (crotal.tipo === 'CROTAL_CAIDO') {
      expect(crotal.animal?.numeroCorto).toBe('5772');
      expect(crotal.estadoCrotal).toBe('FALTA_DERECHO');
    }

    const insem = interpretarNotaCampo('Inseminada la 4521 con toro Capitán', demo, FECHA_REF);
    expect(insem.tipo).toBe('INSEMINACION');
    if (insem.tipo === 'INSEMINACION') {
      expect(insem.animal?.numeroCorto).toBe('4521');
      expect(insem.toro).toBe('Capitán');
    }
  });

  it('calcula automáticamente secados (-60d) y partos previstos (+283d) en reproducción', () => {
    const demo = crearDatosDemoAsturias(FECHA_REF);
    const hitos = calcularCalendarioReproductivo(demo.inseminaciones, demo.animales, FECHA_REF);
    expect(hitos).toHaveLength(3);
    // El más próximo debe ser #5340 (inseminada hace 276 días -> parto en 7 días)
    expect(hitos[0].numeroCorto).toBe('5340');
    expect(hitos[0].diasHastaParto).toBe(7);
    expect(hitos[0].proximoHito).toBe('PARTO');
    // La segunda (#5772, hace 219 días -> secado a 223 días = en 4 días)
    expect(hitos[1].numeroCorto).toBe('5772');
    expect(hitos[1].proximoHito).toBe('SECADO');
    expect(hitos[1].diasHastaSecado).toBe(4);
  });

  it('extrae datos de Recetas PRESVET con OCR (incl. conversión horas->días y filtro REGA)', () => {
    const demo = crearDatosDemoAsturias(FECHA_REF);
    // Tolerancia a errores típicos de OCR (espacios y letra O por 0)
    expect(extraerCrotalesDeTextoOcr('Animal: ES 03 OO41 20 4521')).toEqual(['ES030041204521']);

    const textoReceta = generarTextoEjemploRecetaPresvet(FECHA_REF);
    const res = analizarTextoOcrDocumento(textoReceta, demo, undefined, FECHA_REF);
    expect(res.tipo).toBe('RECETA_PRESVET');
    if (res.tipo === 'RECETA_PRESVET') {
      expect(res.crotal).toBe('ES030041204521');
      expect(res.animalEncontrado?.numeroCorto).toBe('4521');
      expect(res.recetaPresvet).toBe('PRESVET-2026-33-09514');
      expect(res.medicamento).toContain('Synulox LC');
      expect(res.diasLeche).toBe(4); // 96 horas -> 4 días
      expect(res.diasCarne).toBe(14);
    }
  });

  it('extrae datos de un DIB Bovino con OCR sin confundir el REGA con el crotal', () => {
    const demo = crearDatosDemoAsturias(FECHA_REF);
    const textoDib = generarTextoEjemploDib();
    const res = analizarTextoOcrDocumento(textoDib, demo, undefined, FECHA_REF);
    expect(res.tipo).toBe('DIB');
    if (res.tipo === 'DIB') {
      expect(res.crotal).toBe('ES030045120009');
      expect(res.crotalMadre).toBe('ES030041205772');
      expect(res.fechaNacimiento).toBe('2026-11-15');
      expect(res.sexo).toBe('H');
      expect(res.raza).toBe('Asturiana de los Valles');
    }
  });

  it('construye el calendario mensual con operaciones, hitos futuros, gajos por categoría y filtros', () => {
    const demo = crearDatosDemoAsturias(FECHA_REF);
    const todos = construirEventosCalendario(demo, FECHA_REF);

    // Debe incluir nacimientos realizados, plazos de 7d/20d, receta/supresión y reproducción
    expect(todos.some((e) => e.categoria === 'NACIMIENTO' && e.naturaleza === 'REALIZADO')).toBe(true);
    expect(todos.some((e) => e.categoria === 'REGISTRO_PRINCIPADO' && e.naturaleza === 'PREVISTO')).toBe(true);
    expect(todos.some((e) => e.categoria === 'RECETA_SUPRESION' && e.naturaleza === 'REALIZADO')).toBe(true);
    expect(todos.some((e) => e.categoria === 'RECETA_SUPRESION' && e.naturaleza === 'PREVISTO')).toBe(true);
    expect(todos.some((e) => e.categoria === 'REPRODUCCION' && e.naturaleza === 'PREVISTO')).toBe(true);

    // Filtrar por vaca #5115 (Nube)
    const todasCats = new Set(CATEGORIAS_CALENDARIO.map((c) => c.id));
    const solo5115 = filtrarEventosCalendario(todos, todasCats, '5115');
    expect(solo5115.length).toBeGreaterThanOrEqual(4);
    expect(solo5115.every((e) => e.numeroCorto === '5115' || (e.crotal || '').includes('5115'))).toBe(true);

    // Agrupación de gajos en el mismo día sin duplicar categorías
    const sintéticos = [
      { id: '1', fecha: '2026-11-25', categoria: 'NACIMIENTO' as const, naturaleza: 'REALIZADO' as const, titulo: 'N1', detalle: '' },
      { id: '2', fecha: '2026-11-25', categoria: 'NACIMIENTO' as const, naturaleza: 'REALIZADO' as const, titulo: 'N2', detalle: '' },
      { id: '3', fecha: '2026-11-25', categoria: 'RECETA_SUPRESION' as const, naturaleza: 'PREVISTO' as const, titulo: 'R1', detalle: '' },
    ];
    const porDia = agruparEventosPorDia(sintéticos);
    const dia25 = porDia.get('2026-11-25')!;
    expect(dia25.eventos).toHaveLength(3);
    expect(dia25.categoriasUnicas).toEqual(['NACIMIENTO', 'RECETA_SUPRESION']);
    expect(dia25.tieneRealizados).toBe(true);
    expect(dia25.tienePrevistos).toBe(true);

    // Cuadrícula mensual de noviembre 2026 (empieza en Lunes)
    const celdas = generarCuadriculaMes(2026, 10, FECHA_REF);
    expect(celdas.length % 7).toBe(0);
    expect(celdas.some((c) => c.fecha === FECHA_REF && c.esHoy)).toBe(true);
  });

  it('gestiona corrales personalizados, detecta vacas problema y entiende mamitis por voz', () => {
    const demo = crearDatosDemoAsturias(FECHA_REF);
    const iniciales = obtenerCorralesActivos(demo);
    expect(iniciales).toHaveLength(7);

    const conNuevo = anadirCorralPersonalizado(iniciales, 'Nave Norte');
    expect(conNuevo).toHaveLength(8);
    const customId = conNuevo[7].id;

    const conAsignacion = {
      ...demo,
      corrales: conNuevo,
      animales: demo.animales.map((a, i) => (i === 0 ? { ...a, corralId: customId } : a)),
    };
    const trasEliminar = eliminarCorralPersonalizado(conAsignacion, customId);
    expect(trasEliminar.corrales).toHaveLength(7);
    expect(trasEliminar.animales[0].corralId).toBeUndefined();

    // Detector de vacas problema debe señalar a #5115 (2 mamitis + RCS 480k) y #3901 (>150d abierta + RCS 310k)
    const problemas = detectarVacasProblema(demo, FECHA_REF);
    expect(problemas.map((p) => p.animal.numeroCorto)).toContain('5115');
    expect(problemas.map((p) => p.animal.numeroCorto)).toContain('3901');

    // Voz: mamitis con cuarterón trasero izquierdo -> PI
    const vozMamitis = interpretarNotaCampo('Mamitis en la 4521 trasero izquierdo', demo, FECHA_REF);
    expect(vozMamitis.tipo).toBe('INCIDENCIA');
    if (vozMamitis.tipo === 'INCIDENCIA') {
      expect(vozMamitis.tipoIncidencia).toBe('MAMITIS');
      expect(vozMamitis.cuarteron).toBe('PI');
      expect(vozMamitis.animal?.numeroCorto).toBe('4521');
    }
  });

  it('calcula métricas ganaderas, importa Control Lechero ASCOL, genera Parte Vet y exporta ADIS', () => {
    const demo = crearDatosDemoAsturias(FECHA_REF);
    const metricas = calcularMetricasRebano(demo, FECHA_REF);
    expect(metricas.delMedio).toBeGreaterThan(0);
    expect(metricas.iepEstimadoDias).toBeGreaterThan(300);
    expect(metricas.vacasVaciasMas100d.length).toBeGreaterThanOrEqual(2);

    const csvAscol = generarCsvEjemploAscol(FECHA_REF);
    const regs = parsearCsvControlLechero(csvAscol, demo.animales, FECHA_REF);
    expect(regs).toHaveLength(5);
    expect(regs.filter((r) => r.rcsMiles >= 200)).toHaveLength(2);

    const parte = generarTextoParteVeterinario(demo, FECHA_REF);
    expect(parte).toContain('PARTE PARA VISITA VETERINARIA');
    expect(parte).toContain('PR 21 días');

    const adis = generarArchivoAdisParaRobot(demo);
    expect(adis.startsWith('DH000001')).toBe(true);
    expect(adis).toContain('DN810001');
    expect(adis.endsWith('ZN')).toBe(true);
  });

  it('calcula UGM, GMD de pesos, árbol genealógico, consanguinidad y ranking de madres', () => {
    const demo = crearDatosDemoAsturias(FECHA_REF);
    const ugm = calcularUGMRebano(demo.animales, FECHA_REF);
    expect(ugm.totalUgm).toBeGreaterThan(5);
    expect(ugm.vacas).toBeGreaterThanOrEqual(5);
    expect(ugm.terneros).toBeGreaterThanOrEqual(2);

    expect(formatearEdadExacta('2021-03-14', FECHA_REF)).toContain('año');
    expect(sugerirRazaCruce('Frisona (Holstein)', 'Asturiana de los Valles')).toContain('Cruce');

    // GMD de la ternera ani-6 (42 kg -> 47.5 kg en 6 días)
    const gmd = calcularGmdAnimal('ani-6', demo.pesajes);
    expect(gmd.pesoActualKg).toBe(47.5);
    expect(gmd.gmdKgDia).toBeGreaterThan(0.8);

    // Consanguinidad alta si se cruza ani-6 (hija de Pinta y ASCOL Llanes) con ASCOL Llanes
    const ani6 = demo.animales.find((a) => a.id === 'ani-6')!;
    const pedigri = construirArbolGenealogico(ani6, demo.animales);
    expect(pedigri.madre?.crotal).toBe('ES030041204521');

    const consang = calcularConsanguinidadPotencial(ani6.crotal, 'ASCOL Llanes', demo.animales);
    expect(consang.coeficientePct).toBeGreaterThanOrEqual(12.5);
    expect(consang.nivelRiesgo).toBe('ALTO');

    const ranking = calcularRankingMadres(demo, FECHA_REF);
    expect(ranking.length).toBeGreaterThanOrEqual(5);
    expect(ranking[0].puntuacion).toBeGreaterThanOrEqual(ranking[ranking.length - 1].puntuacion);
  });

  it('genera Libros Oficiales PDF/HTML (Explotación A/B y Tratamientos) y exporta/importa Excel CSV', () => {
    const demo = crearDatosDemoAsturias(FECHA_REF);
    const filas = generarFilasLibroExplotacion(demo);
    expect(filas.length).toBeGreaterThanOrEqual(8);
    expect(filas.every((f) => f.movimiento === 'A' || f.movimiento === 'B')).toBe(true);

    const htmlExp = generarHtmlLibroExplotacion(demo, FECHA_REF);
    expect(htmlExp).toContain('LIBRO OFICIAL DE REGISTRO DE EXPLOTACIÓN GANADERA');
    expect(htmlExp).toContain(demo.explotacion.codigoRega);

    const htmlTrat = generarHtmlLibroTratamientos(demo, FECHA_REF);
    expect(htmlTrat).toContain('REGISTRO OFICIAL DE TRATAMIENTOS VETERINARIOS');
    expect(htmlTrat).toContain('PRESVET-2026-33-08421');

    const csv = exportarCensoExcelCsv(demo);
    expect(csv).toContain('ES030041204521');

    const csvNuevo = [
      'Crotal;Nombre;Sexo;Raza;Fecha_Nacimiento',
      'ES030099112233;Lucía;H;Salers;2023-05-10',
    ].join('\n');
    const imp = importarCensoDesdeCsv(csvNuevo, demo);
    expect(imp.errores).toHaveLength(0);
    expect(imp.nuevos).toHaveLength(1);
    expect(imp.nuevos[0].nombre).toBe('Lucía');
  });

  it('recorta el fondo exterior y conserva la silueta central de la vaca', () => {
    const w = 40;
    const h = 40;
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4;
        const esSujeto = x >= 12 && x <= 28 && y >= 10 && y <= 30;
        // Fondo verde prado / azul cielo vs sujeto negro/blanco
        rgba[p] = esSujeto ? 35 : 110;
        rgba[p + 1] = esSujeto ? 30 : 185;
        rgba[p + 2] = esSujeto ? 28 : 220;
        rgba[p + 3] = 255;
      }
    }
    const res = segmentarSiluetaBuffer(rgba, w, h, 35);
    expect(res.porcentajeRecortado).toBeGreaterThan(50);
    expect(res.minX).toBeGreaterThanOrEqual(11);
    expect(res.maxX).toBeLessThanOrEqual(29);
    // El píxel de esquina (0,0) debe quedar transparente y el centro (20,20) opaco
    expect(res.rgba[3]).toBe(0);
    expect(res.rgba[(20 * w + 20) * 4 + 3]).toBe(255);
  });
});

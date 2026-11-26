# Plan de Trabajo — GanaderIA (Gestión y Automatización de Trámites Ganaderos)

> **Enfoque estratégico:** Empezar resolviendo el mayor dolor diario del ganadero de vacuno en Asturias —la **duplicidad de datos entre la granja/robot de ordeño y la Agroficina Virtual (RemoWeb)** y el **miedo a sanciones por plazos**— diseñando desde el día 1 un modelo de datos compatible con **SITRAN** para poder escalar sin reescribir código a otras especies (ovino, caprino, equino, porcino) y otras Comunidades Autónomas.

---

## 1. Contexto Real y Punto de Partida

En el Principado de Asturias, la trazabilidad oficial (conectada al sistema nacional **SITRAN**: REGA, RIIA y REMO) se tramita en la **Agroficina Virtual / RemoWeb** mediante Cl@ve o Certificado Digital. Los puntos de mayor fricción diaria para un ganadero son:

1. **Doble trabajo sistemático:** El ganadero ya registra partos, bajas, secados o tratamientos en el software de su robot de ordeño (**Lely Horizon/T4C**, **DeLaval DelPro**, **GEA DairyPlan**) o en una libreta en la cuadra, y luego tiene que picar exactamente lo mismo en la web del Principado (y en ASCOL si hace control lechero).
2. **Plazos legales estrictos (riesgo de multas / penalización PAC):**
   - **7 días** máximo para notificar nacimientos y bajas por muerte.
   - **20 días** máximo para colocar físicamente los crotales al ternero.
   - **Periodos de supresión** de leche y carne tras aplicar medicamentos (PRESVET).
3. **Condiciones de uso reales:** En la cuadra el ganadero tiene las manos ocupadas/sucias y muchas veces mala cobertura móvil; el papeleo suele acumularse para la noche o el fin de semana.

> **Clave técnica para conectar con la web del Principado de forma rápida:** Las plataformas públicas con Cl@ve/Certificado no suelen ofrecer APIs abiertas para terceros. En lugar de intentar una integración oficial máquina-a-máquina desde el inicio (dificultad 10/10 y meses de burocracia), el camino más práctico es una **estrategia en 2 escalones**: primero cruzar archivos del robot para generar la cola validada, y segundo ofrecer una **extensión de navegador (autocompletado en 1 clic)** donde el ganadero inicia sesión con su certificado y la herramienta rellena los formularios de RemoWeb automáticamente, dejándole solo revisar y firmar.

---

## 2. Matriz Completa de Opciones de Implementación (Priorizada)

Criterios de evaluación:
- **Aportación (1–10):** Cuánto tiempo, estrés, errores o riesgo de sanción ahorra al ganadero.
- **Dificultad (1–10):** Esfuerzo técnico, dependencias externas, permisos de terceros y mantenimiento.
- **Ratio (Aportación / Dificultad):** Cuanto mayor sea el número, mejor relación valor-esfuerzo (**Quick Win**).

| # | Opción de Implementación | Bloque | Aportación (1-10) | Dificultad (1-10) | Ratio (A/D) | Prioridad | Extensible a otras especies |
| :-: | :--- | :--- | :-: | :-: | :-: | :--- | :-: |
| **1** | **Semáforo y alertas de plazos legales** (7d notificación, 20d crotal, fin de supresión) | Núcleo / Plazos | **9** | **2** | **4.50** | Quick Win | Sí (reglas configurables) |
| **2** | **Inventario inteligente de crotales + lista de duplicados** (stock bajo, foto a crotal caído, pedido AZASA/OCA) | Núcleo / Crotales | **8** | **2** | **4.00** | Quick Win | Sí (crotal / bolo) |
| **3** | **Gestor documental rápido de inspección** (DIBs, saneamientos, PSI, visitas zoosanitarias en 1 clic) | Sanidad / Docs | **7** | **2** | **3.50** | Quick Win | Sí |
| **4** | **Importador de ficheros del robot (CSV/Excel/ADIS)** para detectar partos/bajas aún no subidos al Principado | Robot ↔ Principado | **8** | **3** | **2.67** | Quick Win | Parcial (vacuno/ovino leche) |
| **5** | **Censo unificado y Libro Registro de Explotación digital** (ficha por animal + exportación PDF/Excel) | Núcleo / Censo | **8** | **3** | **2.67** | Quick Win | Sí (base SITRAN) |
| **6** | **Calendario reproductivo automático** (partos previstos, secados -60d, celos, inseminaciones) | Gestión Granja | **8** | **3** | **2.67** | Quick Win | Sí |
| **7** | **Bandeja de discrepancias ("Cuadre 360"):** cruza Robot ↔ Censo Principado ↔ ASCOL y avisa errores | Robot ↔ Principado | **9** | **4** | **2.25** | Quick Win Alto Impacto | Sí (censo vs granja) |
| **8** | **Registro de campo por voz/foto/WhatsApp** ("Parió la 4521, hembra, crotal 0892" + OCR a crotal/DIB) | Núcleo / Campo | **9** | **4** | **2.25** | Quick Win Diferenciador | Sí |
| **9** | **Control de recetas (PRESVET) y bloqueo de seguridad** (foto receta → extrae supresión y avisa antes de matadero/ordeño) | Sanidad / Docs | **9** | **4** | **2.25** | Quick Win Alto Impacto | Sí |
| **10** | **Preparador de lotes de salida (Matadero / Mercado / Pastos)** + validación sanitaria + pack único de DIBs en PDF | Trámites / Guías | **8** | **4** | **2.00** | Quick Win | Sí (guías por lote/animal) |
| **11** | **Extensión de navegador "Autocompletado 1-clic" en Agroficina / RemoWeb** (rellena altas, bajas y guías) | Robot ↔ Principado | **10** | **5** | **2.00** | Pieza Estrella | Sí (mismo portal) |
| **12** | **Asistente IA de normativa y trámites ganaderos** (dudas sobre plazos, ayudas PAC, guías en lenguaje llano) | Sanidad / Docs | **6** | **3** | **2.00** | Complemento Fácil | Sí |
| **13** | **Panel de costes y rentabilidad por vaca / lote** (producción, bajas, gasto veterinario, desvieje) | Gestión Granja | **7** | **5** | **1.40** | Estratégico Medio | Sí |
| **14** | **Modo Multi-Explotación (B2B)** para Cooperativas, Veterinarios y Gestorías/OPAs | Escala / Negocio | **8** | **6** | **1.33** | Estratégico (Crecimiento) | Sí |
| **15** | **Integración con ASCOL / CONAFE** (importar control lechero, células somáticas y cartas genealógicas) | Ecosistema | **7** | **6** | **1.17** | Estratégico Medio | Específico bovino leche |
| **16** | **Conexión con lectores RFID / bastones Bluetooth** de crotales electrónicos (lectura masiva en manga) | Hardware / Campo | **7** | **6** | **1.17** | Estratégico Medio | Sí (ideal ovino/bovino) |
| **17** | **Conector API nativo en tiempo real con robots** (Lely 3rd Party Cloud API, puente local DeLaval Server) | Robot ↔ Principado | **9** | **8** | **1.13** | Gran Apuesta (Fase 3) | Específico leche |
| **18** | **Integración directa máquina-a-máquina con Principado / SITRAN** (WebService + firma delegada) | Robot ↔ Principado | **9** | **10** | **0.90** | Posponer (Barrera pública) | Sí |
| **19** | **Puente con Cuaderno Digital Agrícola (CUE / SIGPAC / purines)** | Agrícola / PAC | **6** | **8** | **0.75** | Posponer (Fuera de foco) | Agrícola general |

---

## 3. Detalle de los Top Quick Wins (Qué construir primero)

### Bloque 1 — Ganar al ganadero en la primera semana (Aportación 8–9, Dificultad 2–4)
- **#1 Semáforo de Plazos Legales:** Al registrar un nacimiento (manual, por voz o importado del robot), el sistema arranca automáticamente dos cuentas atrás visuales (verde / amarillo / rojo): **7 días** para comunicarlo a Agroficina y **20 días** para crotalar.
- **#2 Inventario de Crotales y Duplicados:** Controla qué rangos de crotales tiene la granja disponibles. Cuando se registra un nacimiento, sugiere automáticamente el siguiente crotal libre (evitando errores de tecleo de los 14 dígitos). Además, permite marcar *"Crotal caído"* sobre una vaca para acumular la lista y solicitar duplicados de golpe (AZASA / OCA).
- **#4 + #7 Importador de Robot + Bandeja de Discrepancias ("Cuadre 360"):** El ganadero sube el listado exportado del robot (CSV/Excel/ADIS) y el censo exportado de Agroficina Virtual. En segundos, la herramienta muestra:
  - Nacimientos en el robot sin dar de alta en el Principado (con días restantes del plazo legal).
  - Bajas en el robot que siguen activas en el Principado.
  - Animales activos en el Principado sin actividad o ausentes en el robot.
- **#8 Registro de Campo por Voz/Foto (WhatsApp o PWA offline):** Pensado para usar en la cuadra. Una nota de voz o foto al crotal/DIB se convierte en un borrador estructurado listo para aprobar con un toque.

### Bloque 2 — El "Wow Effect" en burocracia (Aportación 9–10, Dificultad 4–5)
- **#11 Extensión de Navegador para Agroficina Virtual / RemoWeb:** El ganadero abre RemoWeb con su certificado/Cl@ve como siempre, pulsa el botón de **GanaderIA** en el navegador, y la extensión rellena formulario tras formulario con los nacimientos, bajas o salidas a matadero de la cola pendiente. El ganadero solo verifica y firma.
- **#10 Preparador de Salidas (Matadero / Pola de Siero / Pastos):** Selecciona las reses que salen → el sistema valida automáticamente que no haya medicamentos en supresión (#9) → genera el borrador de la guía y recopila sus DIBs.

---

## 4. Hoja de Ruta (3 Fases)

1. **Fase 1 — MVP Validado (Semanas 1 a 6):**
   - `#5` Censo unificado y Libro Registro digital (modelo SITRAN extensible a otras especies).
   - `#2` Inventario inteligente de crotales + lista de duplicados.
   - `#1` Semáforo y alertas de plazos legales (7 días notificación, 20 días crotal, supresión).
   - `#4` Importador de ficheros del robot de ordeño (Lely / DeLaval / CSV genérico).
   - `#7` Bandeja de discrepancias ("Cuadre 360": Robot ↔ Principado) + cola de trámites listos para copiar/subir a Agroficina Virtual / RemoWeb.
   - `#3` Gestor documental rápido (DIBs, saneamientos, PSI) y exportación del Libro Registro.
2. **Fase 2 — Eliminación real de tecleo (Semanas 7 a 14):**
   - `#11` Extensión de navegador (Chrome/Edge) "Autocompletado 1-clic" para Agroficina / RemoWeb.
   - `#8` Registro de campo por voz/foto/WhatsApp (IA + OCR).
   - `#9` Control de recetas PRESVET y bloqueos de seguridad por periodo de supresión.
   - `#10` Preparador de lotes de salida (Matadero / Mercado / Pastos) + pack único de DIBs.
   - `#6` Calendario reproductivo automático.
3. **Fase 3 — Ecosistema y Escalado Comercial (Mes 4+):**
   - `#14` Modo Multi-Explotación para Cooperativas, Veterinarios y Gestorías/OPAs.
   - `#17` Conectores API nativos (Lely 3rd Party Cloud API / DeLaval).
   - `#15` ASCOL/CONAFE + `#16` Lectores RFID Bluetooth + expansión a otras especies y CCAA.

---

## 5. Arquitectura Extensible (Vacas Asturias → Otras Especies y CCAA)

- **Adaptadores de Entrada:** Robots (Lely, DeLaval, GEA vía CSV/ADIS/API), campo (PWA offline / voz / OCR), recetas y RFID.
- **Núcleo GanaderIA (Estándar SITRAN):**
  - `Explotacion` (REGA, CCAA, titular, especies activas).
  - `UnidadGanadera` (soporta `AnimalIndividual` para bovino/equino y `LoteAnimales` para ovino/caprino/porcino).
  - `EventoGanadero` (Nacimiento, Baja/Muerte, Salida Matadero/Mercado/Pastos, Entrada, Tratamiento, Duplicado Crotal).
  - `MotorReglas` parametrizado por especie y comunidad autónoma (`plazoNotificacionDias`, `plazoIdentificacionDias`, validaciones de supresión).
- **Adaptadores de Salida:** Asturias (cola validada + paquete para RemoWeb / Agroficina Virtual + Libro Registro exportable), preparados para añadir conectores de otras CCAA (Galicia OGV, Cantabria, CyL).

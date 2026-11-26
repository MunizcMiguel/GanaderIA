# GanaderIA — Gestión Ganadera y Trámites (Principado de Asturias / SITRAN)

Herramienta web (móvil y escritorio) + extensión de navegador para reducir el papeleo diario del ganadero: **control de crotales y duplicados**, **semáforo de plazos legales (7d/20d)**, **cuadre automático entre robot de ordeño y Agroficina Virtual / RemoWeb**, **dictado rápido de cuadra por voz**, **calendario reproductivo automático**, **bloqueos sanitarios por supresión (PRESVET)** y **preparador de salidas a matadero/mercado/pastos**.

Consulta el roadmap completo y la matriz priorizada de 19 funcionalidades en [PLAN_TRABAJO.md](./PLAN_TRABAJO.md).

## Cómo abrirlo (doble clic, sin PowerShell)

1. Haz **doble clic** en el archivo **`Abrir GanaderIA.bat`** en esta carpeta.
2. Se abrirá una ventana negra pequeña (déjala abierta mientras uses la app) y tu navegador cargará GanaderIA automáticamente.

## Funcionalidades implementadas

### Fase 1 (MVP)
- **Semáforo de Plazos Legales (`#1`)**: cuentas atrás automáticas de 7 días (notificación nacimientos y bajas), 20 días (colocación física de crotal), periodos de supresión de leche/carne y caducidad de saneamientos.
- **Inventario Inteligente de Crotales + Duplicados (`#2`)**: control de remesas, sugerencia automática del siguiente crotal libre y lista lista-para-enviar de duplicados (AZASA / OCA).
- **Importador de Robot + Bandeja de Discrepancias "Cuadre 360°" (`#4` + `#7`)**: soporta exportaciones CSV de **Lely Horizon/T4C**, **DeLaval DelPro** y hojas genéricas; detecta partos y bajas sin comunicar al Principado y genera la **Cola de Trámites RemoWeb**.
- **Censo Unificado y Libro Registro Digital (`#5`)**: arquitectura extensible basada en **SITRAN** (vacuno activo + preparación para ovino, caprino, equino, porcino y cambio de Comunidad Autónoma) con exportación CSV.
- **Preparador de Salidas + Carpeta de Inspección (`#10` + `#3`)**: validación automática anti-sanciones antes de salir a matadero/Pola de Siero/pastos y registro documental (Saneamiento, PSI, Recetas PRESVET).

### Fase 2 (Automatización Campo y Web)
- **Escáner OCR de Recetas PRESVET y DIBs (`#9` + OCR local)**: haz foto o sube imagen desde móvil/PC (motor `tesseract.js` en español en tu propio navegador, 100% privado). Extrae automáticamente crotal, medicamento, nº PRESVET, días de supresión de leche/carne (convirtiendo horas a días) o datos completos del DIB, y activa bloqueos sanitarios o altas de censo al instante.
- **Registro Rápido de Cuadra por Voz / Texto (`#8`)**: dicta con el micrófono (*"Hoy parió la 4521, ternera hembra frisona"*, *"Se le cayó el crotal derecho a la 5772"*, *"Inseminada la 4521 con toro Capitán"*) y crea el borrador al instante.
- **Calendario Reproductivo Automático (`#6`)**: registra inseminaciones y calcula automáticamente diagnóstico (+35d), secado (-60d) y parto previsto (+283d).
- **Extensión Chrome / Edge "Autocompletado 1-Clic" para Agroficina / RemoWeb (`#11`)**: en la carpeta `extension-remoweb/` (incluye `simulador_remoweb.html` para probarla en 1 minuto).

## Archivos de ejemplo incluidos

- `ejemplos/lely_horizon_eventos.csv`
- `ejemplos/delaval_delpro_eventos.csv`
- `extension-remoweb/simulador_remoweb.html` (doble clic para probar el autocompletado de la extensión)

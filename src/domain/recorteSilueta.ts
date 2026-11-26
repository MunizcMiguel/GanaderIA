/**
 * Segmentación automática de silueta de vaca en navegador (100% offline).
 * Usa estimación de color de fondo en bordes + flood-fill desde el perímetro
 * con protección del sujeto central y suavizado alfa en el contorno.
 */

export interface ResultadoSegmentacion {
  rgba: Uint8ClampedArray;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  porcentajeRecortado: number;
}

function distColor(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11);
}

/**
 * Función pura testeable que recorta el fondo alrededor de un sujeto central.
 * `tolerancia` va de 15 (estricto) a 75 (agresivo), valor por defecto 38.
 */
export function segmentarSiluetaBuffer(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  tolerancia = 38,
): ResultadoSegmentacion {
  const total = width * height;
  const out = new Uint8ClampedArray(src);

  // 1. Muestrear colores del perímetro (arriba, izquierda, derecha y esquinas)
  const muestras: Array<[number, number, number]> = [];
  const step = Math.max(1, Math.floor(Math.min(width, height) / 24));
  for (let x = 0; x < width; x += step) {
    const iTop = x * 4;
    muestras.push([src[iTop], src[iTop + 1], src[iTop + 2]]);
  }
  for (let y = 0; y < Math.floor(height * 0.75); y += step) {
    const iL = y * width * 4;
    const iR = (y * width + (width - 1)) * 4;
    muestras.push([src[iL], src[iL + 1], src[iL + 2]]);
    muestras.push([src[iR], src[iR + 1], src[iR + 2]]);
  }

  // Color medio de referencia de bordes
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  for (const [r, g, b] of muestras) {
    sumR += r;
    sumG += g;
    sumB += b;
  }
  const nMuestras = Math.max(1, muestras.length);
  const bgR = sumR / nMuestras;
  const bgG = sumG / nMuestras;
  const bgB = sumB / nMuestras;

  // 2. Flood-fill desde todo el perímetro (BFS) comparando con borde global y vecino inmediato
  const esFondo = new Uint8Array(total);
  const cola = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const intentarEncolar = (idx: number, refR: number, refG: number, refB: number, tolLocal: number) => {
    if (esFondo[idx]) return;
    const p = idx * 4;
    const r = src[p];
    const g = src[p + 1];
    const b = src[p + 2];

    const dGlobal = distColor(r, g, b, bgR, bgG, bgB);
    const dLocal = distColor(r, g, b, refR, refG, refB);

    // También verificamos si coincide con alguna muestra de borde (útil si hay cielo + pared)
    let minMuestra = dGlobal;
    if (dGlobal > tolerancia) {
      for (let m = 0; m < muestras.length; m += 3) {
        const dm = distColor(r, g, b, muestras[m][0], muestras[m][1], muestras[m][2]);
        if (dm < minMuestra) minMuestra = dm;
      }
    }

    if (minMuestra <= tolerancia || dLocal <= tolLocal) {
      esFondo[idx] = 1;
      cola[tail++] = idx;
    }
  };

  // Semillas en los 4 bordes
  for (let x = 0; x < width; x++) {
    const top = x;
    const bot = (height - 1) * width + x;
    esFondo[top] = 1;
    cola[tail++] = top;
    // En el borde inferior solo si se parece al fondo general
    const pb = bot * 4;
    if (distColor(src[pb], src[pb + 1], src[pb + 2], bgR, bgG, bgB) <= tolerancia * 1.1) {
      esFondo[bot] = 1;
      cola[tail++] = bot;
    }
  }
  for (let y = 1; y < height - 1; y++) {
    const left = y * width;
    const right = y * width + (width - 1);
    if (!esFondo[left]) {
      esFondo[left] = 1;
      cola[tail++] = left;
    }
    if (!esFondo[right]) {
      esFondo[right] = 1;
      cola[tail++] = right;
    }
  }

  const tolPasoLocal = Math.max(8, tolerancia * 0.42);
  while (head < tail) {
    const cur = cola[head++];
    const cx = cur % width;
    const cy = (cur - cx) / width;
    const p = cur * 4;
    const cr = src[p];
    const cg = src[p + 1];
    const cb = src[p + 2];

    if (cx > 0) intentarEncolar(cur - 1, cr, cg, cb, tolPasoLocal);
    if (cx < width - 1) intentarEncolar(cur + 1, cr, cg, cb, tolPasoLocal);
    if (cy > 0) intentarEncolar(cur - width, cr, cg, cb, tolPasoLocal);
    if (cy < height - 1) intentarEncolar(cur + width, cr, cg, cb, tolPasoLocal);
  }

  // 3. Limpiar píxeles de fondo y suavizar contorno (1px feather)
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let fondoCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const p = idx * 4;
      if (esFondo[idx]) {
        out[p + 3] = 0;
        fondoCount += 1;
      } else {
        // Suavizado si tiene vecinos de fondo
        let vecFondo = 0;
        if (x > 0 && esFondo[idx - 1]) vecFondo++;
        if (x < width - 1 && esFondo[idx + 1]) vecFondo++;
        if (y > 0 && esFondo[idx - width]) vecFondo++;
        if (y < height - 1 && esFondo[idx + width]) vecFondo++;
        if (vecFondo >= 2) {
          out[p + 3] = Math.round(out[p + 3] * 0.65);
        }
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Seguridad: si recortó demasiado (> 92%), devolver región central íntegra
  const pct = (fondoCount / total) * 100;
  if (maxX <= minX || maxY <= minY || pct > 94) {
    return {
      rgba: new Uint8ClampedArray(src),
      minX: 0,
      minY: 0,
      maxX: width - 1,
      maxY: height - 1,
      porcentajeRecortado: 0,
    };
  }

  return {
    rgba: out,
    minX,
    minY,
    maxX,
    maxY,
    porcentajeRecortado: Math.round(pct),
  };
}

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function leerArchivoComoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Recorta la silueta de la vaca y la centra sobre fondo blanco puro (#ffffff)
 * en un lienzo cuadrado 320x320 listo para mostrarse dentro del círculo verde.
 */
export async function generarFotoSiluetaVaca(
  sourceDataUrl: string,
  tolerancia = 38,
  tamanoSalida = 320,
): Promise<{ dataUrl: string; porcentajeRecortado: number }> {
  const img = await cargarImagen(sourceDataUrl);
  const maxProc = 340;
  const scale = Math.min(1, maxProc / Math.max(img.width, img.height));
  const w = Math.max(24, Math.round(img.width * scale));
  const h = Math.max(24, Math.round(img.height * scale));

  const workCanvas = document.createElement('canvas');
  workCanvas.width = w;
  workCanvas.height = h;
  const workCtx = workCanvas.getContext('2d');
  if (!workCtx) return { dataUrl: sourceDataUrl, porcentajeRecortado: 0 };

  workCtx.drawImage(img, 0, 0, w, h);
  const imgData = workCtx.getImageData(0, 0, w, h);
  const seg = segmentarSiluetaBuffer(imgData.data, w, h, tolerancia);

  const cutCanvas = document.createElement('canvas');
  cutCanvas.width = w;
  cutCanvas.height = h;
  const cutCtx = cutCanvas.getContext('2d');
  if (!cutCtx) return { dataUrl: sourceDataUrl, porcentajeRecortado: 0 };

  cutCtx.putImageData(new ImageData(new Uint8ClampedArray(seg.rgba), w, h), 0, 0);

  // Centrar el recorte (bounding box) sobre fondo blanco puro en lienzo cuadrado
  const outCanvas = document.createElement('canvas');
  outCanvas.width = tamanoSalida;
  outCanvas.height = tamanoSalida;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return { dataUrl: sourceDataUrl, porcentajeRecortado: 0 };

  outCtx.fillStyle = '#ffffff';
  outCtx.fillRect(0, 0, tamanoSalida, tamanoSalida);

  const boxW = Math.max(1, seg.maxX - seg.minX + 1);
  const boxH = Math.max(1, seg.maxY - seg.minY + 1);
  const pad = Math.round(tamanoSalida * 0.1);
  const avail = tamanoSalida - pad * 2;
  const fitScale = Math.min(avail / boxW, avail / boxH);
  const drawW = Math.round(boxW * fitScale);
  const drawH = Math.round(boxH * fitScale);
  const dx = Math.round((tamanoSalida - drawW) / 2);
  const dy = Math.round((tamanoSalida - drawH) / 2) - Math.round(tamanoSalida * 0.03);

  outCtx.drawImage(cutCanvas, seg.minX, seg.minY, boxW, boxH, dx, dy, drawW, drawH);

  return {
    dataUrl: outCanvas.toDataURL('image/jpeg', 0.86),
    porcentajeRecortado: seg.porcentajeRecortado,
  };
}

const STORAGE_KEY = 'ganaderia_remoweb_paquete_v1';

const jsonInput = document.getElementById('jsonInput');
const fileInput = document.getElementById('fileInput');
const btnCargar = document.getElementById('btnCargar');
const btnLimpiar = document.getElementById('btnLimpiar');
const estadoMsg = document.getElementById('estadoMsg');
const listaSection = document.getElementById('listaSection');
const listaTramites = document.getElementById('listaTramites');
const explotacionTitulo = document.getElementById('explotacionTitulo');
const contador = document.getElementById('contador');

let paqueteActual = null;
let completados = {};

function mostrarEstado(texto, esError = false) {
  estadoMsg.textContent = texto;
  estadoMsg.className = `status ${esError ? 'err' : 'ok'}`;
  estadoMsg.classList.remove('hidden');
}

function renderizar() {
  if (!paqueteActual || !Array.isArray(paqueteActual.tramitesPendientes)) {
    listaSection.classList.add('hidden');
    return;
  }

  listaSection.classList.remove('hidden');
  explotacionTitulo.textContent = `${paqueteActual.explotacion?.nombre || 'Explotación'} (${paqueteActual.explotacion?.rega || ''})`;
  contador.textContent = String(paqueteActual.tramitesPendientes.length);
  listaTramites.innerHTML = '';

  paqueteActual.tramitesPendientes.forEach((tr) => {
    const yaHecho = Boolean(completados[tr.id]);
    const div = document.createElement('div');
    div.className = `item ${yaHecho ? 'done' : ''}`;
    div.innerHTML = `
      <div class="item-head">
        <span class="item-type">${tr.tipo}</span>
        <span class="item-crotal">${tr.crotal || 'Sin crotal'}</span>
      </div>
      <div class="item-meta">
        Fecha: <strong>${tr.fechaEvento || '—'}</strong>
        ${tr.crotalMadre ? `· Madre: <strong>${tr.crotalMadre}</strong>` : ''}
        ${tr.sexo ? `· Sexo: <strong>${tr.sexo === 'H' ? 'Hembra' : 'Macho'}</strong>` : ''}
        ${tr.destino ? `· Destino: <strong>${tr.destino}</strong>` : ''}
      </div>
      <div class="row-between">
        <button type="button" class="btn-primary btn-fill">Rellenar en esta página</button>
        <button type="button" class="btn-secondary btn-done">${yaHecho ? '✓ Rellenado' : 'Marcar hecho'}</button>
      </div>
    `;

    div.querySelector('.btn-fill').addEventListener('click', () => rellenarEnPestanaActiva(tr));
    div.querySelector('.btn-done').addEventListener('click', () => {
      completados[tr.id] = !completados[tr.id];
      guardarEnStorage();
      renderizar();
    });

    listaTramites.appendChild(div);
  });
}

function guardarEnStorage() {
  chrome.storage.local.set({ [STORAGE_KEY]: { paqueteActual, completados } });
}

function cargarTextoJson(texto) {
  try {
    const parsed = JSON.parse(texto);
    if (!parsed || !Array.isArray(parsed.tramitesPendientes)) {
      mostrarEstado('El JSON no corresponde a un paquete válido de GanaderIA.', true);
      return;
    }
    paqueteActual = parsed;
    completados = {};
    guardarEnStorage();
    renderizar();
    mostrarEstado(`Cargados ${parsed.tramitesPendientes.length} trámite(s) listos para autocompletar.`);
  } catch {
    mostrarEstado('No se pudo leer el JSON. Asegúrate de copiarlo entero desde GanaderIA.', true);
  }
}

/**
 * Esta función se inyecta directamente en la pestaña activa de Agroficina / RemoWeb
 * y busca campos por name, id, placeholder y etiquetas <label> en español.
 */
function inyectarAutorrellenoEnPagina(datos) {
  function norm(s) {
    return (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function aFechaEs(iso) {
    if (!iso || !iso.includes('-')) return iso || '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function obtenerTextoAsociado(el) {
    const piezas = [el.name, el.id, el.placeholder, el.getAttribute('aria-label')];
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl) piezas.push(lbl.textContent);
    }
    const parentLabel = el.closest('label');
    if (parentLabel) piezas.push(parentLabel.textContent);
    const prev = el.previousElementSibling;
    if (prev && prev.textContent) piezas.push(prev.textContent);
    return norm(piezas.filter(Boolean).join(' '));
  }

  function aplicarValor(el, valor) {
    if (!valor) return false;
    if (el.tagName === 'SELECT') {
      const valNorm = norm(valor);
      const opt = Array.from(el.options).find((o) => {
        const t = norm(o.text);
        const v = norm(o.value);
        return (
          v === valNorm ||
          t === valNorm ||
          t.includes(valNorm) ||
          (valNorm === 'h' && (t.includes('hembra') || v === 'f')) ||
          (valNorm === 'm' && (t.includes('macho') || v === 'm'))
        );
      });
      if (!opt) return false;
      el.value = opt.value;
    } else if (el.type === 'date') {
      el.value = valor;
    } else {
      el.value = valor;
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.style.outline = '2px solid #15803d';
    el.style.backgroundColor = '#f0fdf4';
    return true;
  }

  const campos = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'));
  let rellenados = 0;

  const reglasCampos = [
    {
      valor: datos.rega,
      coincide: (t) => t.includes('rega') || t.includes('explotacion'),
      excluir: (t) => t.includes('destino'),
    },
    {
      valor: datos.crotalMadre,
      coincide: (t) => t.includes('madre') || t.includes('dam'),
      excluir: () => false,
    },
    {
      valor: datos.crotal,
      coincide: (t) => t.includes('crotal') || t.includes('dib') || t.includes('identif'),
      excluir: (t) => t.includes('madre') || t.includes('dam'),
    },
    {
      valor: datos.fechaEvento,
      valorTexto: aFechaEs(datos.fechaEvento),
      coincide: (t) => t.includes('fecha') || t.includes('nacimiento') || t.includes('baja') || t.includes('salida'),
      excluir: () => false,
    },
    {
      valor: datos.sexo === 'H' ? 'Hembra' : datos.sexo === 'M' ? 'Macho' : '',
      coincide: (t) => t.includes('sexo') || t.includes('genero'),
      excluir: () => false,
    },
    {
      valor: datos.raza,
      coincide: (t) => t.includes('raza'),
      excluir: () => false,
    },
    {
      valor: datos.destino,
      coincide: (t) => t.includes('destino') && !t.includes('rega'),
      excluir: () => false,
    },
    {
      valor: datos.codigoRegaDestino,
      coincide: (t) => t.includes('rega') && t.includes('destino'),
      excluir: () => false,
    },
    {
      valor: datos.numeroDamer,
      coincide: (t) => t.includes('damer'),
      excluir: (t) => t.includes('fecha') || t.includes('validez'),
    },
    {
      valor: datos.fechaValidezDamer,
      valorTexto: aFechaEs(datos.fechaValidezDamer),
      coincide: (t) => t.includes('damer') && (t.includes('fecha') || t.includes('validez')),
      excluir: () => false,
    },
    {
      valor: datos.ceaMatadero,
      coincide: (t) => t.includes('cea') || (t.includes('matadero') && t.includes('codigo')),
      excluir: () => false,
    },
    {
      valor: datos.concejo,
      coincide: (t) => t.includes('concejo') || t.includes('municipio'),
      excluir: () => false,
    },
    {
      valor: datos.lugarMuerte,
      coincide: (t) => t.includes('lugar') || t.includes('paraje'),
      excluir: () => false,
    },
    {
      valor: datos.numeroDenuncia,
      coincide: (t) => t.includes('denuncia'),
      excluir: () => false,
    },
    {
      valor: datos.codigoSirentra,
      coincide: (t) => t.includes('sirentra') || t.includes('transportista'),
      excluir: () => false,
    },
    {
      valor: datos.matriculaVehiculo,
      coincide: (t) => t.includes('matricula') || t.includes('bastidor'),
      excluir: () => false,
    },
    {
      valor: datos.medioTransporte,
      coincide: (t) => t.includes('medio') && t.includes('transporte'),
      excluir: () => false,
    },
    {
      valor: datos.telefonoContacto,
      coincide: (t) => t.includes('telefono') || t.includes('movil'),
      excluir: () => false,
    },
    {
      valor: datos.motivo,
      coincide: (t) => t.includes('motivo') || t.includes('causa') || t.includes('observ'),
      excluir: () => false,
    },
  ];

  for (const el of campos) {
    const desc = obtenerTextoAsociado(el);
    for (const regla of reglasCampos) {
      if (!regla.valor) continue;
      if (regla.coincide(desc) && !regla.excluir(desc)) {
        const valorFinal = el.type === 'date' ? regla.valor : regla.valorTexto || regla.valor;
        if (aplicarValor(el, valorFinal)) {
          rellenados++;
        }
        break;
      }
    }
  }

  return rellenados;
}

async function rellenarEnPestanaActiva(tramite) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      mostrarEstado('No se encontró pestaña activa.', true);
      return;
    }

    const payload = {
      rega: paqueteActual?.explotacion?.rega || '',
      crotal: tramite.crotal || '',
      crotalMadre: tramite.crotalMadre || '',
      fechaEvento: tramite.fechaEvento || '',
      sexo: tramite.sexo || '',
      raza: tramite.raza || '',
      destino: tramite.destino || '',
      codigoRegaDestino: tramite.codigoRegaDestino || '',
      motivo: tramite.motivo || '',
    };

    const resultados = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: inyectarAutorrellenoEnPagina,
      args: [payload],
    });

    const rellenados = resultados?.[0]?.result ?? 0;
    if (rellenados > 0) {
      completados[tramite.id] = true;
      guardarEnStorage();
      renderizar();
      mostrarEstado(`✓ Rellenados ${rellenados} campo(s) en el formulario. Revisa los datos y firma.`);
    } else {
      mostrarEstado(
        'No se detectaron campos compatibles en esta pestaña. Abre primero el formulario de alta o baja.',
        true,
      );
    }
  } catch (err) {
    mostrarEstado(
      `No se pudo escribir en esta pestaña (${err?.message || 'página restringida'}). Si usas el simulador local file://, activa "Permitir acceso a URLs de archivo" en la extensión.`,
      true,
    );
  }
}

btnCargar.addEventListener('click', () => cargarTextoJson(jsonInput.value));

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  jsonInput.value = text;
  cargarTextoJson(text);
  e.target.value = '';
});

btnLimpiar.addEventListener('click', () => {
  paqueteActual = null;
  completados = {};
  jsonInput.value = '';
  chrome.storage.local.remove(STORAGE_KEY);
  renderizar();
  mostrarEstado('Cola vaciada.');
});

chrome.storage.local.get(STORAGE_KEY, (data) => {
  const saved = data[STORAGE_KEY];
  if (saved?.paqueteActual) {
    paqueteActual = saved.paqueteActual;
    completados = saved.completados || {};
    renderizar();
  }
});

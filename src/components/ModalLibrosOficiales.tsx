import { BookOpenCheck, Download, Pill, Printer, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatearFechaEs } from '../domain/fechas';
import { calcularUGMRebano } from '../domain/gestionAvanzada';
import {
  abrirVentanaImpresionHtml,
  generarFilasLibroExplotacion,
  generarHtmlLibroExplotacion,
  generarHtmlLibroTratamientos,
} from '../domain/librosOficiales';
import type { EstadoGanaderia } from '../domain/types';
import { ModalBase } from './ModalBase';

export function ModalLibrosOficiales({
  estado,
  libroInicial = 'EXPLOTACION',
  onCerrar,
}: {
  estado: EstadoGanaderia;
  libroInicial?: 'EXPLOTACION' | 'TRATAMIENTOS';
  onCerrar: () => void;
}) {
  const [tab, setTab] = useState<'EXPLOTACION' | 'TRATAMIENTOS'>(libroInicial);
  const filasLibro = useMemo(() => generarFilasLibroExplotacion(estado), [estado]);
  const ugm = useMemo(() => calcularUGMRebano(estado.animales), [estado.animales]);
  const tratamientos = useMemo(
    () =>
      [...(estado.tratamientos || [])].sort((a, b) =>
        b.fechaAdministracion.localeCompare(a.fechaAdministracion),
      ),
    [estado.tratamientos],
  );

  const imprimirActual = () => {
    const html =
      tab === 'EXPLOTACION'
        ? generarHtmlLibroExplotacion(estado)
        : generarHtmlLibroTratamientos(estado);
    abrirVentanaImpresionHtml(html);
  };

  const descargarHtmlImprimible = () => {
    const html =
      tab === 'EXPLOTACION'
        ? generarHtmlLibroExplotacion(estado)
        : generarHtmlLibroTratamientos(estado);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      tab === 'EXPLOTACION'
        ? `Libro_Explotacion_${estado.explotacion.codigoRega}.html`
        : `Libro_Tratamientos_${estado.explotacion.codigoRega}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ModalBase onCerrar={onCerrar} maxWidthClass="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6ece2] bg-[#f8faf6] px-5 py-4">
        <div>
          <h3 className="text-base font-extrabold text-[#0f1f18]">
            Libros Oficiales en PDF (Inspección OCA / SEPRONA)
          </h3>
          <p className="text-xs text-[#52655c]">
            {estado.explotacion.nombre} · REGA{' '}
            <span className="font-mono font-bold">{estado.explotacion.codigoRega}</span> ·{' '}
            <strong>{ugm.totalUgm} UGM</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={descargarHtmlImprimible}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce4d6] bg-white px-3 py-1.5 text-xs font-bold text-[#1f3329] hover:bg-[#edf1e9]"
          >
            <Download className="h-3.5 w-3.5" />
            Guardar archivo
          </button>
          <button
            type="button"
            onClick={imprimirActual}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f3d2e] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#175742]"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir / Guardar PDF
          </button>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-xl p-1.5 text-[#52655c] hover:bg-[#edf1e9]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Selector de libro */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#e6ece2] bg-white px-5 py-3">
        <button
          type="button"
          onClick={() => setTab('EXPLOTACION')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
            tab === 'EXPLOTACION'
              ? 'bg-[#0f3d2e] text-white'
              : 'bg-[#edf1e9] text-[#31453b] hover:bg-[#e1e8dc]'
          }`}
        >
          <BookOpenCheck className="h-4 w-4" />
          Libro de Explotación (A/B) ({filasLibro.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('TRATAMIENTOS')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
            tab === 'TRATAMIENTOS'
              ? 'bg-[#0f3d2e] text-white'
              : 'bg-[#edf1e9] text-[#31453b] hover:bg-[#e1e8dc]'
          }`}
        >
          <Pill className="h-4 w-4" />
          Libro de Tratamientos Veterinarios ({tratamientos.length})
        </button>
      </div>

      <div className="max-h-[65vh] overflow-auto p-5">
        {tab === 'EXPLOTACION' ? (
          <div className="space-y-3">
            <div className="grid gap-2 rounded-xl border border-[#e6ece2] bg-[#f8faf6] p-3 text-xs sm:grid-cols-4">
              <div>
                <span className="text-[11px] text-[#52655c]">Vacas adultas</span>
                <p className="font-extrabold text-[#0f1f18]">{ugm.vacas}</p>
              </div>
              <div>
                <span className="text-[11px] text-[#52655c]">Novillas / Recría</span>
                <p className="font-extrabold text-[#0f1f18]">{ugm.novillas}</p>
              </div>
              <div>
                <span className="text-[11px] text-[#52655c]">Terneros / Toros</span>
                <p className="font-extrabold text-[#0f1f18]">
                  {ugm.terneros} terneros · {ugm.toros} toros
                </p>
              </div>
              <div>
                <span className="text-[11px] text-[#52655c]">Carga total PAC</span>
                <p className="font-extrabold text-emerald-800">{ugm.totalUgm} UGM</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#dce4d6]">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-[#0f3d2e] text-[11px] text-white">
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Mov. (A/B)</th>
                    <th className="px-3 py-2">Crotal</th>
                    <th className="px-3 py-2">Sexo / Raza</th>
                    <th className="px-3 py-2">Origen / Destino</th>
                    <th className="px-3 py-2">Doc. Sanitario</th>
                    <th className="px-3 py-2 text-right">Recuento H/M</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6ece2]">
                  {filasLibro.map((f, idx) => (
                    <tr key={`${f.crotal}-${f.fecha}-${idx}`} className="hover:bg-[#f8faf6]">
                      <td className="whitespace-nowrap px-3 py-2 font-medium">
                        {formatearFechaEs(f.fecha)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold ${
                            f.movimiento === 'A'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-red-100 text-red-900'
                          }`}
                        >
                          {f.movimiento} · {f.causa}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono font-bold text-[#0f1f18]">
                        {f.crotal}
                      </td>
                      <td className="px-3 py-2">
                        {f.sexo === 'M' ? 'Macho' : 'Hembra'} · {f.raza}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-[#52655c]">
                        {f.regaContraparte}
                      </td>
                      <td className="px-3 py-2 text-[11px]">{f.documentoSanitario}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono font-bold text-[#31453b]">
                        {f.balanceHembras} H / {f.balanceMachos} M
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#dce4d6]">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#1e3a5f] text-[11px] text-white">
                  <th className="px-3 py-2">Fechas</th>
                  <th className="px-3 py-2">Receta PRESVET</th>
                  <th className="px-3 py-2">Medicamento y Dosis</th>
                  <th className="px-3 py-2">Animales</th>
                  <th className="px-3 py-2">Veterinario / Aplicador</th>
                  <th className="px-3 py-2">Espera Carne / Leche</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6ece2]">
                {tratamientos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#52655c]">
                      No hay tratamientos veterinarios registrados todavía.
                    </td>
                  </tr>
                ) : (
                  tratamientos.map((t) => (
                    <tr key={t.id} className="hover:bg-[#f8faf6]">
                      <td className="whitespace-nowrap px-3 py-2">
                        <p className="font-semibold">{formatearFechaEs(t.fechaPrescripcion)}</p>
                        <p className="text-[11px] text-[#52655c]">
                          Admin: {formatearFechaEs(t.fechaAdministracion)}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px]">
                        {t.recetaPresvet || '—'}
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-bold text-[#0f1f18]">{t.medicamento}</p>
                        <p className="text-[11px] text-[#52655c]">
                          {[t.dosis, t.afeccion].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px]">
                        {t.crotales.map((c) => `#${c.slice(-4)}`).join(', ')}
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-medium">{t.veterinario || '—'}</p>
                        <p className="text-[11px] text-[#52655c]">
                          Aplica: {t.aplicadoPor === 'VETERINARIO' ? 'Veterinario' : 'Ganadero'}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-[11px]">
                        <p>
                          Carne: <strong>{t.diasSupresionCarne}d</strong>
                        </p>
                        <p>
                          Leche: <strong>{t.diasSupresionLeche}d</strong>
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModalBase>
  );
}

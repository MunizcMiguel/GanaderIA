import { RefreshCw } from 'lucide-react';
import { useRef, useState } from 'react';
import { generarArchivoAdisParaRobot } from '../domain/exportadorRobotAdis';
import { descargarArchivo } from '../domain/exportadores';
import { hoyIso } from '../domain/fechas';
import { ejecutarCuadreRobotPrincipado, parsearCsvRobot } from '../domain/importadorRobot';
import type { DiscrepanciaCuadre, EstadoGanaderia } from '../domain/types';

interface Props {
  estado: EstadoGanaderia;
  onIncorporarDiscrepancia: (disc: DiscrepanciaCuadre) => void;
  onMarcarTramitado: (eventoId: string, justificante?: string) => void;
  onMarcarCrotalColocado: (eventoId: string) => void;
  onRegistrarImportacion: (archivo: string, fuente: string, registros: number) => void;
}

export function VistaRobotCuadre({
  estado,
  onIncorporarDiscrepancia,
  onRegistrarImportacion,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [avisoSync, setAvisoSync] = useState<string | null>(null);

  const procesarCsv = (contenido: string, nombreArchivo: string) => {
    const parsed = parsearCsvRobot(contenido);
    const hallazgos = ejecutarCuadreRobotPrincipado(estado, parsed.registros, hoyIso());
    const incorporables = hallazgos.filter(
      (d) => d.tipo !== 'ACTIVA_PRINCIPADO_AUSENTE_ROBOT',
    );
    incorporables.forEach((d) => onIncorporarDiscrepancia(d));
    onRegistrarImportacion(nombreArchivo, parsed.fuenteDetectada, parsed.registros.length);

    descargarArchivo(
      `ganaderia_robot_${estado.explotacion.codigoRega}_${hoyIso()}.ads`,
      generarArchivoAdisParaRobot(estado),
      'text/plain;charset=utf-8',
    );

    setAvisoSync(
      `Sincronización completada (${nombreArchivo}): ${parsed.registros.length} datos leídos del robot, ${incorporables.length} novedad(es) incorporadas a GanaderIA y archivo actualizado descargado para el robot.`,
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const text = await file.text();
      procesarCsv(text, file.name);
    }
    e.target.value = '';
  };

  return (
    <div className="animate-fade-up">
      <section className="card-surface rounded-2xl p-5 sm:p-6">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt,.tsv"
          onChange={handleFileChange}
          className="hidden"
        />

        <h2 className="text-lg font-extrabold text-[#0f1f18]">
          Sincronización con tu Robot ({estado.explotacion.marcaRobot})
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[#52655c]">
          En un solo paso: lee la información actual del robot, la contrasta con lo que tienes
          apuntado en GanaderIA, añade los partos o bajas que falten y prepara el archivo
          actualizado para dejar ambos al día.
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-5 flex min-h-[104px] w-full items-center justify-center gap-3 rounded-2xl bg-[#0f3d2e] px-6 py-7 text-base font-extrabold text-white shadow-md transition hover:bg-[#16523e] active:scale-[0.99]"
        >
          <RefreshCw className="h-6 w-6 text-amber-300" />
          Poner todo al día
        </button>

        {avisoSync && (
          <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-900">
            <span>{avisoSync}</span>
            <button
              type="button"
              onClick={() => setAvisoSync(null)}
              className="shrink-0 text-[11px] font-bold text-emerald-700 underline"
            >
              Cerrar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

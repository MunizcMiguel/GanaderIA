import { Baby, FileScan, FileWarning, Mic, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  onDictarVoz: () => void;
  onEscanerOcr: () => void;
  onRegistrarNacimiento: () => void;
  onRegistrarBaja: () => void;
}

export function FabAccionesCuadra({
  onDictarVoz,
  onEscanerOcr,
  onRegistrarNacimiento,
  onRegistrarBaja,
}: Props) {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto]);

  const lanzar = (fn: () => void) => {
    setAbierto(false);
    fn();
  };

  const acciones = [
    {
      label: 'Dictar en cuadra (Voz)',
      desc: 'Partos, crotales caídos o bajas sin manos',
      icono: Mic,
      color: 'bg-amber-400 text-amber-950',
      onClick: onDictarVoz,
    },
    {
      label: 'Escanear Receta / DIB (OCR)',
      desc: 'Foto a receta PRESVET o pasaporte bovino',
      icono: FileScan,
      color: 'bg-sky-600 text-white',
      onClick: onEscanerOcr,
    },
    {
      label: 'Registrar Nacimiento',
      desc: 'Asigna próximo crotal libre automáticamente',
      icono: Baby,
      color: 'bg-emerald-700 text-white',
      onClick: onRegistrarNacimiento,
    },
    {
      label: 'Registrar Baja',
      desc: 'Comunica baja en plazo de 7 días',
      icono: FileWarning,
      color: 'bg-red-600 text-white',
      onClick: onRegistrarBaja,
    },
  ];

  return (
    <>
      {/* Fondo translúcido al desplegar */}
      {abierto && (
        <div
          onClick={() => setAbierto(false)}
          className="no-print fixed inset-0 z-30 bg-[#0b1f17]/25 backdrop-blur-[1px] transition-opacity"
        />
      )}

      <div className="no-print fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2.5 lg:bottom-6 lg:right-6">
        {abierto && (
          <div className="animate-fade-up mb-1 flex flex-col items-end gap-2">
            {acciones.map((acc) => {
              const Icono = acc.icono;
              return (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() => lanzar(acc.onClick)}
                  className="group flex items-center gap-3 rounded-2xl border border-[#dce4d6] bg-white py-2.5 pl-4 pr-3 text-left shadow-lg transition hover:border-emerald-300 hover:bg-emerald-50/40 active:scale-[0.98]"
                >
                  <div>
                    <div className="text-xs font-bold text-[#0f1f18] group-hover:text-emerald-900">
                      {acc.label}
                    </div>
                    <div className="text-[11px] text-[#52655c]">{acc.desc}</div>
                  </div>
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs ${acc.color}`}
                  >
                    <Icono className="h-5 w-5" />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-label={abierto ? 'Cerrar acciones rápidas' : 'Abrir acciones rápidas de cuadra'}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-extrabold shadow-xl transition active:scale-[0.97] ${
            abierto
              ? 'bg-[#0f1f18] text-white'
              : 'bg-gradient-to-br from-[#0f3d2e] to-[#166534] text-white hover:from-[#14532d] hover:to-[#15803d]'
          }`}
        >
          {abierto ? (
            <>
              <X className="h-5 w-5" />
              <span>Cerrar</span>
            </>
          ) : (
            <>
              <Plus className="h-5 w-5 text-amber-300" />
              <span className="hidden sm:inline">Acción rápida</span>
              <span className="sm:hidden">Cuadra</span>
            </>
          )}
        </button>
      </div>
    </>
  );
}

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import type { NivelAlerta } from '../domain/types';

export function BadgeNivel({ nivel, texto }: { nivel: NivelAlerta; texto?: string }) {
  const estilos: Record<NivelAlerta, string> = {
    CRITICA: 'bg-red-50 text-red-800 border-red-200/90',
    ATENCION: 'bg-amber-50 text-amber-900 border-amber-200/90',
    OK: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
  };
  const etiquetas: Record<NivelAlerta, string> = {
    CRITICA: 'Urgente',
    ATENCION: 'Atención',
    OK: 'En plazo',
  };
  const punto: Record<NivelAlerta, string> = {
    CRITICA: 'bg-red-600',
    ATENCION: 'bg-amber-500',
    OK: 'bg-emerald-600',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-tight ${estilos[nivel]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${punto[nivel]}`} />
      {texto ?? etiquetas[nivel]}
    </span>
  );
}

export function BotonCopiar({
  valor,
  etiqueta,
  compacto = false,
}: {
  valor: string;
  etiqueta?: string;
  compacto?: boolean;
}) {
  const [copiado, setCopiado] = useState(false);

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1600);
    } catch {
      // Fallback silencioso si no hay permisos de portapapeles
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopiar}
      title={`Copiar: ${valor}`}
      className={`inline-flex items-center gap-1.5 rounded-xl border border-[#dce4d6] bg-white font-semibold text-[#1f3329] transition hover:border-emerald-300 hover:bg-emerald-50/70 hover:text-emerald-950 active:scale-[0.98] ${
        compacto ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs'
      }`}
    >
      {copiado ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-emerald-700">Copiado</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5 text-[#70857a]" />
          <span>{etiqueta ?? valor}</span>
        </>
      )}
    </button>
  );
}

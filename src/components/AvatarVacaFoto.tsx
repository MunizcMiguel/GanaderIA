export function AvatarVacaFoto({
  fotoDataUrl,
  numeroCorto,
  nombre,
  tamano = 'md',
}: {
  fotoDataUrl: string;
  numeroCorto: string;
  nombre?: string;
  tamano?: 'sm' | 'md' | 'lg';
}) {
  const dims =
    tamano === 'sm'
      ? 'h-13 w-13'
      : tamano === 'lg'
        ? 'h-28 w-28'
        : 'h-16 w-16';

  const crotalClases =
    tamano === 'sm'
      ? '-bottom-1 px-1.5 py-0.5 text-[9px] border'
      : tamano === 'lg'
        ? '-bottom-2 px-3 py-0.5 text-sm border-2'
        : '-bottom-1.5 px-2 py-0.5 text-[10px] border';

  return (
    <div className={`relative inline-flex shrink-0 items-center justify-center ${dims}`}>
      {/* Círculo verde con fondo blanco y la silueta de la vaca recortada */}
      <div className="h-full w-full overflow-hidden rounded-full border-[3px] border-[#15803d] bg-white shadow-xs">
        <img
          src={fotoDataUrl}
          alt={nombre || `Vaca #${numeroCorto}`}
          className="h-full w-full object-contain p-0.5"
        />
      </div>

      {/* Crotal amarillo con el número en la parte inferior */}
      <span
        className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border-[#ca8a04] bg-[#facc15] font-mono font-black leading-none tracking-tight text-[#422006] shadow-xs ${crotalClases}`}
      >
        {numeroCorto}
      </span>
    </div>
  );
}

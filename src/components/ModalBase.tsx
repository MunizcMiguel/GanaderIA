import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function ModalBase({
  children,
  onCerrar,
  maxWidthClass = 'max-w-lg',
}: {
  children: ReactNode;
  onCerrar: () => void;
  maxWidthClass?: string;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCerrar]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[#0b1f17]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
    >
      <div
        className={`animate-scale-in max-h-[92vh] w-full overflow-y-auto ${maxWidthClass} rounded-t-3xl border border-[#dce4d6] bg-white shadow-2xl sm:my-auto sm:rounded-2xl`}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-[#dce4d6] sm:hidden" />
        {children}
      </div>
    </div>,
    document.body,
  );
}

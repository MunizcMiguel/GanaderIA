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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0b1f17]/55 p-4 backdrop-blur-[2px]"
    >
      <div
        className={`animate-scale-in my-auto w-full ${maxWidthClass} rounded-2xl border border-[#dce4d6] bg-white shadow-2xl`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";

export function ServicePhoto({ imageUrl, name, description }: { imageUrl: string | null; name: string; description: string | null }) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("keydown", esc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = overflow; };
  }, [aberto]);

  if (!imageUrl) return null;

  function abrir(e: SyntheticEvent) {
    e.stopPropagation();
    e.preventDefault();
    setAberto(true);
  }

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        aria-label={`Ver foto de ${name}`}
        onClick={abrir}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") abrir(e); }}
        className="relative block h-16 w-16 shrink-0 cursor-zoom-in overflow-hidden rounded-lg"
      >
        <img src={imageUrl} alt={name} loading="lazy" className="h-full w-full object-cover" />
        <span className="absolute inset-x-0 bottom-0 bg-ink/60 py-0.5 text-center text-[10px] font-medium text-white">O que é?</span>
      </span>
      {aberto && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => { e.stopPropagation(); setAberto(false); }}
          role="dialog"
          aria-modal="true"
          aria-label={name}
        >
          <div className="max-h-full w-full max-w-md overflow-auto rounded-xl bg-white" onClick={(e) => e.stopPropagation()}>
            <img src={imageUrl} alt={name} className="max-h-[60vh] w-full object-cover" />
            <div className="space-y-2 p-4">
              <p className="font-semibold">{name}</p>
              {description && <p className="text-sm text-ink/80">{description}</p>}
              <button type="button" className="btn-primary w-full" onClick={(e) => { e.stopPropagation(); setAberto(false); }}>Fechar</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

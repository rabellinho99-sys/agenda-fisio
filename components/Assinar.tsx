"use client";

import { useRef, useState } from "react";

export function Assinar({ onChange }: { onChange: (svg: string | null) => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const [tracos, setTracos] = useState<string[]>([]);
  const [atual, setAtual] = useState<string>("");
  const desenhando = useRef(false);

  function ponto(e: React.PointerEvent) {
    const r = ref.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 600;
    const y = ((e.clientY - r.top) / r.height) * 200;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }

  function emitir(lista: string[]) {
    if (lista.length === 0) return onChange(null);
    const paths = lista.map((d) => `<path d="${d}" fill="none" stroke="#10221d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
    onChange(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200">${paths}</svg>`);
  }

  return (
    <div>
      <svg
        ref={ref}
        viewBox="0 0 600 200"
        className="h-40 w-full touch-none rounded-lg border border-mist bg-white"
        onPointerDown={(e) => { desenhando.current = true; (e.target as Element).setPointerCapture(e.pointerId); setAtual(`M${ponto(e)}`); }}
        onPointerMove={(e) => { if (desenhando.current) setAtual((a) => `${a} L${ponto(e)}`); }}
        onPointerUp={() => {
          if (!desenhando.current) return;
          desenhando.current = false;
          const lista = [...tracos, atual];
          setTracos(lista); setAtual(""); emitir(lista);
        }}
      >
        <line x1="40" x2="560" y1="160" y2="160" stroke="#d3ddd8" />
        {[...tracos, atual].filter(Boolean).map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#10221d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-ink/60">Assine com o dedo ou o mouse.</p>
        <button className="text-sm text-danger" onClick={() => { setTracos([]); setAtual(""); onChange(null); }}>Limpar</button>
      </div>
    </div>
  );
}

export function Markdown({ texto }: { texto: string }) {
  const linhas = texto.split("\n");
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {linhas.map((l, i) => {
        if (!l.trim()) return null;
        if (l.startsWith("### ")) return <h3 key={i} className="h-title pt-1 text-lg">{l.slice(4)}</h3>;
        if (l.startsWith("## ")) return <h2 key={i} className="h-title pt-2 text-xl">{l.slice(3)}</h2>;
        const partes = l.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="text-ink/85">
            {partes.map((p, j) => p.startsWith("**") && p.endsWith("**")
              ? <strong key={j} className="text-ink">{p.slice(2, -2)}</strong>
              : <span key={j}>{p}</span>)}
          </p>
        );
      })}
    </div>
  );
}

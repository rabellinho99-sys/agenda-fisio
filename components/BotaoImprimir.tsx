"use client";

export function BotaoImprimir() {
  return (
    <button type="button" className="btn-primary" onClick={() => window.print()}>
      Baixar PDF ou imprimir
    </button>
  );
}

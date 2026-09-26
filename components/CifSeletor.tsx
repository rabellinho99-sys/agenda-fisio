"use client";

import { useMemo, useState } from "react";
import {
  COMPONENTES,
  REGIOES,
  codigoComQualificador,
  descricaoQualificador,
  opcoesQualificador,
  ordenarItens,
  type CifCodigo,
  type CifComponente,
  type CifItem,
} from "@/lib/cif";

type Props = {
  catalogo: CifCodigo[];
  itens: CifItem[];
  aoMudar: (itens: CifItem[]) => void;
};

export function CifSeletor({ catalogo, itens, aoMudar }: Props) {
  const [regiao, setRegiao] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [manual, setManual] = useState({ code: "", title: "" });

  const marcados = useMemo(() => new Map(itens.map((i) => [i.code, i])), [itens]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return catalogo
      .filter((c) => {
        if (termo) return c.code.toLowerCase().includes(termo) || c.title.toLowerCase().includes(termo);
        if (regiao) return c.regions.includes(regiao) || c.regions.includes("geral");
        return false;
      })
      .sort((a, b) => a.sort - b.sort);
  }, [catalogo, regiao, busca]);

  function alternar(c: CifCodigo) {
    if (marcados.has(c.code)) {
      aoMudar(itens.filter((i) => i.code !== c.code));
    } else {
      const padrao = c.component === "e" ? "1" : "2";
      aoMudar([...itens, { code: c.code, title: c.title, component: c.component, q: padrao }]);
    }
  }

  function qualificar(code: string, q: string) {
    aoMudar(itens.map((i) => (i.code === code ? { ...i, q } : i)));
  }

  function adicionarManual() {
    const code = manual.code.trim().toLowerCase();
    const letra = code.charAt(0) as CifComponente;
    if (!/^[bsde]\d{3,5}$/.test(code) || !manual.title.trim()) return;
    if (marcados.has(code)) return;
    aoMudar([...itens, { code, title: manual.title.trim(), component: letra, q: letra === "e" ? "1" : "2" }]);
    setManual({ code: "", title: "" });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">1. Escolha a região ou busque pelo nome ou código</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {REGIOES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { setRegiao(regiao === r.id ? null : r.id); setBusca(""); }}
              className={`rounded-full border px-3 py-1 text-sm ${
                regiao === r.id ? "border-ink bg-ink text-white" : "border-ink/20 bg-white"
              }`}
            >
              {r.nome}
            </button>
          ))}
        </div>
        <input
          className="field mt-2 w-full"
          placeholder="Buscar: dor, marcha, joelho, d450..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {lista.length > 0 && (
        <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border border-ink/10 p-3">
          <p className="text-sm font-semibold">2. Marque o que se aplica ao paciente</p>
          {COMPONENTES.map((comp) => {
            const doGrupo = lista.filter((c) => c.component === comp.id);
            if (!doGrupo.length) return null;
            return (
              <div key={comp.id}>
                <p className="text-xs font-semibold text-ink/60">{comp.nome}</p>
                <ul className="mt-1 space-y-1">
                  {doGrupo.map((c) => (
                    <li key={c.code}>
                      <label className="flex cursor-pointer items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={marcados.has(c.code)}
                          onChange={() => alternar(c)}
                        />
                        <span>
                          <span className="font-mono text-xs text-ink/60">{c.code}</span> {c.title}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <p className="text-sm font-semibold">3. Ajuste o grau de cada item</p>
        {itens.length === 0 ? (
          <p className="mt-1 text-sm text-ink/60">Nenhum código marcado. A CIF é opcional no documento.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {ordenarItens(itens).map((i) => (
              <li key={i.code} className="flex flex-wrap items-center gap-2 rounded-lg bg-paper px-3 py-2 text-sm">
                <span className="font-mono text-xs">{codigoComQualificador(i)}</span>
                <span className="min-w-40 flex-1">
                  {i.title} <span className="text-ink/60">({descricaoQualificador(i)})</span>
                </span>
                <select
                  className="field w-auto text-sm"
                  value={i.q}
                  onChange={(e) => qualificar(i.code, e.target.value)}
                >
                  {opcoesQualificador(i.component).map((o) => (
                    <option key={o.v} value={o.v}>{o.rotulo}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="text-danger"
                  onClick={() => aoMudar(itens.filter((x) => x.code !== i.code))}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-ink/70">Adicionar um código que não está na lista</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            className="field w-28"
            placeholder="b28016"
            value={manual.code}
            onChange={(e) => setManual({ ...manual, code: e.target.value })}
          />
          <input
            className="field min-w-48 flex-1"
            placeholder="Descrição oficial do código"
            value={manual.title}
            onChange={(e) => setManual({ ...manual, title: e.target.value })}
          />
          <button type="button" className="btn-ghost text-sm" onClick={adicionarManual}>Adicionar</button>
        </div>
        <p className="mt-1 text-xs text-ink/60">
          O código começa com b, s, d ou e, seguido de 3 a 5 números.
        </p>
      </details>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  CRITERIOS_NEXO,
  FUNCOES,
  INCAPACIDADES,
  separarQuesitos,
  type Criterio,
  type Pericia,
  type Quesito,
} from "@/lib/documentos";

type Props = { valor: Pericia; aoMudar: (p: Pericia) => void; tipo: "parecer" | "laudo" };

const ORIGENS = ["do Juízo", "da parte autora", "da parte ré", "do INSS", "do Ministério Público"];

export function PericiaCampos({ valor, aoMudar, tipo }: Props) {
  const [colado, setColado] = useState("");
  const [origemColado, setOrigemColado] = useState(ORIGENS[0]);
  const set = (m: Partial<Pericia>) => aoMudar({ ...valor, ...m });
  const setQ = (id: string, m: Partial<Quesito>) =>
    set({ quesitos: valor.quesitos.map((q) => (q.id === id ? { ...q, ...m } : q)) });

  function separar() {
    const novos = separarQuesitos(colado, origemColado);
    if (!novos.length) return;
    set({ quesitos: [...valor.quesitos, ...novos] });
    setColado("");
  }

  const particular = valor.funcao === "particular";
  const temporaria = valor.incapacidade.endsWith("temporaria");

  return (
    <div className="space-y-5">
      {/* função e processo */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="label" htmlFor="funcao">Sua função neste documento</label>
          <select id="funcao" className="field w-full" value={valor.funcao}
            onChange={(e) => set({ funcao: e.target.value as Pericia["funcao"] })}>
            {FUNCOES.filter((f) => tipo === "parecer" || f.id === "perito").map((f) => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
        </div>
        {particular ? (
          <div className="md:col-span-2">
            <label className="label" htmlFor="solic">Quem solicitou o parecer</label>
            <input id="solic" className="field w-full" placeholder="Ex.: o(a) próprio(a) examinado(a), o escritório Fulano Advogados"
              value={valor.solicitante} onChange={(e) => set({ solicitante: e.target.value })} />
          </div>
        ) : (
          <>
            <div>
              <label className="label" htmlFor="num">Número do processo</label>
              <input id="num" className="field w-full" placeholder="0000000-00.0000.0.00.0000"
                value={valor.numero} onChange={(e) => set({ numero: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="juizo">Vara, juízo ou órgão</label>
              <input id="juizo" className="field w-full" placeholder="2ª Vara Cível de Governador Valadares"
                value={valor.juizo} onChange={(e) => set({ juizo: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="autor">Parte autora</label>
              <input id="autor" className="field w-full" value={valor.autor} onChange={(e) => set({ autor: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="reu">Parte ré</label>
              <input id="reu" className="field w-full" placeholder="Ex.: INSS, Empresa X Ltda."
                value={valor.reu} onChange={(e) => set({ reu: e.target.value })} />
            </div>
          </>
        )}
        <div>
          <label className="label" htmlFor="dataEx">Data do exame</label>
          <input id="dataEx" type="date" className="field w-full" value={valor.dataExame}
            onChange={(e) => set({ dataExame: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="localEx">Local do exame</label>
          <input id="localEx" className="field w-full" placeholder="consultório, sede da empresa, domicílio"
            value={valor.localExame} onChange={(e) => set({ localExame: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="docs">Documentos analisados (um por linha)</label>
          <textarea id="docs" className="field w-full" rows={3}
            placeholder={"Petição inicial\nLaudo médico de 10/06/2026\nComunicação de Acidente de Trabalho (CAT)"}
            value={valor.documentos} onChange={(e) => set({ documentos: e.target.value })} />
        </div>
      </div>

      {/* nexo */}
      <div>
        <p className="text-sm font-semibold">Critérios de nexo de causalidade (opcional)</p>
        <p className="text-xs text-ink/60">O que você marcar vira um parágrafo pronto na Discussão.</p>
        <div className="mt-2 space-y-2">
          {CRITERIOS_NEXO.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-paper px-3 py-2 text-sm">
              <span className="min-w-52 flex-1">
                <span className="font-semibold">{c.nome}</span>
                <span className="block text-xs text-ink/60">{c.explicacao}</span>
              </span>
              <select className="field w-auto" value={valor.nexo[c.id]}
                onChange={(e) => set({ nexo: { ...valor.nexo, [c.id]: e.target.value as Criterio } })}>
                <option value="">Não avaliar</option>
                <option value="sim">Presente</option>
                <option value="nao">Ausente</option>
                <option value="inconclusivo">Inconclusivo</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* capacidade */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-3">
          <p className="text-sm font-semibold">Conclusão sobre a capacidade funcional para a atividade habitual</p>
          <p className="text-xs text-ink/60">Opcional. Gera a frase da Conclusão, que você pode editar.</p>
        </div>
        <div>
          <label className="label" htmlFor="incap">Situação</label>
          <select id="incap" className="field w-full" value={valor.incapacidade}
            onChange={(e) => set({ incapacidade: e.target.value as Pericia["incapacidade"] })}>
            {INCAPACIDADES.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
          </select>
        </div>
        {valor.incapacidade && valor.incapacidade !== "sem" && (
          <div>
            <label className="label" htmlFor="dii">Início estimado</label>
            <input id="dii" type="date" className="field w-full" value={valor.dataInicio}
              onChange={(e) => set({ dataInicio: e.target.value })} />
          </div>
        )}
        {temporaria && (
          <div>
            <label className="label" htmlFor="reav">Reavaliar em (meses)</label>
            <input id="reav" type="number" min={1} className="field w-full" value={valor.reavaliacaoMeses}
              onChange={(e) => set({ reavaliacaoMeses: e.target.value })} />
          </div>
        )}
      </div>

      {/* quesitos */}
      <div>
        <p className="text-sm font-semibold">Quesitos</p>
        <p className="text-xs text-ink/60">
          Cole os quesitos como vieram no processo. O sistema separa um por um pela numeração (1., 2), a), b)...).
        </p>
        <div className="mt-2 space-y-2 rounded-lg border border-ink/10 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm" htmlFor="origem">Quesitos</label>
            <select id="origem" className="field w-auto" value={origemColado} onChange={(e) => setOrigemColado(e.target.value)}>
              {ORIGENS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <textarea className="field w-full" rows={4} placeholder={"1. O periciando apresenta lesão?\n2. Há nexo com o acidente?"}
            value={colado} onChange={(e) => setColado(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost text-sm" onClick={separar} disabled={!colado.trim()}>
              Separar quesitos
            </button>
            <button type="button" className="text-sm underline underline-offset-4"
              onClick={() => set({ quesitos: [...valor.quesitos, { id: `q-${Date.now()}`, origem: origemColado, pergunta: "", resposta: "" }] })}>
              Adicionar um quesito em branco
            </button>
          </div>
        </div>

        {valor.quesitos.length > 0 && (
          <ol className="mt-3 space-y-3">
            {valor.quesitos.map((q, i) => (
              <li key={q.id} className="rounded-lg bg-paper p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">Quesito {i + 1}</span>
                  <select className="field w-auto text-sm" value={q.origem} onChange={(e) => setQ(q.id, { origem: e.target.value })}>
                    {[...new Set([...ORIGENS, q.origem])].map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <button type="button" className="ml-auto text-sm text-danger"
                    onClick={() => set({ quesitos: valor.quesitos.filter((x) => x.id !== q.id) })}>
                    Remover
                  </button>
                </div>
                <textarea className="field mt-2 w-full" rows={2} placeholder="Pergunta" value={q.pergunta}
                  onChange={(e) => setQ(q.id, { pergunta: e.target.value })} />
                <textarea className="field mt-2 w-full" rows={2} placeholder="Sua resposta" value={q.resposta}
                  onChange={(e) => setQ(q.id, { resposta: e.target.value })} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

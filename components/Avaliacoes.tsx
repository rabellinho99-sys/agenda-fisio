"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { REGIOES, type CifItem } from "@/lib/cif";
import {
  CLASSES,
  OXFORD,
  cifDaForca,
  classificar,
  type LinhaForca,
  type Metodo,
  type Qualificador,
  type ResultadoOrto,
} from "@/lib/forca";

type Paciente = { id: string; full_name: string; cpf: string | null };
type Teste = { code: string; name: string; region: string; how: string; suggests: string; sort: number };
type Grupo = { code: string; name: string; region: string; cif_code: string; sort: number };
type Avaliacao = {
  id: string;
  performed_at: string;
  ortho_results: ResultadoOrto[];
  strength_results: LinhaForca[];
  cif_items: CifItem[];
  notes: string | null;
};

type Props = {
  clinicId: string;
  professionalId: string | null;
  pacientes: Paciente[];
  testes: Teste[];
  grupos: Grupo[];
  titulosCif: Record<string, string>;
};

const TZ = "America/Sao_Paulo";
const dataBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: TZ });
const hojeISO = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
const REGIOES_TESTE = REGIOES.filter((r) => r.id !== "geral" && r.id !== "toracica");

function Selo({ q }: { q: Qualificador }) {
  const c = CLASSES[q];
  return (
    <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: c.cor, color: c.texto }}>
      {c.nome}
    </span>
  );
}

function Legenda() {
  return (
    <div className="flex flex-wrap gap-2">
      {([0, 1, 2, 3, 4] as Qualificador[]).map((q) => <Selo key={q} q={q} />)}
    </div>
  );
}

const RESULTADOS: { v: ResultadoOrto["d"]; rotulo: string }[] = [
  { v: "", rotulo: "Não testado" },
  { v: "negativo", rotulo: "Negativo" },
  { v: "positivo", rotulo: "Positivo" },
  { v: "inconclusivo", rotulo: "Inconclusivo" },
];

export function Avaliacoes({ clinicId, professionalId, pacientes, testes, grupos, titulosCif }: Props) {
  const supabase = createClient();
  const [pacienteId, setPacienteId] = useState("");
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState<Avaliacao[]>([]);
  const [carregando, setCarregando] = useState(false);

  // editor
  const [editando, setEditando] = useState<string | "nova" | null>(null);
  const [data, setData] = useState(hojeISO());
  const [regioesOrto, setRegioesOrto] = useState<string[]>([]);
  const [orto, setOrto] = useState<Record<string, ResultadoOrto>>({});
  const [forca, setForca] = useState<LinhaForca[]>([]);
  const [grupoNovo, setGrupoNovo] = useState("");
  const [metodoPadrao, setMetodoPadrao] = useState<Metodo>("oxford");
  const [notas, setNotas] = useState("");
  const [atualizarCif, setAtualizarCif] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const paciente = pacientes.find((p) => p.id === pacienteId) ?? null;
  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return (t ? pacientes.filter((p) => p.full_name.toLowerCase().includes(t) || (p.cpf ?? "").includes(t)) : pacientes).slice(0, 30);
  }, [pacientes, busca]);

  async function carregar(id: string) {
    setCarregando(true);
    const { data } = await supabase
      .from("physical_assessments")
      .select("id, performed_at, ortho_results, strength_results, cif_items, notes")
      .eq("patient_id", id)
      .order("performed_at", { ascending: false });
    setLista((data as Avaliacao[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    if (pacienteId) carregar(pacienteId);
    else setLista([]);
    setEditando(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  function abrir(a: Avaliacao | null) {
    setMsg(null);
    if (!a) {
      setEditando("nova");
      setData(hojeISO());
      setRegioesOrto([]);
      setOrto({});
      setForca([]);
      setNotas("");
      return;
    }
    setEditando(a.id);
    setData(a.performed_at.slice(0, 10));
    const mapa: Record<string, ResultadoOrto> = {};
    for (const r of a.ortho_results ?? []) mapa[r.code] = r;
    setOrto(mapa);
    setRegioesOrto([...new Set((a.ortho_results ?? []).map((r) => r.region))]);
    setForca(a.strength_results ?? []);
    setNotas(a.notes ?? "");
  }

  function marcarOrto(t: Teste, lado: "d" | "e" | "obs", valor: string) {
    setOrto((o) => {
      const atual = o[t.code] ?? { code: t.code, name: t.name, region: t.region, d: "", e: "", obs: "" };
      return { ...o, [t.code]: { ...atual, [lado]: valor } as ResultadoOrto };
    });
  }

  function adicionarGrupo(code: string) {
    const g = grupos.find((x) => x.code === code);
    if (!g) return;
    setForca((f) => [
      ...f,
      {
        id: `f-${Date.now()}`,
        code: g.code,
        name: g.name,
        cif_code: g.cif_code,
        metodo: g.code === "preensao" ? "dinamometria" : metodoPadrao,
        d: "",
        e: "",
        referencia: "",
        unidade: "kgf",
      },
    ]);
    setGrupoNovo("");
  }

  function mudarLinha(id: string, m: Partial<LinhaForca>) {
    setForca((f) => f.map((l) => (l.id === id ? { ...l, ...m } : l)));
  }

  const cifGerada = useMemo(() => cifDaForca(forca, titulosCif), [forca, titulosCif]);
  const ortoPreenchidos = Object.values(orto).filter((r) => r.d || r.e);

  async function salvar() {
    if (!paciente) return;
    setSalvando(true);
    setMsg(null);
    const registro = {
      clinic_id: clinicId,
      patient_id: paciente.id,
      professional_id: professionalId,
      performed_at: new Date(`${data}T12:00:00-03:00`).toISOString(),
      ortho_results: ortoPreenchidos,
      strength_results: forca.filter((l) => classificar(l)),
      cif_items: cifGerada,
      notes: notas.trim() || null,
    };
    const r =
      editando && editando !== "nova"
        ? await supabase.from("physical_assessments").update(registro).eq("id", editando)
        : await supabase.from("physical_assessments").insert(registro).select("id").single();
    if (r.error) {
      setSalvando(false);
      return setMsg({ tipo: "erro", texto: `Não foi possível salvar: ${r.error.message}` });
    }

    if (atualizarCif && cifGerada.length) {
      const { data: ultima } = await supabase
        .from("patient_cif")
        .select("items")
        .eq("patient_id", paciente.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const atuais = ((ultima?.items as CifItem[] | undefined) ?? []).filter(
        (i) => !cifGerada.some((g) => g.code === i.code)
      );
      await supabase.from("patient_cif").insert({
        clinic_id: clinicId,
        patient_id: paciente.id,
        professional_id: professionalId,
        items: [...atuais, ...cifGerada],
      });
    }

    setSalvando(false);
    setMsg({
      tipo: "ok",
      texto: atualizarCif && cifGerada.length
        ? "Avaliação salva e CIF do paciente atualizada. Já aparece nos documentos."
        : "Avaliação salva. Já aparece nos documentos.",
    });
    if (editando === "nova" && "data" in r && r.data) setEditando((r.data as { id: string }).id);
    carregar(paciente.id);
  }

  async function excluir() {
    if (!editando || editando === "nova") return;
    if (!window.confirm("Excluir esta avaliação? Documentos já emitidos não são alterados.")) return;
    await supabase.from("physical_assessments").delete().eq("id", editando);
    setEditando(null);
    if (paciente) carregar(paciente.id);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="h-title text-2xl">Testes ortopédicos e força muscular</h1>
        <p className="mt-1 text-sm text-ink/70">
          Registre os testes e a força. A classificação e a codificação CIF saem sozinhas e vão para os documentos.
        </p>
      </div>

      {/* paciente */}
      <section className="rounded-xl bg-white p-4">
        <p className="text-base font-extrabold">Paciente</p>
        {paciente ? (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold">{paciente.full_name}</span>
            <button className="underline underline-offset-4" onClick={() => setPacienteId("")}>Trocar</button>
          </div>
        ) : (
          <div className="mt-2">
            <input className="field w-full" placeholder="Digite o nome ou CPF" value={busca}
              onChange={(e) => setBusca(e.target.value)} autoFocus />
            <ul className="mt-2 max-h-60 overflow-y-auto">
              {filtrados.map((p) => (
                <li key={p.id}>
                  <button className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-paper" onClick={() => setPacienteId(p.id)}>
                    {p.full_name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {paciente && !editando && (
        <section className="rounded-xl bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-extrabold">Avaliações</p>
            <button className="btn-primary text-sm" onClick={() => abrir(null)}>Nova avaliação</button>
          </div>
          {carregando ? (
            <p className="mt-3 text-sm text-ink/60">Carregando...</p>
          ) : lista.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">Nenhuma avaliação registrada para este paciente.</p>
          ) : (
            <ul className="mt-3 divide-y divide-ink/10">
              {lista.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <span className="font-semibold">{dataBR(a.performed_at)}</span>
                  <span className="text-ink/60">
                    {a.ortho_results.length} testes, {a.strength_results.length} grupos musculares
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {a.cif_items.map((i) => (
                      <Selo key={i.code} q={Number(i.q) as Qualificador} />
                    ))}
                  </span>
                  <button className="ml-auto underline underline-offset-4" onClick={() => abrir(a)}>Abrir</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {paciente && editando && (
        <>
          <section className="rounded-xl bg-white p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label" htmlFor="data">Data da avaliação</label>
                <input id="data" type="date" className="field" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
              <button className="btn-ghost ml-auto text-sm" onClick={() => setEditando(null)}>Voltar para a lista</button>
            </div>
          </section>

          {/* testes ortopédicos */}
          <section className="rounded-xl bg-white p-4">
            <p className="text-base font-extrabold">Testes ortopédicos</p>
            <p className="mt-1 text-xs text-ink/60">Escolha as regiões avaliadas e marque o resultado de cada lado.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {REGIOES_TESTE.map((r) => {
                const ativo = regioesOrto.includes(r.id);
                return (
                  <button key={r.id} type="button"
                    onClick={() => setRegioesOrto(ativo ? regioesOrto.filter((x) => x !== r.id) : [...regioesOrto, r.id])}
                    className={`rounded-full border px-3 py-1 text-sm ${ativo ? "border-ink bg-ink text-white" : "border-ink/20 bg-white"}`}>
                    {r.nome}
                  </button>
                );
              })}
            </div>

            {regioesOrto.map((reg) => (
              <div key={reg} className="mt-4">
                <p className="text-sm font-semibold">{REGIOES.find((r) => r.id === reg)?.nome}</p>
                <div className="mt-2 space-y-2">
                  {testes.filter((t) => t.region === reg).map((t) => {
                    const r = orto[t.code];
                    const positivo = r?.d === "positivo" || r?.e === "positivo";
                    return (
                      <div key={t.code} className={`rounded-lg p-3 text-sm ${positivo ? "bg-blush" : "bg-paper"}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="min-w-48 flex-1">
                            <span className="font-semibold">{t.name}</span>
                            <span className="block text-xs text-ink/60">{t.how} Positivo sugere: {t.suggests}</span>
                          </span>
                          <label className="text-xs">D
                            <select className="field ml-1 w-auto text-sm" value={r?.d ?? ""}
                              onChange={(e) => marcarOrto(t, "d", e.target.value)}>
                              {RESULTADOS.map((o) => <option key={o.v} value={o.v}>{o.rotulo}</option>)}
                            </select>
                          </label>
                          <label className="text-xs">E
                            <select className="field ml-1 w-auto text-sm" value={r?.e ?? ""}
                              onChange={(e) => marcarOrto(t, "e", e.target.value)}>
                              {RESULTADOS.map((o) => <option key={o.v} value={o.v}>{o.rotulo}</option>)}
                            </select>
                          </label>
                        </div>
                        {(r?.d || r?.e) && (
                          <input className="field mt-2 w-full text-sm" placeholder="Observação (opcional)" value={r?.obs ?? ""}
                            onChange={(e) => marcarOrto(t, "obs", e.target.value)} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          {/* força */}
          <section className="rounded-xl bg-white p-4">
            <p className="text-base font-extrabold">Força muscular</p>
            <p className="mt-1 text-xs text-ink/60">
              Oxford: 5 sem deficiência, 4 leve, 3 moderada, 2 e 1 grave, 0 completa. Dinamometria: déficit em relação ao outro lado
              ou a um valor de referência (0 a 4% sem deficiência, 5 a 24% leve, 25 a 49% moderada, 50 a 95% grave, 96 a 100% completa).
            </p>
            <div className="mt-3"><Legenda /></div>

            <div className="mt-4 flex flex-wrap items-end gap-2">
              <div className="min-w-60 flex-1">
                <label className="label" htmlFor="grupo">Adicionar grupo muscular</label>
                <select id="grupo" className="field w-full" value={grupoNovo} onChange={(e) => adicionarGrupo(e.target.value)}>
                  <option value="">Escolha...</option>
                  {REGIOES_TESTE.map((r) => (
                    <optgroup key={r.id} label={r.nome}>
                      {grupos.filter((g) => g.region === r.id).map((g) => (
                        <option key={g.code} value={g.code}>{g.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="metodo">Método padrão</label>
                <select id="metodo" className="field" value={metodoPadrao} onChange={(e) => setMetodoPadrao(e.target.value as Metodo)}>
                  <option value="oxford">Escala de Oxford</option>
                  <option value="dinamometria">Dinamometria</option>
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {forca.map((l) => {
                const c = classificar(l);
                return (
                  <div key={l.id} className="rounded-lg border-l-4 bg-paper p-3 text-sm"
                    style={{ borderLeftColor: c ? CLASSES[c.q].cor : "transparent" }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex-1 font-semibold">{l.name}</span>
                      <select className="field w-auto text-sm" value={l.metodo}
                        onChange={(e) => mudarLinha(l.id, { metodo: e.target.value as Metodo, d: "", e: "" })}>
                        <option value="oxford">Oxford</option>
                        <option value="dinamometria">Dinamometria</option>
                      </select>
                      <button className="text-danger" onClick={() => setForca(forca.filter((x) => x.id !== l.id))}>Remover</button>
                    </div>

                    {l.metodo === "oxford" ? (
                      <div className="mt-2 flex flex-wrap gap-3">
                        {(["d", "e"] as const).map((lado) => (
                          <label key={lado} className="text-xs">{lado === "d" ? "Direito" : "Esquerdo"}
                            <select className="field ml-1 w-auto text-sm" value={l[lado]}
                              onChange={(e) => mudarLinha(l.id, { [lado]: e.target.value })}>
                              <option value="">Não testado</option>
                              {OXFORD.map((o) => <option key={o.v} value={o.v}>{o.rotulo}</option>)}
                            </select>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap items-end gap-3">
                        {(["d", "e"] as const).map((lado) => (
                          <label key={lado} className="text-xs">{lado === "d" ? "Direito" : "Esquerdo"}
                            <input type="number" step="0.1" min={0} className="field ml-1 w-24 text-sm" value={l[lado]}
                              onChange={(e) => mudarLinha(l.id, { [lado]: e.target.value })} />
                          </label>
                        ))}
                        <label className="text-xs">Referência (opcional)
                          <input type="number" step="0.1" min={0} className="field ml-1 w-24 text-sm" value={l.referencia}
                            onChange={(e) => mudarLinha(l.id, { referencia: e.target.value })} />
                        </label>
                        <select className="field w-auto text-sm" value={l.unidade} onChange={(e) => mudarLinha(l.id, { unidade: e.target.value })}>
                          <option value="kgf">kgf</option>
                          <option value="N">N</option>
                          <option value="lb">lb</option>
                        </select>
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {c ? (
                        <>
                          <Selo q={c.q} />
                          {c.deficit !== null && <span>Déficit de {c.deficit}%</span>}
                          {c.lado && c.lado !== "ambos" && <span>lado {c.lado === "D" ? "direito" : "esquerdo"}</span>}
                          <span className="font-mono text-ink/60">CIF {l.cif_code}.{c.q}</span>
                        </>
                      ) : (
                        <span className="text-ink/60">
                          {l.metodo === "dinamometria"
                            ? "Preencha os dois lados, ou um lado e o valor de referência."
                            : "Marque o grau de pelo menos um lado."}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {cifGerada.length > 0 && (
              <div className="mt-4 rounded-lg border border-ink/10 p-3">
                <p className="text-sm font-semibold">Codificação CIF gerada</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {cifGerada.map((i) => (
                    <li key={i.code} className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs">{i.code}.{i.q}</span>
                      <span>{i.title}</span>
                      <Selo q={Number(i.q) as Qualificador} />
                    </li>
                  ))}
                </ul>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={atualizarCif} onChange={(e) => setAtualizarCif(e.target.checked)} />
                  Atualizar a CIF do paciente com este resultado (vem marcada nos próximos documentos)
                </label>
              </div>
            )}
          </section>

          <section className="rounded-xl bg-white p-4">
            <label className="label" htmlFor="notas">Observações da avaliação (opcional)</label>
            <textarea id="notas" className="field w-full" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)}
              placeholder="Ex.: dor durante o teste de força do quadríceps direito, avaliação limitada por dor." />
          </section>

          <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-3 rounded-xl bg-white p-3 shadow-lg">
            {msg && <p role="status" className={`mr-auto text-sm ${msg.tipo === "erro" ? "text-danger" : ""}`}>{msg.texto}</p>}
            {editando !== "nova" && <button className="text-sm text-danger" onClick={excluir}>Excluir</button>}
            <button className="btn-primary" onClick={salvar}
              disabled={salvando || (ortoPreenchidos.length === 0 && !forca.some((l) => classificar(l)))}>
              {salvando ? "Salvando" : "Salvar avaliação"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CifSeletor } from "@/components/CifSeletor";
import {
  codigoComQualificador,
  descricaoQualificador,
  ordenarItens,
  type CifCodigo,
  type CifItem,
} from "@/lib/cif";

export type TipoDoc = "declaracao" | "atestado" | "relatorio" | "encaminhamento";

type Paciente = { id: string; full_name: string; cpf: string | null; birth_date: string | null };

type DocLista = {
  id: string;
  number: number;
  title: string;
  doc_type: TipoDoc;
  issued_at: string;
  patient_id: string;
  body: Corpo;
  cif: CifItem[];
  patients: { full_name: string } | null;
};

type Secao = { titulo: string; texto: string };
type Corpo = { secoes: Secao[]; cid?: string | null; cid_autorizado?: boolean };

type Props = {
  pacientes: Paciente[];
  documentos: DocLista[];
  catalogo: CifCodigo[];
  cidadeClinica: string;
};

type Nota = {
  created_at: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  procedures: unknown;
  pain_before: number | null;
  pain_after: number | null;
};

type Anamnese = {
  created_at: string;
  answers: Record<string, unknown> | null;
  fields_snapshot: { key: string; label: string; type?: string }[] | null;
};

type Atendimento = { id: string; starts_at: string; ends_at: string; status: string };

type Prontuario = {
  anamnese: Anamnese | null;
  notas: Nota[];
  atendimentos: Atendimento[];
  cif: CifItem[];
};

const TIPOS: { id: TipoDoc; nome: string; descricao: string }[] = [
  { id: "declaracao", nome: "Declaração de comparecimento", descricao: "Confirma presença no atendimento, sem informação clínica." },
  { id: "atestado", nome: "Atestado", descricao: "Afastamento ou aptidão funcional por um período." },
  { id: "relatorio", nome: "Relatório fisioterapêutico", descricao: "Resumo do acompanhamento, com evolução e condutas." },
  { id: "encaminhamento", nome: "Encaminhamento", descricao: "Para médico ou outro profissional, com resumo clínico." },
];

const TZ = "America/Sao_Paulo";
const dataBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: TZ });
const horaBR = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const hojeISO = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
const isoParaBR = (d: string) => (d ? d.split("-").reverse().join("/") : "");

function idade(nasc: string | null) {
  if (!nasc) return null;
  const n = new Date(nasc + "T12:00:00");
  const h = new Date();
  let a = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) a--;
  return a;
}

function textoResposta(v: unknown) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "boolean") return v ? "sim" : "não";
  return String(v).trim();
}

function nomesProcedimentos(p: unknown): string[] {
  if (!p) return [];
  const arr = Array.isArray(p) ? p : [p];
  return arr
    .map((x) => {
      if (typeof x === "string") return x;
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        return String(o.name ?? o.nome ?? o.label ?? o.procedure ?? o.procedimento ?? "");
      }
      return "";
    })
    .map((s) => s.trim())
    .filter(Boolean);
}

type Campos = {
  atendimentoId: string;
  dias: string;
  inicio: string;
  atividade: string;
  destino: string;
  especialidade: string;
  motivo: string;
  destinatario: string;
};

function identificacao(p: Paciente) {
  const partes = [p.full_name];
  if (p.cpf) partes.push(`inscrito(a) no CPF sob o nº ${p.cpf}`);
  return partes.join(", ");
}

function gerarSecoes(tipo: TipoDoc, p: Paciente, pr: Prontuario, c: Campos): Secao[] {
  const at = pr.atendimentos.find((a) => a.id === c.atendimentoId) ?? pr.atendimentos[0];
  const dataAt = at ? dataBR(at.starts_at) : isoParaBR(hojeISO());
  const notas = pr.notas;
  const primeira = notas[0];
  const ultima = notas[notas.length - 1];
  const resp = pr.anamnese?.answers ?? {};
  const anos = idade(p.birth_date);

  if (tipo === "declaracao") {
    const periodo = at ? `, no período das ${horaBR(at.starts_at)} às ${horaBR(at.ends_at)}` : "";
    return [{
      titulo: "",
      texto: `Declaro, para os devidos fins, que ${identificacao(p)}, compareceu a atendimento fisioterapêutico no dia ${dataAt}${periodo}.`,
    }];
  }

  if (tipo === "atestado") {
    const n = Number(c.dias) || 1;
    return [{
      titulo: "",
      texto:
        `Atesto, para os devidos fins, que ${identificacao(p)}, esteve sob meus cuidados fisioterapêuticos em ${dataAt} ` +
        `e, em razão de sua condição cinesiológica funcional, necessita de afastamento de suas atividades ${c.atividade || "laborais"} ` +
        `por ${n} ${n === 1 ? "dia" : "dias"}, a partir de ${isoParaBR(c.inicio || hojeISO())}.`,
    }];
  }

  const queixa = textoResposta(resp["queixa"]);
  const historicoCampos = ["queixa", "inicio", "local", "tratamentos", "exames", "cirurgias"];
  const rotulos = new Map((pr.anamnese?.fields_snapshot ?? []).map((f) => [f.key, f.label]));
  const historico = historicoCampos
    .map((k) => {
      const v = textoResposta(resp[k]);
      return v ? `${rotulos.get(k) ?? k}: ${v}.` : "";
    })
    .filter(Boolean)
    .join("\n");

  const procedimentos = Array.from(new Set(notas.flatMap((n) => nomesProcedimentos(n.procedures))));
  const periodoTrat = primeira
    ? `Foram realizadas ${notas.length} ${notas.length === 1 ? "sessão" : "sessões"}, de ${dataBR(primeira.created_at)} a ${dataBR(ultima.created_at)}.`
    : "";

  const evaIni = primeira?.pain_before;
  const evaFim = ultima?.pain_after ?? ultima?.pain_before;
  const evolucaoDor =
    evaIni !== null && evaIni !== undefined && evaFim !== null && evaFim !== undefined
      ? `Intensidade da dor pela Escala Visual Analógica (EVA, 0 a 10): ${evaIni} no início do tratamento e ${evaFim} na sessão mais recente.`
      : "";

  if (tipo === "encaminhamento") {
    const destino = [c.destino, c.especialidade].filter(Boolean).join(", ");
    const inicioAcomp = primeira ? `, em acompanhamento fisioterapêutico desde ${dataBR(primeira.created_at)}` : "";
    return [
      { titulo: "", texto: destino ? `Ao(À) ${destino}.` : "Ao(À) colega." },
      {
        titulo: "",
        texto:
          `Encaminho o(a) paciente ${p.full_name}${anos !== null ? `, ${anos} anos` : ""}${inicioAcomp}, ` +
          `para ${c.motivo || "avaliação e conduta"}.`,
      },
      {
        titulo: "Resumo clínico",
        texto: [queixa && `Queixa principal: ${queixa}.`, ultima?.assessment, evolucaoDor].filter(Boolean).join("\n"),
      },
      { titulo: "", texto: "Coloco-me à disposição para troca de informações sobre o caso." },
    ];
  }

  // relatório
  const ident = [
    `Paciente: ${p.full_name}.`,
    p.cpf ? `CPF: ${p.cpf}.` : "",
    p.birth_date ? `Data de nascimento: ${isoParaBR(p.birth_date)}${anos !== null ? ` (${anos} anos)` : ""}.` : "",
  ].filter(Boolean).join(" ");

  return [
    { titulo: "", texto: c.destinatario ? `A(o) ${c.destinatario}.` : "A quem possa interessar." },
    { titulo: "Identificação", texto: ident },
    { titulo: "Histórico clínico", texto: historico },
    {
      titulo: "Avaliação cinesiológica funcional",
      texto: [primeira?.objective, primeira?.assessment].filter(Boolean).join("\n"),
    },
    {
      titulo: "Condutas realizadas",
      texto: [periodoTrat, procedimentos.length ? `Procedimentos: ${procedimentos.join(", ")}.` : ""].filter(Boolean).join("\n"),
    },
    {
      titulo: "Evolução",
      texto: [evolucaoDor, notas.length > 1 ? ultima?.assessment : ""].filter(Boolean).join("\n"),
    },
    { titulo: "Conclusão e recomendações", texto: "" },
  ];
}

const camposIniciais: Campos = {
  atendimentoId: "",
  dias: "1",
  inicio: "",
  atividade: "laborais",
  destino: "",
  especialidade: "",
  motivo: "",
  destinatario: "",
};

export function Documentos({ pacientes, documentos, catalogo, cidadeClinica }: Props) {
  const supabase = createClient();
  const [modo, setModo] = useState<"lista" | "novo">("lista");
  const [filtro, setFiltro] = useState("");

  // editor
  const [pacienteId, setPacienteId] = useState("");
  const [buscaPaciente, setBuscaPaciente] = useState("");
  const [tipo, setTipo] = useState<TipoDoc>("declaracao");
  const [campos, setCampos] = useState<Campos>(camposIniciais);
  const [prontuario, setProntuario] = useState<Prontuario | null>(null);
  const [carregandoPront, setCarregandoPront] = useState(false);
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [editado, setEditado] = useState(false);
  const [cif, setCif] = useState<CifItem[]>([]);
  const [usarCif, setUsarCif] = useState(false);
  const [cid, setCid] = useState("");
  const [cidAutorizado, setCidAutorizado] = useState(false);
  const [substitui, setSubstitui] = useState<DocLista | null>(null);
  const [emitindo, setEmitindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const paciente = pacientes.find((p) => p.id === pacienteId) ?? null;

  const pacientesFiltrados = useMemo(() => {
    const t = buscaPaciente.trim().toLowerCase();
    if (!t) return pacientes.slice(0, 30);
    return pacientes.filter((p) => p.full_name.toLowerCase().includes(t) || (p.cpf ?? "").includes(t)).slice(0, 30);
  }, [pacientes, buscaPaciente]);

  const docsFiltrados = useMemo(() => {
    const t = filtro.trim().toLowerCase();
    if (!t) return documentos;
    return documentos.filter(
      (d) => (d.patients?.full_name ?? "").toLowerCase().includes(t) || String(d.number) === t
    );
  }, [documentos, filtro]);

  // carrega o prontuário do paciente escolhido
  useEffect(() => {
    if (!pacienteId) { setProntuario(null); return; }
    let ativo = true;
    (async () => {
      setCarregandoPront(true);
      const [an, no, at, ci] = await Promise.all([
        supabase.from("anamnesis_responses").select("created_at, answers, fields_snapshot")
          .eq("patient_id", pacienteId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("clinical_notes")
          .select("created_at, subjective, objective, assessment, plan, procedures, pain_before, pain_after")
          .eq("patient_id", pacienteId).order("created_at", { ascending: true }),
        supabase.from("appointments").select("id, starts_at, ends_at, status")
          .eq("patient_id", pacienteId).lte("starts_at", new Date().toISOString())
          .not("status", "in", "(cancelled_by_patient,cancelled_by_clinic,no_show,pending)")
          .order("starts_at", { ascending: false }).limit(30),
        supabase.from("patient_cif").select("items")
          .eq("patient_id", pacienteId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (!ativo) return;
      const pr: Prontuario = {
        anamnese: (an.data as Anamnese | null) ?? null,
        notas: (no.data as Nota[] | null) ?? [],
        atendimentos: (at.data as Atendimento[] | null) ?? [],
        cif: ((ci.data?.items as CifItem[] | undefined) ?? []),
      };
      setProntuario(pr);
      if (!substitui) {
        setCif(pr.cif);
        setCampos((c) => ({ ...c, atendimentoId: pr.atendimentos[0]?.id ?? "" }));
      }
      setCarregandoPront(false);
    })();
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  // gera o texto automaticamente enquanto o profissional não editar à mão
  useEffect(() => {
    if (!paciente || !prontuario || editado) return;
    setSecoes(gerarSecoes(tipo, paciente, prontuario, campos));
  }, [tipo, paciente, prontuario, campos, editado]);

  function novoDocumento() {
    setModo("novo");
    setPacienteId("");
    setBuscaPaciente("");
    setTipo("declaracao");
    setCampos(camposIniciais);
    setSecoes([]);
    setEditado(false);
    setCif([]);
    setUsarCif(false);
    setCid("");
    setCidAutorizado(false);
    setSubstitui(null);
    setErro(null);
  }

  function novaVersao(d: DocLista) {
    setModo("novo");
    setSubstitui(d);
    setPacienteId(d.patient_id);
    setBuscaPaciente("");
    setTipo(d.doc_type);
    setSecoes(d.body?.secoes ?? []);
    setEditado(true);
    setCif(d.cif ?? []);
    setUsarCif((d.cif ?? []).length > 0);
    setCid(d.body?.cid ?? "");
    setCidAutorizado(!!d.body?.cid_autorizado);
    setErro(null);
  }

  function refazer() {
    if (editado && !window.confirm("Refazer o texto a partir do prontuário? Suas edições no texto serão perdidas.")) return;
    setEditado(false);
    if (paciente && prontuario) setSecoes(gerarSecoes(tipo, paciente, prontuario, campos));
  }

  function editarSecao(i: number, mudanca: Partial<Secao>) {
    setEditado(true);
    setSecoes((s) => s.map((x, j) => (j === i ? { ...x, ...mudanca } : x)));
  }

  const tituloDoc = TIPOS.find((t) => t.id === tipo)?.nome ?? "Documento";
  const mostraClinico = tipo === "atestado" || tipo === "relatorio" || tipo === "encaminhamento";

  async function emitir() {
    setErro(null);
    if (!paciente) return setErro("Escolha o paciente.");
    if (!secoes.some((s) => s.texto.trim())) return setErro("O documento está sem texto.");
    if (cid.trim() && !cidAutorizado) {
      return setErro("Para incluir o CID, confirme que o paciente autorizou. Ou apague o campo CID.");
    }
    if (!window.confirm("Depois de emitido, o documento não pode ser alterado (só substituído por nova versão). Emitir agora?")) return;
    setEmitindo(true);
    const corpo: Corpo = {
      secoes: secoes.filter((s) => s.texto.trim() || s.titulo.trim()),
      cid: cid.trim() || null,
      cid_autorizado: cid.trim() ? cidAutorizado : false,
    };
    const { data, error } = await supabase.rpc("issue_document", {
      p_patient: paciente.id,
      p_type: tipo,
      p_title: tituloDoc,
      p_body: corpo,
      p_cif: mostraClinico && usarCif ? ordenarItens(cif) : [],
      p_replaces: substitui?.id ?? null,
    });
    setEmitindo(false);
    if (error) return setErro(`Não foi possível emitir: ${error.message}`);
    window.open(`/documento/${data}`, "_blank");
    window.location.reload();
  }

  if (modo === "lista") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="h-title text-2xl">Documentos</h1>
            <p className="mt-1 text-sm text-ink/70">
              Declarações, atestados, relatórios e encaminhamentos com seus dados e os do prontuário.
            </p>
          </div>
          <button className="btn-primary" onClick={novoDocumento}>Novo documento</button>
        </div>

        <input
          className="field w-full"
          placeholder="Filtrar por paciente ou número do documento"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />

        {docsFiltrados.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-center text-sm text-ink/70">
            Nenhum documento emitido ainda. Clique em Novo documento para criar o primeiro.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-ink/60">
                <tr>
                  <th className="px-3 py-2">Nº</th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Paciente</th>
                  <th className="px-3 py-2">Documento</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {docsFiltrados.map((d) => (
                  <tr key={d.id} className="border-t border-ink/10">
                    <td className="px-3 py-2 font-mono">{d.number}</td>
                    <td className="px-3 py-2">{dataBR(d.issued_at)}</td>
                    <td className="px-3 py-2">{d.patients?.full_name ?? ""}</td>
                    <td className="px-3 py-2">{d.title}</td>
                    <td className="px-3 py-2 text-right">
                      <a href={`/documento/${d.id}`} target="_blank" className="font-semibold underline underline-offset-4">
                        Abrir
                      </a>
                      <button className="ml-4 text-ink/70 underline underline-offset-4" onClick={() => novaVersao(d)}>
                        Nova versão
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h-title text-2xl">
          {substitui ? `Nova versão do documento nº ${substitui.number}` : "Novo documento"}
        </h1>
        <button className="btn-ghost text-sm" onClick={() => setModo("lista")}>Cancelar</button>
      </div>

      {/* 1. paciente */}
      <section className="rounded-xl bg-white p-4">
        <p className="text-base font-extrabold">1. Paciente</p>
        {paciente ? (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold">{paciente.full_name}</span>
            {paciente.cpf && <span className="text-ink/60">CPF {paciente.cpf}</span>}
            {!substitui && (
              <button className="underline underline-offset-4" onClick={() => { setPacienteId(""); setEditado(false); }}>
                Trocar
              </button>
            )}
            {carregandoPront && <span className="text-ink/60">Carregando prontuário...</span>}
          </div>
        ) : (
          <div className="mt-2">
            <input
              className="field w-full"
              placeholder="Digite o nome ou CPF"
              value={buscaPaciente}
              onChange={(e) => setBuscaPaciente(e.target.value)}
              autoFocus
            />
            <ul className="mt-2 max-h-60 overflow-y-auto">
              {pacientesFiltrados.map((p) => (
                <li key={p.id}>
                  <button
                    className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-paper"
                    onClick={() => { setPacienteId(p.id); setEditado(false); }}
                  >
                    {p.full_name} {p.cpf && <span className="text-ink/50">· {p.cpf}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {paciente && !paciente.cpf && (
          <p className="mt-2 text-xs text-ink/60">
            Este paciente está sem CPF no cadastro. O documento sai sem o CPF; se precisar, complete o cadastro em Pacientes.
          </p>
        )}
      </section>

      {paciente && (
        <>
          {/* 2. tipo */}
          <section className="rounded-xl bg-white p-4">
            <p className="text-base font-extrabold">2. Tipo de documento</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {TIPOS.map((t) => (
                <button
                  key={t.id}
                  disabled={!!substitui}
                  onClick={() => { setTipo(t.id); setEditado(false); }}
                  className={`rounded-lg border p-3 text-left text-sm disabled:opacity-60 ${
                    tipo === t.id ? "border-ink bg-paper" : "border-ink/15"
                  }`}
                >
                  <span className="font-semibold">{t.nome}</span>
                  <span className="mt-1 block text-xs text-ink/60">{t.descricao}</span>
                </button>
              ))}
            </div>

            {/* campos específicos */}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(tipo === "declaracao" || tipo === "atestado") && (
                <div>
                  <label className="label" htmlFor="at">Atendimento</label>
                  <select
                    id="at"
                    className="field w-full"
                    value={campos.atendimentoId}
                    onChange={(e) => setCampos({ ...campos, atendimentoId: e.target.value })}
                  >
                    {prontuario?.atendimentos.length ? null : <option value="">Nenhum atendimento registrado (usa a data de hoje)</option>}
                    {prontuario?.atendimentos.map((a) => (
                      <option key={a.id} value={a.id}>
                        {dataBR(a.starts_at)} das {horaBR(a.starts_at)} às {horaBR(a.ends_at)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {tipo === "atestado" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label" htmlFor="dias">Dias de afastamento</label>
                      <input id="dias" type="number" min={1} className="field w-full" value={campos.dias}
                        onChange={(e) => setCampos({ ...campos, dias: e.target.value })} />
                    </div>
                    <div>
                      <label className="label" htmlFor="inicio">A partir de</label>
                      <input id="inicio" type="date" className="field w-full" value={campos.inicio || hojeISO()}
                        onChange={(e) => setCampos({ ...campos, inicio: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="ativ">Afastamento de atividades</label>
                    <select id="ativ" className="field w-full" value={campos.atividade}
                      onChange={(e) => setCampos({ ...campos, atividade: e.target.value })}>
                      <option value="laborais">laborais</option>
                      <option value="esportivas">esportivas</option>
                      <option value="escolares">escolares</option>
                      <option value="laborais e esportivas">laborais e esportivas</option>
                    </select>
                  </div>
                </>
              )}
              {tipo === "relatorio" && (
                <div className="md:col-span-2">
                  <label className="label" htmlFor="dest">Destinatário (opcional)</label>
                  <input id="dest" className="field w-full" placeholder="Ex.: Dr. Fulano, ortopedista. Em branco: A quem possa interessar"
                    value={campos.destinatario} onChange={(e) => setCampos({ ...campos, destinatario: e.target.value })} />
                </div>
              )}
              {tipo === "encaminhamento" && (
                <>
                  <div>
                    <label className="label" htmlFor="destino">Para quem</label>
                    <input id="destino" className="field w-full" placeholder="Dr. Fulano de Tal"
                      value={campos.destino} onChange={(e) => setCampos({ ...campos, destino: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="esp">Especialidade</label>
                    <input id="esp" className="field w-full" placeholder="Ortopedia"
                      value={campos.especialidade} onChange={(e) => setCampos({ ...campos, especialidade: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label" htmlFor="motivo">Motivo do encaminhamento</label>
                    <input id="motivo" className="field w-full" placeholder="avaliação ortopédica e exame de imagem do joelho direito"
                      value={campos.motivo} onChange={(e) => setCampos({ ...campos, motivo: e.target.value })} />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* 3. texto */}
          <section className="rounded-xl bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-extrabold">3. Texto do documento</p>
              <button className="btn-ghost text-sm" onClick={refazer}>Refazer a partir do prontuário</button>
            </div>
            <p className="mt-1 text-xs text-ink/60">
              O texto já vem montado com os dados do paciente e do prontuário. Edite o que quiser. Partes vazias não aparecem no documento.
            </p>
            <div className="mt-3 space-y-3">
              {secoes.map((s, i) => (
                <div key={i}>
                  {s.titulo && (
                    <input className="field mb-1 w-full font-semibold" value={s.titulo}
                      onChange={(e) => editarSecao(i, { titulo: e.target.value })} />
                  )}
                  <textarea
                    className="field w-full"
                    rows={Math.max(3, Math.ceil(s.texto.length / 90) + s.texto.split("\n").length)}
                    value={s.texto}
                    placeholder={s.titulo ? `Escreva aqui: ${s.titulo.toLowerCase()}` : ""}
                    onChange={(e) => editarSecao(i, { texto: e.target.value })}
                  />
                </div>
              ))}
            </div>

            {(tipo === "atestado" || tipo === "relatorio" || tipo === "encaminhamento") && (
              <div className="mt-4 grid gap-3 rounded-lg bg-paper p-3 md:grid-cols-[10rem_1fr]">
                <div>
                  <label className="label" htmlFor="cid">CID (opcional)</label>
                  <input id="cid" className="field w-full" placeholder="M17.1" value={cid} onChange={(e) => setCid(e.target.value)} />
                </div>
                <label className="flex items-start gap-2 self-end text-sm">
                  <input type="checkbox" className="mt-1" checked={cidAutorizado} onChange={(e) => setCidAutorizado(e.target.checked)} />
                  O paciente autorizou expressamente a inclusão do CID neste documento.
                </label>
              </div>
            )}
          </section>

          {/* 4. CIF */}
          {mostraClinico && (
            <section className="rounded-xl bg-white p-4">
              <label className="flex items-center gap-2 text-base font-extrabold">
                <input type="checkbox" checked={usarCif} onChange={(e) => setUsarCif(e.target.checked)} />
                4. Incluir classificação CIF
              </label>
              <p className="mt-1 text-xs text-ink/60">
                Classificação Internacional de Funcionalidade, Incapacidade e Saúde (OMS). Fica salva no paciente e vem marcada no próximo documento.
              </p>
              {usarCif && (
                <div className="mt-3">
                  <CifSeletor catalogo={catalogo} itens={cif} aoMudar={setCif} />
                </div>
              )}
            </section>
          )}

          {/* prévia */}
          <section className="rounded-xl bg-white p-4">
            <p className="text-base font-extrabold">Prévia</p>
            <div className="mt-3 space-y-3 rounded-lg border border-ink/10 p-5 text-sm leading-relaxed">
              <p className="text-center font-extrabold uppercase tracking-wide">{tituloDoc}</p>
              {secoes.filter((s) => s.texto.trim()).map((s, i) => (
                <div key={i}>
                  {s.titulo && <p className="font-semibold">{s.titulo}</p>}
                  <p className="whitespace-pre-line">{s.texto}</p>
                </div>
              ))}
              {cid.trim() && cidAutorizado && <p>CID: {cid.trim()} (inclusão autorizada pelo paciente).</p>}
              {mostraClinico && usarCif && cif.length > 0 && (
                <div>
                  <p className="font-semibold">Classificação CIF</p>
                  <ul>
                    {ordenarItens(cif).map((i) => (
                      <li key={i.code}>
                        <span className="font-mono text-xs">{codigoComQualificador(i)}</span> {i.title} ({descricaoQualificador(i)})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-right">{[cidadeClinica, isoParaBR(hojeISO())].filter(Boolean).join(", ")}.</p>
              <p className="text-center text-xs text-ink/60">Cabeçalho, assinatura e carimbo entram automaticamente a partir de Meus dados.</p>
            </div>
          </section>

          <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-3 rounded-xl bg-white p-3 shadow-lg">
            {erro && <p role="alert" className="mr-auto text-sm text-danger">{erro}</p>}
            <button className="btn-primary" onClick={emitir} disabled={emitindo || carregandoPront}>
              {emitindo ? "Emitindo" : "Emitir documento"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

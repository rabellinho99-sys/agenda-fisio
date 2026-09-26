"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CifSeletor } from "@/components/CifSeletor";
import { PericiaCampos } from "@/components/PericiaCampos";
import { INFO_RECURSO, temRecurso, type Recurso, type Recursos } from "@/lib/planos";
import {
  codigoComQualificador,
  descricaoQualificador,
  ordenarItens,
  type CifCodigo,
  type CifItem,
} from "@/lib/cif";
import {
  BLOCOS,
  CAMPOS_INICIAIS,
  FUNCOES,
  PERICIA_INICIAL,
  dataBR,
  gerarSecoes,
  hojeISO,
  horaBR,
  isoParaBR,
  type BlocoId,
  type Campos,
  type Paciente,
  type Pericia,
  type Prontuario,
  type Secao,
  type TipoDoc,
} from "@/lib/documentos";

type Corpo = {
  secoes: Secao[];
  cid?: string | null;
  cid_autorizado?: boolean;
  pericia?: Pericia;
  assinatura_rotulo?: string;
};

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

type Props = {
  recursos: Recursos;
  clinicId: string;
  pacientes: Paciente[];
  documentos: DocLista[];
  catalogo: CifCodigo[];
  cidadeClinica: string;
};

const TIPOS: { id: TipoDoc; nome: string; descricao: string }[] = [
  { id: "declaracao", nome: "Declaração de comparecimento", descricao: "Confirma presença no atendimento, sem informação clínica." },
  { id: "atestado", nome: "Atestado", descricao: "Afastamento ou aptidão funcional por um período." },
  { id: "relatorio", nome: "Relatório fisioterapêutico", descricao: "Resumo do acompanhamento, montado a partir do prontuário." },
  { id: "encaminhamento", nome: "Encaminhamento", descricao: "Para médico ou outro profissional, com resumo clínico." },
  { id: "laudo", nome: "Laudo pericial fisioterapêutico", descricao: "Como perito(a) do juízo: processo, exame, nexo, conclusão e quesitos." },
  { id: "parecer", nome: "Parecer técnico fisioterapêutico", descricao: "Como assistente técnico(a) ou a pedido particular, com quesitos." },
];

const TODOS_BLOCOS: Record<BlocoId, boolean> = {
  anamnese: true, avaliacao: true, testes: true, exames: true, condutas: true, evolucao: true, termos: true,
};

const RECURSO_DO_TIPO: Partial<Record<TipoDoc, Recurso>> = {
  relatorio: "documentos_clinicos",
  encaminhamento: "documentos_clinicos",
  laudo: "pericia",
  parecer: "pericia",
};

export function Documentos({ recursos, clinicId, pacientes: pacientesIniciais, documentos, catalogo, cidadeClinica }: Props) {
  const supabase = createClient();
  const [modo, setModo] = useState<"lista" | "novo">("lista");
  const [pacientes, setPacientes] = useState<Paciente[]>(pacientesIniciais);
  const [novoPac, setNovoPac] = useState<{ nome: string; cpf: string; nasc: string; tel: string } | null>(null);
  const [salvandoPac, setSalvandoPac] = useState(false);
  const [pericia, setPericia] = useState<Pericia>(PERICIA_INICIAL);
  const [filtro, setFiltro] = useState("");

  const [pacienteId, setPacienteId] = useState("");
  const [buscaPaciente, setBuscaPaciente] = useState("");
  const [tipo, setTipo] = useState<TipoDoc>("declaracao");
  const [campos, setCampos] = useState<Campos>(CAMPOS_INICIAIS);
  const [prontuario, setProntuario] = useState<Prontuario | null>(null);
  const [cifSalva, setCifSalva] = useState<CifItem[]>([]);
  const [carregandoPront, setCarregandoPront] = useState(false);

  // blocos do prontuário ligados, textos editados à mão e partes extras
  const [blocos, setBlocos] = useState<Record<BlocoId, boolean>>(TODOS_BLOCOS);
  const [editadas, setEditadas] = useState<Record<string, Secao>>({});
  const [extras, setExtras] = useState<Secao[]>([]);

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

  // carrega tudo o que existe no prontuário do paciente
  useEffect(() => {
    if (!pacienteId) { setProntuario(null); return; }
    let ativo = true;
    (async () => {
      setCarregandoPront(true);
      const [an, no, at, im, te, ci, af] = await Promise.all([
        supabase.from("anamnesis_responses").select("created_at, answers, fields_snapshot")
          .eq("patient_id", pacienteId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("clinical_notes")
          .select("created_at, subjective, objective, assessment, plan, procedures, pain_before, pain_after, addendum")
          .eq("patient_id", pacienteId).order("created_at", { ascending: true }),
        supabase.from("appointments").select("id, starts_at, ends_at, status")
          .eq("patient_id", pacienteId).lte("starts_at", new Date().toISOString())
          .not("status", "in", "(cancelled_by_patient,cancelled_by_clinic,no_show,pending)")
          .order("starts_at", { ascending: false }).limit(30),
        supabase.from("patient_images").select("file_name, description, uploaded_at")
          .eq("patient_id", pacienteId).order("uploaded_at", { ascending: true }),
        supabase.from("consents").select("template_name, signed_at, revoked_at")
          .eq("patient_id", pacienteId).order("signed_at", { ascending: true }),
        supabase.from("patient_cif").select("items")
          .eq("patient_id", pacienteId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("physical_assessments").select("performed_at, ortho_results, strength_results, notes")
          .eq("patient_id", pacienteId).order("performed_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (!ativo) return;
      const pr: Prontuario = {
        avaliacaoFisica: (af.data as Prontuario["avaliacaoFisica"]) ?? null,
        anamnese: (an.data as Prontuario["anamnese"]) ?? null,
        notas: (no.data as Prontuario["notas"]) ?? [],
        atendimentos: (at.data as Prontuario["atendimentos"]) ?? [],
        imagens: (im.data as Prontuario["imagens"]) ?? [],
        termos: (te.data as Prontuario["termos"]) ?? [],
      };
      setProntuario(pr);
      const salva = (ci.data?.items as CifItem[] | undefined) ?? [];
      setCifSalva(salva);
      if (!substitui) {
        setCif(salva);
        setCampos((c) => ({ ...c, atendimentoId: pr.atendimentos[0]?.id ?? "" }));
      }
      setCarregandoPront(false);
    })();
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  // partes geradas automaticamente, com as edições do profissional por cima
  const geradas = useMemo(
    () => (paciente && prontuario ? gerarSecoes(tipo, paciente, prontuario, campos, pericia) : []),
    [tipo, paciente, prontuario, campos, pericia]
  );
  const secoes: Secao[] = useMemo(() => {
    const base = geradas
      .filter((s) => !s.bloco || blocos[s.bloco])
      .map((s) => editadas[s.id] ?? s);
    return [...base, ...extras];
  }, [geradas, blocos, editadas, extras]);

  const blocosDoTipo = BLOCOS.filter((b) => b.tipos.includes(tipo));
  const textoDoBloco = (id: BlocoId) => geradas.find((s) => s.bloco === id)?.texto ?? "";

  function limparEditor() {
    setPacienteId("");
    setBuscaPaciente("");
    setTipo("declaracao");
    setCampos(CAMPOS_INICIAIS);
    setPericia(PERICIA_INICIAL);
    setNovoPac(null);
    setBlocos(TODOS_BLOCOS);
    setEditadas({});
    setExtras([]);
    setCif([]);
    setUsarCif(false);
    setCid("");
    setCidAutorizado(false);
    setSubstitui(null);
    setErro(null);
  }

  function novoDocumento() {
    limparEditor();
    setModo("novo");
  }

  function novaVersao(d: DocLista) {
    limparEditor();
    setModo("novo");
    setSubstitui(d);
    setPacienteId(d.patient_id);
    setTipo(d.doc_type);
    const anteriores = d.body?.secoes ?? [];
    const ed: Record<string, Secao> = {};
    const ex: Secao[] = [];
    const ids = new Set(anteriores.map((s) => s.id));
    for (const s of anteriores) {
      if (s.id?.startsWith("extra-")) ex.push(s);
      else if (s.id) ed[s.id] = s;
    }
    setEditadas(ed);
    setExtras(ex);
    setBlocos({
      anamnese: ids.has("anamnese"), avaliacao: ids.has("avaliacao"), testes: ids.has("testes"), exames: ids.has("exames"),
      condutas: ids.has("condutas"), evolucao: ids.has("evolucao"), termos: ids.has("termos"),
    });
    if (d.body?.pericia) setPericia({ ...PERICIA_INICIAL, ...d.body.pericia });
    setCif(d.cif ?? []);
    setUsarCif((d.cif ?? []).length > 0);
    setCid(d.body?.cid ?? "");
    setCidAutorizado(!!d.body?.cid_autorizado);
  }

  function editar(s: Secao, mudanca: Partial<Secao>) {
    if (s.id.startsWith("extra-")) {
      setExtras((xs) => xs.map((x) => (x.id === s.id ? { ...x, ...mudanca } : x)));
    } else {
      setEditadas((e) => ({ ...e, [s.id]: { ...s, ...mudanca } }));
    }
  }

  function restaurar(id: string) {
    setEditadas((e) => {
      const n = { ...e };
      delete n[id];
      return n;
    });
  }

  function adicionarParte() {
    setExtras((xs) => [...xs, { id: `extra-${Date.now()}`, titulo: "Nova parte", texto: "" }]);
  }

  const tituloDoc = TIPOS.find((t) => t.id === tipo)?.nome ?? "Documento";
  const ehPericia = tipo === "parecer" || tipo === "laudo";
  const mostraClinico = tipo !== "declaracao";

  async function cadastrarPaciente() {
    if (!novoPac) return;
    const tel = novoPac.tel.replace(/\D/g, "");
    if (novoPac.nome.trim().length < 3) return setErro("Informe o nome completo.");
    if (tel.length < 10) return setErro("Informe um telefone com DDD.");
    setErro(null);
    setSalvandoPac(true);
    const { data, error } = await supabase
      .from("patients")
      .insert({
        clinic_id: clinicId,
        full_name: novoPac.nome.trim(),
        cpf: novoPac.cpf.trim() || null,
        birth_date: novoPac.nasc || null,
        phone: tel,
        whatsapp_opt_in: false,
      })
      .select("id, full_name, cpf, birth_date")
      .single();
    setSalvandoPac(false);
    if (error) {
      return setErro(
        error.message.includes("duplicate")
          ? "Já existe um paciente com esse telefone. Busque pelo nome na lista."
          : `Não foi possível cadastrar: ${error.message}`
      );
    }
    setPacientes((ps) => [...ps, data as Paciente].sort((a, b) => a.full_name.localeCompare(b.full_name)));
    setPacienteId((data as Paciente).id);
    setNovoPac(null);
  }

  async function emitir() {
    setErro(null);
    if (!paciente) return setErro("Escolha o paciente.");
    const finais = secoes.filter((s) => s.texto.trim());
    if (!finais.length) return setErro("O documento está sem texto.");
    if (cid.trim() && !cidAutorizado) {
      return setErro("Para incluir o CID, confirme que o paciente autorizou. Ou apague o campo CID.");
    }
    const pendentes = finais.some((s) => /\[(responder|solicitante)\]/.test(s.texto));
    if (pendentes && !window.confirm("Há quesitos sem resposta ou campos marcados entre colchetes. Emitir mesmo assim?")) return;
    if (!window.confirm("Depois de emitido, o documento não pode ser alterado (só substituído por nova versão). Emitir agora?")) return;
    setEmitindo(true);
    const corpo: Corpo = {
      secoes: finais.map(({ id, titulo, texto }) => ({ id, titulo, texto })),
      cid: cid.trim() || null,
      cid_autorizado: cid.trim() ? cidAutorizado : false,
      ...(ehPericia
        ? { pericia, assinatura_rotulo: FUNCOES.find((f) => f.id === pericia.funcao)?.assinatura ?? "Fisioterapeuta" }
        : {}),
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
              Declarações, atestados, relatórios e encaminhamentos montados a partir do prontuário.
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
                    <td className="whitespace-nowrap px-3 py-2 text-right">
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
              <button className="underline underline-offset-4" onClick={() => { setPacienteId(""); setEditadas({}); setExtras([]); }}>
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
            {!novoPac ? (
              <button
                className="mt-2 text-sm font-semibold underline underline-offset-4"
                onClick={() => setNovoPac({ nome: buscaPaciente, cpf: "", nasc: "", tel: "" })}
              >
                Cadastrar novo paciente ou periciando
              </button>
            ) : (
              <div className="mt-3 grid gap-3 rounded-lg bg-paper p-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="label" htmlFor="np-nome">Nome completo</label>
                  <input id="np-nome" className="field w-full" value={novoPac.nome}
                    onChange={(e) => setNovoPac({ ...novoPac, nome: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="np-tel">Telefone com DDD</label>
                  <input id="np-tel" className="field w-full" value={novoPac.tel} placeholder="(33) 99999-9999"
                    onChange={(e) => setNovoPac({ ...novoPac, tel: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="np-cpf">CPF</label>
                  <input id="np-cpf" className="field w-full" value={novoPac.cpf}
                    onChange={(e) => setNovoPac({ ...novoPac, cpf: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="np-nasc">Data de nascimento</label>
                  <input id="np-nasc" type="date" className="field w-full" value={novoPac.nasc}
                    onChange={(e) => setNovoPac({ ...novoPac, nasc: e.target.value })} />
                </div>
                <div className="flex items-end gap-2">
                  <button className="btn-primary text-sm" onClick={cadastrarPaciente} disabled={salvandoPac}>
                    {salvandoPac ? "Salvando" : "Cadastrar e usar"}
                  </button>
                  <button className="btn-ghost text-sm" onClick={() => setNovoPac(null)}>Cancelar</button>
                </div>
                <p className="text-xs text-ink/60 md:col-span-2">
                  Cadastro rápido, sem mensagens de WhatsApp. Pode ser completado depois em Pacientes.
                </p>
                {erro && <p className="text-sm text-danger md:col-span-2">{erro}</p>}
              </div>
            )}
            <ul className="mt-2 max-h-60 overflow-y-auto">
              {pacientesFiltrados.map((p) => (
                <li key={p.id}>
                  <button
                    className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-paper"
                    onClick={() => setPacienteId(p.id)}
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

      {paciente && prontuario && (
        <>
          {/* 2. tipo */}
          <section className="rounded-xl bg-white p-4">
            <p className="text-base font-extrabold">2. Tipo de documento</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {TIPOS.map((t) => {
                const rec = RECURSO_DO_TIPO[t.id];
                const bloqueado = !!rec && !temRecurso(recursos, rec);
                if (bloqueado) {
                  return (
                    <a
                      key={t.id}
                      href="/painel/assinatura"
                      className="rounded-lg border border-dashed border-ink/20 p-3 text-left text-sm opacity-70 hover:opacity-100"
                    >
                      <span className="font-semibold">🔒 {t.nome}</span>
                      <span className="mt-1 block text-xs text-ink/60">
                        Disponível a partir do plano {INFO_RECURSO[rec!].plano}. Toque para fazer upgrade.
                      </span>
                    </a>
                  );
                }
                return (
                <button
                  key={t.id}
                  disabled={!!substitui}
                  onClick={() => {
                    setTipo(t.id);
                    setEditadas({});
                    setExtras([]);
                    if (t.id === "laudo") setPericia((p) => ({ ...p, funcao: "perito" }));
                    if (t.id === "parecer" && pericia.funcao === "perito") setPericia((p) => ({ ...p, funcao: "assistente_autor" }));
                  }}
                  className={`rounded-lg border p-3 text-left text-sm disabled:opacity-60 ${
                    tipo === t.id ? "border-ink bg-paper" : "border-ink/15"
                  }`}
                >
                  <span className="font-semibold">{t.nome}</span>
                  <span className="mt-1 block text-xs text-ink/60">{t.descricao}</span>
                </button>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(tipo === "declaracao" || tipo === "atestado") && (
                <div>
                  <label className="label" htmlFor="at">Atendimento</label>
                  <select id="at" className="field w-full" value={campos.atendimentoId}
                    onChange={(e) => setCampos({ ...campos, atendimentoId: e.target.value })}>
                    {prontuario.atendimentos.length ? null : <option value="">Nenhum atendimento registrado (usa a data de hoje)</option>}
                    {prontuario.atendimentos.map((a) => (
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

          {ehPericia && (
            <section className="rounded-xl bg-white p-4">
              <p className="text-base font-extrabold">Dados da perícia</p>
              <p className="mt-1 text-xs text-ink/60">
                Preencha o que tiver. Tudo entra automaticamente no texto, e o que ficar em branco não aparece.
              </p>
              <div className="mt-3">
                <PericiaCampos valor={pericia} aoMudar={setPericia} tipo={tipo as "parecer" | "laudo"} />
              </div>
            </section>
          )}

          {/* 3. o que puxar do prontuário */}
          {blocosDoTipo.length > 0 && (
            <section className="rounded-xl bg-white p-4">
              <p className="text-base font-extrabold">3. Puxar do prontuário automaticamente</p>
              <p className="mt-1 text-xs text-ink/60">
                Marque o que deve entrar no documento. O texto é montado sozinho a partir do que já foi registrado.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {blocosDoTipo.map((b) => {
                  const vazio = !textoDoBloco(b.id);
                  return (
                    <label key={b.id} className={`flex items-center gap-2 rounded-lg border border-ink/10 px-3 py-2 text-sm ${vazio ? "opacity-60" : ""}`}>
                      <input
                        type="checkbox"
                        checked={blocos[b.id]}
                        onChange={(e) => setBlocos({ ...blocos, [b.id]: e.target.checked })}
                      />
                      <span className="flex-1">{b.nome}</span>
                      {vazio && <span className="text-xs text-ink/50">sem registro</span>}
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          {/* 4. texto */}
          <section className="rounded-xl bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-extrabold">{blocosDoTipo.length ? "4" : "3"}. Revisar e completar</p>
              <button className="btn-ghost text-sm" onClick={adicionarParte}>Adicionar parte</button>
            </div>
            <p className="mt-1 text-xs text-ink/60">
              Tudo pode ser editado. Partes em branco não aparecem no documento.
            </p>
            <div className="mt-3 space-y-4">
              {secoes.map((s) => {
                const extra = s.id.startsWith("extra-");
                const alterada = !!editadas[s.id];
                return (
                  <div key={s.id}>
                    {(s.titulo || extra) && (
                      <div className="mb-1 flex items-center gap-2">
                        <input className="field flex-1 font-semibold" value={s.titulo}
                          onChange={(e) => editar(s, { titulo: e.target.value })} />
                        {extra && (
                          <button className="text-sm text-danger" onClick={() => setExtras((xs) => xs.filter((x) => x.id !== s.id))}>
                            Remover
                          </button>
                        )}
                      </div>
                    )}
                    <textarea
                      className="field w-full"
                      rows={Math.max(2, Math.ceil(s.texto.length / 90) + s.texto.split("\n").length)}
                      value={s.texto}
                      placeholder={s.dica ?? (s.titulo ? `Escreva aqui: ${s.titulo.toLowerCase()}` : "")}
                      onChange={(e) => editar(s, { texto: e.target.value })}
                    />
                    {alterada && s.bloco && (
                      <button className="mt-1 text-xs text-ink/60 underline underline-offset-4" onClick={() => restaurar(s.id)}>
                        Voltar ao texto do prontuário
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {mostraClinico && (
              <div className="mt-4 grid gap-3 rounded-lg bg-paper p-3 md:grid-cols-[10rem_1fr]">
                <div>
                  <label className="label" htmlFor="cid">CID (opcional)</label>
                  <input id="cid" className="field w-full" placeholder="M22.2" value={cid} onChange={(e) => setCid(e.target.value)} />
                </div>
                <label className="flex items-start gap-2 self-end text-sm">
                  <input type="checkbox" className="mt-1" checked={cidAutorizado} onChange={(e) => setCidAutorizado(e.target.checked)} />
                  O paciente autorizou expressamente a inclusão do CID neste documento.
                </label>
              </div>
            )}
          </section>

          {/* CIF */}
          {mostraClinico && (
            <section className="rounded-xl bg-white p-4">
              <label className="flex items-center gap-2 text-base font-extrabold">
                <input type="checkbox" checked={usarCif} onChange={(e) => setUsarCif(e.target.checked)} />
                Incluir classificação CIF
              </label>
              <p className="mt-1 text-xs text-ink/60">
                Classificação Internacional de Funcionalidade, Incapacidade e Saúde (OMS). Fica salva no paciente e vem marcada no próximo documento.
                {cifSalva.length > 0 && !usarCif && " Este paciente já tem uma classificação salva."}
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
              {secoes.filter((s) => s.texto.trim()).map((s) => (
                <div key={s.id}>
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

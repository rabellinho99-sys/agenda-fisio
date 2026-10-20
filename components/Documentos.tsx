"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CifSeletor } from "@/components/CifSeletor";
import { PericiaCampos } from "@/components/PericiaCampos";
import { buscarPacientes, ordenarPorNome } from "@/lib/busca";
import { INFO_RECURSO, temRecurso, type Recurso, type Recursos } from "@/lib/planos";
import {
  codigoComQualificador,
  descricaoQualificador,
  ordenarItens,
  type CifCodigo,
  type CifItem,
} from "@/lib/cif";
import {
  BASE_LEGAL_ORCAMENTO,
  BASE_LEGAL_PRESCRICAO,
  IDS_ORCAMENTO,
  MODELOS_ORCAMENTO,
  ORCAMENTO_INICIAL,
  descontoOrcamento,
  novoItemOrcamento,
  subtotalItem,
  subtotalOrcamento,
  totalOrcamento,
  type DadosOrcamento,
  type DescontoTipo,
  type ItemOrcamento,
  BLOCOS,
  CAMPOS_INICIAIS,
  EXAMES_IMAGEM,
  EXAMES_LAB,
  FORMAS_PAGAMENTO,
  FUNCOES,
  IDS_RECIBO,
  LADOS,
  RECIBO_INICIAL,
  VIAS,
  PERICIA_INICIAL,
  centavos,
  centavosParaCampo,
  dataBR,
  diaISO,
  formatarReais,
  gerarSecoes,
  hojeISO,
  horaBR,
  inicioMesISO,
  isoParaBR,
  novoExame,
  novoItem,
  novoItemRecibo,
  totalRecibo,
  valorPorExtenso,
  type BlocoId,
  type Campos,
  type DadosRecibo,
  type ExameSolicitado,
  type ItemCatalogo,
  type ItemPrescricao,
  type ItemRecibo,
  type Paciente,
  type Pericia,
  type Prontuario,
  type Secao,
  type TipoDoc,
  type TipoExame,
  type TipoItem,
} from "@/lib/documentos";

type Corpo = {
  secoes: Secao[];
  cid?: string | null;
  cid_autorizado?: boolean;
  pericia?: Pericia;
  assinatura_rotulo?: string;
  solicitacao?: { exames: ExameSolicitado[]; hipotese: string };
  prescricao?: { itens: ItemPrescricao[] };
  recibo?: DadosRecibo & { total_cents?: number };
  orcamento?: DadosOrcamento & { total_cents?: number };
  rodape_legal?: string;
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
  { id: "recibo", nome: "Recibo", descricao: "Comprovante de pagamento para prestação de contas e Imposto de Renda, com as sessões puxadas da agenda." },
  { id: "orcamento", nome: "Orçamento e proposta de tratamento", descricao: "Plano terapêutico, sessões, valores, desconto, parcelamento e validade, com espaço para o aceite do paciente." },
  { id: "relatorio", nome: "Relatório fisioterapêutico", descricao: "Resumo do acompanhamento, montado a partir do prontuário." },
  { id: "encaminhamento", nome: "Encaminhamento", descricao: "Para médico ou outro profissional, com resumo clínico." },
  { id: "solicitacao", nome: "Solicitação de exames", descricao: "Exames de imagem e laboratoriais, com justificativa clínica e hipótese diagnóstica." },
  { id: "prescricao", nome: "Prescrição de medicamentos e fitoterápicos", descricao: "Receituário em branco para preencher, com a base legal do fisioterapeuta no rodapé." },
  { id: "laudo", nome: "Laudo pericial fisioterapêutico", descricao: "Como perito(a) do juízo: processo, exame, nexo, conclusão e quesitos." },
  { id: "parecer", nome: "Parecer técnico fisioterapêutico", descricao: "Como assistente técnico(a) ou a pedido particular, com quesitos." },
];

const TODOS_BLOCOS: Record<BlocoId, boolean> = {
  anamnese: true, avaliacao: true, testes: true, exames: true, condutas: true, evolucao: true, termos: true,
};

const RECURSO_DO_TIPO: Partial<Record<TipoDoc, Recurso>> = {
  relatorio: "documentos_clinicos",
  encaminhamento: "documentos_clinicos",
  solicitacao: "documentos_clinicos",
  prescricao: "pericia",
  laudo: "pericia",
  parecer: "pericia",
};

// partes montadas a partir dos campos da solicitação, da prescrição e do recibo (não guardar como edição manual)
const IDS_SOLICITACAO = ["exames_imagem", "exames_lab", "hipotese"];
const ehDosCampos = (id: string) =>
  IDS_SOLICITACAO.includes(id) || IDS_RECIBO.includes(id) || IDS_ORCAMENTO.includes(id) || id.startsWith("uso-");

type ApptRecibo = {
  id: string;
  starts_at: string;
  price_cents: number | null;
  discount_cents: number | null;
  services: { name: string } | { name: string }[] | null;
};

export function Documentos({ recursos, clinicId, pacientes: pacientesIniciais, documentos, catalogo, cidadeClinica }: Props) {
  const supabase = createClient();
  const [modo, setModo] = useState<"lista" | "novo">("lista");
  const [pacientes, setPacientes] = useState<Paciente[]>(() => ordenarPorNome(pacientesIniciais));
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
  const [catalogoMed, setCatalogoMed] = useState<ItemCatalogo[]>([]);

  // orçamento: serviços cadastrados para sugerir nome e valor
  const [servicosClinica, setServicosClinica] = useState<{ name: string; price_cents: number }[]>([]);

  // recibo
  const [puxando, setPuxando] = useState(false);
  const [avisoRecibo, setAvisoRecibo] = useState<string | null>(null);

  const paciente = pacientes.find((p) => p.id === pacienteId) ?? null;

  const pacientesEncontrados = useMemo(() => buscarPacientes(pacientes, buscaPaciente), [pacientes, buscaPaciente]);
  const pacientesFiltrados = pacientesEncontrados.slice(0, 30);

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
        supabase.from("physical_assessments").select("performed_at, ortho_results, strength_results, gonio_results, notes")
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

  // catálogo de medicamentos e fitoterápicos, carregado só quando a prescrição é aberta
  useEffect(() => {
    if (tipo !== "prescricao" || catalogoMed.length) return;
    (async () => {
      const { data } = await supabase
        .from("medication_catalog")
        .select("id, kind, name, category, default_route")
        .order("sort");
      setCatalogoMed((data as ItemCatalogo[]) ?? []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  // serviços da clínica, carregados só quando o orçamento é aberto
  useEffect(() => {
    if (tipo !== "orcamento" || servicosClinica.length) return;
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("name, price_cents")
        .eq("clinic_id", clinicId)
        .eq("active", true)
        .order("name");
      setServicosClinica((data as { name: string; price_cents: number }[]) ?? []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

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
    setAvisoRecibo(null);
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
    if (d.body?.prescricao) {
      for (const id of Object.keys(ed)) if (id.startsWith("uso-")) delete ed[id];
      setCampos({ ...CAMPOS_INICIAIS, itens: d.body.prescricao.itens ?? [] });
    }
    if (d.body?.solicitacao) {
      // os exames e a hipótese voltam para os campos e o texto é remontado a partir deles
      for (const id of IDS_SOLICITACAO) delete ed[id];
      setCampos({
        ...CAMPOS_INICIAIS,
        exames: d.body.solicitacao.exames ?? [],
        hipotese: d.body.solicitacao.hipotese ?? "",
      });
    }
    if (d.body?.orcamento) {
      for (const id of IDS_ORCAMENTO) delete ed[id];
      setCampos({ ...CAMPOS_INICIAIS, orcamento: { ...ORCAMENTO_INICIAL, ...d.body.orcamento } });
    }
    if (d.body?.recibo) {
      // os itens, o pagador e o pagamento voltam para os campos e o texto é remontado
      for (const id of IDS_RECIBO) delete ed[id];
      setCampos({ ...CAMPOS_INICIAIS, recibo: { ...RECIBO_INICIAL, ...d.body.recibo } });
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

  // ---------- exames da solicitação ----------
  function adicionarExame(t: TipoExame) {
    setCampos((c) => ({ ...c, exames: [...c.exames, novoExame(t)] }));
  }

  function mudarExame(id: string, mudanca: Partial<ExameSolicitado>) {
    setCampos((c) => ({ ...c, exames: c.exames.map((e) => (e.id === id ? { ...e, ...mudanca } : e)) }));
    // a lista foi alterada: o texto volta a ser montado a partir dos campos
    restaurar("exames_imagem");
    restaurar("exames_lab");
  }

  function removerExame(id: string) {
    setCampos((c) => ({ ...c, exames: c.exames.filter((e) => e.id !== id) }));
    restaurar("exames_imagem");
    restaurar("exames_lab");
  }

  // ---------- itens da prescrição ----------
  function limparUsos() {
    setEditadas((e) => {
      const n = { ...e };
      for (const k of Object.keys(n)) if (k.startsWith("uso-")) delete n[k];
      return n;
    });
  }

  function adicionarItem(t: TipoItem) {
    setCampos((c) => ({ ...c, itens: [...c.itens, novoItem(t)] }));
    limparUsos();
  }

  function mudarItem(id: string, mudanca: Partial<ItemPrescricao>) {
    setCampos((c) => ({ ...c, itens: c.itens.map((i) => (i.id === id ? { ...i, ...mudanca } : i)) }));
    limparUsos();
  }

  function escolherNome(it: ItemPrescricao, nome: string) {
    const doCatalogo = catalogoMed.find((c) => c.name === nome);
    mudarItem(it.id, doCatalogo
      ? { nome, tipo: doCatalogo.kind, via: doCatalogo.default_route || it.via }
      : { nome });
  }

  function removerItem(id: string) {
    setCampos((c) => ({ ...c, itens: c.itens.filter((i) => i.id !== id) }));
    limparUsos();
  }

  // ---------- orçamento ----------
  function limparOrcamento() {
    setEditadas((e) => {
      const n = { ...e };
      for (const k of IDS_ORCAMENTO) delete n[k];
      return n;
    });
  }

  function mudarOrcamento(mudanca: Partial<DadosOrcamento>) {
    setCampos((c) => ({ ...c, orcamento: { ...c.orcamento, ...mudanca } }));
    limparOrcamento();
  }

  function mudarItemOrc(id: string, mudanca: Partial<ItemOrcamento>) {
    setCampos((c) => ({
      ...c,
      orcamento: { ...c.orcamento, itens: c.orcamento.itens.map((i) => (i.id === id ? { ...i, ...mudanca } : i)) },
    }));
    limparOrcamento();
  }

  // ao escolher um serviço cadastrado, o valor vem junto (se ainda estiver vazio)
  function escolherServicoOrc(it: ItemOrcamento, nome: string) {
    const sv = servicosClinica.find((x) => x.name === nome);
    mudarItemOrc(it.id, sv && !it.valor.trim() && sv.price_cents > 0
      ? { descricao: nome, valor: centavosParaCampo(sv.price_cents) }
      : { descricao: nome });
  }

  function adicionarItemOrc() {
    setCampos((c) => ({ ...c, orcamento: { ...c.orcamento, itens: [...c.orcamento.itens, novoItemOrcamento()] } }));
    limparOrcamento();
  }

  function removerItemOrc(id: string) {
    setCampos((c) => ({ ...c, orcamento: { ...c.orcamento, itens: c.orcamento.itens.filter((i) => i.id !== id) } }));
    limparOrcamento();
  }

  function aplicarModelo(id: string) {
    const m = MODELOS_ORCAMENTO.find((x) => x.id === id);
    if (!m) return;
    if (campos.orcamento.itens.some((i) => i.descricao.trim()) &&
        !window.confirm("Substituir os itens atuais pelos do modelo?")) return;
    const itens = m.itens.map(([d, q, v]) => {
      const sv = servicosClinica.find((x) => x.name.toLowerCase() === d.toLowerCase());
      return novoItemOrcamento(d, q, v || (sv?.price_cents ? centavosParaCampo(sv.price_cents) : ""));
    });
    mudarOrcamento({ itens, frequencia: m.frequencia, duracao: m.duracao });
  }

  function alternarForma(f: string) {
    const formas = campos.orcamento.formas.includes(f)
      ? campos.orcamento.formas.filter((x) => x !== f)
      : [...campos.orcamento.formas, f];
    mudarOrcamento({ formas });
  }

  // ---------- recibo ----------
  function limparRecibo() {
    setEditadas((e) => {
      const n = { ...e };
      for (const k of IDS_RECIBO) delete n[k];
      return n;
    });
  }

  function mudarRecibo(mudanca: Partial<DadosRecibo>) {
    setCampos((c) => ({ ...c, recibo: { ...c.recibo, ...mudanca } }));
    limparRecibo();
  }

  function mudarItemRecibo(id: string, mudanca: Partial<ItemRecibo>) {
    setCampos((c) => ({
      ...c,
      recibo: { ...c.recibo, itens: c.recibo.itens.map((i) => (i.id === id ? { ...i, ...mudanca } : i)) },
    }));
    limparRecibo();
  }

  function adicionarItemRecibo() {
    setCampos((c) => ({
      ...c,
      recibo: { ...c.recibo, itens: [...c.recibo.itens, novoItemRecibo(hojeISO(), "Atendimento fisioterapêutico", "")] },
    }));
    limparRecibo();
  }

  function removerItemRecibo(id: string) {
    setCampos((c) => ({ ...c, recibo: { ...c.recibo, itens: c.recibo.itens.filter((i) => i.id !== id) } }));
    limparRecibo();
  }

  async function puxarAtendimentos() {
    if (!paciente) return;
    const de = campos.recibo.de || inicioMesISO();
    const ate = campos.recibo.ate || hojeISO();
    if (de > ate) return setAvisoRecibo("A data inicial está depois da data final.");
    setAvisoRecibo(null);
    setPuxando(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("id, starts_at, price_cents, discount_cents, services(name)")
      .eq("patient_id", paciente.id)
      .gte("starts_at", new Date(`${de}T00:00:00-03:00`).toISOString())
      .lte("starts_at", new Date(`${ate}T23:59:59-03:00`).toISOString())
      .not("status", "in", "(cancelled_by_patient,cancelled_by_clinic,no_show,pending)")
      .order("starts_at", { ascending: true });
    setPuxando(false);
    if (error) return setAvisoRecibo(`Não foi possível buscar os atendimentos: ${error.message}`);
    const lista = (data as unknown as ApptRecibo[]) ?? [];
    if (!lista.length) {
      return setAvisoRecibo("Nenhum atendimento confirmado nesse período. Ajuste as datas ou adicione os itens manualmente.");
    }
    const itens = lista.map((a) => {
      const serv = Array.isArray(a.services) ? a.services[0] : a.services;
      const valor = Math.max(0, (a.price_cents ?? 0) - (a.discount_cents ?? 0));
      return novoItemRecibo(
        diaISO(a.starts_at),
        serv?.name?.trim() || "Atendimento fisioterapêutico",
        valor ? centavosParaCampo(valor) : ""
      );
    });
    const semValor = itens.filter((i) => !centavos(i.valor)).length;
    setCampos((c) => ({ ...c, recibo: { ...c.recibo, de, ate, itens } }));
    limparRecibo();
    setAvisoRecibo(
      `${itens.length} ${itens.length === 1 ? "atendimento encontrado" : "atendimentos encontrados"}.` +
        (semValor ? ` ${semValor} sem valor na agenda (ex.: sessões de pacote): preencha o valor ou remova.` : "")
    );
  }

  const tituloDoc = TIPOS.find((t) => t.id === tipo)?.nome ?? "Documento";
  const ehPericia = tipo === "parecer" || tipo === "laudo";
  const ehPrescricao = tipo === "prescricao";
  const ehRecibo = tipo === "recibo";
  const ehOrcamento = tipo === "orcamento";
  const mostraClinico = tipo !== "declaracao" && !ehPrescricao && !ehRecibo && !ehOrcamento;
  const itensOrcValidos = campos.orcamento.itens.filter((i) => i.descricao.trim());
  const orcSub = subtotalOrcamento(itensOrcValidos);
  const orcDesc = descontoOrcamento({ ...campos.orcamento, itens: itensOrcValidos });
  const orcTotal = totalOrcamento({ ...campos.orcamento, itens: itensOrcValidos });
  const totalAtual = totalRecibo(campos.recibo.itens.filter((i) => i.descricao.trim()));

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
    setPacientes((ps) => ordenarPorNome([...ps, data as Paciente]));
    setPacienteId((data as Paciente).id);
    setNovoPac(null);
  }

  async function emitir() {
    setErro(null);
    if (!paciente) return setErro("Escolha o paciente.");
    const examesValidos = campos.exames.filter((e) => e.exame.trim());
    if (tipo === "solicitacao" && !examesValidos.length) {
      return setErro("Adicione pelo menos um exame à solicitação.");
    }
    const itensValidos = campos.itens.filter((i) => i.nome.trim());
    if (ehPrescricao && !itensValidos.length) {
      return setErro("Adicione pelo menos um medicamento ou fitoterápico.");
    }
    if (ehPrescricao && itensValidos.some((i) => !i.posologia.trim())) {
      return setErro("Preencha a posologia de todos os itens da prescrição.");
    }
    const itensRecibo = campos.recibo.itens.filter((i) => i.descricao.trim() && centavos(i.valor) > 0);
    if (ehRecibo) {
      if (campos.recibo.itens.some((i) => i.descricao.trim() && !centavos(i.valor))) {
        return setErro("Há itens do recibo sem valor. Preencha o valor ou remova o item.");
      }
      if (!itensRecibo.length) return setErro("Adicione pelo menos um item com valor ao recibo.");
      if (campos.recibo.pagadorOutro && !campos.recibo.pagadorNome.trim()) {
        return setErro("Informe o nome de quem fez o pagamento.");
      }
    }
    if (ehOrcamento) {
      if (!itensOrcValidos.length) return setErro("Adicione pelo menos um item ao orçamento.");
      if (itensOrcValidos.some((i) => !subtotalItem(i))) {
        return setErro("Há itens do orçamento sem quantidade ou valor. Preencha ou remova o item.");
      }
    }
    const finais = secoes.filter((s) => s.texto.trim());
    if (!finais.length) return setErro("O documento está sem texto.");
    if (cid.trim() && !cidAutorizado) {
      return setErro("Para incluir o CID, confirme que o paciente autorizou. Ou apague o campo CID.");
    }
    const pendentes = finais.some((s) => /\[(responder|solicitante|nome de quem pagou|valor)\]/.test(s.texto));
    if (pendentes && !window.confirm("Há quesitos sem resposta ou campos marcados entre colchetes. Emitir mesmo assim?")) return;
    if (!window.confirm("Depois de emitido, o documento não pode ser alterado (só substituído por nova versão). Emitir agora?")) return;
    setEmitindo(true);
    const corpo: Corpo = {
      secoes: finais.map(({ id, titulo, texto }) => ({ id, titulo, texto })),
      cid: mostraClinico ? cid.trim() || null : null,
      cid_autorizado: mostraClinico && cid.trim() ? cidAutorizado : false,
      ...(ehPericia
        ? { pericia, assinatura_rotulo: FUNCOES.find((f) => f.id === pericia.funcao)?.assinatura ?? "Fisioterapeuta" }
        : {}),
      ...(tipo === "solicitacao"
        ? { solicitacao: { exames: examesValidos, hipotese: campos.hipotese.trim() } }
        : {}),
      ...(ehPrescricao ? { prescricao: { itens: itensValidos }, rodape_legal: BASE_LEGAL_PRESCRICAO } : {}),
      ...(ehOrcamento
        ? {
            orcamento: { ...campos.orcamento, itens: itensOrcValidos, total_cents: orcTotal },
            rodape_legal: BASE_LEGAL_ORCAMENTO,
          }
        : {}),
      ...(ehRecibo
        ? {
            recibo: {
              ...campos.recibo,
              itens: itensRecibo,
              dataRecebimento: campos.recibo.dataRecebimento || hojeISO(),
              total_cents: totalRecibo(itensRecibo),
            },
          }
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
              Declarações, atestados, recibos, orçamentos, relatórios, encaminhamentos, solicitações de exames e prescrições.
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
                    <td className="px-3 py-2">
                      {d.title}
                      {d.doc_type === "recibo" && d.body?.recibo?.total_cents
                        ? <span className="text-ink/60"> · {formatarReais(d.body.recibo.total_cents)}</span>
                        : null}
                      {d.doc_type === "orcamento" && d.body?.orcamento?.total_cents
                        ? <span className="text-ink/60"> · {formatarReais(d.body.orcamento.total_cents)}</span>
                        : null}
                    </td>
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
            {pacientesEncontrados.length === 0 && !novoPac && (
              <p className="mt-2 text-sm text-ink/60">Nenhum paciente encontrado.</p>
            )}
            {pacientesEncontrados.length > 30 && (
              <p className="mt-2 text-xs text-ink/60">
                Mostrando 30 de {pacientesEncontrados.length}. Digite parte do nome para encontrar os demais.
              </p>
            )}
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
                    setAvisoRecibo(null);
                    if (t.id === "laudo") setPericia((p) => ({ ...p, funcao: "perito" }));
                    if (t.id === "parecer" && pericia.funcao === "perito") setPericia((p) => ({ ...p, funcao: "assistente_autor" }));
                    if (t.id === "solicitacao" && campos.exames.length === 0) {
                      setCampos((c) => ({ ...c, exames: [novoExame("imagem")] }));
                    }
                    if (t.id === "prescricao" && campos.itens.length === 0) {
                      setCampos((c) => ({ ...c, itens: [novoItem("medicamento")] }));
                    }
                    if (t.id === "orcamento" && campos.orcamento.itens.length === 0) {
                      // data da primeira consulta como data da avaliação
                      const primeira = prontuario?.atendimentos[prontuario.atendimentos.length - 1];
                      setCampos((c) => ({
                        ...c,
                        orcamento: {
                          ...c.orcamento,
                          avaliacaoData: c.orcamento.avaliacaoData || (primeira ? diaISO(primeira.starts_at) : ""),
                          itens: [novoItemOrcamento()],
                        },
                      }));
                    }
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
              {ehOrcamento && (
                <>
                  <div className="space-y-2 md:col-span-2">
                    <p className="label">Começar por um modelo (opcional)</p>
                    <div className="flex flex-wrap gap-2">
                      {MODELOS_ORCAMENTO.map((m) => (
                        <button key={m.id} type="button" className="btn-ghost text-sm" onClick={() => aplicarModelo(m.id)}>
                          {m.nome}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-ink/60">
                      Os modelos só preenchem os itens; ajuste nomes, quantidades e valores como quiser. Serviços cadastrados trazem o valor sozinhos.
                    </p>
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <p className="label">Itens do tratamento</p>
                    <datalist id="lista-servicos-orc">
                      {servicosClinica.map((sv) => <option key={sv.name} value={sv.name} />)}
                    </datalist>
                    {campos.orcamento.itens.map((it, i) => (
                      <div key={it.id} className="grid gap-3 rounded-lg border border-ink/10 p-3 sm:grid-cols-[1fr_6rem_8rem_auto]">
                        <div>
                          <label className="label" htmlFor={`od-${it.id}`}>Item {i + 1}</label>
                          <input id={`od-${it.id}`} className="field w-full" list="lista-servicos-orc" value={it.descricao}
                            placeholder="Ex.: Sessão de fisioterapia"
                            onChange={(e) => escolherServicoOrc(it, e.target.value)} />
                        </div>
                        <div>
                          <label className="label" htmlFor={`oq-${it.id}`}>Qtd.</label>
                          <input id={`oq-${it.id}`} inputMode="numeric" className="field w-full" value={it.quantidade}
                            onChange={(e) => mudarItemOrc(it.id, { quantidade: e.target.value })} />
                        </div>
                        <div>
                          <label className="label" htmlFor={`ov-${it.id}`}>Valor unit. (R$)</label>
                          <input id={`ov-${it.id}`} inputMode="decimal" className="field w-full" value={it.valor} placeholder="0,00"
                            onChange={(e) => mudarItemOrc(it.id, { valor: e.target.value })} />
                        </div>
                        <div className="flex flex-col items-end justify-end gap-1">
                          <span className="text-sm font-semibold">{formatarReais(subtotalItem(it))}</span>
                          <button className="text-sm text-danger" onClick={() => removerItemOrc(it.id)}>Remover</button>
                        </div>
                      </div>
                    ))}
                    <button className="btn-ghost text-sm" onClick={adicionarItemOrc}>Adicionar item</button>
                  </div>

                  <div>
                    <label className="label" htmlFor="orc-freq">Frequência sugerida</label>
                    <input id="orc-freq" className="field w-full" value={campos.orcamento.frequencia}
                      placeholder="Ex.: 2 vezes por semana" onChange={(e) => mudarOrcamento({ frequencia: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="orc-dur">Duração estimada</label>
                    <input id="orc-dur" className="field w-full" value={campos.orcamento.duracao}
                      placeholder="Ex.: 8 semanas" onChange={(e) => mudarOrcamento({ duracao: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="orc-aval">Data da avaliação (opcional)</label>
                    <input id="orc-aval" type="date" className="field w-full" value={campos.orcamento.avaliacaoData}
                      onChange={(e) => mudarOrcamento({ avaliacaoData: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="orc-ini">Previsão de início (opcional)</label>
                    <input id="orc-ini" type="date" className="field w-full" value={campos.orcamento.inicio}
                      onChange={(e) => mudarOrcamento({ inicio: e.target.value })} />
                  </div>

                  <div className="space-y-2 rounded-lg bg-paper p-3 md:col-span-2">
                    <p className="label">Desconto</p>
                    <div className="grid gap-3 sm:grid-cols-[12rem_8rem_1fr]">
                      <select className="field w-full" value={campos.orcamento.descontoTipo}
                        onChange={(e) => mudarOrcamento({ descontoTipo: e.target.value as DescontoTipo })}>
                        <option value="nenhum">Sem desconto</option>
                        <option value="percentual">Percentual (%)</option>
                        <option value="valor">Valor (R$)</option>
                      </select>
                      {campos.orcamento.descontoTipo !== "nenhum" && (
                        <>
                          <input inputMode="decimal" className="field w-full" value={campos.orcamento.desconto}
                            placeholder={campos.orcamento.descontoTipo === "percentual" ? "10" : "0,00"}
                            onChange={(e) => mudarOrcamento({ desconto: e.target.value })} />
                          <input className="field w-full" value={campos.orcamento.descontoCondicao}
                            placeholder="Condição (ex.: pagamento à vista no Pix)"
                            onChange={(e) => mudarOrcamento({ descontoCondicao: e.target.value })} />
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 text-sm">
                      {orcDesc > 0 && <span className="text-ink/70">Subtotal: {formatarReais(orcSub)}</span>}
                      {orcDesc > 0 && <span className="text-ink/70">Desconto: {formatarReais(orcDesc)}</span>}
                      <span className="text-base font-extrabold">Total: {formatarReais(orcTotal)}</span>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <p className="label">Formas de pagamento aceitas</p>
                    <div className="flex flex-wrap gap-2">
                      {FORMAS_PAGAMENTO.map((f) => {
                        const on = campos.orcamento.formas.includes(f);
                        return (
                          <button key={f} type="button" onClick={() => alternarForma(f)}
                            className={`rounded-lg border px-3 py-1.5 text-sm ${on ? "border-ink bg-paper font-semibold" : "border-ink/15 text-ink/60"}`}>
                            {on ? "✓ " : ""}{f}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="orc-parc">Parcelar no cartão em até</label>
                    <select id="orc-parc" className="field w-full" value={campos.orcamento.parcelas}
                      onChange={(e) => mudarOrcamento({ parcelas: e.target.value })}>
                      {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((n) => (
                        <option key={n} value={n}>{n === "1" ? "Sem parcelamento" : `${n} vezes`}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="orc-val">Validade do orçamento</label>
                    <select id="orc-val" className="field w-full" value={campos.orcamento.validadeDias}
                      onChange={(e) => mudarOrcamento({ validadeDias: e.target.value })}>
                      {["7", "10", "15", "30"].map((d) => <option key={d} value={d}>{d} dias</option>)}
                    </select>
                  </div>
                  <label className="flex items-start gap-2 text-sm md:col-span-2">
                    <input type="checkbox" className="mt-1" checked={campos.orcamento.aceite}
                      onChange={(e) => mudarOrcamento({ aceite: e.target.checked })} />
                    Incluir espaço para o aceite e a assinatura do paciente
                  </label>
                  <p className="text-xs text-ink/60 md:col-span-2">
                    O documento já sai com &quot;Considerações importantes&quot; explicando que a fisioterapia é obrigação de meio e que
                    os resultados não podem ser garantidos, e com a base legal no rodapé. Você pode editar qualquer parte na lista ao lado.
                  </p>
                </>
              )}
              {ehRecibo && (
                <>
                  <div className="space-y-3 md:col-span-2">
                    <p className="label">Atendimentos cobrados</p>
                    <div className="grid gap-3 rounded-lg bg-paper p-3 sm:grid-cols-[1fr_1fr_auto]">
                      <div>
                        <label className="label" htmlFor="rec-de">De</label>
                        <input id="rec-de" type="date" className="field w-full" value={campos.recibo.de || inicioMesISO()}
                          onChange={(e) => mudarRecibo({ de: e.target.value })} />
                      </div>
                      <div>
                        <label className="label" htmlFor="rec-ate">Até</label>
                        <input id="rec-ate" type="date" className="field w-full" value={campos.recibo.ate || hojeISO()}
                          onChange={(e) => mudarRecibo({ ate: e.target.value })} />
                      </div>
                      <div className="flex items-end">
                        <button className="btn-ghost w-full text-sm" onClick={puxarAtendimentos} disabled={puxando}>
                          {puxando ? "Buscando" : "Puxar da agenda"}
                        </button>
                      </div>
                      <p className="text-xs text-ink/60 sm:col-span-3">
                        Busca os atendimentos confirmados do paciente no período, com o serviço e o valor cadastrados na agenda.
                      </p>
                    </div>
                    {avisoRecibo && <p className="text-sm text-ink/70">{avisoRecibo}</p>}

                    {campos.recibo.itens.length === 0 && (
                      <p className="text-xs text-ink/60">
                        Nenhum item ainda. Puxe da agenda ou adicione manualmente (ex.: pacote pago à vista).
                      </p>
                    )}
                    {campos.recibo.itens.map((it, i) => (
                      <div key={it.id} className="grid gap-3 rounded-lg border border-ink/10 p-3 sm:grid-cols-[10rem_1fr_8rem_auto]">
                        <div>
                          <label className="label" htmlFor={`rd-${it.id}`}>Item {i + 1}: data</label>
                          <input id={`rd-${it.id}`} type="date" className="field w-full" value={it.data}
                            onChange={(e) => mudarItemRecibo(it.id, { data: e.target.value })} />
                        </div>
                        <div>
                          <label className="label" htmlFor={`rs-${it.id}`}>Serviço</label>
                          <input id={`rs-${it.id}`} className="field w-full" value={it.descricao}
                            placeholder="Ex.: Sessão de fisioterapia"
                            onChange={(e) => mudarItemRecibo(it.id, { descricao: e.target.value })} />
                        </div>
                        <div>
                          <label className="label" htmlFor={`rv-${it.id}`}>Valor (R$)</label>
                          <input id={`rv-${it.id}`} inputMode="decimal" className="field w-full" value={it.valor}
                            placeholder="0,00"
                            onChange={(e) => mudarItemRecibo(it.id, { valor: e.target.value })} />
                        </div>
                        <div className="flex items-end">
                          <button className="text-sm text-danger" onClick={() => removerItemRecibo(it.id)}>Remover</button>
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button className="btn-ghost text-sm" onClick={adicionarItemRecibo}>Adicionar item manual</button>
                      <p className="text-base font-extrabold">Total: {formatarReais(totalAtual)}</p>
                    </div>
                    {totalAtual > 0 && (
                      <p className="text-right text-xs text-ink/60">Por extenso: {valorPorExtenso(totalAtual)}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="label" htmlFor="rec-ref">Referente a</label>
                    <input id="rec-ref" className="field w-full" value={campos.recibo.referente}
                      placeholder="atendimentos fisioterapêuticos"
                      onChange={(e) => mudarRecibo({ referente: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="rec-forma">Forma de pagamento</label>
                    <select id="rec-forma" className="field w-full" value={campos.recibo.forma}
                      onChange={(e) => mudarRecibo({ forma: e.target.value })}>
                      {FORMAS_PAGAMENTO.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="rec-data">Data do recebimento</label>
                    <input id="rec-data" type="date" className="field w-full" value={campos.recibo.dataRecebimento || hojeISO()}
                      onChange={(e) => mudarRecibo({ dataRecebimento: e.target.value })} />
                  </div>
                  <label className="flex items-start gap-2 text-sm md:col-span-2">
                    <input type="checkbox" className="mt-1" checked={campos.recibo.pagadorOutro}
                      onChange={(e) => mudarRecibo({ pagadorOutro: e.target.checked })} />
                    Quem pagou não é o próprio paciente (mãe, pai, responsável, empresa)
                  </label>
                  {campos.recibo.pagadorOutro && (
                    <>
                      <div>
                        <label className="label" htmlFor="rec-pnome">Nome de quem pagou</label>
                        <input id="rec-pnome" className="field w-full" value={campos.recibo.pagadorNome}
                          onChange={(e) => mudarRecibo({ pagadorNome: e.target.value })} />
                      </div>
                      <div>
                        <label className="label" htmlFor="rec-pcpf">CPF ou CNPJ de quem pagou</label>
                        <input id="rec-pcpf" className="field w-full" value={campos.recibo.pagadorCpf}
                          onChange={(e) => mudarRecibo({ pagadorCpf: e.target.value })} />
                      </div>
                    </>
                  )}
                  <p className="text-xs text-ink/60 md:col-span-2">
                    Para o paciente usar no Imposto de Renda, o recibo precisa do seu CPF ou CNPJ e do endereço, que saem
                    no cabeçalho a partir dos dados da clínica. Confira se estão preenchidos antes de emitir.
                  </p>
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
              {tipo === "solicitacao" && (
                <>
                  <div className="space-y-3 md:col-span-2">
                    <p className="label">Exames solicitados</p>
                    {campos.exames.length === 0 && (
                      <p className="text-xs text-ink/60">Nenhum exame na lista. Use os botões abaixo para adicionar.</p>
                    )}
                    {campos.exames.map((ex, i) => (
                      <div key={ex.id} className="grid gap-3 rounded-lg bg-paper p-3 md:grid-cols-4">
                        <div>
                          <label className="label" htmlFor={`tipo-${ex.id}`}>Exame {i + 1}: tipo</label>
                          <select
                            id={`tipo-${ex.id}`}
                            className="field w-full"
                            value={ex.tipo}
                            onChange={(e) => {
                              const t = e.target.value as TipoExame;
                              mudarExame(ex.id, t === "laboratorial" ? { tipo: t, regiao: "", lado: "" } : { tipo: t });
                            }}
                          >
                            <option value="imagem">Imagem</option>
                            <option value="laboratorial">Laboratorial</option>
                          </select>
                        </div>
                        <div className={ex.tipo === "imagem" ? "" : "md:col-span-3"}>
                          <label className="label" htmlFor={`exame-${ex.id}`}>Exame</label>
                          <input
                            id={`exame-${ex.id}`}
                            className="field w-full"
                            list={ex.tipo === "imagem" ? "lista-exames-imagem" : "lista-exames-lab"}
                            placeholder={ex.tipo === "imagem" ? "Escolha ou digite" : "Escolha ou digite"}
                            value={ex.exame}
                            onChange={(e) => mudarExame(ex.id, { exame: e.target.value })}
                          />
                        </div>
                        {ex.tipo === "imagem" && (
                          <>
                            <div>
                              <label className="label" htmlFor={`regiao-${ex.id}`}>Região</label>
                              <input
                                id={`regiao-${ex.id}`}
                                className="field w-full"
                                placeholder="Ex.: joelho"
                                value={ex.regiao}
                                onChange={(e) => mudarExame(ex.id, { regiao: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="label" htmlFor={`lado-${ex.id}`}>Lado</label>
                              <select
                                id={`lado-${ex.id}`}
                                className="field w-full"
                                value={ex.lado}
                                onChange={(e) => mudarExame(ex.id, { lado: e.target.value })}
                              >
                                {LADOS.map((l) => (
                                  <option key={l.id} value={l.id}>{l.nome}</option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}
                        <div className="md:col-span-4">
                          <label className="label" htmlFor={`just-${ex.id}`}>Justificativa clínica</label>
                          <textarea
                            id={`just-${ex.id}`}
                            className="field w-full"
                            rows={2}
                            placeholder={
                              ex.tipo === "imagem"
                                ? "Ex.: dor no joelho há 3 meses, McMurray positivo, investigar lesão meniscal."
                                : "Ex.: dor difusa e fadiga, investigar processo inflamatório e deficiência de vitamina D."
                            }
                            value={ex.justificativa}
                            onChange={(e) => mudarExame(ex.id, { justificativa: e.target.value })}
                          />
                        </div>
                        <div className="md:col-span-4">
                          <button className="text-sm text-danger" onClick={() => removerExame(ex.id)}>
                            Remover exame
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-ghost text-sm" onClick={() => adicionarExame("imagem")}>
                        Adicionar exame de imagem
                      </button>
                      <button className="btn-ghost text-sm" onClick={() => adicionarExame("laboratorial")}>
                        Adicionar exame laboratorial
                      </button>
                    </div>
                    <datalist id="lista-exames-imagem">
                      {EXAMES_IMAGEM.map((e) => <option key={e} value={e} />)}
                    </datalist>
                    <datalist id="lista-exames-lab">
                      {EXAMES_LAB.map((e) => <option key={e} value={e} />)}
                    </datalist>
                  </div>
                  <div className="md:col-span-2">
                    <label className="label" htmlFor="hipotese">Hipótese diagnóstica</label>
                    <textarea
                      id="hipotese"
                      className="field w-full"
                      rows={2}
                      placeholder="Ex.: disfunção cinesiológica funcional do joelho direito, compatível com lesão meniscal medial."
                      value={campos.hipotese}
                      onChange={(e) => {
                        setCampos({ ...campos, hipotese: e.target.value });
                        restaurar("hipotese");
                      }}
                    />
                    <p className="mt-1 text-xs text-ink/60">
                      Se quiser o CID junto, use o campo CID mais abaixo (exige autorização do paciente).
                    </p>
                  </div>
                </>
              )}
              {ehPrescricao && (
                <div className="space-y-3 md:col-span-2">
                  <p className="label">Itens da prescrição</p>
                  {campos.itens.length === 0 && (
                    <p className="text-xs text-ink/60">Nenhum item na lista. Use os botões abaixo para adicionar.</p>
                  )}
                  {campos.itens.map((it, i) => (
                    <div key={it.id} className="grid gap-3 rounded-lg bg-paper p-3 md:grid-cols-4">
                      <div>
                        <label className="label" htmlFor={`tipoit-${it.id}`}>Item {i + 1}: tipo</label>
                        <select
                          id={`tipoit-${it.id}`}
                          className="field w-full"
                          value={it.tipo}
                          onChange={(e) => mudarItem(it.id, { tipo: e.target.value as TipoItem })}
                        >
                          <option value="medicamento">Medicamento</option>
                          <option value="fitoterapico">Fitoterápico</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="label" htmlFor={`nome-${it.id}`}>
                          {it.tipo === "fitoterapico" ? "Fitoterápico" : "Medicamento"} e apresentação
                        </label>
                        <input
                          id={`nome-${it.id}`}
                          className="field w-full"
                          list={it.tipo === "fitoterapico" ? "lista-fitoterapicos" : "lista-medicamentos"}
                          placeholder="Escolha da lista ou digite"
                          value={it.nome}
                          onChange={(e) => escolherNome(it, e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor={`via-${it.id}`}>Via de administração</label>
                        <select
                          id={`via-${it.id}`}
                          className="field w-full"
                          value={it.via}
                          onChange={(e) => mudarItem(it.id, { via: e.target.value })}
                        >
                          {VIAS.map((v) => (
                            <option key={v.id} value={v.id}>{v.nome}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-3">
                        <label className="label" htmlFor={`pos-${it.id}`}>Posologia</label>
                        <input
                          id={`pos-${it.id}`}
                          className="field w-full"
                          placeholder="Escreva a dose, a frequência e a forma de uso"
                          value={it.posologia}
                          onChange={(e) => mudarItem(it.id, { posologia: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor={`dur-${it.id}`}>Duração</label>
                        <input
                          id={`dur-${it.id}`}
                          className="field w-full"
                          placeholder="Ex.: 7 dias"
                          value={it.duracao}
                          onChange={(e) => mudarItem(it.id, { duracao: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-4">
                        <button className="text-sm text-danger" onClick={() => removerItem(it.id)}>
                          Remover item
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-ghost text-sm" onClick={() => adicionarItem("medicamento")}>
                      Adicionar medicamento
                    </button>
                    <button className="btn-ghost text-sm" onClick={() => adicionarItem("fitoterapico")}>
                      Adicionar fitoterápico
                    </button>
                  </div>
                  <datalist id="lista-medicamentos">
                    {catalogoMed.filter((c) => c.kind === "medicamento").map((c) => <option key={c.id} value={c.name} />)}
                  </datalist>
                  <datalist id="lista-fitoterapicos">
                    {catalogoMed.filter((c) => c.kind === "fitoterapico").map((c) => <option key={c.id} value={c.name} />)}
                  </datalist>
                  <p className="text-xs text-ink/60">
                    A lista é só um atalho de preenchimento. A escolha, a dose e o respeito aos limites legais da prescrição
                    são de responsabilidade do profissional. A base legal sai automaticamente no rodapé do documento.
                  </p>
                </div>
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
                const daLista = ehDosCampos(s.id);
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
                    {alterada && (s.bloco || daLista) && (
                      <button className="mt-1 text-xs text-ink/60 underline underline-offset-4" onClick={() => restaurar(s.id)}>
                        {daLista ? "Voltar ao texto montado pelos campos" : "Voltar ao texto do prontuário"}
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
              {ehRecibo && totalAtual > 0 && (
                <p className="text-center text-lg font-extrabold">Valor: {formatarReais(totalAtual)}</p>
              )}
              {ehOrcamento && orcTotal > 0 && (
                <p className="text-center text-lg font-extrabold">Investimento total: {formatarReais(orcTotal)}</p>
              )}
              {secoes.filter((s) => s.texto.trim()).map((s) => (
                <div key={s.id}>
                  {s.titulo && <p className="font-semibold">{s.titulo}</p>}
                  <p className="whitespace-pre-line">{s.texto}</p>
                </div>
              ))}
              {mostraClinico && cid.trim() && cidAutorizado && <p>CID: {cid.trim()} (inclusão autorizada pelo paciente).</p>}
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
              {ehPrescricao && (
                <p className="border-t border-ink/10 pt-2 text-xs text-ink/60">{BASE_LEGAL_PRESCRICAO}</p>
              )}
              {ehOrcamento && (
                <p className="border-t border-ink/10 pt-2 text-xs text-ink/60">{BASE_LEGAL_ORCAMENTO}</p>
              )}
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

// Montagem automática do texto dos documentos a partir do prontuário.
// Funções puras: recebem os dados e devolvem as partes do documento.

import { textoForca, textoOrto, type LinhaForca, type ResultadoOrto } from "./forca";
import { textoGoniometria, type LinhaGonio } from "./goniometria";

export type TipoDoc =
  | "declaracao"
  | "atestado"
  | "recibo"
  | "relatorio"
  | "encaminhamento"
  | "solicitacao"
  | "prescricao"
  | "parecer"
  | "laudo";

export type Paciente = { id: string; full_name: string; cpf: string | null; birth_date: string | null };

export type Nota = {
  created_at: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  procedures: unknown;
  pain_before: number | null;
  pain_after: number | null;
  addendum?: string | null;
};

export type Anamnese = {
  created_at: string;
  answers: Record<string, unknown> | null;
  fields_snapshot: { key: string; label: string; type?: string; section?: string }[] | null;
};

export type Atendimento = { id: string; starts_at: string; ends_at: string; status: string };
export type Imagem = { file_name: string; description: string | null; uploaded_at: string };
export type Termo = { template_name: string; signed_at: string; revoked_at: string | null };

export type AvaliacaoFisica = {
  performed_at: string;
  ortho_results: ResultadoOrto[];
  strength_results: LinhaForca[];
  gonio_results: LinhaGonio[];
  notes: string | null;
};

export type Prontuario = {
  avaliacaoFisica?: AvaliacaoFisica | null;
  anamnese: Anamnese | null;
  notas: Nota[];
  atendimentos: Atendimento[];
  imagens: Imagem[];
  termos: Termo[];
};

// ---------- Solicitação de exames ----------

export type TipoExame = "imagem" | "laboratorial";

export type ExameSolicitado = {
  id: string;
  tipo: TipoExame;
  exame: string;
  regiao: string;
  lado: string;
  justificativa: string;
};

export const EXAMES_IMAGEM = [
  "Radiografia (RX)",
  "Radiografia panorâmica de membros inferiores",
  "Ultrassonografia (US)",
  "Ultrassonografia com Doppler",
  "Ressonância magnética (RM)",
  "Tomografia computadorizada (TC)",
  "Densitometria óssea",
  "Eletroneuromiografia (ENMG)",
  "Cintilografia óssea",
];

export const EXAMES_LAB = [
  "Hemograma completo",
  "Proteína C reativa (PCR)",
  "Velocidade de hemossedimentação (VHS)",
  "Vitamina D (25-hidroxivitamina D)",
  "Vitamina B12",
  "Ferritina",
  "Ferro sérico",
  "Creatinoquinase (CK)",
  "Ácido úrico",
  "Fator reumatoide",
  "Glicemia de jejum",
  "Hemoglobina glicada (HbA1c)",
  "TSH e T4 livre",
  "Magnésio",
  "Cálcio",
  "Zinco",
  "Perfil lipídico",
  "Creatinina",
  "TGO e TGP",
  "Coagulograma (TAP e TTPA)",
];

export const LADOS = [
  { id: "", nome: "Não se aplica" },
  { id: "lado direito", nome: "Direito" },
  { id: "lado esquerdo", nome: "Esquerdo" },
  { id: "bilateral", nome: "Bilateral" },
];

export function novoExame(tipo: TipoExame): ExameSolicitado {
  return {
    id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tipo,
    exame: "",
    regiao: "",
    lado: "",
    justificativa: "",
  };
}

// ---------- Prescrição de medicamentos e fitoterápicos ----------

export type TipoItem = "medicamento" | "fitoterapico";

export type ItemPrescricao = {
  id: string;
  tipo: TipoItem;
  nome: string;
  via: string;
  posologia: string;
  duracao: string;
};

export type ItemCatalogo = { id: number; kind: TipoItem; name: string; category: string | null; default_route: string | null };

export const VIAS: { id: string; nome: string; titulo: string }[] = [
  { id: "oral", nome: "Oral", titulo: "Uso oral" },
  { id: "sublingual", nome: "Sublingual", titulo: "Uso sublingual" },
  { id: "topica", nome: "Tópica", titulo: "Uso tópico" },
  { id: "transdermica", nome: "Transdérmica", titulo: "Uso transdérmico" },
  { id: "intradermica", nome: "Intradérmica", titulo: "Uso intradérmico" },
  { id: "subcutanea", nome: "Subcutânea", titulo: "Uso subcutâneo" },
  { id: "intramuscular", nome: "Intramuscular", titulo: "Uso intramuscular" },
  { id: "intra-articular", nome: "Intra-articular", titulo: "Uso intra-articular" },
];

export const BASE_LEGAL_PRESCRICAO =
  "Prescrição realizada por fisioterapeuta no exercício de suas atribuições profissionais, com respaldo no " +
  "Decreto-Lei nº 938/1969, nos Acórdãos nº 611/2017, nº 636/2023, nº 639/2023 e nº 735/2024 " +
  "e na Resolução COFFITO nº 607/2025.";

export function novoItem(tipo: TipoItem): ItemPrescricao {
  return {
    id: `it-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tipo,
    nome: "",
    via: "oral",
    posologia: "",
    duracao: "",
  };
}

// ---------- Recibo ----------

export type ItemRecibo = {
  id: string;
  data: string; // AAAA-MM-DD
  descricao: string;
  valor: string; // como digitado, ex.: "150,00"
};

export type DadosRecibo = {
  de: string;
  ate: string;
  itens: ItemRecibo[];
  referente: string;
  pagadorOutro: boolean;
  pagadorNome: string;
  pagadorCpf: string;
  forma: string;
  dataRecebimento: string;
};

export const RECIBO_INICIAL: DadosRecibo = {
  de: "",
  ate: "",
  itens: [],
  referente: "atendimentos fisioterapêuticos",
  pagadorOutro: false,
  pagadorNome: "",
  pagadorCpf: "",
  forma: "Pix",
  dataRecebimento: "",
};

export const FORMAS_PAGAMENTO = [
  "Pix",
  "Dinheiro",
  "Cartão de débito",
  "Cartão de crédito",
  "Transferência bancária",
  "Boleto",
];

// partes do recibo montadas a partir dos campos
export const IDS_RECIBO = ["recibo_principal", "recibo_itens", "recibo_pagamento"];

export function novoItemRecibo(data = "", descricao = "", valor = ""): ItemRecibo {
  return {
    id: `rc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    data,
    descricao,
    valor,
  };
}

// "1.250,50" | "150" | "R$ 80,00" -> centavos
export function centavos(valor: string): number {
  const limpo = (valor || "").replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

export function centavosParaCampo(c: number): string {
  return (c / 100).toFixed(2).replace(".", ",");
}

export function formatarReais(c: number): string {
  return (c / 100)
    .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    .replace(/\u00a0/g, " ");
}

export function totalRecibo(itens: ItemRecibo[]): number {
  return itens.reduce((s, i) => s + centavos(i.valor), 0);
}

const UNIDADES = [
  "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
  "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove",
];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = [
  "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
  "seiscentos", "setecentos", "oitocentos", "novecentos",
];

function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const r = n % 100;
  let resto = "";
  if (r < 20) resto = UNIDADES[r];
  else resto = DEZENAS[Math.floor(r / 10)] + (r % 10 ? ` e ${UNIDADES[r % 10]}` : "");
  return [CENTENAS[c], resto].filter(Boolean).join(" e ");
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return "zero";
  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (milhoes) partes.push(milhoes === 1 ? "um milhão" : `${ate999(milhoes)} milhões`);
  if (milhares) partes.push(milhares === 1 ? "mil" : `${ate999(milhares)} mil`);
  if (resto) partes.push(ate999(resto));
  if (partes.length === 1) return partes[0];
  const ultimo = partes.pop() as string;
  const usaE = resto ? resto < 100 || resto % 100 === 0 : milhares < 100 || milhares % 100 === 0;
  return `${partes.join(" ")}${usaE ? " e " : " "}${ultimo}`;
}

export function valorPorExtenso(c: number): string {
  const reais = Math.floor(c / 100);
  const cents = c % 100;
  const partes: string[] = [];
  if (reais) {
    const texto = inteiroPorExtenso(reais);
    const exatoMilhao = reais >= 1_000_000 && reais % 1_000_000 === 0;
    partes.push(`${texto}${exatoMilhao ? " de" : ""} ${reais === 1 ? "real" : "reais"}`);
  }
  if (cents) partes.push(`${inteiroPorExtenso(cents)} ${cents === 1 ? "centavo" : "centavos"}`);
  return partes.length ? partes.join(" e ") : "zero real";
}

function rotuloDocumento(numero: string) {
  return numero.replace(/\D/g, "").length === 14 ? "CNPJ" : "CPF";
}

export type Campos = {
  atendimentoId: string;
  dias: string;
  inicio: string;
  atividade: string;
  destino: string;
  especialidade: string;
  motivo: string;
  destinatario: string;
  exames: ExameSolicitado[];
  hipotese: string;
  itens: ItemPrescricao[];
  recibo: DadosRecibo;
};

export type BlocoId = "anamnese" | "avaliacao" | "testes" | "exames" | "condutas" | "evolucao" | "termos";

export type Secao = {
  id: string;
  titulo: string;
  texto: string;
  bloco?: BlocoId;
  dica?: string; // texto de ajuda no campo vazio
};

export const BLOCOS: { id: BlocoId; nome: string; tipos: TipoDoc[] }[] = [
  { id: "anamnese", nome: "Anamnese", tipos: ["relatorio", "encaminhamento", "solicitacao", "parecer", "laudo"] },
  { id: "avaliacao", nome: "Avaliação e exame físico", tipos: ["relatorio", "encaminhamento", "solicitacao", "parecer", "laudo"] },
  { id: "testes", nome: "Testes ortopédicos e força muscular", tipos: ["relatorio", "encaminhamento", "solicitacao", "parecer", "laudo"] },
  { id: "exames", nome: "Exames e imagens anexados", tipos: ["relatorio", "encaminhamento", "solicitacao", "parecer", "laudo"] },
  { id: "condutas", nome: "Sessões e procedimentos", tipos: ["relatorio", "parecer"] },
  { id: "evolucao", nome: "Evolução e escala de dor", tipos: ["relatorio", "encaminhamento", "parecer", "laudo"] },
  { id: "termos", nome: "Termos de consentimento assinados", tipos: ["relatorio"] },
];

// ---------- Perícia (parecer e laudo) ----------

export type Funcao = "perito" | "assistente_autor" | "assistente_reu" | "particular";

export type Quesito = { id: string; origem: string; pergunta: string; resposta: string };

export type Criterio = "" | "sim" | "nao" | "inconclusivo";

export type Pericia = {
  funcao: Funcao;
  numero: string;
  juizo: string;
  autor: string;
  reu: string;
  solicitante: string;
  dataExame: string;
  localExame: string;
  presentes: string;
  documentos: string;
  nexo: Record<"cronologico" | "topografico" | "anatomico" | "continuidade" | "exclusao", Criterio>;
  incapacidade: "" | "sem" | "parcial_temporaria" | "parcial_permanente" | "total_temporaria" | "total_permanente";
  dataInicio: string;
  reavaliacaoMeses: string;
  quesitos: Quesito[];
};

export const PERICIA_INICIAL: Pericia = {
  funcao: "perito",
  numero: "",
  juizo: "",
  autor: "",
  reu: "",
  solicitante: "",
  dataExame: "",
  localExame: "",
  presentes: "",
  documentos: "",
  nexo: { cronologico: "", topografico: "", anatomico: "", continuidade: "", exclusao: "" },
  incapacidade: "",
  dataInicio: "",
  reavaliacaoMeses: "",
  quesitos: [],
};

export const CRITERIOS_NEXO: { id: keyof Pericia["nexo"]; nome: string; explicacao: string }[] = [
  { id: "cronologico", nome: "Nexo cronológico", explicacao: "o quadro surgiu depois do fato alegado, em intervalo compatível" },
  { id: "topografico", nome: "Nexo topográfico", explicacao: "a região acometida corresponde à região exposta ou atingida" },
  { id: "anatomico", nome: "Nexo anatomopatológico", explicacao: "o tipo de lesão é compatível com o mecanismo descrito" },
  { id: "continuidade", nome: "Nexo de continuidade", explicacao: "há sintomas e registros contínuos desde o fato até o exame" },
  { id: "exclusao", nome: "Exclusão de outras causas", explicacao: "não há causa preexistente ou alheia que explique melhor o quadro" },
];

export const FUNCOES: { id: Funcao; nome: string; assinatura: string }[] = [
  { id: "perito", nome: "Perito(a) do juízo", assinatura: "Perito(a) fisioterapeuta" },
  { id: "assistente_autor", nome: "Assistente técnico(a) da parte autora", assinatura: "Assistente técnico(a) fisioterapeuta" },
  { id: "assistente_reu", nome: "Assistente técnico(a) da parte ré", assinatura: "Assistente técnico(a) fisioterapeuta" },
  { id: "particular", nome: "Parecer a pedido particular", assinatura: "Fisioterapeuta" },
];

export const INCAPACIDADES: { id: Pericia["incapacidade"]; nome: string }[] = [
  { id: "", nome: "Não informar" },
  { id: "sem", nome: "Sem incapacidade para a atividade habitual" },
  { id: "parcial_temporaria", nome: "Incapacidade parcial e temporária" },
  { id: "parcial_permanente", nome: "Incapacidade parcial e permanente" },
  { id: "total_temporaria", nome: "Incapacidade total e temporária" },
  { id: "total_permanente", nome: "Incapacidade total e permanente" },
];

// Separa um bloco de quesitos colado (numerados 1., 1), a), etc.) em itens
export function separarQuesitos(texto: string, origem: string): Quesito[] {
  const linhas = texto.replace(/\r/g, "").split("\n");
  const itens: string[] = [];
  for (const l of linhas) {
    const t = l.trim();
    if (!t) continue;
    if (/^(\d{1,3}|[a-zA-Z])\s*[\)\.\-–:]\s+/.test(t) || !itens.length) itens.push(t);
    else itens[itens.length - 1] += " " + t;
  }
  return itens.map((t, i) => ({
    id: `q-${Date.now()}-${i}`,
    origem,
    pergunta: t.replace(/^(\d{1,3}|[a-zA-Z])\s*[\)\.\-–:]\s+/, "").trim(),
    resposta: "",
  }));
}

export const CAMPOS_INICIAIS: Campos = {
  atendimentoId: "",
  dias: "1",
  inicio: "",
  atividade: "laborais",
  destino: "",
  especialidade: "",
  motivo: "",
  destinatario: "",
  exames: [],
  hipotese: "",
  itens: [],
  recibo: RECIBO_INICIAL,
};

const TZ = "America/Sao_Paulo";
export const dataBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: TZ });
export const horaBR = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
export const hojeISO = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
export const inicioMesISO = () => `${hojeISO().slice(0, 8)}01`;
export const diaISO = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
export const isoParaBR = (d: string) => (d ? d.split("-").reverse().join("/") : "");

export function idade(nasc: string | null, hoje = new Date()) {
  if (!nasc) return null;
  const n = new Date(nasc + "T12:00:00");
  let a = hoje.getFullYear() - n.getFullYear();
  if (hoje.getMonth() < n.getMonth() || (hoje.getMonth() === n.getMonth() && hoje.getDate() < n.getDate())) a--;
  return a;
}

function textoResposta(v: unknown, tipo?: string) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "boolean") return v ? "sim" : "não";
  if (tipo === "scale") return `${v}/10`;
  return String(v).trim();
}

const ponto = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);
const maiuscula = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function nomesProcedimentos(p: unknown): string[] {
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

function identificacaoCurta(p: Paciente) {
  return p.cpf ? `${p.full_name}, inscrito(a) no CPF sob o nº ${p.cpf}` : p.full_name;
}

function textoAnamnese(a: Anamnese | null, chaves?: string[]) {
  if (!a) return "";
  const resp = a.answers ?? {};
  const campos = (a.fields_snapshot ?? []).filter((f) => !chaves || chaves.includes(f.key));
  const linhas = campos
    .map((f) => {
      const v = textoResposta(resp[f.key], f.type);
      return v ? `${f.label}: ${ponto(v)}` : "";
    })
    .filter(Boolean);
  if (!linhas.length) return "";
  return chaves ? linhas.join("\n") : `Anamnese realizada em ${dataBR(a.created_at)}.\n${linhas.join("\n")}`;
}

function textoAvaliacao(n: Nota | undefined) {
  if (!n) return "";
  return [
    n.subjective && `Relato do paciente: ${ponto(n.subjective)}`,
    n.objective && `Exame físico funcional: ${ponto(n.objective)}`,
    n.assessment && `Diagnóstico cinesiológico funcional: ${ponto(n.assessment)}`,
    n.plan && `Plano terapêutico: ${ponto(n.plan)}`,
  ].filter(Boolean).join("\n");
}

function textoExames(pr: Prontuario) {
  const doAnamnese = textoResposta(pr.anamnese?.answers?.["exames"]);
  const linhas = [
    doAnamnese && `Informados na anamnese: ${ponto(doAnamnese)}`,
    ...pr.imagens.map((i) => `${dataBR(i.uploaded_at)}: ${i.description?.trim() || i.file_name}.`),
  ].filter(Boolean);
  return linhas.join("\n");
}

function textoCondutas(notas: Nota[]) {
  if (!notas.length) return "";
  const primeira = notas[0];
  const ultima = notas[notas.length - 1];
  const procs = Array.from(new Set(notas.flatMap((n) => nomesProcedimentos(n.procedures))));
  return [
    `Foram realizadas ${notas.length} ${notas.length === 1 ? "sessão" : "sessões"}, ` +
      (notas.length === 1 ? `em ${dataBR(primeira.created_at)}.` : `de ${dataBR(primeira.created_at)} a ${dataBR(ultima.created_at)}.`),
    procs.length ? `Procedimentos realizados: ${procs.join(", ")}.` : "",
  ].filter(Boolean).join("\n");
}

function textoEvolucao(notas: Nota[], detalhada: boolean) {
  if (!notas.length) return "";
  const primeira = notas[0];
  const ultima = notas[notas.length - 1];
  const ini = primeira.pain_before;
  const fim = ultima.pain_after ?? ultima.pain_before;
  const linhas: string[] = [];
  if (ini !== null && ini !== undefined && fim !== null && fim !== undefined) {
    linhas.push(
      `Intensidade da dor pela Escala Visual Analógica (EVA, 0 a 10): ${ini} no início do tratamento e ${fim} na sessão mais recente.`
    );
  }
  if (detalhada && notas.length > 1) {
    for (const n of notas) {
      const eva =
        n.pain_before !== null && n.pain_before !== undefined
          ? ` EVA ${n.pain_before}${n.pain_after !== null && n.pain_after !== undefined ? ` para ${n.pain_after}` : ""}.`
          : "";
      const obs = n.assessment ? ` ${ponto(n.assessment)}` : "";
      linhas.push(`${dataBR(n.created_at)}:${eva}${obs}`);
    }
  } else if (notas.length > 1 && ultima.assessment) {
    linhas.push(ponto(ultima.assessment));
  }
  return linhas.join("\n");
}

function textoTermos(termos: Termo[]) {
  return termos
    .filter((t) => !t.revoked_at)
    .map((t) => `${t.template_name}: assinado em ${dataBR(t.signed_at)}.`)
    .join("\n");
}

function textoTestes(a: AvaliacaoFisica | null | undefined) {
  if (!a) return "";
  const partes = [textoOrto(a.ortho_results ?? []), textoForca(a.strength_results ?? []), textoGoniometria(a.gonio_results ?? [])].filter(Boolean);
  if (!partes.length) return "";
  return [`Avaliação realizada em ${dataBR(a.performed_at)}.`, ...partes, a.notes?.trim() ? `Observações: ${ponto(a.notes.trim())}` : ""]
    .filter(Boolean).join("\n");
}

// Lista numerada de exames com região e justificativa de cada um
export function textoListaExames(lista: ExameSolicitado[]) {
  return lista
    .filter((e) => e.exame.trim())
    .map((e, i) => {
      const alvo = e.tipo === "imagem" ? [e.regiao.trim(), e.lado].filter(Boolean).join(", ") : "";
      return [
        `${i + 1}. ${ponto(e.exame.trim())}`,
        alvo && `Região: ${ponto(alvo)}`,
        e.justificativa.trim() && `Justificativa clínica: ${ponto(e.justificativa.trim())}`,
      ].filter(Boolean).join("\n");
    })
    .join("\n\n");
}

function intercorrencias(): Secao {
  return {
    id: "intercorrencias",
    titulo: "Intercorrências",
    texto: "",
    dica: "Opcional. Ex.: dor ou desconforto após o procedimento, faltas, interrupção do tratamento, reação adversa.",
  };
}

function textoQuesitos(qs: Quesito[]) {
  const validos = qs.filter((q) => q.pergunta.trim());
  if (!validos.length) return "";
  const grupos = new Map<string, Quesito[]>();
  for (const q of validos) {
    const k = q.origem.trim() || "Quesitos";
    grupos.set(k, [...(grupos.get(k) ?? []), q]);
  }
  const partes: string[] = [];
  for (const [origem, lista] of grupos) {
    partes.push(origem === "Quesitos" ? "Quesitos" : `Quesitos ${origem.toLowerCase().startsWith("do") || origem.toLowerCase().startsWith("da") ? origem : `de ${origem}`}`);
    lista.forEach((q, i) => {
      partes.push(`${i + 1}. ${ponto(q.pergunta.trim())}`);
      partes.push(`Resposta: ${q.resposta.trim() ? ponto(q.resposta.trim()) : "[responder]"}`);
    });
    partes.push("");
  }
  return partes.join("\n").trim();
}

function textoNexo(n: Pericia["nexo"]) {
  const rot: Record<Criterio, string> = { "": "", sim: "presente", nao: "ausente", inconclusivo: "inconclusivo" };
  const linhas = CRITERIOS_NEXO.filter((c) => n[c.id]).map(
    (c) => `${c.nome} (${c.explicacao}): ${rot[n[c.id]]}.`
  );
  if (!linhas.length) return "";
  const vals = CRITERIOS_NEXO.map((c) => n[c.id]).filter(Boolean);
  let sintese = "";
  if (vals.length === CRITERIOS_NEXO.length && vals.every((v) => v === "sim")) {
    sintese = "Todos os critérios analisados estão presentes, o que sustenta tecnicamente o nexo de causalidade.";
  } else if (vals.some((v) => v === "nao")) {
    sintese = "A ausência de ao menos um critério fragiliza o estabelecimento do nexo de causalidade.";
  } else if (vals.some((v) => v === "inconclusivo")) {
    sintese = "Parte dos critérios mostrou-se inconclusiva com os elementos disponíveis.";
  }
  return ["Quanto ao nexo de causalidade, foram analisados os seguintes critérios:", ...linhas, sintese]
    .filter(Boolean).join("\n");
}

function textoConclusaoIncapacidade(pe: Pericia, sujeito: string) {
  if (!pe.incapacidade) return "";
  if (pe.incapacidade === "sem") {
    return `Conclui-se que o(a) ${sujeito} não apresenta, do ponto de vista cinesiológico funcional, incapacidade para o exercício de sua atividade habitual.`;
  }
  const nome = INCAPACIDADES.find((i) => i.id === pe.incapacidade)?.nome.toLowerCase().replace("incapacidade ", "") ?? "";
  const inicio = pe.dataInicio ? `, com início estimado em ${isoParaBR(pe.dataInicio)}` : "";
  const reav =
    pe.incapacidade.endsWith("temporaria") && Number(pe.reavaliacaoMeses) > 0
      ? `, sugerindo-se reavaliação em ${Number(pe.reavaliacaoMeses)} ${Number(pe.reavaliacaoMeses) === 1 ? "mês" : "meses"}`
      : "";
  return `Conclui-se que o(a) ${sujeito} apresenta, do ponto de vista cinesiológico funcional, incapacidade ${nome} para o exercício de sua atividade habitual${inicio}${reav}.`;
}

function gerarPericia(tipo: "parecer" | "laudo", p: Paciente, pr: Prontuario, pe: Pericia): Secao[] {
  const notas = pr.notas;
  const ultima = notas[notas.length - 1];
  const anos = idade(p.birth_date);
  const profissao = textoResposta(pr.anamnese?.answers?.["trabalho"]);
  const partesProc = [pe.autor && `movido por ${pe.autor}`, pe.reu && `em face de ${pe.reu}`].filter(Boolean).join(" ");
  const proc = [
    pe.numero && `nos autos do processo nº ${pe.numero}`,
    pe.juizo && `em trâmite na ${pe.juizo}`,
    partesProc,
  ].filter(Boolean).join(", ");
  const exame = pe.dataExame
    ? `, a partir do exame realizado em ${isoParaBR(pe.dataExame)}${pe.localExame ? `, em ${pe.localExame}` : ""}`
    : "";

  let preambulo = "";
  if (pe.funcao === "perito") {
    preambulo = `Na qualidade de perito(a) fisioterapeuta nomeado(a)${proc ? ` ${proc}` : ""}, apresento o presente laudo pericial fisioterapêutico${exame}.`;
  } else if (pe.funcao === "particular") {
    preambulo = `A pedido de ${pe.solicitante || "[solicitante]"}, apresento parecer técnico fisioterapêutico sobre o caso de ${p.full_name}${exame}.`;
  } else {
    const parte = pe.funcao === "assistente_autor" ? "autora" : "ré";
    preambulo = `Na qualidade de assistente técnico(a) da parte ${parte}${proc ? `, ${proc}` : ""}, apresento o presente parecer técnico fisioterapêutico${exame}.`;
  }

  const identProc = [
    pe.numero && `Processo nº: ${pe.numero}`,
    pe.juizo && `Juízo ou órgão: ${pe.juizo}`,
    pe.autor && `Parte autora: ${pe.autor}`,
    pe.reu && `Parte ré: ${pe.reu}`,
  ].filter(Boolean).join("\n");

  const identPac = [
    `Nome: ${p.full_name}`,
    p.cpf && `CPF: ${p.cpf}`,
    p.birth_date && `Data de nascimento: ${isoParaBR(p.birth_date)}${anos !== null ? ` (${anos} anos)` : ""}`,
    profissao && `Profissão e atividade habitual: ${profissao}`,
  ].filter(Boolean).join("\n");

  const docs = [pe.documentos.trim(), textoExames(pr)].filter(Boolean).join("\n");

  const exameFisico = [
    ultima?.objective && `Exame físico funcional: ${ponto(ultima.objective)}`,
    ultima?.assessment && `Diagnóstico cinesiológico funcional: ${ponto(ultima.assessment)}`,
    ultima?.pain_before !== null && ultima?.pain_before !== undefined
      ? `Dor referida pela Escala Visual Analógica (EVA, 0 a 10): ${ultima.pain_before}.`
      : "",
  ].filter(Boolean).join("\n");

  const secoes: Secao[] = [
    { id: "preambulo", titulo: "", texto: preambulo },
    { id: "processo", titulo: "Identificação do processo", texto: identProc },
    { id: "identificacao", titulo: tipo === "laudo" ? "Identificação do(a) periciando(a)" : "Identificação do(a) examinado(a)", texto: identPac },
    {
      id: "objetivo",
      titulo: "Objetivo",
      texto: tipo === "laudo"
        ? "Avaliar a capacidade funcional do(a) periciando(a) e a existência de nexo entre as alterações encontradas e os fatos narrados nos autos."
        : "Analisar tecnicamente a condição cinesiológica funcional do(a) examinado(a) e os elementos do caso, sob a ótica da fisioterapia.",
    },
    {
      id: "presentes",
      titulo: "Presentes ao exame",
      texto: pe.presentes.trim(),
      dica: "Opcional. Ex.: o(a) periciando(a) e o(a) assistente técnico(a) da parte ré, Dr(a). Fulano.",
    },
    { id: "anamnese", titulo: "Histórico", bloco: "anamnese", texto: textoAnamnese(pr.anamnese) },
    { id: "documentos", titulo: "Documentos analisados", texto: docs, dica: "Ex.: petição inicial, laudos médicos, exames de imagem, CAT, prontuários." },
    {
      id: "metodologia",
      titulo: "Metodologia",
      texto:
        "Anamnese dirigida, inspeção, palpação, avaliação da amplitude de movimento, testes de força muscular, " +
        "testes ortopédicos específicos, avaliação funcional das atividades e da dor pela Escala Visual Analógica, " +
        "com classificação da funcionalidade segundo a Classificação Internacional de Funcionalidade, Incapacidade e Saúde (CIF/OMS).",
    },
    { id: "avaliacao", titulo: "Exame fisioterapêutico", bloco: "avaliacao", texto: exameFisico },
    { id: "testes", titulo: "Testes ortopédicos e força muscular", bloco: "testes", texto: textoTestes(pr.avaliacaoFisica) },
    { id: "evolucao", titulo: "Evolução do quadro", bloco: "evolucao", texto: textoEvolucao(notas, false) },
  ];
  if (tipo === "parecer") {
    secoes.push({ id: "condutas", titulo: "Tratamento realizado", bloco: "condutas", texto: textoCondutas(notas) });
  }
  secoes.push(
    {
      id: "discussao",
      titulo: "Discussão",
      texto: textoNexo(pe.nexo),
      dica: "Relacione os achados do exame com os fatos e documentos. Os critérios de nexo marcados acima entram aqui automaticamente.",
    },
    intercorrencias(),
    {
      id: "conclusao",
      titulo: "Conclusão",
      texto: textoConclusaoIncapacidade(pe, tipo === "laudo" ? "periciando(a)" : "examinado(a)"),
      dica: "Síntese objetiva da resposta técnica ao que foi perguntado.",
    },
    { id: "quesitos", titulo: "Respostas aos quesitos", texto: textoQuesitos(pe.quesitos) },
    {
      id: "encerramento",
      titulo: "",
      texto: tipo === "laudo"
        ? "Nada mais havendo a relatar, encerro o presente laudo, que segue assinado."
        : "Sendo o que havia a relatar, subscrevo o presente parecer técnico.",
    },
  );
  return secoes;
}

function gerarSolicitacao(p: Paciente, pr: Prontuario, c: Campos): Secao[] {
  const notas = pr.notas;
  const anos = idade(p.birth_date);
  const validos = c.exames.filter((e) => e.exame.trim());
  const imagem = validos.filter((e) => e.tipo === "imagem");
  const lab = validos.filter((e) => e.tipo === "laboratorial");

  const ident = [
    `Paciente: ${p.full_name}${anos !== null ? `, ${anos} anos` : ""}.`,
    p.cpf ? `CPF: ${p.cpf}.` : "",
  ].filter(Boolean).join(" ");

  const pedido =
    validos.length === 1
      ? "Solicito, para complementação da avaliação fisioterapêutica e definição da conduta terapêutica, a realização do exame relacionado abaixo."
      : "Solicito, para complementação da avaliação fisioterapêutica e definição da conduta terapêutica, a realização dos exames relacionados abaixo.";

  return [
    { id: "identificacao", titulo: "", texto: ident },
    { id: "principal", titulo: "", texto: pedido },
    { id: "exames_imagem", titulo: "Exames de imagem", texto: textoListaExames(imagem) },
    { id: "exames_lab", titulo: "Exames laboratoriais", texto: textoListaExames(lab) },
    {
      id: "hipotese",
      titulo: "Hipótese diagnóstica",
      texto: c.hipotese.trim() ? ponto(maiuscula(c.hipotese.trim())) : "",
      dica: "Ex.: disfunção cinesiológica funcional do joelho direito, compatível com lesão meniscal medial.",
    },
    { id: "anamnese", titulo: "Histórico clínico", bloco: "anamnese", texto: textoAnamnese(pr.anamnese, ["queixa", "inicio", "local", "tratamentos"]) },
    { id: "avaliacao", titulo: "Achados da avaliação fisioterapêutica", bloco: "avaliacao", texto: textoAvaliacao(notas[0]) },
    { id: "testes", titulo: "Testes ortopédicos e força muscular", bloco: "testes", texto: textoTestes(pr.avaliacaoFisica) },
    { id: "exames", titulo: "Exames anteriores", bloco: "exames", texto: textoExames(pr) },
    {
      id: "observacoes",
      titulo: "Observações",
      texto: "",
      dica: "Opcional. Ex.: jejum de 8 horas para os exames laboratoriais; trazer os resultados na próxima sessão.",
    },
  ];
}

function gerarPrescricao(p: Paciente, c: Campos): Secao[] {
  const anos = idade(p.birth_date);
  const ident = [
    `Paciente: ${p.full_name}${anos !== null ? `, ${anos} anos` : ""}.`,
    p.cpf ? `CPF: ${p.cpf}.` : "",
  ].filter(Boolean).join(" ");

  const validos = c.itens.filter((i) => i.nome.trim());
  const secoes: Secao[] = [{ id: "identificacao", titulo: "", texto: ident }];

  // agrupa por via de administração, na ordem da lista de vias
  let n = 0;
  const ordem = [...VIAS.map((v) => v.id), ...Array.from(new Set(validos.map((i) => i.via))).filter((v) => !VIAS.some((x) => x.id === v))];
  for (const via of ordem) {
    const lista = validos.filter((i) => i.via === via);
    if (!lista.length) continue;
    const titulo = VIAS.find((v) => v.id === via)?.titulo ?? `Uso ${via}`;
    const texto = lista
      .map((i) => {
        n += 1;
        return [
          `${n}. ${i.nome.trim()}${i.tipo === "fitoterapico" ? " (fitoterápico)" : ""}`,
          i.posologia.trim() && `Posologia: ${ponto(maiuscula(i.posologia.trim()))}`,
          i.duracao.trim() && `Duração do tratamento: ${ponto(i.duracao.trim())}`,
        ].filter(Boolean).join("\n");
      })
      .join("\n\n");
    secoes.push({ id: `uso-${via}`, titulo, texto });
  }
  if (!validos.length) {
    secoes.push({ id: "uso-vazio", titulo: "Uso oral", texto: "", dica: "Adicione os itens acima. Eles aparecem aqui agrupados pela via de administração." });
  }

  secoes.push({
    id: "orientacoes",
    titulo: "Orientações",
    texto: "",
    dica: "Opcional. Ex.: tomar após as refeições; suspender e procurar atendimento em caso de reação alérgica.",
  });
  return secoes;
}

function gerarRecibo(p: Paciente, c: Campos): Secao[] {
  const r = c.recibo;
  const validos = r.itens.filter((i) => i.descricao.trim() && centavos(i.valor) > 0);
  const total = totalRecibo(validos);

  // quem pagou
  const nomePagador = r.pagadorOutro ? r.pagadorNome.trim() || "[nome de quem pagou]" : p.full_name;
  const docPagador = r.pagadorOutro ? r.pagadorCpf.trim() : p.cpf ?? "";
  const pagador = docPagador
    ? `${nomePagador}, inscrito(a) no ${rotuloDocumento(docPagador)} sob o nº ${docPagador}`
    : nomePagador;

  // período das sessões
  const datas = validos.map((i) => i.data).filter(Boolean).sort();
  let periodo = "";
  if (datas.length === 1) periodo = `, realizado em ${isoParaBR(datas[0])}`;
  else if (datas.length > 1) {
    const ini = isoParaBR(datas[0]);
    const fim = isoParaBR(datas[datas.length - 1]);
    periodo = ini === fim
      ? `, em ${validos.length} atendimentos realizados em ${ini}`
      : `, em ${validos.length} atendimentos realizados de ${ini} a ${fim}`;
  }

  const referente = r.referente.trim() || "atendimentos fisioterapêuticos";
  const beneficiario = r.pagadorOutro ? `, prestados ao(à) paciente ${identificacaoCurta(p)}` : "";
  const valorTxt = total
    ? `a importância de ${formatarReais(total)} (${valorPorExtenso(total)})`
    : "a importância de [valor]";

  const principal =
    `Recebi de ${pagador}, ${valorTxt}, referente a ${referente}${beneficiario}${periodo}.`;

  const linhas = validos.map((i, n) =>
    `${n + 1}. ${i.data ? `${isoParaBR(i.data)}: ` : ""}${i.descricao.trim()}, ${formatarReais(centavos(i.valor))}.`
  );
  const itens = validos.length > 1 ? [...linhas, `Total: ${formatarReais(total)}.`].join("\n") : linhas.join("\n");

  const pagamento = [
    r.forma && `Forma de pagamento: ${r.forma}.`,
    `Data do recebimento: ${isoParaBR(r.dataRecebimento || hojeISO())}.`,
  ].filter(Boolean).join("\n");

  return [
    { id: "recibo_principal", titulo: "", texto: principal },
    { id: "recibo_itens", titulo: "Discriminação dos serviços", texto: itens },
    { id: "recibo_pagamento", titulo: "", texto: pagamento },
    {
      id: "observacoes",
      titulo: "Observações",
      texto: "",
      dica: "Opcional. Ex.: pagamento referente ao pacote de 10 sessões; valor com desconto à vista.",
    },
    { id: "quitacao", titulo: "", texto: "Para clareza e como prova de quitação, firmo o presente recibo." },
  ];
}

export function gerarSecoes(
  tipo: TipoDoc,
  p: Paciente,
  pr: Prontuario,
  c: Campos,
  pe: Pericia = PERICIA_INICIAL
): Secao[] {
  if (tipo === "parecer" || tipo === "laudo") return gerarPericia(tipo, p, pr, pe);
  if (tipo === "solicitacao") return gerarSolicitacao(p, pr, c);
  if (tipo === "prescricao") return gerarPrescricao(p, c);
  if (tipo === "recibo") return gerarRecibo(p, c);

  const at = pr.atendimentos.find((a) => a.id === c.atendimentoId) ?? pr.atendimentos[0];
  const dataAt = at ? dataBR(at.starts_at) : isoParaBR(hojeISO());
  const notas = pr.notas;
  const anos = idade(p.birth_date);

  if (tipo === "declaracao") {
    const periodo = at ? `, no período das ${horaBR(at.starts_at)} às ${horaBR(at.ends_at)}` : "";
    return [{
      id: "principal",
      titulo: "",
      texto: `Declaro, para os devidos fins, que ${identificacaoCurta(p)}, compareceu a atendimento fisioterapêutico no dia ${dataAt}${periodo}.`,
    }];
  }

  if (tipo === "atestado") {
    const n = Number(c.dias) || 1;
    return [
      {
        id: "principal",
        titulo: "",
        texto:
          `Atesto, para os devidos fins, que ${identificacaoCurta(p)}, esteve sob meus cuidados fisioterapêuticos em ${dataAt} ` +
          `e, em razão de sua condição cinesiológica funcional, necessita de afastamento de suas atividades ${c.atividade || "laborais"} ` +
          `por ${n} ${n === 1 ? "dia" : "dias"}, a partir de ${isoParaBR(c.inicio || hojeISO())}.`,
      },
      { id: "observacoes", titulo: "Observações", texto: "", dica: "Opcional. Ex.: orientações ou restrições durante o afastamento." },
    ];
  }

  if (tipo === "encaminhamento") {
    const destino = [c.destino, c.especialidade].filter(Boolean).join(", ");
    const inicioAcomp = notas[0] ? `, em acompanhamento fisioterapêutico desde ${dataBR(notas[0].created_at)}` : "";
    return [
      { id: "destino", titulo: "", texto: destino ? `Ao(À) ${destino}.` : "Ao(À) colega." },
      {
        id: "principal",
        titulo: "",
        texto:
          `Encaminho o(a) paciente ${p.full_name}${anos !== null ? `, ${anos} anos` : ""}${inicioAcomp}, ` +
          `para ${c.motivo || "avaliação e conduta"}.`,
      },
      { id: "anamnese", titulo: "Histórico", bloco: "anamnese", texto: textoAnamnese(pr.anamnese, ["queixa", "inicio", "local", "tratamentos"]) },
      { id: "avaliacao", titulo: "Avaliação fisioterapêutica", bloco: "avaliacao", texto: textoAvaliacao(notas[0]) },
      { id: "testes", titulo: "Testes ortopédicos e força muscular", bloco: "testes", texto: textoTestes(pr.avaliacaoFisica) },
      { id: "exames", titulo: "Exames", bloco: "exames", texto: textoExames(pr) },
      { id: "evolucao", titulo: "Evolução", bloco: "evolucao", texto: textoEvolucao(notas, false) },
      intercorrencias(),
      { id: "fechamento", titulo: "", texto: "Coloco-me à disposição para troca de informações sobre o caso." },
    ];
  }

  // relatório
  const ident = [
    `Paciente: ${p.full_name}.`,
    p.cpf ? `CPF: ${p.cpf}.` : "",
    p.birth_date ? `Data de nascimento: ${isoParaBR(p.birth_date)}${anos !== null ? ` (${anos} anos)` : ""}.` : "",
  ].filter(Boolean).join(" ");

  return [
    { id: "destino", titulo: "", texto: c.destinatario ? `A(o) ${c.destinatario}.` : "A quem possa interessar." },
    { id: "identificacao", titulo: "Identificação", texto: ident },
    { id: "anamnese", titulo: "Anamnese", bloco: "anamnese", texto: textoAnamnese(pr.anamnese) },
    { id: "avaliacao", titulo: "Avaliação cinesiológica funcional", bloco: "avaliacao", texto: textoAvaliacao(notas[0]) },
    { id: "testes", titulo: "Testes ortopédicos e força muscular", bloco: "testes", texto: textoTestes(pr.avaliacaoFisica) },
    { id: "exames", titulo: "Exames complementares", bloco: "exames", texto: textoExames(pr) },
    { id: "condutas", titulo: "Condutas realizadas", bloco: "condutas", texto: textoCondutas(notas) },
    { id: "evolucao", titulo: "Evolução", bloco: "evolucao", texto: textoEvolucao(notas, true) },
    { id: "termos", titulo: "Termos de consentimento", bloco: "termos", texto: textoTermos(pr.termos) },
    intercorrencias(),
    {
      id: "conclusao",
      titulo: "Conclusão e recomendações",
      texto: "",
      dica: "Ex.: paciente apresenta evolução favorável; recomenda-se manter o programa de exercícios domiciliares.",
    },
  ];
}

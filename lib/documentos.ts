// Montagem automática do texto dos documentos a partir do prontuário.
// Funções puras: recebem os dados e devolvem as partes do documento.

import { textoForca, textoOrto, type LinhaForca, type ResultadoOrto } from "./forca";

export type TipoDoc = "declaracao" | "atestado" | "relatorio" | "encaminhamento" | "parecer" | "laudo";

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

export type Campos = {
  atendimentoId: string;
  dias: string;
  inicio: string;
  atividade: string;
  destino: string;
  especialidade: string;
  motivo: string;
  destinatario: string;
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
  { id: "anamnese", nome: "Anamnese", tipos: ["relatorio", "encaminhamento", "parecer", "laudo"] },
  { id: "avaliacao", nome: "Avaliação e exame físico", tipos: ["relatorio", "encaminhamento", "parecer", "laudo"] },
  { id: "testes", nome: "Testes ortopédicos e força muscular", tipos: ["relatorio", "encaminhamento", "parecer", "laudo"] },
  { id: "exames", nome: "Exames e imagens anexados", tipos: ["relatorio", "encaminhamento", "parecer", "laudo"] },
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
};

const TZ = "America/Sao_Paulo";
export const dataBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: TZ });
export const horaBR = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
export const hojeISO = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
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
  const partes = [textoOrto(a.ortho_results ?? []), textoForca(a.strength_results ?? [])].filter(Boolean);
  if (!partes.length) return "";
  return [`Avaliação realizada em ${dataBR(a.performed_at)}.`, ...partes, a.notes?.trim() ? `Observações: ${ponto(a.notes.trim())}` : ""]
    .filter(Boolean).join("\n");
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

export function gerarSecoes(
  tipo: TipoDoc,
  p: Paciente,
  pr: Prontuario,
  c: Campos,
  pe: Pericia = PERICIA_INICIAL
): Secao[] {
  if (tipo === "parecer" || tipo === "laudo") return gerarPericia(tipo, p, pr, pe);

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

// Montagem automática do texto dos documentos a partir do prontuário.
// Funções puras: recebem os dados e devolvem as partes do documento.

export type TipoDoc = "declaracao" | "atestado" | "relatorio" | "encaminhamento";

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

export type Prontuario = {
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

export type BlocoId = "anamnese" | "avaliacao" | "exames" | "condutas" | "evolucao" | "termos";

export type Secao = {
  id: string;
  titulo: string;
  texto: string;
  bloco?: BlocoId;
  dica?: string; // texto de ajuda no campo vazio
};

export const BLOCOS: { id: BlocoId; nome: string; tipos: TipoDoc[] }[] = [
  { id: "anamnese", nome: "Anamnese", tipos: ["relatorio", "encaminhamento"] },
  { id: "avaliacao", nome: "Avaliação (primeira evolução)", tipos: ["relatorio", "encaminhamento"] },
  { id: "exames", nome: "Exames e imagens anexados", tipos: ["relatorio", "encaminhamento"] },
  { id: "condutas", nome: "Sessões e procedimentos", tipos: ["relatorio"] },
  { id: "evolucao", nome: "Evolução e escala de dor", tipos: ["relatorio", "encaminhamento"] },
  { id: "termos", nome: "Termos de consentimento assinados", tipos: ["relatorio"] },
];

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

function intercorrencias(): Secao {
  return {
    id: "intercorrencias",
    titulo: "Intercorrências",
    texto: "",
    dica: "Opcional. Ex.: dor ou desconforto após o procedimento, faltas, interrupção do tratamento, reação adversa.",
  };
}

export function gerarSecoes(tipo: TipoDoc, p: Paciente, pr: Prontuario, c: Campos): Secao[] {
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

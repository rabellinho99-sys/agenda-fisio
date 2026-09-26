// Recursos por plano (a regra que vale de verdade fica no banco: clinic_features)

export type Recurso =
  | "prontuario"
  | "whatsapp"
  | "packages"
  | "tcle"
  | "imagens"
  | "documentos_clinicos"
  | "testes"
  | "pericia"
  | "financeiro";

export type Recursos = Partial<Record<Recurso, boolean>> & {
  plano?: string;
  max_professionals?: number | null;
};

export const NOME_PLANO: Record<string, string> = {
  solo: "Solo",
  clinica: "Clínica",
  clinica_pro: "Clínica Pro",
  teste: "Período grátis",
  dono: "Conta do dono",
  completo: "Completo",
};

export const INFO_RECURSO: Record<Recurso, { nome: string; plano: string; descricao: string }> = {
  prontuario: { nome: "Prontuário", plano: "Solo", descricao: "Anamnese e evolução SOAP." },
  whatsapp: {
    nome: "WhatsApp automático",
    plano: "Clínica",
    descricao: "Confirmação e lembretes enviados sozinhos pelo WhatsApp, reduzindo faltas.",
  },
  packages: {
    nome: "Pacotes de sessões",
    plano: "Clínica",
    descricao: "Venda pacotes, controle o saldo de sessões de cada paciente e o que já foi pago.",
  },
  tcle: {
    nome: "TCLE digital",
    plano: "Clínica",
    descricao: "Termos de consentimento enviados por link e assinados pelo celular, com registro de data e hora.",
  },
  imagens: {
    nome: "Imagens e exames",
    plano: "Clínica",
    descricao: "Fotos de evolução e exames anexados ao prontuário, em pasta privada da clínica.",
  },
  documentos_clinicos: {
    nome: "Relatório e encaminhamento",
    plano: "Clínica",
    descricao: "Relatório fisioterapêutico e encaminhamento montados sozinhos a partir do prontuário, com CIF.",
  },
  testes: {
    nome: "Testes ortopédicos e força",
    plano: "Clínica",
    descricao: "41 testes ortopédicos e força por Oxford ou dinamometria, com classificação por cores e codificação CIF automática.",
  },
  pericia: {
    nome: "Laudo pericial e parecer técnico",
    plano: "Clínica Pro",
    descricao: "Laudo e parecer com processo, critérios de nexo, capacidade funcional e quesitos separados automaticamente.",
  },
  financeiro: {
    nome: "Financeiro completo",
    plano: "Clínica Pro",
    descricao: "Receitas, despesas e relatórios da clínica em um só lugar.",
  },
};

// Páginas do painel que dependem de um recurso
export const ROTAS_RECURSO: { prefixo: string; recurso: Recurso }[] = [
  { prefixo: "/painel/pacotes", recurso: "packages" },
  { prefixo: "/painel/termos", recurso: "tcle" },
  { prefixo: "/painel/testes", recurso: "testes" },
  { prefixo: "/painel/financeiro", recurso: "financeiro" },
];

export function temRecurso(r: Recursos | null | undefined, recurso: Recurso) {
  if (!r) return true;
  return r[recurso] !== false;
}

export function recursoDaRota(pathname: string): Recurso | null {
  return ROTAS_RECURSO.find((x) => pathname === x.prefixo || pathname.startsWith(`${x.prefixo}/`))?.recurso ?? null;
}

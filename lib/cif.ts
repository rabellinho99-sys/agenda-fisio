// Classificação Internacional de Funcionalidade, Incapacidade e Saúde (CIF/OMS)
// Utilitários compartilhados entre o editor de documentos e a página de impressão.

export type CifComponente = "b" | "s" | "d" | "e";

export type CifCodigo = {
  code: string;
  title: string;
  component: CifComponente;
  regions: string[];
  sort: number;
};

export type CifItem = {
  code: string;
  title: string;
  component: CifComponente;
  q: string; // qualificador: "0".."4", "8", "9" ou, para fatores ambientais, "+1".."+4"
};

export const COMPONENTES: { id: CifComponente; nome: string }[] = [
  { id: "b", nome: "Funções do corpo" },
  { id: "s", nome: "Estruturas do corpo" },
  { id: "d", nome: "Atividades e participação" },
  { id: "e", nome: "Fatores ambientais" },
];

export const REGIOES: { id: string; nome: string }[] = [
  { id: "lombar", nome: "Coluna lombar" },
  { id: "cervical", nome: "Coluna cervical" },
  { id: "toracica", nome: "Coluna torácica" },
  { id: "ombro", nome: "Ombro" },
  { id: "cotovelo", nome: "Cotovelo" },
  { id: "punho_mao", nome: "Punho e mão" },
  { id: "quadril", nome: "Quadril" },
  { id: "joelho", nome: "Joelho" },
  { id: "tornozelo_pe", nome: "Tornozelo e pé" },
  { id: "geral", nome: "Geral e dor crônica" },
];

const GRAU = ["nenhuma", "leve", "moderada", "grave", "completa"];
const GRAU_FACILITADOR = ["nenhum", "leve", "moderado", "considerável", "completo"];

export function opcoesQualificador(c: CifComponente): { v: string; rotulo: string }[] {
  if (c === "e") {
    return [
      { v: "+4", rotulo: "+4 Facilitador completo" },
      { v: "+3", rotulo: "+3 Facilitador considerável" },
      { v: "+2", rotulo: "+2 Facilitador moderado" },
      { v: "+1", rotulo: "+1 Facilitador leve" },
      { v: "0", rotulo: "0 Nenhuma barreira" },
      { v: "1", rotulo: "1 Barreira leve" },
      { v: "2", rotulo: "2 Barreira moderada" },
      { v: "3", rotulo: "3 Barreira grave" },
      { v: "4", rotulo: "4 Barreira completa" },
      { v: "8", rotulo: "8 Não especificado" },
      { v: "9", rotulo: "9 Não aplicável" },
    ];
  }
  return [
    { v: "0", rotulo: "0 Nenhuma (0 a 4%)" },
    { v: "1", rotulo: "1 Leve (5 a 24%)" },
    { v: "2", rotulo: "2 Moderada (25 a 49%)" },
    { v: "3", rotulo: "3 Grave (50 a 95%)" },
    { v: "4", rotulo: "4 Completa (96 a 100%)" },
    { v: "8", rotulo: "8 Não especificada" },
    { v: "9", rotulo: "9 Não aplicável" },
  ];
}

export function codigoComQualificador(i: CifItem) {
  if (i.component === "e" && i.q.startsWith("+")) return `${i.code}${i.q}`;
  return `${i.code}.${i.q}`;
}

export function descricaoQualificador(i: CifItem) {
  if (i.q === "8") return "não especificada";
  if (i.q === "9") return "não aplicável";
  if (i.component === "e") {
    if (i.q.startsWith("+")) return `facilitador ${GRAU_FACILITADOR[Number(i.q.slice(1))] ?? ""}`;
    return i.q === "0" ? "nenhuma barreira" : `barreira ${GRAU[Number(i.q)] ?? ""}`;
  }
  const g = GRAU[Number(i.q)] ?? "";
  if (i.component === "d") return i.q === "0" ? "nenhuma dificuldade" : `dificuldade ${g}`;
  return i.q === "0" ? "nenhuma deficiência" : `deficiência ${g}`;
}

export function ordenarItens(itens: CifItem[]) {
  const ordem: Record<CifComponente, number> = { b: 0, s: 1, d: 2, e: 3 };
  return [...itens].sort((a, b) => ordem[a.component] - ordem[b.component] || a.code.localeCompare(b.code));
}

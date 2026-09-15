export type Field = { key: string; label: string; type: "text" | "textarea" | "number" | "yesno" | "select" | "scale" | "date"; options?: string[]; required?: boolean; section?: string };
export type Answers = Record<string, string | number | boolean | null>;

export const TIPOS: Record<Field["type"], string> = {
  text: "Texto curto", textarea: "Texto longo", number: "Número", yesno: "Sim ou não", select: "Lista de opções", scale: "Escala 0 a 10", date: "Data",
};

export function agrupar(fields: Field[]) {
  const secs: { nome: string; campos: Field[] }[] = [];
  for (const f of fields) {
    const nome = f.section || "Geral";
    let s = secs.find((x) => x.nome === nome);
    if (!s) { s = { nome, campos: [] }; secs.push(s); }
    s.campos.push(f);
  }
  return secs;
}

export function faltando(fields: Field[], a: Answers) {
  return fields.filter((f) => f.required && (a[f.key] === undefined || a[f.key] === null || a[f.key] === "")).map((f) => f.label);
}

export function fmtResposta(f: Field, v: unknown) {
  if (v === undefined || v === null || v === "") return null;
  if (f.type === "yesno") return v === true || v === "true" ? "Sim" : "Não";
  if (f.type === "scale") return `${v} / 10`;
  if (f.type === "date") return new Date(String(v) + "T12:00:00").toLocaleDateString("pt-BR");
  return String(v);
}

export const keyFromLabel = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "campo";

// Classificação de força muscular (Oxford e dinamometria) em qualificadores da CIF,
// com as cores usadas na tela e nos documentos.

export type Metodo = "oxford" | "dinamometria";

export type LinhaForca = {
  id: string;
  code: string; // código do grupo muscular
  name: string;
  cif_code: string; // b7300, b7301 ou b7305
  metodo: Metodo;
  d: string; // lado direito (grau de Oxford ou valor medido)
  e: string; // lado esquerdo
  referencia: string; // valor de referência (opcional, só dinamometria)
  unidade: string; // kgf, N ou lb
};

export type ResultadoOrto = {
  code: string;
  name: string;
  region: string;
  d: "" | "negativo" | "positivo" | "inconclusivo";
  e: "" | "negativo" | "positivo" | "inconclusivo";
  obs: string;
};

export type Qualificador = 0 | 1 | 2 | 3 | 4;

export const CLASSES: Record<Qualificador, { nome: string; cor: string; texto: string }> = {
  0: { nome: "Sem deficiência", cor: "#2563eb", texto: "#ffffff" },
  1: { nome: "Deficiência leve", cor: "#16a34a", texto: "#ffffff" },
  2: { nome: "Deficiência moderada", cor: "#facc15", texto: "#111111" },
  3: { nome: "Deficiência grave", cor: "#dc2626", texto: "#ffffff" },
  4: { nome: "Deficiência completa", cor: "#111111", texto: "#ffffff" },
};

export const OXFORD: { v: string; rotulo: string }[] = [
  { v: "5", rotulo: "5 Normal" },
  { v: "4", rotulo: "4 Vence resistência moderada" },
  { v: "3", rotulo: "3 Vence a gravidade" },
  { v: "2", rotulo: "2 Movimento sem gravidade" },
  { v: "1", rotulo: "1 Contração sem movimento" },
  { v: "0", rotulo: "0 Sem contração" },
];

// Oxford 5 = sem deficiência, 4 = leve, 3 = moderada, 2 e 1 = grave, 0 = completa
export function oxfordParaQ(grau: number): Qualificador {
  if (grau >= 5) return 0;
  if (grau === 4) return 1;
  if (grau === 3) return 2;
  if (grau >= 1) return 3;
  return 4;
}

// Faixas percentuais da CIF: 0 a 4%, 5 a 24%, 25 a 49%, 50 a 95%, 96 a 100%
export function deficitParaQ(pct: number): Qualificador {
  if (pct <= 4) return 0;
  if (pct <= 24) return 1;
  if (pct <= 49) return 2;
  if (pct <= 95) return 3;
  return 4;
}

const num = (s: string) => {
  const n = Number(String(s).replace(",", "."));
  return s !== "" && Number.isFinite(n) ? n : null;
};

export type Classificacao = {
  q: Qualificador;
  deficit: number | null; // percentual, só na dinamometria
  lado: "D" | "E" | "ambos" | null;
};

export function classificar(l: LinhaForca): Classificacao | null {
  const d = num(l.d);
  const e = num(l.e);

  if (l.metodo === "oxford") {
    const qd = d !== null ? oxfordParaQ(d) : null;
    const qe = e !== null ? oxfordParaQ(e) : null;
    if (qd === null && qe === null) return null;
    const q = Math.max(qd ?? 0, qe ?? 0) as Qualificador;
    const lado = qd !== null && qe !== null ? (qd === qe ? "ambos" : qd > qe ? "D" : "E") : qd !== null ? "D" : "E";
    return { q, deficit: null, lado };
  }

  const ref = num(l.referencia);
  if (ref && ref > 0) {
    const defs: { lado: "D" | "E"; pct: number }[] = [];
    if (d !== null) defs.push({ lado: "D", pct: Math.min(100, Math.max(0, (1 - d / ref) * 100)) });
    if (e !== null) defs.push({ lado: "E", pct: Math.min(100, Math.max(0, (1 - e / ref) * 100)) });
    if (!defs.length) return null;
    const pior = defs.reduce((a, b) => (b.pct > a.pct ? b : a));
    const iguais = defs.length === 2 && Math.abs(defs[0].pct - defs[1].pct) < 0.5;
    return { q: deficitParaQ(pior.pct), deficit: Math.round(pior.pct), lado: iguais ? "ambos" : pior.lado };
  }

  if (d === null || e === null) return null;
  const maior = Math.max(d, e);
  if (maior <= 0) return { q: 4, deficit: 100, lado: "ambos" };
  const pct = (1 - Math.min(d, e) / maior) * 100;
  return { q: deficitParaQ(pct), deficit: Math.round(pct), lado: d === e ? "ambos" : d < e ? "D" : "E" };
}

// Junta as linhas de força em itens da CIF, ficando com o pior grau de cada código
export function cifDaForca(
  linhas: LinhaForca[],
  titulos: Record<string, string>
): { code: string; title: string; component: "b"; q: string }[] {
  const pior = new Map<string, Qualificador>();
  for (const l of linhas) {
    const c = classificar(l);
    if (!c) continue;
    pior.set(l.cif_code, Math.max(pior.get(l.cif_code) ?? 0, c.q) as Qualificador);
  }
  return [...pior.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([code, q]) => ({ code, title: titulos[code] ?? code, component: "b" as const, q: String(q) }));
}

const ladoTexto = { D: "direito", E: "esquerdo", ambos: "bilateral" } as const;

export function textoForca(linhas: LinhaForca[]) {
  const oxford = linhas.filter((l) => l.metodo === "oxford" && classificar(l));
  const dina = linhas.filter((l) => l.metodo === "dinamometria" && classificar(l));
  const partes: string[] = [];
  if (oxford.length) {
    partes.push("Força muscular pela escala de Oxford (0 a 5):");
    for (const l of oxford) {
      const c = classificar(l)!;
      const lados = [l.d !== "" && `direito ${l.d}`, l.e !== "" && `esquerdo ${l.e}`].filter(Boolean).join(", ");
      partes.push(`${l.name}: ${lados}; ${CLASSES[c.q].nome.toLowerCase()}.`);
    }
  }
  if (dina.length) {
    partes.push("Força muscular por dinamometria:");
    for (const l of dina) {
      const c = classificar(l)!;
      const u = l.unidade || "kgf";
      const lados = [l.d !== "" && `direito ${l.d} ${u}`, l.e !== "" && `esquerdo ${l.e} ${u}`].filter(Boolean).join(", ");
      const ref = l.referencia ? `, referência ${l.referencia} ${u}` : "";
      const lado = c.lado && c.lado !== "ambos" ? ` no lado ${ladoTexto[c.lado]}` : "";
      partes.push(`${l.name}: ${lados}${ref}; déficit de ${c.deficit}%${lado}; ${CLASSES[c.q].nome.toLowerCase()}.`);
    }
  }
  return partes.join("\n");
}

export function textoOrto(resultados: ResultadoOrto[]) {
  const feitos = resultados.filter((r) => r.d || r.e);
  if (!feitos.length) return "";
  const linhas = ["Testes ortopédicos:"];
  for (const r of feitos) {
    const lados =
      r.d && r.e && r.d === r.e
        ? `${r.d} bilateralmente`
        : [r.d && `${r.d} à direita`, r.e && `${r.e} à esquerda`].filter(Boolean).join(", ");
    linhas.push(`${r.name}: ${lados}${r.obs.trim() ? ` (${r.obs.trim()})` : ""}.`);
  }
  return linhas.join("\n");
}

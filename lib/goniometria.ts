// Goniometria: classificação de amplitude de movimento (ADM) em qualificadores da CIF,
// com as mesmas cores e faixas usadas na força muscular.

import { deficitParaQ, CLASSES, type Qualificador } from "./forca";

export type LinhaGonio = {
  id: string;
  code: string;
  name: string;
  region: string;
  cif_code: string;
  normal_rom: number; // valor de referência em graus
  d: string; // lado direito (graus medidos)
  e: string; // lado esquerdo
  obs: string;
};

const num = (s: string) => {
  const n = Number(String(s).replace(",", "."));
  return s !== "" && Number.isFinite(n) && n >= 0 ? n : null;
};

export type ClassificacaoGonio = {
  q: Qualificador;
  deficit_d: number | null;
  deficit_e: number | null;
  pior_lado: "D" | "E" | "ambos" | null;
};

function calcDeficit(medido: number | null, normal: number): number | null {
  if (medido === null) return null;
  // Extensão de joelho e cotovelo: normal = 0, limitação é o valor medido que falta para chegar a 0
  // Nesse caso, qualquer valor > 0 é déficit de extensão
  if (normal === 0) {
    // Se mede 0 = sem déficit; se mede > 0 = há déficit de extensão
    // Usamos 180 como arco total de referência para calcular o percentual
    return medido === 0 ? 0 : Math.min(100, Math.round((medido / 180) * 100));
  }
  if (medido >= normal) return 0;
  return Math.min(100, Math.round(((normal - medido) / normal) * 100));
}

export function classificarGonio(l: LinhaGonio): ClassificacaoGonio | null {
  const d = num(l.d);
  const e = num(l.e);
  if (d === null && e === null) return null;

  const dd = calcDeficit(d, l.normal_rom);
  const de = calcDeficit(e, l.normal_rom);

  const pior = Math.max(dd ?? 0, de ?? 0);
  const q = deficitParaQ(pior);

  let pior_lado: "D" | "E" | "ambos" | null = null;
  if (dd !== null && de !== null) {
    pior_lado = Math.abs((dd ?? 0) - (de ?? 0)) < 1 ? "ambos" : (dd ?? 0) > (de ?? 0) ? "D" : "E";
  } else if (dd !== null) {
    pior_lado = "D";
  } else {
    pior_lado = "E";
  }

  return { q, deficit_d: dd, deficit_e: de, pior_lado };
}

// Junta as linhas de goniometria em itens da CIF, ficando com o pior grau de cada código
export function cifDaGoniometria(
  linhas: LinhaGonio[],
  titulos: Record<string, string>
): { code: string; title: string; component: "b"; q: string }[] {
  const pior = new Map<string, Qualificador>();
  for (const l of linhas) {
    const c = classificarGonio(l);
    if (!c) continue;
    pior.set(l.cif_code, Math.max(pior.get(l.cif_code) ?? 0, c.q) as Qualificador);
  }
  return [...pior.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([code, q]) => ({ code, title: titulos[code] ?? code, component: "b" as const, q: String(q) }));
}

export function textoGoniometria(linhas: LinhaGonio[]) {
  const preenchidas = linhas.filter((l) => classificarGonio(l));
  if (!preenchidas.length) return "";
  const partes = ["Goniometria (amplitude de movimento em graus):"];
  for (const l of preenchidas) {
    const c = classificarGonio(l)!;
    const lados = [
      l.d !== "" && `direito ${l.d}°`,
      l.e !== "" && `esquerdo ${l.e}°`,
    ].filter(Boolean).join(", ");
    const ref = l.normal_rom > 0 ? ` (referência ${l.normal_rom}°)` : "";
    const defs = [
      c.deficit_d !== null && c.deficit_d > 0 && `déficit D ${c.deficit_d}%`,
      c.deficit_e !== null && c.deficit_e > 0 && `déficit E ${c.deficit_e}%`,
    ].filter(Boolean).join(", ");
    partes.push(
      `${l.name}: ${lados}${ref}${defs ? `; ${defs}` : ""}; ${CLASSES[c.q].nome.toLowerCase()}.${l.obs.trim() ? ` Obs.: ${l.obs.trim()}` : ""}`
    );
  }
  return partes.join("\n");
}

export { CLASSES, deficitParaQ };

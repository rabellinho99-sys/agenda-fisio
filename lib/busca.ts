// Regra única de busca e ordenação de pacientes, usada em todas as telas.
// Ignora acentos e maiúsculas, ordena em ordem alfabética do português
// e aceita nome (em qualquer ordem das palavras), CPF ou telefone.

export function normalizar(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const soDigitos = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

export function compararNomes(a: string, b: string): number {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base", ignorePunctuation: true });
}

type ComNome = { full_name: string; cpf?: string | null; phone?: string | null };

export function ordenarPorNome<T extends ComNome>(lista: T[]): T[] {
  return [...lista].sort((a, b) => compararNomes(a.full_name, b.full_name));
}

export function combina(p: ComNome, termo: string): boolean {
  const t = normalizar(termo);
  if (!t) return true;
  const nome = normalizar(p.full_name);
  const palavras = t.split(" ").filter(Boolean);
  if (palavras.every((w) => nome.includes(w))) return true;
  const dig = soDigitos(termo);
  if (dig.length >= 3) {
    return soDigitos(p.cpf).includes(dig) || soDigitos(p.phone).includes(dig);
  }
  return false;
}

// Filtra e ordena. Nomes que começam com o termo aparecem primeiro, depois os demais, cada grupo em ordem alfabética.
export function buscarPacientes<T extends ComNome>(lista: T[], termo: string, limite?: number): T[] {
  const t = normalizar(termo);
  const achados = ordenarPorNome(lista.filter((p) => combina(p, termo)));
  const resultado = t
    ? [...achados.filter((p) => normalizar(p.full_name).startsWith(t)), ...achados.filter((p) => !normalizar(p.full_name).startsWith(t))]
    : achados;
  return limite ? resultado.slice(0, limite) : resultado;
}

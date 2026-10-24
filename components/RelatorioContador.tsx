"use client";

import { useRouter } from "next/navigation";

export type Lancamento = {
  data: string; historico: string; tipo: "entrada" | "saida"; categoria: string;
  cpf: string | null; valor_cents: number; forma?: string | null;
};
export type ReceitaPaciente = { nome: string; cpf: string | null; sessoes: number; pacotes: number; total_cents: number };
export type ReciboLinha = {
  numero: number; data: string; paciente: string; cpf: string | null;
  pagador: string; pagadorCpf: string | null; forma: string; valor_cents: number;
};

const FORMA: Record<string, string> = {
  pix: "Pix", credit_card: "Cartão de crédito", debit_card: "Cartão de débito",
  cash: "Dinheiro", transfer: "Transferência", insurance: "Convênio",
};
const CATEGORIA: Record<string, string> = {
  aluguel: "Aluguel", insumos: "Insumos", marketing: "Marketing", comissao: "Comissão",
  impostos: "Impostos", equipamentos: "Equipamentos", outros: "Outros",
};

const reais = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numeroCsv = (c: number) => (c / 100).toFixed(2).replace(".", ",");
const dataBR = (d: string) => d.split("-").reverse().join("/");
const cpfFmt = (v: string | null) => {
  const d = (v ?? "").replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : v ?? "";
};

function baixarCsv(nome: string, cabecalho: string[], linhas: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const texto = [cabecalho, ...linhas].map((l) => l.map(esc).join(";")).join("\r\n");
  // BOM para o Excel abrir acentos corretamente
  const blob = new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nome; a.click();
  URL.revokeObjectURL(url);
}

export function RelatorioContador({ clinica, periodo, lancamentos, pacientes, recibos }: {
  clinica: { nome: string; razao: string | null; documento: string | null; crefito: string | null };
  periodo: { tipo: "mes" | "ano"; ref: string };
  lancamentos: Lancamento[];
  pacientes: ReceitaPaciente[];
  recibos: ReciboLinha[];
}) {
  const router = useRouter();

  const entradas = lancamentos.filter((l) => l.tipo === "entrada");
  const saidas = lancamentos.filter((l) => l.tipo === "saida");
  const receitaSessoes = entradas.filter((l) => l.categoria === "Sessão").reduce((s, l) => s + l.valor_cents, 0);
  const receitaPacotes = entradas.filter((l) => l.categoria === "Pacote").reduce((s, l) => s + l.valor_cents, 0);
  const receita = receitaSessoes + receitaPacotes;
  const despesa = saidas.reduce((s, l) => s + l.valor_cents, 0);
  const totalRecibos = recibos.reduce((s, r) => s + r.valor_cents, 0);
  const semCpf = pacientes.filter((p) => !p.cpf).length;

  const porCategoria = new Map<string, number>();
  for (const s of saidas) porCategoria.set(s.categoria, (porCategoria.get(s.categoria) ?? 0) + s.valor_cents);

  let saldo = 0;
  const livro = lancamentos.map((l) => {
    saldo += l.tipo === "entrada" ? l.valor_cents : -l.valor_cents;
    return { ...l, saldo };
  });

  const titulo = periodo.tipo === "ano"
    ? `Ano de ${periodo.ref}`
    : new Date(`${periodo.ref}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const sufixo = periodo.ref;

  function irPara(delta: number) {
    if (periodo.tipo === "ano") return router.push(`/relatorio/contador?ano=${Number(periodo.ref) + delta}`);
    const [a, m] = periodo.ref.split("-").map(Number);
    const d = new Date(a, m - 1 + delta, 1);
    router.push(`/relatorio/contador?mes=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function alternar() {
    if (periodo.tipo === "mes") router.push(`/relatorio/contador?ano=${periodo.ref.slice(0, 4)}`);
    else router.push(`/relatorio/contador?mes=${periodo.ref}-${String(new Date().getMonth() + 1).padStart(2, "0")}`);
  }

  const exportarLivro = () => baixarCsv(`livro-caixa-${sufixo}.csv`,
    ["Data", "Histórico", "Categoria", "CPF", "Forma", "Entrada", "Saída", "Saldo"],
    livro.map((l) => [
      dataBR(l.data), l.historico, CATEGORIA[l.categoria] ?? l.categoria, cpfFmt(l.cpf), l.forma ? FORMA[l.forma] ?? l.forma : "",
      l.tipo === "entrada" ? numeroCsv(l.valor_cents) : "", l.tipo === "saida" ? numeroCsv(l.valor_cents) : "", numeroCsv(l.saldo),
    ]));
  const exportarPacientes = () => baixarCsv(`receita-por-paciente-${sufixo}.csv`,
    ["Paciente", "CPF", "Sessões avulsas", "Pacotes", "Total"],
    pacientes.map((p) => [p.nome, cpfFmt(p.cpf), p.sessoes, p.pacotes, numeroCsv(p.total_cents)]));
  const exportarRecibos = () => baixarCsv(`recibos-${sufixo}.csv`,
    ["Nº", "Data do recebimento", "Paciente", "CPF do paciente", "Pagador", "CPF do pagador", "Forma", "Valor"],
    recibos.map((r) => [r.numero, dataBR(r.data), r.paciente, cpfFmt(r.cpf), r.pagador, cpfFmt(r.pagadorCpf), r.forma, numeroCsv(r.valor_cents)]));

  const th = "border-b border-black/20 px-2 py-1 text-left font-semibold";
  const td = "border-b border-black/10 px-2 py-1 align-top";
  const num = "text-right tabular-nums whitespace-nowrap";

  return (
    <main className="min-h-screen bg-paper py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-2 px-4 print:hidden">
        <a href="/painel/financeiro" className="btn-ghost text-sm">← Financeiro</a>
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-white p-1">
          <button className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper" onClick={() => irPara(-1)}>← Anterior</button>
          <button className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper" onClick={() => irPara(1)}>Próximo →</button>
          <button className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper" onClick={alternar}>
            {periodo.tipo === "mes" ? "Ver ano inteiro" : "Ver por mês"}
          </button>
        </div>
      </div>
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap gap-2 px-4 print:hidden">
        <button className="btn-primary text-sm" onClick={() => window.print()}>Baixar PDF ou imprimir</button>
        <button className="btn-ghost text-sm" onClick={exportarLivro}>Planilha: livro-caixa</button>
        <button className="btn-ghost text-sm" onClick={exportarPacientes}>Planilha: receita por paciente</button>
        <button className="btn-ghost text-sm" onClick={exportarRecibos}>Planilha: recibos</button>
      </div>

      <article className="mx-auto max-w-[210mm] bg-white px-[14mm] py-[12mm] text-[10pt] leading-snug text-black shadow print:p-0 print:shadow-none">
        <header className="border-b border-black/30 pb-3">
          <p className="text-[9pt] uppercase tracking-wide text-black/60">Relatório financeiro para a contabilidade</p>
          <h1 className="mt-1 text-[15pt] font-bold capitalize">{titulo}</h1>
          <p className="mt-1">{clinica.razao || clinica.nome}</p>
          <p className="text-[9pt] text-black/70">
            {clinica.documento ? `CNPJ/CPF ${clinica.documento}` : "CNPJ/CPF não informado"}
            {clinica.crefito ? ` · CREFITO ${clinica.crefito}` : ""}
            {` · Gerado em ${new Date().toLocaleDateString("pt-BR")}`}
          </p>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1">
          <p>Receita de sessões avulsas</p><p className={num}>{reais(receitaSessoes)}</p>
          <p>Receita de pacotes vendidos</p><p className={num}>{reais(receitaPacotes)}</p>
          <p className="font-semibold">Receita total</p><p className={`${num} font-semibold`}>{reais(receita)}</p>
          <p>Despesas</p><p className={num}>{reais(despesa)}</p>
          <p className="font-semibold">Resultado</p><p className={`${num} font-semibold`}>{reais(receita - despesa)}</p>
          <p className="text-black/70">Valor em recibos emitidos</p><p className={`${num} text-black/70`}>{reais(totalRecibos)}</p>
        </section>
        <p className="mt-2 text-[8.5pt] text-black/60">
          Receita considera sessões concluídas na agenda e pacotes marcados como pagos. Sessões de pacote entram uma vez só, no dia da venda.
          Recibos são mostrados à parte porque podem se referir às mesmas sessões.
        </p>

        <h2 className="mt-6 text-[12pt] font-bold">Receita por paciente</h2>
        {semCpf > 0 && <p className="mt-1 text-[9pt] text-red-700 print:text-black">{semCpf} paciente(s) sem CPF no cadastro.</p>}
        <table className="mt-2 w-full border-collapse">
          <thead><tr><th className={th}>Paciente</th><th className={th}>CPF</th><th className={`${th} text-right`}>Sessões</th><th className={`${th} text-right`}>Pacotes</th><th className={`${th} text-right`}>Total</th></tr></thead>
          <tbody>
            {pacientes.length === 0 && <tr><td className={td} colSpan={5}>Sem receitas no período.</td></tr>}
            {pacientes.map((p, i) => (
              <tr key={i}>
                <td className={td}>{p.nome}</td>
                <td className={`${td} whitespace-nowrap`}>{p.cpf ? cpfFmt(p.cpf) : <span className="text-red-700 print:text-black">sem CPF</span>}</td>
                <td className={`${td} ${num}`}>{p.sessoes}</td>
                <td className={`${td} ${num}`}>{p.pacotes}</td>
                <td className={`${td} ${num}`}>{reais(p.total_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="mt-6 text-[12pt] font-bold">Recibos emitidos</h2>
        <table className="mt-2 w-full border-collapse">
          <thead><tr><th className={th}>Nº</th><th className={th}>Data</th><th className={th}>Pagador</th><th className={th}>CPF</th><th className={th}>Forma</th><th className={`${th} text-right`}>Valor</th></tr></thead>
          <tbody>
            {recibos.length === 0 && <tr><td className={td} colSpan={6}>Nenhum recibo emitido no período.</td></tr>}
            {recibos.map((r) => (
              <tr key={r.numero}>
                <td className={td}>{r.numero}</td>
                <td className={`${td} whitespace-nowrap`}>{dataBR(r.data)}</td>
                <td className={td}>{r.pagador}{r.pagador !== r.paciente && r.paciente ? <span className="block text-[8.5pt] text-black/60">Paciente: {r.paciente}</span> : null}</td>
                <td className={`${td} whitespace-nowrap`}>{cpfFmt(r.pagadorCpf)}</td>
                <td className={td}>{r.forma}</td>
                <td className={`${td} ${num}`}>{reais(r.valor_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="mt-6 text-[12pt] font-bold">Despesas por categoria</h2>
        <table className="mt-2 w-full border-collapse">
          <tbody>
            {porCategoria.size === 0 && <tr><td className={td}>Nenhuma despesa lançada no período.</td></tr>}
            {[...porCategoria.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => (
              <tr key={c}><td className={td}>{CATEGORIA[c] ?? c}</td><td className={`${td} ${num}`}>{reais(v)}</td></tr>
            ))}
          </tbody>
        </table>

        <h2 className="mt-6 text-[12pt] font-bold print:break-before-page">Livro-caixa</h2>
        <table className="mt-2 w-full border-collapse text-[9pt]">
          <thead><tr><th className={th}>Data</th><th className={th}>Histórico</th><th className={`${th} text-right`}>Entrada</th><th className={`${th} text-right`}>Saída</th><th className={`${th} text-right`}>Saldo</th></tr></thead>
          <tbody>
            {livro.length === 0 && <tr><td className={td} colSpan={5}>Sem lançamentos no período.</td></tr>}
            {livro.map((l, i) => (
              <tr key={i}>
                <td className={`${td} whitespace-nowrap`}>{dataBR(l.data)}</td>
                <td className={td}>{l.historico}{l.tipo === "saida" ? ` (${CATEGORIA[l.categoria] ?? l.categoria})` : ""}</td>
                <td className={`${td} ${num}`}>{l.tipo === "entrada" ? reais(l.valor_cents) : ""}</td>
                <td className={`${td} ${num}`}>{l.tipo === "saida" ? reais(l.valor_cents) : ""}</td>
                <td className={`${td} ${num}`}>{reais(l.saldo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </main>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { brl } from "@/lib/format";

type Appt = {
  id: string; starts_at: string; price_cents: number; discount_cents: number | null; status: string;
  professional_id: string; professionals: { display_name: string } | null; services: { name: string } | null;
};
type PacoteVendido = {
  id: string; package_name: string; price_cents: number; payment_method: string | null; purchased_at: string;
  patients: { full_name: string } | null;
};
type Expense = { id: string; description: string; category: string; amount_cents: number; paid_at: string; notes: string | null };
type Prof = { id: string; display_name: string };

const CATEGORIAS = ["aluguel", "insumos", "marketing", "comissao", "impostos", "equipamentos", "outros"];
const LABEL_CATEGORIA: Record<string, string> = {
  aluguel: "Aluguel", insumos: "Insumos", marketing: "Marketing", comissao: "Comissão",
  impostos: "Impostos", equipamentos: "Equipamentos", outros: "Outros",
};

const vazio = { description: "", category: "outros", amount: "", paid_at: new Date().toISOString().slice(0, 10), notes: "" };

export function Financeiro({ clinicId, mes, appointments, pacotesVendidos, expenses: inicial, professionals }: {
  clinicId: string; mes: string; appointments: Appt[]; pacotesVendidos: PacoteVendido[]; expenses: Expense[]; professionals: Prof[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [expenses, setExpenses] = useState(inicial);
  const [form, setForm] = useState(vazio);
  const [editando, setEditando] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const receitaAvulsos = appointments.reduce((s, a) => s + (a.price_cents - (a.discount_cents ?? 0)), 0);
  const receitaPacotes = pacotesVendidos.reduce((s, p) => s + p.price_cents, 0);
  const receitaTotal = receitaAvulsos + receitaPacotes;
  const despesaTotal = expenses.reduce((s, e) => s + e.amount_cents, 0);
  const saldo = receitaTotal - despesaTotal;

  const porProfissional = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; sessoes: number }>();
    for (const a of appointments) {
      const nome = a.professionals?.display_name ?? "Sem profissional";
      const atual = map.get(a.professional_id) ?? { nome, total: 0, sessoes: 0 };
      atual.total += a.price_cents - (a.discount_cents ?? 0);
      atual.sessoes += 1;
      map.set(a.professional_id, atual);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [appointments]);

  const porServico = useMemo(() => {
    const map = new Map<string, { total: number; sessoes: number }>();
    for (const a of appointments) {
      const nome = a.services?.name ?? "Sem serviço";
      const atual = map.get(nome) ?? { total: 0, sessoes: 0 };
      atual.total += a.price_cents - (a.discount_cents ?? 0);
      atual.sessoes += 1;
      map.set(nome, atual);
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [appointments]);

  const porCategoria = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amount_cents);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  function trocarMes(delta: number) {
    const [ano, m] = mes.split("-").map(Number);
    const d = new Date(ano, m - 1 + delta, 1);
    router.push(`/painel/financeiro?mes=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  async function salvar() {
    setErro(null);
    const valor = Math.round(Number(String(form.amount).replace(",", ".")) * 100);
    if (!form.description || !valor) return setErro("Preencha descrição e valor.");
    setSalvando(true);
    const payload = { clinic_id: clinicId, description: form.description, category: form.category, amount_cents: valor, paid_at: form.paid_at, notes: form.notes || null };
    const q = editando ? supabase.from("expenses").update(payload).eq("id", editando) : supabase.from("expenses").insert(payload);
    const { data, error } = await q.select("id, description, category, amount_cents, paid_at, notes").single();
    setSalvando(false);
    if (error) return setErro(error.message);
    if (editando) setExpenses(expenses.map((e) => (e.id === editando ? (data as Expense) : e)));
    else setExpenses([data as Expense, ...expenses].sort((a, b) => b.paid_at.localeCompare(a.paid_at)));
    setForm(vazio); setEditando(null); setMostrarForm(false);
  }

  function editar(e: Expense) {
    setEditando(e.id);
    setForm({ description: e.description, category: e.category, amount: (e.amount_cents / 100).toFixed(2).replace(".", ","), paid_at: e.paid_at, notes: e.notes ?? "" });
    setMostrarForm(true);
  }

  async function remover(id: string) {
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses(expenses.filter((e) => e.id !== id));
  }

  const [anoLabel, mesLabel] = mes.split("-").map(Number);
  const nomeMes = new Date(anoLabel, mesLabel - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="h-title text-3xl">Financeiro</h1>
          <p className="mt-1 text-ink/70 capitalize">{nomeMes}</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-white p-1">
          <button className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper" onClick={() => trocarMes(-1)}>← Anterior</button>
          <button className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper" onClick={() => trocarMes(1)}>Próximo →</button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Receita do mês</p>
          <p className="mt-1 text-2xl font-extrabold text-moss-deep">{brl(receitaTotal)}</p>
          <p className="mt-1 text-xs text-ink/60">{appointments.length} sessões · {pacotesVendidos.length} pacotes vendidos</p>
        </div>
        <div className="rounded-xl bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Despesas do mês</p>
          <p className="mt-1 text-2xl font-extrabold text-danger">{brl(despesaTotal)}</p>
          <p className="mt-1 text-xs text-ink/60">{expenses.length} lançamentos</p>
        </div>
        <div className="rounded-xl bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Saldo</p>
          <p className={`mt-1 text-2xl font-extrabold ${saldo >= 0 ? "text-moss-deep" : "text-danger"}`}>{brl(saldo)}</p>
          <p className="mt-1 text-xs text-ink/60">receita − despesas</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="h-title text-xl">Receita por profissional</h2>
          <div className="mt-3 space-y-2">
            {porProfissional.length === 0 && <p className="text-sm text-ink/60">Nenhuma sessão concluída neste mês.</p>}
            {porProfissional.map((p) => (
              <div key={p.nome} className="flex items-center justify-between rounded-xl bg-white p-3">
                <div>
                  <p className="font-semibold">{p.nome}</p>
                  <p className="text-xs text-ink/60">{p.sessoes} sessões</p>
                </div>
                <p className="font-bold">{brl(p.total)}</p>
              </div>
            ))}
          </div>

          <h2 className="h-title mt-6 text-xl">Receita por serviço</h2>
          <div className="mt-3 space-y-2">
            {porServico.length === 0 && <p className="text-sm text-ink/60">Nenhuma sessão concluída neste mês.</p>}
            {porServico.map(([nome, v]) => (
              <div key={nome} className="flex items-center justify-between rounded-xl bg-white p-3">
                <div>
                  <p className="font-semibold">{nome}</p>
                  <p className="text-xs text-ink/60">{v.sessoes} sessões</p>
                </div>
                <p className="font-bold">{brl(v.total)}</p>
              </div>
            ))}
          </div>

          {pacotesVendidos.length > 0 && (
            <>
              <h2 className="h-title mt-6 text-xl">Pacotes vendidos</h2>
              <div className="mt-3 space-y-2">
                {pacotesVendidos.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl bg-white p-3">
                    <div>
                      <p className="font-semibold">{p.package_name}</p>
                      <p className="text-xs text-ink/60">{p.patients?.full_name}{p.payment_method ? ` · ${p.payment_method}` : ""}</p>
                    </div>
                    <p className="font-bold">{brl(p.price_cents)}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="h-title text-xl">Despesas</h2>
            <button className="btn-ghost text-sm" onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm(vazio); }}>
              {mostrarForm ? "Fechar" : "Adicionar despesa"}
            </button>
          </div>

          {mostrarForm && (
            <div className="mt-3 space-y-3 rounded-xl bg-white p-4">
              <div><label className="label">Descrição</label><input className="field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Aluguel da sala, insumos PRP..." /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="label">Categoria</label>
                  <select className="field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIAS.map((c) => <option key={c} value={c}>{LABEL_CATEGORIA[c]}</option>)}
                  </select>
                </div>
                <div><label className="label">Valor (R$)</label><input className="field" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="150,00" /></div>
              </div>
              <div><label className="label">Data</label><input type="date" className="field" value={form.paid_at} onChange={(e) => setForm({ ...form, paid_at: e.target.value })} /></div>
              <div><label className="label">Observações</label><input className="field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
              <button className="btn-primary w-full" onClick={salvar} disabled={salvando}>{salvando ? "Salvando" : editando ? "Salvar alteração" : "Adicionar despesa"}</button>
            </div>
          )}

          <div className="mt-3 space-y-2">
            {expenses.length === 0 && !mostrarForm && (
              <div className="rounded-xl border border-dashed border-mist p-8 text-center">
                <p className="font-semibold">Nenhuma despesa lançada</p>
                <p className="mt-1 text-sm text-ink/60">Registre aluguel, insumos e outras contas do mês.</p>
              </div>
            )}
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 rounded-xl bg-white p-3">
                <div>
                  <p className="font-semibold">{e.description}</p>
                  <p className="text-xs text-ink/60">{LABEL_CATEGORIA[e.category] ?? e.category} · {new Date(e.paid_at + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-danger">{brl(e.amount_cents)}</p>
                  <button className="text-xs text-ink/50 underline underline-offset-4" onClick={() => editar(e)}>editar</button>
                  <button className="text-xs text-ink/50 underline underline-offset-4" onClick={() => remover(e.id)}>excluir</button>
                </div>
              </div>
            ))}
          </div>

          {porCategoria.length > 0 && (
            <>
              <h2 className="h-title mt-6 text-xl">Despesas por categoria</h2>
              <div className="mt-3 space-y-2">
                {porCategoria.map(([cat, total]) => (
                  <div key={cat} className="flex items-center justify-between rounded-xl bg-white p-3">
                    <p className="font-semibold">{LABEL_CATEGORIA[cat] ?? cat}</p>
                    <p className="font-bold">{brl(total)}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

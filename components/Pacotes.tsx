"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { brl } from "@/lib/format";

type Pkg = { id: string; name: string; service_id: string | null; sessions: number; price_cents: number; validity_days: number | null; description: string | null };
type Svc = { id: string; name: string; price_cents: number };

const vazio = { name: "", service_id: "", sessions: 10, price: "", validity_days: 90, description: "" };

export function Pacotes({ clinicId, inicial, services }: { clinicId: string; inicial: Pkg[]; services: Svc[] }) {
  const supabase = createClient();
  const [lista, setLista] = useState(inicial);
  const [form, setForm] = useState(vazio);
  const [editando, setEditando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const svc = services.find((s) => s.id === form.service_id);
  const cheio = svc ? svc.price_cents * Number(form.sessions || 0) : 0;
  const cobrado = Math.round(Number(String(form.price).replace(",", ".")) * 100) || 0;
  const desconto = cheio > 0 && cobrado > 0 ? Math.round((1 - cobrado / cheio) * 100) : 0;

  async function salvar() {
    setErro(null);
    const payload = {
      clinic_id: clinicId, name: form.name, service_id: form.service_id || null,
      sessions: Number(form.sessions), price_cents: cobrado,
      validity_days: Number(form.validity_days) || null, description: form.description || null,
    };
    const q = editando
      ? supabase.from("packages").update(payload).eq("id", editando).select("id, name, service_id, sessions, price_cents, validity_days, description").single()
      : supabase.from("packages").insert(payload).select("id, name, service_id, sessions, price_cents, validity_days, description").single();
    const { data, error } = await q;
    if (error) return setErro(error.message);
    const p = data as Pkg;
    setLista(editando ? lista.map((x) => (x.id === p.id ? p : x)) : [...lista, p]);
    setForm(vazio); setEditando(null);
  }

  function editar(p: Pkg) {
    setEditando(p.id);
    setForm({
      name: p.name, service_id: p.service_id ?? "", sessions: p.sessions,
      price: (p.price_cents / 100).toFixed(2).replace(".", ","),
      validity_days: p.validity_days ?? 90, description: p.description ?? "",
    });
  }

  async function remover(id: string) {
    if (!window.confirm("Desativar este pacote? Os pacotes já vendidos continuam valendo.")) return;
    await supabase.from("packages").update({ active: false }).eq("id", id);
    setLista(lista.filter((p) => p.id !== id));
    if (editando === id) { setEditando(null); setForm(vazio); }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_360px]">
      <section>
        <h1 className="h-title text-3xl">Pacotes de sessões</h1>
        <p className="mt-1 text-ink/70">Modelos de pacote que você vende ao paciente. O saldo é descontado quando a sessão é marcada como realizada.</p>
        <div className="mt-6 space-y-2">
          {lista.length === 0 && (
            <div className="rounded-xl border border-dashed border-mist p-8 text-center">
              <p className="font-semibold">Nenhum pacote ainda</p>
              <p className="mt-1 text-sm text-ink/60">Um pacote de 10 sessões com desconto costuma ser o primeiro.</p>
            </div>
          )}
          {lista.map((p) => {
            const s = services.find((x) => x.id === p.service_id);
            const unit = p.price_cents / p.sessions;
            return (
              <article key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-ink/60">
                    {p.sessions} sessões de {s?.name ?? "qualquer serviço"} · {brl(p.price_cents)} ({brl(unit)} por sessão)
                    {p.validity_days ? ` · validade ${p.validity_days} dias` : " · sem validade"}
                  </p>
                  {p.description && <p className="mt-1 text-sm text-ink/60">{p.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => editar(p)}>Editar</button>
                  <button className="btn-danger px-3 py-1.5 text-sm" onClick={() => remover(p.id)}>Remover</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <aside className="space-y-3 rounded-xl bg-white p-4">
        <p className="font-bold">{editando ? "Editar pacote" : "Novo pacote"}</p>
        <div><label className="label">Nome</label><input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pacote 10 sessões" /></div>
        <div><label className="label">Serviço</label>
          <select className="field" value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })}>
            <option value="">Qualquer serviço</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label">Sessões</label><input type="number" min={1} className="field" value={form.sessions} onChange={(e) => setForm({ ...form, sessions: Number(e.target.value) })} /></div>
          <div><label className="label">Validade (dias)</label><input type="number" className="field" value={form.validity_days} onChange={(e) => setForm({ ...form, validity_days: Number(e.target.value) })} /></div>
        </div>
        <div><label className="label">Preço total (R$)</label><input className="field" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="1800,00" /></div>
        {cheio > 0 && (
          <p className="rounded-lg bg-paper px-3 py-2 text-xs text-ink/70">
            Avulso daria {brl(cheio)}. {cobrado > 0 ? `Seu pacote sai ${desconto > 0 ? `${desconto}% mais barato` : "sem desconto"}, ${brl(cobrado / Number(form.sessions || 1))} por sessão.` : "Informe o preço para ver o desconto."}
          </p>
        )}
        <div><label className="label">Descrição (opcional)</label><input className="field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
        <div className="flex gap-2">
          <button className="btn-primary flex-1" onClick={salvar} disabled={!form.name.trim() || !form.sessions}>{editando ? "Salvar alterações" : "Adicionar"}</button>
          {editando && <button className="btn-ghost" onClick={() => { setEditando(null); setForm(vazio); }}>Cancelar</button>}
        </div>
      </aside>
    </div>
  );
}

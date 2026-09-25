"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { brl } from "@/lib/format";
import { ServicePhotoEditor } from "@/components/ServicePhotoEditor";

type Svc = { id: string; name: string; category: string | null; duration_minutes: number; buffer_after_minutes: number; price_cents: number; visible_online: boolean; active: boolean; description: string | null; image_url: string | null };

const vazio = { name: "", category: "", duration_minutes: 50, buffer_after_minutes: 0, price: "", visible_online: true };

export function Servicos({ clinicId, inicial }: { clinicId: string; inicial: Svc[] }) {
  const supabase = createClient();
  const [lista, setLista] = useState(inicial);
  const [form, setForm] = useState(vazio);
  const [editando, setEditando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function recarregar() {
    const { data } = await supabase.from("services")
      .select("id, name, category, duration_minutes, buffer_after_minutes, price_cents, visible_online, active, description, image_url")
      .eq("clinic_id", clinicId).eq("active", true).order("sort_order").order("name");
    setLista((data as Svc[]) ?? []);
  }

  async function salvar() {
    setErro(null);
    const payload = {
      clinic_id: clinicId, name: form.name, category: form.category || null,
      duration_minutes: Number(form.duration_minutes), buffer_after_minutes: Number(form.buffer_after_minutes),
      price_cents: Math.round(Number(String(form.price).replace(",", ".")) * 100) || 0,
      visible_online: form.visible_online,
    };
    const q = editando
      ? supabase.from("services").update(payload).eq("id", editando)
      : supabase.from("services").insert(payload);
    const { error } = await q;
    if (error) return setErro(error.message);
    setForm(vazio); setEditando(null); recarregar();
  }

  function editar(s: Svc) {
    setEditando(s.id);
    setForm({ name: s.name, category: s.category ?? "", duration_minutes: s.duration_minutes, buffer_after_minutes: s.buffer_after_minutes, price: (s.price_cents / 100).toFixed(2).replace(".", ","), visible_online: s.visible_online });
  }

  async function remover(id: string) {
    await supabase.from("services").update({ active: false }).eq("id", id);
    recarregar();
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_360px]">
      <section>
        <h1 className="h-title text-3xl">Serviços</h1>
        <p className="mt-1 text-ink/70">O que o paciente pode escolher ao agendar.</p>
        <div className="mt-6 space-y-2">
          {lista.length === 0 && (
            <div className="rounded-xl border border-dashed border-mist p-8 text-center">
              <p className="font-semibold">Nenhum serviço ainda</p>
              <p className="mt-1 text-sm text-ink/60">Comece com uma avaliação e uma sessão padrão.</p>
            </div>
          )}
          {lista.map((s) => (
            <article key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4">
              <div>
                <p className="font-semibold">{s.name} {!s.visible_online && <span className="ml-2 rounded bg-ink/10 px-1.5 py-0.5 text-xs">só no painel</span>}</p>
                <p className="text-sm text-ink/60">{s.category ? `${s.category} · ` : ""}{s.duration_minutes} min{s.buffer_after_minutes ? ` + ${s.buffer_after_minutes} de intervalo` : ""} · {brl(s.price_cents)}</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => editar(s)}>Editar</button>
                <button className="btn-danger px-3 py-1.5 text-sm" onClick={() => remover(s.id)}>Remover</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="space-y-3 rounded-xl bg-white p-4">
        <p className="font-bold">{editando ? "Editar serviço" : "Novo serviço"}</p>
        <div><label className="label">Nome</label><input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Avaliação fisioterapêutica" /></div>
        <div><label className="label">Categoria</label><input className="field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Avaliação, Injetáveis, Reabilitação" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label">Duração (min)</label><input type="number" className="field" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} /></div>
          <div><label className="label">Intervalo depois</label><input type="number" className="field" value={form.buffer_after_minutes} onChange={(e) => setForm({ ...form, buffer_after_minutes: Number(e.target.value) })} /></div>
        </div>
        <div><label className="label">Preço (R$)</label><input className="field" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="250,00" /></div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.visible_online} onChange={(e) => setForm({ ...form, visible_online: e.target.checked })} />
          Aparece na página pública
        </label>
        {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
        <div className="flex gap-2">
          <button className="btn-primary flex-1" onClick={salvar} disabled={!form.name || !form.duration_minutes}>{editando ? "Salvar alterações" : "Adicionar"}</button>
          {editando && <button className="btn-ghost" onClick={() => { setEditando(null); setForm(vazio); }}>Cancelar</button>}
        </div>
        {editando ? (() => {
          const atual = lista.find((x) => x.id === editando);
          return atual ? <ServicePhotoEditor key={atual.id} clinicId={clinicId} serviceId={atual.id} imageUrl={atual.image_url} description={atual.description} onSaved={recarregar} /> : null;
        })() : <p className="text-xs text-ink/60">Para adicionar foto e explicação para o paciente, salve o serviço e clique em Editar.</p>}
      </aside>
    </div>
  );
}

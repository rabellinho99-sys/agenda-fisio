"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { keyFromLabel, TIPOS, type Field } from "@/lib/anamnese";

type Tpl = { id: string; name: string; description: string | null; fields: Field[] };
type Svc = { id: string; name: string; anamnesis_template_id: string | null };

export function Anamnese({ clinicId, templates: inicial, services: svcInicial }: { clinicId: string; templates: Tpl[]; services: Svc[] }) {
  const supabase = createClient();
  const [templates, setTemplates] = useState(inicial);
  const [services, setServices] = useState(svcInicial);
  const [sel, setSel] = useState<Tpl | null>(inicial[0] ?? null);
  const [msg, setMsg] = useState<string | null>(null);

  function novo() { setSel({ id: "", name: "Novo modelo", description: "", fields: [] }); }

  function setField(i: number, patch: Partial<Field>) {
    if (!sel) return;
    setSel({ ...sel, fields: sel.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  }
  function mover(i: number, d: number) {
    if (!sel) return;
    const f = [...sel.fields]; const j = i + d;
    if (j < 0 || j >= f.length) return;
    [f[i], f[j]] = [f[j], f[i]]; setSel({ ...sel, fields: f });
  }
  function addField() {
    if (!sel) return;
    setSel({ ...sel, fields: [...sel.fields, { key: `campo_${Date.now().toString(36)}`, label: "", type: "text", section: sel.fields.at(-1)?.section ?? "Geral" }] });
  }

  async function salvar() {
    if (!sel) return;
    setMsg(null);
    const fields = sel.fields.filter((f) => f.label.trim()).map((f) => ({
      ...f, key: f.key.startsWith("campo_") ? keyFromLabel(f.label) + "_" + f.key.slice(-4) : f.key,
      options: f.type === "select" ? (f.options ?? []).filter(Boolean) : undefined,
    }));
    const payload = { clinic_id: clinicId, name: sel.name, description: sel.description || null, fields, updated_at: new Date().toISOString() };
    const q = sel.id
      ? supabase.from("anamnesis_templates").update(payload).eq("id", sel.id).select("id, name, description, fields").single()
      : supabase.from("anamnesis_templates").insert(payload).select("id, name, description, fields").single();
    const { data, error } = await q;
    if (error) return setMsg(error.message);
    const t = data as Tpl;
    setTemplates(sel.id ? templates.map((x) => (x.id === t.id ? t : x)) : [...templates, t]);
    setSel(t); setMsg("Modelo salvo.");
  }

  async function remover() {
    if (!sel?.id || !window.confirm("Desativar este modelo? As respostas já registradas continuam no prontuário.")) return;
    await supabase.from("anamnesis_templates").update({ active: false }).eq("id", sel.id);
    const rest = templates.filter((t) => t.id !== sel.id);
    setTemplates(rest); setSel(rest[0] ?? null);
  }

  async function vincular(svcId: string, tplId: string) {
    await supabase.from("services").update({ anamnesis_template_id: tplId || null, requires_anamnesis: !!tplId }).eq("id", svcId);
    setServices(services.map((s) => (s.id === svcId ? { ...s, anamnesis_template_id: tplId || null } : s)));
  }

  return (
    <div className="grid gap-6 md:grid-cols-[260px_1fr]">
      <aside className="space-y-4">
        <div>
          <h1 className="h-title text-2xl">Anamnese</h1>
          <p className="mt-1 text-sm text-ink/70">Modelos de perguntas por tipo de atendimento.</p>
        </div>
        <div className="space-y-1">
          {templates.map((t) => (
            <button key={t.id} onClick={() => { setSel(t); setMsg(null); }}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${sel?.id === t.id ? "bg-moss text-white" : "bg-white hover:bg-white/70"}`}>
              {t.name} <span className={`text-xs ${sel?.id === t.id ? "text-white/70" : "text-ink/50"}`}>· {t.fields.length}</span>
            </button>
          ))}
          <button className="btn-ghost w-full text-sm" onClick={novo}>Novo modelo</button>
        </div>

        <div className="rounded-xl bg-white p-3">
          <p className="text-sm font-bold">Vínculo por serviço</p>
          <p className="mb-2 text-xs text-ink/60">Qual anamnese cada serviço pede.</p>
          <div className="space-y-2">
            {services.map((s) => (
              <div key={s.id}>
                <p className="text-xs font-semibold">{s.name}</p>
                <select className="field py-1.5 text-sm" value={s.anamnesis_template_id ?? ""} onChange={(e) => vincular(s.id, e.target.value)}>
                  <option value="">Nenhuma</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <section>
        {!sel ? <p className="text-ink/60">Selecione ou crie um modelo.</p> : (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-xl bg-white p-4 sm:grid-cols-2">
              <div><label className="label">Nome do modelo</label><input className="field" value={sel.name} onChange={(e) => setSel({ ...sel, name: e.target.value })} /></div>
              <div><label className="label">Descrição (o paciente vê)</label><input className="field" value={sel.description ?? ""} onChange={(e) => setSel({ ...sel, description: e.target.value })} /></div>
            </div>

            <div className="space-y-2">
              {sel.fields.map((f, i) => (
                <div key={f.key} className="grid gap-2 rounded-xl bg-white p-3 sm:grid-cols-[1fr_150px_130px_auto]">
                  <div className="space-y-2">
                    <input className="field text-sm" placeholder="Pergunta" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} />
                    {f.type === "select" && (
                      <input className="field text-sm" placeholder="Opções separadas por vírgula" value={(f.options ?? []).join(", ")}
                        onChange={(e) => setField(i, { options: e.target.value.split(",").map((s) => s.trim()) })} />
                    )}
                  </div>
                  <select className="field text-sm" value={f.type} onChange={(e) => setField(i, { type: e.target.value as Field["type"] })}>
                    {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input className="field text-sm" placeholder="Seção" value={f.section ?? ""} onChange={(e) => setField(i, { section: e.target.value })} />
                  <div className="flex items-center gap-2 text-sm">
                    <label className="flex items-center gap-1"><input type="checkbox" checked={!!f.required} onChange={(e) => setField(i, { required: e.target.checked })} />obrig.</label>
                    <button className="text-ink/50" onClick={() => mover(i, -1)} aria-label="Subir">↑</button>
                    <button className="text-ink/50" onClick={() => mover(i, 1)} aria-label="Descer">↓</button>
                    <button className="text-danger" onClick={() => setSel({ ...sel, fields: sel.fields.filter((_, j) => j !== i) })}>Remover</button>
                  </div>
                </div>
              ))}
              <button className="btn-ghost w-full" onClick={addField}>Adicionar pergunta</button>
            </div>

            {msg && <p className="rounded-lg bg-white px-3 py-2 text-sm">{msg}</p>}
            <div className="flex gap-2">
              <button className="btn-primary" onClick={salvar} disabled={!sel.name.trim()}>Salvar modelo</button>
              {sel.id && <button className="btn-danger" onClick={remover}>Desativar</button>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

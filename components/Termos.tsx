"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Markdown } from "@/components/Assinar";

type Tpl = { id: string; name: string; body_markdown: string; version: number };
type Svc = { id: string; name: string; consent_template_id: string | null };

const MODELO_VAZIO = `## Termo de Consentimento Livre e Esclarecido
### Nome do procedimento

Eu, {{paciente}}, CPF {{cpf}}, declaro que fui informado por {{profissional}}, na {{clinica}}, sobre o procedimento proposto.

**Do procedimento.** Descreva aqui o que será feito.

**Dos riscos.** Liste os riscos e reações possíveis.

**Da autonomia.** Tive minhas dúvidas respondidas e posso revogar este consentimento a qualquer momento.

Assinado em {{data}}.`;

export function Termos({ clinicId, templates: inicial, services: svcInicial }: { clinicId: string; templates: Tpl[]; services: Svc[] }) {
  const supabase = createClient();
  const [templates, setTemplates] = useState(inicial);
  const [services, setServices] = useState(svcInicial);
  const [sel, setSel] = useState<Tpl | null>(inicial[0] ?? null);
  const [preview, setPreview] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function salvar() {
    if (!sel) return;
    setMsg(null);
    const payload = { clinic_id: clinicId, name: sel.name, body_markdown: sel.body_markdown, updated_at: new Date().toISOString(), ...(sel.id ? { version: sel.version + 1 } : {}) };
    const q = sel.id
      ? supabase.from("consent_templates").update(payload).eq("id", sel.id).select("id, name, body_markdown, version").single()
      : supabase.from("consent_templates").insert(payload).select("id, name, body_markdown, version").single();
    const { data, error } = await q;
    if (error) return setMsg(error.message);
    const t = data as Tpl;
    setTemplates(sel.id ? templates.map((x) => (x.id === t.id ? t : x)) : [...templates, t]);
    setSel(t);
    setMsg(sel.id ? `Salvo como versão ${t.version}. Termos já assinados guardam a versão antiga.` : "Modelo criado.");
  }

  async function vincular(svcId: string, tplId: string) {
    await supabase.from("services").update({ consent_template_id: tplId || null, requires_consent: !!tplId }).eq("id", svcId);
    setServices(services.map((s) => (s.id === svcId ? { ...s, consent_template_id: tplId || null } : s)));
  }

  return (
    <div className="grid gap-6 md:grid-cols-[260px_1fr]">
      <aside className="space-y-4">
        <div>
          <h1 className="h-title text-2xl">Termos de consentimento</h1>
          <p className="mt-1 text-sm text-ink/70">Modelos de TCLE que o paciente assina antes do procedimento.</p>
        </div>
        <div className="space-y-1">
          {templates.map((t) => (
            <button key={t.id} onClick={() => { setSel(t); setMsg(null); setPreview(false); }}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${sel?.id === t.id ? "bg-moss text-white" : "bg-white hover:bg-white/70"}`}>
              {t.name}<span className={`block text-xs font-normal ${sel?.id === t.id ? "text-white/70" : "text-ink/50"}`}>versão {t.version}</span>
            </button>
          ))}
          <button className="btn-ghost w-full text-sm" onClick={() => { setSel({ id: "", name: "Novo termo", body_markdown: MODELO_VAZIO, version: 0 }); setPreview(false); }}>Novo termo</button>
        </div>

        <div className="rounded-xl bg-white p-3">
          <p className="text-sm font-bold">Vínculo por serviço</p>
          <p className="mb-2 text-xs text-ink/60">Qual termo cada procedimento exige.</p>
          <div className="space-y-2">
            {services.map((s) => (
              <div key={s.id}>
                <p className="text-xs font-semibold">{s.name}</p>
                <select className="field py-1.5 text-sm" value={s.consent_template_id ?? ""} onChange={(e) => vincular(s.id, e.target.value)}>
                  <option value="">Nenhum</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white p-3 text-xs text-ink/70">
          <p className="font-bold text-ink">Variáveis</p>
          <p className="mt-1">Use no texto e o sistema substitui na assinatura: {"{{paciente}}"}, {"{{cpf}}"}, {"{{nascimento}}"}, {"{{clinica}}"}, {"{{profissional}}"}, {"{{data}}"}.</p>
        </div>
      </aside>

      <section>
        {!sel ? <p className="text-ink/60">Selecione ou crie um termo.</p> : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex-1"><label className="label">Nome do termo</label><input className="field" value={sel.name} onChange={(e) => setSel({ ...sel, name: e.target.value })} /></div>
              <button className="btn-ghost" onClick={() => setPreview(!preview)}>{preview ? "Editar texto" : "Ver como o paciente vê"}</button>
            </div>

            {preview ? (
              <div className="rounded-xl bg-white p-5"><Markdown texto={sel.body_markdown} /></div>
            ) : (
              <div>
                <label className="label">Texto do termo</label>
                <textarea className="field font-mono text-sm" rows={24} value={sel.body_markdown} onChange={(e) => setSel({ ...sel, body_markdown: e.target.value })} />
                <p className="mt-1 text-xs text-ink/60">Use ## para título, ### para subtítulo e **negrito** para destacar.</p>
              </div>
            )}

            {msg && <p className="rounded-lg bg-white px-3 py-2 text-sm">{msg}</p>}
            <button className="btn-primary" onClick={salvar} disabled={!sel.name.trim() || !sel.body_markdown.trim()}>Salvar termo</button>
          </div>
        )}
      </section>
    </div>
  );
}

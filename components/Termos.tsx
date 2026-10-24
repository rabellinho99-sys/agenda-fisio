"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Markdown } from "@/components/Assinar";

type Tpl = { id: string; name: string; body_markdown: string; version: number };
type Svc = { id: string; name: string; consent_template_id: string | null; consent_on_booking: boolean | null };

const MODELO_VAZIO = `## Termo de Consentimento Livre e Esclarecido (TCLE)

**Paciente:** {{paciente}} | **CPF:** {{cpf}}
**Profissional:** {{profissional}} | **Estabelecimento:** {{clinica}}
**Data:** {{data}}

---

### 1. Do procedimento

Eu, {{paciente}}, declaro que fui informado(a) pelo(a) profissional {{profissional}} sobre o procedimento proposto _(descreva aqui o procedimento)_, seus objetivos, técnicas empregadas, benefícios esperados e alternativas terapêuticas disponíveis, e que tive tempo e oportunidade de esclarecer todas as minhas dúvidas antes de assinar.

### 2. Dos riscos e efeitos esperados

Estou ciente de que todo procedimento fisioterapêutico pode envolver riscos, tais como dor local transitória, hematomas, reação inflamatória ou ausência do resultado esperado. Fui orientado(a) sobre os riscos específicos do procedimento acima descrito e concordo com a realização.

### 3. Das faltas e cancelamentos

3.1 O cancelamento ou remarcação de sessão deve ser comunicado ao profissional com antecedência mínima de **24 horas** por telefone ou mensagem.

3.2 A falta sem comunicação prévia no prazo de 24 horas não gera direito a reposição ou reembolso da sessão, salvo comprovação de caso fortuito ou força maior (art. 393 do Código Civil Brasileiro).

3.3 Em caso de atraso do paciente, a sessão poderá ser encerrada no horário originalmente previsto, sem reposição do tempo perdido, a fim de preservar os demais agendamentos.

3.4 Três faltas consecutivas sem justificativa poderão ser interpretadas como abandono de tratamento, conforme cláusula 4 abaixo.

### 4. Do abandono de tratamento

4.1 O paciente tem o direito de interromper o tratamento a qualquer momento, no exercício de sua autonomia, nos termos do art. 5.º, III, da Constituição Federal e da Resolução COFFITO n.º 10/1978.

4.2 A interrupção não justificada do tratamento isenta o profissional de responsabilidade por resultados incompletos ou por agravamento de condição preexistente, uma vez que o plano terapêutico não pôde ser integralmente executado.

4.3 Em caso de abandono, eventuais créditos de sessões em pacote poderão ser utilizados no prazo de **90 dias** a contar da última sessão realizada, após o qual os créditos caducam sem direito a reembolso.

### 5. Do reembolso

5.1 Contratações realizadas à distância (por aplicativo, link digital ou telefone) garantem ao paciente o direito de arrependimento no prazo de **7 dias corridos** a contar da data da contratação, com reembolso integral dos valores pagos, conforme art. 49 do Código de Defesa do Consumidor (Lei n.º 8.078/1990).

5.2 Sessões já realizadas não são passíveis de reembolso, salvo comprovação de erro ou negligência do profissional devidamente apurada.

5.3 Pacotes de sessões pré-pagos são reembolsáveis de forma proporcional ao número de sessões ainda não realizadas, descontando-se eventuais descontos concedidos em razão da contratação do pacote (art. 51 do CDC veda cláusulas que impossibilitem o reembolso proporcional).

5.4 O reembolso, quando devido, será realizado em até **30 dias corridos** após solicitação formal do paciente.

### 6. Da autonomia e revogação do consentimento

O paciente poderá revogar este consentimento a qualquer momento, antes ou durante o tratamento, sem qualquer penalidade, bastando comunicar ao profissional. A revogação não retroage a sessões já realizadas.

### 7. Do sigilo e proteção de dados (LGPD)

As informações coletadas neste termo são tratadas com estrito sigilo profissional e utilizadas exclusivamente para fins de registro clínico, conforme a Lei Geral de Proteção de Dados Pessoais (Lei n.º 13.709/2018) e o Código de Ética do Fisioterapeuta (Resolução COFFITO n.º 424/2013).

---

**Declaro** que li e compreendi todas as cláusulas deste termo, que tive minhas dúvidas esclarecidas, e que consinto, de forma livre e esclarecida, com a realização do procedimento proposto.

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
    setMsg(sel.id ? `Salvo como versão ${t.version}. Termos já assinados guardam a versão antiga e o paciente não precisa assinar de novo.` : "Modelo criado.");
  }

  async function vincular(svcId: string, tplId: string) {
    await supabase.from("services").update({ consent_template_id: tplId || null, requires_consent: !!tplId }).eq("id", svcId);
    setServices(services.map((s) => (s.id === svcId ? { ...s, consent_template_id: tplId || null, consent_on_booking: tplId ? s.consent_on_booking : false } : s)));
    if (!tplId) await supabase.from("services").update({ consent_on_booking: false }).eq("id", svcId);
  }

  async function pedirNoLink(svcId: string, valor: boolean) {
    setServices(services.map((s) => (s.id === svcId ? { ...s, consent_on_booking: valor } : s)));
    const { error } = await supabase.from("services").update({ consent_on_booking: valor }).eq("id", svcId);
    if (error) {
      setServices(services.map((s) => (s.id === svcId ? { ...s, consent_on_booking: !valor } : s)));
      setMsg(error.message);
    }
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
          <p className="mb-2 text-xs text-ink/60">Qual termo cada procedimento usa. O termo só aparece no link de agendamento se você marcar a opção abaixo do serviço. Sem marcar, envie pelo prontuário do paciente quando quiser.</p>
          <div className="space-y-2">
            {services.map((s) => (
              <div key={s.id}>
                <p className="text-xs font-semibold">{s.name}</p>
                <select className="field py-1.5 text-sm" value={s.consent_template_id ?? ""} onChange={(e) => vincular(s.id, e.target.value)}>
                  <option value="">Nenhum</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {s.consent_template_id && (
                  <label className="mt-1 flex items-start gap-2 text-xs text-ink/80">
                    <input type="checkbox" className="mt-0.5" checked={!!s.consent_on_booking} onChange={(e) => pedirNoLink(s.id, e.target.checked)} />
                    <span>Pedir assinatura no link de agendamento (quem já assinou não assina de novo)</span>
                  </label>
                )}
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

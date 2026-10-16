"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtTime } from "@/lib/format";
import { idade } from "@/components/Pacientes";
import { FormAnamnese } from "@/components/FormAnamnese";
import { agrupar, faltando, fmtResposta, type Answers, type Field } from "@/lib/anamnese";
import { Consentimentos, type ConsentDoc, type ConsentReq, type ConsentTpl } from "@/components/Consentimentos";
import { PacotesPaciente, type Pkg, type PatientPkg } from "@/components/PacotesPaciente";
import { ImagensDiagnosticas, type PatientImage } from "@/components/ImagensDiagnosticas";

type Patient = { id: string; clinic_id: string; full_name: string; phone: string; birth_date: string | null; cpf: string | null; notes: string | null; tags: string[] | null };
type Proc = { name: string; site: string; volume_ml: string; lot: string };
type Note = {
  id: string; appointment_id: string | null; professional_id: string | null; subjective: string | null; objective: string | null;
  assessment: string | null; plan: string | null; procedures: Proc[]; pain_before: number | null; pain_after: number | null;
  addendum: string | null; created_at: string; locked_at: string | null;
  professionals: { display_name: string } | null;
  appointments: { starts_at: string; services: { name: string } | null } | null;
};
type Appt = { id: string; starts_at: string; status: string; services: { name: string } | null };
type Prof = { id: string; display_name: string; user_id: string | null };
type Tpl = { id: string; name: string; fields: Field[] };
type Resp = { id: string; template_name: string; fields_snapshot: Field[]; answers: Answers; filled_by: string; created_at: string };
type Req = { id: string; token: string; template_id: string; expires_at: string; filled_at: string | null };

const vazio = { appointment_id: "", subjective: "", objective: "", assessment: "", plan: "", pain_before: "", pain_after: "", procedures: [] as Proc[] };

export function Prontuario({ patient, notes: inicial, appts, professionals, meuProfissional, apptInicial, tz, templates, anamneses: anInicial, requests: reqInicial, consentTemplates, consents, consentRequests, catalogo, pacotes, servicos, imagens }: {
  patient: Patient; notes: Note[]; appts: Appt[]; professionals: Prof[]; meuProfissional: string | null; apptInicial: string | null; tz: string;
  templates: Tpl[]; anamneses: Resp[]; requests: Req[];
  consentTemplates: ConsentTpl[]; consents: ConsentDoc[]; consentRequests: ConsentReq[];
  catalogo: Pkg[]; pacotes: PatientPkg[]; servicos: { id: string; name: string }[];
  imagens: PatientImage[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [notes, setNotes] = useState(inicial);
  const [editando, setEditando] = useState(!!apptInicial);
  const [form, setForm] = useState({ ...vazio, appointment_id: apptInicial ?? "" });
  const [prof, setProf] = useState(meuProfissional ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [editandoNota, setEditandoNota] = useState<string | null>(null); // id da evolução em correção
  const [editPac, setEditPac] = useState(false);
  const [pac, setPac] = useState({ full_name: patient.full_name, phone: patient.phone, birth_date: patient.birth_date ?? "", cpf: patient.cpf ?? "", notes: patient.notes ?? "" });
  const [adenda, setAdenda] = useState<Record<string, string>>({});
  const [anamneses, setAnamneses] = useState(anInicial);
  const [requests, setRequests] = useState(reqInicial);
  const [modoAn, setModoAn] = useState<"none" | "fill" | "link">("none");
  const [tplId, setTplId] = useState(templates[0]?.id ?? "");
  const [respostas, setRespostas] = useState<Answers>({});
  const [aberta, setAberta] = useState<string | null>(null);
  const [linkGerado, setLinkGerado] = useState<string | null>(null);

  const tpl = templates.find((t) => t.id === tplId) ?? null;

  async function salvarAnamnese() {
    if (!tpl) return;
    const f = faltando(tpl.fields, respostas);
    if (f.length) return setErro(`Faltam campos obrigatórios: ${f.slice(0, 3).join(", ")}.`);
    setErro(null); setSalvando(true);
    const { data, error } = await supabase.from("anamnesis_responses").insert({
      clinic_id: patient.clinic_id, patient_id: patient.id, template_id: tpl.id, template_name: tpl.name,
      fields_snapshot: tpl.fields, answers: respostas, filled_by: "professional",
    }).select("id, template_name, fields_snapshot, answers, filled_by, created_at").single();
    setSalvando(false);
    if (error) return setErro(error.message);
    setAnamneses([data as Resp, ...anamneses]); setRespostas({}); setModoAn("none");
  }

  async function gerarLink() {
    if (!tpl) return;
    setErro(null);
    const existente = requests.find((r) => r.template_id === tpl.id);
    let token = existente?.token;
    if (!token) {
      const { data, error } = await supabase.from("anamnesis_requests").insert({ clinic_id: patient.clinic_id, patient_id: patient.id, template_id: tpl.id })
        .select("id, token, template_id, expires_at, filled_at").single();
      if (error) return setErro(error.message);
      setRequests([data as Req, ...requests]); token = (data as Req).token;
    }
    setLinkGerado(`${location.origin}/anamnese/${token}`);
  }

  const dor = [...notes].reverse().flatMap((n) => [
    ...(n.pain_before != null ? [{ x: n.created_at, y: n.pain_before, m: "antes" }] : []),
    ...(n.pain_after != null ? [{ x: n.created_at, y: n.pain_after, m: "depois" }] : []),
  ]);

  // Evolução pode ser corrigida nas primeiras 24h (depois trava e só aceita adenda)
  function podeEditar(n: Note) {
    return !n.locked_at && Date.now() - new Date(n.created_at).getTime() < 24 * 60 * 60 * 1000;
  }

  function editarNota(n: Note) {
    setErro(null);
    setEditandoNota(n.id);
    setProf(n.professional_id ?? prof);
    setForm({
      appointment_id: n.appointment_id ?? "",
      subjective: n.subjective ?? "", objective: n.objective ?? "", assessment: n.assessment ?? "", plan: n.plan ?? "",
      pain_before: n.pain_before == null ? "" : String(n.pain_before),
      pain_after: n.pain_after == null ? "" : String(n.pain_after),
      procedures: (n.procedures ?? []).map((p) => ({ name: p.name ?? "", site: p.site ?? "", volume_ml: p.volume_ml ?? "", lot: p.lot ?? "" })),
    });
    setEditando(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function fecharForm() {
    setEditando(false);
    setEditandoNota(null);
    setForm(vazio);
  }

  async function salvarNota() {
    setErro(null); setSalvando(true);
    const payload = {
      clinic_id: patient.clinic_id, patient_id: patient.id,
      appointment_id: form.appointment_id || null, professional_id: prof || null,
      subjective: form.subjective || null, objective: form.objective || null, assessment: form.assessment || null, plan: form.plan || null,
      pain_before: form.pain_before === "" ? null : Number(form.pain_before),
      pain_after: form.pain_after === "" ? null : Number(form.pain_after),
      procedures: form.procedures.filter((p) => p.name),
    };
    // Correção de uma evolução já salva
    if (editandoNota) {
      const { clinic_id: _c, patient_id: _p, ...alteracoes } = payload;
      void _c; void _p;
      const { data, error } = await supabase.from("clinical_notes").update(alteracoes).eq("id", editandoNota)
        .select("*, professionals(display_name), appointments(starts_at, services(name))").single();
      setSalvando(false);
      if (error) {
        return setErro(error.message.includes("24h")
          ? "Esta evolução já passou de 24 horas e está travada. Use a adenda para complementar."
          : error.message);
      }
      setNotes(notes.map((n) => (n.id === editandoNota ? (data as Note) : n)));
      fecharForm();
      router.refresh();
      return;
    }

    const { data, error } = await supabase.from("clinical_notes").insert(payload)
      .select("*, professionals(display_name), appointments(starts_at, services(name))").single();
    setSalvando(false);
    if (error) return setErro(error.message);
    setNotes([data as Note, ...notes]);
    setForm(vazio); setEditando(false);
    if (form.appointment_id) {
      await supabase.from("appointments").update({ status: "completed" }).eq("id", form.appointment_id).in("status", ["confirmed", "checked_in", "pending"]);
    }
    router.refresh();
  }

  async function salvarPac() {
    const { error } = await supabase.from("patients").update({
      full_name: pac.full_name, phone: pac.phone.replace(/\D/g, ""), birth_date: pac.birth_date || null, cpf: pac.cpf.replace(/\D/g, "") || null, notes: pac.notes || null,
    }).eq("id", patient.id);
    if (error) return setErro(error.message);
    setEditPac(false); router.refresh();
  }

  async function salvarAdenda(id: string) {
    const texto = adenda[id];
    if (!texto) return;
    const { error } = await supabase.from("clinical_notes").update({ addendum: texto }).eq("id", id);
    if (error) return setErro(error.message);
    setNotes(notes.map((n) => (n.id === id ? { ...n, addendum: texto } : n)));
    setAdenda({ ...adenda, [id]: "" });
  }

  function setProc(i: number, k: keyof Proc, v: string) {
    setForm({ ...form, procedures: form.procedures.map((p, j) => (j === i ? { ...p, [k]: v } : p)) });
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_380px]">
      <section>
        <Link href="/painel/pacientes" className="text-sm text-ink/60 underline underline-offset-4">Pacientes</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="h-title text-3xl">{patient.full_name}</h1>
            <p className="mt-1 text-ink/70">{patient.phone}{patient.birth_date ? ` · ${idade(patient.birth_date)} anos` : ""}{patient.cpf ? ` · CPF ${patient.cpf}` : ""}</p>
            {patient.notes && <p className="mt-1 text-sm text-ink/60">{patient.notes}</p>}
          </div>
          <button className="btn-ghost text-sm" onClick={() => setEditPac(!editPac)}>{editPac ? "Fechar" : "Editar dados"}</button>
        </div>

        {editPac && (
          <div className="mt-4 grid gap-3 rounded-xl bg-white p-4 sm:grid-cols-2">
            <div><label className="label">Nome</label><input className="field" value={pac.full_name} onChange={(e) => setPac({ ...pac, full_name: e.target.value })} /></div>
            <div><label className="label">WhatsApp</label><input className="field" value={pac.phone} onChange={(e) => setPac({ ...pac, phone: e.target.value })} /></div>
            <div><label className="label">Nascimento</label><input type="date" className="field" value={pac.birth_date} onChange={(e) => setPac({ ...pac, birth_date: e.target.value })} /></div>
            <div><label className="label">CPF</label><input className="field" value={pac.cpf} onChange={(e) => setPac({ ...pac, cpf: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className="label">Observações gerais</label><textarea className="field" rows={2} value={pac.notes} onChange={(e) => setPac({ ...pac, notes: e.target.value })} /></div>
            <button className="btn-primary sm:col-span-2" onClick={salvarPac}>Salvar dados</button>
          </div>
        )}

        {dor.length > 1 && (
          <div className="mt-6 rounded-xl bg-white p-4">
            <p className="text-sm font-semibold">Dor (EVA) ao longo das sessões</p>
            <GraficoDor pontos={dor} />
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
          <h2 className="h-title text-xl">Anamnese</h2>
          {templates.length > 0 && (
            <div className="flex gap-2">
              <button className="btn-ghost text-sm" onClick={() => { setModoAn(modoAn === "fill" ? "none" : "fill"); setLinkGerado(null); }}>Preencher agora</button>
              <button className="btn-ghost text-sm" onClick={() => { setModoAn(modoAn === "link" ? "none" : "link"); setLinkGerado(null); }}>Enviar link ao paciente</button>
            </div>
          )}
        </div>
        {templates.length === 0 && <p className="mt-2 text-sm text-ink/60">Crie um modelo em Anamnese para usar aqui.</p>}

        {modoAn !== "none" && tpl && (
          <div className="mt-3 rounded-xl bg-white p-4">
            {templates.length > 1 && (
              <div className="mb-4"><label className="label">Modelo</label>
                <select className="field" value={tplId} onChange={(e) => { setTplId(e.target.value); setRespostas({}); setLinkGerado(null); }}>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            {modoAn === "fill" && (
              <>
                <FormAnamnese fields={tpl.fields} answers={respostas} onChange={setRespostas} />
                {erro && <p className="mt-3 rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
                <div className="mt-4 flex gap-2">
                  <button className="btn-primary" onClick={salvarAnamnese} disabled={salvando}>Salvar anamnese</button>
                  <button className="btn-ghost" onClick={() => setModoAn("none")}>Fechar</button>
                </div>
              </>
            )}
            {modoAn === "link" && (
              <>
                <p className="text-sm text-ink/70">O paciente responde pelo celular antes da consulta. O link vale 14 dias e só pode ser respondido uma vez.</p>
                {!linkGerado ? (
                  <button className="btn-primary mt-3" onClick={gerarLink}>Gerar link</button>
                ) : (
                  <div className="mt-3 space-y-2">
                    <input className="field text-sm" readOnly value={linkGerado} onFocus={(e) => e.target.select()} />
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-ghost text-sm" onClick={() => navigator.clipboard.writeText(linkGerado)}>Copiar</button>
                      <a className="btn-primary text-sm" target="_blank"
                        href={`https://wa.me/55${patient.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${patient.full_name.split(" ")[0]}, para agilizar sua consulta, responda esta ficha antes de vir: ${linkGerado}`)}`}>
                        Enviar pelo WhatsApp
                      </a>
                    </div>
                  </div>
                )}
                {erro && <p className="mt-3 rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
              </>
            )}
          </div>
        )}

        <div className="mt-3 space-y-2">
          {requests.length > 0 && anamneses.length === 0 && <p className="text-sm text-ink/60">Link enviado, aguardando resposta do paciente.</p>}
          {anamneses.map((r) => (
            <article key={r.id} className="rounded-xl bg-white p-4">
              <button className="flex w-full items-baseline justify-between gap-2 text-left" onClick={() => setAberta(aberta === r.id ? null : r.id)}>
                <p className="font-bold">{r.template_name}</p>
                <p className="text-xs text-ink/60">{new Date(r.created_at).toLocaleDateString("pt-BR", { timeZone: tz })} · {r.filled_by === "patient" ? "respondida pelo paciente" : "preenchida no consultório"} · {aberta === r.id ? "recolher" : "ver"}</p>
              </button>
              {aberta === r.id && (
                <div className="mt-3 space-y-4 text-sm">
                  {agrupar(r.fields_snapshot).map((sec) => (
                    <div key={sec.nome}>
                      <p className="font-semibold text-moss-deep">{sec.nome}</p>
                      <dl className="mt-1 grid gap-1 sm:grid-cols-2">
                        {sec.campos.map((f) => { const v = fmtResposta(f, r.answers[f.key]); return v == null ? null : (
                          <div key={f.key}><dt className="text-ink/60">{f.label}</dt><dd className="whitespace-pre-wrap">{v}</dd></div>
                        ); })}
                      </dl>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>

        <PacotesPaciente
          clinicId={patient.clinic_id} patientId={patient.id}
          catalogo={catalogo} services={servicos} vendidos={pacotes}
        />

        <Consentimentos
          clinicId={patient.clinic_id} patientId={patient.id} patientName={patient.full_name}
          patientPhone={patient.phone} patientCpf={patient.cpf}
          professionalName={professionals.find((p) => p.id === prof)?.display_name ?? null}
          templates={consentTemplates} docs={consents} requests={consentRequests} tz={tz}
        />

        <ImagensDiagnosticas
          clinicId={patient.clinic_id} patientId={patient.id}
          imagens={imagens} tz={tz}
        />

        <h2 className="h-title mt-8 text-xl">Evoluções</h2>
        <div className="mt-3 space-y-3">
          {notes.length === 0 && (
            <div className="rounded-xl border border-dashed border-mist p-8 text-center">
              <p className="font-semibold">Nenhuma evolução registrada</p>
              <p className="mt-1 text-sm text-ink/60">Registre a primeira pelo painel ao lado.</p>
            </div>
          )}
          {notes.map((n) => (
            <article key={n.id} className="rounded-xl bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold">{new Date(n.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: tz })} · {fmtTime(n.created_at, tz)}</p>
                <p className="text-xs text-ink/60">{n.professionals?.display_name}{n.appointments?.services?.name ? ` · ${n.appointments.services.name}` : ""}{n.locked_at ? " · travada" : ""}</p>
              </div>
              {(n.pain_before != null || n.pain_after != null) && (
                <p className="mt-1 text-sm">EVA {n.pain_before ?? "-"} → {n.pain_after ?? "-"}</p>
              )}
              {podeEditar(n) && (
                <button className="mt-2 text-sm font-semibold text-moss underline underline-offset-4" onClick={() => editarNota(n)}>
                  {editandoNota === n.id ? "Editando ao lado" : "Editar evolução"}
                </button>
              )}
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <Campo l="S" v={n.subjective} /><Campo l="O" v={n.objective} /><Campo l="A" v={n.assessment} /><Campo l="P" v={n.plan} />
              </dl>
              {n.procedures?.length > 0 && (
                <div className="mt-3 text-sm">
                  <p className="font-semibold">Procedimentos</p>
                  <ul className="mt-1 space-y-0.5 text-ink/80">
                    {n.procedures.map((p, i) => <li key={i}>{p.name}{p.site ? `, ${p.site}` : ""}{p.volume_ml ? `, ${p.volume_ml} ml` : ""}{p.lot ? `, lote ${p.lot}` : ""}</li>)}
                  </ul>
                </div>
              )}
              {n.addendum && <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-sm"><span className="font-semibold">Adenda:</span> {n.addendum}</p>}
              {n.locked_at && !n.addendum && (
                <div className="mt-3 flex gap-2">
                  <input className="field text-sm" placeholder="Adicionar adenda" value={adenda[n.id] ?? ""} onChange={(e) => setAdenda({ ...adenda, [n.id]: e.target.value })} />
                  <button className="btn-ghost text-sm" onClick={() => salvarAdenda(n.id)}>Salvar</button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <aside>
        {!editando ? (
          <button className="btn-primary w-full" onClick={() => setEditando(true)}>Nova evolução</button>
        ) : (
          <div className="space-y-3 rounded-xl bg-white p-4">
            <p className="font-bold">{editandoNota ? "Corrigir evolução" : "Nova evolução"}</p>
            {editandoNota && (
              <p className="rounded-lg bg-amber/15 px-3 py-2 text-xs">
                A alteração fica registrada no histórico do prontuário. Depois de 24h do registro, só é possível acrescentar adenda.
              </p>
            )}
            <div><label className="label">Atendimento</label>
              <select className="field" value={form.appointment_id} onChange={(e) => setForm({ ...form, appointment_id: e.target.value })}>
                <option value="">Sem vínculo</option>
                {appts.map((a) => <option key={a.id} value={a.id}>{new Date(a.starts_at).toLocaleDateString("pt-BR", { timeZone: tz })} {fmtTime(a.starts_at, tz)} · {a.services?.name}</option>)}
              </select>
            </div>
            {professionals.length > 1 && (
              <div><label className="label">Profissional</label>
                <select className="field" value={prof} onChange={(e) => setProf(e.target.value)}>
                  {professionals.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div><label className="label">EVA antes (0 a 10)</label><input type="number" min={0} max={10} className="field" value={form.pain_before} onChange={(e) => setForm({ ...form, pain_before: e.target.value })} /></div>
              <div><label className="label">EVA depois</label><input type="number" min={0} max={10} className="field" value={form.pain_after} onChange={(e) => setForm({ ...form, pain_after: e.target.value })} /></div>
            </div>
            <div><label className="label">S · Subjetivo</label><textarea className="field" rows={2} value={form.subjective} onChange={(e) => setForm({ ...form, subjective: e.target.value })} placeholder="Queixa, relato do paciente" /></div>
            <div><label className="label">O · Objetivo</label><textarea className="field" rows={2} value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Exame físico, ADM, testes" /></div>
            <div><label className="label">A · Avaliação</label><textarea className="field" rows={2} value={form.assessment} onChange={(e) => setForm({ ...form, assessment: e.target.value })} placeholder="Raciocínio clínico, hipótese" /></div>
            <div><label className="label">P · Plano</label><textarea className="field" rows={2} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} placeholder="Conduta, orientações, próxima sessão" /></div>

            <div>
              <div className="flex items-center justify-between">
                <label className="label mb-0">Procedimentos</label>
                <button className="text-sm text-moss underline underline-offset-4" onClick={() => setForm({ ...form, procedures: [...form.procedures, { name: "", site: "", volume_ml: "", lot: "" }] })}>Adicionar</button>
              </div>
              {form.procedures.map((p, i) => (
                <div key={i} className="mt-2 grid grid-cols-2 gap-1 rounded-lg border border-mist p-2">
                  <input className="field col-span-2 text-sm" placeholder="Procedimento (PRP, ozônio, mesoterapia)" value={p.name} onChange={(e) => setProc(i, "name", e.target.value)} />
                  <input className="field text-sm" placeholder="Local (joelho D)" value={p.site} onChange={(e) => setProc(i, "site", e.target.value)} />
                  <input className="field text-sm" placeholder="Volume ml" value={p.volume_ml} onChange={(e) => setProc(i, "volume_ml", e.target.value)} />
                  <input className="field col-span-2 text-sm" placeholder="Lote / validade do insumo" value={p.lot} onChange={(e) => setProc(i, "lot", e.target.value)} />
                </div>
              ))}
            </div>

            {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={salvarNota} disabled={salvando || (!form.subjective && !form.objective && !form.assessment && !form.plan && form.procedures.length === 0)}>
                {salvando ? "Salvando" : editandoNota ? "Salvar correção" : "Salvar evolução"}
              </button>
              <button className="btn-ghost" onClick={fecharForm}>Fechar</button>
            </div>
            <p className="text-xs text-ink/60">Salvar com atendimento vinculado marca a sessão como Realizada. Após 24h a evolução trava e só aceita adenda.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

function Campo({ l, v }: { l: string; v: string | null }) {
  if (!v) return null;
  return <div><dt className="font-semibold text-moss-deep">{l}</dt><dd className="whitespace-pre-wrap text-ink/80">{v}</dd></div>;
}

function GraficoDor({ pontos }: { pontos: { x: string; y: number; m: string }[] }) {
  const w = 600, h = 160, pad = 24;
  const xs = pontos.map((_, i) => pad + (i * (w - 2 * pad)) / Math.max(1, pontos.length - 1));
  const ys = pontos.map((p) => h - pad - (p.y * (h - 2 * pad)) / 10);
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 w-full" role="img" aria-label="Evolução da dor">
      {[0, 5, 10].map((v) => {
        const y = h - pad - (v * (h - 2 * pad)) / 10;
        return <g key={v}><line x1={pad} x2={w - pad} y1={y} y2={y} stroke="#d3ddd8" /><text x={4} y={y + 4} fontSize="10" fill="#10221d99">{v}</text></g>;
      })}
      <path d={path} fill="none" stroke="#14584c" strokeWidth="2.5" strokeLinejoin="round" />
      {xs.map((x, i) => <circle key={i} cx={x} cy={ys[i]} r="4" fill={pontos[i].m === "antes" ? "#d99a2b" : "#14584c"} />)}
    </svg>
  );
}

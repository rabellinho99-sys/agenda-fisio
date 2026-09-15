"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Assinar, Markdown } from "@/components/Assinar";
import { fmtCPF, fmtTime } from "@/lib/format";

export type ConsentTpl = { id: string; name: string };
export type ConsentDoc = {
  id: string; template_name: string; template_version: number; body_rendered: string; signer_name: string;
  signer_cpf: string | null; signature_svg: string | null; signed_at: string; document_hash: string;
  revoked_at: string | null; revoke_reason: string | null;
};
export type ConsentReq = { id: string; token: string; template_id: string; expires_at: string; signed_at: string | null };

export function Consentimentos({ clinicId, patientId, patientName, patientPhone, patientCpf, professionalName, templates, docs: docsIniciais, requests: reqIniciais, tz }: {
  clinicId: string; patientId: string; patientName: string; patientPhone: string; patientCpf: string | null;
  professionalName: string | null; templates: ConsentTpl[]; docs: ConsentDoc[]; requests: ConsentReq[]; tz: string;
}) {
  const supabase = createClient();
  const [docs, setDocs] = useState(docsIniciais);
  const [requests, setRequests] = useState(reqIniciais);
  const [modo, setModo] = useState<"none" | "sign" | "link">("none");
  const [tplId, setTplId] = useState(templates[0]?.id ?? "");
  const [corpo, setCorpo] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [nome, setNome] = useState(patientName);
  const [cpf, setCpf] = useState(patientCpf ? fmtCPF(patientCpf) : "");
  const [li, setLi] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  async function abrirAssinatura(cpfAtual = cpf) {
    setModo("sign"); setErro(null); setLink(null);
    const { data, error } = await supabase.rpc("render_consent_preview", {
      p_template: tplId, p_patient: patientId, p_professional: professionalName, p_cpf: cpfAtual || null,
    });
    if (error) return setErro(error.message);
    setCorpo((data as string) ?? null);
  }

  async function assinar() {
    setErro(null); setSalvando(true);
    const { data, error } = await supabase.rpc("sign_consent_inhouse", {
      p_clinic: clinicId, p_patient: patientId, p_template: tplId, p_signer_name: nome,
      p_signature_svg: svg, p_professional: professionalName, p_signer_cpf: cpf.replace(/\D/g, "") || null,
    });
    if (error) { setSalvando(false); return setErro(error.message); }
    const { data: novo } = await supabase.from("consents")
      .select("id, template_name, template_version, body_rendered, signer_name, signer_cpf, signature_svg, signed_at, document_hash, revoked_at, revoke_reason")
      .eq("id", data as string).single();
    setSalvando(false);
    if (novo) setDocs([novo as ConsentDoc, ...docs]);
    setModo("none"); setCorpo(null); setSvg(null); setLi(false);
  }

  async function gerarLink() {
    setErro(null);
    const existente = requests.find((r) => r.template_id === tplId && !r.signed_at);
    let token = existente?.token;
    if (!token) {
      const { data, error } = await supabase.from("consent_requests").insert({ clinic_id: clinicId, patient_id: patientId, template_id: tplId })
        .select("id, token, template_id, expires_at, signed_at").single();
      if (error) return setErro(error.message);
      setRequests([data as ConsentReq, ...requests]); token = (data as ConsentReq).token;
    }
    setLink(`${location.origin}/termo/${token}`);
  }

  async function revogar(id: string) {
    const motivo = window.prompt("Motivo da revogação (fica registrado no prontuário):");
    if (!motivo) return;
    const { error } = await supabase.from("consents").update({ revoked_at: new Date().toISOString(), revoke_reason: motivo }).eq("id", id);
    if (error) return setErro(error.message);
    setDocs(docs.map((d) => (d.id === id ? { ...d, revoked_at: new Date().toISOString(), revoke_reason: motivo } : d)));
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="h-title text-xl">Termos de consentimento</h2>
        {templates.length > 0 && (
          <div className="flex gap-2">
            <button className="btn-ghost text-sm" onClick={() => { if (modo === "sign") setModo("none"); else abrirAssinatura(); }}>Assinar aqui</button>
            <button className="btn-ghost text-sm" onClick={() => { setModo(modo === "link" ? "none" : "link"); setLink(null); }}>Enviar link</button>
          </div>
        )}
      </div>
      {templates.length === 0 && <p className="mt-2 text-sm text-ink/60">Crie um modelo em Termos para usar aqui.</p>}

      {modo !== "none" && (
        <div className="mt-3 space-y-4 rounded-xl bg-white p-4">
          {templates.length > 1 && (
            <div><label className="label">Termo</label>
              <select className="field" value={tplId} onChange={(e) => { setTplId(e.target.value); setLink(null); if (modo === "sign") setCorpo(null); }}>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {modo === "sign" && !corpo && <button className="btn-ghost mt-2 text-sm" onClick={() => abrirAssinatura()}>Carregar texto</button>}
            </div>
          )}

          {modo === "sign" && corpo && (
            <>
              <div className="max-h-80 overflow-y-auto rounded-lg border border-mist p-4"><Markdown texto={corpo} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label">Nome de quem assina</label><input className="field" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
                <div><label className="label">CPF</label>
                  <input className="field" inputMode="numeric" value={cpf} placeholder="000.000.000-00"
                    onChange={(e) => setCpf(fmtCPF(e.target.value))}
                    onBlur={() => { if (cpf.replace(/\D/g, "").length === 11) abrirAssinatura(cpf); }} />
                  <p className="mt-1 text-xs text-ink/60">O CPF entra no texto do termo ao sair deste campo.</p>
                </div>
              </div>
              <div><label className="label">Assinatura do paciente</label><Assinar onChange={setSvg} /></div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={li} onChange={(e) => setLi(e.target.checked)} />
                <span>O paciente leu o termo, teve as dúvidas respondidas e concorda com o procedimento.</span>
              </label>
              {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
              <div className="flex gap-2">
                <button className="btn-primary" onClick={assinar} disabled={salvando || !li || !svg || nome.trim().length < 3}>Registrar assinatura</button>
                <button className="btn-ghost" onClick={() => setModo("none")}>Fechar</button>
              </div>
            </>
          )}

          {modo === "link" && (
            <>
              <p className="text-sm text-ink/70">O paciente lê e assina pelo celular antes de chegar. O link vale 14 dias.</p>
              {!link ? <button className="btn-primary" onClick={gerarLink}>Gerar link</button> : (
                <div className="space-y-2">
                  <input className="field text-sm" readOnly value={link} onFocus={(e) => e.target.select()} />
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-ghost text-sm" onClick={() => navigator.clipboard.writeText(link)}>Copiar</button>
                    <a className="btn-primary text-sm" target="_blank"
                      href={`https://wa.me/55${patientPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${patientName.split(" ")[0]}, antes do seu procedimento, leia e assine este termo: ${link}`)}`}>
                      Enviar pelo WhatsApp
                    </a>
                  </div>
                </div>
              )}
              {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
            </>
          )}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {requests.some((r) => !r.signed_at) && docs.length === 0 && <p className="text-sm text-ink/60">Link enviado, aguardando assinatura.</p>}
        {docs.map((d) => (
          <article key={d.id} className={`rounded-xl bg-white p-4 ${d.revoked_at ? "opacity-70" : ""}`}>
            <button className="flex w-full items-baseline justify-between gap-2 text-left" onClick={() => setAberto(aberto === d.id ? null : d.id)}>
              <p className="font-bold">{d.template_name} {d.revoked_at && <span className="ml-1 rounded bg-blush px-1.5 py-0.5 text-xs text-danger">revogado</span>}</p>
              <p className="text-xs text-ink/60">{new Date(d.signed_at).toLocaleDateString("pt-BR", { timeZone: tz })} {fmtTime(d.signed_at, tz)} · v{d.template_version} · {aberto === d.id ? "recolher" : "ver"}</p>
            </button>
            {aberto === d.id && (
              <div className="mt-3">
                <div className="max-h-96 overflow-y-auto rounded-lg border border-mist p-4"><Markdown texto={d.body_rendered} /></div>
                <div className="mt-3 rounded-lg bg-paper p-3">
                  <p className="text-xs text-ink/60">Assinatura</p>
                  {d.signature_svg && <div className="mt-1 max-w-xs" dangerouslySetInnerHTML={{ __html: d.signature_svg }} />}
                  <p className="mt-1 text-sm font-semibold">{d.signer_name}{d.signer_cpf ? ` · CPF ${fmtCPF(d.signer_cpf)}` : ""}</p>
                  <p className="mt-1 break-all text-xs text-ink/50">Código de verificação: {d.document_hash.slice(0, 32)}</p>
                </div>
                {d.revoked_at ? (
                  <p className="mt-3 rounded-lg bg-blush px-3 py-2 text-sm text-danger">Revogado em {new Date(d.revoked_at).toLocaleDateString("pt-BR")}: {d.revoke_reason}</p>
                ) : (
                  <button className="btn-danger mt-3 text-sm" onClick={() => revogar(d.id)}>Registrar revogação</button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  );
}

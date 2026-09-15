"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Assinar, Markdown } from "@/components/Assinar";
import { fmtCPF } from "@/lib/format";

type Req = { clinic_name: string; patient_name: string; template_name: string; body: string; signed: boolean; expired: boolean };

export function TermoPublico({ token, req }: { token: string; req: Req }) {
  const supabase = createClient();
  const [nome, setNome] = useState(req.patient_name);
  const [cpf, setCpf] = useState("");
  const [svg, setSvg] = useState<string | null>(null);
  const [li, setLi] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(req.signed);

  async function assinar() {
    setErro(null); setEnviando(true);
    const { error } = await supabase.rpc("sign_consent", {
      p_token: token, p_signer_name: nome, p_signer_cpf: cpf.replace(/\D/g, "") || null,
      p_signature_svg: svg, p_user_agent: navigator.userAgent.slice(0, 300),
    });
    setEnviando(false);
    if (error) return setErro(error.message.includes("expirado") ? "Este link expirou. Peça um novo à clínica." : error.message.includes("assinado") ? "Este termo já foi assinado." : error.message);
    setFeito(true);
  }

  if (feito) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <p className="text-sm text-ink/60">{req.clinic_name}</p>
        <h1 className="h-display mt-2 text-4xl">Termo assinado.</h1>
        <p className="mt-4 text-ink/70">Uma cópia fica guardada no seu prontuário na clínica. Você pode revogar o consentimento a qualquer momento, é só avisar o profissional.</p>
      </main>
    );
  }
  if (req.expired) {
    return <main className="flex min-h-screen items-center justify-center px-6 text-center"><div><h1 className="h-title text-2xl">Link expirado</h1><p className="mt-2 text-ink/70">Peça um novo link à clínica.</p></div></main>;
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <p className="text-sm text-ink/60">{req.clinic_name}</p>
      <h1 className="h-title mt-1 text-3xl">{req.template_name}</h1>
      <p className="mt-2 text-ink/70">Leia com atenção antes de assinar. Se algo não estiver claro, pergunte ao profissional antes de continuar.</p>

      <article className="mt-6 rounded-2xl bg-white p-6">
        <Markdown texto={req.body} />
      </article>

      <div className="mt-6 space-y-4 rounded-2xl bg-white p-6">
        <div><label className="label">Nome completo</label><input className="field" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
        <div><label className="label">CPF</label><input className="field" inputMode="numeric" value={cpf} onChange={(e) => setCpf(fmtCPF(e.target.value))} placeholder="000.000.000-00" /></div>
        <div><label className="label">Assinatura</label><Assinar onChange={setSvg} /></div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={li} onChange={(e) => setLi(e.target.checked)} />
          <span>Li o termo acima, compreendi as informações, tive minhas dúvidas respondidas e concordo com a realização do procedimento.</span>
        </label>
        {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
        <button className="btn-primary w-full" onClick={assinar} disabled={enviando || !li || !svg || nome.trim().length < 3 || cpf.replace(/\D/g, "").length !== 11}>
          {enviando ? "Registrando" : "Assinar termo"}
        </button>
        <p className="text-xs text-ink/60">A assinatura é registrada com data, hora e identificação do dispositivo, e o documento recebe um código de verificação que impede alteração posterior.</p>
      </div>
    </main>
  );
}

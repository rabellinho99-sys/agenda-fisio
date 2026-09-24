"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Assinar, Markdown } from "@/components/Assinar";
import { fmtCPF } from "@/lib/format";

type Req = { clinic_name: string; patient_name: string; template_name: string; body: string; signed: boolean; expired: boolean };

function mdParaHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^---$/gm, "<hr/>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^(\d+\.\d+) (.+)$/gm, "<p><strong>$1</strong> $2</p>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>")
    .replace(/^(?!<[h|p|h])/gm, "<p>")
    .replace(/<p><\/p>/g, "");
}

function gerarPDF(
  clinicName: string,
  templateName: string,
  paciente: string,
  cpf: string,
  corpo: string,
  assinaturaSvg: string | null,
  dataAssinatura: string,
) {
  const janela = window.open("", "_blank");
  if (!janela) return;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>${templateName} — ${clinicName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1a1a1a; max-width: 720px; margin: 40px auto; padding: 0 24px; }
    header { border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 24px; }
    header p { font-size: 11px; color: #555; margin-top: 4px; }
    h1 { font-size: 18px; font-weight: 800; }
    h2 { font-size: 14px; font-weight: 700; margin: 20px 0 8px; }
    h3 { font-size: 13px; font-weight: 700; margin: 16px 0 6px; }
    p { line-height: 1.6; margin-bottom: 8px; }
    hr { border: none; border-top: 1px solid #ccc; margin: 20px 0; }
    .dados { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f5f5f0; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 12px; }
    .dados strong { display: block; font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
    .assinatura-box { margin-top: 32px; border-top: 1px solid #ccc; padding-top: 20px; }
    .assinatura-box svg { max-width: 280px; height: 80px; display: block; }
    .assinatura-linha { border-bottom: 1px solid #1a1a1a; width: 280px; margin-top: 8px; }
    .assinatura-label { font-size: 11px; color: #555; margin-top: 4px; }
    .rodape { margin-top: 40px; padding-top: 12px; border-top: 1px solid #eee; font-size: 10px; color: #888; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <header>
    <h1>${templateName}</h1>
    <p>${clinicName} &mdash; 2ª via do paciente</p>
  </header>

  <div class="dados">
    <div><strong>Paciente</strong>${paciente}</div>
    <div><strong>CPF</strong>${cpf}</div>
    <div><strong>Estabelecimento</strong>${clinicName}</div>
    <div><strong>Data de assinatura</strong>${dataAssinatura}</div>
  </div>

  ${mdParaHtml(corpo)}

  <div class="assinatura-box">
    ${assinaturaSvg ? assinaturaSvg : '<div class="assinatura-linha"></div>'}
    <p class="assinatura-label">${paciente} &mdash; CPF ${cpf}</p>
    <p class="assinatura-label">Assinado digitalmente em ${dataAssinatura}</p>
  </div>

  <div class="rodape">
    Este documento possui validade jurídica. A assinatura digital foi registrada com data, hora e identificação do dispositivo.
    Emitido por Agenda Fisio Pro &mdash; agendafisiopro.com.br
  </div>

  <script>window.onload = () => window.print();<\/script>
</body>
</html>`;

  janela.document.open();
  janela.document.write(html);
  janela.document.close();
}

export function TermoPublico({ token, req }: { token: string; req: Req }) {
  const supabase = createClient();
  const [nome, setNome] = useState(req.patient_name);
  const [cpf, setCpf] = useState("");
  const [svg, setSvg] = useState<string | null>(null);
  const [li, setLi] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(req.signed);
  const [dataAssinatura, setDataAssinatura] = useState<string>("");
  const [svgFinal, setSvgFinal] = useState<string | null>(null);

  async function assinar() {
    setErro(null); setEnviando(true);
    const { error } = await supabase.rpc("sign_consent", {
      p_token: token, p_signer_name: nome, p_signer_cpf: cpf.replace(/\D/g, "") || null,
      p_signature_svg: svg, p_user_agent: navigator.userAgent.slice(0, 300),
    });
    setEnviando(false);
    if (error) return setErro(
      error.message.includes("expirado") ? "Este link expirou. Peça um novo à clínica."
      : error.message.includes("assinado") ? "Este termo já foi assinado."
      : error.message
    );
    const agora = new Date().toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
    setDataAssinatura(agora);
    setSvgFinal(svg);
    setFeito(true);
  }

  if (feito) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <div className="flex size-12 items-center justify-center rounded-full bg-brand/10">
          <svg className="size-6 text-brand" fill="none" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
          </svg>
        </div>
        <p className="mt-4 text-sm text-ink/60">{req.clinic_name}</p>
        <h1 className="mt-1 text-3xl font-bold">Termo assinado.</h1>
        <p className="mt-3 text-ink/70">
          Uma cópia fica guardada no seu prontuário na clínica. Você pode revogar o consentimento a qualquer momento, é só avisar o profissional.
        </p>

        <button
          onClick={() => gerarPDF(req.clinic_name, req.template_name, nome, cpf, req.body, svgFinal, dataAssinatura || new Date().toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" }))}
          className="mt-6 flex items-center gap-2 rounded-xl border border-mist bg-white px-5 py-3 text-sm font-semibold text-ink hover:bg-paper transition-colors w-full justify-center"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24">
            <path d="M12 16l-4-4h2.5V8h3v4H16l-4 4z" fill="currentColor"/>
            <path d="M20 18H4v2h16v-2z" fill="currentColor"/>
          </svg>
          Baixar minha 2ª via (PDF)
        </button>
        <p className="mt-2 text-xs text-ink/50 text-center">
          Salve o arquivo como PDF na janela de impressão do seu dispositivo.
        </p>
      </main>
    );
  }

  if (req.expired) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">Link expirado</h1>
          <p className="mt-2 text-ink/70">Peça um novo link à clínica.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <p className="text-sm text-ink/60">{req.clinic_name}</p>
      <h1 className="mt-1 text-3xl font-bold">{req.template_name}</h1>
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
        <button
          className="btn-primary w-full"
          onClick={assinar}
          disabled={enviando || !li || !svg || nome.trim().length < 3 || cpf.replace(/\D/g, "").length !== 11}
        >
          {enviando ? "Registrando" : "Assinar termo"}
        </button>
        <p className="text-xs text-ink/60">
          A assinatura é registrada com data, hora e identificação do dispositivo. Após assinar, você recebe a opção de baixar sua 2ª via em PDF.
        </p>
      </div>
    </main>
  );
}

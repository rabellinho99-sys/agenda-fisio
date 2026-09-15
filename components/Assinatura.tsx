"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { brl } from "@/lib/format";

type Sub = {
  status: string; access: string; trial_ends_at: string | null; current_period_end: string | null;
  payment_url: string | null; plan_code: string; plan_name: string; price_cents: number; has_gateway: boolean;
} | null;
type Plan = { code: string; name: string; price_cents: number; max_professionals: number | null; features: Record<string, boolean> };

const FEATS: Record<string, string> = {
  whatsapp: "Lembretes por WhatsApp", packages: "Pacotes de sessões", prontuario: "Prontuário e anamnese",
  pix: "Pix no agendamento", reports: "Relatórios", api: "API e multiunidade",
};

function dias(iso: string | null) {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

export function Assinatura({ clinicId, isOwner, sub, plans, clinic, userEmail }: {
  clinicId: string; isOwner: boolean; sub: Sub; plans: Plan[];
  clinic: { cnpj_cpf: string | null; email: string | null; phone: string | null }; userEmail: string;
}) {
  const supabase = createClient();
  const [plano, setPlano] = useState(sub?.plan_code ?? "clinica");
  const [doc, setDoc] = useState(clinic.cnpj_cpf ?? "");
  const [email, setEmail] = useState(clinic.email ?? userEmail);
  const [fone, setFone] = useState(clinic.phone ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function assinar() {
    setErro(null); setCarregando(true);
    const { data, error } = await supabase.functions.invoke("asaas-checkout", {
      body: { clinic_id: clinicId, plan_code: plano, cpf_cnpj: doc, email, phone: fone },
    });
    setCarregando(false);
    if (error || data?.error) {
      let msg = data?.error ?? error?.message ?? "Erro ao iniciar assinatura";
      try { const ctx = await (error as { context?: Response })?.context?.json(); if (ctx?.error) msg = ctx.error; } catch { /* ignore */ }
      return setErro(msg);
    }
    if (data?.payment_url) window.location.href = data.payment_url;
    else setErro("Assinatura criada, mas o link de pagamento ainda não foi gerado. Recarregue em instantes.");
  }

  const acesso = sub?.access ?? "blocked";

  return (
    <div className="max-w-3xl">
      <h1 className="h-title text-3xl">Assinatura</h1>

      <div className="mt-6 rounded-xl bg-white p-5">
        {acesso === "trial" && (
          <>
            <p className="text-sm text-ink/60">Período de teste</p>
            <p className="h-display mt-1 text-4xl">{dias(sub?.trial_ends_at ?? null)} dias restantes</p>
            <p className="mt-2 text-ink/70">Assine antes do fim do teste para não interromper o link dos seus pacientes.</p>
          </>
        )}
        {acesso === "active" && (
          <>
            <p className="text-sm text-ink/60">Plano {sub?.plan_name}</p>
            <p className="h-display mt-1 text-4xl">Ativo</p>
            <p className="mt-2 text-ink/70">Próxima renovação em {sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("pt-BR") : "breve"}. Cobrança mensal de {brl(sub?.price_cents ?? 0)}.</p>
            {sub?.payment_url && <a className="btn-ghost mt-4" href={sub.payment_url} target="_blank">Ver próxima fatura</a>}
          </>
        )}
        {acesso === "past_due" && (
          <>
            <p className="text-sm text-danger">Pagamento em atraso</p>
            <p className="h-display mt-1 text-4xl">Regularize</p>
            <p className="mt-2 text-ink/70">Você ainda tem alguns dias de acesso. Depois disso o painel é bloqueado até o pagamento.</p>
            {sub?.payment_url && <a className="btn-primary mt-4" href={sub.payment_url} target="_blank">Pagar fatura</a>}
          </>
        )}
        {acesso === "blocked" && (
          <>
            <p className="text-sm text-danger">Acesso bloqueado</p>
            <p className="h-display mt-1 text-4xl">Escolha um plano</p>
            <p className="mt-2 text-ink/70">Seu teste terminou ou a assinatura foi cancelada. A página pública dos pacientes continua no ar, mas o painel só volta com um plano ativo.</p>
            {sub?.payment_url && <a className="btn-primary mt-4" href={sub.payment_url} target="_blank">Pagar fatura pendente</a>}
          </>
        )}
      </div>

      {(acesso === "trial" || acesso === "blocked") && (
        <>
          <h2 className="h-title mt-10 text-xl">Planos</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {plans.map((p) => (
              <button key={p.code} onClick={() => setPlano(p.code)}
                className={`rounded-xl border p-4 text-left ${plano === p.code ? "border-moss bg-white" : "border-mist bg-white/60 hover:border-moss/50"}`}>
                <p className="font-bold">{p.name}</p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight">{brl(p.price_cents)}<span className="text-sm font-normal text-ink/60">/mês</span></p>
                <p className="mt-1 text-xs text-ink/60">{p.max_professionals ? `até ${p.max_professionals} profissional${p.max_professionals > 1 ? "is" : ""}` : "profissionais ilimitados"}</p>
                <ul className="mt-3 space-y-1 text-sm">
                  {Object.entries(FEATS).map(([k, label]) => (
                    <li key={k} className={p.features?.[k] ? "" : "text-ink/35 line-through"}>{label}</li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          {isOwner ? (
            <div className="mt-6 max-w-md space-y-4 rounded-xl bg-white p-5">
              <p className="font-bold">Dados de cobrança</p>
              <div><label className="label">CPF ou CNPJ</label><input className="field" value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="000.000.000-00" /></div>
              <div><label className="label">E-mail para faturas</label><input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><label className="label">Celular</label><input className="field" value={fone} onChange={(e) => setFone(e.target.value)} placeholder="33 99999 0000" /></div>
              {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
              <button className="btn-primary w-full" onClick={assinar} disabled={carregando || doc.replace(/\D/g, "").length < 11}>
                {carregando ? "Gerando cobrança" : `Assinar plano ${plans.find((p) => p.code === plano)?.name ?? ""}`}
              </button>
              <p className="text-xs text-ink/60">Você será levado à fatura do Asaas para pagar por Pix, boleto ou cartão. A renovação é mensal e pode ser cancelada a qualquer momento.</p>
            </div>
          ) : (
            <p className="mt-6 text-sm text-ink/60">Apenas o dono da clínica pode assinar.</p>
          )}
        </>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { brl } from "@/lib/format";

type Sub = {
  status: string; access: string; trial_ends_at: string | null; current_period_end: string | null;
  payment_url: string | null; plan_code: string; plan_name: string; price_cents: number; has_gateway: boolean;
} | null;

type Plan = {
  code: string; name: string; price_cents: number;
  max_professionals: number | null; features: Record<string, boolean>;
  billing_months: number; discount_pct: number; base_plan_code: string | null;
};

const FEATS: Record<string, string> = {
  whatsapp: "Lembretes por WhatsApp", packages: "Pacotes de sessões", prontuario: "Prontuário e anamnese",
  pix: "Pix no agendamento", reports: "Relatórios", api: "API e multiunidade",
};

const PERIODOS = [
  { months: 1,  label: "Mensal",          badge: null,   descricao: null },
  { months: 6,  label: "Semestral · Pix", badge: "-5%",  descricao: "Cobrança única de 6 meses via Pix com 5% de desconto." },
  { months: 12, label: "Anual",           badge: "-10%", descricao: "Cobrança única de 12 meses com 10% de desconto." },
];

function dias(iso: string | null) {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

export function Assinatura({ clinicId, isOwner, sub, plans, clinic, userEmail }: {
  clinicId: string; isOwner: boolean; sub: Sub; plans: Plan[];
  clinic: { cnpj_cpf: string | null; email: string | null; phone: string | null }; userEmail: string;
}) {
  const supabase = createClient();

  const basePlans = plans.filter((p) => p.billing_months === 1);

  const [basePlano, setBasePlano] = useState<string>(() => {
    const cur = sub?.plan_code ?? "solo";
    const found = plans.find((p) => p.code === cur);
    return found?.base_plan_code ?? cur;
  });
  const [periodo, setPeriodo] = useState(1);
  const [doc, setDoc] = useState(clinic.cnpj_cpf ?? "");
  const [email, setEmail] = useState(clinic.email ?? userEmail);
  const [fone, setFone] = useState(clinic.phone ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [confirmCancelar, setConfirmCancelar] = useState(false);
  const [cancelado, setCancelado] = useState(false);

  function planEfetivo(): Plan | null {
    if (periodo === 1) return plans.find((p) => p.code === basePlano) ?? null;
    return plans.find((p) => p.base_plan_code === basePlano && p.billing_months === periodo) ?? null;
  }

  const efetivo = planEfetivo();
  const periodoInfo = PERIODOS.find((p) => p.months === periodo)!;

  async function cancelarAssinatura() {
    setCancelando(true);
    setErro(null);
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/asaas-cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token}`,
      },
    });
    setCancelando(false);
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      return setErro((body as { error?: string }).error ?? "Erro ao cancelar. Tente novamente.");
    }
    setConfirmCancelar(false);
    setCancelado(true);
  }

  async function assinar() {
    if (!efetivo) return;
    setErro(null); setCarregando(true);
    const { data, error } = await supabase.functions.invoke("asaas-checkout", {
      body: { clinic_id: clinicId, plan_code: efetivo.code, cpf_cnpj: doc, email, phone: fone },
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

      {/* Card de status atual */}
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
            <p className="mt-2 text-ink/70">
              Próxima renovação em {sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("pt-BR") : "breve"}.
            </p>
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

      {/* Cancelamento */}
      {isOwner && (acesso === "active" || acesso === "past_due") && sub?.has_gateway && !cancelado && (
        <div className="mt-4">
          {!confirmCancelar ? (
            <button
              className="text-sm text-ink/50 underline underline-offset-4 hover:text-danger"
              onClick={() => { setConfirmCancelar(true); setErro(null); }}
            >
              Cancelar assinatura
            </button>
          ) : (
            <div className="rounded-xl border border-danger/30 bg-blush/30 p-5 space-y-3">
              <p className="font-bold text-danger">Confirmar cancelamento</p>
              <p className="text-sm text-ink/80">
                Ao cancelar, o acesso ao painel continua até o fim do período já pago.
                Após isso, o painel é bloqueado e o link público dos seus pacientes sai do ar.
                Seus dados ficam guardados por 90 dias.
              </p>
              <p className="text-sm text-ink/70">Essa ação não pode ser desfeita por aqui. Para reativar, escolha um novo plano.</p>
              {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
              <div className="flex gap-2">
                <button
                  className="btn-danger"
                  onClick={cancelarAssinatura}
                  disabled={cancelando}
                >
                  {cancelando ? "Cancelando..." : "Confirmar cancelamento"}
                </button>
                <button className="btn-ghost" onClick={() => { setConfirmCancelar(false); setErro(null); }}>
                  Voltar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {cancelado && (
        <div className="mt-4 rounded-xl bg-white p-5">
          <p className="font-bold">Assinatura cancelada</p>
          <p className="mt-1 text-sm text-ink/70">
            Seu acesso continua até o fim do período pago. Quando quiser retornar, é só escolher um plano abaixo.
          </p>
        </div>
      )}

      {(acesso === "trial" || acesso === "blocked" || acesso === "active") && (
        <>
          <h2 className="h-title mt-10 text-xl">{acesso === "active" ? "Alterar plano" : "Escolha o plano"}</h2>

          {/* Seletor de período */}
          <div className="mt-4 flex flex-wrap gap-2">
            {PERIODOS.map((per) => {
              const ativo = periodo === per.months;
              return (
                <button
                  key={per.months}
                  onClick={() => setPeriodo(per.months)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    ativo ? "bg-moss text-white" : "bg-white text-ink hover:bg-mist"
                  }`}
                >
                  {per.label}
                  {per.badge && (
                    <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                      ativo ? "bg-white/25 text-white" : "bg-amber text-ink"
                    }`}>
                      {per.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Cards de planos */}
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {basePlans.map((p) => {
              const variant = periodo === 1
                ? p
                : plans.find((v) => v.base_plan_code === p.code && v.billing_months === periodo) ?? p;
              const precoMensal = Math.round(variant.price_cents / variant.billing_months);
              const sel = basePlano === p.code;

              return (
                <button
                  key={p.code}
                  onClick={() => setBasePlano(p.code)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    sel ? "border-moss bg-white" : "border-mist bg-white/60 hover:border-moss/50"
                  }`}
                >
                  <p className="font-bold">{p.name}</p>
                  <p className="mt-1 text-2xl font-extrabold tracking-tight">
                    {brl(precoMensal)}
                    <span className="text-sm font-normal text-ink/60">/mês</span>
                  </p>
                  {periodo > 1 && (
                    <p className="mt-0.5 text-xs font-semibold text-moss">
                      {brl(variant.price_cents)} cobrado {periodo === 6 ? "em 6 meses" : "no ano"}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-ink/60">
                    {p.max_professionals
                      ? `até ${p.max_professionals} profissional${p.max_professionals > 1 ? "is" : ""}`
                      : "profissionais ilimitados"}
                  </p>
                  <ul className="mt-3 space-y-1 text-sm">
                    {Object.entries(FEATS).map(([k, label]) => (
                      <li key={k} className={p.features?.[k] ? "text-ink/85" : "text-ink/30 line-through"}>
                        {label}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {/* Formulário de dados e botão */}
          {isOwner ? (
            <div className="mt-6 max-w-md space-y-4 rounded-xl bg-white p-5">
              <p className="font-bold">Dados de cobrança</p>
              <div>
                <label className="label">CPF ou CNPJ</label>
                <input className="field" value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="000.000.000-00" />
              </div>
              <div>
                <label className="label">E-mail para faturas</label>
                <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="label">Celular</label>
                <input className="field" value={fone} onChange={(e) => setFone(e.target.value)} placeholder="33 99999 0000" />
              </div>

              {/* Resumo do pedido */}
              {efetivo && (
                <div className="rounded-lg bg-mist/50 px-4 py-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink/70">{efetivo.name}</span>
                    <span className="font-bold">{brl(efetivo.price_cents)}</span>
                  </div>
                  {periodo > 1 && (
                    <p className="mt-1 text-xs text-moss font-semibold">
                      {efetivo.discount_pct}% de desconto por pagar {periodo === 6 ? "6 meses" : "1 ano"} à vista
                    </p>
                  )}
                </div>
              )}

              {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}

              <button
                className="btn-primary w-full"
                onClick={assinar}
                disabled={carregando || doc.replace(/\D/g, "").length < 11 || !efetivo}
              >
                {carregando
                  ? "Gerando cobrança..."
                  : efetivo
                    ? acesso === "active"
                      ? `Mudar para ${efetivo.name} · ${brl(efetivo.price_cents)}`
                      : `Assinar ${efetivo.name} · ${brl(efetivo.price_cents)}`
                    : "Selecione um plano"}
              </button>

              <p className="text-xs text-ink/60">
                {periodoInfo.descricao ?? "Você será levado à fatura do Asaas para pagar por Pix, boleto ou cartão. A renovação é mensal e pode ser cancelada a qualquer momento."}
              </p>
            </div>
          ) : (
            <p className="mt-6 text-sm text-ink/60">Apenas o dono da clínica pode assinar.</p>
          )}
        </>
      )}
    </div>
  );
}

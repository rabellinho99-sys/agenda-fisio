"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { brl } from "@/lib/format";

export type Pkg = { id: string; name: string; service_id: string | null; sessions: number; price_cents: number; validity_days: number | null };
export type PatientPkg = {
  id: string; package_name: string; service_id: string | null; sessions_total: number; sessions_used: number;
  price_cents: number; paid: boolean; payment_method: string | null; purchased_at: string; expires_at: string | null; cancelled_at: string | null;
};
type Svc = { id: string; name: string };

const PAGAMENTOS: Record<string, string> = {
  pix: "Pix", credit_card: "Cartão de crédito", debit_card: "Cartão de débito", cash: "Dinheiro", transfer: "Transferência", insurance: "Convênio",
};

export function PacotesPaciente({ clinicId, patientId, catalogo, services, vendidos: iniciais }: {
  clinicId: string; patientId: string; catalogo: Pkg[]; services: Svc[]; vendidos: PatientPkg[];
}) {
  const supabase = createClient();
  const [vendidos, setVendidos] = useState(iniciais);
  const [aberto, setAberto] = useState(false);
  const [pkgId, setPkgId] = useState(catalogo[0]?.id ?? "");
  const [pago, setPago] = useState(true);
  const [forma, setForma] = useState("pix");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const pkg = catalogo.find((p) => p.id === pkgId) ?? null;

  async function vender() {
    if (!pkg) return;
    setErro(null); setSalvando(true);
    const { data, error } = await supabase.rpc("sell_package", {
      p_clinic: clinicId, p_patient: patientId, p_package: pkg.id,
      p_payment_method: pago ? forma : null, p_paid: pago,
    });
    if (error) { setSalvando(false); return setErro(error.message); }
    const { data: novo } = await supabase.from("patient_packages")
      .select("id, package_name, service_id, sessions_total, sessions_used, price_cents, paid, payment_method, purchased_at, expires_at, cancelled_at")
      .eq("id", data as string).single();
    setSalvando(false);
    if (novo) setVendidos([novo as PatientPkg, ...vendidos]);
    setAberto(false);
  }

  async function cancelar(id: string) {
    if (!window.confirm("Cancelar este pacote? O saldo restante deixa de valer.")) return;
    const { error } = await supabase.from("patient_packages").update({ cancelled_at: new Date().toISOString() }).eq("id", id);
    if (error) return setErro(error.message);
    setVendidos(vendidos.map((v) => (v.id === id ? { ...v, cancelled_at: new Date().toISOString() } : v)));
  }

  async function marcarPago(id: string) {
    const { error } = await supabase.from("patient_packages").update({ paid: true }).eq("id", id);
    if (error) return setErro(error.message);
    setVendidos(vendidos.map((v) => (v.id === id ? { ...v, paid: true } : v)));
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="h-title text-xl">Pacotes</h2>
        {catalogo.length > 0 && (
          <button className="btn-ghost text-sm" onClick={() => { setAberto(!aberto); setErro(null); }}>Vender pacote</button>
        )}
      </div>
      {catalogo.length === 0 && <p className="mt-2 text-sm text-ink/60">Crie um pacote em Pacotes para vender aqui.</p>}

      {aberto && pkg && (
        <div className="mt-3 space-y-3 rounded-xl bg-white p-4">
          <div><label className="label">Pacote</label>
            <select className="field" value={pkgId} onChange={(e) => setPkgId(e.target.value)}>
              {catalogo.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.sessions} sessões · {brl(p.price_cents)}</option>)}
            </select>
          </div>
          <p className="rounded-lg bg-paper px-3 py-2 text-sm text-ink/70">
            {pkg.sessions} sessões de {services.find((s) => s.id === pkg.service_id)?.name ?? "qualquer serviço"} por {brl(pkg.price_cents)}
            {pkg.validity_days ? `, válido por ${pkg.validity_days} dias` : ", sem prazo de validade"}.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} />
            Já foi pago
          </label>
          {pago && (
            <div><label className="label">Forma de pagamento</label>
              <select className="field" value={forma} onChange={(e) => setForma(e.target.value)}>
                {Object.entries(PAGAMENTOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          )}
          {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={vender} disabled={salvando}>{salvando ? "Registrando" : "Registrar venda"}</button>
            <button className="btn-ghost" onClick={() => setAberto(false)}>Fechar</button>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {vendidos.length === 0 && !aberto && <p className="text-sm text-ink/60">Nenhum pacote comprado.</p>}
        {vendidos.map((v) => {
          const saldo = v.sessions_total - v.sessions_used;
          const vencido = v.expires_at ? new Date(v.expires_at) < new Date() : false;
          const morto = !!v.cancelled_at || vencido || saldo === 0;
          return (
            <article key={v.id} className={`rounded-xl bg-white p-4 ${morto ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {v.package_name}
                    {v.cancelled_at && <span className="ml-2 rounded bg-blush px-1.5 py-0.5 text-xs text-danger">cancelado</span>}
                    {!v.cancelled_at && vencido && <span className="ml-2 rounded bg-blush px-1.5 py-0.5 text-xs text-danger">vencido</span>}
                    {!v.paid && <span className="ml-2 rounded bg-amber/30 px-1.5 py-0.5 text-xs">a receber</span>}
                  </p>
                  <p className="text-sm text-ink/60">
                    {brl(v.price_cents)}{v.payment_method ? ` · ${PAGAMENTOS[v.payment_method] ?? v.payment_method}` : ""}
                    {v.expires_at ? ` · até ${new Date(v.expires_at).toLocaleDateString("pt-BR")}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="h-display text-3xl">{saldo}</p>
                  <p className="text-xs text-ink/50">de {v.sessions_total} restantes</p>
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-mist">
                <div className="h-full bg-moss" style={{ width: `${(v.sessions_used / v.sessions_total) * 100}%` }} />
              </div>
              {!morto && (
                <div className="mt-3 flex gap-2">
                  {!v.paid && <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => marcarPago(v.id)}>Marcar como pago</button>}
                  <button className="btn-danger px-3 py-1.5 text-sm" onClick={() => cancelar(v.id)}>Cancelar pacote</button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}

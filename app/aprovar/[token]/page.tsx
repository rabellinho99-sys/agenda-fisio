"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Info = {
  ok: boolean;
  error?: string;
  status?: string;
  used_action?: string | null;
  expired?: boolean;
  patient_name?: string;
  patient_phone?: string | null;
  service_name?: string | null;
  professional_name?: string | null;
  clinic_name?: string;
  clinic_tz?: string;
  starts_at?: string;
};

function fmt(iso?: string, tz = "America/Sao_Paulo") {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: tz })} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: tz })}`;
}

function linkWhats(telefone: string | null | undefined, texto: string) {
  const n = (telefone ?? "").replace(/\D/g, "");
  if (n.length < 10) return null;
  return `https://wa.me/${n.startsWith("55") ? n : `55${n}`}?text=${encodeURIComponent(texto)}`;
}

const STATUS: Record<string, string> = {
  confirmed: "Este agendamento já está confirmado.",
  cancelled_by_clinic: "Este agendamento foi recusado.",
  cancelled_by_patient: "O paciente cancelou este agendamento.",
  completed: "Este atendimento já foi realizado.",
  checked_in: "O paciente já fez check-in.",
  no_show: "Este atendimento foi marcado como falta.",
};

export default function AprovarPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  );
  const [info, setInfo] = useState<Info | null>(null);
  const [sugerida, setSugerida] = useState<"aceitar" | "recusar" | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ acao: "accept" | "decline" } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const a = new URLSearchParams(window.location.search).get("acao");
    if (a === "aceitar" || a === "recusar") setSugerida(a);
    if (!token) return;
    supabase.rpc("get_approval", { p_token: token }).then(({ data, error }) => {
      if (error) setInfo({ ok: false, error: "Link inválido" });
      else setInfo(data as Info);
    });
  }, [supabase, token]);

  async function decidir(acao: "accept" | "decline") {
    if (!token) return;
    setEnviando(true);
    setErro(null);
    const { data, error } = await supabase.rpc("decide_by_token", { p_token: token, p_action: acao });
    setEnviando(false);
    const r = data as { ok?: boolean; error?: string } | null;
    if (error || !r?.ok) {
      setErro(r?.error ?? "Não foi possível concluir. Tente pelo painel.");
      return;
    }
    setResultado({ acao });
  }

  const card: React.CSSProperties = { maxWidth: 460, margin: "40px auto", background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" };
  const topo = (titulo: string) => (
    <div style={{ background: "#0f172a", padding: "22px 24px" }}>
      <div style={{ color: "#94a3b8", fontSize: 12, letterSpacing: "0.05em" }}>AGENDA FISIO PRO</div>
      <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, marginTop: 6 }}>{titulo}</div>
    </div>
  );
  const linha = (k: string, v?: string | null) => v ? (
    <div style={{ display: "flex", gap: 12, padding: "6px 0", fontSize: 14 }}>
      <span style={{ color: "#64748b", width: 100, flexShrink: 0 }}>{k}</span>
      <span style={{ color: "#0f172a", fontWeight: 600 }}>{v}</span>
    </div>
  ) : null;
  const painel = <a href="/painel" style={{ color: "#0f172a", fontSize: 13 }}>Abrir o painel</a>;

  if (!info) {
    return <div style={{ ...card, padding: 24, textAlign: "center", color: "#64748b" }}>Carregando...</div>;
  }

  if (!info.ok) {
    return <div style={card}>{topo("Link inválido")}<div style={{ padding: 24, color: "#334155" }}><p>{info.error}</p>{painel}</div></div>;
  }

  const quando = fmt(info.starts_at, info.clinic_tz);
  const primeiro = (info.patient_name ?? "").split(" ")[0];

  if (resultado) {
    const aceitou = resultado.acao === "accept";
    const wa = aceitou
      ? linkWhats(info.patient_phone, `Olá, ${primeiro}. Seu horário de ${quando} está confirmado. Até lá!`)
      : linkWhats(info.patient_phone, `Olá, ${primeiro}. Não consegui confirmar o horário de ${quando}. Podemos marcar outro horário?`);
    return (
      <div style={card}>
        {topo(aceitou ? "Agendamento aceito" : "Agendamento recusado")}
        <div style={{ padding: 24 }}>
          <p style={{ color: "#334155", fontSize: 15, marginTop: 0 }}>
            {aceitou ? `${info.patient_name} está confirmado(a) para ${quando}.` : `O horário de ${quando} foi liberado na agenda.`}
          </p>
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" style={{ display: "inline-block", padding: "12px 18px", borderRadius: 10, background: "#16a34a", color: "#fff", fontWeight: 700, textDecoration: "none", marginBottom: 16 }}>
              {aceitou ? "Enviar confirmação pelo WhatsApp" : "Avisar paciente pelo WhatsApp"}
            </a>
          )}
          <div>{painel}</div>
        </div>
      </div>
    );
  }

  const jaDecidido = info.status !== "pending";
  if (jaDecidido || info.expired) {
    return (
      <div style={card}>
        {topo("Nada a fazer aqui")}
        <div style={{ padding: 24, color: "#334155" }}>
          <p style={{ marginTop: 0 }}>{jaDecidido ? STATUS[info.status ?? ""] ?? "Este agendamento já foi decidido." : "Este link expirou."}</p>
          {linha("Paciente", info.patient_name)}
          {linha("Quando", quando)}
          <div style={{ marginTop: 12 }}>{painel}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={card}>
      {topo("Novo agendamento para aprovar")}
      <div style={{ padding: 24 }}>
        {linha("Paciente", info.patient_name)}
        {linha("Telefone", info.patient_phone)}
        {linha("Serviço", info.service_name ?? "Atendimento")}
        {linha("Profissional", info.professional_name)}
        {linha("Quando", quando)}
        {sugerida && (
          <p style={{ color: "#64748b", fontSize: 13, margin: "14px 0 0" }}>
            Confirme abaixo para {sugerida === "aceitar" ? "aceitar" : "recusar"} este agendamento.
          </p>
        )}
        {erro && <p style={{ color: "#b91c1c", fontSize: 14 }}>{erro}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button type="button" disabled={enviando} onClick={() => decidir("accept")} style={{
            flex: 1, padding: "14px 0", borderRadius: 10, border: sugerida === "aceitar" ? "3px solid #14532d" : "none",
            background: "#16a34a", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", opacity: enviando ? 0.6 : 1,
          }}>Aceitar</button>
          <button type="button" disabled={enviando} onClick={() => { if (confirm("Recusar este agendamento? O horário será liberado.")) decidir("decline"); }} style={{
            flex: 1, padding: "14px 0", borderRadius: 10, border: sugerida === "recusar" ? "3px solid #7f1d1d" : "1px solid #fecaca",
            background: sugerida === "recusar" ? "#dc2626" : "#fff", color: sugerida === "recusar" ? "#fff" : "#b91c1c",
            fontWeight: 800, fontSize: 15, cursor: "pointer", opacity: enviando ? 0.6 : 1,
          }}>Recusar</button>
        </div>
      </div>
    </div>
  );
}

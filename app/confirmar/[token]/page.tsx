"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Info = {
  ok: boolean;
  error?: string;
  status?: string;
  starts_at?: string;
  past?: boolean;
  patient_confirmed_at?: string | null;
  first_name?: string;
  clinic_name?: string;
  logo_url?: string | null;
  brand_color?: string | null;
  tz?: string;
  clinic_whatsapp?: string | null;
  service_name?: string | null;
  professional_name?: string | null;
  session_num?: number | null;
  session_total?: number | null;
};

function fmt(iso?: string, tz = "America/Sao_Paulo") {
  if (!iso) return "-";
  const d = new Date(iso);
  const dia = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: tz });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: tz });
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, às ${hora}`;
}

function linkWhats(telefone: string | null | undefined, texto: string) {
  const n = (telefone ?? "").replace(/\D/g, "");
  if (n.length < 10) return null;
  return `https://wa.me/${n.startsWith("55") ? n : `55${n}`}?text=${encodeURIComponent(texto)}`;
}

export default function ConfirmarPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  );
  const [info, setInfo] = useState<Info | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<"confirm" | "cancel" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [perguntaCancelar, setPerguntaCancelar] = useState(false);

  useEffect(() => {
    if (!token) return;
    supabase.rpc("get_confirmation", { p_token: token }).then(({ data, error }) => {
      if (error || !data) setInfo({ ok: false, error: "Link inválido" });
      else setInfo(data as Info);
    });
  }, [supabase, token]);

  async function responder(acao: "confirm" | "cancel") {
    if (!token) return;
    setEnviando(true);
    setErro(null);
    const { data, error } = await supabase.rpc("respond_confirmation", { p_token: token, p_action: acao });
    setEnviando(false);
    const r = data as { ok?: boolean; error?: string } | null;
    if (error || !r?.ok) {
      setErro(r?.error ?? "Não foi possível concluir agora. Tente de novo ou fale com a clínica.");
      return;
    }
    setResultado(acao);
  }

  const cor = info?.brand_color || "#2f6b4f";
  const card: React.CSSProperties = {
    maxWidth: 460, margin: "32px auto", background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0",
    overflow: "hidden", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
  };
  const pagina: React.CSSProperties = { minHeight: "100vh", background: "#f6f5f1", padding: "0 16px" };

  const topo = (titulo: string) => (
    <div style={{ background: cor, padding: "22px 24px", display: "flex", alignItems: "center", gap: 14 }}>
      {info?.logo_url && (
        <img src={info.logo_url} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", background: "#fff" }} />
      )}
      <div>
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>{info?.clinic_name ?? "Agenda Fisio Pro"}</div>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, marginTop: 4 }}>{titulo}</div>
      </div>
    </div>
  );
  const linha = (k: string, v?: string | null) => v ? (
    <div style={{ display: "flex", gap: 12, padding: "7px 0", fontSize: 15, borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ color: "#64748b", width: 100, flexShrink: 0 }}>{k}</span>
      <span style={{ color: "#0f172a", fontWeight: 600 }}>{v}</span>
    </div>
  ) : null;
  const rodape = (
    <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", margin: "16px 0 32px" }}>Agenda Fisio Pro</p>
  );

  if (!info) {
    return <div style={pagina}><div style={{ ...card, padding: 24, textAlign: "center", color: "#64748b" }}>Carregando...</div></div>;
  }

  if (!info.ok) {
    return (
      <div style={pagina}>
        <div style={card}>{topo("Link inválido")}<div style={{ padding: 24, color: "#334155" }}>{info.error}. Fale direto com a clínica.</div></div>
        {rodape}
      </div>
    );
  }

  const quando = fmt(info.starts_at, info.tz);
  const sessao = info.session_num && info.session_total ? `${info.session_num} de ${info.session_total}` : null;
  const falarClinica = (texto: string, rotulo: string) => {
    const wa = linkWhats(info.clinic_whatsapp, texto);
    return wa ? (
      <a href={wa} target="_blank" rel="noreferrer" style={{
        display: "block", textAlign: "center", padding: "13px 0", borderRadius: 10, marginTop: 12,
        border: "1px solid #cbd5e1", color: "#0f172a", fontWeight: 700, textDecoration: "none", fontSize: 15,
      }}>{rotulo}</a>
    ) : null;
  };
  const detalhes = (
    <>
      {linha("Quando", quando)}
      {linha("Atendimento", info.service_name)}
      {linha("Sessão", sessao)}
      {linha("Profissional", info.professional_name)}
    </>
  );

  if (resultado) {
    const confirmou = resultado === "confirm";
    return (
      <div style={pagina}>
        <div style={card}>
          {topo(confirmou ? "Presença confirmada" : "Atendimento cancelado")}
          <div style={{ padding: 24 }}>
            <p style={{ color: "#334155", fontSize: 16, marginTop: 0 }}>
              {confirmou
                ? `Obrigado, ${info.first_name}! Sua presença está confirmada.`
                : `Tudo certo, ${info.first_name}. Avisamos a clínica que você não poderá comparecer.`}
            </p>
            {detalhes}
            {!confirmou && falarClinica(`Olá! Cancelei meu atendimento de ${quando}. Podemos remarcar?`, "Remarcar pelo WhatsApp")}
          </div>
        </div>
        {rodape}
      </div>
    );
  }

  const cancelado = info.status === "cancelled_by_patient" || info.status === "cancelled_by_clinic";
  const encerrado = info.past || !["pending", "confirmed"].includes(info.status ?? "");
  if (cancelado || encerrado) {
    return (
      <div style={pagina}>
        <div style={card}>
          {topo(cancelado ? "Atendimento cancelado" : "Atendimento encerrado")}
          <div style={{ padding: 24, color: "#334155" }}>
            <p style={{ marginTop: 0 }}>
              {cancelado ? "Este atendimento foi cancelado." : "Este atendimento já passou ou não pode mais ser alterado por aqui."}
            </p>
            {detalhes}
            {falarClinica("Olá! Tenho uma dúvida sobre meu atendimento.", "Falar com a clínica")}
          </div>
        </div>
        {rodape}
      </div>
    );
  }

  const jaConfirmou = !!info.patient_confirmed_at;

  return (
    <div style={pagina}>
      <div style={card}>
        {topo(jaConfirmou ? "Presença já confirmada" : "Confirme seu atendimento")}
        <div style={{ padding: 24 }}>
          <p style={{ color: "#334155", fontSize: 16, marginTop: 0 }}>
            Olá, {info.first_name}! {jaConfirmou ? "Você já confirmou este atendimento. Se surgir algum imprevisto, cancele abaixo." : "Você confirma o atendimento abaixo?"}
          </p>
          {detalhes}
          {erro && <p style={{ color: "#b91c1c", fontSize: 14 }}>{erro}</p>}

          {!perguntaCancelar ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
              {!jaConfirmou && (
                <button type="button" disabled={enviando} onClick={() => responder("confirm")} style={{
                  padding: "15px 0", borderRadius: 10, border: "none", background: "#16a34a", color: "#fff",
                  fontWeight: 800, fontSize: 16, cursor: "pointer", opacity: enviando ? 0.6 : 1,
                }}>{enviando ? "Enviando..." : "Confirmar presença"}</button>
              )}
              <button type="button" disabled={enviando} onClick={() => setPerguntaCancelar(true)} style={{
                padding: "14px 0", borderRadius: 10, border: "1px solid #fecaca", background: "#fff", color: "#b91c1c",
                fontWeight: 700, fontSize: 15, cursor: "pointer",
              }}>Não vou poder ir</button>
            </div>
          ) : (
            <div style={{ marginTop: 20, padding: 16, borderRadius: 10, background: "#fef2f2" }}>
              <p style={{ margin: "0 0 12px", color: "#7f1d1d", fontSize: 15, fontWeight: 600 }}>Cancelar este atendimento?</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" disabled={enviando} onClick={() => responder("cancel")} style={{
                  flex: 1, padding: "13px 0", borderRadius: 10, border: "none", background: "#dc2626", color: "#fff",
                  fontWeight: 800, fontSize: 15, cursor: "pointer", opacity: enviando ? 0.6 : 1,
                }}>{enviando ? "Enviando..." : "Sim, cancelar"}</button>
                <button type="button" disabled={enviando} onClick={() => setPerguntaCancelar(false)} style={{
                  flex: 1, padding: "13px 0", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a",
                  fontWeight: 700, fontSize: 15, cursor: "pointer",
                }}>Voltar</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {rodape}
    </div>
  );
}

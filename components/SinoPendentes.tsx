"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Pendente = {
  id: string;
  starts_at: string;
  source: string | null;
  created_at: string;
  patient_name: string;
  patient_phone: string | null;
  service_name: string | null;
  professional_name: string | null;
  clinic_tz: string;
};

type Recusado = { id: string; nome: string; telefone: string | null; quando: string };

const INTERVALO_MS = 60_000;

function fmt(iso: string, tz: string) {
  const d = new Date(iso);
  const data = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: tz });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: tz });
  return `${data} às ${hora}`;
}

function linkWhats(telefone: string | null, texto: string) {
  const n = (telefone ?? "").replace(/\D/g, "");
  if (n.length < 10) return null;
  const dest = n.startsWith("55") ? n : `55${n}`;
  return `https://wa.me/${dest}?text=${encodeURIComponent(texto)}`;
}

function bip() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.5);
  } catch {
    /* navegador sem áudio */
  }
}

export default function SinoPendentes() {
  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  );
  const [lista, setLista] = useState<Pendente[]>([]);
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [recusados, setRecusados] = useState<Recusado[]>([]);
  const anterior = useRef<number | null>(null);
  const tituloBase = useRef<string>("");
  const caixa = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_pending_appointments");
    if (error) return;
    const novos = (data ?? []) as Pendente[];
    setLista(novos);

    if (anterior.current !== null && novos.length > anterior.current) {
      bip();
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const ultimo = novos[novos.length - 1];
        new Notification("Novo agendamento aguardando aprovação", {
          body: ultimo ? `${ultimo.patient_name}, ${fmt(ultimo.starts_at, ultimo.clinic_tz)}` : undefined,
          icon: "/icon-192.png",
        });
      }
    }
    anterior.current = novos.length;
  }, [supabase]);

  useEffect(() => {
    tituloBase.current = document.title.replace(/^\(\d+\)\s*/, "");
    carregar();
    const t = setInterval(carregar, INTERVALO_MS);
    const aoVoltar = () => document.visibilityState === "visible" && carregar();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [carregar]);

  useEffect(() => {
    const base = tituloBase.current || document.title.replace(/^\(\d+\)\s*/, "");
    document.title = lista.length > 0 ? `(${lista.length}) ${base}` : base;
  }, [lista.length]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  async function decidir(p: Pendente, acao: "accept" | "decline") {
    if (acao === "decline" && !confirm(`Recusar o agendamento de ${p.patient_name}? O horário será liberado.`)) return;
    setOcupado(p.id);
    setErro(null);
    const { data, error } = await supabase.rpc("decide_appointment", { p_id: p.id, p_action: acao });
    setOcupado(null);
    const r = data as { ok?: boolean; error?: string } | null;
    if (error || !r?.ok) {
      setErro(r?.error ?? error?.message ?? "Não foi possível concluir");
      carregar();
      return;
    }
    if (acao === "decline") {
      setRecusados((x) => [{ id: p.id, nome: p.patient_name, telefone: p.patient_phone, quando: fmt(p.starts_at, p.clinic_tz) }, ...x]);
    }
    setLista((l) => l.filter((i) => i.id !== p.id));
    anterior.current = Math.max(0, (anterior.current ?? 1) - 1);
    window.dispatchEvent(new CustomEvent("agenda:atualizar"));
  }

  async function ativarAlertas() {
    if (typeof Notification === "undefined") return;
    await Notification.requestPermission();
    setAberto((v) => v);
  }

  const qtd = lista.length;
  const podeAtivar = typeof window !== "undefined" && typeof Notification !== "undefined" && Notification.permission === "default";

  return (
    <div ref={caixa} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={qtd > 0 ? `${qtd} agendamentos aguardando aprovação` : "Notificações"}
        style={{
          position: "relative", width: 40, height: 40, borderRadius: 10, border: "1px solid #e2e8f0",
          background: qtd > 0 ? "#fef3c7" : "#ffffff", cursor: "pointer", display: "inline-flex",
          alignItems: "center", justifyContent: "center",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {qtd > 0 && (
          <span style={{
            position: "absolute", top: -6, right: -6, minWidth: 20, height: 20, padding: "0 5px", borderRadius: 999,
            background: "#dc2626", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex",
            alignItems: "center", justifyContent: "center", border: "2px solid #fff",
          }}>{qtd > 99 ? "99+" : qtd}</span>
        )}
      </button>

      {aberto && (
        <div style={{
          position: "absolute", right: 0, top: 48, width: "min(380px, calc(100vw - 24px))", maxHeight: "70vh",
          overflowY: "auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14,
          boxShadow: "0 12px 32px rgba(15,23,42,0.18)", zIndex: 60, padding: 14,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <strong style={{ fontSize: 15, color: "#0f172a" }}>Aguardando sua aprovação</strong>
            <button type="button" onClick={carregar} style={{ border: "none", background: "none", color: "#64748b", fontSize: 12, cursor: "pointer" }}>Atualizar</button>
          </div>

          {podeAtivar && (
            <button type="button" onClick={ativarAlertas} style={{
              width: "100%", marginBottom: 10, padding: "8px 10px", borderRadius: 8, border: "1px dashed #94a3b8",
              background: "#f8fafc", color: "#334155", fontSize: 12, cursor: "pointer",
            }}>Ativar alerta no navegador para novos agendamentos</button>
          )}

          {erro && <p style={{ margin: "0 0 10px", color: "#b91c1c", fontSize: 13 }}>{erro}</p>}

          {qtd === 0 && recusados.length === 0 && (
            <p style={{ margin: "8px 0", color: "#64748b", fontSize: 13 }}>Nenhum agendamento pendente.</p>
          )}

          {lista.map((p) => (
            <div key={p.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{p.patient_name}</div>
              <div style={{ color: "#334155", fontSize: 13, marginTop: 2 }}>{fmt(p.starts_at, p.clinic_tz)}</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>
                {p.service_name ?? "Atendimento"}
                {p.professional_name ? ` · ${p.professional_name}` : ""}
                {p.source === "online" ? " · pelo link" : ""}
              </div>
              {p.patient_phone && <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>Tel.: {p.patient_phone}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button type="button" disabled={ocupado === p.id} onClick={() => decidir(p, "accept")} style={{
                  flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff",
                  fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: ocupado === p.id ? 0.6 : 1,
                }}>Aceitar</button>
                <button type="button" disabled={ocupado === p.id} onClick={() => decidir(p, "decline")} style={{
                  flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #fecaca", background: "#fff",
                  color: "#b91c1c", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: ocupado === p.id ? 0.6 : 1,
                }}>Recusar</button>
              </div>
            </div>
          ))}

          {recusados.map((r) => {
            const wa = linkWhats(r.telefone, `Olá, ${r.nome.split(" ")[0]}. Não consegui confirmar o horário de ${r.quando}. Podemos marcar outro horário?`);
            return (
              <div key={r.id} style={{ border: "1px solid #fecaca", background: "#fef2f2", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 13, color: "#7f1d1d" }}>Recusado: {r.nome}, {r.quando}. Horário liberado.</div>
                {wa && (
                  <a href={wa} target="_blank" rel="noreferrer" style={{
                    display: "inline-block", marginTop: 8, padding: "7px 12px", borderRadius: 8, background: "#16a34a",
                    color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none",
                  }}>Avisar paciente pelo WhatsApp</a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

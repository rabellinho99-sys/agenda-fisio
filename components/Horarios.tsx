"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { WEEKDAYS } from "@/lib/format";

type Prof = { id: string; display_name: string };
type Rule = { id?: string; professional_id: string; weekday: number; start_time: string; end_time: string };
type Dia = { ativo: boolean; blocos: { start: string; end: string }[] };
type Bloqueio = { id: string; professional_id: string | null; starts_at: string; ends_at: string; reason: string | null };

const padrao = (): Dia[] =>
  Array.from({ length: 7 }, (_, i) => ({ ativo: i >= 1 && i <= 5, blocos: [{ start: "08:00", end: "12:00" }, { start: "14:00", end: "18:00" }] }));

function paraDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtBloqueio(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function Horarios({ clinicId, professionals, rules, blocks }: { clinicId: string; professionals: Prof[]; rules: Rule[]; blocks: Bloqueio[] }) {
  const supabase = createClient();
  const [prof, setProf] = useState(professionals[0]?.id ?? "");
  const [grade, setGrade] = useState<Dia[]>(() => montar(rules, professionals[0]?.id ?? ""));
  const [msg, setMsg] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [bloqueios, setBloqueios] = useState<Bloqueio[]>(blocks);
  const agora = new Date();
  const daquiUmaHora = new Date(agora.getTime() + 60 * 60000);
  const daquiDuasHoras = new Date(agora.getTime() + 2 * 60 * 60000);
  const [bProf, setBProf] = useState<string>("todos");
  const [bInicio, setBInicio] = useState(paraDatetimeLocal(daquiUmaHora.toISOString()));
  const [bFim, setBFim] = useState(paraDatetimeLocal(daquiDuasHoras.toISOString()));
  const [bMotivo, setBMotivo] = useState("");
  const [bErro, setBErro] = useState<string | null>(null);
  const [bSalvando, setBSalvando] = useState(false);

  function montar(rs: Rule[], p: string): Dia[] {
    const mine = rs.filter((r) => r.professional_id === p);
    if (mine.length === 0) return padrao();
    return Array.from({ length: 7 }, (_, i) => {
      const blocos = mine.filter((r) => r.weekday === i).map((r) => ({ start: r.start_time.slice(0, 5), end: r.end_time.slice(0, 5) }));
      return { ativo: blocos.length > 0, blocos: blocos.length ? blocos : [{ start: "08:00", end: "12:00" }] };
    });
  }

  function trocarProf(p: string) { setProf(p); setGrade(montar(rules, p)); setMsg(null); }

  function setDia(i: number, d: Partial<Dia>) { setGrade(grade.map((x, k) => (k === i ? { ...x, ...d } : x))); }

  async function salvar() {
    setSalvando(true); setMsg(null);
    await supabase.from("availability_rules").delete().eq("clinic_id", clinicId).eq("professional_id", prof);
    const rows = grade.flatMap((d, i) =>
      d.ativo ? d.blocos.filter((b) => b.start < b.end).map((b) => ({ clinic_id: clinicId, professional_id: prof, weekday: i, start_time: b.start, end_time: b.end })) : []
    );
    const { error } = rows.length ? await supabase.from("availability_rules").insert(rows) : { error: null };
    setSalvando(false);
    setMsg(error ? error.message : "Horários salvos.");
  }

  async function criarBloqueio() {
    setBErro(null);
    const inicio = new Date(bInicio);
    const fim = new Date(bFim);
    if (fim <= inicio) { setBErro("O fim precisa ser depois do início."); return; }
    setBSalvando(true);
    const { data, error } = await supabase
      .from("availability_exceptions")
      .insert({
        clinic_id: clinicId,
        professional_id: bProf === "todos" ? null : bProf,
        starts_at: inicio.toISOString(),
        ends_at: fim.toISOString(),
        type: "block",
        reason: bMotivo || null,
      })
      .select("id, professional_id, starts_at, ends_at, reason")
      .single();
    setBSalvando(false);
    if (error) { setBErro(error.message); return; }
    setBloqueios((prev) => [...prev, data as Bloqueio].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
    setBMotivo("");
  }

  async function removerBloqueio(id: string) {
    await supabase.from("availability_exceptions").delete().eq("id", id);
    setBloqueios((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div className="max-w-2xl">
      <h1 className="h-title text-3xl">Horários de atendimento</h1>
      <p className="mt-1 text-ink/70">A página pública só oferece horários dentro desta grade.</p>

      {professionals.length > 1 && (
        <div className="mt-6">
          <label className="label">Profissional</label>
          <select className="field" value={prof} onChange={(e) => trocarProf(e.target.value)}>
            {professionals.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
          </select>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {grade.map((d, i) => (
          <div key={i} className={`rounded-xl p-4 ${d.ativo ? "bg-white" : "bg-white/50"}`}>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 font-semibold">
                <input type="checkbox" checked={d.ativo} onChange={(e) => setDia(i, { ativo: e.target.checked })} />
                {WEEKDAYS[i]}
              </label>
              {d.ativo && d.blocos.length < 3 && (
                <button className="text-sm text-moss underline underline-offset-4" onClick={() => setDia(i, { blocos: [...d.blocos, { start: "14:00", end: "18:00" }] })}>
                  Adicionar turno
                </button>
              )}
            </div>
            {d.ativo && (
              <div className="mt-3 space-y-2">
                {d.blocos.map((b, k) => (
                  <div key={k} className="flex items-center gap-2">
                    <input type="time" className="field w-32" value={b.start} onChange={(e) => setDia(i, { blocos: d.blocos.map((x, j) => (j === k ? { ...x, start: e.target.value } : x)) })} />
                    <span className="text-sm text-ink/60">até</span>
                    <input type="time" className="field w-32" value={b.end} onChange={(e) => setDia(i, { blocos: d.blocos.map((x, j) => (j === k ? { ...x, end: e.target.value } : x)) })} />
                    {d.blocos.length > 1 && (
                      <button className="text-sm text-danger" onClick={() => setDia(i, { blocos: d.blocos.filter((_, j) => j !== k) })}>Remover</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {msg && <p className="mt-4 rounded-lg bg-white px-3 py-2 text-sm">{msg}</p>}
      <button className="btn-primary mt-4" onClick={salvar} disabled={salvando || !prof}>{salvando ? "Salvando" : "Salvar horários"}</button>

      <div className="mt-10 rounded-xl bg-white p-6">
        <p className="font-bold">Bloquear horários</p>
        <p className="mt-1 text-sm text-ink/60">
          Use para viagens, folgas ou qualquer período em que o link público não deve oferecer horário, mesmo dentro da grade normal.
        </p>

        <div className="mt-4 space-y-3">
          {professionals.length > 1 && (
            <div>
              <label className="label">Quem fica bloqueado</label>
              <select className="field" value={bProf} onChange={(e) => setBProf(e.target.value)}>
                <option value="todos">Toda a clínica</option>
                {professionals.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">Início</label><input type="datetime-local" className="field" value={bInicio} onChange={(e) => setBInicio(e.target.value)} /></div>
            <div><label className="label">Fim</label><input type="datetime-local" className="field" value={bFim} onChange={(e) => setBFim(e.target.value)} /></div>
          </div>
          <div><label className="label">Motivo (opcional, só a clínica vê)</label><input className="field" value={bMotivo} onChange={(e) => setBMotivo(e.target.value)} placeholder="Viagem, folga, curso..." /></div>
          {bErro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{bErro}</p>}
          <button className="btn-primary" onClick={criarBloqueio} disabled={bSalvando}>{bSalvando ? "Bloqueando" : "Bloquear horário"}</button>
        </div>

        <div className="mt-6 space-y-2">
          {bloqueios.length === 0 && <p className="text-sm text-ink/60">Nenhum bloqueio cadastrado.</p>}
          {bloqueios.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg border border-mist p-3">
              <div>
                <p className="text-sm font-semibold">{fmtBloqueio(b.starts_at)} até {fmtBloqueio(b.ends_at)}</p>
                <p className="text-xs text-ink/60">
                  {b.professional_id ? professionals.find((p) => p.id === b.professional_id)?.display_name ?? "Profissional" : "Toda a clínica"}
                  {b.reason ? ` · ${b.reason}` : ""}
                </p>
              </div>
              <button className="text-sm text-danger" onClick={() => removerBloqueio(b.id)}>Remover</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

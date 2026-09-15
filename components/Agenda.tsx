"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { brl, fmtDateLong, fmtTime, toISODate } from "@/lib/format";

type Prof = { id: string; display_name: string };
type Svc = { id: string; name: string; duration_minutes: number; buffer_after_minutes: number; price_cents: number };
type Appt = {
  id: string; patient_id: string; patient_package_id: string | null; starts_at: string; ends_at: string; status: string; price_cents: number;
  patients: { full_name: string; phone: string } | null;
  services: { name: string } | null;
  professionals: { display_name: string } | null;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Aguardando", cls: "bg-amber/20 text-ink" },
  confirmed: { label: "Confirmado", cls: "bg-moss/15 text-moss-deep" },
  checked_in: { label: "Chegou", cls: "bg-moss/25 text-moss-deep" },
  completed: { label: "Realizado", cls: "bg-ink/10 text-ink" },
  no_show: { label: "Faltou", cls: "bg-blush text-danger" },
  cancelled_by_patient: { label: "Cancelado", cls: "bg-blush text-danger" },
  cancelled_by_clinic: { label: "Cancelado", cls: "bg-blush text-danger" },
};

export function Agenda({ clinicId, tz, professionals, services }: { clinicId: string; tz: string; professionals: Prof[]; services: Svc[] }) {
  const supabase = createClient();
  const [dia, setDia] = useState(() => new Date());
  const [appts, setAppts] = useState<Appt[]>([]);
  const [novo, setNovo] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const inicio = new Date(dia); inicio.setHours(0, 0, 0, 0);
    const fim = new Date(dia); fim.setHours(23, 59, 59, 999);
    const { data } = await supabase
      .from("appointments")
      .select("id, patient_id, patient_package_id, starts_at, ends_at, status, price_cents, patients(full_name, phone), services(name), professionals(display_name)")
      .eq("clinic_id", clinicId)
      .gte("starts_at", inicio.toISOString())
      .lte("starts_at", fim.toISOString())
      .order("starts_at");
    setAppts((data as unknown as Appt[]) ?? []);
    setCarregando(false);
  }, [dia, clinicId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { carregar(); }, [carregar]);

  async function mudarStatus(id: string, status: string) {
    const patch: Record<string, unknown> = { status };
    if (status === "confirmed") patch.confirmed_at = new Date().toISOString();
    if (status.startsWith("cancelled")) patch.cancelled_at = new Date().toISOString();
    await supabase.from("appointments").update(patch).eq("id", id);
    carregar();
  }

  function mover(n: number) { const d = new Date(dia); d.setDate(d.getDate() + n); setDia(d); }

  const inativos = ["completed", "no_show", "cancelled_by_patient", "cancelled_by_clinic"];
  function temConflito(a: Appt) {
    if (inativos.includes(a.status)) return false;
    return appts.some((b) =>
      b.id !== a.id && !inativos.includes(b.status) &&
      b.professionals?.display_name === a.professionals?.display_name &&
      new Date(b.starts_at) < new Date(a.ends_at) && new Date(b.ends_at) > new Date(a.starts_at)
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-ink/60 capitalize">{fmtDateLong(dia, tz)}</p>
            <h1 className="h-display text-5xl">{dia.getDate()}</h1>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => mover(-1)}>Anterior</button>
            <button className="btn-ghost" onClick={() => setDia(new Date())}>Hoje</button>
            <button className="btn-ghost" onClick={() => mover(1)}>Próximo</button>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {carregando && <p className="text-sm text-ink/60">Carregando</p>}
          {!carregando && appts.length === 0 && (
            <div className="rounded-xl border border-dashed border-mist p-8 text-center">
              <p className="font-semibold">Nenhum atendimento neste dia</p>
              <p className="mt-1 text-sm text-ink/60">Marque pelo botão ao lado ou compartilhe seu link público.</p>
            </div>
          )}
          {appts.map((a) => {
            const st = STATUS[a.status];
            const ativo = !inativos.includes(a.status);
            const conflito = temConflito(a);
            return (
              <article key={a.id} className={`grid gap-3 rounded-xl bg-white p-4 md:grid-cols-[72px_1fr_auto] ${conflito ? "border-l-4 border-amber" : ""}`}>
                <div>
                  <p className="text-xl font-extrabold tracking-tight">{fmtTime(a.starts_at, tz)}</p>
                  <p className="text-xs text-ink/50">até {fmtTime(a.ends_at, tz)}</p>
                </div>
                <div>
                  <Link href={`/painel/pacientes/${a.patient_id}`} className="font-semibold hover:underline">{a.patients?.full_name}</Link>
                  <p className="text-sm text-ink/70">{a.services?.name} com {a.professionals?.display_name}</p>
                  <p className="text-sm text-ink/50">{a.patients?.phone} · {a.patient_package_id ? "sessão de pacote" : brl(a.price_cents)}</p>
                </div>
                <div className="flex flex-col items-start gap-2 md:items-end">
                  <div className="flex gap-1">
                    {conflito && <span className="rounded-md bg-amber px-2 py-1 text-xs font-bold text-ink">Sobreposto</span>}
                    <span className={`rounded-md px-2 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
                  </div>
                  {ativo && (
                    <div className="flex flex-wrap gap-1">
                      {a.status === "pending" && <button className="btn-ghost px-2 py-1 text-xs" onClick={() => mudarStatus(a.id, "confirmed")}>Confirmar</button>}
                      {a.status !== "checked_in" && <button className="btn-ghost px-2 py-1 text-xs" onClick={() => mudarStatus(a.id, "checked_in")}>Chegou</button>}
                      <Link href={`/painel/pacientes/${a.patient_id}?appt=${a.id}`} className="btn-primary px-2 py-1 text-xs">Evoluir</Link>
                      <button className="btn-ghost px-2 py-1 text-xs" onClick={() => mudarStatus(a.id, "completed")}>Realizado</button>
                      <button className="btn-danger px-2 py-1 text-xs" onClick={() => mudarStatus(a.id, "no_show")}>Faltou</button>
                      <button className="btn-danger px-2 py-1 text-xs" onClick={() => mudarStatus(a.id, "cancelled_by_clinic")}>Cancelar</button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <aside>
        {!novo ? (
          <button className="btn-primary w-full" onClick={() => setNovo(true)} disabled={services.length === 0}>
            Novo atendimento
          </button>
        ) : (
          <NovoAtendimento
            clinicId={clinicId} dia={dia} professionals={professionals} services={services}
            onClose={() => setNovo(false)} onSaved={() => { setNovo(false); carregar(); }}
          />
        )}
        {services.length === 0 && (
          <p className="mt-3 text-sm text-ink/60">Cadastre ao menos um serviço em Serviços para marcar atendimentos.</p>
        )}
      </aside>
    </div>
  );
}

function NovoAtendimento({ clinicId, dia, professionals, services, onClose, onSaved }: {
  clinicId: string; dia: Date; professionals: Prof[]; services: Svc[]; onClose: () => void; onSaved: () => void;
}) {
  const supabase = createClient();
  const [nome, setNome] = useState("");
  const [fone, setFone] = useState("");
  const [svc, setSvc] = useState(services[0]?.id ?? "");
  const [prof, setProf] = useState(professionals[0]?.id ?? "");
  const [data, setData] = useState(toISODate(dia));
  const [hora, setHora] = useState("09:00");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro(null); setSalvando(true);
    const s = services.find((x) => x.id === svc)!;
    const { data: pac, error: e1 } = await supabase
      .from("patients")
      .upsert({ clinic_id: clinicId, full_name: nome, phone: fone, referral_source: "panel" }, { onConflict: "clinic_id,phone" })
      .select("id").single();
    if (e1 || !pac) { setSalvando(false); return setErro(e1?.message ?? "Erro ao salvar paciente"); }

    const inicio = new Date(`${data}T${hora}:00`);
    const fim = new Date(inicio.getTime() + (s.duration_minutes + s.buffer_after_minutes) * 60000);

    let pacoteId: string | null = null;
    let preco = s.price_cents;
    const { data: pacotes } = await supabase.rpc("active_packages", { p_patient: pac.id, p_service: svc });
    const lista = (pacotes ?? []) as { id: string; package_name: string; saldo: number }[];
    if (lista.length > 0) {
      const p0 = lista[0];
      if (window.confirm(`${nome} tem ${p0.saldo} sessão(ões) no ${p0.package_name}.\n\nUsar uma sessão do pacote neste atendimento?`)) {
        pacoteId = p0.id; preco = 0;
      }
    }

    const { data: conflitos } = await supabase.rpc("find_conflicts", {
      p_professional: prof, p_starts: inicio.toISOString(), p_ends: fim.toISOString(),
    });
    if (conflitos && conflitos.length > 0) {
      const txt = (conflitos as { patient_name: string; service_name: string; starts_at: string }[])
        .map((c) => `${fmtTime(c.starts_at)} ${c.patient_name} (${c.service_name})`).join("\n");
      const ok = window.confirm(`Este horário já tem atendimento marcado:\n\n${txt}\n\nMarcar mesmo assim, em paralelo?`);
      if (!ok) { setSalvando(false); return; }
    }

    const { error: e2 } = await supabase.from("appointments").insert({
      clinic_id: clinicId, patient_id: pac.id, professional_id: prof, service_id: svc,
      starts_at: inicio.toISOString(), ends_at: fim.toISOString(), patient_package_id: pacoteId,
      status: "confirmed", source: "panel", price_cents: preco, confirmed_at: new Date().toISOString(),
    });
    setSalvando(false);
    if (e2) return setErro(e2.message);
    onSaved();
  }

  return (
    <div className="space-y-3 rounded-xl bg-white p-4">
      <p className="font-bold">Novo atendimento</p>
      <div><label className="label">Paciente</label><input className="field" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
      <div><label className="label">WhatsApp</label><input className="field" value={fone} onChange={(e) => setFone(e.target.value)} placeholder="33999990000" /></div>
      <div><label className="label">Serviço</label>
        <select className="field" value={svc} onChange={(e) => setSvc(e.target.value)}>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min)</option>)}
        </select>
      </div>
      <div><label className="label">Profissional</label>
        <select className="field" value={prof} onChange={(e) => setProf(e.target.value)}>
          {professionals.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">Data</label><input type="date" className="field" value={data} onChange={(e) => setData(e.target.value)} /></div>
        <div><label className="label">Hora</label><input type="time" className="field" value={hora} onChange={(e) => setHora(e.target.value)} step={300} /></div>
      </div>
      {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
      <div className="flex gap-2">
        <button className="btn-primary flex-1" onClick={salvar} disabled={salvando || !nome || !fone || !svc || !prof}>Salvar</button>
        <button className="btn-ghost" onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}

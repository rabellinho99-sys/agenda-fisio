"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { brl, fmtTime, toISODate, WEEKDAYS_SHORT } from "@/lib/format";

export type PublicClinic = {
  clinic_id: string; slug: string; name: string; logo_url: string | null; brand_color: string | null;
  whatsapp: string | null; address: { city?: string; state?: string } | null; timezone: string;
  booking_settings: { max_advance_days?: number };
  professionals: { id: string; display_name: string; photo_url: string | null; bio: string | null; specialties: string[] | null }[] | null;
  services: { id: string; name: string; description: string | null; category: string | null; duration_minutes: number; price_cents: number; professional_ids: string[] | null }[] | null;
};

type Slot = { starts_at: string; ends_at: string };

export function BookingFlow({ clinic }: { clinic: PublicClinic }) {
  const supabase = createClient();
  const services = clinic.services ?? [];
  const allProfs = clinic.professionals ?? [];
  const tz = clinic.timezone;

  const [svcId, setSvcId] = useState<string | null>(null);
  const [profId, setProfId] = useState<string | null>(null);
  const [dia, setDia] = useState<Date>(() => new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [carregandoSlots, setCarregandoSlots] = useState(false);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [nome, setNome] = useState("");
  const [fone, setFone] = useState("");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(false);

  const svc = services.find((s) => s.id === svcId) ?? null;
  const profs = useMemo(() => {
    if (!svc) return allProfs;
    const ids = svc.professional_ids;
    return ids && ids.length ? allProfs.filter((p) => ids.includes(p.id)) : allProfs;
  }, [svc, allProfs]);

  useEffect(() => {
    if (svc && profs.length === 1) setProfId(profs[0].id);
  }, [svc, profs]);

  const dias = useMemo(() => {
    const n = Math.min(clinic.booking_settings?.max_advance_days ?? 60, 21);
    return Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); d.setHours(12, 0, 0, 0); return d; });
  }, [clinic.booking_settings]);

  useEffect(() => {
    if (!svcId || !profId) return;
    let cancel = false;
    setCarregandoSlots(true); setSlot(null);
    supabase.rpc("get_available_slots", { p_professional: profId, p_service: svcId, p_date: toISODate(dia) })
      .then(({ data }) => { if (!cancel) { setSlots((data as Slot[]) ?? []); setCarregandoSlots(false); } });
    return () => { cancel = true; };
  }, [svcId, profId, dia]); // eslint-disable-line react-hooks/exhaustive-deps

  async function confirmar() {
    if (!slot || !svcId || !profId) return;
    setErro(null); setEnviando(true);
    const { error } = await supabase.rpc("create_public_appointment", {
      p_clinic: clinic.clinic_id, p_professional: profId, p_service: svcId, p_starts_at: slot.starts_at,
      p_name: nome, p_phone: fone.replace(/\D/g, ""), p_email: null, p_notes: obs || null,
    });
    setEnviando(false);
    if (error) return setErro(error.message.includes("indisponivel") ? "Esse horário acabou de ser ocupado. Escolha outro." : error.message);
    setFeito(true);
  }

  const cidade = [clinic.address?.city, clinic.address?.state].filter(Boolean).join(", ");
  const prof = profs.find((p) => p.id === profId);

  if (feito && slot && svc) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <p className="text-sm text-ink/60">{clinic.name}</p>
        <h1 className="h-display mt-2 text-4xl">Horário marcado.</h1>
        <div className="mt-6 rounded-xl bg-white p-5">
          <p className="text-2xl font-extrabold">{fmtTime(slot.starts_at, tz)}</p>
          <p className="capitalize text-ink/70">{new Date(slot.starts_at).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: tz })}</p>
          <p className="mt-3 font-semibold">{svc.name}</p>
          <p className="text-sm text-ink/70">com {prof?.display_name}</p>
        </div>
        <p className="mt-4 text-sm text-ink/70">Você vai receber a confirmação e um lembrete no WhatsApp {fone}.</p>
        {clinic.whatsapp && (
          <a className="btn-ghost mt-6" href={`https://wa.me/55${clinic.whatsapp.replace(/\D/g, "")}`} target="_blank">Falar com a clínica</a>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-5xl gap-10 px-6 py-10 md:grid-cols-[300px_1fr]">
      <aside className="md:sticky md:top-10 md:self-start">
        <div className="rounded-2xl bg-moss-deep p-6 text-white">
          {clinic.logo_url && <img src={clinic.logo_url} alt="" className="mb-4 h-14 w-14 rounded-full object-cover" />}
          <h1 className="h-title text-2xl">{clinic.name}</h1>
          {cidade && <p className="mt-1 text-white/70">{cidade}</p>}
          <div className="mt-6 space-y-3 text-sm">
            <Resumo label="Serviço" valor={svc?.name} />
            <Resumo label="Profissional" valor={prof?.display_name} />
            <Resumo label="Horário" valor={slot ? `${new Date(slot.starts_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short", timeZone: tz })}, ${fmtTime(slot.starts_at, tz)}` : undefined} />
          </div>
        </div>
      </aside>

      <section className="space-y-10">
        <Etapa titulo="Escolha o serviço">
          {services.length === 0 && <p className="text-ink/60">Esta agenda ainda não tem serviços abertos para agendamento online.</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSvcId(s.id); setProfId(null); setSlot(null); }}
                className={`rounded-xl border p-4 text-left transition-colors ${svcId === s.id ? "border-moss bg-white" : "border-mist bg-white/60 hover:border-moss/50"}`}
              >
                <p className="font-semibold">{s.name}</p>
                {s.description && <p className="mt-1 text-sm text-ink/70">{s.description}</p>}
                <p className="mt-2 text-sm text-ink/60">{s.duration_minutes} min · {brl(s.price_cents)}</p>
              </button>
            ))}
          </div>
        </Etapa>

        {svc && profs.length > 1 && (
          <Etapa titulo="Com quem">
            <div className="grid gap-2 sm:grid-cols-2">
              {profs.map((p) => (
                <button key={p.id} onClick={() => { setProfId(p.id); setSlot(null); }}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left ${profId === p.id ? "border-moss bg-white" : "border-mist bg-white/60 hover:border-moss/50"}`}>
                  {p.photo_url ? <img src={p.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-moss/15 font-bold text-moss-deep">{p.display_name[0]}</span>}
                  <div>
                    <p className="font-semibold">{p.display_name}</p>
                    {p.specialties?.length ? <p className="text-xs text-ink/60">{p.specialties.join(", ")}</p> : null}
                  </div>
                </button>
              ))}
            </div>
          </Etapa>
        )}

        {svc && profId && (
          <Etapa titulo="Escolha o dia e o horário">
            <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-2">
              {dias.map((d) => {
                const sel = toISODate(d) === toISODate(dia);
                return (
                  <button key={d.toISOString()} onClick={() => setDia(d)}
                    className={`flex w-16 shrink-0 flex-col items-center rounded-xl py-3 ${sel ? "bg-moss text-white" : "bg-white hover:bg-white/70"}`}>
                    <span className="text-xs">{WEEKDAYS_SHORT[d.getDay()]}</span>
                    <span className="text-2xl font-extrabold tracking-tight">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4">
              {carregandoSlots && <p className="text-sm text-ink/60">Buscando horários</p>}
              {!carregandoSlots && slots.length === 0 && <p className="text-sm text-ink/60">Sem horários neste dia. Tente outro.</p>}
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => (
                  <button key={s.starts_at} onClick={() => setSlot(s)}
                    className={`rounded-lg px-4 py-2 font-bold ${slot?.starts_at === s.starts_at ? "bg-amber text-ink" : "bg-white hover:bg-amber/30"}`}>
                    {fmtTime(s.starts_at, tz)}
                  </button>
                ))}
              </div>
            </div>
          </Etapa>
        )}

        {slot && (
          <Etapa titulo="Seus dados">
            <div className="max-w-md space-y-4">
              <div><label className="label" htmlFor="nome">Nome completo</label><input id="nome" className="field" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
              <div><label className="label" htmlFor="fone">WhatsApp com DDD</label><input id="fone" className="field" inputMode="tel" value={fone} onChange={(e) => setFone(e.target.value)} placeholder="33 99999 0000" /></div>
              <div><label className="label" htmlFor="obs">Quer adiantar algo? (opcional)</label><textarea id="obs" className="field" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
              {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
              <button className="btn-primary w-full" onClick={confirmar} disabled={enviando || nome.length < 3 || fone.replace(/\D/g, "").length < 10}>
                {enviando ? "Marcando" : "Confirmar horário"}
              </button>
            </div>
          </Etapa>
        )}
      </section>
    </main>
  );
}

function Etapa({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="h-title mb-4 text-xl">{titulo}</h2>
      {children}
    </div>
  );
}

function Resumo({ label, valor }: { label: string; valor?: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-white/15 pt-3">
      <span className="text-white/60">{label}</span>
      <span className={`text-right ${valor ? "font-semibold" : "text-white/40"}`}>{valor ?? "a escolher"}</span>
    </div>
  );
}

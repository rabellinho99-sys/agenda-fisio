"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Assinar, Markdown } from "@/components/Assinar";
import { brl, fmtCPF, fmtTime, toISODate, WEEKDAYS_SHORT } from "@/lib/format";

export type PublicClinic = {
  clinic_id: string; slug: string; name: string; logo_url: string | null; brand_color: string | null;
  whatsapp: string | null; address: { city?: string; state?: string } | null; timezone: string;
  booking_settings: { max_advance_days?: number };
  professionals: { id: string; display_name: string; photo_url: string | null; bio: string | null; specialties: string[] | null }[] | null;
  services: { id: string; name: string; description: string | null; category: string | null; duration_minutes: number; price_cents: number; requires_consent: boolean | null; consent_template_id: string | null; professional_ids: string[] | null }[] | null;
};

type Slot = { starts_at: string; ends_at: string };
type Etapa = "agendar" | "termo" | "fim";

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
  const [etapa, setEtapa] = useState<Etapa>("agendar");

  // Termo de consentimento (quando o servico exige)
  const [termoToken, setTermoToken] = useState<string | null>(null);
  const [termoBody, setTermoBody] = useState<string | null>(null);
  const [termoTitulo, setTermoTitulo] = useState<string | null>(null);
  const [termoCpf, setTermoCpf] = useState("");
  const [termoSvg, setTermoSvg] = useState<string | null>(null);
  const [termoLi, setTermoLi] = useState(false);
  const [assinandoTermo, setAssinandoTermo] = useState(false);
  const [termoAssinado, setTermoAssinado] = useState(false);
  const [erroTermo, setErroTermo] = useState<string | null>(null);

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
    const { data: apptId, error } = await supabase.rpc("create_public_appointment", {
      p_clinic: clinic.clinic_id, p_professional: profId, p_service: svcId, p_starts_at: slot.starts_at,
      p_name: nome, p_phone: fone.replace(/\D/g, ""), p_email: null, p_notes: obs || null,
    });
    if (error) { setEnviando(false); return setErro(error.message.includes("indisponivel") ? "Esse horário acabou de ser ocupado. Escolha outro." : error.message); }

    // Se o servico exige termo, gera o pedido (com o texto renderizado) e abre a assinatura na mesma tela
    if (svc?.requires_consent && svc.consent_template_id && apptId) {
      const { data: termo } = await supabase.rpc("create_public_consent_request", { p_appointment: apptId as string });
      if (termo?.token) {
        setTermoToken(termo.token as string);
        setTermoBody((termo.body as string) ?? null);
        setTermoTitulo((termo.template_name as string) ?? "Termo de consentimento");
        setEnviando(false);
        setEtapa("termo");
        return;
      }
    }
    setEnviando(false);
    setEtapa("fim");
  }

  async function assinarTermo() {
    if (!termoToken) return;
    setErroTermo(null); setAssinandoTermo(true);
    const { error } = await supabase.rpc("sign_consent", {
      p_token: termoToken, p_signer_name: nome, p_signer_cpf: termoCpf.replace(/\D/g, "") || null,
      p_signature_svg: termoSvg, p_user_agent: navigator.userAgent.slice(0, 300),
    });
    setAssinandoTermo(false);
    if (error) return setErroTermo(error.message.includes("expirado") ? "Este link expirou. Fale com a clínica." : error.message.includes("assinado") ? "Este termo já foi assinado." : error.message);
    setTermoAssinado(true);
    setEtapa("fim");
  }

  const cidade = [clinic.address?.city, clinic.address?.state].filter(Boolean).join(", ");
  const prof = profs.find((p) => p.id === profId);

  if (etapa === "fim" && slot && svc) {
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

        {termoAssinado && (
          <div className="mt-4 rounded-xl bg-moss/10 p-4">
            <p className="font-semibold text-moss-deep">Termo de consentimento assinado.</p>
            <p className="mt-1 text-sm text-ink/70">Uma cópia fica guardada no seu prontuário. Você pode revogar o consentimento a qualquer momento, é só avisar o profissional.</p>
          </div>
        )}
        {!termoAssinado && termoToken && (
          <div className="mt-4 rounded-xl bg-amber/15 p-4">
            <p className="font-semibold">Falta assinar o termo do procedimento.</p>
            <p className="mt-1 text-sm text-ink/70">Este procedimento exige um termo de consentimento. Você pode assinar agora pelo link abaixo.</p>
            <a className="btn-primary mt-3 inline-block text-sm" href={`/termo/${termoToken}`}>Assinar o termo</a>
          </div>
        )}

        <p className="mt-4 text-sm text-ink/70">Você vai receber a confirmação e um lembrete no WhatsApp {fone}.</p>
        {clinic.whatsapp && (
          <a className="btn-ghost mt-6" href={`https://wa.me/55${clinic.whatsapp.replace(/\D/g, "")}`} target="_blank">Falar com a clínica</a>
        )}
      </main>
    );
  }

  if (etapa === "termo" && svc) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-ink/60">{clinic.name} · horário já reservado</p>
        <h1 className="h-title mt-1 text-3xl">{termoTitulo}</h1>
        <p className="mt-2 text-ink/70">O procedimento {svc.name} exige consentimento. Leia com atenção e assine antes de finalizar. Se algo não estiver claro, pergunte ao profissional antes de continuar.</p>

        {termoBody && (
          <article className="mt-6 max-h-96 overflow-y-auto rounded-2xl bg-white p-6"><Markdown texto={termoBody} /></article>
        )}

        <div className="mt-6 space-y-4 rounded-2xl bg-white p-6">
          <div><label className="label">Nome de quem assina</label><input className="field" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div><label className="label">CPF</label><input className="field" inputMode="numeric" value={termoCpf} onChange={(e) => setTermoCpf(fmtCPF(e.target.value))} placeholder="000.000.000-00" /></div>
          <div><label className="label">Assinatura</label><Assinar onChange={setTermoSvg} /></div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={termoLi} onChange={(e) => setTermoLi(e.target.checked)} />
            <span>Li o termo acima, compreendi as informações, tive minhas dúvidas respondidas e concordo com a realização do procedimento.</span>
          </label>
          {erroTermo && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erroTermo}</p>}
          <button className="btn-primary w-full" onClick={assinarTermo} disabled={assinandoTermo || !termoLi || !termoSvg || nome.trim().length < 3 || termoCpf.replace(/\D/g, "").length !== 11}>
            {assinandoTermo ? "Registrando" : "Assinar termo"}
          </button>
          <button className="btn-ghost w-full text-sm" onClick={() => setEtapa("fim")}>Assinar depois</button>
          <p className="text-xs text-ink/60">A assinatura é registrada com data, hora e identificação do dispositivo, e o documento recebe um código de verificação que impede alteração posterior.</p>
        </div>
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
                <p className="font-semibold">{s.name}{s.requires_consent && <span className="ml-2 rounded bg-amber/25 px-1.5 py-0.5 text-xs font-medium text-ink/80">exige termo</span>}</p>
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
              {svc?.requires_consent && <p className="rounded-lg bg-amber/15 px-3 py-2 text-sm text-ink/80">Este procedimento exige um termo de consentimento. Depois de confirmar, você vai ler e assinar o termo aqui mesmo.</p>}
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

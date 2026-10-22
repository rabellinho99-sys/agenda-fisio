"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { brl, fmtDateLong, fmtTime, toISODate } from "@/lib/format";
import { buscarPacientes } from "@/lib/busca";
import { LembreteWhatsApp } from "@/components/LembreteWhatsApp";

type Prof = { id: string; display_name: string };
type Svc = { id: string; name: string; duration_minutes: number; buffer_after_minutes: number; price_cents: number; max_participants: number };
type Appt = {
  id: string; patient_id: string; patient_package_id: string | null; starts_at: string; ends_at: string; status: string; price_cents: number;
  color: string | null; internal_notes: string | null; recurrence_id: string | null; patient_confirmed_at: string | null;
  patients: { full_name: string; phone: string } | null;
  services: { name: string } | null;
  professionals: { display_name: string } | null;
};
type Bloqueio = { id: string; professional_id: string | null; starts_at: string; ends_at: string; reason: string | null };

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Aguardando confirmação", cls: "bg-amber/20 text-ink" },
  confirmed: { label: "Confirmado", cls: "bg-moss/15 text-moss-deep" },
  checked_in: { label: "Chegou", cls: "bg-moss/25 text-moss-deep" },
  completed: { label: "Realizado", cls: "bg-ink/10 text-ink" },
  no_show: { label: "Faltou", cls: "bg-blush text-danger" },
  cancelled_by_patient: { label: "Cancelado", cls: "bg-blush text-danger" },
  cancelled_by_clinic: { label: "Cancelado", cls: "bg-blush text-danger" },
};

const CORES: Record<string, { dot: string; borda: string }> = {
  red: { dot: "bg-red-500", borda: "border-l-red-500" },
  yellow: { dot: "bg-amber", borda: "border-l-amber" },
  green: { dot: "bg-moss", borda: "border-l-moss" },
};

export function Agenda({ clinicId, clinicName = "", tz, professionals, services }: {
  clinicId: string; clinicName?: string; tz: string; professionals: Prof[]; services: Svc[];
}) {
  const supabase = createClient();
  const [dia, setDia] = useState(() => new Date());
  const [appts, setAppts] = useState<Appt[]>([]);
  const [novo, setNovo] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [notaAberta, setNotaAberta] = useState<string | null>(null);
  const [notaTexto, setNotaTexto] = useState("");
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ data: "", hora: "", svc: "", prof: "" });
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [erroEdit, setErroEdit] = useState<string | null>(null);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [bloqueando, setBloqueando] = useState(false);
  const [modo, setModo] = useState<"dia" | "semana">("dia");
  const [versao, setVersao] = useState(0); // recarrega a visão semanal depois de salvar
  const [mostrarCancelados, setMostrarCancelados] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const inicio = new Date(dia); inicio.setHours(0, 0, 0, 0);
    const fim = new Date(dia); fim.setHours(23, 59, 59, 999);
    const { data } = await supabase
      .from("appointments")
      .select("id, patient_id, patient_package_id, starts_at, ends_at, status, price_cents, color, internal_notes, recurrence_id, patient_confirmed_at, patients(full_name, phone), services(name), professionals(display_name)")
      .eq("clinic_id", clinicId)
      .gte("starts_at", inicio.toISOString())
      .lte("starts_at", fim.toISOString())
      .order("starts_at");
    setAppts((data as unknown as Appt[]) ?? []);
    // bloqueios que encostam neste dia (inclui bloqueios de vários dias)
    const { data: blocos } = await supabase
      .from("availability_exceptions")
      .select("id, professional_id, starts_at, ends_at, reason")
      .eq("clinic_id", clinicId)
      .eq("type", "block")
      .lt("starts_at", fim.toISOString())
      .gt("ends_at", inicio.toISOString())
      .order("starts_at");
    setBloqueios((blocos as Bloqueio[]) ?? []);
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

  async function mudarCor(id: string, color: string | null) {
    await supabase.from("appointments").update({ color }).eq("id", id);
    setAppts((prev) => prev.map((a) => (a.id === id ? { ...a, color } : a)));
  }

  function abrirNota(a: Appt) {
    setNotaAberta(notaAberta === a.id ? null : a.id);
    setNotaTexto(a.internal_notes ?? "");
  }

  async function salvarNota(id: string) {
    setSalvandoNota(true);
    await supabase.from("appointments").update({ internal_notes: notaTexto || null }).eq("id", id);
    setAppts((prev) => prev.map((a) => (a.id === id ? { ...a, internal_notes: notaTexto || null } : a)));
    setSalvandoNota(false);
    setNotaAberta(null);
  }

  async function cancelarSerie(a: Appt) {
    if (!a.recurrence_id) return;
    if (!window.confirm(`Cancelar esta sessão e todas as próximas da série de ${a.patients?.full_name ?? "paciente"}?\n\nAs sessões anteriores continuam como estão.`)) return;
    await supabase
      .from("appointments")
      .update({ status: "cancelled_by_clinic", cancelled_at: new Date().toISOString() })
      .eq("recurrence_id", a.recurrence_id)
      .gte("starts_at", a.starts_at)
      .in("status", ["pending", "confirmed"]);
    carregar();
  }

  async function excluir(a: Appt) {
    const quando = `${new Date(a.starts_at).toLocaleDateString("pt-BR")} às ${fmtTime(a.starts_at, tz)}`;
    if (!window.confirm(`Excluir o atendimento de ${a.patients?.full_name ?? "paciente"} em ${quando}?\n\nEle some da agenda. A evolução já registrada no prontuário continua guardada.`)) return;
    const { error } = await supabase.from("appointments").delete().eq("id", a.id);
    if (error) return window.alert(error.message);
    carregar();
    setVersao((v) => v + 1);
  }

  async function excluirSerie(a: Appt) {
    if (!a.recurrence_id) return;
    if (!window.confirm(`Excluir esta sessão e todas as próximas da série de ${a.patients?.full_name ?? "paciente"}?\n\nSessões já marcadas como Realizado não são excluídas.`)) return;
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("recurrence_id", a.recurrence_id)
      .gte("starts_at", a.starts_at)
      .neq("status", "completed");
    if (error) return window.alert(error.message);
    carregar();
    setVersao((v) => v + 1);
  }

  async function desbloquear(id: string) {
    await supabase.from("availability_exceptions").delete().eq("id", id);
    setBloqueios((prev) => prev.filter((b) => b.id !== id));
  }

  function nomeProf(id: string | null) {
    if (!id) return "Toda a clínica";
    return professionals.find((p) => p.id === id)?.display_name ?? "Profissional";
  }

  // Bloqueio que cobre o dia todo aparece como "Dia inteiro"
  function faixaBloqueio(b: Bloqueio) {
    const ini = new Date(dia); ini.setHours(0, 0, 0, 0);
    const fim = new Date(dia); fim.setHours(23, 59, 0, 0);
    if (new Date(b.starts_at) <= ini && new Date(b.ends_at) >= fim) return "Dia inteiro";
    const de = new Date(b.starts_at) < ini ? "início do dia" : fmtTime(b.starts_at, tz);
    const ate = new Date(b.ends_at) > fim ? "fim do dia" : fmtTime(b.ends_at, tz);
    return `${de} até ${ate}`;
  }

  function mover(n: number) { const d = new Date(dia); d.setDate(d.getDate() + n); setDia(d); }

  function abrirEdicao(a: Appt) {
    const inicio = new Date(a.starts_at);
    setEditandoId(a.id);
    setEditForm({
      data: toISODate(inicio),
      hora: inicio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }),
      svc: "",
      prof: "",
    });
    setErroEdit(null);
  }

  async function salvarEdicao(a: Appt) {
    setSalvandoEdit(true);
    setErroEdit(null);
    const svcObj = services.find((x) => x.id === editForm.svc) ?? services.find((x) => x.name === a.services?.name);

    const inicio = new Date(`${editForm.data}T${editForm.hora}:00`);
    const duracao = svcObj ? svcObj.duration_minutes + svcObj.buffer_after_minutes : 50;
    const fim = new Date(inicio.getTime() + duracao * 60000);

    const patch: Record<string, unknown> = {
      starts_at: inicio.toISOString(),
      ends_at: fim.toISOString(),
    };
    if (editForm.svc) patch.service_id = editForm.svc;
    if (editForm.prof) patch.professional_id = editForm.prof;

    const { error } = await supabase.from("appointments").update(patch).eq("id", a.id);
    setSalvandoEdit(false);
    if (error) return setErroEdit(error.message);
    setEditandoId(null);
    carregar();
  }

  const inativos = ["completed", "no_show", "cancelled_by_patient", "cancelled_by_clinic"];
  function temConflito(a: Appt) {
    if (inativos.includes(a.status)) return false;
    return appts.some((b) =>
      b.id !== a.id && !inativos.includes(b.status) &&
      b.professionals?.display_name === a.professionals?.display_name &&
      new Date(b.starts_at) < new Date(a.ends_at) && new Date(b.ends_at) > new Date(a.starts_at)
    );
  }

  // Agrupar atendimentos de turma (mesmo serviço + profissional + horário)
  function participantesTurma(a: Appt) {
    return appts.filter((b) =>
      b.services?.name === a.services?.name &&
      b.professionals?.display_name === a.professionals?.display_name &&
      b.starts_at === a.starts_at &&
      !inativos.includes(b.status)
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            {modo === "dia" ? (
              <>
                <p className="text-sm text-ink/60 capitalize">{fmtDateLong(dia, tz)}</p>
                <h1 className="h-display text-5xl">{dia.getDate()}</h1>
              </>
            ) : (
              <>
                <p className="text-sm text-ink/60">Semana</p>
                <h1 className="h-display text-3xl">{tituloSemana(dia)}</h1>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg bg-white p-1">
              {(["dia", "semana"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setModo(m)}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold ${modo === m ? "bg-moss text-white" : "text-ink"}`}
                >
                  {m === "dia" ? "Dia" : "Semana"}
                </button>
              ))}
            </div>
            <button className="btn-ghost" onClick={() => mover(modo === "semana" ? -7 : -1)}>Anterior</button>
            <button className="btn-ghost" onClick={() => setDia(new Date())}>Hoje</button>
            <button className="btn-ghost" onClick={() => mover(modo === "semana" ? 7 : 1)}>Próximo</button>
            <input
              type="date"
              className="field text-sm"
              value={toISODate(dia)}
              onChange={(e) => { if (e.target.value) setDia(new Date(e.target.value + "T12:00:00")); }}
              title="Escolher data no calendário"
            />
          </div>
        </div>

        {modo === "semana" && (
          <SemanaAgenda
            clinicId={clinicId}
            dia={dia}
            tz={tz}
            versao={versao}
            mostrarCancelados={mostrarCancelados}
            onAbrirDia={(d) => { setDia(d); setModo("dia"); }}
          />
        )}

        <div className={`mt-6 space-y-2 ${modo === "semana" ? "hidden" : ""}`}>
          {carregando && <p className="text-sm text-ink/60">Carregando</p>}
          {!carregando && appts.some((a) => a.status.startsWith("cancelled")) && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink/60">
              <input type="checkbox" className="size-4" checked={mostrarCancelados} onChange={(e) => setMostrarCancelados(e.target.checked)} />
              Mostrar cancelados ({appts.filter((a) => a.status.startsWith("cancelled")).length})
            </label>
          )}
          {!carregando && appts.filter((a) => mostrarCancelados || !a.status.startsWith("cancelled")).length === 0 && bloqueios.length === 0 && (
            <div className="rounded-xl border border-dashed border-mist p-8 text-center">
              <p className="font-semibold">Nenhum atendimento neste dia</p>
              <p className="mt-1 text-sm text-ink/60">Marque pelo botão ao lado ou compartilhe seu link público.</p>
            </div>
          )}
          {[
            ...bloqueios.map((b) => ({ tipo: "bloqueio" as const, quando: b.starts_at, b })),
            ...appts
              .filter((a) => mostrarCancelados || !a.status.startsWith("cancelled"))
              .map((a) => ({ tipo: "atendimento" as const, quando: a.starts_at, a })),
          ].sort((x, y) => x.quando.localeCompare(y.quando)).map((item) => {
            if (item.tipo === "bloqueio") {
              const b = item.b;
              return (
                <article key={`b-${b.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-ink/25 bg-ink/5 p-4">
                  <div>
                    <p className="font-bold">🚫 Horário bloqueado · {faixaBloqueio(b)}</p>
                    <p className="text-sm text-ink/60">{nomeProf(b.professional_id)}{b.reason ? ` · ${b.reason}` : ""}</p>
                  </div>
                  <button className="btn-ghost px-3 py-1 text-xs" onClick={() => desbloquear(b.id)}>Desbloquear</button>
                </article>
              );
            }
            const a = item.a;
            const st = STATUS[a.status];
            const ativo = !inativos.includes(a.status);
            const conflito = temConflito(a);
            const cor = a.color ? CORES[a.color] : null;
            const borda = conflito ? "border-l-4 border-amber" : cor ? `border-l-4 ${cor.borda}` : "";
            return (
              <article key={a.id} className={`grid gap-3 rounded-xl bg-white p-4 md:grid-cols-[72px_1fr_auto] ${borda}`}>
                <div>
                  <p className="text-xl font-extrabold tracking-tight">{fmtTime(a.starts_at, tz)}</p>
                  <p className="text-xs text-ink/50">até {fmtTime(a.ends_at, tz)}</p>
                </div>
                <div>
                  <Link href={`/painel/pacientes/${a.patient_id}`} className="font-semibold hover:underline">{a.patients?.full_name}</Link>
                  <p className="text-sm text-ink/70">
                    {a.services?.name} com {a.professionals?.display_name}
                    {a.recurrence_id && <span className="ml-2 rounded bg-moss/10 px-1.5 py-0.5 text-xs font-semibold text-moss-deep">Horário fixo</span>}
                  </p>
                  {(() => {
                    const turma = participantesTurma(a);
                    return turma.length > 1 ? (
                      <p className="text-xs text-moss font-semibold">Turma: {turma.length} alunos neste horário ({turma.map((t) => t.patients?.full_name?.split(" ")[0]).join(", ")})</p>
                    ) : null;
                  })()}
                  <p className="text-sm text-ink/50">{a.patients?.phone ? a.patients.phone + " · " : ""}{a.patient_package_id ? "sessão de pacote" : brl(a.price_cents)}</p>

                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-ink/50">Marcador:</span>
                    <button type="button" aria-label="Vermelho" onClick={() => mudarCor(a.id, a.color === "red" ? null : "red")}
                      className={`size-4 rounded-full bg-red-500 ${a.color === "red" ? "ring-2 ring-offset-1 ring-red-500" : "opacity-40 hover:opacity-100"}`} />
                    <button type="button" aria-label="Amarelo" onClick={() => mudarCor(a.id, a.color === "yellow" ? null : "yellow")}
                      className={`size-4 rounded-full bg-amber ${a.color === "yellow" ? "ring-2 ring-offset-1 ring-amber" : "opacity-40 hover:opacity-100"}`} />
                    <button type="button" aria-label="Verde" onClick={() => mudarCor(a.id, a.color === "green" ? null : "green")}
                      className={`size-4 rounded-full bg-moss ${a.color === "green" ? "ring-2 ring-offset-1 ring-moss" : "opacity-40 hover:opacity-100"}`} />
                    <button type="button" className="ml-2 text-xs text-ink/50 underline underline-offset-4" onClick={() => abrirNota(a)}>
                      {a.internal_notes ? "Ver observação" : "Adicionar observação"}
                    </button>
                  </div>

                  {notaAberta === a.id && (
                    <div className="mt-2 space-y-2">
                      <textarea className="field" rows={2} value={notaTexto} onChange={(e) => setNotaTexto(e.target.value)}
                        placeholder="Observação interna, visível só para a clínica" />
                      <div className="flex gap-2">
                        <button className="btn-primary px-3 py-1 text-xs" onClick={() => salvarNota(a.id)} disabled={salvandoNota}>
                          {salvandoNota ? "Salvando" : "Salvar"}
                        </button>
                        <button className="btn-ghost px-3 py-1 text-xs" onClick={() => setNotaAberta(null)}>Cancelar</button>
                      </div>
                    </div>
                  )}
                  {notaAberta !== a.id && a.internal_notes && (
                    <p className="mt-2 rounded-lg bg-paper px-3 py-2 text-xs text-ink/70">{a.internal_notes}</p>
                  )}
                </div>
                <div className="flex flex-col items-start gap-2 md:items-end">
                  <div className="flex gap-1">
                    {conflito && <span className="rounded-md bg-amber px-2 py-1 text-xs font-bold text-ink">Sobreposto</span>}
                    <span className={`rounded-md px-2 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
                    {a.patient_confirmed_at && ativo && (
                      <span className="rounded-md bg-moss px-2 py-1 text-xs font-bold text-white" title="O paciente confirmou presença">✓ Paciente confirmou</span>
                    )}
                  </div>
                  {ativo && (
                    <div className="flex flex-wrap gap-1">
                      {a.status === "pending" && <button className="btn-primary px-2 py-1 text-xs" onClick={() => mudarStatus(a.id, "confirmed")}>Autorizar</button>}
                      {a.status !== "checked_in" && <button className="btn-ghost px-2 py-1 text-xs" onClick={() => mudarStatus(a.id, "checked_in")}>Chegou</button>}
                      <Link href={`/painel/pacientes/${a.patient_id}?appt=${a.id}`} className="btn-primary px-2 py-1 text-xs">Evoluir</Link>
                      <button className="btn-ghost px-2 py-1 text-xs" onClick={() => mudarStatus(a.id, "completed")}>Realizado</button>
                      <button className="btn-danger px-2 py-1 text-xs" onClick={() => mudarStatus(a.id, "no_show")}>Faltou</button>
                      <button className="btn-danger px-2 py-1 text-xs" onClick={() => mudarStatus(a.id, "cancelled_by_clinic")}>
                        {a.status === "pending" ? "Recusar" : "Cancelar"}
                      </button>
                      <button className="btn-ghost px-2 py-1 text-xs" onClick={() => abrirEdicao(a)}>Editar</button>
                      {a.recurrence_id && (
                        <button className="btn-danger px-2 py-1 text-xs" onClick={() => cancelarSerie(a)}>Cancelar esta e as próximas</button>
                      )}
                      <button className="btn-ghost px-2 py-1 text-xs text-ink/60" onClick={() => excluir(a)}>Excluir</button>
                    </div>
                  )}
                  {!ativo && (
                    <div className="flex flex-wrap gap-1">
                      <button className="btn-ghost px-2 py-1 text-xs" onClick={() => excluir(a)}>Excluir</button>
                      {a.recurrence_id && a.status !== "completed" && (
                        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => excluirSerie(a)}>Excluir esta e as próximas</button>
                      )}
                    </div>
                  )}
                  {ativo && (
                    <LembreteWhatsApp
                      compacto
                      appointmentId={a.id}
                      telefone={a.patients?.phone ?? null}
                      paciente={a.patients?.full_name ?? ""}
                      clinica={clinicName || "clínica"}
                      servico={a.services?.name}
                      profissional={a.professionals?.display_name}
                      inicio={a.starts_at}
                      timezone={tz}
                    />
                  )}
                  {editandoId === a.id && (
                    <div className="mt-3 w-full space-y-2 rounded-lg border border-ink/10 p-3">
                      <p className="text-xs font-semibold">Editar horário</p>
                      <div className="flex flex-wrap gap-2">
                        <div>
                          <label className="text-xs text-ink/60">Data</label>
                          <input type="date" className="field text-sm" value={editForm.data}
                            onChange={(e) => setEditForm({ ...editForm, data: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-xs text-ink/60">Hora</label>
                          <input type="time" className="field text-sm" value={editForm.hora} step={300}
                            onChange={(e) => setEditForm({ ...editForm, hora: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-xs text-ink/60">Serviço</label>
                          <select className="field text-sm" value={editForm.svc}
                            onChange={(e) => setEditForm({ ...editForm, svc: e.target.value })}>
                            <option value="">Manter atual</option>
                            {services.map((sv) => <option key={sv.id} value={sv.id}>{sv.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-ink/60">Profissional</label>
                          <select className="field text-sm" value={editForm.prof}
                            onChange={(e) => setEditForm({ ...editForm, prof: e.target.value })}>
                            <option value="">Manter atual</option>
                            {professionals.map((pr) => <option key={pr.id} value={pr.id}>{pr.display_name}</option>)}
                          </select>
                        </div>
                      </div>
                      {erroEdit && <p className="text-xs text-danger">{erroEdit}</p>}
                      <div className="flex gap-2">
                        <button className="btn-primary px-3 py-1 text-xs" onClick={() => salvarEdicao(a)} disabled={salvandoEdit}>
                          {salvandoEdit ? "Salvando" : "Salvar"}
                        </button>
                        <button className="btn-ghost px-3 py-1 text-xs" onClick={() => setEditandoId(null)}>Cancelar</button>
                      </div>
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
          <NovoAtendimento clinicId={clinicId} dia={dia} professionals={professionals} services={services}
            onClose={() => setNovo(false)} onSaved={() => { setNovo(false); carregar(); setVersao((v) => v + 1); }}
          />
        )}
        {services.length === 0 && (
          <p className="mt-3 text-sm text-ink/60">Cadastre ao menos um serviço em Serviços para marcar atendimentos.</p>
        )}

        <div className="mt-3">
          {!bloqueando ? (
            <button className="btn-ghost w-full" onClick={() => setBloqueando(true)}>Bloquear horário</button>
          ) : (
            <BloquearHorario
              clinicId={clinicId}
              dia={dia}
              professionals={professionals}
              atendimentos={appts.filter((a) => !inativos.includes(a.status))}
              onClose={() => setBloqueando(false)}
              onSaved={() => { setBloqueando(false); carregar(); setVersao((v) => v + 1); }}
            />
          )}
        </div>
      </aside>
    </div>
  );
}

/* ── Novo Atendimento com busca de paciente ─────────────────── */

type PacienteBusca = { id: string; full_name: string; phone: string | null; cpf: string | null };

function NovoAtendimento({ clinicId, dia, professionals, services, onClose, onSaved }: {
  clinicId: string; dia: Date; professionals: Prof[]; services: Svc[]; onClose: () => void; onSaved: () => void;
}) {
  const supabase = createClient();

  // paciente
  const [busca, setBusca] = useState("");
  const [todos, setTodos] = useState<PacienteBusca[]>([]);
  const [carregandoPac, setCarregandoPac] = useState(true);
  const [selecionado, setSelecionado] = useState<PacienteBusca | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novoFone, setNovoFone] = useState("");
  const [modoNovo, setModoNovo] = useState(false);

  // agendamento
  const [svc, setSvc] = useState(services[0]?.id ?? "");
  const [prof, setProf] = useState(professionals[0]?.id ?? "");
  const [data, setData] = useState(toISODate(dia));
  const [hora, setHora] = useState("09:00");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [repetir, setRepetir] = useState<"nao" | "semanal" | "quinzenal">("nao");
  const [ateData, setAteData] = useState(() => { const d = new Date(dia); d.setMonth(d.getMonth() + 3); return toISODate(d); });
  const [diasSemana, setDiasSemana] = useState<number[]>(() => [dia.getDay()]);
  const [terminar, setTerminar] = useState<"sessoes" | "data">("sessoes");
  const [qtdSessoes, setQtdSessoes] = useState(10);
  const [saldoInfo, setSaldoInfo] = useState<{ nome: string; saldo: number } | null>(null);

  // ao trocar a data inicial, garante que o dia da semana dela esteja marcado
  useEffect(() => {
    const d = new Date(`${data}T12:00:00`).getDay();
    if (!Number.isNaN(d)) setDiasSemana((atual) => (atual.includes(d) ? atual : [...atual, d].sort()));
  }, [data]);

  // mostra o saldo do pacote e já sugere o número de sessões
  useEffect(() => {
    let ativo = true;
    setSaldoInfo(null);
    if (!selecionado || !svc) return;
    supabase.rpc("active_packages", { p_patient: selecionado.id, p_service: svc }).then(({ data: pk }) => {
      if (!ativo) return;
      const p0 = ((pk ?? []) as { package_name: string; saldo: number }[])[0];
      if (p0 && p0.saldo > 0) { setSaldoInfo({ nome: p0.package_name, saldo: p0.saldo }); setQtdSessoes(p0.saldo); }
    });
    return () => { ativo = false; };
  }, [selecionado, svc]); // eslint-disable-line react-hooks/exhaustive-deps

  function alternarDia(d: number) {
    setDiasSemana((atual) => atual.includes(d) ? (atual.length > 1 ? atual.filter((x) => x !== d) : atual) : [...atual, d].sort());
  }

  const datasSerie = calcularDatas(data, hora, repetir, { ateData, dias: diasSemana, terminar, qtd: qtdSessoes });

  // carrega a lista de pacientes uma vez; a busca é feita na tela, com a mesma regra das outras telas
  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, full_name, phone, cpf")
        .eq("clinic_id", clinicId)
        .order("full_name")
        .limit(1000);
      if (!ativo) return;
      setTodos((data ?? []) as PacienteBusca[]);
      setCarregandoPac(false);
    })();
    return () => { ativo = false; };
  }, [clinicId]); // eslint-disable-line react-hooks/exhaustive-deps

  const resultados = useMemo(
    () => (busca.trim().length >= 1 ? buscarPacientes(todos, busca, 8) : []),
    [todos, busca]
  );

  function escolher(p: PacienteBusca) {
    setSelecionado(p);
    setBusca(p.full_name);
  }

  function limpar() {
    setSelecionado(null);
    setBusca("");
    setModoNovo(false);
    setNovoNome("");
    setNovoFone("");
  }

  function iniciarNovo() {
    setModoNovo(true);
    setNovoNome(busca.trim());
  }

  async function salvar() {
    setErro(null); setSalvando(true);
    const s = services.find((x) => x.id === svc)!;

    let pacienteId: string;

    if (selecionado) {
      pacienteId = selecionado.id;
    } else if (modoNovo && novoNome.trim()) {
      const foneValido = novoFone.replace(/\D/g, "");
      const insert: Record<string, unknown> = {
        clinic_id: clinicId,
        full_name: novoNome.trim(),
        referral_source: "panel",
      };
      if (foneValido.length >= 10) {
        insert.phone = foneValido;
      }
      // Se tem telefone, faz upsert; senão, faz insert direto
      const { data: pac, error: e1 } = foneValido.length >= 10
        ? await supabase
            .from("patients")
            .upsert({ ...insert, phone: foneValido }, { onConflict: "clinic_id,phone" })
            .select("id").single()
        : await supabase
            .from("patients")
            .insert(insert)
            .select("id").single();
      if (e1 || !pac) { setSalvando(false); return setErro(e1?.message ?? "Erro ao salvar paciente"); }
      pacienteId = pac.id;
    } else {
      setSalvando(false);
      return setErro("Selecione um paciente ou cadastre um novo.");
    }

    const inicio = new Date(`${data}T${hora}:00`);
    const fim = new Date(inicio.getTime() + (s.duration_minutes + s.buffer_after_minutes) * 60000);

    let pacoteId: string | null = null;
    let saldoPacote = 0;
    const { data: pacotes } = await supabase.rpc("active_packages", { p_patient: pacienteId, p_service: svc });
    const lista = (pacotes ?? []) as { id: string; package_name: string; saldo: number }[];
    if (lista.length > 0) {
      const p0 = lista[0];
      const nomePac = selecionado?.full_name ?? novoNome;
      const pergunta = repetir === "nao"
        ? `${nomePac} tem ${p0.saldo} sessão(ões) no ${p0.package_name}.\n\nUsar uma sessão do pacote neste atendimento?`
        : `${nomePac} tem ${p0.saldo} sessão(ões) no ${p0.package_name}.\n\nUsar o pacote nas primeiras sessões desta série?`;
      if (window.confirm(pergunta)) { pacoteId = p0.id; saldoPacote = p0.saldo; }
    }

    const duracaoMs = (s.duration_minutes + s.buffer_after_minutes) * 60000;

    // ── Atendimento único (como antes) ──
    if (repetir === "nao") {
      const { data: conflitos } = await supabase.rpc("find_conflicts", {
        p_professional: prof, p_starts: inicio.toISOString(), p_ends: fim.toISOString(), p_service: svc,
      });
      if (conflitos && conflitos.length > 0) {
        const txt = (conflitos as { patient_name: string; service_name: string; starts_at: string }[])
          .map((c) => `${fmtTime(c.starts_at)} ${c.patient_name} (${c.service_name})`).join("\n");
        const ok = window.confirm(`Este horário já tem atendimento marcado:\n\n${txt}\n\nMarcar mesmo assim, em paralelo?`);
        if (!ok) { setSalvando(false); return; }
      }
      const { error: e2 } = await supabase.from("appointments").insert({
        clinic_id: clinicId, patient_id: pacienteId, professional_id: prof, service_id: svc,
        starts_at: inicio.toISOString(), ends_at: fim.toISOString(), patient_package_id: pacoteId,
        status: "confirmed", source: "panel", price_cents: pacoteId ? 0 : s.price_cents, confirmed_at: new Date().toISOString(),
      });
      setSalvando(false);
      if (e2) return setErro(e2.message);
      onSaved();
      return;
    }

    // ── Horário fixo: cria todas as sessões da série ──
    if (datasSerie.length < 2) { setSalvando(false); return setErro("A série precisa ter pelo menos 2 sessões. Ajuste os dias, a quantidade ou a data final."); }

    const ultimaFim = new Date(datasSerie[datasSerie.length - 1].getTime() + duracaoMs);
    const { data: blocos } = await supabase
      .from("availability_exceptions")
      .select("professional_id, starts_at, ends_at")
      .eq("clinic_id", clinicId).eq("type", "block")
      .lt("starts_at", ultimaFim.toISOString())
      .gt("ends_at", datasSerie[0].toISOString());

    const ocupadas: { d: Date; motivo: string }[] = [];
    const livres: Date[] = [];
    for (const d of datasSerie) {
      const f = new Date(d.getTime() + duracaoMs);
      const bloqueado = ((blocos ?? []) as { professional_id: string | null; starts_at: string; ends_at: string }[])
        .some((b) => (!b.professional_id || b.professional_id === prof) && new Date(b.starts_at) < f && new Date(b.ends_at) > d);
      if (bloqueado) { ocupadas.push({ d, motivo: "horário bloqueado" }); continue; }
      const { data: conf } = await supabase.rpc("find_conflicts", {
        p_professional: prof, p_starts: d.toISOString(), p_ends: f.toISOString(), p_service: svc,
      });
      const c0 = (conf ?? []) as { patient_name: string }[];
      if (c0.length > 0) { ocupadas.push({ d, motivo: `já tem ${c0[0].patient_name}` }); continue; }
      livres.push(d);
    }

    if (livres.length === 0) { setSalvando(false); return setErro("Todas as datas da série já estão ocupadas ou bloqueadas."); }
    if (ocupadas.length > 0) {
      const txt = ocupadas.map((o) => `${o.d.toLocaleDateString("pt-BR")} (${o.motivo})`).join("\n");
      const ok = window.confirm(
        `${ocupadas.length} data(s) da série estão ocupadas:\n\n${txt}\n\nOK: marcar as outras ${livres.length} sessões e pular essas datas.\nCancelar: voltar e ajustar.`
      );
      if (!ok) { setSalvando(false); return; }
    }

    const serie = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
          (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16));
    const agoraISO = new Date().toISOString();
    const linhas = livres.map((d, i) => {
      const usaPacote = !!pacoteId && i < saldoPacote;
      return {
        clinic_id: clinicId, patient_id: pacienteId, professional_id: prof, service_id: svc,
        starts_at: d.toISOString(), ends_at: new Date(d.getTime() + duracaoMs).toISOString(),
        patient_package_id: usaPacote ? pacoteId : null,
        status: "confirmed", source: "panel", price_cents: usaPacote ? 0 : s.price_cents,
        confirmed_at: agoraISO, recurrence_id: serie,
      };
    });
    const { error: e3 } = await supabase.from("appointments").insert(linhas);
    setSalvando(false);
    if (e3) return setErro(e3.message);
    window.alert(`${linhas.length} sessões marcadas, até ${livres[livres.length - 1].toLocaleDateString("pt-BR")}.${ocupadas.length ? ` ${ocupadas.length} data(s) puladas.` : ""}`);
    onSaved();
  }

  const podeS = selecionado || (modoNovo && novoNome.trim());

  return (
    <div className="space-y-3 rounded-xl bg-white p-4">
      <p className="font-bold">Novo atendimento</p>

      {/* Busca de paciente */}
      {!selecionado && !modoNovo && (
        <div className="relative">
          <label className="label">Paciente</label>
          <input
            className="field w-full"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Digite o nome, CPF ou telefone"
            autoFocus
          />
          {carregandoPac && <p className="mt-1 text-xs text-ink/50">Carregando pacientes...</p>}
          {resultados.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-ink/10 bg-white shadow-lg">
              {resultados.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-paper"
                    onClick={() => escolher(p)}
                  >
                    <span className="font-semibold">{p.full_name}</span>
                    {p.phone && <span className="ml-2 text-ink/50">{p.phone}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {busca.trim().length >= 1 && !carregandoPac && resultados.length === 0 && (
            <p className="mt-1 text-xs text-ink/50">Nenhum paciente encontrado.</p>
          )}
          <button
            type="button"
            className="mt-2 text-sm text-moss underline underline-offset-4"
            onClick={iniciarNovo}
          >
            Cadastrar novo paciente
          </button>
        </div>
      )}

      {/* Paciente selecionado */}
      {selecionado && (
        <div>
          <label className="label">Paciente</label>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{selecionado.full_name}</span>
            {selecionado.phone && <span className="text-sm text-ink/50">{selecionado.phone}</span>}
            <button type="button" className="ml-auto text-sm text-ink/50 underline" onClick={limpar}>Trocar</button>
          </div>
        </div>
      )}

      {/* Cadastro de novo paciente */}
      {modoNovo && (
        <>
          <div>
            <label className="label">Nome do paciente</label>
            <input className="field w-full" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">WhatsApp <span className="font-normal text-ink/50">(opcional)</span></label>
            <input className="field w-full" value={novoFone} onChange={(e) => setNovoFone(e.target.value)} placeholder="33999990000" />
          </div>
          <button type="button" className="text-sm text-ink/50 underline" onClick={limpar}>Voltar para busca</button>
        </>
      )}

      <div><label className="label">Serviço</label>
        <select className="field w-full" value={svc} onChange={(e) => setSvc(e.target.value)}>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min{s.max_participants > 1 ? `, ${s.max_participants} vagas` : ""})</option>)}
        </select>
      </div>
      <div><label className="label">Profissional</label>
        <select className="field w-full" value={prof} onChange={(e) => setProf(e.target.value)}>
          {professionals.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">Data</label><input type="date" className="field" value={data} onChange={(e) => setData(e.target.value)} /></div>
        <div><label className="label">Hora</label><input type="time" className="field" value={hora} onChange={(e) => setHora(e.target.value)} step={300} /></div>
      </div>
      <div>
        <label className="label">Repetir</label>
        <select className="field w-full" value={repetir} onChange={(e) => setRepetir(e.target.value as "nao" | "semanal" | "quinzenal")}>
          <option value="nao">Não repetir</option>
          <option value="semanal">Toda semana (horário fixo)</option>
          <option value="quinzenal">A cada 2 semanas</option>
        </select>
      </div>
      {repetir !== "nao" && (
        <div className="space-y-3 rounded-lg border border-ink/10 p-3">
          <div>
            <label className="label">Dias da semana</label>
            <div className="flex flex-wrap gap-1">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <button key={d} type="button" onClick={() => alternarDia(d)}
                  className={`rounded-lg border px-2.5 py-1.5 text-sm font-semibold ${diasSemana.includes(d) ? "border-moss bg-moss text-white" : "border-ink/15 bg-white text-ink/70"}`}>
                  {NOMES_DIA[d]}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-ink/50">Marque todos os dias em que a paciente é atendida, no mesmo horário.</p>
          </div>

          <div>
            <label className="label">Terminar</label>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="terminar" checked={terminar === "sessoes"} onChange={() => setTerminar("sessoes")} />
                depois de
                <input type="number" min={2} max={52} className="field w-20 py-1" value={qtdSessoes}
                  onChange={(e) => { setTerminar("sessoes"); setQtdSessoes(Math.max(1, Math.min(52, Number(e.target.value) || 1))); }} />
                sessões
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="terminar" checked={terminar === "data"} onChange={() => setTerminar("data")} />
                na data
                <input type="date" className="field py-1" value={ateData} min={data}
                  onChange={(e) => { setTerminar("data"); setAteData(e.target.value); }} />
              </label>
            </div>
            {saldoInfo && (
              <p className="mt-1 text-xs font-semibold text-moss">
                {saldoInfo.nome}: {saldoInfo.saldo} {saldoInfo.saldo === 1 ? "sessão restante" : "sessões restantes"}.
              </p>
            )}
          </div>

          <p className="rounded-lg bg-paper px-3 py-2 text-xs text-ink/70">
            {resumoSerie(datasSerie, diasSemana, repetir, hora)}
          </p>
        </div>
      )}
      {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
      <div className="flex gap-2">
        <button className="btn-primary flex-1" onClick={salvar} disabled={salvando || !podeS || !svc || !prof}>Salvar</button>
        <button className="btn-ghost" onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}

/* ── Bloquear horário no dia aberto na agenda ───────────────── */

function BloquearHorario({ clinicId, dia, professionals, atendimentos, onClose, onSaved }: {
  clinicId: string; dia: Date; professionals: Prof[]; atendimentos: Appt[];
  onClose: () => void; onSaved: () => void;
}) {
  const supabase = createClient();
  const [diaInteiro, setDiaInteiro] = useState(false);
  const [das, setDas] = useState("14:00");
  const [ate, setAte] = useState("15:00");
  const [prof, setProf] = useState<string>(professionals.length === 1 ? professionals[0].id : "todos");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const data = toISODate(dia);
  const inicio = diaInteiro ? new Date(`${data}T00:00:00`) : new Date(`${data}T${das}:00`);
  const fim = diaInteiro
    ? (() => { const f = new Date(`${data}T00:00:00`); f.setDate(f.getDate() + 1); return f; })()
    : new Date(`${data}T${ate}:00`);

  // atendimentos marcados dentro do intervalo (o bloqueio não desmarca ninguém)
  const afetados = atendimentos.filter((a) =>
    new Date(a.starts_at) < fim && new Date(a.ends_at) > inicio &&
    (prof === "todos" || professionals.find((p) => p.id === prof)?.display_name === a.professionals?.display_name)
  );

  async function salvar() {
    setErro(null);
    if (!diaInteiro && fim <= inicio) return setErro("O horário final precisa ser depois do inicial.");
    setSalvando(true);
    const { error } = await supabase.from("availability_exceptions").insert({
      clinic_id: clinicId,
      professional_id: prof === "todos" ? null : prof,
      starts_at: inicio.toISOString(),
      ends_at: fim.toISOString(),
      type: "block",
      reason: motivo.trim() || null,
    });
    setSalvando(false);
    if (error) return setErro(error.message);
    onSaved();
  }

  return (
    <div className="space-y-3 rounded-xl bg-white p-4">
      <p className="font-bold">Bloquear horário</p>
      <p className="text-xs text-ink/60">
        {dia.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}. O link público deixa de oferecer esse intervalo.
      </p>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" checked={diaInteiro} onChange={(e) => setDiaInteiro(e.target.checked)} />
        Bloquear o dia inteiro
      </label>

      {!diaInteiro && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Das</label>
            <input type="time" className="field" value={das} onChange={(e) => setDas(e.target.value)} />
          </div>
          <div>
            <label className="label">Até</label>
            <input type="time" className="field" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
        </div>
      )}

      {professionals.length > 1 && (
        <div>
          <label className="label">Quem fica bloqueado</label>
          <select className="field" value={prof} onChange={(e) => setProf(e.target.value)}>
            <option value="todos">Toda a clínica</option>
            {professionals.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="label">Motivo (opcional, só a clínica vê)</label>
        <input className="field" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Consulta médica, reunião..." />
      </div>

      {afetados.length > 0 && (
        <p className="rounded-lg bg-amber/20 px-3 py-2 text-xs">
          Já existe {afetados.length === 1 ? "1 atendimento marcado" : `${afetados.length} atendimentos marcados`} nesse intervalo.
          O bloqueio não desmarca ninguém; remarque ou cancele pela agenda se precisar.
        </p>
      )}
      {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}

      <div className="flex gap-2">
        <button className="btn-primary flex-1" onClick={salvar} disabled={salvando}>
          {salvando ? "Bloqueando..." : "Bloquear"}
        </button>
        <button className="btn-ghost" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

/* ── Datas de uma série (horário fixo) ──────────────────────── */

const NOMES_DIA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const NOMES_DIA_LONGO = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function calcularDatas(
  data: string, hora: string, repetir: "nao" | "semanal" | "quinzenal",
  opt: { ateData: string; dias: number[]; terminar: "sessoes" | "data"; qtd: number },
): Date[] {
  const inicio = new Date(`${data}T${hora}:00`);
  if (Number.isNaN(inicio.getTime())) return [];
  if (repetir === "nao") return [inicio];
  const dias = opt.dias.length ? opt.dias : [inicio.getDay()];
  const maximo = opt.terminar === "sessoes" ? Math.max(1, Math.min(52, opt.qtd)) : 52;
  const limite = opt.terminar === "data" ? new Date(`${opt.ateData}T23:59:59`) : null;
  const semana0 = inicioSemana(inicio).getTime();
  const datas: Date[] = [];
  for (let k = 0; k < 800 && datas.length < maximo; k++) {
    const d = new Date(inicio);
    d.setDate(d.getDate() + k);
    if (limite && d > limite) break;
    if (!dias.includes(d.getDay())) continue;
    if (repetir === "quinzenal") {
      const semanas = Math.round((inicioSemana(d).getTime() - semana0) / (7 * 86400000));
      if (semanas % 2 !== 0) continue;
    }
    datas.push(d);
  }
  return datas;
}

function resumoSerie(datas: Date[], dias: number[], repetir: "nao" | "semanal" | "quinzenal", hora: string) {
  if (datas.length === 0) return "Nenhuma sessão nesse período.";
  const ordem = [1, 2, 3, 4, 5, 6, 0].filter((d) => dias.includes(d)).map((d) => NOMES_DIA_LONGO[d]);
  const lista = ordem.length > 1 ? `${ordem.slice(0, -1).join(", ")} e ${ordem[ordem.length - 1]}` : ordem[0];
  const freq = repetir === "quinzenal" ? "a cada 2 semanas" : "toda semana";
  const ini = datas[0].toLocaleDateString("pt-BR");
  const fim = datas[datas.length - 1].toLocaleDateString("pt-BR");
  return `${datas.length} ${datas.length === 1 ? "sessão" : "sessões"}, ${freq} na ${lista} às ${hora}, de ${ini} até ${fim}.`;
}

/* ── Visão semanal ──────────────────────────────────────────── */

function inicioSemana(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // segunda-feira
  return x;
}

function tituloSemana(d: Date) {
  const ini = inicioSemana(d);
  const fim = new Date(ini); fim.setDate(fim.getDate() + 6);
  const mes = (x: Date) => x.toLocaleDateString("pt-BR", { month: "long" });
  return ini.getMonth() === fim.getMonth()
    ? `${ini.getDate()} a ${fim.getDate()} de ${mes(fim)}`
    : `${ini.getDate()} de ${mes(ini)} a ${fim.getDate()} de ${mes(fim)}`;
}

type ApptSemana = {
  id: string; starts_at: string; ends_at: string; status: string; color: string | null; recurrence_id: string | null;
  patients: { full_name: string } | null; services: { name: string } | null; professionals: { display_name: string } | null;
};

function SemanaAgenda({ clinicId, dia, tz, versao, mostrarCancelados, onAbrirDia }: {
  clinicId: string; dia: Date; tz: string; versao: number; mostrarCancelados: boolean; onAbrirDia: (d: Date) => void;
}) {
  const supabase = createClient();
  const [itens, setItens] = useState<ApptSemana[]>([]);
  const [blocos, setBlocos] = useState<Bloqueio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const ini = useMemo(() => inicioSemana(dia), [dia]);
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(ini); d.setDate(d.getDate() + i); return d; }), [ini]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setCarregando(true);
      const fim = new Date(ini); fim.setDate(fim.getDate() + 7);
      const [{ data: ap }, { data: bl }] = await Promise.all([
        supabase.from("appointments")
          .select("id, starts_at, ends_at, status, color, recurrence_id, patients(full_name), services(name), professionals(display_name)")
          .eq("clinic_id", clinicId)
          .gte("starts_at", ini.toISOString()).lt("starts_at", fim.toISOString())
          .order("starts_at"),
        supabase.from("availability_exceptions")
          .select("id, professional_id, starts_at, ends_at, reason")
          .eq("clinic_id", clinicId).eq("type", "block")
          .lt("starts_at", fim.toISOString()).gt("ends_at", ini.toISOString()),
      ]);
      if (!ativo) return;
      setItens((ap as unknown as ApptSemana[]) ?? []);
      setBlocos((bl as Bloqueio[]) ?? []);
      setCarregando(false);
    })();
    return () => { ativo = false; };
  }, [ini, clinicId, versao]); // eslint-disable-line react-hooks/exhaustive-deps

  const hoje = toISODate(new Date());
  const cancelados = ["cancelled_by_patient", "cancelled_by_clinic"];

  return (
    <div className="mt-6">
      {carregando && <p className="mb-2 text-sm text-ink/60">Carregando</p>}
      <div className="grid gap-2 md:grid-cols-7">
        {dias.map((d) => {
          const chave = toISODate(d);
          const doDia = itens.filter((a) => toISODate(new Date(a.starts_at)) === chave && (mostrarCancelados || !cancelados.includes(a.status)));
          const ativos = doDia.filter((a) => !cancelados.includes(a.status));
          const fimDia = new Date(d); fimDia.setDate(fimDia.getDate() + 1);
          const blocosDia = blocos.filter((b) => new Date(b.starts_at) < fimDia && new Date(b.ends_at) > d);
          return (
            <div key={chave} className={`rounded-xl bg-white p-2 ${chave === hoje ? "ring-2 ring-moss" : ""}`}>
              <button className="w-full rounded-lg px-1 py-1 text-left hover:bg-paper" onClick={() => onAbrirDia(new Date(`${chave}T12:00:00`))}>
                <p className="text-xs capitalize text-ink/60">{d.toLocaleDateString("pt-BR", { weekday: "short" })}</p>
                <p className="text-lg font-extrabold leading-tight">{d.getDate()}</p>
                <p className="text-xs text-ink/50">{ativos.length} {ativos.length === 1 ? "atendimento" : "atendimentos"}</p>
              </button>
              <div className="mt-1 space-y-1">
                {blocosDia.map((b) => {
                  const diaInteiro = new Date(b.starts_at) <= d && new Date(b.ends_at) >= fimDia;
                  return (
                    <p key={b.id} className="rounded-md border border-dashed border-ink/25 bg-ink/5 px-1.5 py-1 text-[11px] text-ink/70">
                      🚫 {diaInteiro ? "Dia bloqueado" : `${fmtTime(b.starts_at, tz)} a ${fmtTime(b.ends_at, tz)}`}
                    </p>
                  );
                })}
                {doDia.map((a) => {
                  const cancelado = cancelados.includes(a.status);
                  const cor = a.color ? CORES[a.color] : null;
                  return (
                    <button
                      key={a.id}
                      onClick={() => onAbrirDia(new Date(`${chave}T12:00:00`))}
                      className={`block w-full rounded-md bg-paper px-1.5 py-1 text-left text-[11px] leading-tight ${cor ? `border-l-4 ${cor.borda}` : ""} ${cancelado ? "line-through opacity-50" : ""}`}
                    >
                      <span className="font-bold">{fmtTime(a.starts_at, tz)}</span>{" "}
                      {a.patients?.full_name?.split(" ").slice(0, 2).join(" ")}
                      <span className="block text-ink/60">{a.services?.name}{a.recurrence_id ? " · fixo" : ""}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

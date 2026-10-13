"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Prof = {
  id: string; user_id: string | null; display_name: string; crefito: string | null; crefito_region: string | null;
  specialties: string[] | null; bio: string | null; phone: string | null; email: string | null;
  color: string | null; visible_online: boolean; active: boolean; sort_order: number | null;
};
type Convite = { id: string; professional_id: string; email: string; role: string; token: string; expires_at: string };
type Membro = { user_id: string; role: string; active: boolean };

type Form = {
  display_name: string; crefito: string; crefito_region: string; specialties: string; bio: string;
  phone: string; email: string; color: string; visible_online: boolean;
};

const CORES = ["#14584c", "#2563eb", "#9333ea", "#db2777", "#ea580c", "#ca8a04", "#0891b2", "#475569"];

const vazio: Form = {
  display_name: "", crefito: "", crefito_region: "", specialties: "", bio: "",
  phone: "", email: "", color: CORES[0], visible_online: true,
};

const SITE = "https://agendafisiopro.com.br";

function dataBR(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function traduzErro(msg: string) {
  if (msg.includes("Seu plano permite")) return msg;
  if (msg.includes("duplicate")) return "Já existe um cadastro igual.";
  return msg;
}

export function Profissionais({ clinicId, isOwner, meuUserId, limite, inicial, convitesIniciais, membros }: {
  clinicId: string; isOwner: boolean; meuUserId: string; limite: number | null;
  inicial: Prof[]; convitesIniciais: Convite[]; membros: Membro[];
}) {
  const supabase = createClient();
  const [lista, setLista] = useState<Prof[]>(inicial);
  const [convites, setConvites] = useState<Convite[]>(convitesIniciais);
  const [mapaMembros, setMapaMembros] = useState<Membro[]>(membros);
  const [form, setForm] = useState<Form>(vazio);
  const [editando, setEditando] = useState<string | null>(null);
  const [abrirForm, setAbrirForm] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [convidando, setConvidando] = useState<string | null>(null);
  const [emailConvite, setEmailConvite] = useState("");
    const [linkGerado, setLinkGerado] = useState<{ profId: string; link: string; email: string; enviado: boolean } | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const ativos = lista.filter((p) => p.active);
  const noLimite = limite !== null && ativos.length >= limite;

  async function recarregar() {
    const [{ data: profs }, { data: convs }, { data: membs }] = await Promise.all([
      supabase.from("professionals")
        .select("id, user_id, display_name, crefito, crefito_region, specialties, bio, phone, email, color, visible_online, active, sort_order")
        .eq("clinic_id", clinicId)
        .order("active", { ascending: false }).order("sort_order").order("display_name"),
      supabase.from("clinic_invites")
        .select("id, professional_id, email, role, token, expires_at")
        .eq("clinic_id", clinicId).is("accepted_at", null).is("revoked_at", null)
        .gt("expires_at", new Date().toISOString()),
      supabase.from("clinic_members").select("user_id, role, active").eq("clinic_id", clinicId),
    ]);
    setLista((profs as Prof[]) ?? []);
    setConvites((convs as Convite[]) ?? []);
    setMapaMembros((membs as Membro[]) ?? []);
  }

  function novo() {
    setEditando(null);
    setForm(vazio);
    setErro(null);
    setAviso(null);
    setAbrirForm(true);
  }

  function editar(p: Prof) {
    setEditando(p.id);
    setErro(null);
    setAviso(null);
    setForm({
      display_name: p.display_name ?? "",
      crefito: p.crefito ?? "",
      crefito_region: p.crefito_region ?? "",
      specialties: (p.specialties ?? []).join(", "),
      bio: p.bio ?? "",
      phone: p.phone ?? "",
      email: p.email ?? "",
      color: p.color ?? CORES[0],
      visible_online: p.visible_online,
    });
    setAbrirForm(true);
  }

  function cancelarForm() {
    setAbrirForm(false);
    setEditando(null);
    setForm(vazio);
  }

  async function salvar() {
    setErro(null);
    setAviso(null);
    if (form.display_name.trim().length < 2) return setErro("Informe o nome do profissional.");
    setSalvando(true);

    const payload = {
      display_name: form.display_name.trim(),
      crefito: form.crefito.trim() || null,
      crefito_region: form.crefito_region.trim() || null,
      specialties: form.specialties.split(",").map((s) => s.trim()).filter(Boolean),
      bio: form.bio.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim().toLowerCase() || null,
      color: form.color,
      visible_online: form.visible_online,
    };

    if (editando) {
      const { error } = await supabase.from("professionals").update(payload).eq("id", editando);
      setSalvando(false);
      if (error) return setErro(traduzErro(error.message));
      setAviso("Dados do profissional salvos.");
    } else {
      const ordem = Math.max(0, ...lista.map((p) => p.sort_order ?? 0)) + 1;
      const { data, error } = await supabase
        .from("professionals")
        .insert({ ...payload, clinic_id: clinicId, active: true, sort_order: ordem })
        .select("id")
        .single();
      setSalvando(false);
      if (error) return setErro(traduzErro(error.message));
      // E-mail preenchido no cadastro: já envia o convite de acesso
      if (payload.email && data?.id) {
        await enviarConvite(data.id, payload.email, "professional");
      } else {
        setAviso("Profissional cadastrado. Para ele aparecer na página de agendamento, configure os horários dele em Horários.");
      }
    }
    cancelarForm();
    recarregar();
  }

  async function enviarConvite(profId: string, email: string, role: "professional" | "receptionist") {
    setErro(null);
    setOcupado(profId);
    const { data, error } = await supabase.functions.invoke("send-professional-invite", {
      body: { professional_id: profId, email, role },
    });
    setOcupado(null);
    if (error || data?.error) {
      let msg = data?.error ?? error?.message ?? "Não foi possível criar o convite.";
      try { const ctx = await (error as { context?: Response })?.context?.json(); if (ctx?.error) msg = ctx.error; } catch { /* ignore */ }
      setErro(msg);
      return;
    }
    setLinkGerado({ profId, link: data.link, email: email.toLowerCase(), enviado: !!data.email_enviado });
    setConvidando(null);
    setEmailConvite("");
    recarregar();
  }

  async function cancelarConvite(id: string) {
    setOcupado(id);
    const { error } = await supabase.rpc("revoke_professional_invite", { p_invite: id });
    setOcupado(null);
    if (error) return setErro(error.message);
    setLinkGerado(null);
    recarregar();
  }

  async function alternarAtivo(p: Prof) {
    setErro(null);
    setAviso(null);
    if (p.active && !confirm(`Desativar ${p.display_name}? Ele sai da agenda e da página de agendamento e perde o acesso ao painel. Atendimentos e documentos ficam guardados.`)) return;
    setOcupado(p.id);
    const { error } = await supabase.rpc("set_professional_active", { p_professional: p.id, p_active: !p.active });
    setOcupado(null);
    if (error) return setErro(traduzErro(error.message));
    recarregar();
  }

  async function copiar(texto: string) {
    try { await navigator.clipboard.writeText(texto); setAviso("Link copiado."); } catch { setAviso(texto); }
  }

  function papelDe(p: Prof) {
    if (!p.user_id) return null;
    return mapaMembros.find((m) => m.user_id === p.user_id) ?? null;
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_380px]">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="h-title text-3xl">Profissionais</h1>
            <p className="mt-1 text-ink/70">
              Quem atende na clínica. Cada profissional tem agenda e horários próprios e pode receber acesso ao painel.
            </p>
          </div>
          {isOwner && (
            <button className="btn-primary" onClick={novo} disabled={noLimite}>
              Adicionar profissional
            </button>
          )}
        </div>

        <p className="mt-3 text-sm text-ink/60">
          {ativos.length} {ativos.length === 1 ? "profissional ativo" : "profissionais ativos"}
          {limite !== null ? ` de ${limite} do seu plano` : " (sem limite no seu plano)"}
        </p>
        {isOwner && noLimite && (
          <p className="mt-2 rounded-lg bg-amber/20 px-3 py-2 text-sm">
            Seu plano chegou ao limite de profissionais.{" "}
            <Link href="/painel/assinatura" className="font-semibold underline underline-offset-4">Fazer upgrade</Link>{" "}
            para adicionar mais.
          </p>
        )}
        {!isOwner && (
          <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm text-ink/70">
            Apenas o dono da clínica pode adicionar, editar ou convidar profissionais.
          </p>
        )}

        {erro && <p className="mt-4 rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
        {aviso && <p className="mt-4 rounded-lg bg-white px-3 py-2 text-sm text-moss-deep">{aviso}</p>}

        <div className="mt-6 space-y-3">
          {lista.map((p) => {
            const membro = papelDe(p);
            const convite = convites.find((c) => c.professional_id === p.id) ?? null;
            const souEu = p.user_id === meuUserId;
            const ehDono = membro?.role === "owner";
            const comAcesso = !!membro && membro.active;

            return (
              <div key={p.id} className={`rounded-xl bg-white p-4 ${p.active ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 size-3 shrink-0 rounded-full" style={{ background: p.color ?? CORES[0] }} aria-hidden="true" />
                    <div>
                      <p className="font-bold">
                        {p.display_name}
                        {souEu && <span className="ml-2 text-xs font-semibold text-ink/50">(você)</span>}
                      </p>
                      <p className="text-sm text-ink/70">
                        {p.crefito ? `CREFITO ${p.crefito}${p.crefito_region ? `-${p.crefito_region}` : ""}` : "CREFITO não informado"}
                        {p.specialties && p.specialties.length > 0 ? ` · ${p.specialties.join(", ")}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
                        {!p.active && <span className="rounded bg-mist px-1.5 py-0.5">Inativo</span>}
                        {ehDono && <span className="rounded bg-moss px-1.5 py-0.5 text-white">Dono</span>}
                        {comAcesso && !ehDono && (
                          <span className="rounded bg-moss/15 px-1.5 py-0.5 text-moss-deep">
                            Acesso ao painel
                          </span>
                        )}
                        {!comAcesso && convite && (
                          <span className="rounded bg-amber/25 px-1.5 py-0.5">
                            Convite enviado para {convite.email} · vale até {dataBR(convite.expires_at)}
                          </span>
                        )}
                        {!comAcesso && !convite && p.active && (
                          <span className="rounded bg-paper px-1.5 py-0.5 text-ink/60">Sem acesso ao painel</span>
                        )}
                        {p.active && !p.visible_online && (
                          <span className="rounded bg-paper px-1.5 py-0.5 text-ink/60">Oculto na página de agendamento</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isOwner && (
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-ghost text-sm" onClick={() => editar(p)}>Editar</button>
                      {p.active && !p.user_id && !convite && (
                        <button
                          className="btn-ghost text-sm"
                          onClick={() => { setConvidando(p.id); setEmailConvite(p.email ?? ""); setLinkGerado(null); }}
                        >
                          Dar acesso ao painel
                        </button>
                      )}
                      {!ehDono && (
                        <button
                          className={p.active ? "btn-danger text-sm" : "btn-ghost text-sm"}
                          onClick={() => alternarAtivo(p)}
                          disabled={ocupado === p.id || (!p.active && noLimite)}
                        >
                          {p.active ? "Desativar" : "Reativar"}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Convite pendente: copiar, WhatsApp, cancelar */}
                {isOwner && convite && !comAcesso && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-mist pt-3">
                    <button className="btn-ghost text-sm" onClick={() => copiar(`${SITE}/convite/${convite.token}`)}>Copiar link do convite</button>
                    <a
                      className="btn-ghost text-sm"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`https://wa.me/?text=${encodeURIComponent(`Olá, ${p.display_name}! Este é o seu convite para acessar o painel da clínica no Agenda Fisio Pro: ${SITE}/convite/${convite.token}`)}`}
                    >
                      Enviar pelo WhatsApp
                    </a>
                    <button className="btn-ghost text-sm" onClick={() => enviarConvite(p.id, convite.email, convite.role === "receptionist" ? "receptionist" : "professional")} disabled={ocupado === p.id}>
                      Reenviar e-mail
                    </button>
                    <button className="btn-danger text-sm" onClick={() => cancelarConvite(convite.id)} disabled={ocupado === convite.id}>
                      Cancelar convite
                    </button>
                  </div>
                )}

                {/* Formulário de convite */}
                {isOwner && convidando === p.id && (
                  <div className="mt-3 space-y-3 border-t border-mist pt-3">
                    <div>
                      <label className="label">E-mail do profissional</label>
                      <input className="field" type="email" value={emailConvite} onChange={(e) => setEmailConvite(e.target.value)} placeholder="nome@email.com" />
                      <p className="mt-1 text-xs text-ink/60">Ele precisa entrar ou criar a conta com este mesmo e-mail para aceitar.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn-primary"
                        onClick={() => enviarConvite(p.id, emailConvite, "professional")}
                        disabled={ocupado === p.id || !emailConvite.includes("@")}
                      >
                        {ocupado === p.id ? "Enviando..." : "Enviar convite"}
                      </button>
                      <button className="btn-ghost" onClick={() => setConvidando(null)}>Cancelar</button>
                    </div>
                  </div>
                )}

                {/* Resultado do convite recém-criado */}
                {linkGerado?.profId === p.id && (
                  <div className="mt-3 rounded-lg bg-paper p-3 text-sm">
                    <p className="font-semibold">
                      {linkGerado.enviado
                        ? `Convite enviado para ${linkGerado.email}.`
                        : `Convite criado. O e-mail não pôde ser enviado agora; mande o link abaixo para ${linkGerado.email}.`}
                    </p>
                    <p className="mt-1 break-all text-ink/70">{linkGerado.link}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-sm text-ink/60">
          Depois de cadastrar, configure os dias e horários de cada profissional em{" "}
          <Link href="/painel/horarios" className="font-semibold underline underline-offset-4">Horários</Link>.
          Sem horários, ele não aparece para o paciente agendar.
        </p>
      </section>

      {/* Formulário de cadastro e edição */}
      {isOwner && abrirForm && (
        <aside className="h-fit space-y-4 rounded-xl bg-white p-5">
          <p className="font-bold">{editando ? "Editar profissional" : "Novo profissional"}</p>

          <div>
            <label className="label">Nome (como o paciente vê)</label>
            <input className="field" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Dra. Ana Souza" />
          </div>
          <div className="grid grid-cols-[1fr_90px] gap-2">
            <div>
              <label className="label">CREFITO</label>
              <input className="field" value={form.crefito} onChange={(e) => setForm({ ...form, crefito: e.target.value })} placeholder="123456-F" />
            </div>
            <div>
              <label className="label">Região</label>
              <input className="field" value={form.crefito_region} onChange={(e) => setForm({ ...form, crefito_region: e.target.value })} placeholder="4" />
            </div>
          </div>
          <div>
            <label className="label">Especialidades</label>
            <input className="field" value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} placeholder="Ortopedia, Pilates" />
            <p className="mt-1 text-xs text-ink/60">Separe por vírgula.</p>
          </div>
          <div>
            <label className="label">Sobre (aparece na página de agendamento)</label>
            <textarea className="field" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Celular</label>
              <input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="33 99999 0000" />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          {!editando && (
            <p className="-mt-2 text-xs text-ink/60">Com e-mail preenchido, o convite de acesso ao painel já é enviado ao salvar.</p>
          )}
          <div>
            <label className="label">Cor na agenda</label>
            <div className="flex flex-wrap gap-2">
              {CORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`size-8 rounded-full border-2 ${form.color === c ? "border-ink" : "border-transparent"}`}
                  style={{ background: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" checked={form.visible_online} onChange={(e) => setForm({ ...form, visible_online: e.target.checked })} />
            Aparece na página de agendamento online
          </label>

          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar"}
            </button>
            <button className="btn-ghost" onClick={cancelarForm}>Cancelar</button>
          </div>
        </aside>
      )}
    </div>
  );
}

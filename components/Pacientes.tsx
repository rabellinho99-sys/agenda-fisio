"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type P = { id: string; full_name: string; phone: string; birth_date: string | null; tags: string[] | null; sessoes: number; ultimo_atendimento: string | null; ultima_dor: number | null; saldo_pacotes: number };

export function Pacientes({ clinicId, inicial }: { clinicId: string; inicial: P[] }) {
  const supabase = createClient();
  const [lista, setLista] = useState(inicial);
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", birth_date: "", cpf: "" });
  const [erro, setErro] = useState<string | null>(null);

  const filtrada = lista.filter((p) => {
    const q = busca.toLowerCase();
    return p.full_name.toLowerCase().includes(q) || p.phone.includes(q.replace(/\D/g, "") || "\u0000");
  });

  async function salvar() {
    setErro(null);
    const { data, error } = await supabase.from("patients").insert({
      clinic_id: clinicId, full_name: form.full_name, phone: form.phone.replace(/\D/g, ""),
      birth_date: form.birth_date || null, cpf: form.cpf.replace(/\D/g, "") || null, referral_source: "panel",
    }).select("id").single();
    if (error) return setErro(error.message.includes("patients_clinic_id_phone_key") ? "Já existe paciente com esse telefone." : error.message);
    const { data: s } = await supabase.from("patient_summary").select("*").eq("id", data!.id).single();
    if (s) setLista([s as P, ...lista]);
    setNovo(false); setForm({ full_name: "", phone: "", birth_date: "", cpf: "" });
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="h-title text-3xl">Pacientes</h1>
            <p className="mt-1 text-ink/70">{lista.length} cadastrados</p>
          </div>
          <input className="field max-w-xs" placeholder="Buscar por nome ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="mt-6 space-y-2">
          {filtrada.length === 0 && <p className="text-sm text-ink/60">Nenhum paciente encontrado.</p>}
          {filtrada.map((p) => (
            <Link key={p.id} href={`/painel/pacientes/${p.id}`} className="grid gap-2 rounded-xl bg-white p-4 hover:ring-2 hover:ring-moss/30 md:grid-cols-[1fr_auto_auto_auto_auto]">
              <div>
                <p className="font-semibold">{p.full_name}</p>
                <p className="text-sm text-ink/60">{p.phone}{p.birth_date ? ` · ${idade(p.birth_date)} anos` : ""}</p>
              </div>
              <Stat label="Sessões" valor={String(p.sessoes)} />
              <Stat label="Última EVA" valor={p.ultima_dor == null ? "-" : String(p.ultima_dor)} />
              <Stat label="Saldo" valor={p.saldo_pacotes > 0 ? `${p.saldo_pacotes} sessões` : "-"} />
              <Stat label="Último" valor={p.ultimo_atendimento ? new Date(p.ultimo_atendimento).toLocaleDateString("pt-BR") : "-"} />
            </Link>
          ))}
        </div>
      </section>

      <aside>
        {!novo ? (
          <button className="btn-primary w-full" onClick={() => setNovo(true)}>Novo paciente</button>
        ) : (
          <div className="space-y-3 rounded-xl bg-white p-4">
            <p className="font-bold">Novo paciente</p>
            <div><label className="label">Nome completo</label><input className="field" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><label className="label">WhatsApp</label><input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="33999990000" /></div>
            <div><label className="label">Nascimento</label><input type="date" className="field" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
            <div><label className="label">CPF (opcional)</label><input className="field" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></div>
            {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={salvar} disabled={form.full_name.length < 3 || form.phone.replace(/\D/g, "").length < 10}>Salvar</button>
              <button className="btn-ghost" onClick={() => setNovo(false)}>Fechar</button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function Stat({ label, valor }: { label: string; valor: string }) {
  return <div className="text-left md:text-right"><p className="text-xs text-ink/50">{label}</p><p className="font-semibold">{valor}</p></div>;
}

export function idade(iso: string) {
  const n = new Date(iso); const h = new Date();
  let a = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) a--;
  return a;
}

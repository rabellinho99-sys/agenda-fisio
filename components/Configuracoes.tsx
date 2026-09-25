"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type BookingSettings = {
  auto_confirm?: boolean;
  deposit_percent?: number;
  require_deposit?: boolean;
  max_advance_days?: number;
  min_advance_hours?: number;
  slot_interval_minutes?: number;
  allow_patient_cancel_hours?: number;
};
type Clinic = { id: string; name: string; logo_url: string | null; brand_color: string | null; booking_settings: BookingSettings | null };

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const LIMITE_MB = 3;

export function Configuracoes({ clinic }: { clinic: Clinic }) {
  const supabase = createClient();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState(clinic.logo_url);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [autoConfirm, setAutoConfirm] = useState(clinic.booking_settings?.auto_confirm ?? true);
  const [salvandoConfirmacao, setSalvandoConfirmacao] = useState(false);
  const [msgConfirmacao, setMsgConfirmacao] = useState<string | null>(null);

  function clicarUpload() {
    inputRef.current?.click();
  }

  async function selecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!TIPOS_ACEITOS.includes(file.type)) {
      setErro("Formato não suportado. Use JPG, PNG ou WebP.");
      return;
    }
    if (file.size > LIMITE_MB * 1024 * 1024) {
      setErro(`A imagem deve ter no máximo ${LIMITE_MB} MB.`);
      return;
    }
    setErro(null);
    setEnviando(true);

    const ext = file.name.split(".").pop() ?? "png";
    const path = `${clinic.id}/logo.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("clinic-logos")
      .upload(path, file, { contentType: file.type, upsert: true });

    if (uploadErr) {
      setEnviando(false);
      setErro(`Erro ao enviar: ${uploadErr.message}`);
      return;
    }

    const { data: pub } = supabase.storage.from("clinic-logos").getPublicUrl(path);
    const urlComCache = `${pub.publicUrl}?v=${Date.now()}`;

    const { error: dbErr } = await supabase.from("clinics").update({ logo_url: urlComCache }).eq("id", clinic.id);

    setEnviando(false);
    if (dbErr) return setErro(dbErr.message);

    setLogoUrl(urlComCache);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function remover() {
    if (!confirm("Remover a logomarca? A clínica voltará a aparecer sem logo nas páginas e documentos.")) return;
    const { error } = await supabase.from("clinics").update({ logo_url: null }).eq("id", clinic.id);
    if (error) return setErro(error.message);
    setLogoUrl(null);
    router.refresh();
  }

  async function salvarConfirmacao(valor: boolean) {
    setSalvandoConfirmacao(true);
    setMsgConfirmacao(null);
    const novasConfig = { ...(clinic.booking_settings ?? {}), auto_confirm: valor };
    const { error } = await supabase.from("clinics").update({ booking_settings: novasConfig }).eq("id", clinic.id);
    setSalvandoConfirmacao(false);
    if (error) { setMsgConfirmacao(error.message); return; }
    setAutoConfirm(valor);
    setMsgConfirmacao("Salvo.");
    router.refresh();
  }

  return (
    <div>
      <h1 className="h-title text-3xl">Configurações</h1>
      <p className="mt-1 text-ink/70">Personalize a identidade e as regras de agendamento da sua clínica.</p>

      <div className="mt-6 rounded-xl bg-white p-6">
        <p className="font-bold">Logomarca</p>
        <p className="mt-1 text-sm text-ink/60">
          Aparece no link de agendamento público e nos documentos baixados pelo paciente (termos assinados, comprovantes).
        </p>

        <div className="mt-4 flex items-center gap-4">
          <button type="button"
            onClick={clicarUpload}
            className="group relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-mist bg-paper transition-colors hover:border-moss"
            aria-label="Enviar logomarca"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logomarca da clínica" className="size-full object-cover" />
            ) : (
              <svg className="size-8 text-ink/30" fill="none" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              </svg>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-ink/40 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="text-xs font-semibold text-white">{enviando ? "Enviando..." : "Alterar"}</span>
            </div>
          </button>

          <div>
            <button className="btn-ghost text-sm" onClick={clicarUpload} disabled={enviando}>
              {logoUrl ? "Alterar logo" : "Enviar logo"}
            </button>
            {logoUrl && (
              <button className="ml-2 text-sm text-ink/50 underline underline-offset-4" onClick={remover}>
                Remover
              </button>
            )}
            <p className="mt-2 text-xs text-ink/50">JPG, PNG ou WebP · até {LIMITE_MB} MB · formato quadrado fica melhor</p>
          </div>

          <input ref={inputRef} type="file" accept={TIPOS_ACEITOS.join(",")} className="hidden" onChange={selecionarArquivo} />
        </div>

        {erro && <p className="mt-3 rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
      </div>

      <div className="mt-6 rounded-xl bg-white p-6">
        <p className="font-bold">Confirmação de agendamentos</p>
        <p className="mt-1 text-sm text-ink/60">
          Define o que acontece quando um paciente marca um horário pelo link público.
        </p>

        <div className="mt-4 space-y-2">
          <label className="flex items-start gap-3 rounded-lg border border-mist p-3 cursor-pointer has-[:checked]:border-moss has-[:checked]:bg-moss/5">
            <input type="radio" name="auto_confirm" className="mt-1" checked={autoConfirm === true}
              onChange={() => salvarConfirmacao(true)} disabled={salvandoConfirmacao} />
            <span>
              <span className="block font-semibold">Confirmação automática</span>
              <span className="block text-sm text-ink/60">O horário reservado pelo paciente já entra confirmado na agenda.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-mist p-3 cursor-pointer has-[:checked]:border-moss has-[:checked]:bg-moss/5">
            <input type="radio" name="auto_confirm" className="mt-1" checked={autoConfirm === false}
              onChange={() => salvarConfirmacao(false)} disabled={salvandoConfirmacao} />
            <span>
              <span className="block font-semibold">Confirmação manual (recomendado)</span>
              <span className="block text-sm text-ink/60">
                O horário fica reservado como "Aguardando confirmação" e só é garantido quando você autoriza na Agenda. Reduz faltas e trotes.
              </span>
            </span>
          </label>
        </div>

        {msgConfirmacao && <p className="mt-3 text-sm text-ink/60">{msgConfirmacao}</p>}
      </div>
    </div>
  );
}

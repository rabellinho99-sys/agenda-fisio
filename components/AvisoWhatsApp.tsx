"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Aviso no topo do painel para clínicas que ainda não informaram WhatsApp.
// Some sozinho depois que o número é salvo.

function soDigitos(v: string) {
  let d = v.replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  return d.slice(0, 11);
}

function mascaraWhats(v: string) {
  const d = soDigitos(v);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function whatsValido(v: string) {
  const d = soDigitos(v);
  return (d.length === 10 || d.length === 11) && !d.startsWith("0");
}

export function AvisoWhatsApp({ clinicId }: { clinicId: string }) {
  const router = useRouter();
  const [whats, setWhats] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function salvar() {
    setErro(null);
    if (!whatsValido(whats)) return setErro("Digite o número com DDD, por exemplo (33) 99999-9999.");
    setSalvando(true);
    const { error } = await createClient().rpc("set_clinic_whatsapp", {
      p_clinic: clinicId,
      p_whatsapp: soDigitos(whats),
    });
    setSalvando(false);
    if (error) {
      if (error.message.includes("whatsapp_invalido")) return setErro("Digite o número com DDD, por exemplo (33) 99999-9999.");
      if (error.message.includes("sem_permissao")) return setErro("Só o dono da agenda pode cadastrar o WhatsApp.");
      return setErro("Não foi possível salvar agora. Tente de novo em instantes.");
    }
    setSalvo(true);
    router.refresh();
  }

  if (salvo) {
    return (
      <p className="mb-4 rounded-lg bg-white px-4 py-3 text-sm text-moss-deep">
        WhatsApp salvo. A partir de agora você recebe o aviso de cada agendamento online.
      </p>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-moss/40 bg-white px-4 py-4">
      <p className="font-bold">Cadastre seu WhatsApp para receber os agendamentos</p>
      <p className="mt-1 text-sm text-ink/70">
        Quando um paciente marcar pelo seu link, você recebe o aviso na hora. O número não aparece para o paciente.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          className="field sm:max-w-xs"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          aria-label="Seu WhatsApp"
          value={whats}
          onChange={(e) => setWhats(mascaraWhats(e.target.value))}
          placeholder="(33) 99999-9999"
        />
        <button className="btn-primary" onClick={salvar} disabled={salvando || !whatsValido(whats)}>
          {salvando ? "Salvando" : "Salvar WhatsApp"}
        </button>
      </div>
      {erro && <p className="mt-2 rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
    </div>
  );
}

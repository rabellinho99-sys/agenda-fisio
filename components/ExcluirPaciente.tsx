"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ExcluirPaciente({ pacienteId, nome }: { pacienteId: string; nome: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function excluir() {
    setExcluindo(true);
    setErro(null);
    const { error } = await supabase.rpc("delete_patient", { p_patient: pacienteId });
    setExcluindo(false);
    if (error) return setErro(error.message);
    router.push("/painel/pacientes");
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        className="mt-6 text-sm text-ink/40 underline underline-offset-4 hover:text-danger"
        onClick={() => setConfirmando(true)}
      >
        Excluir este paciente
      </button>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-danger/30 bg-blush/30 p-4 space-y-3">
      <p className="font-bold text-danger">Excluir {nome}?</p>
      <p className="text-sm text-ink/80">
        Todos os dados deste paciente serão apagados de forma definitiva: agendamentos, evoluções, anamneses, testes,
        imagens, documentos emitidos, termos de consentimento e pacotes. Essa ação não pode ser desfeita.
      </p>
      {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
      <div className="flex gap-2">
        <button className="btn-danger" onClick={excluir} disabled={excluindo}>
          {excluindo ? "Excluindo..." : "Confirmar exclusão"}
        </button>
        <button className="btn-ghost" onClick={() => { setConfirmando(false); setErro(null); }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

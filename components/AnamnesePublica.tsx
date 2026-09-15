"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FormAnamnese } from "@/components/FormAnamnese";
import { faltando, type Answers, type Field } from "@/lib/anamnese";

type Req = { clinic_name: string; patient_name: string; template_name: string; description: string | null; fields: Field[]; filled: boolean; expired: boolean };

export function AnamnesePublica({ token, req }: { token: string; req: Req }) {
  const supabase = createClient();
  const [answers, setAnswers] = useState<Answers>({});
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(req.filled);

  async function enviar() {
    const f = faltando(req.fields, answers);
    if (f.length) return setErro(`Faltam respostas obrigatórias: ${f.slice(0, 3).join(", ")}${f.length > 3 ? " e outras" : ""}.`);
    setErro(null); setEnviando(true);
    const { error } = await supabase.rpc("submit_anamnesis", { p_token: token, p_answers: answers });
    setEnviando(false);
    if (error) return setErro(error.message.includes("expirado") ? "Este link expirou. Peça um novo à clínica." : error.message);
    setFeito(true);
  }

  if (feito) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <p className="text-sm text-ink/60">{req.clinic_name}</p>
        <h1 className="h-display mt-2 text-4xl">Recebido, obrigado.</h1>
        <p className="mt-4 text-ink/70">Suas respostas já estão com o profissional. Isso agiliza sua primeira consulta.</p>
      </main>
    );
  }
  if (req.expired) {
    return <main className="flex min-h-screen items-center justify-center px-6 text-center"><div><h1 className="h-title text-2xl">Link expirado</h1><p className="mt-2 text-ink/70">Peça um novo link à clínica.</p></div></main>;
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <p className="text-sm text-ink/60">{req.clinic_name}</p>
      <h1 className="h-title mt-1 text-3xl">{req.template_name}</h1>
      <p className="mt-2 text-ink/70">Olá, {req.patient_name.split(" ")[0]}. {req.description ?? "Responda com calma; leva uns 5 minutos."}</p>
      <div className="mt-8 rounded-2xl bg-white p-5">
        <FormAnamnese fields={req.fields} answers={answers} onChange={setAnswers} />
        {erro && <p className="mt-4 rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
        <button className="btn-primary mt-6 w-full" onClick={enviar} disabled={enviando}>{enviando ? "Enviando" : "Enviar respostas"}</button>
        <p className="mt-3 text-xs text-ink/60">Suas respostas são confidenciais e ficam no seu prontuário na clínica.</p>
      </div>
    </main>
  );
}

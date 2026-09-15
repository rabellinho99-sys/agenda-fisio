"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/format";

export default function OnboardingPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditado, setSlugEditado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  function onNome(v: string) {
    setNome(v);
    if (!slugEditado) setSlug(slugify(v));
  }

  async function criar() {
    setErro(null);
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("create_clinic", { p_name: nome, p_slug: slug });
    setCarregando(false);
    if (error) {
      if (error.message.includes("clinics_slug_key")) return setErro("Esse link já está em uso. Escolha outro.");
      if (error.message.includes("clinics_slug_check")) return setErro("O link precisa ter entre 3 e 60 caracteres, só letras minúsculas, números e hífen.");
      return setErro(error.message);
    }
    router.push("/painel");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <h1 className="h-title text-3xl">Dê um nome à sua agenda</h1>
        <p className="mt-2 text-ink/70">É o que o paciente vê ao abrir seu link de agendamento.</p>

        <div className="mt-8 space-y-5">
          <div>
            <label className="label" htmlFor="nome">Nome da clínica ou profissional</label>
            <input id="nome" className="field" value={nome} onChange={(e) => onNome(e.target.value)} placeholder="Clínica Rabello" />
          </div>
          <div>
            <label className="label" htmlFor="slug">Seu link público</label>
            <div className="flex items-center rounded-lg border border-mist bg-white pl-3.5">
              <span className="text-sm text-ink/50">agenda.fisio/</span>
              <input
                id="slug"
                className="w-full bg-transparent px-1 py-2.5 text-[15px] outline-none"
                value={slug}
                onChange={(e) => { setSlugEditado(true); setSlug(slugify(e.target.value)); }}
              />
            </div>
          </div>
          {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
          <button className="btn-primary w-full" onClick={criar} disabled={carregando || nome.length < 2 || slug.length < 3}>
            {carregando ? "Criando" : "Criar agenda"}
          </button>
        </div>
      </div>
    </main>
  );
}

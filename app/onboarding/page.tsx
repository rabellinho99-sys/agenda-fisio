"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/format";

// Mantém só os dígitos do celular (DDD + número), sem o 55 do país
function soDigitos(v: string) {
  let d = v.replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  return d.slice(0, 11);
}

// Mostra no formato (33) 99999-9999 enquanto a pessoa digita
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

export default function OnboardingPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditado, setSlugEditado] = useState(false);
  const [whats, setWhats] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [convites, setConvites] = useState<{ token: string; clinic_name: string }[]>([]);

  // Quem foi convidado por uma clínica não deve criar uma clínica nova por engano
  useEffect(() => {
    createClient().rpc("my_pending_invites").then(({ data }) => {
      setConvites((data as { token: string; clinic_name: string }[]) ?? []);
    });
  }, []);

  function onNome(v: string) {
    setNome(v);
    if (!slugEditado) setSlug(slugify(v));
  }

  async function criar() {
    setErro(null);
    if (!whatsValido(whats)) {
      return setErro("Digite seu WhatsApp com DDD, por exemplo (33) 99999-9999.");
    }
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("create_clinic", {
      p_name: nome,
      p_slug: slug,
      p_whatsapp: soDigitos(whats),
    });
    setCarregando(false);
    if (error) {
      if (error.message.includes("whatsapp_invalido")) return setErro("Digite seu WhatsApp com DDD, por exemplo (33) 99999-9999.");
      if (error.message.includes("clinics_slug_key")) return setErro("Esse link já está em uso. Escolha outro.");
      if (error.message.includes("clinics_slug_check")) return setErro("O link precisa ter entre 3 e 60 caracteres, só letras minúsculas, números e hífen.");
      return setErro(error.message);
    }
    router.push("/painel");
    router.refresh();
  }

  const podeCriar = !carregando && nome.length >= 2 && slug.length >= 3 && whatsValido(whats);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <h1 className="h-title text-3xl">Dê um nome à sua agenda</h1>
        <p className="mt-2 text-ink/70">É o que o paciente vê ao abrir seu link de agendamento.</p>

        {convites.map((c) => (
          <div key={c.token} className="mt-6 rounded-xl border border-moss/40 bg-white p-4">
            <p className="font-bold">Você tem um convite da {c.clinic_name}</p>
            <p className="mt-1 text-sm text-ink/70">
              Se você vai atender nessa clínica, aceite o convite em vez de criar uma agenda nova.
            </p>
            <Link href={`/convite/${c.token}`} className="btn-primary mt-3 inline-block">Ver convite</Link>
          </div>
        ))}

        <div className="mt-8 space-y-5">
          <div>
            <label className="label" htmlFor="nome">Nome da clínica ou profissional</label>
            <input id="nome" className="field" value={nome} onChange={(e) => onNome(e.target.value)} placeholder="Clínica Rabello" />
          </div>
          <div>
            <label className="label" htmlFor="slug">Seu link público</label>
            <div className="flex items-center rounded-lg border border-mist bg-white pl-3.5">
              <span className="whitespace-nowrap text-sm text-ink/50">agendafisiopro.com.br/</span>
              <input
                id="slug"
                className="w-full bg-transparent px-1 py-2.5 text-[15px] outline-none"
                value={slug}
                onChange={(e) => { setSlugEditado(true); setSlug(slugify(e.target.value)); }}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="whats">Seu WhatsApp</label>
            <input
              id="whats"
              className="field"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={whats}
              onChange={(e) => setWhats(mascaraWhats(e.target.value))}
              placeholder="(33) 99999-9999"
            />
            <p className="mt-1.5 text-xs text-ink/60">
              Você recebe aqui o aviso quando um paciente agendar pelo seu link. Não aparece para o paciente.
            </p>
          </div>
          {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
          <button className="btn-primary w-full" onClick={criar} disabled={!podeCriar}>
            {carregando ? "Criando" : "Criar agenda"}
          </button>
        </div>
      </div>
    </main>
  );
}

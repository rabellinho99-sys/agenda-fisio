"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Convite = {
  clinic_name: string;
  professional_name: string;
  email: string;
  status: "valid" | "expired" | "accepted" | "revoked";
} | null;

export default function ConvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [convite, setConvite] = useState<Convite>(null);
  const [carregando, setCarregando] = useState(true);
  const [emailLogado, setEmailLogado] = useState<string | null>(null);
  const [aceitando, setAceitando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: { user } }] = await Promise.all([
        supabase.rpc("get_professional_invite", { p_token: token }),
        supabase.auth.getUser(),
      ]);
      setConvite((data as Convite) ?? null);
      setEmailLogado(user?.email?.toLowerCase() ?? null);
      setCarregando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const destino = `/convite/${token}`;
  const emailParam = convite ? `&email=${encodeURIComponent(convite.email)}` : "";

  async function aceitar() {
    setErro(null);
    setAceitando(true);
    const { error } = await supabase.rpc("accept_professional_invite", { p_token: token });
    setAceitando(false);
    if (error) return setErro(error.message);
    router.push("/painel");
    router.refresh();
  }

  async function trocarConta() {
    await supabase.auth.signOut();
    router.push(`/entrar?next=${encodeURIComponent(destino)}${emailParam}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="text-lg font-extrabold tracking-tight">Agenda Fisio Pro</Link>

        {carregando && <p className="mt-8 text-ink/70">Carregando convite...</p>}

        {!carregando && !convite && (
          <div className="mt-8 rounded-xl bg-white p-6">
            <h1 className="h-title text-2xl">Convite não encontrado</h1>
            <p className="mt-2 text-ink/70">Confira se o link está completo ou peça um novo convite à clínica.</p>
          </div>
        )}

        {!carregando && convite && convite.status !== "valid" && (
          <div className="mt-8 rounded-xl bg-white p-6">
            <h1 className="h-title text-2xl">
              {convite.status === "accepted" ? "Convite já aceito" : convite.status === "expired" ? "Convite expirado" : "Convite cancelado"}
            </h1>
            <p className="mt-2 text-ink/70">
              {convite.status === "accepted"
                ? "Este convite já foi usado. Entre na sua conta para acessar o painel."
                : `Peça um novo convite à ${convite.clinic_name}.`}
            </p>
            {convite.status === "accepted" && (
              <Link href="/painel" className="btn-primary mt-4 inline-block">Ir para o painel</Link>
            )}
          </div>
        )}

        {!carregando && convite && convite.status === "valid" && (
          <div className="mt-8 rounded-xl bg-white p-6">
            <p className="text-sm text-ink/60">Convite para profissional</p>
            <h1 className="h-title mt-1 text-2xl">{convite.clinic_name}</h1>
            <p className="mt-3 text-ink/80">
              Olá, <strong>{convite.professional_name}</strong>. Você foi convidado para acessar o painel da clínica,
              com sua agenda, seus pacientes e seus documentos.
            </p>
            <p className="mt-3 text-sm text-ink/70">
              Use o e-mail <strong>{convite.email}</strong> para entrar ou criar sua conta.
            </p>

            {erro && <p className="mt-4 rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}

            {/* Logado com o e-mail certo */}
            {emailLogado === convite.email && (
              <button className="btn-primary mt-5 w-full" onClick={aceitar} disabled={aceitando}>
                {aceitando ? "Aceitando..." : "Aceitar convite"}
              </button>
            )}

            {/* Logado com outro e-mail */}
            {emailLogado && emailLogado !== convite.email && (
              <div className="mt-5 space-y-3">
                <p className="rounded-lg bg-amber/20 px-3 py-2 text-sm">
                  Você está conectado como <strong>{emailLogado}</strong>. Para aceitar, entre com {convite.email}.
                </p>
                <button className="btn-primary w-full" onClick={trocarConta}>Trocar de conta</button>
              </div>
            )}

            {/* Não logado */}
            {!emailLogado && (
              <div className="mt-5 space-y-2">
                <Link
                  href={`/entrar?modo=cadastro&next=${encodeURIComponent(destino)}${emailParam}`}
                  className="btn-primary block w-full text-center"
                >
                  Criar minha conta
                </Link>
                <Link
                  href={`/entrar?next=${encodeURIComponent(destino)}${emailParam}`}
                  className="btn-ghost block w-full text-center"
                >
                  Já tenho conta
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

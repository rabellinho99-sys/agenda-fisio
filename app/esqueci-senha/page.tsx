"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    setErro(null);
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${location.origin}/auth/callback?next=/nova-senha`,
    });
    setCarregando(false);
    if (error) {
      if (error.message.toLowerCase().includes("rate limit")) {
        return setErro("Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.");
      }
      return setErro("Não foi possível enviar o e-mail agora. Tente de novo em instantes.");
    }
    setEnviado(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-lg font-extrabold tracking-tight">Agenda Fisio Pro</Link>
        <h1 className="h-title mt-8 text-3xl">Recuperar senha</h1>

        {enviado ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-lg bg-white px-3 py-2 text-sm text-moss-deep">
              Se existir uma conta com o e-mail <strong>{email.trim()}</strong>, você vai receber um link para criar uma nova senha. Confira também a caixa de spam.
            </p>
            <p className="text-xs text-ink/60 leading-relaxed">
              Abra o link no mesmo navegador em que fez o pedido. O link vale por tempo limitado.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-ink/70 leading-relaxed">
              Digite o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.
            </p>
            <div>
              <label className="label" htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && email.includes("@") && !carregando) enviar(); }}
              />
            </div>

            {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}

            <button className="btn-primary w-full" onClick={enviar} disabled={carregando || !email.includes("@")}>
              {carregando ? "Aguarde" : "Enviar link"}
            </button>
          </div>
        )}

        <Link href="/entrar" className="mt-6 inline-block text-sm text-ink/70 underline underline-offset-4">
          Voltar para o login
        </Link>
      </div>
    </main>
  );
}

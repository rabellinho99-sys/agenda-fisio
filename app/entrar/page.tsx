"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function EntrarForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [modo, setModo] = useState<"login" | "cadastro">(
    params.get("modo") === "cadastro" ? "cadastro" : "login"
  );
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(
    params.get("erro") === "link" ? "Este link expirou ou já foi usado. Peça um novo em Esqueci minha senha." : null
  );
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    setErro(null);
    setAviso(null);
    setCarregando(true);
    const supabase = createClient();

    if (modo === "cadastro") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: { full_name: nome },
          emailRedirectTo: `${location.origin}/auth/callback?next=/onboarding`,
        },
      });
      setCarregando(false);
      if (error) return setErro(traduz(error.message));
      if (data.session) return router.push("/onboarding");
      return setAviso("Enviamos um link de confirmação para o seu e-mail. Abra o link para continuar.");
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) return setErro(traduz(error.message));
    router.push(params.get("next") ?? "/painel");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="text-lg font-extrabold tracking-tight">Agenda Fisio Pro</Link>
      <h1 className="h-title mt-8 text-3xl">
        {modo === "cadastro" ? "Crie sua conta" : "Entrar na agenda"}
      </h1>

      <div className="mt-6 space-y-4">
        {modo === "cadastro" && (
          <div>
            <label className="label" htmlFor="nome">Seu nome</label>
            <input id="nome" className="field" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Dr. Pedro Rabello" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="senha">Senha</label>
          <input id="senha" type="password" className="field" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={6} />
        </div>

        {modo === "login" && (

          <div className="text-right">

            <Link href="/esqueci-senha" className="text-sm text-ink/70 underline underline-offset-4">

              Esqueci minha senha

            </Link>

          </div>

        )}


        {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
        {aviso && <p className="rounded-lg bg-white px-3 py-2 text-sm text-moss-deep">{aviso}</p>}

        {modo === "cadastro" && (
          <p className="text-xs text-ink/60 leading-relaxed">
            Ao criar sua conta, você concorda com os nossos{" "}
            <Link href="/termos-de-uso" className="underline" target="_blank">
              Termos de Uso
            </Link>{" "}
            e com a nossa{" "}
            <Link href="/privacidade" className="underline" target="_blank">
              Política de Privacidade
            </Link>
            .
          </p>
        )}

        <button className="btn-primary w-full" onClick={enviar} disabled={carregando || !email || senha.length < 6 || (modo === "cadastro" && nome.length < 2)}>
          {carregando ? "Aguarde" : modo === "cadastro" ? "Criar conta" : "Entrar"}
        </button>
      </div>

      <button
        className="mt-6 text-sm text-ink/70 underline underline-offset-4"
        onClick={() => setModo(modo === "cadastro" ? "login" : "cadastro")}
      >
        {modo === "cadastro" ? "Já tenho conta" : "Ainda não tenho conta"}
      </button>
    </div>
  );
}

function traduz(msg: string) {
  if (msg.includes("Invalid login")) return "E-mail ou senha incorretos.";
  if (msg.includes("already registered")) return "Este e-mail já tem conta. Entre com sua senha.";
  if (msg.includes("Email not confirmed")) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  return msg;
}

export default function EntrarPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Suspense>
        <EntrarForm />
      </Suspense>
    </main>
  );
}

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Ao publicar uma nova versão dos Termos ou da Política, atualize a data aqui.
const TERMOS_VERSAO = "2026-09-21";
const PRIVACIDADE_VERSAO = "2026-09-21";

function EntrarForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [modo, setModo] = useState<"login" | "cadastro">(
    params.get("modo") === "cadastro" ? "cadastro" : "login"
  );
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState<string | null>(mensagemErro(params.get("erro")));
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    setErro(null);
    setAviso(null);

    if (modo === "cadastro" && !aceite) {
      return setErro("Para criar a conta, marque que leu e aceita os Termos de Uso e a Política de Privacidade.");
    }

    setCarregando(true);
    const supabase = createClient();

    if (modo === "cadastro") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            full_name: nome,
            terms_accepted: true,
            terms_version: TERMOS_VERSAO,
            privacy_version: PRIVACIDADE_VERSAO,
            user_agent: navigator.userAgent.slice(0, 500),
          },
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

  async function entrarComGoogle() {
    setErro(null);
    setAviso(null);
    if (modo === "cadastro" && !aceite) {
      return setErro("Para criar a conta, marque que leu e aceita os Termos de Uso e a Política de Privacidade.");
    }
    setCarregando(true);
    const supabase = createClient();
    const aceiteParam = modo === "cadastro" && aceite ? "1" : "0";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/google?aceite=${aceiteParam}` },
    });
    if (error) {
      setCarregando(false);
      setErro("Não foi possível abrir o login do Google. Tente novamente.");
    }
  }

  const podeEnviar =
    !carregando &&
    !!email &&
    senha.length >= 6 &&
    (modo === "login" || (nome.length >= 2 && aceite));

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
            <input
              id="nome"
              className="field"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Dr. Pedro Rabello"
            />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            className="field"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            minLength={6}
          />
        </div>

        {modo === "login" && (
          <div className="text-right">
            <Link href="/esqueci-senha" className="text-sm text-ink/70 underline underline-offset-4">
              Esqueci minha senha
            </Link>
          </div>
        )}

        {modo === "cadastro" && (
          <label htmlFor="aceite" className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
            <input
              id="aceite"
              type="checkbox"
              className="mt-1 size-4 shrink-0"
              checked={aceite}
              onChange={(e) => setAceite(e.target.checked)}
            />
            <span>
              Li e aceito os{" "}
              <Link href="/termos-de-uso" className="font-semibold underline" target="_blank">
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link href="/privacidade" className="font-semibold underline" target="_blank">
                Política de Privacidade
              </Link>
              .
            </span>
          </label>
        )}

        {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
        {aviso && <p className="rounded-lg bg-white px-3 py-2 text-sm text-moss-deep">{aviso}</p>}

        <button className="btn-primary w-full" onClick={enviar} disabled={!podeEnviar}>
          {carregando ? "Aguarde" : modo === "cadastro" ? "Criar conta" : "Entrar"}
        </button>

        <div className="flex items-center gap-3 text-xs text-ink/50">
          <span className="h-px flex-1 bg-ink/15" />
          ou
          <span className="h-px flex-1 bg-ink/15" />
        </div>

        <button
          type="button"
          onClick={entrarComGoogle}
          disabled={carregando || (modo === "cadastro" && !aceite)}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          <GoogleLogo />
          {modo === "cadastro" ? "Continuar com Google" : "Entrar com Google"}
        </button>
      </div>

      <button
        className="mt-6 text-sm text-ink/70 underline underline-offset-4"
        onClick={() => {
          setModo(modo === "cadastro" ? "login" : "cadastro");
          setErro(null);
          setAviso(null);
        }}
      >
        {modo === "cadastro" ? "Já tenho conta" : "Ainda não tenho conta"}
      </button>
    </div>
  );
}

function mensagemErro(codigo: string | null) {
  if (codigo === "link") return "Este link expirou ou já foi usado. Peça um novo em Esqueci minha senha.";
  if (codigo === "google") return "Não foi possível entrar com o Google. Tente novamente.";
  if (codigo === "termos") {
    return "Para criar sua conta com o Google, marque o aceite dos Termos e clique em Continuar com Google.";
  }
  return null;
}

function GoogleLogo() {
  return (
    <svg className="size-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
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

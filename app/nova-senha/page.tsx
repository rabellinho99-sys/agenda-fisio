"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function NovaSenhaPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"verificando" | "pronto" | "sem-sessao">("verificando");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setStatus(data.user ? "pronto" : "sem-sessao");
    });
  }, []);

  async function salvar() {
    setErro(null);
    if (senha.length < 6) return setErro("A senha precisa ter pelo menos 6 caracteres.");
    if (senha !== confirma) return setErro("As duas senhas não são iguais.");
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) return setErro(traduz(error.message));
    router.push("/painel");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-lg font-extrabold tracking-tight">Agenda Fisio Pro</Link>
        <h1 className="h-title mt-8 text-3xl">Criar nova senha</h1>

        {status === "verificando" && (
          <p className="mt-6 text-sm text-ink/70">Carregando...</p>
        )}

        {status === "sem-sessao" && (
          <div className="mt-6 space-y-4">
            <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">
              Este link expirou ou já foi usado. Peça um novo link para redefinir sua senha.
            </p>
            <Link href="/esqueci-senha" className="btn-primary block w-full text-center">
              Pedir novo link
            </Link>
          </div>
        )}

        {status === "pronto" && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="senha">Nova senha</label>
              <input id="senha" type="password" className="field" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={6} autoComplete="new-password" />
            </div>
            <div>
              <label className="label" htmlFor="confirma">Repita a nova senha</label>
              <input
                id="confirma"
                type="password"
                className="field"
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                minLength={6}
                autoComplete="new-password"
                onKeyDown={(e) => { if (e.key === "Enter" && !carregando) salvar(); }}
              />
            </div>

            {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}

            <button className="btn-primary w-full" onClick={salvar} disabled={carregando || senha.length < 6 || confirma.length < 6}>
              {carregando ? "Salvando" : "Salvar nova senha"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function traduz(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("different from the old")) return "A nova senha precisa ser diferente da senha atual.";
  if (m.includes("at least")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("weak")) return "Essa senha é fraca. Use letras e números.";
  if (m.includes("session")) return "Sua sessão expirou. Peça um novo link em Esqueci minha senha.";
  return "Não foi possível salvar a nova senha. Tente de novo.";
}

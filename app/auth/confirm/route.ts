import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Links dos e-mails de autenticação (cadastro, redefinição de senha, troca de e-mail).
// Usa token_hash em vez de code, então funciona mesmo se o link for aberto
// em outro aparelho ou navegador diferente do que fez o pedido.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/painel";
  const next = nextParam.startsWith("/") ? nextParam : "/painel";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/entrar?erro=link`);
}

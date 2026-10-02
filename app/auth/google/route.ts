import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Mesma versão usada em app/entrar/page.tsx
const TERMOS_VERSAO = "2026-09-28";
const PRIVACIDADE_VERSAO = "2026-09-28";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const aceitou = url.searchParams.get("aceite") === "1";

  if (!code) return NextResponse.redirect(`${origin}/entrar?erro=google`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/entrar?erro=google`);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/entrar?erro=google`);

  const [{ data: aceiteExistente }, { data: membro }] = await Promise.all([
    supabase.from("terms_acceptances").select("id").eq("user_id", user.id).limit(1).maybeSingle(),
    supabase.from("clinic_members").select("clinic_id").eq("user_id", user.id).eq("active", true).limit(1).maybeSingle(),
  ]);

  let cadastroNovo = false;

  if (!aceiteExistente) {
    if (aceitou) {
      await supabase.from("terms_acceptances").insert({
        user_id: user.id,
        terms_version: TERMOS_VERSAO,
        privacy_version: PRIVACIDADE_VERSAO,
        user_agent: (req.headers.get("user-agent") ?? "").slice(0, 500),
        source: "google",
      });
      // conta nova criada agora pelo Google (sem clínica ainda)
      if (!membro) cadastroNovo = true;
    } else if (!membro) {
      // conta nova criada pelo Google sem marcar o aceite: volta para o cadastro
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/entrar?modo=cadastro&erro=termos`);
    }
  }

  // Cadastro novo passa pela tela de boas-vindas, que registra o cadastro no pixel da Meta
  if (cadastroNovo) {
    return NextResponse.redirect(`${origin}/bem-vindo?m=google&next=/onboarding`);
  }

  return NextResponse.redirect(`${origin}${membro ? "/painel" : "/onboarding"}`);
}

import { createClient } from "@supabase/supabase-js";
import { TermoPublico } from "@/components/TermoPublico";

export const dynamic = "force-dynamic";

export default async function TermoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase.rpc("get_consent_request", { p_token: token });
  if (!data) {
    return <main className="flex min-h-screen items-center justify-center px-6 text-center"><div><h1 className="h-title text-2xl">Link inválido</h1><p className="mt-2 text-ink/70">Peça um novo link à clínica.</p></div></main>;
  }
  return <TermoPublico token={token} req={data} />;
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SairButton } from "@/components/SairButton";
import { Gate } from "@/components/Gate";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: member } = await supabase
    .from("clinic_members")
    .select("clinic_id, clinics(name, slug)")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (!member) redirect("/onboarding");
  const clinic = member.clinics as unknown as { name: string; slug: string };

  const { data: access } = await supabase.rpc("clinic_access_state", { p_clinic: member.clinic_id });
  const { data: sub } = await supabase.from("subscriptions").select("trial_ends_at").eq("clinic_id", member.clinic_id).single();
  const diasTrial = sub?.trial_ends_at ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000)) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div>
          <p className="text-xs text-ink/60">Agenda Fisio</p>
          <p className="text-lg font-extrabold tracking-tight">{clinic.name}</p>
        </div>
        <nav className="flex flex-wrap items-center gap-1 rounded-lg bg-white p-1">
          <Link href="/painel" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper">Agenda</Link>
          <Link href="/painel/pacientes" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper">Pacientes</Link>
          <Link href="/painel/anamnese" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper">Anamnese</Link>
          <Link href="/painel/termos" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper">Termos</Link>
          <Link href="/painel/pacotes" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper">Pacotes</Link>
          <Link href="/painel/servicos" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper">Serviços</Link>
          <Link href="/painel/horarios" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper">Horários</Link>
          <Link href="/painel/assinatura" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper">Assinatura</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href={`/${clinic.slug}`} target="_blank" className="btn-ghost text-sm">Ver link público</Link>
          <SairButton />
        </div>
      </header>
      {access === "trial" && diasTrial <= 7 && (
        <p className="mb-4 rounded-lg bg-amber/20 px-4 py-2 text-sm">
          Seu período de teste termina em {diasTrial} {diasTrial === 1 ? "dia" : "dias"}. <Link href="/painel/assinatura" className="font-semibold underline underline-offset-4">Escolher plano</Link>
        </p>
      )}
      {access === "past_due" && (
        <p className="mb-4 rounded-lg bg-blush px-4 py-2 text-sm text-danger">
          Pagamento em atraso. <Link href="/painel/assinatura" className="font-semibold underline underline-offset-4">Regularizar</Link>
        </p>
      )}
      <main className="pb-16"><Gate blocked={access === "blocked"}>{children}</Gate></main>
    </div>
  );
}

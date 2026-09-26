import { NavegacaoTopo } from "@/components/NavegacaoTopo";
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
          <p className="text-xs text-ink/60">Agenda Fisio Pro</p>
          <p className="text-lg font-extrabold tracking-tight">{clinic.name}</p>
        </div>
        <nav className="flex flex-wrap items-center gap-1 rounded-lg bg-white p-1">
          <Link href="/painel" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper">Agenda</Link>
          <Link href="/painel/pacientes" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper">Pacientes</Link>
          <Link href="/painel/anamnese" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper">Anamnese</Link>
          <Link href="/painel/termos" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper">Termos</Link>
          <Link href="/painel/pacotes" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper">Pacotes</Link>
          <Link href="/painel/financeiro" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper">Financeiro</Link>
          <Link href="/painel/servicos" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper">Serviços</Link>
          <Link href="/painel/horarios" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper">Horários</Link>
          <Link href="/painel/assinatura" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper">Assinatura</Link>
          <Link href="/painel/configuracoes" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-paper">Configurações</Link>
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

      <a href="https://wa.me/5533999973101?text=Ol%C3%A1%2C+preciso+de+ajuda+com+o+Agenda+Fisio" target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105" aria-label="Suporte via WhatsApp">
        <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.526 5.845L.057 23.571a.5.5 0 0 0 .612.612l5.726-1.469A11.952 11.952 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.66-.523-5.17-1.43l-.37-.22-3.84.985.999-3.745-.24-.385A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
        Suporte
      </a>
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avaliacoes } from "@/components/Avaliacoes";

export default async function TestesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: member } = await supabase
    .from("clinic_members")
    .select("clinic_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (!member) redirect("/onboarding");

  const [{ data: pacientes }, { data: testes }, { data: grupos }, { data: cif }, { data: prof }] = await Promise.all([
    supabase.from("patients").select("id, full_name, cpf").eq("clinic_id", member.clinic_id).order("full_name"),
    supabase.from("ortho_tests").select("code, name, region, how, suggests, sort").order("sort"),
    supabase.from("muscle_groups").select("code, name, region, cif_code, sort").order("sort"),
    supabase.from("cif_codes").select("code, title").in("code", ["b7300", "b7301", "b7305"]),
    supabase.from("professionals").select("id").eq("clinic_id", member.clinic_id).eq("user_id", user.id).limit(1).maybeSingle(),
  ]);

  const titulosCif = Object.fromEntries((cif ?? []).map((c) => [c.code, c.title]));

  return (
    <Avaliacoes
      clinicId={member.clinic_id}
      professionalId={prof?.id ?? null}
      pacientes={pacientes ?? []}
      testes={testes ?? []}
      grupos={grupos ?? []}
      titulosCif={titulosCif}
    />
  );
}

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Postural } from "@/components/Postural";

export default async function PosturalPage({ searchParams }: { searchParams: Promise<{ paciente?: string }> }) {
  const { paciente } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase
    .from("clinic_members")
    .select("clinic_id, role")
    .eq("user_id", user!.id)
    .limit(1)
    .single();
  if (member!.role === "receptionist") return <p className="text-ink/70">A avaliação postural é restrita a profissionais.</p>;

  // recurso em teste: só aparece para clínicas liberadas
  const { data: recursos } = await supabase.rpc("clinic_features", { p_clinic: member!.clinic_id });
  if (!(recursos as Record<string, unknown> | null)?.postural) notFound();

  const [{ data: pacientes }, { data: professionals }, { data: landmarks }, { data: medidas }] = await Promise.all([
    supabase.from("patients").select("id, full_name, cpf, phone").eq("clinic_id", member!.clinic_id).order("full_name"),
    supabase.from("professionals").select("id, user_id").eq("clinic_id", member!.clinic_id).eq("active", true),
    supabase.from("posture_landmarks").select("key, name, views, mp_index, sort").order("sort"),
    supabase.from("posture_measures").select("*").order("sort"),
  ]);

  const meu = professionals?.find((p) => p.user_id === user!.id)?.id ?? professionals?.[0]?.id ?? null;

  return (
    <Postural
      clinicId={member!.clinic_id}
      professionalId={meu}
      pacientes={pacientes ?? []}
      landmarks={(landmarks ?? []) as never}
      medidas={(medidas ?? []) as never}
      pacienteInicial={paciente ?? null}
    />
  );
}

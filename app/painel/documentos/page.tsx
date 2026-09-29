import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Documentos } from "@/components/Documentos";
import type { CifCodigo } from "@/lib/cif";

export default async function DocumentosPage() {
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

  const [{ data: pacientes }, { data: documentos }, { data: catalogo }, { data: clinica }] = await Promise.all([
    supabase
      .from("patients")
      .select("id, full_name, cpf, birth_date")
      .eq("clinic_id", member.clinic_id)
      .order("full_name"),
    supabase
      .from("documents")
      .select("id, number, title, doc_type, issued_at, patient_id, body, cif, patients(full_name)")
      .eq("clinic_id", member.clinic_id)
      .order("issued_at", { ascending: false })
      .limit(200),
    supabase.from("cif_codes").select("code, title, component, regions, sort").order("sort"),
    supabase.from("clinics").select("address").eq("id", member.clinic_id).single(),
  ]);

  const { data: recursos } = await supabase.rpc("clinic_features", { p_clinic: member.clinic_id });

  const end = (clinica?.address ?? {}) as { city?: string; state?: string };
  const cidade = [end.city, end.state].filter(Boolean).join(" - ");

  return (
    <Documentos
      recursos={(recursos ?? {}) as never}
      clinicId={member.clinic_id}
      pacientes={pacientes ?? []}
      documentos={(documentos ?? []) as never}
      catalogo={(catalogo ?? []) as CifCodigo[]}
      cidadeClinica={cidade}
    />
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MeusDados } from "@/components/MeusDados";

export default async function MeusDadosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: member } = await supabase
    .from("clinic_members")
    .select("clinic_id, role")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (!member) redirect("/onboarding");

  const [{ data: clinic }, { data: professional }] = await Promise.all([
    supabase
      .from("clinics")
      .select("id, name, legal_name, cnpj_cpf, crefito, phone, email, address, logo_url")
      .eq("id", member.clinic_id)
      .single(),
    supabase
      .from("professionals")
      .select(
        "id, display_name, doc_full_name, crefito, crefito_region, specialties, " +
          "phone, email, address_text, doc_titles, signature_path, stamp_path"
      )
      .eq("clinic_id", member.clinic_id)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
  ]);

  if (!clinic) redirect("/painel");

  return (
    <MeusDados
      clinic={clinic}
      professional={professional as never}
      isOwner={member.role === "owner"}
      userEmail={user.email ?? ""}
    />
  );
}

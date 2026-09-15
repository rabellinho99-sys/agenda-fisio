import { createClient } from "@/lib/supabase/server";
import { Anamnese } from "@/components/Anamnese";

export default async function AnamnesePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase.from("clinic_members").select("clinic_id").eq("user_id", user!.id).limit(1).single();
  const clinicId = member!.clinic_id as string;
  const [{ data: templates }, { data: services }] = await Promise.all([
    supabase.from("anamnesis_templates").select("id, name, description, fields, active").eq("clinic_id", clinicId).eq("active", true).order("created_at"),
    supabase.from("services").select("id, name, anamnesis_template_id").eq("clinic_id", clinicId).eq("active", true).order("name"),
  ]);
  return <Anamnese clinicId={clinicId} templates={(templates ?? []) as never} services={services ?? []} />;
}

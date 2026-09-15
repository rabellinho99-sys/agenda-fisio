import { createClient } from "@/lib/supabase/server";
import { Termos } from "@/components/Termos";

export default async function TermosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase.from("clinic_members").select("clinic_id").eq("user_id", user!.id).limit(1).single();
  const clinicId = member!.clinic_id as string;
  const [{ data: templates }, { data: services }] = await Promise.all([
    supabase.from("consent_templates").select("id, name, body_markdown, version").eq("clinic_id", clinicId).eq("active", true).order("created_at"),
    supabase.from("services").select("id, name, consent_template_id").eq("clinic_id", clinicId).eq("active", true).order("name"),
  ]);
  return <Termos clinicId={clinicId} templates={templates ?? []} services={services ?? []} />;
}

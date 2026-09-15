import { createClient } from "@/lib/supabase/server";
import { Pacotes } from "@/components/Pacotes";

export default async function PacotesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase.from("clinic_members").select("clinic_id").eq("user_id", user!.id).limit(1).single();
  const clinicId = member!.clinic_id as string;
  const [{ data: packages }, { data: services }] = await Promise.all([
    supabase.from("packages").select("id, name, service_id, sessions, price_cents, validity_days, description, active").eq("clinic_id", clinicId).eq("active", true).order("created_at"),
    supabase.from("services").select("id, name, price_cents").eq("clinic_id", clinicId).eq("active", true).order("name"),
  ]);
  return <Pacotes clinicId={clinicId} inicial={packages ?? []} services={services ?? []} />;
}

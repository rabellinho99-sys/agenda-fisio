import { createClient } from "@/lib/supabase/server";
import { Agenda } from "@/components/Agenda";

export default async function AgendaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase
    .from("clinic_members").select("clinic_id").eq("user_id", user!.id).limit(1).single();
  const clinicId = member!.clinic_id as string;

  const [{ data: clinic }, { data: professionals }, { data: services }] = await Promise.all([
    supabase.from("clinics").select("timezone, slug, name").eq("id", clinicId).single(),
    supabase.from("professionals").select("id, display_name").eq("clinic_id", clinicId).eq("active", true).order("sort_order"),
    supabase.from("services").select("id, name, duration_minutes, buffer_after_minutes, price_cents, max_participants").eq("clinic_id", clinicId).eq("active", true).order("sort_order"),
  ]);

  return (
    <Agenda
      clinicId={clinicId}
      clinicName={clinic?.name ?? ""}
      tz={clinic?.timezone ?? "America/Sao_Paulo"}
      professionals={professionals ?? []}
      services={services ?? []}
    />
  );
}

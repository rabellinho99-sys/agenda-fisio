import { createClient } from "@/lib/supabase/server";
import { Horarios } from "@/components/Horarios";

export default async function HorariosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase.from("clinic_members").select("clinic_id").eq("user_id", user!.id).limit(1).single();
  const clinicId = member!.clinic_id as string;
  const [{ data: professionals }, { data: rules }, { data: blocks }] = await Promise.all([
    supabase.from("professionals").select("id, display_name").eq("clinic_id", clinicId).eq("active", true).order("sort_order"),
    supabase.from("availability_rules").select("id, professional_id, weekday, start_time, end_time").eq("clinic_id", clinicId),
    supabase.from("availability_exceptions").select("id, professional_id, starts_at, ends_at, reason").eq("clinic_id", clinicId).eq("type", "block").order("starts_at"),
  ]);
  return <Horarios clinicId={clinicId} professionals={professionals ?? []} rules={rules ?? []} blocks={blocks ?? []} />;
}

import { createClient } from "@/lib/supabase/server";
import { Servicos } from "@/components/Servicos";

export default async function ServicosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase.from("clinic_members").select("clinic_id").eq("user_id", user!.id).limit(1).single();
  const { data: services } = await supabase
    .from("services").select("id, name, category, duration_minutes, buffer_after_minutes, price_cents, visible_online, active, description, image_url")
    .eq("clinic_id", member!.clinic_id).eq("active", true).order("sort_order").order("name");
  return <Servicos clinicId={member!.clinic_id} inicial={services ?? []} />;
}

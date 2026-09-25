import { createClient } from "@/lib/supabase/server";
import { Configuracoes } from "@/components/Configuracoes";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase.from("clinic_members").select("clinic_id, role").eq("user_id", user!.id).limit(1).single();
  if (member!.role === "receptionist") return <p className="text-ink/70">As configurações são restritas a profissionais.</p>;

  const { data: clinic } = await supabase.from("clinics").select("id, name, logo_url, brand_color, booking_settings").eq("id", member!.clinic_id).single();
  if (!clinic) return null;

  return <Configuracoes clinic={clinic} />;
}

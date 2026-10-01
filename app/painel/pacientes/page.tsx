import { createClient } from "@/lib/supabase/server";
import { Pacientes } from "@/components/Pacientes";

export default async function PacientesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase.from("clinic_members").select("clinic_id").eq("user_id", user!.id).limit(1).single();
  const { data } = await supabase
    .from("patient_summary")
    .select("*")
    .eq("clinic_id", member!.clinic_id)
    .order("full_name")
    .limit(1000);
  return <Pacientes clinicId={member!.clinic_id} inicial={data ?? []} />;
}

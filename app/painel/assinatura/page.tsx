import { createClient } from "@/lib/supabase/server";
import { Assinatura } from "@/components/Assinatura";

export default async function AssinaturaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase.from("clinic_members").select("clinic_id, role").eq("user_id", user!.id).limit(1).single();
  const clinicId = member!.clinic_id as string;
  const [{ data: sub }, { data: plans }, { data: clinic }, { data: recursos }] = await Promise.all([
    supabase.rpc("my_subscription", { p_clinic: clinicId }),
    supabase.from("plans").select("code, name, price_cents, max_professionals, features, billing_months, discount_pct, base_plan_code").eq("active", true).order("price_cents"),
    supabase.from("clinics").select("cnpj_cpf, email, phone").eq("id", clinicId).single(),
    supabase.rpc("clinic_features", { p_clinic: clinicId }),
  ]);
  return (
    <Assinatura
      clinicId={clinicId}
      isOwner={member!.role === "owner"}
      sub={sub}
      plans={plans ?? []}
      clinic={clinic ?? { cnpj_cpf: null, email: null, phone: null }}
      userEmail={user!.email ?? ""}
      contaDono={(recursos as { plano?: string } | null)?.plano === "dono"}
    />
  );
}

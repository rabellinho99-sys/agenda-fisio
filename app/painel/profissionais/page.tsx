import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Profissionais } from "@/components/Profissionais";

export default async function ProfissionaisPage() {
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

  const clinicId = member.clinic_id as string;

  const [{ data: profissionais }, { data: convites }, { data: membros }, { data: recursos }] = await Promise.all([
    supabase
      .from("professionals")
      .select("id, user_id, display_name, crefito, crefito_region, specialties, bio, phone, email, color, visible_online, active, sort_order")
      .eq("clinic_id", clinicId)
      .order("active", { ascending: false })
      .order("sort_order")
      .order("display_name"),
    supabase
      .from("clinic_invites")
      .select("id, professional_id, email, role, token, expires_at")
      .eq("clinic_id", clinicId)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString()),
    supabase
      .from("clinic_members")
      .select("user_id, role, active")
      .eq("clinic_id", clinicId),
    supabase.rpc("clinic_features", { p_clinic: clinicId }),
  ]);

  const limite = ((recursos ?? {}) as { max_professionals?: number | null }).max_professionals ?? null;

  return (
    <Profissionais
      clinicId={clinicId}
      isOwner={member.role === "owner"}
      meuUserId={user.id}
      limite={limite}
      inicial={(profissionais ?? []) as never}
      convitesIniciais={(convites ?? []) as never}
      membros={(membros ?? []) as never}
    />
  );
}

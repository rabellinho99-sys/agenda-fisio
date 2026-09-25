import { createClient } from "@/lib/supabase/server";
import { Financeiro } from "@/components/Financeiro";

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes: mesParam } = await searchParams;
  const mes = mesParam ?? mesAtual();
  const [ano, mesNum] = mes.split("-").map(Number);
  const inicio = new Date(Date.UTC(ano, mesNum - 1, 1)).toISOString();
  const fim = new Date(Date.UTC(ano, mesNum, 1)).toISOString();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase.from("clinic_members").select("clinic_id, role").eq("user_id", user!.id).limit(1).single();
  if (member!.role === "receptionist") return <p className="text-ink/70">O financeiro é restrito a profissionais.</p>;
  const clinicId = member!.clinic_id as string;

  const [{ data: appointments }, { data: pacotesVendidos }, { data: expenses }, { data: professionals }] = await Promise.all([
    supabase.from("appointments")
      .select("id, starts_at, price_cents, discount_cents, status, professional_id, professionals(display_name), services(name)")
      .eq("clinic_id", clinicId).eq("status", "completed")
      .gte("starts_at", inicio).lt("starts_at", fim)
      .order("starts_at", { ascending: false }),
    supabase.from("patient_packages")
      .select("id, package_name, price_cents, payment_method, purchased_at, patients(full_name)")
      .eq("clinic_id", clinicId).eq("paid", true)
      .gte("purchased_at", inicio).lt("purchased_at", fim)
      .order("purchased_at", { ascending: false }),
    supabase.from("expenses")
      .select("id, description, category, amount_cents, paid_at, notes")
      .eq("clinic_id", clinicId)
      .gte("paid_at", inicio.slice(0, 10)).lt("paid_at", fim.slice(0, 10))
      .order("paid_at", { ascending: false }),
    supabase.from("professionals").select("id, display_name").eq("clinic_id", clinicId).eq("active", true),
  ]);

  return (
    <Financeiro
      clinicId={clinicId}
      mes={mes}
      appointments={(appointments ?? []) as never}
      pacotesVendidos={(pacotesVendidos ?? []) as never}
      expenses={expenses ?? []}
      professionals={professionals ?? []}
    />
  );
}

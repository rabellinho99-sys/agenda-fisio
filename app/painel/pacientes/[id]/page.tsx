import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Prontuario } from "@/components/Prontuario";

export default async function ProntuarioPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ appt?: string }> }) {
  const { id } = await params;
  const { appt } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase.from("clinic_members").select("clinic_id, role").eq("user_id", user!.id).limit(1).single();
  if (member!.role === "receptionist") return <p className="text-ink/70">O prontuário é restrito a profissionais.</p>;

  const [{ data: patient }, { data: notes }, { data: appts }, { data: professionals }, { data: clinic }, { data: templates }, { data: anamneses }, { data: requests }, { data: consentTemplates }, { data: consents }, { data: consentRequests }, { data: catalogo }, { data: pacotes }, { data: servicos }] = await Promise.all([
    supabase.from("patients").select("*").eq("id", id).maybeSingle(),
    supabase.from("clinical_notes").select("*, professionals(display_name), appointments(starts_at, services(name))").eq("patient_id", id).order("created_at", { ascending: false }),
    supabase.from("appointments").select("id, starts_at, status, services(name)").eq("patient_id", id).order("starts_at", { ascending: false }).limit(20),
    supabase.from("professionals").select("id, display_name, user_id").eq("clinic_id", member!.clinic_id).eq("active", true),
    supabase.from("clinics").select("timezone").eq("id", member!.clinic_id).single(),
    supabase.from("anamnesis_templates").select("id, name, fields").eq("clinic_id", member!.clinic_id).eq("active", true).order("created_at"),
    supabase.from("anamnesis_responses").select("id, template_name, fields_snapshot, answers, filled_by, created_at").eq("patient_id", id).order("created_at", { ascending: false }),
    supabase.from("anamnesis_requests").select("id, token, template_id, expires_at, filled_at").eq("patient_id", id).is("filled_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }),
    supabase.from("consent_templates").select("id, name").eq("clinic_id", member!.clinic_id).eq("active", true).order("created_at"),
    supabase.from("consents").select("id, template_name, template_version, body_rendered, signer_name, signer_cpf, signature_svg, signed_at, document_hash, revoked_at, revoke_reason").eq("patient_id", id).order("signed_at", { ascending: false }),
    supabase.from("consent_requests").select("id, token, template_id, expires_at, signed_at").eq("patient_id", id).is("signed_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }),
    supabase.from("packages").select("id, name, service_id, sessions, price_cents, validity_days").eq("clinic_id", member!.clinic_id).eq("active", true).order("created_at"),
    supabase.from("patient_packages").select("id, package_name, service_id, sessions_total, sessions_used, price_cents, paid, payment_method, purchased_at, expires_at, cancelled_at").eq("patient_id", id).order("purchased_at", { ascending: false }),
    supabase.from("services").select("id, name").eq("clinic_id", member!.clinic_id).eq("active", true).order("name"),
  ]);
  if (!patient) notFound();

  const meu = professionals?.find((p) => p.user_id === user!.id)?.id ?? professionals?.[0]?.id ?? null;

  return (
    <Prontuario
      patient={patient}
      notes={(notes ?? []) as never}
      appts={(appts ?? []) as never}
      professionals={professionals ?? []}
      meuProfissional={meu}
      apptInicial={appt ?? null}
      tz={clinic?.timezone ?? "America/Sao_Paulo"}
      templates={(templates ?? []) as never}
      anamneses={(anamneses ?? []) as never}
      requests={(requests ?? []) as never}
      consentTemplates={consentTemplates ?? []}
      consents={(consents ?? []) as never}
      consentRequests={(consentRequests ?? []) as never}
      catalogo={catalogo ?? []}
      pacotes={(pacotes ?? []) as never}
      servicos={servicos ?? []}
    />
  );
}

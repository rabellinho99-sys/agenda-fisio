import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RelatorioContador, type Lancamento, type ReceitaPaciente, type ReciboLinha } from "@/components/RelatorioContador";

export const dynamic = "force-dynamic";

const pad = (n: number) => String(n).padStart(2, "0");

function periodo(mes?: string, ano?: string) {
  if (ano && /^\d{4}$/.test(ano)) {
    const a = Number(ano);
    return { tipo: "ano" as const, ref: ano, inicio: `${a}-01-01`, fim: `${a + 1}-01-01` };
  }
  const agora = new Date();
  const ref = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}`;
  const [a, m] = ref.split("-").map(Number);
  const prox = m === 12 ? `${a + 1}-01-01` : `${a}-${pad(m + 1)}-01`;
  return { tipo: "mes" as const, ref, inicio: `${a}-${pad(m)}-01`, fim: prox };
}

// Datas no fuso de São Paulo
const ts = (d: string) => `${d}T00:00:00-03:00`;
const diaSP = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

type ReciboBody = {
  recibo?: {
    total_cents?: number; forma?: string; dataRecebimento?: string; referente?: string;
    pagadorOutro?: boolean; pagadorNome?: string; pagadorCpf?: string;
  };
};

export default async function RelatorioContadorPage({ searchParams }: { searchParams: Promise<{ mes?: string; ano?: string }> }) {
  const { mes, ano } = await searchParams;
  const p = periodo(mes, ano);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/entrar?next=/relatorio/contador`);

  const { data: member } = await supabase.from("clinic_members").select("clinic_id, role").eq("user_id", user.id).limit(1).single();
  if (!member || member.role === "receptionist") redirect("/painel");
  const clinicId = member.clinic_id as string;

  const { data: clinic } = await supabase
    .from("clinics")
    .select("name, legal_name, cnpj_cpf, crefito, beta_features")
    .eq("id", clinicId)
    .single();
  if (!((clinic?.beta_features ?? []) as string[]).includes("contador")) redirect("/painel/financeiro");

  const [{ data: appts }, { data: pacotes }, { data: despesas }, { data: docs }, { data: substituidos }] = await Promise.all([
    supabase.from("appointments")
      .select("id, starts_at, price_cents, discount_cents, patient_package_id, patients(id, full_name, cpf), services(name)")
      .eq("clinic_id", clinicId).eq("status", "completed").is("patient_package_id", null)
      .gte("starts_at", ts(p.inicio)).lt("starts_at", ts(p.fim))
      .order("starts_at"),
    supabase.from("patient_packages")
      .select("id, package_name, price_cents, payment_method, purchased_at, patients(id, full_name, cpf)")
      .eq("clinic_id", clinicId).eq("paid", true)
      .gte("purchased_at", ts(p.inicio)).lt("purchased_at", ts(p.fim))
      .order("purchased_at"),
    supabase.from("expenses")
      .select("id, description, category, amount_cents, paid_at")
      .eq("clinic_id", clinicId)
      .gte("paid_at", p.inicio).lt("paid_at", p.fim)
      .order("paid_at"),
    supabase.from("documents")
      .select("id, number, issued_at, body, patients(full_name, cpf)")
      .eq("clinic_id", clinicId).eq("doc_type", "recibo")
      .gte("issued_at", ts(p.inicio)).lt("issued_at", ts(p.fim))
      .order("issued_at"),
    supabase.from("documents").select("replaces_id").eq("clinic_id", clinicId).eq("doc_type", "recibo").not("replaces_id", "is", null),
  ]);

  type Pac = { id: string; full_name: string; cpf: string | null } | null;
  const umPaciente = (x: unknown): Pac => (Array.isArray(x) ? x[0] ?? null : (x as Pac));

  const lancamentos: Lancamento[] = [];
  const porPaciente = new Map<string, ReceitaPaciente>();
  const somaPaciente = (pac: Pac, valor: number, sessoes: number, pacotesN: number) => {
    const chave = pac?.id ?? "sem-paciente";
    const atual = porPaciente.get(chave) ?? { nome: pac?.full_name ?? "Sem paciente", cpf: pac?.cpf ?? null, sessoes: 0, pacotes: 0, total_cents: 0 };
    atual.sessoes += sessoes; atual.pacotes += pacotesN; atual.total_cents += valor;
    porPaciente.set(chave, atual);
  };

  for (const a of appts ?? []) {
    const pac = umPaciente(a.patients);
    const valor = (a.price_cents ?? 0) - (a.discount_cents ?? 0);
    const servico = (Array.isArray(a.services) ? a.services[0] : a.services) as { name: string } | null;
    lancamentos.push({ data: diaSP(a.starts_at), historico: `${servico?.name ?? "Atendimento"} · ${pac?.full_name ?? "Sem paciente"}`, tipo: "entrada", categoria: "Sessão", cpf: pac?.cpf ?? null, valor_cents: valor });
    somaPaciente(pac, valor, 1, 0);
  }
  for (const pk of pacotes ?? []) {
    const pac = umPaciente(pk.patients);
    lancamentos.push({ data: diaSP(pk.purchased_at), historico: `Pacote ${pk.package_name} · ${pac?.full_name ?? "Sem paciente"}`, tipo: "entrada", categoria: "Pacote", cpf: pac?.cpf ?? null, valor_cents: pk.price_cents ?? 0, forma: pk.payment_method ?? null });
    somaPaciente(pac, pk.price_cents ?? 0, 0, 1);
  }
  for (const d of despesas ?? []) {
    lancamentos.push({ data: d.paid_at, historico: d.description, tipo: "saida", categoria: d.category, cpf: null, valor_cents: d.amount_cents });
  }
  lancamentos.sort((x, y) => x.data.localeCompare(y.data) || (x.tipo === y.tipo ? 0 : x.tipo === "entrada" ? -1 : 1));

  const substituidosSet = new Set((substituidos ?? []).map((s) => s.replaces_id as string));
  const recibos: ReciboLinha[] = (docs ?? [])
    .filter((d) => !substituidosSet.has(d.id))
    .map((d) => {
      const r = (d.body as ReciboBody)?.recibo ?? {};
      const pac = umPaciente(d.patients);
      return {
        numero: d.number,
        data: r.dataRecebimento || diaSP(d.issued_at),
        paciente: pac?.full_name ?? "",
        cpf: pac?.cpf ?? null,
        pagador: r.pagadorOutro ? r.pagadorNome ?? "" : pac?.full_name ?? "",
        pagadorCpf: r.pagadorOutro ? r.pagadorCpf ?? null : pac?.cpf ?? null,
        forma: r.forma ?? "",
        valor_cents: r.total_cents ?? 0,
      };
    });

  return (
    <RelatorioContador
      clinica={{ nome: clinic!.name, razao: clinic!.legal_name, documento: clinic!.cnpj_cpf, crefito: clinic!.crefito }}
      periodo={{ tipo: p.tipo, ref: p.ref }}
      lancamentos={lancamentos}
      pacientes={[...porPaciente.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))}
      recibos={recibos}
    />
  );
}

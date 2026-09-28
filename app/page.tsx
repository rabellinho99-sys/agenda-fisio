import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { brl } from "@/lib/format";

export const revalidate = 300;

type Plan = {
  code: string;
  name: string;
  price_cents: number;
  max_professionals: number | null;
  features: Record<string, boolean> | null;
  billing_months: number;
  discount_pct: number;
  base_plan_code: string | null;
};

const FEATS: { chave: string; texto: string; sempre?: boolean }[] = [
  { chave: "agenda", texto: "Agenda e agendamento online com fotos dos serviços", sempre: true },
  { chave: "prontuario", texto: "Prontuário: anamnese e evolução SOAP" },
  { chave: "basicos", texto: "Declaração, atestado e QR de validação", sempre: true },
  { chave: "whatsapp", texto: "WhatsApp automático (confirmação e lembretes)" },
  { chave: "packages", texto: "Pacotes de sessões" },
  { chave: "tcle", texto: "TCLE digital com assinatura" },
  { chave: "imagens", texto: "Imagens e exames no prontuário" },
  { chave: "documentos_clinicos", texto: "Relatório e encaminhamento automáticos" },
  { chave: "testes", texto: "Testes ortopédicos e força com CIF" },
  { chave: "pericia", texto: "Laudo pericial e parecer técnico" },
  { chave: "financeiro", texto: "Financeiro completo com relatórios" },
];

const temFeat = (p: Plan, f: (typeof FEATS)[number]) => !!f.sempre || !!p.features?.[f.chave];

async function carregarPlanos(): Promise<Plan[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const { data } = await supabase
      .from("plans")
      .select("code, name, price_cents, max_professionals, features, billing_months, discount_pct, base_plan_code")
      .eq("active", true)
      .order("price_cents");
    return (data ?? []) as Plan[];
  } catch {
    return [];
  }
}

export default async function Home() {
  const planos = await carregarPlanos();
  const base = planos.filter((p) => p.billing_months === 1);
  const variante = (codigo: string, meses: number) =>
    planos.find((p) => p.base_plan_code === codigo && p.billing_months === meses);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <span className="text-lg font-extrabold tracking-tight">Agenda Fisio Pro</span>
        <nav className="flex items-center gap-2">
          {base.length > 0 && <a href="#planos" className="btn-ghost">Planos</a>}
          <Link href="/entrar" className="btn-ghost">Entrar</Link>
        </nav>
      </header>

      <section className="grid flex-1 items-center gap-12 py-12 md:grid-cols-[1.2fr_1fr]">
        <div>
          <h1 className="h-display text-5xl md:text-7xl">
            Sua agenda, seu link, seus pacientes confirmando sozinhos.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-ink/75">
            Agendamento online feito por fisioterapeuta para fisioterapeuta. Página pública
            para o paciente marcar, prontuário com evolução SOAP, documentos com CIF e QR,
            testes ortopédicos, WhatsApp automático e pacotes de sessões.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/entrar?modo=cadastro" className="btn-primary">Criar minha agenda grátis</Link>
            {base.length > 0
              ? <a href="#planos" className="btn-ghost">Ver planos e preços</a>
              : <Link href="/entrar" className="btn-ghost">Já tenho conta</Link>}
          </div>
          <p className="mt-4 text-sm text-ink/60">30 dias grátis. Sem cartão.</p>
        </div>

        <div className="rounded-2xl bg-moss-deep p-6 text-white">
          <p className="text-sm text-white/70">Como o paciente vê a sua página</p>
          <p className="mt-2 text-2xl font-bold">Sua Clínica</p>
          <p className="text-white/70">Sua cidade</p>
          <div className="mt-6 space-y-2">
            {["Avaliação fisioterapêutica", "Sessão de fisioterapia", "Pilates clínico"].map((s) => (
              <div key={s} className="flex items-center justify-between rounded-lg bg-white/10 px-4 py-3">
                <span>{s}</span>
                <span className="text-sm text-white/70">Escolher</span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-2">
            {["09:00", "09:30", "10:30", "14:00"].map((t) => (
              <span key={t} className="rounded-md bg-amber px-3 py-1.5 text-sm font-bold text-ink">{t}</span>
            ))}
          </div>
          <p className="mt-4 text-xs text-white/50">
            Cada clínica tem a sua página personalizada com nome, serviços e horários reais.
          </p>
        </div>
      </section>

      {base.length > 0 && (
        <section id="planos" className="scroll-mt-6 py-16">
          <h2 className="h-title text-3xl md:text-4xl">Planos e preços</h2>
          <p className="mt-3 max-w-2xl text-ink/70">
            Comece com 30 dias grátis, sem cartão. Depois escolha o plano e a forma de pagamento.
            No semestral e no anual você paga de uma vez e ganha desconto.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {base.map((p) => {
              const sem = variante(p.code, 6);
              const anual = variante(p.code, 12);
              return (
                <div key={p.code} className="flex flex-col rounded-2xl border border-mist bg-white p-6">
                  <p className="text-lg font-bold">{p.name}</p>
                  <p className="mt-1 text-sm text-ink/60">
                    {p.max_professionals
                      ? `Até ${p.max_professionals} ${p.max_professionals > 1 ? "profissionais" : "profissional"}`
                      : "Profissionais ilimitados"}
                  </p>

                  <p className="mt-5 text-4xl font-extrabold tracking-tight">
                    {brl(p.price_cents)}
                    <span className="text-base font-normal text-ink/60">/mês</span>
                  </p>
                  <p className="text-xs text-ink/60">Plano mensal, cancele quando quiser</p>

                  <div className="mt-5 space-y-2">
                    {sem && (
                      <div className="rounded-lg bg-mist/50 px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">Semestral</span>
                          <span className="font-bold">{brl(sem.price_cents)}</span>
                        </div>
                        <p className="text-xs text-ink/60">
                          Equivale a {brl(Math.round(sem.price_cents / 6))}/mês · {sem.discount_pct}% de desconto no Pix
                        </p>
                      </div>
                    )}
                    {anual && (
                      <div className="rounded-lg bg-mist/50 px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">Anual</span>
                          <span className="font-bold">{brl(anual.price_cents)}</span>
                        </div>
                        <p className="text-xs text-ink/60">
                          Equivale a {brl(Math.round(anual.price_cents / 12))}/mês · {anual.discount_pct}% de desconto
                        </p>
                      </div>
                    )}
                  </div>

                  <ul className="mt-5 flex-1 space-y-1.5 text-sm">
                    {FEATS.map((f) => {
                      const tem = temFeat(p, f);
                      return (
                        <li key={f.chave} className={`flex gap-2 ${tem ? "text-ink/85" : "text-ink/35"}`}>
                          <span className="w-4 shrink-0 text-center" aria-hidden="true">{tem ? "✓" : "🔒"}</span>
                          <span>{f.texto}</span>
                        </li>
                      );
                    })}
                  </ul>

                  <Link href="/entrar?modo=cadastro" className="btn-primary mt-6 w-full text-center">
                    Testar 30 dias grátis
                  </Link>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-xs text-ink/60">
            Pagamento por Pix, boleto ou cartão. O plano mensal renova todo mês e pode ser cancelado a qualquer momento pelo painel.
          </p>
        </section>
      )}

      <footer className="border-t border-ink/10 py-8 text-sm text-ink/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>Agenda Fisio Pro · Rabello Academy · CNPJ 53.821.804/0001-18</span>
          <div className="flex gap-4">
            <Link href="/termos-de-uso" className="underline underline-offset-4">Termos de Uso</Link>
            <Link href="/privacidade" className="underline underline-offset-4">Privacidade</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

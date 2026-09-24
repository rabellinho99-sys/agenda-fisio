import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <span className="text-lg font-extrabold tracking-tight">Agenda Fisio Pro</span>
        <Link href="/entrar" className="btn-ghost">Entrar</Link>
      </header>

      <section className="grid flex-1 items-center gap-12 py-12 md:grid-cols-[1.2fr_1fr]">
        <div>
          <h1 className="h-display text-5xl md:text-7xl">
            Sua agenda, seu link, seus pacientes confirmando sozinhos.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-ink/75">
            Agendamento online feito por fisioterapeuta para fisioterapeuta. Página pública
            para o paciente marcar, prontuário com evolução SOAP, termo de consentimento digital e pacotes de sessões.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/entrar?modo=cadastro" className="btn-primary">Criar minha agenda grátis</Link>
            <Link href="/entrar" className="btn-ghost">Já tenho conta</Link>
          </div>
          <p className="mt-4 text-sm text-ink/60">30 dias grátis. Sem cartão.</p>
        </div>

        <div className="rounded-2xl bg-moss-deep p-6 text-white">
          <p className="text-sm text-white/70">Como o paciente vê</p>
          <p className="mt-2 text-2xl font-bold">Dr. Pedro Rabello</p>
          <p className="text-white/70">Governador Valadares</p>
          <div className="mt-6 space-y-2">
            {["Avaliação de dor crônica", "Sessão de PRP", "Mesoterapia"].map((s) => (
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
        </div>
      </section>
    </main>
  );
}

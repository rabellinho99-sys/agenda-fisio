import Link from "next/link";

export type Bloco = string | { lista: string[] };
export type Secao = { titulo: string; blocos: Bloco[] };

export function TextoLegal({
  titulo,
  versao,
  atualizado,
  introducao,
  secoes,
}: {
  titulo: string;
  versao: string;
  atualizado: string;
  introducao: string[];
  secoes: Secao[];
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 leading-relaxed">
      <Link href="/" className="text-lg font-extrabold tracking-tight">Agenda Fisio Pro</Link>
      <h1 className="h-title mt-8 text-3xl">{titulo}</h1>
      <p className="mt-2 text-sm text-ink/60">
        Versão {versao} · Última atualização em {atualizado}
      </p>

      <div className="mt-6 space-y-3 text-[15px]">
        {introducao.map((p, i) => <p key={i}>{p}</p>)}
      </div>

      <nav className="mt-8 rounded-xl bg-white p-4 text-sm" aria-label="Sumário">
        <p className="font-semibold">Sumário</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          {secoes.map((s, i) => (
            <li key={i}><a href={`#s${i + 1}`} className="underline underline-offset-4">{s.titulo}</a></li>
          ))}
        </ol>
      </nav>

      <div className="mt-8 space-y-8 text-[15px]">
        {secoes.map((s, i) => (
          <section key={i} id={`s${i + 1}`} className="scroll-mt-6">
            <h2 className="text-lg font-extrabold">{i + 1}. {s.titulo}</h2>
            <div className="mt-2 space-y-3">
              {s.blocos.map((b, j) =>
                typeof b === "string" ? (
                  <p key={j}>{b}</p>
                ) : (
                  <ul key={j} className="list-disc space-y-1 pl-5">
                    {b.lista.map((item, k) => <li key={k}>{item}</li>)}
                  </ul>
                )
              )}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-12 border-t border-ink/10 pt-6 text-sm text-ink/60">
        <p>Rabello Academy · CNPJ 53.821.804/0001-18</p>
        <p>Avenida Minas Gerais, 700, loja 7, CEP 35010-151, Governador Valadares, MG</p>
        <p>Contato: rabelloacademy@gmail.com</p>
        <p className="mt-3">
          <Link href="/termos-de-uso" className="underline underline-offset-4">Termos de Uso</Link>
          {" · "}
          <Link href="/privacidade" className="underline underline-offset-4">Política de Privacidade</Link>
        </p>
      </footer>
    </main>
  );
}

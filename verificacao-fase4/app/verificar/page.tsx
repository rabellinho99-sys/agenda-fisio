import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = { title: "Verificar documento | Agenda Fisio Pro" };

export default async function VerificarPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>;
}) {
  const { codigo } = await searchParams;
  const limpo = (codigo ?? "").replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (limpo) redirect(`/verificar/${limpo}`);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="text-lg font-extrabold tracking-tight">Agenda Fisio Pro</Link>
        <h1 className="h-title mt-8 text-3xl">Verificar documento</h1>
        <p className="mt-2 text-sm text-ink/70">
          Digite o código de verificação que aparece no rodapé do documento para confirmar que ele é autêntico e não foi alterado.
        </p>
        <form action="/verificar" method="get" className="mt-6 space-y-3">
          <label className="label" htmlFor="codigo">Código de verificação</label>
          <input
            id="codigo"
            name="codigo"
            className="field w-full font-mono uppercase tracking-widest"
            placeholder="0000-0000-0000-0000"
            autoComplete="off"
            required
          />
          <button type="submit" className="btn-primary w-full">Verificar</button>
        </form>
      </div>
    </main>
  );
}

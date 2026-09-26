import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verificação de documento | Agenda Fisio Pro", robots: { index: false } };

type Resultado = {
  numero: number;
  tipo: string;
  titulo: string;
  emitido_em: string;
  clinica: string | null;
  profissional: string | null;
  registro: string | null;
  paciente_iniciais: string | null;
  integro: boolean;
  substituido_por: number | null;
  substitui: number | null;
};

const TZ = "America/Sao_Paulo";

function formatarCodigo(c: string) {
  return c.replace(/[^0-9a-fA-F]/g, "").toUpperCase().match(/.{1,4}/g)?.join("-") ?? c;
}

export default async function VerificacaoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase.rpc("verify_document", { p_code: codigo });
  const doc = ((data ?? []) as Resultado[])[0] ?? null;

  let estado: "valido" | "substituido" | "alterado" | "nao_encontrado" = "nao_encontrado";
  if (doc) estado = !doc.integro ? "alterado" : doc.substituido_por ? "substituido" : "valido";

  const cores = {
    valido: "border-moss-deep bg-white",
    substituido: "border-amber bg-white",
    alterado: "border-danger bg-blush",
    nao_encontrado: "border-danger bg-blush",
  }[estado];

  const titulos = {
    valido: "Documento autêntico",
    substituido: "Documento autêntico, mas substituído",
    alterado: "Atenção: registro com divergência",
    nao_encontrado: "Documento não encontrado",
  }[estado];

  const textos = {
    valido: "Este documento foi emitido pelo Agenda Fisio Pro e não sofreu alterações desde a emissão.",
    substituido: `Este documento foi emitido pelo Agenda Fisio Pro, mas o profissional emitiu uma versão mais nova (documento nº ${doc?.substituido_por}). Solicite a versão atualizada.`,
    alterado: "O registro deste documento não confere com o conteúdo original. Não o considere válido e procure o profissional que o emitiu.",
    nao_encontrado: "Nenhum documento corresponde a este código. Confira se digitou corretamente os 16 caracteres do rodapé.",
  }[estado];

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <Link href="/" className="text-lg font-extrabold tracking-tight">Agenda Fisio Pro</Link>
        <p className="mt-8 text-sm text-ink/60">
          Código verificado: <span className="font-mono">{formatarCodigo(codigo)}</span>
        </p>

        <section className={`mt-3 rounded-xl border-l-4 p-5 ${cores}`}>
          <h1 className="text-xl font-extrabold">{titulos}</h1>
          <p className="mt-2 text-sm leading-relaxed">{textos}</p>

          {doc && (
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-ink/60">Documento</dt>
              <dd>{doc.titulo}, nº {doc.numero}{doc.substitui ? ` (substitui o nº ${doc.substitui})` : ""}</dd>
              <dt className="text-ink/60">Emitido em</dt>
              <dd>{new Date(doc.emitido_em).toLocaleString("pt-BR", { timeZone: TZ })}</dd>
              {doc.profissional && (
                <>
                  <dt className="text-ink/60">Profissional</dt>
                  <dd>{doc.profissional}{doc.registro ? `, ${doc.registro}` : ""}</dd>
                </>
              )}
              {doc.clinica && (
                <>
                  <dt className="text-ink/60">Local</dt>
                  <dd>{doc.clinica}</dd>
                </>
              )}
              {doc.paciente_iniciais && (
                <>
                  <dt className="text-ink/60">Paciente</dt>
                  <dd>{doc.paciente_iniciais}</dd>
                </>
              )}
            </dl>
          )}
        </section>

        <p className="mt-4 text-xs text-ink/60">
          Por privacidade, esta página mostra apenas os dados de identificação do documento, nunca o conteúdo clínico.
          Compare as informações acima com o documento que você recebeu.
        </p>
        <Link href="/verificar" className="mt-4 inline-block text-sm underline underline-offset-4">
          Verificar outro código
        </Link>
      </div>
    </main>
  );
}

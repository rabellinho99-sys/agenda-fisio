import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { qrSvg } from "@/lib/qrcodegen";
import { codigoComQualificador, descricaoQualificador, ordenarItens, type CifItem } from "@/lib/cif";

export const dynamic = "force-dynamic";

type Snapshot = {
  professional: {
    name: string; crefito: string | null; crefito_region: string | null; titles: string | null;
    phone: string | null; email: string | null; signature_path: string | null; stamp_path: string | null;
  };
  clinic: {
    name: string; legal_name: string | null; cnpj_cpf: string | null; phone: string | null; email: string | null;
    address: { street?: string; district?: string; city?: string; state?: string; zip?: string } | null;
    logo_url: string | null;
  };
  patient: { name: string; cpf: string | null; birth_date: string | null };
};

type Corpo = {
  secoes: { titulo: string; texto: string }[];
  cid?: string | null;
  cid_autorizado?: boolean;
  rodape_legal?: string;
  recibo?: { total_cents?: number };
  orcamento?: { total_cents?: number };
};

const TZ = "America/Sao_Paulo";

const reais = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\u00a0/g, " ");

export default async function DocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/entrar?next=/documento/${id}`);

  const { data: doc } = await supabase
    .from("documents")
    .select("id, number, title, body, cif, snapshot, hash, issued_at, replaces_id")
    .eq("id", id)
    .maybeSingle();
  if (!doc) notFound();

  const snap = doc.snapshot as Snapshot;
  const corpo = doc.body as Corpo;
  const cif = ordenarItens((doc.cif ?? []) as CifItem[]);

  async function assinado(path: string | null) {
    if (!path) return null;
    const { data } = await supabase.storage.from("professional-assets").createSignedUrl(path, 600);
    return data?.signedUrl ?? null;
  }
  const [assinatura, carimbo] = await Promise.all([
    assinado(snap.professional.signature_path),
    assinado(snap.professional.stamp_path),
  ]);

  let versaoAnterior: number | null = null;
  if (doc.replaces_id) {
    const { data: ant } = await supabase.from("documents").select("number").eq("id", doc.replaces_id).maybeSingle();
    versaoAnterior = ant?.number ?? null;
  }

  const end = snap.clinic.address ?? {};
  const cidadeUf = [end.city, end.state].filter(Boolean).join(" - ");
  const enderecoLinha = [end.street, end.district, cidadeUf, end.zip].filter(Boolean).join(", ");
  const contato = [snap.clinic.phone, snap.clinic.email].filter(Boolean).join(" | ");
  const registro = [snap.professional.crefito_region, snap.professional.crefito].filter(Boolean).join(" ");

  // validação pública: o código são os 16 primeiros caracteres do hash do documento
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "agendafisiopro.com.br";
  const codigo = String(doc.hash).slice(0, 16).toUpperCase();
  const codigoFormatado = (codigo.match(/.{1,4}/g) ?? [codigo]).join("-");
  const urlVerificacao = `https://${host}/verificar/${codigo}`;
  const qr = qrSvg(urlVerificacao);

  const emitido = new Date(doc.issued_at);
  const dataExtenso = emitido.toLocaleDateString("pt-BR", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" });
  const dataHora = emitido.toLocaleString("pt-BR", { timeZone: TZ });

  const totalRecibo = corpo.recibo?.total_cents ?? 0;
  const totalOrcamento = corpo.orcamento?.total_cents ?? 0;

  return (
    <main className="min-h-screen bg-paper py-8 print:bg-white print:py-0">
      <style>{`
        @page { size: A4; margin: 16mm 16mm 14mm 16mm; }
        @media print { body { background: #fff !important; } }
      `}</style>

      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <p className="text-sm text-ink/70">
          No celular ou computador, escolha &quot;Salvar como PDF&quot; na janela de impressão.
        </p>
        <BotaoImprimir />
      </div>

      <article className="mx-auto flex min-h-[297mm] max-w-[210mm] flex-col bg-white px-[16mm] py-[14mm] text-[11pt] leading-relaxed text-black shadow print:min-h-0 print:p-0 print:shadow-none">
        <header className="flex items-center gap-4 border-b border-black/20 pb-3">
          {snap.clinic.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={snap.clinic.logo_url} alt="" className="h-16 w-auto max-w-[45mm] object-contain" />
          )}
          <div className="text-[9.5pt] leading-snug">
            <p className="text-[11pt] font-bold">{snap.clinic.name}</p>
            {snap.clinic.legal_name && <p>{snap.clinic.legal_name}</p>}
            {snap.clinic.cnpj_cpf && <p>CNPJ/CPF: {snap.clinic.cnpj_cpf}</p>}
            {enderecoLinha && <p>{enderecoLinha}</p>}
            {contato && <p>{contato}</p>}
          </div>
        </header>

        <h1 className="mt-8 text-center text-[13pt] font-bold uppercase tracking-wide">{doc.title}</h1>

        {totalRecibo > 0 && (
          <p className="mx-auto mt-4 rounded border border-black/40 px-6 py-2 text-center text-[14pt] font-bold">
            Valor: {reais(totalRecibo)}
          </p>
        )}
        {totalOrcamento > 0 && (
          <p className="mx-auto mt-4 rounded border border-black/40 px-6 py-2 text-center text-[14pt] font-bold">
            Investimento total: {reais(totalOrcamento)}
          </p>
        )}

        <div className="mt-6 space-y-4 text-justify">
          {corpo.secoes
            .filter((s) => s.texto?.trim())
            .map((s, i) => (
              <section key={i} className="break-inside-avoid">
                {s.titulo && <h2 className="mb-1 font-bold">{s.titulo}</h2>}
                <p className="whitespace-pre-line">{s.texto}</p>
              </section>
            ))}

          {corpo.cid && corpo.cid_autorizado && (
            <p>CID: {corpo.cid} (inclusão autorizada pelo paciente).</p>
          )}

          {cif.length > 0 && (
            <section className="break-inside-avoid">
              <h2 className="mb-1 font-bold">Classificação Internacional de Funcionalidade (CIF)</h2>
              <table className="w-full border-collapse text-[9.5pt]">
                <tbody>
                  {cif.map((i) => (
                    <tr key={i.code} className="border-b border-black/10">
                      <td className="w-[28mm] py-1 pr-2 align-top font-mono">{codigoComQualificador(i)}</td>
                      <td className="py-1 align-top">{i.title}</td>
                      <td className="py-1 pl-2 text-right align-top">{descricaoQualificador(i)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>

        <p className="mt-8 text-right">{[cidadeUf, dataExtenso].filter(Boolean).join(", ")}.</p>

        <div className="mt-10 flex flex-col items-center text-center break-inside-avoid">
          <div className="flex h-20 items-end justify-center gap-2">
            {assinatura && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assinatura} alt="" className="h-20 w-auto object-contain" />
            )}
            {carimbo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={carimbo} alt="" className="h-20 w-auto object-contain" />
            )}
          </div>
          <div className="mt-1 w-[80mm] border-t border-black pt-1">
            <p className="font-bold">{snap.professional.name}</p>
            <p>Fisioterapeuta{registro ? ` | ${registro}` : ""}</p>
            {snap.professional.titles && <p className="text-[9.5pt]">{snap.professional.titles}</p>}
          </div>
        </div>

        {corpo.rodape_legal && (
          <p className="mt-8 border-t border-black/20 pt-2 text-justify text-[8.5pt] leading-snug text-black/70 break-inside-avoid">
            {corpo.rodape_legal}
          </p>
        )}

        <footer className="mt-auto flex items-end gap-3 pt-10 text-[8pt] text-black/60 break-inside-avoid">
          <div
            className="h-[22mm] w-[22mm] shrink-0"
            aria-label="QR Code de verificação"
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <div className="leading-snug">
            <p>
              Documento nº {doc.number} emitido em {dataHora}
              {versaoAnterior ? `, substitui o documento nº ${versaoAnterior}` : ""}.
            </p>
            <p>
              Código de verificação: <span className="font-mono text-black">{codigoFormatado}</span>
            </p>
            <p>Confira a autenticidade lendo o QR Code ou em {host}/verificar</p>
          </div>
        </footer>
      </article>
    </main>
  );
}

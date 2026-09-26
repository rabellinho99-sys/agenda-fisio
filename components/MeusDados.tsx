"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Endereco = {
  street?: string;
  district?: string;
  city?: string;
  state?: string;
  zip?: string;
  [k: string]: unknown;
};

type Clinic = {
  id: string;
  name: string;
  legal_name: string | null;
  cnpj_cpf: string | null;
  crefito: string | null;
  phone: string | null;
  email: string | null;
  address: Endereco | null;
  logo_url: string | null;
};

type Professional = {
  id: string;
  display_name: string;
  doc_full_name: string | null;
  crefito: string | null;
  crefito_region: string | null;
  specialties: string[] | null;
  phone: string | null;
  email: string | null;
  address_text: string | null;
  doc_titles: string | null;
  signature_path: string | null;
  stamp_path: string | null;
} | null;

type Props = { clinic: Clinic; professional: Professional; isOwner: boolean; userEmail: string };

type Imagem = { blob: Blob; preview: string } | null;

const BUCKET_LOGO = "clinic-logos";
const BUCKET_PRIVADO = "professional-assets";

// Converte para PNG (melhor para PDF), reduz o tamanho e, se pedido,
// deixa o fundo branco transparente (útil para foto de assinatura e carimbo em papel).
async function prepararImagem(file: File, maxLado: number, removerBranco: boolean): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const escala = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * escala);
  c.height = Math.round(bmp.height * escala);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  if (removerBranco) {
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 225 && d[i + 1] > 225 && d[i + 2] > 225) d[i + 3] = 0;
    }
    ctx.putImageData(img, 0, 0);
  }
  return new Promise((ok, erro) =>
    c.toBlob((b) => (b ? ok(b) : erro(new Error("Falha ao converter a imagem"))), "image/png")
  );
}

function caminhoPublico(url: string | null, bucket: string) {
  if (!url) return null;
  const marca = `/${bucket}/`;
  const i = url.indexOf(marca);
  return i >= 0 ? decodeURIComponent(url.slice(i + marca.length).split("?")[0]) : null;
}

export function MeusDados({ clinic, professional, isOwner, userEmail }: Props) {
  const supabase = createClient();

  // profissional
  const [nomeDoc, setNomeDoc] = useState(professional?.doc_full_name ?? professional?.display_name ?? "");
  const [crefitoRegiao, setCrefitoRegiao] = useState(professional?.crefito_region ?? "");
  const [crefito, setCrefito] = useState(professional?.crefito ?? "");
  const [especialidades, setEspecialidades] = useState((professional?.specialties ?? []).join(", "));
  const [telProf, setTelProf] = useState(professional?.phone ?? "");
  const [emailProf, setEmailProf] = useState(professional?.email ?? userEmail);
  const [enderecoProf, setEnderecoProf] = useState(professional?.address_text ?? "");
  const [titulos, setTitulos] = useState(professional?.doc_titles ?? "");

  // clínica
  const end: Endereco = clinic.address ?? {};
  const [nomeClinica, setNomeClinica] = useState(clinic.name ?? "");
  const [razao, setRazao] = useState(clinic.legal_name ?? "");
  const [cnpj, setCnpj] = useState(clinic.cnpj_cpf ?? "");
  const [crefitoClinica, setCrefitoClinica] = useState(clinic.crefito ?? "");
  const [telClinica, setTelClinica] = useState(clinic.phone ?? "");
  const [emailClinica, setEmailClinica] = useState(clinic.email ?? "");
  const [rua, setRua] = useState(end.street ?? "");
  const [bairro, setBairro] = useState(end.district ?? "");
  const [cidade, setCidade] = useState(end.city ?? "");
  const [uf, setUf] = useState(end.state ?? "");
  const [cep, setCep] = useState(end.zip ?? "");

  // imagens salvas
  const [logoUrl, setLogoUrl] = useState(clinic.logo_url);
  const [assinaturaPath, setAssinaturaPath] = useState(professional?.signature_path ?? null);
  const [carimboPath, setCarimboPath] = useState(professional?.stamp_path ?? null);
  const [assinaturaVer, setAssinaturaVer] = useState<string | null>(null);
  const [carimboVer, setCarimboVer] = useState<string | null>(null);

  // imagens novas (só vão para o servidor ao salvar)
  const [novaLogo, setNovaLogo] = useState<Imagem>(null);
  const [novaAssinatura, setNovaAssinatura] = useState<Imagem>(null);
  const [novoCarimbo, setNovoCarimbo] = useState<Imagem>(null);
  const [removerLogo, setRemoverLogo] = useState(false);
  const [removerAssinatura, setRemoverAssinatura] = useState(false);
  const [removerCarimbo, setRemoverCarimbo] = useState(false);
  const [fundoTransparente, setFundoTransparente] = useState(true);

  const [alterado, setAlterado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // mostra assinatura e carimbo já salvos (pasta privada, link temporário)
  useEffect(() => {
    async function carregar(path: string | null, set: (v: string | null) => void) {
      if (!path) return set(null);
      const { data } = await supabase.storage.from(BUCKET_PRIVADO).createSignedUrl(path, 3600);
      set(data?.signedUrl ?? null);
    }
    carregar(assinaturaPath, setAssinaturaVer);
    carregar(carimboPath, setCarimboVer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinaturaPath, carimboPath]);

  useEffect(() => {
    if (!alterado) return;
    const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [alterado]);

  function mudou<T>(set: (v: T) => void) {
    return (v: T) => { set(v); setAlterado(true); setMsg(null); };
  }

  async function escolher(
    file: File | undefined,
    tipo: "logo" | "assinatura" | "carimbo"
  ) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      return setMsg({ tipo: "erro", texto: "Escolha um arquivo de imagem (JPG, PNG ou WebP)." });
    }
    try {
      const remover = tipo !== "logo" && fundoTransparente;
      const blob = await prepararImagem(file, tipo === "logo" ? 800 : 900, remover);
      if (blob.size > 2 * 1024 * 1024) throw new Error("A imagem ficou maior que 2 MB. Use uma imagem menor.");
      const img = { blob, preview: URL.createObjectURL(blob) };
      if (tipo === "logo") { setNovaLogo(img); setRemoverLogo(false); }
      if (tipo === "assinatura") { setNovaAssinatura(img); setRemoverAssinatura(false); }
      if (tipo === "carimbo") { setNovoCarimbo(img); setRemoverCarimbo(false); }
      setAlterado(true);
      setMsg(null);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e instanceof Error ? e.message : "Não foi possível ler a imagem." });
    }
  }

  async function salvar() {
    setSalvando(true);
    setMsg(null);
    const enviados: { bucket: string; path: string }[] = [];
    const paraApagar: { bucket: string; path: string }[] = [];
    const ts = Date.now();

    try {
      // 1. imagens
      let logoFinal = logoUrl;
      if (isOwner && novaLogo) {
        const path = `${clinic.id}/logo-${ts}.png`;
        const r = await supabase.storage.from(BUCKET_LOGO).upload(path, novaLogo.blob, { contentType: "image/png" });
        if (r.error) throw r.error;
        enviados.push({ bucket: BUCKET_LOGO, path });
        logoFinal = supabase.storage.from(BUCKET_LOGO).getPublicUrl(path).data.publicUrl;
      } else if (isOwner && removerLogo) {
        logoFinal = null;
      }

      let assinaturaFinal = assinaturaPath;
      let carimboFinal = carimboPath;
      if (professional) {
        if (novaAssinatura) {
          const path = `${clinic.id}/${professional.id}/assinatura-${ts}.png`;
          const r = await supabase.storage.from(BUCKET_PRIVADO).upload(path, novaAssinatura.blob, { contentType: "image/png" });
          if (r.error) throw r.error;
          enviados.push({ bucket: BUCKET_PRIVADO, path });
          assinaturaFinal = path;
        } else if (removerAssinatura) {
          assinaturaFinal = null;
        }
        if (novoCarimbo) {
          const path = `${clinic.id}/${professional.id}/carimbo-${ts}.png`;
          const r = await supabase.storage.from(BUCKET_PRIVADO).upload(path, novoCarimbo.blob, { contentType: "image/png" });
          if (r.error) throw r.error;
          enviados.push({ bucket: BUCKET_PRIVADO, path });
          carimboFinal = path;
        } else if (removerCarimbo) {
          carimboFinal = null;
        }
      }

      // 2. dados do profissional
      if (professional) {
        const { error } = await supabase
          .from("professionals")
          .update({
            doc_full_name: nomeDoc.trim() || null,
            crefito_region: crefitoRegiao.trim() || null,
            crefito: crefito.trim() || null,
            specialties: especialidades.split(",").map((s) => s.trim()).filter(Boolean),
            phone: telProf.trim() || null,
            email: emailProf.trim() || null,
            address_text: enderecoProf.trim() || null,
            doc_titles: titulos.trim() || null,
            signature_path: assinaturaFinal,
            stamp_path: carimboFinal,
          })
          .eq("id", professional.id);
        if (error) throw error;
      }

      // 3. dados da clínica (só o dono)
      if (isOwner) {
        const { error } = await supabase
          .from("clinics")
          .update({
            name: nomeClinica.trim() || clinic.name,
            legal_name: razao.trim() || null,
            cnpj_cpf: cnpj.trim() || null,
            crefito: crefitoClinica.trim() || null,
            phone: telClinica.trim() || null,
            email: emailClinica.trim() || null,
            address: {
              ...end,
              street: rua.trim(),
              district: bairro.trim(),
              city: cidade.trim(),
              state: uf.trim().toUpperCase(),
              zip: cep.trim(),
            },
            logo_url: logoFinal,
          })
          .eq("id", clinic.id);
        if (error) throw error;
      }

      // 4. apaga os arquivos antigos que foram trocados ou removidos
      const logoAntiga = caminhoPublico(logoUrl, BUCKET_LOGO);
      if (isOwner && logoAntiga && logoFinal !== logoUrl) paraApagar.push({ bucket: BUCKET_LOGO, path: logoAntiga });
      if (assinaturaPath && assinaturaFinal !== assinaturaPath) paraApagar.push({ bucket: BUCKET_PRIVADO, path: assinaturaPath });
      if (carimboPath && carimboFinal !== carimboPath) paraApagar.push({ bucket: BUCKET_PRIVADO, path: carimboPath });
      for (const a of paraApagar) await supabase.storage.from(a.bucket).remove([a.path]);

      setLogoUrl(logoFinal);
      setAssinaturaPath(assinaturaFinal);
      setCarimboPath(carimboFinal);
      setNovaLogo(null);
      setNovaAssinatura(null);
      setNovoCarimbo(null);
      setRemoverLogo(false);
      setRemoverAssinatura(false);
      setRemoverCarimbo(false);
      setAlterado(false);
      setMsg({ tipo: "ok", texto: "Dados salvos. Eles serão usados automaticamente nos seus documentos." });
    } catch (e) {
      for (const a of enviados) await supabase.storage.from(a.bucket).remove([a.path]);
      setMsg({
        tipo: "erro",
        texto: e instanceof Error ? `Não foi possível salvar: ${e.message}` : "Não foi possível salvar.",
      });
    } finally {
      setSalvando(false);
    }
  }

  const logoExibida = novaLogo?.preview ?? (removerLogo ? null : logoUrl);
  const assinaturaExibida = novaAssinatura?.preview ?? (removerAssinatura ? null : assinaturaVer);
  const carimboExibido = novoCarimbo?.preview ?? (removerCarimbo ? null : carimboVer);
  const registro = [crefitoRegiao.trim(), crefito.trim()].filter(Boolean).join(" ");
  const cidadeUf = [cidade.trim(), uf.trim().toUpperCase()].filter(Boolean).join(" - ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-title text-2xl">Meus dados</h1>
        <p className="mt-1 text-sm text-ink/70">
          Preencha uma vez. Relatórios, atestados, declarações e pareceres já saem com esses dados.
        </p>
      </div>

      {/* Prévia do cabeçalho e da assinatura dos documentos */}
      <section className="rounded-xl bg-white p-4">
        <p className="text-sm font-semibold">Como vai aparecer nos documentos</p>
        <div className="mt-3 rounded-lg border border-ink/10 p-4">
          <div className="flex items-center gap-4 border-b border-ink/10 pb-3">
            {logoExibida ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoExibida} alt="Logomarca" className="h-14 w-auto max-w-[140px] object-contain" />
            ) : (
              <div className="flex h-14 w-24 items-center justify-center rounded bg-paper text-xs text-ink/50">
                Sua logo
              </div>
            )}
            <div className="text-sm leading-snug">
              <p className="font-extrabold">{nomeClinica || "Nome da clínica"}</p>
              {cnpj && <p className="text-ink/70">CNPJ/CPF {cnpj}</p>}
              {cidadeUf && <p className="text-ink/70">{cidadeUf}</p>}
            </div>
          </div>
          <div className="mt-6 flex flex-col items-center text-center text-sm">
            <div className="relative flex h-16 items-end justify-center">
              {assinaturaExibida && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assinaturaExibida} alt="Assinatura" className="h-16 w-auto object-contain" />
              )}
              {carimboExibido && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={carimboExibido} alt="Carimbo" className="ml-2 h-16 w-auto object-contain opacity-90" />
              )}
            </div>
            <div className="mt-1 w-64 border-t border-ink/40 pt-1">
              <p className="font-semibold">{nomeDoc || "Seu nome completo"}</p>
              <p className="text-ink/70">Fisioterapeuta {registro || "CREFITO"}</p>
              {titulos && <p className="text-xs text-ink/60">{titulos}</p>}
            </div>
          </div>
        </div>
      </section>

      {/* Dados profissionais */}
      <section className="rounded-xl bg-white p-4">
        <p className="text-base font-extrabold">Dados profissionais</p>
        {!professional ? (
          <p className="mt-2 text-sm text-ink/70">
            Seu usuário não está ligado a um cadastro de profissional nesta clínica.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Campo id="nomeDoc" rotulo="Nome completo (como sai nos documentos)" valor={nomeDoc} aoMudar={mudou(setNomeDoc)} dica="Ex.: Dr. Pedro Henrique Rabello" />
            <div className="grid grid-cols-[1fr_1.4fr] gap-3">
              <Campo id="regiao" rotulo="Conselho" valor={crefitoRegiao} aoMudar={mudou(setCrefitoRegiao)} dica="CREFITO-4" />
              <Campo id="crefito" rotulo="Número do registro" valor={crefito} aoMudar={mudou(setCrefito)} dica="123456-F" />
            </div>
            <Campo id="esp" rotulo="Especialidades (separe por vírgula)" valor={especialidades} aoMudar={mudou(setEspecialidades)} dica="Fisioterapia Forense, Terapias Injetáveis" />
            <Campo id="titulos" rotulo="Títulos abaixo do nome (opcional)" valor={titulos} aoMudar={mudou(setTitulos)} dica="Especialista em Fisioterapia Forense" />
            <Campo id="telProf" rotulo="Telefone profissional" valor={telProf} aoMudar={mudou(setTelProf)} dica="(33) 99999-9999" />
            <Campo id="emailProf" rotulo="E-mail profissional" valor={emailProf} aoMudar={mudou(setEmailProf)} />
            <div className="md:col-span-2">
              <Campo id="endProf" rotulo="Endereço de atendimento (se for diferente da clínica)" valor={enderecoProf} aoMudar={mudou(setEnderecoProf)} />
            </div>
          </div>
        )}
      </section>

      {/* Assinatura e carimbo */}
      {professional && (
        <section className="rounded-xl bg-white p-4">
          <p className="text-base font-extrabold">Assinatura e carimbo</p>
          <p className="mt-1 text-xs text-ink/60">
            Assine numa folha branca com caneta escura e tire uma foto de perto, com boa luz. Ficam guardados
            em pasta privada, visível só para a sua clínica.
          </p>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={fundoTransparente} onChange={(e) => setFundoTransparente(e.target.checked)} />
            Remover o fundo branco da foto automaticamente
          </label>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <EnvioImagem
              titulo="Assinatura"
              imagem={assinaturaExibida}
              aoEscolher={(f) => escolher(f, "assinatura")}
              aoRemover={() => { setNovaAssinatura(null); setRemoverAssinatura(true); setAlterado(true); }}
            />
            <EnvioImagem
              titulo="Carimbo (opcional)"
              imagem={carimboExibido}
              aoEscolher={(f) => escolher(f, "carimbo")}
              aoRemover={() => { setNovoCarimbo(null); setRemoverCarimbo(true); setAlterado(true); }}
            />
          </div>
          <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-xs text-ink/70">
            A imagem da assinatura identifica o documento, mas não tem validade de assinatura digital. Para laudos
            e pareceres em processos, assine o PDF gerado pelo gov.br (gratuito).
          </p>
        </section>
      )}

      {/* Logomarca e dados da clínica */}
      <section className="rounded-xl bg-white p-4">
        <p className="text-base font-extrabold">Logomarca e dados da clínica</p>
        {!isOwner && (
          <p className="mt-1 text-xs text-ink/60">Somente o responsável pela clínica pode alterar esta parte.</p>
        )}
        <fieldset disabled={!isOwner} className="mt-3 space-y-4 disabled:opacity-60">
          <EnvioImagem
            titulo="Logomarca"
            imagem={logoExibida}
            aoEscolher={(f) => escolher(f, "logo")}
            aoRemover={() => { setNovaLogo(null); setRemoverLogo(true); setAlterado(true); }}
            nota="Também aparece na sua página de agendamento. Prefira PNG com fundo transparente."
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Campo id="nomeClinica" rotulo="Nome da clínica" valor={nomeClinica} aoMudar={mudou(setNomeClinica)} />
            <Campo id="razao" rotulo="Razão social (se tiver empresa)" valor={razao} aoMudar={mudou(setRazao)} />
            <Campo id="cnpj" rotulo="CNPJ ou CPF" valor={cnpj} aoMudar={mudou(setCnpj)} />
            <Campo id="crefitoClinica" rotulo="Registro da clínica no CREFITO (se tiver)" valor={crefitoClinica} aoMudar={mudou(setCrefitoClinica)} />
            <Campo id="telClinica" rotulo="Telefone da clínica" valor={telClinica} aoMudar={mudou(setTelClinica)} />
            <Campo id="emailClinica" rotulo="E-mail da clínica" valor={emailClinica} aoMudar={mudou(setEmailClinica)} />
            <div className="md:col-span-2">
              <Campo id="rua" rotulo="Endereço (rua, número, complemento)" valor={rua} aoMudar={mudou(setRua)} />
            </div>
            <Campo id="bairro" rotulo="Bairro" valor={bairro} aoMudar={mudou(setBairro)} />
            <div className="grid grid-cols-[1fr_4rem_7rem] gap-3">
              <Campo id="cidade" rotulo="Cidade" valor={cidade} aoMudar={mudou(setCidade)} />
              <Campo id="uf" rotulo="UF" valor={uf} aoMudar={mudou(setUf)} dica="MG" />
              <Campo id="cep" rotulo="CEP" valor={cep} aoMudar={mudou(setCep)} />
            </div>
          </div>
        </fieldset>
      </section>

      {/* Barra de salvar */}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-3 rounded-xl bg-white p-3 shadow-lg">
        {msg && (
          <p role="status" className={`mr-auto text-sm ${msg.tipo === "erro" ? "text-danger" : ""}`}>
            {msg.texto}
          </p>
        )}
        {!msg && alterado && <p className="mr-auto text-sm font-semibold text-ink/70">Alterações não salvas</p>}
        <button type="button" className="btn-primary" onClick={salvar} disabled={salvando || !alterado}>
          {salvando ? "Salvando" : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}

function Campo(props: { id: string; rotulo: string; valor: string; aoMudar: (v: string) => void; dica?: string }) {
  return (
    <div>
      <label className="label" htmlFor={props.id}>{props.rotulo}</label>
      <input
        id={props.id}
        className="field w-full"
        value={props.valor}
        placeholder={props.dica}
        onChange={(e) => props.aoMudar(e.target.value)}
      />
    </div>
  );
}

function EnvioImagem(props: {
  titulo: string;
  imagem: string | null;
  aoEscolher: (f: File | undefined) => void;
  aoRemover: () => void;
  nota?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink/10 bg-paper">
        {props.imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.imagem} alt={props.titulo} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xs text-ink/50">Sem imagem</span>
        )}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold">{props.titulo}</p>
        {props.nota && <p className="text-xs text-ink/60">{props.nota}</p>}
        <input
          ref={ref}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => { props.aoEscolher(e.target.files?.[0]); e.target.value = ""; }}
        />
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-ghost text-sm" onClick={() => ref.current?.click()}>
            {props.imagem ? "Trocar" : "Enviar imagem"}
          </button>
          {props.imagem && (
            <button type="button" className="text-sm text-danger" onClick={props.aoRemover}>
              Remover
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

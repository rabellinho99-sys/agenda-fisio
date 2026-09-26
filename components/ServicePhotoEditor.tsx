"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  clinicId: string;
  serviceId: string;
  imageUrl: string | null;
  description: string | null;
  onSaved?: (v: { image_url: string | null; description: string | null }) => void;
};

const BUCKET = "service-photos";
const MAX_SIDE = 1200;

async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao converter a imagem"))), "image/webp", 0.82)
  );
}

function pathFromUrl(url: string | null) {
  if (!url) return null;
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}

export function ServicePhotoEditor({ clinicId, serviceId, imageUrl, description, onSaved }: Props) {
  const supabase = createClient();
  const input = useRef<HTMLInputElement>(null);

  // estado salvo no banco
  const [urlSalva, setUrlSalva] = useState(imageUrl);
  const [textoSalvo, setTextoSalvo] = useState(description ?? "");

  // alterações pendentes (só vão para o banco ao clicar em Salvar)
  const [novaFoto, setNovaFoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removerFoto, setRemoverFoto] = useState(false);
  const [texto, setTexto] = useState(description ?? "");

  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const alterado = novaFoto !== null || removerFoto || texto.trim() !== textoSalvo.trim();
  const fotoExibida = preview ?? (removerFoto ? null : urlSalva);

  // avisa antes de sair da página com alterações não salvas
  useEffect(() => {
    if (!alterado) return;
    const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [alterado]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function escolher(file: File) {
    if (!file.type.startsWith("image/")) return setMsg("Escolha um arquivo de imagem (JPG, PNG ou WebP).");
    setMsg(null);
    try {
      const blob = await compress(file);
      if (blob.size > 2 * 1024 * 1024) throw new Error("A foto ficou maior que 2 MB mesmo comprimida. Use outra imagem.");
      if (preview) URL.revokeObjectURL(preview);
      setNovaFoto(blob);
      setPreview(URL.createObjectURL(blob));
      setRemoverFoto(false);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Não foi possível ler a foto.");
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  function marcarRemocao() {
    if (preview) URL.revokeObjectURL(preview);
    setNovaFoto(null);
    setPreview(null);
    setRemoverFoto(true);
    setMsg(null);
  }

  function descartar() {
    if (preview) URL.revokeObjectURL(preview);
    setNovaFoto(null);
    setPreview(null);
    setRemoverFoto(false);
    setTexto(textoSalvo);
    setMsg("Alterações descartadas.");
  }

  async function salvar() {
    setOcupado(true);
    setMsg(null);
    let urlFinal = urlSalva;
    let caminhoNovo: string | null = null;
    try {
      if (novaFoto) {
        caminhoNovo = `${clinicId}/${serviceId}-${Date.now()}.webp`;
        const up = await supabase.storage.from(BUCKET).upload(caminhoNovo, novaFoto, { contentType: "image/webp" });
        if (up.error) throw up.error;
        urlFinal = supabase.storage.from(BUCKET).getPublicUrl(caminhoNovo).data.publicUrl;
      } else if (removerFoto) {
        urlFinal = null;
      }
      const descFinal = texto.trim() || null;
      const upd = await supabase.from("services").update({ image_url: urlFinal, description: descFinal }).eq("id", serviceId);
      if (upd.error) throw upd.error;

      const antigo = pathFromUrl(urlSalva);
      if (antigo && urlFinal !== urlSalva) await supabase.storage.from(BUCKET).remove([antigo]);

      if (preview) URL.revokeObjectURL(preview);
      setUrlSalva(urlFinal);
      setTextoSalvo(descFinal ?? "");
      setTexto(descFinal ?? "");
      setNovaFoto(null);
      setPreview(null);
      setRemoverFoto(false);
      setMsg("Alterações salvas.");
      onSaved?.({ image_url: urlFinal, description: descFinal });
    } catch (e) {
      if (caminhoNovo) await supabase.storage.from(BUCKET).remove([caminhoNovo]);
      setMsg(e instanceof Error ? `Não foi possível salvar: ${e.message}` : "Não foi possível salvar.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg bg-paper p-3">
      <p className="text-sm font-semibold">Foto e explicação para o paciente</p>
      <p className="text-xs text-ink/60">Aparecem na sua página de agendamento. Prefira foto da técnica ou do material, sem rosto de paciente.</p>

      <div className="mt-3 flex flex-wrap items-start gap-3">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-white">
          {fotoExibida ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoExibida} alt="Foto do procedimento" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-xs text-ink/50">Sem foto</div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && escolher(e.target.files[0])}
          />
          <button type="button" className="btn-ghost text-sm" disabled={ocupado} onClick={() => input.current?.click()}>
            {fotoExibida ? "Trocar foto" : "Escolher foto"}
          </button>
          {fotoExibida && (
            <button type="button" className="text-left text-sm text-danger" disabled={ocupado} onClick={marcarRemocao}>
              Remover foto
            </button>
          )}
        </div>
      </div>

      <label className="mt-3 block text-sm font-semibold" htmlFor={`desc-${serviceId}`}>O que é (1 a 2 frases)</label>
      <textarea
        id={`desc-${serviceId}`}
        className="field mt-1 w-full"
        rows={3}
        maxLength={280}
        placeholder="Ex.: Concentrado feito com o seu próprio sangue, aplicado na região da lesão para estimular a regeneração do tecido."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      <p className="mt-1 text-xs text-ink/50">{texto.length}/280</p>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {alterado && <span className="mr-auto text-xs font-semibold text-ink/70">Alterações não salvas</span>}
        <button type="button" className="btn-ghost text-sm" disabled={ocupado || !alterado} onClick={descartar}>
          Descartar
        </button>
        <button type="button" className="btn-primary text-sm" disabled={ocupado || !alterado} onClick={salvar}>
          {ocupado ? "Salvando" : "Salvar alterações"}
        </button>
      </div>

      {msg && <p className="mt-2 text-sm" role="status">{msg}</p>}
    </div>
  );
}

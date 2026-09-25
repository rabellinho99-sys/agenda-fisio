"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "service-photos";
const MAX_LADO = 1200;
const MAX_TEXTO = 280;

async function comprimir(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => falha(new Error("Não foi possível ler a imagem."));
      i.src = url;
    });
    const escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
    const w = Math.round(img.width * escala);
    const h = Math.round(img.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.82));
    if (!blob) throw new Error("Falha ao converter a imagem.");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function caminhoDaUrl(url: string | null) {
  if (!url) return null;
  const marca = `/${BUCKET}/`;
  const i = url.indexOf(marca);
  return i >= 0 ? url.slice(i + marca.length).split("?")[0] : null;
}

export function ServicePhotoEditor({
  clinicId, serviceId, imageUrl, description, onSaved,
}: {
  clinicId: string; serviceId: string; imageUrl: string | null; description: string | null; onSaved?: () => void;
}) {
  const supabase = createClient();
  const input = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<string | null>(imageUrl);
  const [texto, setTexto] = useState(description ?? "");
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  async function enviar(file: File) {
    setMsg(null);
    if (!file.type.startsWith("image/")) return setMsg({ tipo: "erro", texto: "Escolha um arquivo de imagem." });
    setOcupado(true);
    try {
      const blob = await comprimir(file);
      if (blob.size > 2 * 1024 * 1024) throw new Error("A imagem ficou maior que 2 MB. Use uma foto menor.");
      const caminho = `${clinicId}/${serviceId}-${Date.now()}.webp`;
      const up = await supabase.storage.from(BUCKET).upload(caminho, blob, { contentType: "image/webp", upsert: false });
      if (up.error) throw new Error(up.error.message);
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
      const { error } = await supabase.from("services").update({ image_url: data.publicUrl }).eq("id", serviceId);
      if (error) throw new Error(error.message);
      const antigo = caminhoDaUrl(foto);
      if (antigo) await supabase.storage.from(BUCKET).remove([antigo]);
      setFoto(data.publicUrl);
      setMsg({ tipo: "ok", texto: "Foto salva." });
      onSaved?.();
    } catch (e) {
      setMsg({ tipo: "erro", texto: e instanceof Error ? e.message : "Erro ao enviar a foto." });
    } finally {
      setOcupado(false);
      if (input.current) input.current.value = "";
    }
  }

  async function removerFoto() {
    setMsg(null); setOcupado(true);
    const { error } = await supabase.from("services").update({ image_url: null }).eq("id", serviceId);
    if (error) { setOcupado(false); return setMsg({ tipo: "erro", texto: error.message }); }
    const antigo = caminhoDaUrl(foto);
    if (antigo) await supabase.storage.from(BUCKET).remove([antigo]);
    setFoto(null); setOcupado(false);
    setMsg({ tipo: "ok", texto: "Foto removida." });
    onSaved?.();
  }

  async function salvarTexto() {
    setMsg(null); setOcupado(true);
    const { error } = await supabase.from("services").update({ description: texto.trim() || null }).eq("id", serviceId);
    setOcupado(false);
    if (error) return setMsg({ tipo: "erro", texto: error.message });
    setMsg({ tipo: "ok", texto: "Texto salvo." });
    onSaved?.();
  }

  return (
    <div className="space-y-3 border-t border-mist pt-3">
      <p className="text-sm font-bold">Foto e explicação para o paciente</p>
      <div className="flex items-center gap-3">
        {foto
          ? <img src={foto} alt="Foto do procedimento" className="h-20 w-20 rounded-lg object-cover" />
          : <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-mist text-center text-xs text-ink/50">Sem foto</div>}
        <div className="flex flex-col gap-2">
          <button type="button" className="btn-ghost px-3 py-1.5 text-sm" disabled={ocupado} onClick={() => input.current?.click()}>
            {ocupado ? "Enviando..." : foto ? "Trocar foto" : "Enviar foto"}
          </button>
          {foto && <button type="button" className="btn-danger px-3 py-1.5 text-sm" disabled={ocupado} onClick={removerFoto}>Remover foto</button>}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) enviar(f); }} />
      </div>
      <p className="text-xs text-ink/60">Prefira foto da técnica, do material ou do ambiente. Evite antes e depois e rosto de paciente.</p>
      <div>
        <label className="label">O que é (aparece para o paciente)</label>
        <textarea className="field min-h-[80px]" maxLength={MAX_TEXTO} value={texto} onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex.: aplicação do seu próprio plasma, rico em plaquetas, no local da lesão para estimular a recuperação do tecido." />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-ink/50">{texto.length}/{MAX_TEXTO}</span>
          <button type="button" className="btn-ghost px-3 py-1.5 text-sm" disabled={ocupado || texto === (description ?? "")} onClick={salvarTexto}>Salvar texto</button>
        </div>
      </div>
      {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.tipo === "ok" ? "bg-white text-moss" : "bg-blush text-danger"}`}>{msg.texto}</p>}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type PatientImage = {
  id: string;
  storage_path: string;
  file_name: string;
  file_type: string;
  description: string | null;
  uploaded_at: string;
};

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const LIMITE_MB = 20;

export function ImagensDiagnosticas({
  clinicId,
  patientId,
  imagens: inicial,
  tz,
}: {
  clinicId: string;
  patientId: string;
  imagens: PatientImage[];
  tz: string;
}) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [imagens, setImagens] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [arquivoSel, setArquivoSel] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberta, setAberta] = useState(false);
  const [urlVisualizacao, setUrlVisualizacao] = useState<{ url: string; nome: string; tipo: string } | null>(null);

  function selecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!TIPOS_ACEITOS.includes(file.type)) {
      setErro("Formato não suportado. Use JPG, PNG, PDF, WebP ou GIF.");
      return;
    }
    if (file.size > LIMITE_MB * 1024 * 1024) {
      setErro(`O arquivo deve ter no máximo ${LIMITE_MB} MB.`);
      return;
    }
    setArquivoSel(file);
    setErro(null);
  }

  async function enviar() {
    if (!arquivoSel) return;
    setErro(null);
    setEnviando(true);

    const ext = arquivoSel.name.split(".").pop() ?? "bin";
    const path = `${clinicId}/${patientId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("patient-images")
      .upload(path, arquivoSel, { contentType: arquivoSel.type, upsert: false });

    if (uploadErr) {
      setEnviando(false);
      return setErro(`Erro ao enviar: ${uploadErr.message}`);
    }

    const { data, error: dbErr } = await supabase
      .from("patient_images")
      .insert({
        clinic_id: clinicId,
        patient_id: patientId,
        storage_path: path,
        file_name: arquivoSel.name,
        file_type: arquivoSel.type,
        description: descricao.trim() || null,
      })
      .select("id, storage_path, file_name, file_type, description, uploaded_at")
      .single();

    setEnviando(false);

    if (dbErr) {
      // Upload feito mas registro falhou — não é bloqueante, apenas avisa
      return setErro(`Arquivo enviado mas houve erro ao registrar: ${dbErr.message}`);
    }

    setImagens([data as PatientImage, ...imagens]);
    setArquivoSel(null);
    setDescricao("");
    setAberta(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function visualizar(img: PatientImage) {
    const { data } = await supabase.storage
      .from("patient-images")
      .createSignedUrl(img.storage_path, 300); // 5 minutos
    if (data?.signedUrl) {
      setUrlVisualizacao({ url: data.signedUrl, nome: img.file_name, tipo: img.file_type });
    }
  }

  async function excluir(img: PatientImage) {
    if (!confirm(`Excluir "${img.file_name}"? Esta ação não pode ser desfeita.`)) return;
    await supabase.storage.from("patient-images").remove([img.storage_path]);
    await supabase.from("patient_images").delete().eq("id", img.id);
    setImagens(imagens.filter((i) => i.id !== img.id));
  }

  const icone = (tipo: string) =>
    tipo === "application/pdf" ? "📄" : "🩻";

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="h-title text-xl">Imagens e laudos</h2>
        <button className="btn-ghost text-sm" onClick={() => { setAberta(!aberta); setErro(null); }}>
          {aberta ? "Fechar" : "Adicionar imagem"}
        </button>
      </div>

      {aberta && (
        <div className="mt-3 space-y-3 rounded-xl bg-white p-4">
          <div>
            <label className="label">Arquivo (JPG, PNG, PDF — máx. {LIMITE_MB} MB)</label>
            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif,.pdf"
              className="field text-sm file:mr-3 file:rounded-md file:border-0 file:bg-moss/10 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-moss hover:file:bg-moss/20"
              onChange={selecionarArquivo}
            />
          </div>
          {arquivoSel && (
            <div>
              <label className="label">Descrição (opcional)</label>
              <input
                className="field"
                placeholder="Ex: RX joelho direito AP — 09/2026"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>
          )}
          {erro && <p className="rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
          <div className="flex gap-2">
            <button
              className="btn-primary"
              onClick={enviar}
              disabled={!arquivoSel || enviando}
            >
              {enviando ? "Enviando..." : "Salvar no prontuário"}
            </button>
            <button className="btn-ghost" onClick={() => { setAberta(false); setArquivoSel(null); setErro(null); }}>Cancelar</button>
          </div>
        </div>
      )}

      {imagens.length === 0 && !aberta && (
        <p className="mt-2 text-sm text-ink/60">Nenhuma imagem ou laudo anexado.</p>
      )}

      {imagens.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {imagens.map((img) => (
            <div key={img.id} className="flex items-start gap-3 rounded-xl bg-white p-3">
              <span className="text-2xl leading-none">{icone(img.file_type)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{img.file_name}</p>
                {img.description && <p className="mt-0.5 text-xs text-ink/70">{img.description}</p>}
                <p className="mt-0.5 text-xs text-ink/50">
                  {new Date(img.uploaded_at).toLocaleDateString("pt-BR", { timeZone: tz, day: "2-digit", month: "short", year: "numeric" })}
                </p>
                <div className="mt-2 flex gap-2">
                  <button className="text-xs text-moss underline underline-offset-2" onClick={() => visualizar(img)}>Visualizar</button>
                  <button className="text-xs text-danger underline underline-offset-2" onClick={() => excluir(img)}>Excluir</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de visualização */}
      {urlVisualizacao && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setUrlVisualizacao(null)}
        >
          <div className="relative max-h-[90vh] max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute -top-9 right-0 text-white text-sm underline"
              onClick={() => setUrlVisualizacao(null)}
            >
              Fechar
            </button>
            <p className="mb-2 text-center text-sm text-white/80 truncate">{urlVisualizacao.nome}</p>
            {urlVisualizacao.tipo === "application/pdf" ? (
              <iframe
                src={urlVisualizacao.url}
                className="h-[80vh] w-full rounded-xl bg-white"
                title={urlVisualizacao.nome}
              />
            ) : (
              <img
                src={urlVisualizacao.url}
                alt={urlVisualizacao.nome}
                className="max-h-[80vh] w-full rounded-xl object-contain"
              />
            )}
            <a
              href={urlVisualizacao.url}
              download={urlVisualizacao.nome}
              className="mt-3 block text-center text-sm text-white underline"
            >
              Baixar arquivo
            </a>
          </div>
        </div>
      )}
    </>
  );
}

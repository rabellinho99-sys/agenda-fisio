"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buscarPacientes } from "@/lib/busca";
import { CLASSES, type Qualificador } from "@/lib/forca";
import {
  PRUMO1,
  PRUMO2,
  VISTAS,
  calcularMedida,
  calcularTudo,
  classificarPostural,
  medidasDaVista,
  pontosDaVista,
  reduzirFoto,
  type FotoVista,
  type Fotos,
  type Landmark,
  type Medida,
  type Pt,
  type ResultadoMedida,
  type Vista,
} from "@/lib/postural";

type Paciente = { id: string; full_name: string; cpf: string | null; phone?: string | null };

type Avaliacao = {
  id: string;
  performed_at: string;
  photos: Fotos;
  measurements: Record<string, ResultadoMedida>;
  image_consent: boolean;
  image_consent_source: string | null;
  notes: string | null;
};

type Props = {
  clinicId: string;
  professionalId: string | null;
  pacientes: Paciente[];
  landmarks: Landmark[];
  medidas: Medida[];
  pacienteInicial: string | null;
};

const BUCKET = "patient-images";
const TZ = "America/Sao_Paulo";
const dataBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: TZ });
const hojeISO = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
const num = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const LIMITE_LISTA = 30;

const ORIGENS = [
  { v: "tcle", rotulo: "TCLE assinado com autorização de imagem" },
  { v: "verbal", rotulo: "Autorização verbal registrada no prontuário" },
  { v: "outro", rotulo: "Outro documento de autorização" },
];

function Selo({ q }: { q: number }) {
  const c = CLASSES[q as Qualificador];
  return (
    <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: c.cor, color: c.texto }}>
      {c.nome}
    </span>
  );
}

function segmentos(m: Medida): [string, string][] {
  const p = m.points as string[] | string[][];
  if (m.calc === "angle3") {
    const [a, b, c] = p as string[];
    return [[a, b], [b, c]];
  }
  if (m.calc === "angle_lines" || m.calc === "dist_diff" || m.calc === "hdist_diff") return p as [string, string][];
  const [a, b] = p as string[];
  return [[a, b]];
}

export function Postural({ clinicId, professionalId, pacientes, landmarks, medidas, pacienteInicial }: Props) {
  const supabase = createClient();
  const [pacienteId, setPacienteId] = useState(pacienteInicial ?? "");
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState<Avaliacao[]>([]);
  const [carregando, setCarregando] = useState(false);

  // editor
  const [editando, setEditando] = useState<string | "nova" | null>(null);
  const [data, setData] = useState(hojeISO());
  const [fotos, setFotos] = useState<Fotos>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [consentimento, setConsentimento] = useState(false);
  const [origem, setOrigem] = useState("tcle");
  const [notas, setNotas] = useState("");
  const [vista, setVista] = useState<Vista>("anterior");
  const [ativo, setAtivo] = useState<string>("");
  const [zoom, setZoom] = useState(1);
  const [mover, setMover] = useState(false);
  const [grade, setGrade] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // marcação
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [lupa, setLupa] = useState<{ x: number; y: number; rw: number; rh: number } | null>(null);

  const paciente = pacientes.find((p) => p.id === pacienteId) ?? null;
  const encontrados = useMemo(() => buscarPacientes(pacientes, busca), [pacientes, busca]);
  const filtrados = encontrados.slice(0, LIMITE_LISTA);

  const foto = fotos[vista];
  const pontos = useMemo(() => pontosDaVista(landmarks, vista), [landmarks, vista]);
  const medidasVista = useMemo(() => medidasDaVista(medidas, vista), [medidas, vista]);
  const ordem = useMemo(() => [...pontos.map((p) => p.key), PRUMO1, PRUMO2], [pontos]);
  const resultados = useMemo(() => calcularTudo(medidas, fotos), [medidas, fotos]);

  const nomePonto = (k: string) =>
    k === PRUMO1 ? "Prumo: marca de cima" : k === PRUMO2 ? "Prumo: marca de baixo" : pontos.find((p) => p.key === k)?.name ?? k;

  function lerPonto(f: FotoVista | undefined, k: string): Pt | undefined {
    if (!f) return undefined;
    if (k === PRUMO1) return f.calib.p1;
    if (k === PRUMO2) return f.calib.p2;
    return f.landmarks[k];
  }

  async function urlsAssinadas(lista: Fotos) {
    const caminhos = Object.values(lista).map((f) => f!.storage_path).filter((c) => !urls[c]);
    if (!caminhos.length) return;
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(caminhos, 3600);
    const novas: Record<string, string> = {};
    for (const d of data ?? []) if (d.path && d.signedUrl) novas[d.path] = d.signedUrl;
    setUrls((u) => ({ ...u, ...novas }));
  }

  async function carregar(id: string) {
    setCarregando(true);
    const { data } = await supabase
      .from("posture_assessments")
      .select("id, performed_at, photos, measurements, image_consent, image_consent_source, notes")
      .eq("patient_id", id)
      .order("performed_at", { ascending: false });
    setLista((data as Avaliacao[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    if (pacienteId) carregar(pacienteId);
    else setLista([]);
    setEditando(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  useEffect(() => {
    // ao trocar de vista, seleciona o primeiro ponto ainda não marcado
    const f = fotos[vista];
    setAtivo(ordem.find((k) => !lerPonto(f, k)) ?? ordem[0]);
    setLupa(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, editando]);

  function abrir(a: Avaliacao | null) {
    setMsg(null);
    setVista("anterior");
    setZoom(1);
    setMover(false);
    if (!a) {
      setEditando("nova");
      setData(hojeISO());
      setFotos({});
      setConsentimento(false);
      setOrigem("tcle");
      setNotas("");
      return;
    }
    setEditando(a.id);
    setData(a.performed_at.slice(0, 10));
    setFotos(a.photos ?? {});
    setConsentimento(a.image_consent);
    setOrigem(a.image_consent_source ?? "tcle");
    setNotas(a.notes ?? "");
    urlsAssinadas(a.photos ?? {});
  }

  async function enviarFoto(v: Vista, file: File | undefined) {
    if (!file || !paciente) return;
    setEnviando(true);
    setMsg(null);
    try {
      const { blob, w, h } = await reduzirFoto(file);
      const caminho = `${clinicId}/${paciente.id}/postural/${Date.now()}-${v}.jpg`;
      const up = await supabase.storage.from(BUCKET).upload(caminho, blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      const nome = VISTAS.find((x) => x.id === v)?.nome ?? v;
      const { data: img, error } = await supabase
        .from("patient_images")
        .insert({
          clinic_id: clinicId,
          patient_id: paciente.id,
          storage_path: caminho,
          file_name: `postural-${v}.jpg`,
          file_type: "image/jpeg",
          description: `Avaliação postural: vista ${nome.toLowerCase()} (${data.split("-").reverse().join("/")})`,
        })
        .select("id")
        .single();
      if (error) throw error;
      setUrls((u) => ({ ...u, [caminho]: URL.createObjectURL(blob) }));
      setFotos((f) => ({
        ...f,
        [v]: { image_id: (img as { id: string }).id, storage_path: caminho, w, h, calib: { metros: 1 }, landmarks: {} },
      }));
      setAtivo(ordem[0]);
    } catch (e) {
      setMsg({ tipo: "erro", texto: `Não foi possível enviar a foto: ${(e as Error).message}` });
    }
    setEnviando(false);
  }

  function gravarPonto(k: string, p: Pt) {
    setFotos((f) => {
      const atual = f[vista];
      if (!atual) return f;
      if (k === PRUMO1) return { ...f, [vista]: { ...atual, calib: { ...atual.calib, p1: p } } };
      if (k === PRUMO2) return { ...f, [vista]: { ...atual, calib: { ...atual.calib, p2: p } } };
      return { ...f, [vista]: { ...atual, landmarks: { ...atual.landmarks, [k]: p } } };
    });
  }

  function apagarPonto(k: string) {
    setFotos((f) => {
      const atual = f[vista];
      if (!atual) return f;
      if (k === PRUMO1) return { ...f, [vista]: { ...atual, calib: { ...atual.calib, p1: undefined } } };
      if (k === PRUMO2) return { ...f, [vista]: { ...atual, calib: { ...atual.calib, p2: undefined } } };
      const lm = { ...atual.landmarks };
      delete lm[k];
      return { ...f, [vista]: { ...atual, landmarks: lm } };
    });
  }

  function posicao(e: React.PointerEvent): { p: Pt; rw: number; rh: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    return { p: [x, y], rw: r.width, rh: r.height };
  }

  function aoTocar(e: React.PointerEvent<SVGSVGElement>) {
    if (mover || !foto) return;
    const pos = posicao(e);
    if (!pos) return;
    e.preventDefault();
    // tocou perto de um ponto já marcado: arrasta esse ponto
    let alvo: string | null = null;
    let melhor = 22;
    for (const k of ordem) {
      const q = lerPonto(foto, k);
      if (!q) continue;
      const d = Math.hypot((q[0] - pos.p[0]) * pos.rw, (q[1] - pos.p[1]) * pos.rh);
      if (d < melhor) {
        melhor = d;
        alvo = k;
      }
    }
    const k = alvo ?? ativo;
    if (!k) return;
    if (!alvo) gravarPonto(k, pos.p);
    setArrastando(k);
    setLupa({ x: pos.p[0], y: pos.p[1], rw: pos.rw, rh: pos.rh });
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function aoMover(e: React.PointerEvent<SVGSVGElement>) {
    if (!arrastando) return;
    const pos = posicao(e);
    if (!pos) return;
    gravarPonto(arrastando, pos.p);
    setLupa({ x: pos.p[0], y: pos.p[1], rw: pos.rw, rh: pos.rh });
  }

  function aoSoltar() {
    if (!arrastando) return;
    if (arrastando === ativo) {
      const i = ordem.indexOf(ativo);
      const proximo = [...ordem.slice(i + 1), ...ordem.slice(0, i)].find((k) => !lerPonto(foto, k) && k !== ativo);
      if (proximo) setAtivo(proximo);
    }
    setArrastando(null);
    setTimeout(() => setLupa(null), 600);
  }

  async function salvar() {
    if (!paciente) return;
    if (!consentimento) return setMsg({ tipo: "erro", texto: "Registre a autorização do paciente para as fotos." });
    setSalvando(true);
    setMsg(null);
    const measurements: Record<string, ResultadoMedida> = {};
    for (const r of resultados) measurements[`${r.vista}:${r.code}`] = r;
    const registro = {
      clinic_id: clinicId,
      patient_id: paciente.id,
      professional_id: professionalId,
      performed_at: new Date(`${data}T12:00:00-03:00`).toISOString(),
      photos: fotos,
      measurements,
      image_consent: consentimento,
      image_consent_source: origem,
      notes: notas.trim() || null,
    };
    const r =
      editando && editando !== "nova"
        ? await supabase.from("posture_assessments").update(registro).eq("id", editando)
        : await supabase.from("posture_assessments").insert(registro).select("id").single();
    setSalvando(false);
    if (r.error) return setMsg({ tipo: "erro", texto: `Não foi possível salvar: ${r.error.message}` });
    setMsg({ tipo: "ok", texto: `Avaliação salva com ${resultados.length} medidas calculadas.` });
    if (editando === "nova" && "data" in r && r.data) setEditando((r.data as { id: string }).id);
    carregar(paciente.id);
  }

  async function excluir() {
    if (!editando || editando === "nova") return;
    if (!window.confirm("Excluir esta avaliação postural? As fotos continuam na galeria de imagens do paciente.")) return;
    await supabase.from("posture_assessments").delete().eq("id", editando);
    setEditando(null);
    if (paciente) carregar(paciente.id);
  }

  const url = foto ? urls[foto.storage_path] : undefined;
  const marcados = foto ? ordem.filter((k) => lerPonto(foto, k)).length : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="h-title text-2xl">Avaliação postural (SAPO)</h1>
        <p className="mt-1 text-sm text-ink/70">
          Fotografe as quatro vistas, marque os pontos anatômicos e os ângulos do protocolo SAPO são calculados sozinhos.
          <span className="ml-1 rounded bg-paper px-1.5 py-0.5 text-xs font-semibold">Em teste</span>
        </p>
      </div>

      {/* paciente */}
      <section className="rounded-xl bg-white p-4">
        <p className="text-base font-extrabold">Paciente</p>
        {paciente ? (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold">{paciente.full_name}</span>
            <button className="underline underline-offset-4" onClick={() => setPacienteId("")}>Trocar</button>
          </div>
        ) : (
          <div className="mt-2">
            <input className="field w-full" placeholder="Digite o nome ou CPF" value={busca}
              onChange={(e) => setBusca(e.target.value)} autoFocus />
            <ul className="mt-2 max-h-60 overflow-y-auto">
              {filtrados.map((p) => (
                <li key={p.id}>
                  <button className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-paper" onClick={() => setPacienteId(p.id)}>
                    {p.full_name} {p.cpf && <span className="text-ink/50">· {p.cpf}</span>}
                  </button>
                </li>
              ))}
            </ul>
            {encontrados.length === 0 && <p className="mt-2 text-sm text-ink/60">Nenhum paciente encontrado.</p>}
          </div>
        )}
      </section>

      {paciente && !editando && (
        <section className="rounded-xl bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-extrabold">Avaliações posturais</p>
            <button className="btn-primary text-sm" onClick={() => abrir(null)}>Nova avaliação</button>
          </div>
          {carregando ? (
            <p className="mt-3 text-sm text-ink/60">Carregando...</p>
          ) : lista.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">Nenhuma avaliação postural registrada para este paciente.</p>
          ) : (
            <ul className="mt-3 divide-y divide-ink/10">
              {lista.map((a) => {
                const res = Object.values(a.measurements ?? {});
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                    <span className="font-semibold">{dataBR(a.performed_at)}</span>
                    <span className="text-ink/60">{Object.keys(a.photos ?? {}).length} vistas, {res.length} medidas</span>
                    <span className="flex flex-wrap gap-1">
                      {[1, 2, 3].map((q) => {
                        const n = res.filter((r) => r.grau === q).length;
                        return n ? <span key={q} className="flex items-center gap-1"><Selo q={q} /> {n}</span> : null;
                      })}
                    </span>
                    <button className="ml-auto underline underline-offset-4" onClick={() => abrir(a)}>Abrir</button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {paciente && editando && (
        <>
          <section className="rounded-xl bg-white p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label" htmlFor="data">Data da avaliação</label>
                <input id="data" type="date" className="field" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
              <button className="btn-ghost ml-auto text-sm" onClick={() => setEditando(null)}>Voltar para a lista</button>
            </div>
            <div className="mt-4 rounded-lg bg-paper p-3 text-sm">
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" checked={consentimento} onChange={(e) => setConsentimento(e.target.checked)} />
                <span>O paciente autorizou o registro fotográfico para fins de avaliação e documentação clínica.</span>
              </label>
              {consentimento && (
                <select className="field mt-2 w-full text-sm" value={origem} onChange={(e) => setOrigem(e.target.value)}>
                  {ORIGENS.map((o) => <option key={o.v} value={o.v}>{o.rotulo}</option>)}
                </select>
              )}
            </div>
          </section>

          {/* vistas */}
          <section className="rounded-xl bg-white p-4">
            <div className="flex flex-wrap gap-2">
              {VISTAS.map((v) => {
                const f = fotos[v.id];
                return (
                  <button key={v.id} type="button" onClick={() => setVista(v.id)}
                    className={`rounded-full border px-3 py-1 text-sm ${vista === v.id ? "border-ink bg-ink text-white" : "border-ink/20 bg-white"}`}>
                    {v.nome}{f ? " ✓" : ""}
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-xs text-ink/70">{VISTAS.find((v) => v.id === vista)?.guia} Câmera a cerca de 3 metros, na altura da metade da estatura do paciente, sem inclinar o celular.</p>

            {!foto ? (
              <div className="mt-4 rounded-lg border border-dashed border-ink/20 p-4 text-sm">
                {!consentimento ? (
                  <p className="text-ink/70">Marque a autorização do paciente acima para liberar as fotos.</p>
                ) : enviando ? (
                  <p>Enviando a foto...</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <label className="btn-primary cursor-pointer text-sm">
                      Tirar foto
                      <input type="file" accept="image/*" capture="environment" className="hidden"
                        onChange={(e) => enviarFoto(vista, e.target.files?.[0])} />
                    </label>
                    <label className="btn-ghost cursor-pointer text-sm">
                      Escolher arquivo
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => enviarFoto(vista, e.target.files?.[0])} />
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
                {/* imagem e marcação */}
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <span>Zoom</span>
                    {[1, 2, 3].map((z) => (
                      <button key={z} className={`rounded border px-2 py-0.5 ${zoom === z ? "border-ink bg-ink text-white" : "border-ink/20"}`}
                        onClick={() => setZoom(z)}>{z}x</button>
                    ))}
                    <label className="ml-2 flex items-center gap-1">
                      <input type="checkbox" checked={mover} onChange={(e) => setMover(e.target.checked)} /> Mover imagem
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={grade} onChange={(e) => setGrade(e.target.checked)} /> Grade
                    </label>
                    <label className="ml-auto cursor-pointer underline underline-offset-4">
                      Trocar foto
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => enviarFoto(vista, e.target.files?.[0])} />
                    </label>
                  </div>

                  <div className="relative max-h-[75vh] overflow-auto rounded-lg bg-ink/5">
                    <div className="relative" style={{ width: `${zoom * 100}%` }}>
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt={`Vista ${vista}`} className="block w-full select-none" draggable={false} />
                      ) : (
                        <div style={{ aspectRatio: `${foto.w} / ${foto.h}` }} className="flex items-center justify-center text-sm text-ink/60">Carregando foto...</div>
                      )}
                      <svg ref={svgRef} viewBox={`0 0 ${foto.w} ${foto.h}`} preserveAspectRatio="none"
                        className="absolute inset-0 h-full w-full"
                        style={{ touchAction: mover ? "auto" : "none", cursor: mover ? "grab" : "crosshair" }}
                        onPointerDown={aoTocar} onPointerMove={aoMover} onPointerUp={aoSoltar} onPointerCancel={aoSoltar}>
                        {grade && Array.from({ length: 19 }, (_, i) => (
                          <g key={i} stroke="#ffffff" strokeOpacity={0.35} strokeWidth={Math.max(foto.w, foto.h) * 0.0012}>
                            <line x1={(foto.w * (i + 1)) / 20} y1={0} x2={(foto.w * (i + 1)) / 20} y2={foto.h} />
                            <line x1={0} y1={(foto.h * (i + 1)) / 20} x2={foto.w} y2={(foto.h * (i + 1)) / 20} />
                          </g>
                        ))}
                        {foto.calib.p1 && foto.calib.p2 && (
                          <line x1={foto.calib.p1[0] * foto.w} y1={foto.calib.p1[1] * foto.h} x2={foto.calib.p2[0] * foto.w} y2={foto.calib.p2[1] * foto.h}
                            stroke="#2563eb" strokeWidth={Math.max(foto.w, foto.h) * 0.003} strokeDasharray="12 8" />
                        )}
                        {medidasVista.flatMap((m) =>
                          segmentos(m).map(([a, b], i) => {
                            const pa = foto.landmarks[a];
                            const pb = foto.landmarks[b];
                            if (!pa || !pb) return null;
                            return (
                              <line key={`${m.code}-${i}`} x1={pa[0] * foto.w} y1={pa[1] * foto.h} x2={pb[0] * foto.w} y2={pb[1] * foto.h}
                                stroke="#facc15" strokeWidth={Math.max(foto.w, foto.h) * 0.0025} />
                            );
                          })
                        )}
                        {ordem.map((k) => {
                          const q = lerPonto(foto, k);
                          if (!q) return null;
                          const r = Math.max(foto.w, foto.h) * (0.007 / zoom + 0.002);
                          const prumo = k === PRUMO1 || k === PRUMO2;
                          return (
                            <circle key={k} cx={q[0] * foto.w} cy={q[1] * foto.h} r={r}
                              fill={k === ativo ? "#ef4444" : prumo ? "#2563eb" : "#16a34a"} stroke="#ffffff" strokeWidth={r * 0.35} />
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                  {lupa && url && (
                    <div className="pointer-events-none fixed left-4 top-20 z-30 h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-lg"
                      style={{
                        backgroundImage: `url(${url})`,
                        backgroundRepeat: "no-repeat",
                        backgroundSize: `${lupa.rw * 3}px ${lupa.rh * 3}px`,
                        backgroundPosition: `${-(lupa.x * lupa.rw * 3 - 64)}px ${-(lupa.y * lupa.rh * 3 - 64)}px`,
                      }}>
                      <div className="absolute left-1/2 top-0 h-full w-px bg-red-500" />
                      <div className="absolute left-0 top-1/2 h-px w-full bg-red-500" />
                    </div>
                  )}
                </div>

                {/* pontos e medidas */}
                <div className="space-y-4">
                  <div className="rounded-lg bg-paper p-3 text-sm">
                    <p className="font-semibold">Pontos ({marcados} de {ordem.length})</p>
                    <p className="mt-1 text-xs text-ink/60">
                      Toque no ponto da lista e depois na foto. Para ajustar, arraste o ponto. O vermelho é o ponto selecionado.
                    </p>
                    <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
                      {ordem.map((k) => {
                        const feito = !!lerPonto(foto, k);
                        return (
                          <li key={k} className="flex items-center gap-2">
                            <button onClick={() => setAtivo(k)}
                              className={`flex-1 rounded px-2 py-1 text-left text-xs ${k === ativo ? "bg-ink text-white" : feito ? "bg-white" : "bg-white/50 text-ink/70"}`}>
                              {feito ? "✓ " : "○ "}{nomePonto(k)}
                            </button>
                            {feito && <button className="text-xs text-danger" onClick={() => apagarPonto(k)}>Limpar</button>}
                          </li>
                        );
                      })}
                    </ul>
                    <label className="mt-3 block text-xs">
                      Distância entre as marcas do prumo (metros)
                      <input type="number" step="0.01" min={0.1} className="field mt-1 w-24 text-sm" value={foto.calib.metros}
                        onChange={(e) => setFotos((f) => ({ ...f, [vista]: { ...foto, calib: { ...foto.calib, metros: Number(e.target.value) } } }))} />
                    </label>
                    <p className="mt-1 text-xs text-ink/60">O prumo corrige a inclinação do celular e é necessário para as medidas em centímetros.</p>
                  </div>

                  <div className="rounded-lg border border-ink/10 p-3 text-sm">
                    <p className="font-semibold">Medidas desta vista</p>
                    <ul className="mt-2 space-y-2">
                      {medidasVista.map((m) => {
                        const { valor, falta } = calcularMedida(m, foto);
                        const q = classificarPostural(valor, m.ref_mean, m.ref_sd);
                        return (
                          <li key={m.code} className="rounded-md bg-paper p-2"
                            style={{ borderLeft: `4px solid ${q !== null ? CLASSES[q as Qualificador].cor : "transparent"}` }}>
                            <p className="text-xs font-semibold">{m.sapo ? `${m.sapo} · ` : ""}{m.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                              {valor !== null ? (
                                <>
                                  <span className="text-base font-extrabold">{num(valor)}{m.unit === "°" ? "°" : ` ${m.unit}`}</span>
                                  {q !== null ? <Selo q={q} /> : <span className="text-ink/60">sem referência, avaliação clínica</span>}
                                </>
                              ) : (
                                <span className="text-ink/60">Falta: {falta}</span>
                              )}
                              {m.ref_mean !== null && m.ref_sd !== null && (
                                <span className="text-ink/50">ref. {num(m.ref_mean)} ± {num(m.ref_sd)}{m.unit === "°" ? "°" : ` ${m.unit}`}</span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl bg-white p-4">
            <label className="label" htmlFor="notas">Observações da avaliação (opcional)</label>
            <textarea id="notas" className="field w-full" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)}
              placeholder="Ex.: paciente com dificuldade de manter a postura por dor lombar." />
            <p className="mt-2 text-xs text-ink/50">
              Referências: protocolo SAPO; valores normativos de Ferreira EAG e cols., J Manipulative Physiol Ther 2011;34(6):371-80.
              Classificação: até 1 desvio padrão sem deficiência, até 2 leve, até 3 moderada, acima de 3 grave.
            </p>
          </section>

          <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-3 rounded-xl bg-white p-3 shadow-lg">
            {msg && <p role="status" className={`mr-auto text-sm ${msg.tipo === "erro" ? "text-danger" : ""}`}>{msg.texto}</p>}
            {!msg && <p className="mr-auto text-xs text-ink/60">{resultados.length} medidas calculadas</p>}
            {editando !== "nova" && <button className="text-sm text-danger" onClick={excluir}>Excluir</button>}
            <button className="btn-primary" onClick={salvar} disabled={salvando || Object.keys(fotos).length === 0}>
              {salvando ? "Salvando" : "Salvar avaliação"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

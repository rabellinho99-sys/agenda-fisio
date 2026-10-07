"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
type Paciente = { id: string; full_name: string; phone: string | null; cpf: string | null };
type Modelo = { id: string; name: string; body_markdown: string; version: number };
type Profissional = { id: string; display_name: string; doc_full_name: string | null; user_id: string | null };
type Pacote = { id: string; name: string; sessions: number; price_cents: number; validity_days: number | null };
type Enviado = {
  id: string; token: string; created_at: string; signed_at: string | null; expires_at: string;
  template_id: string; patient_id: string; consent_id: string | null; patient_package_id: string | null;
  body_override: string | null; fields: Record<string, string>;
  patients: { full_name: string; phone: string | null; cpf: string | null } | null;
};
type Fmt = { bold: string[]; heads: Record<string, string> };

const FORMAS = ["Pix", "Cartão de crédito", "Cartão de débito", "Dinheiro", "Transferência bancária", "Boleto"];
const FORMA_DB: Record<string, string> = {
  pix: "Pix", credit_card: "Cartão de crédito", debit_card: "Cartão de débito", cash: "Dinheiro", transfer: "Transferência bancária", insurance: "Convênio",
};
const STATUS = ["Pago integralmente", "Pago parcialmente", "A pagar"];
const CONDICOES = ["À vista", "Parcelado", "Entrada + parcelas", "Por sessão"];

// variaveis que aparecem como etiquetas no editor do modelo
const VARIAVEIS: [string, string][] = [
  ["paciente", "NOME DO PACIENTE"], ["cpf", "CPF"], ["nascimento", "NASCIMENTO"],
  ["clinica", "CLÍNICA"], ["clinica_razao", "RAZÃO SOCIAL"], ["clinica_documento", "CNPJ/CPF DA CLÍNICA"],
  ["profissional", "PROFISSIONAL"], ["crefito", "CREFITO"],
  ["servico", "SERVIÇO"], ["sessoes", "Nº DE SESSÕES"], ["frequencia", "FREQUÊNCIA"], ["validade", "VALIDADE"],
  ["valor", "VALOR TOTAL"], ["valor_extenso", "VALOR POR EXTENSO"], ["valor_sessao", "VALOR POR SESSÃO"],
  ["forma_pagamento", "FORMA DE PAGAMENTO"], ["condicao_pagamento", "CONDIÇÃO DE PAGAMENTO"],
  ["status_pagamento", "SITUAÇÃO DO PAGAMENTO"], ["observacoes", "CONDIÇÕES ESPECIAIS"], ["data", "DATA"],
];

// ---------------------------------------------------------------------------
// Valores
// ---------------------------------------------------------------------------
function paraCentavos(txt: string): number {
  const limpo = txt.replace(/[^\d,\.]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(limpo);
  return isNaN(n) ? 0 : Math.round(n * 100);
}
function moeda(c: number): string {
  return (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function ate999(n: number): string {
  const un = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze",
    "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const dz = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const ct = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
  if (n === 0) return "";
  if (n === 100) return "cem";
  const p: string[] = [];
  const c = Math.floor(n / 100), r = n % 100;
  if (c) p.push(ct[c]);
  if (r) {
    if (r < 20) p.push(un[r]);
    else { const d = Math.floor(r / 10), u = r % 10; p.push(u ? `${dz[d]} e ${un[u]}` : dz[d]); }
  }
  return p.join(" e ");
}
function extenso(c: number): string {
  if (c <= 0) return "zero real";
  const reais = Math.floor(c / 100), cent = c % 100;
  const mi = Math.floor(reais / 1_000_000), mil = Math.floor((reais % 1_000_000) / 1000), resto = reais % 1000;
  const b: string[] = [];
  if (mi) b.push(`${ate999(mi)} ${mi === 1 ? "milhão" : "milhões"}`);
  if (mil) b.push(mil === 1 ? "mil" : `${ate999(mil)} mil`);
  if (resto) b.push(ate999(resto));
  let t = "";
  if (b.length) {
    t = b.length > 1 && resto && (resto < 100 || resto % 100 === 0)
      ? b.slice(0, -1).join(", ") + " e " + b[b.length - 1]
      : b.join(" ");
    t += `${!resto && !mil && mi ? " de" : ""} ${reais === 1 ? "real" : "reais"}`;
  }
  if (cent) t += `${t ? " e " : ""}${ate999(cent)} ${cent === 1 ? "centavo" : "centavos"}`;
  return t;
}

// ---------------------------------------------------------------------------
// Texto: o profissional edita sem simbolos; a formatacao original e preservada
// ---------------------------------------------------------------------------
function paraTextoLimpo(md: string): { texto: string; fmt: Fmt } {
  const fmt: Fmt = { bold: [], heads: {} };
  const linhas = md.split("\n").map((l) => {
    const h = l.match(/^(#{1,6})\s*(.*)$/);
    let linha = l;
    if (h) { fmt.heads[h[2].replace(/\*\*/g, "").trim()] = h[1]; linha = h[2]; }
    for (const m of linha.matchAll(/\*\*(.+?)\*\*/g)) if (!fmt.bold.includes(m[1])) fmt.bold.push(m[1]);
    return linha.replace(/\*\*/g, "");
  });
  fmt.bold.sort((a, b) => b.length - a.length);
  return { texto: linhas.join("\n"), fmt };
}
function paraMarkdown(texto: string, fmt: Fmt): string {
  return texto.split("\n").map((l) => {
    const limpo = l.trim();
    if (limpo && fmt.heads[limpo]) return `${fmt.heads[limpo]} ${limpo}`;
    let out = l;
    const usados: [number, number][] = [];
    for (const b of fmt.bold) {
      const i = out.indexOf(b);
      if (i < 0) continue;
      if (usados.some(([s, e]) => i < e && i + b.length > s)) continue;
      out = out.slice(0, i) + `**${b}**` + out.slice(i + b.length);
      usados.forEach((u) => { if (u[0] > i) { u[0] += 4; u[1] += 4; } });
      usados.push([i, i + b.length + 4]);
    }
    return out;
  }).join("\n");
}
function paraEtiquetas(md: string): string {
  let t = md;
  for (const [k, rot] of VARIAVEIS) t = t.split(`{{${k}}}`).join(`[${rot}]`);
  return t;
}
function deEtiquetas(t: string): string {
  let md = t;
  for (const [k, rot] of VARIAVEIS) md = md.split(`[${rot}]`).join(`{{${k}}}`);
  return md;
}

function Leitura({ md }: { md: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {md.split("\n").map((l, i) => {
        if (!l.trim()) return null;
        const h = l.match(/^(#{1,6})\s*(.*)$/);
        if (h) return <p key={i} className={h[1].length <= 2 ? "text-base font-bold" : "font-semibold"}>{h[2].replace(/\*\*/g, "")}</p>;
        const partes = l.split(/\*\*(.+?)\*\*/g);
        return <p key={i}>{partes.map((p, j) => (j % 2 ? <strong key={j}>{p}</strong> : p))}</p>;
      })}
    </div>
  );
}

function data(d: string) { return new Date(d).toLocaleDateString("pt-BR"); }

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export default function Contrato() {
  const supabase = useMemo(() => createClient(), []);
  const [aba, setAba] = useState<"novo" | "enviados" | "modelo">("novo");
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [profs, setProfs] = useState<Profissional[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [enviados, setEnviados] = useState<Enviado[]>([]);

  // formulario
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [pacotePacienteId, setPacotePacienteId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [modeloId, setModeloId] = useState("");
  const [profId, setProfId] = useState("");
  const [servico, setServico] = useState("Fisioterapia");
  const [sessoes, setSessoes] = useState("10");
  const [frequencia, setFrequencia] = useState("2 vezes por semana");
  const [validadeNum, setValidadeNum] = useState("90");
  const [validadeUn, setValidadeUn] = useState("dias");
  const [valor, setValor] = useState("");
  const [forma, setForma] = useState("Pix");
  const [condicao, setCondicao] = useState("À vista");
  const [parcelas, setParcelas] = useState("2");
  const [statusPg, setStatusPg] = useState("Pago integralmente");
  const [obs, setObs] = useState("");
  const [prazoLink, setPrazoLink] = useState("14");

  // texto personalizado
  const [texto, setTexto] = useState("");
  const [fmt, setFmt] = useState<Fmt>({ bold: [], heads: {} });
  const [textoMexido, setTextoMexido] = useState(false);
  const [carregandoTexto, setCarregandoTexto] = useState(false);

  const [link, setLink] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [vendo, setVendo] = useState<{ titulo: string; md: string } | null>(null);

  // modelo padrao
  const [modeloEditId, setModeloEditId] = useState("");
  const [modeloTexto, setModeloTexto] = useState("");
  const [modeloFmt, setModeloFmt] = useState<Fmt>({ bold: [], heads: {} });
  const modeloRef = useRef<HTMLTextAreaElement>(null);

  // ---------------- carga inicial ----------------
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setErro("Faça login novamente."); return; }
      const { data: m } = await supabase.from("clinic_members").select("clinic_id")
        .eq("user_id", u.user.id).eq("active", true).limit(1).maybeSingle();
      if (!m) { setErro("Clínica não encontrada."); return; }
      const cid = m.clinic_id as string;
      setClinicId(cid);

      const [mod, pr, pk, pa] = await Promise.all([
        supabase.from("consent_templates").select("id,name,body_markdown,version").eq("clinic_id", cid).eq("active", true).order("name"),
        supabase.from("professionals").select("id,display_name,doc_full_name,user_id").eq("clinic_id", cid).eq("active", true).order("sort_order"),
        supabase.from("packages").select("id,name,sessions,price_cents,validity_days").eq("clinic_id", cid).eq("active", true).order("name"),
        supabase.from("patients").select("id,full_name,phone,cpf").eq("clinic_id", cid).order("full_name"),
      ]);
      const ms = (mod.data || []) as Modelo[];
      setModelos(ms);
      const contrato = ms.find((x) => x.name.toLowerCase().startsWith("contrato")) || ms[0];
      setModeloId(contrato?.id || "");
      if (contrato) abrirModelo(contrato);
      const ps = (pr.data || []) as Profissional[];
      setProfs(ps);
      setProfId((ps.find((p) => p.user_id === u.user!.id) || ps[0])?.id || "");
      setPacotes((pk.data || []) as Pacote[]);
      const pacs = (pa.data || []) as Paciente[];
      setPacientes(pacs);
      carregarEnviados(cid);

      // veio da ficha do paciente: ?paciente=ID&pacote=ID
      const q = new URLSearchParams(window.location.search);
      const pid = q.get("paciente");
      if (pid) setPaciente(pacs.find((p) => p.id === pid) || null);
      const ppid = q.get("pacote");
      if (ppid) {
        const { data: pp } = await supabase.from("patient_packages")
          .select("id,package_name,sessions_total,price_cents,paid,payment_method,purchased_at,expires_at").eq("id", ppid).maybeSingle();
        if (pp) {
          setPacotePacienteId(pp.id);
          setServico(pp.package_name);
          setSessoes(String(pp.sessions_total));
          setValor(moeda(pp.price_cents));
          if (pp.payment_method) setForma(FORMA_DB[pp.payment_method] || "Pix");
          setStatusPg(pp.paid ? "Pago integralmente" : "A pagar");
          if (pp.expires_at) {
            const dias = Math.round((new Date(pp.expires_at).getTime() - new Date(pp.purchased_at).getTime()) / 86400000);
            setValidadeNum(String(dias)); setValidadeUn("dias");
          }
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarEnviados(cid: string) {
    const { data: rows } = await supabase.from("consent_requests")
      .select("id,token,created_at,signed_at,expires_at,template_id,patient_id,consent_id,patient_package_id,body_override,fields,patients(full_name,phone,cpf)")
      .eq("clinic_id", cid).order("created_at", { ascending: false }).limit(80);
    const lista = ((rows || []) as unknown as Enviado[]).filter((e) => e.fields && Object.keys(e.fields).length > 0);
    setEnviados(lista.slice(0, 40));
  }

  // ---------------- calculos ----------------
  const centavos = paraCentavos(valor);
  const nSessoes = Math.max(0, parseInt(sessoes || "0", 10));
  const porSessao = nSessoes > 0 ? Math.round(centavos / nSessoes) : 0;
  const nParcelas = Math.max(1, parseInt(parcelas || "1", 10));
  const condicaoTexto =
    condicao === "Parcelado" ? `parcelado em ${nParcelas} vezes de R$ ${moeda(Math.round(centavos / nParcelas))}`
      : condicao === "Por sessão" ? `pagamento por sessão realizada, no valor de R$ ${moeda(porSessao)} cada`
        : condicao === "Entrada + parcelas" ? "entrada e saldo parcelado conforme condições especiais"
          : "à vista";

  const campos: Record<string, string> = {
    servico, sessoes: String(nSessoes), valor: moeda(centavos), valor_extenso: extenso(centavos),
    valor_sessao: moeda(porSessao), forma_pagamento: forma, condicao_pagamento: condicaoTexto,
    status_pagamento: statusPg, validade: `${validadeNum} ${validadeUn}`, frequencia,
    observacoes: obs.trim() || "Não há condições especiais além das previstas neste contrato.",
    // guardados para reabrir o formulario depois
    _condicao: condicao, _parcelas: String(nParcelas), _validade_num: validadeNum, _validade_un: validadeUn, _obs: obs,
  };

  const filtrados = useMemo(() => {
    const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const q = norm(busca.trim());
    if (!q) return [];
    const dig = q.replace(/\D/g, "");
    return pacientes.filter((p) => norm(p.full_name).includes(q) || (dig.length >= 3 && (p.phone || "").replace(/\D/g, "").includes(dig))).slice(0, 8);
  }, [busca, pacientes]);

  function validar(): string {
    if (!paciente) return "Escolha o paciente.";
    if (!modeloId) return "Escolha o modelo.";
    if (!servico.trim()) return "Informe o serviço.";
    if (nSessoes < 1) return "Informe a quantidade de sessões.";
    if (centavos <= 0) return "Informe o valor.";
    return "";
  }

  // ---------------- texto do contrato ----------------
  async function montarTexto(base?: string) {
    const v = validar(); if (v) { setErro(v); return; }
    setErro(""); setCarregandoTexto(true);
    const { data: txt, error } = await supabase.rpc("render_contract_preview", {
      p_template: modeloId, p_patient: paciente!.id, p_professional: profId || null, p_fields: campos, p_body: base ?? null, p_keep_tokens: true,
    });
    setCarregandoTexto(false);
    if (error) { setErro(error.message); return; }
    const r = paraTextoLimpo(paraEtiquetas(txt as string));
    setTexto(r.texto); setFmt(r.fmt); setTextoMexido(false);
    setTimeout(() => document.getElementById("texto-contrato")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function salvar() {
    const v = validar(); if (v) { setErro(v); return; }
    setErro(""); setSalvando(true);
    // sem texto montado, usa o modelo; com texto, envia exatamente o que esta na tela
    const corpo = texto.trim() ? deEtiquetas(paraMarkdown(texto, fmt)) : null;
    let token: string | null = null;
    if (editandoId) {
      const { data: t, error } = await supabase.rpc("update_contract_request", {
        p_request: editandoId, p_professional: profId || null, p_fields: campos, p_body: corpo, p_days: parseInt(prazoLink || "14", 10),
      });
      if (error) { setSalvando(false); setErro(error.message); return; }
      token = t as string;
    } else {
      const { data: t, error } = await supabase.rpc("create_contract_request", {
        p_template: modeloId, p_patient: paciente!.id, p_professional: profId || null, p_fields: campos,
        p_days: parseInt(prazoLink || "14", 10), p_body: corpo, p_patient_package: pacotePacienteId,
      });
      if (error) { setSalvando(false); setErro(error.message); return; }
      token = t as string;
    }
    setSalvando(false);
    setLink(`${window.location.origin}/termo/${token}`);
    setAviso(editandoId ? "Contrato atualizado. O link continua o mesmo e o paciente já vê a nova versão." : "");
    if (clinicId) carregarEnviados(clinicId);
  }

  function limpar() {
    setEditandoId(null); setPacotePacienteId(null); setPaciente(null); setBusca(""); setValor(""); setObs("");
    setTexto(""); setTextoMexido(false); setLink(""); setAviso(""); setErro("");
    setServico("Fisioterapia"); setSessoes("10"); setCondicao("À vista"); setStatusPg("Pago integralmente");
  }

  function carregarNoFormulario(e: Enviado, novaVersao: boolean, corpoAssinado?: string) {
    const f = e.fields || {};
    limpar();
    setEditandoId(novaVersao ? null : e.id);
    setPacotePacienteId(e.patient_package_id);
    setPaciente(pacientes.find((p) => p.id === e.patient_id) || (e.patients ? { id: e.patient_id, ...e.patients } : null));
    setModeloId(e.template_id);
    const prof = profs.find((p) => (p.doc_full_name || p.display_name) === f.profissional);
    if (prof) setProfId(prof.id);
    setServico(f.servico || ""); setSessoes(f.sessoes || "");
    setFrequencia(f.frequencia || ""); setValor(f.valor || "");
    setForma(f.forma_pagamento || "Pix"); setStatusPg(f.status_pagamento || "A pagar");
    setCondicao(f._condicao || "À vista"); setParcelas(f._parcelas || "2");
    setValidadeNum(f._validade_num || (f.validade || "90").split(" ")[0]); setValidadeUn(f._validade_un || "dias");
    setObs(f._obs ?? "");
    const base = corpoAssinado || e.body_override;
    if (base) { const r = paraTextoLimpo(paraEtiquetas(base)); setTexto(r.texto); setFmt(r.fmt); setTextoMexido(true); }
    setAba("novo");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function verAssinado(e: Enviado) {
    if (!e.consent_id) return;
    const { data: c } = await supabase.from("consents").select("body_rendered,signer_name,signed_at").eq("id", e.consent_id).maybeSingle();
    if (c) setVendo({ titulo: `Assinado por ${c.signer_name} em ${data(c.signed_at)}`, md: c.body_rendered });
  }

  async function novaVersaoDeAssinado(e: Enviado) {
    let corpo: string | undefined;
    if (e.consent_id) {
      const { data: c } = await supabase.from("consents").select("body_rendered").eq("id", e.consent_id).maybeSingle();
      corpo = c?.body_rendered;
    }
    carregarNoFormulario(e, true, corpo);
    setAviso("Nova versão a partir do contrato assinado. Ajuste o que precisar e envie. O contrato antigo continua guardado.");
  }

  function whatsapp(nome: string, fone: string | null, url: string) {
    const primeiro = nome.trim().split(" ")[0];
    const txt = `Olá, ${primeiro}. Segue o contrato do seu tratamento para leitura e assinatura online: ${url}`;
    const num = (fone || "").replace(/\D/g, "");
    const destino = num ? (num.startsWith("55") ? num : `55${num}`) : "";
    window.open(`https://wa.me/${destino}?text=${encodeURIComponent(txt)}`, "_blank");
  }

  // ---------------- modelo padrao ----------------
  function abrirModelo(m: Modelo) {
    setModeloEditId(m.id);
    const r = paraTextoLimpo(paraEtiquetas(m.body_markdown));
    setModeloTexto(r.texto); setModeloFmt(r.fmt);
  }
  function inserirVariavel(rot: string) {
    const el = modeloRef.current;
    const tag = `[${rot}]`;
    if (!el) { setModeloTexto(modeloTexto + tag); return; }
    const ini = el.selectionStart, fim = el.selectionEnd;
    const novo = modeloTexto.slice(0, ini) + tag + modeloTexto.slice(fim);
    setModeloTexto(novo);
    setTimeout(() => { el.focus(); el.selectionStart = el.selectionEnd = ini + tag.length; }, 0);
  }
  async function salvarModelo() {
    setErro(""); setAviso("");
    const md = deEtiquetas(paraMarkdown(modeloTexto, modeloFmt));
    const { data: v, error } = await supabase.rpc("save_consent_template", { p_template: modeloEditId, p_body: md });
    if (error) { setErro(error.message); return; }
    setModelos(modelos.map((m) => (m.id === modeloEditId ? { ...m, body_markdown: md, version: v as number } : m)));
    setAviso(`Modelo salvo (versão ${v}). Os próximos contratos já saem com este texto. Contratos já assinados não mudam.`);
  }

  // ---------------- tela ----------------
  const editandoAssinatura = editandoId ? enviados.find((e) => e.id === editandoId) : null;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="h-title text-2xl">Contratos</h1>
      <p className="mt-1 text-sm text-ink/60">Monte, personalize e envie o contrato. O paciente lê e assina pelo celular.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {([["novo", editandoId ? "Editando contrato" : "Novo contrato"], ["enviados", `Enviados (${enviados.length})`], ["modelo", "Meu modelo padrão"]] as const).map(([k, rot]) => (
          <button key={k} onClick={() => { setAba(k); setErro(""); }}
            className={aba === k ? "btn-primary px-4 py-2 text-sm" : "btn-ghost px-4 py-2 text-sm"}>{rot}</button>
        ))}
      </div>

      {erro && <p className="mt-4 rounded-lg bg-blush px-3 py-2 text-sm text-danger">{erro}</p>}
      {aviso && <p className="mt-4 rounded-lg bg-paper px-3 py-2 text-sm text-ink/80">{aviso}</p>}

      {/* ============================ NOVO / EDITAR ============================ */}
      {aba === "novo" && (link ? (
        <div className="mt-4 space-y-3 rounded-xl bg-white p-4">
          <h2 className="font-semibold">{editandoId ? "Contrato atualizado" : "Contrato pronto para assinatura"}</h2>
          <input readOnly className="field" value={link} onFocus={(e) => e.target.select()} />
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={() => whatsapp(paciente!.full_name, paciente!.phone, link)}>Enviar pelo WhatsApp</button>
            <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(link)}>Copiar link</button>
            <button className="btn-ghost" onClick={() => window.open(link, "_blank")}>Ver como o paciente</button>
            <button className="btn-ghost" onClick={() => setLink("")}>Continuar editando</button>
            <button className="btn-ghost" onClick={limpar}>Novo contrato</button>
          </div>
          <p className="text-xs text-ink/50">Link válido por {prazoLink} dias. Enquanto não for assinado, você pode editar em Enviados.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {editandoId && (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-amber/30 px-3 py-2 text-sm">
              <span>Editando o contrato de {editandoAssinatura?.patients?.full_name}. O link enviado continua valendo.</span>
              <button className="btn-ghost px-3 py-1 text-xs" onClick={limpar}>Cancelar edição</button>
            </div>
          )}

          {/* 1. paciente */}
          <section className="space-y-3 rounded-xl bg-white p-4">
            <h2 className="font-semibold">1. Paciente</h2>
            {paciente ? (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{paciente.full_name}</p>
                  <p className="text-sm text-ink/60">{paciente.phone || "sem telefone"} · CPF {paciente.cpf || "será pedido na assinatura"}</p>
                </div>
                {!editandoId && <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setPaciente(null)}>Trocar</button>}
              </div>
            ) : (
              <div>
                <label className="label">Buscar por nome ou telefone</label>
                <input className="field" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite o nome" />
                {filtrados.length > 0 && (
                  <div className="mt-1 overflow-hidden rounded-lg border border-mist bg-white">
                    {filtrados.map((p) => (
                      <button key={p.id} className="block w-full border-b border-mist px-3 py-2 text-left text-sm hover:bg-paper"
                        onClick={() => { setPaciente(p); setBusca(""); }}>
                        {p.full_name} <span className="text-ink/50">{p.phone || ""}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Modelo</label>
                <select className="field" value={modeloId} disabled={!!editandoId} onChange={(e) => setModeloId(e.target.value)}>
                  {modelos.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div><label className="label">Profissional responsável</label>
                <select className="field" value={profId} onChange={(e) => setProfId(e.target.value)}>
                  {profs.map((p) => <option key={p.id} value={p.id}>{p.doc_full_name || p.display_name}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* 2. servico */}
          <section className="space-y-3 rounded-xl bg-white p-4">
            <h2 className="font-semibold">2. Serviço contratado</h2>
            {pacotes.length > 0 && !pacotePacienteId && (
              <div><label className="label">Preencher a partir de um pacote (opcional)</label>
                <select className="field" defaultValue="" onChange={(e) => {
                  const p = pacotes.find((x) => x.id === e.target.value); if (!p) return;
                  setServico(p.name); setSessoes(String(p.sessions)); setValor(moeda(p.price_cents));
                  if (p.validity_days) { setValidadeNum(String(p.validity_days)); setValidadeUn("dias"); }
                }}>
                  <option value="">Selecione</option>
                  {pacotes.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.sessions} sessões · R$ {moeda(p.price_cents)}</option>)}
                </select>
              </div>
            )}
            {pacotePacienteId && <p className="rounded-lg bg-paper px-3 py-2 text-sm text-ink/70">Dados puxados do pacote do paciente. Altere o que precisar.</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className="label">Serviço</label>
                <input className="field" value={servico} onChange={(e) => setServico(e.target.value)} placeholder="Ex.: Quiropraxia, PRP no joelho" />
              </div>
              <div><label className="label">Quantidade de sessões</label>
                <input className="field" inputMode="numeric" value={sessoes} onChange={(e) => setSessoes(e.target.value.replace(/\D/g, ""))} />
              </div>
              <div><label className="label">Frequência</label>
                <input className="field" value={frequencia} onChange={(e) => setFrequencia(e.target.value)} />
              </div>
              <div><label className="label">Validade das sessões</label>
                <div className="flex gap-2">
                  <input className="field w-24" inputMode="numeric" value={validadeNum} onChange={(e) => setValidadeNum(e.target.value.replace(/\D/g, ""))} />
                  <select className="field" value={validadeUn} onChange={(e) => setValidadeUn(e.target.value)}><option>dias</option><option>meses</option></select>
                </div>
              </div>
            </div>
          </section>

          {/* 3. pagamento */}
          <section className="space-y-3 rounded-xl bg-white p-4">
            <h2 className="font-semibold">3. Valor e pagamento</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Valor total (R$)</label>
                <input className="field" inputMode="decimal" value={valor} placeholder="0,00"
                  onChange={(e) => setValor(e.target.value)} onBlur={() => centavos > 0 && setValor(moeda(centavos))} />
                {centavos > 0 && <p className="mt-1 text-xs text-ink/50">{extenso(centavos)} · R$ {moeda(porSessao)} por sessão</p>}
              </div>
              <div><label className="label">Forma de pagamento</label>
                <select className="field" value={forma} onChange={(e) => setForma(e.target.value)}>{FORMAS.map((f) => <option key={f}>{f}</option>)}</select>
              </div>
              <div><label className="label">Condição</label>
                <select className="field" value={condicao} onChange={(e) => setCondicao(e.target.value)}>{CONDICOES.map((c) => <option key={c}>{c}</option>)}</select>
              </div>
              {condicao === "Parcelado" && (
                <div><label className="label">Número de parcelas</label>
                  <input className="field" inputMode="numeric" value={parcelas} onChange={(e) => setParcelas(e.target.value.replace(/\D/g, ""))} />
                </div>
              )}
              <div><label className="label">Situação do pagamento</label>
                <select className="field" value={statusPg} onChange={(e) => setStatusPg(e.target.value)}>{STATUS.map((s) => <option key={s}>{s}</option>)}</select>
              </div>
              <div className="sm:col-span-2"><label className="label">Condições especiais (opcional)</label>
                <textarea className="field min-h-[70px]" value={obs} onChange={(e) => setObs(e.target.value)}
                  placeholder="Ex.: entrada de R$ 300,00 no Pix e saldo em 3 vezes no cartão; reavaliação inclusa." />
              </div>
            </div>
          </section>

          {/* 4. texto */}
          <section id="texto-contrato" className="space-y-3 rounded-xl bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">4. Revisar e personalizar o texto</h2>
              {texto && (
                <button className="btn-ghost px-3 py-1.5 text-sm" disabled={carregandoTexto}
                  onClick={() => { if (!textoMexido || window.confirm("Refazer o texto com os dados acima? As alterações feitas à mão no texto serão perdidas.")) montarTexto(); }}>
                  Atualizar com os dados acima
                </button>
              )}
            </div>
            {!texto ? (
              <>
                <p className="text-sm text-ink/60">Abra o contrato completo para conferir e, se quiser, mudar qualquer cláusula só para este paciente.</p>
                <button className="btn-ghost" disabled={carregandoTexto} onClick={() => montarTexto()}>
                  {carregandoTexto ? "Montando" : "Abrir contrato para revisar e editar"}
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-ink/50">Clique no texto e edite à vontade. Títulos e destaques do modelo são mantidos. A alteração vale só para este contrato. [CPF], [NASCIMENTO] e [DATA] são preenchidos na hora da assinatura.</p>
                <textarea className="field min-h-[420px] font-[inherit] text-sm leading-relaxed" value={texto}
                  onChange={(e) => { setTexto(e.target.value); setTextoMexido(true); }} />
                {textoMexido && <p className="text-xs text-ink/50">Texto personalizado. Se mudar os dados acima, use “Atualizar com os dados acima”.</p>}
              </>
            )}
          </section>

          <div className="flex flex-wrap gap-2">
            {texto && <button className="btn-ghost" onClick={() => setVendo({ titulo: "Prévia do que o paciente vai ler", md: paraMarkdown(texto, fmt) })}>Ver prévia</button>}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-ink/60">Link válido por</span>
              <input className="field w-16 py-1.5" inputMode="numeric" value={prazoLink} onChange={(e) => setPrazoLink(e.target.value.replace(/\D/g, ""))} />
              <span className="text-ink/60">dias</span>
            </div>
            <button className="btn-primary flex-1" disabled={salvando} onClick={salvar}>
              {salvando ? "Salvando" : editandoId ? "Salvar alterações" : "Gerar link para assinatura"}
            </button>
          </div>
        </div>
      ))}

      {/* ============================ ENVIADOS ============================ */}
      {aba === "enviados" && (
        <div className="mt-4 space-y-2">
          {enviados.length === 0 && <p className="text-sm text-ink/60">Nenhum contrato enviado ainda.</p>}
          {enviados.map((e) => {
            const url = `${typeof window !== "undefined" ? window.location.origin : ""}/termo/${e.token}`;
            const expirado = !e.signed_at && new Date(e.expires_at) < new Date();
            const nome = e.patients?.full_name || "Paciente";
            return (
              <article key={e.id} className="rounded-xl bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{nome}</p>
                    <p className="text-sm text-ink/60">
                      {e.fields?.servico} · {e.fields?.sessoes} sessões · R$ {e.fields?.valor} · {e.fields?.forma_pagamento}
                    </p>
                    <p className="text-xs text-ink/50">Enviado em {data(e.created_at)}{e.body_override ? " · texto personalizado" : ""}</p>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${e.signed_at ? "bg-moss/20 text-moss" : expirado ? "bg-mist text-ink/60" : "bg-amber/30"}`}>
                    {e.signed_at ? `Assinado ${data(e.signed_at)}` : expirado ? "Expirado" : "Aguardando assinatura"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {e.signed_at ? (
                    <>
                      <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => verAssinado(e)}>Ver assinado</button>
                      <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => novaVersaoDeAssinado(e)}>Nova versão</button>
                    </>
                  ) : (
                    <>
                      <button className="btn-primary px-3 py-1.5 text-sm" onClick={() => carregarNoFormulario(e, false)}>Editar</button>
                      {!expirado && <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => whatsapp(nome, e.patients?.phone || null, url)}>Reenviar no WhatsApp</button>}
                      {!expirado && <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => navigator.clipboard.writeText(url)}>Copiar link</button>}
                    </>
                  )}
                </div>
                {expirado && <p className="mt-2 text-xs text-ink/50">Para reativar, clique em Editar e salve: o link volta a valer.</p>}
              </article>
            );
          })}
        </div>
      )}

      {/* ============================ MODELO ============================ */}
      {aba === "modelo" && (
        <div className="mt-4 space-y-3 rounded-xl bg-white p-4">
          <div><label className="label">Qual modelo editar</label>
            <select className="field" value={modeloEditId} onChange={(e) => { const m = modelos.find((x) => x.id === e.target.value); if (m) abrirModelo(m); }}>
              {modelos.map((m) => <option key={m.id} value={m.id}>{m.name} (versão {m.version})</option>)}
            </select>
          </div>
          <div>
            <p className="label">Inserir dado automático no ponto do cursor</p>
            <div className="flex flex-wrap gap-1.5">
              {VARIAVEIS.map(([k, rot]) => (
                <button key={k} type="button" className="rounded-full bg-paper px-2.5 py-1 text-xs hover:bg-mist" onClick={() => inserirVariavel(rot)}>{rot}</button>
              ))}
            </div>
            <p className="mt-1 text-xs text-ink/50">Os itens entre colchetes são trocados pelos dados do paciente e do contrato na hora do envio.</p>
          </div>
          <textarea ref={modeloRef} className="field min-h-[480px] text-sm leading-relaxed" value={modeloTexto} onChange={(e) => setModeloTexto(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => setVendo({ titulo: "Prévia do modelo", md: paraMarkdown(modeloTexto, modeloFmt) })}>Ver prévia</button>
            <button className="btn-ghost" onClick={() => { const m = modelos.find((x) => x.id === modeloEditId); if (m) abrirModelo(m); }}>Desfazer alterações</button>
            <button className="btn-primary flex-1" onClick={salvarModelo}>Salvar modelo</button>
          </div>
        </div>
      )}

      {/* ============================ LEITURA ============================ */}
      {vendo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setVendo(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="font-semibold">{vendo.titulo}</p>
              <button className="btn-ghost px-3 py-1 text-sm" onClick={() => setVendo(null)}>Fechar</button>
            </div>
            <Leitura md={vendo.md} />
          </div>
        </div>
      )}
    </div>
  );
}

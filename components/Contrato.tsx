'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Paciente = { id: string; full_name: string; phone: string | null; cpf: string | null };
type Modelo = { id: string; name: string };
type Profissional = { id: string; display_name: string; doc_full_name: string | null };
type Pacote = { id: string; name: string; sessions: number; price_cents: number; validity_days: number | null };
type Enviado = {
  id: string; token: string; created_at: string; signed_at: string | null; expires_at: string;
  fields: Record<string, string>; patients: { full_name: string; phone: string | null } | null;
};

const FORMAS = ['Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Transferência bancária', 'Boleto'];
const STATUS = ['Pago integralmente', 'Pago parcialmente', 'A pagar'];

// ---------- valores ----------
function paraCentavos(txt: string): number {
  const limpo = txt.replace(/[^\d,\.]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(limpo);
  return isNaN(n) ? 0 : Math.round(n * 100);
}
function brl(c: number): string {
  return (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function extensoAte999(n: number): string {
  const un = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze',
    'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dz = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const ct = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  if (n === 0) return '';
  if (n === 100) return 'cem';
  const partes: string[] = [];
  const c = Math.floor(n / 100), r = n % 100;
  if (c) partes.push(ct[c]);
  if (r) {
    if (r < 20) partes.push(un[r]);
    else { const d = Math.floor(r / 10), u = r % 10; partes.push(u ? `${dz[d]} e ${un[u]}` : dz[d]); }
  }
  return partes.join(' e ');
}
function extenso(c: number): string {
  if (c <= 0) return 'zero real';
  const reais = Math.floor(c / 100), cent = c % 100;
  const mi = Math.floor(reais / 1_000_000), mil = Math.floor((reais % 1_000_000) / 1000), resto = reais % 1000;
  const blocos: string[] = [];
  if (mi) blocos.push(`${extensoAte999(mi)} ${mi === 1 ? 'milhão' : 'milhões'}`);
  if (mil) blocos.push(mil === 1 ? 'mil' : `${extensoAte999(mil)} mil`);
  if (resto) blocos.push(extensoAte999(resto));
  let txt = '';
  if (blocos.length) {
    txt = blocos.length > 1 && (resto < 100 || resto % 100 === 0) && resto
      ? blocos.slice(0, -1).join(', ') + ' e ' + blocos[blocos.length - 1]
      : blocos.join(' ');
    const deReais = !resto && !mil && mi ? ' de' : '';
    txt += `${deReais} ${reais === 1 ? 'real' : 'reais'}`;
  }
  if (cent) txt += `${txt ? ' e ' : ''}${extensoAte999(cent)} ${cent === 1 ? 'centavo' : 'centavos'}`;
  return txt;
}

// ---------- estilos ----------
const s = {
  wrap: { maxWidth: 900, margin: '0 auto', padding: 16, fontFamily: 'inherit' } as CSSProperties,
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 } as CSSProperties,
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 } as CSSProperties,
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' } as CSSProperties,
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 } as CSSProperties,
  btn: { padding: '11px 16px', borderRadius: 8, border: 'none', background: '#15803d', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' } as CSSProperties,
  btn2: { padding: '9px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#111827', fontWeight: 600, fontSize: 14, cursor: 'pointer' } as CSSProperties,
  h2: { fontSize: 17, fontWeight: 700, margin: '0 0 12px' } as CSSProperties,
  muted: { fontSize: 13, color: '#6b7280' } as CSSProperties,
};

export default function Contrato() {
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [profs, setProfs] = useState<Profissional[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [enviados, setEnviados] = useState<Enviado[]>([]);

  const [busca, setBusca] = useState('');
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [modeloId, setModeloId] = useState('');
  const [profId, setProfId] = useState('');

  const [servico, setServico] = useState('Fisioterapia');
  const [sessoes, setSessoes] = useState('10');
  const [valor, setValor] = useState('');
  const [forma, setForma] = useState('Pix');
  const [condicao, setCondicao] = useState('À vista');
  const [parcelas, setParcelas] = useState('2');
  const [statusPg, setStatusPg] = useState('Pago integralmente');
  const [validadeNum, setValidadeNum] = useState('90');
  const [validadeUn, setValidadeUn] = useState('dias');
  const [frequencia, setFrequencia] = useState('2 vezes por semana');
  const [obs, setObs] = useState('');
  const [prazoLink, setPrazoLink] = useState('14');

  const [preview, setPreview] = useState('');
  const [link, setLink] = useState('');
  const [enviando, setEnviando] = useState(false);

  // carrega dados da clinica
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setErro('Faça login novamente.'); return; }
      const { data: m } = await supabase.from('clinic_members').select('clinic_id')
        .eq('user_id', u.user.id).eq('active', true).limit(1).maybeSingle();
      if (!m) { setErro('Clínica não encontrada.'); return; }
      const cid = m.clinic_id as string;
      setClinicId(cid);

      const [mod, pr, pk, pa] = await Promise.all([
        supabase.from('consent_templates').select('id,name').eq('clinic_id', cid).eq('active', true).order('name'),
        supabase.from('professionals').select('id,display_name,doc_full_name,user_id').eq('clinic_id', cid).eq('active', true).order('sort_order'),
        supabase.from('packages').select('id,name,sessions,price_cents,validity_days').eq('clinic_id', cid).eq('active', true).order('name'),
        supabase.from('patients').select('id,full_name,phone,cpf').eq('clinic_id', cid).order('full_name'),
      ]);
      const ms = (mod.data || []) as Modelo[];
      setModelos(ms);
      const contrato = ms.find((x) => x.name.toLowerCase().startsWith('contrato'));
      setModeloId(contrato?.id || ms[0]?.id || '');
      const ps = (pr.data || []) as (Profissional & { user_id: string | null })[];
      setProfs(ps);
      setProfId((ps.find((p) => p.user_id === u.user!.id) || ps[0])?.id || '');
      setPacotes((pk.data || []) as Pacote[]);
      setPacientes((pa.data || []) as Paciente[]);
      carregarEnviados(cid);
    })();
  }, []);

  async function carregarEnviados(cid: string) {
    const { data } = await supabase.from('consent_requests')
      .select('id,token,created_at,signed_at,expires_at,fields,patients(full_name,phone)')
      .eq('clinic_id', cid).order('created_at', { ascending: false }).limit(60);
    const lista = ((data || []) as unknown as Enviado[]).filter((e) => e.fields && Object.keys(e.fields).length > 0);
    setEnviados(lista.slice(0, 20));
  }

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (!q) return [];
    const dig = q.replace(/\D/g, '');
    return pacientes.filter((p) => {
      const nome = p.full_name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      return nome.includes(q) || (dig.length >= 3 && (p.phone || '').replace(/\D/g, '').includes(dig));
    }).slice(0, 8);
  }, [busca, pacientes]);

  const centavos = paraCentavos(valor);
  const nSessoes = Math.max(0, parseInt(sessoes || '0', 10));
  const porSessao = nSessoes > 0 ? Math.round(centavos / nSessoes) : 0;

  const condicaoTexto =
    condicao === 'Parcelado'
      ? `parcelado em ${parcelas} vezes de R$ ${brl(Math.round(centavos / Math.max(1, parseInt(parcelas || '1', 10))))}`
      : condicao === 'Por sessão'
        ? `pagamento por sessão realizada, no valor de R$ ${brl(porSessao)} cada`
        : condicao === 'Entrada + parcelas'
          ? `entrada e saldo parcelado conforme condições especiais`
          : 'à vista';

  const campos: Record<string, string> = {
    servico,
    sessoes: String(nSessoes),
    valor: brl(centavos),
    valor_extenso: extenso(centavos),
    valor_sessao: brl(porSessao),
    forma_pagamento: forma,
    condicao_pagamento: condicaoTexto,
    status_pagamento: statusPg,
    validade: `${validadeNum} ${validadeUn}`,
    frequencia,
    observacoes: obs.trim() || 'Não há condições especiais além das previstas neste contrato.',
  };

  function aplicarPacote(id: string) {
    const p = pacotes.find((x) => x.id === id);
    if (!p) return;
    setServico(p.name);
    setSessoes(String(p.sessions));
    setValor(brl(p.price_cents));
    if (p.validity_days) { setValidadeNum(String(p.validity_days)); setValidadeUn('dias'); }
  }

  function validar(): string {
    if (!paciente) return 'Escolha o paciente.';
    if (!modeloId) return 'Escolha o modelo do contrato.';
    if (!servico.trim()) return 'Informe o serviço.';
    if (nSessoes < 1) return 'Informe a quantidade de sessões.';
    if (centavos <= 0) return 'Informe o valor pago.';
    return '';
  }

  async function verPrevia() {
    const v = validar(); if (v) { setErro(v); return; }
    setErro('');
    const { data, error } = await supabase.rpc('render_contract_preview', {
      p_template: modeloId, p_patient: paciente!.id, p_professional: profId || null, p_fields: campos,
    });
    if (error) { setErro(error.message); return; }
    setPreview(data as string);
  }

  async function gerarLink() {
    const v = validar(); if (v) { setErro(v); return; }
    setErro(''); setEnviando(true);
    const { data, error } = await supabase.rpc('create_contract_request', {
      p_template: modeloId, p_patient: paciente!.id, p_professional: profId || null,
      p_fields: campos, p_days: parseInt(prazoLink || '14', 10),
    });
    setEnviando(false);
    if (error) { setErro(error.message); return; }
    setLink(`${window.location.origin}/termo/${data}`);
    if (clinicId) carregarEnviados(clinicId);
  }

  function whatsapp(nome: string, fone: string | null, url: string) {
    const primeiro = nome.split(' ')[0];
    const txt = `Olá, ${primeiro}. Segue o contrato do seu tratamento para leitura e assinatura online: ${url}`;
    const num = (fone || '').replace(/\D/g, '');
    const destino = num ? (num.startsWith('55') ? num : `55${num}`) : '';
    window.open(`https://wa.me/${destino}?text=${encodeURIComponent(txt)}`, '_blank');
  }

  function novo() {
    setPaciente(null); setBusca(''); setValor(''); setObs(''); setPreview(''); setLink('');
  }

  return (
    <div style={s.wrap}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 4px' }}>Contrato de serviços</h1>
      <p style={{ ...s.muted, marginTop: 0, marginBottom: 16 }}>
        Preencha sessões, valor e pagamento, gere o link e envie. O paciente lê e assina pelo celular, com registro de data, IP e código de integridade.
      </p>

      {erro && <div style={{ ...s.card, borderColor: '#fca5a5', background: '#fef2f2', color: '#991b1b' }}>{erro}</div>}

      {link ? (
        <div style={{ ...s.card, borderColor: '#86efac', background: '#f0fdf4' }}>
          <h2 style={s.h2}>Link do contrato gerado</h2>
          <input readOnly value={link} style={{ ...s.input, marginBottom: 12 }} onFocus={(e) => e.target.select()} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={s.btn} onClick={() => whatsapp(paciente!.full_name, paciente!.phone, link)}>Enviar pelo WhatsApp</button>
            <button style={s.btn2} onClick={() => navigator.clipboard.writeText(link)}>Copiar link</button>
            <button style={s.btn2} onClick={() => window.open(link, '_blank')}>Abrir</button>
            <button style={s.btn2} onClick={novo}>Novo contrato</button>
          </div>
          <p style={{ ...s.muted, marginBottom: 0 }}>Válido por {prazoLink} dias. Depois de assinado, o contrato aparece nos termos assinados do paciente.</p>
        </div>
      ) : (
        <>
          <div style={s.card}>
            <h2 style={s.h2}>1. Paciente e modelo</h2>
            {paciente ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div>
                  <strong>{paciente.full_name}</strong>
                  <div style={s.muted}>{paciente.phone || 'sem telefone'} · CPF {paciente.cpf || 'será pedido na assinatura'}</div>
                </div>
                <button style={s.btn2} onClick={() => { setPaciente(null); setPreview(''); }}>Trocar</button>
              </div>
            ) : (
              <div style={{ marginBottom: 12, position: 'relative' }}>
                <label style={s.label}>Buscar paciente (nome ou telefone)</label>
                <input style={s.input} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite o nome..." />
                {filtrados.length > 0 && (
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginTop: 4, background: '#fff' }}>
                    {filtrados.map((p) => (
                      <div key={p.id} onClick={() => { setPaciente(p); setBusca(''); }}
                        style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}>
                        {p.full_name} <span style={s.muted}>{p.phone || ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div style={s.grid}>
              <div>
                <label style={s.label}>Modelo</label>
                <select style={s.input} value={modeloId} onChange={(e) => setModeloId(e.target.value)}>
                  {modelos.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Profissional responsável</label>
                <select style={s.input} value={profId} onChange={(e) => setProfId(e.target.value)}>
                  {profs.map((p) => <option key={p.id} value={p.id}>{p.doc_full_name || p.display_name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={s.card}>
            <h2 style={s.h2}>2. Serviço contratado</h2>
            {pacotes.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label style={s.label}>Preencher a partir de um pacote (opcional)</label>
                <select style={s.input} defaultValue="" onChange={(e) => aplicarPacote(e.target.value)}>
                  <option value="">Selecione...</option>
                  {pacotes.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.sessions} sessões · R$ {brl(p.price_cents)}</option>)}
                </select>
              </div>
            )}
            <div style={s.grid}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={s.label}>Serviço</label>
                <input style={s.input} value={servico} onChange={(e) => setServico(e.target.value)} placeholder="Ex.: Fisioterapia ortopédica, PRP no joelho" />
              </div>
              <div>
                <label style={s.label}>Quantidade de sessões</label>
                <input style={s.input} inputMode="numeric" value={sessoes} onChange={(e) => setSessoes(e.target.value.replace(/\D/g, ''))} />
              </div>
              <div>
                <label style={s.label}>Frequência</label>
                <input style={s.input} value={frequencia} onChange={(e) => setFrequencia(e.target.value)} />
              </div>
              <div>
                <label style={s.label}>Validade das sessões</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input style={{ ...s.input, width: 90 }} inputMode="numeric" value={validadeNum} onChange={(e) => setValidadeNum(e.target.value.replace(/\D/g, ''))} />
                  <select style={s.input} value={validadeUn} onChange={(e) => setValidadeUn(e.target.value)}>
                    <option>dias</option><option>meses</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div style={s.card}>
            <h2 style={s.h2}>3. Valor e pagamento</h2>
            <div style={s.grid}>
              <div>
                <label style={s.label}>Valor total (R$)</label>
                <input style={s.input} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)}
                  onBlur={() => centavos > 0 && setValor(brl(centavos))} placeholder="0,00" />
                {centavos > 0 && <div style={s.muted}>{extenso(centavos)} · R$ {brl(porSessao)} por sessão</div>}
              </div>
              <div>
                <label style={s.label}>Forma de pagamento</label>
                <select style={s.input} value={forma} onChange={(e) => setForma(e.target.value)}>
                  {FORMAS.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Condição</label>
                <select style={s.input} value={condicao} onChange={(e) => setCondicao(e.target.value)}>
                  <option>À vista</option><option>Parcelado</option><option>Entrada + parcelas</option><option>Por sessão</option>
                </select>
              </div>
              {condicao === 'Parcelado' && (
                <div>
                  <label style={s.label}>Número de parcelas</label>
                  <input style={s.input} inputMode="numeric" value={parcelas} onChange={(e) => setParcelas(e.target.value.replace(/\D/g, ''))} />
                </div>
              )}
              <div>
                <label style={s.label}>Situação do pagamento</label>
                <select style={s.input} value={statusPg} onChange={(e) => setStatusPg(e.target.value)}>
                  {STATUS.map((x) => <option key={x}>{x}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={s.label}>Condições especiais (opcional)</label>
                <textarea style={{ ...s.input, minHeight: 70 }} value={obs} onChange={(e) => setObs(e.target.value)}
                  placeholder="Ex.: entrada de R$ 300,00 no Pix e saldo em 3 vezes no cartão; sessão de reavaliação inclusa." />
              </div>
              <div>
                <label style={s.label}>Link válido por (dias)</label>
                <input style={s.input} inputMode="numeric" value={prazoLink} onChange={(e) => setPrazoLink(e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <button style={s.btn2} onClick={verPrevia}>Ver prévia</button>
            <button style={{ ...s.btn, opacity: enviando ? 0.6 : 1 }} disabled={enviando} onClick={gerarLink}>
              {enviando ? 'Gerando...' : 'Gerar link para assinatura'}
            </button>
          </div>

          {preview && (
            <div style={s.card}>
              <h2 style={s.h2}>Prévia do que o paciente vai ler</h2>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6, maxHeight: 420, overflow: 'auto' }}>
                {preview.replace(/\*\*/g, '').replace(/^#+\s*/gm, '')}
              </div>
            </div>
          )}
        </>
      )}

      <div style={s.card}>
        <h2 style={s.h2}>Contratos enviados</h2>
        {enviados.length === 0 && <p style={s.muted}>Nenhum contrato enviado ainda.</p>}
        {enviados.map((e) => {
          const url = typeof window !== 'undefined' ? `${window.location.origin}/termo/${e.token}` : '';
          const expirado = !e.signed_at && new Date(e.expires_at) < new Date();
          return (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap' }}>
              <div>
                <strong>{e.patients?.full_name || 'Paciente'}</strong>
                <div style={s.muted}>
                  {e.fields?.sessoes} sessões · R$ {e.fields?.valor} · {e.fields?.forma_pagamento} · {new Date(e.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: 999,
                  background: e.signed_at ? '#dcfce7' : expirado ? '#f3f4f6' : '#fef9c3',
                  color: e.signed_at ? '#166534' : expirado ? '#6b7280' : '#854d0e',
                }}>
                  {e.signed_at ? `Assinado ${new Date(e.signed_at).toLocaleDateString('pt-BR')}` : expirado ? 'Expirado' : 'Aguardando'}
                </span>
                {!e.signed_at && !expirado && (
                  <button style={s.btn2} onClick={() => whatsapp(e.patients?.full_name || '', e.patients?.phone || null, url)}>Reenviar</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

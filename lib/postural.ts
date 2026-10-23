// Avaliação postural (protocolo SAPO): tipos e cálculos dos ângulos.
// Coordenadas dos pontos ficam normalizadas (0 a 1) em relação à largura e altura da foto.

export type Vista = "anterior" | "posterior" | "lateral_d" | "lateral_e";
export type Pt = [number, number];

export const VISTAS: { id: Vista; nome: string; guia: string }[] = [
  { id: "anterior", nome: "Anterior", guia: "Paciente de frente para a câmera, olhando para o horizonte, braços relaxados e pés afastados na largura do quadril." },
  { id: "posterior", nome: "Posterior", guia: "Paciente de costas para a câmera, mesma posição dos pés da foto anterior." },
  { id: "lateral_d", nome: "Lateral direita", guia: "Lado direito do paciente voltado para a câmera, braços relaxados ou cruzados à frente do tronco, sem cobrir os pontos." },
  { id: "lateral_e", nome: "Lateral esquerda", guia: "Lado esquerdo do paciente voltado para a câmera, mesma orientação da lateral direita." },
];

export type Landmark = { key: string; name: string; views: string[]; mp_index: number | null; sort: number };

export type Medida = {
  code: string;
  sapo: string | null;
  view: string;
  name: string;
  calc: "horizontal" | "vertical" | "angle3" | "angle_lines" | "angle_horizontal" | "dist_diff" | "hdist_diff";
  points: unknown;
  unit: string;
  ref_mean: number | null;
  ref_sd: number | null;
  ref_source: string | null;
  cif_code: string | null;
  sort: number;
};

export type Calibracao = { p1?: Pt; p2?: Pt; metros: number };

export type FotoVista = {
  image_id: string;
  storage_path: string;
  w: number;
  h: number;
  calib: Calibracao;
  landmarks: Record<string, Pt>;
};

export type Fotos = Partial<Record<Vista, FotoVista>>;

export type ResultadoMedida = {
  vista: Vista;
  code: string;
  sapo: string | null;
  nome: string;
  valor: number;
  unidade: string;
  grau: number | null;
  ref_mean: number | null;
  ref_sd: number | null;
  cif_code: string | null;
};

export const PRUMO1 = "__prumo1";
export const PRUMO2 = "__prumo2";

export function medidasDaVista(medidas: Medida[], vista: Vista) {
  return medidas.filter((m) => m.view === vista || (m.view === "lateral" && vista.startsWith("lateral")));
}

export function pontosDaVista(landmarks: Landmark[], vista: Vista) {
  return landmarks.filter((l) => l.views.includes(vista)).sort((a, b) => a.sort - b.sort);
}

// mesmas faixas da função posture_classify do banco
export function classificarPostural(valor: number | null, media: number | null, dp: number | null): number | null {
  if (valor === null || media === null || dp === null || dp === 0) return null;
  const d = Math.abs(valor - media);
  if (d <= dp) return 0;
  if (d <= 2 * dp) return 1;
  if (d <= 3 * dp) return 2;
  return 3;
}

const grau = (rad: number) => (rad * 180) / Math.PI;
const arred = (v: number) => Math.round(v * 10) / 10;

type V = { x: number; y: number };

function preparar(f: FotoVista) {
  // pixels com eixo y para cima
  const conv = (p: Pt): V => ({ x: p[0] * f.w, y: -p[1] * f.h });
  // correção da inclinação da câmera pela linha de prumo, quando marcada
  let ang = 0;
  let pxPorCm: number | null = null;
  if (f.calib.p1 && f.calib.p2) {
    const a = conv(f.calib.p1);
    const b = conv(f.calib.p2);
    const [baixo, cima] = a.y < b.y ? [a, b] : [b, a];
    const vx = cima.x - baixo.x;
    const vy = cima.y - baixo.y;
    if (Math.hypot(vx, vy) > 10) {
      ang = Math.atan2(vx, vy);
      if (f.calib.metros > 0) pxPorCm = Math.hypot(vx, vy) / (f.calib.metros * 100);
    }
  }
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  const pt = (k: string): V | null => {
    const p = f.landmarks[k];
    if (!p) return null;
    const v = conv(p);
    return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
  };
  return { pt, pxPorCm };
}

function frente(pt: (k: string) => V | null) {
  const t = pt("tragus");
  const c = pt("c7");
  if (t && c && t.x !== c.x) return Math.sign(t.x - c.x);
  const m = pt("metatarso");
  const ml = pt("maleolo_lat");
  if (m && ml && m.x !== ml.x) return Math.sign(m.x - ml.x);
  return 1;
}

function anguloEntre(a: V, b: V) {
  const n = Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y);
  if (n === 0) return null;
  return grau(Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / n))));
}

export function calcularMedida(m: Medida, f: FotoVista): { valor: number | null; falta: string | null } {
  const { pt, pxPorCm } = preparar(f);
  const lista = (m.points as string[] | string[][]).flat() as string[];
  const faltando = lista.filter((k) => !f.landmarks[k]);
  if (faltando.length) return { valor: null, falta: `${faltando.length} ponto(s)` };
  const p = (k: string) => pt(k) as V;

  switch (m.calc) {
    case "horizontal": {
      const [a, b] = (m.points as string[]).map(p);
      return { valor: arred(grau(Math.atan2(b.y - a.y, Math.abs(b.x - a.x)))), falta: null };
    }
    case "vertical": {
      const [a, b] = (m.points as string[]).map(p);
      const dx = (b.x - a.x) * frente(pt);
      return { valor: arred(grau(Math.atan2(dx, b.y - a.y))), falta: null };
    }
    case "angle3": {
      const [a, b, c] = (m.points as string[]).map(p);
      const v = anguloEntre({ x: a.x - b.x, y: a.y - b.y }, { x: c.x - b.x, y: c.y - b.y });
      return { valor: v === null ? null : arred(v), falta: null };
    }
    case "angle_lines": {
      const [[a, b], [c, d]] = (m.points as string[][]).map((par) => par.map(p));
      const v = anguloEntre({ x: b.x - a.x, y: b.y - a.y }, { x: d.x - c.x, y: d.y - c.y });
      return { valor: v === null ? null : arred(v), falta: null };
    }
    case "angle_horizontal": {
      const [joelho, maleolo] = (m.points as string[]).map(p);
      const v = anguloEntre({ x: joelho.x - maleolo.x, y: joelho.y - maleolo.y }, { x: frente(pt), y: 0 });
      return { valor: v === null ? null : arred(v), falta: null };
    }
    case "dist_diff":
    case "hdist_diff": {
      if (!pxPorCm) return { valor: null, falta: "calibração do prumo" };
      const [[a, b], [c, d]] = (m.points as string[][]).map((par) => par.map(p));
      const dist = (u: V, w: V) => (m.calc === "hdist_diff" ? Math.abs(u.x - w.x) : Math.hypot(u.x - w.x, u.y - w.y));
      return { valor: arred((dist(a, b) - dist(c, d)) / pxPorCm), falta: null };
    }
  }
  return { valor: null, falta: null };
}

export function calcularTudo(medidas: Medida[], fotos: Fotos): ResultadoMedida[] {
  const out: ResultadoMedida[] = [];
  for (const v of VISTAS) {
    const f = fotos[v.id];
    if (!f) continue;
    for (const m of medidasDaVista(medidas, v.id)) {
      const { valor } = calcularMedida(m, f);
      if (valor === null) continue;
      out.push({
        vista: v.id,
        code: m.code,
        sapo: m.sapo,
        nome: m.name,
        valor,
        unidade: m.unit,
        grau: classificarPostural(valor, m.ref_mean, m.ref_sd),
        ref_mean: m.ref_mean,
        ref_sd: m.ref_sd,
        cif_code: m.cif_code,
      });
    }
  }
  return out;
}

// Reduz a foto para no máximo 1600 px no maior lado (corrige a rotação do celular)
export async function reduzirFoto(file: File): Promise<{ blob: Blob; w: number; h: number }> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  const esc = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * esc);
  const h = Math.round(bmp.height * esc);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise<Blob>((ok, erro) =>
    canvas.toBlob((b) => (b ? ok(b) : erro(new Error("Não foi possível processar a foto."))), "image/jpeg", 0.88)
  );
  return { blob, w, h };
}

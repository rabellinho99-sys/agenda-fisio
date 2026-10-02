// Pixel da Meta (Agenda Fisio Pro)
// O ID vem da variável de ambiente NEXT_PUBLIC_META_PIXEL_ID (configurada na Vercel).
// Por privacidade, o pixel só roda nas páginas públicas de divulgação.
// Painel, prontuário, documentos, termos assinados e páginas de agendamento
// dos pacientes NUNCA enviam dados para a Meta.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

// Conjunto de dados "Agenda do Fisioterapeuta" (BM Pedro Henrique), ligado à conta de anúncios.
// O ID do pixel não é segredo; a variável da Vercel, se existir, tem prioridade.
export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || "2186282128595584";

const PAGINAS_PUBLICAS = [
  "/",
  "/entrar",
  "/esqueci-senha",
  "/bem-vindo",
  "/termos-de-uso",
  "/privacidade",
];

export function paginaPermitePixel(pathname: string | null): boolean {
  if (!pathname) return false;
  return PAGINAS_PUBLICAS.includes(pathname);
}

export function rastrearCadastro(metodo: "email" | "google") {
  try {
    if (typeof window === "undefined" || !window.fbq) return;
    window.fbq("track", "CompleteRegistration", {
      content_name: "Agenda Fisio Pro",
      status: "trial",
      registration_method: metodo,
    });
  } catch {
    // nunca deixar o rastreio quebrar o cadastro
  }
}

"use client";

import { usePathname } from "next/navigation";

const NUMERO = "5533999631999";
const MENSAGEM = "Olá! Vi o Agenda Fisio Pro e quero saber mais.";

// O botão aparece só nas páginas do site de vendas.
// Painel, prontuário, documentos, termos e páginas de agendamento das clínicas ficam sem ele,
// para paciente de outra clínica não cair no seu WhatsApp.
const ROTAS_COM_BOTAO = ["/", "/entrar", "/esqueci-senha", "/termos-de-uso", "/privacidade"];

export function WhatsAppBotao() {
  const pathname = usePathname() || "/";
  if (!ROTAS_COM_BOTAO.includes(pathname)) return null;

  const link = `https://wa.me/${NUMERO}?text=${encodeURIComponent(MENSAGEM)}`;

  function registrarClique() {
    try {
      // usa o pixel que já está instalado no site (components/MetaPixel.tsx)
      window.fbq?.("track", "Contact", { content_name: "WhatsApp site" });
    } catch {
      // o rastreio nunca pode impedir o clique
    }
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      onClick={registrarClique}
      style={{
        position: "fixed",
        right: 16,
        bottom: "calc(16px + env(safe-area-inset-bottom))",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "12px 16px",
        borderRadius: 999,
        background: "#25D366",
        color: "#fff",
        fontWeight: 700,
        fontSize: 15,
        textDecoration: "none",
        boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
      }}
    >
      <svg width="22" height="22" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
        <path d="M16.04 3C9.4 3 4 8.36 4 14.97c0 2.11.56 4.17 1.62 5.99L4 29l8.25-1.6a12.1 12.1 0 0 0 3.79.6C22.68 28 28 22.64 28 16.03 28 9.4 22.68 3 16.04 3zm0 22.8c-1.2 0-2.38-.2-3.5-.58l-.25-.08-4.9.95.96-4.73-.16-.26a9.7 9.7 0 0 1-1.5-5.13c0-5.38 4.01-9.76 9.35-9.76 5.32 0 9.6 4.38 9.6 9.8 0 5.4-4.28 9.79-9.6 9.79zm5.27-7.32c-.29-.14-1.71-.84-1.97-.94-.27-.1-.46-.14-.65.15-.2.29-.75.94-.92 1.13-.17.2-.34.22-.63.08-.29-.15-1.22-.45-2.32-1.43-.86-.76-1.44-1.7-1.6-1.99-.17-.29-.02-.44.12-.59.13-.13.29-.34.44-.5.14-.18.19-.3.29-.5.1-.19.05-.36-.02-.5-.08-.15-.65-1.56-.89-2.14-.23-.56-.47-.48-.65-.49h-.55c-.2 0-.5.07-.77.36-.26.29-1 .98-1 2.4 0 1.4 1.03 2.77 1.17 2.96.15.2 2.03 3.1 4.92 4.34.69.3 1.22.47 1.64.6.69.22 1.32.19 1.81.12.55-.08 1.71-.7 1.95-1.37.24-.68.24-1.26.17-1.38-.07-.12-.26-.19-.55-.33z" />
      </svg>
      Fale comigo
    </a>
  );
}

export default WhatsAppBotao;

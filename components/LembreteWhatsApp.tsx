"use client";

import { useState } from "react";

type Props = {
  telefone: string | null;
  paciente: string;
  clinica: string;
  servico?: string | null;
  profissional?: string | null;
  inicio: string; // data e hora do atendimento (ISO)
  timezone?: string;
  compacto?: boolean;
};

type Modelo = "lembrete" | "confirmacao" | "livre";

function linkWhatsApp(telefone: string, texto: string) {
  const d = telefone.replace(/\D/g, "");
  const numero = d.startsWith("55") ? d : `55${d}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

function montarTexto(m: Modelo, p: Props) {
  const tz = p.timezone ?? "America/Sao_Paulo";
  const data = new Date(p.inicio);
  const dia = data.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: tz });
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: tz });
  const nome = p.paciente.trim().split(" ")[0];
  const servico = p.servico ? ` de ${p.servico}` : "";
  const com = p.profissional ? `, com ${p.profissional}` : "";

  if (m === "confirmacao") {
    return `Olá, ${nome}! Seu atendimento${servico} na ${p.clinica} está marcado para ${dia}, às ${hora}${com}. Qualquer imprevisto, é só me avisar por aqui.`;
  }
  if (m === "livre") return `Olá, ${nome}! `;
  return `Olá, ${nome}! Passando para lembrar do seu atendimento${servico} na ${p.clinica}, ${dia}, às ${hora}${com}. Posso confirmar sua presença?`;
}

export function LembreteWhatsApp(props: Props) {
  const [aberto, setAberto] = useState(false);
  const tel = (props.telefone ?? "").replace(/\D/g, "");

  if (tel.length < 10) {
    return <span className="text-xs text-ink/50">Paciente sem celular cadastrado</span>;
  }

  const abrir = (m: Modelo) => {
    window.open(linkWhatsApp(tel, montarTexto(m, props)), "_blank", "noopener,noreferrer");
    setAberto(false);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className={`inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] font-semibold text-white hover:opacity-90 ${
          props.compacto ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"
        }`}
        aria-expanded={aberto}
      >
        <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.5 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1.1-1.4-1.1-2.7s.7-1.9.9-2.2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.3.4-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 1.9 1.1.9 2 1.2 2.3 1.3.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z" />
        </svg>
        Enviar pelo meu WhatsApp
      </button>

      {aberto && (
        <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-ink/10 bg-white p-1 text-sm shadow-lg">
          <button type="button" className="w-full rounded-md px-3 py-2 text-left hover:bg-paper" onClick={() => abrir("lembrete")}>
            <span className="font-semibold">Lembrete</span>
            <span className="block text-xs text-ink/60">Lembra o horário e pede confirmação</span>
          </button>
          <button type="button" className="w-full rounded-md px-3 py-2 text-left hover:bg-paper" onClick={() => abrir("confirmacao")}>
            <span className="font-semibold">Confirmação do agendamento</span>
            <span className="block text-xs text-ink/60">Informa dia, horário e profissional</span>
          </button>
          <button type="button" className="w-full rounded-md px-3 py-2 text-left hover:bg-paper" onClick={() => abrir("livre")}>
            <span className="font-semibold">Mensagem livre</span>
            <span className="block text-xs text-ink/60">Abre a conversa só com a saudação</span>
          </button>
          <p className="px-3 pb-2 pt-1 text-xs text-ink/50">Abre o WhatsApp deste aparelho com o texto pronto. É só tocar em enviar.</p>
        </div>
      )}
    </div>
  );
}

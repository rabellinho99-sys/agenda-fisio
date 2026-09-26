"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  /** Para onde o botão Início leva. No painel: "/painel". Na página pública: "/{slug}". */
  inicio?: string;
  /** Página usada se o usuário chegou direto pelo link e não há página anterior. */
  anteriorPadrao?: string;
  /** Pede confirmação antes de sair (use quando houver alterações não salvas). */
  confirmarSaida?: boolean;
};

export function NavegacaoTopo({ inicio = "/painel", anteriorPadrao, confirmarSaida = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  // na própria página inicial os botões não fazem sentido
  if (pathname === inicio) return null;

  const podeSair = () =>
    !confirmarSaida || window.confirm("Você tem alterações não salvas. Sair mesmo assim?");

  function voltar() {
    if (!podeSair()) return;
    const veioDoApp = document.referrer && new URL(document.referrer).origin === window.location.origin;
    if (veioDoApp && window.history.length > 1) router.back();
    else router.push(anteriorPadrao ?? inicio);
  }

  return (
    <nav aria-label="Navegação" className="mb-4 flex items-center gap-2">
      <button type="button" onClick={voltar} className="btn-ghost text-sm">
        Voltar
      </button>
      <Link
        href={inicio}
        onClick={(e) => { if (!podeSair()) e.preventDefault(); }}
        className="btn-ghost text-sm"
      >
        Início
      </Link>
    </nav>
  );
}

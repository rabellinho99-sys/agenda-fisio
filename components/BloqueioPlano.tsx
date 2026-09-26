"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { INFO_RECURSO, recursoDaRota, temRecurso, type Recurso, type Recursos } from "@/lib/planos";

export function CartaoUpgrade({ recurso }: { recurso: Recurso }) {
  const info = INFO_RECURSO[recurso];
  return (
    <div className="mx-auto max-w-lg rounded-xl bg-white p-6 text-center">
      <p className="text-3xl" aria-hidden="true">🔒</p>
      <h1 className="mt-2 text-xl font-extrabold">{info.nome}</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink/70">{info.descricao}</p>
      <p className="mt-4 text-sm font-semibold">Disponível a partir do plano {info.plano}.</p>
      <Link href="/painel/assinatura" className="btn-primary mt-4 inline-block">
        Fazer upgrade
      </Link>
      <p className="mt-3 text-xs text-ink/60">Seus dados já registrados continuam guardados.</p>
    </div>
  );
}

export function BloqueioPlano({ recursos, children }: { recursos: Recursos; children: React.ReactNode }) {
  const pathname = usePathname();
  const recurso = recursoDaRota(pathname);
  if (recurso && !temRecurso(recursos, recurso)) return <CartaoUpgrade recurso={recurso} />;
  return <>{children}</>;
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Gate({ blocked, children }: { blocked: boolean; children: React.ReactNode }) {
  const path = usePathname();
  if (!blocked || path.startsWith("/painel/assinatura")) return <>{children}</>;
  return (
    <div className="mx-auto max-w-md rounded-xl bg-white p-6 text-center">
      <p className="font-bold">Seu acesso ao painel está pausado</p>
      <p className="mt-1 text-sm text-ink/70">O link público dos pacientes continua funcionando. Escolha um plano para voltar à agenda.</p>
      <Link href="/painel/assinatura" className="btn-primary mt-4">Ver planos</Link>
    </div>
  );
}

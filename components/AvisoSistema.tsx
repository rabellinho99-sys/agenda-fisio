import { createClient } from "@/lib/supabase/server";

// Avisos gerais do sistema (ex.: instabilidade no WhatsApp), exibidos no topo do painel.
// Para ligar ou desligar um aviso, altere a coluna "active" na tabela system_announcements.

type Aviso = { id: string; title: string; message: string; level: string };

const estilos: Record<string, string> = {
  warning: "bg-amber/20 text-ink",
  info: "bg-white text-ink",
  success: "bg-white text-moss-deep",
};

export async function AvisoSistema() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("system_announcements")
    .select("id, title, message, level")
    .order("created_at", { ascending: false });

  const avisos = (data ?? []) as Aviso[];
  if (avisos.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {avisos.map((a) => (
        <div key={a.id} role="status" className={`rounded-lg px-4 py-3 text-sm ${estilos[a.level] ?? estilos.info}`}>
          <p className="font-semibold">{a.title}</p>
          <p className="mt-1">{a.message}</p>
        </div>
      ))}
    </div>
  );
}

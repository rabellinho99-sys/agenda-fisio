"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SairButton() {
  const router = useRouter();
  return (
    <button
      className="text-sm text-ink/60 underline underline-offset-4"
      onClick={async () => {
        await createClient().auth.signOut();
        router.push("/entrar");
        router.refresh();
      }}
    >
      Sair
    </button>
  );
}

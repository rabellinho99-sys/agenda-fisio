"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { rastrearCadastro } from "@/lib/metaPixel";

// Página de passagem logo após o cadastro.
// Registra o evento de cadastro no pixel da Meta e leva ao painel.
export default function BemVindo() {
  const router = useRouter();

  useEffect(() => {
    let metodo: "email" | "google" = "email";
    try {
      const m = new URLSearchParams(window.location.search).get("m");
      if (m === "google") metodo = "google";
    } catch {}

    // espera o pixel carregar antes de registrar o cadastro
    let tentativas = 0;
    const timer = setInterval(() => {
      tentativas++;
      if (window.fbq || tentativas >= 10) {
        clearInterval(timer);
        try {
          if (!sessionStorage.getItem("afp_cadastro_registrado")) {
            rastrearCadastro(metodo);
            sessionStorage.setItem("afp_cadastro_registrado", "1");
          }
        } catch {
          rastrearCadastro(metodo);
        }
        setTimeout(() => router.replace("/painel"), 400);
      }
    }, 150);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "inherit",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Conta criada com sucesso</h1>
        <p style={{ opacity: 0.7 }}>Preparando sua agenda...</p>
      </div>
    </main>
  );
}

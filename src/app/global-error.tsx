"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen items-center justify-center bg-[#F9F9F7] px-4 font-sans text-[#1F2937]">
        <div className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-[#1B365D]">
            Algo deu errado por aqui
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">
            Encontramos uma instabilidade inesperada ao carregar a página. Tente
            novamente em instantes.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#1B365D] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#132642]"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}

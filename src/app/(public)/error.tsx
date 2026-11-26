"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

interface PublicErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PublicError({ error, reset }: PublicErrorProps) {
  useEffect(() => {
    console.error("[PublicError]", error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="mt-5 font-serif text-2xl font-semibold text-primary sm:text-3xl">
        Não foi possível carregar esta página
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        Ocorreu uma instabilidade temporária ao buscar as informações. Tente
        novamente ou volte para a página inicial.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <Home className="h-4 w-4" />
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
